/**
 * @file 知径核心共享状态与模型提供者配置
 *
 * 由 packages/core/src/index.ts 拆分而来（Phase 2 重构）。
 * 保持对外 API 表面不变，仅做物理拆分。
 *
 * @author fxbin
 */

import {
  type AgentTask,
  type ArchiveItemResult,
  type ArchivedItemsResult,
  type AttentionSignal,
  type AttentionSignalStrength,
  type AttentionSignalTargetType,
  type AttentionSignalType,
  type InterestTopic,
  type UserInterestProfile,
  type DailyDigest,
  type DailyDigestItem,
  type DataAccountBook,
  type DataAccountEntry,
  type VerificationCoverage,
  type TopicCoverageHeatmap,
  type TopicCoverageItem,
  type TopicCoverageCell,
  type RepeatedThinkingReport,
  type RepeatedQuestionGroup,
  type ReadingSessionRequest,
  type CannotAnswerFeedbackRequest,
  type RecallDecayReport,
  type RecallDecayItem,
  type RecallDecayApplyResult,
  type AgentProposal,
  type AgentProposalReport,
  type WorkspaceEmergenceCluster,
  type ProposedCard,
  type ProposedOperation,
  type ProposedOperationType,
  type ProposedOperationResult,
  type AcceptProposalBatchRequest,
  type AcceptProposalBatchResponse,
  type AssignMaterialRequest,
  type ArtifactRecord,
  type ArtifactRevision,
  type ArtifactRevisionField,
  type ArtifactSection,
  type ArtifactSectionEdit,
  type ArtifactSectionEditResult,
  type ArtifactSectionInit,
  type ArtifactSubtype,
  type CardRecall,
  type CardRevision,
  type CardRevisionField,
  type ChatMessage,
  type ClaimStatus,
  type CloudBackupStub,
  type ConflictAuditEntry,
  type ConflictGroup,
  type ConflictKind,
  type ConflictResolutionAction,
  type ConflictResolutionRequest,
  type ExportFormat,
  type ExportRecord,
  type ExportScope,
  type GlobalInsights,
  type GlobalInsightsWorkspacePreview,
  type ConstructionProgress,
  type ConstructionStage,
  type RecallGrade,
  type RecallResult,
  type RecallResultItem,
  type RecallToolName,
  classifyInput,
  type Entity,
  type EntityType,
  type ExtractedEntitySeed,
  type SavedFilter,
  type SavedFilterScope,
  type CompleteMaterialReviewRequest,
  type IntakeAudience,
  type IntakeDepth,
  type IntakeRequest,
  type IntakeResult,
  type IntakeScope,
  type WorkspaceAnalytics,
  type WorkspaceDetail,
  type WorkspacePath,
  type KnowledgeMapResult,
  type KnowledgeMapNodePosition,
  type KnowledgeMapCustomEdge,
  type AddMapEdgeRequest,
  type PathStep,
  type SaveKnowledgeMapNodePositionsRequest,
  type WorkspaceSummary,
  type KnowledgeCitation,
  type KnowledgeCard,
  type KnowledgeKitId,
  type KnowledgeKitRunResult,
  type MaterialAssignmentResult,
  type MaterialAssignmentSuggestion,
  type MaterialAssignmentSuggestionsResult,
  type MaterialParseQueueResult,
  type MaterialRecord,
  type MaterialCursor,
  type MaterialQueryOptions,
  type MaterialQueryResult,
  type MaterialStatusTimeline,
  type MaterialTranscriptStatus,
  type MaterialReviewResult,
  type ModelProviderSettings,
  type ModelProviderSettingsV2,
  type ModelProviderTestResult,
  type CreateModelProviderProfileRequest,
  type UpdateModelProviderProfileRequest,
  type ModelProviderProfile,
  type ParseStatus,
  type SaveModelProviderSettingsRequest,
  type SocraticQuestion,
  type SocraticQuestioningResult,
  type SocraticQuestionType,
  type SocraticTrigger,
  type RelatedSuggestion,
  type RelatedSuggestionsResult,
  type AgentAction,
  type AgentActionLog,
  type AgentActionLogResult,
  type EvidenceAuditReport,
  type EvidenceGap,
  type HypothesisTestResult,
  type HypothesisEvidence,
  type TaskStatus,
  type TestModelProviderSettingsRequest,
  detectPlatform,
  type PersistedProposal,
  type ProposalStatus,
  type AgentUsageRecord,
  type AgentUsageQuery,
  type AgentUsageSummary,
  type AgentUsageComparison,
  type AgentChatMessageRecord,
  type AgentChatRunRecord,
  type AgentChatSessionDetail,
  type AgentChatSessionInfo,
  type AgentChatToolCallRecord,
  type PersistAgentChatTurnRequest,
  type UserMemory,
  type UserMemoryScope,
  type UserMemorySource,
  type CreateUserMemoryRequest,
  type UpdateUserMemoryRequest,
  type DecisionLog,
  type DecisionLogKind,
  type CreateDecisionLogRequest,
  type EvidenceFeedback,
  type RejectedCardFeature,
  type FolderIntakeRequest,
  type FolderIntakeResult,
  type FolderIntakeItem,
  type FileBatchIntakeRequest,
  type FileBatchIntakeResult,
  type HiddenInterestState,
  type HiddenInterestHint,
  type HiddenInterestBook,
  type HiddenInterestHintMode,
  type DataPortabilityFormat,
  type DataPortabilityManifest,
  type DataPortabilityRecord,
  type DataPortabilityAlgorithmVersion,
  type AudienceTier,
  type AudienceProfile,
  type ReaderModeState,
  type WorkspaceStage,
  type RecommendationBucket,
} from '@zhijing/shared';
import { fetchUrlAsMarkdown, parseRawHtml } from './web-fetch.js';
import * as ssrfGuard from './ssrf-guard.js';
import { createSsrfSafeFetch as createSafeFetch } from './ssrf-guard.js';
import {
  createDefaultDataAccount,
  setMinimalMode,
} from './data-account-book.js';
import { buildEmptyCoverage } from './statistics/verification-bank.js';
import { LONG_REVIEW_CHAR_THRESHOLD } from './statistics/saturate.js';
import {
  buildHiddenInterestHint,
  applyHiddenInterestDismissal,
  applyPermanentDismissal,
  markHintShown,
} from './statistics/hidden-interest.js';
import {
  buildDataPortabilityManifest,
  computeRevokeDeadline,
  serializePortability,
  DATA_PORTABILITY_ALGORITHM_VERSIONS,
} from './statistics/data-export.js';
import {
  classifyAudienceTier,
  buildAudienceProfile,
  buildInitialReaderModeState,
  startTempRollback,
  cancelTempRollback,
  resolveEffectiveTier,
} from './statistics/audience-adapter.js';
import type { BookSignalInputs, QuadrantSummary, TopicSpectrum } from '@zhijing/shared';
import { DEGRADE_MATRIX_REGISTRY } from './statistics/degrade-matrix.js';
import { computeQuadrantSummary } from './statistics/quadrant.js';
import { computeTopicSpectrum } from './statistics/topic-spectrum.js';
import { tokenizeText } from './statistics/tokenize.js';
import {
  initZvecSearch,
  isZvecSearchReady,
  isZvecIndexInitialized,
  markZvecIndexInitialized,
  upsertCardInZvec,
  upsertMaterialInZvec,
  deleteCardFromZvec,
  deleteMaterialFromZvec,
  searchCardsInZvec,
  searchMaterialsInZvec,
  rebuildCardZvecIndex,
  rebuildMaterialZvecIndex,
  type CardIndexInput,
  type MaterialIndexInput,
} from './search-zvec.js';

/**
 * jieba-wasm 分词器（LIKE fallback 专用）。
 *
 * 用 createRequire 引入，避免 TS 模块解析问题；与 statistics/tokenize.ts 同源。
 * 仅用于 splitQueryForLikeFallback，对 LLM 改写后的多词 query 做分词，
 * 让 LIKE 保底匹配能按 token OR 命中，而非要求整串连续。
 */
import { createRequire as createRequireForJieba } from 'node:module';

import {
  persistGeneratedProposals,
  getActiveProposals,
  toAgentProposals,
  decideProposal,
  type ProposalRepository,
} from './memory.js';
import {
  buildUsageFilter,
  buildUsageSummary,
  buildUsageComparison,
  applyQueryLimit,
  DEFAULT_QUERY_LIMIT,
  type AgentUsageRepository,
} from './agent-usage.js';
import {
  buildUserMemoryFilter,
  applyUserMemoryLimit,
  validateCreateUserMemoryRequest,
  type UserMemoryRepository,
  type UserMemoryQuery,
} from './user-memory.js';
import {
  buildDecisionLogFilter,
  applyDecisionLogLimit,
  validateCreateDecisionLogRequest,
  type DecisionLogRepository,
  type DecisionLogQuery,
} from './decision-log.js';
import {
  computeEvidenceFeedback,
  extractRejectedFeatures,
  buildNegativeExampleSection,
  EVIDENCE_ACTION_ACCEPT_PROPOSED_CARDS,
  DEFAULT_REJECTED_FEATURES_LIMIT,
} from './evidence-feedback.js';
import {
  createPiAiRuntime,
  createInstrumentedPiRuntime,
  createMockPiRuntime,
  createRoutedPiRuntime,
  entityExtractionSchema,
  getDefaultPiModel,
  getDefaultPiProvider,
  getKnownPiModels,
  getKnownPiProviders,
  getPiEnvApiKey,
  isKnownPiProvider,
  questionAnswerSchema,
  socraticQuestioningSchema,
  structuredSchemas,
  type PiRuntime,
  setActiveProfile,
  type TSchema,
} from '@zhijing/pi-runtime';
import { DuckDBConnection } from '@duckdb/node-api';
import { randomUUID } from 'node:crypto';
import { mkdirSync, constants as fsConstants } from 'node:fs';
import { readFile, readdir, stat, unlink, access } from 'node:fs/promises';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import {
  buildWeReadMaterialMarkdown,
  WeReadClient,
  WeReadError,
  type WeReadBookInfo,
  type WeReadBookmarkList,
  type WeReadReviewList,
  type WeReadShelf,
  type WeReadShelfArchive,
  type WeReadShelfBook,
  type WeReadImportResult,
  type WeReadBookMetaRow,
  type WeReadSyncStateRow,
  type WeReadStatsResponse,
  type WeReadCategorySlice,
  type WeReadYearTrend,
  type WeReadMonthlyActivity,
  type WeReadRecentBook,
  type WeReadPreviewNote,
  type WeReadPreviewResult,
  type WeReadRecommendation,
  type WeReadRecommendResult,
  SIGNALS_REFRESH_DEFAULT_CONCURRENCY,
  type WeReadSignalsRefreshResult,
} from './weread.js';

import type {
  ModelProviderProfileRecord,
  PersistedModelProviderConfig, StoreState, KnowledgeRepository,
  ParserCacheEntry,
} from './types.js';
import {
  createMemoryKnowledgeRepository,
  createSqliteKnowledgeRepository,
} from './repositories/registry.js';
import {
  now, id, compactTitle, recordAgentUsage, topicLabelCache,
} from './business.js';
import {
  MODEL_PROVIDER_PROFILE_ID_PREFIX,
  DEFAULT_PROFILE_NAME,
} from './constants.js';
import { KnowledgeCoreError } from './errors.js';

export let repository: KnowledgeRepository = process.env.ZHIJING_STORAGE === 'memory'
  ? createMemoryKnowledgeRepository()
  : createSqliteKnowledgeRepository();

export const parserResultCache = new Map<string, ParserCacheEntry>();
export const platformParseTimestamps = new Map<string, number>();

export type RuntimeModelProviderConfig = {
  provider: string;
  model: string;
  baseUrl?: string;
  apiKey?: string;
  enabled: boolean;
  fallbackToMock: boolean;
  keySource: ModelProviderSettings['keySource'];
  updatedAt?: string;
};

export let modelProviderConfig: RuntimeModelProviderConfig = initialModelProviderConfig();
export let piRuntime: PiRuntime = createRuntimeFromModelProviderConfig(modelProviderConfig);
applyModelProviderConfig();

export function configureKnowledgeRepository(nextRepository: KnowledgeRepository) {
  repository = nextRepository;
}

export function configurePiRuntime(nextRuntime: PiRuntime) {
  piRuntime = nextRuntime;
}

export function resetKnowledgeCoreForTests() {
  repository = createMemoryKnowledgeRepository();
  parserResultCache.clear();
  platformParseTimestamps.clear();
  topicLabelCache.clear();
  modelProviderConfig = initialModelProviderConfig();
  applyModelProviderConfig();
}

export function initialModelProviderConfig(): RuntimeModelProviderConfig {
  const defaultProfile = ensureDefaultProfile();
  return runtimeConfigFromProfile(defaultProfile);
}

/**
 * 确保存在默认 profile：
 * - 若已有 profile，确保有且仅有一条 is_default=1
 * - 若无任何 profile，从环境变量 ZHIJING_PI_* 创建一个 env profile
 * @author fxbin
 */
export function ensureDefaultProfile(): ModelProviderProfileRecord {
  const existing = repository.listModelProviderProfiles();
  if (existing.length > 0) {
    const defaultProfile = existing.find((record) => record.isDefault);
    if (defaultProfile) return defaultProfile;
    const first = existing[0];
    const promoted: ModelProviderProfileRecord = { ...first, isDefault: true, updatedAt: now() };
    repository.updateModelProviderProfile(promoted);
    return promoted;
  }
  return createEnvProfile();
}

/**
 * 从环境变量 ZHIJING_PI_* 创建一个默认 profile（仅在无任何 profile 时调用）。
 * env profile 不存储 apiKey 明文，运行时通过 getPiEnvApiKey 读取。
 * @author fxbin
 */
export function createEnvProfile(): ModelProviderProfileRecord {
  const provider = normalizeProvider(process.env.ZHIJING_PI_PROVIDER);
  const envApiKey = process.env.ZHIJING_PI_API_KEY ?? safeEnvApiKey(provider);
  const envModel = process.env.ZHIJING_PI_MODEL
    ?? (provider === getDefaultPiProvider() ? getDefaultPiModel() : defaultModelForProvider(provider));
  const timestamp = now();
  const record: ModelProviderProfileRecord = {
    id: id(MODEL_PROVIDER_PROFILE_ID_PREFIX),
    name: DEFAULT_PROFILE_NAME,
    provider,
    model: envModel,
    apiKey: undefined,
    enabled: process.env.ZHIJING_PI_ENABLED === '1' || Boolean(envApiKey),
    fallbackToMock: process.env.ZHIJING_PI_FALLBACK === '0' ? false : true,
    isDefault: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  repository.insertModelProviderProfile(record);
  return record;
}

/**
 * 将 profile 持久化记录转换为运行时配置。
 * @author fxbin
 */
export function runtimeConfigFromProfile(profile: ModelProviderProfileRecord): RuntimeModelProviderConfig {
  const provider = normalizeProvider(profile.provider);
  const envApiKey = safeEnvApiKey(provider);
  return {
    provider,
    model: profile.model,
    baseUrl: profile.baseUrl,
    apiKey: profile.apiKey,
    enabled: profile.enabled,
    fallbackToMock: profile.fallbackToMock,
    keySource: profile.apiKey ? 'runtime' : envApiKey ? 'env' : 'none',
    updatedAt: profile.updatedAt,
  };
}

/**
 * 将激活的 profile 应用到运行时（重建 piRuntime）。
 * @author fxbin
 */
export function applyActiveProfileToRuntime(profile: ModelProviderProfileRecord) {
  modelProviderConfig = runtimeConfigFromProfile(profile);
  applyModelProviderConfig();
}

/**
 * 归一化 provider 标识。
 *
 * 规则：
 * - 空或 undefined 回退到默认 provider（DeepSeek）；
 * - 已知 provider（大小写不敏感匹配 KnownProvider）归一化为 SDK 注册的小写形式，
 *   避免数据库中存储的 'DeepSeek' 等大小写变体与 router 路由逻辑分叉（参见 401 偶现根因）；
 * - 未知但非空的 provider 字符串仅 trim，支持自定义 OpenAI 兼容端点（如商汤 SenseNova）。
 *
 * @param provider - 原始 provider 字符串
 * @returns 归一化后的 provider 字符串
 * @author fxbin
 */
export function normalizeProvider(provider: string | undefined): string {
  if (!provider || provider.trim().length === 0) return getDefaultPiProvider();
  const trimmed = provider.trim();
  const lower = trimmed.toLowerCase();
  if (getKnownPiProviders().some((known) => known.toLowerCase() === lower)) {
    return lower;
  }
  return trimmed;
}

export function defaultModelForProvider(provider: string) {
  if (!isKnownPiProvider(provider)) return getDefaultPiModel();
  const models = getKnownPiModels(provider);
  return models[0]?.id ?? getDefaultPiModel();
}

export function providerOptions(): ModelProviderSettings['providers'] {
  return getKnownPiProviders().map((provider) => ({
    id: provider,
    models: getKnownPiModels(provider),
  }));
}

export function currentApiKey() {
  if (modelProviderConfig.apiKey) return modelProviderConfig.apiKey;
  if (isKnownPiProvider(modelProviderConfig.provider)) {
    return getPiEnvApiKey(modelProviderConfig.provider);
  }
  return undefined;
}

/**
 * 安全读取 provider 对应的环境变量 API key。
 * 未知 provider（自定义字符串）无 SDK 环境变量约定，返回 undefined。
 * @param provider - provider 标识
 * @returns 环境变量中的 API key 或 undefined
 * @author fxbin
 */
export function safeEnvApiKey(provider: string): string | undefined {
  return isKnownPiProvider(provider) ? getPiEnvApiKey(provider) : undefined;
}

/**
 * 读取当前激活 profile 的 Agent 装配凭据（明文 apiKey）。
 *
 * 供后端在装配工作区 Agent 时传入，避免 agent-factory 仅依赖环境变量而
 * 忽略数据库中持久化的 model provider profile。
 *
 * 回退链路：激活 profile 的 apiKey > 该 provider 的环境变量。
 * 两者皆空时返回 undefined，由调用方决定如何处理。
 *
 * @returns {provider, model, apiKey?} 装配凭据；apiKey 可能为 undefined
 * @author fxbin
 */
export function getActiveAgentCredentials(): { provider: string; model: string; baseUrl?: string; apiKey?: string } {
  return {
    provider: modelProviderConfig.provider,
    model: modelProviderConfig.model,
    baseUrl: modelProviderConfig.baseUrl,
    apiKey: currentApiKey() || undefined,
  };
}

export function createRuntimeFromModelProviderConfig(config: RuntimeModelProviderConfig) {
  const envApiKey = safeEnvApiKey(config.provider);
  return createPiAiRuntime({
    provider: config.provider,
    model: config.model,
    baseUrl: config.baseUrl,
    apiKey: config.apiKey ?? envApiKey,
    enabled: config.enabled,
    fallbackToMock: config.fallbackToMock,
  });
}

export function applyModelProviderConfig() {
  piRuntime = createRuntimeFromModelProviderConfig(modelProviderConfig);
  setActiveProfile({
    provider: modelProviderConfig.provider,
    model: modelProviderConfig.model,
    baseUrl: modelProviderConfig.baseUrl,
    apiKey: currentApiKey() || undefined,
  });
}

export function modelSettingsSnapshot(): ModelProviderSettings {
  return {
    provider: modelProviderConfig.provider,
    model: modelProviderConfig.model,
    baseUrl: modelProviderConfig.baseUrl,
    enabled: modelProviderConfig.enabled,
    fallbackToMock: modelProviderConfig.fallbackToMock,
    hasApiKey: Boolean(currentApiKey()),
    keySource: modelProviderConfig.apiKey ? modelProviderConfig.keySource : safeEnvApiKey(modelProviderConfig.provider) ? 'env' : 'none',
    updatedAt: modelProviderConfig.updatedAt,
    providers: providerOptions(),
  };
}

export function getModelProviderSettings(): ModelProviderSettings {
  return modelSettingsSnapshot();
}

export function saveModelProviderSettings(input: SaveModelProviderSettingsRequest): ModelProviderSettings {
  const provider = normalizeProvider(input.provider);
  const model = input.model?.trim() || getDefaultPiModel();
  const profiles = repository.listModelProviderProfiles();
  const activeProfile = profiles.find((record) => record.isDefault) ?? profiles[0];
  const providerScopedExistingKey = activeProfile && activeProfile.provider === provider
    ? activeProfile.apiKey
    : undefined;
  const inputApiKey = normalizeSecret(input.apiKey);
  const envApiKey = safeEnvApiKey(provider);
  const apiKey = input.clearApiKey
    ? undefined
    : inputApiKey ?? providerScopedExistingKey;
  const baseUrl = input.clearBaseUrl
    ? undefined
    : (input.baseUrl !== undefined ? (input.baseUrl.trim() || undefined) : activeProfile?.baseUrl);

  modelProviderConfig = {
    provider,
    model,
    baseUrl,
    apiKey,
    enabled: input.enabled ?? Boolean(apiKey ?? envApiKey),
    fallbackToMock: input.fallbackToMock ?? false,
    keySource: apiKey ? 'runtime' : envApiKey ? 'env' : 'none',
    updatedAt: now(),
  };
  if (activeProfile) {
    const syncedProfile: ModelProviderProfileRecord = {
      ...activeProfile,
      provider,
      model,
      baseUrl,
      apiKey,
      enabled: modelProviderConfig.enabled,
      fallbackToMock: modelProviderConfig.fallbackToMock,
      updatedAt: modelProviderConfig.updatedAt ?? now(),
    };
    repository.updateModelProviderProfile(syncedProfile);
  }
  repository.writeModelProviderConfig({
    provider: modelProviderConfig.provider,
    model: modelProviderConfig.model,
    baseUrl: modelProviderConfig.baseUrl,
    apiKey: modelProviderConfig.keySource === 'runtime' ? modelProviderConfig.apiKey : undefined,
    enabled: modelProviderConfig.enabled,
    fallbackToMock: modelProviderConfig.fallbackToMock,
    updatedAt: modelProviderConfig.updatedAt,
  });
  applyModelProviderConfig();
  return modelSettingsSnapshot();
}

/**
 * 将内部 profile 记录映射为对外 API 视图（不含 apiKey 明文）。
 * @author fxbin
 */
export function mapModelProviderProfileToApi(record: ModelProviderProfileRecord): ModelProviderProfile {
  const provider = normalizeProvider(record.provider);
  const envApiKey = safeEnvApiKey(provider);
  const hasApiKey = Boolean(record.apiKey ?? envApiKey);
  const keySource = record.apiKey ? 'runtime' : envApiKey ? 'env' : 'none';
  return {
    id: record.id,
    name: record.name,
    provider: record.provider,
    model: record.model,
    baseUrl: record.baseUrl,
    enabled: record.enabled,
    fallbackToMock: record.fallbackToMock,
    hasApiKey,
    keySource,
    isDefault: record.isDefault,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

/**
 * 列出全部模型 Provider Profile。
 * @author fxbin
 */
export function listModelProviderProfiles(): ModelProviderProfile[] {
  return repository.listModelProviderProfiles().map(mapModelProviderProfileToApi);
}

/**
 * 创建新的模型 Provider Profile。
 * 若指定 isDefault=true 或当前无任何 profile，则自动设为默认并应用到运行时。
 * @author fxbin
 */
export function createModelProviderProfile(input: CreateModelProviderProfileRequest): ModelProviderProfile {
  const name = input.name?.trim();
  if (!name) throw new KnowledgeCoreError('Profile 名称不能为空。', 400);
  const provider = normalizeProvider(input.provider);
  const model = input.model?.trim() || getDefaultPiModel();
  const apiKey = normalizeSecret(input.apiKey);
  const baseUrl = input.baseUrl?.trim() || undefined;
  const envApiKey = safeEnvApiKey(provider);
  const timestamp = now();
  const shouldBeDefault = input.isDefault === true || repository.listModelProviderProfiles().length === 0;
  if (input.isDefault === true) {
    repository.clearModelProviderProfileDefault();
  }
  const record: ModelProviderProfileRecord = {
    id: id(MODEL_PROVIDER_PROFILE_ID_PREFIX),
    name,
    provider,
    model,
    baseUrl,
    apiKey,
    enabled: input.enabled ?? Boolean(apiKey ?? envApiKey),
    fallbackToMock: input.fallbackToMock ?? false,
    isDefault: shouldBeDefault,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  repository.insertModelProviderProfile(record);
  if (record.isDefault) {
    applyActiveProfileToRuntime(record);
  }
  return mapModelProviderProfileToApi(record);
}

/**
 * 更新指定模型 Provider Profile。
 * 若该 profile 为默认，则同步重建运行时。
 * @author fxbin
 */
export function updateModelProviderProfile(profileId: string, input: UpdateModelProviderProfileRequest): ModelProviderProfile {
  const existing = repository.findModelProviderProfile(profileId);
  if (!existing) throw new KnowledgeCoreError('Profile 不存在。', 404);
  const name = input.name !== undefined ? input.name.trim() : existing.name;
  if (!name) throw new KnowledgeCoreError('Profile 名称不能为空。', 400);
  const provider = normalizeProvider(input.provider !== undefined ? input.provider : existing.provider);
  const model = input.model !== undefined
    ? (input.model.trim() || getDefaultPiModel())
    : existing.model;
  const apiKey = input.clearApiKey
    ? undefined
    : (input.apiKey !== undefined ? normalizeSecret(input.apiKey) : existing.apiKey);
  const baseUrl = input.clearBaseUrl
    ? undefined
    : (input.baseUrl !== undefined ? (input.baseUrl.trim() || undefined) : existing.baseUrl);
  const enabled = input.enabled ?? existing.enabled;
  const fallbackToMock = input.fallbackToMock ?? existing.fallbackToMock;
  const updatedAt = now();
  const updated: ModelProviderProfileRecord = {
    ...existing,
    name,
    provider,
    model,
    baseUrl,
    apiKey,
    enabled,
    fallbackToMock,
    updatedAt,
  };
  if (input.isDefault === true && !existing.isDefault) {
    repository.clearModelProviderProfileDefault();
    updated.isDefault = true;
  } else if (input.isDefault === false && existing.isDefault) {
    updated.isDefault = false;
    const remaining = repository.listModelProviderProfiles().filter((record) => record.id !== existing.id);
    if (remaining.length > 0) {
      const promoted: ModelProviderProfileRecord = { ...remaining[0], isDefault: true, updatedAt: now() };
      repository.updateModelProviderProfile(promoted);
      applyActiveProfileToRuntime(promoted);
    }
  }
  repository.updateModelProviderProfile(updated);
  if (updated.isDefault) {
    applyActiveProfileToRuntime(updated);
  }
  return mapModelProviderProfileToApi(updated);
}

/**
 * 删除指定模型 Provider Profile。
 * 若删除的是默认 profile，则自动将剩余首条提升为默认。
 * @author fxbin
 */
export function deleteModelProviderProfile(profileId: string): { ok: boolean } {
  const existing = repository.findModelProviderProfile(profileId);
  if (!existing) throw new KnowledgeCoreError('Profile 不存在。', 404);
  repository.deleteModelProviderProfile(profileId);
  if (existing.isDefault) {
    const remaining = repository.listModelProviderProfiles();
    if (remaining.length > 0) {
      const next = remaining[0];
      const promoted: ModelProviderProfileRecord = { ...next, isDefault: true, updatedAt: now() };
      repository.updateModelProviderProfile(promoted);
      applyActiveProfileToRuntime(promoted);
    }
  }
  return { ok: true };
}

/**
 * 激活指定模型 Provider Profile（设为默认并重建运行时）。
 * @author fxbin
 */
export function activateModelProviderProfile(profileId: string): ModelProviderProfile {
  const existing = repository.findModelProviderProfile(profileId);
  if (!existing) throw new KnowledgeCoreError('Profile 不存在。', 404);
  repository.clearModelProviderProfileDefault();
  const updated: ModelProviderProfileRecord = { ...existing, isDefault: true, updatedAt: now() };
  repository.updateModelProviderProfile(updated);
  applyActiveProfileToRuntime(updated);
  return mapModelProviderProfileToApi(updated);
}

/**
 * 获取模型 Provider 设置 V2（多 profile 聚合视图）。
 * @author fxbin
 */
export function getModelProviderSettingsV2(): ModelProviderSettingsV2 {
  const records = repository.listModelProviderProfiles();
  const profiles = records.map(mapModelProviderProfileToApi);
  const active = records.find((record) => record.isDefault);
  return {
    profiles,
    activeProfileId: active?.id ?? null,
    providers: providerOptions(),
  };
}

export const MODEL_PROVIDER_TEST_PROMPTS = [
  '请只回复这句话：知径模型连接正常',
  '只回复：连接正常',
];

export async function testModelProviderSettings(input: TestModelProviderSettingsRequest = {}): Promise<ModelProviderTestResult> {
  const profile = input.profileId ? repository.findModelProviderProfile(input.profileId) : undefined;
  const provider = normalizeProvider(input.provider ?? profile?.provider ?? modelProviderConfig.provider);
  const model = (input.model ?? profile?.model ?? modelProviderConfig.model).trim() || getDefaultPiModel();
  const profileApiKey = profile?.provider === provider ? profile.apiKey : undefined;
  const apiKey = input.apiKey?.trim() || profileApiKey || safeEnvApiKey(provider);
  const baseUrl = input.baseUrl !== undefined
    ? (input.baseUrl.trim() || undefined)
    : (profile ? profile.baseUrl : modelProviderConfig.baseUrl);

  if (!apiKey) {
    return {
      ok: false,
      provider,
      model,
      message: '请先填写 Provider API Key。',
    };
  }

  try {
    const rawRuntime = createPiAiRuntime({
      provider,
      model,
      baseUrl,
      apiKey,
      enabled: true,
      fallbackToMock: false,
      maxTokens: 700,
    });
    const runtime = createInstrumentedPiRuntime(rawRuntime, {
      taskType: 'conversation',
      workspaceId: undefined,
      recorder: recordAgentUsage,
    });
    let sampleText = '';
    let usage: ModelProviderTestResult['usage'];
    for (const prompt of MODEL_PROVIDER_TEST_PROMPTS) {
      for await (const chunk of runtime.streamText({
        prompt,
        context: {
          verification: true,
          expectedOutput: 'plain_text',
          expectedLanguage: 'zh-CN',
        },
      })) {
        sampleText += chunk.text;
        usage = chunk.usage ?? usage;
      }
      if (sampleText.trim()) {
        break;
      }
    }
    if (!sampleText.trim()) {
      throw new Error('模型接口已响应，但连续两次未返回正文。请检查该模型是否支持普通文本对话，或更换同一 Provider 下的非推理模型。');
    }
    return {
      ok: true,
      provider,
      model,
      message: '模型连接正常，已返回真实文本响应。',
      sampleTitle: compactTitle(sampleText),
      usage,
    };
  } catch (error) {
    return {
      ok: false,
      provider,
      model,
      message: error instanceof Error ? error.message : '模型测试失败。',
    };
  }
}

export function normalizeSecret(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}


