/**
 * 微信读书全量四象限 Hook（NS-8）。
 *
 * 调用后端 GET /api/weread/quadrant 获取四象限汇总。
 * 后端使用全量书架（含下架书）+ 已刷新 signals 的书统一计算，
 * 保证展示层与推荐种子、隐性真兴趣 hint 数据源一致。
 *
 * @module hooks/useWeReadQuadrant
 * @author fxbin
 */

import { useCallback, useEffect, useState } from 'react';
import api from '../utils/api';
import { WEREAD_QUADRANT_PATH } from '../constants/weread';

const INITIAL_SUMMARY = null;
const INITIAL_LOADING = false;
const INITIAL_ERROR = null;

/**
 * @param {boolean} enabled 是否启用拉取
 * @returns {{
 *   summary: object|null,
 *   loading: boolean,
 *   error: object|null,
 *   refresh: () => Promise<void>,
 * }}
 */
export function useWeReadQuadrant(enabled) {
  const [summary, setSummary] = useState(INITIAL_SUMMARY);
  const [loading, setLoading] = useState(INITIAL_LOADING);
  const [error, setError] = useState(INITIAL_ERROR);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get(WEREAD_QUADRANT_PATH);
      setSummary(data);
    } catch (err) {
      setError(err);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    refresh();
    return undefined;
  }, [enabled, refresh]);

  return { summary, loading, error, refresh };
}
