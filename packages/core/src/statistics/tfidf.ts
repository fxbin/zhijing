/**
 * TF-IDF 加权与余弦相似度（NS-2 主题谱向量化模块）。
 *
 * 将分词后的划线文档集合转换为稀疏 TF-IDF 向量，并做 L2 归一化，使余弦相似度退化为点积，
 * 供 k-means 聚类消费。IDF 采用 sklearn 风格平滑（避免 df=N 时 idf 为 0 导致高频词权重消失）。
 *
 * @module statistics/tfidf
 * @author fxbin
 */

import type { TokenizedDoc } from './tokenize.js';

/**
 * IDF 平滑常数（sklearn smooth_idf 风格）。公式：idf = ln((1+N)/(1+df)) + 1。
 */
export const TFIDF_IDF_SMOOTHING = 1;

/**
 * TF-IDF 矩阵（NS-2 聚类输入）。
 *
 * vectors 与 docIds 按下标对齐，每个 vector 为已 L2 归一化的稀疏 Map。
 */
export interface TfidfMatrix {
  /** 文档 ID 列表（与 vectors 下标对齐） */
  docIds: string[];
  /** 每个文档的稀疏 TF-IDF 向量（已 L2 归一化），键为 term，值为权重 */
  vectors: Map<string, number>[];
  /** 全局词汇表（按首次出现顺序） */
  terms: string[];
  /** 逆文档频率表 */
  idf: Map<string, number>;
}

/**
 * 计算全局逆文档频率（IDF）。
 *
 * 公式：idf(t) = ln((1 + N) / (1 + df(t))) + 1，其中 N 为文档总数，df(t) 为含 t 的文档数。
 * 平滑项避免 df=N 时 idf 坍缩为 0。
 *
 * @param docs - 分词后的文档集合
 * @returns term -> idf 映射
 */
export function computeIdf(docs: TokenizedDoc[]): Map<string, number> {
  const docFrequency = new Map<string, number>();
  const totalDocs = docs.length;
  for (const doc of docs) {
    const seen = new Set(doc.tokens);
    for (const term of seen) {
      docFrequency.set(term, (docFrequency.get(term) ?? 0) + 1);
    }
  }
  const idf = new Map<string, number>();
  for (const [term, df] of docFrequency) {
    const smoothed = Math.log((TFIDF_IDF_SMOOTHING + totalDocs) / (TFIDF_IDF_SMOOTHING + df)) + 1;
    idf.set(term, smoothed);
  }
  return idf;
}

/**
 * 原地对稀疏向量做 L2 归一化。
 *
 * 归一化后向量模长为 1，余弦相似度等于点积。
 *
 * @param vector - 待归一化的稀疏向量（原地修改）
 */
export function l2Normalize(vector: Map<string, number>): void {
  let sumSquares = 0;
  for (const weight of vector.values()) {
    sumSquares += weight * weight;
  }
  if (sumSquares === 0) return;
  const norm = Math.sqrt(sumSquares);
  for (const [term, weight] of vector) {
    vector.set(term, weight / norm);
  }
}

/**
 * 计算单个文档的 TF-IDF 向量（含 L2 归一化）。
 *
 * TF 为原始词频计数，乘以 IDF 后做 L2 归一化。
 *
 * @param tokens - 文档 token 数组
 * @param idf - 全局 IDF 表
 * @returns 稀疏 TF-IDF 向量（已归一化）
 */
export function computeTfidfVector(tokens: string[], idf: Map<string, number>): Map<string, number> {
  const termFrequency = new Map<string, number>();
  for (const token of tokens) {
    termFrequency.set(token, (termFrequency.get(token) ?? 0) + 1);
  }
  const vector = new Map<string, number>();
  for (const [term, tf] of termFrequency) {
    const idfWeight = idf.get(term);
    if (idfWeight === undefined) continue;
    vector.set(term, tf * idfWeight);
  }
  l2Normalize(vector);
  return vector;
}

/**
 * 构建完整 TF-IDF 矩阵。
 *
 * @param docs - 分词后的文档集合
 * @returns TF-IDF 矩阵（含 docIds、归一化向量、词汇表、idf）
 */
export function buildTfidfMatrix(docs: TokenizedDoc[]): TfidfMatrix {
  const idf = computeIdf(docs);
  const docIds: string[] = [];
  const vectors: Map<string, number>[] = [];
  const terms: string[] = [];
  const termSeen = new Set<string>();
  for (const doc of docs) {
    docIds.push(doc.docId);
    vectors.push(computeTfidfVector(doc.tokens, idf));
    for (const token of doc.tokens) {
      if (!termSeen.has(token)) {
        termSeen.add(token);
        terms.push(token);
      }
    }
  }
  return { docIds, vectors, terms, idf };
}

/**
 * 计算两个已 L2 归一化稀疏向量的余弦相似度（即点积）。
 *
 * 返回值域 [0, 1]（TF-IDF 权重非负）。在较小向量上迭代以降低开销。
 *
 * @param a - 归一化向量 A
 * @param b - 归一化向量 B
 * @returns 余弦相似度
 */
export function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  const [smaller, larger] = a.size <= b.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [term, weight] of smaller) {
    const other = larger.get(term);
    if (other !== undefined) dot += weight * other;
  }
  return dot;
}

/**
 * 余弦距离（1 - 余弦相似度），供 k-means 直接作为距离度量。
 *
 * @param a - 归一化向量 A
 * @param b - 归一化向量 B
 * @returns 余弦距离 [0, 1]
 */
export function cosineDistance(a: Map<string, number>, b: Map<string, number>): number {
  return 1 - cosineSimilarity(a, b);
}
