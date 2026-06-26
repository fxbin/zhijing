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

import { Loader2, Sparkles, SquareArrowOutUpRight, Wrench } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCardTypeLabel } from '../utils/i18nLabels';
import { renderMarkdown } from '../utils/markdown';
import SourceCitation from './SourceCitation';

/**
 * 统一渲染一条 ChatThreadItem。
 *
 * @param {object} props - 组件属性
 * @param {object} props.item - ChatThreadItem
 * @param {Array<object>} [props.cards=[]] - 工作区卡片列表（引用渲染查找）
 * @param {Array<object>} [props.materials=[]] - 工作区资料列表（引用渲染查找）
 * @param {object} [props.proposedCardsState] - 提议卡片交互状态（useProposedCards 返回值）
 * @param {(artifact: object, meta?: object) => void} [props.onOpenArtifact] - 打开产物回调
 * @returns {JSX.Element} 消息渲染节点
 * @author fxbin
 */
export default function ChatMessageItem({
  item,
  cards = [],
  materials = [],
  proposedCardsState,
  onOpenArtifact,
}) {
  const { t } = useTranslation();
  const cardTypeLabel = useCardTypeLabel();

  if (item.role === 'user') {
    return (
      <div className="chat-message-item chat-message-user">
        <p className="chat-message-text">{item.userText}</p>
      </div>
    );
  }

  const hasToolCalls = item.toolCalls.length > 0;
  const hasReasoning = Boolean(item.reasoning);
  const hasText = Boolean(item.text);
  const hasCitations = item.citations.length > 0;
  const hasProposedCards = item.proposedCards.length > 0 && proposedCardsState;
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
