/**
 * 流式 apply diff 提议变更区块组件。
 *
 * 由 ChatMessageItem 拆分而来，渲染 assistant 消息内嵌的多条 proposal 批处理块。
 *
 * @module components/chat/ProposalBatchBlock
 * @author fxbin
 */

import { CheckCircle2, Loader2 } from 'lucide-react';
import {
  EMPTY_INDEX_SET,
  PROPOSAL_OP_CREATE_CARD,
  PROPOSAL_OP_EDIT_CARD,
  PROPOSAL_OP_FALLBACK_KEY,
  PROPOSAL_OP_LABEL_KEYS,
} from './constants';

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
export default function ProposalBatchBlock({ item, state, cardTypeLabel, t }) {
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
      {batch.fallback === true && (
        <p className="chat-proposal-fallback-hint" role="note">
          {t('chat.proposalFallbackHint')}
        </p>
      )}
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
