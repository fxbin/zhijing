/**
 * 极简模式 Hook（NS-7）。
 *
 * 提供：
 * - enabled：当前极简模式是否开启（来自数据账本 minimalMode 字段）
 * - featureState：极简模式功能契约快照（retained / silenced 清单）
 * - loading / error
 * - fetchMinimalMode()：从后端拉取数据账本，解析 minimalMode 字段
 * - toggleMinimalMode(next)：切换极简模式，同步后端与本地状态
 *
 * 红线：原始数据查阅权不受极简模式影响，仅派生统计被静默。
 * 详见 core/minimal-set.ts 契约。
 *
 * @module hooks/useMinimalMode
 * @author fxbin
 */

import { useCallback, useState } from 'react';
import api from '../utils/api';
import { DATA_ACCOUNT_SETTINGS_PATH, MINIMAL_MODE_PATH } from '../constants/weread';

const INITIAL_ENABLED = false;
const INITIAL_FEATURE_STATE = null;
const INITIAL_LOADING = false;
const INITIAL_ERROR = null;

/**
 * @returns {{
 *   enabled: boolean,
 *   featureState: object|null,
 *   loading: boolean,
 *   error: object|null,
 *   fetchMinimalMode: () => Promise<boolean|undefined>,
 *   toggleMinimalMode: (next: boolean) => Promise<object|undefined>,
 * }}
 */
export function useMinimalMode() {
  const [enabled, setEnabled] = useState(INITIAL_ENABLED);
  const [featureState, setFeatureState] = useState(INITIAL_FEATURE_STATE);
  const [loading, setLoading] = useState(INITIAL_LOADING);
  const [error, setError] = useState(INITIAL_ERROR);

  const fetchMinimalMode = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(DATA_ACCOUNT_SETTINGS_PATH);
      const nextEnabled = Boolean(response?.book?.minimalMode);
      setEnabled(nextEnabled);
      return nextEnabled;
    } catch (err) {
      setError(err);
      setEnabled(INITIAL_ENABLED);
      return undefined;
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleMinimalMode = useCallback(async (next) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.put(MINIMAL_MODE_PATH, { enabled: Boolean(next) });
      const nextEnabled = Boolean(response?.book?.minimalMode);
      setEnabled(nextEnabled);
      setFeatureState(response?.featureState ?? null);
      return response;
    } catch (err) {
      setError(err);
      return undefined;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    enabled,
    featureState,
    loading,
    error,
    fetchMinimalMode,
    toggleMinimalMode,
  };
}
