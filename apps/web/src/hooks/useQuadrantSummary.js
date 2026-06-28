/**
 * 四象限汇总 Hook（NS-1）。
 *
 * 把书架 books + 材料统计聚合成 BookSignalInputs，调后端 /api/statistics/quadrant 计算。
 *
 * @module hooks/useQuadrantSummary
 * @author fxbin
 */

import { useEffect, useState } from 'react';
import api from '../utils/api';
import { STATISTICS_QUADRANT_PATH } from '../constants/weread';

const INITIAL_SUMMARY = null;
const INITIAL_LOADING = false;
const INITIAL_ERROR = null;

/**
 * @param {Array<{
 *   bookId: string,
 *   title?: string,
 *   onShelf: boolean,
 *   highlightCount: number,
 *   noteCharCount: number,
 *   chapterCount: number,
 *   hasLongReview: boolean,
 * }>} books 输入信号数组
 * @returns {{
 *   summary: object|null,
 *   loading: boolean,
 *   error: object|null,
 * }}
 */
export function useQuadrantSummary(books) {
  const [summary, setSummary] = useState(INITIAL_SUMMARY);
  const [loading, setLoading] = useState(INITIAL_LOADING);
  const [error, setError] = useState(INITIAL_ERROR);

  useEffect(() => {
    if (!Array.isArray(books) || books.length === 0) {
      setSummary(null);
      setError(null);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .post(STATISTICS_QUADRANT_PATH, { books })
      .then((response) => {
        if (cancelled) return;
        setSummary(response);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err);
        setSummary(null);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [books && books.length, books && books.map((b) => b.bookId).join('|')]);

  return { summary, loading, error };
}