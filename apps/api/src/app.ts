import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import cron from 'node-cron';
import Fastify from 'fastify';
import { Readable, Transform } from 'node:stream';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
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
  getMaterialDeletionImpact,
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
  getWorkspaceOverview,
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
  persistAgentChatTurn,
  listAgentChatSessions,
  getAgentChatSession,
  renameAgentChatSession,
  deleteAgentChatSession,
  getAgentChatRawMessages,
  truncateAgentChatSessionForRetry,
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
  searchWorkspaceCards,
  searchWorkspaceMaterials,
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
  getHiddenInterestHint,
  computeWeReadQuadrantSummary,
  computeWeReadGlobalTopicSpectrum,
  setHiddenInterestPermanentlyDismissed,
  dismissHiddenInterestBook,
  markHiddenInterestHintShown,
  exportDataPortability,
  listDataPortabilityRecords,
  revokeDataPortabilityExport,
  getReaderModeProfile,
  startReaderModeRollback,
  cancelReaderModeRollback,
  checkUrlForSsrf,
  createSsrfSafeFetch,
  retryMaterialCardGeneration,
} from '@zhijing/core';
import {
  startOrchestratorSession,
  truncateSessionForRetry,
  type OrchestratorSession,
} from '@zhijing/agent';
import { getActiveRoutes, isRoutesOverriddenByEnv, buildRouteAdvisor } from '@zhijing/pi-runtime';
import type {
  AgentMessage,
} from '@earendil-works/pi-agent-core';
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
  AgentChatToolCallRecord,
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
  DataPortabilityFormat,
  AudienceTier,
  RecommendationBucket,
} from '@zhijing/shared';
import {
  INTAKE_AUDIENCE_VALUES,
  INTAKE_DEPTH_VALUES,
  INTAKE_SCOPE_VALUES,
  AGENT_TASK_TYPE_VALUES,
  USER_MEMORY_SCOPE_VALUES,
  USER_MEMORY_SOURCE_VALUES,
  DECISION_LOG_KIND_VALUES,
  DATA_PORTABILITY_FORMAT_VALUES,
  AUDIENCE_TIER_VALUES,
  RECOMMENDATION_BUCKET_VALUES,
} from '@zhijing/shared';

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

/**
 * 通配符 origin，禁止作为 CORS 允许来源。
 * 防止误配置 ZHIJING_ALLOWED_ORIGINS=* 导致任意站点跨域访问。
 */
const CORS_WILDCARD_ORIGIN = '*';

/**
 * 简易内存限流窗口时长（毫秒），60 秒。
 */
const RATE_LIMIT_WINDOW_MS = 60_000;

/**
 * 简易内存限流单 IP 单路径最大请求数。
 */
const RATE_LIMIT_MAX_REQUESTS = 30;

/**
 * 需要限流的敏感路径前缀。
 * 这些路径触发 LLM 调用或外部抓取，成本较高，需防止滥用。
 */
const RATE_LIMITED_PATH_PREFIXES = [
  '/agent/stream',
  '/api/intake',
  '/api/weread/sync',
  '/api/weread/signals/refresh',
];

/**
 * 限流桶：key 为 `${ip}:${pathPrefix}`，value 为 { count, resetAt }。
 * 模块级 Map，进程内共享，不持久化。
 */
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

/**
 * SSE 流空闲超时阈值（毫秒），5 分钟。
 * 超过此时间无任何事件写入则主动 abort 会话并关闭连接，
 * 防止 LLM 卡死或网络异常导致连接无限挂起。
 */
const SSE_IDLE_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * 会话 id 合法格式正则：sess_{timestamp}_{base36}。
 * 用于校验前端传入的 sessionId，防止注入控制字符或超长字符串。
 */
const SESSION_ID_PATTERN = /^sess_\d+_[a-z0-9]{4,32}$/;
const CHAT_SESSION_TITLE_MAX_LENGTH = 40;

type AgentRunTokenStats = {
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
};

type AgentToolCallDraft = {
  toolCallId: string;
  toolName: string;
  args: unknown;
  startedAt: string;
  startedMs: number;
};

function addNullableNumber(current: number | null, value: number | null | undefined): number | null {
  if (typeof value !== 'number') return current;
  return (current ?? 0) + value;
}

function deriveAgentChatSessionTitle(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) return '未命名会话';
  return trimmed.length > CHAT_SESSION_TITLE_MAX_LENGTH
    ? `${trimmed.slice(0, CHAT_SESSION_TITLE_MAX_LENGTH)}...`
    : trimmed;
}

/**
 * 判断路径是否命中限流前缀。
 * @param url - 请求 URL
 * @returns 命中的限流前缀，未命中返回 null
 * @author fxbin
 */
function matchRateLimitedPath(url: string): string | null {
  for (const prefix of RATE_LIMITED_PATH_PREFIXES) {
    if (url.startsWith(prefix)) return prefix;
  }
  return null;
}

/**
 * 检查请求是否超过限流阈值。
 * 超限时返回 true，调用方应返回 429。
 * @param ip - 客户端 IP
 * @param pathPrefix - 命中的限流前缀
 * @returns 是否超过限流阈值
 * @author fxbin
 */
function isRateLimited(ip: string, pathPrefix: string): boolean {
  const key = `${ip}:${pathPrefix}`;
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_LIMIT_MAX_REQUESTS;
}

const INTAKE_AUDIENCE_SET = new Set<string>(INTAKE_AUDIENCE_VALUES);
const INTAKE_DEPTH_SET = new Set<string>(INTAKE_DEPTH_VALUES);
const INTAKE_SCOPE_SET = new Set<string>(INTAKE_SCOPE_VALUES);

const SOCRATIC_TRIGGER_VALUES: readonly SocraticTrigger[] = ['skeleton_card', 'semantic_tension', 'manual'];
const SOCRATIC_TRIGGER_SET = new Set<string>(SOCRATIC_TRIGGER_VALUES);

const AGENT_TASK_TYPE_SET = new Set<string>(AGENT_TASK_TYPE_VALUES);
const USER_MEMORY_SCOPE_SET = new Set<string>(USER_MEMORY_SCOPE_VALUES);
const USER_MEMORY_SOURCE_SET = new Set<string>(USER_MEMORY_SOURCE_VALUES);
const DECISION_LOG_KIND_SET = new Set<string>(DECISION_LOG_KIND_VALUES);

/**
 * 反虚荣门禁允许评估的统计视图 ID 白名单。
 * 防止前端任意构造 viewId 探测未注册视图的可见性。
 */
const STATISTICS_GATE_ALLOWED_VIEW_IDS = new Set<string>([
  'weReadStatsBand',
  'wereadQuadrant',
  'topicSpectrum',
  'readingHealth',
]);

/**
 * 反虚荣门禁必须为 boolean 的字段名集合。
 * 用于在 evaluate-gate 端点逐字段校验类型，非 boolean 一律拒绝。
 */
const STATISTICS_GATE_BOOLEAN_FIELDS = [
  'dependsOnBehaviorTrace',
  'sharedAcrossUsers',
  'hasRankingOrComparison',
  'emphasizesQuantity',
  'exposesRawData',
  'allowsUserChallenge',
  'isLinearlyOptimizable',
] as const;

const AGENT_USAGE_DEFAULT_LIMIT = 100;
const AGENT_USAGE_MAX_LIMIT = 500;

/**
 * Pre-fetch 检索每个集合（cards / materials）的默认 top-K。
 * 取 5 条平衡召回率与上下文体积，避免 token 膨胀。
 */
const PREFETCH_SEARCH_TOP_K = 5;

/**
 * Pre-fetch 检索关键词最大长度，超过则截断，避免长问题场景下整段话做 TF-IDF 失效。
 */
const PREFETCH_QUERY_MAX_LENGTH = 50;

/**
 * 构造 Pre-fetch 上下文注入文本。
 *
 * 设计目的：LLM 倾向于改写用户短 query 导致召回失败，Pre-fetch 用用户原始消息
 * 在代码层做一次确定性检索，把命中结果作为上下文注入 LLM 输入，让 LLM 优先基于
 * 系统预检索结果作答，而非自行改写 query 调 search 工具。
 *
 * 触发条件：用户消息长度 >= 2 且非纯空白；命中结果为空时不注入，避免污染 LLM 上下文。
 *
 * @param workspaceId - 工作区 id
 * @param userMessage - 用户原始消息
 * @returns 注入文本，空字符串表示不注入
 * @author fxbin
 */
function buildPrefetchContext(workspaceId: string, userMessage: string): string {
  const trimmed = userMessage.trim();
  if (trimmed.length < 2) return '';
  const query = trimmed.slice(0, PREFETCH_QUERY_MAX_LENGTH);
  let cards: ReturnType<typeof searchWorkspaceCards> = [];
  let materials: ReturnType<typeof searchWorkspaceMaterials> = [];
  try {
    cards = searchWorkspaceCards(workspaceId, query, PREFETCH_SEARCH_TOP_K);
    materials = searchWorkspaceMaterials(workspaceId, query, PREFETCH_SEARCH_TOP_K);
  } catch {
    return '';
  }
  if (cards.length === 0 && materials.length === 0) return '';
  const lines: string[] = [
    '=== 系统预检索结果（基于用户原始输入，覆盖 search_cards + search_materials） ===',
    `原始输入：${query}`,
  ];
  if (cards.length > 0) {
    lines.push(`知识卡片（命中 ${cards.length} 张）：`);
    for (const card of cards) {
      lines.push(`- [${card.type}] ${card.title}：${card.body.slice(0, 120)}`);
    }
  }
  if (materials.length > 0) {
    lines.push(`来源资料（命中 ${materials.length} 条）：`);
    for (const m of materials) {
      lines.push(`- ${m.title}：${m.preview.slice(0, 200)}`);
    }
  }
  lines.push('=== 预检索结束。请优先基于以上结果作答；若不足，再调用 search_cards / search_materials 补充检索 ===');
  return lines.join('\n');
}

/**
 * inspect 调试路由访问令牌。
 * 仅当环境变量 ZHIJING_INSPECT_TOKEN 被设置时，inspect 路由才可用；
 * 客户端必须通过 x-inspect-token 请求头传入相同令牌。
 * 未设置时 inspect 路由返回 404，避免任意客户端拖库。
 * @author fxbin
 */
const INSPECT_TOKEN = process.env.ZHIJING_INSPECT_TOKEN ?? '';

/**
 * 访问密码门禁密码。
 * 仅当环境变量 ZHIJING_ACCESS_PASSWORD 被设置时，全站门禁才启用；
 * 未设置时所有接口可自由访问（本地开发场景）。
 * 公网部署必须设置此变量，防止未授权访问。
 * @author fxbin
 */
const ACCESS_PASSWORD = process.env.ZHIJING_ACCESS_PASSWORD ?? '';

/**
 * 访问令牌有效期（毫秒），7 天。
 * 令牌由密码 + 过期时间戳经 HMAC-SHA256 签名生成，无需持久化存储。
 * @author fxbin
 */
const ACCESS_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * 访问令牌签名密钥。
 * 优先使用环境变量 ZHIJING_ACCESS_TOKEN_SECRET，未设置时由密码派生，
 * 保证部署后重启不影响已签发令牌的有效性。
 * @author fxbin
 */
const ACCESS_TOKEN_SECRET = process.env.ZHIJING_ACCESS_TOKEN_SECRET ?? ACCESS_PASSWORD;

/**
 * 门禁放行的公开路径前缀。
 * 健康检查、登录、图片/视频代理（带 SSRF 校验）不需鉴权。
 * @author fxbin
 */
const PUBLIC_PATH_PREFIXES = [
  '/health',
  '/api/health',
  '/api/auth/login',
  '/api/auth/status',
  '/api/proxy-image',
  '/api/proxy-video',
];

/**
 * LLM 调用相关路径前缀。
 * 这些路径触发 LLM 调用，成本较高，需按日限额控制。
 * @author fxbin
 */
const LLM_PATH_PREFIXES = [
  '/agent/stream',
  '/api/intake',
  '/api/socratic',
];

/**
 * LLM 调用相关路径模式。
 * 用于匹配动态路径，如工作区 agent stream。
 * @author fxbin
 */
const LLM_PATH_PATTERNS = [
  /^\/api\/workspaces\/[^/]+\/agent\/stream$/,
];

/**
 * 单 IP 每日 LLM 调用最大次数。
 * 超过此限额返回 429，防止演示 Key 额度被恶意耗尽。
 * @author fxbin
 */
const LLM_DAILY_LIMIT = 80;

/**
 * LLM 日限额桶：key 为 ip，value 为 { count, resetAt }。
 * 按自然日重置（UTC+8 0 点），进程内 Map，不持久化。
 * @author fxbin
 */
const llmDailyBuckets = new Map<string, { count: number; resetAt: number }>();

/**
 * proxy-image 单次响应最大字节数（50MB）。
 * 防止 OOM 攻击与带宽放大。
 * @author fxbin
 */
const PROXY_MAX_BYTES = 50 * 1024 * 1024;

/**
 * proxy-video 完整响应最大字节数（200MB）。
 */
const PROXY_VIDEO_MAX_BYTES = 200 * 1024 * 1024;

/**
 * proxy-video 单个 Range 响应最大字节数（20MB）。
 */
const PROXY_VIDEO_MAX_RANGE_BYTES = 20 * 1024 * 1024;

/**
 * proxy-video 上游首包超时（毫秒）。
 */
const PROXY_VIDEO_FETCH_TIMEOUT_MS = 30_000;

/**
 * SSRF 安全 fetch 单例：用于 proxy-image / proxy-video。
 * 每次重定向后会重新校验目标 URL，避免外部 302 重定向到内网地址。
 * @author fxbin
 */
const ssrfSafeFetch = createSsrfSafeFetch();

function parsePositiveIntegerHeader(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function buildSafeVideoRangeHeader(rawRange: string | undefined): string | null {
  if (!rawRange) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(rawRange.trim());
  if (!match) return null;
  const startRaw = match[1];
  const endRaw = match[2];
  if (!startRaw && !endRaw) return null;
  if (!startRaw) {
    const suffixLength = Number.parseInt(endRaw, 10);
    if (!Number.isFinite(suffixLength) || suffixLength < 1 || suffixLength > PROXY_VIDEO_MAX_RANGE_BYTES) {
      return null;
    }
    return `bytes=-${suffixLength}`;
  }
  const start = Number.parseInt(startRaw, 10);
  if (!Number.isFinite(start) || start < 0) return null;
  if (!endRaw) {
    return `bytes=${start}-${start + PROXY_VIDEO_MAX_RANGE_BYTES - 1}`;
  }
  const end = Number.parseInt(endRaw, 10);
  if (!Number.isFinite(end) || end < start) return null;
  const requestedLength = end - start + 1;
  if (requestedLength > PROXY_VIDEO_MAX_RANGE_BYTES) return null;
  return rawRange.trim();
}

function createByteLimitStream(maxBytes: number) {
  let transferred = 0;
  return new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      transferred += chunk.byteLength;
      if (transferred > maxBytes) {
        callback(new Error('Proxy response exceeded byte limit.'));
        return;
      }
      callback(null, chunk);
    },
  });
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function resolveAllowedOrigins(): string[] {
  const raw = process.env.ZHIJING_ALLOWED_ORIGINS;
  if (!raw) return DEFAULT_ALLOWED_ORIGINS;
  const origins = raw
    .split(',')
    .map((item) => item.trim())
    .filter((item) => Boolean(item) && item !== CORS_WILDCARD_ORIGIN);
  return origins.length > 0 ? origins : DEFAULT_ALLOWED_ORIGINS;
}

/**
 * 校验 inspect 调试路由的访问令牌。
 * 未配置令牌或令牌不匹配时返回 false，调用方应返回 404 或 403。
 * @author fxbin
 */
function isInspectAllowed(request: { headers: Record<string, string | string[] | undefined> }): boolean {
  if (!INSPECT_TOKEN) return false;
  const headerValue = request.headers['x-inspect-token'];
  const provided = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  return typeof provided === 'string' && provided.length > 0 && provided === INSPECT_TOKEN;
}

/**
 * 判断路径是否属于公开放行路径。
 * @param url - 请求 URL
 * @returns 是否放行
 * @author fxbin
 */
function isPublicPath(url: string): boolean {
  return PUBLIC_PATH_PREFIXES.some((prefix) => url === prefix || url.startsWith(prefix + '/') || url.startsWith(prefix));
}

/**
 * 判断路径是否属于 LLM 调用路径。
 * 先匹配前缀，再匹配动态路径模式。
 * @param url - 请求 URL
 * @returns 是否命中
 * @author fxbin
 */
function matchLlmPath(url: string): boolean {
  return LLM_PATH_PREFIXES.some((prefix) => url.startsWith(prefix))
    || LLM_PATH_PATTERNS.some((pattern) => pattern.test(url));
}

/**
 * 签发访问令牌。
 * 令牌格式：{expireAt}.{hmac}，hmac = HMAC-SHA256(secret, password + ':' + expireAt)。
 * @returns 签发的访问令牌字符串
 * @author fxbin
 */
function issueAccessToken(): string {
  const expireAt = Date.now() + ACCESS_TOKEN_TTL_MS;
  const payload = `${ACCESS_PASSWORD}:${expireAt}`;
  const hmac = createHmac('sha256', ACCESS_TOKEN_SECRET).update(payload).digest('hex');
  return `${expireAt}.${hmac}`;
}

/**
 * 校验访问令牌。
 * @param token - 待校验的令牌字符串
 * @returns 是否有效
 * @author fxbin
 */
function verifyAccessToken(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const expireAt = Number.parseInt(parts[0], 10);
  if (!Number.isFinite(expireAt) || expireAt < Date.now()) return false;
  const payload = `${ACCESS_PASSWORD}:${expireAt}`;
  const expectedHmac = createHmac('sha256', ACCESS_TOKEN_SECRET).update(payload).digest('hex');
  const provided = Buffer.from(parts[1], 'hex');
  const expected = Buffer.from(expectedHmac, 'hex');
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}

/**
 * 从请求中提取访问令牌。
 * 优先级：X-Access-Token 头 > access_token cookie > query 参数 access_token。
 * @param request - Fastify 请求对象
 * @returns 访问令牌字符串或空
 * @author fxbin
 */
function extractAccessToken(request: { headers: Record<string, string | string[] | undefined>; query?: unknown }): string {
  const headerValue = request.headers['x-access-token'];
  if (typeof headerValue === 'string' && headerValue.length > 0) return headerValue;
  if (Array.isArray(headerValue) && headerValue.length > 0) return headerValue[0];
  const cookieHeader = request.headers.cookie;
  if (typeof cookieHeader === 'string') {
    const match = /access_token=([^;]+)/.exec(cookieHeader);
    if (match) return match[1];
  }
  const query = request.query as Record<string, unknown> | undefined;
  const queryToken = query?.access_token;
  if (typeof queryToken === 'string' && queryToken.length > 0) return queryToken;
  return '';
}

/**
 * 计算下一个自然日 0 点（UTC+8）的时间戳。
 * @returns 下个自然日 0 点的毫秒时间戳
 * @author fxbin
 */
function nextDayResetTimestamp(): number {
  const now = new Date();
  const nextDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const utc8NextDay = new Date(nextDay.getTime() + 8 * 60 * 60 * 1000);
  utc8NextDay.setUTCHours(0, 0, 0, 0);
  return utc8NextDay.getTime() - 8 * 60 * 60 * 1000;
}

/**
 * 检查 IP 是否超过每日 LLM 调用限额。
 * @param ip - 客户端 IP
 * @returns 是否超限
 * @author fxbin
 */
function isLlmQuotaExceeded(ip: string): boolean {
  const now = Date.now();
  const bucket = llmDailyBuckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    llmDailyBuckets.set(ip, { count: 1, resetAt: nextDayResetTimestamp() });
    return false;
  }
  bucket.count += 1;
  return bucket.count > LLM_DAILY_LIMIT;
}

export async function buildApi() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
    },
    bodyLimit: 16 * 1024 * 1024,
  });

  app.register(cors, {
    origin: resolveAllowedOrigins(),
  });

  app.addHook('onRequest', async (request, reply) => {
    const url = request.url;
    if (isPublicPath(url)) return;
    if (ACCESS_PASSWORD) {
      const token = extractAccessToken(request);
      if (!token || !verifyAccessToken(token)) {
        return reply.code(401).send({ error: 'Access token required.', code: 'AUTH_REQUIRED' });
      }
    }
    const pathPrefix = matchRateLimitedPath(url);
    if (pathPrefix) {
      const ip = request.ip;
      if (isRateLimited(ip, pathPrefix)) {
        return reply.code(429).send({ error: 'Too many requests. Please retry later.' });
      }
    }
    if (matchLlmPath(url)) {
      const ip = request.ip;
      if (isLlmQuotaExceeded(ip)) {
        return reply.code(429).send({ error: 'Daily LLM quota exceeded. Please retry tomorrow.', code: 'LLM_QUOTA_EXCEEDED' });
      }
    }
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof KnowledgeCoreError) {
      return reply.code(error.statusCode).send({ error: error.message });
    }
    request.log.error({ error }, 'unhandled error');
    return reply.code(500).send({ error: 'Internal server error.' });
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

  /**
   * 访问密码登录端点。
   * 仅当 ZHIJING_ACCESS_PASSWORD 已配置时启用门禁。
   * 未配置密码时返回门禁未启用信息，便于前端判断。
   */
  app.post<{ Body: { password?: string } }>('/api/auth/login', async (request, reply) => {
    if (!ACCESS_PASSWORD) {
      return { ok: true, gateEnabled: false, token: '' };
    }
    const provided = typeof request.body?.password === 'string' ? request.body.password : '';
    if (!provided || provided !== ACCESS_PASSWORD) {
      return reply.code(401).send({ error: 'Invalid password.', code: 'INVALID_PASSWORD' });
    }
    const token = issueAccessToken();
    return { ok: true, gateEnabled: true, token, expiresIn: ACCESS_TOKEN_TTL_MS };
  });

  /**
   * 查询门禁状态。
   * 前端据此判断是否需要弹出密码框。
   */
  app.get('/api/auth/status', async () => ({
    gateEnabled: Boolean(ACCESS_PASSWORD),
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

  app.get('/api/inspect/tables', async (request, reply) => {
    if (!isInspectAllowed(request)) {
      return reply.code(404).send({ error: 'Not Found' });
    }
    return { tables: listInspectTables() };
  });

  app.post<{ Body: { sql?: string; limit?: number } }>('/api/inspect/query', async (request, reply) => {
    if (!isInspectAllowed(request)) {
      return reply.code(404).send({ error: 'Not Found' });
    }
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
    const ssrfCheck = checkUrlForSsrf(imageUrl);
    if (!ssrfCheck.ok) {
      return reply.code(400).send({ error: 'Blocked image URL.' });
    }
    try {
      const isDouyinImage = imageUrl.includes('douyinpic.com') || imageUrl.includes('byteimg.com');
      const response = await ssrfSafeFetch(imageUrl, {
        headers: {
          Referer: isDouyinImage ? 'https://www.douyin.com/' : '',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });
      if (!response.ok) {
        return reply.code(response.status).send({ error: 'Image fetch failed.' });
      }
      const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
      if (!contentType.startsWith('image/')) {
        return reply.code(400).send({ error: 'URL did not return an image.' });
      }
      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength > PROXY_MAX_BYTES) {
        return reply.code(413).send({ error: 'Image too large to proxy.' });
      }
      return reply
        .header('Content-Type', contentType)
        .header('Cache-Control', 'public, max-age=3600')
        .send(Buffer.from(arrayBuffer));
    } catch (error) {
      request.log.error({ error }, 'proxy image failed');
      return reply.code(502).send({ error: 'Image proxy failed.' });
    }
  });

  app.get<{ Querystring: { url?: string } }>('/api/proxy-video', async (request, reply) => {
    const videoUrl = request.query.url;
    if (!videoUrl || !/^https?:\/\//i.test(videoUrl)) {
      return reply.code(400).send({ error: 'Invalid video URL.' });
    }
    const ssrfCheck = checkUrlForSsrf(videoUrl);
    if (!ssrfCheck.ok) {
      return reply.code(400).send({ error: 'Blocked video URL.' });
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
      const safeRange = buildSafeVideoRangeHeader(range);
      if (range && !safeRange) {
        return reply.code(416).send({ error: 'Video range is too large or invalid.' });
      }
      if (safeRange) {
        headers['Range'] = safeRange;
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), PROXY_VIDEO_FETCH_TIMEOUT_MS);
      reply.raw.on('close', () => {
        if (!reply.raw.writableEnded) {
          controller.abort();
        }
      });
      let response: Awaited<ReturnType<typeof ssrfSafeFetch>>;
      try {
        response = await ssrfSafeFetch(videoUrl, { headers, signal: controller.signal });
      } finally {
        clearTimeout(timeout);
      }
      if (!response.ok && response.status !== 206) {
        return reply.code(response.status).send({ error: 'Video fetch failed.' });
      }
      const contentType = response.headers.get('content-type') ?? 'video/mp4';
      if (!contentType.startsWith('video/') && !contentType.startsWith('application/')) {
        return reply.code(400).send({ error: 'URL did not return a video.' });
      }
      const maxBytes = response.status === 206 ? PROXY_VIDEO_MAX_RANGE_BYTES : PROXY_VIDEO_MAX_BYTES;
      const parsedContentLength = parsePositiveIntegerHeader(response.headers.get('content-length'));
      if (parsedContentLength !== null && parsedContentLength > maxBytes) {
        return reply.code(413).send({ error: 'Video too large to proxy.' });
      }
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
      const upstreamBody = response.body;
      if (!upstreamBody) {
        return reply.code(502).send({ error: 'Video stream unavailable.' });
      }
      const sourceStream = Readable.fromWeb(
        upstreamBody as Parameters<typeof Readable.fromWeb>[0],
      );
      const limitStream = createByteLimitStream(maxBytes);
      let streamErrorHandled = false;
      const handleStreamError = (error: Error) => {
        if (streamErrorHandled) return;
        streamErrorHandled = true;
        if (isAbortError(error) || reply.raw.destroyed) {
          request.log.debug({ error }, 'proxy video stream closed');
        } else {
          request.log.error({ error }, 'proxy video stream failed');
        }
        if (!reply.raw.destroyed) {
          reply.raw.destroy(isAbortError(error) ? undefined : error);
        }
      };
      sourceStream.on('error', handleStreamError);
      limitStream.on('error', handleStreamError);
      const nodeStream = sourceStream.pipe(limitStream);
      return reply
        .code(response.status === 206 ? 206 : 200)
        .headers(replyHeaders)
        .send(nodeStream);
    } catch (error) {
      request.log.error({ error }, 'proxy video failed');
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
        baseUrl: typeof request.body?.baseUrl === 'string' ? request.body.baseUrl : undefined,
        enabled: typeof request.body?.enabled === 'boolean' ? request.body.enabled : undefined,
        fallbackToMock: typeof request.body?.fallbackToMock === 'boolean' ? request.body.fallbackToMock : undefined,
        clearApiKey: request.body?.clearApiKey === true,
        clearBaseUrl: request.body?.clearBaseUrl === true,
      });
    } catch (error) {
      request.log.error({ error }, 'model provider settings save failed');
      return reply.code(500).send({ error: 'Model provider settings save failed.' });
    }
  });

  app.post<{ Body: Partial<TestModelProviderSettingsRequest> }>('/api/settings/model-provider/test', async (request) => testModelProviderSettings({
    profileId: typeof request.body?.profileId === 'string' ? request.body.profileId.trim() : undefined,
    provider: typeof request.body?.provider === 'string' ? request.body.provider.trim() : undefined,
    model: typeof request.body?.model === 'string' ? request.body.model.trim() : undefined,
    apiKey: typeof request.body?.apiKey === 'string' ? request.body.apiKey : undefined,
    baseUrl: typeof request.body?.baseUrl === 'string' ? request.body.baseUrl.trim() : undefined,
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
        baseUrl: typeof request.body?.baseUrl === 'string' ? request.body.baseUrl : undefined,
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
        baseUrl: typeof request.body?.baseUrl === 'string' ? request.body.baseUrl : undefined,
        enabled: typeof request.body?.enabled === 'boolean' ? request.body.enabled : undefined,
        fallbackToMock: typeof request.body?.fallbackToMock === 'boolean' ? request.body.fallbackToMock : undefined,
        isDefault: typeof request.body?.isDefault === 'boolean' ? request.body.isDefault : undefined,
        clearApiKey: request.body?.clearApiKey === true,
        clearBaseUrl: request.body?.clearBaseUrl === true,
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
    const overview = getWorkspaceOverview(request.params.id);
    if (!overview) {
      return reply.code(404).send({ error: 'Knowledge base not found.' });
    }
    return overview;
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
      const providedSessionId = typeof request.body?.sessionId === 'string' && request.body.sessionId.length > 0
        ? request.body.sessionId
        : '';
      if (providedSessionId && !SESSION_ID_PATTERN.test(providedSessionId)) {
        return reply.code(400).send({ error: 'Invalid sessionId format.' });
      }
      const sessionId = providedSessionId || `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const isWriting = Boolean(request.body?.isWriting);
      const retryRequested = Boolean(request.body?.retryLastTurn);

      if (retryRequested) {
        const memoryRetryResult = truncateSessionForRetry(sessionId, request.params.id);
        const persistedRetryResult = truncateAgentChatSessionForRetry(sessionId, request.params.id);
        const retryResult = persistedRetryResult.truncated ? persistedRetryResult : memoryRetryResult;
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

      const priorMessages = getAgentChatRawMessages(sessionId, request.params.id) as AgentMessage[] | null;
      const runId = `run_${Date.now()}_${randomUUID()}`;
      const runStartedAt = new Date().toISOString();
      const runStartMs = Date.now();
      const tokenStats: AgentRunTokenStats = { inputTokens: null, outputTokens: null, costUsd: null };
      const pendingToolCalls = new Map<string, AgentToolCallDraft>();
      const persistedToolCalls: AgentChatToolCallRecord[] = [];
      let runStatus: 'completed' | 'failed' | 'aborted' = 'completed';
      let runErrorMessage: string | null = null;

      reply.hijack();
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        'X-Session-Id': sessionId,
      });

      const idleTimer = setTimeout(() => {
        request.log.warn({ sessionId }, 'agent stream idle timeout, aborting');
        session?.abort();
      }, SSE_IDLE_TIMEOUT_MS);
      const send = (event: AgentStreamEvent) => {
        idleTimer.refresh();
        if (event.type === 'message_end' && event.usage) {
          tokenStats.inputTokens = addNullableNumber(tokenStats.inputTokens, event.usage.inputTokens);
          tokenStats.outputTokens = addNullableNumber(tokenStats.outputTokens, event.usage.outputTokens);
          tokenStats.costUsd = addNullableNumber(tokenStats.costUsd, event.usage.costUsd);
        }
        if (event.type === 'tool_start') {
          pendingToolCalls.set(event.toolCallId, {
            toolCallId: event.toolCallId,
            toolName: event.toolName,
            args: event.args,
            startedAt: new Date().toISOString(),
            startedMs: Date.now(),
          });
        }
        if (event.type === 'tool_end') {
          const draft = pendingToolCalls.get(event.toolCallId);
          const endedAt = new Date().toISOString();
          const endedMs = Date.now();
          persistedToolCalls.push({
            id: `tool_${runId}_${event.toolCallId}`,
            runId,
            sessionId,
            workspaceId: request.params.id,
            toolCallId: event.toolCallId,
            toolName: event.toolName,
            args: draft?.args ?? null,
            result: event.result,
            details: event.details,
            isError: event.isError,
            startedAt: draft?.startedAt ?? endedAt,
            endedAt,
            durationMs: draft ? Math.max(0, endedMs - draft.startedMs) : 0,
          });
          pendingToolCalls.delete(event.toolCallId);
        }
        if (event.type === 'error') {
          runStatus = 'failed';
          runErrorMessage = event.message;
        }
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

      send({
        type: 'session_info',
        provider: credentials.provider,
        model: credentials.model,
      });

      const prefetchContext = buildPrefetchContext(request.params.id, message);
      const effectiveMessage = prefetchContext
        ? `${prefetchContext}\n\n用户问题：${message}`
        : message;

      const session = startOrchestratorSession(
        {
          workspaceId: request.params.id,
          message: effectiveMessage,
          intent,
          decision,
          credentials: {
            provider: credentials.provider,
            model: credentials.model,
            apiKey: credentials.apiKey,
            baseUrl: credentials.baseUrl,
          },
          isWriting,
          priorMessages: priorMessages ?? undefined,
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
          onSessionPersist: (info) => {
            const endedAt = new Date().toISOString();
            try {
              persistAgentChatTurn({
                session: {
                  sessionId: info.sessionId,
                  workspaceId: info.workspaceId,
                  title: deriveAgentChatSessionTitle(message),
                  messageCount: info.messages.length,
                  lastUsedAt: new Date(info.lastUsedAt).toISOString(),
                  createdAt: runStartedAt,
                  updatedAt: endedAt,
                  provider: credentials.provider,
                  model: credentials.model,
                },
                rawMessages: info.messages,
                run: {
                  id: runId,
                  sessionId: info.sessionId,
                  workspaceId: info.workspaceId,
                  provider: credentials.provider,
                  model: credentials.model,
                  inputTokens: tokenStats.inputTokens,
                  outputTokens: tokenStats.outputTokens,
                  cacheReadTokens: null,
                  cacheWriteTokens: null,
                  costUsd: tokenStats.costUsd,
                  durationMs: Date.now() - runStartMs,
                  status: runStatus,
                  errorMessage: runErrorMessage,
                  startedAt: runStartedAt,
                  endedAt,
                  toolCallCount: persistedToolCalls.length,
                },
                toolCalls: persistedToolCalls,
              });
            } catch (persistError) {
              request.log.warn({ persistError, sessionId: info.sessionId }, 'agent chat persistence failed');
            }
          },
        },
        sessionId,
      );

      activeAgents.set(sessionId, session);

      reply.raw.on('close', () => {
        if (!reply.raw.writableEnded) {
          runStatus = 'aborted';
          runErrorMessage = 'Client connection closed before stream completed.';
          session.abort();
        }
      });

      try {
        await session.done;
      } finally {
        clearTimeout(idleTimer);
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
      if (!SESSION_ID_PATTERN.test(sessionId)) {
        return reply.code(400).send({ error: 'Invalid sessionId format.' });
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
      const sessions = listAgentChatSessions(request.params.id);
      return { sessions };
    },
  );

  app.get<{ Params: { id: string; sessionId: string } }>(
    '/api/workspaces/:id/agent/sessions/:sessionId',
    async (request, reply) => {
      const detail = getAgentChatSession(request.params.sessionId, request.params.id);
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
      const ok = renameAgentChatSession(request.params.sessionId, request.params.id, title);
      if (!ok) {
        return reply.code(404).send({ error: 'Session not found or title empty.' });
      }
      return { ok: true };
    },
  );

  app.delete<{ Params: { id: string; sessionId: string } }>(
    '/api/workspaces/:id/agent/sessions/:sessionId',
    async (request, reply) => {
      const ok = deleteAgentChatSession(request.params.sessionId, request.params.id);
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

  app.get<{ Querystring: { refresh?: string } }>('/api/transcription/capability', async (request, reply) => {
    try {
      const forceRefresh = request.query.refresh === '1' || request.query.refresh === 'true';
      return await getTranscriptionCapabilityReport(forceRefresh);
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

  app.get<{ Params: { id: string } }>('/api/materials/:id/delete-impact', async (request, reply) => {
    try {
      return getMaterialDeletionImpact(request.params.id);
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'material delete impact failed');
      return reply.code(500).send({ error: 'Material delete impact failed.' });
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

  app.post<{ Params: { id: string } }>('/api/materials/:id/regenerate-cards', async (request, reply) => {
    try {
      const result = await retryMaterialCardGeneration(request.params.id);
      return { ok: true, cardCount: result.cards.length, cardIds: result.cards.map((card) => card.id) };
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'material card regeneration failed');
      return reply.code(500).send({ error: 'Material card regeneration failed.' });
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

  app.get<{ Querystring: { workspaceId?: string; bucket?: string } }>('/api/weread/recommendations', async (request, reply) => {
    try {
      const kbId = typeof request.query.workspaceId === 'string' ? request.query.workspaceId : undefined;
      const rawBucket = typeof request.query.bucket === 'string' ? request.query.bucket : 'control';
      if (!RECOMMENDATION_BUCKET_VALUES.includes(rawBucket as RecommendationBucket)) {
        return reply.code(400).send({ error: `bucket must be one of: ${RECOMMENDATION_BUCKET_VALUES.join(', ')}.` });
      }
      return computeWeReadRecommendations(kbId, rawBucket as RecommendationBucket);
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
    if (!STATISTICS_GATE_ALLOWED_VIEW_IDS.has(body.viewId)) {
      return reply.code(400).send({ error: 'viewId not registered' });
    }
    for (const field of STATISTICS_GATE_BOOLEAN_FIELDS) {
      const value = body[field];
      if (value !== undefined && typeof value !== 'boolean') {
        return reply.code(400).send({ error: `${field} must be boolean` });
      }
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
        title?: string;
        onShelf?: boolean;
        finishReading?: boolean;
        hasReadActivity?: boolean;
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
      title: typeof book.title === 'string' ? book.title : '',
      onShelf: Boolean(book.onShelf),
      finishReading: Boolean(book.finishReading),
      hasReadActivity: Boolean(book.hasReadActivity),
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

  app.get('/api/weread/hidden-interest/hint', async () => {
    return { hint: getHiddenInterestHint() };
  });

  app.get('/api/weread/quadrant', async () => {
    return computeWeReadQuadrantSummary();
  });

  app.get<{ Querystring: { force?: string } }>('/api/weread/topic-spectrum/global', async (request) => {
    const force = request.query?.force === '1';
    const spectrum = await computeWeReadGlobalTopicSpectrum(force);
    const validation = validateTopicSpectrum(spectrum);
    if (!validation.valid) {
      return { spectrum, degradeAssessment: null };
    }
    const now = Date.now();
    const defaultBook = createDefaultDataAccount(new Date(now).toISOString());
    const disabledDimensions = listDisabledDimensions(defaultBook);
    const topicSpectrumEntry = DEGRADE_MATRIX_REGISTRY.find((e) => e.key === 'topic_spectrum');
    const degradeAssessment = topicSpectrumEntry
      ? assessDegrade(topicSpectrumEntry, disabledDimensions)
      : null;
    return { spectrum, degradeAssessment };
  });

  app.post<{ Body: { permanentlyDismissed?: boolean } }>('/api/weread/hidden-interest/toggle', async (request, reply) => {
    if (typeof request.body?.permanentlyDismissed !== 'boolean') {
      return reply.code(400).send({ error: 'permanentlyDismissed boolean is required.' });
    }
    setHiddenInterestPermanentlyDismissed(request.body.permanentlyDismissed);
    return { ok: true };
  });

  app.post<{ Params: { bookId: string } }>('/api/weread/hidden-interest/dismiss/:bookId', async (request, reply) => {
    const { bookId } = request.params;
    if (!bookId) {
      return reply.code(400).send({ error: 'bookId is required.' });
    }
    dismissHiddenInterestBook(bookId);
    return { ok: true };
  });

  app.post('/api/weread/hidden-interest/shown', async () => {
    markHiddenInterestHintShown();
    return { ok: true };
  });

  app.post<{ Body: { format?: string } }>('/api/weread/data-portability/export', async (request, reply) => {
    const format = request.body?.format;
    if (!format || !DATA_PORTABILITY_FORMAT_VALUES.includes(format as DataPortabilityFormat)) {
      return reply.code(400).send({ error: `format must be one of: ${DATA_PORTABILITY_FORMAT_VALUES.join(', ')}.` });
    }
    try {
      const record = exportDataPortability(format as DataPortabilityFormat);
      return { record };
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'export data portability failed');
      return reply.code(500).send({ error: 'Failed to export data portability.' });
    }
  });

  app.get('/api/weread/data-portability/records', async () => {
    return { records: listDataPortabilityRecords() };
  });

  app.post<{ Params: { id: string } }>('/api/weread/data-portability/revoke/:id', async (request, reply) => {
    const { id } = request.params;
    if (!id) {
      return reply.code(400).send({ error: 'id is required.' });
    }
    try {
      revokeDataPortabilityExport(id);
      return { ok: true };
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'revoke data portability failed');
      return reply.code(500).send({ error: 'Failed to revoke data portability.' });
    }
  });

  app.get('/api/weread/reader-mode/profile', async () => {
    return { profile: getReaderModeProfile() };
  });

  app.post<{ Body: { targetTier?: string } }>('/api/weread/reader-mode/rollback', async (request, reply) => {
    const targetTier = request.body?.targetTier;
    if (!targetTier || !AUDIENCE_TIER_VALUES.includes(targetTier as AudienceTier)) {
      return reply.code(400).send({ error: `targetTier must be one of: ${AUDIENCE_TIER_VALUES.join(', ')}.` });
    }
    try {
      startReaderModeRollback(targetTier as AudienceTier);
      return { ok: true };
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'start reader mode rollback failed');
      return reply.code(500).send({ error: 'Failed to start reader mode rollback.' });
    }
  });

  app.post('/api/weread/reader-mode/cancel-rollback', async () => {
    cancelReaderModeRollback();
    return { ok: true };
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

  /**
   * 生产模式：注册前端静态文件服务。
   * 当 NODE_ENV=production 且前端构建产物存在时，API 同时 serve 前端 SPA。
   * 所有非 /api、/agent、/health 开头的请求回退到 index.html（SPA 路由）。
   * 本地开发时由 Vite dev server 处理前端，不启用此插件。
   */
  if (process.env.NODE_ENV === 'production') {
    const apiDir = dirname(fileURLToPath(import.meta.url));
    const webDistDir = join(apiDir, '..', '..', 'web', 'dist');
    try {
      await app.register(fastifyStatic, {
        root: webDistDir,
        prefix: '/',
        wildcard: false,
      });
      app.setNotFoundHandler((request, reply) => {
        const url = request.url;
        if (url.startsWith('/api') || url.startsWith('/agent') || url.startsWith('/health')) {
          return reply.code(404).send({ error: 'Not found.' });
        }
        return reply.sendFile('index.html');
      });
    } catch (error) {
      app.log.error({ error }, 'failed to register static file server');
    }
  }

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
