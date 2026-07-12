/**
 * @file 知径核心业务逻辑：所有业务函数
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
  StoreState, KnowledgeRepository,
  ModelProviderProfileRecord, PersistedModelProviderConfig, AgentChatRetryResult,
  GeneratedCard, GeneratedKnowledgeOutput, ParsedMaterialContent,
  ParseFailureCategory, ParserCacheEntry, XiaohongshuShareInfo,
} from './types.js';

import { KnowledgeCoreError } from './errors.js';
import {
  DEFAULT_PROFILE_NAME, MODEL_PROVIDER_PROFILE_ID_PREFIX, LEGACY_MODEL_PROVIDER_SETTINGS_ID,
  DEFAULT_WORKSPACE_ID, DEFAULT_WORKSPACE_TITLE, DEFAULT_WORKSPACE_SUMMARY,
  CONTEXT_RETRIEVAL_LIMIT, FTS_TOKENIZER,
  MEMORY_SEARCH_TITLE_WEIGHT, MEMORY_SEARCH_BODY_WEIGHT,
  ATTENTION_SIGNAL_STRONG, ATTENTION_SIGNAL_MEDIUM, ATTENTION_SIGNAL_WEAK,
  ATTENTION_SIGNAL_QUESTION_CARD, ATTENTION_SIGNAL_MANUAL_LAYOUT,
  ATTENTION_SIGNAL_ASK_QUESTION, ATTENTION_SIGNAL_CARD_OPENED,
  ATTENTION_SIGNAL_CANNOT_ANSWER, ATTENTION_LOG_LIMIT,
  ATTENTION_CONTEXT_QUESTION_MAX_LENGTH,
  ATTENTION_TARGET_TYPE_CARD, ATTENTION_TARGET_TYPE_LAYOUT, ATTENTION_TARGET_TYPE_QUESTION,
  MAP_EDGE_ID_PREFIX, MAP_EDGE_TABLE_NAME,
  MAP_EDGE_RELATION_SUPPORTS, MAP_EDGE_RELATION_CONTRADICTS, MAP_EDGE_RELATION_RELATED_TO,
  MAP_EDGE_ALLOWED_RELATIONS, MAP_TENSION_EDGE_LIMIT,
  MAP_VISIBLE_MATERIAL_LIMIT, MAP_VISIBLE_CARD_LIMIT,
  EVIDENCE_GAP_SAMPLE_LIMIT, EVIDENCE_GAP_SKELETON_RATIO_THRESHOLD,
  HYPOTHESIS_SEARCH_LIMIT, HYPOTHESIS_PREVIEW_MAX_LENGTH,
  HYPOTHESIS_VERDICT_SUPPORTED, HYPOTHESIS_VERDICT_CONTRADICTED,
  HYPOTHESIS_VERDICT_MIXED, HYPOTHESIS_VERDICT_INSUFFICIENT,
  HYPOTHESIS_SUPPORT_KEYWORDS, HYPOTHESIS_CONTRADICT_KEYWORDS,
  RECALL_TOOL_DIRECT_FETCH, RECALL_TOOL_SHALLOW, RECALL_TOOL_DEEP,
  RECALL_TOOL_TOPIC_EXPLORATION, RECALL_DEFAULT_LIMIT, RECALL_PREVIEW_MAX_LENGTH,
  RECALL_RELEVANCE_THRESHOLD, RECALL_DIRECT_FETCH_EXACT_SCORE,
  RECALL_DIRECT_FETCH_CONTAIN_SCORE, RECALL_TOPIC_DIRECT_NEIGHBOR_SCORE,
  RECALL_TOPIC_SECOND_NEIGHBOR_SCORE, RECALL_DEEP_EXPANSION_PROMPT_PREFIX,
  RECALL_DEEP_EXPANSION_PROMPT_SUFFIX, RECALL_DEEP_EXPANSION_MAX_TERMS,
  KNOWLEDGE_MAP_CARD_NODE_PREFIX, RECALL_RELEVANCE_ROUND_FACTOR,
  CONSTRUCTION_SEEDLING_THRESHOLD, CONSTRUCTION_GROWING_THRESHOLD,
  CONSTRUCTION_RATIO_BASE, CONSTRUCTION_STAGE_SEEDLING,
  CONSTRUCTION_STAGE_GROWING, CONSTRUCTION_STAGE_MATURE,
  CONSTRUCTION_ACTION_SEEDLING, CONSTRUCTION_ACTION_GROWING, CONSTRUCTION_ACTION_MATURE,
  TENSION_KEYWORD_PAIRS, TENSION_KEY_PREFIX, TENSION_KEY_SEPARATOR,
  TENSION_TITLE_TEMPLATE, TENSION_META_TEMPLATE,
  SOCRATIC_TRIGGER_SKELETON, SOCRATIC_TRIGGER_TENSION, SOCRATIC_TRIGGER_MANUAL,
  SOCRATIC_QUESTION_MIN_COUNT, SOCRATIC_QUESTION_MAX_COUNT, SOCRATIC_CARD_DIGEST_LIMIT,
  SOCRATIC_PROMPT_HEADER, SOCRATIC_PROMPT_RULES,
  SOCRATIC_PROMPT_SKELETON_TEMPLATE, SOCRATIC_PROMPT_TENSION_TEMPLATE, SOCRATIC_PROMPT_MANUAL_TEMPLATE,
  SOCRATIC_ATTENTION_SIGNAL_TYPE, SOCRATIC_ATTENTION_SIGNAL_STRENGTH, SOCRATIC_ATTENTION_TARGET_TYPE,
  RELATED_SUGGESTION_LIMIT, RELATED_SUGGESTION_MIN_SCORE,
  RELATED_SUGGESTION_REASON_TOPIC, RELATED_SUGGESTION_REASON_SHALLOW, RELATED_SUGGESTION_REASON_DIRECT,
  AGENT_ACTION_LOG_DEFAULT_LIMIT, AGENT_ACTION_LOG_MAX_LIMIT,
  INSPECT_FORBIDDEN_TABLES, AGENT_ACTION_LOG_TABLE_NAME, AGENT_ACTION_LOG_ID_PREFIX,
  AGENT_ACTION_SUCCESS_TRUE, AGENT_ACTION_SUCCESS_FALSE,
  AGENT_CHAT_MESSAGE_ID_PREFIX, AGENT_CHAT_TITLE_MAX_LENGTH,
  resolveProjectRoot, defaultSqlitePath, PROJECT_ROOT,
} from './constants.js';
import {
  repository, piRuntime, modelProviderConfig, parserResultCache,
  platformParseTimestamps,
  configureKnowledgeRepository, configurePiRuntime, resetKnowledgeCoreForTests,
  getActiveAgentCredentials, normalizeSecret,
  initialModelProviderConfig, ensureDefaultProfile, createEnvProfile,
  runtimeConfigFromProfile, applyActiveProfileToRuntime, normalizeProvider,
  defaultModelForProvider, providerOptions, currentApiKey, safeEnvApiKey,
  createRuntimeFromModelProviderConfig, applyModelProviderConfig, modelSettingsSnapshot,
  type RuntimeModelProviderConfig,
} from './state.js';
import {
  mapWorkspace, mapMaterial, parseJsonStringArray, parseStatusTimeline,
  serializeTimeline, stampMaterialStatus, mapCard, parseCardRecall,
  serializeCardRecall, mapCardRevision, parseRevisionFields,
  mapExportRecord, mapSavedFilter, mapEntity, mapConflictAudit,
  mapAttentionSignal, mapProposal, mapAgentUsage, mapAgentChatRun,
  mapAgentChatSession, mapAgentChatMessage, mapAgentChatToolCall,
  mapUserMemory, mapDecisionLog, mapAgentActionLog, mapMapCustomEdge,
  clampEase, scheduleCardRecall, mapTask, normalizeArtifactSubtype,
  kitToSubtype, mapArtifact, parseArtifactSections, mapArtifactRevision,
  mapMessage, getRawMessageRole, extractRawMessageText,
  extractRawMessageReasoning, getRawMessageTimestamp,
  buildAgentChatMessageRecords, deriveAgentChatTitle,
  findLastUserMessageIndex, mapModelProviderProfileRow,
  getDataDirectory, revealDataDirectory,
  isCjkCharForLike, splitQueryForLikeFallback, sanitizeFtsQuery,
  extractSearchTerms, scoreTextRelevance,
} from './utils.js';
import {
  toCardIndexInput, toMaterialIndexInput, initializeZvecIndex,
} from './repositories/registry.js';

export function now() {
  return new Date().toISOString();
}

export function id(prefix: string) {
  return `${prefix}_${randomUUID().slice(0, 8)}`;
}

export const TITLE_PREFIX_PATTERN = /^(我想(?:了解|学习|知道|研究|搞懂|搞清楚|系统学习|知道下)|帮我(?:查|找|了解|整理|总结|看看)|请问|关于|怎么|如何|有没有人|推荐下)\s*(?:一下|关于)?\s*/;
export const TITLE_SUFFIX_PUNCT = /[?？!！。.…,，、\s]+$/;
export const TITLE_MAX_LENGTH = 32;

/**
 * 从原始文本中提取精炼标题。
 * 优先取首行，去除常见口语前缀与尾部标点，最后截断到最大长度。
 * AI 可用时由 LLM 返回生成标题，此函数仅作截断保护与 mock fallback。
 * @param input - 原始文本
 * @returns 精炼后的标题
 * @author fxbin
 */
export function compactTitle(input: string) {
  const firstLine = input.split('\n')[0] ?? input;
  const noPrefix = firstLine.replace(TITLE_PREFIX_PATTERN, '');
  const noSuffix = noPrefix.replace(TITLE_SUFFIX_PUNCT, '');
  const cleaned = noSuffix.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '未命名知识库';
  return cleaned.length > TITLE_MAX_LENGTH ? `${cleaned.slice(0, TITLE_MAX_LENGTH)}...` : cleaned;
}

export const TITLE_DUPLICATE_SUFFIX_START = 2;
export const TITLE_DUPLICATE_SUFFIX_MAX = 99;

/**
 * 为 AI 生成等非用户显式命名场景生成不冲突的标题。
 * 若原标题未被占用则直接返回；否则追加 (2)、(3)... 直到找到可用标题。
 * @param rawTitle - 原始标题（未经 compactTitle 处理）
 * @returns 不与现有知识库冲突的标题
 * @author fxbin
 */
export function ensureUniqueTitle(rawTitle: string): string {
  const compacted = compactTitle(rawTitle);
  if (!repository.findWorkspaceByTitle(compacted)) {
    return compacted;
  }
  for (let suffix = TITLE_DUPLICATE_SUFFIX_START; suffix <= TITLE_DUPLICATE_SUFFIX_MAX; suffix += 1) {
    const candidate = `${compacted} (${suffix})`;
    if (!repository.findWorkspaceByTitle(candidate)) {
      return candidate;
    }
  }
  return `${compacted} (${Date.now()})`;
}

export function titleFromLink(input: string) {
  try {
    const url = new URL(input);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return compactTitle(input);
  }
}

export function extractFirstUrl(input: string) {
  return input.match(/https?:\/\/[^\s"'<>]+/i)?.[0];
}

export function createTask(workflow: AgentTask['workflow'], input: Record<string, unknown>, status: TaskStatus = 'running') {
  const timestamp = now();
  const task: AgentTask = {
    id: id('task'),
    workflow,
    status,
    input,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  repository.insertTask(task);
  return task;
}

export function finishTask(task: AgentTask, output: Record<string, unknown>) {
  task.status = 'succeeded';
  task.output = output;
  task.error = undefined;
  task.updatedAt = now();
  repository.updateTask(task);
}

export function failTask(task: AgentTask, error: unknown) {
  task.status = 'failed';
  task.error = error instanceof Error ? error.message : 'Knowledge generation failed.';
  task.updatedAt = now();
  repository.updateTask(task);
}

export function createWorkspace(title: string, summary: string): WorkspaceSummary {
  const timestamp = now();
  const base: WorkspaceSummary = {
    id: id('kb'),
    title,
    summary,
    stage: 'ai_skeleton',
    sourceCount: 0,
    cardCount: 0,
    sourcedRatio: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  repository.insertWorkspace(base);
  return base;
}

export function upsertDefaultWorkspace(input: string) {
  const bases = repository.listWorkspaces();
  if (bases.length > 0) return bases[0];
  return createWorkspace(compactTitle(input), `围绕「${compactTitle(input)}」生成的知识库骨架。`);
}

/**
 * 确保默认工作区存在。
 *
 * 单池存储迁移的兜底入口：当系统首次启动或默认工作区被删除后，
 * 自动重建 id=default 的全局工作区，用于承接未指定归属的卡片/资料/产物。
 *
 * @returns 默认工作区摘要
 * @author fxbin
 */
export function ensureDefaultWorkspace(): WorkspaceSummary {
  const existing = repository.findWorkspace(DEFAULT_WORKSPACE_ID);
  if (existing) return existing;
  const timestamp = now();
  const base: WorkspaceSummary = {
    id: DEFAULT_WORKSPACE_ID,
    title: DEFAULT_WORKSPACE_TITLE,
    summary: DEFAULT_WORKSPACE_SUMMARY,
    stage: 'ai_skeleton',
    sourceCount: 0,
    cardCount: 0,
    sourcedRatio: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  repository.insertWorkspace(base);
  return base;
}

/**
 * 解析知识库 ID，未指定时返回默认工作区 ID。
 *
 * 单池存储迁移的核心兜底函数：所有落库点在写入 workspaceId 前，
 * 应通过此函数解析，确保 SQLite NOT NULL 约束不被违反。
 *
 * @param workspaceId - 可选的知识库 ID
 * @returns 解析后的知识库 ID（永不为空）
 * @author fxbin
 */
export function resolveWorkspaceId(workspaceId?: string): string {
  return workspaceId && workspaceId.trim() ? workspaceId.trim() : DEFAULT_WORKSPACE_ID;
}

/**
 * 显式创建空知识库，不触发 LLM 生成。
 * 用户可通过模态输入标题和可选摘要，后续再导入资料或运行 Kit。
 */
export function createEmptyWorkspace(title: string, summary?: string): WorkspaceSummary {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    throw new KnowledgeCoreError('知识库标题不能为空。', 400);
  }
  const finalTitle = compactTitle(trimmedTitle);
  if (repository.findWorkspaceByTitle(finalTitle)) {
    throw new KnowledgeCoreError(`标题「${finalTitle}」已存在。`, 409);
  }
  const finalSummary = (summary?.trim()) || `围绕「${finalTitle}」的知识库，等待导入资料。`;
  return createWorkspace(finalTitle, finalSummary);
}

export function createMaterial(base: WorkspaceSummary, request: IntakeRequest, type: MaterialRecord['type']) {
  const timestamp = now();
  const platform = detectPlatform(request.input);
  const sourceUrl = type === 'link' ? extractFirstUrl(request.input) ?? request.input.trim() : undefined;
  const initialStatus: ParseStatus = type === 'link' ? 'saved' : 'ingested';
  const timeline: MaterialStatusTimeline = { capturedAt: timestamp };
  if (initialStatus === 'ingested') timeline.ingestedAt = timestamp;
  const material: MaterialRecord = {
    id: id('mat'),
    workspaceId: base.id,
    type,
    rawInput: request.input.trim(),
    sourceUrl,
    platform,
    title: type === 'link' ? titleFromLink(sourceUrl ?? request.input) : extractMaterialTitle(request.input),
    contentText: type === 'text' ? request.input.trim() : undefined,
    mediaUrls: [],
    parseStatus: initialStatus,
    createdAt: timestamp,
    statusTimeline: timeline,
  };
  base.sourceCount += 1;
  base.updatedAt = timestamp;
  repository.insertMaterial(material);
  repository.updateWorkspace(base);
  return material;
}

export function extractMaterialTitle(input: string) {
  const lines = input.trim().split('\n').map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return compactTitle(input);
  const firstLine = lines[0].replace(/^#+\s*/, '').trim();
  return compactTitle(firstLine || input);
}

export function createCards(
  base: WorkspaceSummary,
  material: MaterialRecord | undefined,
  seed: string,
  generatedCards: GeneratedCard[] | undefined,
) {
  const timestamp = now();
  const sourceStatus: ClaimStatus = material && material.type !== 'question' && material.parseStatus === 'ingested' ? 'sourced' : 'ai_skeleton';
  const generated = normalizeGeneratedCards(generatedCards);
  const fallbackCards: GeneratedCard[] = [
    {
      type: 'concept',
      title: `${compactTitle(seed)} 的核心概念`,
      body: material
        ? '从导入资料中提取出的第一张知识卡片，后续会由 Pi 替换为结构化生成。'
        : '根据主题先生成的 AI 骨架卡片，等待资料导入后补充来源。',
    },
    {
      type: 'question',
      title: `《${compactTitle(seed)}》还需补充的证据`,
      body: `围绕「${compactTitle(seed)}」这个主题，还需要补充哪些高质量来源、案例和可验证证据？`,
    },
  ];
  const existingCards = repository.listCards(base.id);
  const existingTitles = new Set(existingCards.map((card) => card.title.trim()));
  const cardSeeds = generated.length ? generated : fallbackCards;
  const cards: KnowledgeCard[] = cardSeeds
    .map((card) => ({
      id: id('card'),
      workspaceId: base.id,
      materialId: material?.id,
      type: normalizeCardType(card.type),
      title: compactTitle(card.title ?? `${compactTitle(seed)} 的知识卡片`),
      body: card.body?.trim() || '这张知识卡片还需要补充内容。',
      claimStatus: sourceStatus,
      createdAt: timestamp,
      updatedAt: timestamp,
    }))
    .filter((card) => {
      if (!existingTitles.has(card.title)) {
        existingTitles.add(card.title);
        return true;
      }
      return false;
    });
  base.cardCount += cards.length;
  const sourcedCount = [...existingCards, ...cards].filter((card) => card.claimStatus === 'sourced').length;
  base.sourcedRatio = base.cardCount > 0 ? sourcedCount / base.cardCount : 0;
  base.updatedAt = timestamp;
  repository.insertCards(cards);
  for (const card of cards) {
    if (card.type === 'question') {
      repository.insertAttentionSignal({
        id: id('attn'),
        workspaceId: base.id,
        signalType: ATTENTION_SIGNAL_QUESTION_CARD,
        signalStrength: ATTENTION_SIGNAL_STRONG,
        targetType: ATTENTION_TARGET_TYPE_CARD,
        targetId: card.id,
        contextData: { question: seed.substring(0, ATTENTION_CONTEXT_QUESTION_MAX_LENGTH) },
        consumed: false,
        createdAt: timestamp,
      });
    }
  }
  repository.updateWorkspace(base);
  return cards;
}

export function createArtifact(
  base: WorkspaceSummary,
  material: MaterialRecord | undefined,
  seed: string,
  generated: GeneratedKnowledgeOutput,
) {
  const timestamp = now();
  const sourceMaterialIds = material && material.type !== 'question' ? [material.id] : [];
  const artifact: ArtifactRecord = {
    id: id('art'),
    workspaceId: base.id,
    artifactType: 'summary',
    subtype: 'summary',
    title: compactTitle(generated.artifactTitle ?? `${compactTitle(seed)} 摘要`),
    body: buildSummaryArtifactBody(base, material, generated),
    sourceMaterialIds,
    createdAt: timestamp,
  };
  repository.insertArtifact(artifact);
  return artifact;
}

/**
 * 构建 summary 类型产物的结构化正文。
 *
 * 当 LLM 已生成 artifactBody 时直接使用；否则基于 summary 或占位文案，
 * 拼装为包含「摘要 / 来源边界 / 下一步行动」三个 `## ` 标题分区的 Markdown 正文，
 * 确保前端 distributeArtifactBlocks 能按标题正确分发到 3 个分区。
 *
 * @author fxbin
 */
export function buildSummaryArtifactBody(
  base: WorkspaceSummary,
  material: MaterialRecord | undefined,
  generated: GeneratedKnowledgeOutput,
): string {
  if (generated.artifactBody) return generated.artifactBody;
  const summary = generated.summary ?? (material
    ? `已保存资料「${material.title}」，并生成可继续整理的摘要占位。`
    : `已创建「${base.title}」主题骨架，下一步可以继续导入来源资料。`);
  const boundary = material
    ? `当前产物基于资料「${material.title}」生成，可在编辑模式下补充更多可追溯来源。`
    : '当前产物为主题骨架，尚未绑定具体来源资料，可在编辑模式下补充。';
  return [
    '## 摘要',
    summary,
    '## 来源边界',
    boundary,
    '## 下一步行动',
    '- 补充更多可追溯来源',
    '- 将核心卡片整理成问题与方法',
    '- 对低置信内容进行人工复核',
  ].join('\n');
}

export function createKitArtifact(
  base: WorkspaceSummary,
  kitId: KnowledgeKitId,
  sourceMaterialIds: string[],
  generated: GeneratedKnowledgeOutput,
) {
  const timestamp = now();
  const artifact: ArtifactRecord = {
    id: id('art'),
    workspaceId: base.id,
    artifactType: 'kit_report',
    subtype: kitToSubtype(kitId),
    title: compactTitle(generated.artifactTitle ?? `${base.title} ${kitLabel(kitId)}`),
    body: generated.artifactBody ?? generated.summary ?? buildFallbackKitBody(base, kitId),
    sourceMaterialIds,
    createdAt: timestamp,
  };
  repository.insertArtifact(artifact);
  base.stage = sourceMaterialIds.length > 0 ? 'grounded' : 'organizing';
  base.updatedAt = timestamp;
  repository.updateWorkspace(base);
  return artifact;
}

export function kitLabel(kitId: KnowledgeKitId) {
  if (kitId === 'content_creation') return '内容创作产物';
  if (kitId === 'product_research') return '产品调研产物';
  if (kitId === 'topic_decomposition') return '知识拆解清单';
  return '学习研究摘要';
}

export function buildFallbackKitBody(base: WorkspaceSummary, kitId: KnowledgeKitId) {
  return [
    `# ${base.title}`,
    '',
    `已运行「${kitLabel(kitId)}」。`,
    '',
    '## 核心摘要',
    base.summary,
    '',
    '## 下一步',
    '- 补充更多可追溯来源',
    '- 将核心卡片整理成问题与方法',
    '- 对低置信内容进行人工复核',
  ].join('\n');
}

export function normalizeGeneratedCards(cards: GeneratedCard[] | undefined) {
  if (!cards?.length) return [];
  return cards
    .filter((card) => isUsefulGeneratedCard(card))
    .slice(0, 6);
}

export function normalizeCardType(type: GeneratedCard['type']): KnowledgeCard['type'] {
  const allowed = new Set<KnowledgeCard['type']>(['concept', 'method', 'case', 'question', 'step', 'viewpoint']);
  return type && allowed.has(type) ? type : 'concept';
}

export const CARD_BODY_MIN_LENGTH = 18;
export const CARD_SIMILAR_TEXT_MIN_LENGTH = 6;
export const CARD_GENERIC_TITLE_PATTERNS = [
  /^(核心概念|关键概念|重要概念|主要概念)$/,
  /^(关键问题|核心问题|下一步要回答的问题|待回答问题)$/,
  /^(知识卡片|资料总结|内容总结|背景补充|后续补充方向)$/,
  /^(概念|问题|方法|案例|观点|步骤)\d*$/,
];
export const CARD_CONCEPT_SIGNAL_PATTERN = /是|指|定义|区别|边界|不是|属于|用于|依赖|条件|意味着|核心在于|本质/;
export const CARD_QUESTION_SIGNAL_PATTERN = /[?？]|如何|为什么|是否|能否|怎样|哪些|什么|何时|哪里|谁|多大|多少/;

export function normalizeCardText(value: string | undefined): string {
  return (value ?? '').trim().replace(/\s+/g, '');
}

export function isGenericCardTitle(title: string): boolean {
  return CARD_GENERIC_TITLE_PATTERNS.some((pattern) => pattern.test(title));
}

export function isMostlyRepeatedTitle(title: string, body: string): boolean {
  const normalizedTitle = normalizeCardText(title);
  const normalizedBody = normalizeCardText(body);
  return normalizedTitle.length >= CARD_SIMILAR_TEXT_MIN_LENGTH && normalizedBody === normalizedTitle;
}

export function isUsefulGeneratedCard(card: GeneratedCard): boolean {
  const title = card.title?.trim() ?? '';
  const body = card.body?.trim() ?? '';
  if (!title || !body) return false;
  if (body.length < CARD_BODY_MIN_LENGTH) return false;
  if (isGenericCardTitle(title)) return false;
  if (isMostlyRepeatedTitle(title, body)) return false;
  const type = normalizeCardType(card.type);
  if (type === 'concept') {
    return CARD_CONCEPT_SIGNAL_PATTERN.test(`${title}\n${body}`);
  }
  if (type === 'question') {
    return CARD_QUESTION_SIGNAL_PATTERN.test(`${title}\n${body}`);
  }
  return true;
}

export async function generateKnowledge(
  task: 'workspace_skeleton' | 'material_summary' | 'knowledge_cards' | 'question_answer',
  prompt: string,
  context: Record<string, unknown>,
) {
  const schema = structuredSchemas[task] as TSchema;
  const workspaceId = typeof context.workspaceId === 'string' ? context.workspaceId : undefined;
  const runtime = createInstrumentedPiRuntime(piRuntime, {
    taskType: task,
    workspaceId,
    recorder: recordAgentUsage,
  });
  return runtime.completeStructured<GeneratedKnowledgeOutput, TSchema>({
    task,
    prompt,
    schema,
    context,
  });
}

/** 文件夹导入支持的扩展名（小写）。 */
export const FOLDER_INTAKE_EXTENSIONS = ['.md', '.markdown', '.txt'];

/** 文件夹导入单文件大小上限：2MB。 */
export const FOLDER_INTAKE_MAX_FILE_SIZE = 2 * 1024 * 1024;

/** 文件夹导入扫描文件数上限，避免误扫超大目录。 */
export const FOLDER_INTAKE_MAX_FILES = 500;

/**
 * 文件夹导入允许的根目录列表。
 * 通过环境变量 ZHIJING_INTAKE_ROOT_DIRS 配置（逗号分隔的绝对路径）。
 * 默认为用户主目录（os.homedir()）。
 * 导入路径必须位于某个允许的根目录下，避免任意路径文件读取。
 * @author fxbin
 */
export const INTAKE_ALLOWED_ROOTS: readonly string[] = (() => {
  const raw = process.env.ZHIJING_INTAKE_ROOT_DIRS;
  if (raw) {
    const parsed = raw.split(',').map((item) => item.trim()).filter(Boolean).map((item) => resolve(item));
    if (parsed.length > 0) return parsed;
  }
  return [resolve(os.homedir())];
})();

/**
 * 校验导入路径是否位于允许的根目录内。
 *
 * 检查策略：用 path.relative 计算相对路径，若结果不以 `..` 开头且非绝对路径，
 * 则说明 targetPath 在 root 内。任一 root 通过即视为合法。
 *
 * @param targetPath - 待校验的绝对路径
 * @returns 通过返回 true，否则返回 false
 * @author fxbin
 */
export function isPathWithinAllowedRoots(targetPath: string): boolean {
  const normalized = resolve(targetPath);
  for (const root of INTAKE_ALLOWED_ROOTS) {
    const rel = relative(root, normalized);
    if (!rel.startsWith('..')) {
      return true;
    }
  }
  return false;
}

/**
 * 递归扫描目录，返回所有支持扩展名的文件绝对路径。
 * 跳过隐藏目录（如 .git、.zhijing）和隐藏文件。
 * @param rootPath 根目录
 * @param collected 累积的文件路径列表
 * @author fxbin
 */
export async function collectSupportedFiles(
  rootPath: string,
  collected: string[],
): Promise<void> {
  const entries = await readdir(rootPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const entryPath = join(rootPath, entry.name);
    if (entry.isDirectory()) {
      await collectSupportedFiles(entryPath, collected);
    } else if (entry.isFile()) {
      const ext = extname(entry.name).toLowerCase();
      if (FOLDER_INTAKE_EXTENSIONS.includes(ext)) {
        collected.push(entryPath);
      }
    }
  }
}

/**
 * 文件夹导入：扫描本地路径下所有 .md/.txt 文件，批量入库到指定工作区。
 *
 * 行为：
 *  - 递归扫描根目录及其子目录
 *  - 跳过隐藏目录（.git/.zhijing 等）和隐藏文件
 *  - 仅处理 .md/.markdown/.txt 文件，单文件 ≤ 2MB
 *  - 不触发 AI 处理，资料入库为 parseStatus='pending'
 *  - 单文件失败不阻断整批，错误汇总到 items[].error
 *  - 文件总数上限 500，超出抛错
 *
 * @param request 文件夹导入请求
 * @returns 导入汇总结果
 * @author fxbin
 */
export async function intakeFolderFromPath(
  request: FolderIntakeRequest,
): Promise<FolderIntakeResult> {
  const targetPath = request.path?.trim();
  if (!targetPath) {
    throw new Error('Path is required.');
  }

  const absolutePath = resolve(targetPath);
  if (!isPathWithinAllowedRoots(absolutePath)) {
    throw new Error('Path is outside of allowed intake roots.');
  }
  let pathStat;
  try {
    pathStat = await stat(absolutePath);
  } catch {
    throw new Error('Path not found or inaccessible.');
  }
  if (!pathStat.isDirectory()) {
    throw new Error('Path is not a directory.');
  }

  const workspaceId = resolveWorkspaceId(request.workspaceId);
  const base = repository.findWorkspace(workspaceId);
  if (!base) {
    throw new Error(`Workspace not found: ${workspaceId}`);
  }

  const files: string[] = [];
  await collectSupportedFiles(absolutePath, files);
  if (files.length === 0) {
    return {
      scannedPath: absolutePath,
      workspaceId,
      workspaceTitle: base.title,
      imported: 0,
      skipped: 0,
      failed: 0,
      items: [],
    };
  }
  if (files.length > FOLDER_INTAKE_MAX_FILES) {
    throw new Error(`Too many files: ${files.length} (max ${FOLDER_INTAKE_MAX_FILES}).`);
  }

  const items: FolderIntakeItem[] = [];
  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const filePath of files) {
    const relativePath = relative(absolutePath, filePath);
    const fileName = basename(filePath);
    const item: FolderIntakeItem = { relativePath, fileName, ok: false };

    try {
      const fileStat = await stat(filePath);
      if (fileStat.size > FOLDER_INTAKE_MAX_FILE_SIZE) {
        item.error = `File too large: ${fileStat.size} bytes (max ${FOLDER_INTAKE_MAX_FILE_SIZE})`;
        skipped += 1;
        items.push(item);
        continue;
      }

      const content = await readFile(filePath, 'utf8');
      const trimmed = content.trim();
      if (!trimmed) {
        item.error = 'Empty file';
        skipped += 1;
        items.push(item);
        continue;
      }

      const title = extractMaterialTitle(trimmed) || fileName;
      const timestamp = now();
      const material: MaterialRecord = {
        id: id('mat'),
        workspaceId: base.id,
        type: 'text',
        rawInput: trimmed,
        title,
        contentText: trimmed,
        mediaUrls: [],
        parseStatus: 'saved',
        createdAt: timestamp,
        statusTimeline: { capturedAt: timestamp },
      };
      repository.insertMaterial(material);
      base.sourceCount += 1;

      item.ok = true;
      item.materialId = material.id;
      imported += 1;
    } catch (err) {
      item.error = err instanceof Error ? err.message : String(err);
      failed += 1;
    }
    items.push(item);
  }

  if (imported > 0) {
    base.updatedAt = now();
    repository.updateWorkspace(base);
  }

  return {
    scannedPath: absolutePath,
    workspaceId,
    workspaceTitle: base.title,
    imported,
    skipped,
    failed,
    items,
  };
}

/** 批量文件导入单条内容大小上限：2MB。 */
export const FILE_BATCH_MAX_CONTENT_SIZE = 2 * 1024 * 1024;

/** 批量文件导入条数上限（防极端误操作，实质不限制日常使用）。 */
export const FILE_BATCH_MAX_ITEMS = 10000;

/**
 * 批量文件导入：接收前端通过 webkitdirectory 读取后的文件内容数组，批量入库。
 *
 * 与 intakeFolderFromPath 的区别：
 *  - 不扫描本地文件系统，依赖前端上传的 content
 *  - 适用于浏览器直接选择文件夹的场景（无需手动输入路径）
 *  - 单条 content ≤ 2MB，单批 ≤ 200 条
 *
 * @param request 批量文件导入请求
 * @returns 导入汇总结果
 * @author fxbin
 */
export function intakeFilesFromBatch(
  request: FileBatchIntakeRequest,
): FileBatchIntakeResult {
  if (!Array.isArray(request.items)) {
    throw new Error('items is required and must be an array.');
  }
  if (request.items.length === 0) {
    throw new Error('items is empty.');
  }
  if (request.items.length > FILE_BATCH_MAX_ITEMS) {
    throw new Error(`Too many files: ${request.items.length} (max ${FILE_BATCH_MAX_ITEMS}).`);
  }

  const workspaceId = resolveWorkspaceId(request.workspaceId);
  const base = repository.findWorkspace(workspaceId);
  if (!base) {
    throw new Error(`Workspace not found: ${workspaceId}`);
  }

  const items: FolderIntakeItem[] = [];
  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of request.items) {
    const relativePath = file.relativePath || file.fileName;
    const fileName = file.fileName || file.relativePath;
    const item: FolderIntakeItem = { relativePath, fileName, ok: false };

    try {
      const content = typeof file.content === 'string' ? file.content : '';
      const trimmed = content.trim();
      if (!trimmed) {
        item.error = 'Empty file';
        skipped += 1;
        items.push(item);
        continue;
      }
      if (trimmed.length > FILE_BATCH_MAX_CONTENT_SIZE) {
        item.error = `Content too large: ${trimmed.length} chars (max ${FILE_BATCH_MAX_CONTENT_SIZE})`;
        skipped += 1;
        items.push(item);
        continue;
      }

      const title = extractMaterialTitle(trimmed) || fileName;
      const timestamp = now();
      const material: MaterialRecord = {
        id: id('mat'),
        workspaceId: base.id,
        type: 'text',
        rawInput: trimmed,
        title,
        contentText: trimmed,
        mediaUrls: [],
        parseStatus: 'saved',
        createdAt: timestamp,
        statusTimeline: { capturedAt: timestamp },
      };
      repository.insertMaterial(material);
      base.sourceCount += 1;

      item.ok = true;
      item.materialId = material.id;
      imported += 1;
    } catch (err) {
      item.error = err instanceof Error ? err.message : String(err);
      failed += 1;
    }
    items.push(item);
  }

  if (imported > 0) {
    base.updatedAt = now();
    repository.updateWorkspace(base);
  }

  return {
    workspaceId,
    workspaceTitle: base.title,
    imported,
    skipped,
    failed,
    items,
  };
}

/**
 * 粘贴 HTML 源码入料请求。
 */
export interface RawHtmlIntakeRequest {
  /** 用户粘贴的 HTML/源码字符串 */
  html: string;
  /** 用户填写的标题（可选） */
  title?: string;
  /** 原始 URL（可选，仅用于记录 sourceUrl） */
  sourceUrl?: string;
  /** 工作区 ID；不传时落到 default */
  workspaceId?: string;
}

/**
 * 粘贴 HTML 源码入料结果。
 */
export interface RawHtmlIntakeResult {
  /** 创建的 material 记录 */
  material: MaterialRecord;
  /** 解析状态：saved/ingested/failed */
  parseStatus: MaterialRecord['parseStatus'];
  /** 提取的标题 */
  title: string;
}

/**
 * 粘贴 HTML 源码入料（无需后端访问外网）。
 *
 * 使用场景：用户浏览器能打开页面但后端无法访问（受限网络、墙、登录态等）。
 * 用户从浏览器 View Source 复制 HTML，粘贴到前端入口，后端复用 readability + turndown 解析。
 *
 * 流程：
 * 1. 解析 HTML 为 markdown
 * 2. 创建 type=text material（带 sourceUrl 但不抓取）
 * 3. 直接标记为 ingested 状态（已解析）
 *
 * @param request 入料请求
 * @returns 入料结果；HTML 过短时抛出 KnowledgeCoreError
 * @throws {KnowledgeCoreError} HTML 内容过短或解析失败
 * @author fxbin
 */
export function intakeRawHtml(request: RawHtmlIntakeRequest): RawHtmlIntakeResult {
  const html = typeof request.html === 'string' ? request.html.trim() : '';
  if (!html) {
    throw new KnowledgeCoreError('HTML content is required.', 400);
  }
  if (html.length < 120) {
    throw new KnowledgeCoreError('HTML content is too short for a reliable summary.', 400);
  }

  const fallbackTitle = request.title?.trim() || (request.sourceUrl ? titleFromLink(request.sourceUrl) : 'Pasted HTML');
  let parsed: { title: string; text: string };
  try {
    const result = parseRawHtml(html, fallbackTitle);
    parsed = { title: result.title, text: result.text };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to parse HTML.';
    throw new KnowledgeCoreError(message, 400);
  }

  const workspaceId = resolveWorkspaceId(request.workspaceId);
  const base = repository.findWorkspace(workspaceId);
  if (!base) {
    throw new KnowledgeCoreError(`Workspace not found: ${workspaceId}`, 404);
  }

  const timestamp = now();
  const material: MaterialRecord = {
    id: id('mat'),
    workspaceId: base.id,
    type: 'text',
    rawInput: parsed.text,
    sourceUrl: request.sourceUrl?.trim() || undefined,
    title: parsed.title,
    contentText: parsed.text,
    mediaUrls: [],
    parseStatus: 'ingested',
    createdAt: timestamp,
    statusTimeline: { capturedAt: timestamp, ingestedAt: timestamp },
  };
  repository.insertMaterial(material);

  return {
    material,
    parseStatus: 'ingested',
    title: parsed.title,
  };
}

export const DEFAULT_INTAKE_AUDIENCE: IntakeAudience = 'intermediate';
export const DEFAULT_INTAKE_DEPTH: IntakeDepth = 'standard';
export const DEFAULT_INTAKE_SCOPE: IntakeScope = 'panorama';

export async function intakeKnowledge(request: IntakeRequest): Promise<IntakeResult> {
  const value = request.input.trim();
  if (!value) {
    throw new Error('Input is required.');
  }

  const kind = classifyInput(value);
  const workflow = kind === 'question' ? 'answer_question' : kind === 'theme' ? 'create_workspace' : 'ingest_material';
  const task = createTask(workflow, {
    input: value,
    workspaceId: request.workspaceId,
    audience: request.audience,
    depth: request.depth,
    scope: request.scope,
  });

  try {
    let base: WorkspaceSummary | undefined;
    let material: MaterialRecord | undefined;
    if (kind !== 'theme') {
      base = (request.workspaceId ? repository.findWorkspace(request.workspaceId) : undefined) ?? upsertDefaultWorkspace(value);
      material = createMaterial(base, request, kind === 'link' ? 'link' : kind === 'question' ? 'question' : 'text');
    }

    if (kind === 'link' && base && material) {
      if (material.platform === 'xiaohongshu' || material.platform === 'douyin') {
        try {
          const parseResult = await requestMaterialParsing(material.id);
          finishTask(task, {
            kind,
            workspaceId: base.id,
            materialId: parseResult.material.id,
            parseStatus: parseResult.material.parseStatus,
            platform: parseResult.material.platform,
            sourceUrl: parseResult.material.sourceUrl,
          });
          return {
            kind,
            workspace: parseResult.workspace ?? base,
            material: parseResult.material,
            cards: parseResult.cards ?? [],
            task: parseResult.task ?? task,
            artifact: parseResult.artifact,
            message: parseResult.message ?? '链接已自动解析。',
          };
        } catch {
          finishTask(task, {
            kind,
            workspaceId: base.id,
            materialId: material.id,
            parseStatus: material.parseStatus,
            platform: material.platform,
            sourceUrl: material.sourceUrl,
          });
          return {
            kind,
            workspace: base,
            material,
            cards: [],
            task,
            message: '链接已保存，自动解析失败，可稍后手动重试。',
          };
        }
      }

      finishTask(task, {
        kind,
        workspaceId: base.id,
        materialId: material.id,
        parseStatus: material.parseStatus,
        platform: material.platform,
        sourceUrl: material.sourceUrl,
      });

      return {
        kind,
        workspace: base,
        material,
        cards: [],
        task,
        message: '链接已保存，等待正文补充或后续解析。',
      };
    }

    const generation = await generateKnowledge(
      kind === 'theme' ? 'workspace_skeleton' : kind === 'question' ? 'question_answer' : 'material_summary',
      value,
      {
        kind,
        workspaceId: base?.id,
        materialId: material?.id,
        hasSourceMaterial: Boolean(material),
        parseStatus: material?.parseStatus,
        ...(kind === 'theme' ? {
          audience: request.audience ?? DEFAULT_INTAKE_AUDIENCE,
          depth: request.depth ?? DEFAULT_INTAKE_DEPTH,
          scope: request.scope ?? DEFAULT_INTAKE_SCOPE,
        } : {}),
      },
    );
    const generated = generation.output;

    const workspace = base ?? createWorkspace(
      ensureUniqueTitle(generated.title ?? value),
      generated.summary ?? `围绕「${compactTitle(value)}」生成的知识库骨架。`,
    );

    const cards = createCards(workspace, material, value, generated.cards);
    const artifact = createArtifact(workspace, material, value, generated);

    if (kind !== 'theme' && generated.summary) {
      workspace.summary = generated.summary;
      repository.updateWorkspace(workspace);
    }

    finishTask(task, {
      kind,
      workspaceId: workspace.id,
      materialId: material?.id,
      cardIds: cards.map((card) => card.id),
      artifactId: artifact.id,
      generationProvider: generation.provider,
      generationModel: generation.model,
      generationFallbackReason: generation.fallbackReason,
    });

    return {
      kind,
      workspace,
      material,
      cards,
      task,
      artifact,
      message: kind === 'theme'
        ? '知识库骨架已创建。'
        : kind === 'link'
          ? '链接已保存，等待后续解析增强。'
          : kind === 'question'
            ? '问题已保存为当前知识库的待回答线索。'
            : '文本资料已保存并生成初始卡片。',
    };
  } catch (error) {
    failTask(task, error);
    throw error;
  }
}

export async function answerWorkspaceQuestion(workspaceId: string, question: string): Promise<IntakeResult> {
  const value = question.trim();
  if (!value) {
    throw new KnowledgeCoreError('Question is required.', 400);
  }

  const base = repository.findWorkspace(workspaceId);
  if (!base) {
    throw new KnowledgeCoreError('Knowledge base not found.', 404);
  }

  const task = createTask('answer_question', { input: value, workspaceId });

  try {
    const material = createMaterial(base, { input: value, workspaceId }, 'question');
    repository.insertAttentionSignal({
      id: id('attn'),
      workspaceId: base.id,
      signalType: ATTENTION_SIGNAL_ASK_QUESTION,
      signalStrength: ATTENTION_SIGNAL_MEDIUM,
      targetType: ATTENTION_TARGET_TYPE_QUESTION,
      targetId: material.id,
      contextData: { question: value.substring(0, ATTENTION_CONTEXT_QUESTION_MAX_LENGTH) },
      consumed: false,
      createdAt: now(),
    });
    const generationContext = buildQuestionContext(base.id, material.id, value);
    const generation = await generateKnowledge('question_answer', value, {
      kind: 'question',
      workspaceId: base.id,
      materialId: material.id,
      hasSourceMaterial: generationContext.materials.length > 0,
      parseStatus: material.parseStatus,
      ...generationContext,
    });
    const generated = generation.output;
    const citations = buildQuestionCitations(generationContext);
    const artifact = createArtifact(base, material, value, generated);
    const proposedCards: ProposedCard[] = normalizeGeneratedCards(generated.cards).map((card) => ({
      type: normalizeCardType(card.type),
      title: compactTitle(card.title ?? `${compactTitle(value)} 的知识卡片`),
      body: card.body?.trim() || '这张知识卡片还需要补充内容。',
    }));
    const messageId = id('msg');

    finishTask(task, {
      kind: 'question',
      workspaceId: base.id,
      materialId: material.id,
      cardIds: [],
      proposedCardCount: proposedCards.length,
      artifactId: artifact.id,
      generationProvider: generation.provider,
      generationModel: generation.model,
      generationFallbackReason: generation.fallbackReason,
      contextMaterialCount: generationContext.materials.length,
      contextCardCount: generationContext.cards.length,
      citationCount: citations.length,
    });

    repository.insertMessage({
      id: messageId,
      workspaceId: base.id,
      question: value,
      answer: generated.summary ?? artifact.body,
      cardIds: [],
      artifactId: artifact.id,
      materialId: material.id,
      createdAt: now(),
      proposedCards: proposedCards.length > 0 ? proposedCards : undefined,
    });

    return {
      kind: 'question',
      workspace: base,
      material,
      cards: [],
      task,
      artifact,
      citations,
      message: '问题已基于当前知识库生成回答线索。',
      proposedCards: proposedCards.length > 0 ? proposedCards : undefined,
      messageId,
    };
  } catch (error) {
    failTask(task, error);
    throw error;
  }
}

/**
 * 采纳对话生成的提议卡片，将其正式落库为 KnowledgeCard。
 * 支持逐张选择：selectedIndices 指定要采纳的提议索引，省略则采纳全部。
 * 守提议权不写入权：本函数由用户主动触发，非 Agent 自动写入。
 * @param messageId 对话消息 ID
 * @param selectedIndices 选中的提议索引列表，省略则采纳全部
 * @returns 已落库的卡片列表与更新后的消息
 * @author fxbin
 */
export function acceptProposedCards(messageId: string, selectedIndices?: number[]): { cards: KnowledgeCard[]; message: ChatMessage } {
  const message = repository.findMessage(messageId);
  if (!message) {
    throw new KnowledgeCoreError('Message not found.', 404);
  }
  if (!message.proposedCards || message.proposedCards.length === 0) {
    throw new KnowledgeCoreError('No proposed cards to accept.', 400);
  }

  const base = repository.findWorkspace(resolveWorkspaceId(message.workspaceId));
  if (!base) {
    throw new KnowledgeCoreError('Knowledge base not found.', 404);
  }

  const material = message.materialId ? repository.findMaterial(message.materialId) : undefined;

  const indices = Array.isArray(selectedIndices) && selectedIndices.length > 0
    ? selectedIndices.filter((index) => index >= 0 && index < message.proposedCards!.length)
    : message.proposedCards!.map((_, index) => index);

  if (indices.length === 0) {
    throw new KnowledgeCoreError('No valid cards selected.', 400);
  }

  const selectedProposals = indices.map((index) => message.proposedCards![index]);
  const timestamp = now();
  const cards: KnowledgeCard[] = selectedProposals.map((card) => ({
    id: id('card'),
    workspaceId: base.id,
    materialId: material?.id,
    type: normalizeCardType(card.type),
    title: compactTitle(card.title),
    body: card.body.trim() || '这张知识卡片还需要补充内容。',
    claimStatus: 'ai_skeleton',
    createdAt: timestamp,
    updatedAt: timestamp,
  }));

  base.cardCount += cards.length;
  const existingCards = repository.listCards(base.id);
  const sourcedCount = [...existingCards, ...cards].filter((card) => card.claimStatus === 'sourced').length;
  base.sourcedRatio = base.cardCount > 0 ? sourcedCount / base.cardCount : 0;
  base.updatedAt = timestamp;
  repository.insertCards(cards);
  for (const card of cards) {
    if (card.type === 'question') {
      repository.insertAttentionSignal({
        id: id('attn'),
        workspaceId: base.id,
        signalType: ATTENTION_SIGNAL_QUESTION_CARD,
        signalStrength: ATTENTION_SIGNAL_STRONG,
        targetType: ATTENTION_TARGET_TYPE_CARD,
        targetId: card.id,
        contextData: { question: message.question.substring(0, ATTENTION_CONTEXT_QUESTION_MAX_LENGTH) },
        consumed: false,
        createdAt: timestamp,
      });
    }
  }
  repository.updateWorkspace(base);

  const updatedCardIds = [...message.cardIds, ...cards.map((card) => card.id)];
  repository.updateMessageAcceptedCards(message.id, updatedCardIds);

  const proposedSnapshot = message.proposedCards ?? [];
  const acceptedEntries = selectedProposals.map((card) => ({ type: card.type, title: card.title }));
  const rejectedEntries = proposedSnapshot
    .map((card, index) => ({ card, index }))
    .filter((entry) => !indices.includes(entry.index))
    .map((entry) => ({ type: entry.card.type, title: entry.card.title }));
  logAgentAction(EVIDENCE_ACTION_ACCEPT_PROPOSED_CARDS, {
    workspaceId: base.id,
    input: {
      messageId: message.id,
      totalProposed: proposedSnapshot.length,
      selectedCount: indices.length,
    },
    output: {
      acceptedCards: acceptedEntries,
      rejectedCards: rejectedEntries,
    },
  });

  const updatedMessage = repository.findMessage(messageId);
  if (!updatedMessage) {
    throw new KnowledgeCoreError('Message update failed.', 500);
  }
  return { cards, message: updatedMessage };
}

/**
 * 批量执行 Agent 提议的结构化操作。
 *
 * 与 acceptProposedCards 的区别：本函数面向流式路径下发的 proposal_batch，
 * 直接以前端重传的 operations 数组为输入，不依赖 messages 表中的
 * proposedCards 持久化字段。
 *
 * 按 op 类型分发到既有原子函数（editCardContent / archiveCard /
 * archiveMaterial / unarchiveCard）落库；create_card 直接构造
 * KnowledgeCard 并 insertCards。每个 op 独立 try/catch，失败不影响
 * 其他 op 执行。整体写入 agent_action_log 审计。
 *
 * @param workspaceId - 工作区 ID；操作的目标卡片/资料应属于该工作区
 * @param operations - Agent 提议的操作数组（由前端重传）
 * @param selectedIndices - 采纳的下标集合；空或省略时采纳全部
 * @returns AcceptProposalBatchResponse - batchId 与每个 op 的执行结果
 * @author fxbin
 */
export function applyProposedOperations(
  workspaceId: string,
  operations: ProposedOperation[],
  selectedIndices?: number[],
): AcceptProposalBatchResponse {
  if (!Array.isArray(operations) || operations.length === 0) {
    throw new KnowledgeCoreError('No proposed operations to apply.', 400);
  }
  const base = repository.findWorkspace(workspaceId);
  if (!base) {
    throw new KnowledgeCoreError('Knowledge base not found.', 404);
  }
  const indices = Array.isArray(selectedIndices) && selectedIndices.length > 0
    ? selectedIndices.filter((index) => index >= 0 && index < operations.length)
    : operations.map((_, index) => index);
  if (indices.length === 0) {
    throw new KnowledgeCoreError('No valid operations selected.', 400);
  }
  const timestamp = now();
  const results: ProposedOperationResult[] = [];
  const createdCards: KnowledgeCard[] = [];
  for (const index of indices) {
    const operation = operations[index];
    if (!operation) {
      results.push({ index, op: 'create_card', ok: false, error: 'Invalid operation index.' });
      continue;
    }
    try {
      const opResult = executeProposedOperation(operation, base.id, timestamp);
      if (opResult.op === 'create_card' && opResult.card) {
        createdCards.push(opResult.card);
      }
      results.push({
        index,
        op: opResult.op,
        ok: true,
        cardId: opResult.cardId,
        materialId: opResult.materialId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Operation failed.';
      results.push({ index, op: operation.op, ok: false, error: message });
    }
  }
  if (createdCards.length > 0) {
    base.cardCount += createdCards.length;
    const existingCards = repository.listCards(base.id);
    const sourcedCount = [...existingCards, ...createdCards].filter((card) => card.claimStatus === 'sourced').length;
    base.sourcedRatio = base.cardCount > 0 ? sourcedCount / base.cardCount : 0;
    base.updatedAt = timestamp;
    repository.updateWorkspace(base);
  }
  logAgentAction(EVIDENCE_ACTION_ACCEPT_PROPOSED_CARDS, {
    workspaceId: base.id,
    input: {
      totalOperations: operations.length,
      selectedCount: indices.length,
    },
    output: {
      results: results.map((result) => ({
        op: result.op,
        ok: result.ok,
        error: result.error,
        cardId: result.cardId,
        materialId: result.materialId,
      })),
    },
  });
  return {
    batchId: `batch_${timestamp}_${Math.random().toString(36).slice(2, 8)}`,
    results,
  };
}

/**
 * 执行单条 ProposedOperation，按 op 类型分发到既有原子函数。
 *
 * @param operation - 单条提议操作
 * @param workspaceId - 工作区 ID
 * @param timestamp - 统一时间戳，便于审计对齐
 * @returns 包含 op / cardId? / materialId? / card? 的执行结果
 * @author fxbin
 */
export const PROPOSAL_OP_CREATE_CARD = 'create_card';
export const PROPOSAL_OP_EDIT_CARD = 'edit_card';
export const PROPOSAL_OP_ARCHIVE_CARD = 'archive_card';
export const PROPOSAL_OP_UNARCHIVE_CARD = 'unarchive_card';
export const PROPOSAL_OP_ARCHIVE_MATERIAL = 'archive_material';
export const PROPOSAL_OP_ALLOWED: ReadonlySet<string> = new Set([
  PROPOSAL_OP_CREATE_CARD,
  PROPOSAL_OP_EDIT_CARD,
  PROPOSAL_OP_ARCHIVE_CARD,
  PROPOSAL_OP_UNARCHIVE_CARD,
  PROPOSAL_OP_ARCHIVE_MATERIAL,
]);

/**
 * 校验单条提议操作的字段类型，防止前端伪造字段类型导致后续逻辑异常。
 * 仅做类型与基础非空校验，业务校验（如卡片存在性、工作区归属）由各分支处理。
 *
 * @param operation - 待校验的提议操作
 * @throws KnowledgeCoreError 当字段类型不合规时
 * @author fxbin
 */
export function assertProposedOperationShape(operation: unknown): asserts operation is ProposedOperation {
  if (!operation || typeof operation !== 'object' || Array.isArray(operation)) {
    throw new KnowledgeCoreError('Invalid proposed operation: must be a JSON object.', 400);
  }
  const op = (operation as { op?: unknown }).op;
  if (typeof op !== 'string' || !PROPOSAL_OP_ALLOWED.has(op)) {
    throw new KnowledgeCoreError(`Invalid proposed operation: unsupported op "${String(op)}".`, 400);
  }
  const rec = operation as Record<string, unknown>;
  if (op === PROPOSAL_OP_CREATE_CARD) {
    if (typeof rec.title !== 'string' || rec.title.trim().length === 0) {
      throw new KnowledgeCoreError('Invalid create_card operation: title must be a non-empty string.', 400);
    }
    if (typeof rec.body !== 'string') {
      throw new KnowledgeCoreError('Invalid create_card operation: body must be a string.', 400);
    }
    if (typeof rec.type !== 'string') {
      throw new KnowledgeCoreError('Invalid create_card operation: type must be a string.', 400);
    }
    if (rec.materialId !== undefined && (typeof rec.materialId !== 'string' || rec.materialId.trim().length === 0)) {
      throw new KnowledgeCoreError('Invalid create_card operation: materialId must be a non-empty string when present.', 400);
    }
    return;
  }
  if (op === PROPOSAL_OP_EDIT_CARD) {
    if (typeof rec.cardId !== 'string' || rec.cardId.trim().length === 0) {
      throw new KnowledgeCoreError('Invalid edit_card operation: cardId must be a non-empty string.', 400);
    }
    if (rec.title !== undefined && typeof rec.title !== 'string') {
      throw new KnowledgeCoreError('Invalid edit_card operation: title must be a string when present.', 400);
    }
    if (rec.body !== undefined && typeof rec.body !== 'string') {
      throw new KnowledgeCoreError('Invalid edit_card operation: body must be a string when present.', 400);
    }
    if (rec.type !== undefined && typeof rec.type !== 'string') {
      throw new KnowledgeCoreError('Invalid edit_card operation: type must be a string when present.', 400);
    }
    return;
  }
  if (op === PROPOSAL_OP_ARCHIVE_CARD || op === PROPOSAL_OP_UNARCHIVE_CARD) {
    if (typeof rec.cardId !== 'string' || rec.cardId.trim().length === 0) {
      throw new KnowledgeCoreError(`Invalid ${op} operation: cardId must be a non-empty string.`, 400);
    }
    return;
  }
  if (op === PROPOSAL_OP_ARCHIVE_MATERIAL) {
    if (typeof rec.materialId !== 'string' || rec.materialId.trim().length === 0) {
      throw new KnowledgeCoreError('Invalid archive_material operation: materialId must be a non-empty string.', 400);
    }
    return;
  }
}

export function executeProposedOperation(
  operation: ProposedOperation,
  workspaceId: string,
  timestamp: string,
): { op: ProposedOperationType; cardId?: string; materialId?: string; card?: KnowledgeCard } {
  assertProposedOperationShape(operation);
  switch (operation.op) {
    case 'create_card': {
      const card: KnowledgeCard = {
        id: id('card'),
        workspaceId,
        materialId: operation.materialId,
        type: normalizeCardType(operation.type),
        title: compactTitle(operation.title),
        body: operation.body.trim() || '这张知识卡片还需要补充内容。',
        claimStatus: 'ai_skeleton',
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      repository.insertCards([card]);
      return { op: 'create_card', cardId: card.id, card };
    }
    case 'edit_card': {
      const existing = repository.findCard(operation.cardId);
      if (!existing) {
        throw new KnowledgeCoreError('Card not found.', 404);
      }
      if (existing.workspaceId && existing.workspaceId !== workspaceId) {
        throw new KnowledgeCoreError('Card does not belong to the current workspace.', 403);
      }
      const changes: CardContentEdit = {};
      if (typeof operation.title === 'string' && operation.title.trim().length > 0) {
        changes.title = operation.title.trim();
      }
      if (typeof operation.body === 'string') {
        changes.body = operation.body;
      }
      if (operation.type) {
        changes.type = normalizeCardType(operation.type);
      }
      const result = editCardContent(operation.cardId, changes);
      if (!result) {
        throw new KnowledgeCoreError('Card update failed.', 500);
      }
      return { op: 'edit_card', cardId: result.card.id, card: result.card };
    }
    case 'archive_card': {
      const existing = repository.findCard(operation.cardId);
      if (!existing) {
        throw new KnowledgeCoreError('Card not found.', 404);
      }
      if (existing.workspaceId && existing.workspaceId !== workspaceId) {
        throw new KnowledgeCoreError('Card does not belong to the current workspace.', 403);
      }
      archiveCard(operation.cardId);
      return { op: 'archive_card', cardId: operation.cardId };
    }
    case 'unarchive_card': {
      const existing = repository.findCard(operation.cardId);
      if (!existing) {
        throw new KnowledgeCoreError('Card not found.', 404);
      }
      if (existing.workspaceId && existing.workspaceId !== workspaceId) {
        throw new KnowledgeCoreError('Card does not belong to the current workspace.', 403);
      }
      unarchiveCard(operation.cardId);
      return { op: 'unarchive_card', cardId: operation.cardId };
    }
    case 'archive_material': {
      const existing = repository.findMaterial(operation.materialId);
      if (!existing) {
        throw new KnowledgeCoreError('Material not found.', 404);
      }
      if (existing.workspaceId && existing.workspaceId !== workspaceId) {
        throw new KnowledgeCoreError('Material does not belong to the current workspace.', 403);
      }
      archiveMaterial(operation.materialId);
      return { op: 'archive_material', materialId: operation.materialId };
    }
    default: {
      throw new KnowledgeCoreError(`Unsupported operation: ${(operation as { op: string }).op}`, 400);
    }
  }
}

export async function runKnowledgeKit(
  workspaceId: string,
  kitId: KnowledgeKitId = 'learning_research',
): Promise<KnowledgeKitRunResult> {
  const base = repository.findWorkspace(workspaceId);
  if (!base) {
    throw new KnowledgeCoreError('Knowledge base not found.', 404);
  }

  const task = createTask('run_kit', { workspaceId, kitId });

  try {
    const context = buildKitContext(base.id);
    const prompt = kitId === 'topic_decomposition'
      ? [
          `请基于知识库「${base.title}」执行「${kitLabel(kitId)}」。`,
          '目标：把一个宽泛主题拆解为可独立学习的子主题树。',
          '产物结构：',
          '1. 主题概述：一句话概括当前主题范围与学习目标。',
          '2. 子主题清单：列出 5-8 个子主题，每个子主题给出名称、学习目标、建议难度（入门/进阶/精通）。',
          '3. 子主题依赖关系：标注哪些子主题是其他子主题的前置。',
          '4. 建议学习路径：按依赖关系给出推荐的循序渐进顺序。',
          '如果当前知识库的卡片和资料不足以支撑某个子主题，请标注「证据待补」。',
        ].join('\n')
      : [
          `请基于知识库「${base.title}」运行「${kitLabel(kitId)}」。`,
          '生成一个可以直接保存为 Markdown 的中文知识管理产物。',
          '产物需要包含：核心摘要、关键概念、行动步骤、待补证据或待回答问题。',
          '如果来源不足，请明确标注哪些内容仍是 AI 骨架。',
        ].join('\n');
    const generation = await generateKnowledge('question_answer', prompt, {
      kind: 'kit_run',
      kitId,
      workspaceId: base.id,
      workspaceTitle: base.title,
      workspaceSummary: base.summary,
      ...context,
    });
    const artifact = createKitArtifact(
      base,
      kitId,
      context.materials.map((material) => material.id),
      generation.output,
    );

    finishTask(task, {
      kind: 'kit_run',
      kitId,
      workspaceId: base.id,
      artifactId: artifact.id,
      sourceMaterialCount: context.materials.length,
      cardCount: context.cards.length,
      generationProvider: generation.provider,
      generationModel: generation.model,
      generationFallbackReason: generation.fallbackReason,
    });

    return {
      workspace: base,
      artifact,
      task,
      message: `${kitLabel(kitId)}已生成。`,
    };
  } catch (error) {
    failTask(task, error);
    throw error;
  }
}

export function assignMaterialToWorkspace(
  materialId: string,
  input: AssignMaterialRequest,
): MaterialAssignmentResult {
  const material = requireMaterial(materialId);
  const previousWorkspaceId = resolveWorkspaceId(material.workspaceId);
  const targetBase = resolveMaterialAssignmentTarget(input, material);

  material.workspaceId = targetBase.id;
  repository.updateMaterial(material);
  moveMaterialAssets(material.id, previousWorkspaceId, targetBase.id);
  reconcileWorkspaceStats(previousWorkspaceId);
  const workspace = reconcileWorkspaceStats(targetBase.id) ?? targetBase;

  return {
    material,
    workspace,
    previousWorkspaceId,
    message: previousWorkspaceId === targetBase.id
      ? '资料已在当前知识库中。'
      : `资料已移动到「${workspace.title}」。`,
  };
}

export function suggestMaterialAssignments(materialId: string): MaterialAssignmentSuggestionsResult {
  const material = requireMaterial(materialId);
  const materialText = [
    material.title,
    material.rawInput,
    material.contentText,
    material.platform,
  ].filter(Boolean).join(' ');
  const terms = tokenizeSuggestionText(materialText);
  const scored = repository.listWorkspaces()
    .map((base) => scoreWorkspaceSuggestion(base, material, terms))
    .filter((suggestion) => suggestion.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 4);
  const currentBase = repository.findWorkspace(resolveWorkspaceId(material.workspaceId));
  const currentSuggestion: MaterialAssignmentSuggestion[] = currentBase && !scored.some((item) => item.workspaceId === currentBase.id)
    ? [{
        workspaceId: currentBase.id,
        title: currentBase.title,
        score: 1,
        reason: '当前资料已归属这个知识库。',
      }]
    : [];
  const suggestions = [
    ...scored,
    ...currentSuggestion,
    {
      title: compactTitle(material.title || material.rawInput),
      score: 0,
      reason: '没有合适归属时，可以用资料标题新建知识库。',
      isNew: true,
    },
  ].slice(0, 5);

  return {
    material,
    suggestions,
    message: suggestions[0]?.isNew
      ? '建议新建知识库承接这条资料。'
      : `建议归属到「${suggestions[0]?.title ?? currentBase?.title ?? '当前知识库'}」。`,
  };
}

export function scoreWorkspaceSuggestion(
  base: WorkspaceSummary,
  material: MaterialRecord,
  terms: Set<string>,
): MaterialAssignmentSuggestion {
  const cards = repository.listCards(base.id)
    .filter((card) => card.materialId !== material.id)
    .slice(0, 8);
  const haystack = [
    base.title,
    base.summary,
    ...cards.flatMap((card) => [card.title, card.body]),
  ].join(' ');
  const baseTerms = tokenizeSuggestionText(haystack);
  let score = 0;
  for (const term of terms) {
    if (baseTerms.has(term)) score += term.length > 1 ? 2 : 1;
  }
  if (material.workspaceId === base.id) score += 3;
  const matched = [...terms].filter((term) => baseTerms.has(term)).slice(0, 3);
  return {
    workspaceId: base.id,
    title: base.title,
    score,
    reason: matched.length
      ? `匹配关键词：${matched.join('、')}`
      : material.workspaceId === base.id
        ? '当前资料已归属这个知识库。'
        : '与知识库标题或卡片内容相近。',
  };
}

export function tokenizeSuggestionText(input: string) {
  const normalized = input.toLowerCase();
  const asciiTerms = normalized.match(/[a-z0-9]{2,}/g) ?? [];
  const cjkTerms = normalized.match(/[\u4e00-\u9fa5]{2,}/g)?.flatMap((chunk) => {
    const terms = [chunk];
    for (let index = 0; index < chunk.length - 1; index += 1) {
      terms.push(chunk.slice(index, index + 2));
    }
    return terms;
  }) ?? [];
  return new Set([...asciiTerms, ...cjkTerms].filter((term) => term.length >= 2));
}

export async function completeMaterialReview(
  materialId: string,
  input: CompleteMaterialReviewRequest,
): Promise<MaterialReviewResult> {
  const material = requireMaterial(materialId);
  const workspace = repository.findWorkspace(resolveWorkspaceId(material.workspaceId));
  if (!workspace) {
    throw new KnowledgeCoreError('Knowledge base not found.', 404);
  }

  const nextTitle = normalizeSecret(input.title);
  const nextText = typeof input.contentText === 'string' ? cleanText(input.contentText) : undefined;
  const nextMediaUrls = input.mediaUrls === undefined
    ? material.mediaUrls ?? []
    : normalizeMediaUrls(input.mediaUrls);
  const markIngested = input.markIngested === true;
  const contentForGeneration = cleanText([
    nextText ?? material.contentText,
    nextMediaUrls.length ? `媒体链接：\n${nextMediaUrls.join('\n')}` : undefined,
  ].filter(Boolean).join('\n\n'));

  if (markIngested && contentForGeneration.length < 4 && nextMediaUrls.length === 0) {
    throw new KnowledgeCoreError('Content text or media URLs are required before marking a material ingested.', 400);
  }

  material.title = nextTitle ? compactTitle(nextTitle) : material.title;
  if (nextText !== undefined) material.contentText = nextText;
  material.mediaUrls = nextMediaUrls;
  stampMaterialStatus(material, markIngested ? 'ingested' : 'needs_review');
  material.parseError = markIngested ? undefined : '等待用户补充更多正文或媒体。';
  repository.updateMaterial(material);
  reconcileWorkspaceStats(material.workspaceId);

  if (!markIngested) {
    return {
      material,
      workspace: repository.findWorkspace(resolveWorkspaceId(material.workspaceId)) ?? workspace,
      message: '资料补充已保存，仍保留为待复核状态。',
    };
  }

  const task = createTask('parse_material', {
    materialId: material.id,
    workspaceId: material.workspaceId,
    source: 'manual_review',
    previousParseStatus: 'needs_review',
  });

  try {
    const generation = await generateKnowledge('material_summary', contentForGeneration, {
      kind: 'manual_review',
      workspaceId: material.workspaceId,
      materialId: material.id,
      hasSourceMaterial: true,
      parseStatus: material.parseStatus,
      sourceUrl: material.sourceUrl,
      mediaUrls: material.mediaUrls,
      mediaCount: material.mediaUrls.length,
    });
    const base = repository.findWorkspace(resolveWorkspaceId(material.workspaceId)) ?? workspace;
    const cards = createCards(base, material, contentForGeneration, generation.output.cards);
    const artifact = createArtifact(base, material, contentForGeneration, generation.output);
    const reconciledBase = reconcileWorkspaceStats(base.id) ?? base;

    finishTask(task, {
      materialId: material.id,
      parseStatus: material.parseStatus,
      source: 'manual_review',
      cardIds: cards.map((card) => card.id),
      artifactId: artifact.id,
      generationProvider: generation.provider,
      generationModel: generation.model,
      generationFallbackReason: generation.fallbackReason,
    });

    return {
      material,
      workspace: reconciledBase,
      task,
      cards,
      artifact,
      message: '资料已手动补全，并生成知识卡片。',
    };
  } catch (error) {
    failTask(task, error);
    throw error;
  }
}

export function resolveMaterialAssignmentTarget(input: AssignMaterialRequest, material: MaterialRecord) {
  const targetId = normalizeSecret(input.workspaceId);
  if (targetId) {
    const target = repository.findWorkspace(targetId);
    if (!target) {
      throw new KnowledgeCoreError('Target knowledge base not found.', 404);
    }
    return target;
  }

  const title = normalizeSecret(input.newWorkspaceTitle);
  if (title) {
    return createWorkspace(ensureUniqueTitle(title), `由资料「${material.title}」新建的知识库。`);
  }

  throw new KnowledgeCoreError('Target knowledge base or new title is required.', 400);
}

export function moveMaterialAssets(materialId: string, previousWorkspaceId: string, nextWorkspaceId: string) {
  if (previousWorkspaceId === nextWorkspaceId) return;
  const movedCardIds = new Set<string>();
  for (const card of repository.listCards(previousWorkspaceId)) {
    if (card.materialId !== materialId) continue;
    card.workspaceId = nextWorkspaceId;
    card.updatedAt = now();
    repository.updateCard(card);
    movedCardIds.add(card.id);
  }
  for (const artifact of repository.listArtifacts(previousWorkspaceId)) {
    if (!artifact.sourceMaterialIds.includes(materialId)) continue;
    artifact.workspaceId = nextWorkspaceId;
    repository.updateArtifact(artifact);
  }
  for (const entity of repository.listEntities(previousWorkspaceId)) {
    if (!entity.sourceCardIds.some((id) => movedCardIds.has(id))) continue;
    repository.deleteEntity(entity.id);
  }
}

export function reconcileWorkspaceStats(workspaceId?: string) {
  const resolved = resolveWorkspaceId(workspaceId);
  const base = repository.findWorkspace(resolved);
  if (!base) return undefined;
  const materials = repository.listMaterials(base.id);
  const cards = repository.listCards(base.id);
  const sourcedCards = cards.filter((card) => card.claimStatus === 'sourced').length;
  base.sourceCount = materials.length;
  base.cardCount = cards.length;
  base.sourcedRatio = cards.length > 0 ? sourcedCards / cards.length : 0;
  base.stage = materials.some((material) => material.parseStatus === 'ingested')
    ? 'grounded'
    : cards.length > 0
      ? 'organizing'
      : 'ai_skeleton';
  base.updatedAt = now();
  repository.updateWorkspace(base);
  return base;
}

export function deleteMaterial(materialId: string): { materialId: string; workspaceId: string } {
  const material = repository.findMaterial(materialId);
  if (!material) {
    throw new KnowledgeCoreError('Material not found.', 404);
  }
  const workspaceId = resolveWorkspaceId(material.workspaceId);
  for (const artifact of repository.listArtifacts()) {
    if (!artifact.sourceMaterialIds.includes(materialId)) continue;
    artifact.sourceMaterialIds = artifact.sourceMaterialIds.filter((id) => id !== materialId);
    repository.updateArtifact(artifact);
  }
  repository.deleteMaterial(materialId);
  reconcileWorkspaceStats(workspaceId);
  return { materialId, workspaceId };
}

/**
 * 永久删除指定卡片。
 * 与归档（软删除）不同，此操作会从 cards 主表移除记录，
 * 并通过 ON DELETE CASCADE 级联清理卡片修订、地图自定义边等关联数据，
 * 同时同步全文索引、zvec 向量索引与工作区统计。操作不可撤销。
 * @author fxbin
 * @param {string} cardId - 待删除的卡片 ID
 * @returns {{ cardId: string; workspaceId: string }} 被删除卡片的 ID 及其所属工作区 ID
 * @throws {KnowledgeCoreError} 卡片不存在时抛出 404
 */
export function deleteCard(cardId: string): { cardId: string; workspaceId: string } {
  const card = repository.findCard(cardId);
  if (!card) {
    throw new KnowledgeCoreError('Card not found.', 404);
  }
  const workspaceId = resolveWorkspaceId(card.workspaceId);
  for (const entity of repository.listEntities(workspaceId)) {
    if (!entity.sourceCardIds.includes(cardId)) continue;
    entity.sourceCardIds = entity.sourceCardIds.filter((id) => id !== cardId);
    if (entity.sourceCardIds.length === 0) {
      repository.deleteEntity(entity.id);
    } else {
      repository.upsertEntity(entity);
    }
  }
  for (const message of repository.listMessages(workspaceId)) {
    if (!message.cardIds.includes(cardId)) continue;
    const updatedCardIds = message.cardIds.filter((id) => id !== cardId);
    repository.updateMessageAcceptedCards(message.id, updatedCardIds);
  }
  for (const record of repository.listDecisionLog({ workspaceId })) {
    if (!record.evidenceCardIds.includes(cardId)) continue;
    record.evidenceCardIds = record.evidenceCardIds.filter((id) => id !== cardId);
    repository.insertDecisionLog(record);
  }
  repository.deleteCard(cardId);
  reconcileWorkspaceStats(workspaceId);
  return { cardId, workspaceId };
}

export function getMaterialDeletionImpact(materialId: string): {
  materialId: string;
  workspaceId: string;
  title: string;
  linkedCardCount: number;
  artifactReferenceCount: number;
} {
  const material = repository.findMaterial(materialId);
  if (!material) {
    throw new KnowledgeCoreError('Material not found.', 404);
  }
  const workspaceId = resolveWorkspaceId(material.workspaceId);
  const linkedCardCount = repository
    .listCards(workspaceId)
    .filter((card) => card.materialId === materialId)
    .length;
  const artifactReferenceCount = repository
    .listArtifacts(workspaceId)
    .filter((artifact) => artifact.sourceMaterialIds.includes(materialId))
    .length;
  return {
    materialId,
    workspaceId,
    title: material.title,
    linkedCardCount,
    artifactReferenceCount,
  };
}

export function normalizeMediaUrls(values: string[]) {
  return uniqueStrings(values
    .flatMap((value) => value.split(/\s+/))
    .map((value) => value.trim())
    .filter((value) => /^https?:\/\//i.test(value)));
}

export function buildKitContext(workspaceId: string) {
  const materials = repository.listMaterials(workspaceId)
    .slice(0, 12)
    .map((material) => ({
      id: material.id,
      type: material.type,
      title: material.title,
      platform: material.platform,
      parseStatus: material.parseStatus,
      sourceUrl: material.sourceUrl,
      mediaUrls: material.mediaUrls ?? [],
      contentPreview: compactPreview(material.contentText ?? material.rawInput),
    }));
  const cards = repository.listCards(workspaceId)
    .slice(0, 16)
    .map((card) => ({
      id: card.id,
      type: card.type,
      title: card.title,
      bodyPreview: compactPreview(card.body),
      claimStatus: card.claimStatus,
    }));
  const artifacts = repository.listArtifacts(workspaceId, 4)
    .map((artifact) => ({
      id: artifact.id,
      type: artifact.artifactType,
      title: artifact.title,
      bodyPreview: compactPreview(artifact.body),
    }));
  return { materials, cards, artifacts };
}

export function buildQuestionContext(workspaceId: string, questionMaterialId: string, question: string) {
  const materials = repository.searchMaterialsByRelevance(workspaceId, question, CONTEXT_RETRIEVAL_LIMIT)
    .filter((material) => material.id !== questionMaterialId)
    .map((material) => ({
      id: material.id,
      type: material.type,
      title: material.title,
      platform: material.platform,
      parseStatus: material.parseStatus,
      sourceUrl: material.sourceUrl,
      mediaUrls: material.mediaUrls ?? [],
      contentPreview: compactPreview(material.contentText ?? material.rawInput),
    }));
  const cards = repository.searchCardsByRelevance(workspaceId, question, CONTEXT_RETRIEVAL_LIMIT)
    .map((card) => ({
      id: card.id,
      type: card.type,
      title: card.title,
      bodyPreview: compactPreview(card.body),
      claimStatus: card.claimStatus,
    }));
  return { materials, cards };
}

export function buildQuestionCitations(context: ReturnType<typeof buildQuestionContext>): KnowledgeCitation[] {
  const materialCitations: KnowledgeCitation[] = context.materials.slice(0, 5).map((material) => ({
    id: `citation:material:${material.id}`,
    kind: 'material',
    materialId: material.id,
    title: material.title,
    preview: material.contentPreview,
    sourceUrl: material.sourceUrl,
  }));
  const cardCitations: KnowledgeCitation[] = context.cards.slice(0, 5).map((card) => ({
    id: `citation:card:${card.id}`,
    kind: 'card',
    cardId: card.id,
    title: card.title,
    preview: card.bodyPreview,
  }));
  return [...materialCitations, ...cardCitations];
}

export const PREVIEW_DEFAULT_MAX_LENGTH = 160;

/**
 * 命中位置周围 snippet 提取的上下文填充字符数（前后各 padding 字符）。
 */
export const SNIPPET_CONTEXT_PADDING = 60;

/**
 * 从资料正文中提取命中关键词周围的上下文片段。
 *
 * 行为：
 * - 若 query 在 contentText 中能找到（大小写不敏感），从首次命中位置向前取 padding 字符、
 *   向后取 maxLength-padding 字符，确保片段包含命中词并展示上下文。
 * - 若 query 不在正文中（如分词后命中），回退到 compactPreview 从头截取。
 * - 多命中时取第一个命中位置，避免片段跳动。
 *
 * @param contentText - 资料完整正文
 * @param query - 用户检索词
 * @param maxLength - 片段最大字符数，默认 160
 * @returns 包含命中词的上下文片段；未命中时回退到开头截取
 * @author fxbin
 */
export function buildSnippetAroundQuery(contentText: string, query: string, maxLength: number = PREVIEW_DEFAULT_MAX_LENGTH): string {
  const cleaned = contentText.replace(/\s+/g, ' ').trim();
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength)}...` : cleaned;
  }
  const lowerCleaned = cleaned.toLowerCase();
  const lowerQuery = trimmedQuery.toLowerCase();
  const hitIndex = lowerCleaned.indexOf(lowerQuery);
  if (hitIndex < 0) {
    return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength)}...` : cleaned;
  }
  const start = Math.max(0, hitIndex - SNIPPET_CONTEXT_PADDING);
  const end = Math.min(cleaned.length, start + maxLength);
  const snippet = cleaned.slice(start, end);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < cleaned.length ? '...' : '';
  return `${prefix}${snippet}${suffix}`;
}

export function compactPreview(input: string, maxLength: number = PREVIEW_DEFAULT_MAX_LENGTH) {
  const cleaned = input.replace(/\s+/g, ' ').trim();
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength)}...` : cleaned;
}

export async function requestMaterialParsing(materialId: string): Promise<MaterialParseQueueResult> {
  const material = requireLinkMaterial(materialId);
  if (!canParseWithServerParser(material)) {
    return queueMaterialParsing(material);
  }

  const activeTask = findActiveParseTask(material.id);
  if (activeTask) {
    if (material.parseStatus !== 'parsing') {
      stampMaterialStatus(material, 'parsing');
      material.parseError = undefined;
      repository.updateMaterial(material);
      touchWorkspace(material.workspaceId);
    }
    return {
      material,
      task: activeTask,
      queued: false,
      retry: false,
      message: '链接解析已在队列中。',
    };
  }

  if (material.parseStatus === 'ingested' && material.contentText) {
    const task = createTask(
      'parse_material',
      {
        materialId: material.id,
        workspaceId: material.workspaceId,
        sourceUrl: material.sourceUrl,
        platform: material.platform,
        previousParseStatus: material.parseStatus,
      },
      'succeeded',
    );
    finishTask(task, {
      materialId: material.id,
      parseStatus: material.parseStatus,
      queueState: 'already_ingested',
      contentLength: material.contentText.length,
    });
    return {
      material,
      task,
      queued: false,
      retry: false,
      message: '链接资料已解析，无需重复处理。',
    };
  }

  const cached = readParserCache(material);
  if (cached) {
    const retry = material.parseStatus === 'failed' || material.parseStatus === 'needs_review';
    const task = createTask(
      'parse_material',
      {
        materialId: material.id,
        workspaceId: material.workspaceId,
        sourceUrl: material.sourceUrl,
        platform: material.platform,
        previousParseStatus: material.parseStatus,
        governance: 'cache_hit',
      },
      'running',
    );
    return applyParsedMaterialResult(material, task, cached.parsed, retry, {
      queueState: 'cache_hit',
      cacheHit: true,
      message: '链接解析已从本地缓存复用，并生成知识卡片。',
    });
  }

  const throttle = checkParseThrottle(material);
  if (throttle.blocked) {
    const task = createTask(
      'parse_material',
      {
        materialId: material.id,
        workspaceId: material.workspaceId,
        sourceUrl: material.sourceUrl,
        platform: material.platform,
        previousParseStatus: material.parseStatus,
        governance: 'throttled',
      },
      'needs_user_action',
    );
    stampMaterialStatus(material, 'needs_review');
    material.parseError = throttle.message;
    repository.updateMaterial(material);
    touchWorkspace(material.workspaceId);
    task.output = {
      materialId: material.id,
      parseStatus: material.parseStatus,
      queueState: 'throttled',
      retryAfterMs: throttle.retryAfterMs,
      classification: 'blocked',
    };
    task.updatedAt = now();
    repository.updateTask(task);
    return {
      material,
      task,
      queued: false,
      retry: true,
      message: throttle.message ?? '解析请求过于频繁，请稍后重试或手动补充正文。',
    };
  }

  const previousStatus = material.parseStatus;
  stampMaterialStatus(material, 'parsing');
  material.parseError = undefined;
  repository.updateMaterial(material);
  touchWorkspace(material.workspaceId);

  const retry = previousStatus === 'failed' || previousStatus === 'needs_review';
  const task = createTask(
    'parse_material',
    {
      materialId: material.id,
      workspaceId: material.workspaceId,
      sourceUrl: material.sourceUrl,
      platform: material.platform,
      previousParseStatus: previousStatus,
    },
    'running',
  );

  try {
    recordParseAttempt(material);
    const parsed = material.platform === 'xiaohongshu'
      ? await parseXiaohongshuMaterial(material)
      : material.platform === 'douyin'
        ? await parseDouyinMaterial(material)
        : await parseOrdinaryWebMaterial(material);
    rememberParserCache(material, parsed);
    return applyParsedMaterialResult(material, task, parsed, retry);
  } catch (error) {
    return failMaterialParsingTask(material, task, error);
  }
}

export async function applyParsedMaterialResult(
  material: MaterialRecord,
  task: AgentTask,
  parsed: ParsedMaterialContent,
  retry: boolean,
  governance: {
    queueState?: string;
    cacheHit?: boolean;
    message?: string;
  } = {},
): Promise<MaterialParseQueueResult> {
  material.title = parsed.title ? compactTitle(parsed.title) : material.title;
  material.contentText = parsed.text;
  material.mediaUrls = parsed.mediaUrls ?? [];
  stampMaterialStatus(material, parsed.needsReview ? 'needs_review' : 'ingested');
  material.parseError = parsed.reviewReason;
  repository.updateMaterial(material);

  if (material.parseStatus === 'ingested' && material.mediaUrls.some(isVideoMediaUrl) && !material.transcriptStatus) {
    scheduleMaterialTranscription(material);
  }

  const base = repository.findWorkspace(resolveWorkspaceId(material.workspaceId));
  if (!base) {
    throw new KnowledgeCoreError('Knowledge base not found.', 404);
  }

  let cards: KnowledgeCard[] = [];
  let artifact: ArtifactRecord | undefined;
  let generationProvider: string | undefined;
  let generationModel: string | undefined;
  let generationFallbackReason: string | undefined;

  try {
    const generation = await generateKnowledge('material_summary', parsed.text, {
      kind: 'link',
      workspaceId: base.id,
      materialId: material.id,
      hasSourceMaterial: true,
      parseStatus: material.parseStatus,
      sourceUrl: material.sourceUrl,
      parsedTitle: parsed.title,
      contentLength: parsed.text.length,
      mediaUrls: material.mediaUrls,
      mediaCount: material.mediaUrls.length,
      needsReview: parsed.needsReview,
      cacheHit: governance.cacheHit,
    });
    const generated = generation.output;
    cards = createCards(base, material, parsed.text, generated.cards);
    artifact = createArtifact(base, material, parsed.text, generated);
    generationProvider = generation.provider;
    generationModel = generation.model;
    generationFallbackReason = generation.fallbackReason;
  } catch (generationError) {
    task.error = cleanParseError(generationError instanceof Error
      ? generationError.message
      : 'Knowledge card generation failed.');
  }

  finishTask(task, {
    materialId: material.id,
    parseStatus: material.parseStatus,
    queueState: governance.queueState ?? (parsed.needsReview ? 'needs_review' : 'completed'),
    retry,
    cacheHit: governance.cacheHit,
    contentLength: parsed.text.length,
    mediaCount: material.mediaUrls.length,
    cardIds: cards.map((card) => card.id),
    artifactId: artifact?.id,
    generationProvider,
    generationModel,
    generationFallbackReason,
  });

  return {
    material,
    task,
    workspace: base,
    cards,
    artifact,
    queued: false,
    retry,
    message: governance.message ?? (parsed.needsReview
      ? '链接已保存，公开页面暂未暴露完整正文或媒体，需要稍后重试或手动补充。'
      : cards.length === 0
        ? '链接已解析并保存内容，知识卡片生成失败，可稍后重试。'
        : material.platform === 'xiaohongshu'
          ? '小红书笔记已解析并生成知识卡片。'
          : '普通网页已解析并生成知识卡片。'),
  };
}

export function readParserCache(material: MaterialRecord) {
  const key = parserCacheKey(material);
  if (!key) return undefined;
  const cached = parserResultCache.get(key);
  if (!cached) return undefined;
  if (Date.now() - cached.cachedAt > parserCacheTtlMs()) {
    parserResultCache.delete(key);
    return undefined;
  }
  return cached;
}

export function rememberParserCache(material: MaterialRecord, parsed: ParsedMaterialContent) {
  const key = parserCacheKey(material);
  const hasUsableContent = parsed.text.length >= 4 || (parsed.mediaUrls?.length ?? 0) > 0;
  if (!key || parsed.needsReview || !hasUsableContent) return;
  parserResultCache.set(key, {
    parsed,
    platform: material.platform ?? 'web',
    cachedAt: Date.now(),
  });
}

export function parserCacheKey(material: MaterialRecord) {
  const sourceUrl = material.sourceUrl ?? extractFirstUrl(material.rawInput);
  if (!sourceUrl) return undefined;
  try {
    const url = new URL(sourceUrl);
    url.hash = '';
    return `${material.platform ?? 'web'}:${url.toString()}`;
  } catch {
    return `${material.platform ?? 'web'}:${sourceUrl.trim()}`;
  }
}

export function parserCacheTtlMs() {
  const value = Number.parseInt(process.env.ZHIJING_PARSE_CACHE_TTL_MS ?? '', 10);
  return Number.isFinite(value) && value >= 0 ? value : 6 * 60 * 60 * 1000;
}

export function checkParseThrottle(material: MaterialRecord) {
  const intervalMs = parseThrottleMs(material.platform);
  if (intervalMs <= 0) return { blocked: false };
  const platform = material.platform ?? 'web';
  const lastParsedAt = platformParseTimestamps.get(platform) ?? 0;
  const elapsed = Date.now() - lastParsedAt;
  if (elapsed >= intervalMs) return { blocked: false };
  const retryAfterMs = intervalMs - elapsed;
  return {
    blocked: true,
    retryAfterMs,
    message: `${platform} 解析请求过于频繁，建议 ${Math.ceil(retryAfterMs / 1000)} 秒后重试，或先手动补充正文。`,
  };
}

export function recordParseAttempt(material: MaterialRecord) {
  const platform = material.platform ?? 'web';
  const now = Date.now();
  platformParseTimestamps.set(platform, now);
  for (const [key, lastParsedAt] of platformParseTimestamps) {
    if (key === platform) continue;
    const intervalMs = parseThrottleMs(key);
    if (intervalMs <= 0 || now - lastParsedAt >= intervalMs) {
      platformParseTimestamps.delete(key);
    }
  }
}

export function parseThrottleMs(platform: string | undefined) {
  const envKey = platform === 'xiaohongshu' ? 'ZHIJING_XHS_PARSE_THROTTLE_MS' : 'ZHIJING_WEB_PARSE_THROTTLE_MS';
  const explicit = Number.parseInt(process.env[envKey] ?? process.env.ZHIJING_PARSE_THROTTLE_MS ?? '', 10);
  if (Number.isFinite(explicit)) return Math.max(0, explicit);
  return platform === 'xiaohongshu' ? 3000 : 1000;
}

export function queueMaterialParsing(material: MaterialRecord): MaterialParseQueueResult {
  const activeTask = findActiveParseTask(material.id);
  if (activeTask) {
    if (material.parseStatus !== 'parsing') {
      stampMaterialStatus(material, 'parsing');
      material.parseError = undefined;
      repository.updateMaterial(material);
      touchWorkspace(material.workspaceId);
    }
    return {
      material,
      task: activeTask,
      queued: false,
      retry: false,
      message: '链接解析已在队列中。',
    };
  }

  const previousStatus = material.parseStatus;
  stampMaterialStatus(material, 'parsing');
  material.parseError = undefined;
  repository.updateMaterial(material);
  touchWorkspace(material.workspaceId);

  const retry = previousStatus === 'failed' || previousStatus === 'needs_review';
  const task = createTask(
    'parse_material',
    {
      materialId: material.id,
      workspaceId: material.workspaceId,
      sourceUrl: material.sourceUrl,
      platform: material.platform,
      previousParseStatus: previousStatus,
    },
    'queued',
  );
  task.output = {
    materialId: material.id,
    parseStatus: material.parseStatus,
    queueState: 'queued',
    retry,
  };
  repository.updateTask(task);

  return {
    material,
    task,
    queued: true,
    retry,
    message: retry ? '链接解析已重新加入队列。' : '链接解析已加入队列。',
  };
}

export function recordMaterialParsingFailure(
  materialId: string,
  errorMessage: string,
  taskId?: string,
): MaterialParseQueueResult {
  const material = requireLinkMaterial(materialId);
  const task = taskId ? requireParseTask(taskId, material.id) : findActiveParseTask(material.id) ?? createTask(
    'parse_material',
    {
      materialId: material.id,
      workspaceId: material.workspaceId,
      sourceUrl: material.sourceUrl,
      platform: material.platform,
      previousParseStatus: material.parseStatus,
    },
  );
  const parseError = cleanParseError(errorMessage);

  stampMaterialStatus(material, 'failed');
  material.parseError = parseError;
  repository.updateMaterial(material);
  touchWorkspace(material.workspaceId);

  task.status = 'failed';
  task.error = parseError;
  task.output = {
    materialId: material.id,
    parseStatus: material.parseStatus,
    queueState: 'failed',
  };
  task.updatedAt = now();
  repository.updateTask(task);

  return {
    material,
    task,
    queued: false,
    retry: false,
    message: '解析失败已记录，可稍后重试。',
  };
}

export function canParseWithServerParser(material: MaterialRecord) {
  return material.platform === 'xiaohongshu' || material.platform === 'douyin' || material.platform === 'web' || material.platform === undefined;
}

export async function parseOrdinaryWebMaterial(material: MaterialRecord): Promise<ParsedMaterialContent> {
  const sourceUrl = material.sourceUrl;
  if (!sourceUrl) {
    throw new KnowledgeCoreError('Material source URL is required for parsing.', 400);
  }

  const jinaParsed = await tryParseWithJinaReader(sourceUrl);
  if (jinaParsed) return jinaParsed;

  const fetched = await fetchUrlAsMarkdown(sourceUrl);
  return {
    title: fetched.title,
    text: fetched.text,
    mediaUrls: fetched.mediaUrls,
  };
}

export const DOUYIN_SCRIPT_PATH = join(PROJECT_ROOT, 'scripts', 'douyin_extract.py');
export const DOUYIN_EXTRACT_TIMEOUT_MS = 90_000;
export const DOUYIN_EXTRACT_MAX_BUFFER = 2 * 1024 * 1024;
export const DOUYIN_VIDEO_CDN_INDICATOR = 'douyinvod';
export const DOUYIN_REFERER = 'https://www.douyin.com/';

/**
 * SSRF 安全 fetch 单例：用于 index.ts 内所有外部抓取路径（Jina Reader 等）。
 * 每次重定向后会重新校验目标 URL，避免外部 302 重定向到内网地址。
 * @author fxbin
 */
export const ssrfSafeFetch = createSafeFetch();

/**
 * 抖音提取脚本返回的 JSON 结构
 * @author fxbin
 */
export interface DouyinExtractResult {
  play_addr?: string;
  cover?: string;
  dynamic_cover?: string;
  origin_cover?: string;
  desc?: string;
  aweme_id?: string;
  nickname?: string;
  author_id?: string;
  digg_count?: number;
  comment_count?: number;
  share_count?: number;
  duration?: number;
  page_url?: string;
  error?: string;
}

/**
 * 从用户输入文本中提取第一个抖音链接
 * @param input - 用户原始输入（分享文本）
 * @returns 抖音链接或 undefined
 * @author fxbin
 */
export function extractFirstDouyinUrl(input: string | undefined): string | undefined {
  if (!input) return undefined;
  const urls = extractUrls(input).filter((url) => /douyin\.com|iesdouyin\.com/i.test(url));
  return urls[0];
}

/**
 * 解析抖音短视频资料：调用外部 Python 脚本（f2 + Playwright 混合方案）提取视频元数据。
 * f2 内置 msToken/a_bogus 签名算法发起 API 请求，Playwright 仅定期获取访客 cookie 并缓存。
 *
 * 外部脚本路径：scripts/douyin_extract.py
 * 依赖：Python3 + f2 + Playwright（需安装 Chromium）
 * 代理：通过 DOUYIN_PROXY / HTTP_PROXY 环境变量配置
 *
 * @param material - 抖音资料记录
 * @returns 解析后的内容（标题、正文、媒体 URL 列表）
 * @author fxbin
 */
export async function parseDouyinMaterial(material: MaterialRecord): Promise<ParsedMaterialContent> {
  const inputUrl = extractFirstDouyinUrl(material.rawInput) ?? material.sourceUrl;
  if (!inputUrl) {
    throw new KnowledgeCoreError('Douyin source URL is required for parsing.', 400);
  }

  let stdout: string;
  try {
    const result = await execFileAsync('python3', [DOUYIN_SCRIPT_PATH, inputUrl], {
      timeout: DOUYIN_EXTRACT_TIMEOUT_MS,
      maxBuffer: DOUYIN_EXTRACT_MAX_BUFFER,
      env: { ...process.env },
    });
    stdout = result.stdout;
  } catch (error) {
    const execError = error as { message?: string; stdout?: string; stderr?: string; code?: number | string };
    const message = error instanceof Error ? error.message : String(error);
    const exitCode = execError.code ? `（退出码 ${execError.code}）` : '';
    const stderrSnippet = execError.stderr ? `\nstderr: ${execError.stderr.slice(0, 500)}` : '';
    const stdoutSnippet = execError.stdout ? `\nstdout: ${execError.stdout.slice(0, 500)}` : '';
    throw new Error(`抖音提取脚本执行失败${exitCode}：${message}${stdoutSnippet}${stderrSnippet}`);
  }

  let data: DouyinExtractResult;
  try {
    data = JSON.parse(stdout) as DouyinExtractResult;
  } catch {
    throw new Error('抖音提取脚本返回了无效的 JSON。');
  }

  if (data.error) {
    throw new Error(`抖音提取失败：${data.error}`);
  }

  if (!data.play_addr) {
    throw new Error('抖音 API 响应中未找到视频地址。');
  }

  const mediaUrls = [data.play_addr];
  const coverUrl = data.cover ?? data.origin_cover ?? data.dynamic_cover;
  if (coverUrl) mediaUrls.push(coverUrl);

  const textParts = [
    data.desc,
    data.nickname ? `作者：${data.nickname}` : '',
    data.digg_count ? `点赞：${data.digg_count}` : '',
    data.comment_count ? `评论：${data.comment_count}` : '',
    data.share_count ? `分享：${data.share_count}` : '',
    data.duration ? `时长：${Math.round(data.duration / 1000)}秒` : '',
    data.page_url ? `来源链接：${data.page_url}` : '',
  ].filter(Boolean);

  return {
    title: compactTitle(data.desc ?? '抖音视频'),
    text: cleanText(textParts.join('\n\n')).slice(0, 18_000),
    mediaUrls,
  };
}

/**
 * 预热抖音访客 cookie：异步调用脚本获取并缓存 cookie，不阻塞服务启动。
 * 失败时静默处理，不影响服务运行；首次实际提取时会自动重试。
 *
 * @author fxbin
 */
export async function prewarmDouyinCookie(): Promise<void> {
  try {
    await execFileAsync('python3', [DOUYIN_SCRIPT_PATH, '--prewarm'], {
      timeout: DOUYIN_EXTRACT_TIMEOUT_MS,
      maxBuffer: DOUYIN_EXTRACT_MAX_BUFFER,
      env: { ...process.env },
    });
  } catch {
    // 预热失败不阻塞服务，首次实际提取时会自动获取 cookie
  }
}

export async function parseXiaohongshuMaterial(material: MaterialRecord): Promise<ParsedMaterialContent> {
  const shareInfo = parseXiaohongshuShareInput(material.rawInput) ?? parseXiaohongshuShareInput(material.sourceUrl ?? '');
  if (!shareInfo) {
    throw new KnowledgeCoreError('Xiaohongshu source URL is required for parsing.', 400);
  }

  const parsed = await tryParseXiaohongshuPublicShare(material, shareInfo);

  if (!parsed.needsReview && parsed.text.length < 4 && (parsed.mediaUrls?.length ?? 0) === 0) {
    throw new Error('Xiaohongshu parser returned no usable note text or media.');
  }

  return {
    title: parsed.title,
    text: parsed.text.slice(0, 18_000),
    mediaUrls: parsed.mediaUrls,
    needsReview: parsed.needsReview,
    reviewReason: parsed.reviewReason,
  };
}

export async function tryParseXiaohongshuPublicShare(
  material: MaterialRecord,
  shareInfo: XiaohongshuShareInfo,
): Promise<ParsedMaterialContent> {
  const titleFromShare = extractXiaohongshuShareTitle(material.rawInput);
  const publicParsed = await tryParseXiaohongshuPublicPage(shareInfo.sourceUrl);
  if (publicParsed && (publicParsed.text.length >= 4 || (publicParsed.mediaUrls?.length ?? 0) > 0)) {
    return {
      title: publicParsed.title ?? titleFromShare,
      text: publicParsed.text,
      mediaUrls: publicParsed.mediaUrls,
    };
  }

  const title = titleFromShare ?? titleFromLink(shareInfo.sourceUrl);
  const hasCookie = Boolean(normalizeSecret(process.env.XHS_COOKIE ?? process.env.XIAOHONGSHU_COOKIE));
  return {
    title,
    text: cleanText([title, `来源链接：${shareInfo.sourceUrl}`].filter(Boolean).join('\n\n')),
    mediaUrls: [],
    needsReview: true,
    reviewReason: hasCookie
      ? '公开页面没有暴露可解析的笔记状态，可能需要稍后重试或手动补充正文媒体。'
      : '未配置 XHS_COOKIE 环境变量，小红书反爬限制下无法获取笔记内容。请在 .env 中设置 XHS_COOKIE 后重试，或手动补充正文媒体。',
  };
}

export function extractXiaohongshuShareTitle(input: string | undefined) {
  if (!input) return undefined;
  const bracketTitle = input.match(/【(.+?)(?:\s+-\s+[^】]+)?】/)?.[1];
  if (bracketTitle) return cleanText(bracketTitle);
  const beforeUrl = input.split(/https?:\/\//i)[0]?.trim();
  return beforeUrl ? compactTitle(beforeUrl.replace(/^\d+\s*/, '')) : undefined;
}

/**
 * 小红书公开页面抓取超时（毫秒）。
 */
export const XIAOHONGSHU_FETCH_TIMEOUT_MS = 12_000;

export async function tryParseXiaohongshuPublicPage(sourceUrl: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), XIAOHONGSHU_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(sourceUrl, {
      signal: controller.signal,
      redirect: 'follow',
      headers: xiaohongshuRequestHeaders(),
    });
    if (!response.ok) return undefined;
    return normalizeXiaohongshuInitialStateHtml(await response.text());
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

export function parseXiaohongshuShareInput(input: string | undefined): XiaohongshuShareInfo | undefined {
  if (!input) return undefined;
  const urls = extractUrls(input).filter((url) => /xiaohongshu\.com|xhslink\.com/i.test(url));
  for (const candidate of urls.length ? urls : [input]) {
    try {
      const url = new URL(candidate);
      if (!/xiaohongshu\.com|xhslink\.com/i.test(url.hostname)) continue;
      const noteId = extractXiaohongshuNoteId(url);
      const xsecToken = url.searchParams.get('xsec_token') ?? url.searchParams.get('xsecToken');
      if (noteId || /xhslink\.com/i.test(url.hostname)) {
        return {
          noteId: noteId ?? undefined,
          xsecToken: xsecToken ?? undefined,
          sourceUrl: url.toString(),
        };
      }
    } catch {
      // Ignore non-URL fragments in mixed share text.
    }
  }
  return undefined;
}

export function extractUrls(input: string) {
  return input.match(/https?:\/\/[^\s"'<>]+/gi) ?? [];
}

export function extractXiaohongshuNoteId(url: URL) {
  const patterns = [
    /^\/explore\/([^/?#]+)/,
    /^\/discovery\/item\/([^/?#]+)/,
    /^\/search_result\/([^/?#]+)/,
  ];
  for (const pattern of patterns) {
    const matched = url.pathname.match(pattern)?.[1];
    if (matched) return matched;
  }
  return url.searchParams.get('note_id') ?? url.searchParams.get('noteId') ?? undefined;
}

export function xiaohongshuRequestHeaders() {
  const headers: Record<string, string> = {
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'accept-language': 'zh-CN,zh;q=0.9,en;q=0.6',
    referer: 'https://www.xiaohongshu.com/',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  };
  const cookie = normalizeSecret(process.env.XHS_COOKIE ?? process.env.XIAOHONGSHU_COOKIE);
  if (cookie) headers.cookie = cookie;
  return headers;
}

export function normalizeXiaohongshuInitialStateHtml(html: string): { title?: string; text: string; mediaUrls: string[] } | undefined {
  const state = parseXiaohongshuInitialState(html);
  if (!state) return undefined;
  const note = selectXiaohongshuNoteState(state);
  return note ? normalizeXiaohongshuNoteState(note) : undefined;
}

export function parseXiaohongshuInitialState(html: string): unknown {
  const script = html.match(/<script[^>]*>\s*window\.__INITIAL_STATE__\s*=\s*([\s\S]*?)<\/script>/i)?.[1];
  if (!script) return undefined;
  const raw = script.trim().replace(/;\s*$/, '');
  const jsonLike = raw
    .replace(/:\s*undefined(?=\s*[,}])/g, ':null')
    .replace(/\[\s*undefined(?=\s*[,\]])/g, '[null')
    .replace(/,\s*undefined(?=\s*[,\]])/g, ',null')
    .replace(/:\s*NaN(?=\s*[,}])/g, ':null')
    .replace(/:\s*Infinity(?=\s*[,}])/g, ':null')
    .replace(/:\s*-Infinity(?=\s*[,}])/g, ':null');
  try {
    return JSON.parse(jsonLike) as unknown;
  } catch {
    return undefined;
  }
}

export function selectXiaohongshuNoteState(state: unknown): Record<string, unknown> | undefined {
  const root = asRecord(state);
  if (!root) return undefined;
  const mobileNote = asRecord(asRecord(asRecord(root.noteData)?.data)?.noteData);
  if (mobileNote) return mobileNote;

  const map = asRecord(asRecord(root.note)?.noteDetailMap);
  if (!map) return undefined;
  const explicit = asRecord(asRecord(map['-1'])?.note);
  if (explicit) return explicit;

  for (const item of Object.values(map)) {
    const note = asRecord(asRecord(item)?.note);
    if (note) return note;
  }
  return undefined;
}

export function normalizeXiaohongshuNoteState(note: Record<string, unknown>): { title?: string; text: string; mediaUrls: string[] } {
  const title = noteTitle(note);
  const desc = stringValue(note.desc) ?? stringValue(note.description) ?? stringValue(note.content);
  const tags = extractXiaohongshuTags(note);
  const tagLine = tags.length ? tags.map((tag) => `#${tag}[话题]#`).join(' ') : undefined;
  const body = [
    desc?.startsWith(title ?? '') ? undefined : title,
    desc,
    tagLine && !desc?.includes(tags[0] ?? '') ? tagLine : undefined,
  ].filter(Boolean).join('\n\n');
  const mediaUrls = extractXiaohongshuMediaUrls(note);
  return {
    title,
    text: cleanText(body),
    mediaUrls,
  };
}

export function noteTitle(note: Record<string, unknown>) {
  const direct = stringValue(note.title) ?? stringValue(note.displayTitle) ?? stringValue(note.noteTitle);
  if (direct) return cleanText(direct);
  const desc = stringValue(note.desc) ?? stringValue(note.description) ?? stringValue(note.content);
  return desc ? compactTitle(desc.split('\n')[0] ?? desc) : '小红书笔记';
}

export function extractXiaohongshuTags(note: Record<string, unknown>) {
  return uniqueStrings(arrayValue(note.tagList)
    .map((tag) => stringValue(asRecord(tag)?.name))
    .filter((tag): tag is string => Boolean(tag)));
}

export function extractXiaohongshuMediaUrls(note: Record<string, unknown>) {
  const videoUrls = xiaohongshuVideoUrls(note.video);
  if (videoUrls.length) {
    const coverUrls = xiaohongshuVideoCoverUrls(note.video, note.imageList);
    return uniqueStrings([...videoUrls.slice(0, 1), ...coverUrls]);
  }
  const imageUrls = arrayValue(note.imageList).flatMap(xiaohongshuImageUrls);
  return imageUrls.length ? uniqueStrings(imageUrls) : uniqueStrings(collectMediaUrls(note));
}

/**
 * 从小红书视频笔记中提取封面图 URL 列表。
 * 依次尝试 video.firstFrameFileId、video.coverUrl、imageList 首图作为封面来源。
 * 返回的封面图 URL 用于前端卡片缩略图展示，避免视频笔记无封面可显示。
 *
 * @param video - 笔记的 video 对象
 * @param imageList - 笔记的 imageList 字段（视频笔记可能也包含封面首图）
 * @returns 封面图 URL 数组，可能为空
 * @author fxbin
 */
export function xiaohongshuVideoCoverUrls(video: unknown, imageList: unknown): string[] {
  const record = asRecord(video);
  const urls: string[] = [];

  const firstFrameFileId = stringValue(record?.firstFrameFileId);
  if (firstFrameFileId) {
    urls.push(`https://sns-img-bd.xhscdn.com/${firstFrameFileId}`);
  }

  const coverUrl = stringValue(record?.coverUrl);
  if (coverUrl) {
    const normalized = normalizeHttpUrl(coverUrl);
    if (normalized) urls.push(normalized);
  }

  const frameUrl = stringValue(record?.frameUrl);
  if (frameUrl) {
    const normalized = normalizeHttpUrl(frameUrl);
    if (normalized) urls.push(normalized);
  }

  const imageUrls = arrayValue(imageList).flatMap(xiaohongshuImageUrls);
  if (imageUrls.length > 0) {
    urls.push(imageUrls[0]);
  }

  return uniqueStrings(urls.filter((url): url is string => Boolean(url)));
}

export function xiaohongshuImageUrls(image: unknown) {
  const record = asRecord(image);
  if (!record) return [];
  const candidates = [
    stringValue(record.urlDefault),
    stringValue(record.url),
    stringValue(record.urlPre),
    ...arrayValue(record.infoList).map((item) => stringValue(asRecord(item)?.url)),
  ].filter((url): url is string => Boolean(url));

  for (const candidate of candidates) {
    const tokenPath = extractXiaohongshuImageTokenPath(candidate);
    if (tokenPath) {
      return [`https://sns-img-hw.xhscdn.com/${tokenPath}?imageView2/2/w/0/format/jpg`];
    }
  }
  return candidates.map(normalizeHttpUrl).filter((url): url is string => Boolean(url)).slice(0, 1);
}

export function extractXiaohongshuImageTokenPath(imageUrl: string) {
  try {
    const url = new URL(imageUrl);
    const segments = url.pathname.split('/').filter(Boolean);
    const markerIndex = segments.findIndex((segment) => /^(notes|notes_pre_post|notes_pre_upload|spectrum)/i.test(segment));
    const tokenPath = markerIndex >= 0
      ? segments.slice(markerIndex).join('/')
      : segments.length > 2
        ? segments.slice(2).join('/')
        : segments.join('/');
    return tokenPath.split('!')[0]?.trim() || undefined;
  } catch {
    return undefined;
  }
}

export function xiaohongshuVideoUrls(video: unknown) {
  const record = asRecord(video);
  if (!record) return [];

  const urls: string[] = [];

  const originVideoKey = stringValue(
    record.originVideoKey ??
    asRecord(record.consumer)?.originVideoKey ??
    asRecord(record.video)?.originVideoKey
  );
  if (originVideoKey) {
    urls.push(`https://sns-video-bd.xhscdn.com/${originVideoKey}`);
  }

  const directUrl = stringValue(
    record.url ??
    record.videoUrl ??
    asRecord(record.video)?.url ??
    asRecord(record.video)?.videoUrl
  );
  if (directUrl) {
    urls.push(directUrl);
  }

  const stream = asRecord(asRecord(record.media)?.stream);
  const streamUrls = ['h264', 'h265', 'h266', 'av1']
    .flatMap((key) => arrayValue(stream?.[key]))
    .flatMap((item) => {
      const itemRecord = asRecord(item);
      return [
        stringValue(itemRecord?.masterUrl),
        stringValue(itemRecord?.url),
        ...arrayValue(itemRecord?.backupUrls).map(stringValue),
      ];
    })
    .filter((url): url is string => Boolean(url))
    .map(normalizeHttpUrl)
    .filter((url): url is string => Boolean(url));
  urls.push(...streamUrls);

  return uniqueStrings(urls.map(normalizeHttpUrl).filter((url): url is string => Boolean(url)));
}

export function normalizeHttpUrl(value: string | undefined) {
  if (!value) return undefined;
  if (value.startsWith('//')) return `https:${value}`;
  if (value.startsWith('http://')) return `https://${value.slice('http://'.length)}`;
  return value;
}

export function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

export function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function normalizeXiaohongshuFeedDetail(input: unknown): { title?: string; text: string; mediaUrls: string[] } {
  const expanded = expandJsonLikeValues(input);
  const title = findFirstStringByKey(expanded, ['title', 'displayTitle', 'noteTitle']) ?? '小红书笔记';
  const desc = findFirstStringByKey(expanded, ['desc', 'description', 'content', 'text', 'noteContent']);
  const mediaUrls = uniqueStrings(collectMediaUrls(expanded));
  const text = cleanText([title, desc].filter(Boolean).join('\n\n'));
  return {
    title: cleanText(title),
    text,
    mediaUrls,
  };
}

export function expandJsonLikeValues(value: unknown): unknown {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        return expandJsonLikeValues(JSON.parse(trimmed) as unknown);
      } catch {
        return value;
      }
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(expandJsonLikeValues);
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, expandJsonLikeValues(item)]);
    return Object.fromEntries(entries);
  }
  return value;
}

export function findFirstStringByKey(value: unknown, keys: string[]): string | undefined {
  if (!value || typeof value !== 'object') return undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findFirstStringByKey(item, keys);
      if (found) return found;
    }
    return undefined;
  }

  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const direct = record[key];
    if (typeof direct === 'string' && direct.trim()) return direct.trim();
  }
  for (const item of Object.values(record)) {
    const found = findFirstStringByKey(item, keys);
    if (found) return found;
  }
  return undefined;
}

export function collectMediaUrls(value: unknown, parentKey = ''): string[] {
  if (typeof value === 'string') {
    return isLikelyMediaUrl(value, parentKey) ? [value] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectMediaUrls(item, parentKey));
  }
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) => collectMediaUrls(item, key));
}

export function isLikelyMediaUrl(value: string, key: string) {
  if (!/^https?:\/\//i.test(value)) return false;
  const lowerValue = value.toLowerCase();
  const lowerKey = key.toLowerCase();
  const mediaKey = /image|img|photo|picture|video|media|cover|stream|master/.test(lowerKey);
  return (
    /xhscdn\.com|sns-img|sns-video|\.(jpe?g|png|webp|gif|mp4|mov)(\?|$)/.test(lowerValue)
    || (mediaKey && !/xiaohongshu\.com|xhslink\.com/.test(lowerValue))
  );
}

export function uniqueStrings(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values.map((item) => item.trim()).filter(Boolean)) {
    if (!seen.has(value)) {
      seen.add(value);
      result.push(value);
    }
  }
  return result;
}

/**
 * Jina Reader 抓取超时（毫秒）。
 */
export const JINA_READER_FETCH_TIMEOUT_MS = 15_000;

export async function tryParseWithJinaReader(sourceUrl: string) {
  if (!ssrfGuard.checkUrlForSsrf(sourceUrl).ok) return undefined;
  const readerUrl = `${jinaReaderBaseUrl()}${sourceUrl}`;
  if (!ssrfGuard.checkUrlForSsrf(readerUrl).ok) return undefined;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), JINA_READER_FETCH_TIMEOUT_MS);
  try {
    const headers: Record<string, string> = {
      accept: 'text/plain;charset=utf-8',
    };
    if (process.env.JINA_API_KEY) {
      headers.authorization = `Bearer ${process.env.JINA_API_KEY}`;
    }

    const response = await ssrfSafeFetch(readerUrl, {
      signal: controller.signal,
      redirect: 'follow',
      headers,
    });
    if (!response.ok) return undefined;

    const markdown = cleanText(await response.text());
    const title = extractJinaMarkdownTitle(markdown) || titleFromLink(sourceUrl);
    const text = stripJinaMarkdownMetadata(markdown);
    if (text.length < 120) return undefined;

    return {
      title,
      text: text.slice(0, 18_000),
      mediaUrls: [],
    };
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

export function jinaReaderBaseUrl() {
  const baseUrl = process.env.JINA_READER_BASE_URL ?? 'https://r.jina.ai/';
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

export function extractJinaMarkdownTitle(markdown: string) {
  const explicitTitle = markdown.match(/^Title:\s*(.+)$/im)?.[1];
  const headingTitle = markdown.match(/^#\s+(.+)$/m)?.[1];
  return cleanText(explicitTitle ?? headingTitle ?? '');
}

export function stripJinaMarkdownMetadata(markdown: string) {
  const withoutMetadata = markdown
    .replace(/^Title:\s*.+$/gim, '')
    .replace(/^URL Source:\s*.+$/gim, '')
    .replace(/^Markdown Content:\s*$/gim, '');
  return cleanText(withoutMetadata);
}

export function extractReadableText(html: string, fallbackTitle: string) {
  const title = extractHtmlTitle(html) ?? fallbackTitle;
  const body = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(p|div|section|article|header|footer|li|ul|ol|h[1-6]|blockquote|br)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  return {
    title,
    text: cleanText(decodeHtmlEntities(body)),
  };
}

export function extractHtmlTitle(html: string) {
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i)?.[1]
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["'][^>]*>/i)?.[1];
  const title = ogTitle
    ?? html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
    ?? html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  return title ? cleanText(decodeHtmlEntities(title)) : undefined;
}

export function decodeHtmlEntities(input: string) {
  return input
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([a-f0-9]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

export function cleanText(input: string) {
  return input
    .replace(/\r/g, '\n')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
    .trim();
}

export function failMaterialParsingTask(
  material: MaterialRecord,
  task: AgentTask,
  error: unknown,
): MaterialParseQueueResult {
  const failure = classifyParseFailure(error);
  const parseError = cleanParseError(`[${failure.category}] ${failure.message}`);
  stampMaterialStatus(material, failure.recoverable ? 'needs_review' : 'failed');
  material.parseError = parseError;
  repository.updateMaterial(material);
  touchWorkspace(material.workspaceId);

  task.status = failure.recoverable ? 'needs_user_action' : 'failed';
  task.error = parseError;
  task.output = {
    materialId: material.id,
    parseStatus: material.parseStatus,
    queueState: failure.recoverable ? 'needs_review' : 'failed',
    classification: failure.category,
    recoverable: failure.recoverable,
  };
  task.updatedAt = now();
  repository.updateTask(task);

  return {
    material,
    task,
    queued: false,
    retry: failure.recoverable,
    message: '网页解析失败，已保留原链接，可稍后重试或手动补充正文。',
  };
}

export function classifyParseFailure(error: unknown): {
  category: ParseFailureCategory;
  message: string;
  recoverable: boolean;
} {
  const message = error instanceof Error ? error.message : 'Material parsing failed.';
  const lower = message.toLowerCase();
  if (/abort|timeout|timed out/.test(lower)) {
    return { category: 'timeout', message, recoverable: false };
  }
  if (/login|blocked|forbidden|captcha|verify|风控|登录|403|401/.test(lower)) {
    return { category: 'blocked', message, recoverable: true };
  }
  if (/too short|short|no usable|没有暴露|正文|media/.test(lower)) {
    return { category: 'too_short', message, recoverable: true };
  }
  if (/unsupported|only http|source url is required|not supported/.test(lower)) {
    return { category: 'unsupported', message, recoverable: true };
  }
  if (/fetch|network|econn|enotfound|http 5|http 4/.test(lower)) {
    return { category: 'network', message, recoverable: false };
  }
  return { category: 'unknown', message, recoverable: false };
}

export function requireLinkMaterial(materialId: string) {
  const material = requireMaterial(materialId);
  if (material.type !== 'link') {
    throw new KnowledgeCoreError('Only link materials can be parsed through this endpoint.', 400);
  }
  return material;
}

export function requireMaterial(materialId: string) {
  const material = repository.findMaterial(materialId);
  if (!material) {
    throw new KnowledgeCoreError('Material not found.', 404);
  }
  return material;
}

export function requireParseTask(taskId: string, materialId: string) {
  const task = repository.findTask(taskId);
  if (!task) {
    throw new KnowledgeCoreError('Parse task not found.', 404);
  }
  if (!isParseTaskForMaterial(task, materialId)) {
    throw new KnowledgeCoreError('Parse task does not belong to this material.', 400);
  }
  return task;
}

export function findActiveParseTask(materialId: string) {
  return repository.listTasks().find((task) => (
    isParseTaskForMaterial(task, materialId)
    && (task.status === 'queued' || task.status === 'running')
  ));
}

export function isParseTaskForMaterial(task: AgentTask, materialId: string) {
  return task.workflow === 'parse_material' && task.input.materialId === materialId;
}

export function cleanParseError(errorMessage: string) {
  const trimmed = errorMessage.trim();
  return (trimmed || 'Material parsing failed.').slice(0, 500);
}

export function touchWorkspace(workspaceId?: string) {
  const resolved = resolveWorkspaceId(workspaceId);
  const base = repository.findWorkspace(resolved);
  if (!base) return;
  base.updatedAt = now();
  repository.updateWorkspace(base);
}

export const execFileAsync = promisify(execFile);

export const WHISPER_COMMAND_CANDIDATES = ['whisper', 'whisper-cli', 'whisper.cpp'];
export const WHISPER_FALLBACK_PATHS = [
  '/opt/miniconda3/bin/whisper',
  '/opt/miniconda/bin/whisper',
  '/opt/homebrew/bin/whisper',
  '/usr/local/bin/whisper',
  '/usr/bin/whisper',
  '/opt/miniconda3/bin/whisper-cli',
  '/opt/homebrew/bin/whisper-cli',
  '/usr/local/bin/whisper-cli',
];
export const MIN_CPU_CORES_FOR_TRANSCRIPTION = 4;
export const MIN_MEMORY_BYTES_FOR_TRANSCRIPTION = 4 * 1024 * 1024 * 1024;
export const AUDIO_SAMPLE_RATE = '16000';
export const MONO_CHANNELS = '1';
export const WHISPER_MODEL_TINY = 'tiny';
export const TRANSCRIBE_LANGUAGE_CHINESE = 'Chinese';
export const OUTPUT_FORMAT_TXT = 'txt';
export const VIDEO_URL_INDICATORS = ['/video/', 'sns-video', '.mp4', '.mov', '.webm', '.mkv', '.avi'];

/**
 * 判断媒体 URL 是否为视频
 * @author fxbin
 */
export function isVideoMediaUrl(url: string): boolean {
  return VIDEO_URL_INDICATORS.some((indicator) => url.toLowerCase().includes(indicator));
}

/**
 * 检测命令是否存在于系统 PATH
 * @author fxbin
 */
export async function commandExists(command: string): Promise<boolean> {
  const checkCommand = process.platform === 'win32' ? 'where' : 'which';
  try {
    await execFileAsync(checkCommand, [command]);
    return true;
  } catch {
    return false;
  }
}

/**
 * 检测文件路径是否存在且可执行
 * @author fxbin
 */
export async function pathExistsAndExecutable(filePath: string): Promise<boolean> {
  try {
    await access(filePath, fsConstants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * 查找可用的本地 whisper 命令
 *
 * 检测策略：
 * 1. 优先通过 which/where 查询 PATH 中的 whisper 命令
 * 2. 若 PATH 查询失败，回退检查常见安装路径（miniconda/homebrew 等）
 *    覆盖后端进程 PATH 不完整的场景（如 GUI 启动、容器环境）
 *
 * @author fxbin
 */
export async function findWhisperCommand(): Promise<string | undefined> {
  for (const command of WHISPER_COMMAND_CANDIDATES) {
    if (await commandExists(command)) {
      return command;
    }
  }
  for (const fallbackPath of WHISPER_FALLBACK_PATHS) {
    if (await pathExistsAndExecutable(fallbackPath)) {
      return fallbackPath;
    }
  }
  return undefined;
}

export interface TranscriptionCapabilityReport {
  available: boolean;
  ffmpegAvailable: boolean;
  whisperAvailable: boolean;
  whisperCommand?: string;
  cpuCores: number;
  totalMemoryBytes: number;
  platform: string;
  reasons: string[];
}

export let cachedTranscriptionCapability: TranscriptionCapabilityReport | undefined;

export const BYTES_PER_GB = 1024 * 1024 * 1024;

/**
 * 获取本地视频语音转写能力详细报告
 *
 * @param forceRefresh 是否强制重新检测（跳过缓存）
 *
 * @author fxbin
 */
export async function getTranscriptionCapabilityReport(
  forceRefresh = false,
): Promise<TranscriptionCapabilityReport> {
  if (cachedTranscriptionCapability && !forceRefresh) {
    return cachedTranscriptionCapability;
  }

  const report: TranscriptionCapabilityReport = {
    available: true,
    ffmpegAvailable: await commandExists('ffmpeg'),
    whisperAvailable: false,
    cpuCores: os.cpus().length,
    totalMemoryBytes: os.totalmem(),
    platform: process.platform,
    reasons: [],
  };

  const whisperCommand = await findWhisperCommand();
  if (whisperCommand) {
    report.whisperAvailable = true;
    report.whisperCommand = whisperCommand;
  }

  if (!report.ffmpegAvailable) {
    report.reasons.push('未检测到 ffmpeg，无法从视频中提取音频');
  }
  if (!report.whisperAvailable) {
    report.reasons.push('未检测到本地 whisper 命令（whisper / whisper-cli / whisper.cpp），无法转写');
  }
  if (report.cpuCores < MIN_CPU_CORES_FOR_TRANSCRIPTION) {
    report.reasons.push(`CPU 核心数不足（当前 ${report.cpuCores} 核，建议至少 ${MIN_CPU_CORES_FOR_TRANSCRIPTION} 核）`);
  }
  if (report.totalMemoryBytes < MIN_MEMORY_BYTES_FOR_TRANSCRIPTION) {
    report.reasons.push(`内存不足（当前 ${(report.totalMemoryBytes / BYTES_PER_GB).toFixed(1)}GB，建议至少 4GB）`);
  }

  report.available = report.reasons.length === 0;
  cachedTranscriptionCapability = report;
  return report;
}

/**
 * 检测本地视频语音转写能力
 * 需要同时满足：ffmpeg 可用、whisper 可用、CPU 核心数足够、内存足够
 * @author fxbin
 */
export async function detectTranscriptionCapability(): Promise<{ available: boolean; reason?: string }> {
  const report = await getTranscriptionCapabilityReport();
  if (report.available) {
    return { available: true };
  }
  return { available: false, reason: report.reasons.join('；') };
}

/**
 * 对含有视频的资料进行本地语音转写
 * @author fxbin
 */
export async function transcribeMaterialVideo(material: MaterialRecord): Promise<{ transcript: string; status: MaterialTranscriptStatus; error?: string }> {
  const capability = await detectTranscriptionCapability();
  if (!capability.available) {
    return { transcript: '', status: 'skipped', error: capability.reason };
  }

  const videoUrl = material.mediaUrls?.find(isVideoMediaUrl);
  if (!videoUrl) {
    return { transcript: '', status: 'skipped', error: '未找到可识别的视频文件' };
  }

  const whisperCommand = await findWhisperCommand();
  if (!whisperCommand) {
    return { transcript: '', status: 'skipped', error: '未检测到本地 whisper 命令' };
  }

  const workId = randomUUID();
  const audioPath = join(os.tmpdir(), `zhijing-${workId}.wav`);
  const outputDir = join(os.tmpdir(), `zhijing-${workId}-whisper`);

  try {
    const ffmpegArgs: string[] = ['-y'];
    const ffmpegEnv = { ...process.env };
    if (videoUrl.includes(DOUYIN_VIDEO_CDN_INDICATOR)) {
      ffmpegArgs.push('-headers', `Referer: ${DOUYIN_REFERER}\r\n`);
      const proxy = process.env.DOUYIN_PROXY ?? process.env.HTTP_PROXY ?? process.env.HTTPS_PROXY;
      if (proxy) {
        ffmpegEnv.http_proxy = proxy;
        ffmpegEnv.https_proxy = proxy;
      }
    }
    ffmpegArgs.push(
      '-i', videoUrl,
      '-vn',
      '-acodec', 'pcm_s16le',
      '-ar', AUDIO_SAMPLE_RATE,
      '-ac', MONO_CHANNELS,
      audioPath,
    );
    await execFileAsync('ffmpeg', ffmpegArgs, { env: ffmpegEnv });

    await execFileAsync(whisperCommand, [
      audioPath,
      '--model',
      WHISPER_MODEL_TINY,
      '--language',
      TRANSCRIBE_LANGUAGE_CHINESE,
      '--output_format',
      OUTPUT_FORMAT_TXT,
      '--output_dir',
      outputDir,
    ]);

    const txtPath = join(outputDir, `zhijing-${workId}.txt`);
    const transcript = await readFile(txtPath, 'utf-8');

    return { transcript: transcript.trim(), status: 'done' };
  } catch (error) {
    return {
      transcript: '',
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await unlink(audioPath).catch(() => undefined);
  }
}

/**
 * 异步调度视频资料转写，不阻塞解析流程
 * @author fxbin
 */
export async function scheduleMaterialTranscription(material: MaterialRecord) {
  material.transcriptStatus = 'pending';
  repository.updateMaterial(material);

  try {
    const result = await transcribeMaterialVideo(material);
    material.transcript = result.transcript;
    material.transcriptStatus = result.status;
    material.transcriptError = result.error;
    repository.updateMaterial(material);
  } catch (error) {
    material.transcriptStatus = 'failed';
    material.transcriptError = error instanceof Error ? error.message : String(error);
    repository.updateMaterial(material);
  }
}

/**
 * 清除本地转写能力缓存，用于测试
 * @author fxbin
 */
export function resetTranscriptionCapabilityCache() {
  cachedTranscriptionCapability = undefined;
}

export function listWorkspaces() {
  return repository.listWorkspaces();
}

/**
 * 更新知识库元信息（标题与摘要）。
 * @param id - 知识库 ID
 * @param title - 新标题（可选，为空则不更新）
 * @param summary - 新摘要（可选，为空则不更新）
 * @returns 更新后的知识库摘要，知识库不存在时返回 undefined
 * @author fxbin
 */
export function updateWorkspaceMeta(id: string, title?: string, summary?: string): WorkspaceSummary | undefined {
  const base = repository.findWorkspace(id);
  if (!base) return undefined;
  const trimmedTitle = title?.trim();
  if (trimmedTitle !== undefined && !trimmedTitle) {
    throw new KnowledgeCoreError('知识库标题不能为空。', 400);
  }
  const nextTitle = trimmedTitle ? compactTitle(trimmedTitle) : base.title;
  if (nextTitle !== base.title) {
    const existing = repository.findWorkspaceByTitle(nextTitle);
    if (existing && existing.id !== id) {
      throw new KnowledgeCoreError(`标题「${nextTitle}」已被其他知识库占用。`, 409);
    }
  }
  const next: WorkspaceSummary = {
    ...base,
    title: nextTitle,
    summary: summary !== undefined ? (summary.trim() || base.summary) : base.summary,
    updatedAt: now(),
  };
  repository.updateWorkspace(next);
  return next;
}

/**
 * 删除知识库，级联删除其下所有资料、卡片、产物等关联数据。
 * @param id - 知识库 ID
 * @returns true 表示删除成功，false 表示知识库不存在
 * @author fxbin
 */
export function deleteWorkspace(id: string): boolean {
  const base = repository.findWorkspace(id);
  if (!base) return false;
  repository.deleteWorkspace(id);
  return true;
}

export type ListMaterialsOptions = {
  workspaceId?: string;
  type?: MaterialRecord['type'];
  status?: MaterialRecord['parseStatus'];
  query?: string;
  limit?: number;
};

export type KnowledgeSearchResult = {
  id: string;
  kind: 'workspace' | 'material' | 'card' | 'artifact';
  title: string;
  preview: string;
  workspaceId?: string;
  metadata: Record<string, string | number | boolean | undefined>;
  score: number;
};

export type SearchTerm = {
  value: string;
  weight: number;
  semantic: boolean;
};

export type SearchScore = {
  score: number;
  matchedTerms: string[];
  semantic: boolean;
};

export const semanticSearchLexicon = [
  {
    triggers: ['复习', '记忆', '遗忘', 'review', 'memory', 'memorize'],
    expansions: ['间隔重复', '主动回忆', '检索练习', '遗忘曲线', 'anki', 'spaced repetition', 'retrieval practice'],
  },
  {
    triggers: ['理解', '解释', '讲清楚', 'teach', 'explain'],
    expansions: ['费曼', '费曼学习法', '概念压缩', '用自己的话', 'feynman'],
  },
  {
    triggers: ['内容', '选题', '创作', '小红书', '运营', 'post', 'content'],
    expansions: ['标题', '封面', '话题', '爆款', '笔记', '账号', '转化'],
  },
  {
    triggers: ['产品', '调研', '竞品', '用户', 'product', 'research'],
    expansions: ['痛点', '机会点', '竞品分析', '用户反馈', '需求', '验证'],
  },
  {
    triggers: ['知识库', '整理', '卡片', 'knowledge', 'note'],
    expansions: ['知识卡片', '知识地图', '资料', '来源', '引用', 'artifact'],
  },
];

export const CHINESE_STOP_WORDS = new Set([
  '的', '了', '是', '在', '有', '和', '就', '不', '人', '都', '一', '上',
  '也', '很', '到', '说', '要', '去', '你', '会', '着', '看', '好', '自己',
  '这', '那', '它', '他', '她', '我', '们', '个', '什么', '怎么', '为什么',
  '可以', '应该', '需要', '这个', '那个', '哪些', '一些', '非常', '比较',
  '关于', '对于', '由于', '至于', '于是', '虽然', '但是', '因为', '所以',
  '如果', '尽管', '即使', '除非', '一旦', '之前', '之后', '上次', '下次',
  '最近', '以前', '以后', '现在', '当时', '可能', '或者', '还是', '已经',
  '正在', '将要', '马上', '立刻', '突然', '一直', '总是', '从不', '经常',
  '偶尔', '有时', '常常', '往往', '通常', '一般', '特别', '尤其', '其中',
  '另外', '此外', '除了', '包括', '包含', '属于', '作为', '为了', '通过',
  '根据', '按照', '沿着', '顺着', '随着', '跟着', '接着', '继续', '一个',
]);

export const TFIDF_TITLE_WEIGHT = 4;
export const TFIDF_BODY_WEIGHT = 1;

export function isChineseStopWord(term: string): boolean {
  return CHINESE_STOP_WORDS.has(term);
}

/**
 * TF-IDF 专用分词入口。
 *
 * 复用 statistics/tokenize 的 jieba-wasm 分词器（jieba cut HMM + 停用词过滤 +
 * 单字过滤 + ASCII 小写），取代早期 2-gram 滑窗方案。
 *
 * jieba 基于词典的真实分词能正确识别「机器学习」「深度学习」等多字术语，
 * 而 bigram 会将「机器学习」切成「机器 / 器学 / 学习」三个碎片，
 * 导致主题探索与工作区涌现的语义匹配失真。
 *
 * @param text - 原始文本（卡片 title/body、问题文本等）
 * @returns 分词后的 token 数组
 * @author fxbin
 */
export function tokenizeForTfidf(text: string): string[] {
  return tokenizeText(text);
}

export function buildIdfMap(): Map<string, number> {
  const documentFrequencies = new Map<string, number>();
  let documentCount = 0;
  const collectTokens = (text: string | undefined) => {
    if (!text) return;
    const tokens = new Set(tokenizeForTfidf(text));
    for (const token of tokens) {
      documentFrequencies.set(token, (documentFrequencies.get(token) ?? 0) + 1);
    }
    documentCount += 1;
  };
  for (const base of repository.listWorkspaces()) {
    collectTokens(base.title);
    collectTokens(base.summary);
  }
  for (const material of repository.listMaterials()) {
    collectTokens(material.title);
    collectTokens(material.contentText ?? material.rawInput);
  }
  for (const card of repository.listCards()) {
    collectTokens(card.title);
    collectTokens(card.body);
  }
  for (const artifact of repository.listArtifacts()) {
    collectTokens(artifact.title);
    collectTokens(artifact.body);
  }
  const idfMap = new Map<string, number>();
  const safeDocumentCount = Math.max(documentCount, 1);
  for (const [token, df] of documentFrequencies) {
    idfMap.set(token, Math.log((safeDocumentCount + 1) / (df + 1)) + 1);
  }
  return idfMap;
}

export function scoreWithTfidf(
  terms: SearchTerm[],
  title: string | undefined,
  idfMap: Map<string, number>,
  ...fields: Array<string | undefined>
): SearchScore {
  const titleText = title?.toLowerCase() ?? '';
  const bodyText = fields.filter(Boolean).join(' ').toLowerCase();
  const matchedTerms: string[] = [];
  let semantic = false;
  let score = 0;
  for (const term of terms) {
    const idf = idfMap.get(term.value) ?? 1;
    const titleMatches = titleText.split(term.value).length - 1;
    if (titleMatches > 0) {
      matchedTerms.push(term.value);
      semantic ||= term.semantic;
      score += TFIDF_TITLE_WEIGHT * term.weight * idf * Math.min(titleMatches, 3);
    }
    const bodyMatches = bodyText.split(term.value).length - 1;
    if (bodyMatches > 0) {
      matchedTerms.push(term.value);
      semantic ||= term.semantic;
      score += TFIDF_BODY_WEIGHT * term.weight * idf * Math.min(bodyMatches, 5);
    }
  }
  return {
    score,
    matchedTerms: [...new Set(matchedTerms)].slice(0, 4),
    semantic,
  };
}

export function listMaterials(options: ListMaterialsOptions = {}) {
  const query = options.query?.trim().toLowerCase();
  const materials = repository.listMaterials(options.workspaceId);
  const filtered = materials.filter((material) => {
    if (options.type && material.type !== options.type) return false;
    if (options.status && material.parseStatus !== options.status) return false;
    if (!query) return true;

    const searchable = [
      material.title,
      material.rawInput,
      material.contentText,
      ...(material.mediaUrls ?? []),
      material.platform,
      material.sourceUrl,
      material.parseError,
    ].filter(Boolean).join(' ').toLowerCase();
    return searchable.includes(query);
  });

  return typeof options.limit === 'number' ? filtered.slice(0, options.limit) : filtered;
}

/**
 * 资料分页查询（cursor 分页）。
 * 把 type / parseStatus / query / cursor 全部下沉到 repository 层 SQL，避免内存过滤与 cursor 错位。
 * limit 缺省为 20；返回结构含 nextCursor 与 hasMore，前端据此渲染「加载更多」。
 *
 * @param options - 分页查询参数
 * @returns 分页结果（含 nextCursor / hasMore）
 *
 * @author fxbin
 */
export function listMaterialsPaged(options: MaterialQueryOptions): MaterialQueryResult {
  return repository.queryMaterialsPaged(options);
}

/**
 * 全局卡片查询：可限定知识库，返回全库或指定工作区卡片。
 * 支持按类型、溯源状态、关键词筛选，用于全局视图或单工作区视图。
 * @param options 筛选条件
 * @returns 卡片列表
 * @author fxbin
 */
export function listAllCards(options: {
  workspaceId?: string;
  type?: KnowledgeCard['type'];
  claimStatus?: KnowledgeCard['claimStatus'];
  query?: string;
  limit?: number;
} = {}) {
  const query = options.query?.trim().toLowerCase();
  const cards = repository.listCards(options.workspaceId);
  const filtered = cards.filter((card) => {
    if (options.type && card.type !== options.type) return false;
    if (options.claimStatus && card.claimStatus !== options.claimStatus) return false;
    if (!query) return true;
    const searchable = [card.title, card.body].filter(Boolean).join(' ').toLowerCase();
    return searchable.includes(query);
  });
  return typeof options.limit === 'number' ? filtered.slice(0, options.limit) : filtered;
}

/**
 * 全局资料查询：不限定知识库，返回全库资料。
 * @param options 筛选条件
 * @returns 资料列表
 * @author fxbin
 */
export function listAllMaterials(options: {
  type?: MaterialRecord['type'];
  status?: MaterialRecord['parseStatus'];
  query?: string;
  limit?: number;
} = {}) {
  return listMaterials({
    type: options.type,
    status: options.status,
    query: options.query,
    limit: options.limit,
  });
}

/**
 * 全局产物查询：不限定知识库，返回全库产物。
 * @param options 筛选条件
 * @returns 产物列表
 * @author fxbin
 */
export function listAllArtifacts(options: {
  query?: string;
  limit?: number;
} = {}) {
  const query = options.query?.trim().toLowerCase();
  const artifacts = repository.listArtifacts(undefined, options.limit);
  if (!query) return artifacts;
  return artifacts.filter((artifact) => {
    const searchable = [artifact.title, artifact.body].filter(Boolean).join(' ').toLowerCase();
    return searchable.includes(query);
  });
}

/**
 * Agent 检索工具默认返回条数上限。
 */
export const AGENT_SEARCH_RESULT_LIMIT = 8;

/**
 * 工作区内卡片检索结果（精简结构，供 Agent 工具消费，控制 token 消耗）。
 */
export interface WorkspaceCardSearchResult {
  id: string;
  type: string;
  title: string;
  body: string;
  claimStatus?: string;
}

/**
 * 工作区内资料检索结果（精简结构，供 Agent 工具消费）。
 */
export interface WorkspaceMaterialSearchResult {
  id: string;
  type: string;
  title: string;
  platform?: string;
  parseStatus?: string;
  sourceUrl?: string;
  preview: string;
}

/**
 * 工作区概览（精简结构，供 Agent 工具消费）。
 */
export interface WorkspaceOverview {
  id: string;
  title: string;
  summary: string;
  stage?: string;
  sourceCount: number;
  cardCount: number;
  materialCount: number;
}

/**
 * 按关键词检索指定工作区内的知识卡片。
 * 复用 repository.searchCardsByRelevance 的 TF-IDF 评分逻辑。
 * @param workspaceId - 工作区 ID
 * @param query - 检索关键词
 * @param limit - 返回条数上限，默认 8
 * @returns 精简后的卡片检索结果列表
 */
export function searchWorkspaceCards(workspaceId: string, query: string, limit: number = AGENT_SEARCH_RESULT_LIMIT): WorkspaceCardSearchResult[] {
  if (!workspaceId || !query.trim()) return [];
  const cards = repository.searchCardsByRelevance(workspaceId, query, limit);
  return cards.map((card) => ({
    id: card.id,
    type: card.type,
    title: card.title,
    body: card.body,
    claimStatus: card.claimStatus,
  }));
}

/**
 * 按关键词检索指定工作区内的资料。
 * 复用 repository.searchMaterialsByRelevance 的 TF-IDF 评分逻辑。
 * @param workspaceId - 工作区 ID
 * @param query - 检索关键词
 * @param limit - 返回条数上限，默认 8
 * @returns 精简后的资料检索结果列表
 */
export function searchWorkspaceMaterials(workspaceId: string, query: string, limit: number = AGENT_SEARCH_RESULT_LIMIT): WorkspaceMaterialSearchResult[] {
  if (!workspaceId || !query.trim()) return [];
  const materials = repository.searchMaterialsByRelevance(workspaceId, query, limit);
  return materials.map((material) => ({
    id: material.id,
    type: material.type,
    title: material.title,
    platform: material.platform,
    parseStatus: material.parseStatus,
    sourceUrl: material.sourceUrl,
    preview: buildSnippetAroundQuery(material.contentText ?? material.rawInput ?? material.title, query),
  }));
}

/**
 * 工作区资料完整内容（供 Agent fetch_material 工具消费）。
 *
 * 与 WorkspaceMaterialSearchResult 的区别：包含完整 contentText，
 * 用于 search_materials 返回的 preview 不足以作答时获取原文。
 */
export interface WorkspaceMaterialDetail {
  id: string;
  type: string;
  title: string;
  platform?: string;
  parseStatus?: string;
  sourceUrl?: string;
  contentText: string;
}

/**
 * 按资料 ID 获取工作区内资料的完整正文。
 *
 * 用于 Agent 在 search_materials 返回的 preview 不足以作答时，
 * 主动拉取完整原文以定位命中段落。仅返回未归档资料。
 *
 * @param workspaceId - 工作区 ID（校验资料是否属于该工作区）
 * @param materialId - 资料 ID
 * @returns 资料完整内容；不存在或不属于该工作区时返回 null
 * @author fxbin
 */
export function getWorkspaceMaterial(workspaceId: string, materialId: string): WorkspaceMaterialDetail | null {
  if (!workspaceId || !materialId) return null;
  const material = repository.findMaterial(materialId);
  if (!material || material.workspaceId !== workspaceId || material.archived) return null;
  return {
    id: material.id,
    type: material.type,
    title: material.title,
    platform: material.platform,
    parseStatus: material.parseStatus,
    sourceUrl: material.sourceUrl,
    contentText: material.contentText ?? material.rawInput ?? '',
  };
}

/**
 * 根据资料数与卡片数实时计算工作区阶段。
 *
 * 不依赖数据库中持久化的 stage 字段，避免 stage 未同步更新导致 Agent 误判。
 *
 * - materialCount = 0 且 cardCount = 0 → ai_skeleton（骨架阶段）
 * - materialCount > 0 且 cardCount = 0 → organizing（资料已导入，卡片待生成）
 * - 其他情况 → grounded（已有实质内容）
 */
export function computeWorkspaceStage(materialCount: number, cardCount: number): WorkspaceStage {
  if (materialCount > 0 && cardCount === 0) return 'organizing';
  if (materialCount === 0 && cardCount === 0) return 'ai_skeleton';
  return 'grounded';
}

/**
 * 重试为指定资料生成知识卡片。
 *
 * 用于 link 导入时 generateKnowledge 失败的后续重试场景：
 * 资料已入库但卡片为空，用户可调用此函数重新生成卡片。
 *
 * 内部流程：
 * 1. 查询 material 与所属 workspace
 * 2. 调用 generateKnowledge('material_summary', ...) 重新生成
 * 3. 成功则 createCards 写库并更新 base.stage
 * 4. 失败则抛错由调用方处理
 *
 * @param materialId - 资料 ID
 * @returns 生成结果：成功时返回 cards 数组，失败时抛错
 * @throws {KnowledgeCoreError} 资料不存在、工作区不存在、生成失败
 * @author fxbin
 */
export async function retryMaterialCardGeneration(materialId: string): Promise<{ cards: KnowledgeCard[] }> {
  const material = repository.findMaterial(materialId);
  if (!material) {
    throw new KnowledgeCoreError('Material not found.', 404);
  }
  const base = repository.findWorkspace(resolveWorkspaceId(material.workspaceId));
  if (!base) {
    throw new KnowledgeCoreError('Knowledge base not found.', 404);
  }
  const text = material.contentText ?? material.rawInput ?? material.title;
  const mediaUrls = material.mediaUrls ?? [];
  const generation = await generateKnowledge('material_summary', text, {
    kind: 'link',
    workspaceId: base.id,
    materialId: material.id,
    hasSourceMaterial: true,
    parseStatus: material.parseStatus,
    sourceUrl: material.sourceUrl,
    parsedTitle: material.title,
    contentLength: text.length,
    mediaUrls,
    mediaCount: mediaUrls.length,
    needsReview: material.parseStatus === 'needs_review',
    cacheHit: false,
  });
  const generated = generation.output;
  const cards = createCards(base, material, text, generated.cards);
  const materialCount = repository.listMaterials(base.id).length;
  base.stage = computeWorkspaceStage(materialCount, cards.length);
  repository.updateWorkspace(base);
  return { cards };
}

/**
 * 获取指定工作区的概览信息（标题、摘要、统计计数）。
 * 工作区不存在时返回 undefined。
 * @param workspaceId - 工作区 ID
 * @returns 工作区概览，或 undefined
 */
export function getWorkspaceOverview(workspaceId: string): WorkspaceOverview | undefined {
  if (!workspaceId) return undefined;
  const base = repository.findWorkspace(workspaceId);
  if (!base) return undefined;
  const materialCount = repository.listMaterials(workspaceId).length;
  const stage = computeWorkspaceStage(materialCount, base.cardCount);
  return {
    id: base.id,
    title: base.title,
    summary: base.summary,
    stage,
    sourceCount: base.sourceCount,
    cardCount: base.cardCount,
    materialCount,
  };
}

export function searchKnowledgeAssets(input: { query?: string; limit?: number } = {}) {
  const query = input.query?.trim();
  if (!query) {
    return {
      query: '',
      results: [] as KnowledgeSearchResult[],
      counts: {},
    };
  }

  const limit = Math.max(1, Math.min(input.limit ?? 60, 120));
  const terms = buildSearchTerms(query);
  const idfMap = buildIdfMap();
  const results: KnowledgeSearchResult[] = [];

  for (const base of repository.listWorkspaces()) {
    const match = scoreWithTfidf(terms, base.title, idfMap, base.summary);
    addSearchResult(results, {
      id: base.id,
      kind: 'workspace',
      title: base.title,
      preview: base.summary,
      workspaceId: base.id,
      metadata: withSearchMetadata(match, {
        stage: base.stage,
        sourceCount: base.sourceCount,
        cardCount: base.cardCount,
      }),
      score: match.score,
    });
  }

  for (const material of repository.listMaterials()) {
    const match = scoreWithTfidf(
      terms,
      material.title,
      idfMap,
      material.rawInput,
      material.contentText,
      ...(material.mediaUrls ?? []),
      material.platform,
      material.sourceUrl,
      material.parseError,
    );
    addSearchResult(results, {
      id: material.id,
      kind: 'material',
      title: material.title,
      preview: compactPreview(material.contentText ?? material.rawInput),
      workspaceId: material.workspaceId,
      metadata: withSearchMetadata(match, {
        type: material.type,
        platform: material.platform ?? 'local',
        parseStatus: material.parseStatus,
        mediaCount: material.mediaUrls?.length ?? 0,
      }),
      score: match.score,
    });
  }

  for (const card of repository.listCards()) {
    const match = scoreWithTfidf(terms, card.title, idfMap, card.body, card.type, card.claimStatus);
    addSearchResult(results, {
      id: card.id,
      kind: 'card',
      title: card.title,
      preview: compactPreview(card.body),
      workspaceId: card.workspaceId,
      metadata: withSearchMetadata(match, {
        type: card.type,
        claimStatus: card.claimStatus,
      }),
      score: match.score,
    });
  }

  for (const artifact of repository.listArtifacts()) {
    const match = scoreWithTfidf(terms, artifact.title, idfMap, artifact.body, artifact.artifactType);
    addSearchResult(results, {
      id: artifact.id,
      kind: 'artifact',
      title: artifact.title,
      preview: compactPreview(artifact.body),
      workspaceId: artifact.workspaceId,
      metadata: withSearchMetadata(match, {
        artifactType: artifact.artifactType,
        sourceMaterialCount: artifact.sourceMaterialIds.length,
      }),
      score: match.score,
    });
  }

  const sorted = results
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))
    .slice(0, limit);
  const counts = sorted.reduce<Record<string, number>>((acc, result) => {
    acc[result.kind] = (acc[result.kind] ?? 0) + 1;
    return acc;
  }, {});

  return {
    query,
    results: sorted,
    counts,
  };
}

export function addSearchResult(results: KnowledgeSearchResult[], result: KnowledgeSearchResult) {
  if (result.score > 0) {
    results.push(result);
  }
}

export function buildSearchTerms(query: string) {
  const normalized = query.toLowerCase();
  const terms = new Map<string, SearchTerm>();
  for (const term of normalized.split(/\s+/).filter(Boolean)) {
    if (!isChineseStopWord(term)) {
      addSearchTerm(terms, term, 1, false);
    }
  }
  for (const entry of semanticSearchLexicon) {
    if (!entry.triggers.some((trigger) => normalized.includes(trigger))) continue;
    for (const expansion of entry.expansions) {
      addSearchTerm(terms, expansion.toLowerCase(), 0.65, true);
    }
  }
  return [...terms.values()];
}

export function addSearchTerm(terms: Map<string, SearchTerm>, value: string, weight: number, semantic: boolean) {
  const normalized = value.trim();
  if (!normalized) return;
  const current = terms.get(normalized);
  if (!current || current.weight < weight) {
    terms.set(normalized, { value: normalized, weight, semantic });
  }
}

export function scoreSearchText(terms: SearchTerm[], title: string | undefined, ...fields: Array<string | undefined>): SearchScore {
  const titleText = title?.toLowerCase() ?? '';
  const bodyText = fields.filter(Boolean).join(' ').toLowerCase();
  const matchedTerms: string[] = [];
  let semantic = false;
  const score = terms.reduce((currentScore, term) => {
    if (titleText.includes(term.value)) {
      matchedTerms.push(term.value);
      semantic ||= term.semantic;
      return currentScore + 4 * term.weight;
    }
    if (bodyText.includes(term.value)) {
      matchedTerms.push(term.value);
      semantic ||= term.semantic;
      return currentScore + term.weight;
    }
    return currentScore;
  }, 0);
  return {
    score,
    matchedTerms: [...new Set(matchedTerms)].slice(0, 4),
    semantic,
  };
}

export function withSearchMetadata(match: SearchScore, metadata: KnowledgeSearchResult['metadata']) {
  return {
    match: match.semantic ? 'semantic' : 'exact',
    matched: match.matchedTerms.join(', '),
    ...metadata,
  };
}

export function getWorkspace(id: string): WorkspaceDetail | undefined {
  const base = repository.findWorkspace(id);
  if (!base) return undefined;
  const materials = repository.listMaterials(id);
  const cards = repository.listCards(id);
  return {
    ...base,
    stage: computeWorkspaceStage(materials.length, base.cardCount),
    materials,
    cards,
    artifacts: repository.listArtifacts(id),
  };
}

export function listMessages(workspaceId: string, limit?: number): ChatMessage[] {
  return repository.listMessages(workspaceId, limit);
}

export function recordCardReview(cardId: string, grade: RecallGrade): KnowledgeCard | undefined {
  const card = repository.findCard(cardId);
  if (!card) return undefined;
  const next = scheduleCardRecall(card.recall, grade);
  const updated: KnowledgeCard = { ...card, recall: next, updatedAt: new Date().toISOString() };
  repository.updateCard(updated);
  return updated;
}

export type CardContentEdit = {
  title?: string;
  body?: string;
  type?: KnowledgeCard['type'];
  claimStatus?: KnowledgeCard['claimStatus'];
};

export type CardEditResult = { card: KnowledgeCard; revision?: CardRevision };

export function editCardContent(cardId: string, changes: CardContentEdit): CardEditResult | undefined {
  const card = repository.findCard(cardId);
  if (!card) return undefined;
  const nextTitle = typeof changes.title === 'string' && changes.title.trim().length > 0 ? changes.title.trim() : card.title;
  const nextBody = typeof changes.body === 'string' ? changes.body : card.body;
  const nextType = changes.type ?? card.type;
  const nextClaim = changes.claimStatus ?? card.claimStatus;
  const changedFields: CardRevisionField[] = [];
  if (nextTitle !== card.title) changedFields.push('title');
  if (nextBody !== card.body) changedFields.push('body');
  if (nextType !== card.type) changedFields.push('type');
  if (nextClaim !== card.claimStatus) changedFields.push('claimStatus');
  if (changedFields.length === 0) return { card };
  const existing = repository.listCardRevisions(cardId);
  const nextVersion = existing.length > 0 ? existing[existing.length - 1].version + 1 : 1;
  const revision: CardRevision = {
    id: `rev_${cardId}_${nextVersion}`,
    cardId,
    version: nextVersion,
    titleSnapshot: card.title,
    bodySnapshot: card.body,
    typeSnapshot: card.type,
    claimStatusSnapshot: card.claimStatus,
    changedFields,
    createdAt: new Date().toISOString(),
  };
  repository.insertCardRevision(revision);
  const updated: KnowledgeCard = {
    ...card,
    title: nextTitle,
    body: nextBody,
    type: nextType,
    claimStatus: nextClaim,
    updatedAt: new Date().toISOString(),
  };
  repository.updateCard(updated);
  return { card: updated, revision };
}

export function listCardRevisions(cardId: string): CardRevision[] {
  return repository.listCardRevisions(cardId);
}

export function initializeArtifactSections(artifactId: string, sectionInits: ArtifactSectionInit[]): ArtifactRecord {
  const artifact = repository.findArtifact(artifactId);
  if (!artifact) {
    throw new KnowledgeCoreError(`Artifact ${artifactId} not found`, 404);
  }
  if (sectionInits.length === 0) {
    throw new KnowledgeCoreError('至少需要提供一个分区定义', 400);
  }
  const now = new Date().toISOString();
  const sections: ArtifactSection[] = sectionInits.map((init, index) => ({
    id: `section_${Date.now().toString(36)}_${index.toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    title: init.title,
    body: init.body,
    updatedAt: now,
  }));
  const updated: ArtifactRecord = { ...artifact, sections };
  repository.updateArtifact(updated);
  return updated;
}

export function editArtifactSection(artifactId: string, sectionId: string, edit: ArtifactSectionEdit): ArtifactSectionEditResult {
  const artifact = repository.findArtifact(artifactId);
  if (!artifact) {
    throw new KnowledgeCoreError(`Artifact ${artifactId} not found`, 404);
  }
  if (!artifact.sections || artifact.sections.length === 0) {
    throw new KnowledgeCoreError(`Artifact ${artifactId} 未初始化分区，请先调用 initializeArtifactSections`, 409);
  }
  const sectionIndex = artifact.sections.findIndex((section) => section.id === sectionId);
  if (sectionIndex < 0) {
    throw new KnowledgeCoreError(`Section ${sectionId} not found in artifact ${artifactId}`, 404);
  }
  const original = artifact.sections[sectionIndex];
  const changedFields: ArtifactRevisionField[] = [];
  const nextTitle = typeof edit.title === 'string' && edit.title !== original.title ? edit.title : original.title;
  const nextBody = typeof edit.body === 'string' && edit.body !== original.body ? edit.body : original.body;
  if (typeof edit.title === 'string' && edit.title !== original.title) changedFields.push('title');
  if (typeof edit.body === 'string' && edit.body !== original.body) changedFields.push('body');
  if (changedFields.length === 0) {
    return { artifact };
  }
  const now = new Date().toISOString();
  const updatedSection: ArtifactSection = {
    id: original.id,
    title: nextTitle,
    body: nextBody,
    updatedAt: now,
  };
  const sections = artifact.sections.slice();
  sections[sectionIndex] = updatedSection;
  const updated: ArtifactRecord = { ...artifact, sections };
  repository.updateArtifact(updated);
  const existingRevisions = repository.listArtifactRevisions(artifactId);
  const nextVersion = existingRevisions.length > 0 ? Math.max(...existingRevisions.map((revision) => revision.version)) + 1 : 1;
  const revision: ArtifactRevision = {
    id: `artrev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    artifactId,
    version: nextVersion,
    sectionId: original.id,
    sectionTitleSnapshot: original.title,
    sectionBodySnapshot: original.body,
    changedFields,
    createdAt: now,
  };
  repository.insertArtifactRevision(revision);
  return { artifact: updated, revision };
}

export function listArtifactRevisions(artifactId: string): ArtifactRevision[] {
  return repository.listArtifactRevisions(artifactId);
}

export type ExportSummary = {
  format: ExportFormat;
  scope: ExportScope;
  includeArtifacts: boolean;
  filename: string;
  materialCount: number;
  cardCount: number;
  artifactCount: number;
};

export function recordExport(workspaceId: string, summary: ExportSummary): ExportRecord {
  const record: ExportRecord = {
    id: `export_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    workspaceId,
    format: summary.format,
    scope: summary.scope,
    includeArtifacts: summary.includeArtifacts,
    materialCount: summary.materialCount,
    cardCount: summary.cardCount,
    artifactCount: summary.artifactCount,
    filename: summary.filename,
    createdAt: new Date().toISOString(),
  };
  repository.insertExportRecord(record);
  return record;
}

export function listExports(workspaceId: string): ExportRecord[] {
  return repository.listExportRecords(workspaceId);
}

export const SAVED_FILTER_DEFAULT_SORT = 'updated_desc';
export const SAVED_FILTER_ID_PREFIX = 'filter_';

/**
 * 保存或更新某个视图（assets / compare）的筛选状态。
 * 同一 scope 下以固定 ID 级联更新，实现"最近一次筛选自动持久化"语义。
 */
export function saveFilter(scope: SavedFilterScope, filter: {
  cardType: string | null;
  claimStatus: string | null;
  sortKey: string;
  keyword: string;
}): SavedFilter {
  const id = `${SAVED_FILTER_ID_PREFIX}${scope}`;
  const record: SavedFilter = {
    id,
    scope,
    cardType: filter.cardType || null,
    claimStatus: filter.claimStatus || null,
    sortKey: filter.sortKey || SAVED_FILTER_DEFAULT_SORT,
    keyword: filter.keyword ?? '',
    updatedAt: new Date().toISOString(),
  };
  repository.upsertSavedFilter(record);
  return record;
}

/**
 * 读取指定 scope 的持久化筛选器；无记录时返回 null。
 */
export function loadFilter(scope: SavedFilterScope): SavedFilter | null {
  const items = repository.listSavedFilters(scope);
  return items.length > 0 ? items[0] : null;
}

/**
 * 删除指定 scope 的筛选器，通常用于"重置筛选"操作。
 */
export function clearFilter(scope: SavedFilterScope): void {
  repository.deleteSavedFilter(`${SAVED_FILTER_ID_PREFIX}${scope}`);
}

export const ENTITY_ID_PREFIX = 'entity_';

export function normalizeEntityType(raw: string): EntityType {
  const allowed: EntityType[] = ['person', 'organization', 'concept', 'tool', 'place', 'event', 'other'];
  return allowed.includes(raw as EntityType) ? (raw as EntityType) : 'other';
}

/**
 * 从知识库的卡片中提取实体（人物/组织/概念/工具等）并持久化。
 * 若 piRuntime 未提供，则使用 mock 数据生成占位实体。
 * 已有同名同类型实体会被合并（sourceCardIds 取并集），不会重复创建。
 */
export async function extractEntities(workspaceId: string, runtimeOverride?: PiRuntime): Promise<Entity[]> {
  const base = repository.findWorkspace(workspaceId);
  if (!base) {
    throw new KnowledgeCoreError(`Knowledge base ${workspaceId} not found.`, 404);
  }
  const cards = repository.listCards(workspaceId);
  if (cards.length === 0) {
    throw new KnowledgeCoreError('当前知识库没有卡片，无法提取实体。', 400);
  }
  const cardDigest = cards.slice(0, 40).map((card) => `- ${card.title}: ${card.body.slice(0, 120)}`).join('\n');
  const prompt = `请从以下知识库卡片中提取关键实体（人物、组织、概念、工具、地点、事件等）。\n知识库主题：${base.title}\n卡片摘要：\n${cardDigest}`;
  const runtime = runtimeOverride ?? createInstrumentedPiRuntime(
    piRuntime,
    { taskType: 'entity_extraction', workspaceId, recorder: recordAgentUsage },
  );
  const result = await runtime.completeStructured<{ entities: Array<{ name: string; type: string; description: string }> }>({
    task: 'entity_extraction',
    prompt,
    schema: entityExtractionSchema,
  });
  const seeds = (result.output.entities ?? []).map((item) => ({
    name: item.name.trim(),
    type: normalizeEntityType(item.type),
    description: item.description.trim(),
  })).filter((item) => item.name.length > 0);
  if (seeds.length === 0) {
    throw new KnowledgeCoreError('实体提取未返回有效结果。', 500);
  }
  const now = new Date().toISOString();
  const cardIds = cards.map((card) => card.id);
  const existing = repository.listEntities(workspaceId);
  const merged: Entity[] = [];
  for (const seed of seeds) {
    const match = existing.find((item) => item.name === seed.name && item.type === seed.type);
    if (match) {
      const unionIds = Array.from(new Set([...match.sourceCardIds, ...cardIds]));
      const updated: Entity = { ...match, description: seed.description, sourceCardIds: unionIds, updatedAt: now };
      repository.upsertEntity(updated);
      merged.push(updated);
    } else {
      const entity: Entity = {
        id: `${ENTITY_ID_PREFIX}${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        workspaceId,
        name: seed.name,
        type: seed.type,
        description: seed.description,
        sourceCardIds: cardIds,
        createdAt: now,
        updatedAt: now,
      };
      repository.upsertEntity(entity);
      merged.push(entity);
    }
  }
  return merged;
}

export function listEntities(workspaceId: string): Entity[] {
  return repository.listEntities(workspaceId);
}

export const CONFLICT_ID_PREFIX = 'conflict';
export const CONFLICT_AUDIT_LIMIT = 50;
export const CONFLICT_GROUP_ITEM_LIMIT = 12;

/**
 * 扫描全库卡片与资料，按归一化键聚合并返回重复分组。
 * 卡片按标题归一化聚合，资料按 sourceUrl/rawInput/title 聚合。
 */
export function listConflictGroups(kind?: ConflictKind): ConflictGroup[] {
  const groups: ConflictGroup[] = [];
  if (!kind || kind === 'duplicate_card') {
    groups.push(...detectCardConflictGroups());
  }
  if (!kind || kind === 'duplicate_material') {
    groups.push(...detectMaterialConflictGroups());
  }
  if (!kind || kind === 'semantic_tension') {
    groups.push(...detectSemanticTensionGroups());
  }
  return groups;
}

export function detectCardConflictGroups(): ConflictGroup[] {
  const cards = repository.listCards();
  const buckets = new Map<string, KnowledgeCard[]>();
  for (const card of cards) {
    const key = normalizeConflictKey(card.title);
    if (!key) continue;
    const bucket = buckets.get(key) ?? [];
    bucket.push(card);
    buckets.set(key, bucket);
  }
  const groups: ConflictGroup[] = [];
  for (const [key, bucket] of buckets) {
    if (bucket.length < 2) continue;
    groups.push({
      kind: 'duplicate_card',
      key,
      title: bucket[0].title,
      items: bucket.slice(0, CONFLICT_GROUP_ITEM_LIMIT).map((card) => ({
        id: card.id,
        workspaceId: card.workspaceId,
        title: card.title,
        meta: card.claimStatus === 'sourced' ? '已溯源' : `类型 ${card.type}`,
      })),
    });
  }
  return groups;
}

export function detectMaterialConflictGroups(): ConflictGroup[] {
  const materials = repository.listMaterials();
  const buckets = new Map<string, MaterialRecord[]>();
  for (const material of materials) {
    const key = normalizeConflictKey(material.sourceUrl || material.rawInput || material.title);
    if (!key) continue;
    const bucket = buckets.get(key) ?? [];
    bucket.push(material);
    buckets.set(key, bucket);
  }
  const groups: ConflictGroup[] = [];
  for (const [key, bucket] of buckets) {
    if (bucket.length < 2) continue;
    groups.push({
      kind: 'duplicate_material',
      key,
      title: bucket[0].title,
      items: bucket.slice(0, CONFLICT_GROUP_ITEM_LIMIT).map((material) => ({
        id: material.id,
        workspaceId: material.workspaceId,
        title: material.title,
        meta: material.sourceUrl ? material.sourceUrl : `状态 ${material.parseStatus}`,
      })),
    });
  }
  return groups;
}

export function normalizeConflictKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * 检测语义张力分组（P11-3）。
 *
 * 扫描同一知识库中的卡片，检测标题中包含对立关键词的卡片对，
 * 如"支持 X"与"反对 X"、"优点"与"缺点"等，形成张力分组。
 *
 * 张力分组帮助用户发现知识库中的认知冲突，引导主动对质与纠错。
 *
 * @author fxbin
 * @returns {ConflictGroup[]} 语义张力分组数组
 */
export function detectSemanticTensionGroups(): ConflictGroup[] {
  const cards = repository.listCards();
  const byWorkspace = new Map<string, KnowledgeCard[]>();
  for (const card of cards) {
    const kbId = resolveWorkspaceId(card.workspaceId);
    const bucket = byWorkspace.get(kbId) ?? [];
    bucket.push(card);
    byWorkspace.set(kbId, bucket);
  }

  const groups: ConflictGroup[] = [];
  for (const [workspaceId, kbCards] of byWorkspace) {
    for (const [keywordA, keywordB] of TENSION_KEYWORD_PAIRS) {
      const sideA = kbCards.filter((card) => card.title.includes(keywordA));
      const sideB = kbCards.filter((card) => card.title.includes(keywordB));
      if (sideA.length === 0 || sideB.length === 0) {
        continue;
      }

      const items = [...sideA, ...sideB]
        .slice(0, CONFLICT_GROUP_ITEM_LIMIT)
        .map((card) => ({
          id: card.id,
          workspaceId: card.workspaceId,
          title: card.title,
          meta: TENSION_META_TEMPLATE
            .replace('{status}', card.claimStatus === 'sourced' ? '已溯源' : card.claimStatus === 'ai_skeleton' ? '骨架' : '已确认')
            .replace('{type}', card.type),
        }));

      const key = `${TENSION_KEY_PREFIX}${keywordA}${TENSION_KEY_SEPARATOR}${keywordB}:${workspaceId}`;
      const title = TENSION_TITLE_TEMPLATE.replace('{a}', keywordA).replace('{b}', keywordB);

      groups.push({
        kind: 'semantic_tension',
        key,
        title,
        items,
      });
    }
  }
  return groups;
}

/**
 * 解决冲突分组：保留 keepId，删除 dropIds，并写入审计记录。
 * 卡片冲突直接删除重复卡片；资料冲突先把卡片来源重指向保留项，再删除重复资料。
 */
export function resolveConflictGroup(request: ConflictResolutionRequest): ConflictAuditEntry {
  if (!request.keepId) {
    throw new KnowledgeCoreError('冲突解决需要指定保留项。', 400);
  }
  if (!Array.isArray(request.dropIds) || request.dropIds.length === 0) {
    throw new KnowledgeCoreError('冲突解决至少需要一个被合并项。', 400);
  }
  if (request.dropIds.includes(request.keepId)) {
    throw new KnowledgeCoreError('保留项不能同时出现在被合并列表中。', 400);
  }
  const workspaceId = request.kind === 'duplicate_card'
    ? resolveCardConflict(request.keepId, request.dropIds)
    : resolveMaterialConflict(request.keepId, request.dropIds);
  const entry: ConflictAuditEntry = {
    id: id(CONFLICT_ID_PREFIX),
    kind: request.kind,
    action: 'merge',
    keepId: request.keepId,
    dropIds: [...request.dropIds],
    workspaceId,
    note: `合并 ${request.dropIds.length} 个重复${request.kind === 'duplicate_card' ? '卡片' : '资料'}到保留项。`,
    createdAt: new Date().toISOString(),
  };
  repository.insertConflictAudit(entry);
  reconcileWorkspaceStats(workspaceId);
  return entry;
}

export function resolveCardConflict(keepId: string, dropIds: string[]): string {
  const keepCard = repository.findCard(keepId);
  if (!keepCard) {
    throw new KnowledgeCoreError(`Card ${keepId} not found.`, 404);
  }
  for (const dropId of dropIds) {
    if (!repository.findCard(dropId)) {
      throw new KnowledgeCoreError(`Card ${dropId} not found.`, 404);
    }
    repository.deleteCard(dropId);
  }
  return resolveWorkspaceId(keepCard.workspaceId);
}

export function resolveMaterialConflict(keepId: string, dropIds: string[]): string {
  const keepMaterial = repository.findMaterial(keepId);
  if (!keepMaterial) {
    throw new KnowledgeCoreError(`Material ${keepId} not found.`, 404);
  }
  for (const dropId of dropIds) {
    if (!repository.findMaterial(dropId)) {
      throw new KnowledgeCoreError(`Material ${dropId} not found.`, 404);
    }
  }
  for (const card of repository.listCards()) {
    if (card.materialId && dropIds.includes(card.materialId)) {
      repository.updateCard({ ...card, materialId: keepId, updatedAt: new Date().toISOString() });
    }
  }
  for (const dropId of dropIds) {
    deleteMaterial(dropId);
  }
  return resolveWorkspaceId(keepMaterial.workspaceId);
}

/**
 * 返回最近的冲突解决审计记录，按时间倒序。
 */
export function listConflictAuditEntries(limit?: number): ConflictAuditEntry[] {
  return repository.listConflictAudit(limit ?? CONFLICT_AUDIT_LIMIT);
}

export const CLOUD_BACKUP_LOCAL_FIRST_REASON = '当前版本采用本地优先架构：导出文件保存在用户浏览器下载目录，导出历史保存在本地 SQLite 数据库，用户可随时通过 Backup JSON 按钮手动备份。';

export const CLOUD_BACKUP_LOCAL_FIRST_PLANNED_FOR = null;

/**
 * 描述云备份能力的当前状态与产品决策。
 *
 * D3-4 决策记录：当前版本明确选择 local-first 架构。
 * - 所有导出文件保存在用户浏览器下载目录，应用不接触文件内容
 * - 所有导出历史记录保存在本地 SQLite 数据库
 * - 用户通过 ExportView 的 Backup JSON 按钮进行整库备份
 *
 * 云端同步延后至 PMF 验证后再评估，届时需要回答：
 *   1. 自建账号体系 vs 接入 WebDAV / iCloud Drive / Dropbox
 *   2. 端到端加密策略（用户持密钥 vs 服务端可见）
 *   3. 多端冲突合并策略（CRDT vs last-write-wins）
 *
 * 该函数返回的结构稳定，前端可据此隐藏云端入口并展示原因。
 */
export function describeCloudBackupStatus(): CloudBackupStub {
  return {
    status: 'not_implemented',
    decision: 'local_first',
    reason: CLOUD_BACKUP_LOCAL_FIRST_REASON,
    plannedFor: CLOUD_BACKUP_LOCAL_FIRST_PLANNED_FOR,
  };
}

export function listDueCards(workspaceId: string, limit?: number): KnowledgeCard[] {
  const now = new Date().toISOString();
  const all = repository.listCards(workspaceId);
  const due = all
    .filter((card) => !card.recall || card.recall.dueAt <= now)
    .sort((a, b) => {
      const aDue = a.recall?.dueAt ?? '';
      const bDue = b.recall?.dueAt ?? '';
      return aDue.localeCompare(bDue);
    });
  return typeof limit === 'number' ? due.slice(0, limit) : due;
}

export function getKnowledgeMap(id: string): KnowledgeMapResult | undefined {
  const base = repository.findWorkspace(id);
  if (!base) return undefined;

  const materials = repository.listMaterials(id);
  const cards = repository.listCards(id);
  const visibleMaterials = materials.slice(0, MAP_VISIBLE_MATERIAL_LIMIT);
  const materialNodes = visibleMaterials.map((material) => ({
    id: `material:${material.id}`,
    kind: 'material' as const,
    label: material.title,
    summary: compactPreview(material.contentText ?? material.rawInput),
    status: material.parseStatus,
    metadata: {
      platform: material.platform,
      type: material.type,
      mediaCount: material.mediaUrls?.length ?? 0,
    },
  }));
  const sortedCards = [...cards].sort((a, b) => {
    const rankA = a.claimStatus === 'sourced' ? 0 : a.claimStatus === 'user_confirmed' ? 1 : 2;
    const rankB = b.claimStatus === 'sourced' ? 0 : b.claimStatus === 'user_confirmed' ? 1 : 2;
    return rankA - rankB;
  });
  const visibleCards = sortedCards.slice(0, MAP_VISIBLE_CARD_LIMIT);
  const cardNodes = visibleCards.map((card) => ({
    id: `card:${card.id}`,
    kind: 'card' as const,
    label: card.title,
    summary: compactPreview(card.body),
    status: card.claimStatus,
    metadata: {
      type: card.type,
      materialId: card.materialId,
    },
  }));
  const nodes = [
    {
      id: `workspace:${base.id}`,
      kind: 'workspace' as const,
      label: base.title,
      summary: base.summary,
      status: base.stage,
      metadata: {
        sourceCount: base.sourceCount,
        cardCount: base.cardCount,
      },
    },
    ...materialNodes,
    ...cardNodes,
  ];

  const visibleMaterialIds = new Set(materialNodes.map((node) => node.id.replace('material:', '')));
  const visibleCardIds = new Set(cardNodes.map((node) => node.id.replace('card:', '')));
  const structuralEdges = [
    ...materialNodes.map((node) => ({
      id: `edge:${base.id}:${node.id}`,
      sourceId: `workspace:${base.id}`,
      targetId: node.id,
      relation: 'contains' as const,
    })),
    ...cardNodes.map((node) => {
      const materialId = typeof node.metadata?.materialId === 'string' ? node.metadata.materialId : undefined;
      const sourceId = materialId && visibleMaterialIds.has(materialId)
        ? `material:${materialId}`
        : `workspace:${base.id}`;
      return {
        id: `edge:${sourceId}:${node.id}`,
        sourceId,
        targetId: node.id,
        relation: materialId && visibleMaterialIds.has(materialId) ? 'source' as const : 'supports' as const,
      };
    }),
  ];

  const tensionEdges = buildTensionEdges(id, visibleCardIds);
  const customEdges = repository.listMapCustomEdges(id).map((edge) => ({
    id: edge.id,
    sourceId: edge.sourceNodeId,
    targetId: edge.targetNodeId,
    relation: edge.relation,
    custom: true,
  }));
  const edges = [...structuralEdges, ...tensionEdges, ...customEdges];

  return {
    workspaceId: id,
    generatedAt: now(),
    nodes,
    edges,
    nodePositions: repository.getNodePositions(id),
    stats: {
      materials: materials.length,
      cards: cards.length,
      visibleMaterials: materialNodes.length,
      visibleCards: cardNodes.length,
      hiddenMaterials: Math.max(materials.length - materialNodes.length, 0),
      hiddenCards: Math.max(cards.length - cardNodes.length, 0),
      sourcedCards: cards.filter((card) => card.claimStatus === 'sourced').length,
      skeletonCards: cards.filter((card) => card.claimStatus === 'ai_skeleton').length,
      tensionEdges: tensionEdges.length,
    },
  };
}

/**
 * 构建知识库的张力边（P12-1）。
 *
 * 扫描同一知识库中标题包含对立关键词的卡片对，
 * 生成 contradicts 类型的边，帮助用户在地图上直观发现认知冲突。
 *
 * @author fxbin
 * @param workspaceId - 知识库 ID
 * @param visibleCardIds - 当前地图上可见的卡片 ID 集合
 * @returns 张力边数组
 */
export function buildTensionEdges(
  workspaceId: string,
  visibleCardIds: Set<string>,
): Array<{ id: string; sourceId: string; targetId: string; relation: 'contradicts'; custom?: boolean }> {
  const cards = repository.listCards(workspaceId);
  const tensionGroups: Array<{ sideA: KnowledgeCard[]; sideB: KnowledgeCard[] }> = [];
  for (const [keywordA, keywordB] of TENSION_KEYWORD_PAIRS) {
    const sideA = cards.filter((card) => card.title.includes(keywordA));
    const sideB = cards.filter((card) => card.title.includes(keywordB));
    if (sideA.length === 0 || sideB.length === 0) continue;
    tensionGroups.push({ sideA, sideB });
  }
  const edges: Array<{ id: string; sourceId: string; targetId: string; relation: 'contradicts'; custom?: boolean }> = [];
  const seen = new Set<string>();
  for (const group of tensionGroups) {
    for (const cardA of group.sideA) {
      if (!visibleCardIds.has(cardA.id)) continue;
      for (const cardB of group.sideB) {
        if (!visibleCardIds.has(cardB.id)) continue;
        const key = [cardA.id, cardB.id].sort().join('::');
        if (seen.has(key)) continue;
        seen.add(key);
        edges.push({
          id: `tension:${cardA.id}:${cardB.id}`,
          sourceId: `card:${cardA.id}`,
          targetId: `card:${cardB.id}`,
          relation: 'contradicts',
        });
      }
    }
  }
  return edges.slice(0, MAP_TENSION_EDGE_LIMIT);
}

/**
 * 读取知识库的节点拖拽位置。
 * @param {string} id - 知识库 ID
 * @returns {KnowledgeMapNodePosition[]|undefined} 节点位置数组，知识库不存在时返回 undefined
 */
export function getWorkspaceNodePositions(id: string): KnowledgeMapNodePosition[] | undefined {
  const base = repository.findWorkspace(id);
  if (!base) return undefined;
  return repository.getNodePositions(id);
}

/**
 * 保存知识库的节点拖拽位置。
 * @param {string} workspaceId - 知识库 ID
 * @param {SaveKnowledgeMapNodePositionsRequest} request - 保存请求
 * @returns {KnowledgeMapNodePosition[]} 保存后的节点位置数组
 */
export function saveWorkspaceNodePositions(
  workspaceId: string,
  request: SaveKnowledgeMapNodePositionsRequest,
): KnowledgeMapNodePosition[] {
  const base = repository.findWorkspace(workspaceId);
  if (!base) throw new KnowledgeCoreError('Knowledge base not found.', 404);
  const positions = (request.positions ?? []).filter(
    (position): position is KnowledgeMapNodePosition =>
      typeof position?.nodeId === 'string'
      && typeof position?.x === 'number'
      && typeof position?.y === 'number'
      && Number.isFinite(position.x)
      && Number.isFinite(position.y),
  );
  repository.saveNodePositions(workspaceId, positions);
  repository.insertAttentionSignal({
    id: id('attn'),
    workspaceId: workspaceId,
    signalType: ATTENTION_SIGNAL_MANUAL_LAYOUT,
    signalStrength: ATTENTION_SIGNAL_MEDIUM,
    targetType: ATTENTION_TARGET_TYPE_LAYOUT,
    targetId: workspaceId,
    contextData: { nodeCount: positions.length },
    consumed: false,
    createdAt: now(),
  });
  return positions;
}

/**
 * 添加自定义地图边（P12-2）。
 *
 * 用户在地图上手动添加的语义关系边（supports/contradicts/related_to），
 * 持久化到 map_custom_edges 表，在 getKnowledgeMap 时合并返回。
 *
 * @author fxbin
 * @param workspaceId - 知识库 ID
 * @param request - 添加边请求
 * @returns 创建的自定义边对象
 */
export function addMapEdge(workspaceId: string, request: AddMapEdgeRequest): KnowledgeMapCustomEdge {
  const base = repository.findWorkspace(workspaceId);
  if (!base) throw new KnowledgeCoreError('Knowledge base not found.', 404);
  if (!request.sourceNodeId || !request.targetNodeId) {
    throw new KnowledgeCoreError('边的源节点和目标节点不能为空。', 400);
  }
  if (request.sourceNodeId === request.targetNodeId) {
    throw new KnowledgeCoreError('边的源节点和目标节点不能相同。', 400);
  }
  if (!MAP_EDGE_ALLOWED_RELATIONS.has(request.relation)) {
    throw new KnowledgeCoreError('不支持的关系类型。', 400);
  }
  const edge: KnowledgeMapCustomEdge = {
    id: id(MAP_EDGE_ID_PREFIX),
    workspaceId,
    sourceNodeId: request.sourceNodeId,
    targetNodeId: request.targetNodeId,
    relation: request.relation,
    createdAt: now(),
  };
  repository.insertMapCustomEdge(edge);
  return edge;
}

/**
 * 删除自定义地图边（P12-2）。
 *
 * @author fxbin
 * @param workspaceId - 知识库 ID
 * @param edgeId - 边 ID
 */
export function removeMapEdge(workspaceId: string, edgeId: string): void {
  const base = repository.findWorkspace(workspaceId);
  if (!base) throw new KnowledgeCoreError('Knowledge base not found.', 404);
  repository.deleteMapCustomEdge(workspaceId, edgeId);
}

/**
 * 生成证据审计报告（P13-1）。
 *
 * 扫描知识库中所有卡片的溯源状态，按 claimStatus 分类统计，
 * 并按卡片类型分组识别骨架卡占比过高的覆盖缺口。
 *
 * 遵循"镜子不保姆"铁律——只呈现事实，不替代用户判断。
 *
 * @author fxbin
 * @param workspaceId - 知识库 ID
 * @returns 证据审计报告
 */
export function generateEvidenceAudit(workspaceId: string): EvidenceAuditReport {
  const base = repository.findWorkspace(workspaceId);
  if (!base) throw new KnowledgeCoreError('Knowledge base not found.', 404);

  const cards = repository.listCards(workspaceId);
  const totals = {
    cards: cards.length,
    sourced: cards.filter((card) => card.claimStatus === 'sourced').length,
    userConfirmed: cards.filter((card) => card.claimStatus === 'user_confirmed').length,
    skeleton: cards.filter((card) => card.claimStatus === 'ai_skeleton').length,
    unsupported: cards.filter((card) => card.claimStatus === 'unsupported').length,
  };
  const sourcedRatio = cards.length > 0 ? totals.sourced / cards.length : 0;

  const byType = new Map<string, KnowledgeCard[]>();
  for (const card of cards) {
    const bucket = byType.get(card.type) ?? [];
    bucket.push(card);
    byType.set(card.type, bucket);
  }
  const gaps: EvidenceGap[] = [];
  for (const [cardType, typeCards] of byType) {
    const skeletonCount = typeCards.filter((card) => card.claimStatus === 'ai_skeleton').length;
    const skeletonRatio = typeCards.length > 0 ? skeletonCount / typeCards.length : 0;
    if (skeletonRatio >= EVIDENCE_GAP_SKELETON_RATIO_THRESHOLD) {
      gaps.push({
        cardType,
        total: typeCards.length,
        skeleton: skeletonCount,
        skeletonRatio,
        sampleCardIds: typeCards
          .filter((card) => card.claimStatus === 'ai_skeleton')
          .slice(0, EVIDENCE_GAP_SAMPLE_LIMIT)
          .map((card) => card.id),
      });
    }
  }
  gaps.sort((a, b) => b.skeletonRatio - a.skeletonRatio);

  return {
    workspaceId,
    generatedAt: now(),
    totals,
    sourcedRatio,
    gaps,
  };
}

/**
 * 假设检验（P13-2）。
 *
 * 用户提交一个假设，系统在知识库中搜索相关卡片，
 * 根据卡片标题/正文中的支持/反对关键词分类证据，
 * 返回判定和引用卡片列表。
 *
 * 遵循"镜子不保姆"铁律——只呈现证据，不替代用户判断。
 * verdict 是基于证据数量的统计判定，不是真理裁决。
 *
 * @author fxbin
 * @param workspaceId - 知识库 ID
 * @param hypothesis - 用户假设文本
 * @returns 假设检验结果
 */
export function testHypothesis(workspaceId: string, hypothesis: string): HypothesisTestResult {
  const base = repository.findWorkspace(workspaceId);
  if (!base) throw new KnowledgeCoreError('Knowledge base not found.', 404);
  const trimmed = hypothesis.trim();
  if (!trimmed) {
    throw new KnowledgeCoreError('假设不能为空。', 400);
  }

  const cards = repository.searchCardsByRelevance(workspaceId, trimmed, HYPOTHESIS_SEARCH_LIMIT);
  const supportingCards: HypothesisEvidence[] = [];
  const contradictingCards: HypothesisEvidence[] = [];
  const neutralCards: HypothesisEvidence[] = [];

  for (const card of cards) {
    const evidence: HypothesisEvidence = {
      cardId: card.id,
      title: card.title,
      preview: compactPreview(card.body, HYPOTHESIS_PREVIEW_MAX_LENGTH),
      claimStatus: card.claimStatus,
      relevanceScore: 0,
    };
    const text = `${card.title} ${card.body}`;
    const hasSupport = HYPOTHESIS_SUPPORT_KEYWORDS.some((keyword) => text.includes(keyword));
    const hasContradict = HYPOTHESIS_CONTRADICT_KEYWORDS.some((keyword) => text.includes(keyword));
    if (hasSupport && !hasContradict) {
      supportingCards.push(evidence);
    } else if (hasContradict && !hasSupport) {
      contradictingCards.push(evidence);
    } else {
      neutralCards.push(evidence);
    }
  }

  let verdict: HypothesisTestResult['verdict'];
  let summary: string;
  if (supportingCards.length === 0 && contradictingCards.length === 0) {
    verdict = HYPOTHESIS_VERDICT_INSUFFICIENT;
    summary = `知识库中未找到与假设「${trimmed}」直接相关的支持或反对证据。`;
  } else if (contradictingCards.length === 0) {
    verdict = HYPOTHESIS_VERDICT_SUPPORTED;
    summary = `找到 ${supportingCards.length} 条支持证据，未发现反对证据。`;
  } else if (supportingCards.length === 0) {
    verdict = HYPOTHESIS_VERDICT_CONTRADICTED;
    summary = `找到 ${contradictingCards.length} 条反对证据，未发现支持证据。`;
  } else {
    verdict = HYPOTHESIS_VERDICT_MIXED;
    summary = `找到 ${supportingCards.length} 条支持证据和 ${contradictingCards.length} 条反对证据，证据存在分歧。`;
  }

  return {
    workspaceId,
    hypothesis: trimmed,
    generatedAt: now(),
    verdict,
    supportingCards,
    contradictingCards,
    neutralCards,
    summary,
  };
}

/**
 * 查询注意力信号列表，供 Recall Agent 检索用户认知建构活动。
 * @param workspaceId - 可选，知识库 ID 过滤；未指定时返回全库信号
 * @param limit - 可选，最大返回数量
 * @returns 注意力信号数组
 * @author fxbin
 */
export function listAttentionSignals(workspaceId?: string, limit?: number): AttentionSignal[] {
  return repository.listAttentionSignals(workspaceId, limit);
}

export const INTEREST_WINDOW_DAYS = 7;
export const INTEREST_TOP_TOPICS_LIMIT = 20;
export const INTEREST_SIGNAL_WEIGHTS: Record<AttentionSignalType, number> = {
  question_card_created: 3,
  ask_question: 2,
  cannot_answer: 2,
  manual_layout: 1,
  card_opened: 0.5,
};

/**
 * 计算用户兴趣画像，基于近期认知行为构建滚动兴趣向量。
 * 收集最近 windowDays 内的卡片创建、材料导入、提问、回忆评分等信号，
 * 对文本内容分词并加权统计，输出按权重排序的兴趣主题列表。
 * @param windowDays - 滚动窗口天数，默认 7 天
 * @returns 用户兴趣画像
 * @author fxbin
 */
export function computeUserInterestProfile(windowDays: number = INTEREST_WINDOW_DAYS): UserInterestProfile {
  const cutoffMs = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  const cutoffIso = new Date(cutoffMs).toISOString();
  const topicWeights = new Map<string, { weight: number; sourceCount: number }>();

  const addTopic = (text: string | undefined, weight: number) => {
    if (!text) return;
    const tokens = tokenizeForTfidf(text);
    for (const token of tokens) {
      if (isChineseStopWord(token)) continue;
      const current = topicWeights.get(token) ?? { weight: 0, sourceCount: 0 };
      current.weight += weight;
      current.sourceCount += 1;
      topicWeights.set(token, current);
    }
  };

  for (const card of repository.listCards()) {
    if (card.createdAt >= cutoffIso) {
      addTopic(card.title, 1.5);
      addTopic(card.body, 0.5);
    }
  }

  for (const material of repository.listMaterials()) {
    if (material.createdAt >= cutoffIso) {
      addTopic(material.title, 1.0);
    }
  }

  const recentSignals = repository.listAttentionSignals(undefined, 500);
  let signalCount = 0;
  for (const signal of recentSignals) {
    if (signal.createdAt < cutoffIso) continue;
    signalCount += 1;
    const weight = INTEREST_SIGNAL_WEIGHTS[signal.signalType] ?? 1;
    const contextText = typeof signal.contextData?.question === 'string'
      ? signal.contextData.question
      : typeof signal.contextData?.title === 'string'
        ? signal.contextData.title
        : undefined;
    addTopic(contextText, weight);
  }

  const topics: InterestTopic[] = [...topicWeights.entries()]
    .map(([term, data]) => ({
      term,
      weight: Math.round(data.weight * 100) / 100,
      sourceCount: data.sourceCount,
    }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, INTEREST_TOP_TOPICS_LIMIT);

  return {
    windowDays,
    topics,
    totalSignals: signalCount,
    generatedAt: new Date().toISOString(),
  };
}

export const DIGEST_WINDOW_HOURS = 24;
export const DIGEST_TOP_INTEREST_LIMIT = 8;
export const DIGEST_MAX_ITEMS_PER_TYPE = 30;

/**
 * 生成每日关注摘要，汇总过去 24 小时内的新增卡片、材料、注意力信号及兴趣主题。
 * 由后台调度器每日调用，也可通过 API 实时触发。
 * @returns 每日关注摘要
 * @author fxbin
 */
export function generateDailyDigest(): DailyDigest {
  const nowMs = Date.now();
  const cutoffMs = nowMs - DIGEST_WINDOW_HOURS * 60 * 60 * 1000;
  const cutoffIso = new Date(cutoffMs).toISOString();
  const today = new Date(nowMs).toISOString().slice(0, 10);

  const workspaceMap = new Map<string, string>();
  for (const base of repository.listWorkspaces()) {
    workspaceMap.set(base.id, base.title);
  }

  const newCards: DailyDigestItem[] = [];
  for (const card of repository.listCards()) {
    if (card.createdAt >= cutoffIso) {
      newCards.push({
        id: card.id,
        type: 'card',
        title: card.title,
        workspaceId: card.workspaceId,
        workspaceTitle: workspaceMap.get(resolveWorkspaceId(card.workspaceId)),
        createdAt: card.createdAt,
      });
    }
    if (newCards.length >= DIGEST_MAX_ITEMS_PER_TYPE) break;
  }

  const newMaterials: DailyDigestItem[] = [];
  for (const material of repository.listMaterials()) {
    if (material.createdAt >= cutoffIso) {
      newMaterials.push({
        id: material.id,
        type: 'material',
        title: material.title,
        workspaceId: material.workspaceId,
        workspaceTitle: material.workspaceId
          ? workspaceMap.get(material.workspaceId)
          : undefined,
        createdAt: material.createdAt,
      });
    }
    if (newMaterials.length >= DIGEST_MAX_ITEMS_PER_TYPE) break;
  }

  const newSignals: DailyDigestItem[] = [];
  const recentSignals = repository.listAttentionSignals(undefined, 200);
  for (const signal of recentSignals) {
    if (signal.createdAt < cutoffIso) continue;
    const contextText = typeof signal.contextData?.question === 'string'
      ? signal.contextData.question
      : typeof signal.contextData?.title === 'string'
        ? signal.contextData.title
        : signal.signalType;
    newSignals.push({
      id: signal.id,
      type: 'signal',
      title: String(contextText).slice(0, 60),
      workspaceId: signal.workspaceId,
      workspaceTitle: workspaceMap.get(resolveWorkspaceId(signal.workspaceId)),
      createdAt: signal.createdAt,
    });
    if (newSignals.length >= DIGEST_MAX_ITEMS_PER_TYPE) break;
  }

  const profile = computeUserInterestProfile(INTEREST_WINDOW_DAYS);
  const topInterestTopics = profile.topics.slice(0, DIGEST_TOP_INTEREST_LIMIT);

  return {
    date: today,
    newCards,
    newMaterials,
    newSignals,
    topInterestTopics,
    totalNewItems: newCards.length + newMaterials.length + newSignals.length,
    generatedAt: new Date().toISOString(),
  };
}

export const COVERAGE_BLIND_SPOT_INTEREST_THRESHOLD = 2;
export const COVERAGE_BLIND_SPOT_COVERAGE_THRESHOLD = 2;
export const COVERAGE_CARD_WEIGHT = 2;
export const COVERAGE_MATERIAL_WEIGHT = 1;
export const COVERAGE_MAX_TOPICS = 15;

/**
 * 计算主题覆盖热力图，可视化用户兴趣主题在知识库中的覆盖情况并识别盲区。
 * 盲区定义：用户高兴趣（interestWeight >= 2）但低覆盖（coverageScore < 2）的主题。
 * @returns 主题覆盖热力图
 * @author fxbin
 */
export function computeTopicCoverage(): TopicCoverageHeatmap {
  const profile = computeUserInterestProfile(INTEREST_WINDOW_DAYS);
  const bases = repository.listWorkspaces();
  const allCards = repository.listCards();
  const allMaterials = repository.listMaterials();

  const topics: TopicCoverageItem[] = profile.topics
    .slice(0, COVERAGE_MAX_TOPICS)
    .map((topic) => {
      const termLower = topic.term.toLowerCase();
      let totalCards = 0;
      let totalMaterials = 0;
      const cells: TopicCoverageCell[] = bases.map((base) => {
        const cardCount = allCards.filter(
          (card) => card.workspaceId === base.id
            && (card.title.toLowerCase().includes(termLower)
              || card.body.toLowerCase().includes(termLower)),
        ).length;
        const materialCount = allMaterials.filter(
          (material) => material.workspaceId === base.id
            && (material.title.toLowerCase().includes(termLower)
              || (material.contentText ?? material.rawInput ?? '').toLowerCase().includes(termLower)),
        ).length;
        totalCards += cardCount;
        totalMaterials += materialCount;
        return {
          workspaceId: base.id,
          workspaceTitle: base.title,
          cardCount,
          materialCount,
        };
      });
      const coverageScore = totalCards * COVERAGE_CARD_WEIGHT + totalMaterials * COVERAGE_MATERIAL_WEIGHT;
      const isBlindSpot = topic.weight >= COVERAGE_BLIND_SPOT_INTEREST_THRESHOLD
        && coverageScore < COVERAGE_BLIND_SPOT_COVERAGE_THRESHOLD;
      return {
        term: topic.term,
        interestWeight: topic.weight,
        totalCards,
        totalMaterials,
        coverageScore,
        isBlindSpot,
        cells,
      };
    });

  const blindSpotCount = topics.filter((item) => item.isBlindSpot).length;

  return {
    topics,
    blindSpotCount,
    generatedAt: new Date().toISOString(),
  };
}

export const REPEATED_THINKING_SIMILARITY_THRESHOLD = 0.4;
export const REPEATED_THINKING_MIN_GROUP_SIZE = 2;
export const REPEATED_THINKING_MAX_GROUPS = 10;
export const REPEATED_THINKING_QUESTION_SIGNAL_TYPE = 'ask_question';

/**
 * 检测重复思考模式，识别用户是否在重复思考相似问题。
 * 基于 ask_question 注意力信号，使用 Jaccard 相似度对问题分词进行两两比较，
 * 将相似度超过阈值的问题合并为同一组，提示用户避免认知原地打转。
 * @returns 重复思考模式检测报告
 * @author fxbin
 */
export function detectRepeatedThinking(): RepeatedThinkingReport {
  const signals = repository.listAttentionSignals(undefined, 500);
  const questions = signals
    .filter((signal) => signal.signalType === REPEATED_THINKING_QUESTION_SIGNAL_TYPE)
    .map((signal) => ({
      id: signal.id,
      question: typeof signal.contextData?.question === 'string'
        ? signal.contextData.question
        : '',
      createdAt: signal.createdAt,
      workspaceId: signal.workspaceId,
    }))
    .filter((item) => item.question.length > 0);

  if (questions.length < REPEATED_THINKING_MIN_GROUP_SIZE) {
    return {
      groups: [],
      totalRepeatedQuestions: 0,
      hasRepetitivePattern: false,
      generatedAt: new Date().toISOString(),
    };
  }

  const tokenSets = questions.map((item) => new Set(tokenizeForTfidf(item.question)));

  const parent = questions.map((_, index) => index);
  const findRoot = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const union = (a: number, b: number) => {
    const rootA = findRoot(a);
    const rootB = findRoot(b);
    if (rootA !== rootB) {
      parent[rootB] = rootA;
    }
  };

  const jaccardSimilarity = (setA: Set<string>, setB: Set<string>): number => {
    if (setA.size === 0 || setB.size === 0) return 0;
    let intersection = 0;
    for (const token of setA) {
      if (setB.has(token)) intersection += 1;
    }
    return intersection / (setA.size + setB.size - intersection);
  };

  for (let i = 0; i < questions.length; i++) {
    for (let j = i + 1; j < questions.length; j++) {
      const similarity = jaccardSimilarity(tokenSets[i], tokenSets[j]);
      if (similarity >= REPEATED_THINKING_SIMILARITY_THRESHOLD) {
        union(i, j);
      }
    }
  }

  const groupMap = new Map<number, number[]>();
  for (let i = 0; i < questions.length; i++) {
    const root = findRoot(i);
    const group = groupMap.get(root) ?? [];
    group.push(i);
    groupMap.set(root, group);
  }

  const groups: RepeatedQuestionGroup[] = [];
  for (const indices of groupMap.values()) {
    if (indices.length < REPEATED_THINKING_MIN_GROUP_SIZE) continue;
    const groupQuestions = indices.map((index) => questions[index]);
    const sortedByTime = [...groupQuestions].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const tokenSetsInGroup = indices.map((index) => tokenSets[index]);
    let maxSimilarity = 0;
    for (let i = 0; i < tokenSetsInGroup.length; i++) {
      for (let j = i + 1; j < tokenSetsInGroup.length; j++) {
        const sim = jaccardSimilarity(tokenSetsInGroup[i], tokenSetsInGroup[j]);
        if (sim > maxSimilarity) maxSimilarity = sim;
      }
    }
    groups.push({
      representativeQuestion: sortedByTime[sortedByTime.length - 1].question,
      questions: groupQuestions,
      similarityScore: Math.round(maxSimilarity * 100) / 100,
      firstAskedAt: sortedByTime[0].createdAt,
      lastAskedAt: sortedByTime[sortedByTime.length - 1].createdAt,
      repeatCount: groupQuestions.length,
    });
  }

  groups.sort((a, b) => b.repeatCount - a.repeatCount || b.similarityScore - a.similarityScore);
  const topGroups = groups.slice(0, REPEATED_THINKING_MAX_GROUPS);
  const totalRepeatedQuestions = topGroups.reduce((sum, group) => sum + group.repeatCount, 0);

  return {
    groups: topGroups,
    totalRepeatedQuestions,
    hasRepetitivePattern: topGroups.length > 0,
    generatedAt: new Date().toISOString(),
  };
}

export const READING_SESSION_MIN_DURATION_MS = 1000;

/**
 * 记录卡片阅读行为，将停留时长作为 card_opened 注意力信号持久化。
 * 供用户兴趣画像与遗忘机制使用。
 * @param request - 阅读行为记录请求（cardId、workspaceId、durationMs）
 * @returns 记录结果
 * @author fxbin
 */
export function recordReadingSession(request: ReadingSessionRequest): { recorded: boolean } {
  if (!request.cardId || !request.workspaceId) {
    return { recorded: false };
  }
  if (typeof request.durationMs !== 'number' || request.durationMs < READING_SESSION_MIN_DURATION_MS) {
    return { recorded: false };
  }
  const timestamp = now();
  repository.insertAttentionSignal({
    id: id('attn'),
    workspaceId: request.workspaceId,
    signalType: ATTENTION_SIGNAL_CARD_OPENED,
    signalStrength: ATTENTION_SIGNAL_WEAK,
    targetType: ATTENTION_TARGET_TYPE_CARD,
    targetId: request.cardId,
    contextData: { durationMs: Math.round(request.durationMs) },
    consumed: false,
    createdAt: timestamp,
  });
  return { recorded: true };
}

/**
 * 记录"答不上来"反馈，将用户对 AI 回答的不满意作为 cannot_answer 注意力信号持久化。
 * 用于识别知识盲区，驱动后续知识补充。
 * @param request - 反馈请求（workspaceId、question）
 * @returns 记录结果
 * @author fxbin
 */
export function recordCannotAnswerFeedback(request: CannotAnswerFeedbackRequest): { recorded: boolean } {
  if (!request.workspaceId || !request.question?.trim()) {
    return { recorded: false };
  }
  const timestamp = now();
  repository.insertAttentionSignal({
    id: id('attn'),
    workspaceId: request.workspaceId,
    signalType: ATTENTION_SIGNAL_CANNOT_ANSWER,
    signalStrength: ATTENTION_SIGNAL_MEDIUM,
    targetType: ATTENTION_TARGET_TYPE_QUESTION,
    targetId: request.workspaceId,
    contextData: { question: request.question.trim().slice(0, ATTENTION_CONTEXT_QUESTION_MAX_LENGTH) },
    consumed: false,
    createdAt: timestamp,
  });
  return { recorded: true };
}

export const RECALL_DECAY_HALF_LIFE_DAYS = 7;
export const RECALL_DECAY_THRESHOLD = 0.1;
export const RECALL_DECAY_MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * 计算遗忘衰减报告，基于艾宾浩斯遗忘曲线为每张未归档卡片计算 recall 分数。
 * recall = exp(-daysSinceLastAccess / halfLife)，低于阈值的卡片标记为归档候选。
 * @returns 遗忘衰减报告
 * @author fxbin
 */
export function computeRecallDecay(): RecallDecayReport {
  const cards = repository.listCards();
  const bases = repository.listWorkspaces();
  const baseMap = new Map(bases.map((base) => [base.id, base.title]));
  const signals = repository.listAttentionSignals(undefined, 1000);

  const lastAccessByCard = new Map<string, string>();
  for (const signal of signals) {
    if (signal.signalType !== ATTENTION_SIGNAL_CARD_OPENED) continue;
    const cardId = signal.targetId;
    const current = lastAccessByCard.get(cardId);
    if (!current || signal.createdAt > current) {
      lastAccessByCard.set(cardId, signal.createdAt);
    }
  }

  const nowMs = Date.now();
  const items: RecallDecayItem[] = cards.map((card) => {
    const lastAccessedAt = lastAccessByCard.get(card.id) ?? card.createdAt;
    const lastAccessMs = new Date(lastAccessedAt).getTime();
    const daysSinceLastAccess = Math.max(0, (nowMs - lastAccessMs) / RECALL_DECAY_MS_PER_DAY);
    const recallScore = Math.exp(-daysSinceLastAccess / RECALL_DECAY_HALF_LIFE_DAYS);
    return {
      cardId: card.id,
      cardTitle: card.title,
      workspaceId: card.workspaceId,
      workspaceTitle: baseMap.get(resolveWorkspaceId(card.workspaceId)) ?? '',
      lastAccessedAt,
      daysSinceLastAccess: Math.round(daysSinceLastAccess * 10) / 10,
      recallScore: Math.round(recallScore * 1000) / 1000,
      shouldArchive: recallScore < RECALL_DECAY_THRESHOLD,
    };
  });

  items.sort((a, b) => a.recallScore - b.recallScore);
  const archiveCandidateCount = items.filter((item) => item.shouldArchive).length;

  return {
    items,
    totalCards: items.length,
    archiveCandidateCount,
    halfLifeDays: RECALL_DECAY_HALF_LIFE_DAYS,
    threshold: RECALL_DECAY_THRESHOLD,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * 应用遗忘衰减，对 recall 分数低于阈值的卡片执行归档。
 * @returns 归档执行结果
 * @author fxbin
 */
export function applyRecallDecay(): RecallDecayApplyResult {
  const report = computeRecallDecay();
  const archivedCardIds: string[] = [];
  let skippedCount = 0;
  for (const item of report.items) {
    if (!item.shouldArchive) {
      skippedCount += 1;
      continue;
    }
    try {
      archiveCard(item.cardId);
      archivedCardIds.push(item.cardId);
    } catch {
      skippedCount += 1;
    }
  }
  return {
    archivedCount: archivedCardIds.length,
    skippedCount,
    archivedCardIds,
  };
}

export const PROPOSAL_MAX_PER_TYPE = 3;
export const PROPOSAL_RECALL_REVIEW_THRESHOLD = 0.2;
export const EMERGENCE_MIN_CARD_COUNT = 3;
export const EMERGENCE_MIN_KEYWORD_LENGTH = 2;
export const EMERGENCE_SAMPLE_TITLES = 3;
export const EMERGENCE_MAX_CLUSTERS = 5;

/**
 * 无主题承载能力的宽泛关键词集合。
 *
 * 这些词虽然在 jieba 分词后是多字 token（能通过停用词和长度过滤），
 * 但语义过于通用，出现在大量卡片中却不代表任何具体主题，
 * 会污染「工作区涌现」聚类结果。
 *
 * 在 detectWorkspaceEmergence 中作为黑名单过滤，确保涌现的关键词
 * 具备足够的主题辨识度。
 */
export const EMERGENCE_GENERIC_KEYWORDS = new Set([
  '方法', '问题', '概念', '内容', '基本', '通过', '进行',
  '可以', '可能', '需要', '应该', '如果', '虽然', '但是',
  '因此', '因为', '所以', '主要', '重要', '关键', '基础',
  '核心', '目标', '目的', '方式', '方面', '部分', '类型',
  '结构', '系统', '过程', '结果', '原因', '影响', '作用',
  '功能', '特点', '特征', '原理', '理论', '实践', '应用',
  '研究', '分析', '理解', '思考', '学习', '工作', '情况',
  '状态', '水平', '能力', '质量', '效果', '效率', '价值',
  '数据', '信息', '知识', '技术', '工具', '平台', '服务',
  '用户', '产品', '项目', '团队', '管理', '设计', '开发',
  '实现', '测试', '部署', '运行', '操作', '使用', '查看',
  '开始', '结束', '完成', '继续', '返回', '设置', '配置',
  '介绍', '说明', '描述', '定义', '区别', '联系', '关系',
  '比较', '选择', '采用', '基于', '提供', '支持', '包含',
]);

/**
 * 检测默认工作区中的卡片主题聚类，发现可涌现为命名工作区的主题。
 *
 * 聚类策略（KISS）：
 *  - 取默认工作区（default）中的卡片
 *  - 对每张卡片的 title + body 用 tokenizeForTfidf 分词（jieba 词典分词）
 *  - 按关键词聚合卡片 ID，统计每个关键词关联的卡片数
 *  - 过滤：关联卡片数 >= 阈值、关键词长度 >= 2、关键词非停用词、
 *    关键词不在 EMERGENCE_GENERIC_KEYWORDS 宽泛词黑名单中
 *  - 记录关键词是否出现在卡片标题中（标题命中的关键词语义相关性更强）
 *  - 排除已有工作区标题包含的关键词（避免重复提议）
 *  - 排序：标题命中的关键词优先，其次按关联卡片数降序，取 Top N
 *
 * @returns 工作区涌现聚类列表
 * @author fxbin
 */
export function detectWorkspaceEmergence(): WorkspaceEmergenceCluster[] {
  const defaultCards = repository.listCards(DEFAULT_WORKSPACE_ID);
  if (defaultCards.length < EMERGENCE_MIN_CARD_COUNT) {
    return [];
  }

  const existingTitles = repository.listWorkspaces().map((base) => base.title.toLowerCase());

  const keywordToCards = new Map<string, Set<string>>();
  const keywordInTitle = new Map<string, boolean>();
  const cardTitleMap = new Map<string, string>();

  for (const card of defaultCards) {
    cardTitleMap.set(card.id, card.title ?? '');
    const titleTokens = new Set(tokenizeForTfidf(card.title ?? ''));
    const text = [card.title ?? '', card.body ?? ''].join(' ');
    const tokens = tokenizeForTfidf(text);
    const uniqueTokens = new Set(tokens);
    for (const token of uniqueTokens) {
      if (token.length < EMERGENCE_MIN_KEYWORD_LENGTH) continue;
      if (isChineseStopWord(token)) continue;
      if (EMERGENCE_GENERIC_KEYWORDS.has(token)) continue;
      if (!keywordToCards.has(token)) {
        keywordToCards.set(token, new Set());
        keywordInTitle.set(token, false);
      }
      keywordToCards.get(token)!.add(card.id);
      if (titleTokens.has(token)) {
        keywordInTitle.set(token, true);
      }
    }
  }

  const clusters: WorkspaceEmergenceCluster[] = [];
  for (const [keyword, cardIdSet] of keywordToCards) {
    if (cardIdSet.size < EMERGENCE_MIN_CARD_COUNT) continue;
    const keywordLower = keyword.toLowerCase();
    const alreadyCovered = existingTitles.some((title) => title.includes(keywordLower));
    if (alreadyCovered) continue;

    const cardIds = Array.from(cardIdSet);
    const sampleTitles = cardIds
      .slice(0, EMERGENCE_SAMPLE_TITLES)
      .map((id) => cardTitleMap.get(id) ?? '')
      .filter((title) => title.length > 0);

    clusters.push({
      keyword,
      cardIds,
      cardCount: cardIds.length,
      sampleTitles,
    });
  }

  clusters.sort((a, b) => {
    const aInTitle = keywordInTitle.get(a.keyword) ? 1 : 0;
    const bInTitle = keywordInTitle.get(b.keyword) ? 1 : 0;
    if (aInTitle !== bInTitle) return bInTitle - aInTitle;
    return b.cardCount - a.cardCount;
  });
  return clusters.slice(0, EMERGENCE_MAX_CLUSTERS);
}

/**
 * 生成 Agent 主动提议，基于盲区、重复思考、遗忘衰减、兴趣主题、工作区涌现五个维度。
 * 守提议权不写入权：本函数只生成提议数据，不执行任何写入操作。
 * @returns Agent 主动提议报告
 * @author fxbin
 */
export function generateAgentProposals(): AgentProposalReport {
  const proposals: AgentProposal[] = [];
  const workspaceTitles = new Map(repository.listWorkspaces().map((base) => [base.id, base.title]));
  const workspaceTitleOf = (workspaceId?: string) => workspaceTitles.get(resolveWorkspaceId(workspaceId)) ?? '';

  const coverage = computeTopicCoverage();
  for (const topic of coverage.topics.filter((item) => item.isBlindSpot).slice(0, PROPOSAL_MAX_PER_TYPE)) {
    proposals.push({
      type: 'blind_spot',
      title: `盲区补充：${topic.term}`,
      description: `你对「${topic.term}」关注度高（权重 ${topic.interestWeight}），但知识库中覆盖不足（仅 ${topic.totalCards} 张卡片、${topic.totalMaterials} 条资料）。建议补充相关资料。`,
      actionLabel: '补充资料',
      metadata: {
        term: topic.term,
        interestWeight: topic.interestWeight,
        coverageScore: topic.coverageScore,
        totalCards: topic.totalCards,
        totalMaterials: topic.totalMaterials,
      },
    });
  }

  const repeatedThinking = detectRepeatedThinking();
  for (const group of repeatedThinking.groups.slice(0, PROPOSAL_MAX_PER_TYPE)) {
    const sortedQuestions = [...group.questions].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const latestQuestion = sortedQuestions[sortedQuestions.length - 1];
    proposals.push({
      type: 'repeated_thinking',
      title: '重复思考提醒',
      description: `你已 ${group.repeatCount} 次提出相似问题：「${group.representativeQuestion}」。考虑换个角度或深化已有回答？`,
      actionLabel: '查看历史回答',
      metadata: {
        repeatCount: group.repeatCount,
        similarityScore: group.similarityScore,
        representativeQuestion: group.representativeQuestion,
        firstAskedAt: group.firstAskedAt,
        lastAskedAt: group.lastAskedAt,
        workspaceId: latestQuestion?.workspaceId,
        workspaceTitle: workspaceTitleOf(latestQuestion?.workspaceId),
        questionSamples: sortedQuestions.slice(-3).map((item) => item.question),
      },
    });
  }

  const recallDecay = computeRecallDecay();
  for (const item of recallDecay.items.filter((entry) => entry.recallScore < PROPOSAL_RECALL_REVIEW_THRESHOLD).slice(0, PROPOSAL_MAX_PER_TYPE)) {
    proposals.push({
      type: 'recall_review',
      title: `复习建议：${item.cardTitle}`,
      description: `这张卡片已 ${item.daysSinceLastAccess} 天未访问，recall 分数仅 ${item.recallScore}。建议复习以防遗忘。`,
      actionLabel: '复习卡片',
      metadata: {
        cardId: item.cardId,
        cardTitle: item.cardTitle,
        workspaceId: item.workspaceId,
        workspaceTitle: item.workspaceTitle,
        recallScore: item.recallScore,
        daysSinceLastAccess: item.daysSinceLastAccess,
      },
    });
  }

  const profile = computeUserInterestProfile(INTEREST_WINDOW_DAYS);
  for (const topic of profile.topics.slice(0, PROPOSAL_MAX_PER_TYPE)) {
    proposals.push({
      type: 'topic_explore',
      title: `主题探索：${topic.term}`,
      description: `「${topic.term}」是你近期高关注主题（权重 ${topic.weight}，来源 ${topic.sourceCount}）。考虑深入探索或建立专题知识库？`,
      actionLabel: '探索主题',
      metadata: {
        term: topic.term,
        weight: topic.weight,
        sourceCount: topic.sourceCount,
        windowDays: profile.windowDays,
        totalSignals: profile.totalSignals,
      },
    });
  }

  const emergenceClusters = detectWorkspaceEmergence();
  for (const cluster of emergenceClusters.slice(0, PROPOSAL_MAX_PER_TYPE)) {
    const sampleList = cluster.sampleTitles.map((title) => `「${title}」`).join('、');
    proposals.push({
      type: 'workspace_emergence',
      title: `工作区涌现：${cluster.keyword}`,
      description: `默认工作区中有 ${cluster.cardCount} 张卡片提到了「${cluster.keyword}」${sampleList ? `（如 ${sampleList}）` : ''}。建议创建命名工作区来组织这些卡片。`,
      actionLabel: '创建工作区',
      metadata: {
        keyword: cluster.keyword,
        cardCount: cluster.cardCount,
        cardIds: cluster.cardIds,
        sampleTitles: cluster.sampleTitles,
        triggerRule: `默认工作区中同一关键词出现在至少 ${EMERGENCE_MIN_CARD_COUNT} 张卡片中，且该关键词未被已有工作区标题覆盖。`,
      },
    });
  }

  return {
    proposals,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * 记录 Agent 行为日志（P10-5）。
 *
 * 包装 Agent 调用，自动测量耗时并记录输入/输出/错误。
 * 供可审计性使用，每次 Agent 行为都留 log。
 *
 * @author fxbin
 * @param {AgentAction} action - 行为类型
 * @param {object} options - 选项
 * @param {string} [options.workspaceId] - 知识库 ID
 * @param {Record<string, unknown>} [options.input] - 输入参数
 * @param {Record<string, unknown>} [options.output] - 输出结果
 * @param {string} [options.error] - 错误信息
 * @param {number} [options.durationMs] - 耗时（毫秒）
 * @returns {AgentActionLog} 行为日志记录
 */
export function logAgentAction(
  action: AgentAction,
  options: {
    workspaceId?: string;
    input?: Record<string, unknown>;
    output?: Record<string, unknown>;
    error?: string;
    durationMs?: number;
  },
): AgentActionLog {
  const log: AgentActionLog = {
    id: id(AGENT_ACTION_LOG_ID_PREFIX),
    action,
    workspaceId: options.workspaceId,
    input: options.input ?? {},
    output: options.output,
    durationMs: options.durationMs ?? 0,
    success: !options.error,
    error: options.error,
    createdAt: now(),
  };
  repository.insertAgentActionLog(log);
  return log;
}

/**
 * 查询 Agent 行为日志（P10-5）。
 *
 * @author fxbin
 * @param {object} options - 查询选项
 * @param {string} [options.workspaceId] - 知识库 ID 过滤
 * @param {string} [options.action] - 行为类型过滤
 * @param {number} [options.limit] - 最大返回数量
 * @returns {AgentActionLogResult} 日志查询结果
 */
export function listAgentActionLogs(options?: {
  workspaceId?: string;
  action?: string;
  limit?: number;
}): AgentActionLogResult {
  const logs = repository.listAgentActionLogs(options);
  const total = repository.countAgentActionLogs(options);
  return { logs, total };
}

/**
 * 执行 inspect SQL 查询（P10-5）。
 *
 * datasette inspect 能力的轻量实现：仅支持 SELECT 语句，
 * 结果行数受 limit 参数限制。
 *
 * 安全限制：仅允许 SELECT，禁止任何写操作。
 *
 * @author fxbin
 * @param {string} sql - SQL 语句（必须是 SELECT）
 * @param {number} [limit] - 最大返回行数
 * @returns {Array<Record<string, unknown>>} 查询结果
 */
export function inspectQuery(sql: string, limit?: number): Array<Record<string, unknown>> {
  return repository.executeInspectQuery(sql, limit);
}

/**
 * 列出 inspect 可用的表（P10-5）。
 *
 * @author fxbin
 * @returns {Array<{name: string; sql: string}>} 表列表
 */
export function listInspectTables(): Array<{ name: string; sql: string }> {
  return repository.listInspectTables();
}

export function getTask(id: string) {
  return repository.findTask(id);
}

export function getDashboard(workspaceId?: string) {
  return {
    workspaces: repository.listWorkspaces(),
    materials: repository.listMaterials(workspaceId, 6),
    tasks: repository.listTasks(6),
    artifacts: repository.listArtifacts(workspaceId, 6),
  };
}

/**
 * 将资料加入归档。
 * 已归档资料在日常列表、搜索、统计中默认不可见。
 * @param {string} id - 资料 ID
 * @returns {ArchiveItemResult} 归档结果
 * @author fxbin
 */
export function archiveMaterial(id: string): ArchiveItemResult {
  const material = repository.findMaterial(id);
  if (!material) throw new KnowledgeCoreError('Material not found.', 404);
  repository.archiveMaterial(id);
  return { id, workspaceId: material.workspaceId, kind: 'material', archived: true };
}

/**
 * 将资料从归档中恢复。
 * @param {string} id - 资料 ID
 * @returns {ArchiveItemResult} 恢复结果
 * @author fxbin
 */
export function unarchiveMaterial(id: string): ArchiveItemResult {
  const material = repository.findMaterial(id);
  if (!material) throw new KnowledgeCoreError('Material not found.', 404);
  repository.unarchiveMaterial(id);
  return { id, workspaceId: material.workspaceId, kind: 'material', archived: false };
}

/**
 * 将卡片加入归档。
 * 已归档卡片在日常列表、搜索、统计中默认不可见。
 * @param {string} id - 卡片 ID
 * @returns {ArchiveItemResult} 归档结果
 * @author fxbin
 */
export function archiveCard(id: string): ArchiveItemResult {
  const card = repository.findCard(id);
  if (!card) throw new KnowledgeCoreError('Card not found.', 404);
  repository.archiveCard(id);
  reconcileWorkspaceStats(card.workspaceId);
  return { id, workspaceId: card.workspaceId, kind: 'card', archived: true };
}

/**
 * 将卡片从归档中恢复。
 * @param {string} id - 卡片 ID
 * @returns {ArchiveItemResult} 恢复结果
 * @author fxbin
 */
export function unarchiveCard(id: string): ArchiveItemResult {
  const card = repository.findCard(id);
  if (!card) throw new KnowledgeCoreError('Card not found.', 404);
  repository.unarchiveCard(id);
  reconcileWorkspaceStats(card.workspaceId);
  return { id, workspaceId: card.workspaceId, kind: 'card', archived: false };
}

/**
 * 获取全局或指定知识库下的归档资料与卡片列表。
 * @param {Object} options - 查询选项
 * @param {string} [options.workspaceId] - 可选知识库 ID
 * @returns {ArchivedItemsResult} 归档列表
 * @author fxbin
 */
export function listArchivedItems(options: { workspaceId?: string } = {}): ArchivedItemsResult {
  const materials = repository.listArchivedMaterials(options.workspaceId);
  const cards = repository.listArchivedCards(options.workspaceId);
  const allBases = repository.listWorkspaces();
  const baseIds = new Set([...materials.map((m) => m.workspaceId), ...cards.map((c) => c.workspaceId)]);
  const workspaces = options.workspaceId
    ? allBases.filter((base) => base.id === options.workspaceId)
    : allBases.filter((base) => baseIds.has(base.id));
  return { materials, cards, workspaces };
}

export async function getWorkspaceAnalytics(id: string): Promise<WorkspaceAnalytics | undefined> {
  const base = repository.findWorkspace(id);
  if (!base) return undefined;

  const materials = repository.listMaterials(id);
  const cards = repository.listCards(id);
  const artifacts = repository.listArtifacts(id);
  const tasks = repository.listTasks().filter((task) => {
    const inputWorkspaceId = typeof task.input.workspaceId === 'string' ? task.input.workspaceId : undefined;
    const outputWorkspaceId = typeof task.output?.workspaceId === 'string' ? task.output.workspaceId : undefined;
    return inputWorkspaceId === id || outputWorkspaceId === id;
  });

  const connection = await DuckDBConnection.create();
  try {
    await connection.run('CREATE TEMP TABLE materials(id VARCHAR, platform VARCHAR, parse_status VARCHAR, type VARCHAR)');
    await connection.run('CREATE TEMP TABLE cards(id VARCHAR, type VARCHAR, claim_status VARCHAR)');
    await connection.run('CREATE TEMP TABLE artifacts(id VARCHAR, artifact_type VARCHAR)');
    await connection.run('CREATE TEMP TABLE tasks(id VARCHAR, workflow VARCHAR, status VARCHAR)');

    for (const material of materials) {
      await connection.run(
        'INSERT INTO materials VALUES ($id, $platform, $parse_status, $type)',
        {
          id: material.id,
          platform: material.platform ?? 'unknown',
          parse_status: material.parseStatus,
          type: material.type,
        },
      );
    }

    for (const card of cards) {
      await connection.run(
        'INSERT INTO cards VALUES ($id, $type, $claim_status)',
        {
          id: card.id,
          type: card.type,
          claim_status: card.claimStatus,
        },
      );
    }

    for (const artifact of artifacts) {
      await connection.run(
        'INSERT INTO artifacts VALUES ($id, $artifact_type)',
        {
          id: artifact.id,
          artifact_type: artifact.artifactType,
        },
      );
    }

    for (const task of tasks) {
      await connection.run(
        'INSERT INTO tasks VALUES ($id, $workflow, $status)',
        {
          id: task.id,
          workflow: task.workflow,
          status: task.status,
        },
      );
    }

    const totals = singleRow(await connection.runAndReadAll(`
      SELECT
        (SELECT count(*) FROM materials)::INTEGER AS materials,
        (SELECT count(*) FROM cards)::INTEGER AS cards,
        (SELECT count(*) FROM cards WHERE claim_status = 'sourced')::INTEGER AS sourcedCards,
        (SELECT count(*) FROM cards WHERE claim_status = 'ai_skeleton')::INTEGER AS aiSkeletonCards,
        (SELECT count(*) FROM artifacts)::INTEGER AS artifacts,
        (SELECT count(*) FROM tasks)::INTEGER AS tasks
    `));

    const exportRows = rows(await connection.runAndReadAll(`
      SELECT 'materials' AS section, 'total' AS label, count(*)::VARCHAR AS value FROM materials
      UNION ALL
      SELECT 'cards', 'total', count(*)::VARCHAR FROM cards
      UNION ALL
      SELECT 'cards', 'sourced', count(*)::VARCHAR FROM cards WHERE claim_status = 'sourced'
      UNION ALL
      SELECT 'artifacts', 'total', count(*)::VARCHAR FROM artifacts
      UNION ALL
      SELECT 'tasks', 'total', count(*)::VARCHAR FROM tasks
    `)).map((row) => ({
      section: String(row.section),
      label: String(row.label),
      value: String(row.value),
    }));

    const cardTotal = Number(totals.cards ?? 0);
    const sourcedCards = Number(totals.sourcedCards ?? 0);

    return {
      workspaceId: id,
      generatedAt: now(),
      totals: {
        materials: Number(totals.materials ?? 0),
        cards: cardTotal,
        sourcedCards,
        aiSkeletonCards: Number(totals.aiSkeletonCards ?? 0),
        artifacts: Number(totals.artifacts ?? 0),
        tasks: Number(totals.tasks ?? 0),
      },
      sourcedRatio: cardTotal > 0 ? sourcedCards / cardTotal : 0,
      platformDistribution: await distribution(connection, 'materials', 'platform'),
      materialStatusDistribution: await distribution(connection, 'materials', 'parse_status'),
      cardTypeDistribution: await distribution(connection, 'cards', 'type'),
      taskStatusDistribution: await distribution(connection, 'tasks', 'status'),
      exportRows,
    };
  } finally {
    connection.disconnectSync();
  }
}

/**
 * 洞察页来源分布最多展示的平台数量。
 */
export const INSIGHTS_SOURCE_PLATFORM_LIMIT = 6;

/**
 * 洞察页知识增长图展示的天数（近 9 个月）。
 * 约 39 周，兼顾信息密度与可读性，避免 12 个月在 2D 视图中过于拥挤。
 */
export const INSIGHTS_GROWTH_DAYS = 274;
export const DEFAULT_USER_MEMORY_QUERY_LIMIT = 200;
export const DEFAULT_DECISION_LOG_QUERY_LIMIT = 200;

/**
 * 洞察页最近卡片最多展示的条数。
 */
export const RECENT_CARDS_LIMIT = 4;

/**
 * 全局地图预览每个工作区最多展示的卡片数（用于派生 sourcedRatio 的分母）。
 */
export const WORKSPACE_PREVIEW_TOP_LIMIT = 8;

export function getGlobalInsights(workspaceId?: string): GlobalInsights {
  const scopedWorkspaceId = workspaceId && workspaceId.trim() ? workspaceId.trim() : undefined;

  const bases = repository.listWorkspaces();
  const materials = repository.listMaterials(scopedWorkspaceId);
  const cards = repository.listCards(scopedWorkspaceId);
  const artifacts = repository.listArtifacts(scopedWorkspaceId);
  const tasks = repository.listTasks();

  const sourcedCards = cards.filter((card) => card.claimStatus === 'sourced').length;
  const totalCards = cards.length;

  const nowDate = new Date();
  const labels: string[] = [];
  const data: number[] = [];
  for (let i = INSIGHTS_GROWTH_DAYS - 1; i >= 0; i -= 1) {
    const date = new Date(nowDate);
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().slice(0, 10);
    labels.push(dateKey);
    const count = cards.filter((card) => card.createdAt.slice(0, 10) === dateKey).length;
    data.push(count);
  }

  const platformCounts = new Map<string, number>();
  for (const material of materials) {
    const platform = material.platform?.trim() || 'unknown';
    platformCounts.set(platform, (platformCounts.get(platform) ?? 0) + 1);
  }
  const sortedPlatforms = [...platformCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, INSIGHTS_SOURCE_PLATFORM_LIMIT);
  const totalMaterials = materials.length || 1;
  const sourceDistribution = sortedPlatforms.map(([name, count]) => ({
    name,
    count,
    ratio: count / totalMaterials,
  }));

  const recentCards = cards
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, RECENT_CARDS_LIMIT)
    .map((card) => {
      const kbId = resolveWorkspaceId(card.workspaceId);
      const base = bases.find((b) => b.id === kbId);
      return {
        id: card.id,
        workspaceId: kbId,
        workspaceTitle: base?.title ?? kbId,
        title: card.title,
        body: card.body,
        type: card.type,
        claimStatus: card.claimStatus,
        createdAt: card.createdAt,
      };
    });

  const nodeCount = bases.length + materials.length + cards.length;
  const edgeCount = materials.length + cards.filter((card) => card.materialId).length;

  const allWorkspacePreviews = buildWorkspacePreviews(bases);
  const workspacePreviews = scopedWorkspaceId
    ? allWorkspacePreviews.filter((ws) => ws.id === scopedWorkspaceId)
    : allWorkspacePreviews;
  const workspaceCount = scopedWorkspaceId ? workspacePreviews.length : bases.length;
  const scopedNodeCount = scopedWorkspaceId
    ? workspacePreviews.length + materials.length + cards.length
    : nodeCount;
  const scopedEdgeCount = scopedWorkspaceId
    ? materials.length + cards.filter((card) => card.materialId).length
    : edgeCount;

  const evidenceLogs = repository.listAgentActionLogs({
    action: EVIDENCE_ACTION_ACCEPT_PROPOSED_CARDS,
    limit: AGENT_ACTION_LOG_MAX_LIMIT,
  });
  const evidence = computeEvidenceFeedback(evidenceLogs);

  return {
    generatedAt: now(),
    totals: {
      workspaces: bases.length,
      materials: materials.length,
      cards: totalCards,
      sourcedCards,
      artifacts: artifacts.length,
      tasks: tasks.length,
    },
    growth: { labels, data },
    sourceDistribution,
    recentCards,
    mapPreview: {
      nodeCount: scopedNodeCount,
      edgeCount: scopedEdgeCount,
      workspaceCount,
      workspaces: workspacePreviews,
    },
    evidence,
  };
}

/**
 * 构建洞察页工作区预览列表。
 *
 * - 按卡片数降序排列，让内容更丰富的工作区排在前面
 * - sourcedRatio 复用 WorkspaceSummary 上的既有派生（已溯源卡片数 / 总卡片数）
 * - 直接复用 bases 中已计算的 stage，避免重复派生
 *
 * @author fxbin
 * @param bases - 工作区摘要列表（已包含 cardCount/sourcedRatio/stage）
 * @returns 工作区预览数组
 */
export function buildWorkspacePreviews(
  bases: WorkspaceSummary[],
): GlobalInsightsWorkspacePreview[] {
  if (bases.length === 0) {
    return [];
  }
  return bases
    .slice()
    .sort((a, b) => b.cardCount - a.cardCount)
    .slice(0, WORKSPACE_PREVIEW_TOP_LIMIT)
    .map((base) => ({
      id: base.id,
      title: base.title,
      cardCount: base.cardCount,
      sourcedRatio: base.sourcedRatio,
      stage: base.stage,
    }));
}

/**
 * 计算知识库的建构进度报告（P11-1）。
 *
 * 量化用户认知劳动量，基于骨架卡（ai_skeleton）占比划分建构阶段：
 *  - seedling 幼苗期：骨架卡占比 > 60%，知识库仍以 AI 生成为主
 *  - growing 成长期：骨架卡占比 30%-60%，用户正在主动建构
 *  - mature 成熟期：骨架卡占比 < 30%，建构接近完成
 *
 * 每个阶段附带建议动作，引导用户从 AI 骨架转向自主建构。
 * 若知识库不存在或无卡片，返回 undefined。
 *
 * @author fxbin
 * @param {string} workspaceId - 知识库 ID
 * @returns {ConstructionProgress | undefined} 建构进度报告
 */
export function getConstructionProgress(workspaceId: string): ConstructionProgress | undefined {
  const base = repository.findWorkspace(workspaceId);
  if (!base) return undefined;

  const cards = repository.listCards(workspaceId);
  const totalCards = cards.length;
  if (totalCards === 0) return undefined;

  const skeletonCards = cards.filter((card) => card.claimStatus === 'ai_skeleton').length;
  const confirmedCards = cards.filter((card) => card.claimStatus === 'user_confirmed').length;
  const sourcedCards = cards.filter((card) => card.claimStatus === 'sourced').length;
  const unsupportedCards = cards.filter((card) => card.claimStatus === 'unsupported').length;

  const skeletonRatio = skeletonCards / totalCards;
  const confirmedRatio = confirmedCards / totalCards;
  const sourcedRatio = sourcedCards / totalCards;

  let constructionStage: ConstructionStage;
  let suggestedAction: string;

  if (skeletonRatio > CONSTRUCTION_SEEDLING_THRESHOLD) {
    constructionStage = CONSTRUCTION_STAGE_SEEDLING as ConstructionStage;
    suggestedAction = CONSTRUCTION_ACTION_SEEDLING;
  } else if (skeletonRatio > CONSTRUCTION_GROWING_THRESHOLD) {
    constructionStage = CONSTRUCTION_STAGE_GROWING as ConstructionStage;
    suggestedAction = CONSTRUCTION_ACTION_GROWING;
  } else {
    constructionStage = CONSTRUCTION_STAGE_MATURE as ConstructionStage;
    suggestedAction = CONSTRUCTION_ACTION_MATURE;
  }

  return {
    workspaceId,
    totalCards,
    skeletonCards,
    confirmedCards,
    sourcedCards,
    unsupportedCards,
    skeletonRatio,
    confirmedRatio,
    sourcedRatio,
    constructionStage,
    suggestedAction,
  };
}

/**
 * 获取知识库中所有骨架卡（claimStatus === 'ai_skeleton'）列表。
 *
 * 用于"骨架卡强制建构流程"（P11-1）前端展示"待建构"列表。
 *
 * @author fxbin
 * @param {string} workspaceId - 知识库 ID
 * @returns {KnowledgeCard[]} 骨架卡数组
 */
export function listSkeletonCards(workspaceId: string): KnowledgeCard[] {
  return repository
    .listCards(workspaceId)
    .filter((card) => card.claimStatus === 'ai_skeleton');
}

/**
 * 生成苏格拉底追问（P11-2）。
 *
 * 核心铁律：Agent 只生成提问，不生成答案。
 * 镜子不保姆：反映用户当前认知状态，不替代用户建构。
 *
 * 触发场景：
 *  - skeleton_card 骨架卡待建构时，引导用户澄清概念边界
 *  - semantic_tension 语义张力检测到认知冲突时，引导用户思考对立
 *  - manual 用户主动请求追问时，基于知识库核心卡片生成
 *
 * 实现要点：
 *  - prompt 中明确指示"只提问，不提供答案"
 *  - schema 中只有 questions 字段，无 answer 字段
 *  - 记录 attention_signal 供 Recall Agent 检索
 *  - 问题数量限制在 3-5 个，覆盖不同追问维度
 *
 * @author fxbin
 * @param {string} workspaceId - 知识库 ID
 * @param {object} options - 可选参数
 * @param {string} options.cardId - 目标卡片 ID（skeleton_card 触发时使用）
 * @param {string} options.tensionKey - 张力组 key（semantic_tension 触发时使用）
 * @param {SocraticTrigger} options.trigger - 触发来源，默认 manual
 * @returns {Promise<SocraticQuestioningResult>} 苏格拉底追问结果
 */
export async function generateSocraticQuestions(
  workspaceId: string,
  options?: { cardId?: string; tensionKey?: string; trigger?: SocraticTrigger; runtimeOverride?: PiRuntime },
): Promise<SocraticQuestioningResult> {
  const startTime = Date.now();
  const base = repository.findWorkspace(workspaceId);
  if (!base) {
    throw new KnowledgeCoreError(`Knowledge base ${workspaceId} not found.`, 404);
  }

  const trigger = options?.trigger ?? SOCRATIC_TRIGGER_MANUAL as SocraticTrigger;
  const cardId = options?.cardId;
  const tensionKey = options?.tensionKey;

  const cards = repository.listCards(workspaceId);
  if (cards.length === 0) {
    throw new KnowledgeCoreError('知识库没有卡片，无法生成苏格拉底追问。', 400);
  }

  const evidenceLogs = repository.listAgentActionLogs({
    workspaceId,
    action: EVIDENCE_ACTION_ACCEPT_PROPOSED_CARDS,
    limit: AGENT_ACTION_LOG_MAX_LIMIT,
  });
  const rejectedFeatures = extractRejectedFeatures(evidenceLogs, DEFAULT_REJECTED_FEATURES_LIMIT);
  const negativeExamples = buildNegativeExampleSection(rejectedFeatures);
  const prompt = buildSocraticPrompt(
    base.title,
    cards,
    trigger,
    cardId,
    tensionKey,
    negativeExamples.length > 0 ? negativeExamples : undefined,
  );
  const runtime = options?.runtimeOverride ?? createInstrumentedPiRuntime(
    piRuntime,
    { taskType: 'socratic_questioning', workspaceId, recorder: recordAgentUsage },
  );
  const result = await runtime.completeStructured<{ questions: SocraticQuestion[] }>({
    task: 'socratic_questioning',
    prompt,
    schema: socraticQuestioningSchema as TSchema,
  });

  const questions = (result.output.questions ?? []).slice(0, SOCRATIC_QUESTION_MAX_COUNT);
  if (questions.length < SOCRATIC_QUESTION_MIN_COUNT) {
    throw new KnowledgeCoreError('苏格拉底追问生成失败：问题数量不足。', 500);
  }

  const generatedAt = now();
  const questioningResult: SocraticQuestioningResult = {
    workspaceId,
    questions,
    triggerContext: {
      trigger,
      cardId,
      tensionKey,
    },
    generatedAt,
  };

  repository.insertAttentionSignal({
    id: id('att'),
    workspaceId,
    signalType: SOCRATIC_ATTENTION_SIGNAL_TYPE as AttentionSignalType,
    signalStrength: SOCRATIC_ATTENTION_SIGNAL_STRENGTH as AttentionSignalStrength,
    targetType: SOCRATIC_ATTENTION_TARGET_TYPE as AttentionSignalTargetType,
    targetId: workspaceId,
    contextData: {
      trigger,
      cardId,
      tensionKey,
      questionCount: questions.length,
      questionTypes: questions.map((q) => q.type),
    },
    consumed: false,
    createdAt: generatedAt,
  });

  logAgentAction('socratic_questioning', {
    workspaceId,
    input: { trigger, cardId, tensionKey },
    output: { questionCount: questions.length, questionTypes: questions.map((q) => q.type) },
    durationMs: Date.now() - startTime,
  });

  return questioningResult;
}

/**
 * 构建苏格拉底追问 prompt。
 *
 * 根据触发来源选择不同的 prompt 模板，并注入卡片摘要作为上下文。
 * prompt 中明确指示"只提问，不提供答案"，遵循不代写铁律。
 *
 * 可选 negativeExamples 用于注入历史被拒绝提议的特征（evidence 飞轮），
 * 让 Agent 不再产生类似 rejected 的提问。
 *
 * @author fxbin
 * @param {string} kbTitle - 知识库标题
 * @param {KnowledgeCard[]} cards - 知识库卡片
 * @param {SocraticTrigger} trigger - 触发来源
 * @param {string} [cardId] - 目标卡片 ID
 * @param {string} [tensionKey] - 张力组 key
 * @param {string} [negativeExamples] - 历史被拒绝提议特征文本段
 * @returns {string} 完整 prompt
 */
export function buildSocraticPrompt(
  kbTitle: string,
  cards: KnowledgeCard[],
  trigger: SocraticTrigger,
  cardId?: string,
  tensionKey?: string,
  negativeExamples?: string,
): string {
  let triggerSection: string;
  if (trigger === SOCRATIC_TRIGGER_SKELETON) {
    const targetCard = cardId ? cards.find((c) => c.id === cardId) : undefined;
    const targetCards = targetCard ? [targetCard] : cards.filter((c) => c.claimStatus === 'ai_skeleton');
    const digest = targetCards.slice(0, SOCRATIC_CARD_DIGEST_LIMIT).map((c) => `- ${c.title}：${c.body.slice(0, 80)}`).join('\n');
    triggerSection = SOCRATIC_PROMPT_SKELETON_TEMPLATE.replace('{title}', kbTitle) + `\n\n骨架卡摘要：\n${digest || '（暂无骨架卡）'}`;
  } else if (trigger === SOCRATIC_TRIGGER_TENSION) {
    const tensionPair = parseTensionKey(tensionKey);
    const pairText = tensionPair ? `「${tensionPair[0]}」与「${tensionPair[1]}」` : '未知张力对';
    triggerSection = SOCRATIC_PROMPT_TENSION_TEMPLATE.replace('{title}', kbTitle).replace('{a}', tensionPair ? tensionPair[0] : '').replace('{b}', tensionPair ? tensionPair[1] : '') + `\n\n张力关键词：${pairText}`;
  } else {
    const digest = cards.slice(0, SOCRATIC_CARD_DIGEST_LIMIT).map((c) => `- ${c.title}：${c.body.slice(0, 80)}`).join('\n');
    triggerSection = SOCRATIC_PROMPT_MANUAL_TEMPLATE.replace('{title}', kbTitle) + `\n\n核心卡片摘要：\n${digest}`;
  }

  const sections = [
    SOCRATIC_PROMPT_HEADER,
    SOCRATIC_PROMPT_RULES,
    '',
    triggerSection,
  ];
  if (negativeExamples && negativeExamples.length > 0) {
    sections.push('', negativeExamples);
  }
  return sections.join('\n');
}

/**
 * 解析张力组 key，提取对立关键词对。
 *
 * 张力 key 格式：tension:{keywordA}-vs-:{keywordB}:{workspaceId}
 *
 * @author fxbin
 * @param {string} [tensionKey] - 张力组 key
 * @returns {[string, string] | undefined} 关键词对，解析失败返回 undefined
 */
export function parseTensionKey(tensionKey?: string): [string, string] | undefined {
  if (!tensionKey) return undefined;
  if (!tensionKey.startsWith(TENSION_KEY_PREFIX)) return undefined;
  const withoutPrefix = tensionKey.slice(TENSION_KEY_PREFIX.length);
  const parts = withoutPrefix.split(TENSION_KEY_SEPARATOR);
  if (parts.length < 2) return undefined;
  const keywordA = parts[0];
  const rest = parts.slice(1).join(TENSION_KEY_SEPARATOR);
  const lastColonIndex = rest.lastIndexOf(':');
  if (lastColonIndex === -1) return undefined;
  const keywordB = rest.slice(0, lastColonIndex);
  return [keywordA, keywordB];
}

/**
 * 生成"可能相关"建议（P10-4）。
 *
 * 基于 Recall Agent 检索结果，为用户推荐可能相关的卡片。
 * 建议展示在侧边栏，用户可忽略或否决，仅影响前端展示，不持久化。
 *
 * 检索策略：
 *  - 若提供 currentCardId，使用 recallTopicExploration 检索知识地图邻居
 *  - 同时使用 recallShallow 基于当前卡片标题进行关键词检索
 *  - 合并去重，按 relevanceScore 降序排序
 *  - 返回前 5 个建议
 *
 * 设计原则：
 *  - 镜子不保姆：只提供检索建议，不替代用户决策
 *  - 提议权不写入权：建议不自动修改任何数据
 *
 * @author fxbin
 * @param {string} workspaceId - 知识库 ID
 * @param {string} [currentCardId] - 当前查看的卡片 ID，用作检索种子
 * @returns {RelatedSuggestionsResult} 建议结果
 */
export function generateRelatedSuggestions(
  workspaceId: string,
  currentCardId?: string,
): RelatedSuggestionsResult {
  const base = repository.findWorkspace(workspaceId);
  if (!base) {
    throw new KnowledgeCoreError(`Knowledge base ${workspaceId} not found.`, 404);
  }

  const suggestions: RelatedSuggestion[] = [];
  const seenCardIds = new Set<string>();

  if (currentCardId) {
    const seedCard = repository.findCard(currentCardId);
    if (seedCard && seedCard.workspaceId === workspaceId) {
      const topicResult = recallTopicExploration(workspaceId, currentCardId, RELATED_SUGGESTION_LIMIT);
      for (const item of topicResult.items) {
        if (item.kind !== 'card') continue;
        if (item.id === currentCardId) continue;
        if (seenCardIds.has(item.id)) continue;
        if (item.relevanceScore < RELATED_SUGGESTION_MIN_SCORE) continue;
        seenCardIds.add(item.id);
        suggestions.push({
          cardId: item.id,
          title: item.title,
          relevanceScore: item.relevanceScore,
          recalledBy: item.recalledBy,
          reason: RELATED_SUGGESTION_REASON_TOPIC,
        });
      }

      const shallowResult = recallShallow(workspaceId, seedCard.title, RELATED_SUGGESTION_LIMIT);
      for (const item of shallowResult.items) {
        if (item.kind !== 'card') continue;
        if (item.id === currentCardId) continue;
        if (seenCardIds.has(item.id)) continue;
        if (item.relevanceScore < RELATED_SUGGESTION_MIN_SCORE) continue;
        seenCardIds.add(item.id);
        suggestions.push({
          cardId: item.id,
          title: item.title,
          relevanceScore: item.relevanceScore,
          recalledBy: item.recalledBy,
          reason: RELATED_SUGGESTION_REASON_SHALLOW,
        });
      }
    }
  } else {
    const directResult = recallDirectFetch(workspaceId, base.title, RELATED_SUGGESTION_LIMIT);
    for (const item of directResult.items) {
      if (item.kind !== 'card') continue;
      if (seenCardIds.has(item.id)) continue;
      if (item.relevanceScore < RELATED_SUGGESTION_MIN_SCORE) continue;
      seenCardIds.add(item.id);
      suggestions.push({
        cardId: item.id,
        title: item.title,
        relevanceScore: item.relevanceScore,
        recalledBy: item.recalledBy,
        reason: RELATED_SUGGESTION_REASON_DIRECT,
      });
    }
  }

  suggestions.sort((a, b) => b.relevanceScore - a.relevanceScore);
  const limited = suggestions.slice(0, RELATED_SUGGESTION_LIMIT);

  return {
    workspaceId,
    currentCardId,
    suggestions: limited,
    generatedAt: now(),
  };
}

export function getWorkspacePath(id: string): WorkspacePath | undefined {
  const base = repository.findWorkspace(id);
  if (!base) return undefined;

  const cards = repository.listCards(id).slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const steps: PathStep[] = [];
  let firstIncompleteIndex = -1;

  for (let i = 0; i < cards.length; i += 1) {
    const card = cards[i];
    const isCompleted = card.claimStatus === 'sourced' || card.claimStatus === 'user_confirmed';
    if (!isCompleted && firstIncompleteIndex === -1) {
      firstIncompleteIndex = i;
    }
  }

  for (let i = 0; i < cards.length; i += 1) {
    const card = cards[i];
    const isCompleted = card.claimStatus === 'sourced' || card.claimStatus === 'user_confirmed';
    let status: PathStep['status'];
    if (isCompleted) {
      status = 'completed';
    } else if (i === firstIncompleteIndex) {
      status = 'current';
    } else {
      status = 'locked';
    }

    steps.push({
      id: `step_${card.id}`,
      order: i + 1,
      title: card.title,
      description: card.body.slice(0, 120),
      cardId: card.id,
      status,
      type: card.type,
    });
  }

  const completedCount = steps.filter((step) => step.status === 'completed').length;
  const currentStepIndex = steps.findIndex((step) => step.status === 'current');

  return {
    workspaceId: id,
    workspaceTitle: base.title,
    generatedAt: now(),
    steps,
    currentStepIndex: currentStepIndex === -1 ? steps.length : currentStepIndex,
    completedCount,
  };
}

export { WeReadError };
export type {
  WeReadShelf,
  WeReadShelfArchive,
  WeReadShelfBook,
  WeReadImportResult,
  WeReadBookMetaRow,
  WeReadSyncStateRow,
  WeReadStatsResponse,
  WeReadCategorySlice,
  WeReadYearTrend,
  WeReadMonthlyActivity,
  WeReadRecentBook,
  WeReadPreviewNote,
  WeReadPreviewResult,
  WeReadRecommendation,
  WeReadRecommendResult,
  WeReadSignalsRefreshResult,
};

/**
 * 获取微信读书配置状态。
 *
 * @returns 是否已配置 API Key
 */
export function getWeReadSettings(): { configured: boolean } {
  return { configured: Boolean(repository.readWeReadApiKey()) };
}

/**
 * 保存微信读书 API Key。
 *
 * @param apiKey - 微信读书 API Key
 */
export function saveWeReadSettings(apiKey: string): void {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    throw new KnowledgeCoreError('API Key 不能为空', 400);
  }
  repository.writeWeReadApiKey(trimmed);
}

/**
 * 删除微信读书 API Key 配置。
 */
export function deleteWeReadSettings(): void {
  repository.deleteWeReadApiKey();
}

/**
 * 获取数据账本（NS-4 用户数据四权）。
 *
 * 库中无记录时写入默认值并返回，保证调用方始终拿到完整账本。
 *
 * @returns {DataAccountBook}
 */
export function getDataAccountBook(): DataAccountBook {
  const existing = repository.readDataAccountBook();
  if (existing) return existing;
  const fresh = createDefaultDataAccount(now());
  repository.writeDataAccountBook(fresh);
  return fresh;
}

/**
 * 切换全局极简模式（NS-4 / NS-7）。
 *
 * 调用 setMinimalMode 纯函数生成新账本后持久化。
 * 开启时所有原始维度 tier 置 disabled，关闭时恢复 private_only。
 * 极简模式下派生统计的处置契约由 minimal-set 模块声明，此处只管原始维度层。
 *
 * @param {boolean} enabled 是否启用极简模式
 * @returns {DataAccountBook} 更新后的账本
 */
export function saveMinimalMode(enabled: boolean): DataAccountBook {
  const current = getDataAccountBook();
  const next = setMinimalMode(current, enabled, now());
  repository.writeDataAccountBook(next);
  return next;
}

/**
 * 获取单本书的轻校验覆盖状态（NS-7）。
 *
 * 未记录返回空覆盖（verified=false），不触发持久化。
 *
 * @param {string} bookId 微信读书 bookId
 * @returns {VerificationCoverage}
 */
export function getVerificationCoverage(bookId: string): VerificationCoverage {
  const existing = repository.readVerificationCoverage(bookId);
  if (existing) return existing;
  return buildEmptyCoverage(bookId);
}

/**
 * 保存单本书的轻校验覆盖状态（NS-7）。
 *
 * @param {VerificationCoverage} coverage 覆盖状态
 */
export function saveVerificationCoverage(coverage: VerificationCoverage): void {
  repository.writeVerificationCoverage(coverage);
}

/**
 * 测试微信读书 API Key 是否可用。
 *
 * @returns 测试结果，失败时附带原因
 */
export async function testWeReadConnection(): Promise<{ ok: boolean; error?: string }> {
  const apiKey = repository.readWeReadApiKey();
  if (!apiKey) {
    return { ok: false, error: '未配置微信读书 API Key' };
  }
  try {
    const client = new WeReadClient(apiKey);
    await client.getShelf();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof WeReadError ? error.message : '连接测试失败' };
  }
}

/**
 * 拉取当前用户的微信读书书架。
 *
 * @returns 书架数据（含电子书和有声书）
 * @throws {KnowledgeCoreError} 未配置 API Key 时抛出
 */
export async function getWeReadShelf(): Promise<WeReadShelf> {
  const apiKey = repository.readWeReadApiKey();
  if (!apiKey) {
    throw new KnowledgeCoreError('未配置微信读书 API Key', 400);
  }
  const client = new WeReadClient(apiKey);
  return client.getShelf();
}

/**
 * 导入单本微信读书书籍的笔记与划线为知径 material。
 *
 * @param bookId - 微信读书书籍 ID
 * @param workspaceId - 可选目标知识库 ID，未提供时自动创建/复用默认知识库
 * @returns 导入结果
 */
export async function importWeReadBook(bookId: string, workspaceId?: string): Promise<WeReadImportResult> {
  const apiKey = repository.readWeReadApiKey();
  if (!apiKey) {
    throw new KnowledgeCoreError('未配置微信读书 API Key', 400);
  }

  const client = new WeReadClient(apiKey);
  const [bookInfo, bookmarks, reviews] = await Promise.all([
    client.getBookInfo(bookId),
    client.getBookmarkList(bookId),
    client.getReviewList(bookId),
  ]);

  const contentText = buildWeReadMaterialMarkdown(bookInfo, bookmarks, reviews);
  const base = (workspaceId ? repository.findWorkspace(workspaceId) : undefined) ?? upsertDefaultWorkspace(bookInfo.title);

  const metaRow = repository.readWeReadBookMetaList().find((row) => row.bookId === bookId);
  const readerId = metaRow?.bookIdLong ?? bookId;
  const sourceUrl = `https://weread.qq.com/web/reader/${readerId}`;

  const timestamp = now();
  const material: MaterialRecord = {
    id: id('mat'),
    workspaceId: base.id,
    type: 'text',
    rawInput: contentText,
    sourceUrl,
    platform: 'weread',
    title: `《${bookInfo.title}》阅读笔记`,
    contentText,
    mediaUrls: bookInfo.cover ? [bookInfo.cover] : [],
    parseStatus: 'ingested',
    createdAt: timestamp,
    statusTimeline: { capturedAt: timestamp, ingestedAt: timestamp },
  };

  base.sourceCount += 1;
  base.updatedAt = timestamp;
  repository.insertMaterial(material);
  repository.updateWorkspace(base);

  const generation = await generateKnowledge('material_summary', contentText, {
    kind: 'text',
    workspaceId: base.id,
    materialId: material.id,
    hasSourceMaterial: true,
    parseStatus: material.parseStatus,
  });
  const generated = generation.output;

  createCards(base, material, contentText, generated.cards);
  createArtifact(base, material, contentText, generated);
  touchWorkspace(base.id);

  const importedBookmarkCount = bookmarks.updated?.length ?? 0;
  repository.updateWeReadBookMetaImport(bookId, material.id, importedBookmarkCount);

  return {
    materialId: material.id,
    title: material.title,
    contentText,
    bookmarkCount: importedBookmarkCount,
    reviewCount: reviews.reviews?.length ?? 0,
  };
}

export const WEREAD_SYNC_STALE_MS = 10 * 60 * 1000;

/**
 * 同步微信读书书架到本地缓存（SWR 模式 + updateTime 增量短路）。
 *
 * 同步策略（按优先级）：
 * 1. 时间窗节流：非 force 模式下，距上次探活不足 10 分钟则跳过远端请求
 * 2. updateTime 短路：拉取远端 shelf 后，若 shelf.updateTime 与本地一致则跳过全量 upsert
 * 3. 全量 upsert + 软删除：updateTime 变化时对所有书做 upsert，不在 shelf 中的书标记下架
 *
 * 语义拆分：
 * - last_probe_at：最近一次调 getShelf 探活的时间（节流依据）
 * - last_full_sync_at：最近一次真正 upsert 的时间（仅全量同步成功时更新）
 *
 * @param force - true 时强制全量同步，忽略时间窗与 updateTime 短路
 * @returns 同步结果摘要
 * @throws {KnowledgeCoreError} 未配置 API Key 时抛出
 */
export async function syncWeReadShelf(force = false): Promise<{
  synced: boolean;
  totalBooks: number;
  skipped: boolean;
  error: string | null;
}> {
  const apiKey = repository.readWeReadApiKey();
  if (!apiKey) {
    throw new KnowledgeCoreError('未配置微信读书 API Key', 400);
  }

  const existingState = repository.readWeReadSyncState();
  const nowMs = Date.now();

  if (!force && existingState?.lastProbeAt) {
    const lastProbeMs = new Date(existingState.lastProbeAt).getTime();
    if (nowMs - lastProbeMs < WEREAD_SYNC_STALE_MS) {
      return {
        synced: false,
        totalBooks: existingState.totalBooks,
        skipped: true,
        error: null,
      };
    }
  }

  const client = new WeReadClient(apiKey);

  try {
    const shelf = await client.getShelf();

    const remoteUpdateTime = shelf.updateTime ?? null;
    const localUpdateTime = existingState?.shelfUpdateTime ?? null;

    if (
      !force &&
      remoteUpdateTime !== null &&
      localUpdateTime !== null &&
      remoteUpdateTime === localUpdateTime
    ) {
      repository.writeWeReadSyncState({
        shelfUpdateTime: localUpdateTime,
        totalBooks: existingState?.totalBooks ?? shelf.books?.length ?? 0,
        lastFullSyncAt: existingState?.lastFullSyncAt ?? null,
        lastProbeAt: now(),
        lastSyncError: null,
      });
      return {
        synced: false,
        totalBooks: existingState?.totalBooks ?? shelf.books?.length ?? 0,
        skipped: true,
        error: null,
      };
    }

    const archiveYearMap = new Map<string, string>();
    for (const archive of shelf.archive ?? []) {
      for (const bookId of archive.bookIds ?? []) {
        archiveYearMap.set(bookId, archive.name);
      }
    }

    repository.syncWeReadBookMeta(shelf.books ?? [], archiveYearMap);

    const totalBooks = shelf.books?.length ?? 0;
    repository.writeWeReadSyncState({
      shelfUpdateTime: remoteUpdateTime,
      totalBooks,
      lastFullSyncAt: now(),
      lastProbeAt: now(),
      lastSyncError: null,
    });

    return { synced: true, totalBooks, skipped: false, error: null };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    repository.writeWeReadSyncState({
      shelfUpdateTime: existingState?.shelfUpdateTime ?? null,
      totalBooks: existingState?.totalBooks ?? 0,
      lastFullSyncAt: existingState?.lastFullSyncAt ?? null,
      lastProbeAt: existingState?.lastProbeAt ?? now(),
      lastSyncError: errorMsg,
    });
    throw error;
  }
}

/**
 * 读取本地缓存的书架元数据列表（不触发远端同步）。
 *
 * @returns 本地缓存的书架书籍列表
 */
export function readWeReadBookMetaList(): WeReadBookMetaRow[] {
  return repository.readWeReadBookMetaList();
}

export function readAllWeReadBookMetaList(): WeReadBookMetaRow[] {
  return repository.readAllWeReadBookMetaList();
}

/**
 * 读取本地缓存的同步状态。
 *
 * @returns 同步状态，未同步过返回 null
 */
export function readWeReadSyncState(): WeReadSyncStateRow | null {
  return repository.readWeReadSyncState();
}

/**
 * 计算微信读书统计数据（基于本地缓存，不触发远端请求）。
 *
 * @returns 统计结果
 */
export function computeWeReadStats(): WeReadStatsResponse {
  return repository.computeWeReadStats();
}

export const RECOMMEND_KEYWORD_MAP: { keys: string[]; theme: string }[] = [
  { keys: ['经济', '理财', '投资', '商业', '创业', '管理', '金融'], theme: 'concept' },
  { keys: ['计算机', '编程', '互联网', '科技', '自然科学', '工程', '医学', '数学'], theme: 'method' },
  { keys: ['心理', '社科', '哲学', '教育', '社会', '政治', '法学', '宗教'], theme: 'fact' },
  { keys: ['文学', '小说', '散文', '传记', '艺术', '历史', '诗歌', '漫画'], theme: 'question' },
];

export const RECOMMEND_MAX_RESULTS = 10;
export const RECOMMEND_COVERAGE_WEIGHT = 3;
export const RECOMMEND_DEPTH_WEIGHT = 2;
export const RECOMMEND_CARD_LINKED_WEIGHT = 1;
export const RECOMMEND_SEED_BOOST_WEIGHT = 5;

export function resolveThemeByCategory(category: string | null): string {
  if (!category) return 'general';
  for (const rule of RECOMMEND_KEYWORD_MAP) {
    if (rule.keys.some((k) => category.includes(k))) {
      return rule.theme;
    }
  }
  return 'general';
}

/**
 * 计算微信读书书籍推荐列表。
 * 基于三种策略：覆盖缺口（知识库缺少的主题）、深度推荐（同主题进阶）、卡片关联（已导入笔记的同主题书）。
 * @param workspaceId - 当前知识库 ID，用于计算覆盖缺口
 * @param bucket - 推荐实验桶（NS-5）。control 为现有逻辑，treatment 为 Q1∪Q3 种子优先加权
 * @returns 推荐结果，包含推荐书籍列表和覆盖缺口分析
 */
export function computeWeReadRecommendations(
  workspaceId?: string,
  bucket: RecommendationBucket = 'control',
): WeReadRecommendResult {
  const books = repository.readWeReadBookMetaList().filter((b) => b.presentOnShelf === 1);
  const unimportedBooks = books.filter((b) => !b.materialId);
  const importedBooks = books.filter((b) => b.materialId);

  let seedBookIds: Set<string> | null = null;
  if (bucket === 'treatment') {
    const seedInputs = buildQuadrantInputsFromMeta(repository.readAllWeReadBookMetaList());
    const seedQuadrant = computeQuadrantSummary(seedInputs);
    seedBookIds = new Set(seedQuadrant.recommendationSeeds);
  }

  let kbCards: { type: string }[] = [];
  if (workspaceId) {
    const detail = repository.findWorkspace(workspaceId);
    if (detail) {
      kbCards = repository.listCards(workspaceId);
    }
  }

  const kbThemeCount = new Map<string, number>();
  for (const card of kbCards) {
    const theme = card.type;
    kbThemeCount.set(theme, (kbThemeCount.get(theme) ?? 0) + 1);
  }

  const shelfThemeCount = new Map<string, number>();
  for (const book of books) {
    const theme = resolveThemeByCategory(book.category);
    shelfThemeCount.set(theme, (shelfThemeCount.get(theme) ?? 0) + 1);
  }

  const coverageGaps: { theme: string; kbCount: number; shelfCount: number }[] = [];
  for (const [theme, shelfCount] of shelfThemeCount.entries()) {
    const kbCount = kbThemeCount.get(theme) ?? 0;
    if (kbCount < shelfCount) {
      coverageGaps.push({ theme, kbCount, shelfCount });
    }
  }
  coverageGaps.sort((a, b) => (b.shelfCount - b.kbCount) - (a.shelfCount - a.kbCount));

  const recommendations: WeReadRecommendation[] = [];
  const seenBookIds = new Set<string>();

  for (const gap of coverageGaps.slice(0, 3)) {
    const candidates = unimportedBooks
      .filter((b) => resolveThemeByCategory(b.category) === gap.theme)
      .sort((a, b) => (b.readUpdateTime ?? 0) - (a.readUpdateTime ?? 0))
      .slice(0, 2);
    for (const book of candidates) {
      if (seenBookIds.has(book.bookId)) continue;
      seenBookIds.add(book.bookId);
      recommendations.push({
        bookId: book.bookId,
        title: book.title,
        author: book.author,
        cover: book.cover,
        category: book.category,
        finishReading: book.finishReading,
        readUpdateTime: book.readUpdateTime,
        bookmarkCount: book.bookmarkCount,
        reason: 'coverage_gap',
        reasonText: `知识库在${gap.theme}主题下有 ${gap.kbCount} 张卡片，书架有 ${gap.shelfCount} 本，建议补充`,
        theme: gap.theme,
        bookIdLong: book.bookIdLong,
      });
    }
  }

  const importedThemes = new Set<string>();
  for (const book of importedBooks) {
    importedThemes.add(resolveThemeByCategory(book.category));
  }
  for (const theme of importedThemes) {
    const candidates = unimportedBooks
      .filter((b) => resolveThemeByCategory(b.category) === theme && b.finishReading === 0)
      .sort((a, b) => (b.bookmarkCount ?? 0) - (a.bookmarkCount ?? 0))
      .slice(0, 1);
    for (const book of candidates) {
      if (seenBookIds.has(book.bookId)) continue;
      seenBookIds.add(book.bookId);
      recommendations.push({
        bookId: book.bookId,
        title: book.title,
        author: book.author,
        cover: book.cover,
        category: book.category,
        finishReading: book.finishReading,
        readUpdateTime: book.readUpdateTime,
        bookmarkCount: book.bookmarkCount,
        reason: 'depth',
        reasonText: `你已导入同主题书籍笔记，推荐继续深入阅读`,
        theme,
        bookIdLong: book.bookIdLong,
      });
    }
  }

  for (const book of importedBooks.slice(0, 3)) {
    const theme = resolveThemeByCategory(book.category);
    const candidates = unimportedBooks
      .filter((b) => resolveThemeByCategory(b.category) === theme)
      .sort((a, b) => (b.readUpdateTime ?? 0) - (a.readUpdateTime ?? 0))
      .slice(0, 1);
    for (const candidate of candidates) {
      if (seenBookIds.has(candidate.bookId)) continue;
      seenBookIds.add(candidate.bookId);
      recommendations.push({
        bookId: candidate.bookId,
        title: candidate.title,
        author: candidate.author,
        cover: candidate.cover,
        category: candidate.category,
        finishReading: candidate.finishReading,
        readUpdateTime: candidate.readUpdateTime,
        bookmarkCount: candidate.bookmarkCount,
        reason: 'card_linked',
        reasonText: `与已导入的《${book.title}》同属${theme}主题，可补充知识体系`,
        theme,
        bookIdLong: candidate.bookIdLong,
      });
    }
  }

  const sorted = recommendations.sort((a, b) => {
    const baseWeightA = a.reason === 'coverage_gap' ? RECOMMEND_COVERAGE_WEIGHT
      : a.reason === 'depth' ? RECOMMEND_DEPTH_WEIGHT
      : RECOMMEND_CARD_LINKED_WEIGHT;
    const baseWeightB = b.reason === 'coverage_gap' ? RECOMMEND_COVERAGE_WEIGHT
      : b.reason === 'depth' ? RECOMMEND_DEPTH_WEIGHT
      : RECOMMEND_CARD_LINKED_WEIGHT;
    const seedBoostA = bucket === 'treatment' && seedBookIds?.has(a.bookId) ? RECOMMEND_SEED_BOOST_WEIGHT : 0;
    const seedBoostB = bucket === 'treatment' && seedBookIds?.has(b.bookId) ? RECOMMEND_SEED_BOOST_WEIGHT : 0;
    return (baseWeightB + seedBoostB) - (baseWeightA + seedBoostA);
  });

  return {
    recommendations: sorted.slice(0, RECOMMEND_MAX_RESULTS),
    total: sorted.length,
    coverageGaps,
  };
}

/**
 * 预览单本书的笔记与划线（不导入）。
 *
 * @param bookId - 微信读书书籍 ID
 * @returns 结构化笔记列表，供前端勾选
 * @throws {KnowledgeCoreError} 未配置 API Key 时抛出
 */
export async function previewWeReadBook(bookId: string): Promise<WeReadPreviewResult> {
  const apiKey = repository.readWeReadApiKey();
  if (!apiKey) {
    throw new KnowledgeCoreError('未配置微信读书 API Key', 400);
  }

  const client = new WeReadClient(apiKey);
  const [bookInfo, bookmarks, reviews] = await Promise.all([
    client.getBookInfo(bookId),
    client.getBookmarkList(bookId),
    client.getReviewList(bookId),
  ]);

  const chapterMap = new Map<number, string>();
  for (const chapter of bookmarks.chapters ?? []) {
    chapterMap.set(chapter.chapterUid, chapter.title);
  }

  const notes: WeReadPreviewNote[] = [];

  for (const bookmark of bookmarks.updated ?? []) {
    notes.push({
      type: 'bookmark',
      noteId: bookmark.bookmarkId,
      chapterUid: bookmark.chapterUid,
      chapterTitle: chapterMap.get(bookmark.chapterUid) ?? '未知章节',
      content: bookmark.markText,
      createTime: bookmark.createTime,
      range: bookmark.range,
    });
  }

  for (const review of reviews.reviews ?? []) {
    notes.push({
      type: 'review',
      noteId: review.review.reviewId,
      chapterUid: 0,
      chapterTitle: review.review.chapterName ?? '我的想法',
      content: review.review.content,
      createTime: review.review.createTime,
    });
  }

  notes.sort((a, b) => a.createTime - b.createTime);

  return {
    bookId,
    title: bookInfo.title,
    author: bookInfo.author,
    cover: bookInfo.cover ?? null,
    category: bookInfo.category ?? null,
    chapters: bookmarks.chapters ?? [],
    notes,
    bookmarkCount: bookmarks.updated?.length ?? 0,
    reviewCount: reviews.reviews?.length ?? 0,
  };
}

/**
 * 批量刷新书架书籍的阅读信号（划线数/笔记数/章节数/长评数）。
 *
 * 作为四象限等派生统计的真实信号数据源。采用分批并发限流避免冲击微信读书网关，
 * 单本失败不中断整体刷新，返回明细供前端展示进度与错误。
 *
 * 数据指纹优化：每本书计算 signals_hash，与本地相同时跳过写入，
 * 避免无变化时的无谓 DB UPDATE。
 *
 * @author fxbin
 * @param bookIds - 待刷新的书籍 ID 列表
 * @param concurrency - 并发数上限，默认 5
 * @returns 同步结果统计（total/synced/unchanged/failed）与失败明细列表
 */
export async function refreshWeReadBookSignals(
  bookIds: string[],
  concurrency = SIGNALS_REFRESH_DEFAULT_CONCURRENCY,
): Promise<WeReadSignalsRefreshResult> {
  const apiKey = repository.readWeReadApiKey();
  if (!apiKey) {
    throw new KnowledgeCoreError('未配置微信读书 API Key', 400);
  }

  const client = new WeReadClient(apiKey);
  const total = bookIds.length;
  const failures: Array<{ bookId: string; reason: string }> = [];
  let synced = 0;
  let unchanged = 0;
  const nowIso = new Date().toISOString();

  for (let i = 0; i < bookIds.length; i += concurrency) {
    const batch = bookIds.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      batch.map(async (bookId) => {
        const [bookmarks, reviews] = await Promise.all([
          client.getBookmarkList(bookId),
          client.getReviewList(bookId),
        ]);
        const bookmarkCount = bookmarks.updated?.length ?? 0;
        const chapterCount = bookmarks.chapters?.length ?? 0;
        const reviewList = reviews.reviews ?? [];
        const reviewCount = reviewList.length;
        const longReviewCount = reviewList.filter(
          (entry) => (entry.review?.content?.length ?? 0) >= LONG_REVIEW_CHAR_THRESHOLD,
        ).length;
        const signalsHash = computeWeReadSignalsHash({
          bookmarkCount,
          reviewCount,
          chapterCount,
          longReviewCount,
        });

        const written = repository.updateWeReadBookMetaSignals({
          bookId,
          bookmarkCount,
          reviewCount,
          chapterCount,
          longReviewCount,
          signalsSyncedAt: nowIso,
          signalsHash,
        });

        return written;
      }),
    );

    for (let j = 0; j < results.length; j += 1) {
      const result = results[j];
      if (result.status === 'fulfilled') {
        if (result.value) {
          synced += 1;
        } else {
          unchanged += 1;
        }
      } else {
        const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
        failures.push({ bookId: batch[j], reason });
      }
    }
  }

  return {
    total,
    synced,
    unchanged,
    failed: failures.length,
    failures,
  };
}

/**
 * 笔记字数估算系数：每条原创笔记按平均字数折算为 noteCharCount。
 */
export const NOTE_CHARS_PER_REVIEW = 80;

/**
 * 计算微信读书 signals 指纹哈希。
 *
 * 输入四个 signals 维度，输出稳定字符串指纹。
 * 用于 refreshWeReadBookSignals 跳过无变化的写入，避免无谓 DB 操作。
 *
 * @author fxbin
 */
export function computeWeReadSignalsHash(input: {
  bookmarkCount: number;
  reviewCount: number;
  chapterCount: number;
  longReviewCount: number;
}): string {
  return `b${input.bookmarkCount}|r${input.reviewCount}|c${input.chapterCount}|l${input.longReviewCount}`;
}

/**
 * 数据可携导出内容预览的截取长度。
 */
export const PORTABILITY_PREVIEW_LENGTH = 200;

/**
 * 数据可携记录随机后缀长度。
 */
export const PORTABILITY_RANDOM_SUFFIX_LENGTH = 6;

/**
 * ISO 日期（YYYY-MM-DD）固定字符长度。
 */
export const ISO_DATE_LENGTH = 10;

/**
 * 章节数下限，用于规避除零与空章节。
 */
export const MIN_CHAPTER_COUNT = 1;

/**
 * 构造隐性真兴趣状态的默认值（NS-8）。首次访问或状态缺失时使用。
 */
export function createDefaultHiddenInterestState(now: number): HiddenInterestState {
  return {
    permanentlyDismissed: false,
    lastShownAt: 0,
    dismissedBookIds: [],
    updatedAt: now,
  };
}

/**
 * 计算微信读书书籍的划线总数，用于受众档位判定（NS-8）。
 */
export function sumBookmarkCounts(rows: WeReadBookMetaRow[]): number {
  return rows.reduce((sum, row) => sum + (row.bookmarkCount ?? 0), 0);
}

/**
 * 从微信读书 meta 列表构造四象限输入（NS-8）。
 *
 * 数据完整度门禁：只参与已刷新过 signals 的书（signals_synced_at 非空）。
 * 未刷新 signals 的书所有 signals 字段为 null，用 0 兜底会污染四象限分类，
 * 因此直接过滤，避免「未刷新=零笔记=掉进 Q4」的稀疏陷阱。
 */
export function buildQuadrantInputsFromMeta(rows: WeReadBookMetaRow[]): BookSignalInputs[] {
  return rows
    .filter((row) => row.signalsSyncedAt != null)
    .map((row) => ({
      bookId: row.bookId,
      title: row.title,
      onShelf: row.presentOnShelf === 1,
      finishReading: row.finishReading === 1,
      hasReadActivity: row.readUpdateTime != null,
      highlightCount: row.bookmarkCount ?? 0,
      noteCharCount: (row.reviewCount ?? 0) * NOTE_CHARS_PER_REVIEW,
      chapterCount: Math.max(MIN_CHAPTER_COUNT, row.chapterCount ?? MIN_CHAPTER_COUNT),
      hasLongReview: (row.longReviewCount ?? 0) > 0,
    }));
}

/**
 * 读取数据账本条目（NS-8）。账本未初始化时返回空数组。
 */
export function listDataAccountEntries(): DataAccountEntry[] {
  return repository.readDataAccountBook()?.entries ?? [];
}

/**
 * 收集全部派生指标 key（NS-8）。来源为降级矩阵登记表。
 */
export function collectDerivedMetricKeys(): string[] {
  return DEGRADE_MATRIX_REGISTRY.map((entry) => entry.key);
}

/**
 * 计算微信读书全量书架的四象限汇总（NS-8）。
 *
 * 统一数据源：使用 readAllWeReadBookMetaList（含下架书）+ buildQuadrantInputsFromMeta
 * （已过滤未刷新 signals 的书），保证展示层与推荐种子、隐性真兴趣 hint 用同一份数据。
 *
 * @returns 四象限汇总
 */
export function computeWeReadQuadrantSummary(): QuadrantSummary {
  const metaRows = repository.readAllWeReadBookMetaList();
  const inputs = buildQuadrantInputsFromMeta(metaRows);
  return computeQuadrantSummary(inputs);
}

export const WEREAD_HIGHLIGHT_LINE_PATTERN = /^>\s+(.+)$/;
export const WEREAD_HIGHLIGHT_DATE_PATTERN = /^>\s+—\s+划线于\s+(\d{4}-\d{2}-\d{2})$/;
export const WEREAD_GLOBAL_TOPIC_BOOK_ID = 'all';

/**
 * 从微信读书 material 的 markdown 文本中提取划线三元组。
 *
 * 解析 buildWeReadMaterialMarkdown 生成的格式：
 *   > 划线文本
 *   > — 划线于 YYYY-MM-DD
 * 连续两行 `>` 开头，第二行含"划线于"日期才算一条有效划线。
 *
 * @param content - material.contentText 或 rawInput
 * @param bookId - 所属 material ID，用于组装 highlight.id
 * @returns 划线三元组数组 { id, text, time }
 * @author fxbin
 */
export function extractWeReadHighlightsFromMarkdown(
  content: string,
  bookId: string,
): Array<{ id: string; text: string; time: number }> {
  if (!content) return [];
  const lines = content.split('\n');
  const highlights: Array<{ id: string; text: string; time: number }> = [];
  for (let i = 0; i < lines.length - 1; i += 1) {
    const textMatch = lines[i].match(WEREAD_HIGHLIGHT_LINE_PATTERN);
    if (!textMatch) continue;
    const text = textMatch[1].trim();
    if (text.startsWith('—') || text.startsWith('划线于')) continue;
    const dateMatch = lines[i + 1].match(WEREAD_HIGHLIGHT_DATE_PATTERN);
    if (!dateMatch) continue;
    const dateStr = dateMatch[1];
    const time = Date.parse(`${dateStr}T00:00:00.000Z`);
    if (!Number.isFinite(time)) continue;
    highlights.push({
      id: `${bookId}-${i}`,
      text,
      time,
    });
  }
  return highlights;
}

export const TOPIC_LABEL_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
export const TOPIC_LABEL_FALLBACK_TTL_MS = 10 * 60 * 1000;
export const TOPIC_LABEL_MAX_SAMPLES = 8;
export const TOPIC_LABEL_MIN_LENGTH = 4;
export const TOPIC_LABEL_MAX_LENGTH = 8;
export const TOPIC_LABEL_CLEAN_MAX_LENGTH = 12;
export const TOPIC_LABEL_INTER_CALL_MS = 1500;
export const TOPIC_LABEL_FALLBACK = '待补充';
export const TOPIC_LABEL_PROMPT_HEADER = '你是一位知识管理助手，擅长从阅读划线中提炼主题。\n\n任务：阅读以下划线样本与代表词，生成一个 4-8 字的纯中文主题标签，概括这组划线的核心主题。\n\n硬约束：\n- 必须是纯中文，禁止任何英文字母、数字、标点\n- 长度 4-8 字\n- 必须是语义完整的短语，表达代表词之间的共同指向，而非代表词本身的罗列\n- 只返回标签本身，不要解释、不要前缀\n\n代表词：';
export const TOPIC_LABEL_PROMPT_SAMPLES = '\n\n划线样本：\n';
export const TOPIC_LABEL_PROMPT_FEW_SHOT = '\n\n示例：\n代表词：投资、复利、时间\n划线样本：\n1. 复利是世界第八大奇迹，时间是投资者的朋友。\n2. 长期持有的关键不是耐心，而是对复利的理解。\n标签：复利时间的力量\n\n代表词：学习、思考、反馈\n划线样本：\n1. 真正的学习需要主动思考，反馈是校正认知偏差的关键。\n2. 没有反馈的思考是空想，没有思考的反馈是噪音。\n标签：主动反馈式学习\n\n代表词：恐惧、未知、勇气\n划线样本：\n1. 恐惧源于未知，勇气不是不害怕，而是带着害怕前行。\n2. 已知带来安全感，未知带来可能性。\n标签：直面未知的勇气\n';
export const TOPIC_LABEL_PROMPT_SUFFIX = '\n\n标签：';
export const TOPIC_LABEL_ENGLISH_REGEX = /[a-zA-Z]/;

export const topicLabelCache = new Map<string, { label: string; expiresAt: number }>();

/**
 * 校验并清洗 LLM 返回的原始标签文本。
 *
 * 三级校验：
 * 1. 格式清洗：去除引号、书名号、换行，截断到 12 字
 * 2. 内容校验：空、含英文字母、含「·」分隔符、长度不在 4-8 字范围均视为不合格
 * 3. 返回清洗后的标签或 null（由调用方决定降级）
 *
 * @param rawText - LLM 原始返回文本
 * @returns 合格的标签字符串，或 null 表示需要降级
 * @author fxbin
 */
export function validateAndCleanTopicLabel(rawText: string): string | null {
  const cleaned = rawText
    .trim()
    .replace(/["""''《》\n\r]/g, '')
    .slice(0, TOPIC_LABEL_CLEAN_MAX_LENGTH);
  if (cleaned.length === 0) return null;
  if (TOPIC_LABEL_ENGLISH_REGEX.test(cleaned)) return null;
  if (cleaned.includes('·')) return null;
  if (cleaned.length < TOPIC_LABEL_MIN_LENGTH || cleaned.length > TOPIC_LABEL_MAX_LENGTH) return null;
  return cleaned;
}

/**
 * 软检测：标签是否偷懒地等于代表词前 N 个的「·」拼接。
 *
 * 只检测带「·」分隔符的拼接，且只检测从第一个代表词开始的连续子集。
 * 无分隔符的短语（如「财富管理本质」）视为 LLM 已做提炼，不算偷懒。
 * 任意中间子集（如跳过第一个词）也不算偷懒，因为 LLM 至少做了选择。
 *
 * 覆盖「财富·管理」「财富·管理·本质」等从首个代表词开始的连续拼接。
 *
 * @param label - 已校验通过的标签
 * @param terms - 该簇的代表词列表
 * @returns true 表示标签是代表词的懒拼接，应触发重试或降级
 * @author fxbin
 */
export function isTopicLabelLazy(label: string, terms: string[]): boolean {
  const maxLen = Math.min(terms.length, 4);
  for (let len = 2; len <= maxLen; len += 1) {
    const prefixWithSeparator = terms.slice(0, len).join('·');
    if (label === prefixWithSeparator) return true;
  }
  return false;
}

/**
 * 调用 LLM 流式生成标签文本，提取「标签：」之后的内容。
 *
 * @param prompt - 完整提示词
 * @returns LLM 原始返回文本（未校验），mock 路径或异常时返回空字符串
 * @author fxbin
 */
export async function callLlmForTopicLabel(prompt: string): Promise<string> {
  let rawText = '';
  let provider = '';
  for await (const chunk of piRuntime.streamText({ prompt })) {
    if (chunk.provider) provider = chunk.provider;
    rawText += chunk.text;
  }
  if (provider === 'mock' || rawText.includes('本地 mock') || rawText.includes('本地mock')) {
    return '';
  }
  return rawText;
}

/**
 * 用 LLM 为单个主题簇生成人类可读的标签。
 *
 * 流程：
 * 1. 内存缓存 → SQLite 缓存 → LLM 调用（三级查询）
 * 2. LLM 输出经校验（英文/「·」/长度）与软检测（代表词懒拼接）
 * 3. 校验失败或软检测命中时，重试一次 LLM
 * 4. 仍失败则降级为「待补充」并写缓存（避免无限重试）
 *
 * 缓存：key 为代表词排序后拼接，TTL 24 小时，同时写内存 Map 与 SQLite 表。
 *
 * @param terms - 该簇的代表词列表
 * @param sampleHighlights - 该簇的划线文本样本
 * @returns LLM 生成的主题标签，或降级文案
 * @author fxbin
 */
export async function generateTopicLabelWithLlm(
  terms: string[],
  sampleHighlights: string[],
): Promise<string> {
  if (sampleHighlights.length === 0 || terms.length === 0) {
    return terms.slice(0, 3).join('·');
  }
  const cacheKey = [...terms].sort().join('|');
  const nowMs = Date.now();
  const memCached = topicLabelCache.get(cacheKey);
  if (memCached && memCached.expiresAt > nowMs) {
    return memCached.label;
  }
  const dbCached = repository.readWeReadTopicLabel(cacheKey);
  if (dbCached && dbCached.expiresAt > nowMs) {
    topicLabelCache.set(cacheKey, dbCached);
    return dbCached.label;
  }
  const prompt =
    TOPIC_LABEL_PROMPT_HEADER +
    terms.join('、') +
    TOPIC_LABEL_PROMPT_SAMPLES +
    sampleHighlights.map((h, i) => `${i + 1}. ${h}`).join('\n') +
    TOPIC_LABEL_PROMPT_FEW_SHOT +
    TOPIC_LABEL_PROMPT_SUFFIX;

  let label: string | null = null;
  try {
    const firstRaw = await callLlmForTopicLabel(prompt);
    label = validateAndCleanTopicLabel(firstRaw);
    if (label && isTopicLabelLazy(label, terms)) {
      label = null;
    }
  } catch {
    label = null;
  }

  if (!label) {
    try {
      const retryRaw = await callLlmForTopicLabel(prompt);
      label = validateAndCleanTopicLabel(retryRaw);
      if (label && isTopicLabelLazy(label, terms)) {
        label = null;
      }
    } catch {
      label = null;
    }
  }

  const expiresAt = nowMs + TOPIC_LABEL_CACHE_TTL_MS;
  if (label) {
    topicLabelCache.set(cacheKey, { label, expiresAt });
    repository.saveWeReadTopicLabel(cacheKey, label, expiresAt);
    return label;
  }
  const fallbackExpiresAt = nowMs + TOPIC_LABEL_FALLBACK_TTL_MS;
  topicLabelCache.set(cacheKey, { label: TOPIC_LABEL_FALLBACK, expiresAt: fallbackExpiresAt });
  return TOPIC_LABEL_FALLBACK;
}

export const GLOBAL_TOPIC_SPECTRUM_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * 计算微信读书已导入笔记的全局主题演变谱。
 *
 * 数据源：materials 表中 platform='weread' 且未归档的记录。
 * 从每条 material.contentText 解析划线三元组，汇总后调 computeTopicSpectrum 做全书架聚合。
 *
 * 覆盖范围：仅包含已导入到知径的书。未导入的书划线只在腾讯 gateway 上，不在本聚合范围内。
 * 语义上已导入的书是用户认可的核心阅读，主题演变最相关。
 *
 * LLM 标签：聚类完成后，对每个簇取若干划线样本调 LLM 生成 4-8 字主题短语，
 * 替换原代表词拼接的 label。失败时降级为代表词拼接。单簇标签结果缓存 24 小时。
 *
 * 整体缓存：完整的 spectrum 结果持久化到 SQLite，TTL 7 天。
 * 未过期时直接返回缓存，避免聚类 + 17 次 LLM 串行调用。
 * force=true 时强制重算并刷新缓存（用户点「刷新主题谱」按钮触发）。
 *
 * @param force - true 表示强制重算并刷新缓存
 * @returns 全局主题演变谱（含 LLM 生成的主题标签）
 * @author fxbin
 */
export async function computeWeReadGlobalTopicSpectrum(force = false) {
  if (!force) {
    const cached = repository.readWeReadGlobalTopicSpectrumCache();
    if (cached && cached.expiresAt > Date.now()) {
      try {
        return JSON.parse(cached.spectrumJson) as TopicSpectrum;
      } catch {
        // 缓存 JSON 损坏，忽略并重算
      }
    }
  }
  const materials = repository.listMaterials().filter(
    (m) => m.platform === 'weread' && typeof m.contentText === 'string' && m.contentText.length > 0,
  );
  const booksRead = materials.length;
  const highlights: Array<{ id: string; text: string; time: number }> = [];
  for (const material of materials) {
    const extracted = extractWeReadHighlightsFromMarkdown(material.contentText ?? '', material.id);
    highlights.push(...extracted);
  }
  const spectrum = computeTopicSpectrum({
    bookId: WEREAD_GLOBAL_TOPIC_BOOK_ID,
    highlights,
    booksRead,
  });
  if (spectrum.clusters.length > 0) {
    const highlightsById = new Map(highlights.map((h) => [h.id, h]));
    for (let i = 0; i < spectrum.clusters.length; i += 1) {
      const cluster = spectrum.clusters[i];
      const samples = (cluster.highlightIds ?? [])
        .map((id) => highlightsById.get(id)?.text)
        .filter((t): t is string => typeof t === 'string' && t.length > 0)
        .slice(0, TOPIC_LABEL_MAX_SAMPLES);
      if (samples.length === 0) continue;
      cluster.label = await generateTopicLabelWithLlm(cluster.representativeTerms, samples);
      if (i < spectrum.clusters.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, TOPIC_LABEL_INTER_CALL_MS));
      }
    }
  }
  repository.saveWeReadGlobalTopicSpectrumCache(
    JSON.stringify(spectrum),
    Date.now() + GLOBAL_TOPIC_SPECTRUM_CACHE_TTL_MS,
  );
  return spectrum;
}

/**
 * 获取隐性真兴趣提示（NS-8）。
 *
 * 从四象限 Q3（隐性真兴趣）数据结合用户持久化状态，决定是否展示提示。
 *
 * @returns 隐性真兴趣提示对象
 */
export function getHiddenInterestHint(): HiddenInterestHint {
  const metaRows = repository.readAllWeReadBookMetaList();
  const inputs = buildQuadrantInputsFromMeta(metaRows);
  const quadrant = computeQuadrantSummary(inputs);
  const now = Date.now();
  const state = repository.readHiddenInterestState() ?? createDefaultHiddenInterestState(now);
  return buildHiddenInterestHint(quadrant, state, now);
}

/**
 * 标记隐性真兴趣提示为永久关闭或重新开启（NS-8）。
 *
 * @param dismissed 是否永久关闭
 */
export function setHiddenInterestPermanentlyDismissed(dismissed: boolean): void {
  const now = Date.now();
  const current = repository.readHiddenInterestState() ?? createDefaultHiddenInterestState(now);
  repository.saveHiddenInterestState(applyPermanentDismissal(current, dismissed, now));
}

/**
 * 忽略单本隐性真兴趣书目（NS-8）。
 *
 * @param bookId 待忽略的书目 ID
 */
export function dismissHiddenInterestBook(bookId: string): void {
  const now = Date.now();
  const current = repository.readHiddenInterestState() ?? createDefaultHiddenInterestState(now);
  repository.saveHiddenInterestState(applyHiddenInterestDismissal(current, bookId, now));
}

/**
 * 标记隐性真兴趣提示已展示（NS-8），更新 lastShownAt。
 */
export function markHiddenInterestHintShown(): void {
  const now = Date.now();
  const current = repository.readHiddenInterestState() ?? createDefaultHiddenInterestState(now);
  repository.saveHiddenInterestState(markHintShown(current, now));
}

/**
 * 导出统计数据画像（NS-8）。
 *
 * 构建数据说明书、序列化为目标格式、落库，并返回导出记录。
 *
 * @param format 目标格式（json 或 markdown）
 * @returns 数据可携导出记录
 */
export function exportDataPortability(format: DataPortabilityFormat): DataPortabilityRecord {
  const metaRows = repository.readWeReadBookMetaList();
  const dataAccountEntries = listDataAccountEntries();
  const derivedMetricKeys = collectDerivedMetricKeys();
  const now = Date.now();
  const manifest = buildDataPortabilityManifest({
    dataAccountEntries,
    derivedMetricKeys,
    bookCount: metaRows.length,
    now,
  });
  const payload = {
    dataAccount: dataAccountEntries,
    bookSignals: metaRows.map((row) => ({
      bookId: row.bookId,
      title: row.title,
      bookmarkCount: row.bookmarkCount,
      reviewCount: row.reviewCount,
      chapterCount: row.chapterCount,
      longReviewCount: row.longReviewCount,
      onShelf: row.presentOnShelf === 1,
    })),
  };
  const content = serializePortability(format, manifest, payload);
  const ext = format === 'json' ? 'json' : 'md';
  const filename = `zhijing-portability-${new Date(now).toISOString().slice(0, ISO_DATE_LENGTH)}.${ext}`;
  const randomSuffix = Math.random().toString(36).slice(2, 2 + PORTABILITY_RANDOM_SUFFIX_LENGTH);
  const record: DataPortabilityRecord = {
    id: `portability-${now}-${randomSuffix}`,
    format,
    manifest,
    filename,
    contentPreview: content.slice(0, PORTABILITY_PREVIEW_LENGTH),
    createdAt: now,
    revokeDeadline: computeRevokeDeadline(now),
    revokedAt: null,
  };
  repository.recordDataPortability(record);
  return record;
}

/**
 * 列出数据可携导出记录（NS-8），按创建时间倒序。
 *
 * @returns 导出记录列表
 */
export function listDataPortabilityRecords(): DataPortabilityRecord[] {
  return repository.listDataPortability();
}

/**
 * 撤回数据可携导出记录（NS-8）。
 *
 * @param id 待撤回记录的 ID
 */
export function revokeDataPortabilityExport(id: string): void {
  repository.revokeDataPortability(id, Date.now());
}

/**
 * 获取当前受众档案（NS-8）。
 *
 * 基于划线信号自动判定档位，并与临时回退状态合并后返回有效档案。
 *
 * @returns 受众档案
 */
export function getReaderModeProfile(): AudienceProfile {
  const metaRows = repository.readWeReadBookMetaList();
  const baseTier = classifyAudienceTier(sumBookmarkCounts(metaRows));
  const now = Date.now();
  const stored = repository.readReaderModeState() ?? buildInitialReaderModeState(baseTier, now);
  const { effectiveTier, nextState } = resolveEffectiveTier(stored, baseTier, now);
  if (nextState !== stored) {
    repository.saveReaderModeState(nextState);
  }
  return buildAudienceProfile(effectiveTier);
}

/**
 * 发起阅读模式临时回退（NS-8）。
 *
 * @param targetTier 回退目标档位
 */
export function startReaderModeRollback(targetTier: AudienceTier): void {
  const metaRows = repository.readWeReadBookMetaList();
  const baseTier = classifyAudienceTier(sumBookmarkCounts(metaRows));
  const now = Date.now();
  const stored = repository.readReaderModeState() ?? buildInitialReaderModeState(baseTier, now);
  const merged = { ...stored, currentTier: baseTier };
  const next = startTempRollback(merged, targetTier, now);
  repository.saveReaderModeState(next);
}

/**
 * 取消阅读模式临时回退（NS-8）。
 */
export function cancelReaderModeRollback(): void {
  const metaRows = repository.readWeReadBookMetaList();
  const baseTier = classifyAudienceTier(sumBookmarkCounts(metaRows));
  const now = Date.now();
  const stored = repository.readReaderModeState() ?? buildInitialReaderModeState(baseTier, now);
  repository.saveReaderModeState(cancelTempRollback(stored, baseTier, now));
}

export async function distribution(connection: Awaited<ReturnType<typeof DuckDBConnection.create>>, table: string, column: string) {
  const reader = await connection.runAndReadAll(`
    SELECT coalesce(nullif(${column}, ''), 'unknown') AS name, count(*)::INTEGER AS count
    FROM ${table}
    GROUP BY 1
    ORDER BY count DESC, name ASC
  `);

  return rows(reader).map((row) => ({
    name: String(row.name),
    count: Number(row.count),
  }));
}

export function rows(reader: { getRowObjectsJson(): Record<string, unknown>[] }) {
  return reader.getRowObjectsJson();
}

export function singleRow(reader: { getRowObjectsJson(): Record<string, unknown>[] }) {
  return rows(reader)[0] ?? {};
}

/**
 * 截断文本作为回忆结果的预览，超长部分以省略号收尾。
 * 与 compactPreview 不同，本函数服务于 Recall 工具链，使用独立的预览长度上限。
 * @author fxbin
 * @param {string} input - 原始文本
 * @returns {string} 清理并截断后的预览文本
 */
export function recallPreview(input: string): string {
  const cleaned = input.replace(/\s+/g, ' ').trim();
  return cleaned.length > RECALL_PREVIEW_MAX_LENGTH
    ? `${cleaned.slice(0, RECALL_PREVIEW_MAX_LENGTH)}...`
    : cleaned;
}

/**
 * 将相关性分数四舍五入到 4 位小数，避免浮点精度噪声。
 * @author fxbin
 * @param {number} score - 原始分数
 * @returns {number} 规整后的分数
 */
export function roundRelevance(score: number): number {
  return Math.round(score * RECALL_RELEVANCE_ROUND_FACTOR) / RECALL_RELEVANCE_ROUND_FACTOR;
}

/**
 * 计算 direct_fetch 工具下标题与查询的精确匹配分数。
 * - 标题与查询完全相等记为精确命中
 * - 标题包含查询或查询包含标题记为包含命中
 * - 其余记为不命中返回 0
 * @author fxbin
 * @param {string} title - 卡片或资料标题
 * @param {string} query - 已 trim 的查询串
 * @returns {number} 相关性分数，未命中返回 0
 */
export function scoreDirectFetch(title: string, query: string): number {
  const normalizedTitle = title.trim();
  if (!normalizedTitle) return 0;
  if (normalizedTitle === query) return RECALL_DIRECT_FETCH_EXACT_SCORE;
  if (normalizedTitle.includes(query) || query.includes(normalizedTitle)) {
    return RECALL_DIRECT_FETCH_CONTAIN_SCORE;
  }
  return 0;
}

/**
 * 调用 pi-runtime 生成查询的语义扩展词，并将扩展词与原查询拼接为增强查询串。
 * 当 pi-runtime 不可用、调用异常或无法解析出有效扩展词时返回空串，由调用方降级。
 * @author fxbin
 * @param {PiRuntime} piRuntime - 结构化输出运行时
 * @param {string} query - 原始查询串
 * @returns {Promise<string>} 拼接后的增强查询串，降级时返回空串
 */
export async function expandQueryWithRuntime(piRuntime: PiRuntime, query: string): Promise<string> {
  try {
    const prompt = RECALL_DEEP_EXPANSION_PROMPT_PREFIX + query + RECALL_DEEP_EXPANSION_PROMPT_SUFFIX;
    let rawText = '';
    for await (const chunk of piRuntime.streamText({ prompt })) {
      rawText += chunk.text;
    }
    const terms = rawText
      .split(/[,\s，、；;]+/)
      .map((term) => term.trim())
      .filter((term) => term.length > 0 && term.length <= RECALL_PREVIEW_MAX_LENGTH && term !== query);
    const unique = [...new Set(terms)].slice(0, RECALL_DEEP_EXPANSION_MAX_TERMS);
    if (unique.length === 0) return '';
    return [query, ...unique].join(' ');
  } catch {
    return '';
  }
}

/**
 * 将一个 RecallResult 的 tool 与所有 items 的 recalledBy 重写为目标工具名。
 * 用于 deep_recall 降级复用 shallow_recall 结果时，保证审计标识一致。
 * @author fxbin
 * @param {RecallResult} result - 原始检索结果
 * @param {RecallToolName} tool - 目标工具名
 * @returns {RecallResult} 重标后的检索结果
 */
export function relabelRecallResult(result: RecallResult, tool: RecallToolName): RecallResult {
  return {
    ...result,
    tool,
    items: result.items.map((item) => ({ ...item, recalledBy: tool })),
  };
}

/**
 * 精确命中回忆工具：遍历知识库内卡片与资料，按标题精确或包含匹配检索。
 * 纯内存操作，零 LLM 成本，适用于查询词与已有标题高度重合的场景。
 * @author fxbin
 * @param {string} workspaceId - 知识库 ID
 * @param {string} query - 查询串
 * @param {number} [limit] - 返回上限，默认 RECALL_DEFAULT_LIMIT
 * @returns {RecallResult} 检索结果，recalledBy 为 direct_fetch
 */
export function recallDirectFetch(workspaceId: string, query: string, limit?: number): RecallResult {
  const trimmedQuery = query.trim();
  const maxItems = limit ?? RECALL_DEFAULT_LIMIT;
  const items: RecallResultItem[] = [];
  if (!trimmedQuery) {
    return { items, tool: RECALL_TOOL_DIRECT_FETCH, query: trimmedQuery, totalFound: 0 };
  }
  for (const card of repository.listCards(workspaceId)) {
    if (items.length >= maxItems) break;
    const score = scoreDirectFetch(card.title, trimmedQuery);
    if (score <= 0) continue;
    items.push({
      kind: 'card',
      id: card.id,
      workspaceId: card.workspaceId,
      title: card.title,
      preview: recallPreview(card.body),
      relevanceScore: score,
      recalledBy: RECALL_TOOL_DIRECT_FETCH,
    });
  }
  for (const material of repository.listMaterials(workspaceId)) {
    if (items.length >= maxItems) break;
    const score = scoreDirectFetch(material.title, trimmedQuery);
    if (score <= 0) continue;
    items.push({
      kind: 'material',
      id: material.id,
      workspaceId: material.workspaceId,
      title: material.title,
      preview: recallPreview(material.contentText ?? material.rawInput),
      relevanceScore: score,
      recalledBy: RECALL_TOOL_DIRECT_FETCH,
    });
  }
  return { items, tool: RECALL_TOOL_DIRECT_FETCH, query: trimmedQuery, totalFound: items.length };
}

/**
 * 浅层回忆工具：复用 searchCardsByRelevance / searchMaterialsByRelevance 进行检索，
 * 并基于内部文本相关性打分归一化为 0-1 区间的 relevanceScore。
 * 零 LLM 成本，查询为空时返回空结果。
 * @author fxbin
 * @param {string} workspaceId - 知识库 ID
 * @param {string} query - 查询串
 * @param {number} [limit] - 返回上限，默认 RECALL_DEFAULT_LIMIT
 * @returns {RecallResult} 检索结果，recalledBy 为 shallow_recall
 */
export function recallShallow(workspaceId: string, query: string, limit?: number): RecallResult {
  const trimmedQuery = query.trim();
  const maxItems = limit ?? RECALL_DEFAULT_LIMIT;
  if (!trimmedQuery) {
    return { items: [], tool: RECALL_TOOL_SHALLOW, query: trimmedQuery, totalFound: 0 };
  }
  const terms = extractSearchTerms(trimmedQuery);
  const cards = repository.searchCardsByRelevance(workspaceId, trimmedQuery, maxItems);
  const materials = repository.searchMaterialsByRelevance(workspaceId, trimmedQuery, maxItems);
  const cardScored = cards.map((card) => ({
    card,
    score: scoreTextRelevance(card.title, card.body, terms),
  }));
  const materialScored = materials.map((material) => ({
    material,
    score: scoreTextRelevance(material.title, material.contentText ?? material.rawInput, terms),
  }));
  const maxScore = Math.max(
    ...cardScored.map((entry) => entry.score),
    ...materialScored.map((entry) => entry.score),
    0,
  );
  const items: RecallResultItem[] = [];
  for (const { card, score } of cardScored) {
    if (items.length >= maxItems) break;
    const relevance = maxScore > 0 ? score / maxScore : 0;
    if (relevance < RECALL_RELEVANCE_THRESHOLD) continue;
    items.push({
      kind: 'card',
      id: card.id,
      workspaceId: card.workspaceId,
      title: card.title,
      preview: recallPreview(card.body),
      relevanceScore: roundRelevance(relevance),
      recalledBy: RECALL_TOOL_SHALLOW,
    });
  }
  for (const { material, score } of materialScored) {
    if (items.length >= maxItems) break;
    const relevance = maxScore > 0 ? score / maxScore : 0;
    if (relevance < RECALL_RELEVANCE_THRESHOLD) continue;
    items.push({
      kind: 'material',
      id: material.id,
      workspaceId: material.workspaceId,
      title: material.title,
      preview: recallPreview(material.contentText ?? material.rawInput),
      relevanceScore: roundRelevance(relevance),
      recalledBy: RECALL_TOOL_SHALLOW,
    });
  }
  const totalFound = cardScored.filter((entry) => entry.score > 0).length
    + materialScored.filter((entry) => entry.score > 0).length;
  return { items, tool: RECALL_TOOL_SHALLOW, query: trimmedQuery, totalFound };
}

/**
 * 深层回忆工具：借助 pi-runtime 生成查询的语义扩展词，再用扩展后的查询执行浅层回忆。
 * 当 piRuntime 未提供、调用异常或无法解析出有效扩展词时，降级为浅层回忆。
 * 注意本函数为 async，调用方需 await。
 * @author fxbin
 * @param {string} workspaceId - 知识库 ID
 * @param {string} query - 查询串
 * @param {number} [limit] - 返回上限，默认 RECALL_DEFAULT_LIMIT
 * @param {PiRuntime} [piRuntime] - 结构化输出运行时，可选
 * @returns {Promise<RecallResult>} 检索结果，recalledBy 为 deep_recall
 */
export async function recallDeep(
  workspaceId: string,
  query: string,
  limit?: number,
  piRuntime?: PiRuntime,
): Promise<RecallResult> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return { items: [], tool: RECALL_TOOL_DEEP, query: trimmedQuery, totalFound: 0 };
  }
  if (!piRuntime) {
    const shallow = recallShallow(workspaceId, trimmedQuery, limit);
    return relabelRecallResult(shallow, RECALL_TOOL_DEEP);
  }
  const instrumentedRuntime = createInstrumentedPiRuntime(piRuntime, {
    taskType: 'recall_deep',
    workspaceId,
    recorder: recordAgentUsage,
  });
  const expandedQuery = await expandQueryWithRuntime(instrumentedRuntime, trimmedQuery);
  if (!expandedQuery) {
    const shallow = recallShallow(workspaceId, trimmedQuery, limit);
    return relabelRecallResult(shallow, RECALL_TOOL_DEEP);
  }
  const shallow = recallShallow(workspaceId, expandedQuery, limit);
  return relabelRecallResult(shallow, RECALL_TOOL_DEEP);
}

/**
 * 主题探索回忆工具：以种子卡片为起点，遍历知识地图邻居节点检索相关卡片。
 * 直接邻居 relevanceScore 为 0.9，二度邻居为 0.6；仅返回 card 类型节点。
 * 适用于用户已聚焦某张卡片、需要扩展其关联上下文的场景。
 * @author fxbin
 * @param {string} workspaceId - 知识库 ID
 * @param {string} seedCardId - 种子卡片 ID
 * @param {number} [limit] - 返回上限，默认 RECALL_DEFAULT_LIMIT
 * @returns {RecallResult} 检索结果，recalledBy 为 topic_exploration
 */
export function recallTopicExploration(workspaceId: string, seedCardId: string, limit?: number): RecallResult {
  const maxItems = limit ?? RECALL_DEFAULT_LIMIT;
  const map = getKnowledgeMap(workspaceId);
  if (!map) {
    return { items: [], tool: RECALL_TOOL_TOPIC_EXPLORATION, query: seedCardId, totalFound: 0 };
  }
  const seedNodeId = KNOWLEDGE_MAP_CARD_NODE_PREFIX + seedCardId;
  const seedExists = map.nodes.some((node) => node.id === seedNodeId);
  if (!seedExists) {
    return { items: [], tool: RECALL_TOOL_TOPIC_EXPLORATION, query: seedCardId, totalFound: 0 };
  }
  const directNeighborIds = new Set<string>();
  for (const edge of map.edges) {
    if (edge.sourceId === seedNodeId) directNeighborIds.add(edge.targetId);
    if (edge.targetId === seedNodeId) directNeighborIds.add(edge.sourceId);
  }
  directNeighborIds.delete(seedNodeId);
  const secondNeighborIds = new Set<string>();
  for (const neighborId of directNeighborIds) {
    for (const edge of map.edges) {
      const otherId = edge.sourceId === neighborId
        ? edge.targetId
        : edge.targetId === neighborId
          ? edge.sourceId
          : null;
      if (otherId && otherId !== seedNodeId && !directNeighborIds.has(otherId)) {
        secondNeighborIds.add(otherId);
      }
    }
  }
  const items: RecallResultItem[] = [];
  const collectCardNeighbor = (nodeId: string, score: number) => {
    if (items.length >= maxItems) return;
    if (!nodeId.startsWith(KNOWLEDGE_MAP_CARD_NODE_PREFIX)) return;
    const cardId = nodeId.slice(KNOWLEDGE_MAP_CARD_NODE_PREFIX.length);
    const card = repository.findCard(cardId);
    if (!card) return;
    items.push({
      kind: 'card',
      id: card.id,
      workspaceId: card.workspaceId,
      title: card.title,
      preview: recallPreview(card.body),
      relevanceScore: score,
      recalledBy: RECALL_TOOL_TOPIC_EXPLORATION,
    });
  };
  for (const neighborId of directNeighborIds) {
    collectCardNeighbor(neighborId, RECALL_TOPIC_DIRECT_NEIGHBOR_SCORE);
  }
  for (const neighborId of secondNeighborIds) {
    collectCardNeighbor(neighborId, RECALL_TOPIC_SECOND_NEIGHBOR_SCORE);
  }
  return { items, tool: RECALL_TOOL_TOPIC_EXPLORATION, query: seedCardId, totalFound: items.length };
}

/**
 * 统一回忆入口：并行调用四个回忆工具，合并去重后返回每个工具的 RecallResult。
 * 跨工具去重策略：同一 id 仅保留 relevanceScore 最高的条目，且只出现在对应工具结果中。
 * 每个 RecallResult 内部 items 按 relevanceScore 降序排序，便于审计追踪各工具贡献。
 * @author fxbin
 * @param {string} workspaceId - 知识库 ID
 * @param {string} query - 查询串
 * @param {{ seedCardId?: string; piRuntime?: PiRuntime; limit?: number }} [options] - 可选参数
 * @returns {Promise<RecallResult[]>} 各工具的检索结果数组
 */
export async function recall(
  workspaceId: string,
  query: string,
  options?: { seedCardId?: string; piRuntime?: PiRuntime; limit?: number },
): Promise<RecallResult[]> {
  const limit = options?.limit ?? RECALL_DEFAULT_LIMIT;
  const [direct, shallow, deep, topic] = await Promise.all([
    Promise.resolve(recallDirectFetch(workspaceId, query, limit)),
    Promise.resolve(recallShallow(workspaceId, query, limit)),
    recallDeep(workspaceId, query, limit, options?.piRuntime),
    options?.seedCardId
      ? Promise.resolve(recallTopicExploration(workspaceId, options.seedCardId, limit))
      : Promise.resolve(null),
  ]);
  const rawResults: RecallResult[] = [direct, shallow, deep];
  if (topic) rawResults.push(topic);
  const allItems = rawResults.flatMap((result) => result.items);
  const bestById = new Map<string, RecallResultItem>();
  for (const item of allItems) {
    const key = `${item.kind}:${item.id}`;
    const existing = bestById.get(key);
    if (!existing || item.relevanceScore > existing.relevanceScore) {
      bestById.set(key, item);
    }
  }
  return rawResults.map((result) => ({
    ...result,
    items: result.items
      .filter((item) => bestById.get(`${item.kind}:${item.id}`) === item)
      .sort((left, right) => right.relevanceScore - left.relevanceScore),
  }));
}

export {
  MarkdownFileAdapter,
  type CardFrontmatter,
  type MaterialFrontmatter,
  type WorkspaceFrontmatter,
} from './markdown-file.js';

export {
  FileSyncAdapter,
  type FileSyncRepository,
  type ExportRepository,
  type ScannedWorkspace,
  type ScanVaultResult,
  type ExportVaultResult,
} from './file-sync-adapter.js';

export {
  aggregateAttentionSignals,
  selectMode,
  evaluateConstraints,
  buildOrchestratorDecisionFromData,
  preInterceptUserMessage,
  preInterceptInStream,
  classifyUserIntent,
  classifyToolResultIntent,
  DEFAULT_EXPERIENCE_CONSTRAINTS,
} from './orchestrator.js';
export type { SuggestionHistory, UserIntent, ToolCallSummary } from './orchestrator.js';

import { buildOrchestratorDecisionFromData as buildDecisionFromData } from './orchestrator.js';
import { preInterceptUserMessage as preIntercept } from './orchestrator.js';
import { preInterceptInStream as preInterceptStream } from './orchestrator.js';
import type { SuggestionHistory } from './orchestrator.js';

/**
 * 主动提议下发行为的 action 标识，用于 agent_action_log 追踪。
 */
export const ACTIVE_SUGGESTION_SENT_ACTION = 'active_suggestion_sent';

/**
 * 查询主动提议历史的最大条数（覆盖每日上限 ×7 天足够）。
 */
export const SUGGESTION_HISTORY_QUERY_LIMIT = 50;

/**
 * 编排 Agent 决策入口的选项。
 */
export interface BuildOrchestratorDecisionOptions {
  /** 用户当前是否正在编辑（前端基于输入框焦点/未发送文本判定） */
  isWriting?: boolean;
}

/**
 * 从 agent_action_log 查询指定工作区的主动提议历史摘要。
 *
 * 查询最近 N 条 active_suggestion_sent 记录，在 JS 层过滤今日计数
 * 并取最近一条时间戳，避免扩展 Repository 接口（KISS 原则）。
 *
 * @param workspaceId - 工作区 ID
 * @param isWriting - 用户当前是否正在编辑
 * @returns 主动提议历史摘要
 * @author fxbin
 */
export function getSuggestionHistory(workspaceId: string, isWriting: boolean): SuggestionHistory {
  const result = listAgentActionLogs({
    workspaceId,
    action: ACTIVE_SUGGESTION_SENT_ACTION,
    limit: SUGGESTION_HISTORY_QUERY_LIMIT,
  });
  const logs = result.logs;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartMs = todayStart.getTime();

  let todayCount = 0;
  for (const entry of logs) {
    const entryMs = new Date(entry.createdAt).getTime();
    if (Number.isFinite(entryMs) && entryMs >= todayStartMs) {
      todayCount += 1;
    }
  }

  const lastSuggestionAt = logs.length > 0 ? logs[0].createdAt : null;

  return { todayCount, lastSuggestionAt, isWriting };
}

/**
 * 记录一次主动提议下发到 agent_action_log。
 *
 * 在 catalyst/navigator 模式实际下发主动提议后调用，
 * 供后续约束引擎评估频率/间隔。
 *
 * @param workspaceId - 工作区 ID
 * @param mode - 当前编排模式
 * @param proposals - 本次下发的活跃提议列表
 * @author fxbin
 */
export function recordSuggestionSent(
  workspaceId: string,
  mode: string,
  proposals: import('@zhijing/shared').AgentProposal[],
): void {
  logAgentAction(ACTIVE_SUGGESTION_SENT_ACTION, {
    workspaceId,
    input: {
      mode,
      proposalCount: proposals.length,
      proposalTypes: proposals.map((item) => item.type),
    },
    durationMs: 0,
  });
}

/**
 * 编排 Agent 决策入口（薄包装）。
 *
 * 从 repository 获取注意力信号和 Agent 提议，
 * 委托 orchestrator.ts 纯逻辑层完成聚合 → 模式选择 → 约束评估的完整链路。
 *
 * P0.3 升级：接收 isWriting 选项，并查询主动提议历史传入约束引擎，
 * 让 evaluateConstraints 能完整评估 5 条体验约束。
 *
 * @param workspaceId - 工作区 ID
 * @param options - 决策选项（isWriting 控制编辑态约束）
 * @returns 编排决策结果
 * @author fxbin
 */
export function buildOrchestratorDecision(
  workspaceId: string,
  options: BuildOrchestratorDecisionOptions = {},
): import('@zhijing/shared').OrchestratorDecision {
  const signals = repository.listAttentionSignals(workspaceId, 20);
  const proposalReport = generateAgentProposals();
  const history = getSuggestionHistory(workspaceId, Boolean(options.isWriting));
  return buildDecisionFromData(signals, proposalReport.proposals, undefined, history);
}

/**
 * 编排 Agent 决策 + 前置拦截器一体化入口（P0.4）。
 *
 * 调用链路：
 * 1. buildOrchestratorDecision 产出基础决策（信号聚合 + 约束评估）
 * 2. preInterceptUserMessage 根据用户消息意图动态调整模式
 *
 * 调用方（api/agent/stream 路由）只需调用本函数即可拿到最终生效的决策，
 * 无需分别调用 buildOrchestratorDecision 和 preInterceptUserMessage。
 *
 * @param workspaceId - 工作区 ID
 * @param message - 用户当前消息文本（用于意图识别）
 * @param options - 决策选项（isWriting 控制编辑态约束）
 * @returns 拦截后的最终编排决策
 * @author fxbin
 */
export function buildInterceptedDecision(
  workspaceId: string,
  message: string,
  options: BuildOrchestratorDecisionOptions = {},
): import('@zhijing/shared').OrchestratorDecision {
  const signals = repository.listAttentionSignals(workspaceId, 20);
  const proposalReport = generateAgentProposals();
  persistGeneratedProposals(repository, workspaceId, proposalReport.proposals);
  const activePersisted = getActiveProposals(repository, workspaceId);
  const proposalsForDecision = activePersisted.length > 0
    ? toAgentProposals(activePersisted)
    : proposalReport.proposals;
  const history = getSuggestionHistory(workspaceId, Boolean(options.isWriting));
  const baseDecision = buildDecisionFromData(signals, proposalsForDecision, undefined, history);
  return preIntercept(message, baseDecision, proposalsForDecision);
}

export function listWorkspaceProposals(
  workspaceId: string,
  status?: ProposalStatus,
  limit?: number,
): PersistedProposal[] {
  return repository.listProposals(workspaceId, status, limit);
}

export function decideWorkspaceProposal(
  workspaceId: string,
  proposalId: string,
  decision: ProposalStatus,
): PersistedProposal {
  return decideProposal(repository, workspaceId, proposalId, decision);
}

/**
 * 记录一次 Agent LLM 调用的成本。
 *
 * 由 InstrumentedPiRuntime 调用，每次 completeStructured / streamText / runToolCalling
 * 后写入一条 AgentUsageRecord，供成本追踪 dashboard 查询。
 *
 * @param record - 成本记录
 * @author fxbin
 */
export function recordAgentUsage(record: AgentUsageRecord): void {
  repository.recordAgentUsage(record);
}

/**
 * 查询 Agent 调用成本记录。
 *
 * 支持按 workspaceId / taskType / provider / 时间范围过滤。
 *
 * @param query - 查询条件
 * @returns 成本记录数组，按 startedAt 降序
 * @author fxbin
 */
export function listAgentUsageRecords(query: AgentUsageQuery): AgentUsageRecord[] {
  return repository.listAgentUsage(query);
}

/**
 * 聚合查询 Agent 调用成本。
 *
 * 返回按 taskType / provider 拆分的聚合摘要，用于 dashboard 展示。
 *
 * @param query - 查询条件
 * @returns 聚合摘要
 * @author fxbin
 */
export function summarizeAgentUsageRecords(query: AgentUsageQuery): AgentUsageSummary {
  return repository.summarizeAgentUsage(query);
}

/**
 * 对比查询 Agent 调用成本。
 *
 * 返回按 provider 拆分的成功率、平均成本与平均耗时，
 * 用于 P2.3 智能路由策略优化与 dashboard 成本对比展示。
 *
 * @param query - 查询条件
 * @returns Provider 成本对比结果
 * @author fxbin
 */
export function compareAgentUsageRecords(query: AgentUsageQuery): AgentUsageComparison {
  return repository.compareAgentUsage(query);
}

export function persistAgentChatTurn(record: PersistAgentChatTurnRequest): void {
  repository.persistAgentChatTurn(record);
}

export function listAgentChatSessions(workspaceId: string): AgentChatSessionInfo[] {
  return repository.listAgentChatSessions(workspaceId);
}

export function getAgentChatSession(sessionId: string, workspaceId: string): AgentChatSessionDetail | null {
  return repository.getAgentChatSession(sessionId, workspaceId);
}

export function renameAgentChatSession(sessionId: string, workspaceId: string, title: string): boolean {
  return repository.renameAgentChatSession(sessionId, workspaceId, title);
}

export function deleteAgentChatSession(sessionId: string, workspaceId: string): boolean {
  return repository.deleteAgentChatSession(sessionId, workspaceId);
}

export function getAgentChatRawMessages(sessionId: string, workspaceId: string): unknown[] | null {
  return repository.getAgentChatRawMessages(sessionId, workspaceId);
}

export function truncateAgentChatSessionForRetry(sessionId: string, workspaceId: string): AgentChatRetryResult {
  return repository.truncateAgentChatSessionForRetry(sessionId, workspaceId);
}

export { type AgentUsageRepository } from './agent-usage.js';
export { type UserMemoryRepository, type UserMemoryQuery } from './user-memory.js';
export { type DecisionLogRepository, type DecisionLogQuery } from './decision-log.js';
export {
  computeEvidenceFeedback,
  extractRejectedFeatures,
  buildNegativeExampleSection,
  EVIDENCE_ACTION_ACCEPT_PROPOSED_CARDS,
  DEFAULT_REJECTED_FEATURES_LIMIT,
};

/**
 * 创建用户记忆记录。
 *
 * @param request - 创建请求
 * @returns 新建的用户记忆记录
 * @author fxbin
 */
export function createUserMemoryRecord(request: CreateUserMemoryRequest): UserMemory {
  const error = validateCreateUserMemoryRequest(request);
  if (error) {
    throw new KnowledgeCoreError(`Invalid user memory: ${error}`, 400);
  }
  const timestamp = now();
  const record: UserMemory = {
    id: id('umem'),
    scope: request.scope,
    key: request.key,
    value: request.value,
    source: request.source ?? 'user_input',
    workspaceId: request.workspaceId,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  repository.insertUserMemory(record);
  return record;
}

/**
 * 更新用户记忆记录。
 *
 * @param memoryId - 记忆 id
 * @param patch - 更新请求
 * @returns 更新后的记录；不存在返回 undefined
 * @author fxbin
 */
export function updateUserMemoryRecord(memoryId: string, patch: UpdateUserMemoryRequest): UserMemory | undefined {
  return repository.updateUserMemory(memoryId, patch);
}

/**
 * 删除用户记忆记录。
 *
 * @param memoryId - 记忆 id
 * @returns 是否删除成功
 * @author fxbin
 */
export function deleteUserMemoryRecord(memoryId: string): boolean {
  return repository.deleteUserMemory(memoryId);
}

/**
 * 查询单条用户记忆。
 *
 * @param memoryId - 记忆 id
 * @returns 记忆记录；不存在返回 undefined
 * @author fxbin
 */
export function findUserMemoryRecord(memoryId: string): UserMemory | undefined {
  return repository.findUserMemory(memoryId);
}

/**
 * 列出用户记忆记录。
 *
 * @param query - 查询条件
 * @returns 用户记忆数组
 * @author fxbin
 */
export function listUserMemoryRecords(query: UserMemoryQuery = {}): UserMemory[] {
  return repository.listUserMemory(query);
}

/**
 * 创建决策日志记录。
 *
 * @param request - 创建请求
 * @returns 新建的决策日志记录
 * @author fxbin
 */
export function createDecisionLogRecord(request: CreateDecisionLogRequest): DecisionLog {
  const error = validateCreateDecisionLogRequest(request);
  if (error) {
    throw new KnowledgeCoreError(`Invalid decision log: ${error}`, 400);
  }
  const record: DecisionLog = {
    id: id('dlog'),
    kind: request.kind,
    workspaceId: request.workspaceId,
    summary: request.summary,
    reasoning: request.reasoning,
    evidenceCardIds: request.evidenceCardIds ?? [],
    agentTaskType: request.agentTaskType,
    metadata: request.metadata,
    createdAt: now(),
  };
  repository.insertDecisionLog(record);
  return record;
}

/**
 * 查询单条决策日志。
 *
 * @param logId - 日志 id
 * @returns 决策日志记录；不存在返回 undefined
 * @author fxbin
 */
export function findDecisionLogRecord(logId: string): DecisionLog | undefined {
  return repository.findDecisionLog(logId);
}

/**
 * 列出决策日志记录。
 *
 * @param query - 查询条件
 * @returns 决策日志数组
 * @author fxbin
 */
export function listDecisionLogRecords(query: DecisionLogQuery = {}): DecisionLog[] {
  return repository.listDecisionLog(query);
}

/**
 * 删除决策日志记录。
 *
 * @param logId - 日志 id
 * @returns 是否删除成功
 * @author fxbin
 */
export function deleteDecisionLogRecord(logId: string): boolean {
  return repository.deleteDecisionLog(logId);
}

export { canTransitionProposalStatus } from './memory.js';

/**
 * 流中拦截器入口（P0.5）。
 *
 * 在 Agent 每轮 turn_end 后调用，基于本轮工具结果动态调整编排模式。
 * 若模式变化，调用方应发送 mode_update 事件通知前端。
 *
 * @param workspaceId - 工作区 ID
 * @param toolCalls - 本轮所有工具调用结果摘要
 * @param currentDecision - 当前生效的编排决策
 * @returns 拦截后的决策（可能是原决策，也可能是调整后的新决策）
 * @author fxbin
 */
export function interceptInStream(
  workspaceId: string,
  toolCalls: import('./orchestrator.js').ToolCallSummary[],
  currentDecision: import('@zhijing/shared').OrchestratorDecision,
): import('@zhijing/shared').OrchestratorDecision {
  const proposalReport = generateAgentProposals();
  return preInterceptStream(toolCalls, currentDecision, proposalReport.proposals);
}

export {
  fetchUrlAsMarkdown,
  parseRawHtml,
  type FetchedContent,
} from './web-fetch.js';

