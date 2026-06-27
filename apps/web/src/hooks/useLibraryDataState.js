/**
 * 资料库视图 · 数据域状态 Hook。
 * 统一管理资料列表、筛选条件、搜索值、加载态、状态文案、捕获汇总提示、去重提示，
 * 并提供防抖加载、捕获汇总自动消失、去重提示联动等副作用，以及资料计数与生命周期统计派生。
 * 视图层通过本 hook 暴露的 setStatus/setItems/setCaptureSummary 注入到操作域 hook，
 * 用于跨域状态文案与列表更新。
 * @module hooks/useLibraryDataState
 * @author fxbin
 */

import { useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import { materialMediaUrls } from '../utils/material';

/**
 * 资料库搜索防抖时长（毫秒），避免用户每输入一个字符就触发一次请求。
 */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * 捕获汇总提示自动消失时长（毫秒）。
 */
const CAPTURE_SUMMARY_AUTODISMISS_MS = 9000;

/**
 * 资料列表单页查询条数（首屏与"加载更多"均用此值）。
 */
const MATERIALS_PAGE_SIZE = 20;

/**
 * 默认筛选值：全部资料。
 */
const DEFAULT_MATERIAL_FILTER = 'all';

/**
 * 默认搜索值为空字符串。
 */
const DEFAULT_SEARCH_VALUE = '';

/**
 * 默认状态文案 i18n key。
 */
const DEFAULT_STATUS_KEY = 'library.status.loadingMaterials';

/**
 * 资料接口路径。
 */
const MATERIALS_PATH = '/api/materials';

/**
 * parseStatus 枚举值集合：filter 命中这些值时按 parseStatus 过滤，其余按 type 过滤。
 * 与原 LibraryView.filteredItems 规则保持一致（'failed' / 'parsing' 按 parseStatus）。
 */
const FILTER_AS_PARSE_STATUS = new Set(['saved', 'parsing', 'needs_review', 'ingested', 'failed']);

/**
 * 构造资料查询参数字符串。
 * @param {string} searchValue - 搜索关键词
 * @param {string} selectedWorkspaceId - 当前选中工作区 ID
 * @param {string} filter - 当前筛选值（'all' / parseStatus / type）
 * @param {{ createdAt?: string; id?: string } | null} [cursor] - 分页游标
 * @returns {URLSearchParams} 查询参数对象
 * @author fxbin
 */
function buildMaterialsParams(searchValue, selectedWorkspaceId, filter, cursor) {
  const params = new URLSearchParams({ limit: String(MATERIALS_PAGE_SIZE) });
  if (selectedWorkspaceId) params.set('workspaceId', selectedWorkspaceId);
  if (searchValue.trim()) params.set('q', searchValue.trim());
  if (filter && filter !== 'all') {
    if (FILTER_AS_PARSE_STATUS.has(filter)) {
      params.set('status', filter);
    } else {
      params.set('type', filter);
    }
  }
  if (cursor?.createdAt && cursor?.id) {
    params.set('cursorCreatedAt', cursor.createdAt);
    params.set('cursorId', cursor.id);
  }
  return params;
}

/**
 * 使用资料库数据域状态。
 * @param {object} params - 入参对象
 * @param {function} params.t - i18n 翻译函数
 * @param {string|null} [params.selectedWorkspaceId] - 当前选中工作区 ID
 * @returns {object} 数据域 state、setter、loadMaterials、counts、lifecycleStats
 * @author fxbin
 */
export function useLibraryDataState({ t, selectedWorkspaceId }) {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState(DEFAULT_MATERIAL_FILTER);
  const [searchValue, setSearchValue] = useState(DEFAULT_SEARCH_VALUE);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState(() => t(DEFAULT_STATUS_KEY));
  const [captureSummary, setCaptureSummary] = useState(null);
  const [dedupeNotice, setDedupeNotice] = useState(null);

  /**
   * 加载资料首屏：重置 cursor 并请求第一页，结果替换 items。
   * @returns {Promise<void>}
   * @author fxbin
   */
  async function loadMaterials() {
    setIsLoading(true);
    try {
      const params = buildMaterialsParams(searchValue, selectedWorkspaceId, filter, null);
      const result = await api.get(`${MATERIALS_PATH}?${params.toString()}`);
      setItems(result.materials ?? []);
      setCursor(result.nextCursor ?? null);
      setHasMore(Boolean(result.hasMore));
      setStatus(t('library.status.materialsSynced'));
    } catch {
      setStatus(t('library.status.apiDisconnectedLibrary'));
      setItems([]);
      setCursor(null);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * 加载下一页：基于当前 cursor 追加 items，并推进 cursor。
   * hasMore 为 false 时直接返回，避免无效请求。
   * @returns {Promise<void>}
   * @author fxbin
   */
  async function loadMore() {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const params = buildMaterialsParams(searchValue, selectedWorkspaceId, filter, cursor);
      const result = await api.get(`${MATERIALS_PATH}?${params.toString()}`);
      setItems((current) => [...current, ...(result.materials ?? [])]);
      setCursor(result.nextCursor ?? null);
      setHasMore(Boolean(result.hasMore));
    } catch {
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  }

  /**
   * 防抖加载副作用：搜索值 / 选中工作区 / 筛选值变化时延时触发首屏查询，自动取消过期请求。
   * @author fxbin
   */
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      async function run() {
        setIsLoading(true);
        try {
          const params = buildMaterialsParams(searchValue, selectedWorkspaceId, filter, null);
          const result = await api.get(`${MATERIALS_PATH}?${params.toString()}`);
          if (!cancelled) {
            setItems(result.materials ?? []);
            setCursor(result.nextCursor ?? null);
            setHasMore(Boolean(result.hasMore));
            setStatus(t('library.status.materialsSynced'));
          }
        } catch {
          if (!cancelled) {
            setStatus(t('library.status.apiDisconnectedLibrary'));
            setItems([]);
            setCursor(null);
            setHasMore(false);
          }
        } finally {
          if (!cancelled) setIsLoading(false);
        }
      }
      run();
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchValue, selectedWorkspaceId, filter, t]);

  /**
   * 捕获汇总自动消失副作用：捕获汇总写入后延时清空。
   * @author fxbin
   */
  useEffect(() => {
    if (!captureSummary) return undefined;
    const timer = setTimeout(() => setCaptureSummary(null), CAPTURE_SUMMARY_AUTODISMISS_MS);
    return () => clearTimeout(timer);
  }, [captureSummary]);

  /**
   * 资料计数：按类型与解析状态聚合。
   */
  const counts = items.reduce((acc, item) => {
    acc.total += 1;
    acc[item.type] = (acc[item.type] ?? 0) + 1;
    acc[item.parseStatus] = (acc[item.parseStatus] ?? 0) + 1;
    return acc;
  }, { total: 0 });

  /**
   * 生命周期统计：包含总数、各解析状态计数、媒体总数、重复信号、最近条目与待复核条目。
   */
  const lifecycleStats = useMemo(() => {
    const sources = new Map();
    let duplicateSignals = 0;
    for (const item of items) {
      const key = (item.sourceUrl || item.rawInput || item.title || '').trim().toLowerCase();
      if (!key) continue;
      const next = (sources.get(key) ?? 0) + 1;
      sources.set(key, next);
      if (next === 2) duplicateSignals += 1;
    }
    return {
      total: items.length,
      saved: counts.saved ?? 0,
      parsing: counts.parsing ?? 0,
      needsReview: counts.needs_review ?? 0,
      failed: counts.failed ?? 0,
      ingested: counts.ingested ?? 0,
      media: items.reduce((sum, item) => sum + materialMediaUrls(item).length, 0),
      duplicateSignals,
      recent: items.slice(0, 4),
      reviewItems: items.filter((item) => item.parseStatus === 'needs_review' || item.parseStatus === 'failed').slice(0, 3),
    };
  }, [items, counts.failed, counts.ingested, counts.needs_review, counts.parsing, counts.saved]);

  /**
   * 去重提示联动副作用：检测到重复信号时写入提示，否则清空。
   * @author fxbin
   */
  useEffect(() => {
    if (lifecycleStats.duplicateSignals > 0) {
      setDedupeNotice({
        count: lifecycleStats.duplicateSignals,
        hint: t('library.dedupeNotice.hint'),
      });
    } else {
      setDedupeNotice(null);
    }
  }, [lifecycleStats.duplicateSignals]);

  return {
    items,
    setItems,
    filter,
    setFilter,
    searchValue,
    setSearchValue,
    isLoading,
    isLoadingMore,
    hasMore,
    status,
    setStatus,
    captureSummary,
    setCaptureSummary,
    dedupeNotice,
    setDedupeNotice,
    loadMaterials,
    loadMore,
    counts,
    lifecycleStats,
  };
}

export {
  SEARCH_DEBOUNCE_MS,
  DEFAULT_MATERIAL_FILTER,
  DEFAULT_SEARCH_VALUE,
};
