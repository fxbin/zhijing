import type { FastifyInstance } from 'fastify';
import {
  listAllCards,
  acceptProposedCards,
  applyProposedOperations,
  recordCardReview,
  editCardContent,
  listCardRevisions,
  archiveCard,
  unarchiveCard,
  deleteCard,
  KnowledgeCoreError,
} from '@zhijing/core';
import type {
  KnowledgeCard,
  AcceptProposedCardsRequest,
  AcceptProposalBatchRequest,
} from '@zhijing/shared';

/**
 * 注册知识卡片路由（列表、审阅、编辑、归档、删除、提议接受）。
 * @param app - Fastify 实例
 * @author fxbin
 */
export function registerCardRoutes(app: FastifyInstance): void {
  app.get<{
    Querystring: { workspaceId?: string; type?: string; claimStatus?: string; query?: string; limit?: string };
  }>('/api/cards', async (request) => {
    const { workspaceId, type, claimStatus, query, limit } = request.query;
    return listAllCards({
      workspaceId: workspaceId || undefined,
      type: type as KnowledgeCard['type'] | undefined,
      claimStatus: claimStatus as KnowledgeCard['claimStatus'] | undefined,
      query: query ?? undefined,
      limit: limit ? Number(limit) : undefined,
    });
  });

  app.post<{ Params: { id: string }; Body: AcceptProposedCardsRequest }>(
    '/api/messages/:id/accept-cards',
    async (request, reply) => {
      const messageId = request.params.id;
      const selectedIndices = request.body?.selectedIndices;
      try {
        const result = acceptProposedCards(messageId, selectedIndices);
        return result;
      } catch (error) {
        if (error instanceof KnowledgeCoreError) {
          return reply.code(error.statusCode).send({ error: error.message });
        }
        request.log.error({ error, messageId }, 'accept proposed cards failed');
        return reply.code(500).send({ error: 'Accept proposed cards failed.' });
      }
    },
  );

  app.post<{ Params: { id: string }; Body: AcceptProposalBatchRequest }>(
    '/api/workspaces/:id/proposal-batches/accept',
    async (request, reply) => {
      const workspaceId = request.params.id;
      const operations = Array.isArray(request.body?.operations) ? request.body.operations : [];
      const selectedIndices = request.body?.selectedIndices;
      try {
        const result = applyProposedOperations(workspaceId, operations, selectedIndices);
        return result;
      } catch (error) {
        if (error instanceof KnowledgeCoreError) {
          return reply.code(error.statusCode).send({ error: error.message });
        }
        request.log.error({ error, workspaceId }, 'apply proposed operations failed');
        return reply.code(500).send({ error: 'Apply proposed operations failed.' });
      }
    },
  );

  app.post<{ Params: { id: string }; Body: { grade?: string } }>('/api/cards/:id/review', async (request, reply) => {
    const grade = request.body.grade;
    if (grade !== 'again' && grade !== 'hard' && grade !== 'good' && grade !== 'easy') {
      return reply.status(400).send({ error: 'grade must be one of again/hard/good/easy' });
    }
    const card = await recordCardReview(request.params.id, grade);
    if (!card) {
      return reply.status(404).send({ error: 'card not found' });
    }
    return { card };
  });

  app.patch<{ Params: { id: string }; Body: { title?: string; body?: string; type?: string; claimStatus?: string } }>('/api/cards/:id', async (request, reply) => {
    const body = request.body ?? {};
    const allowedTypes = ['concept', 'method', 'case', 'question', 'step', 'viewpoint'];
    const allowedClaims = ['ai_skeleton', 'sourced', 'user_confirmed', 'unsupported'];
    const type = typeof body.type === 'string' && allowedTypes.includes(body.type) ? body.type : undefined;
    const claimStatus = typeof body.claimStatus === 'string' && allowedClaims.includes(body.claimStatus) ? body.claimStatus : undefined;
    const result = await editCardContent(request.params.id, {
      title: typeof body.title === 'string' ? body.title : undefined,
      body: typeof body.body === 'string' ? body.body : undefined,
      type: type as never,
      claimStatus: claimStatus as never,
    });
    if (!result) {
      return reply.status(404).send({ error: 'card not found' });
    }
    return { card: result.card, revision: result.revision };
  });

  app.get<{ Params: { id: string } }>('/api/cards/:id/revisions', async (request, reply) => {
    const revisions = await listCardRevisions(request.params.id);
    return { revisions };
  });

  app.post<{ Params: { id: string } }>('/api/cards/:id/archive', async (request, reply) => {
    try {
      return archiveCard(request.params.id);
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'card archive failed');
      return reply.code(500).send({ error: 'Card archive failed.' });
    }
  });

  app.post<{ Params: { id: string } }>('/api/cards/:id/unarchive', async (request, reply) => {
    try {
      return unarchiveCard(request.params.id);
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'card unarchive failed');
      return reply.code(500).send({ error: 'Card unarchive failed.' });
    }
  });

  app.delete<{ Params: { id: string } }>('/api/cards/:id', async (request, reply) => {
    try {
      return deleteCard(request.params.id);
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'card delete failed');
      return reply.code(500).send({ error: 'Card delete failed.' });
    }
  });
}
