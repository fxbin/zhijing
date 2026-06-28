/**
 * 主题谱组装（NS-2 核心编排模块）。
 *
 * 将分词 → TF-IDF → k-means 聚类 → coherence → 月桶时间轴 → 稳定性评估 → LDA 闸门
 * 串联为端到端的 TopicSpectrum 产物。时间轴按自然月分桶（不用「年」一刀切，避免跨年假信号），
 * windowMonths 作为聚合提示供前端做滑动平均。聚类、时间轴统计均用全量划线；silhouette 在
 * topic-cluster 内部已对超阈值语料抽样，故本层不再二次抽样。
 *
 * @module statistics/topic-spectrum
 * @author fxbin
 */

import type {
  TopicCluster,
  TopicSpectrum,
  TopicStability,
  TopicStabilityLevel,
  TopicTimelinePoint,
} from '@zhijing/shared';
import { COHERENCE_TOP_TERMS, computeOverallCoherence, computeTopicCoherence, evaluateLdaGate } from './coherence.js';
import { buildTfidfMatrix } from './tfidf.js';
import { findBestK } from './topic-cluster.js';
import { tokenizeDocs } from './tokenize.js';
import type { TokenizedDoc } from './tokenize.js';

/**
 * 默认滑动窗口月数（聚合提示，前端可据此做 3 月移动平均）。
 */
export const TOPIC_DEFAULT_WINDOW_MONTHS = 3;

/**
 * 主题调色板（scholar/sage/fact/question 衍生色，循环分配）。长度覆盖 CLUSTER_K_MAX。
 */
export const TOPIC_PALETTE = [
  '#2C5F8D', '#6B8E7F', '#8B6FB0', '#D4944A', '#C25450',
  '#5A9BB8', '#B8860B', '#7A8C99', '#9B6B9E', '#4A7C59',
  '#3E6E8C', '#7BA090', '#A083C0', '#E0A868', '#D67070',
  '#7AB4CC', '#D4A537', '#94A0AC', '#B584B8', '#5FA076',
];

/**
 * 稳定性下限：参与聚类的划线数。
 */
export const STABILITY_MIN_HIGHLIGHTS = 200;

/**
 * 稳定性下限：划线时间跨度（月）。
 */
export const STABILITY_MIN_MONTHS = 3;

/**
 * 稳定性下限：轮廓系数。
 */
export const STABILITY_MIN_SILHOUETTE = 0.4;

/**
 * 主题谱计算输入。
 */
export interface TopicSpectrumInput {
  /** 书籍 ID（单本）或 'all'（全书架聚合） */
  bookId: string;
  /** 划线集合（id + 文本 + 毫秒时间戳） */
  highlights: Array<{ id: string; text: string; time: number }>;
  /** 读过的书数（LDA 闸门用，默认 0） */
  booksRead?: number;
  /** 滑动窗口月数（默认 TOPIC_DEFAULT_WINDOW_MONTHS） */
  windowMonths?: number;
  /** 计算时间戳（默认 Date.now()，测试可注入） */
  now?: number;
}

/**
 * 运行时校验结果。
 */
export interface TopicSpectrumValidation {
  /** 结构是否完整 */
  valid: boolean;
  /** 不完整时的错误描述 */
  errors: string[];
}

/**
 * 从稀疏质心向量提取权重最高的 N 个代表词。
 *
 * @param centroid - 簇质心（归一化稀疏向量）
 * @param topN - 取前若干词
 * @returns 代表词列表（按权重降序）
 */
function extractTopTerms(centroid: Map<string, number>, topN: number): string[] {
  return [...centroid.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([term]) => term);
}

/**
 * 计算划线时间跨度的月数（maxMonth - minMonth，按年月差）。
 *
 * @param times - 毫秒时间戳集合
 * @returns 跨度月数（不足整月按 1 计，空集合返回 0）
 */
function computeMonthSpan(times: number[]): number {
  if (times.length === 0) return 0;
  let minKey = Infinity;
  let maxKey = -Infinity;
  for (const time of times) {
    const date = new Date(time);
    const key = date.getUTCFullYear() * 12 + date.getUTCMonth();
    if (key < minKey) minKey = key;
    if (key > maxKey) maxKey = key;
  }
  const span = maxKey - minKey + 1;
  return span > 0 ? span : 1;
}

/**
 * 评估主题稳定性三档等级。
 *
 * 三条件（划线数、跨度、轮廓系数）同真判 stable，部分满足判 borderline，全不满足判 unstable。
 *
 * @param highlightCount - 参与聚类的划线数
 * @param monthSpan - 时间跨度月数
 * @param silhouette - 轮廓系数
 * @returns 稳定性评估结果
 */
function evaluateStability(
  highlightCount: number,
  monthSpan: number,
  silhouette: number,
): TopicStability {
  const reasons: string[] = [];
  const enoughHighlights = highlightCount >= STABILITY_MIN_HIGHLIGHTS;
  const enoughMonths = monthSpan >= STABILITY_MIN_MONTHS;
  const goodSilhouette = silhouette >= STABILITY_MIN_SILHOUETTE;
  if (!enoughHighlights) reasons.push(`划线 ${highlightCount} < ${STABILITY_MIN_HIGHLIGHTS}`);
  if (!enoughMonths) reasons.push(`时间跨度 ${monthSpan} 月 < ${STABILITY_MIN_MONTHS} 月`);
  if (!goodSilhouette) reasons.push(`轮廓系数 ${silhouette.toFixed(2)} < ${STABILITY_MIN_SILHOUETTE}`);
  const satisfied = [enoughHighlights, enoughMonths, goodSilhouette].filter(Boolean).length;
  const level: TopicStabilityLevel = satisfied === 3 ? 'stable' : satisfied >= 1 ? 'borderline' : 'unstable';
  return { level, silhouetteScore: silhouette, highlightCount, monthSpan, reasons };
}

/**
 * 按自然月构建时间轴分布（堆叠面积图数据）。
 *
 * 每个自然月为一个 TopicTimelinePoint，统计该月各簇划线数。不补无划线的空月（面积图自然留白）。
 *
 * @param highlights - 有效划线集合
 * @param assignments - 簇分配（下标对齐 highlights）
 * @returns 按时间升序的时间轴点
 */
function buildMonthlyTimeline(
  highlights: Array<{ id: string; text: string; time: number }>,
  assignments: number[],
): TopicTimelinePoint[] {
  const buckets = new Map<string, TopicTimelinePoint>();
  for (let i = 0; i < highlights.length; i += 1) {
    const highlight = highlights[i];
    const date = new Date(highlight.time);
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const key = `${year}-${String(month + 1).padStart(2, '0')}`;
    let point = buckets.get(key);
    if (!point) {
      const windowStart = Date.UTC(year, month, 1);
      const windowEnd = Date.UTC(year, month + 1, 1);
      point = { windowStart, windowEnd, windowLabel: key, distribution: {} };
      buckets.set(key, point);
    }
    const clusterId = assignments[i] ?? 0;
    point.distribution[clusterId] = (point.distribution[clusterId] ?? 0) + 1;
  }
  return [...buckets.values()].sort((a, b) => a.windowStart - b.windowStart);
}

/**
 * 组装空输入的退化主题谱（无有效划线时返回，避免下游空指针）。
 *
 * @param input - 原始输入
 * @param now - 计算时间戳
 * @returns 退化 TopicSpectrum（clusters/timeline 为空，stability 为 unstable）
 */
function buildEmptySpectrum(input: TopicSpectrumInput, now: number): TopicSpectrum {
  const windowMonths = input.windowMonths ?? TOPIC_DEFAULT_WINDOW_MONTHS;
  return {
    bookId: input.bookId,
    algorithm: 'tfidf',
    clusters: [],
    timeline: [],
    coherenceScore: 0,
    stability: {
      level: 'unstable',
      silhouetteScore: 0,
      highlightCount: 0,
      monthSpan: 0,
      reasons: ['无有效划线，无法聚类'],
    },
    ldaGatePassed: false,
    windowMonths,
    totalHighlights: 0,
    computedAt: now,
  };
}

/**
 * 端到端计算主题谱。
 *
 * 流程：过滤空文本 → 分词 → 过滤无 token 文档 → TF-IDF → findBestK → 提取代表词与 coherence
 *      → 月桶时间轴 → 稳定性评估 → LDA 闸门 → 组装 TopicSpectrum。
 *
 * @param input - 主题谱输入
 * @returns 完整 TopicSpectrum（algorithm 当前恒为 'tfidf'，LDA 闸门仅标记是否应升级）
 */
export function computeTopicSpectrum(input: TopicSpectrumInput): TopicSpectrum {
  const now = input.now ?? Date.now();
  const windowMonths = input.windowMonths ?? TOPIC_DEFAULT_WINDOW_MONTHS;
  const rawHighlights = input.highlights.filter(
    (h) => typeof h.text === 'string' && h.text.trim().length > 0,
  );
  if (rawHighlights.length === 0) return buildEmptySpectrum(input, now);

  const docs = tokenizeDocs(rawHighlights.map((h) => ({ id: h.id, text: h.text })));
  const kept: Array<{ doc: TokenizedDoc; highlight: { id: string; text: string; time: number } }> = [];
  for (let i = 0; i < docs.length; i += 1) {
    if (docs[i].tokens.length > 0) {
      kept.push({ doc: docs[i], highlight: rawHighlights[i] });
    }
  }
  if (kept.length === 0) return buildEmptySpectrum(input, now);

  const keptDocs = kept.map((k) => k.doc);
  const keptHighlights = kept.map((k) => k.highlight);
  const matrix = buildTfidfMatrix(keptDocs);
  const best = findBestK(matrix.vectors);
  const assignments = best.result.assignments;
  const k = best.result.k;

  const highlightIdsByCluster = new Map<number, string[]>();
  for (let i = 0; i < keptHighlights.length; i += 1) {
    const clusterId = assignments[i] ?? 0;
    const list = highlightIdsByCluster.get(clusterId);
    if (list) list.push(keptHighlights[i].id);
    else highlightIdsByCluster.set(clusterId, [keptHighlights[i].id]);
  }

  const clusters: TopicCluster[] = [];
  for (let c = 0; c < k; c += 1) {
    const centroid = best.result.centroids[c] ?? new Map<string, number>();
    const representativeTerms = extractTopTerms(centroid, COHERENCE_TOP_TERMS);
    const highlightIds = highlightIdsByCluster.get(c) ?? [];
    const coherenceScore = computeTopicCoherence(representativeTerms, keptDocs);
    clusters.push({
      id: c,
      label: representativeTerms.slice(0, 3).join('·') || `主题 ${c + 1}`,
      representativeTerms,
      highlightCount: highlightIds.length,
      highlightIds,
      coherenceScore,
      color: TOPIC_PALETTE[c % TOPIC_PALETTE.length],
    });
  }
  clusters.sort((a, b) => b.highlightCount - a.highlightCount);

  const overallCoherence = computeOverallCoherence(
    clusters.map((c) => c.representativeTerms),
    clusters.map((c) => c.highlightCount),
    keptDocs,
  );
  const monthSpan = computeMonthSpan(keptHighlights.map((h) => h.time));
  const stability = evaluateStability(keptHighlights.length, monthSpan, best.result.silhouette);
  const ldaGate = evaluateLdaGate({
    vocabularySize: matrix.terms.length,
    booksRead: input.booksRead ?? 0,
    coherence: overallCoherence,
  });
  const timeline = buildMonthlyTimeline(keptHighlights, assignments);

  return {
    bookId: input.bookId,
    algorithm: 'tfidf',
    clusters,
    timeline,
    coherenceScore: overallCoherence,
    stability,
    ldaGatePassed: ldaGate.passed,
    windowMonths,
    totalHighlights: keptHighlights.length,
    computedAt: now,
  };
}

/**
 * 运行时校验 TopicSpectrum 结构完整性（防御边界与序列化还原场景）。
 *
 * @param spectrum - 待校验的主题谱
 * @returns 校验结果（valid 为 true 表示结构完整可用）
 */
export function validateTopicSpectrum(spectrum: unknown): TopicSpectrumValidation {
  const errors: string[] = [];
  if (!spectrum || typeof spectrum !== 'object') {
    return { valid: false, errors: ['主题谱非对象'] };
  }
  const value = spectrum as Partial<TopicSpectrum>;
  if (typeof value.bookId !== 'string') errors.push('bookId 缺失');
  if (value.algorithm !== 'tfidf' && value.algorithm !== 'lda') errors.push('algorithm 非法');
  if (!Array.isArray(value.clusters)) errors.push('clusters 非数组');
  if (!Array.isArray(value.timeline)) errors.push('timeline 非数组');
  if (typeof value.coherenceScore !== 'number' || Number.isNaN(value.coherenceScore)) {
    errors.push('coherenceScore 非数字');
  }
  if (!value.stability || typeof value.stability !== 'object') {
    errors.push('stability 缺失');
  }
  if (typeof value.ldaGatePassed !== 'boolean') errors.push('ldaGatePassed 非布尔');
  if (typeof value.windowMonths !== 'number') errors.push('windowMonths 非数字');
  if (typeof value.totalHighlights !== 'number') errors.push('totalHighlights 非数字');
  if (typeof value.computedAt !== 'number') errors.push('computedAt 非数字');
  return { valid: errors.length === 0, errors };
}
