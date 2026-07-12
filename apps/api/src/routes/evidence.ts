import type { FastifyInstance } from 'fastify';
import {
  generateEvidenceAudit,
  testHypothesis,
  answerWorkspaceQuestion,
  KnowledgeCoreError,
} from '@zhijing/core';

/**
 * 注册证据路由（证据审计、假设测试、知识库问答）。
 * @param app - Fastify 实例
 * @author fxbin
 */
export function registerEvidenceRoutes(app: FastifyInstance): void {
  app.get<{ Params: { id: string } }>('/api/workspaces/:id/evidence-audit', async (request, reply) => {
    try {
      return generateEvidenceAudit(request.params.id);
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'generate evidence audit failed');
      return reply.code(500).send({ error: 'Generate evidence audit failed.' });
    }
  });

  app.post<{ Params: { id: string }; Body: { hypothesis?: string } }>('/api/workspaces/:id/hypothesis-test', async (request, reply) => {
    const hypothesis = typeof request.body?.hypothesis === 'string' ? request.body.hypothesis.trim() : '';
    if (!hypothesis) {
      return reply.code(400).send({ error: 'Hypothesis is required.' });
    }
    try {
      return testHypothesis(request.params.id, hypothesis);
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'test hypothesis failed');
      return reply.code(500).send({ error: 'Test hypothesis failed.' });
    }
  });

  app.post<{ Params: { id: string }; Body: { question?: string } }>('/api/workspaces/:id/ask', async (request, reply) => {
    const question = typeof request.body?.question === 'string' ? request.body.question.trim() : '';
    if (!question) {
      return reply.code(400).send({ error: 'Question is required.' });
    }

    try {
      return await answerWorkspaceQuestion(request.params.id, question);
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'knowledge base ask failed');
      return reply.code(500).send({ error: 'Knowledge base ask failed.' });
    }
  });
}
