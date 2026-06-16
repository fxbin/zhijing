import cors from '@fastify/cors';
import Fastify from 'fastify';
import {
  answerKnowledgeBaseQuestion,
  getDashboard,
  getKnowledgeBaseAnalytics,
  getKnowledgeBase,
  getTask,
  getModelProviderSettings,
  intakeKnowledge,
  KnowledgeCoreError,
  listKnowledgeBases,
  listMaterials,
  recordMaterialParsingFailure,
  requestMaterialParsing,
  saveModelProviderSettings,
  testModelProviderSettings,
} from '@zhijing/core';
import type {
  IntakeRequest,
  MaterialType,
  ParseStatus,
  SaveModelProviderSettingsRequest,
  TestModelProviderSettingsRequest,
} from '@zhijing/shared';

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

  app.get('/api/settings/model-provider', async () => getModelProviderSettings());

  app.put<{ Body: Partial<SaveModelProviderSettingsRequest> }>('/api/settings/model-provider', async (request, reply) => {
    const provider = typeof request.body?.provider === 'string' ? request.body.provider.trim() : '';
    const model = typeof request.body?.model === 'string' ? request.body.model.trim() : '';
    if (!provider || !model) {
      return reply.code(400).send({ error: 'Provider and model are required.' });
    }

    try {
      return saveModelProviderSettings({
        provider,
        model,
        apiKey: typeof request.body?.apiKey === 'string' ? request.body.apiKey : undefined,
        enabled: typeof request.body?.enabled === 'boolean' ? request.body.enabled : undefined,
        fallbackToMock: typeof request.body?.fallbackToMock === 'boolean' ? request.body.fallbackToMock : undefined,
        clearApiKey: request.body?.clearApiKey === true,
      });
    } catch (error) {
      request.log.error({ error }, 'model provider settings save failed');
      return reply.code(500).send({ error: 'Model provider settings save failed.' });
    }
  });

  app.post<{ Body: Partial<TestModelProviderSettingsRequest> }>('/api/settings/model-provider/test', async (request) => testModelProviderSettings({
    provider: typeof request.body?.provider === 'string' ? request.body.provider.trim() : undefined,
    model: typeof request.body?.model === 'string' ? request.body.model.trim() : undefined,
    apiKey: typeof request.body?.apiKey === 'string' ? request.body.apiKey : undefined,
  }));

  app.get('/api/knowledge-bases', async () => ({
    knowledgeBases: listKnowledgeBases(),
  }));

  app.get<{
    Querystring: {
      type?: string;
      status?: string;
      q?: string;
      limit?: string;
    };
  }>('/api/materials', async (request) => ({
    materials: listMaterials({
      type: parseMaterialType(request.query.type),
      status: parseStatus(request.query.status),
      query: request.query.q,
      limit: parseLimit(request.query.limit),
    }),
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

  app.post<{ Params: { id: string }; Body: { question?: string } }>('/api/knowledge-bases/:id/ask', async (request, reply) => {
    const question = typeof request.body?.question === 'string' ? request.body.question.trim() : '';
    if (!question) {
      return reply.code(400).send({ error: 'Question is required.' });
    }

    try {
      return await answerKnowledgeBaseQuestion(request.params.id, question);
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'knowledge base ask failed');
      return reply.code(500).send({ error: 'Knowledge base ask failed.' });
    }
  });

  app.get<{ Params: { id: string } }>('/api/tasks/:id', async (request, reply) => {
    const task = getTask(request.params.id);
    if (!task) {
      return reply.code(404).send({ error: 'Task not found.' });
    }
    return task;
  });

  app.post<{ Params: { id: string } }>('/api/materials/:id/parse', async (request, reply) => {
    try {
      return await requestMaterialParsing(request.params.id);
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'material parse queue failed');
      return reply.code(500).send({ error: 'Material parse queue failed.' });
    }
  });

  app.post<{ Params: { id: string }; Body: { taskId?: string; error?: string } }>('/api/materials/:id/parse/failure', async (request, reply) => {
    try {
      return recordMaterialParsingFailure(
        request.params.id,
        typeof request.body?.error === 'string' ? request.body.error : 'Material parsing failed.',
        typeof request.body?.taskId === 'string' ? request.body.taskId : undefined,
      );
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'material parse failure report failed');
      return reply.code(500).send({ error: 'Material parse failure report failed.' });
    }
  });

  app.post<{ Body: Partial<IntakeRequest> }>('/api/intake', async (request, reply) => {
    const input = typeof request.body?.input === 'string' ? request.body.input.trim() : '';
    if (!input) {
      return reply.code(400).send({ error: 'Input is required.' });
    }

    try {
      return await intakeKnowledge({
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

const materialTypes = new Set<MaterialType>(['link', 'text', 'question', 'topic']);
const parseStatuses = new Set<ParseStatus>(['saved', 'parsing', 'needs_review', 'ingested', 'failed']);

function parseMaterialType(value: string | undefined) {
  return value && materialTypes.has(value as MaterialType) ? value as MaterialType : undefined;
}

function parseStatus(value: string | undefined) {
  return value && parseStatuses.has(value as ParseStatus) ? value as ParseStatus : undefined;
}

function parseLimit(value: string | undefined) {
  if (!value) return 120;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 120;
  return Math.max(1, Math.min(parsed, 300));
}
