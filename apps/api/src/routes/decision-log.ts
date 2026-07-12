import type { FastifyInstance } from 'fastify';
import {
  listDecisionLogRecords,
  createDecisionLogRecord,
  findDecisionLogRecord,
  deleteDecisionLogRecord,
} from '@zhijing/core';
import type { DecisionLogQuery } from '@zhijing/core';
import type {
  DecisionLogKind,
  CreateDecisionLogRequest,
  AgentTaskType,
} from '@zhijing/shared';
import {
  DECISION_LOG_KIND_VALUES,
  AGENT_TASK_TYPE_VALUES,
} from '@zhijing/shared';
import {
  DECISION_LOG_KIND_SET,
  AGENT_TASK_TYPE_SET,
} from '../common/parsers.js';

/**
 * 注册决策日志路由（列表、创建、查询、删除）。
 * @param app - Fastify 实例
 * @author fxbin
 */
export function registerDecisionLogRoutes(app: FastifyInstance): void {
  app.get<{
    Querystring: {
      kind?: string;
      workspaceId?: string;
      agentTaskType?: string;
      since?: string;
      until?: string;
      limit?: string;
    };
  }>('/api/decision-log', async (request, reply) => {
    const query = request.query;
    if (query.kind !== undefined && !DECISION_LOG_KIND_SET.has(query.kind)) {
      return reply.code(400).send({ error: `Invalid kind. Allowed: ${DECISION_LOG_KIND_VALUES.join(', ')}` });
    }
    if (query.agentTaskType !== undefined && !AGENT_TASK_TYPE_SET.has(query.agentTaskType)) {
      return reply.code(400).send({ error: `Invalid agentTaskType. Allowed: ${AGENT_TASK_TYPE_VALUES.join(', ')}` });
    }
    const limit = query.limit !== undefined ? Number(query.limit) : undefined;
    if (limit !== undefined && (!Number.isFinite(limit) || limit <= 0)) {
      return reply.code(400).send({ error: 'Invalid limit. Must be a positive number.' });
    }
    const logQuery: DecisionLogQuery = {
      kind: query.kind as DecisionLogKind | undefined,
      workspaceId: query.workspaceId,
      agentTaskType: query.agentTaskType as AgentTaskType | undefined,
      since: query.since,
      until: query.until,
      limit,
    };
    return { records: listDecisionLogRecords(logQuery) };
  });

  app.post<{
    Body: CreateDecisionLogRequest;
  }>('/api/decision-log', async (request, reply) => {
    const body = request.body;
    if (!body || typeof body !== 'object') {
      return reply.code(400).send({ error: 'Request body is required.' });
    }
    if (body.kind !== undefined && !DECISION_LOG_KIND_SET.has(body.kind)) {
      return reply.code(400).send({ error: `Invalid kind. Allowed: ${DECISION_LOG_KIND_VALUES.join(', ')}` });
    }
    if (body.agentTaskType !== undefined && !AGENT_TASK_TYPE_SET.has(body.agentTaskType)) {
      return reply.code(400).send({ error: `Invalid agentTaskType. Allowed: ${AGENT_TASK_TYPE_VALUES.join(', ')}` });
    }
    try {
      const record = createDecisionLogRecord(body);
      return reply.code(201).send(record);
    } catch (error) {
      return reply.code(400).send({ error: error instanceof Error ? error.message : 'Failed to create decision log.' });
    }
  });

  app.get<{ Params: { id: string } }>('/api/decision-log/:id', async (request, reply) => {
    const record = findDecisionLogRecord(request.params.id);
    if (!record) {
      return reply.code(404).send({ error: 'Decision log not found.' });
    }
    return record;
  });

  app.delete<{ Params: { id: string } }>('/api/decision-log/:id', async (request, reply) => {
    const ok = deleteDecisionLogRecord(request.params.id);
    if (!ok) {
      return reply.code(404).send({ error: 'Decision log not found.' });
    }
    return reply.code(204).send();
  });
}
