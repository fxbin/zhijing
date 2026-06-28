/**
 * 降级矩阵（NS-6）。
 *
 * 实现圆桌 R6 共识：
 * - 每个派生指标（truly_read_score / quadrant / topic_spectrum / reading_health）必须登记
 * - 单项维度关闭后，按矩阵查降级行为，禁止悄悄补默认值
 * - 降置信量化：conf = baseConfidence × retentionRatio × gammaFactor
 * - 三档行为：normal（≥0.5）/ degraded（≥0.3）/ hidden（<0.3）
 * - tooltip 三要素：缺失什么 / 为什么重要 / 如何恢复
 *
 * @author fxbin
 */

import type {
  DegradeAssessment,
  DegradeBehavior,
  DegradeMatrixEntry,
} from '@zhijing/shared';

/**
 * 降级到「灰色缺角」的置信度阈值（含等于）：低于此值进入 degraded 或 hidden。
 */
export const DEGRADE_CONF_WARN_THRESHOLD = 0.5;

/**
 * 降级到「完全隐藏」的置信度阈值（含等于）：低于此值直接 hidden。
 */
export const DEGRADE_CONF_HIDE_THRESHOLD = 0.3;

/**
 * 默认附加置信因子（无数据充分性修正时为 1.0）。
 */
export const DEFAULT_GAMMA_FACTOR = 1.0;

/**
 * missingHint 模板中「被关闭维度」的占位符。
 */
export const DEGRADE_MISSING_DIMS_PLACEHOLDER = '{dims}';

/**
 * 降级矩阵登记表：所有派生指标必须在此声明其依赖维度与基准置信度。
 *
 * 维度 key 与 data-account-book.DATA_ACCOUNT_DEFAULT_ENTRIES 的 key 对齐：
 * highlight / note / reread / dwell。
 */
export const DEGRADE_MATRIX_REGISTRY: readonly DegradeMatrixEntry[] = [
  {
    key: 'truly_read_score',
    label: '真读过置信度',
    baseConfidence: 0.9,
    requiredDimensions: ['highlight', 'note', 'reread', 'dwell'],
    gammaFactor: DEFAULT_GAMMA_FACTOR,
    missingHint: `真读过置信度缺失维度：${DEGRADE_MISSING_DIMS_PLACEHOLDER}`,
    whyItMatters: '真读过是推荐与回顾的种子，置信度不足时不宜作为决策依据。',
    howToRestore: '前往「设置 → 数据账本」重新开启对应维度即可恢复。',
  },
  {
    key: 'quadrant',
    label: '书架×笔记四象限',
    baseConfidence: 0.85,
    requiredDimensions: ['highlight', 'note'],
    gammaFactor: DEFAULT_GAMMA_FACTOR,
    missingHint: `四象限缺失维度：${DEGRADE_MISSING_DIMS_PLACEHOLDER}`,
    whyItMatters: '四象限用于识别核心阅读与隐性真兴趣，缺少笔记信号会误判深度。',
    howToRestore: '前往「设置 → 数据账本」重新开启划线或笔记维度。',
  },
  {
    key: 'topic_spectrum',
    label: '主题演变谱',
    baseConfidence: 0.8,
    requiredDimensions: ['highlight', 'note'],
    gammaFactor: DEFAULT_GAMMA_FACTOR,
    missingHint: `主题演变谱缺失维度：${DEGRADE_MISSING_DIMS_PLACEHOLDER}`,
    whyItMatters: '主题谱依赖文本信号，缺失维度会导致聚类不稳定。',
    howToRestore: '前往「设置 → 数据账本」重新开启划线或笔记维度。',
  },
  {
    key: 'reading_health',
    label: '阅读健康度',
    baseConfidence: 0.75,
    requiredDimensions: ['dwell'],
    gammaFactor: DEFAULT_GAMMA_FACTOR,
    missingHint: `阅读健康度缺失维度：${DEGRADE_MISSING_DIMS_PLACEHOLDER}`,
    whyItMatters: '阅读健康度依赖停留时长信号，缺失时无法评估节奏。',
    howToRestore: '前往「设置 → 数据账本」重新开启停留时长维度。',
  },
];

export interface AssessDegradeOptions {
  /**
   * 附加置信因子覆盖值（默认取登记项自带的 gammaFactor）
   */
  gammaFactor?: number;
}

/**
 * 在登记表中查找指定派生指标。
 */
export function getMatrixEntry(
  registry: readonly DegradeMatrixEntry[],
  metricKey: string,
): DegradeMatrixEntry | undefined {
  return registry.find((entry) => entry.key === metricKey);
}

/**
 * 按置信度分档：≥0.5 normal、≥0.3 degraded、<0.3 hidden。
 */
export function classifyBehavior(confidence: number): DegradeBehavior {
  if (confidence >= DEGRADE_CONF_WARN_THRESHOLD) return 'normal';
  if (confidence >= DEGRADE_CONF_HIDE_THRESHOLD) return 'degraded';
  return 'hidden';
}

/**
 * 计算保留比：retained / required。
 * required 为 0 时返回 1（无依赖则不受降级影响）。
 */
export function computeRetentionRatio(
  retainedCount: number,
  requiredCount: number,
): number {
  if (requiredCount <= 0) return 1;
  return retainedCount / requiredCount;
}

/**
 * 评估单个派生指标的降级状态。
 *
 * @param entry         登记项
 * @param disabledDimensions 当前被关闭的原始维度 key 集合
 * @param opts          附加置信因子覆盖
 */
export function assessDegrade(
  entry: DegradeMatrixEntry,
  disabledDimensions: readonly string[],
  opts: AssessDegradeOptions = {},
): DegradeAssessment {
  const disabledSet = new Set(disabledDimensions);
  const retainedDimensions = entry.requiredDimensions.filter((dim) => !disabledSet.has(dim));
  const disabledDimensionsForMetric = entry.requiredDimensions.filter((dim) => disabledSet.has(dim));
  const retentionRatio = computeRetentionRatio(
    retainedDimensions.length,
    entry.requiredDimensions.length,
  );
  const gammaFactor = opts.gammaFactor ?? entry.gammaFactor;
  const confidence = entry.baseConfidence * retentionRatio * gammaFactor;
  const behavior = classifyBehavior(confidence);
  const dimsLabel = disabledDimensionsForMetric.join('、');
  const whatIsMissing = entry.missingHint.replace(DEGRADE_MISSING_DIMS_PLACEHOLDER, dimsLabel || '无');
  return {
    metricKey: entry.key,
    retainedDimensions,
    disabledDimensions: disabledDimensionsForMetric,
    retentionRatio,
    confidence,
    behavior,
    tooltip: {
      whatIsMissing,
      whyItMatters: entry.whyItMatters,
      howToRestore: entry.howToRestore,
    },
  };
}

/**
 * 批量评估登记表中所有派生指标。
 */
export function assessAllDegrade(
  registry: readonly DegradeMatrixEntry[] = DEGRADE_MATRIX_REGISTRY,
  disabledDimensions: readonly string[] = [],
  opts: AssessDegradeOptions = {},
): DegradeAssessment[] {
  return registry.map((entry) => assessDegrade(entry, disabledDimensions, opts));
}

/**
 * 仅返回发生降级（behavior !== 'normal'）的派生指标评估。
 * 前端用于决定哪些位置需要渲染 DegradeBadge。
 */
export function findDegraded(
  registry: readonly DegradeMatrixEntry[] = DEGRADE_MATRIX_REGISTRY,
  disabledDimensions: readonly string[] = [],
  opts: AssessDegradeOptions = {},
): DegradeAssessment[] {
  return assessAllDegrade(registry, disabledDimensions, opts).filter(
    (assessment) => assessment.behavior !== 'normal',
  );
}
