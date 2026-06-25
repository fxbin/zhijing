/**
 * 微信读书导入/批量选择/预览域状态 Hook。
 * 统一管理导入中 ID 集合、导入结果映射、批量选择态、选中 ID 集合、
 * 批量进度、预览书籍、预览模式、Toast 提示、目标知识库 ID，
 * 并提供单本/批量导入、预览开启/关闭、选中切换、批量启动等业务函数。
 * @module hooks/useWeReadImportState
 * @author fxbin
 */

import { useCallback, useEffect, useState } from 'react';
import api from '../utils/api';
import {
  PREVIEW_MODE_SINGLE,
  PREVIEW_MODE_BATCH,
  TOAST_AUTODISMISS_MS,
  TOAST_TYPE_SUCCESS,
  TOAST_TYPE_ERROR,
  WEREAD_IMPORT_PATH,
} from '../constants/weread';

/**
 * 导入中 ID 集合初始为空集合。
 */
function createEmptyImportingSet() {
  return new Set();
}

/**
 * 导入结果映射初始为空对象。
 */
function createEmptyImportResults() {
  return {};
}

/**
 * 批量选择态初始为 false。
 */
const INITIAL_SELECTING = false;

/**
 * 选中 ID 集合初始为空集合。
 */
function createEmptySelectedSet() {
  return new Set();
}

/**
 * 批量进度初始为 null（未进行批量导入）。
 */
const INITIAL_BATCH = null;

/**
 * 预览书籍初始为 null（未打开预览）。
 */
const INITIAL_PREVIEW_BOOK = null;

/**
 * 预览模式初始为单本。
 */
const INITIAL_PREVIEW_MODE = PREVIEW_MODE_SINGLE;

/**
 * Toast 提示初始为 null（无提示）。
 */
const INITIAL_TOAST = null;

/**
 * 目标知识库 ID 初始为空字符串。
 */
const INITIAL_TARGET_KB_ID = '';

/**
 * 使用微信读书导入/批量选择/预览域状态。
 * @param {object} params - 入参对象
 * @param {function} params.t - i18n 翻译函数
 * @param {function} [params.onOpenWorkspace] - 打开工作区回调
 * @param {Map<string, object>} [params.bookMap] - 书籍 ID 到书籍对象的映射，用于批量导入定位首本
 * @param {string|null} [params.selectedWorkspaceId] - 当前选中的工作区 ID，用于初始化目标知识库
 * @returns {object} 导入/批量选择/预览域 state、setter 与业务函数
 * @author fxbin
 */
export function useWeReadImportState({ t, onOpenWorkspace, bookMap, selectedWorkspaceId }) {
  const [importingIds, setImportingIds] = useState(createEmptyImportingSet);
  const [importResults, setImportResults] = useState(createEmptyImportResults);
  const [selecting, setSelecting] = useState(INITIAL_SELECTING);
  const [selectedIds, setSelectedIds] = useState(createEmptySelectedSet);
  const [batch, setBatch] = useState(INITIAL_BATCH);
  const [previewBook, setPreviewBook] = useState(INITIAL_PREVIEW_BOOK);
  const [previewMode, setPreviewMode] = useState(INITIAL_PREVIEW_MODE);
  const [toast, setToast] = useState(INITIAL_TOAST);
  const [targetKbId, setTargetKbId] = useState(selectedWorkspaceId || INITIAL_TARGET_KB_ID);

  /**
   * 目标知识库跟随外部选中工作区变化。
   * @author fxbin
   */
  useEffect(() => {
    setTargetKbId(selectedWorkspaceId || INITIAL_TARGET_KB_ID);
  }, [selectedWorkspaceId]);

  /**
   * Toast 自动消失副作用：toast 变化后延时清空。
   * @author fxbin
   */
  useEffect(() => {
    if (!toast) return;
    const handle = setTimeout(() => setToast(null), TOAST_AUTODISMISS_MS);
    return () => clearTimeout(handle);
  }, [toast]);

  /**
   * 写入 Toast 提示。
   * @param {object} next - Toast 对象，包含 type、text、可选 action
   * @author fxbin
   */
  const showToast = useCallback((next) => setToast(next), []);

  /**
   * 导入单本书籍。
   * 成功时写入导入结果并返回成功对象；失败时写入失败结果并返回失败对象。
   * 导入期间将 bookId 加入导入中集合，结束（无论成败）后移除。
   * @param {string|number} bookId - 书籍 ID
   * @returns {Promise<object|null>} 导入结果对象，重复导入或异常时返回 null
   * @author fxbin
   */
  const importBook = useCallback(async (bookId) => {
    const id = String(bookId);
    if (importingIds.has(id)) return null;
    setImportingIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    const body = { bookId: id };
    if (targetKbId) body.workspaceId = targetKbId;
    try {
      const data = await api.post(WEREAD_IMPORT_PATH, body);
      const ok = {
        ok: true,
        title: data.title,
        bookmarkCount: data.bookmarkCount,
        reviewCount: data.reviewCount,
        materialId: data.materialId,
        workspaceId: targetKbId || null,
      };
      setImportResults((prev) => ({ ...prev, [id]: ok }));
      return ok;
    } catch {
      const fail = { ok: false, error: t('weread.loadShelfFailed') };
      setImportResults((prev) => ({ ...prev, [id]: fail }));
      return fail;
    } finally {
      setImportingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [importingIds, targetKbId, t]);

  /**
   * 打开预览抽屉（单本导入模式）。
   * @param {object} book - 待预览的书籍对象
   * @author fxbin
   */
  const handleImport = useCallback((book) => {
    setPreviewMode(PREVIEW_MODE_SINGLE);
    setPreviewBook(book);
  }, []);

  /**
   * 关闭预览抽屉。
   * @author fxbin
   */
  const closePreview = useCallback(() => {
    setPreviewBook(null);
  }, []);

  /**
   * 切换单本书籍的选中态：已选则取消，未选则追加。
   * @param {string|number} bookId - 书籍 ID
   * @author fxbin
   */
  const toggleSelect = useCallback((bookId) => {
    const id = String(bookId);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  /**
   * 进入批量选择模式：开启选择态并清空已有选中。
   * @author fxbin
   */
  const enterSelecting = useCallback(() => {
    setSelecting(true);
    setSelectedIds(new Set());
  }, []);

  /**
   * 退出批量选择模式：关闭选择态、清空选中、清空批量进度。
   * @author fxbin
   */
  const exitSelecting = useCallback(() => {
    setSelecting(false);
    setSelectedIds(new Set());
    setBatch(null);
  }, []);

  /**
   * 全选当前过滤排序后的书籍。
   * @param {Array<object>} sortedBooks - 当前过滤排序后的书籍列表
   * @author fxbin
   */
  const selectAllFiltered = useCallback((sortedBooks) => {
    setSelectedIds(new Set(sortedBooks.map((b) => String(b.bookId))));
  }, []);

  /**
   * 启动批量导入：取第一本选中书籍进入批量预览模式。
   * 若选中为空或首本不存在则静默返回。
   * @author fxbin
   */
  const batchImport = useCallback(() => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    const firstBook = bookMap.get(ids[0]);
    if (!firstBook) return;
    setPreviewMode(PREVIEW_MODE_BATCH);
    setPreviewBook(firstBook);
  }, [selectedIds, bookMap]);

  /**
   * 预览抽屉中确认导入后的处理。
   * 单本模式：导入当前预览的书籍并展示结果 Toast。
   * 批量模式：依次导入所有选中书籍，展示进度条与汇总 Toast，结束后退出选择态。
   * @returns {Promise<void>}
   * @author fxbin
   */
  const handlePreviewImport = useCallback(async () => {
    if (!previewBook) return;
    if (previewMode === PREVIEW_MODE_BATCH) {
      const ids = [...selectedIds];
      if (ids.length === 0) return;
      setPreviewBook(null);
      setBatch({ total: ids.length, done: 0, success: 0, failed: 0 });
      let success = 0;
      let failed = 0;
      for (const id of ids) {
        const result = await importBook(id);
        if (result && result.ok) success += 1;
        else failed += 1;
        setBatch({ total: ids.length, done: success + failed, success, failed });
      }
      showToast({
        type: failed > 0 ? TOAST_TYPE_ERROR : TOAST_TYPE_SUCCESS,
        text: t('weread.batchDone', { success, failed }),
        action: success > 0 && onOpenWorkspace ? { label: t('weread.viewCard'), run: () => onOpenWorkspace(targetKbId || null) } : null,
      });
      exitSelecting();
    } else {
      const book = previewBook;
      setPreviewBook(null);
      const result = await importBook(book.bookId);
      if (!result) return;
      if (result.ok) {
        showToast({
          type: TOAST_TYPE_SUCCESS,
          text: t('weread.importSuccess', { title: result.title, bookmarks: result.bookmarkCount, reviews: result.reviewCount }),
          action: onOpenWorkspace ? { label: t('weread.viewCard'), run: () => onOpenWorkspace(result.workspaceId) } : null,
        });
      } else {
        showToast({ type: TOAST_TYPE_ERROR, text: t('weread.importFailed', { title: book.title }) });
      }
    }
  }, [previewBook, previewMode, selectedIds, importBook, showToast, t, onOpenWorkspace, targetKbId, exitSelecting]);

  /**
   * 打开已导入书籍对应的工作区。
   * 若存在导入结果且成功，则打开结果中的工作区；否则回退到目标知识库。
   * @param {string|number} bookId - 书籍 ID
   * @author fxbin
   */
  const handleOpenImported = useCallback((bookId) => {
    const result = importResults[String(bookId)];
    if (result && result.ok && onOpenWorkspace) {
      onOpenWorkspace(result.workspaceId);
    } else if (onOpenWorkspace) {
      onOpenWorkspace(targetKbId || null);
    }
  }, [importResults, onOpenWorkspace, targetKbId]);

  return {
    importingIds,
    setImportingIds,
    importResults,
    setImportResults,
    selecting,
    setSelecting,
    selectedIds,
    setSelectedIds,
    batch,
    setBatch,
    previewBook,
    setPreviewBook,
    previewMode,
    setPreviewMode,
    toast,
    setToast,
    targetKbId,
    setTargetKbId,
    showToast,
    importBook,
    handleImport,
    closePreview,
    toggleSelect,
    enterSelecting,
    exitSelecting,
    selectAllFiltered,
    batchImport,
    handlePreviewImport,
    handleOpenImported,
  };
}
