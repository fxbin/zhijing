/**
 * 资料库操作域 · 批量操作 Hook。
 *
 * 提供对选中资料的批量重解析与批量归属两类业务函数：逐条触发外部解析、
 * 逐条调用归属接口到目标工作区。两类函数都依赖选择域 hook 提供的
 * 选中集合、批处理中标记、批处理进度 setter 与清空选中函数，
 * 以及数据域 hook 提供的 setStatus / loadMaterials。
 *
 * @module hooks/libraryOps/useBatchOperations
 * @author fxbin
 */

import api from '../../utils/api';
import { canParseMaterial } from '../../utils/material';
import { MATERIALS_PATH } from '../../constants/apiPaths';
import { DEFAULT_BATCH_ASSIGN_TARGET } from './constants';

/**
 * 使用批量操作。
 * @param {object} params - 入参对象
 * @param {function} params.t - i18n 翻译函数
 * @param {string} params.apiStatus - API 连接状态
 * @param {Array} params.items - 当前资料列表（来自数据域 hook）
 * @param {function} params.setStatus - 设置状态文案（来自数据域 hook）
 * @param {function} params.loadMaterials - 重新加载资料列表（来自数据域 hook）
 * @param {function} [params.onParseMaterial] - 解析资料回调
 * @param {function} [params.onMaterialMutation] - 资料变更回调
 * @param {Set<string>} params.selectedIds - 当前选中 ID 集合（来自选择域 hook）
 * @param {function} params.clearSelection - 清空选中集合（来自选择域 hook）
 * @param {boolean} params.isBatchProcessing - 是否批量处理中（来自选择域 hook）
 * @param {function} params.setIsBatchProcessing - 设置批量处理中标记（来自选择域 hook）
 * @param {function} params.setBatchProgress - 设置批量进度（来自选择域 hook）
 * @param {string} params.batchAssignTarget - 批量归属目标工作区 ID（来自选择域 hook）
 * @param {function} params.setBatchAssignTarget - 设置批量归属目标（来自选择域 hook）
 * @returns {object} 批量操作业务函数
 * @author fxbin
 */
export function useBatchOperations({
  t,
  apiStatus,
  items,
  setStatus,
  loadMaterials,
  onParseMaterial,
  onMaterialMutation,
  selectedIds,
  clearSelection,
  isBatchProcessing,
  setIsBatchProcessing,
  setBatchProgress,
  batchAssignTarget,
  setBatchAssignTarget,
}) {
  /**
   * 批量重解析：对选中且可解析的资料逐条触发外部解析，结束后重新加载并汇总结果。
   * @author fxbin
   */
  async function reparseSelected() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0 || apiStatus !== 'online' || isBatchProcessing) return;
    const targets = items.filter((item) => selectedIds.has(item.id) && canParseMaterial(item));
    if (targets.length === 0) {
      setStatus(t('library.status.noReparseTargets'));
      return;
    }
    setIsBatchProcessing(true);
    setBatchProgress({ done: 0, total: targets.length, action: t('library.parse') });
    setStatus(t('library.status.reparsingMaterials', { count: targets.length }));
    let failed = 0;
    for (let i = 0; i < targets.length; i += 1) {
      try {
        if (onParseMaterial) await onParseMaterial(targets[i].id);
      } catch {
        failed += 1;
      }
      setBatchProgress({ done: i + 1, total: targets.length, action: t('library.parse') });
    }
    await loadMaterials();
    setStatus(failed ? t('library.status.reparsePartialFailed', { success: targets.length - failed, failed }) : t('library.status.reparseSuccess', { count: targets.length }));
    setBatchProgress(null);
    setIsBatchProcessing(false);
  }

  /**
   * 批量归属：对选中资料逐条调用归属接口到目标工作区，结束后清空选中并汇总结果。
   * @author fxbin
   */
  async function assignSelected() {
    const target = batchAssignTarget;
    const ids = Array.from(selectedIds);
    if (ids.length === 0 || apiStatus !== 'online' || isBatchProcessing || !target) return;
    setIsBatchProcessing(true);
    setBatchProgress({ done: 0, total: ids.length, action: t('library.assign') });
    setStatus(t('library.status.movingMaterials', { count: ids.length }));
    let failed = 0;
    for (let i = 0; i < ids.length; i += 1) {
      try {
        const result = await api.post(`${MATERIALS_PATH}/${ids[i]}/assign`, { workspaceId: target });
        onMaterialMutation?.(result);
      } catch {
        failed += 1;
      }
      setBatchProgress({ done: i + 1, total: ids.length, action: t('library.assign') });
    }
    await loadMaterials();
    setStatus(failed ? t('library.status.movePartialFailed', { success: ids.length - failed, failed }) : t('library.status.moveSuccess', { count: ids.length }));
    setBatchAssignTarget(DEFAULT_BATCH_ASSIGN_TARGET);
    clearSelection();
    setBatchProgress(null);
    setIsBatchProcessing(false);
  }

  return {
    reparseSelected,
    assignSelected,
  };
}
