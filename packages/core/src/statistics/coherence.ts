/**
 * 主题一致性（coherence）与 LDA 升级闸门（NS-2）。
 *
 * 主题一致性衡量一个簇的代表词是否经常在同一划线中共现：共现越频繁，主题越内聚、越可解释。
 * 本模块采用基于文档共现的重叠系数（overlap coefficient）：对代表词对 (wi,wj)，计算同时含两者的
 * 文档数与 min(D(wi),D(wj)) 的比值，值域天然落在 [0,1]，符合 PRD「coherence > 0.45」闸门语义，
 * 且不依赖词频排序（较 UMass 的有向 log 更稳健）。
 *
 * LDA 升级三条件同真闸门：有效词 ≥3000 且 读过书 ≥8 且 coherence >0.45，任一不足则停留 TF-IDF 基线。
 *
 * @module statistics/coherence
 * @author fxbin
 */

import type { TokenizedDoc } from './tokenize.js';

/**
 * 计算主题一致性时取每个簇的代表词数量。
 */
export const COHERENCE_TOP_TERMS = 10;

/**
 * LDA 升级闸门：TF-IDF 后有效词数下限。
 */
export const LDA_GATE_VOCABULARY_SIZE = 3000;

/**
 * LDA 升级闸门：读过书数下限（主题数估计需足够样本）。
 */
export const LDA_GATE_BOOKS_READ = 8;

/**
 * LDA 升级闸门：全局 coherence 下限。
 */
export const LDA_GATE_COHERENCE = 0.45;

/**
 * LDA 升级闸门输入。
 */
export interface LdaGateInput {
  /** TF-IDF 后有效词数（词汇表大小） */
  vocabularySize: number;
  /** 读过的书数 */
  booksRead: number;
  /** 全局 coherence 评分 */
  coherence: number;
}

/**
 * LDA 升级闸门评估结果。
 */
export interface LdaGateResult {
  /** 三条件是否同真 */
  passed: boolean;
  /** 未通过时的逐条原因（供「待确认」标注使用） */
  reasons: string[];
}

/**
 * 计算单个主题的代表词集合的一致性（重叠系数均值）。
 *
 * 对每对代表词 (wi,wj)：ratio = D(wi,wj) / min(D(wi),D(wj))，
 * 其中 D(w) 为含 w 的文档数，D(wi,wj) 为同时含两者的文档数。
 * 返回所有词对 ratio 的均值，值域 [0,1]。
 *
 * @param topTerms - 该主题的代表词列表（长度 <2 时返回 0）
 * @param docs - 全量分词文档（用于统计共现）
 * @returns 主题一致性 [0,1]
 */
export function computeTopicCoherence(topTerms: string[], docs: TokenizedDoc[]): number {
  if (topTerms.length < 2) return 0;
  const docSets = new Map<string, Set<number>>();
  for (let d = 0; d < docs.length; d += 1) {
    for (const token of docs[d].tokens) {
      let set = docSets.get(token);
      if (!set) {
        set = new Set<number>();
        docSets.set(token, set);
      }
      set.add(d);
    }
  }
  let sum = 0;
  let pairCount = 0;
  for (let j = 1; j < topTerms.length; j += 1) {
    for (let i = 0; i < j; i += 1) {
      const setI = docSets.get(topTerms[i]);
      const setJ = docSets.get(topTerms[j]);
      if (!setI || !setJ || setI.size === 0 || setJ.size === 0) continue;
      const [smaller, larger] = setI.size <= setJ.size ? [setI, setJ] : [setJ, setI];
      let coOccur = 0;
      for (const docIdx of smaller) {
        if (larger.has(docIdx)) coOccur += 1;
      }
      sum += coOccur / smaller.size;
      pairCount += 1;
    }
  }
  return pairCount > 0 ? sum / pairCount : 0;
}

/**
 * 计算全部主题的加权平均一致性（按各主题划线数加权）。
 *
 * @param topicsTerms - 各主题代表词列表集合
 * @param topicWeights - 各主题权重（通常为划线数）
 * @param docs - 全量分词文档
 * @returns 全局一致性 [0,1]
 */
export function computeOverallCoherence(
  topicsTerms: string[][],
  topicWeights: number[],
  docs: TokenizedDoc[],
): number {
  if (topicsTerms.length === 0) return 0;
  let weightedSum = 0;
  let totalWeight = 0;
  for (let t = 0; t < topicsTerms.length; t += 1) {
    const weight = topicWeights[t] ?? 0;
    const score = computeTopicCoherence(topicsTerms[t], docs);
    weightedSum += score * weight;
    totalWeight += weight;
  }
  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * 评估 LDA 升级三条件闸门。
 *
 * 三条件同真才通过：有效词 ≥ LDA_GATE_VOCABULARY_SIZE 且 读过书 ≥ LDA_GATE_BOOKS_READ
 * 且 coherence ≥ LDA_GATE_COHERENCE。任一不足返回未通过原因，调用方据此停留 TF-IDF 基线。
 *
 * @param input - 闸门输入（有效词数、读过书数、coherence）
 * @returns 闸门评估结果
 */
export function evaluateLdaGate(input: LdaGateInput): LdaGateResult {
  const reasons: string[] = [];
  if (input.vocabularySize < LDA_GATE_VOCABULARY_SIZE) {
    reasons.push(`有效词 ${input.vocabularySize} < ${LDA_GATE_VOCABULARY_SIZE}，不足以训练 LDA`);
  }
  if (input.booksRead < LDA_GATE_BOOKS_READ) {
    reasons.push(`读过书 ${input.booksRead} < ${LDA_GATE_BOOKS_READ}，主题数估计不稳定`);
  }
  if (input.coherence < LDA_GATE_COHERENCE) {
    reasons.push(`coherence ${input.coherence.toFixed(2)} < ${LDA_GATE_COHERENCE}，主题可解释性不足`);
  }
  return { passed: reasons.length === 0, reasons };
}
