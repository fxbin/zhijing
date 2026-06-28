/**
 * 派生指标降级状态 Hook（NS-6）。
 *
 * 查询后端 /api/data-account/assessments，返回所有派生指标的降级评估，
 * 并提供按 metricKey 取单项评估的便捷视图。
 *
 * 配合 DegradeBadge 组件使用：在派生指标展示位旁渲染对应的降级状态。
 *
 * @module hooks/useDerivedMetric
 * @author fxbin
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import {
  DATA_ACCOUNT_ASSESSMENTS_PATH,
  DATA_ACCOUNT_TOGGLE_PATH,
} from '../constants/weread';

const INITIAL_ASSESSMENTS = [];
const INITIAL_BOOK = null;
const INITIAL_LOADING = false;
const INITIAL_ERROR = null;

/**
 * @param {string} [metricKey] 可选，指定后返回该派生指标的单项评估
 * @returns {{
 *   assessments: Array<object>,
 *   book: object|null,
 *   loading: boolean,
 *   error: object|null,
 *   current: object|undefined,
 *   isNormal: boolean,
 *   isDegraded: boolean,
 *   isHidden: boolean,
 *   toggle: (entryKey: string, enabled: boolean) => Promise<object|undefined>,
 *   refresh: () => Promise<void>,
 * }}
 */
export function useDerivedMetric(metricKey) {
  const [assessments, setAssessments] = useState(INITIAL_ASSESSMENTS);
  const [book, setBook] = useState(INITIAL_BOOK);
  const [loading, setLoading] = useState(INITIAL_LOADING);
  const [error, setError] = useState(INITIAL_ERROR);

  const fetchAssessments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(DATA_ACCOUNT_ASSESSMENTS_PATH);
      setAssessments(Array.isArray(response?.assessments) ? response.assessments : []);
      setBook(response?.book ?? null);
      return response;
    } catch (err) {
      setError(err);
      setAssessments(INITIAL_ASSESSMENTS);
      setBook(INITIAL_BOOK);
      return undefined;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get(DATA_ACCOUNT_ASSESSMENTS_PATH)
      .then((response) => {
        if (cancelled) return;
        setAssessments(Array.isArray(response?.assessments) ? response.assessments : []);
        setBook(response?.book ?? null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err);
        setAssessments(INITIAL_ASSESSMENTS);
        setBook(INITIAL_BOOK);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = useCallback(async (entryKey, enabled) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post(DATA_ACCOUNT_TOGGLE_PATH, { entryKey, enabled });
      setAssessments(Array.isArray(response?.assessments) ? response.assessments : []);
      setBook(response?.book ?? null);
      return response;
    } catch (err) {
      setError(err);
      return undefined;
    } finally {
      setLoading(false);
    }
  }, []);

  const current = useMemo(() => {
    if (!metricKey) return undefined;
    return assessments.find((item) => item?.metricKey === metricKey);
  }, [assessments, metricKey]);

  const behavior = current?.behavior ?? 'normal';
  return {
    assessments,
    book,
    loading,
    error,
    current,
    isNormal: behavior === 'normal',
    isDegraded: behavior === 'degraded',
    isHidden: behavior === 'hidden',
    toggle,
    refresh: fetchAssessments,
  };
}
