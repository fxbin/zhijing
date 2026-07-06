/**
 * 全局主题演变谱 Hook。
 *
 * 聚合已导入到知径的微信读书笔记，从后端获取全书架主题聚类数据。
 * 数据源为 materials 表中 platform='weread' 的记录，零 gateway 调用。
 *
 * 提供：
 * - spectrum：全局主题谱（clusters / timeline / coherence / stability）
 * - degradeAssessment：降级评估（topic_spectrum 维度）
 * - loading / error
 * - refresh()：重新拉取
 *
 * 后端首次冷启动需为每个主题簇串行调 LLM 生成标签（1.5s 间隔），
 * 总时长可达 60-150s，故此接口单独放宽超时到 180s。命中 24h 缓存时秒返。
 *
 * @module hooks/useWeReadGlobalTopicSpectrum
 * @author fxbin
 */

import { useCallback, useRef, useState } from 'react';
import api from '../utils/api';
import { WEREAD_GLOBAL_TOPIC_SPECTRUM_PATH } from '../constants/weread';

const INITIAL_SPECTRUM = null;
const INITIAL_DEGRADE = null;
const INITIAL_LOADING = false;
const INITIAL_ERROR = null;
const GLOBAL_TOPIC_SPECTRUM_TIMEOUT_MS = 180000;

/**
 * 模块级缓存：组件 unmount 再 mount 时保留已加载的数据与状态。
 *
 * React 的 useRef/useState 在组件 unmount 后会丢失，
 * 若用户切出微信读书视图再切回来，不持久化会导致每次都重新拉取。
 * 模块级变量在 SPA 生命周期内常驻，配合后端 24h 缓存实现「秒返」体验。
 */
const moduleState = {
  spectrum: null,
  degradeAssessment: null,
  hasLoaded: false,
};

/**
 * 全局主题演变谱 Hook（带模块级内存缓存）。
 *
 * 首次进入微信读书视图自动静默加载一次，之后切回不再重新拉取，
 * 避免每次切换都触发 60-150s 的 LLM 串行调用。
 * 用户需手动点「刷新主题谱」按钮才会重新拉取。
 *
 * 缓存层级：
 * 1. 模块级变量（SPA 生命周期内常驻，组件 unmount 不丢失）
 * 2. 后端内存 Map + SQLite（24h TTL，跨后端重启）
 * 3. LLM 调用（仅首次或缓存过期时触发）
 *
 * @returns {{
 *   spectrum: object|null,
 *   degradeAssessment: object|null,
 *   loading: boolean,
 *   error: object|null,
 *   hasLoaded: boolean,
 *   refresh: () => Promise<object|undefined>,
 *   ensureLoaded: () => void,
 * }}
 */
export function useWeReadGlobalTopicSpectrum() {
  const [spectrum, setSpectrum] = useState(moduleState.spectrum);
  const [degradeAssessment, setDegradeAssessment] = useState(moduleState.degradeAssessment);
  const [loading, setLoading] = useState(INITIAL_LOADING);
  const [error, setError] = useState(INITIAL_ERROR);
  const hasLoadedRef = useRef(moduleState.hasLoaded);

  const fetchSpectrum = useCallback(async (force) => {
    setLoading(true);
    setError(null);
    try {
      const path = force
        ? `${WEREAD_GLOBAL_TOPIC_SPECTRUM_PATH}?force=1`
        : WEREAD_GLOBAL_TOPIC_SPECTRUM_PATH;
      const response = await api.get(path, {
        timeout: GLOBAL_TOPIC_SPECTRUM_TIMEOUT_MS,
      });
      const newSpectrum = response?.spectrum ?? null;
      const newDegrade = response?.degradeAssessment ?? null;
      setSpectrum(newSpectrum);
      setDegradeAssessment(newDegrade);
      moduleState.spectrum = newSpectrum;
      moduleState.degradeAssessment = newDegrade;
      hasLoadedRef.current = true;
      moduleState.hasLoaded = true;
      return response;
    } catch (err) {
      setError(err);
      setSpectrum(INITIAL_SPECTRUM);
      setDegradeAssessment(INITIAL_DEGRADE);
      return undefined;
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => fetchSpectrum(true), [fetchSpectrum]);

  const ensureLoaded = useCallback(() => {
    if (hasLoadedRef.current) {
      if (!moduleState.spectrum && !loading) {
        fetchSpectrum(false);
      }
      return;
    }
    if (loading) return;
    fetchSpectrum(false);
  }, [loading, fetchSpectrum]);

  return {
    spectrum,
    degradeAssessment,
    loading,
    error,
    hasLoaded: hasLoadedRef.current,
    refresh,
    ensureLoaded,
  };
}
