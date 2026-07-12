/**
 * 统计可见性与数据账本类型。
 *
 * 包含统计视图可见性等级、数据隐私等级、数据账本条目与账本结构。
 * 落实"反虚荣规范"与"用户数据四权"（知情/导出/删除/关闭）。
 *
 * @author fxbin
 */

/**
 * 统计视图可见性等级（反虚荣规范 NS-4）。
 * - hidden 默认隐藏，用户主动查询才展示
 * - passive 被动展示，但不在显眼位置
 * - visible 正常展示
 * - prominent 显著展示（仅对真正对用户决策有用的核心指标开放）
 * @author fxbin
 */
export const STATISTICS_VIEW_VISIBILITY_VALUES = ['hidden', 'passive', 'visible', 'prominent'] as const;
export type StatisticsViewVisibility = typeof STATISTICS_VIEW_VISIBILITY_VALUES[number];

/**
 * 数据隐私等级（反虚荣规范 NS-4 + 用户数据四权）。
 * - public_local 仅本地可见，不参与任何对外聚合
 * - private_only 仅本人可见（默认）
 * - shared_explicit 用户明确同意后参与聚合
 * - disabled 完全关闭采集（受用户关闭权保护）
 * @author fxbin
 */
export const STATISTICS_PRIVACY_TIER_VALUES = ['public_local', 'private_only', 'shared_explicit', 'disabled'] as const;
export type StatisticsPrivacyTier = typeof STATISTICS_PRIVACY_TIER_VALUES[number];

/**
 * 数据账本单项（用户数据四权：知情/导出/删除/关闭）。
 * 每个数据账本单项对应一个原始采集维度（如划线、笔记、重读、停留），
 * 用户可独立控制每个单项的隐私等级。
 * @author fxbin
 */
export interface DataAccountEntry {
  key: string;
  label: string;
  tier: StatisticsPrivacyTier;
  /**
   * 派生指标依赖声明：该项被关闭时影响哪些派生指标
   * 用于降级矩阵（NS-6）的反向查询
   */
  dependentMetrics: string[];
  /**
   * 是否允许导出（数据可携 NS-8 的一部分）
   */
  exportable: boolean;
  updatedAt: string;
}

export interface DataAccountBook {
  entries: DataAccountEntry[];
  /**
   * 全局极简模式（NS-4）：一键关闭所有统计采集
   * 开启后所有 entries 的 tier 强制设为 disabled
   */
  minimalMode: boolean;
  updatedAt: string;
}
