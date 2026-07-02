/**
 * 阅读模式适配 Hook（NS-8）。
 *
 * 提供：
 * - profile：当前受众档案（tier / visibleFeatures / hiddenFeatures / reason）
 * - loading / error
 * - fetchProfile()：拉取最新档案（自动判定档位 + 合并临时回退）
 * - startRollback(targetTier)：发起临时回退到更低档位（30 天自动恢复）
 * - cancelRollback()：取消临时回退
 *
 * @module hooks/useReaderMode
 * @author fxbin
 */

import { useCallback, useMemo, useState } from 'react';
import api from '../utils/api';
import {
  READER_MODE_PROFILE_PATH,
  READER_MODE_ROLLBACK_PATH,
  READER_MODE_CANCEL_ROLLBACK_PATH,
} from '../constants/weread';

const INITIAL_PROFILE = null;
const INITIAL_LOADING = false;
const INITIAL_ERROR = null;

/**
 * @returns {{
 *   profile: object|null,
 *   loading: boolean,
 *   error: object|null,
 *   fetchProfile: () => Promise<object|undefined>,
 *   startRollback: (targetTier: string) => Promise<boolean>,
 *   cancelRollback: () => Promise<boolean>,
 * }}
 */
export function useReaderMode() {
  const [profile, setProfile] = useState(INITIAL_PROFILE);
  const [loading, setLoading] = useState(INITIAL_LOADING);
  const [error, setError] = useState(INITIAL_ERROR);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get(READER_MODE_PROFILE_PATH);
      const next = data?.profile ?? null;
      setProfile(next);
      return next;
    } catch (err) {
      setError(err);
      setProfile(INITIAL_PROFILE);
      return undefined;
    } finally {
      setLoading(false);
    }
  }, []);

  const startRollback = useCallback(async (targetTier) => {
    if (!targetTier) {
      return false;
    }
    setLoading(true);
    setError(null);
    try {
      await api.post(READER_MODE_ROLLBACK_PATH, { targetTier });
      return true;
    } catch (err) {
      setError(err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const cancelRollback = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await api.post(READER_MODE_CANCEL_ROLLBACK_PATH);
      return true;
    } catch (err) {
      setError(err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return useMemo(() => ({
    profile,
    loading,
    error,
    fetchProfile,
    startRollback,
    cancelRollback,
  }), [profile, loading, error, fetchProfile, startRollback, cancelRollback]);
}
