import type { FastifyInstance } from 'fastify';
import {
  getDashboard,
  getGlobalInsights,
  getConstructionProgress,
  listSkeletonCards,
  generateSocraticQuestions,
  generateRelatedSuggestions,
  listAttentionSignals,
  KnowledgeCoreError,
} from '@zhijing/core';
import type { SocraticTrigger } from '@zhijing/shared';
import { SOCRATIC_TRIGGER_SET } from '../common/parsers.js';

/**
 * 注册仪表盘与洞察路由（dashboard、insights、进度、socratic、建议、注意力）。
 * @param app - Fastify 实例
 * @author fxbin
 */
export function registerDashboardRoutes(app: FastifyInstance): void {
  app.get<{ Querystring: { workspaceId?: string } }>('/api/dashboard', async (request) => {
    const kbId = typeof request.query.workspaceId === 'string' && request.query.workspaceId.trim()
      ? request.query.workspaceId.trim()
      : undefined;
    return getDashboard(kbId);
  });

  app.get<{ Querystring: { workspaceId?: string } }>('/api/insights', async (request) => {
    const workspaceId = request.query.workspaceId?.trim() || undefined;
    return getGlobalInsights(workspaceId);
  });

  app.get<{ Params: { workspaceId: string } }>(
    '/api/workspaces/:workspaceId/construction-progress',
    async (request, reply) => {
      const progress = getConstructionProgress(request.params.workspaceId);
      if (!progress) {
        return reply.code(404).send({ error: 'Knowledge base not found or has no cards.' });
      }
      return progress;
    },
  );

  app.get<{ Params: { workspaceId: string } }>(
    '/api/workspaces/:workspaceId/skeleton-cards',
    async (request) => listSkeletonCards(request.params.workspaceId),
  );

  app.post<{
    Params: { workspaceId: string };
    Body: { cardId?: string; tensionKey?: string; trigger?: string };
  }>('/api/workspaces/:workspaceId/socratic-questions', async (request, reply) => {
    const triggerRaw = typeof request.body?.trigger === 'string' ? request.body.trigger.trim() : '';
    const trigger: SocraticTrigger | undefined = triggerRaw
      ? (SOCRATIC_TRIGGER_SET.has(triggerRaw) ? (triggerRaw as SocraticTrigger) : undefined)
      : undefined;
    if (triggerRaw && !trigger) {
      return reply.code(400).send({ error: 'trigger 必须是 skeleton_card、semantic_tension 或 manual 之一。' });
    }
    try {
      const result = await generateSocraticQuestions(request.params.workspaceId, {
        cardId: typeof request.body?.cardId === 'string' ? request.body.cardId.trim() : undefined,
        tensionKey: typeof request.body?.tensionKey === 'string' ? request.body.tensionKey.trim() : undefined,
        trigger,
      });
      return result;
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'generate socratic questions failed');
      return reply.code(500).send({ error: 'Generate socratic questions failed.' });
    }
  });

  app.get<{ Params: { workspaceId: string }; Querystring: { currentCardId?: string } }>(
    '/api/workspaces/:workspaceId/related-suggestions',
    async (request, reply) => {
      try {
        const currentCardId = typeof request.query.currentCardId === 'string' && request.query.currentCardId.trim()
          ? request.query.currentCardId.trim()
          : undefined;
        return generateRelatedSuggestions(request.params.workspaceId, currentCardId);
      } catch (error) {
        if (error instanceof KnowledgeCoreError) {
          return reply.code(error.statusCode).send({ error: error.message });
        }
        request.log.error({ error }, 'generate related suggestions failed');
        return reply.code(500).send({ error: 'Generate related suggestions failed.' });
      }
    },
  );

  app.get<{ Params: { workspaceId: string }; Querystring: { limit?: string } }>(
    '/api/workspaces/:workspaceId/attention-signals',
    async (request) => {
      const limitRaw = typeof request.query.limit === 'string' ? request.query.limit.trim() : '';
      const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      return { signals: listAttentionSignals(request.params.workspaceId, limit) };
    },
  );
}
