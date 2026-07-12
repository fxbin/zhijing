/**
 * 主题谱聚类类型（NS-2）。
 *
 * 包含聚类算法标识、稳定性等级、可辨认性状态、主题簇、时间轴分布、
 * 稳定性评估与完整主题谱结构。用于堆叠面积图与「待确认」标注的数据源。
 *
 * @author fxbin
 */

/**
 * 主题谱聚类算法标识（NS-2）。
 *
 * - tfidf：TF-IDF 加权 + k-means 基线（默认）
 * - lda：LDA 概率主题模型（升级闸门通过后启用，Node 端暂缺成熟库，当前留接口）
 */
export const TOPIC_ALGORITHM_VALUES = ['tfidf', 'lda'] as const;

/**
 * 主题谱使用的算法类型（NS-2）。
 */
export type TopicAlgorithm = (typeof TOPIC_ALGORITHM_VALUES)[number];

/**
 * 主题稳定性三档等级（NS-2）。
 *
 * stable / borderline / unstable，由划线数量、时间跨度、轮廓系数三条件共同判定。
 */
export const TOPIC_STABILITY_VALUES = ['stable', 'borderline', 'unstable'] as const;

/**
 * 主题稳定性等级（NS-2）。
 */
export type TopicStabilityLevel = (typeof TOPIC_STABILITY_VALUES)[number];

/**
 * 主题可辨认性状态（NS-7 逐主题自检）。
 *
 * 与 S5 的 LDA 全局闸门正交：全局闸门决定 algorithm=tfidf|lda，
 * 逐主题自检决定单个 cluster 是否可公开展示。
 */
export const RECOGNITION_STATUS_VALUES = ['confirmed', 'pending'] as const;

/**
 * 主题可辨认性等级（NS-7）。
 */
export type RecognitionStatus = (typeof RECOGNITION_STATUS_VALUES)[number];

/**
 * 单个主题簇（NS-2）。
 *
 * 一个簇代表一组语义相近的划线，包含代表词、原始划线索引与 coherence 评分，
 * 供前端「点开看原始划线和代表句」使用。
 *
 * NS-7 追加 recognitionStatus 可选字段：未参与自检时缺省，参与自检后必填。
 */
export interface TopicCluster {
  /** 主题簇 ID（从 0 开始，全局唯一） */
  id: number;
  /** 主题标签（代表词拼接而成，用于图例与摘要） */
  label: string;
  /** 代表词列表（按 TF-IDF 权重降序，取前若干） */
  representativeTerms: string[];
  /** 该簇包含的划线数量 */
  highlightCount: number;
  /** 该簇包含的划线 ID 列表（前端据此展开原始划线） */
  highlightIds: string[];
  /** 该簇内部的 coherence 一致性评分 [0,1] */
  coherenceScore: number;
  /** 该簇在图表中的颜色（调色板索引或十六进制色值） */
  color: string;
  /** 可辨认性状态（NS-7 自检后填充；confirmed 可公开展示，pending 需人工确认或合并） */
  recognitionStatus?: RecognitionStatus;
}

/**
 * 时间轴单个滑动窗口的主题分布（NS-2 堆叠面积图数据点）。
 *
 * 不使用「年」一刀切，而是按月滑动窗口聚合，避免跨年假信号。
 */
export interface TopicTimelinePoint {
  /** 窗口起始时间（毫秒时间戳） */
  windowStart: number;
  /** 窗口结束时间（毫秒时间戳） */
  windowEnd: number;
  /** 窗口可读标签（如 "2024-03"） */
  windowLabel: string;
  /** 各主题簇在该窗口内的划线数量分布（键为簇 ID） */
  distribution: Record<number, number>;
}

/**
 * 主题稳定性评估结果（NS-2）。
 *
 * 三条件同真判 stable，部分满足判 borderline，大量不足判 unstable（标注「仅供参考」）。
 */
export interface TopicStability {
  /** 稳定性等级 */
  level: TopicStabilityLevel;
  /** 轮廓系数（衡量簇间分离度，越大越稳定） */
  silhouetteScore: number;
  /** 参与聚类的划线总数 */
  highlightCount: number;
  /** 划线时间跨度（月） */
  monthSpan: number;
  /** 三档评级理由（逐条说明各条件是否满足） */
  reasons: string[];
}

/**
 * 完整主题谱（NS-2 核心输出）。
 *
 * 主题演变谱的端到端产物，包含聚类结果、时间轴分布、稳定性评估与 LDA 升级闸门状态，
 * 是堆叠面积图与「待确认」标注的唯一数据源。
 */
export interface TopicSpectrum {
  /** 书籍 ID（单本分析）或 'all'（全书架聚合） */
  bookId: string;
  /** 实际使用的聚类算法 */
  algorithm: TopicAlgorithm;
  /** 主题簇列表（按 highlightCount 降序） */
  clusters: TopicCluster[];
  /** 时间轴分布（堆叠面积图数据，按 windowStart 升序） */
  timeline: TopicTimelinePoint[];
  /** 全局 coherence 评分（所有簇的加权均值） */
  coherenceScore: number;
  /** 稳定性评估 */
  stability: TopicStability;
  /** LDA 升级闸门是否通过（未通过则停留 TF-IDF 基线） */
  ldaGatePassed: boolean;
  /** 滑动窗口月数（默认 3） */
  windowMonths: number;
  /** 参与分析的划线总数 */
  totalHighlights: number;
  /** 计算时间戳（毫秒） */
  computedAt: number;
}
