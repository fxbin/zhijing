/**
 * 轻校验对话框（NS-3 主观确认路径 / NS-7 题库接入）。
 *
 * 圆桌 R3 共识：轻校验通过分层抽样题（如「第三章你划了哪句？」）确认用户真的读过。
 * 本组件支持两种取题方式：
 * 1. 外部传入 questions：父组件自行构造题目（S4 兼容路径）
 * 2. autoFetch + highlights：组件挂载时 POST /api/verification/questions 自行抽样（S6 路径）
 *
 * 用户作答后提交 claims，由 onSubmit 回传上层（再由 useTrulyRead.submitVerification
 * 或 /api/verification/submit 完成服务端评估）。
 * 标记「3 处两层防作弊」：题目随机化 + 作答不可回看 + 答案与划线原文比对。
 *
 * 当前版本：客户端比对 expectedAnswer（题库响应携带），服务端比对留作后续防作弊加固。
 *
 * @module components/LightVerifyDialog
 * @author fxbin
 */

import { useEffect, useState } from 'react';
import { useVerificationQuestions } from '../hooks/useVerificationQuestions';

const FETCH_STATUS_LOADING = 'loading';
const FETCH_STATUS_EMPTY = 'empty';
const FETCH_STATUS_ERROR = 'error';
const FETCH_STATUS_READY = 'ready';

/**
 * @param {object} props
 * @param {string} props.bookId 书籍 ID
 * @param {string} [props.bookTitle] 书名
 * @param {Array<{questionId: string, prompt: string, options?: string[], expectedAnswer?: string}>} [props.questions] 外部传入题目（优先于 autoFetch）
 * @param {boolean} [props.autoFetch] 是否自行从题库拉题（默认 false，保持 S4 兼容）
 * @param {Array<{id?: string, text: string, chapterRef?: string, time?: number}>} [props.highlights] 可用划线（autoFetch=true 时必需）
 * @param {number} [props.maxQuestions] 抽样题数上限
 * @param {(claims: Array) => Promise<unknown>} props.onSubmit 提交回调（返回更新后的评分）
 * @param {() => void} props.onClose 关闭回调
 * @returns {JSX.Element}
 */
export default function LightVerifyDialog({
  bookId,
  bookTitle,
  questions: externalQuestions,
  autoFetch = false,
  highlights,
  maxQuestions,
  onSubmit,
  onClose,
}) {
  const hasExternal = Array.isArray(externalQuestions) && externalQuestions.length > 0;
  const shouldAutoFetch = !hasExternal && autoFetch && Boolean(bookId);
  const verification = useVerificationQuestions(bookId, highlights);

  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    if (!shouldAutoFetch) {
      return;
    }
    verification.fetchQuestions(maxQuestions);
  }, [shouldAutoFetch, verification, maxQuestions]);

  const safeQuestions = hasExternal
    ? externalQuestions
    : (Array.isArray(verification.questions) ? verification.questions : []);

  const fetchStatus = (() => {
    if (hasExternal) {
      return safeQuestions.length === 0 ? FETCH_STATUS_EMPTY : FETCH_STATUS_READY;
    }
    if (!shouldAutoFetch) {
      return safeQuestions.length === 0 ? FETCH_STATUS_EMPTY : FETCH_STATUS_READY;
    }
    if (verification.loading) {
      return FETCH_STATUS_LOADING;
    }
    if (verification.error) {
      return FETCH_STATUS_ERROR;
    }
    return safeQuestions.length === 0 ? FETCH_STATUS_EMPTY : FETCH_STATUS_READY;
  })();

  const handleAnswer = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const now = Date.now();
      const claims = safeQuestions.map((question) => ({
        questionId: question.questionId,
        userAnswer: String(answers[question.questionId] ?? ''),
        correct: typeof question.expectedAnswer === 'string'
          ? String(answers[question.questionId] ?? '').trim() === question.expectedAnswer.trim()
          : false,
        claimedAt: now,
      }));
      await onSubmit(claims);
      onClose();
    } catch (err) {
      setSubmitError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const answeredCount = safeQuestions.filter((question) => answers[question.questionId]).length;
  const canSubmit = answeredCount === safeQuestions.length && safeQuestions.length > 0;

  return (
    <div className="light-verify-overlay" role="dialog" aria-modal="true" aria-label="轻校验">
      <div className="light-verify-dialog">
        <div className="light-verify-head">
          <h3 className="light-verify-title">
            轻校验{bookTitle ? `· ${bookTitle}` : ''}
          </h3>
          <button type="button" className="light-verify-close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>

        <div className="light-verify-anti-cheat-hint">
          <p>本校验采用三层防作弊：题目随机抽样、作答不可回看、答案与你的划线原文比对。</p>
        </div>

        {fetchStatus === FETCH_STATUS_LOADING ? (
          <p className="light-verify-empty">正在从你的划线中抽样题目…</p>
        ) : fetchStatus === FETCH_STATUS_ERROR ? (
          <div className="light-verify-empty">
            <p>题目加载失败，请重试。</p>
            <button
              type="button"
              className="light-verify-retry"
              onClick={() => verification.fetchQuestions(maxQuestions)}
            >
              重新加载
            </button>
          </div>
        ) : fetchStatus === FETCH_STATUS_EMPTY ? (
          <p className="light-verify-empty">
            暂无可用题目，请先导入该书的划线数据。
          </p>
        ) : (
          <ol className="light-verify-questions">
            {safeQuestions.map((question, index) => (
              <li key={question.questionId} className="light-verify-question">
                <p className="light-verify-prompt">
                  <span className="light-verify-qnum">Q{index + 1}</span>
                  {question.prompt}
                </p>
                {Array.isArray(question.options) && question.options.length > 0 ? (
                  <div className="light-verify-options">
                    {question.options.map((option) => (
                      <label key={option} className="light-verify-option">
                        <input
                          type="radio"
                          name={question.questionId}
                          value={option}
                          checked={answers[question.questionId] === option}
                          onChange={() => handleAnswer(question.questionId, option)}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <input
                    type="text"
                    className="light-verify-text-input"
                    placeholder="请输入你的回答"
                    value={answers[question.questionId] ?? ''}
                    onChange={(event) => handleAnswer(question.questionId, event.target.value)}
                  />
                )}
              </li>
            ))}
          </ol>
        )}

        {submitError ? (
          <p className="light-verify-error">提交失败，请重试</p>
        ) : null}

        <div className="light-verify-foot">
          <span className="light-verify-progress">
            已答 {answeredCount}/{safeQuestions.length}
          </span>
          <div className="light-verify-actions">
            <button type="button" className="light-verify-cancel" onClick={onClose} disabled={submitting}>
              取消
            </button>
            <button
              type="button"
              className="light-verify-submit"
              onClick={handleSubmit}
              disabled={!canSubmit || submitting || fetchStatus !== FETCH_STATUS_READY}
            >
              {submitting ? '提交中…' : '提交校验'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
