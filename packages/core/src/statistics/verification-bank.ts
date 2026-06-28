/**
 * 轻校验题库（NS-7）。
 *
 * 圆桌 R3 共识落地：
 * - 分层抽样：按章节均匀采样生成选择题（「第 X 章你划了哪句？」）
 * - 防作弊两层约束：答案原文比对 + marking 题理由字数门槛
 * - 上限两道，通过一次后该书永久获覆盖权
 *
 * 确定性：复用 topic-cluster 的 MINSTD LCG（种子固定），同输入同输出，
 * 保证取题幂等（前端重复打开对话框不会换题）。
 *
 * @module statistics/verification-bank
 * @author fxbin
 */

import type {
  VerificationAttempt,
  VerificationBankResult,
  VerificationCoverage,
  VerificationQuestion,
} from '@zhijing/shared';
import { createSeededRng } from './topic-cluster.js';

/**
 * 题目上限（PRD：最多两道）。
 */
export const VERIFICATION_DEFAULT_MAX_QUESTIONS = 2;

/**
 * 选择题默认选项数（1 正确 + 3 干扰）。
 */
export const VERIFICATION_DEFAULT_OPTIONS_COUNT = 4;

/**
 * 默认随机种子（与聚类种子隔离，避免取题与聚类互相干扰）。
 */
export const VERIFICATION_DEFAULT_SEED = 17;

/**
 * marking 题理由最小字数（PRD「附≥10字理由」）。
 */
export const VERIFICATION_MIN_REASON_LENGTH = 10;

/**
 * 启用题库的最小划线池规模（低于此值无法构造足够干扰项，题库返回空）。
 */
export const VERIFICATION_MIN_POOL_SIZE = 8;

/**
 * 划线输入形状（题库只关心 id/text/chapterRef/time 四个字段）。
 */
export interface VerificationHighlight {
  /** 划线 ID */
  id: string;
  /** 划线原文（截断后作为选项展示） */
  text: string;
  /** 章节引用（分层抽样的定位键） */
  chapterRef?: string;
  /** 划线时间戳（毫秒，防作弊时间约束备用） */
  time?: number;
}

/**
 * buildVerificationBank 的输入。
 */
export interface BuildVerificationBankInput {
  /** 书籍 ID */
  bookId: string;
  /** 划线池 */
  highlights: VerificationHighlight[];
  /** 题目上限（缺省 VERIFICATION_DEFAULT_MAX_QUESTIONS） */
  maxQuestions?: number;
  /** 选择题选项数（缺省 VERIFICATION_DEFAULT_OPTIONS_COUNT） */
  optionsCount?: number;
  /** 随机种子（缺省 VERIFICATION_DEFAULT_SEED） */
  seed?: number;
  /** 当前时间戳（毫秒） */
  now?: number;
}

/**
 * 截断选项文本，避免 UI 溢出。
 *
 * @param {string} text 原文
 * @param {number} maxLen 最大字符数
 * @returns {string}
 */
function truncateOption(text: string, maxLen: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLen) return clean;
  return `${clean.slice(0, maxLen)}…`;
}

/**
 * 按章节分组划线。
 *
 * 无 chapterRef 的划线归入默认分组。
 *
 * @param {VerificationHighlight[]} highlights 划线池
 * @returns {Map<string, VerificationHighlight[]>} 章节键 → 划线列表
 */
function groupByChapter(highlights: VerificationHighlight[]): Map<string, VerificationHighlight[]> {
  const groups = new Map<string, VerificationHighlight[]>();
  for (const item of highlights) {
    const key = item.chapterRef && item.chapterRef.length > 0 ? item.chapterRef : '__default__';
    const list = groups.get(key);
    if (list) {
      list.push(item);
    } else {
      groups.set(key, [item]);
    }
  }
  return groups;
}

/**
 * Fisher-Yates 部分洗牌，取前 count 个（确定性）。
 *
 * @param {() => number} rng 随机数生成器
 * @param {VerificationHighlight[]} pool 源池
 * @param {number} count 取出数量
 * @returns {VerificationHighlight[]}
 */
function pickDistinct(
  rng: () => number,
  pool: VerificationHighlight[],
  count: number,
): VerificationHighlight[] {
  const arr = [...pool];
  const n = Math.min(count, arr.length);
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(rng() * (arr.length - i));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, n);
}

/**
 * 构造一道 sampling 选择题。
 *
 * 从指定章节抽 1 条作正确答案，从全局池抽干扰项，选项随机打乱。
 *
 * @param {object} params
 * @param {string} params.bookId 书籍 ID
 * @param {string} params.chapterRef 章节引用
 * @param {VerificationHighlight} params.target 正确划线
 * @param {VerificationHighlight[]} params.globalPool 全局干扰项池
 * @param {number} params.distractorCount 干扰项数量
 * @param {() => number} params.rng 随机数生成器
 * @param {number} params.index 题目序号（用于 questionId）
 * @returns {VerificationQuestion}
 */
function buildSamplingQuestion(params: {
  bookId: string;
  chapterRef: string;
  target: VerificationHighlight;
  globalPool: VerificationHighlight[];
  distractorCount: number;
  rng: () => number;
  index: number;
}): VerificationQuestion {
  const distractors = pickDistinct(params.rng, params.globalPool, params.distractorCount).filter(
    (item) => item.id !== params.target.id,
  );
  const options = [params.target, ...distractors].map((item) => truncateOption(item.text, 24));
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(params.rng() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  const expectedAnswer = truncateOption(params.target.text, 24);
  return {
    questionId: `${params.bookId}-q${params.index}`,
    kind: 'sampling',
    prompt: `${params.chapterRef}你划过下面哪一句？`,
    options,
    expectedAnswer,
    chapterRef: params.chapterRef,
  };
}

/**
 * 构造一道 marking 题（标记 + 附理由）。
 *
 * @param {object} params
 * @param {string} params.bookId 书籍 ID
 * @param {VerificationHighlight} params.target 目标划线
 * @param {() => number} params.rng 随机数生成器
 * @param {number} params.index 题目序号
 * @returns {VerificationQuestion}
 */
function buildMarkingQuestion(params: {
  bookId: string;
  target: VerificationHighlight;
  index: number;
}): VerificationQuestion {
  return {
    questionId: `${params.bookId}-q${params.index}`,
    kind: 'marking',
    prompt: '请确认下面这条是你自己划的，并附上当时的理由（≥10字）：',
    expectedAnswer: truncateOption(params.target.text, 24),
    minReasonLength: VERIFICATION_MIN_REASON_LENGTH,
  };
}

/**
 * 构建轻校验题库。
 *
 * 策略：
 * 1. 按章节分组，从不同章节各抽 1 条作 sampling 正确答案（保证覆盖面）
 * 2. 若还有余量，补一道 marking 题
 * 3. 划线池不足 VERIFICATION_MIN_POOL_SIZE 时返回空题库（无法构造足够干扰项）
 *
 * 结果确定性：同 bookId + 同 highlights + 同 seed → 同题目。
 *
 * @param {BuildVerificationBankInput} input 输入
 * @returns {VerificationBankResult}
 */
export function buildVerificationBank(input: BuildVerificationBankInput): VerificationBankResult {
  const now = input.now ?? Date.now();
  const maxQuestions = input.maxQuestions ?? VERIFICATION_DEFAULT_MAX_QUESTIONS;
  const optionsCount = input.optionsCount ?? VERIFICATION_DEFAULT_OPTIONS_COUNT;
  const seed = input.seed ?? VERIFICATION_DEFAULT_SEED;
  const cleanHighlights = input.highlights.filter(
    (item) => item && typeof item.text === 'string' && item.text.trim().length > 0,
  );

  if (cleanHighlights.length < VERIFICATION_MIN_POOL_SIZE) {
    return {
      bookId: input.bookId,
      questions: [],
      maxQuestions,
      sourceHighlights: cleanHighlights.length,
      generatedAt: now,
    };
  }

  const rng = createSeededRng(seed);
  const groups = groupByChapter(cleanHighlights);
  const chapterKeys = [...groups.keys()].filter((key) => key !== '__default__');
  const samplingChapters = chapterKeys.length > 0 ? chapterKeys : ['__default__'];

  const questions: VerificationQuestion[] = [];
  const usedIds = new Set<string>();
  let samplingBudget = Math.min(maxQuestions, samplingChapters.length);

  for (const chapter of samplingChapters) {
    if (samplingBudget <= 0) break;
    const pool = groups.get(chapter) ?? [];
    const candidate = pickDistinct(rng, pool, 1)[0];
    if (!candidate) continue;
    usedIds.add(candidate.id);
    questions.push(
      buildSamplingQuestion({
        bookId: input.bookId,
        chapterRef: chapter === '__default__' ? '全书' : chapter,
        target: candidate,
        globalPool: cleanHighlights,
        distractorCount: optionsCount - 1,
        rng,
        index: questions.length,
      }),
    );
    samplingBudget -= 1;
  }

  if (questions.length < maxQuestions) {
    const markingPool = cleanHighlights.filter((item) => !usedIds.has(item.id));
    const markingTarget = pickDistinct(rng, markingPool, 1)[0];
    if (markingTarget) {
      questions.push(
        buildMarkingQuestion({
          bookId: input.bookId,
          target: markingTarget,
          index: questions.length,
        }),
      );
    }
  }

  return {
    bookId: input.bookId,
    questions: questions.slice(0, maxQuestions),
    maxQuestions,
    sourceHighlights: cleanHighlights.length,
    generatedAt: now,
  };
}

/**
 * 评估单道作答是否通过。
 *
 * sampling 题：userAnswer 与 expectedAnswer 精确匹配（已 trim）。
 * marking 题：userAnswer 匹配 + reason 字数 ≥ minReasonLength。
 *
 * @param {VerificationAttempt} attempt 作答
 * @param {VerificationQuestion} question 对应题目
 * @returns {boolean}
 */
export function evaluateVerificationAttempt(
  attempt: VerificationAttempt,
  question: VerificationQuestion,
): boolean {
  const userAnswer = (attempt.userAnswer ?? '').trim();
  const expected = (question.expectedAnswer ?? '').trim();
  const answerMatch = userAnswer.length > 0 && userAnswer === expected;
  if (question.kind === 'marking') {
    const minLen = question.minReasonLength ?? VERIFICATION_MIN_REASON_LENGTH;
    const reasonLen = (attempt.reason ?? '').trim().length;
    return answerMatch && reasonLen >= minLen;
  }
  return answerMatch;
}

/**
 * 批量评估作答，返回通过数与全对标志。
 *
 * @param {VerificationAttempt[]} attempts 作答列表
 * @param {VerificationQuestion[]} questions 题目列表
 * @returns {{ allCorrect: boolean, passedCount: number }}
 */
export function evaluateVerificationAttempts(
  attempts: VerificationAttempt[],
  questions: VerificationQuestion[],
): { allCorrect: boolean; passedCount: number } {
  const questionMap = new Map(questions.map((question) => [question.questionId, question]));
  let passedCount = 0;
  for (const attempt of attempts) {
    const question = questionMap.get(attempt.questionId);
    if (question && evaluateVerificationAttempt(attempt, question)) {
      passedCount += 1;
    }
  }
  return { allCorrect: passedCount === questions.length && questions.length > 0, passedCount };
}

/**
 * 构造初始覆盖权状态（新书或未校验）。
 *
 * @param {string} bookId 书籍 ID
 * @returns {VerificationCoverage}
 */
export function buildEmptyCoverage(bookId: string): VerificationCoverage {
  return {
    bookId,
    verified: false,
    passedCount: 0,
    attempts: 0,
  };
}

/**
 * 根据本轮作答更新覆盖权。
 *
 * PRD：通过一次（至少一道 correct）即永久获覆盖权。
 * attempts 累加本轮题数，passedCount 累加本轮通过数。
 * 首次通过时记录 verifiedAt。
 *
 * @param {string} bookId 书籍 ID
 * @param {VerificationCoverage|null} existing 既有覆盖权（null 视为初始态）
 * @param {VerificationAttempt[]} attempts 本轮作答
 * @param {VerificationQuestion[]} questions 本轮题目
 * @param {number} now 当前时间戳（毫秒）
 * @returns {VerificationCoverage}
 */
export function updateVerificationCoverage(
  bookId: string,
  existing: VerificationCoverage | null,
  attempts: VerificationAttempt[],
  questions: VerificationQuestion[],
  now: number,
): VerificationCoverage {
  const base = existing ?? buildEmptyCoverage(bookId);
  const { passedCount } = evaluateVerificationAttempts(attempts, questions);
  const totalPassed = (existing?.passedCount ?? 0) + passedCount;
  const totalAttempts = (existing?.attempts ?? 0) + attempts.length;
  const newlyVerified = !base.verified && passedCount > 0;
  return {
    bookId,
    verified: base.verified || passedCount > 0,
    verifiedAt: base.verified ? base.verifiedAt : newlyVerified ? now : undefined,
    passedCount: totalPassed,
    attempts: totalAttempts,
  };
}
