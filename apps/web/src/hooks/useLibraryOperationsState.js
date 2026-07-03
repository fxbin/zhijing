/**
 * 资料库视图 · 操作域状态 Hook。
 * 统一管理收集输入、收集模式、收集/导入中状态、批量选择集合、批量处理进度、
 * 批量归属目标、删除确认、复核中资料 ID、复核草稿、归属草稿、新建工作区标题、
 * 归属提示、变更中资料 ID 等状态，并提供单条/批量收集、文件导入、解析触发、
 * 复核开启/保存、归属指派/建议、归档、批量删除/重解析/归属等业务函数。
 * 数据域 hook 通过 setItems/setStatus/setCaptureSummary/loadMaterials 等注入跨域依赖。
 * @module hooks/useLibraryOperationsState
 * @author fxbin
 */

import { useEffect, useRef, useState } from 'react';
import api, { ApiError } from '../utils/api';
import {
  canParseMaterial,
  materialMediaUrls,
  splitBatchCaptureInput,
  splitMediaUrls,
} from '../utils/material';
import {
  maxImportedFileSize,
  supportedImportExtensions,
} from '../constants/options';
import useModalA11y from './useModalA11y';

/**
 * 新建工作区标记值：归属下拉框中选择新建工作区时使用。
 */
const NEW_WORKSPACE_MARKER = '__new';

/**
 * 默认捕获模式：自动识别。
 */
const DEFAULT_CAPTURE_MODE = 'auto';

/**
 * 默认批量归属目标为空字符串。
 */
const DEFAULT_BATCH_ASSIGN_TARGET = '';

/**
 * 复核草稿初始空值。
 */
const INITIAL_REVIEW_DRAFT = { title: '', contentText: '', mediaUrls: '' };

/**
 * 创建初始为空的选中 ID 集合。
 * @returns {Set<string>} 空集合
 * @author fxbin
 */
function createEmptySelectedSet() {
  return new Set();
}

/**
 * 资料接口路径前缀。
 */
const MATERIALS_PATH = '/api/materials';

/**
 * 归集接口路径。
 */
const INTAKE_PATH = '/api/intake';

/**
 * 本地文档导入时拼接的前缀文案。
 */
const LOCAL_FILE_PREFIX = '本地文档：';

/**
 * 文件输入 accept 属性默认值。
 */
const FILE_INPUT_ACCEPT = '.md,.markdown,.txt,text/markdown,text/plain';

/**
 * 归档撤销提示保留时长（毫秒）。
 */
const ARCHIVE_UNDO_TIMEOUT_MS = 9000;

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
  const [captureValue, setCaptureValue] = useState('');
  const [captureMode, setCaptureMode] = useState(DEFAULT_CAPTURE_MODE);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isImportingFile, setIsImportingFile] = useState(false);

  const isProcessing = isCapturing || isImportingFile;
  const processingStageRef = useRef(0);
  const processingTimerRef = useRef(null);
  const processingStages = [
    t('library.status.processingStage1'),
    t('library.status.processingStage2'),
    t('library.status.processingStage3'),
  ];

  useEffect(() => {
    if (!isProcessing) {
      if (processingTimerRef.current) {
        clearInterval(processingTimerRef.current);
        processingTimerRef.current = null;
      }
      processingStageRef.current = 0;
      return undefined;
    }
    setStatus(processingStages[0]);
    processingTimerRef.current = setInterval(() => {
      processingStageRef.current = (processingStageRef.current + 1) % processingStages.length;
      setStatus(processingStages[processingStageRef.current]);
    }, 3500);
    return () => {
      if (processingTimerRef.current) clearInterval(processingTimerRef.current);
    };
  }, [isProcessing]);

  const [selectedIds, setSelectedIds] = useState(createEmptySelectedSet);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState(null);
  const [batchAssignTarget, setBatchAssignTarget] = useState(DEFAULT_BATCH_ASSIGN_TARGET);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [archiveUndo, setArchiveUndo] = useState(null);
  const deleteModalRef = useRef(null);
  const archiveUndoTimerRef = useRef(null);
  useModalA11y(deleteModalRef, Boolean(deleteConfirm), () => setDeleteConfirm(null));

  useEffect(() => () => {
    if (archiveUndoTimerRef.current) clearTimeout(archiveUndoTimerRef.current);
  }, []);

  const [reviewingId, setReviewingId] = useState(null);
  const [reviewDraft, setReviewDraft] = useState(INITIAL_REVIEW_DRAFT);
  const [assignDrafts, setAssignDrafts] = useState({});
  const [newBaseTitles, setNewBaseTitles] = useState({});
  const [assignmentHints, setAssignmentHints] = useState({});
  const [mutatingMaterialId, setMutatingMaterialId] = useState(null);

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
   * 触发收集：依据捕获模式走单条或批量路径，写入捕获汇总与状态文案，结束后重新加载资料。
   * @author fxbin
   */
  async function capture() {
    const value = captureValue.trim();
    if (!value || isCapturing || apiStatus !== 'online') return;
    setIsCapturing(true);
    const batchItems = captureMode === 'batch' ? splitBatchCaptureInput(value) : [];
    try {
      if (captureMode === 'batch') {
        if (batchItems.length === 0) throw new Error('Empty batch.');
        let captured = 0;
        let failed = 0;
        let lastResult = null;
        for (const input of batchItems) {
          try {
            lastResult = await api.post(INTAKE_PATH, { input });
            captured += 1;
          } catch {
            failed += 1;
          }
        }
        if (lastResult) onCaptureResult(lastResult);
        setCaptureValue('');
        setStatus(failed ? t('library.status.captureBatchResultWithFailed', { captured, failed }) : t('library.status.captureBatchResultSuccess', { captured }));
        setCaptureSummary({ message: failed ? t('library.status.captureBatchResultWithFailed', { captured, failed }) : t('library.status.captureBatchResultSuccess', { captured }), count: captured, at: Date.now() });
        await loadMaterials();
        return;
      }
      const result = await api.post(INTAKE_PATH, { input: value });
      onCaptureResult(result);
      setCaptureValue('');
      setStatus(result.message);
      setCaptureSummary({ message: result.message || t('library.status.materialCaptured'), count: 1, at: Date.now() });
      await loadMaterials();
    } catch {
      setStatus(t('library.status.captureFailed'));
    } finally {
      setIsCapturing(false);
    }
  }

  /**
   * 导入本地文本文件：校验类型与大小后读取内容并归集到 inbox。
   * @param {Event} event - 文件输入 change 事件
   * @author fxbin
   */
  async function importTextFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || isImportingFile) return;
    if (apiStatus !== 'online') {
      setStatus(t('library.status.apiDisconnectedImport'));
      return;
    }
    const lowerName = file.name.toLowerCase();
    const isSupported = supportedImportExtensions.some((extension) => lowerName.endsWith(extension));
    if (!isSupported) {
      setStatus(t('library.status.unsupportedFileType'));
      return;
    }
    if (file.size > maxImportedFileSize) {
      setStatus(t('library.status.fileTooLarge'));
      return;
    }
    setIsImportingFile(true);
    try {
      const text = (await file.text()).trim();
      if (!text) throw new Error('Empty file.');
      const result = await api.post(INTAKE_PATH, { input: `${LOCAL_FILE_PREFIX}${file.name}\n\n${text}` });
      onCaptureResult(result);
      setStatus(result.message);
      setCaptureSummary({ message: result.message || t('library.status.localFileCaptured'), count: 1, at: Date.now() });
      await loadMaterials();
    } catch {
      setStatus(t('library.status.importFileFailed'));
    } finally {
      setIsImportingFile(false);
    }
  }

  /**
   * 触发外部解析资料并重新加载列表。
   * @param {string} materialId - 资料 ID
   * @author fxbin
   */
  async function parseFromLibrary(materialId) {
    if (!onParseMaterial) return;
    await onParseMaterial(materialId);
    await loadMaterials();
  }

  /**
   * 开启复核抽屉：设置复核资料 ID 并根据资料初始化复核草稿。
   * 关闭动作统一由 closeReview 负责，避免与抽屉 onClose 行为冲突。
   * @param {object} item - 资料对象
   * @author fxbin
   */
  function openReview(item) {
    setReviewingId(item.id);
    setReviewDraft({
      title: item.title ?? '',
      contentText: item.contentText ?? '',
      mediaUrls: (materialMediaUrls(item) ?? []).join('\n'),
    });
  }

  /**
   * 关闭复核抽屉：清空复核资料 ID。草稿不主动重置，下次 openReview 会重新初始化。
   * @author fxbin
   */
  function closeReview() {
    setReviewingId(null);
  }

  /**
   * 保存复核草稿：可选标记为已摄入，结束后重新加载资料。
   * @param {object} item - 资料对象
   * @param {boolean} markIngested - 是否标记为已摄入
   * @author fxbin
   */
  async function saveReview(item, markIngested) {
    if (!item?.id || apiStatus !== 'online' || mutatingMaterialId) return;
    setMutatingMaterialId(item.id);
    setStatus(markIngested ? t('library.status.completingMaterial') : t('library.status.savingReviewDraft'));
    try {
      const result = await api.post(`${MATERIALS_PATH}/${item.id}/review`, {
        title: reviewDraft.title,
        contentText: reviewDraft.contentText,
        mediaUrls: splitMediaUrls(reviewDraft.mediaUrls),
        markIngested,
      });
      onMaterialMutation?.(result);
      setStatus(result.message);
      if (markIngested) setReviewingId(null);
      await loadMaterials();
    } catch {
      setStatus(t('library.status.saveReviewFailed'));
    } finally {
      setMutatingMaterialId(null);
    }
  }

  /**
   * 归属单条资料：依据草稿选择的目标工作区或新建工作区标题调用归属接口。
   * @param {object} item - 资料对象
   * @author fxbin
   */
  async function assignMaterial(item) {
    if (!item?.id || apiStatus !== 'online' || mutatingMaterialId) return;
    const target = assignDrafts[item.id] ?? item.workspaceId ?? '';
    const newWorkspaceTitle = (newBaseTitles[item.id] ?? item.title ?? '').trim();
    if (!target) return;
    if (target === item.workspaceId && target !== NEW_WORKSPACE_MARKER) {
      setStatus(t('library.status.alreadyInThisKb'));
      setAssignDrafts((current) => ({ ...current, [item.id]: undefined }));
      return;
    }
    setMutatingMaterialId(item.id);
    setStatus(t('library.status.updatingAssignment'));
    try {
      const result = await api.post(
        `${MATERIALS_PATH}/${item.id}/assign`,
        target === NEW_WORKSPACE_MARKER ? { newWorkspaceTitle } : { workspaceId: target },
      );
      onMaterialMutation?.(result);
      setStatus(result.message);
      setAssignDrafts((current) => ({ ...current, [item.id]: result.workspace.id }));
      await loadMaterials();
    } catch {
      setStatus(t('library.status.moveMaterialFailed'));
    } finally {
      setMutatingMaterialId(null);
    }
  }

  /**
   * 请求归属建议：调用建议接口，写入归属草稿、新建标题与提示文案。
   * @param {object} item - 资料对象
   * @author fxbin
   */
  async function suggestAssignment(item) {
    if (!item?.id || apiStatus !== 'online' || mutatingMaterialId) return;
    setMutatingMaterialId(item.id);
    setStatus(t('library.status.findingSuggestion'));
    try {
      const result = await api.get(`${MATERIALS_PATH}/${item.id}/assignment-suggestions`);
      const suggestion = result.suggestions?.[0];
      if (suggestion?.isNew) {
        setAssignDrafts((current) => ({ ...current, [item.id]: NEW_WORKSPACE_MARKER }));
        setNewBaseTitles((current) => ({ ...current, [item.id]: suggestion.title }));
      } else if (suggestion?.workspaceId) {
        setAssignDrafts((current) => ({ ...current, [item.id]: suggestion.workspaceId }));
      }
      setAssignmentHints((current) => ({
        ...current,
        [item.id]: suggestion ? `${suggestion.title} · ${suggestion.reason}` : result.message,
      }));
      setStatus(result.message);
    } catch {
      setStatus(t('library.status.suggestionFailed'));
    } finally {
      setMutatingMaterialId(null);
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
    captureValue,
    setCaptureValue,
    captureMode,
    setCaptureMode,
    isCapturing,
    isImportingFile,
    selectedIds,
    setSelectedIds,
    isBatchProcessing,
    batchProgress,
    batchAssignTarget,
    setBatchAssignTarget,
    deleteConfirm,
    setDeleteConfirm,
    archiveUndo,
    deleteModalRef,
    reviewingId,
    reviewDraft,
    setReviewDraft,
    assignDrafts,
    setAssignDrafts,
    newBaseTitles,
    setNewBaseTitles,
    assignmentHints,
    setAssignmentHints,
    mutatingMaterialId,
    toggleMaterialSelection,
    toggleSelectAllVisible,
    clearSelection,
    archiveSingleMaterial,
    capture,
    importTextFile,
    parseFromLibrary,
    openReview,
    closeReview,
    saveReview,
    assignMaterial,
    suggestAssignment,
    requestDelete,
    confirmDelete,
    undoArchive,
    reparseSelected,
    assignSelected,
  };
}

export {
  NEW_WORKSPACE_MARKER,
  DEFAULT_CAPTURE_MODE,
  DEFAULT_BATCH_ASSIGN_TARGET,
  FILE_INPUT_ACCEPT,
};
