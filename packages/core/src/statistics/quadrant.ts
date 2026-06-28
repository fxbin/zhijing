/**
 * 书架×笔记四象限（NS-1）。
 *
 * 实现圆桌 R1 共识：
 * - note_depth 公式：α·划线密度 + β·log 笔记字数 + γ·长评指示
 * - 滚动分位阈值（τ_note 默认 0.6）：基于用户自身读过书分布，不设全局绝对值
 * - 四象限：core_reading / commitment_debt / hidden_interest / irrelevant
 * - 推荐种子：Q1 ∪ Q3（禁止用 Q2）
 * - Q2 不主动弹窗纪律
 *
 * @author fxbin
 */

import type {
  BookQuadrant,
  BookSignalInputs,
  NoteDepthScore,
  QuadrantKind,
  QuadrantSummary,
} from '@zhijing/shared';

export const DEFAULT_NOTE_DEPTH_ALPHA = 0.5;
export const DEFAULT_NOTE_DEPTH_BETA = 0.4;
export const DEFAULT_NOTE_DEPTH_GAMMA = 0.1;
export const DEFAULT_TAU_NOTE = 0.6;
export const MINIMUM_BOOKS_FOR_PERCENTILE = 8;
export const RECOMMENDATION_SEED_KINDS: readonly QuadrantKind[] = ['core_reading', 'hidden_interest'];

export interface NoteDepthOptions {
  alpha?: number;
  beta?: number;
  gamma?: number;
}

export interface QuadrantOptions {
  alpha?: number;
  beta?: number;
  gamma?: number;
  tauNote?: number;
  /**
   * 用作滚动分位参照的历史分布（用户的其他书的 raw 分）
   * 不传则回退到当前集合内部分位
   */
  historyScores?: number[];
}

/**
 * 计算单本书的 note_depth 原始分（无标准化）。
 * 公式：α·(划线条数/章节数) + β·log(1+原创笔记字数) + γ·(是否有长评)
 */
export function computeNoteDepthRaw(input: BookSignalInputs, opts: NoteDepthOptions = {}): number {
  const alpha = opts.alpha ?? DEFAULT_NOTE_DEPTH_ALPHA;
  const beta = opts.beta ?? DEFAULT_NOTE_DEPTH_BETA;
  const gamma = opts.gamma ?? DEFAULT_NOTE_DEPTH_GAMMA;
  const highlightDensity = input.chapterCount > 0 ? input.highlightCount / input.chapterCount : 0;
  const noteComponent = Math.log(1 + Math.max(0, input.noteCharCount));
  const longReviewComponent = input.hasLongReview ? 1 : 0;
  return alpha * highlightDensity + beta * noteComponent + gamma * longReviewComponent;
}

/**
 * 计算滚动分位数：value 在 sortedList 中的相对位置（0-1）。
 * 返回 null 表示数据不足。
 */
export function computeRollingPercentile(value: number, sortedAscList: number[]): number | null {
  if (sortedAscList.length < MINIMUM_BOOKS_FOR_PERCENTILE) {
    return null;
  }
  let left = 0;
  let right = sortedAscList.length;
  while (left < right) {
    const mid = (left + right) >>> 1;
    if (sortedAscList[mid] < value) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }
  return left / sortedAscList.length;
}

function computeNoteDepthForBook(
  input: BookSignalInputs,
  historyScores: number[],
  opts: QuadrantOptions,
): NoteDepthScore {
  const raw = computeNoteDepthRaw(input, opts);
  const percentile = computeRollingPercentile(raw, [...historyScores].sort((a, b) => a - b));
  const tauNote = opts.tauNote ?? DEFAULT_TAU_NOTE;
  return {
    bookId: input.bookId,
    raw,
    rollingPercentile: percentile,
    isDeep: percentile !== null && percentile > tauNote,
  };
}

function classifyQuadrant(input: BookSignalInputs, isDeep: boolean): QuadrantKind {
  if (input.onShelf && isDeep) return 'core_reading';
  if (input.onShelf && !isDeep) return 'commitment_debt';
  if (!input.onShelf && isDeep) return 'hidden_interest';
  return 'irrelevant';
}

/**
 * 计算整组书的四象限汇总。
 */
export function computeQuadrantSummary(
  inputs: readonly BookSignalInputs[],
  opts: QuadrantOptions = {},
): QuadrantSummary {
  const computedAt = new Date().toISOString();

  if (inputs.length === 0) {
    return {
      coreReading: [],
      commitmentDebt: [],
      hiddenInterest: [],
      irrelevant: 0,
      insufficientData: true,
      recommendationSeeds: [],
      computedAt,
    };
  }

  const historyScores = opts.historyScores ?? inputs.map((input) => computeNoteDepthRaw(input, opts));
  const insufficientData = historyScores.length < MINIMUM_BOOKS_FOR_PERCENTILE;

  const results: BookQuadrant[] = inputs.map((input) => {
    const noteDepth = computeNoteDepthForBook(input, historyScores, opts);
    const kind = classifyQuadrant(input, noteDepth.isDeep);
    return {
      bookId: input.bookId,
      kind,
      noteDepth,
      isRecommendationSeed: RECOMMENDATION_SEED_KINDS.includes(kind),
    };
  });

  const coreReading = results.filter((r) => r.kind === 'core_reading');
  const commitmentDebt = results.filter((r) => r.kind === 'commitment_debt');
  const hiddenInterest = results.filter((r) => r.kind === 'hidden_interest');
  const irrelevant = results.filter((r) => r.kind === 'irrelevant').length;
  const recommendationSeeds = results
    .filter((r) => r.isRecommendationSeed)
    .map((r) => r.bookId);

  return {
    coreReading,
    commitmentDebt,
    hiddenInterest,
    irrelevant,
    insufficientData,
    recommendationSeeds,
    computedAt,
  };
}