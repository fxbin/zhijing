import cors from '@fastify/cors';
import Fastify from 'fastify';
import {
  assignMaterialToKnowledgeBase,
  answerKnowledgeBaseQuestion,
  completeMaterialReview,
  deleteMaterial,
  editCardContent,
  getDashboard,
  recordExport,
  getKnowledgeBaseAnalytics,
  getKnowledgeBase,
  getKnowledgeMap,
  getTask,
  getModelProviderSettings,
  intakeKnowledge,
  KnowledgeCoreError,
  listDueCards,
  listExports,
  listMessages,
  listCardRevisions,
  recordCardReview,
  listKnowledgeBases,
  listMaterials,
  recordMaterialParsingFailure,
  requestMaterialParsing,
  runKnowledgeKit,
  saveModelProviderSettings,
  searchKnowledgeAssets,
  suggestMaterialAssignments,
  testModelProviderSettings,
} from '@zhijing/core';
import type {
  AssignMaterialRequest,
  CompleteMaterialReviewRequest,
  IntakeRequest,
  KnowledgeKitId,
  MaterialType,
  ParseStatus,
  RunKnowledgeKitRequest,
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
      q?: string;
      limit?: string;
    };
  }>('/api/search', async (request) => searchKnowledgeAssets({
    query: request.query.q,
    limit: parseLimit(request.query.limit),
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

  app.get<{ Params: { id: string }; Querystring: { limit?: string } }>('/api/knowledge-bases/:id/messages', async (request, reply) => {
    const limit = request.query.limit ? Number(request.query.limit) : undefined;
    const messages = await listMessages(request.params.id, limit);
    return { messages };
  });

  app.get<{ Params: { id: string }; Querystring: { limit?: string } }>('/api/knowledge-bases/:id/due-cards', async (request, reply) => {
    const limit = request.query.limit ? Number(request.query.limit) : undefined;
    const cards = await listDueCards(request.params.id, limit);
    return { cards };
  });

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

  app.get<{ Params: { id: string } }>('/api/knowledge-bases/:id/exports', async (request, reply) => {
    const exports = await listExports(request.params.id);
    return { exports };
  });

  app.post<{ Params: { id: string }; Body: { format?: string; scope?: string; includeArtifacts?: boolean; filename?: string; materialCount?: number; cardCount?: number; artifactCount?: number } }>('/api/knowledge-bases/:id/exports', async (request, reply) => {
    const body = request.body ?? {};
    const format = body.format;
    if (format !== 'markdown' && format !== 'json' && format !== 'pdf') {
      return reply.status(400).send({ error: 'format must be one of markdown/json/pdf' });
    }
    const scope = body.scope;
    if (scope !== 'all' && scope !== 'materials' && scope !== 'cards') {
      return reply.status(400).send({ error: 'scope must be one of all/materials/cards' });
    }
    const filename = typeof body.filename === 'string' && body.filename.trim().length > 0 ? body.filename.trim() : `export.${format === 'markdown' ? 'md' : format}`;
    const record = await recordExport(request.params.id, {
      format,
      scope,
      includeArtifacts: Boolean(body.includeArtifacts),
      filename,
      materialCount: Number.isFinite(body.materialCount) ? Math.max(0, body.materialCount ?? 0) : 0,
      cardCount: Number.isFinite(body.cardCount) ? Math.max(0, body.cardCount ?? 0) : 0,
      artifactCount: Number.isFinite(body.artifactCount) ? Math.max(0, body.artifactCount ?? 0) : 0,
    });
    return { export: record };
  });

  app.get<{ Params: { id: string } }>('/api/knowledge-bases/:id/map', async (request, reply) => {
    const map = getKnowledgeMap(request.params.id);
    if (!map) {
      return reply.code(404).send({ error: 'Knowledge base not found.' });
    }
    return map;
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

  app.post<{ Params: { id: string }; Body: Partial<RunKnowledgeKitRequest> }>('/api/knowledge-bases/:id/kits/run', async (request, reply) => {
    try {
      return await runKnowledgeKit(
        request.params.id,
        parseKitId(request.body?.kitId),
      );
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'knowledge kit run failed');
      return reply.code(500).send({ error: 'Knowledge kit run failed.' });
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

  app.post<{ Params: { id: string }; Body: Partial<AssignMaterialRequest> }>('/api/materials/:id/assign', async (request, reply) => {
    try {
      return assignMaterialToKnowledgeBase(request.params.id, {
        knowledgeBaseId: typeof request.body?.knowledgeBaseId === 'string' ? request.body.knowledgeBaseId.trim() : undefined,
        newKnowledgeBaseTitle: typeof request.body?.newKnowledgeBaseTitle === 'string' ? request.body.newKnowledgeBaseTitle.trim() : undefined,
      });
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'material assignment failed');
      return reply.code(500).send({ error: 'Material assignment failed.' });
    }
  });

  app.get<{ Params: { id: string } }>('/api/materials/:id/assignment-suggestions', async (request, reply) => {
    try {
      return suggestMaterialAssignments(request.params.id);
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'material assignment suggestions failed');
      return reply.code(500).send({ error: 'Material assignment suggestions failed.' });
    }
  });

  app.post<{ Params: { id: string }; Body: Partial<CompleteMaterialReviewRequest> }>('/api/materials/:id/review', async (request, reply) => {
    try {
      return await completeMaterialReview(request.params.id, {
        title: typeof request.body?.title === 'string' ? request.body.title : undefined,
        contentText: typeof request.body?.contentText === 'string' ? request.body.contentText : undefined,
        mediaUrls: Array.isArray(request.body?.mediaUrls)
          ? request.body.mediaUrls.filter((item): item is string => typeof item === 'string')
          : undefined,
        markIngested: request.body?.markIngested === true,
      });
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'material manual review failed');
      return reply.code(500).send({ error: 'Material manual review failed.' });
    }
  });

  app.delete<{ Params: { id: string } }>('/api/materials/:id', async (request, reply) => {
    try {
      return deleteMaterial(request.params.id);
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'material delete failed');
      return reply.code(500).send({ error: 'Material delete failed.' });
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
const knowledgeKitIds = new Set<KnowledgeKitId>(['learning_research', 'content_creation', 'product_research']);

function parseMaterialType(value: string | undefined) {
  return value && materialTypes.has(value as MaterialType) ? value as MaterialType : undefined;
}

function parseStatus(value: string | undefined) {
  return value && parseStatuses.has(value as ParseStatus) ? value as ParseStatus : undefined;
}

function parseKitId(value: string | undefined) {
  return value && knowledgeKitIds.has(value as KnowledgeKitId) ? value as KnowledgeKitId : 'learning_research';
}

function parseLimit(value: string | undefined) {
  if (!value) return 120;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 120;
  return Math.max(1, Math.min(parsed, 300));
}
