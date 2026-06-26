/**
 * 决策日志纯逻辑层。
 *
 * 承载 decision_log 表的过滤与查询逻辑，避免 core/index.ts 继续膨胀。
 * 参照 agent-usage.ts / user-memory.ts 的拆分模式。
 *
 * @module core/decision-log
 * @author fxbin
 */

import type {
  DecisionLog,
  DecisionLogKind,
  AgentTaskType,
  CreateDecisionLogRequest,
} from '@zhijing/shared';

/**
 * 决策日志查询条件。
 *
 * @author fxbin
 */
export interface DecisionLogQuery {
  kind?: DecisionLogKind;
  workspaceId?: string;
  agentTaskType?: AgentTaskType;
  since?: string;
  until?: string;
  limit?: number;
}

/**
 * 决策日志 Repository 接口。
 *
 * @author fxbin
 */
export interface DecisionLogRepository {
  insertDecisionLog(record: DecisionLog): void;
  findDecisionLog(id: string): DecisionLog | undefined;
  listDecisionLog(query: DecisionLogQuery): DecisionLog[];
  deleteDecisionLog(id: string): boolean;
}

/**
 * 默认查询上限。
 */
const DEFAULT_QUERY_LIMIT = 200;

/**
 * 构建决策日志过滤函数（纯逻辑，无副作用）。
 *
 * @param query - 查询条件
 * @returns 过滤函数
 * @author fxbin
 */
export function buildDecisionLogFilter(query: DecisionLogQuery): (record: DecisionLog) => boolean {
  return (record) => {
    if (query.kind !== undefined && record.kind !== query.kind) return false;
    if (query.agentTaskType !== undefined && record.agentTaskType !== query.agentTaskType) return false;
    if (query.workspaceId !== undefined) {
      if (query.workspaceId === 'global') {
        if (record.workspaceId !== undefined && record.workspaceId !== null) return false;
      } else if (record.workspaceId !== query.workspaceId) {
        return false;
      }
    }
    if (query.since !== undefined && record.createdAt < query.since) return false;
    if (query.until !== undefined && record.createdAt > query.until) return false;
    return true;
  };
}

/**
 * 应用查询限制（纯逻辑）。
 *
 * @param records - 已过滤的记录数组
 * @param query - 查询条件
 * @returns 截取后的记录数组
 * @author fxbin
 */
export function applyDecisionLogLimit(records: DecisionLog[], query: DecisionLogQuery): DecisionLog[] {
  const limit = query.limit ?? DEFAULT_QUERY_LIMIT;
  return records.slice(0, limit);
}

/**
 * 校验创建决策日志请求的必填字段（纯逻辑）。
 *
 * 落实"知识输出必须带证据"原则：evidenceCardIds 字段必须存在（即使为空数组），
 * 调用方需显式声明证据链。
 *
 * @param request - 创建请求
 * @returns 错误信息；通过返回 undefined
 * @author fxbin
 */
export function validateCreateDecisionLogRequest(request: CreateDecisionLogRequest): string | undefined {
  if (!request.summary || request.summary.trim().length === 0) {
    return 'summary is required';
  }
  if (!request.reasoning || request.reasoning.trim().length === 0) {
    return 'reasoning is required';
  }
  return undefined;
}

export { DEFAULT_QUERY_LIMIT };
