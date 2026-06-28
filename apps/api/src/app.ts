import cors from '@fastify/cors';
import cron from 'node-cron';
import Fastify from 'fastify';
import {
  archiveCard,
  archiveMaterial,
  assignMaterialToWorkspace,
  answerWorkspaceQuestion,
  clearFilter,
  createEmptyWorkspace,
  completeMaterialReview,
  createModelProviderProfile,
  deleteMaterial,
  deleteModelProviderProfile,
  deleteWorkspace,
  describeCloudBackupStatus,
  editArtifactSection,
  editCardContent,
  extractEntities,
  generateEvidenceAudit,
  generateSocraticQuestions,
  generateRelatedSuggestions,
  getDashboard,
  getTranscriptionCapabilityReport,
  getGlobalInsights,
  getConstructionProgress,
  listSkeletonCards,
  getWorkspacePath,
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
  refreshWeReadBookSignals,
  loadFilter,
  recordExport,
  getWorkspaceAnalytics,
  getWorkspace,
  getKnowledgeMap,
  getWorkspaceNodePositions,
  saveWorkspaceNodePositions,
  addMapEdge,
  removeMapEdge,
  getTask,
  initializeArtifactSections,
  intakeKnowledge,
  intakeFolderFromPath,
  intakeFilesFromBatch,
  intakeRawHtml,
  type RawHtmlIntakeRequest,
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
  buildOrchestratorDecision,
  buildInterceptedDecision,
  interceptInStream,
  classifyUserIntent,
  recordSuggestionSent,
  acceptProposedCards,
  applyProposedOperations,
  listAgentActionLogs,
  listAgentUsageRecords,
  summarizeAgentUsageRecords,
  compareAgentUsageRecords,
  computeEvidenceFeedback,
  extractRejectedFeatures,
  EVIDENCE_ACTION_ACCEPT_PROPOSED_CARDS,
  DEFAULT_REJECTED_FEATURES_LIMIT,
  createUserMemoryRecord,
  updateUserMemoryRecord,
  deleteUserMemoryRecord,
  findUserMemoryRecord,
  listUserMemoryRecords,
  createDecisionLogRecord,
  findDecisionLogRecord,
  listDecisionLogRecords,
  deleteDecisionLogRecord,
  type UserMemoryQuery,
  type DecisionLogQuery,
  listInspectTables,
  inspectQuery,
  activateModelProviderProfile,
  recordCardReview,
  listWorkspaces,
  listMaterials,
  listMaterialsPaged,
  listAllCards,
  listAllMaterials,
  listAllArtifacts,
  ensureDefaultWorkspace,
  evaluateAntiVanity,
  getDataAccountBook,
  saveMinimalMode,
  getVerificationCoverage,
  saveVerificationCoverage,
  buildVerificationBank,
  evaluateVerificationAttempts,
  updateVerificationCoverage,
  buildMinimalFeatureState,
  createDefaultDataAccount,
  toggleEntry,
  listDisabledDimensions,
  assessAllDegrade,
  assessDegrade,
  DEGRADE_MATRIX_REGISTRY,
  computeQuadrantSummary,
  computeTopicSpectrum,
  computeTrulyReadScore,
  validateTopicSpectrum,
  recordMaterialParsingFailure,
  requestMaterialParsing,
  resolveConflictGroup,
  revealDataDirectory,
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
  updateWorkspaceMeta,
  updateModelProviderProfile,
  getActiveAgentCredentials,
  listWorkspaceProposals,
  decideWorkspaceProposal,
  initProxyDispatcher,
  getCurrentProxy,
  detectSystemProxy,
  setManualProxy,
} from '@zhijing/core';
import {
  startOrchestratorSession,
  truncateSessionForRetry,
  listAgentSessions,
  getAgentSessionMessages,
  renameAgentSession,
  deleteAgentSession,
  type OrchestratorSession,
} from '@zhijing/agent';
import { getActiveRoutes, isRoutesOverriddenByEnv, buildRouteAdvisor } from '@zhijing/pi-runtime';
import type {
  AddMapEdgeRequest,
  AssignMaterialRequest,
  CompleteMaterialReviewRequest,
  CreateModelProviderProfileRequest,
  IntakeAudience,
  IntakeDepth,
  IntakeRequest,
  IntakeScope,
  FolderIntakeRequest,
  FileBatchIntakeRequest,
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
  AcceptProposalBatchRequest,
  UpdateModelProviderProfileRequest,
  KnowledgeCard,
  MaterialRecord,
  AgentStreamEvent,
  OrchestratorDecision,
  ProposalStatus,
  AgentTaskType,
  AgentUsageQuery,
  UserMemoryScope,
  UserMemorySource,
  DecisionLogKind,
  CreateUserMemoryRequest,
  UpdateUserMemoryRequest,
  CreateDecisionLogRequest,
  EvidenceFeedback,
  RejectedCardFeature,
  RouteAdvisorResult,
} from '@zhijing/shared';
import {
  INTAKE_AUDIENCE_VALUES,
  INTAKE_DEPTH_VALUES,
  INTAKE_SCOPE_VALUES,
  AGENT_TASK_TYPE_VALUES,
  USER_MEMORY_SCOPE_VALUES,
  USER_MEMORY_SOURCE_VALUES,
  DECISION_LOG_KIND_VALUES,
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

const AGENT_TASK_TYPE_SET = new Set<string>(AGENT_TASK_TYPE_VALUES);
const USER_MEMORY_SCOPE_SET = new Set<string>(USER_MEMORY_SCOPE_VALUES);
const USER_MEMORY_SOURCE_SET = new Set<string>(USER_MEMORY_SOURCE_VALUES);
const DECISION_LOG_KIND_SET = new Set<string>(DECISION_LOG_KIND_VALUES);

const AGENT_USAGE_DEFAULT_LIMIT = 100;
const AGENT_USAGE_MAX_LIMIT = 500;

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
    bodyLimit: 16 * 1024 * 1024,
  });

  app.register(cors, {
    origin: resolveAllowedOrigins(),
  });

  ensureDefaultWorkspace();

  /**
   * 运行中的编排会话映射，key 为 sessionId。
   *
   * 生命周期：
   * - /agent/stream 创建 session 后写入
   * - /agent/abort 通过 sessionId 查找并调 session.abort()
   * - stream 正常/异常结束后 finally 中删除
   * - 客户端断开时 reply.raw close 触发 session.abort()，最终走 finally 清理
   */
  const activeAgents = new Map<string, OrchestratorSession>();

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

  app.get('/api/proxy', async () => {
    const proxyUrl = getCurrentProxy();
    const detected = detectSystemProxy();
    return {
      active: Boolean(proxyUrl),
      proxyUrl,
      detected,
      mode: proxyUrl ? 'auto' : 'none',
    };
  });

  app.post<{ Body: { proxyUrl?: string } }>('/api/proxy', async (request, reply) => {
    const raw = typeof request.body?.proxyUrl === 'string' ? request.body.proxyUrl.trim() : '';
    if (!raw) {
      setManualProxy(undefined);
      initProxyDispatcher();
      return { ok: true, active: false, proxyUrl: undefined };
    }
    try {
      const url = new URL(raw);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return reply.code(400).send({ error: 'proxyUrl must be http or https.' });
      }
      setManualProxy(raw);
      initProxyDispatcher();
      return { ok: true, active: true, proxyUrl: raw };
    } catch {
      return reply.code(400).send({ error: 'Invalid proxyUrl.' });
    }
  });

  app.post('/api/system/reveal-data-dir', async () => {
    const result = await revealDataDirectory();
    if (!result.ok) {
      return { ok: false, error: result.error };
    }
    return { ok: true, path: result.path };
  });

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

  app.get<{ Params: { workspaceId: string }; Querystring: { status?: string; limit?: string } }>(
    '/api/workspaces/:workspaceId/agent-proposals',
    async (request, reply) => {
      const validStatuses = new Set<string>(['pending', 'accepted', 'rejected', 'dismissed']);
      const statusRaw = typeof request.query.status === 'string' ? request.query.status.trim() : '';
      const status: ProposalStatus | undefined = statusRaw && validStatuses.has(statusRaw)
        ? (statusRaw as ProposalStatus)
        : undefined;
      if (statusRaw && !status) {
        return reply.code(400).send({ error: 'status 必须是 pending / accepted / rejected / dismissed 之一。' });
      }
      const limitRaw = typeof request.query.limit === 'string' ? request.query.limit.trim() : '';
      const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      return { proposals: listWorkspaceProposals(request.params.workspaceId, status, limit) };
    },
  );

  app.post<{ Params: { workspaceId: string; proposalId: string }; Body: { decision?: string } }>(
    '/api/workspaces/:workspaceId/agent-proposals/:proposalId/decide',
    async (request, reply) => {
      const decisionRaw = typeof request.body?.decision === 'string' ? request.body.decision.trim() : '';
      const validDecisions: ProposalStatus[] = ['accepted', 'rejected', 'dismissed'];
      if (!validDecisions.includes(decisionRaw as ProposalStatus)) {
        return reply.code(400).send({ error: 'decision 必须是 accepted / rejected / dismissed 之一。' });
      }
      try {
        const updated = decideWorkspaceProposal(
          request.params.workspaceId,
          request.params.proposalId,
          decisionRaw as ProposalStatus,
        );
        return { proposal: updated };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Proposal decide failed.';
        const isNotFound = message.includes('not found');
        const isInvalidTransition = message.includes('Cannot transition');
        const code = isNotFound ? 404 : isInvalidTransition ? 409 : 500;
        return reply.code(code).send({ error: message });
      }
    },
  );

  app.get<{ Querystring: { workspaceId?: string; action?: string; limit?: string } }>(
    '/api/agent-action-logs',
    async (request) => {
      const workspaceId = typeof request.query.workspaceId === 'string' && request.query.workspaceId.trim()
        ? request.query.workspaceId.trim()
        : undefined;
      const action = typeof request.query.action === 'string' && request.query.action.trim()
        ? request.query.action.trim()
        : undefined;
      const limitRaw = typeof request.query.limit === 'string' ? request.query.limit.trim() : '';
      const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      return listAgentActionLogs({ workspaceId, action, limit });
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

  app.get<{
    Querystring: { query?: string; limit?: string };
  }>('/api/artifacts', async (request) => {
    const { query, limit } = request.query;
    return listAllArtifacts({
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

  app.get<{
    Querystring: {
      type?: string;
      status?: string;
      q?: string;
      limit?: string;
      workspaceId?: string;
      cursorCreatedAt?: string;
      cursorId?: string;
    };
  }>('/api/materials', async (request) => {
    const cursorCreatedAt = request.query.cursorCreatedAt?.trim();
    const cursorId = request.query.cursorId?.trim();
    return listMaterialsPaged({
      workspaceId: request.query.workspaceId || undefined,
      type: parseMaterialType(request.query.type),
      parseStatus: parseStatus(request.query.status),
      query: request.query.q,
      limit: parseLimit(request.query.limit),
      cursorCreatedAt: cursorCreatedAt || undefined,
      cursorId: cursorId || undefined,
    });
  });

  app.get<{ Params: { id: string } }>('/api/workspaces/:id', async (request, reply) => {
    const base = getWorkspace(request.params.id);
    if (!base) {
      return reply.code(404).send({ error: 'Knowledge base not found.' });
    }
    return base;
  });

  app.get<{ Params: { id: string } }>('/api/workspaces/:id/analytics', async (request, reply) => {
    const analytics = await getWorkspaceAnalytics(request.params.id);
    if (!analytics) {
      return reply.code(404).send({ error: 'Knowledge base not found.' });
    }
    return analytics;
  });

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

  app.get<{
    Querystring: {
      scope?: string;
      source?: string;
      workspaceId?: string;
      key?: string;
      limit?: string;
    };
  }>('/api/user-memory', async (request, reply) => {
    const query = request.query;
    if (query.scope !== undefined && !USER_MEMORY_SCOPE_SET.has(query.scope)) {
      return reply.code(400).send({ error: `Invalid scope. Allowed: ${USER_MEMORY_SCOPE_VALUES.join(', ')}` });
    }
    if (query.source !== undefined && !USER_MEMORY_SOURCE_SET.has(query.source)) {
      return reply.code(400).send({ error: `Invalid source. Allowed: ${USER_MEMORY_SOURCE_VALUES.join(', ')}` });
    }
    const limit = query.limit !== undefined ? Number(query.limit) : undefined;
    if (limit !== undefined && (!Number.isFinite(limit) || limit <= 0)) {
      return reply.code(400).send({ error: 'Invalid limit. Must be a positive number.' });
    }
    const memoryQuery: UserMemoryQuery = {
      scope: query.scope as UserMemoryScope | undefined,
      source: query.source as UserMemorySource | undefined,
      workspaceId: query.workspaceId,
      key: query.key,
      limit,
    };
    return { records: listUserMemoryRecords(memoryQuery) };
  });

  app.post<{
    Body: CreateUserMemoryRequest;
  }>('/api/user-memory', async (request, reply) => {
    const body = request.body;
    if (!body || typeof body !== 'object') {
      return reply.code(400).send({ error: 'Request body is required.' });
    }
    if (body.scope !== undefined && !USER_MEMORY_SCOPE_SET.has(body.scope)) {
      return reply.code(400).send({ error: `Invalid scope. Allowed: ${USER_MEMORY_SCOPE_VALUES.join(', ')}` });
    }
    if (body.source !== undefined && !USER_MEMORY_SOURCE_SET.has(body.source)) {
      return reply.code(400).send({ error: `Invalid source. Allowed: ${USER_MEMORY_SOURCE_VALUES.join(', ')}` });
    }
    try {
      const record = createUserMemoryRecord(body);
      return reply.code(201).send(record);
    } catch (error) {
      return reply.code(400).send({ error: error instanceof Error ? error.message : 'Failed to create user memory.' });
    }
  });

  app.get<{ Params: { id: string } }>('/api/user-memory/:id', async (request, reply) => {
    const record = findUserMemoryRecord(request.params.id);
    if (!record) {
      return reply.code(404).send({ error: 'User memory not found.' });
    }
    return record;
  });

  app.patch<{
    Params: { id: string };
    Body: UpdateUserMemoryRequest;
  }>('/api/user-memory/:id', async (request, reply) => {
    const body = request.body;
    if (!body || typeof body !== 'object') {
      return reply.code(400).send({ error: 'Request body is required.' });
    }
    if (body.scope !== undefined && !USER_MEMORY_SCOPE_SET.has(body.scope)) {
      return reply.code(400).send({ error: `Invalid scope. Allowed: ${USER_MEMORY_SCOPE_VALUES.join(', ')}` });
    }
    const record = updateUserMemoryRecord(request.params.id, body);
    if (!record) {
      return reply.code(404).send({ error: 'User memory not found.' });
    }
    return record;
  });

  app.delete<{ Params: { id: string } }>('/api/user-memory/:id', async (request, reply) => {
    const ok = deleteUserMemoryRecord(request.params.id);
    if (!ok) {
      return reply.code(404).send({ error: 'User memory not found.' });
    }
    return reply.code(204).send();
  });

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

  app.get<{ Params: { id: string } }>('/api/workspaces/:id/path', async (request, reply) => {
    const path = getWorkspacePath(request.params.id);
    if (!path) {
      return reply.code(404).send({ error: 'Knowledge base not found.' });
    }
    return path;
  });

  app.get<{ Params: { id: string }; Querystring: { limit?: string } }>('/api/workspaces/:id/messages', async (request, reply) => {
    const limit = request.query.limit ? Number(request.query.limit) : undefined;
    const messages = await listMessages(request.params.id, limit);
    return { messages };
  });

  app.get<{ Params: { id: string }; Querystring: { limit?: string } }>('/api/workspaces/:id/due-cards', async (request, reply) => {
    const limit = request.query.limit ? Number(request.query.limit) : undefined;
    const cards = await listDueCards(request.params.id, limit);
    return { cards };
  });

  app.get<{ Params: { id: string } }>('/api/workspaces/:id/orchestrator/decision', async (request, reply) => {
    const workspace = getWorkspace(request.params.id);
    if (!workspace) {
      return reply.code(404).send({ error: 'Knowledge base not found.' });
    }
    const decision = buildOrchestratorDecision(request.params.id);
    return { decision };
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
      workspaceId?: string;
    };
  }>('/api/archive', async (request) => listArchivedItems({
    workspaceId: typeof request.query.workspaceId === 'string' ? request.query.workspaceId : undefined,
  }));

  app.get<{ Params: { id: string } }>('/api/workspaces/:id/exports', async (request, reply) => {
    const exports = await listExports(request.params.id);
    return { exports };
  });

  app.post<{ Params: { id: string }; Body: { format?: string; scope?: string; includeArtifacts?: boolean; filename?: string; materialCount?: number; cardCount?: number; artifactCount?: number } }>('/api/workspaces/:id/exports', async (request, reply) => {
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

  app.post<{ Params: { id: string } }>('/api/workspaces/:id/cloud-backup', async (request, reply) => {
    const stub = describeCloudBackupStatus();
    return reply.status(501).send({
      ...stub,
      workspaceId: request.params.id,
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

  app.get<{ Params: { id: string } }>('/api/workspaces/:id/entities', async (request) => {
    const entities = listEntities(request.params.id);
    return { entities };
  });

  app.post<{ Params: { id: string } }>('/api/workspaces/:id/entities/extract', async (request, reply) => {
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

  app.get<{ Params: { id: string } }>('/api/workspaces/:id/map', async (request, reply) => {
    const map = getKnowledgeMap(request.params.id);
    if (!map) {
      return reply.code(404).send({ error: 'Knowledge base not found.' });
    }
    return map;
  });

  app.get<{ Params: { id: string } }>('/api/workspaces/:id/node-positions', async (request, reply) => {
    const positions = getWorkspaceNodePositions(request.params.id);
    if (positions === undefined) {
      return reply.code(404).send({ error: 'Knowledge base not found.' });
    }
    return { positions };
  });

  app.put<{ Params: { id: string }; Body: SaveKnowledgeMapNodePositionsRequest }>('/api/workspaces/:id/node-positions', async (request, reply) => {
    try {
      const positions = saveWorkspaceNodePositions(request.params.id, {
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

  app.post<{ Params: { id: string }; Body: AddMapEdgeRequest }>('/api/workspaces/:id/map/edges', async (request, reply) => {
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

  app.delete<{ Params: { id: string; edgeId: string } }>('/api/workspaces/:id/map/edges/:edgeId', async (request, reply) => {
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

  app.post<{ Params: { id: string }; Body: { message?: string; sessionId?: string; isWriting?: boolean; retryLastTurn?: boolean } }>(
    '/api/workspaces/:id/agent/stream',
    async (request, reply) => {
      const message = typeof request.body?.message === 'string' ? request.body.message.trim() : '';
      if (!message) {
        return reply.code(400).send({ error: 'Message is required.' });
      }
      const sessionId = typeof request.body?.sessionId === 'string' && request.body.sessionId.length > 0
        ? request.body.sessionId
        : `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const isWriting = Boolean(request.body?.isWriting);
      const retryRequested = Boolean(request.body?.retryLastTurn);

      if (retryRequested) {
        const retryResult = truncateSessionForRetry(sessionId, request.params.id);
        if (retryResult.truncated) {
          request.log.info(
            { sessionId, workspaceId: request.params.id, before: retryResult.beforeCount, remaining: retryResult.remainingCount },
            'agent retry: session truncated before last user message',
          );
        } else {
          request.log.info(
            { sessionId, workspaceId: request.params.id, reason: 'no-op' },
            'agent retry: session missing or no user message, fallback to fresh turn',
          );
        }
      }

      reply.hijack();
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        'X-Session-Id': sessionId,
      });

      const send = (event: AgentStreamEvent) => {
        try {
          reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
        } catch (writeError) {
          request.log.warn({ writeError }, 'agent stream write failed');
        }
      };

      let credentials: ReturnType<typeof getActiveAgentCredentials> | null = null;
      let decision: OrchestratorDecision | null = null;
      try {
        credentials = getActiveAgentCredentials();

        try {
          decision = buildInterceptedDecision(request.params.id, message, { isWriting });
          if (!decision.constraintsPassed) {
            request.log.info(
              { mode: decision.mode, reason: decision.constraintsReason },
              'orchestrator constraints blocked active suggestion',
            );
          }
          if (decision.reason.includes('前置拦截器')) {
            request.log.info(
              { mode: decision.mode, reason: decision.reason },
              'orchestrator pre-interceptor adjusted mode',
            );
          }
        } catch (decisionError) {
          request.log.warn({ decisionError }, 'orchestrator decision failed, fallback to mirror');
        }
      } catch (error) {
        send({ type: 'error', message: error instanceof Error ? error.message : 'Agent init failed.' });
        reply.raw.end();
        return;
      }

      if (!credentials) {
        reply.raw.end();
        return;
      }

      if (decision) {
        send({
          type: 'mode_update',
          mode: decision.mode,
          reason: decision.reason,
          suggestedAction: decision.suggestedAction,
        });

        if (decision.constraintsPassed && decision.mode !== 'mirror' && decision.activeProposals.length > 0) {
          try {
            recordSuggestionSent(request.params.id, decision.mode, decision.activeProposals);
          } catch (recordError) {
            request.log.warn({ recordError }, 'record suggestion sent failed');
          }
        }
      }

      const intent = classifyUserIntent(message);
      if (intent !== 'neutral') {
        request.log.info({ intent }, 'orchestrator intent classified');
      }

      const session = startOrchestratorSession(
        {
          workspaceId: request.params.id,
          message,
          intent,
          decision,
          credentials: {
            provider: credentials.provider,
            model: credentials.model,
            apiKey: credentials.apiKey,
          },
          isWriting,
        },
        {
          onEvent: send,
          isWritable: () => !reply.raw.writableEnded,
          onStreamIntercept: ({ mode, reason }) => {
            request.log.info({ mode, reason }, 'stream interceptor adjusted mode mid-stream');
          },
          onWarn: (info, warnMessage) => {
            request.log.warn(info, warnMessage);
          },
        },
        sessionId,
      );

      activeAgents.set(sessionId, session);

      reply.raw.on('close', () => {
        if (!reply.raw.writableEnded) {
          session.abort();
        }
      });

      try {
        await session.done;
      } finally {
        activeAgents.delete(sessionId);
        reply.raw.end();
      }
    },
  );

  app.post<{ Params: { id: string }; Body: { sessionId?: string } }>(
    '/api/workspaces/:id/agent/abort',
    async (request, reply) => {
      const sessionId = typeof request.body?.sessionId === 'string' ? request.body.sessionId : '';
      if (!sessionId) {
        return reply.code(400).send({ error: 'sessionId is required.' });
      }
      const session = activeAgents.get(sessionId);
      if (!session) {
        return reply.code(404).send({ error: 'Session not found or already ended.' });
      }
      try {
        session.abort();
      } catch (error) {
        request.log.warn({ error, sessionId }, 'agent abort failed');
      }
      return reply.send({ ok: true });
    },
  );

  app.get<{ Params: { id: string } }>(
    '/api/workspaces/:id/agent/sessions',
    async (request) => {
      const sessions = listAgentSessions(request.params.id);
      return { sessions };
    },
  );

  app.get<{ Params: { id: string; sessionId: string } }>(
    '/api/workspaces/:id/agent/sessions/:sessionId',
    async (request, reply) => {
      const detail = getAgentSessionMessages(request.params.sessionId, request.params.id);
      if (!detail) {
        return reply.code(404).send({ error: 'Session not found.' });
      }
      return detail;
    },
  );

  app.patch<{ Params: { id: string; sessionId: string }; Body: { title?: string } }>(
    '/api/workspaces/:id/agent/sessions/:sessionId',
    async (request, reply) => {
      const title = typeof request.body?.title === 'string' ? request.body.title : '';
      const ok = renameAgentSession(request.params.sessionId, request.params.id, title);
      if (!ok) {
        return reply.code(404).send({ error: 'Session not found or title empty.' });
      }
      return { ok: true };
    },
  );

  app.delete<{ Params: { id: string; sessionId: string } }>(
    '/api/workspaces/:id/agent/sessions/:sessionId',
    async (request, reply) => {
      const ok = deleteAgentSession(request.params.sessionId, request.params.id);
      if (!ok) {
        return reply.code(404).send({ error: 'Session not found.' });
      }
      return { ok: true };
    },
  );

  app.post<{ Params: { id: string }; Body: Partial<RunKnowledgeKitRequest> }>('/api/workspaces/:id/kits/run', async (request, reply) => {
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
      return assignMaterialToWorkspace(request.params.id, {
        workspaceId: typeof request.body?.workspaceId === 'string' ? request.body.workspaceId.trim() : undefined,
        newWorkspaceTitle: typeof request.body?.newWorkspaceTitle === 'string' ? request.body.newWorkspaceTitle.trim() : undefined,
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
        workspaceId: request.body.workspaceId,
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

  app.post<{ Body: Partial<FolderIntakeRequest> }>('/api/intake/folder', async (request, reply) => {
    const path = typeof request.body?.path === 'string' ? request.body.path.trim() : '';
    if (!path) {
      return reply.code(400).send({ error: 'path is required.' });
    }
    try {
      return await intakeFolderFromPath({
        path,
        workspaceId: request.body.workspaceId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Folder intake failed.';
      if (/Path (not found|is not a directory)|Workspace not found|Too many files/.test(message)) {
        return reply.code(400).send({ error: message });
      }
      request.log.error({ error }, 'folder intake failed');
      return reply.code(500).send({ error: 'Folder intake failed.' });
    }
  });

  app.post<{ Body: Partial<FileBatchIntakeRequest> }>('/api/intake/files', async (request, reply) => {
    const items = Array.isArray(request.body?.items) ? request.body.items : null;
    if (!items || items.length === 0) {
      return reply.code(400).send({ error: 'items is required and must be a non-empty array.' });
    }
    try {
      return await intakeFilesFromBatch({
        items,
        workspaceId: request.body.workspaceId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'File batch intake failed.';
      if (/items|Workspace not found|Too many files/.test(message)) {
        return reply.code(400).send({ error: message });
      }
      request.log.error({ error }, 'file batch intake failed');
      return reply.code(500).send({ error: 'File batch intake failed.' });
    }
  });

  app.post<{ Body: Partial<RawHtmlIntakeRequest> }>('/api/intake/raw-html', async (request, reply) => {
    const html = typeof request.body?.html === 'string' ? request.body.html.trim() : '';
    if (!html) {
      return reply.code(400).send({ error: 'HTML content is required.' });
    }
    try {
      const result = intakeRawHtml({
        html,
        title: typeof request.body?.title === 'string' ? request.body.title.trim() : undefined,
        sourceUrl: typeof request.body?.sourceUrl === 'string' ? request.body.sourceUrl.trim() : undefined,
        workspaceId: request.body?.workspaceId,
      });
      return result;
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'raw html intake failed');
      return reply.code(500).send({ error: 'Raw HTML intake failed.' });
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

  app.post<{ Body: { bookId?: string; workspaceId?: string } }>('/api/weread/import', async (request, reply) => {
    const bookId = typeof request.body?.bookId === 'string' ? request.body.bookId.trim() : '';
    if (!bookId) {
      return reply.code(400).send({ error: 'bookId is required.' });
    }
    try {
      return await importWeReadBook(bookId, request.body?.workspaceId);
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

  app.get<{ Querystring: { workspaceId?: string } }>('/api/weread/recommendations', async (request, reply) => {
    try {
      const kbId = typeof request.query.workspaceId === 'string' ? request.query.workspaceId : undefined;
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

  app.post<{ Body: { bookIds?: string[]; concurrency?: number } }>('/api/weread/signals/refresh', async (request, reply) => {
    const raw = request.body?.bookIds;
    const bookIds = Array.isArray(raw) ? raw.filter((id): id is string => typeof id === 'string' && id.trim().length > 0) : [];
    const concurrency = typeof request.body?.concurrency === 'number' && request.body.concurrency > 0
      ? Math.floor(request.body.concurrency)
      : undefined;
    if (bookIds.length === 0) {
      return reply.code(400).send({ error: 'bookIds must be a non-empty array.' });
    }
    try {
      return await refreshWeReadBookSignals(bookIds, concurrency);
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'refresh weread signals failed');
      return reply.code(500).send({ error: 'Failed to refresh WeRead signals.' });
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

  app.get('/api/data-account', async () => {
    const now = new Date().toISOString();
    const book = createDefaultDataAccount(now);
    return { book, source: 'default' };
  });

  app.post<{
    Body: {
      viewId?: string;
      dependsOnBehaviorTrace?: boolean;
      sharedAcrossUsers?: boolean;
      hasRankingOrComparison?: boolean;
      emphasizesQuantity?: boolean;
      exposesRawData?: boolean;
      allowsUserChallenge?: boolean;
      isLinearlyOptimizable?: boolean;
    };
  }>('/api/statistics/evaluate-gate', async (request, reply) => {
    const body = request.body ?? {};
    if (typeof body.viewId !== 'string' || body.viewId.length === 0) {
      return reply.code(400).send({ error: 'viewId is required' });
    }
    return evaluateAntiVanity({
      viewId: body.viewId,
      dependsOnBehaviorTrace: Boolean(body.dependsOnBehaviorTrace),
      sharedAcrossUsers: Boolean(body.sharedAcrossUsers),
      hasRankingOrComparison: Boolean(body.hasRankingOrComparison),
      emphasizesQuantity: Boolean(body.emphasizesQuantity),
      exposesRawData: Boolean(body.exposesRawData),
      allowsUserChallenge: Boolean(body.allowsUserChallenge),
      isLinearlyOptimizable: Boolean(body.isLinearlyOptimizable),
    });
  });

  app.post<{
    Body: {
      books?: Array<{
        bookId?: string;
        onShelf?: boolean;
        highlightCount?: number;
        noteCharCount?: number;
        chapterCount?: number;
        hasLongReview?: boolean;
      }>;
      historyScores?: number[];
    };
  }>('/api/statistics/quadrant', async (request, reply) => {
    const body = request.body ?? {};
    if (!Array.isArray(body.books)) {
      return reply.code(400).send({ error: 'books array is required' });
    }
    const inputs = body.books.map((book, index) => ({
      bookId: typeof book.bookId === 'string' ? book.bookId : `unknown-${index}`,
      onShelf: Boolean(book.onShelf),
      highlightCount: Number(book.highlightCount ?? 0),
      noteCharCount: Number(book.noteCharCount ?? 0),
      chapterCount: Number(book.chapterCount ?? 1),
      hasLongReview: Boolean(book.hasLongReview),
    }));
    const historyScores = Array.isArray(body.historyScores)
      ? body.historyScores.map((value) => Number(value)).filter((value) => Number.isFinite(value))
      : undefined;
    return computeQuadrantSummary(inputs, { historyScores });
  });

  app.post<{
    Body: {
      bookId?: string;
      highlights?: Array<{ id?: string; text?: string; time?: number }>;
      booksRead?: number;
      windowMonths?: number;
    };
  }>('/api/statistics/topic-spectrum', async (request, reply) => {
    const body = request.body ?? {};
    if (typeof body.bookId !== 'string' || body.bookId.length === 0) {
      return reply.code(400).send({ error: 'bookId is required' });
    }
    if (!Array.isArray(body.highlights)) {
      return reply.code(400).send({ error: 'highlights array is required' });
    }
    const highlights = body.highlights
      .filter((item) => item && typeof item.text === 'string' && item.text.length > 0)
      .map((item, index) => ({
        id: typeof item.id === 'string' && item.id.length > 0 ? item.id : `${body.bookId}-${index}`,
        text: item.text as string,
        time: typeof item.time === 'number' && Number.isFinite(item.time) ? item.time : 0,
      }));
    const booksRead =
      typeof body.booksRead === 'number' && Number.isFinite(body.booksRead) && body.booksRead >= 0
        ? Math.floor(body.booksRead)
        : 0;
    const windowMonths =
      typeof body.windowMonths === 'number' &&
      Number.isFinite(body.windowMonths) &&
      body.windowMonths >= 1
        ? Math.floor(body.windowMonths)
        : undefined;
    const now = Date.now();
    const defaultBook = createDefaultDataAccount(new Date(now).toISOString());
    const disabledDimensions = listDisabledDimensions(defaultBook);
    const topicSpectrumEntry = DEGRADE_MATRIX_REGISTRY.find((e) => e.key === 'topic_spectrum');
    const degradeAssessment = topicSpectrumEntry
      ? assessDegrade(topicSpectrumEntry, disabledDimensions)
      : undefined;
    const spectrum = computeTopicSpectrum({
      bookId: body.bookId,
      highlights,
      booksRead,
      windowMonths,
      now,
    });
    const validation = validateTopicSpectrum(spectrum);
    if (!validation.valid) {
      request.log.error({ errors: validation.errors }, 'topic spectrum validation failed');
      return reply.code(500).send({ error: 'Topic spectrum computation produced invalid result.' });
    }
    return { spectrum, degradeAssessment: degradeAssessment ?? null };
  });

  app.get('/api/data-account/assessments', async () => {
    const now = new Date().toISOString();
    const book = createDefaultDataAccount(now);
    const disabledDimensions = listDisabledDimensions(book);
    const assessments = assessAllDegrade(undefined, disabledDimensions);
    return { book, assessments, source: 'default' };
  });

  app.post<{
    Body: {
      entryKey?: string;
      enabled?: boolean;
    };
  }>('/api/data-account/toggle', async (request, reply) => {
    const body = request.body ?? {};
    if (typeof body.entryKey !== 'string' || body.entryKey.length === 0) {
      return reply.code(400).send({ error: 'entryKey is required' });
    }
    if (typeof body.enabled !== 'boolean') {
      return reply.code(400).send({ error: 'enabled boolean is required' });
    }
    const now = new Date().toISOString();
    const base = createDefaultDataAccount(now);
    const book = toggleEntry(base, body.entryKey, body.enabled, now);
    const disabledDimensions = listDisabledDimensions(book);
    const assessments = assessAllDegrade(undefined, disabledDimensions);
    return { book, assessments, source: 'default' };
  });

  app.get('/api/settings/data-account', async () => {
    const book = getDataAccountBook();
    return { book, source: 'persisted' };
  });

  app.put<{ Body: { enabled?: boolean } }>('/api/settings/minimal-mode', async (request, reply) => {
    const body = request.body ?? {};
    if (typeof body.enabled !== 'boolean') {
      return reply.code(400).send({ error: 'enabled boolean is required' });
    }
    try {
      const book = saveMinimalMode(body.enabled);
      const featureState = buildMinimalFeatureState(body.enabled, Date.now());
      return { book, featureState };
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'save minimal mode failed');
      return reply.code(500).send({ error: 'Save minimal mode failed.' });
    }
  });

  app.get<{ Params: { bookId: string } }>('/api/verification/coverage/:bookId', async (request, reply) => {
    const { bookId } = request.params;
    if (!bookId) {
      return reply.code(400).send({ error: 'bookId is required' });
    }
    const coverage = getVerificationCoverage(bookId);
    return { coverage };
  });

  app.post<{
    Body: {
      bookId?: string;
      highlights?: Array<{ id?: string; text?: string; chapterRef?: string; time?: number }>;
      maxQuestions?: number;
    };
  }>('/api/verification/questions', async (request, reply) => {
    const body = request.body ?? {};
    if (typeof body.bookId !== 'string' || body.bookId.length === 0) {
      return reply.code(400).send({ error: 'bookId is required' });
    }
    if (!Array.isArray(body.highlights)) {
      return reply.code(400).send({ error: 'highlights array is required' });
    }
    const highlights = body.highlights
      .filter((item) => item && typeof item.text === 'string' && item.text.length > 0)
      .map((item, index) => ({
        id: typeof item.id === 'string' && item.id.length > 0 ? item.id : `${body.bookId}-${index}`,
        text: item.text as string,
        chapterRef: typeof item.chapterRef === 'string' ? item.chapterRef : undefined,
        time: typeof item.time === 'number' && Number.isFinite(item.time) ? item.time : undefined,
      }));
    const maxQuestions =
      typeof body.maxQuestions === 'number' &&
      Number.isFinite(body.maxQuestions) &&
      body.maxQuestions >= 1
        ? Math.floor(body.maxQuestions)
        : undefined;
    try {
      const result = buildVerificationBank({
        bookId: body.bookId,
        highlights,
        maxQuestions,
      });
      return { result };
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'build verification bank failed');
      return reply.code(500).send({ error: 'Build verification bank failed.' });
    }
  });

  app.post<{
    Body: {
      bookId?: string;
      attempts?: Array<{
        questionId?: string;
        kind?: string;
        userAnswer?: string;
        reason?: string;
        claimedAt?: number;
      }>;
      questions?: Array<{
        questionId?: string;
        kind?: string;
        prompt?: string;
        options?: string[];
        expectedAnswer?: string;
        chapterRef?: string;
        minReasonLength?: number;
      }>;
    };
  }>('/api/verification/submit', async (request, reply) => {
    const body = request.body ?? {};
    if (typeof body.bookId !== 'string' || body.bookId.length === 0) {
      return reply.code(400).send({ error: 'bookId is required' });
    }
    if (!Array.isArray(body.attempts) || !Array.isArray(body.questions)) {
      return reply.code(400).send({ error: 'attempts and questions arrays are required' });
    }
    const attempts = body.attempts.map((a) => ({
      questionId: String(a.questionId ?? ''),
      kind: (a.kind === 'marking' ? 'marking' : 'sampling') as 'sampling' | 'marking',
      userAnswer: String(a.userAnswer ?? ''),
      reason: typeof a.reason === 'string' ? a.reason : undefined,
      correct: false,
      claimedAt: typeof a.claimedAt === 'number' ? a.claimedAt : Date.now(),
    }));
    const questions = body.questions.map((q) => ({
      questionId: String(q.questionId ?? ''),
      kind: (q.kind === 'marking' ? 'marking' : 'sampling') as 'sampling' | 'marking',
      prompt: String(q.prompt ?? ''),
      options: Array.isArray(q.options) ? q.options : undefined,
      expectedAnswer: typeof q.expectedAnswer === 'string' ? q.expectedAnswer : undefined,
      chapterRef: typeof q.chapterRef === 'string' ? q.chapterRef : undefined,
      minReasonLength: typeof q.minReasonLength === 'number' ? q.minReasonLength : undefined,
    }));
    try {
      const evaluation = evaluateVerificationAttempts(attempts, questions);
      const existing = getVerificationCoverage(body.bookId);
      const coverage = updateVerificationCoverage(
        body.bookId,
        existing,
        attempts,
        questions,
        Date.now(),
      );
      saveVerificationCoverage(coverage);
      return { evaluation, coverage };
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'submit verification failed');
      return reply.code(500).send({ error: 'Submit verification failed.' });
    }
  });

  app.get<{ Params: { bookId: string } }>('/api/truly-read/:bookId', async (request, reply) => {
    const { bookId } = request.params;
    if (!bookId) {
      return reply.code(400).send({ error: 'bookId is required' });
    }
    const query = request.query as Record<string, string | undefined>;
    const dims = {
      highlightCount: Number(query.highlightCount ?? 0),
      noteCharCount: Number(query.noteCharCount ?? 0),
      reviewCharCount: Number(query.reviewCharCount ?? 0),
      hasLongReview: query.hasLongReview === 'true',
      totalChapters: Math.max(1, Number(query.totalChapters ?? 1)),
      chaptersCovered: Number(query.chaptersCovered ?? 0),
      lastActivityTime: Number(query.lastActivityTime ?? 0),
      firstActivityTime: Number(query.firstActivityTime ?? 0),
    };
    const now = Date.now();
    const defaultBook = createDefaultDataAccount(new Date(now).toISOString());
    const disabledDimensions = listDisabledDimensions(defaultBook);
    const trulyReadEntry = DEGRADE_MATRIX_REGISTRY.find((e) => e.key === 'truly_read_score');
    const degradeAssessment = trulyReadEntry
      ? assessDegrade(trulyReadEntry, disabledDimensions)
      : undefined;
    const degradeConfidence = degradeAssessment?.confidence ?? 1;
    const score = computeTrulyReadScore(
      { bookId, dims },
      undefined,
      { now, degradeConfidence },
    );
    return { score, degradeAssessment: degradeAssessment ?? null };
  });

  app.post<{
    Params: { bookId: string };
    Body: {
      dims?: Record<string, unknown>;
      claims?: Array<{ questionId?: string; userAnswer?: string; correct?: boolean; claimedAt?: number }>;
    };
  }>('/api/truly-read/:bookId/verify', async (request, reply) => {
    const { bookId } = request.params;
    if (!bookId) {
      return reply.code(400).send({ error: 'bookId is required' });
    }
    const body = request.body ?? {};
    const rawDims = body.dims ?? {};
    const dims = {
      highlightCount: Number(rawDims.highlightCount ?? 0),
      noteCharCount: Number(rawDims.noteCharCount ?? 0),
      reviewCharCount: Number(rawDims.reviewCharCount ?? 0),
      hasLongReview: rawDims.hasLongReview === true,
      totalChapters: Math.max(1, Number(rawDims.totalChapters ?? 1)),
      chaptersCovered: Number(rawDims.chaptersCovered ?? 0),
      lastActivityTime: Number(rawDims.lastActivityTime ?? 0),
      firstActivityTime: Number(rawDims.firstActivityTime ?? 0),
    };
    const rawClaims = Array.isArray(body.claims) ? body.claims : [];
    const claims = rawClaims
      .filter((claim) => typeof claim?.questionId === 'string')
      .map((claim) => ({
        questionId: claim.questionId as string,
        userAnswer: typeof claim.userAnswer === 'string' ? claim.userAnswer : '',
        correct: claim.correct === true,
        claimedAt: typeof claim.claimedAt === 'number' ? claim.claimedAt : Date.now(),
      }));
    const verifiedAt = Date.now();
    const totalQuestions = Math.max(1, claims.length);
    const correctCount = claims.filter((claim) => claim.correct).length;
    const verification = {
      bookId,
      claims,
      passRate: claims.length > 0 ? correctCount / totalQuestions : 0,
      verifiedAt,
    };
    const now = Date.now();
    const defaultBook = createDefaultDataAccount(new Date(now).toISOString());
    const disabledDimensions = listDisabledDimensions(defaultBook);
    const trulyReadEntry = DEGRADE_MATRIX_REGISTRY.find((e) => e.key === 'truly_read_score');
    const degradeAssessment = trulyReadEntry
      ? assessDegrade(trulyReadEntry, disabledDimensions)
      : undefined;
    const degradeConfidence = degradeAssessment?.confidence ?? 1;
    const score = computeTrulyReadScore(
      { bookId, dims },
      verification,
      { now, degradeConfidence },
    );
    return { score, verification, degradeAssessment: degradeAssessment ?? null };
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
