/**
 * 流式对话提议操作（apply diff）状态 Hook。
 *
 * 与 useProposedCards 的区别：
 * - useProposedCards 处理旧 /ask 路径一次性返回的 ProposedCard[]，
 *   采纳端点为 POST /api/messages/:id/accept-cards。
 * - useProposalBatch 处理流式 proposal_batch 事件下发的 ProposedOperation[]，
 *   采纳端点为 POST /api/workspaces/:id/proposal-batches/accept。
 *
 * 选中状态由调用方（ChatMessageItem）按消息粒度维护，本 hook 只负责：
 * - 跟踪每个 message 的采纳进行态（acceptingMessageIds）
 * - 跟踪每个 message 的最终态（appliedBatches：已采纳或已拒绝均加入）
 * - 跟踪每个 message 的错误文案（errorByMessageId）
 * - 提供 acceptBatch / dismissBatch 两个动作
 *
 * @module hooks/useProposalBatch
 * @author fxbin
 */

import { useCallback, useState } from 'react';
import api from '../utils/api';

/**
 * 工作区接口路径前缀。
 */
const WORKSPACES_PATH = '/api/workspaces';

/**
 * proposal-batches accept 端点路径后缀。
 */
const PROPOSAL_BATCH_ACCEPT_PATH = '/proposal-batches/accept';

/**
 * 流式路径 apply diff 状态 Hook。
 *
 * @param {object} params - 入参对象
 * @param {string|null} params.selectedWorkspaceId - 当前选中的工作区 ID
 * @param {(result: object, batch: object) => void} [params.onProposalsApplied] - 采纳成功回调，用于通知父组件刷新卡片/资料列表
 * @param {function} params.t - i18n 翻译函数
 * @returns {object} acceptingMessageIds / appliedBatches / errorByMessageId / acceptBatch / dismissBatch
 * @author fxbin
 */
export function useProposalBatch({ selectedWorkspaceId, onProposalsApplied, t }) {
  const [acceptingMessageIds, setAcceptingMessageIds] = useState(() => new Set());
  const [appliedBatches, setAppliedBatches] = useState(() => new Set());
  const [errorByMessageId, setErrorByMessageId] = useState(() => ({}));

  /**
   * 采纳指定消息的 proposal batch 中选中的操作。
   *
   * @param {string} assistantMessageId - assistant 消息 id（用于状态跟踪）
   * @param {object} batch - proposal batch 对象，包含 batchId 与 proposals
   * @param {Set<number>} selectedIndices - 选中的 proposal 下标集合
   * @returns {Promise<void>}
   * @author fxbin
   */
  const acceptBatch = useCallback(async (assistantMessageId, batch, selectedIndices) => {
    if (!selectedWorkspaceId) return;
    if (!batch || !Array.isArray(batch.proposals) || batch.proposals.length === 0) return;
    if (!selectedIndices || selectedIndices.size === 0) return;
    if (acceptingMessageIds.has(assistantMessageId)) return;
    if (appliedBatches.has(assistantMessageId)) return;

    const sortedIndices = Array.from(selectedIndices).sort(compareAscending);
    setAcceptingMessageIds((prev) => {
      const next = new Set(prev);
      next.add(assistantMessageId);
      return next;
    });
    setErrorByMessageId((prev) => ({ ...prev, [assistantMessageId]: '' }));

    try {
      const result = await api.post(
        `${WORKSPACES_PATH}/${selectedWorkspaceId}${PROPOSAL_BATCH_ACCEPT_PATH}`,
        {
          operations: batch.proposals,
          selectedIndices: sortedIndices,
        },
      );
      setAppliedBatches((prev) => {
        const next = new Set(prev);
        next.add(assistantMessageId);
        return next;
      });
      if (typeof onProposalsApplied === 'function') {
        onProposalsApplied(result, batch);
      }
    } catch (err) {
      setErrorByMessageId((prev) => ({
        ...prev,
        [assistantMessageId]: err?.serverMessage ?? err?.message ?? t('chat.proposalAcceptFailed'),
      }));
    } finally {
      setAcceptingMessageIds((prev) => {
        const next = new Set(prev);
        next.delete(assistantMessageId);
        return next;
      });
    }
  }, [selectedWorkspaceId, acceptingMessageIds, appliedBatches, onProposalsApplied, t]);

  /**
   * 拒绝指定消息的 proposal batch。
   *
   * 不调用后端，仅在前端标记为已处理，与 dismissProposedCards 行为一致。
   *
   * @param {string} assistantMessageId - assistant 消息 id
   * @author fxbin
   */
  const dismissBatch = useCallback((assistantMessageId) => {
    setAppliedBatches((prev) => {
      const next = new Set(prev);
      next.add(assistantMessageId);
      return next;
    });
  }, []);

  return {
    acceptingMessageIds,
    appliedBatches,
    errorByMessageId,
    acceptBatch,
    dismissBatch,
  };
}

/**
 * 数字升序比较器，用于 selectedIndices 排序。
 *
 * @param {number} a - 第一个数
 * @param {number} b - 第二个数
 * @returns {number} 比较结果
 * @author fxbin
 */
function compareAscending(a, b) {
  return a - b;
}
