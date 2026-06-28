/**
 * 真读过置信度 Hook（NS-3）。
 *
 * 提供：
 * - fetchScore(bookId, dims)：按信号维度查询真读过置信度
 * - submitVerification(bookId, dims, claims)：提交轻校验作答，返回更新后的置信度
 * - degradeAssessment：当前降级评估（来自降级矩阵，用于渲染 DegradeBadge）
 *
 * 红线：confidence 必须以 N% 形式展示，禁止布尔化。
 *
 * @module hooks/useTrulyRead
 * @author fxbin
 */

import { useCallback, useState } from 'react';
import api from '../utils/api';
import { TRULY_READ_PATH_PREFIX, TRULY_READ_VERIFY_SUFFIX } from '../constants/weread';

const INITIAL_SCORE = null;
const INITIAL_DEGRADE = null;
const INITIAL_LOADING = false;
const INITIAL_ERROR = null;

/**
 * @param {object} [initialDims] 初始信号维度，用于首次自动查询（可选）
 * @returns {{
 *   score: object|null,
 *   degradeAssessment: object|null,
 *   loading: boolean,
 *   error: object|null,
 *   fetchScore: (bookId: string, dims: object) => Promise<object|undefined>,
 *   submitVerification: (bookId: string, dims: object, claims: Array) => Promise<object|undefined>,
 * }}
 */
export function useTrulyRead() {
  const [score, setScore] = useState(INITIAL_SCORE);
  const [degradeAssessment, setDegradeAssessment] = useState(INITIAL_DEGRADE);
  const [loading, setLoading] = useState(INITIAL_LOADING);
  const [error, setError] = useState(INITIAL_ERROR);

  const fetchScore = useCallback(async (bookId, dims) => {
    if (!bookId) return undefined;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      const fields = [
        'highlightCount',
        'noteCharCount',
        'reviewCharCount',
        'totalChapters',
        'chaptersCovered',
        'lastActivityTime',
        'firstActivityTime',
      ];
      for (const key of fields) {
        if (dims && typeof dims[key] === 'number') {
          params.set(key, String(dims[key]));
        }
      }
      if (dims && dims.hasLongReview) {
        params.set('hasLongReview', 'true');
      }
      const url = `${TRULY_READ_PATH_PREFIX}/${encodeURIComponent(bookId)}?${params.toString()}`;
      const response = await api.get(url);
      setScore(response?.score ?? null);
      setDegradeAssessment(response?.degradeAssessment ?? null);
      return response;
    } catch (err) {
      setError(err);
      setScore(INITIAL_SCORE);
      setDegradeAssessment(INITIAL_DEGRADE);
      return undefined;
    } finally {
      setLoading(false);
    }
  }, []);

  const submitVerification = useCallback(async (bookId, dims, claims) => {
    if (!bookId) return undefined;
    setLoading(true);
    setError(null);
    try {
      const url = `${TRULY_READ_PATH_PREFIX}/${encodeURIComponent(bookId)}${TRULY_READ_VERIFY_SUFFIX}`;
      const response = await api.post(url, { dims, claims });
      setScore(response?.score ?? null);
      setDegradeAssessment(response?.degradeAssessment ?? null);
      return response;
    } catch (err) {
      setError(err);
      return undefined;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    score,
    degradeAssessment,
    loading,
    error,
    fetchScore,
    submitVerification,
  };
}
