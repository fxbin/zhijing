/**
 * 对话消息统一渲染组件（主壳）。
 *
 * 接收 ChatThreadItem（由 utils/chatThread 转换产出），
 * 统一渲染 user / assistant 两种角色的所有消息形态：
 * - user：仅展示用户提问文本
 * - assistant：依次展示 reasoning（折叠）→ toolCalls（折叠）→ 正文 → 引用 → 提议卡片 → 产物入口 → 错误
 *
 * 所有来源（stream/history/answer）共用此组件，
 * 消除 GlobalChatDock 中三套并行渲染分支的结构不稳定问题。
 *
 * 子组件已拆分至 ./chat/ 子目录：
 * - ./chat/constants：常量与 safeFormatJson 工具函数
 * - ./chat/ToolResultDetails：工具调用结构化结果渲染
 * - ./chat/ProposedCardsBlock：提议卡片区块
 * - ./chat/ProposalBatchBlock：流式 apply diff 提议变更区块
 *
 * @module components/ChatMessageItem
 * @author fxbin
 */

import { useEffect, useRef, useState } from 'react';
import {
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
import { safeFormatJson } from './chat/constants';
import ToolResultDetails from './chat/ToolResultDetails';
import ProposedCardsBlock from './chat/ProposedCardsBlock';
import ProposalBatchBlock from './chat/ProposalBatchBlock';

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
