import type { FastifyInstance } from 'fastify';
import {
  listWorkspaces,
  createEmptyWorkspace,
  updateWorkspaceMeta,
  deleteWorkspace,
  searchKnowledgeAssets,
  computeUserInterestProfile,
  generateDailyDigest,
  computeTopicCoverage,
  detectRepeatedThinking,
  recordReadingSession,
  recordCannotAnswerFeedback,
  computeRecallDecay,
  applyRecallDecay,
  generateAgentProposals,
  getWorkspace,
  getWorkspaceAnalytics,
  getWorkspacePath,
  buildOrchestratorDecision,
  KnowledgeCoreError,
} from '@zhijing/core';
import type {
  ReadingSessionRequest,
  CannotAnswerFeedbackRequest,
} from '@zhijing/shared';
import type { RouteContext } from '../common/route-context.js';
import { parseLimit } from '../common/parsers.js';

/**
 *注册工作区 CRUD 与全局知识特性路由。
 *
 * 包含：工作区列表/创建/更新/删除、全局搜索、兴趣画像、每日摘要、
 * 话题覆盖、重复思考、阅读会话、无法回答反馈、记忆衰减、agent 提议生成、
 * 工作区详情/分析/路径/编排决策。
 *
 * @param app - Fastify 实例
 * @param ctx - 路由共享上下文（daily-digest 路由使用 dailyDigestCache）
 * @author fxbin
 */
export function registerWorkspaceRoutes(app: FastifyInstance, ctx?: RouteContext): void {
  app.get('/api/workspaces', async () => ({
    workspaces: listWorkspaces(),
  }));

  app.post<{ Body: { title?: string; summary?: string } }>('/api/workspaces', async (request, reply) => {
    const title = request.body?.title;
    const summary = request.body?.summary;
    if (!title || !title.trim()) {
      return reply.status(400).send({ error: 'title 为必填。' });
    }
    try {
      const base = createEmptyWorkspace(title, summary);
      return { workspace: base };
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.status(error.statusCode).send({ error: error.message });
      }
      throw error;
    }
  });

  app.put<{
    Params: { id: string };
    Body: { title?: string; summary?: string };
  }>('/api/workspaces/:id', async (request, reply) => {
    const { title, summary } = request.body ?? {};
    if (title !== undefined && !title.trim()) {
      return reply.code(400).send({ error: '知识库标题不能为空。' });
    }
    try {
      const base = updateWorkspaceMeta(request.params.id, title, summary);
      if (!base) {
        return reply.code(404).send({ error: '知识库不存在。' });
      }
      return { workspace: base };
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'update knowledge base failed');
      return reply.code(500).send({ error: 'Update knowledge base failed.' });
    }
  });

  app.delete<{ Params: { id: string } }>('/api/workspaces/:id', async (request, reply) => {
    try {
      const ok = deleteWorkspace(request.params.id);
      if (!ok) {
        return reply.code(404).send({ error: '知识库不存在。' });
      }
      return { ok: true };
    } catch (error) {
      request.log.error({ error }, 'delete knowledge base failed');
      return reply.code(500).send({ error: 'Delete knowledge base failed.' });
    }
  });

  app.get<{
    Querystring: {
      q?: string;
      limit?: string;
    };
  }>('/api/search', async (request) => searchKnowledgeAssets({
    query: request.query.q,
    limit: parseLimit(request.query.limit),
  }));

  app.get<{ Querystring: { days?: string } }>('/api/interest-profile', async (request) => {
    const days = Math.max(1, Math.min(Number(request.query.days) || 7, 90));
    return computeUserInterestProfile(days);
  });

  app.get('/api/daily-digest', async () => {
    const today = new Date().toISOString().slice(0, 10);
    if (ctx?.dailyDigestCache && ctx.dailyDigestCache.date === today) {
      return ctx.dailyDigestCache.data;
    }
    return generateDailyDigest();
  });

  app.get('/api/topic-coverage', async () => computeTopicCoverage());

  app.get('/api/repeated-thinking', async () => detectRepeatedThinking());

  app.post<{ Body: Partial<ReadingSessionRequest> }>('/api/reading-sessions', async (request, reply) => {
    const body = request.body ?? {};
    const cardId = typeof body.cardId === 'string' ? body.cardId.trim() : '';
    const workspaceId = typeof body.workspaceId === 'string' ? body.workspaceId.trim() : undefined;
    const durationMs = typeof body.durationMs === 'number' ? body.durationMs : 0;
    if (!cardId) {
      return reply.code(400).send({ error: 'cardId 为必填。' });
    }
    return recordReadingSession({ cardId, workspaceId, durationMs });
  });

  app.post<{ Body: Partial<CannotAnswerFeedbackRequest> }>('/api/cannot-answer-feedback', async (request, reply) => {
    const body = request.body ?? {};
    const workspaceId = typeof body.workspaceId === 'string' ? body.workspaceId.trim() : undefined;
    const question = typeof body.question === 'string' ? body.question.trim() : '';
    if (!question) {
      return reply.code(400).send({ error: 'question 为必填。' });
    }
    return recordCannotAnswerFeedback({ workspaceId, question });
  });

  app.get('/api/recall-decay', async () => computeRecallDecay());

  app.post('/api/recall-decay/apply', async () => applyRecallDecay());

  app.get('/api/agent-proposals', async () => generateAgentProposals());

  app.get<{ Params: { id: string } }>('/api/workspaces/:id', async (request, reply) => {
    const detail = getWorkspace(request.params.id);
    if (!detail) {
      return reply.code(404).send({ error: 'Knowledge base not found.' });
    }
    return detail;
  });

  app.get<{ Params: { id: string } }>('/api/workspaces/:id/analytics', async (request, reply) => {
    const analytics = await getWorkspaceAnalytics(request.params.id);
    if (!analytics) {
      return reply.code(404).send({ error: 'Knowledge base not found.' });
    }
    return analytics;
  });

  app.get<{ Params: { id: string } }>('/api/workspaces/:id/path', async (request, reply) => {
    const path = getWorkspacePath(request.params.id);
    if (!path) {
      return reply.code(404).send({ error: 'Knowledge base not found.' });
    }
    return path;
  });

  app.get<{ Params: { id: string } }>('/api/workspaces/:id/orchestrator/decision', async (request, reply) => {
    const workspace = getWorkspace(request.params.id);
    if (!workspace) {
      return reply.code(404).send({ error: 'Knowledge base not found.' });
    }
    const decision = buildOrchestratorDecision(request.params.id);
    return { decision };
  });
}
