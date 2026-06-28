/**
 * 隐性真兴趣提示 Hook（NS-8）。
 *
 * 提供：
 * - hint：当前隐性真兴趣提示状态（shouldShow / mode / totalCount / 代表书目 / reason）
 * - loading / error
 * - fetchHint()：拉取最新提示
 * - togglePermanent(dismissed)：永久关闭或重新开启提示
 * - dismissBook(bookId)：忽略单本隐性真兴趣书目
 * - markShown()：标记提示已展示，更新 lastShownAt（24h 频控）
 *
 * @module hooks/useHiddenInterest
 * @author fxbin
 */

import { useCallback, useState } from 'react';
import api from '../utils/api';
import {
  HIDDEN_INTEREST_HINT_PATH,
  HIDDEN_INTEREST_TOGGLE_PATH,
  HIDDEN_INTEREST_DISMISS_PATH_PREFIX,
  HIDDEN_INTEREST_SHOWN_PATH,
} from '../constants/weread';

const INITIAL_HINT = null;
const INITIAL_LOADING = false;
const INITIAL_ERROR = null;

/**
 * @returns {{
 *   hint: object|null,
 *   loading: boolean,
 *   error: object|null,
 *   fetchHint: () => Promise<object|undefined>,
 *   togglePermanent: (dismissed: boolean) => Promise<boolean>,
 *   dismissBook: (bookId: string) => Promise<boolean>,
 *   markShown: () => Promise<boolean>,
 * }}
 */
export function useHiddenInterest() {
  const [hint, setHint] = useState(INITIAL_HINT);
  const [loading, setLoading] = useState(INITIAL_LOADING);
  const [error, setError] = useState(INITIAL_ERROR);

  const fetchHint = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get(HIDDEN_INTEREST_HINT_PATH);
      const next = data?.hint ?? null;
      setHint(next);
      return next;
    } catch (err) {
      setError(err);
      setHint(INITIAL_HINT);
      return undefined;
    } finally {
      setLoading(false);
    }
  }, []);

  const togglePermanent = useCallback(async (dismissed) => {
    setLoading(true);
    setError(null);
    try {
      await api.post(HIDDEN_INTEREST_TOGGLE_PATH, { permanentlyDismissed: dismissed });
      return true;
    } catch (err) {
      setError(err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const dismissBook = useCallback(async (bookId) => {
    if (!bookId) {
      return false;
    }
    setLoading(true);
    setError(null);
    try {
      await api.post(`${HIDDEN_INTEREST_DISMISS_PATH_PREFIX}/${encodeURIComponent(bookId)}`);
      return true;
    } catch (err) {
      setError(err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const markShown = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await api.post(HIDDEN_INTEREST_SHOWN_PATH);
      return true;
    } catch (err) {
      setError(err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    hint,
    loading,
    error,
    fetchHint,
    togglePermanent,
    dismissBook,
    markShown,
  };
}
