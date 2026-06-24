import cors from '@fastify/cors';
import cron from 'node-cron';
import Fastify from 'fastify';
import {
  archiveCard,
  archiveMaterial,
  assignMaterialToKnowledgeBase,
  answerKnowledgeBaseQuestion,
  clearFilter,
  createEmptyKnowledgeBase,
  completeMaterialReview,
  createModelProviderProfile,
  deleteMaterial,
  deleteModelProviderProfile,
  deleteKnowledgeBase,
  describeCloudBackupStatus,
  editArtifactSection,
  editCardContent,
  extractEntities,
  generateCrossKbSynthesis,
  generateEvidenceAudit,
  generateSocraticQuestions,
  generateRelatedSuggestions,
  getDashboard,
  getTranscriptionCapabilityReport,
  getGlobalInsights,
  getConstructionProgress,
  listSkeletonCards,
  getKnowledgeBasePath,
  getModelProviderSettings,
  getModelProviderSettingsV2,
  getWeReadSettings,
  getWeReadShelf,
  importWeReadBook,
  syncWeReadShelf,
  readWeReadBookMetaList,
  readWeReadSyncState,
  computeWeReadStats,
  computeWeReadRecommendations,
  previewWeReadBook,
  loadFilter,
  recordExport,
  getKnowledgeBaseAnalytics,
  getKnowledgeBase,
  getKnowledgeMap,
  getKnowledgeBaseNodePositions,
  saveKnowledgeBaseNodePositions,
  addMapEdge,
  removeMapEdge,
  getTask,
  initializeArtifactSections,
  intakeKnowledge,
  KnowledgeCoreError,
  listArchivedItems,
  listArtifactRevisions,
  listConflictAuditEntries,
  listConflictGroups,
  listDueCards,
  listEntities,
  listExports,
  listMessages,
  listModelProviderProfiles,
  listCardRevisions,
  listAttentionSignals,
  computeUserInterestProfile,
  generateDailyDigest,
  computeTopicCoverage,
  detectRepeatedThinking,
  recordReadingSession,
  recordCannotAnswerFeedback,
  computeRecallDecay,
  applyRecallDecay,
  generateAgentProposals,
  acceptProposedCards,
  listAgentActionLogs,
  listInspectTables,
  inspectQuery,
  activateModelProviderProfile,
  recordCardReview,
  listKnowledgeBases,
  listMaterials,
  recordMaterialParsingFailure,
  requestMaterialParsing,
  resolveConflictGroup,
  runKnowledgeKit,
  saveFilter,
  saveModelProviderSettings,
  saveWeReadSettings,
  searchKnowledgeAssets,
  suggestMaterialAssignments,
  testHypothesis,
  testModelProviderSettings,
  testWeReadConnection,
  unarchiveCard,
  unarchiveMaterial,
  updateKnowledgeBaseMeta,
  updateModelProviderProfile,
} from '@zhijing/core';
import type {
  AddMapEdgeRequest,
  AssignMaterialRequest,
  CompleteMaterialReviewRequest,
  CreateModelProviderProfileRequest,
  IntakeAudience,
  IntakeDepth,
  IntakeRequest,
  IntakeScope,
  KnowledgeKitId,
  MaterialType,
  ParseStatus,
  RunKnowledgeKitRequest,
  SaveKnowledgeMapNodePositionsRequest,
  SaveModelProviderSettingsRequest,
  SocraticTrigger,
  TestModelProviderSettingsRequest,
  ReadingSessionRequest,
  CannotAnswerFeedbackRequest,
  AcceptProposedCardsRequest,
  UpdateModelProviderProfileRequest,
} from '@zhijing/shared';
import {
  INTAKE_AUDIENCE_VALUES,
  INTAKE_DEPTH_VALUES,
  INTAKE_SCOPE_VALUES,
} from '@zhijing/shared';

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

const INTAKE_AUDIENCE_SET = new Set<string>(INTAKE_AUDIENCE_VALUES);
const INTAKE_DEPTH_SET = new Set<string>(INTAKE_DEPTH_VALUES);
const INTAKE_SCOPE_SET = new Set<string>(INTAKE_SCOPE_VALUES);

const SOCRATIC_TRIGGER_VALUES: readonly SocraticTrigger[] = ['skeleton_card', 'semantic_tension', 'manual'];
const SOCRATIC_TRIGGER_SET = new Set<string>(SOCRATIC_TRIGGER_VALUES);

function resolveAllowedOrigins(): string[] {
  const raw = process.env.ZHIJING_ALLOWED_ORIGINS;
  if (!raw) return DEFAULT_ALLOWED_ORIGINS;
  const origins = raw.split(',').map((item) => item.trim()).filter(Boolean);
  return origins.length > 0 ? origins : DEFAULT_ALLOWED_ORIGINS;
}

export function buildApi() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
    },
  });

  app.register(cors, {
    origin: resolveAllowedOrigins(),
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

  app.get<{ Querystring: { knowledgeBaseId?: string } }>('/api/dashboard', async (request) => {
    const kbId = typeof request.query.knowledgeBaseId === 'string' && request.query.knowledgeBaseId.trim()
      ? request.query.knowledgeBaseId.trim()
      : undefined;
    return getDashboard(kbId);
  });

  app.get('/api/insights', async () => getGlobalInsights());

  app.get<{ Params: { knowledgeBaseId: string } }>(
    '/api/knowledge-bases/:knowledgeBaseId/construction-progress',
    async (request, reply) => {
      const progress = getConstructionProgress(request.params.knowledgeBaseId);
      if (!progress) {
        return reply.code(404).send({ error: 'Knowledge base not found or has no cards.' });
      }
      return progress;
    },
  );

  app.get<{ Params: { knowledgeBaseId: string } }>(
    '/api/knowledge-bases/:knowledgeBaseId/skeleton-cards',
    async (request) => listSkeletonCards(request.params.knowledgeBaseId),
  );

  app.post<{
    Params: { knowledgeBaseId: string };
    Body: { cardId?: string; tensionKey?: string; trigger?: string };
  }>('/api/knowledge-bases/:knowledgeBaseId/socratic-questions', async (request, reply) => {
    const triggerRaw = typeof request.body?.trigger === 'string' ? request.body.trigger.trim() : '';
    const trigger: SocraticTrigger | undefined = triggerRaw
      ? (SOCRATIC_TRIGGER_SET.has(triggerRaw) ? (triggerRaw as SocraticTrigger) : undefined)
      : undefined;
    if (triggerRaw && !trigger) {
      return reply.code(400).send({ error: 'trigger 必须是 skeleton_card、semantic_tension 或 manual 之一。' });
    }
    try {
      const result = await generateSocraticQuestions(request.params.knowledgeBaseId, {
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

  app.get<{ Params: { knowledgeBaseId: string }; Querystring: { currentCardId?: string } }>(
    '/api/knowledge-bases/:knowledgeBaseId/related-suggestions',
    async (request, reply) => {
      try {
        const currentCardId = typeof request.query.currentCardId === 'string' && request.query.currentCardId.trim()
          ? request.query.currentCardId.trim()
          : undefined;
        return generateRelatedSuggestions(request.params.knowledgeBaseId, currentCardId);
      } catch (error) {
        if (error instanceof KnowledgeCoreError) {
          return reply.code(error.statusCode).send({ error: error.message });
        }
        request.log.error({ error }, 'generate related suggestions failed');
        return reply.code(500).send({ error: 'Generate related suggestions failed.' });
      }
    },
  );

  app.get<{ Params: { knowledgeBaseId: string }; Querystring: { limit?: string } }>(
    '/api/knowledge-bases/:knowledgeBaseId/attention-signals',
    async (request) => {
      const limitRaw = typeof request.query.limit === 'string' ? request.query.limit.trim() : '';
      const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      return { signals: listAttentionSignals(request.params.knowledgeBaseId, limit) };
    },
  );

  app.get<{ Querystring: { knowledgeBaseId?: string; action?: string; limit?: string } }>(
    '/api/agent-action-logs',
    async (request) => {
      const knowledgeBaseId = typeof request.query.knowledgeBaseId === 'string' && request.query.knowledgeBaseId.trim()
        ? request.query.knowledgeBaseId.trim()
        : undefined;
      const action = typeof request.query.action === 'string' && request.query.action.trim()
        ? request.query.action.trim()
        : undefined;
      const limitRaw = typeof request.query.limit === 'string' ? request.query.limit.trim() : '';
      const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      return listAgentActionLogs({ knowledgeBaseId, action, limit });
    },
  );

  app.get('/api/inspect/tables', async () => ({ tables: listInspectTables() }));

  app.post<{ Body: { sql?: string; limit?: number } }>('/api/inspect/query', async (request, reply) => {
    const sql = typeof request.body?.sql === 'string' ? request.body.sql.trim() : '';
    if (!sql) {
      return reply.code(400).send({ error: 'sql 为必填。' });
    }
    const limit = typeof request.body?.limit === 'number' ? request.body.limit : undefined;
    try {
      const rows = inspectQuery(sql, limit);
      return { rows, count: rows.length };
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'inspect query failed');
      return reply.code(500).send({ error: 'Inspect query failed.' });
    }
  });

  app.get<{ Querystring: { url?: string } }>('/api/proxy-image', async (request, reply) => {
    const imageUrl = request.query.url;
    if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) {
      return reply.code(400).send({ error: 'Invalid image URL.' });
    }
    try {
      const isDouyinImage = imageUrl.includes('douyinpic.com') || imageUrl.includes('byteimg.com');
      const response = await fetch(imageUrl, {
        headers: {
          Referer: isDouyinImage ? 'https://www.douyin.com/' : '',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });
      if (!response.ok) {
        return reply.code(response.status).send({ error: 'Image fetch failed.' });
      }
      const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
      const arrayBuffer = await response.arrayBuffer();
      return reply
        .header('Content-Type', contentType)
        .header('Cache-Control', 'public, max-age=3600')
        .send(Buffer.from(arrayBuffer));
    } catch (error) {
      request.log.error({ error, imageUrl }, 'proxy image failed');
      return reply.code(502).send({ error: 'Image proxy failed.' });
    }
  });

  app.get<{ Querystring: { url?: string } }>('/api/proxy-video', async (request, reply) => {
    const videoUrl = request.query.url;
    if (!videoUrl || !/^https?:\/\//i.test(videoUrl)) {
      return reply.code(400).send({ error: 'Invalid video URL.' });
    }
    try {
      const isDouyinVideo = videoUrl.includes('douyinvod') || videoUrl.includes('bytecdn');
      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      };
      if (isDouyinVideo) {
        headers['Referer'] = 'https://www.douyin.com/';
      }
      const range = request.headers.range;
      if (range) {
        headers['Range'] = range;
      }
      const response = await fetch(videoUrl, { headers });
      if (!response.ok && response.status !== 206) {
        return reply.code(response.status).send({ error: 'Video fetch failed.' });
      }
      const contentType = response.headers.get('content-type') ?? 'video/mp4';
      const arrayBuffer = await response.arrayBuffer();
      const replyHeaders: Record<string, string> = {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'Accept-Ranges': 'bytes',
      };
      const contentRange = response.headers.get('content-range');
      if (contentRange) {
        replyHeaders['Content-Range'] = contentRange;
      }
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        replyHeaders['Content-Length'] = contentLength;
      }
      return reply
        .code(response.status === 206 ? 206 : 200)
        .headers(replyHeaders)
        .send(Buffer.from(arrayBuffer));
    } catch (error) {
      request.log.error({ error, videoUrl }, 'proxy video failed');
      return reply.code(502).send({ error: 'Video proxy failed.' });
    }
  });

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

  app.get('/api/settings/model-provider/v2', async () => getModelProviderSettingsV2());

  app.get('/api/settings/model-provider/profiles', async () => ({
    profiles: listModelProviderProfiles(),
  }));

  app.post<{ Body: Partial<CreateModelProviderProfileRequest> }>('/api/settings/model-provider/profiles', async (request, reply) => {
    const name = typeof request.body?.name === 'string' ? request.body.name.trim() : '';
    const provider = typeof request.body?.provider === 'string' ? request.body.provider.trim() : '';
    const model = typeof request.body?.model === 'string' ? request.body.model.trim() : '';
    if (!name || !provider || !model) {
      return reply.code(400).send({ error: 'name、provider、model 均为必填。' });
    }
    try {
      const profile = createModelProviderProfile({
        name,
        provider,
        model,
        apiKey: typeof request.body?.apiKey === 'string' ? request.body.apiKey : undefined,
        enabled: typeof request.body?.enabled === 'boolean' ? request.body.enabled : undefined,
        fallbackToMock: typeof request.body?.fallbackToMock === 'boolean' ? request.body.fallbackToMock : undefined,
        isDefault: request.body?.isDefault === true,
      });
      return { profile };
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'model provider profile create failed');
      return reply.code(500).send({ error: 'Model provider profile create failed.' });
    }
  });

  app.patch<{ Params: { id: string }; Body: Partial<UpdateModelProviderProfileRequest> }>('/api/settings/model-provider/profiles/:id', async (request, reply) => {
    try {
      const profile = updateModelProviderProfile(request.params.id, {
        name: typeof request.body?.name === 'string' ? request.body.name : undefined,
        provider: typeof request.body?.provider === 'string' ? request.body.provider : undefined,
        model: typeof request.body?.model === 'string' ? request.body.model : undefined,
        apiKey: typeof request.body?.apiKey === 'string' ? request.body.apiKey : undefined,
        enabled: typeof request.body?.enabled === 'boolean' ? request.body.enabled : undefined,
        fallbackToMock: typeof request.body?.fallbackToMock === 'boolean' ? request.body.fallbackToMock : undefined,
        isDefault: typeof request.body?.isDefault === 'boolean' ? request.body.isDefault : undefined,
        clearApiKey: request.body?.clearApiKey === true,
      });
      return { profile };
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'model provider profile update failed');
      return reply.code(500).send({ error: 'Model provider profile update failed.' });
    }
  });

  app.delete<{ Params: { id: string } }>('/api/settings/model-provider/profiles/:id', async (request, reply) => {
    try {
      return deleteModelProviderProfile(request.params.id);
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'model provider profile delete failed');
      return reply.code(500).send({ error: 'Model provider profile delete failed.' });
    }
  });

  app.post<{ Params: { id: string } }>('/api/settings/model-provider/profiles/:id/activate', async (request, reply) => {
    try {
      const profile = activateModelProviderProfile(request.params.id);
      return { profile };
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'model provider profile activate failed');
      return reply.code(500).send({ error: 'Model provider profile activate failed.' });
    }
  });

  app.get('/api/knowledge-bases', async () => ({
    knowledgeBases: listKnowledgeBases(),
  }));

  app.post<{ Body: { title?: string; summary?: string } }>('/api/knowledge-bases', async (request, reply) => {
    const title = request.body?.title;
    const summary = request.body?.summary;
    if (!title || !title.trim()) {
      return reply.status(400).send({ error: 'title 为必填。' });
    }
    try {
      const base = createEmptyKnowledgeBase(title, summary);
      return { knowledgeBase: base };
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
  }>('/api/knowledge-bases/:id', async (request, reply) => {
    const { title, summary } = request.body ?? {};
    if (title !== undefined && !title.trim()) {
      return reply.code(400).send({ error: '知识库标题不能为空。' });
    }
    try {
      const base = updateKnowledgeBaseMeta(request.params.id, title, summary);
      if (!base) {
        return reply.code(404).send({ error: '知识库不存在。' });
      }
      return { knowledgeBase: base };
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'update knowledge base failed');
      return reply.code(500).send({ error: 'Update knowledge base failed.' });
    }
  });

  app.delete<{ Params: { id: string } }>('/api/knowledge-bases/:id', async (request, reply) => {
    try {
      const ok = deleteKnowledgeBase(request.params.id);
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

  let dailyDigestCache: { date: string; data: ReturnType<typeof generateDailyDigest> } | null = null;

  app.get('/api/daily-digest', async () => {
    const today = new Date().toISOString().slice(0, 10);
    if (dailyDigestCache && dailyDigestCache.date === today) {
      return dailyDigestCache.data;
    }
    return generateDailyDigest();
  });

  app.get('/api/topic-coverage', async () => computeTopicCoverage());

  app.get('/api/repeated-thinking', async () => detectRepeatedThinking());

  app.post<{ Body: Partial<ReadingSessionRequest> }>('/api/reading-sessions', async (request, reply) => {
    const body = request.body ?? {};
    const cardId = typeof body.cardId === 'string' ? body.cardId.trim() : '';
    const knowledgeBaseId = typeof body.knowledgeBaseId === 'string' ? body.knowledgeBaseId.trim() : '';
    const durationMs = typeof body.durationMs === 'number' ? body.durationMs : 0;
    if (!cardId || !knowledgeBaseId) {
      return reply.code(400).send({ error: 'cardId 和 knowledgeBaseId 为必填。' });
    }
    return recordReadingSession({ cardId, knowledgeBaseId, durationMs });
  });

  app.post<{ Body: Partial<CannotAnswerFeedbackRequest> }>('/api/cannot-answer-feedback', async (request, reply) => {
    const body = request.body ?? {};
    const knowledgeBaseId = typeof body.knowledgeBaseId === 'string' ? body.knowledgeBaseId.trim() : '';
    const question = typeof body.question === 'string' ? body.question.trim() : '';
    if (!knowledgeBaseId || !question) {
      return reply.code(400).send({ error: 'knowledgeBaseId 和 question 为必填。' });
    }
    return recordCannotAnswerFeedback({ knowledgeBaseId, question });
  });

  app.get('/api/recall-decay', async () => computeRecallDecay());

  app.post('/api/recall-decay/apply', async () => applyRecallDecay());

  app.get('/api/agent-proposals', async () => generateAgentProposals());

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

  app.get<{
    Querystring: {
      type?: string;
      status?: string;
      q?: string;
      limit?: string;
      knowledgeBaseId?: string;
    };
  }>('/api/materials', async (request) => ({
    materials: listMaterials({
      knowledgeBaseId: request.query.knowledgeBaseId || undefined,
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

  app.get<{ Params: { id: string } }>('/api/knowledge-bases/:id/path', async (request, reply) => {
    const path = getKnowledgeBasePath(request.params.id);
    if (!path) {
      return reply.code(404).send({ error: 'Knowledge base not found.' });
    }
    return path;
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

  app.get<{
    Querystring: {
      knowledgeBaseId?: string;
    };
  }>('/api/archive', async (request) => listArchivedItems({
    knowledgeBaseId: typeof request.query.knowledgeBaseId === 'string' ? request.query.knowledgeBaseId : undefined,
  }));

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

  app.get('/api/cloud-backup/status', async () => describeCloudBackupStatus());

  app.post<{ Params: { id: string } }>('/api/knowledge-bases/:id/cloud-backup', async (request, reply) => {
    const stub = describeCloudBackupStatus();
    return reply.status(501).send({
      ...stub,
      knowledgeBaseId: request.params.id,
      message: '云备份功能尚未启用。请使用 ExportView 的 Backup JSON 按钮进行本地整库备份。',
    });
  });

  app.get<{ Params: { scope: string } }>('/api/saved-filters/:scope', async (request) => {
    const filter = loadFilter(request.params.scope as 'assets' | 'compare');
    return { filter };
  });

  app.put<{ Params: { scope: string }; Body: { cardType?: string; claimStatus?: string; sortKey?: string; keyword?: string } }>('/api/saved-filters/:scope', async (request) => {
    const body = request.body ?? {};
    const record = saveFilter(request.params.scope as 'assets' | 'compare', {
      cardType: typeof body.cardType === 'string' && body.cardType.length > 0 ? body.cardType : null,
      claimStatus: typeof body.claimStatus === 'string' && body.claimStatus.length > 0 ? body.claimStatus : null,
      sortKey: typeof body.sortKey === 'string' ? body.sortKey : 'updated_desc',
      keyword: typeof body.keyword === 'string' ? body.keyword : '',
    });
    return { filter: record };
  });

  app.delete<{ Params: { scope: string } }>('/api/saved-filters/:scope', async (request) => {
    clearFilter(request.params.scope as 'assets' | 'compare');
    return { ok: true };
  });

  app.get<{ Params: { id: string } }>('/api/knowledge-bases/:id/entities', async (request) => {
    const entities = listEntities(request.params.id);
    return { entities };
  });

  app.post<{ Params: { id: string } }>('/api/knowledge-bases/:id/entities/extract', async (request, reply) => {
    try {
      const entities = await extractEntities(request.params.id);
      return { entities };
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.status(error.statusCode).send({ error: error.message });
      }
      throw error;
    }
  });

  app.post<{ Body: { leftKnowledgeBaseId?: string; rightKnowledgeBaseId?: string } }>('/api/synthesis', async (request, reply) => {
    const leftId = request.body?.leftKnowledgeBaseId;
    const rightId = request.body?.rightKnowledgeBaseId;
    if (!leftId || !rightId) {
      return reply.status(400).send({ error: 'leftKnowledgeBaseId 与 rightKnowledgeBaseId 均为必填。' });
    }
    try {
      const result = await generateCrossKbSynthesis(leftId, rightId);
      return result;
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.status(error.statusCode).send({ error: error.message });
      }
      throw error;
    }
  });

  app.get<{ Querystring: { kind?: string } }>('/api/conflicts/groups', async (request) => {
    const kind = request.query.kind;
    const groups = listConflictGroups(kind === 'duplicate_card' || kind === 'duplicate_material' ? kind : undefined);
    return { groups };
  });

  app.get<{ Querystring: { limit?: string } }>('/api/conflicts/audit', async (request) => {
    const limit = request.query.limit ? Number.parseInt(request.query.limit, 10) : undefined;
    const entries = listConflictAuditEntries(Number.isFinite(limit) ? limit : undefined);
    return { entries };
  });

  app.post<{ Body: { kind?: string; keepId?: string; dropIds?: string[] } }>('/api/conflicts/resolve', async (request, reply) => {
    const kind = request.body?.kind;
    const keepId = request.body?.keepId;
    const dropIds = Array.isArray(request.body?.dropIds) ? request.body.dropIds : [];
    if (kind !== 'duplicate_card' && kind !== 'duplicate_material') {
      return reply.status(400).send({ error: 'kind 必须是 duplicate_card 或 duplicate_material。' });
    }
    if (!keepId) {
      return reply.status(400).send({ error: 'keepId 为必填。' });
    }
    if (dropIds.length === 0) {
      return reply.status(400).send({ error: 'dropIds 至少需要一项。' });
    }
    try {
      const entry = resolveConflictGroup({ kind, keepId, dropIds });
      return { entry };
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.status(error.statusCode).send({ error: error.message });
      }
      throw error;
    }
  });

  app.post<{ Params: { id: string }; Body: { sections?: Array<{ title?: string; body?: string }> } }>('/api/artifacts/:id/sections/initialize', async (request, reply) => {
    const rawSections = Array.isArray(request.body?.sections) ? request.body.sections : [];
    const sectionInits = rawSections
      .map((section) => ({
        title: typeof section?.title === 'string' ? section.title : '',
        body: typeof section?.body === 'string' ? section.body : '',
      }))
      .filter((section) => section.title.trim().length > 0 || section.body.trim().length > 0);
    if (sectionInits.length === 0) {
      return reply.status(400).send({ error: 'sections 数组不能为空，且每项需包含非空 title 或 body' });
    }
    try {
      const artifact = await initializeArtifactSections(request.params.id, sectionInits);
      return { artifact };
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.status(error.statusCode).send({ error: error.message });
      }
      throw error;
    }
  });

  app.patch<{ Params: { id: string; sectionId: string }; Body: { title?: string; body?: string } }>('/api/artifacts/:id/sections/:sectionId', async (request, reply) => {
    const body = request.body ?? {};
    const hasTitle = typeof body.title === 'string';
    const hasBody = typeof body.body === 'string';
    if (!hasTitle && !hasBody) {
      return reply.status(400).send({ error: '至少需要提供 title 或 body 字段' });
    }
    try {
      const result = await editArtifactSection(request.params.id, request.params.sectionId, {
        title: hasTitle ? body.title : undefined,
        body: hasBody ? body.body : undefined,
      });
      return result;
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.status(error.statusCode).send({ error: error.message });
      }
      throw error;
    }
  });

  app.get<{ Params: { id: string } }>('/api/artifacts/:id/revisions', async (request) => {
    const revisions = await listArtifactRevisions(request.params.id);
    return { revisions };
  });

  app.get<{ Params: { id: string } }>('/api/knowledge-bases/:id/map', async (request, reply) => {
    const map = getKnowledgeMap(request.params.id);
    if (!map) {
      return reply.code(404).send({ error: 'Knowledge base not found.' });
    }
    return map;
  });

  app.get<{ Params: { id: string } }>('/api/knowledge-bases/:id/node-positions', async (request, reply) => {
    const positions = getKnowledgeBaseNodePositions(request.params.id);
    if (positions === undefined) {
      return reply.code(404).send({ error: 'Knowledge base not found.' });
    }
    return { positions };
  });

  app.put<{ Params: { id: string }; Body: SaveKnowledgeMapNodePositionsRequest }>('/api/knowledge-bases/:id/node-positions', async (request, reply) => {
    try {
      const positions = saveKnowledgeBaseNodePositions(request.params.id, {
        positions: Array.isArray(request.body?.positions) ? request.body.positions : [],
      });
      return { positions };
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'save knowledge base node positions failed');
      return reply.code(500).send({ error: 'Save node positions failed.' });
    }
  });

  app.post<{ Params: { id: string }; Body: AddMapEdgeRequest }>('/api/knowledge-bases/:id/map/edges', async (request, reply) => {
    try {
      const edge = addMapEdge(request.params.id, {
        sourceNodeId: typeof request.body?.sourceNodeId === 'string' ? request.body.sourceNodeId : '',
        targetNodeId: typeof request.body?.targetNodeId === 'string' ? request.body.targetNodeId : '',
        relation: typeof request.body?.relation === 'string' ? (request.body.relation as AddMapEdgeRequest['relation']) : 'related_to',
      });
      return reply.code(201).send(edge);
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'add map edge failed');
      return reply.code(500).send({ error: 'Add map edge failed.' });
    }
  });

  app.delete<{ Params: { id: string; edgeId: string } }>('/api/knowledge-bases/:id/map/edges/:edgeId', async (request, reply) => {
    try {
      removeMapEdge(request.params.id, request.params.edgeId);
      return reply.code(204).send();
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'remove map edge failed');
      return reply.code(500).send({ error: 'Remove map edge failed.' });
    }
  });

  app.get<{ Params: { id: string } }>('/api/knowledge-bases/:id/evidence-audit', async (request, reply) => {
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

  app.post<{ Params: { id: string }; Body: { hypothesis?: string } }>('/api/knowledge-bases/:id/hypothesis-test', async (request, reply) => {
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

  app.get('/api/transcription/capability', async (request, reply) => {
    try {
      return await getTranscriptionCapabilityReport();
    } catch (error) {
      request.log.error({ error }, 'transcription capability check failed');
      return reply.code(500).send({ error: 'Transcription capability check failed.' });
    }
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

  app.post<{ Params: { id: string } }>('/api/materials/:id/archive', async (request, reply) => {
    try {
      return archiveMaterial(request.params.id);
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'material archive failed');
      return reply.code(500).send({ error: 'Material archive failed.' });
    }
  });

  app.post<{ Params: { id: string } }>('/api/materials/:id/unarchive', async (request, reply) => {
    try {
      return unarchiveMaterial(request.params.id);
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'material unarchive failed');
      return reply.code(500).send({ error: 'Material unarchive failed.' });
    }
  });

  app.post<{ Body: Partial<IntakeRequest> }>('/api/intake', async (request, reply) => {
    const input = typeof request.body?.input === 'string' ? request.body.input.trim() : '';
    if (!input) {
      return reply.code(400).send({ error: 'Input is required.' });
    }

    const audience = request.body?.audience;
    const depth = request.body?.depth;
    const scope = request.body?.scope;

    if (audience !== undefined && !INTAKE_AUDIENCE_SET.has(audience)) {
      return reply.code(400).send({ error: 'audience 字段值非法。' });
    }
    if (depth !== undefined && !INTAKE_DEPTH_SET.has(depth)) {
      return reply.code(400).send({ error: 'depth 字段值非法。' });
    }
    if (scope !== undefined && !INTAKE_SCOPE_SET.has(scope)) {
      return reply.code(400).send({ error: 'scope 字段值非法。' });
    }

    try {
      return await intakeKnowledge({
        input,
        knowledgeBaseId: request.body.knowledgeBaseId,
        audience,
        depth,
        scope,
      });
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'intake failed');
      return reply.code(500).send({ error: 'Intake failed.' });
    }
  });

  app.get('/api/weread/settings', async () => getWeReadSettings());

  app.put<{ Body: { apiKey?: string } }>('/api/weread/settings', async (request, reply) => {
    const apiKey = typeof request.body?.apiKey === 'string' ? request.body.apiKey.trim() : '';
    if (!apiKey) {
      return reply.code(400).send({ error: 'API Key is required.' });
    }
    try {
      saveWeReadSettings(apiKey);
      return { ok: true };
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'save weread settings failed');
      return reply.code(500).send({ error: 'Save WeRead settings failed.' });
    }
  });

  app.post('/api/weread/settings/test', async (request, reply) => {
    try {
      return await testWeReadConnection();
    } catch (error) {
      request.log.error({ error }, 'test weread connection failed');
      return reply.code(500).send({ ok: false, error: 'Test connection failed.' });
    }
  });

  app.get('/api/weread/shelf', async (request, reply) => {
    try {
      return await getWeReadShelf();
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'fetch weread shelf failed');
      return reply.code(500).send({ error: 'Failed to fetch WeRead shelf.' });
    }
  });

  app.post<{ Body: { bookId?: string; knowledgeBaseId?: string } }>('/api/weread/import', async (request, reply) => {
    const bookId = typeof request.body?.bookId === 'string' ? request.body.bookId.trim() : '';
    if (!bookId) {
      return reply.code(400).send({ error: 'bookId is required.' });
    }
    try {
      return await importWeReadBook(bookId, request.body?.knowledgeBaseId);
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'import weread book failed');
      return reply.code(500).send({ error: 'Failed to import WeRead book.' });
    }
  });

  app.post<{ Body: { force?: boolean } }>('/api/weread/sync', async (request, reply) => {
    try {
      const force = request.body?.force === true;
      return await syncWeReadShelf(force);
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'sync weread shelf failed');
      return reply.code(500).send({ error: 'Failed to sync WeRead shelf.' });
    }
  });

  app.get('/api/weread/meta', async (request, reply) => {
    try {
      return { books: readWeReadBookMetaList(), syncState: readWeReadSyncState() };
    } catch (error) {
      request.log.error({ error }, 'read weread meta failed');
      return reply.code(500).send({ error: 'Failed to read WeRead meta.' });
    }
  });

  app.get('/api/weread/stats', async (request, reply) => {
    try {
      return computeWeReadStats();
    } catch (error) {
      request.log.error({ error }, 'compute weread stats failed');
      return reply.code(500).send({ error: 'Failed to compute WeRead stats.' });
    }
  });

  app.get<{ Querystring: { knowledgeBaseId?: string } }>('/api/weread/recommendations', async (request, reply) => {
    try {
      const kbId = typeof request.query.knowledgeBaseId === 'string' ? request.query.knowledgeBaseId : undefined;
      return computeWeReadRecommendations(kbId);
    } catch (error) {
      request.log.error({ error }, 'compute weread recommendations failed');
      return reply.code(500).send({ error: 'Failed to compute WeRead recommendations.' });
    }
  });

  app.post<{ Body: { bookId?: string } }>('/api/weread/preview', async (request, reply) => {
    const bookId = typeof request.body?.bookId === 'string' ? request.body.bookId.trim() : '';
    if (!bookId) {
      return reply.code(400).send({ error: 'bookId is required.' });
    }
    try {
      return await previewWeReadBook(bookId);
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'preview weread book failed');
      return reply.code(500).send({ error: 'Failed to preview WeRead book.' });
    }
  });

  cron.schedule('0 8 * * *', () => {
    try {
      const digest = generateDailyDigest();
      dailyDigestCache = { date: digest.date, data: digest };
      app.log.info({ date: digest.date, totalNewItems: digest.totalNewItems }, 'daily digest generated');
    } catch (error) {
      app.log.error({ error }, 'daily digest generation failed');
    }
  });

  return app;
}

const materialTypes = new Set<MaterialType>(['link', 'text', 'question', 'topic']);
const parseStatuses = new Set<ParseStatus>(['saved', 'parsing', 'needs_review', 'ingested', 'failed']);
const knowledgeKitIds = new Set<KnowledgeKitId>(['learning_research', 'content_creation', 'product_research', 'topic_decomposition']);

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
