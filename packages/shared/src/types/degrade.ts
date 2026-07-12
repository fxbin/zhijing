/**
 * 降级矩阵类型（NS-6）。
 *
 * 包含降级行为枚举、派生指标登记项、降级矩阵登记项与降级评估结果。
 * 当用户关闭某个原始采集维度后，依赖该维度的派生指标按置信度走三档降级。
 *
 * @author fxbin
 */

/**
 * 降级行为枚举（NS-6）。
 *
 * 当用户关闭某个原始采集维度后，依赖该维度的派生指标按置信度走三档降级：
 * - normal        正常展示（置信度充足）
 * - degraded      灰色缺角展示 + tooltip 三要素（置信度不足但仍有部分信号）
 * - hidden        完全隐藏（置信度过低，展示反而误导）
 *
 * 红线：禁止用默认值「悄悄补齐」被关闭的维度。
 *
 * @author fxbin
 */
export const DEGRADE_BEHAVIOR_VALUES = ['normal', 'degraded', 'hidden'] as const;
export type DegradeBehavior = typeof DEGRADE_BEHAVIOR_VALUES[number];

/**
 * 派生指标登记项（NS-6 派生指标登记表）。
 *
 * 每一个派生指标（truly_read_score / quadrant / topic_spectrum / reading_health 等）
 * 都必须在此登记，声明它依赖哪些原始维度、基准置信度是多少。
 *
 * @author fxbin
 */
export interface DerivedMetric {
  /**
   * 派生指标唯一键（蛇形命名，与 data-account-book.dependentMetrics 对齐）
   */
  key: string;
  /**
   * 中文展示名（用于 tooltip / 设置页）
   */
  label: string;
  /**
   * 基准置信度 [0,1]：所有依赖维度都开启时的置信度
   */
  baseConfidence: number;
  /**
   * 依赖的原始维度 key 列表（对应 DataAccountEntry.key）
   */
  requiredDimensions: string[];
}

/**
 * 降级矩阵登记项（NS-6）：派生指标 + 降置信量化参数 + tooltip 三要素模板。
 *
 * 置信度公式：conf = baseConfidence × retentionRatio × gammaFactor
 * - retentionRatio = retainedDimensions / requiredDimensions.length
 * - gammaFactor    数据充分性等附加因子（默认 1.0，由调用方按上下文调整）
 *
 * @author fxbin
 */
export interface DegradeMatrixEntry extends DerivedMetric {
  /**
   * 附加置信因子（数据充分性 / 算法版本 / 样本量等），默认 1.0
   */
  gammaFactor: number;
  /**
   * tooltip 三要素之一：缺失了什么维度（动态拼接模板，占位符 {dims}）
   */
  missingHint: string;
  /**
   * tooltip 三要素之二：为什么这个指标重要
   */
  whyItMatters: string;
  /**
   * tooltip 三要素之三：如何恢复（引导用户回到数据账本开启维度）
   */
  howToRestore: string;
}

/**
 * 单个派生指标的降级评估结果（NS-6 主输出）。
 *
 * 由 assessDegrade 函数计算：输入被关闭的维度集合，输出该指标的当前置信度与降级行为。
 * 前端 DegradeBadge 直接消费本结构。
 *
 * @author fxbin
 */
export interface DegradeAssessment {
  /**
   * 派生指标 key
   */
  metricKey: string;
  /**
   * 仍然开启的依赖维度
   */
  retainedDimensions: string[];
  /**
   * 被关闭的依赖维度
   */
  disabledDimensions: string[];
  /**
   * 保留比 = retainedDimensions / requiredDimensions.length
   */
  retentionRatio: number;
  /**
   * 最终权衡置信度 [0,1]
   */
  confidence: number;
  /**
   * 三档降级行为
   */
  behavior: DegradeBehavior;
  /**
   * tooltip 三要素（按当前缺失维度动态填充后）
   */
  tooltip: {
    whatIsMissing: string;
    whyItMatters: string;
    howToRestore: string;
  };
}
