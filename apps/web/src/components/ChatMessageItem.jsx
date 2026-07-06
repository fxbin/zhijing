/**
 * 对话消息统一渲染组件。
 *
 * 接收 ChatThreadItem（由 utils/chatThread 转换产出），
 * 统一渲染 user / assistant 两种角色的所有消息形态：
 * - user：仅展示用户提问文本
 * - assistant：依次展示 reasoning（折叠）→ toolCalls（折叠）→ 正文 → 引用 → 提议卡片 → 产物入口 → 错误
 *
 * 所有来源（stream/history/answer）共用此组件，
 * 消除 GlobalChatDock 中三套并行渲染分支的结构不稳定问题。
 *
 * @module components/ChatMessageItem
 * @author fxbin
 */

import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Loader2,
  RotateCcw,
  Sparkles,
  SquareArrowOutUpRight,
  Wrench,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCardTypeLabel } from '../utils/i18nLabels';
import { renderMarkdown } from '../utils/markdown';
import SourceCitation from './SourceCitation';

/**
 * 提议操作类型常量。
 * 与 packages/shared 中 ProposedOperation 联合类型保持一致。
 */
const PROPOSAL_OP_CREATE_CARD = 'create_card';
const PROPOSAL_OP_EDIT_CARD = 'edit_card';
const PROPOSAL_OP_ARCHIVE_CARD = 'archive_card';
const PROPOSAL_OP_UNARCHIVE_CARD = 'unarchive_card';
const PROPOSAL_OP_ARCHIVE_MATERIAL = 'archive_material';

/**
 * 提议操作类型 → i18n key 映射表。
 * 渲染时按 op 取对应文案，避免魔法字符串散落在 JSX 中。
 */
const PROPOSAL_OP_LABEL_KEYS = Object.freeze({
  [PROPOSAL_OP_CREATE_CARD]: 'chat.proposalOp.create_card',
  [PROPOSAL_OP_EDIT_CARD]: 'chat.proposalOp.edit_card',
  [PROPOSAL_OP_ARCHIVE_CARD]: 'chat.proposalOp.archive_card',
  [PROPOSAL_OP_UNARCHIVE_CARD]: 'chat.proposalOp.unarchive_card',
  [PROPOSAL_OP_ARCHIVE_MATERIAL]: 'chat.proposalOp.archive_material',
});

/**
 * 兜底 i18n key，当 proposal.op 不在白名单内时使用。
 */
const PROPOSAL_OP_FALLBACK_KEY = 'chat.proposalOp.create_card';

/**
 * 安全地把任意值格式化为 JSON 字符串，用于工具入参折叠展示。
 * 循环引用、BigInt、函数等会被 JSON.stringify 跳过或转换为字符串。
 *
 * @param {unknown} value - 任意入参值
 * @returns {string} 格式化后的 JSON 字符串；转换失败时回退为 String(value)
 * @author fxbin
 */
function safeFormatJson(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/**
 * 按工具名定向渲染结构化 details。
 *
 * 已识别的工具名与渲染策略：
 * - search_cards：列表展示返回的卡片（type 徽章 + 标题 + 摘要）
 * - search_materials：列表展示返回的资料（platform/parseStatus 徽章 + 标题 + 预览）
 * - get_workspace_summary：紧凑展示工作区概览（标题 / 摘要 / 来源·卡片·资料数）
 * - web_search：列表展示联网搜索结果（标题 + URL + 摘要）
 * - fetch_web_page：展示单页抓取结果（标题 + URL + 正文预览）
 * - deep_search：展示深度搜索结果（来源 + 候选主张 + 缺口/冲突）
 * - 其他：回退到 JSON.stringify 折叠展示
 *
 * @param {object} props - 组件属性
 * @param {string} props.toolName - 工具名
 * @param {unknown} props.details - 结构化结果
 * @param {function} props.t - i18n 翻译函数
 * @returns {JSX.Element|null} 结构化结果节点
 * @author fxbin
 */
function ToolResultDetails({ toolName, details, t }) {
  if (!details || typeof details !== 'object') return null;

  if (toolName === 'search_cards') {
    const casted = details;
    const items = Array.isArray(casted.items) ? casted.items : [];
    if (items.length === 0) return null;
    return (
      <details className="chat-message-tool-structured">
        <summary>{t('chat.toolResultCards', { count: casted.count ?? items.length })}</summary>
        <ul className="chat-tool-cards-list">
          {items.map((card) => (
            <li key={card.id}>
              <span className="chat-tool-card-type">{card.type}</span>
              <span className="chat-tool-card-title">{card.title}</span>
              {card.body && <p className="chat-tool-card-body">{card.body}</p>}
            </li>
          ))}
        </ul>
      </details>
    );
  }

  if (toolName === 'search_materials') {
    const casted = details;
    const items = Array.isArray(casted.items) ? casted.items : [];
    if (items.length === 0) return null;
    return (
      <details className="chat-message-tool-structured">
        <summary>{t('chat.toolResultMaterials', { count: casted.count ?? items.length })}</summary>
        <ul className="chat-tool-materials-list">
          {items.map((material) => (
            <li key={material.id}>
              <div className="chat-tool-material-head">
                <span className="chat-tool-material-title">{material.title}</span>
                {material.platform && <span className="chat-tool-material-platform">{material.platform}</span>}
                {material.parseStatus && <span className="chat-tool-material-status">{material.parseStatus}</span>}
              </div>
              {material.preview && <p className="chat-tool-material-preview">{material.preview}</p>}
            </li>
          ))}
        </ul>
      </details>
    );
  }

  if (toolName === 'get_workspace_summary') {
    const overview = details;
    if (!overview || typeof overview !== 'object' || !overview.title) return null;
    return (
      <details className="chat-message-tool-structured">
        <summary>{t('chat.toolResultOverview')}</summary>
        <div className="chat-tool-overview">
          <strong>{overview.title}</strong>
          {overview.summary && <p>{overview.summary}</p>}
          <span className="chat-tool-overview-meta">
            {t('chat.toolResultOverviewFields', {
              sourceCount: overview.sourceCount ?? 0,
              cardCount: overview.cardCount ?? 0,
              materialCount: overview.materialCount ?? 0,
            })}
          </span>
          {overview.stage && <span className="chat-tool-overview-stage">{overview.stage}</span>}
        </div>
      </details>
    );
  }

  if (toolName === 'web_search') {
    const casted = details;
    const items = Array.isArray(casted.results) ? casted.results : [];
    return (
      <details className="chat-message-tool-structured">
        <summary>
          {t('chat.toolResultWebSearch', {
            count: casted.count ?? items.length,
            defaultValue: `联网搜索返回 ${casted.count ?? items.length} 条结果`,
          })}
        </summary>
        {casted.errorMessage && (
          <p className="chat-tool-search-error">{casted.errorMessage}</p>
        )}
        {items.length > 0 && (
          <ul className="chat-tool-search-list">
            {items.map((result, index) => (
              <li key={result.url || index}>
                <a
                  className="chat-tool-search-title"
                  href={result.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {result.title || result.url}
                </a>
                {result.url && <span className="chat-tool-search-url">{result.url}</span>}
                {result.snippet && <p className="chat-tool-search-snippet">{result.snippet}</p>}
              </li>
            ))}
          </ul>
        )}
      </details>
    );
  }

  if (toolName === 'fetch_web_page') {
    const casted = details;
    return (
      <details className="chat-message-tool-structured">
        <summary>
          {casted.ok
            ? t('chat.toolResultFetchWebPage', { defaultValue: '网页正文' })
            : t('chat.toolResultFetchWebPageFailed', { defaultValue: '网页抓取失败' })}
        </summary>
        {casted.errorMessage && (
          <p className="chat-tool-search-error">{casted.errorMessage}</p>
        )}
        <div className="chat-tool-overview">
          {casted.title && <strong>{casted.title}</strong>}
          {casted.url && (
            <a className="chat-tool-search-url" href={casted.url} target="_blank" rel="noreferrer">
              {casted.url}
            </a>
          )}
          {casted.text && <p className="chat-tool-material-preview">{casted.text}</p>}
        </div>
      </details>
    );
  }

  if (toolName === 'deep_search') {
    const casted = details;
    const sources = Array.isArray(casted.sources) ? casted.sources : [];
    const claims = Array.isArray(casted.claims) ? casted.claims : [];
    const conflicts = Array.isArray(casted.conflicts) ? casted.conflicts : [];
    const gaps = Array.isArray(casted.gaps) ? casted.gaps : [];
    return (
      <details className="chat-message-tool-structured">
        <summary>
          {t('chat.toolResultDeepSearch', {
            count: sources.length,
            defaultValue: `深度搜索返回 ${sources.length} 个来源`,
          })}
        </summary>
        {casted.errorMessage && (
          <p className="chat-tool-search-error">{casted.errorMessage}</p>
        )}
        {sources.length > 0 && (
          <ul className="chat-tool-search-list">
            {sources.map((source, index) => (
              <li key={source.url || index}>
                <a className="chat-tool-search-title" href={source.url} target="_blank" rel="noreferrer">
                  {source.title || source.url}
                </a>
                {source.url && <span className="chat-tool-search-url">{source.url}</span>}
                {source.snippet && <p className="chat-tool-search-snippet">{source.snippet}</p>}
                {source.textPreview && <p className="chat-tool-search-snippet">{source.textPreview}</p>}
                {source.errorMessage && <p className="chat-tool-search-error">{source.errorMessage}</p>}
              </li>
            ))}
          </ul>
        )}
        {claims.length > 0 && (
          <div className="chat-tool-overview">
            <strong>{t('chat.toolResultDeepSearchClaims', { defaultValue: '候选主张' })}</strong>
            {claims.slice(0, 5).map((claim, index) => (
              <p key={`${claim.sourceUrl || index}-${index}`}>{claim.claim}</p>
            ))}
          </div>
        )}
        {(conflicts.length > 0 || gaps.length > 0) && (
          <div className="chat-tool-overview">
            {conflicts.map((conflict, index) => (
              <p key={`conflict-${index}`}>{conflict}</p>
            ))}
            {gaps.map((gap, index) => (
              <p key={`gap-${index}`}>{gap}</p>
            ))}
          </div>
        )}
      </details>
    );
  }

  return (
    <details className="chat-message-tool-structured">
      <summary>{t('chat.toolResultStructured')}</summary>
      <pre className="chat-message-tool-details-text">{safeFormatJson(details)}</pre>
    </details>
  );
}

/**
 * 统一渲染一条 ChatThreadItem。
 *
 * @param {object} props - 组件属性
 * @param {object} props.item - ChatThreadItem
 * @param {Array<object>} [props.cards=[]] - 工作区卡片列表（引用渲染查找）
 * @param {Array<object>} [props.materials=[]] - 工作区资料列表（引用渲染查找）
 * @param {object} [props.proposedCardsState] - 提议卡片交互状态（useProposedCards 返回值）
 * @param {object} [props.proposalBatchState] - 流式 apply diff 交互状态（useProposalBatch 返回值）
 * @param {(artifact: object, meta?: object) => void} [props.onOpenArtifact] - 打开产物回调
 * @param {(userId: string) => void} [props.onRetry] - 重试该 user 消息回调
 * @param {boolean} [props.isStreaming=false] - 当前流式对话运行态；运行中隐藏重试按钮
 * @returns {JSX.Element} 消息渲染节点
 * @author fxbin
 */
export default function ChatMessageItem({
  item,
  cards = [],
  materials = [],
  proposedCardsState,
  proposalBatchState,
  onOpenArtifact,
  onRetry,
  isStreaming = false,
}) {
  const { t } = useTranslation();
  const cardTypeLabel = useCardTypeLabel();

  if (item.role === 'user') {
    const canRetry = typeof onRetry === 'function' && !isStreaming && !item.isStreaming;
    return (
      <div className="chat-message-item chat-message-user">
        <p className="chat-message-text">{item.userText}</p>
        {canRetry && (
          <button
            type="button"
            className="chat-message-retry-btn"
            onClick={() => onRetry(item.id)}
            title={t('chat.retryHint')}
          >
            <RotateCcw size={13} />
            {t('chat.retry')}
          </button>
        )}
      </div>
    );
  }

  const hasToolCalls = item.toolCalls.length > 0;
  const hasReasoning = Boolean(item.reasoning);
  const hasText = Boolean(item.text);
  const hasCitations = item.citations.length > 0;
  const hasProposedCards = item.proposedCards.length > 0 && proposedCardsState;
  const hasProposalBatch = Boolean(item.proposalBatch)
    && Array.isArray(item.proposalBatch.proposals)
    && item.proposalBatch.proposals.length > 0
    && proposalBatchState;
  const hasArtifact = Boolean(item.artifact);
  const hasError = Boolean(item.error);
  const hasAuxContent = Boolean(item.auxContent);
  const isWaiting = item.isStreaming && !hasText && !hasToolCalls && !hasReasoning;

  return (
    <div className="chat-message-item chat-message-assistant">
      <Sparkles size={19} />
      <div className="chat-message-content">
        {hasReasoning && (
          <details className="chat-message-reasoning">
            <summary>{t('chat.reasoning')}</summary>
            <pre className="chat-message-reasoning-text">{item.reasoning}</pre>
          </details>
        )}

        {hasToolCalls && (
          <div className="chat-message-tools">
            {item.toolCalls.map((tool) => (
              <div
                key={tool.toolCallId}
                className={`chat-message-tool ${tool.isError ? 'failed' : ''} ${tool.isStreaming ? 'streaming' : ''}`}
              >
                <Wrench size={13} />
                <span>{tool.toolName}</span>
                {tool.isStreaming && <Loader2 size={12} className="chat-message-tool-spinner" />}
                {!tool.isStreaming && tool.args !== undefined && tool.args !== null && (
                  <details className="chat-message-tool-args">
                    <summary>{t('chat.toolArgs')}</summary>
                    <pre className="chat-message-tool-args-text">{safeFormatJson(tool.args)}</pre>
                  </details>
                )}
                {!tool.isStreaming && tool.details && (
                  <ToolResultDetails
                    toolName={tool.toolName}
                    details={tool.details}
                    t={t}
                  />
                )}
                {!tool.isStreaming && tool.result && (
                  <details className="chat-message-tool-result">
                    <summary>{t('chat.toolResult')}</summary>
                    <pre className="chat-message-tool-result-text">{tool.result}</pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}

        {hasText && (
          <div
            className="chat-message-text"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(item.text) }}
          />
        )}

        {isWaiting && <p className="chat-message-pending">{t('chat.loadingAnswer')}</p>}

        {hasCitations && (
          <div className="chat-message-citations">
            <strong>{t('chat.citations')}</strong>
            {item.citations.length === 0 ? (
              <p>{t('chat.noCitations')}</p>
            ) : (
              item.citations.slice(0, 6).map((citation) => (
                <SourceCitation
                  key={citation.id}
                  citation={citation}
                  cards={cards}
                  materials={materials}
                />
              ))
            )}
          </div>
        )}

        {hasArtifact && (
          <button
            className="assistant-link-button"
            onClick={() => onOpenArtifact?.(item.artifact)}
            type="button"
          >
            {t('chat.openArtifact')}
            <SquareArrowOutUpRight size={15} />
          </button>
        )}

        {hasProposedCards && (
          <ProposedCardsBlock
            proposedCards={item.proposedCards}
            state={proposedCardsState}
            cardTypeLabel={cardTypeLabel}
            t={t}
          />
        )}

        {hasProposalBatch && (
          <ProposalBatchBlock
            item={item}
            state={proposalBatchState}
            t={t}
          />
        )}

        {hasAuxContent && (
          <details className="chat-message-aux">
            <summary>{t('chat.auxProbeTitle')}</summary>
            <div
              className="chat-message-aux-text"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(item.auxContent) }}
            />
          </details>
        )}

        {hasError && <p className="chat-message-error" role="alert">{item.error}</p>}
      </div>
    </div>
  );
}

/**
 * 提议卡片区块（assistant 消息内嵌）。
 *
 * 与 useProposedCards hook 协同：
 * - proposedCardSelections：选中索引集合
 * - toggleProposedCard：切换单张选中
 * - acceptProposedCards：采纳选中
 * - dismissProposedCards：忽略全部
 * - acceptingCards：采纳进行态
 * - acceptError：采纳错误文案
 *
 * @param {object} props - 组件属性
 * @returns {JSX.Element} 提议卡片区块
 * @author fxbin
 */
function ProposedCardsBlock({ proposedCards, state, cardTypeLabel, t }) {
  const {
    proposedCardSelections,
    toggleProposedCard,
    acceptingCards,
    acceptError,
    acceptProposedCards,
    dismissProposedCards,
  } = state;

  return (
    <div className="proposed-cards-panel">
      <div className="proposed-cards-head">
        <strong>{t('detail.proposedCardsTitle')}</strong>
        <span className="proposed-cards-hint">{t('detail.proposedCardsHint')}</span>
      </div>
      <div className="proposed-cards-list">
        {proposedCards.map((card, index) => (
          <label
            key={index}
            className={`proposed-card-item ${proposedCardSelections.has(index) ? 'selected' : ''}`}
          >
            <input
              type="checkbox"
              checked={proposedCardSelections.has(index)}
              onChange={() => toggleProposedCard(index)}
            />
            <span className="card-type-badge">{cardTypeLabel(card.type)}</span>
            <div className="proposed-card-body">
              <strong>{card.title}</strong>
              <p>{card.body}</p>
            </div>
          </label>
        ))}
      </div>
      <div className="proposed-cards-actions">
        <button
          type="button"
          className="proposed-cards-accept"
          disabled={acceptingCards || proposedCardSelections.size === 0}
          onClick={() => void acceptProposedCards()}
        >
          {acceptingCards ? t('detail.proposedCardsAccepting') : t('detail.proposedCardsAccept')}
        </button>
        <button
          type="button"
          className="proposed-cards-dismiss"
          disabled={acceptingCards}
          onClick={dismissProposedCards}
        >
          {t('detail.proposedCardsDismiss')}
        </button>
      </div>
      {acceptError && (
        <p className="proposed-cards-error" role="alert">{acceptError}</p>
      )}
    </div>
  );
}

/**
 * 根据 proposal batch 构造默认全选索引集合。
 * 默认勾选所有提议，方便用户直接采纳；可在 UI 中取消勾选。
 *
 * @param {object|null} batch - proposal batch 对象
 * @returns {Set<number>} 默认全选的索引集合；batch 为空时返回空集合
 * @author fxbin
 */
function buildDefaultSelectedIndices(batch) {
  if (!batch || !Array.isArray(batch.proposals) || batch.proposals.length === 0) {
    return new Set();
  }
  return new Set(batch.proposals.map((_, index) => index));
}

/**
 * 流式 apply diff 提议变更区块（assistant 消息内嵌）。
 *
 * 与 useProposalBatch hook 协同：
 * - acceptingMessageIds：采纳进行态的 message id 集合
 * - appliedBatches：已处理（采纳或拒绝）的 message id 集合
 * - errorByMessageId：采纳失败文案映射
 * - acceptBatch(messageId, batch, selectedIndices)：采纳选中
 * - dismissBatch(messageId)：拒绝全部（仅前端标记已处理）
 *
 * 选中态由本组件按 message 粒度维护，初始为「全选」；
 * 当 item.proposalBatch 引用变化时（同一 message 多次下发）重置选中集合。
 *
 * @param {object} props - 组件属性
 * @param {object} props.item - ChatThreadItem，需含 proposalBatch 字段
 * @param {object} props.state - useProposalBatch 返回值
 * @param {function} props.t - i18n 翻译函数
 * @returns {JSX.Element} apply diff 提议区块
 * @author fxbin
 */
function ProposalBatchBlock({ item, state, t }) {
  const batch = item.proposalBatch;
  const messageId = item.id;
  const {
    acceptingMessageIds,
    appliedBatches,
    errorByMessageId,
    acceptBatch,
    dismissBatch,
  } = state;

  const [selectedIndices, setSelectedIndices] = useState(() => buildDefaultSelectedIndices(batch));

  useEffect(() => {
    setSelectedIndices(buildDefaultSelectedIndices(batch));
  }, [batch]);

  const isAccepting = acceptingMessageIds.has(messageId);
  const isApplied = appliedBatches.has(messageId);
  const errorMessage = errorByMessageId[messageId] ?? '';

  if (isApplied) {
    return (
      <div className="chat-proposal-batch applied">
        <CheckCircle2 size={14} />
        <span>{t('chat.proposalApplied')}</span>
      </div>
    );
  }

  /**
   * 切换指定索引的勾选状态。
   * @param {number} index - 提议在 batch.proposals 中的下标
   * @returns {void}
   * @author fxbin
   */
  function toggleIndex(index) {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  return (
    <div className="chat-proposal-batch">
      <div className="chat-proposal-head">
        <strong>{t('chat.proposalTitle')}</strong>
        <span className="chat-proposal-hint">{t('chat.proposalHint')}</span>
      </div>
      <ul className="chat-proposal-list">
        {batch.proposals.map((proposal, index) => {
          const opLabelKey = PROPOSAL_OP_LABEL_KEYS[proposal.op] ?? PROPOSAL_OP_FALLBACK_KEY;
          const isSelected = selectedIndices.has(index);
          return (
            <li
              key={`${proposal.op}-${index}`}
              className={`chat-proposal-item ${isSelected ? 'selected' : ''}`}
            >
              <label>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleIndex(index)}
                  disabled={isAccepting}
                />
                <span className={`chat-proposal-op-badge op-${proposal.op}`}>
                  {t(opLabelKey)}
                </span>
                <div className="chat-proposal-body">
                  {proposal.title && <strong>{proposal.title}</strong>}
                  {proposal.body && <p>{proposal.body}</p>}
                  {proposal.cardId && (
                    <p className="chat-proposal-meta">
                      <span className="chat-proposal-meta-label">{t('chat.proposalMetaCardId')}</span>
                      <code>{proposal.cardId}</code>
                    </p>
                  )}
                  {proposal.materialId && (
                    <p className="chat-proposal-meta">
                      <span className="chat-proposal-meta-label">{t('chat.proposalMetaMaterialId')}</span>
                      <code>{proposal.materialId}</code>
                    </p>
                  )}
                  {proposal.rationale && (
                    <p className="chat-proposal-rationale">{proposal.rationale}</p>
                  )}
                </div>
              </label>
            </li>
          );
        })}
      </ul>
      <div className="chat-proposal-actions">
        <button
          type="button"
          className="chat-proposal-accept"
          disabled={isAccepting || selectedIndices.size === 0}
          onClick={() => void acceptBatch(messageId, batch, selectedIndices)}
        >
          {isAccepting && <Loader2 size={13} className="chat-message-tool-spinner" />}
          {isAccepting ? t('chat.proposalAccepting') : t('chat.proposalAcceptSelected')}
        </button>
        <button
          type="button"
          className="chat-proposal-dismiss"
          disabled={isAccepting}
          onClick={() => dismissBatch(messageId)}
        >
          {t('chat.proposalReject')}
        </button>
      </div>
      {errorMessage && (
        <p className="chat-proposal-error" role="alert">{errorMessage}</p>
      )}
    </div>
  );
}
