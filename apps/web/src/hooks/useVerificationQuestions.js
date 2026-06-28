/**
 * 轻校验题库 Hook（NS-7）。
 *
 * 提供：
 * - questions：从后端 verification-bank 抽样得到的题目列表（含 expectedAnswer，
 *   供 LightVerifyDialog 客户端即时比对；服务端比对留作后续防作弊加固）
 * - loading / error
 * - fetchQuestions()：POST /api/verification/questions，按划线构造题库并返回抽样题
 *
 * 题库构造逻辑在后端 buildVerificationBank 完成；
 * 前端只需传入 bookId + 可用划线（highlights），由后端完成分层抽样。
 *
 * @module hooks/useVerificationQuestions
 * @author fxbin
 */

import { useCallback, useState } from 'react';
import api from '../utils/api';
import { VERIFICATION_QUESTIONS_PATH } from '../constants/weread';

const INITIAL_QUESTIONS = [];
const INITIAL_LOADING = false;
const INITIAL_ERROR = null;

/**
 * 默认抽样题数上限，与后端 VERIFICATION_DEFAULT_MAX_QUESTIONS 对齐。
 */
const DEFAULT_MAX_QUESTIONS = 5;

/**
 * @param {string} bookId 书籍 ID
 * @param {Array<{id?: string, text: string, chapterRef?: string, time?: number}>} highlights 可用划线列表
 * @returns {{
 *   questions: Array<object>,
 *   loading: boolean,
 *   error: object|null,
 *   fetchQuestions: (maxQuestions?: number) => Promise<Array<object>|undefined>,
 * }}
 */
export function useVerificationQuestions(bookId, highlights) {
  const [questions, setQuestions] = useState(INITIAL_QUESTIONS);
  const [loading, setLoading] = useState(INITIAL_LOADING);
  const [error, setError] = useState(INITIAL_ERROR);

  const fetchQuestions = useCallback(async (maxQuestions = DEFAULT_MAX_QUESTIONS) => {
    const safeHighlights = Array.isArray(highlights) ? highlights : [];
    if (!bookId || safeHighlights.length === 0) {
      setQuestions(INITIAL_QUESTIONS);
      return INITIAL_QUESTIONS;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await api.post(VERIFICATION_QUESTIONS_PATH, {
        bookId,
        highlights: safeHighlights,
        maxQuestions,
      });
      const nextQuestions = Array.isArray(response?.result?.questions) ? response.result.questions : [];
      setQuestions(nextQuestions);
      return nextQuestions;
    } catch (err) {
      setError(err);
      setQuestions(INITIAL_QUESTIONS);
      return undefined;
    } finally {
      setLoading(false);
    }
  }, [bookId, highlights]);

  return {
    questions,
    loading,
    error,
    fetchQuestions,
  };
}
