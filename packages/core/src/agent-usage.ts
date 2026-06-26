import type { AgentUsageRecord, AgentUsageQuery, AgentUsageSummary, AgentUsageComparison, AgentUsageComparisonItem, AgentTaskType } from '@zhijing/shared';

/**
 * Agent 调用成本记录器。
 *
 * 由数据层实现，每次 LLM 调用后写入一条 AgentUsageRecord。
 * InstrumentedPiRuntime 通过此接口记录成本。
 *
 * @author fxbin
 */
export interface AgentUsageRecorder {
  recordUsage(record: AgentUsageRecord): void;
}

/**
 * Agent 调用成本查询器。
 *
 * 由数据层实现，供 dashboard API 调用。
 *
 * @author fxbin
 */
export interface AgentUsageReader {
  listAgentUsage(query: AgentUsageQuery): AgentUsageRecord[];
  summarizeAgentUsage(query: AgentUsageQuery): AgentUsageSummary;
}

/**
 * Agent 调用成本 Repository，合并记录与查询能力。
 *
 * @author fxbin
 */
export type AgentUsageRepository = AgentUsageRecorder & AgentUsageReader;

/**
 * 默认查询返回条数上限，避免一次性返回过多记录。
 */
const DEFAULT_QUERY_LIMIT = 100;

/**
 * 从查询条件构建过滤谓词（用于内存存储实现）。
 *
 * @param query - 查询条件
 * @returns 谓词函数，true 表示记录匹配
 * @author fxbin
 */
export function buildUsageFilter(query: AgentUsageQuery): (record: AgentUsageRecord) => boolean {
  return (record) => {
    if (query.workspaceId !== undefined && record.workspaceId !== query.workspaceId) return false;
    if (query.taskType !== undefined && record.taskType !== query.taskType) return false;
    if (query.provider !== undefined && record.provider !== query.provider) return false;
    if (query.since !== undefined && record.startedAt < query.since) return false;
    if (query.until !== undefined && record.startedAt > query.until) return false;
    return true;
  };
}

/**
 * 从记录数组构建聚合摘要（纯逻辑，无副作用）。
 *
 * 按 taskType 和 provider 分组聚合 count 与 costUsd，
 * 用于 dashboard 展示。
 *
 * @param records - 已过滤的记录数组
 * @returns 聚合摘要
 * @author fxbin
 */
export function buildUsageSummary(records: AgentUsageRecord[]): AgentUsageSummary {
  const totalCount = records.length;
  let totalCostUsd = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  const byTaskTypeMap = new Map<AgentTaskType, { count: number; costUsd: number }>();
  const byProviderMap = new Map<string, { count: number; costUsd: number }>();

  for (const record of records) {
    totalCostUsd += record.costUsd ?? 0;
    totalInputTokens += record.inputTokens ?? 0;
    totalOutputTokens += record.outputTokens ?? 0;

    const taskEntry = byTaskTypeMap.get(record.taskType) ?? { count: 0, costUsd: 0 };
    taskEntry.count += 1;
    taskEntry.costUsd += record.costUsd ?? 0;
    byTaskTypeMap.set(record.taskType, taskEntry);

    const providerEntry = byProviderMap.get(record.provider) ?? { count: 0, costUsd: 0 };
    providerEntry.count += 1;
    providerEntry.costUsd += record.costUsd ?? 0;
    byProviderMap.set(record.provider, providerEntry);
  }

  return {
    totalCount,
    totalCostUsd,
    totalInputTokens,
    totalOutputTokens,
    byTaskType: Array.from(byTaskTypeMap.entries()).map(([taskType, entry]) => ({ taskType, ...entry })),
    byProvider: Array.from(byProviderMap.entries()).map(([provider, entry]) => ({ provider, ...entry })),
  };
}

/**
 * 应用查询限制，截取前 N 条记录。
 *
 * @param records - 已过滤的记录数组
 * @param query - 查询条件（使用 limit 字段）
 * @returns 截取后的记录数组
 * @author fxbin
 */
export function applyQueryLimit(records: AgentUsageRecord[], query: AgentUsageQuery): AgentUsageRecord[] {
  const limit = query.limit ?? DEFAULT_QUERY_LIMIT;
  return records.slice(0, limit);
}

/**
 * 从记录数组构建 Provider 成本对比（纯逻辑，无副作用）。
 *
 * 按 provider 分组聚合：总调用数、成功/失败数、成功率、总成本、平均成本、平均耗时。
 * 用于 P2.3 智能路由策略优化，辅助判断互补 Provider 是否值得启用。
 *
 * @param records - 已过滤的记录数组
 * @returns Provider 成本对比结果
 * @author fxbin
 */
export function buildUsageComparison(records: AgentUsageRecord[]): AgentUsageComparison {
  const byProviderMap = new Map<string, {
    totalCalls: number;
    successCount: number;
    failedCount: number;
    totalCostUsd: number;
    totalDurationMs: number;
  }>();

  for (const record of records) {
    const entry = byProviderMap.get(record.provider) ?? {
      totalCalls: 0,
      successCount: 0,
      failedCount: 0,
      totalCostUsd: 0,
      totalDurationMs: 0,
    };
    entry.totalCalls += 1;
    if (record.ok) {
      entry.successCount += 1;
    } else {
      entry.failedCount += 1;
    }
    entry.totalCostUsd += record.costUsd ?? 0;
    entry.totalDurationMs += record.durationMs ?? 0;
    byProviderMap.set(record.provider, entry);
  }

  const items: AgentUsageComparisonItem[] = Array.from(byProviderMap.entries()).map(([provider, entry]) => ({
    provider,
    totalCalls: entry.totalCalls,
    successCount: entry.successCount,
    failedCount: entry.failedCount,
    successRate: entry.totalCalls > 0 ? entry.successCount / entry.totalCalls : 0,
    totalCostUsd: entry.totalCostUsd,
    avgCostUsd: entry.totalCalls > 0 ? entry.totalCostUsd / entry.totalCalls : 0,
    avgDurationMs: entry.totalCalls > 0 ? entry.totalDurationMs / entry.totalCalls : 0,
  }));

  items.sort((a, b) => b.totalCalls - a.totalCalls);

  return { items };
}

export { DEFAULT_QUERY_LIMIT };
