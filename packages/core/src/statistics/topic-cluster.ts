/**
 * 主题聚类（NS-2 主题谱核心算法）。
 *
 * 基于已 L2 归一化的 TF-IDF 稀疏向量执行 k-means 聚类，采用 k-means++ 确定性初始化
 * （ seeded RNG，保证同输入同输出，聚类结果可复现）。在 k ∈ [3,20] 范围内按轮廓系数
 * （silhouette）选优。轮廓系数计算复杂度为 O(N²)，超过阈值时对求值点做随机抽样降开销。
 *
 * @module statistics/topic-cluster
 * @author fxbin
 */

import { cosineDistance, l2Normalize } from './tfidf.js';

/**
 * 稀疏向量别名（term -> 权重，已 L2 归一化）。
 */
type SparseVector = Map<string, number>;

/**
 * 聚类簇数搜索下界。低于 3 簇无法体现主题多样性。
 */
export const CLUSTER_K_MIN = 3;

/**
 * 聚类簇数搜索上界。超过 20 簇主题粒度过细，可解释性下降。
 */
export const CLUSTER_K_MAX = 20;

/**
 * k-means 最大迭代次数兜底，防止振荡不收敛。
 */
export const CLUSTER_MAX_ITERATIONS = 50;

/**
 * 默认随机种子（MINSTD LCG），保证聚类结果可复现。
 */
export const CLUSTER_DEFAULT_SEED = 42;

/**
 * 轮廓系数求值点数上限。文档数超过该值时启用随机抽样，控制 O(N²) 开销。
 */
export const SILHOUETTE_SAMPLE_THRESHOLD = 1000;

/**
 * 轮廓系数抽样的默认样本量。
 */
export const SILHOUETTE_DEFAULT_SAMPLE_SIZE = 500;

/**
 * 单次聚类结果。
 */
export interface ClusterResult {
  /** 每个文档的簇分配（下标与输入 vectors 对齐） */
  assignments: number[];
  /** 实际簇数 */
  k: number;
  /** 轮廓系数 [-1,1]，越大簇间分离越好 */
  silhouette: number;
  /** 每个簇的质心（归一化稀疏向量，代表该簇主题方向） */
  centroids: SparseVector[];
}

/**
 * k 选优结果。
 */
export interface FindBestKResult {
  /** 最优簇数 */
  bestK: number;
  /** 最优聚类结果 */
  result: ClusterResult;
  /** 各 k 的轮廓系数（供调参与可视化） */
  perK: Array<{ k: number; silhouette: number }>;
}

/**
 * k-means 运行选项。
 */
export interface KmeansOptions {
  /** 随机种子（默认 CLUSTER_DEFAULT_SEED） */
  seed?: number;
  /** 最大迭代次数（默认 CLUSTER_MAX_ITERATIONS） */
  maxIterations?: number;
  /** 轮廓系数抽样样本量（默认 SILHOUETTE_DEFAULT_SAMPLE_SIZE） */
  silhouetteSampleSize?: number;
}

/**
 * findBestK 搜索选项。
 */
export interface FindBestKOptions extends KmeansOptions {
  /** 簇数下界（默认 CLUSTER_K_MIN） */
  kMin?: number;
  /** 簇数上界（默认 CLUSTER_K_MAX） */
  kMax?: number;
}

/**
 * 创建确定性伪随机数生成器（MINSTD / Lehmer LCG）。
 *
 * 参数 a=16807、m=2^31-1，返回 [0,1) 浮点。相同 seed 产生相同序列，
 * 使 k-means++ 初始化与 silhouette 抽样完全可复现。
 *
 * @param seed - 随机种子
 * @returns 返回 [0,1) 随机数的函数
 */
export function createSeededRng(seed: number): () => number {
  const modulus = 2147483647;
  let state = seed % modulus;
  if (state <= 0) state += modulus - 1;
  return () => {
    state = (state * 16807) % modulus;
    return (state - 1) / (modulus - 1);
  };
}

/**
 * k-means++ 初始化：按距离平方概率 spread 选初始质心，得到比随机初始化更稳定的结果。
 *
 * @param vectors - 归一化稀疏向量集合
 * @param k - 目标簇数
 * @param rng - 确定性随机数生成器
 * @returns 初始质心对应的文档下标列表
 */
function kmeansPlusPlusInit(vectors: SparseVector[], k: number, rng: () => number): number[] {
  const n = vectors.length;
  const centers: number[] = [Math.floor(rng() * n)];
  const minDistSq = new Array<number>(n).fill(Infinity);
  for (let c = 1; c < k; c++) {
    const lastCenter = vectors[centers[c - 1]];
    for (let i = 0; i < n; i++) {
      const dist = cosineDistance(vectors[i], lastCenter);
      const distSq = dist * dist;
      if (distSq < minDistSq[i]) minDistSq[i] = distSq;
    }
    let total = 0;
    for (let i = 0; i < n; i++) total += minDistSq[i];
    if (total === 0) {
      centers.push(Math.floor(rng() * n));
      continue;
    }
    let r = rng() * total;
    let chosen = n - 1;
    for (let i = 0; i < n; i++) {
      r -= minDistSq[i];
      if (r <= 0) {
        chosen = i;
        break;
      }
    }
    centers.push(chosen);
  }
  return centers;
}

/**
 * 对一组稀疏向量求均值并 L2 归一化，作为新质心。
 *
 * @param vecs - 簇内向量集合
 * @returns 归一化后的均值质心
 */
function averageVectors(vecs: SparseVector[]): SparseVector {
  const acc = new Map<string, number>();
  for (const vec of vecs) {
    for (const [term, weight] of vec) {
      acc.set(term, (acc.get(term) ?? 0) + weight);
    }
  }
  const count = vecs.length;
  if (count > 0) {
    for (const [term, weight] of acc) acc.set(term, weight / count);
  }
  l2Normalize(acc);
  return acc;
}

/**
 * Fisher-Yates 部分洗牌，取前 size 个作为抽样下标。
 *
 * @param indices - 候选下标集合
 * @param size - 抽样数量
 * @param rng - 确定性随机数生成器
 * @returns 抽样下标
 */
function sampleIndices(indices: number[], size: number, rng: () => number): number[] {
  const copy = [...indices];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, size);
}

/**
 * 计算轮廓系数（silhouette）。
 *
 * 对每个求值点 i：a(i) 为与同簇其他点的平均距离，b(i) 为与最近异簇的平均距离，
 * s(i) = (b-a)/max(a,b)。全局轮廓系数为 s(i) 的均值。文档数超过阈值时抽样求值。
 *
 * @param vectors - 归一化稀疏向量集合
 * @param assignments - 簇分配（下标对齐）
 * @param k - 簇数
 * @param sampleSize - 抽样样本量（可选）
 * @returns 轮廓系数 [-1,1]
 */
export function computeSilhouette(
  vectors: SparseVector[],
  assignments: number[],
  k: number,
  sampleSize?: number,
): number {
  const n = vectors.length;
  if (k <= 1 || n <= 1) return 0;
  let evalIndices = Array.from({ length: n }, (_, i) => i);
  if (sampleSize !== undefined && n > sampleSize) {
    evalIndices = sampleIndices(evalIndices, sampleSize, createSeededRng(CLUSTER_DEFAULT_SEED));
  }
  let sumS = 0;
  let count = 0;
  for (const i of evalIndices) {
    const ownCluster = assignments[i];
    let aSum = 0;
    let aCount = 0;
    const otherSums = new Map<number, { sum: number; count: number }>();
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      const dist = cosineDistance(vectors[i], vectors[j]);
      if (assignments[j] === ownCluster) {
        aSum += dist;
        aCount += 1;
      } else {
        const entry = otherSums.get(assignments[j]) ?? { sum: 0, count: 0 };
        entry.sum += dist;
        entry.count += 1;
        otherSums.set(assignments[j], entry);
      }
    }
    const a = aCount > 0 ? aSum / aCount : 0;
    let b = Infinity;
    for (const entry of otherSums.values()) {
      if (entry.count > 0) b = Math.min(b, entry.sum / entry.count);
    }
    if (!Number.isFinite(b)) b = a;
    const denom = Math.max(a, b);
    sumS += denom > 0 ? (b - a) / denom : 0;
    count += 1;
  }
  return count > 0 ? sumS / count : 0;
}

/**
 * 执行单次 k-means 聚类。
 *
 * 流程：k-means++ 初始化 → 分配 → 质心更新（空簇保留旧质心）→ 收敛或达上限停止。
 * 完成后计算轮廓系数。
 *
 * @param vectors - 归一化稀疏向量集合
 * @param k - 目标簇数（若大于文档数则退化为文档数）
 * @param options - 运行选项
 * @returns 聚类结果
 */
export function runKmeans(vectors: SparseVector[], k: number, options: KmeansOptions = {}): ClusterResult {
  const n = vectors.length;
  if (n === 0 || k <= 0) {
    return { assignments: [], k: 0, silhouette: 0, centroids: [] };
  }
  const seed = options.seed ?? CLUSTER_DEFAULT_SEED;
  const maxIterations = options.maxIterations ?? CLUSTER_MAX_ITERATIONS;
  const sampleSize = options.silhouetteSampleSize;
  const effectiveK = Math.min(k, n);
  const rng = createSeededRng(seed);
  const initIndices = kmeansPlusPlusInit(vectors, effectiveK, rng);
  let centroids = initIndices.map((idx) => new Map(vectors[idx]));
  let assignments = new Array<number>(n).fill(0);
  for (let iter = 0; iter < maxIterations; iter += 1) {
    let changed = false;
    for (let i = 0; i < n; i += 1) {
      let bestCluster = 0;
      let bestDistance = Infinity;
      for (let c = 0; c < effectiveK; c += 1) {
        const distance = cosineDistance(vectors[i], centroids[c]);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestCluster = c;
        }
      }
      if (bestCluster !== assignments[i]) {
        changed = true;
        assignments[i] = bestCluster;
      }
    }
    const buckets: SparseVector[][] = Array.from({ length: effectiveK }, () => []);
    for (let i = 0; i < n; i += 1) buckets[assignments[i]].push(vectors[i]);
    centroids = buckets.map((bucket, c) => (bucket.length > 0 ? averageVectors(bucket) : new Map(centroids[c])));
    if (!changed) break;
  }
  const silhouette = computeSilhouette(vectors, assignments, effectiveK, sampleSize);
  return { assignments, k: effectiveK, silhouette, centroids };
}

/**
 * 在 k 范围内搜索轮廓系数最高的簇数。
 *
 * 文档数低于下界时退化为 k=文档数（每点一簇）。每个 k 使用独立种子（seed+k）
 * 保证不同 k 的初始化互不干扰，同时整体仍可复现。
 *
 * @param vectors - 归一化稀疏向量集合
 * @param options - 搜索选项
 * @returns 最优 k 及各 k 的轮廓系数
 */
export function findBestK(vectors: SparseVector[], options: FindBestKOptions = {}): FindBestKResult {
  const n = vectors.length;
  const kMin = options.kMin ?? CLUSTER_K_MIN;
  const seed = options.seed ?? CLUSTER_DEFAULT_SEED;
  const sampleSize = options.silhouetteSampleSize ?? SILHOUETTE_DEFAULT_SAMPLE_SIZE;
  if (n < kMin) {
    const fallback = runKmeans(vectors, n, { seed, silhouetteSampleSize: sampleSize });
    return { bestK: fallback.k, result: fallback, perK: [{ k: fallback.k, silhouette: fallback.silhouette }] };
  }
  const kMax = Math.min(options.kMax ?? CLUSTER_K_MAX, n);
  const perK: Array<{ k: number; silhouette: number }> = [];
  let bestK = kMin;
  let bestResult = runKmeans(vectors, kMin, { seed: seed + kMin, silhouetteSampleSize: sampleSize });
  perK.push({ k: kMin, silhouette: bestResult.silhouette });
  for (let k = kMin + 1; k <= kMax; k += 1) {
    const result = runKmeans(vectors, k, { seed: seed + k, silhouetteSampleSize: sampleSize });
    perK.push({ k, silhouette: result.silhouette });
    if (result.silhouette > bestResult.silhouette) {
      bestK = k;
      bestResult = result;
    }
  }
  return { bestK, result: bestResult, perK };
}
