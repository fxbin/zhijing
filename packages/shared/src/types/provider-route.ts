/**
 * Provider 路由与成本追踪类型。
 *
 * 包含 Provider 路由角色、路由配置、解析结果、Agent 调用成本记录与查询、
 * 成本聚合与对比、以及路由建议评分与建议结果。
 *
 * @author fxbin
 */

import type { AgentTaskType } from './agent-stream.js';

/**
 * Provider 路由角色。
 *
 * - primary：主力 Provider，承载大部分任务（知径当前为 DeepSeek）
 * - complementary：互补 Provider，仅在 primary 存在短板的特定场景启用
 *
 * @author fxbin
 */
export type ProviderRole = 'primary' | 'complementary';

/**
 * Provider 路由配置项。
 *
 * 描述某个 Provider/Model 组合承担哪些任务类型、承担角色、选择理由，
 * 以及该 Provider 不可用时的 fallback。
 *
 * - provider / model：LLM Provider 与模型 id（string，避免 shared 包依赖 pi-ai）
 * - role：主力或互补
 * - taskTypes：该路由承担的任务类型列表
 * - reason：选择理由，用于审计与 dashboard 展示
 * - fallbackProvider / fallbackModel：该 Provider 不可用时的回退
 *
 * @author fxbin
 */
export interface ProviderRoute {
  provider: string;
  model: string;
  role: ProviderRole;
  taskTypes: AgentTaskType[];
  reason: string;
  fallbackProvider?: string;
  fallbackModel?: string;
}

/**
 * 路由解析结果。
 *
 * routeProvider(taskType) 返回此结构，包含命中的路由与最终生效的 Provider/Model。
 * 当命中 complementary 路由但其 Provider 不可用时，resolved 会回退到 fallback。
 *
 * - route：命中的原始路由配置
 * - resolvedProvider / resolvedModel：最终生效的 Provider/Model（可能为 fallback）
 * - fellBack：是否发生了 fallback
 *
 * @author fxbin
 */
export interface RouteResolution {
  route: ProviderRoute;
  resolvedProvider: string;
  resolvedModel: string;
  resolvedBaseUrl?: string;
  fellBack: boolean;
}

/**
 * Agent LLM 调用成本记录。
 *
 * 每次 completeStructured / streamText / runToolCalling 调用产生一条记录，
 * 用于成本追踪 dashboard 与智能路由策略优化（P2.3）。
 *
 * - workspaceId：工作区 id；对话路径可能为 null（全局调用）
 * - taskType：任务类型，与 AgentTaskType 对齐
 * - provider / model：实际生效的 Provider/Model（含 fallback 后的值）
 * - role：Provider 角色（primary / complementary）
 * - inputTokens / outputTokens / costUsd：token 用量与成本
 * - ok：调用是否成功；false 时 errorMessage 含错误信息
 * - startedAt / durationMs：调用开始时间与耗时
 *
 * @author fxbin
 */
export interface AgentUsageRecord {
  id: string;
  workspaceId: string | null;
  taskType: AgentTaskType;
  provider: string;
  model: string;
  role: ProviderRole;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
  ok: boolean;
  errorMessage: string | null;
  startedAt: string;
  durationMs: number;
}

/**
 * 成本追踪查询过滤条件。
 *
 * - workspaceId：按工作区过滤；省略时查全部
 * - taskType：按任务类型过滤
 * - provider：按 Provider 过滤
 * - since / until：时间范围（ISO 字符串）
 * - limit：返回条数上限
 *
 * @author fxbin
 */
export interface AgentUsageQuery {
  workspaceId?: string;
  taskType?: AgentTaskType;
  provider?: string;
  since?: string;
  until?: string;
  limit?: number;
}

/**
 * 成本追踪聚合结果。
 *
 * 用于 dashboard 展示，按 taskType / provider / role 拆分。
 *
 * @author fxbin
 */
export interface AgentUsageSummary {
  totalCount: number;
  totalCostUsd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  byTaskType: Array<{ taskType: AgentTaskType; count: number; costUsd: number }>;
  byProvider: Array<{ provider: string; count: number; costUsd: number }>;
}

/**
 * Provider 成本对比单项。
 *
 * 用于 P2.3 智能路由策略优化，对比各 Provider 的成功率、平均成本与平均耗时，
 * 辅助判断互补 Provider 是否值得启用。
 *
 * @author fxbin
 */
export interface AgentUsageComparisonItem {
  provider: string;
  totalCalls: number;
  successCount: number;
  failedCount: number;
  successRate: number;
  totalCostUsd: number;
  avgCostUsd: number;
  avgDurationMs: number;
}

/**
 * Provider 成本对比结果。
 *
 * @author fxbin
 */
export interface AgentUsageComparison {
  items: AgentUsageComparisonItem[];
}

/**
 * 路由建议单项评分。
 *
 * 对单个 (taskType, provider) 组合的综合评分，基于 agent_usage 历史数据计算。
 * 评分公式：综合评分 = 成功率 × W_SUCCESS + 速度分 × W_SPEED - 成本分 × W_COST
 * 各权重常量定义在 pi-runtime/advisor.ts 中，默认成功率优先。
 *
 * - samples 不足 MIN_SAMPLES 时返回 score=null，调用方应跳过该候选
 * - 速度分 = avgDurationMs > 0 ? 1 / avgDurationMs : 0（归一化到 0~1）
 * - 成本分 = avgCostUsd（直接相减，成本越低评分越高）
 *
 * @author fxbin
 */
export interface RouteAdvisorScore {
  taskType: AgentTaskType;
  provider: string;
  model: string;
  totalCalls: number;
  successRate: number;
  avgDurationMs: number;
  avgCostUsd: number;
  /** 综合评分；样本不足时为 null */
  score: number | null;
  /** 评分计算使用的权重快照，供透明化展示 */
  weights: { success: number; speed: number; cost: number };
}

/**
 * 路由建议单项结果。
 *
 * 对单个 taskType 给出评分对比 + 建议的 primary provider。
 * 建议仅当存在 score 非 null 的候选时才有效；否则保留 DEFAULT_ROUTES。
 *
 * @author fxbin
 */
export interface RouteAdvisorItem {
  taskType: AgentTaskType;
  /** 所有候选的评分明细（含当前路由 provider 与其他可用 provider） */
  scores: RouteAdvisorScore[];
  /** 建议的 primary provider；无有效候选时为 null */
  suggestedProvider: string | null;
  /** 建议的 model；与 suggestedProvider 配对 */
  suggestedModel: string | null;
  /** 建议理由，供透明化展示与 decision_log 记录 */
  reason: string;
  /** 当前 DEFAULT_ROUTES 中该 taskType 的 primary provider，用于对比 */
  currentProvider: string;
  /** 建议是否与当前路由不同 */
  changed: boolean;
}

/**
 * 路由建议聚合结果。
 *
 * 由 buildRouteAdvisor 对所有 taskType 评分后聚合返回，
 * 供 API 层透明化展示与运维决策参考。
 * 本结果仅作为建议，不会自动覆盖 ACTIVE_ROUTES。
 *
 * @author fxbin
 */
export interface RouteAdvisorResult {
  /** 评分权重快照 */
  weights: { success: number; speed: number; cost: number };
  /** 最小样本数阈值，低于此值的候选不参与建议 */
  minSamples: number;
  /** 各 taskType 的建议明细 */
  items: RouteAdvisorItem[];
  /** 建议发生变更的 taskType 数量（changed=true 的项数） */
  changedCount: number;
  /** 参与评分的 agent_usage 样本总数 */
  totalSamples: number;
}
