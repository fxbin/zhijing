/**
 * 流式对话提议操作（apply diff）状态 Hook。
 *
 * 与 useProposedCards 的区别：
 * - useProposedCards 处理旧 /ask 路径一次性返回的 ProposedCard[]，
 *   采纳端点为 POST /api/messages/:id/accept-cards。
 * - useProposalBatch 处理流式 proposal_batch 事件下发的 ProposedOperation[]，
 *   采纳端点为 POST /api/workspaces/:id/proposal-batches/accept。
 *
 * 状态跟踪：
 * - acceptingMessageIds：批量采纳进行中的 message 集合
 * - acceptingMessageIndices：单条采纳进行中的 `messageId:index` 集合
 * - appliedBatches：已整体处理（dismiss 或全部单条处理完）的 message 集合
 * - appliedIndicesByMessage：每个 message 已成功采纳的 proposal 下标集合
 * - dismissedIndicesByMessage：每个 message 已跳过的 proposal 下标集合
 * - errorByMessageId：每个 message 的最近错误文案
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
 * @returns {object} 状态字段与动作函数集合
 * @author fxbin
 */
export function useProposalBatch({ selectedWorkspaceId, onProposalsApplied, t }) {
  const [acceptingMessageIds, setAcceptingMessageIds] = useState(() => new Set());
  const [acceptingMessageIndices, setAcceptingMessageIndices] = useState(() => new Set());
  const [appliedBatches, setAppliedBatches] = useState(() => new Set());
  const [appliedIndicesByMessage, setAppliedIndicesByMessage] = useState(() => ({}));
  const [dismissedIndicesByMessage, setDismissedIndicesByMessage] = useState(() => ({}));
  const [errorByMessageId, setErrorByMessageId] = useState(() => ({}));

  /**
   * 批量采纳指定消息的 proposal batch 中选中的操作。
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
      setAppliedIndicesByMessage((prev) => {
        const existing = prev[assistantMessageId] ? new Set(prev[assistantMessageId]) : new Set();
        for (const idx of sortedIndices) existing.add(idx);
        return { ...prev, [assistantMessageId]: existing };
      });
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
   * 单条采纳指定消息的 proposal。
   *
   * 与 acceptBatch 共用后端端点，仅传 `selectedIndices=[index]`。
   * 成功后只更新 appliedIndicesByMessage，不把整个 messageId 标记为 applied。
   *
   * @param {string} assistantMessageId - assistant 消息 id
   * @param {object} batch - proposal batch 对象
   * @param {number} index - 单条 proposal 下标
   * @returns {Promise<void>}
   * @author fxbin
   */
  const acceptSingle = useCallback(async (assistantMessageId, batch, index) => {
    if (!selectedWorkspaceId) return;
    if (!batch || !Array.isArray(batch.proposals)) return;
    if (appliedBatches.has(assistantMessageId)) return;
    const appliedSet = appliedIndicesByMessage[assistantMessageId] ?? new Set();
    if (appliedSet.has(index)) return;
    const key = `${assistantMessageId}:${index}`;
    if (acceptingMessageIndices.has(key)) return;

    setAcceptingMessageIndices((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    setErrorByMessageId((prev) => ({ ...prev, [assistantMessageId]: '' }));

    try {
      const result = await api.post(
        `${WORKSPACES_PATH}/${selectedWorkspaceId}${PROPOSAL_BATCH_ACCEPT_PATH}`,
        {
          operations: batch.proposals,
          selectedIndices: [index],
        },
      );
      setAppliedIndicesByMessage((prev) => {
        const existing = prev[assistantMessageId] ? new Set(prev[assistantMessageId]) : new Set();
        existing.add(index);
        return { ...prev, [assistantMessageId]: existing };
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
      setAcceptingMessageIndices((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }, [selectedWorkspaceId, acceptingMessageIndices, appliedBatches, appliedIndicesByMessage, onProposalsApplied, t]);

  /**
   * 跳过指定消息的单条 proposal（前端标记，不调后端）。
   *
   * @param {string} assistantMessageId - assistant 消息 id
   * @param {number} index - 单条 proposal 下标
   * @author fxbin
   */
  const dismissSingle = useCallback((assistantMessageId, index) => {
    setDismissedIndicesByMessage((prev) => {
      const existing = prev[assistantMessageId] ? new Set(prev[assistantMessageId]) : new Set();
      existing.add(index);
      return { ...prev, [assistantMessageId]: existing };
    });
  }, []);

  /**
   * 拒绝指定消息的整个 proposal batch。
   *
   * 不调用后端，仅在前端标记为已处理。
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
    acceptingMessageIndices,
    appliedBatches,
    appliedIndicesByMessage,
    dismissedIndicesByMessage,
    errorByMessageId,
    acceptBatch,
    acceptSingle,
    dismissSingle,
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
