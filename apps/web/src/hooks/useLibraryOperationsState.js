/**
 * 资料库视图 · 操作域状态 Hook（主壳）。
 *
 * 作为操作域 hook 的统一入口，组合以下子 hook 并 re-export 其返回值：
 * - useCaptureState：收集输入、捕获模式、收集/导入中状态、处理中状态轮播、
 *   单条/批量收集、文件导入、解析触发。
 * - useSelectionState：批量选中集合、批处理中标记、批处理进度、批量归属目标、
 *   单条/全选/清空选择。
 * - useArchiveState：删除确认、归档撤销提示、删除弹窗 a11y、单条归档、
 *   请求删除确认、确认批量归档（含乐观更新与失败回滚）、撤销归档。
 * - useReviewAssignState：复核中资料 ID、复核草稿、归属草稿、新建工作区标题、
 *   归属提示、变更中资料 ID 互斥锁、打开/关闭复核、保存复核、单条归属、归属建议。
 * - useBatchOperations：批量重解析、批量归属。
 *
 * 数据域 hook 通过 setItems/setStatus/setCaptureSummary/loadMaterials 等注入跨域依赖。
 *
 * @module hooks/useLibraryOperationsState
 * @author fxbin
 */

import { useCaptureState } from './libraryOps/useCaptureState';
import { useSelectionState } from './libraryOps/useSelectionState';
import { useArchiveState } from './libraryOps/useArchiveState';
import { useReviewAssignState } from './libraryOps/useReviewAssignState';
import { useBatchOperations } from './libraryOps/useBatchOperations';

/**
 * 使用资料库操作域状态。
 * @param {object} params - 入参对象
 * @param {function} params.t - i18n 翻译函数
 * @param {string} params.apiStatus - API 连接状态
 * @param {Array} params.items - 当前资料列表（来自数据域 hook）
 * @param {function} params.setItems - 设置资料列表（来自数据域 hook）
 * @param {function} params.setStatus - 设置状态文案（来自数据域 hook）
 * @param {function} params.setCaptureSummary - 设置捕获汇总（来自数据域 hook）
 * @param {function} params.loadMaterials - 重新加载资料列表（来自数据域 hook）
 * @param {function} [params.onCaptureResult] - 收集结果回调
 * @param {function} [params.onMaterialMutation] - 资料变更回调
 * @param {function} [params.onParseMaterial] - 解析资料回调
 * @returns {object} 操作域 state、setter 与业务函数
 * @author fxbin
 */
export function useLibraryOperationsState({
  t,
  apiStatus,
  items,
  setItems,
  setStatus,
  setCaptureSummary,
  loadMaterials,
  onCaptureResult,
  onMaterialMutation,
  onParseMaterial,
}) {
  const captureState = useCaptureState({
    t,
    apiStatus,
    setStatus,
    setCaptureSummary,
    loadMaterials,
    onCaptureResult,
    onParseMaterial,
  });

  const selectionState = useSelectionState();

  const archiveState = useArchiveState({
    t,
    apiStatus,
    items,
    setItems,
    setStatus,
    loadMaterials,
    onMaterialMutation,
    selectedIds: selectionState.selectedIds,
    setSelectedIds: selectionState.setSelectedIds,
    isBatchProcessing: selectionState.isBatchProcessing,
    setIsBatchProcessing: selectionState.setIsBatchProcessing,
    setBatchProgress: selectionState.setBatchProgress,
    clearSelection: selectionState.clearSelection,
  });

  const reviewAssignState = useReviewAssignState({
    t,
    apiStatus,
    setStatus,
    loadMaterials,
    onMaterialMutation,
  });

  const batchOperations = useBatchOperations({
    t,
    apiStatus,
    items,
    setStatus,
    loadMaterials,
    onParseMaterial,
    onMaterialMutation,
    selectedIds: selectionState.selectedIds,
    clearSelection: selectionState.clearSelection,
    isBatchProcessing: selectionState.isBatchProcessing,
    setIsBatchProcessing: selectionState.setIsBatchProcessing,
    setBatchProgress: selectionState.setBatchProgress,
    batchAssignTarget: selectionState.batchAssignTarget,
    setBatchAssignTarget: selectionState.setBatchAssignTarget,
  });

  return {
    ...captureState,
    ...selectionState,
    ...archiveState,
    ...reviewAssignState,
    ...batchOperations,
  };
}

export {
  NEW_WORKSPACE_MARKER,
  DEFAULT_CAPTURE_MODE,
  DEFAULT_BATCH_ASSIGN_TARGET,
  FILE_INPUT_ACCEPT,
} from './libraryOps/constants';
