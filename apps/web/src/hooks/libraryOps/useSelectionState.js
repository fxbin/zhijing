/**
 * 资料库操作域 · 批量选择状态 Hook。
 *
 * 管理批量操作所需的核心状态：选中 ID 集合、批处理中标记、批处理进度、
 * 批量归属目标工作区。提供单条切换、全选/全不选可见、清空选中三类操作。
 * 这些状态会被归档、批量重解析、批量归属等业务函数共享。
 *
 * @module hooks/libraryOps/useSelectionState
 * @author fxbin
 */

import { useState } from 'react';
import {
  DEFAULT_BATCH_ASSIGN_TARGET,
  createEmptySelectedSet,
} from './constants';

/**
 * 使用批量选择状态。
 * @returns {object} 选择域 state、setter 与切换函数
 * @author fxbin
 */
export function useSelectionState() {
  const [selectedIds, setSelectedIds] = useState(createEmptySelectedSet);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState(null);
  const [batchAssignTarget, setBatchAssignTarget] = useState(DEFAULT_BATCH_ASSIGN_TARGET);

  /**
   * 切换单条资料选中态：已选则取消，未选则追加。
   * @param {string} id - 资料 ID
   * @author fxbin
   */
  function toggleMaterialSelection(id) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /**
   * 全选/全不选可见资料：依据当前选中态判断切换方向。
   * @param {Array<string>} visibleIds - 当前可见资料 ID 列表
   * @author fxbin
   */
  function toggleSelectAllVisible(visibleIds) {
    setSelectedIds((current) => {
      const next = new Set(current);
      const selectedVisibleCount = visibleIds.filter((id) => current.has(id)).length;
      const allVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;
      if (allVisibleSelected) {
        for (const id of visibleIds) next.delete(id);
      } else {
        for (const id of visibleIds) next.add(id);
      }
      return next;
    });
  }

  /**
   * 清空选中集合。
   * @author fxbin
   */
  function clearSelection() {
    setSelectedIds(new Set());
  }

  return {
    selectedIds,
    setSelectedIds,
    isBatchProcessing,
    setIsBatchProcessing,
    batchProgress,
    setBatchProgress,
    batchAssignTarget,
    setBatchAssignTarget,
    toggleMaterialSelection,
    toggleSelectAllVisible,
    clearSelection,
  };
}
