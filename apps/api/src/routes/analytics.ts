import type { FastifyInstance } from 'fastify';
import {
  listAgentUsageRecords,
  summarizeAgentUsageRecords,
  compareAgentUsageRecords,
  listAgentActionLogs,
  computeEvidenceFeedback,
  extractRejectedFeatures,
  EVIDENCE_ACTION_ACCEPT_PROPOSED_CARDS,
  DEFAULT_REJECTED_FEATURES_LIMIT,
  KnowledgeCoreError,
} from '@zhijing/core';
import {
  getActiveRoutes,
  isRoutesOverriddenByEnv,
  buildRouteAdvisor,
} from '@zhijing/pi-runtime';
import type {
  AgentUsageQuery,
  AgentTaskType,
  EvidenceFeedback,
  RejectedCardFeature,
  RouteAdvisorResult,
} from '@zhijing/shared';
import { AGENT_TASK_TYPE_VALUES } from '@zhijing/shared';
import {
  AGENT_TASK_TYPE_SET,
} from '../common/parsers.js';
import {
  AGENT_USAGE_DEFAULT_LIMIT,
  AGENT_USAGE_MAX_LIMIT,
} from '../common/statistics-gate.js';

/**
 * 注册分析路由（agent 使用记录、路由建议、evidence 飞轮反馈）。
 * @param app - Fastify 实例
 * @author fxbin
 */
export function registerAnalyticsRoutes(app: FastifyInstance): void {
  app.get<{
    Querystring: {
      workspaceId?: string;
      taskType?: string;
      provider?: string;
      since?: string;
      until?: string;
      limit?: string;
      view?: string;
    };
  }>('/api/analytics/agent-usage', async (request, reply) => {
    const query = request.query;
    if (query.taskType !== undefined && !AGENT_TASK_TYPE_SET.has(query.taskType)) {
      return reply.code(400).send({ error: `Invalid taskType. Allowed: ${AGENT_TASK_TYPE_VALUES.join(', ')}` });
    }
    const limitRaw = query.limit !== undefined ? Number(query.limit) : AGENT_USAGE_DEFAULT_LIMIT;
    if (!Number.isFinite(limitRaw) || limitRaw <= 0) {
      return reply.code(400).send({ error: 'Invalid limit. Must be a positive number.' });
    }
    const limit = Math.min(Math.floor(limitRaw), AGENT_USAGE_MAX_LIMIT);
    const usageQuery: AgentUsageQuery = {
      workspaceId: query.workspaceId,
      taskType: query.taskType as AgentTaskType | undefined,
      provider: query.provider,
      since: query.since,
      until: query.until,
      limit,
    };
    if (query.view === 'summary') {
      return { summary: summarizeAgentUsageRecords(usageQuery) };
    }
    return { records: listAgentUsageRecords(usageQuery) };
  });

  app.get('/api/analytics/agent-usage/routes', async () => {
    return {
      routes: getActiveRoutes(),
      overriddenByEnv: isRoutesOverriddenByEnv(),
    };
  });

  app.get<{
    Querystring: {
      workspaceId?: string;
      taskType?: string;
      provider?: string;
      since?: string;
      until?: string;
    };
  }>('/api/analytics/agent-usage/compare', async (request, reply) => {
    const query = request.query;
    if (query.taskType !== undefined && !AGENT_TASK_TYPE_SET.has(query.taskType)) {
      return reply.code(400).send({ error: `Invalid taskType. Allowed: ${AGENT_TASK_TYPE_VALUES.join(', ')}` });
    }
    const usageQuery: AgentUsageQuery = {
      workspaceId: query.workspaceId,
      taskType: query.taskType as AgentTaskType | undefined,
      provider: query.provider,
      since: query.since,
      until: query.until,
    };
    return { comparison: compareAgentUsageRecords(usageQuery) };
  });

  /**
   * 路由建议（Route Advisor）查询。
   *
   * 基于 agent_usage 历史数据计算各 taskType 的 provider 综合评分，
   * 给出 primary provider 的建议（仅建议，不自动生效）。
   * 运维通过 ZHIJING_PI_ROUTES_JSON 环境变量手动采纳建议。
   */
  app.get<{
    Querystring: {
      taskType?: string;
      provider?: string;
      since?: string;
      until?: string;
    };
  }>('/api/analytics/agent-usage/advisor', async (request, reply) => {
    const query = request.query;
    if (query.taskType !== undefined && !AGENT_TASK_TYPE_SET.has(query.taskType)) {
      return reply.code(400).send({ error: `Invalid taskType. Allowed: ${AGENT_TASK_TYPE_VALUES.join(', ')}` });
    }
    const usageQuery: AgentUsageQuery = {
      taskType: query.taskType as AgentTaskType | undefined,
      provider: query.provider,
      since: query.since,
      until: query.until,
    };
    const comparison = compareAgentUsageRecords(usageQuery);
    const currentRoutes = getActiveRoutes();
    const advisor: RouteAdvisorResult = buildRouteAdvisor(comparison.items, currentRoutes);
    return {
      advisor,
      currentRoutes,
      overriddenByEnv: isRoutesOverriddenByEnv(),
    };
  });

  /**
   * Evidence 飞轮反馈查询。
   *
   * 返回 accept_rate 聚合与被拒绝提议卡片特征（negative example），
   * 供前端洞察视图展示"镜子不保姆"可测量指标。
   */
  app.get<{
    Querystring: {
      workspaceId?: string;
      limit?: string;
    };
  }>('/api/analytics/evidence', async (request) => {
    const workspaceId = typeof request.query.workspaceId === 'string' && request.query.workspaceId.trim()
      ? request.query.workspaceId.trim()
      : undefined;
    const limitRaw = typeof request.query.limit === 'string' ? request.query.limit.trim() : '';
    const featuresLimit = limitRaw ? Number.parseInt(limitRaw, 10) : DEFAULT_REJECTED_FEATURES_LIMIT;
    const logsResult = listAgentActionLogs({
      workspaceId,
      action: EVIDENCE_ACTION_ACCEPT_PROPOSED_CARDS,
    });
    const evidence: EvidenceFeedback = computeEvidenceFeedback(logsResult.logs);
    const rejectedFeatures: RejectedCardFeature[] = extractRejectedFeatures(logsResult.logs, featuresLimit);
    return { evidence, rejectedFeatures };
  });
}
