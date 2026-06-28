/**
 * 主题可辨认性自检（NS-7）。
 *
 * 与 S5 的 LDA 全局闸门（evaluateLdaGate）正交：
 * - 全局闸门：决定整本书的 algorithm = tfidf | lda（三条件同真）
 * - 逐主题自检：决定单个 cluster 是否可公开展示（coherence 自动筛 + 抽样人工确认）
 *
 * PRD R3 共识：展示前须过「可辨认性自检」，
 * 通不过（coherence 过低）的主题标注「待确认」，供前端降级展示或合并。
 *
 * @module statistics/recognition-check
 * @author fxbin
 */

import type { RecognitionStatus, TopicCluster } from '@zhijing/shared';
import { createSeededRng } from './topic-cluster.js';

/**
 * coherence 自动筛阈值：低于此值的主题视为不可辨认，标 pending。
 *
 * 取值低于 LDA 全局门禁的 0.45，给 TF-IDF 基线留出展示余地。
 */
export const RECOGNITION_COHERENCE_THRESHOLD = 0.3;

/**
 * 抽样人工确认数量（PRD：抽 2 主题人工确认）。
 */
export const RECOGNITION_MANUAL_SAMPLE_COUNT = 2;

/**
 * 默认随机种子（与题库、聚类隔离）。
 */
export const RECOGNITION_DEFAULT_SEED = 29;

/**
 * 逐主题自检结果。
 */
export interface RecognitionAssessment {
  /** 各主题簇的可辨认性状态（键为 cluster.id） */
  statuses: Record<number, RecognitionStatus>;
  /** confirmed 主题数 */
  confirmedCount: number;
  /** pending 主题数 */
  pendingCount: number;
  /** 建议人工确认的 cluster id 列表（确定性抽样，供前端弹确认框） */
  manualCandidates: number[];
  /** 使用的 coherence 阈值（透明展示） */
  threshold: number;
}

/**
 * Fisher-Yates 取前 count 个（确定性）。
 *
 * @param {() => number} rng 随机数生成器
 * @param {number[]} ids 候选 id 列表
 * @param {number} count 取出数量
 * @returns {number[]}
 */
function sampleIds(rng: () => number, ids: number[], count: number): number[] {
  const arr = [...ids];
  const n = Math.min(count, arr.length);
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(rng() * (arr.length - i));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, n);
}

/**
 * 对主题簇列表执行逐主题可辨认性自检。
 *
 * 步骤：
 * 1. coherence 自动筛：coherenceScore ≥ threshold → confirmed，否则 pending
 * 2. 从全部簇中抽样 manualSampleCount 个作为人工确认候选
 * 3. 已标 pending 的簇优先纳入候选池（让用户先确认边界主题）
 *
 * @param {TopicCluster[]} clusters 主题簇列表（来自 computeTopicSpectrum）
 * @param {object} [options]
 * @param {number} [options.threshold] coherence 阈值（缺省 RECOGNITION_COHERENCE_THRESHOLD）
 * @param {number} [options.manualSampleCount] 人工确认抽样数（缺省 RECOGNITION_MANUAL_SAMPLE_COUNT）
 * @param {number} [options.seed] 随机种子（缺省 RECOGNITION_DEFAULT_SEED）
 * @returns {RecognitionAssessment}
 */
export function assessClusterRecognition(
  clusters: TopicCluster[],
  options?: {
    threshold?: number;
    manualSampleCount?: number;
    seed?: number;
  },
): RecognitionAssessment {
  const threshold = options?.threshold ?? RECOGNITION_COHERENCE_THRESHOLD;
  const manualSampleCount = options?.manualSampleCount ?? RECOGNITION_MANUAL_SAMPLE_COUNT;
  const seed = options?.seed ?? RECOGNITION_DEFAULT_SEED;

  const statuses: Record<number, RecognitionStatus> = {};
  const pendingIds: number[] = [];
  const confirmedIds: number[] = [];

  for (const cluster of clusters) {
    const status: RecognitionStatus = cluster.coherenceScore >= threshold ? 'confirmed' : 'pending';
    statuses[cluster.id] = status;
    if (status === 'pending') {
      pendingIds.push(cluster.id);
    } else {
      confirmedIds.push(cluster.id);
    }
  }

  const rng = createSeededRng(seed);
  const candidatePool = pendingIds.length >= manualSampleCount ? pendingIds : [...pendingIds, ...confirmedIds];
  const manualCandidates = sampleIds(rng, candidatePool, manualSampleCount);

  return {
    statuses,
    confirmedCount: confirmedIds.length,
    pendingCount: pendingIds.length,
    manualCandidates,
    threshold,
  };
}

/**
 * 将自检结果回填到主题簇列表（补充 recognitionStatus 字段）。
 *
 * 不修改原数组，返回带 recognitionStatus 的新数组。
 *
 * @param {TopicCluster[]} clusters 原始主题簇列表
 * @param {RecognitionAssessment} assessment 自检结果
 * @returns {TopicCluster[]}
 */
export function applyRecognitionStatus(
  clusters: TopicCluster[],
  assessment: RecognitionAssessment,
): TopicCluster[] {
  return clusters.map((cluster) => ({
    ...cluster,
    recognitionStatus: assessment.statuses[cluster.id] ?? 'pending',
  }));
}

/**
 * 构造空自检结果（无簇或降级时使用）。
 *
 * @returns {RecognitionAssessment}
 */
export function buildEmptyRecognition(): RecognitionAssessment {
  return {
    statuses: {},
    confirmedCount: 0,
    pendingCount: 0,
    manualCandidates: [],
    threshold: RECOGNITION_COHERENCE_THRESHOLD,
  };
}
