/**
 * 主题演变谱 Hook（NS-2）。
 *
 * 提供：
 * - fetchSpectrum(bookId, notes, options)：从预览笔记中筛出划线，提交后端聚类
 * - degradeAssessment：当前降级评估（来自降级矩阵，用于渲染 DegradeBadge）
 *
 * 红线：
 * - 划线文本在客户端预处理为 { id, text, time } 三元组后 POST
 * - 聚类结果必须确定性（同输入同输出），禁止客户端二次随机化
 * - confidence 低于 0.3 时由 DegradeBadge 接管隐藏，hook 层不拦截
 *
 * @module hooks/useTopicSpectrum
 * @author fxbin
 */

import { useCallback, useState } from 'react';
import api from '../utils/api';
import { TOPIC_SPECTRUM_PATH } from '../constants/weread';

const INITIAL_SPECTRUM = null;
const INITIAL_DEGRADE = null;
const INITIAL_LOADING = false;
const INITIAL_ERROR = null;

/**
 * @returns {{
 *   spectrum: object|null,
 *   degradeAssessment: object|null,
 *   loading: boolean,
 *   error: object|null,
 *   fetchSpectrum: (bookId: string, notes: Array, options?: object) => Promise<object|undefined>,
 *   reset: () => void,
 * }}
 */
export function useTopicSpectrum() {
  const [spectrum, setSpectrum] = useState(INITIAL_SPECTRUM);
  const [degradeAssessment, setDegradeAssessment] = useState(INITIAL_DEGRADE);
  const [loading, setLoading] = useState(INITIAL_LOADING);
  const [error, setError] = useState(INITIAL_ERROR);

  const fetchSpectrum = useCallback(async (bookId, highlights, options = {}) => {
    if (!bookId) return undefined;
    const payload = {
      bookId,
      highlights: Array.isArray(highlights)
        ? highlights
            .filter(
              (item) =>
                item &&
                item.type === 'bookmark' &&
                typeof item.content === 'string' &&
                item.content.length > 0,
            )
            .map((item, index) => ({
              id: typeof item.noteId === 'string' ? item.noteId : `${bookId}-${index}`,
              text: item.content,
              time: typeof item.createTime === 'number' ? item.createTime : 0,
            }))
        : [],
    };
    if (typeof options.booksRead === 'number') {
      payload.booksRead = options.booksRead;
    }
    if (typeof options.windowMonths === 'number' && options.windowMonths >= 1) {
      payload.windowMonths = options.windowMonths;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await api.post(TOPIC_SPECTRUM_PATH, payload);
      setSpectrum(response?.spectrum ?? null);
      setDegradeAssessment(response?.degradeAssessment ?? null);
      return response;
    } catch (err) {
      setError(err);
      setSpectrum(INITIAL_SPECTRUM);
      setDegradeAssessment(INITIAL_DEGRADE);
      return undefined;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setSpectrum(INITIAL_SPECTRUM);
    setDegradeAssessment(INITIAL_DEGRADE);
    setLoading(INITIAL_LOADING);
    setError(INITIAL_ERROR);
  }, []);

  return {
    spectrum,
    degradeAssessment,
    loading,
    error,
    fetchSpectrum,
    reset,
  };
}
