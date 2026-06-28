/**
 * 反虚荣准入六关评估（NS-4）。
 *
 * 实现圆桌 R3 共识：
 * - 反虚荣三检验：可造假性 / 可攀比性 / 可焦虑性
 * - 可解释性三硬约束：可追溯 / 可证伪 / 不可被简单优化
 *
 * 任何统计视图（含派生指标、聚合视图、推荐）在展示前必须过本门禁。
 * 不过六关 → 默认隐藏 + 用户主动查询入口。
 *
 * @author fxbin
 */

import type { StatisticsViewVisibility } from '@zhijing/shared';

export const ANTI_VANITY_THRESHOLD_PASS = 6;
export const ANTI_VANITY_THRESHOLD_WARN = 4;

/**
 * 单项检验结果
 */
export interface VanityCheckItem {
  key: 'fakable' | 'comparable' | 'anxiety' | 'traceable' | 'falsifiable' | 'ungameable';
  passed: boolean;
  reason: string;
}

/**
 * 评估输入：单个统计视图的元信息
 */
export interface VanityCheckInput {
  viewId: string;
  /**
   * 是否依赖用户行为痕迹（true 表示可被用户操作改变 → 可能有可造假性）
   */
  dependsOnBehaviorTrace: boolean;
  /**
   * 是否在多用户场景下展示（true 表示有可攀比性风险）
   */
  sharedAcrossUsers: boolean;
  /**
   * 是否引入对比/排序/排行（true 表示有可攀比性风险）
   */
  hasRankingOrComparison: boolean;
  /**
   * 是否强调数量/时长/连续天数（true 表示有可焦虑性风险）
   */
  emphasizesQuantity: boolean;
  /**
   * 是否能展示原始数据/明细（true 表示可追溯）
   */
  exposesRawData: boolean;
  /**
   * 是否可被用户操作/挑战/推翻结论（true 表示可证伪）
   */
  allowsUserChallenge: boolean;
  /**
   * 指标是否简单线性可优化（true 表示可被简单刷分）
   */
  isLinearlyOptimizable: boolean;
}

/**
 * 评估输出
 */
export interface VanityCheckResult {
  viewId: string;
  score: number;
  passed: boolean;
  visibility: StatisticsViewVisibility;
  items: VanityCheckItem[];
  failedKeys: string[];
}

export function evaluateAntiVanity(input: VanityCheckInput): VanityCheckResult {
  const items: VanityCheckItem[] = [
    {
      key: 'fakable',
      passed: !input.dependsOnBehaviorTrace,
      reason: input.dependsOnBehaviorTrace
        ? '依赖行为痕迹，刷量/无意义操作可改变结果（须配套防作弊）'
        : '不依赖行为痕迹，无法被用户操作改变',
    },
    {
      key: 'comparable',
      passed: !(input.sharedAcrossUsers && input.hasRankingOrComparison),
      reason: input.sharedAcrossUsers && input.hasRankingOrComparison
        ? '跨用户展示且含排序/对比，存在攀比诱因（须改为仅本人可见）'
        : !input.sharedAcrossUsers
          ? '不跨用户展示，无攀比诱因'
          : '虽跨用户但不排序/对比',
    },
    {
      key: 'anxiety',
      passed: !input.emphasizesQuantity,
      reason: input.emphasizesQuantity
        ? '强调数量/时长/连续天数，制造持续焦虑（须改为强调质量/覆盖）'
        : '不强调数量指标',
    },
    {
      key: 'traceable',
      passed: input.exposesRawData,
      reason: input.exposesRawData
        ? '暴露原始数据/明细，可点击下钻'
        : '不暴露原始数据，看不见指标从何而来',
    },
    {
      key: 'falsifiable',
      passed: input.allowsUserChallenge,
      reason: input.allowsUserChallenge
        ? '允许用户质疑/推翻结论（如标记错误、提交影响）'
        : '不允许用户挑战结论，神圣不可侵犯',
    },
    {
      key: 'ungameable',
      passed: !input.isLinearlyOptimizable,
      reason: input.isLinearlyOptimizable
        ? '指标可被简单线性刷分（须引入饱和函数或非线性）'
        : '指标非线性或引入饱和函数，不可简单刷分',
    },
  ];

  const score = items.filter((item) => item.passed).length;
  const failedKeys = items.filter((item) => !item.passed).map((item) => item.key);

  const passed = score >= ANTI_VANITY_THRESHOLD_PASS;
  let visibility: StatisticsViewVisibility;

  if (score === 6) {
    visibility = 'prominent';
  } else if (score >= 5) {
    visibility = 'visible';
  } else if (score >= ANTI_VANITY_THRESHOLD_WARN) {
    visibility = 'passive';
  } else {
    visibility = 'hidden';
  }

  return {
    viewId: input.viewId,
    score,
    passed,
    visibility,
    items,
    failedKeys,
  };
}

export function isAllowedToShow(result: VanityCheckResult): boolean {
  return result.visibility !== 'hidden';
}

export function summarizeFailedChecks(result: VanityCheckResult): string {
  if (result.passed) {
    return '全部六关通过';
  }
  return `未通过：${result.failedKeys.join('、')}（共 ${result.items.length - result.score} 项）`;
}
