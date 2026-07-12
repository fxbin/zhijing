/**
 * 资料库操作域 · 归档与删除状态 Hook。
 *
 * 管理单条/批量归档与删除确认相关状态：删除确认弹窗状态、归档撤销提示、
 * 删除弹窗 a11y 焦点管理、归档撤销定时器。提供单条归档、请求删除确认、
 * 确认批量归档（含乐观更新与失败回滚）、撤销归档四类业务函数。
 *
 * 依赖选择域 hook 提供的 selectedIds / setSelectedIds / 批处理标记与进度，
 * 以及数据域 hook 提供的 setItems / setStatus / loadMaterials。
 *
 * @module hooks/libraryOps/useArchiveState
 * @author fxbin
 */

import { useEffect, useRef, useState } from 'react';
import api from '../../utils/api';
import useModalA11y from '../useModalA11y';
import { MATERIALS_PATH } from '../../constants/apiPaths';
import { ARCHIVE_UNDO_TIMEOUT_MS } from './constants';

/**
 * 使用归档与删除状态。
 * @param {object} params - 入参对象
 * @param {function} params.t - i18n 翻译函数
 * @param {string} params.apiStatus - API 连接状态
 * @param {Array} params.items - 当前资料列表（来自数据域 hook）
 * @param {function} params.setItems - 设置资料列表（来自数据域 hook）
 * @param {function} params.setStatus - 设置状态文案（来自数据域 hook）
 * @param {function} params.loadMaterials - 重新加载资料列表（来自数据域 hook）
 * @param {function} [params.onMaterialMutation] - 资料变更回调
 * @param {Set<string>} params.selectedIds - 当前选中 ID 集合（来自选择域 hook）
 * @param {function} params.setSelectedIds - 设置选中 ID 集合（来自选择域 hook）
 * @param {boolean} params.isBatchProcessing - 是否批量处理中（来自选择域 hook）
 * @param {function} params.setIsBatchProcessing - 设置批量处理中标记（来自选择域 hook）
 * @param {function} params.setBatchProgress - 设置批量进度（来自选择域 hook）
 * @param {function} params.clearSelection - 清空选中集合（来自选择域 hook）
 * @returns {object} 归档域 state、setter 与业务函数
 * @author fxbin
 */
export function useArchiveState({
  t,
  apiStatus,
  items,
  setItems,
  setStatus,
  loadMaterials,
  onMaterialMutation,
  selectedIds,
  setSelectedIds,
  isBatchProcessing,
  setIsBatchProcessing,
  setBatchProgress,
  clearSelection,
}) {
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [archiveUndo, setArchiveUndo] = useState(null);
  const deleteModalRef = useRef(null);
  const archiveUndoTimerRef = useRef(null);
  useModalA11y(deleteModalRef, Boolean(deleteConfirm), () => setDeleteConfirm(null));

  useEffect(() => () => {
    if (archiveUndoTimerRef.current) clearTimeout(archiveUndoTimerRef.current);
  }, []);

  /**
   * 归档单条资料：调用归档接口并从列表中移除，同步通知外部回调。
   * @param {string} id - 资料 ID
   * @author fxbin
   */
  async function archiveSingleMaterial(id) {
    try {
      await api.post(`${MATERIALS_PATH}/${id}/archive`);
      setItems((current) => current.filter((item) => item.id !== id));
      setSelectedIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
      if (onMaterialMutation) onMaterialMutation();
    } catch {
      setStatus(t('library.archiveFailed'));
    }
  }

  /**
   * 触发批量删除确认：将当前选中 ID 写入删除确认态。
   * @author fxbin
   */
  async function requestDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0 || apiStatus !== 'online' || isBatchProcessing) return;
    setDeleteConfirm({ ids, loading: true, impact: null });
    try {
      const impacts = await Promise.all(
        ids.map((id) => api.get(`${MATERIALS_PATH}/${id}/delete-impact`)),
      );
      setDeleteConfirm((current) => {
        if (!current || current.ids.join('|') !== ids.join('|')) return current;
        return {
          ...current,
          loading: false,
          impact: {
            linkedCardCount: impacts.reduce((sum, item) => sum + (item.linkedCardCount ?? 0), 0),
            artifactReferenceCount: impacts.reduce((sum, item) => sum + (item.artifactReferenceCount ?? 0), 0),
          },
        };
      });
    } catch {
      setDeleteConfirm((current) => (current && current.ids.join('|') === ids.join('|')
        ? { ...current, loading: false, impact: null }
        : current));
    }
  }

  /**
   * 确认批量归档：乐观移除列表条目，逐条调用归档接口，失败时回滚并重新加载。
   * @author fxbin
   */
  async function confirmDelete() {
    const ids = deleteConfirm?.ids ?? [];
    if (ids.length === 0) return;
    setDeleteConfirm(null);
    const snapshot = items;
    setIsBatchProcessing(true);
    setBatchProgress({ done: 0, total: ids.length, action: t('library.archive') });
    setStatus(t('library.status.archivingMaterials', { count: ids.length }));
    const selectedSnapshot = new Set(ids);
    clearSelection();
    setItems((current) => current.filter((item) => !selectedSnapshot.has(item.id)));
    let failed = 0;
    const failedIds = [];
    for (let i = 0; i < ids.length; i += 1) {
      try {
        const result = await api.post(`${MATERIALS_PATH}/${ids[i]}/archive`);
        onMaterialMutation?.(result);
      } catch {
        failed += 1;
        failedIds.push(ids[i]);
      }
      setBatchProgress({ done: i + 1, total: ids.length, action: t('library.archive') });
    }
    if (failed > 0) {
      setStatus(t('library.status.archivePartialFailed', { success: ids.length - failed, failed }));
      setItems(snapshot);
      setSelectedIds(new Set(failedIds));
      await loadMaterials();
    } else {
      setStatus(t('library.status.archiveSuccess', { count: ids.length }));
      if (archiveUndoTimerRef.current) clearTimeout(archiveUndoTimerRef.current);
      setArchiveUndo({ ids, count: ids.length });
      archiveUndoTimerRef.current = setTimeout(() => setArchiveUndo(null), ARCHIVE_UNDO_TIMEOUT_MS);
    }
    setBatchProgress(null);
    setIsBatchProcessing(false);
  }

  /**
   * 撤销归档：对已归档的资料逐条调用反归档接口，结束后重新加载并汇总结果。
   * @author fxbin
   */
  async function undoArchive() {
    const ids = archiveUndo?.ids ?? [];
    if (ids.length === 0 || isBatchProcessing) return;
    if (archiveUndoTimerRef.current) clearTimeout(archiveUndoTimerRef.current);
    setArchiveUndo(null);
    setIsBatchProcessing(true);
    setStatus(t('library.status.restoringMaterials', { count: ids.length }));
    let failed = 0;
    for (const id of ids) {
      try {
        const result = await api.post(`${MATERIALS_PATH}/${id}/unarchive`);
        onMaterialMutation?.(result);
      } catch {
        failed += 1;
      }
    }
    await loadMaterials();
    setStatus(failed ? t('library.status.restorePartialFailed', { success: ids.length - failed, failed }) : t('library.status.restoreSuccess', { count: ids.length }));
    setIsBatchProcessing(false);
  }

  return {
    deleteConfirm,
    setDeleteConfirm,
    archiveUndo,
    deleteModalRef,
    archiveSingleMaterial,
    requestDelete,
    confirmDelete,
    undoArchive,
  };
}
