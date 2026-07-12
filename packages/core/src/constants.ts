/**
 * @file 知径核心常量定义
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

export const DEFAULT_PROFILE_NAME = '默认配置';
export const MODEL_PROVIDER_PROFILE_ID_PREFIX = 'mpp';
export const LEGACY_MODEL_PROVIDER_SETTINGS_ID = 'default';

/**
 * 默认工作区常量。
 *
 * 单池存储迁移的核心兜底机制：当卡片/资料/产物未指定归属知识库时，
 * 自动归入默认工作区。这样既实现了"无库卡片可存在"的单池存储体验，
 * 又规避了 SQLite NOT NULL 约束的 schema 重建风险。
 *
 * @author fxbin
 */
export const DEFAULT_WORKSPACE_ID = 'default';
export const DEFAULT_WORKSPACE_TITLE = '全局工作区';
export const DEFAULT_WORKSPACE_SUMMARY = '未指定工作区的卡片、资料与产物自动归入此处，可在全局视图中统一管理。';
export const CONTEXT_RETRIEVAL_LIMIT = 8;
export const FTS_TOKENIZER = 'unicode61';
export const MEMORY_SEARCH_TITLE_WEIGHT = 3;
export const MEMORY_SEARCH_BODY_WEIGHT = 1;
export const ATTENTION_SIGNAL_STRONG = 'strong';
export const ATTENTION_SIGNAL_MEDIUM = 'medium';
export const ATTENTION_SIGNAL_WEAK = 'weak';
export const ATTENTION_SIGNAL_QUESTION_CARD = 'question_card_created';
export const ATTENTION_SIGNAL_MANUAL_LAYOUT = 'manual_layout';
export const ATTENTION_SIGNAL_ASK_QUESTION = 'ask_question';
export const ATTENTION_SIGNAL_CARD_OPENED = 'card_opened';
export const ATTENTION_SIGNAL_CANNOT_ANSWER = 'cannot_answer';
export const ATTENTION_LOG_LIMIT = 100;
export const ATTENTION_CONTEXT_QUESTION_MAX_LENGTH = 200;
export const ATTENTION_TARGET_TYPE_CARD = 'card';
export const ATTENTION_TARGET_TYPE_LAYOUT = 'layout';
export const ATTENTION_TARGET_TYPE_QUESTION = 'question';

/**
 * 地图自定义边相关常量（P12-2）。
 * @author fxbin
 */
export const MAP_EDGE_ID_PREFIX = 'edge';
export const MAP_EDGE_TABLE_NAME = 'map_custom_edges';
export const MAP_EDGE_RELATION_SUPPORTS = 'supports';
export const MAP_EDGE_RELATION_CONTRADICTS = 'contradicts';
export const MAP_EDGE_RELATION_RELATED_TO = 'related_to';
export const MAP_EDGE_ALLOWED_RELATIONS: ReadonlySet<string> = new Set([
  MAP_EDGE_RELATION_SUPPORTS,
  MAP_EDGE_RELATION_CONTRADICTS,
  MAP_EDGE_RELATION_RELATED_TO,
]);
export const MAP_TENSION_EDGE_LIMIT = 20;
export const MAP_VISIBLE_MATERIAL_LIMIT = 80;
export const MAP_VISIBLE_CARD_LIMIT = 140;

/**
 * 证据审计与假设检验相关常量（P13）。
 * @author fxbin
 */
export const EVIDENCE_GAP_SAMPLE_LIMIT = 5;
export const EVIDENCE_GAP_SKELETON_RATIO_THRESHOLD = 0.5;
export const HYPOTHESIS_SEARCH_LIMIT = 12;
export const HYPOTHESIS_PREVIEW_MAX_LENGTH = 200;
export const HYPOTHESIS_VERDICT_SUPPORTED = 'supported';
export const HYPOTHESIS_VERDICT_CONTRADICTED = 'contradicted';
export const HYPOTHESIS_VERDICT_MIXED = 'mixed';
export const HYPOTHESIS_VERDICT_INSUFFICIENT = 'insufficient';
export const HYPOTHESIS_SUPPORT_KEYWORDS = ['支持', '优点', '利', '正面', '肯定', '赞成', '证明', '确认', '成立'];
export const HYPOTHESIS_CONTRADICT_KEYWORDS = ['反对', '缺点', '弊', '反面', '否定', '不成立', '错误', '反驳', '质疑'];

export const RECALL_TOOL_DIRECT_FETCH = 'direct_fetch';
export const RECALL_TOOL_SHALLOW = 'shallow_recall';
export const RECALL_TOOL_DEEP = 'deep_recall';
export const RECALL_TOOL_TOPIC_EXPLORATION = 'topic_exploration';
export const RECALL_DEFAULT_LIMIT = 8;
export const RECALL_PREVIEW_MAX_LENGTH = 200;
export const RECALL_RELEVANCE_THRESHOLD = 0.1;
export const RECALL_DIRECT_FETCH_EXACT_SCORE = 1.0;
export const RECALL_DIRECT_FETCH_CONTAIN_SCORE = 0.8;
export const RECALL_TOPIC_DIRECT_NEIGHBOR_SCORE = 0.9;
export const RECALL_TOPIC_SECOND_NEIGHBOR_SCORE = 0.6;
export const RECALL_DEEP_EXPANSION_PROMPT_PREFIX = '请为以下查询生成最多 5 个语义相关的扩展词或同义词，用逗号分隔，不要解释：\n查询：';
export const RECALL_DEEP_EXPANSION_PROMPT_SUFFIX = '\n扩展词：';
export const RECALL_DEEP_EXPANSION_MAX_TERMS = 5;
export const KNOWLEDGE_MAP_CARD_NODE_PREFIX = 'card:';
export const RECALL_RELEVANCE_ROUND_FACTOR = 10000;

export const CONSTRUCTION_SEEDLING_THRESHOLD = 0.6;
export const CONSTRUCTION_GROWING_THRESHOLD = 0.3;
export const CONSTRUCTION_RATIO_BASE = 0;
export const CONSTRUCTION_STAGE_SEEDLING = 'seedling';
export const CONSTRUCTION_STAGE_GROWING = 'growing';
export const CONSTRUCTION_STAGE_MATURE = 'mature';
export const CONSTRUCTION_ACTION_SEEDLING = '知识库仍以 AI 骨架为主，建议优先确认或修改骨架卡';
export const CONSTRUCTION_ACTION_GROWING = '知识库建构中，继续确认骨架卡以提升知识质量';
export const CONSTRUCTION_ACTION_MATURE = '知识库建构接近完成，可以开始溯源和检验';

export const TENSION_KEYWORD_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['支持', '反对'],
  ['优点', '缺点'],
  ['利', '弊'],
  ['正面', '反面'],
  ['肯定', '否定'],
  ['赞成', '反对'],
];
export const TENSION_KEY_PREFIX = 'tension:';
export const TENSION_KEY_SEPARATOR = '-vs-:';
export const TENSION_TITLE_TEMPLATE = '"{a}" vs "{b}" 张力';
export const TENSION_META_TEMPLATE = '{status} · 类型 {type}';

/**
 * 苏格拉底追问相关常量（P11-2）。
 *
 * 铁律：Agent 只生成提问，不生成答案。
 * prompt 模板中明确指示"只提问，不提供答案"，
 * 避免替代用户建构认知。
 *
 * @author fxbin
 */
export const SOCRATIC_TRIGGER_SKELETON = 'skeleton_card';
export const SOCRATIC_TRIGGER_TENSION = 'semantic_tension';
export const SOCRATIC_TRIGGER_MANUAL = 'manual';
export const SOCRATIC_QUESTION_MIN_COUNT = 3;
export const SOCRATIC_QUESTION_MAX_COUNT = 5;
export const SOCRATIC_CARD_DIGEST_LIMIT = 20;
export const SOCRATIC_PROMPT_HEADER = '你是知径的苏格拉底追问 Agent。你的职责是生成提问，引导用户自己思考，绝不提供答案。';
export const SOCRATIC_PROMPT_RULES = [
  '铁律：只生成提问，不生成任何答案、解释或提示。',
  '每个问题必须属于以下五种类型之一：definition_clarity（定义澄清）、evidence_probe（证据追问）、counterexample_challenge（反例挑战）、boundary_probe（边界追问）、connection_probe（关联追问）。',
  '问题应当开放、具体、可回答，避免是非题。',
  'rationale 字段是系统内部使用的提问理由，不应展示给用户作为答案提示。',
  '生成 3-5 个问题，覆盖不同追问维度。',
].join('\n');
export const SOCRATIC_PROMPT_SKELETON_TEMPLATE = '当前知识库「{title}」存在骨架卡（AI 生成未确认）。请基于以下卡片信息生成苏格拉底追问，引导用户澄清概念边界、补充证据或思考反例。';
export const SOCRATIC_PROMPT_TENSION_TEMPLATE = '当前知识库「{title}」检测到语义张力：关键词「{a}」与「{b}」存在对立。请生成苏格拉底追问，引导用户思考这一对立。';
export const SOCRATIC_PROMPT_MANUAL_TEMPLATE = '用户主动请求对知识库「{title}」进行苏格拉底追问。请基于知识库核心卡片生成追问，引导用户深化认知建构。';
export const SOCRATIC_ATTENTION_SIGNAL_TYPE = 'ask_question';
export const SOCRATIC_ATTENTION_SIGNAL_STRENGTH = 'strong';
export const SOCRATIC_ATTENTION_TARGET_TYPE = 'question';

/**
 * "可能相关"建议相关常量（P10-4）。
 *
 * 基于 Recall Agent 检索结果生成建议，展示在侧边栏。
 * 用户可忽略或否决，仅影响前端展示，不持久化。
 *
 * @author fxbin
 */
export const RELATED_SUGGESTION_LIMIT = 5;
export const RELATED_SUGGESTION_MIN_SCORE = 0.1;
export const RELATED_SUGGESTION_REASON_TOPIC = '基于知识地图邻居检索';
export const RELATED_SUGGESTION_REASON_SHALLOW = '基于关键词匹配检索';
export const RELATED_SUGGESTION_REASON_DIRECT = '基于标题精确匹配';

/**
 * Agent 行为日志相关常量（P10-5）。
 *
 * 记录每次 Agent 调用的输入/输出/耗时/结果，供可审计性使用。
 * datasette inspect 能力通过 SQL 导出端点实现，无需引入 datasette 依赖。
 *
 * @author fxbin
 */
export const AGENT_ACTION_LOG_DEFAULT_LIMIT = 50;
export const AGENT_ACTION_LOG_MAX_LIMIT = 200;

/**
 * inspect 调试查询禁止访问的敏感表名（小写匹配）。
 * 包含凭证、用户记忆、决策日志等隐私数据，避免拖库泄漏。
 * @author fxbin
 */
export const INSPECT_FORBIDDEN_TABLES: readonly string[] = [
  'model_provider_settings',
  'model_provider_profiles',
  'weread_settings',
  'user_memory',
  'decision_log',
  'agent_usage',
  'agent_chat_sessions',
  'agent_chat_messages',
  'agent_chat_runs',
  'agent_chat_tool_calls',
  'messages',
];
export const AGENT_ACTION_LOG_TABLE_NAME = 'agent_action_log';
export const AGENT_ACTION_LOG_ID_PREFIX = 'alog';
export const AGENT_ACTION_SUCCESS_TRUE = 1;
export const AGENT_ACTION_SUCCESS_FALSE = 0;
export const AGENT_CHAT_MESSAGE_ID_PREFIX = 'acmsg';
export const AGENT_CHAT_TITLE_MAX_LENGTH = 40;

export const MONOREPO_ROOT_ASCENT = 3;

export function resolveProjectRoot(): string {
  const moduleDir = dirname(fileURLToPath(import.meta.url));
  let dir = moduleDir;
  for (let i = 0; i < MONOREPO_ROOT_ASCENT; i += 1) {
    dir = dirname(dir);
  }
  return dir;
}

export const PROJECT_ROOT = resolveProjectRoot();

export function defaultSqlitePath(): string {
  return process.env.ZHIJING_DB_PATH ?? join(PROJECT_ROOT, '.data', 'zhijing.sqlite');
}

