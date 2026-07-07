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

import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Check as CheckIcon,
  Copy as CopyIcon,
  Info,
  Loader2,
  RotateCcw,
  Sparkles,
  SquareArrowOutUpRight,
  Wrench,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCardTypeLabel } from '../utils/i18nLabels';
import { linkifyCiteAnchors, renderMarkdown } from '../utils/markdown';
import { copyTextToClipboard } from '../utils/clipboard';
import { BADGE_CAPABILITY_IDS } from '../constants/capabilities';
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
 * @param {(material: object) => void} [props.onOpenMaterial] - 打开资料详情回调
 * @param {(card: object) => void} [props.onOpenCard] - 打开卡片详情回调
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
  onOpenMaterial,
  onOpenCard,
  onRetry,
  isStreaming = false,
}) {
  const { t } = useTranslation();
  const cardTypeLabel = useCardTypeLabel();
  const toolsDetailsRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const copyResetTimerRef = useRef(null);
  const [expandedCitations, setExpandedCitations] = useState(() => new Set());

  /**
   * 处理正文 [n] 锚点点击：滚动到对应 SourceCitation + 高亮 + 自动展开。
   *
   * 通过事件委托捕获 .cite-anchor 点击，取出 data-cite-index，
   * 滚动到 id=citation-{index} 的元素，添加临时高亮 class，
   * 并将该编号加入 expandedCitations 触发 SourceCitation 展开。
   *
   * @param {Event} event - 点击事件
   * @author fxbin
   */
  const handleCiteAnchorClick = (event) => {
    const anchor = event.target.closest('.cite-anchor');
    if (!anchor) return;
    event.preventDefault();
    const index = Number(anchor.getAttribute('data-cite-index'));
    if (!Number.isFinite(index) || index < 1) return;
    setExpandedCitations((prev) => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
    const target = document.getElementById(`citation-${index}`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.add('citation-flash');
      setTimeout(() => target.classList.remove('citation-flash'), 1500);
    }
  };

  /**
   * 流式态变化时自动控制工具调用区块的展开/折叠：
   * - 流式开始（isStreaming true）→ 自动展开，让用户看到工具调用进度
   * - 流式结束（isStreaming false）→ 自动折叠，保持对话流清爽（Trae 风格）
   * 用户在非流式态手动展开/折叠不受干扰。
   */
  useEffect(() => {
    if (toolsDetailsRef.current) {
      toolsDetailsRef.current.open = item.isStreaming;
    }
  }, [item.isStreaming]);

  /**
   * 复制 AI 回复正文到剪贴板。
   *
   * 三态视觉反馈：
   * - idle：默认「复制」
   * - copied：成功后切换为「已复制」1.2s 后回退
   * - failed：失败时切换为「复制失败」1.8s 后回退（clipboard API 失败且 execCommand 也失败时触发）
   *
   * 降级策略：navigator.clipboard 不可用（非 secure context）或失败时，
   * 自动走 textarea + document.execCommand('copy') 兜底，覆盖本地开发偶发权限问题。
   *
   * @author fxbin
   */
  async function handleCopyAssistantText() {
    if (!item.text || item.isStreaming) return;
    const ok = await copyTextToClipboard(item.text);
    if (copyResetTimerRef.current) {
      clearTimeout(copyResetTimerRef.current);
    }
    if (ok) {
      setCopied(true);
      copyResetTimerRef.current = setTimeout(() => setCopied(false), 1200);
    } else {
      setCopyFailed(true);
      copyResetTimerRef.current = setTimeout(() => setCopyFailed(false), 1800);
    }
  }

  useEffect(() => {
    return () => {
      if (copyResetTimerRef.current) {
        clearTimeout(copyResetTimerRef.current);
      }
    };
  }, []);

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
  const showCapabilityBadge = Boolean(item.agentRole) && BADGE_CAPABILITY_IDS.has(item.agentRole);

  return (
    <div className="chat-message-item chat-message-assistant">
      <Sparkles size={19} />
      <div className="chat-message-content">
        {showCapabilityBadge && (
          <div className="chat-message-capability-badge" role="status">
            <Info size={13} />
            <span>{t('chat.capabilityBadge.simulation')}</span>
          </div>
        )}

        {hasReasoning && (
          <details className="chat-message-reasoning">
            <summary>{t('chat.reasoning')}</summary>
            <pre className="chat-message-reasoning-text">{item.reasoning}</pre>
          </details>
        )}

        {hasToolCalls && (
          <details className="chat-message-tools-collapsible" ref={toolsDetailsRef}>
            <summary className="chat-message-tools-summary">
              <Wrench size={13} />
              <span>{t('chat.toolCallsCount', { count: item.toolCalls.length })}</span>
              {item.isStreaming && <Loader2 size={12} className="chat-message-tool-spinner" />}
            </summary>
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
          </details>
        )}

        {hasText && (
          <div className="chat-message-text-wrapper">
            <div
              className="chat-message-text"
              onClick={handleCiteAnchorClick}
              dangerouslySetInnerHTML={{ __html: linkifyCiteAnchors(renderMarkdown(item.text)) }}
            />
            {!item.isStreaming && (
              <div className="chat-message-actions">
                <button
                  type="button"
                  className={`chat-message-action-btn ${copied ? 'copied' : ''} ${copyFailed ? 'failed' : ''}`}
                  onClick={() => void handleCopyAssistantText()}
                  title={t('chat.copyAnswer')}
                  aria-label={t('chat.copyAnswer')}
                >
                  {copyFailed ? <Info size={13} /> : copied ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
                  {copyFailed ? t('chat.copyFailed') : copied ? t('chat.copied') : t('chat.copy')}
                </button>
              </div>
            )}
          </div>
        )}

        {isWaiting && <p className="chat-message-pending">{t('chat.loadingAnswer')}</p>}

        {hasCitations && (
          <div className="chat-message-citations">
            <strong>{t('chat.citations')}</strong>
            {item.citations.length === 0 ? (
              <p>{t('chat.noCitations')}</p>
            ) : (
              item.citations.slice(0, 6).map((citation, displayIndex) => {
                const citeIndex = displayIndex + 1;
                return (
                  <div id={`citation-${citeIndex}`} key={citation.id}>
                    <SourceCitation
                      citation={citation}
                      cards={cards}
                      materials={materials}
                      onOpenMaterial={onOpenMaterial}
                      onOpenCard={onOpenCard}
                      expanded={expandedCitations.has(citeIndex)}
                      onExpandedChange={(value) => setExpandedCitations((prev) => {
                        const next = new Set(prev);
                        if (value) {
                          next.add(citeIndex);
                        } else {
                          next.delete(citeIndex);
                        }
                        return next;
                      })}
                    />
                  </div>
                );
              })
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
            cardTypeLabel={cardTypeLabel}
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
 * 冻结的空集合常量，用于 appliedIndicesByMessage / dismissedIndicesByMessage
 * 未命中时的兜底引用，避免每次渲染创建新 Set 对象。
 */
const EMPTY_INDEX_SET = Object.freeze(new Set());

/**
 * 流式 apply diff 提议变更区块（assistant 消息内嵌）。
 *
 * 渲染形态：卡片预览 + 一键创建。
 * 每条 proposal 渲染为独立卡片预览块，展示操作类型 chip、卡片类型 chip、
 * 标题、正文摘要与理由，并配备「创建」「跳过」两个单条操作按钮。
 * 当存在多条待处理项时，底部额外提供「全部创建」「全部跳过」快捷操作。
 *
 * 与 useProposalBatch hook 协同：
 * - acceptSingle(messageId, batch, index)：单条采纳
 * - dismissSingle(messageId, index)：单条跳过（前端标记）
 * - acceptBatch(messageId, batch, selectedIndices)：批量采纳（用于「全部创建」）
 * - acceptSingle/acceptBatch 进行态、已采纳/已跳过索引集合均从 state 读取
 *
 * 状态判定优先级：
 * 1. appliedBatches 命中 → 整体已处理（acceptBatch 成功或 dismissBatch 标记）
 * 2. 所有 proposal 均已采纳或跳过 → 整体完成态
 * 3. 否则逐条渲染待处理/采纳中/已采纳/已跳过四种态
 *
 * @param {object} props - 组件属性
 * @param {object} props.item - ChatThreadItem，需含 proposalBatch 字段
 * @param {object} props.state - useProposalBatch 返回值
 * @param {function} props.cardTypeLabel - CardType → 本地化文案映射函数
 * @param {function} props.t - i18n 翻译函数
 * @returns {JSX.Element} apply diff 提议区块
 * @author fxbin
 */
function ProposalBatchBlock({ item, state, cardTypeLabel, t }) {
  const batch = item.proposalBatch;
  const messageId = item.id;
  const {
    acceptingMessageIds,
    acceptingMessageIndices,
    appliedBatches,
    appliedIndicesByMessage,
    dismissedIndicesByMessage,
    errorByMessageId,
    acceptBatch,
    acceptSingle,
    dismissSingle,
  } = state;

  const appliedSet = appliedIndicesByMessage[messageId] ?? EMPTY_INDEX_SET;
  const dismissedSet = dismissedIndicesByMessage[messageId] ?? EMPTY_INDEX_SET;
  const isAcceptingBatch = acceptingMessageIds.has(messageId);
  const errorMessage = errorByMessageId[messageId] ?? '';

  const total = batch.proposals.length;
  const handledCount = appliedSet.size + dismissedSet.size;
  const allHandled = handledCount >= total;

  /**
   * 「全部创建」：将当前所有待处理 proposal 一次性提交后端。
   * 仅当待处理项多于一条时触发（单条时使用单条创建按钮即可）。
   * @returns {void}
   * @author fxbin
   */
  function handleAcceptAll() {
    const pending = [];
    batch.proposals.forEach((_, index) => {
      if (!appliedSet.has(index) && !dismissedSet.has(index)) {
        pending.push(index);
      }
    });
    if (pending.length === 0) return;
    void acceptBatch(messageId, batch, new Set(pending));
  }

  /**
   * 「全部跳过」：逐条标记待处理 proposal 为已跳过。
   * @returns {void}
   * @author fxbin
   */
  function handleSkipAll() {
    batch.proposals.forEach((_, index) => {
      if (!appliedSet.has(index) && !dismissedSet.has(index)) {
        dismissSingle(messageId, index);
      }
    });
  }

  if (appliedBatches.has(messageId) || allHandled) {
    return (
      <div className="chat-proposal-batch applied">
        <CheckCircle2 size={14} />
        <span>{t('chat.proposalAllDone')}</span>
      </div>
    );
  }

  const hasMultiPending = total - handledCount > 1;

  return (
    <div className="chat-proposal-batch">
      <div className="chat-proposal-head">
        <strong>{t('chat.proposalTitle')}</strong>
        <span className="chat-proposal-hint">{t('chat.proposalHintCard')}</span>
      </div>
      <ul className="chat-proposal-list">
        {batch.proposals.map((proposal, index) => {
          const opLabelKey = PROPOSAL_OP_LABEL_KEYS[proposal.op] ?? PROPOSAL_OP_FALLBACK_KEY;
          const isAccepted = appliedSet.has(index);
          const isDismissed = dismissedSet.has(index);
          const isAccepting = acceptingMessageIndices.has(`${messageId}:${index}`);
          const showCardType = proposal.op === PROPOSAL_OP_CREATE_CARD
            || proposal.op === PROPOSAL_OP_EDIT_CARD;
          const itemClassName = [
            'chat-proposal-item',
            isAccepted ? 'accepted' : '',
            isDismissed ? 'dismissed' : '',
            isAccepting ? 'accepting' : '',
          ].filter(Boolean).join(' ');

          return (
            <li key={`${proposal.op}-${index}`} className={itemClassName}>
              <div className="chat-proposal-item-head">
                <span className={`chat-proposal-op-badge op-${proposal.op}`}>
                  {t(opLabelKey)}
                </span>
                {showCardType && proposal.type && (
                  <span className="chat-proposal-type-chip">
                    {cardTypeLabel(proposal.type)}
                  </span>
                )}
              </div>
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
              {!isAccepted && !isDismissed && (
                <div className="chat-proposal-item-actions">
                  <button
                    type="button"
                    className="chat-proposal-create-one"
                    disabled={isAccepting || isAcceptingBatch}
                    onClick={() => void acceptSingle(messageId, batch, index)}
                  >
                    {isAccepting && <Loader2 size={13} className="chat-message-tool-spinner" />}
                    {isAccepting ? t('chat.proposalCreatingOne') : t('chat.proposalCreateOne')}
                  </button>
                  <button
                    type="button"
                    className="chat-proposal-skip-one"
                    disabled={isAccepting || isAcceptingBatch}
                    onClick={() => dismissSingle(messageId, index)}
                  >
                    {t('chat.proposalSkipOne')}
                  </button>
                </div>
              )}
              {isAccepted && (
                <div className="chat-proposal-item-status accepted">
                  <CheckCircle2 size={13} />
                  <span>{t('chat.proposalCreatedOne')}</span>
                </div>
              )}
              {isDismissed && (
                <div className="chat-proposal-item-status dismissed">
                  <span>{t('chat.proposalSkippedOne')}</span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {hasMultiPending && (
        <div className="chat-proposal-actions">
          <button
            type="button"
            className="chat-proposal-accept"
            disabled={isAcceptingBatch}
            onClick={handleAcceptAll}
          >
            {isAcceptingBatch && <Loader2 size={13} className="chat-message-tool-spinner" />}
            {isAcceptingBatch ? t('chat.proposalAccepting') : t('chat.proposalAcceptAll')}
          </button>
          <button
            type="button"
            className="chat-proposal-dismiss"
            disabled={isAcceptingBatch}
            onClick={handleSkipAll}
          >
            {t('chat.proposalSkipAll')}
          </button>
        </div>
      )}
      {errorMessage && (
        <p className="chat-proposal-error" role="alert">{errorMessage}</p>
      )}
    </div>
  );
}
