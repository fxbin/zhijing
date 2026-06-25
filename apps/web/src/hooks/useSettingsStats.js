/**
 * 设置视图 · 系统统计与数据控制域状态 Hook。
 * 统一管理系统统计（API 在线状态、工作区/资料/任务计数、近期任务）与数据操作状态，
 * 并提供仪表盘加载、全量数据导出、本地缓存清理等业务函数。
 * @module hooks/useSettingsStats
 * @author fxbin
 */

import { useEffect, useState } from 'react';
import api from '../utils/api';

/**
 * 仪表盘接口路径。
 */
const DASHBOARD_PATH = '/api/dashboard';

/**
 * 打开本地数据目录接口路径。
 */
const REVEAL_DATA_DIR_PATH = '/api/system/reveal-data-dir';

/**
 * 导出文件 MIME 类型。
 */
const EXPORT_MIME_TYPE = 'application/json';

/**
 * 导出文件名前缀。
 */
const EXPORT_FILE_PREFIX = 'zhijing-backup-';

/**
 * 导出文件名后缀。
 */
const EXPORT_FILE_SUFFIX = '.json';

/**
 * localStorage 中知径相关 key 的前缀。
 */
const LOCAL_STORAGE_PREFIX = 'zhijing_';

/**
 * 近期任务保留条数。
 */
const RECENT_TASKS_LIMIT = 3;

/**
 * 数据操作类型：导出。
 */
const DATA_ACTION_TYPE_EXPORT = 'export';

/**
 * 数据操作类型：清理。
 */
const DATA_ACTION_TYPE_CLEAR = 'clear';

/**
 * 数据操作类型：打开数据目录。
 */
const DATA_ACTION_TYPE_REVEAL = 'reveal';

/**
 * 初始未拉取到系统统计。
 */
const INITIAL_SYSTEM_STATS = null;

/**
 * 初始未执行任何数据操作。
 */
const INITIAL_DATA_ACTION = null;

/**
 * 使用系统统计与数据控制域状态。
 * @returns {object} 系统统计 state、数据操作 state 与对应业务函数
 * @author fxbin
 */
export function useSettingsStats() {
  const [systemStats, setSystemStats] = useState(INITIAL_SYSTEM_STATS);
  const [dataAction, setDataAction] = useState(INITIAL_DATA_ACTION);

  useEffect(() => {
    let ignore = false;
    async function loadSystemStats() {
      try {
        const result = await api.get(DASHBOARD_PATH);
        if (ignore) return;
        setSystemStats({
          apiOnline: true,
          workspaces: result.workspaces?.length ?? 0,
          materials: result.materials?.length ?? 0,
          tasks: result.tasks?.length ?? 0,
          recentTasks: (result.tasks ?? []).slice(0, RECENT_TASKS_LIMIT),
        });
      } catch {
        if (!ignore) setSystemStats({ apiOnline: false });
      }
    }
    loadSystemStats();
    return () => {
      ignore = true;
    };
  }, []);

  /**
   * 导出全部数据为 JSON 文件。
   * @author fxbin
   */
  async function exportAllData() {
    setDataAction({ type: DATA_ACTION_TYPE_EXPORT, loading: true });
    try {
      const result = await api.get(DASHBOARD_PATH);
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: EXPORT_MIME_TYPE });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${EXPORT_FILE_PREFIX}${Date.now()}${EXPORT_FILE_SUFFIX}`;
      anchor.click();
      URL.revokeObjectURL(url);
      setDataAction({ type: DATA_ACTION_TYPE_EXPORT, loading: false, ok: true });
    } catch {
      setDataAction({ type: DATA_ACTION_TYPE_EXPORT, loading: false, ok: false });
    }
  }

  /**
   * 清除本地缓存（localStorage 中知径前缀的项）。
   * @author fxbin
   */
  function clearLocalCache() {
    try {
      const keys = Object.keys(localStorage).filter((key) => key.startsWith(LOCAL_STORAGE_PREFIX));
      keys.forEach((key) => localStorage.removeItem(key));
      setDataAction({ type: DATA_ACTION_TYPE_CLEAR, loading: false, ok: true, count: keys.length });
    } catch {
      setDataAction({ type: DATA_ACTION_TYPE_CLEAR, loading: false, ok: false });
    }
  }

  /**
   * 在系统文件管理器中打开知径本地数据目录。
   * 调用后端 POST /api/system/reveal-data-dir，由后端调用平台原生命令打开目录。
   * @author fxbin
   */
  async function revealDataDir() {
    setDataAction({ type: DATA_ACTION_TYPE_REVEAL, loading: true });
    try {
      const result = await api.post(REVEAL_DATA_DIR_PATH);
      setDataAction({ type: DATA_ACTION_TYPE_REVEAL, loading: false, ok: result.ok, path: result.path, error: result.error });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setDataAction({ type: DATA_ACTION_TYPE_REVEAL, loading: false, ok: false, error: message });
    }
  }

  return {
    systemStats,
    dataAction,
    exportAllData,
    clearLocalCache,
    revealDataDir,
  };
}

export {
  DATA_ACTION_TYPE_EXPORT,
  DATA_ACTION_TYPE_CLEAR,
  DATA_ACTION_TYPE_REVEAL,
};
