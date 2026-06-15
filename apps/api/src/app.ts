import cors from '@fastify/cors';
import Fastify from 'fastify';
import {
  getDashboard,
  getKnowledgeBaseAnalytics,
  getKnowledgeBase,
  getTask,
  intakeKnowledge,
  listKnowledgeBases,
} from '@zhijing/core';
import type { IntakeRequest } from '@zhijing/shared';

export function buildApi() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
    },
  });

  app.register(cors, {
    origin: true,
  });

  app.get('/health', async () => ({
    ok: true,
    service: 'zhijing-api',
    timestamp: new Date().toISOString(),
  }));

  app.get('/api/health', async () => ({
    ok: true,
    service: 'zhijing-api',
    timestamp: new Date().toISOString(),
  }));

  app.get('/api/dashboard', async () => getDashboard());

  app.get('/api/knowledge-bases', async () => ({
    knowledgeBases: listKnowledgeBases(),
  }));

  app.get<{ Params: { id: string } }>('/api/knowledge-bases/:id', async (request, reply) => {
    const base = getKnowledgeBase(request.params.id);
    if (!base) {
      return reply.code(404).send({ error: 'Knowledge base not found.' });
    }
    return base;
  });

  app.get<{ Params: { id: string } }>('/api/knowledge-bases/:id/analytics', async (request, reply) => {
    const analytics = await getKnowledgeBaseAnalytics(request.params.id);
    if (!analytics) {
      return reply.code(404).send({ error: 'Knowledge base not found.' });
    }
    return analytics;
  });

  app.get<{ Params: { id: string } }>('/api/tasks/:id', async (request, reply) => {
    const task = getTask(request.params.id);
    if (!task) {
      return reply.code(404).send({ error: 'Task not found.' });
    }
    return task;
  });

  app.post<{ Body: Partial<IntakeRequest> }>('/api/intake', async (request, reply) => {
    const input = typeof request.body?.input === 'string' ? request.body.input.trim() : '';
    if (!input) {
      return reply.code(400).send({ error: 'Input is required.' });
    }

    try {
      return intakeKnowledge({
        input,
        knowledgeBaseId: request.body.knowledgeBaseId,
      });
    } catch (error) {
      request.log.error({ error }, 'intake failed');
      return reply.code(500).send({ error: 'Intake failed.' });
    }
  });

  return app;
}
