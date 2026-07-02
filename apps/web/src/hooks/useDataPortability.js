/**
 * 数据可携 Hook（NS-8）。
 *
 * 提供：
 * - records：导出记录列表（按创建时间倒序）
 * - loading / error
 * - fetchRecords()：拉取导出历史
 * - exportProfile(format)：导出统计数据画像（json / markdown），返回新记录
 * - revokeRecord(id)：在 30 天窗口内撤回复盘导出
 *
 * @module hooks/useDataPortability
 * @author fxbin
 */

import { useCallback, useMemo, useState } from 'react';
import api from '../utils/api';
import {
  DATA_PORTABILITY_EXPORT_PATH,
  DATA_PORTABILITY_RECORDS_PATH,
  DATA_PORTABILITY_REVOKE_PATH_PREFIX,
} from '../constants/weread';

const INITIAL_RECORDS = [];
const INITIAL_LOADING = false;
const INITIAL_ERROR = null;

/**
 * @returns {{
 *   records: Array<object>,
 *   loading: boolean,
 *   error: object|null,
 *   fetchRecords: () => Promise<Array<object>|undefined>,
 *   exportProfile: (format: string) => Promise<object|undefined>,
 *   revokeRecord: (id: string) => Promise<boolean>,
 * }}
 */
export function useDataPortability() {
  const [records, setRecords] = useState(INITIAL_RECORDS);
  const [loading, setLoading] = useState(INITIAL_LOADING);
  const [error, setError] = useState(INITIAL_ERROR);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get(DATA_PORTABILITY_RECORDS_PATH);
      const next = data?.records ?? [];
      setRecords(next);
      return next;
    } catch (err) {
      setError(err);
      setRecords(INITIAL_RECORDS);
      return undefined;
    } finally {
      setLoading(false);
    }
  }, []);

  const exportProfile = useCallback(async (format) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.post(DATA_PORTABILITY_EXPORT_PATH, { format });
      const record = data?.record ?? null;
      if (record) {
        setRecords((prev) => [record, ...prev]);
      }
      return record;
    } catch (err) {
      setError(err);
      return undefined;
    } finally {
      setLoading(false);
    }
  }, []);

  const revokeRecord = useCallback(async (id) => {
    if (!id) {
      return false;
    }
    setLoading(true);
    setError(null);
    try {
      await api.post(`${DATA_PORTABILITY_REVOKE_PATH_PREFIX}/${encodeURIComponent(id)}`);
      setRecords((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, revokedAt: Date.now() } : item,
        ),
      );
      return true;
    } catch (err) {
      setError(err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return useMemo(() => ({
    records,
    loading,
    error,
    fetchRecords,
    exportProfile,
    revokeRecord,
  }), [records, loading, error, fetchRecords, exportProfile, revokeRecord]);
}
