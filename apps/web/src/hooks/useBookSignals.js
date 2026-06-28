/**
 * 批量读书信号刷新 Hook。
 *
 * 提供：
 * - result：后端批量刷新返回的统计（total/synced/failed/failures）
 * - loading / error
 * - refreshSignals(bookIds)：POST /api/weread/signals/refresh，
 *   并发拉取每本书的划线/书评/章节数等真实信号并落库
 *
 * 刷新完成后调用方需自行重新拉取 weread/meta 以获取更新后的 meta 列表，
 * 本 hook 不耦合 meta 刷新逻辑，保持职责单一。
 *
 * @module hooks/useBookSignals
 * @author fxbin
 */

import { useCallback, useState } from 'react';
import api from '../utils/api';
import { WEREAD_SIGNALS_REFRESH_PATH } from '../constants/weread';

const INITIAL_RESULT = null;
const INITIAL_LOADING = false;
const INITIAL_ERROR = null;

/**
 * @param {string[]} bookIds 待刷新的书籍 ID 列表
 * @returns {{
 *   result: {total:number,synced:number,failed:number,failures:Array<{bookId:string,reason:string}>}|null,
 *   loading: boolean,
 *   error: object|null,
 *   refreshSignals: (ids?: string[]) => Promise<object|undefined>,
 * }}
 */
export function useBookSignals(bookIds) {
  const [result, setResult] = useState(INITIAL_RESULT);
  const [loading, setLoading] = useState(INITIAL_LOADING);
  const [error, setError] = useState(INITIAL_ERROR);

  const refreshSignals = useCallback(async (ids) => {
    const resolved = Array.isArray(ids) ? ids : bookIds;
    if (!Array.isArray(resolved) || resolved.length === 0) {
      return undefined;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await api.post(WEREAD_SIGNALS_REFRESH_PATH, {
        bookIds: resolved,
      });
      const next = response?.result ?? response;
      setResult(next);
      return next;
    } catch (err) {
      setError(err);
      setResult(INITIAL_RESULT);
      return undefined;
    } finally {
      setLoading(false);
    }
  }, [bookIds]);

  return {
    result,
    loading,
    error,
    refreshSignals,
  };
}
