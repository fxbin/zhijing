/**
 * 微信读书书架数据域状态 Hook。
 * 统一管理配置态、书架书籍、同步状态、同步中标志、同步错误、加载态、
 * 主流程错误、统计数据、统计折叠态，并提供本地缓存加载（loadMeta）、
 * 后台同步（syncShelf）、统计折叠切换（handleToggleStatsCollapse）等业务函数。
 * 内部包含初始化拉取 settings、配置就绪后自动同步书架、书架变更后刷新统计两个副作用。
 * @module hooks/useWeReadShelfState
 * @author fxbin
 */

import { useCallback, useEffect, useState } from 'react';
import api from '../utils/api';
import {
  STATS_COLLAPSED_KEY,
  LOCAL_STORAGE_COLLAPSED_FLAG,
  LOCAL_STORAGE_EXPANDED_FLAG,
  WEREAD_SETTINGS_PATH,
  WEREAD_META_PATH,
  WEREAD_SYNC_PATH,
  WEREAD_STATS_PATH,
} from '../constants/weread';

/**
 * 配置态初始值：null 表示尚未探测。
 */
const INITIAL_CONFIGURED = null;

/**
 * 书架书籍初始值：null 表示尚未加载。
 */
const INITIAL_SHELF_BOOKS = null;

/**
 * 同步状态初始值：null 表示无数据。
 */
const INITIAL_SYNC_STATE = null;

/**
 * 同步中标志初始值。
 */
const INITIAL_IS_SYNCING = false;

/**
 * 同步错误初始值。
 */
const INITIAL_SYNC_ERROR = null;

/**
 * 主流程加载态初始值：默认加载中。
 */
const INITIAL_LOADING = true;

/**
 * 主流程错误初始值。
 */
const INITIAL_ERROR = null;

/**
 * 统计数据初始值：null 表示无数据。
 */
const INITIAL_STATS = null;

/**
 * 统计折叠态初始值：从 localStorage 读取，读取失败时默认展开。
 */
function readInitialStatsCollapsed() {
  try {
    return localStorage.getItem(STATS_COLLAPSED_KEY) === LOCAL_STORAGE_COLLAPSED_FLAG;
  } catch {
    return false;
  }
}

/**
 * 使用微信读书书架数据域状态。
 * @param {object} params - 入参对象
 * @param {function} params.t - i18n 翻译函数
 * @returns {object} 书架数据域 state、setter 与业务函数
 * @author fxbin
 */
export function useWeReadShelfState({ t }) {
  const [configured, setConfigured] = useState(INITIAL_CONFIGURED);
  const [shelfBooks, setShelfBooks] = useState(INITIAL_SHELF_BOOKS);
  const [syncState, setSyncState] = useState(INITIAL_SYNC_STATE);
  const [isSyncing, setIsSyncing] = useState(INITIAL_IS_SYNCING);
  const [syncError, setSyncError] = useState(INITIAL_SYNC_ERROR);
  const [loading, setLoading] = useState(INITIAL_LOADING);
  const [error, setError] = useState(INITIAL_ERROR);
  const [stats, setStats] = useState(INITIAL_STATS);
  const [statsCollapsed, setStatsCollapsed] = useState(readInitialStatsCollapsed);

  /**
   * 从本地缓存读取书架元数据。
   * 用于立即渲染，不触发同步。失败时写入主流程错误。
   * @returns {Promise<object|null>} 元数据对象，失败时返回 null
   * @author fxbin
   */
  const loadMeta = useCallback(async () => {
    try {
      const data = await api.get(WEREAD_META_PATH);
      setShelfBooks(data.books || []);
      setSyncState(data.syncState || null);
      return data;
    } catch {
      setError(t('weread.loadShelfFailed'));
      return null;
    }
  }, [t]);

  /**
   * 调用后端同步书架。同步成功后刷新本地缓存。
   * @param {boolean} [force=false] - 是否强制同步
   * @returns {Promise<object|null>} 同步结果，失败时返回 null
   * @author fxbin
   */
  const syncShelf = useCallback(async (force = false) => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const data = await api.post(WEREAD_SYNC_PATH, { force });
      if (data.error) {
        setSyncError(data.error);
      }
      await loadMeta();
      return data;
    } catch {
      setSyncError(t('weread.syncFailed'));
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [loadMeta, t]);

  /**
   * 初始化副作用：读取 settings，若已配置则加载缓存并触发后台同步。
   * 依赖 loadMeta、syncShelf，二者引用稳定时仅运行一次。
   * @author fxbin
   */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await api.get(WEREAD_SETTINGS_PATH);
        if (!alive) return;
        setConfigured(Boolean(data.configured));
        if (data.configured) {
          await loadMeta();
          setLoading(false);
          syncShelf(false);
        } else {
          setLoading(false);
        }
      } catch {
        if (!alive) return;
        setConfigured(false);
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [loadMeta, syncShelf]);

  /**
   * 统计加载副作用：配置就绪且书架或同步态变化后拉取统计。
   * 失败时静默，不影响主流程。
   * @author fxbin
   */
  useEffect(() => {
    if (!configured) return;
    let alive = true;
    (async () => {
      try {
        const data = await api.get(WEREAD_STATS_PATH);
        if (alive) setStats(data);
      } catch {
        /* 统计加载失败不影响主流程 */
      }
    })();
    return () => { alive = false; };
  }, [configured, shelfBooks, isSyncing]);

  /**
   * 切换统计折叠态并持久化到 localStorage。
   * localStorage 不可用时静默忽略。
   * @author fxbin
   */
  const handleToggleStatsCollapse = useCallback(() => {
    setStatsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STATS_COLLAPSED_KEY, next ? LOCAL_STORAGE_COLLAPSED_FLAG : LOCAL_STORAGE_EXPANDED_FLAG);
      } catch {
        /* localStorage 不可用时忽略 */
      }
      return next;
    });
  }, []);

  return {
    configured,
    setConfigured,
    shelfBooks,
    setShelfBooks,
    syncState,
    setSyncState,
    isSyncing,
    setIsSyncing,
    syncError,
    setSyncError,
    loading,
    setLoading,
    error,
    setError,
    stats,
    setStats,
    statsCollapsed,
    setStatsCollapsed,
    loadMeta,
    syncShelf,
    handleToggleStatsCollapse,
  };
}
