/**
 * 路由建议引擎（Route Advisor）。
 *
 * 基于 agent_usage 历史数据计算各 (taskType, provider) 组合的综合评分，
 * 给出 primary provider 的建议，供运维通过 ZHIJING_PI_ROUTES_JSON 手动采纳。
 *
 * 评分公式：综合评分 = 成功率 × W_SUCCESS + 速度分 × W_SPEED - 成本分 × W_COST
 * 默认权重：成功率优先（W_SUCCESS=0.6, W_SPEED=0.3, W_COST=0.1）
 * - 速度分 = avgDurationMs > 0 ? 1 / avgDurationMs : 0（归一化到 0~1）
 * - 成本分 = avgCostUsd（直接相减，成本越低评分越高）
 *
 * 安全护栏：
 * - 样本数 < MIN_SAMPLES 的候选不参与建议（score=null）
 * - 建议仅对 primary 生效，不动 complementary 的 fallback
 * - 无有效候选时保留 DEFAULT_ROUTES（suggestedProvider=null, changed=false）
 *
 * 本模块为纯逻辑层，不读取数据库、不读写环境变量，所有数据由调用方注入。
 *
 * @module pi-runtime/advisor
 * @author fxbin
 */

import type {
  AgentTaskType,
  AgentUsageComparisonItem,
  ProviderRoute,
  RouteAdvisorItem,
  RouteAdvisorResult,
  RouteAdvisorScore,
} from '@zhijing/shared';

/**
 * 评分权重：成功率。
 */
export const ADVISOR_WEIGHT_SUCCESS = 0.6;

/**
 * 评分权重：速度。
 */
export const ADVISOR_WEIGHT_SPEED = 0.3;

/**
 * 评分权重：成本。
 */
export const ADVISOR_WEIGHT_COST = 0.1;

/**
 * 最小样本数阈值：低于此值的候选不参与建议。
 */
export const ADVISOR_MIN_SAMPLES = 5;

/**
 * advisor 权重快照，供评分结果回传给调用方做透明化展示。
 */
export const ADVISOR_WEIGHTS = {
  success: ADVISOR_WEIGHT_SUCCESS,
  speed: ADVISOR_WEIGHT_SPEED,
  cost: ADVISOR_WEIGHT_COST,
} as const;

/**
 * 候选 provider 的来源类型。
 */
interface ProviderCandidate {
  provider: string;
  model: string;
}

/**
 * 计算单个 (taskType, provider) 组合的综合评分。
 *
 * 样本不足时返回 null，调用方应跳过该候选。
 *
 * @param item - Provider 成本对比单项
 * @param taskType - 任务类型
 * @returns 评分对象；样本不足时 score 为 null
 * @author fxbin
 */
export function scoreRouteCandidate(
  item: AgentUsageComparisonItem,
  taskType: AgentTaskType,
): RouteAdvisorScore {
  const totalCalls = item.totalCalls;
  const score = totalCalls >= ADVISOR_MIN_SAMPLES
    ? item.successRate * ADVISOR_WEIGHT_SUCCESS
      + (item.avgDurationMs > 0 ? 1 / item.avgDurationMs : 0) * ADVISOR_WEIGHT_SPEED
      - item.avgCostUsd * ADVISOR_WEIGHT_COST
    : null;
  return {
    taskType,
    provider: item.provider,
    model: '',
    totalCalls,
    successRate: item.successRate,
    avgDurationMs: item.avgDurationMs,
    avgCostUsd: item.avgCostUsd,
    score,
    weights: { ...ADVISOR_WEIGHTS },
  };
}

/**
 * 从 DEFAULT_ROUTES 中查找指定 taskType 的 primary provider。
 *
 * @param routes - 路由表
 * @param taskType - 任务类型
 * @returns primary 路由；未找到时返回 undefined
 * @author fxbin
 */
export function findCurrentPrimaryRoute(
  routes: ProviderRoute[],
  taskType: AgentTaskType,
): ProviderRoute | undefined {
  return routes.find((route) => route.role === 'primary' && route.taskTypes.includes(taskType));
}

/**
 * 收集所有 taskType 的候选 provider 列表。
 *
 * 候选来源：
 * 1. DEFAULT_ROUTES 中已为该 taskType 配置的 primary provider
 * 2. comparison 中所有出现过该 taskType 调用记录的 provider
 *
 * @param routes - 当前路由表
 * @param comparison - Provider 成本对比
 * @returns taskType -> 候选 provider 列表 的映射
 * @author fxbin
 */
export function collectCandidates(
  routes: ProviderRoute[],
  comparison: AgentUsageComparisonItem[],
): Map<AgentTaskType, ProviderCandidate[]> {
  const taskTypes = collectAllTaskTypes(routes);
  const candidates = new Map<AgentTaskType, ProviderCandidate[]>();
  for (const taskType of taskTypes) {
    const list: ProviderCandidate[] = [];
    const currentPrimary = findCurrentPrimaryRoute(routes, taskType);
    if (currentPrimary) {
      list.push({ provider: currentPrimary.provider, model: currentPrimary.model });
    }
    for (const item of comparison) {
      if (!list.some((c) => c.provider === item.provider)) {
        list.push({ provider: item.provider, model: '' });
      }
    }
    candidates.set(taskType, list);
  }
  return candidates;
}

/**
 * 收集路由表中出现的所有 taskType。
 *
 * @param routes - 路由表
 * @returns 去重后的 taskType 数组
 * @author fxbin
 */
function collectAllTaskTypes(routes: ProviderRoute[]): AgentTaskType[] {
  const set = new Set<AgentTaskType>();
  for (const route of routes) {
    for (const taskType of route.taskTypes) {
      set.add(taskType);
    }
  }
  return [...set];
}

/**
 * 为单个 taskType 构建 advisor 明细。
 *
 * 评分所有候选，选出 score 最高的作为建议。
 * 若最高分候选与当前 primary 相同，changed=false；否则 changed=true。
 * 若无有效候选（所有 score 均为 null），suggestedProvider=null, changed=false。
 *
 * @param taskType - 任务类型
 * @param candidates - 候选 provider 列表
 * @param comparison - Provider 成本对比
 * @param currentRoutes - 当前路由表
 * @returns advisor 明细
 * @author fxbin
 */
export function buildAdvisorItem(
  taskType: AgentTaskType,
  candidates: ProviderCandidate[],
  comparison: AgentUsageComparisonItem[],
  currentRoutes: ProviderRoute[],
): RouteAdvisorItem {
  const scores: RouteAdvisorScore[] = candidates.map((candidate) => {
    const comparisonItem = comparison.find((item) => item.provider === candidate.provider);
    const baseScore = comparisonItem
      ? scoreRouteCandidate(comparisonItem, taskType)
      : null;
    if (!baseScore) {
      return {
        taskType,
        provider: candidate.provider,
        model: candidate.model,
        totalCalls: 0,
        successRate: 0,
        avgDurationMs: 0,
        avgCostUsd: 0,
        score: null,
        weights: { ...ADVISOR_WEIGHTS },
      };
    }
    return { ...baseScore, model: candidate.model || baseScore.model };
  });

  const currentPrimary = findCurrentPrimaryRoute(currentRoutes, taskType);
  const currentProvider = currentPrimary?.provider ?? '';
  const validScores = scores.filter((s) => s.score !== null) as (RouteAdvisorScore & { score: number })[];
  validScores.sort((a, b) => (b.score as number) - (a.score as number));

  if (validScores.length === 0) {
    return {
      taskType,
      scores,
      suggestedProvider: null,
      suggestedModel: null,
      reason: '无足够样本的候选 provider，保留当前路由',
      currentProvider,
      changed: false,
    };
  }

  const best = validScores[0];
  const changed = best.provider !== currentProvider;
  const reason = changed
    ? `建议从 ${currentProvider} 切换到 ${best.provider}（评分 ${best.score.toFixed(4)} > 当前 ${currentProvider}）`
    : `维持 ${currentProvider}（评分 ${best.score.toFixed(4)}）`;

  return {
    taskType,
    scores,
    suggestedProvider: best.provider,
    suggestedModel: best.model || null,
    reason,
    currentProvider,
    changed,
  };
}

/**
 * 构建路由建议聚合结果。
 *
 * 对所有 taskType 评分后聚合，供 API 层透明化展示。
 * 本结果仅作为建议，不会自动覆盖 ACTIVE_ROUTES。
 *
 * @param comparison - Provider 成本对比数据
 * @param currentRoutes - 当前生效路由表
 * @returns 聚合建议结果
 * @author fxbin
 */
export function buildRouteAdvisor(
  comparison: AgentUsageComparisonItem[],
  currentRoutes: ProviderRoute[],
): RouteAdvisorResult {
  const candidatesMap = collectCandidates(currentRoutes, comparison);
  const items: RouteAdvisorItem[] = [];
  let totalSamples = 0;
  for (const comparisonItem of comparison) {
    totalSamples += comparisonItem.totalCalls;
  }

  for (const [taskType, candidates] of candidatesMap) {
    const item = buildAdvisorItem(taskType, candidates, comparison, currentRoutes);
    items.push(item);
  }

  const changedCount = items.filter((item) => item.changed).length;

  return {
    weights: { ...ADVISOR_WEIGHTS },
    minSamples: ADVISOR_MIN_SAMPLES,
    items,
    changedCount,
    totalSamples,
  };
}
