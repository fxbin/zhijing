/**
 * 真读过置信度评分（NS-3）。
 *
 * 圆桌 R3 共识：
 * - 禁止输出布尔值「读过/没读过」，必须输出置信度 N%
 * - 客观信号按「伪造成本」加权：笔记 > 划线 > 覆盖率（虚荣用户最易刷划线）
 * - 时间衰减：近期阅读权重更高，但半衰期温和（阅读是慢行为）
 * - 主观校验（轻校验）作为加分项，不作为唯一判据
 * - 降级矩阵：维度关闭后置信度按保留比衰减，禁止悄悄补默认值
 *
 * 评分公式：
 *   final = (W_obj · objectiveRaw + W_subj · subjectiveRate) · timeDecay · degradeConfidence
 *
 * @author fxbin
 */

import type {
  LightVerification,
  ReadSignalDims,
  ReadSignalProfile,
  TrulyReadScore,
} from '@zhijing/shared';
import {
  computeCoverage,
  saturateHighlight,
  saturateNote,
  saturateReview,
} from './saturate.js';

/**
 * 客观分各维度默认权重（和为 1.0）。
 * 笔记权重最高（0.35），因为写作是最难伪造的信号。
 */
export const WEIGHT_HIGHLIGHT = 0.2;
export const WEIGHT_NOTE = 0.35;
export const WEIGHT_REVIEW = 0.25;
export const WEIGHT_COVERAGE = 0.2;

/**
 * 客观分与主观校验的混合权重。
 * 客观为主（0.7），主观校验为加分项（0.3）。
 */
export const WEIGHT_OBJECTIVE = 0.7;
export const WEIGHT_SUBJECTIVE = 0.3;

/**
 * 时间衰减常数：λ = 0.0028 /天，对应半衰期约 248 天（ln2 / 0.0028）。
 * 含义：一本书最后一次阅读活动距今 248 天，时间衰减因子 = 0.5。
 */
export const TIME_DECAY_LAMBDA = 0.0028;

/**
 * 一天的毫秒数，用于时间衰减计算。
 */
const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;

export interface ComputeTrulyReadOptions {
  /**
   * 降级置信度 [0,1]，来自降级矩阵 assessDegrade 的输出。
   * 默认 1.0（所有维度开启）。
   */
  degradeConfidence?: number;
  /**
   * 评分计算时刻（ms），默认取 Date.now()。测试时可注入固定值。
   */
  now?: number;
  /**
   * 时间衰减常数覆盖（/天），默认 TIME_DECAY_LAMBDA。
   */
  lambda?: number;
}

/**
 * 计算时间衰减因子：exp(-λ · daysSinceLastActivity)。
 *
 * - 距今 0 天 → 1.0（刚刚读过）
 * - 距今 248 天 → 0.5（默认 λ 下）
 * - 距今越久越接近 0
 *
 * 若 lastActivityTime 缺失或无效（<=0），返回保守值 0（无活动证据）。
 */
export function computeTimeDecay(
  lastActivityTime: number,
  now: number,
  lambda: number = TIME_DECAY_LAMBDA,
): number {
  if (!Number.isFinite(lastActivityTime) || lastActivityTime <= 0) return 0;
  const days = Math.max(0, (now - lastActivityTime) / MILLIS_PER_DAY);
  return Math.exp(-lambda * days);
}

/**
 * 计算客观分：四维饱和后加权求和。
 *
 * @returns { raw: 加权客观分 [0,1], breakdown: 各维饱和值 }
 */
export function computeObjectiveScore(dims: ReadSignalDims): {
  raw: number;
  breakdown: { highlight: number; note: number; review: number; coverage: number };
} {
  const highlight = saturateHighlight(dims.highlightCount);
  const note = saturateNote(dims.noteCharCount);
  const review = saturateReview(dims.reviewCharCount, dims.hasLongReview);
  const coverage = computeCoverage(dims.chaptersCovered, dims.totalChapters);
  const raw =
    WEIGHT_HIGHLIGHT * highlight +
    WEIGHT_NOTE * note +
    WEIGHT_REVIEW * review +
    WEIGHT_COVERAGE * coverage;
  return {
    raw,
    breakdown: { highlight, note, review, coverage },
  };
}

/**
 * 从轻校验结果提取通过率。无校验时返回 0。
 */
export function computeSubjectiveRate(
  verification?: LightVerification,
): number {
  if (!verification) return 0;
  if (!Array.isArray(verification.claims) || verification.claims.length === 0) {
    return 0;
  }
  const correct = verification.claims.filter((claim) => claim.correct).length;
  return correct / verification.claims.length;
}

/**
 * 将值截断到 [0,1]。
 */
function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/**
 * 计算单本书的真读过置信度评分（NS-3 主入口）。
 *
 * @param profile  阅读信号档案（含 dims + 可选 history）
 * @param verification 可选的轻校验结果
 * @param opts     降级置信度、时间衰减等参数
 * @returns TrulyReadScore（confidence 为最终 N%）
 */
export function computeTrulyReadScore(
  profile: ReadSignalProfile,
  verification?: LightVerification,
  opts: ComputeTrulyReadOptions = {},
): TrulyReadScore {
  const now = opts.now ?? Date.now();
  const lambda = opts.lambda ?? TIME_DECAY_LAMBDA;
  const degradeConfidence = opts.degradeConfidence ?? 1;

  const objective = computeObjectiveScore(profile.dims);
  const subjectiveRate = computeSubjectiveRate(verification);
  const timeDecayFactor = computeTimeDecay(profile.dims.lastActivityTime, now, lambda);

  const blended =
    WEIGHT_OBJECTIVE * objective.raw + WEIGHT_SUBJECTIVE * subjectiveRate;
  const confidence = clamp01(blended * timeDecayFactor * degradeConfidence);

  return {
    bookId: profile.bookId,
    confidence,
    objectiveRaw: clamp01(objective.raw),
    subjectiveRate,
    timeDecayFactor,
    degradeConfidence,
    dimBreakdown: objective.breakdown,
    verification,
    computedAt: now,
  };
}
