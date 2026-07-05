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
import type { BookSignalInputs, QuadrantSummary } from '@zhijing/shared';
import { DEGRADE_MATRIX_REGISTRY } from './statistics/degrade-matrix.js';
import { computeQuadrantSummary } from './statistics/quadrant.js';
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
export { initProxyDispatcher, getCurrentProxy } from './fetch-dispatcher.js';
export { detectSystemProxy, setManualProxy, resetProxyCache } from './proxy-detector.js';
export { checkUrlForSsrf, assertUrlSafeForSsrf, createSsrfSafeFetch } from './ssrf-guard.js';
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

type PersistedModelProviderConfig = Partial<{
  provider: string;
  model: string;
  baseUrl: string;
  apiKey: string;
  enabled: boolean;
  fallbackToMock: boolean;
  updatedAt: string;
}>;

/**
 * 模型 Provider Profile 持久化记录（内部类型，包含 apiKey 明文）
 * @author fxbin
 */
type ModelProviderProfileRecord = {
  id: string;
  name: string;
  provider: string;
  model: string;
  baseUrl?: string;
  apiKey?: string;
  enabled: boolean;
  fallbackToMock: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

const DEFAULT_PROFILE_NAME = '默认配置';
const MODEL_PROVIDER_PROFILE_ID_PREFIX = 'mpp';
const LEGACY_MODEL_PROVIDER_SETTINGS_ID = 'default';

/**
 * 默认工作区常量。
 *
 * 单池存储迁移的核心兜底机制：当卡片/资料/产物未指定归属知识库时，
 * 自动归入默认工作区。这样既实现了"无库卡片可存在"的单池存储体验，
 * 又规避了 SQLite NOT NULL 约束的 schema 重建风险。
 *
 * @author fxbin
 */
const DEFAULT_WORKSPACE_ID = 'default';
const DEFAULT_WORKSPACE_TITLE = '全局工作区';
const DEFAULT_WORKSPACE_SUMMARY = '未指定工作区的卡片、资料与产物自动归入此处，可在全局视图中统一管理。';
const CONTEXT_RETRIEVAL_LIMIT = 8;
const FTS_TOKENIZER = 'unicode61';
const MEMORY_SEARCH_TITLE_WEIGHT = 3;
const MEMORY_SEARCH_BODY_WEIGHT = 1;
const ATTENTION_SIGNAL_STRONG = 'strong';
const ATTENTION_SIGNAL_MEDIUM = 'medium';
const ATTENTION_SIGNAL_WEAK = 'weak';
const ATTENTION_SIGNAL_QUESTION_CARD = 'question_card_created';
const ATTENTION_SIGNAL_MANUAL_LAYOUT = 'manual_layout';
const ATTENTION_SIGNAL_ASK_QUESTION = 'ask_question';
const ATTENTION_SIGNAL_CARD_OPENED = 'card_opened';
const ATTENTION_SIGNAL_CANNOT_ANSWER = 'cannot_answer';
const ATTENTION_LOG_LIMIT = 100;
const ATTENTION_CONTEXT_QUESTION_MAX_LENGTH = 200;
const ATTENTION_TARGET_TYPE_CARD = 'card';
const ATTENTION_TARGET_TYPE_LAYOUT = 'layout';
const ATTENTION_TARGET_TYPE_QUESTION = 'question';

/**
 * 地图自定义边相关常量（P12-2）。
 * @author fxbin
 */
const MAP_EDGE_ID_PREFIX = 'edge';
const MAP_EDGE_TABLE_NAME = 'map_custom_edges';
const MAP_EDGE_RELATION_SUPPORTS = 'supports';
const MAP_EDGE_RELATION_CONTRADICTS = 'contradicts';
const MAP_EDGE_RELATION_RELATED_TO = 'related_to';
const MAP_EDGE_ALLOWED_RELATIONS: ReadonlySet<string> = new Set([
  MAP_EDGE_RELATION_SUPPORTS,
  MAP_EDGE_RELATION_CONTRADICTS,
  MAP_EDGE_RELATION_RELATED_TO,
]);
const MAP_TENSION_EDGE_LIMIT = 20;
const MAP_VISIBLE_MATERIAL_LIMIT = 80;
const MAP_VISIBLE_CARD_LIMIT = 140;

/**
 * 证据审计与假设检验相关常量（P13）。
 * @author fxbin
 */
const EVIDENCE_GAP_SAMPLE_LIMIT = 5;
const EVIDENCE_GAP_SKELETON_RATIO_THRESHOLD = 0.5;
const HYPOTHESIS_SEARCH_LIMIT = 12;
const HYPOTHESIS_PREVIEW_MAX_LENGTH = 200;
const HYPOTHESIS_VERDICT_SUPPORTED = 'supported';
const HYPOTHESIS_VERDICT_CONTRADICTED = 'contradicted';
const HYPOTHESIS_VERDICT_MIXED = 'mixed';
const HYPOTHESIS_VERDICT_INSUFFICIENT = 'insufficient';
const HYPOTHESIS_SUPPORT_KEYWORDS = ['支持', '优点', '利', '正面', '肯定', '赞成', '证明', '确认', '成立'];
const HYPOTHESIS_CONTRADICT_KEYWORDS = ['反对', '缺点', '弊', '反面', '否定', '不成立', '错误', '反驳', '质疑'];

const RECALL_TOOL_DIRECT_FETCH = 'direct_fetch';
const RECALL_TOOL_SHALLOW = 'shallow_recall';
const RECALL_TOOL_DEEP = 'deep_recall';
const RECALL_TOOL_TOPIC_EXPLORATION = 'topic_exploration';
const RECALL_DEFAULT_LIMIT = 8;
const RECALL_PREVIEW_MAX_LENGTH = 200;
const RECALL_RELEVANCE_THRESHOLD = 0.1;
const RECALL_DIRECT_FETCH_EXACT_SCORE = 1.0;
const RECALL_DIRECT_FETCH_CONTAIN_SCORE = 0.8;
const RECALL_TOPIC_DIRECT_NEIGHBOR_SCORE = 0.9;
const RECALL_TOPIC_SECOND_NEIGHBOR_SCORE = 0.6;
const RECALL_DEEP_EXPANSION_PROMPT_PREFIX = '请为以下查询生成最多 5 个语义相关的扩展词或同义词，用逗号分隔，不要解释：\n查询：';
const RECALL_DEEP_EXPANSION_PROMPT_SUFFIX = '\n扩展词：';
const RECALL_DEEP_EXPANSION_MAX_TERMS = 5;
const KNOWLEDGE_MAP_CARD_NODE_PREFIX = 'card:';
const RECALL_RELEVANCE_ROUND_FACTOR = 10000;

const CONSTRUCTION_SEEDLING_THRESHOLD = 0.6;
const CONSTRUCTION_GROWING_THRESHOLD = 0.3;
const CONSTRUCTION_RATIO_BASE = 0;
const CONSTRUCTION_STAGE_SEEDLING = 'seedling';
const CONSTRUCTION_STAGE_GROWING = 'growing';
const CONSTRUCTION_STAGE_MATURE = 'mature';
const CONSTRUCTION_ACTION_SEEDLING = '知识库仍以 AI 骨架为主，建议优先确认或修改骨架卡';
const CONSTRUCTION_ACTION_GROWING = '知识库建构中，继续确认骨架卡以提升知识质量';
const CONSTRUCTION_ACTION_MATURE = '知识库建构接近完成，可以开始溯源和检验';

const TENSION_KEYWORD_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['支持', '反对'],
  ['优点', '缺点'],
  ['利', '弊'],
  ['正面', '反面'],
  ['肯定', '否定'],
  ['赞成', '反对'],
];
const TENSION_KEY_PREFIX = 'tension:';
const TENSION_KEY_SEPARATOR = '-vs-:';
const TENSION_TITLE_TEMPLATE = '"{a}" vs "{b}" 张力';
const TENSION_META_TEMPLATE = '{status} · 类型 {type}';

/**
 * 苏格拉底追问相关常量（P11-2）。
 *
 * 铁律：Agent 只生成提问，不生成答案。
 * prompt 模板中明确指示"只提问，不提供答案"，
 * 避免替代用户建构认知。
 *
 * @author fxbin
 */
const SOCRATIC_TRIGGER_SKELETON = 'skeleton_card';
const SOCRATIC_TRIGGER_TENSION = 'semantic_tension';
const SOCRATIC_TRIGGER_MANUAL = 'manual';
const SOCRATIC_QUESTION_MIN_COUNT = 3;
const SOCRATIC_QUESTION_MAX_COUNT = 5;
const SOCRATIC_CARD_DIGEST_LIMIT = 20;
const SOCRATIC_PROMPT_HEADER = '你是知径的苏格拉底追问 Agent。你的职责是生成提问，引导用户自己思考，绝不提供答案。';
const SOCRATIC_PROMPT_RULES = [
  '铁律：只生成提问，不生成任何答案、解释或提示。',
  '每个问题必须属于以下五种类型之一：definition_clarity（定义澄清）、evidence_probe（证据追问）、counterexample_challenge（反例挑战）、boundary_probe（边界追问）、connection_probe（关联追问）。',
  '问题应当开放、具体、可回答，避免是非题。',
  'rationale 字段是系统内部使用的提问理由，不应展示给用户作为答案提示。',
  '生成 3-5 个问题，覆盖不同追问维度。',
].join('\n');
const SOCRATIC_PROMPT_SKELETON_TEMPLATE = '当前知识库「{title}」存在骨架卡（AI 生成未确认）。请基于以下卡片信息生成苏格拉底追问，引导用户澄清概念边界、补充证据或思考反例。';
const SOCRATIC_PROMPT_TENSION_TEMPLATE = '当前知识库「{title}」检测到语义张力：关键词「{a}」与「{b}」存在对立。请生成苏格拉底追问，引导用户思考这一对立。';
const SOCRATIC_PROMPT_MANUAL_TEMPLATE = '用户主动请求对知识库「{title}」进行苏格拉底追问。请基于知识库核心卡片生成追问，引导用户深化认知建构。';
const SOCRATIC_ATTENTION_SIGNAL_TYPE = 'ask_question';
const SOCRATIC_ATTENTION_SIGNAL_STRENGTH = 'strong';
const SOCRATIC_ATTENTION_TARGET_TYPE = 'question';

/**
 * "可能相关"建议相关常量（P10-4）。
 *
 * 基于 Recall Agent 检索结果生成建议，展示在侧边栏。
 * 用户可忽略或否决，仅影响前端展示，不持久化。
 *
 * @author fxbin
 */
const RELATED_SUGGESTION_LIMIT = 5;
const RELATED_SUGGESTION_MIN_SCORE = 0.1;
const RELATED_SUGGESTION_REASON_TOPIC = '基于知识地图邻居检索';
const RELATED_SUGGESTION_REASON_SHALLOW = '基于关键词匹配检索';
const RELATED_SUGGESTION_REASON_DIRECT = '基于标题精确匹配';

/**
 * Agent 行为日志相关常量（P10-5）。
 *
 * 记录每次 Agent 调用的输入/输出/耗时/结果，供可审计性使用。
 * datasette inspect 能力通过 SQL 导出端点实现，无需引入 datasette 依赖。
 *
 * @author fxbin
 */
const AGENT_ACTION_LOG_DEFAULT_LIMIT = 50;
const AGENT_ACTION_LOG_MAX_LIMIT = 200;

/**
 * inspect 调试查询禁止访问的敏感表名（小写匹配）。
 * 包含凭证、用户记忆、决策日志等隐私数据，避免拖库泄漏。
 * @author fxbin
 */
const INSPECT_FORBIDDEN_TABLES: readonly string[] = [
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
const AGENT_ACTION_LOG_TABLE_NAME = 'agent_action_log';
const AGENT_ACTION_LOG_ID_PREFIX = 'alog';
const AGENT_ACTION_SUCCESS_TRUE = 1;
const AGENT_ACTION_SUCCESS_FALSE = 0;
const AGENT_CHAT_MESSAGE_ID_PREFIX = 'acmsg';
const AGENT_CHAT_TITLE_MAX_LENGTH = 40;

type StoreState = {
  workspaces: WorkspaceSummary[];
  materials: MaterialRecord[];
  cards: KnowledgeCard[];
  tasks: AgentTask[];
  artifacts: ArtifactRecord[];
  messages: ChatMessage[];
  cardRevisions: CardRevision[];
  artifactRevisions: ArtifactRevision[];
  exports: ExportRecord[];
  savedFilters: SavedFilter[];
  entities: Entity[];
  conflictAudit: ConflictAuditEntry[];
  modelProviderConfig?: PersistedModelProviderConfig;
  modelProviderProfiles: ModelProviderProfileRecord[];
  nodePositions: Record<string, Array<{ nodeId: string; x: number; y: number }>>;
  mapCustomEdges: KnowledgeMapCustomEdge[];
  attentionSignals: AttentionSignal[];
  agentActionLogs: AgentActionLog[];
  proposals: PersistedProposal[];
  agentUsage: AgentUsageRecord[];
  agentChatSessions: AgentChatSessionInfo[];
  agentChatMessages: AgentChatMessageRecord[];
  agentChatRuns: AgentChatRunRecord[];
  agentChatToolCalls: AgentChatToolCallRecord[];
  agentChatRawMessages: Record<string, unknown[]>;
  userMemory: UserMemory[];
  decisionLog: DecisionLog[];
};

type AgentChatRetryResult = {
  ok: boolean;
  beforeCount: number;
  remainingCount: number;
  truncated: boolean;
};

type KnowledgeRepository = {
  insertWorkspace(base: WorkspaceSummary): void;
  updateWorkspace(base: WorkspaceSummary): void;
  listWorkspaces(): WorkspaceSummary[];
  findWorkspace(id: string): WorkspaceSummary | undefined;
  findWorkspaceByTitle(title: string): WorkspaceSummary | undefined;
  deleteWorkspace(id: string): void;
  insertMaterial(material: MaterialRecord): void;
  updateMaterial(material: MaterialRecord): void;
  findMaterial(id: string): MaterialRecord | undefined;
  listMaterials(workspaceId?: string, limit?: number): MaterialRecord[];
  queryMaterialsPaged(options: MaterialQueryOptions): MaterialQueryResult;
  searchMaterialsByRelevance(workspaceId: string, query: string, limit: number): MaterialRecord[];
  findCard(id: string): KnowledgeCard | undefined;
  deleteMaterial(id: string): void;
  archiveMaterial(id: string): void;
  unarchiveMaterial(id: string): void;
  listArchivedMaterials(workspaceId?: string): MaterialRecord[];
  getNodePositions(workspaceId: string): Array<{ nodeId: string; x: number; y: number }>;
  saveNodePositions(workspaceId: string, positions: Array<{ nodeId: string; x: number; y: number }>): void;
  listMapCustomEdges(workspaceId: string): KnowledgeMapCustomEdge[];
  insertMapCustomEdge(edge: KnowledgeMapCustomEdge): void;
  deleteMapCustomEdge(workspaceId: string, edgeId: string): void;
  insertCards(cards: KnowledgeCard[]): void;
  updateCard(card: KnowledgeCard): void;
  listCards(workspaceId?: string): KnowledgeCard[];
  searchCardsByRelevance(workspaceId: string, query: string, limit: number): KnowledgeCard[];
  archiveCard(id: string): void;
  unarchiveCard(id: string): void;
  listArchivedCards(workspaceId?: string): KnowledgeCard[];
  insertCardRevision(revision: CardRevision): void;
  listCardRevisions(cardId: string): CardRevision[];
  insertExportRecord(record: ExportRecord): void;
  listExportRecords(workspaceId?: string): ExportRecord[];
  upsertSavedFilter(record: SavedFilter): void;
  listSavedFilters(scope?: SavedFilterScope): SavedFilter[];
  deleteSavedFilter(id: string): void;
  upsertEntity(record: Entity): void;
  listEntities(workspaceId: string): Entity[];
  deleteEntity(id: string): void;
  deleteEntitiesByWorkspace(workspaceId: string): void;
  deleteCard(id: string): void;
  insertConflictAudit(entry: ConflictAuditEntry): void;
  listConflictAudit(limit?: number): ConflictAuditEntry[];
  insertTask(task: AgentTask): void;
  updateTask(task: AgentTask): void;
  listTasks(limit?: number): AgentTask[];
  findTask(id: string): AgentTask | undefined;
  insertArtifact(artifact: ArtifactRecord): void;
  updateArtifact(artifact: ArtifactRecord): void;
  listArtifacts(workspaceId?: string, limit?: number): ArtifactRecord[];
  insertArtifactRevision(revision: ArtifactRevision): void;
  listArtifactRevisions(artifactId: string): ArtifactRevision[];
  findArtifact(artifactId: string): ArtifactRecord | undefined;
  insertMessage(message: ChatMessage): void;
  listMessages(workspaceId: string, limit?: number): ChatMessage[];
  findMessage(messageId: string): ChatMessage | undefined;
  updateMessageAcceptedCards(messageId: string, cardIds: string[]): void;
  readModelProviderConfig(): PersistedModelProviderConfig | undefined;
  writeModelProviderConfig(config: PersistedModelProviderConfig): void;
  listModelProviderProfiles(): ModelProviderProfileRecord[];
  findModelProviderProfile(id: string): ModelProviderProfileRecord | undefined;
  insertModelProviderProfile(record: ModelProviderProfileRecord): void;
  updateModelProviderProfile(record: ModelProviderProfileRecord): void;
  deleteModelProviderProfile(id: string): void;
  clearModelProviderProfileDefault(): void;
  readWeReadApiKey(): string | null;
  writeWeReadApiKey(apiKey: string): void;
  deleteWeReadApiKey(): void;
  readDataAccountBook(): DataAccountBook | null;
  writeDataAccountBook(book: DataAccountBook): void;
  readVerificationCoverage(bookId: string): VerificationCoverage | null;
  writeVerificationCoverage(coverage: VerificationCoverage): void;
  syncWeReadBookMeta(books: WeReadShelfBook[], archiveYearMap: Map<string, string>): void;
  readWeReadBookMetaList(): WeReadBookMetaRow[];
  readAllWeReadBookMetaList(): WeReadBookMetaRow[];
  readWeReadSyncState(): WeReadSyncStateRow | null;
  writeWeReadSyncState(state: WeReadSyncStateRow): void;
  updateWeReadBookMetaImport(bookId: string, materialId: string, bookmarkCount: number): void;
  updateWeReadBookMetaSignals(input: {
    bookId: string;
    bookmarkCount: number;
    reviewCount: number;
    chapterCount: number;
    longReviewCount: number;
    signalsSyncedAt: string;
    signalsHash: string;
  }): boolean;
  readHiddenInterestState(): HiddenInterestState | null;
  saveHiddenInterestState(state: HiddenInterestState): void;
  recordDataPortability(record: DataPortabilityRecord): void;
  listDataPortability(): DataPortabilityRecord[];
  revokeDataPortability(id: string, revokedAt: number): void;
  readReaderModeState(): ReaderModeState | null;
  saveReaderModeState(state: ReaderModeState): void;
  computeWeReadStats(): WeReadStatsResponse;
  insertAttentionSignal(signal: AttentionSignal): void;
  listAttentionSignals(workspaceId?: string, limit?: number): AttentionSignal[];
  markAttentionConsumed(signalId: string): void;
  deleteAttentionSignals(workspaceId: string): void;
  insertProposal(proposal: PersistedProposal): void;
  listProposals(workspaceId: string, status?: ProposalStatus, limit?: number): PersistedProposal[];
  updateProposalStatus(proposalId: string, status: ProposalStatus, decidedAt: string): void;
  findRecentProposals(workspaceId: string, type: string, title: string, sinceIso: string): PersistedProposal[];
  recordAgentUsage(record: AgentUsageRecord): void;
  listAgentUsage(query: AgentUsageQuery): AgentUsageRecord[];
  summarizeAgentUsage(query: AgentUsageQuery): AgentUsageSummary;
  compareAgentUsage(query: AgentUsageQuery): AgentUsageComparison;
  persistAgentChatTurn(record: PersistAgentChatTurnRequest): void;
  listAgentChatSessions(workspaceId: string): AgentChatSessionInfo[];
  getAgentChatSession(sessionId: string, workspaceId: string): AgentChatSessionDetail | null;
  renameAgentChatSession(sessionId: string, workspaceId: string, title: string): boolean;
  deleteAgentChatSession(sessionId: string, workspaceId: string): boolean;
  getAgentChatRawMessages(sessionId: string, workspaceId: string): unknown[] | null;
  truncateAgentChatSessionForRetry(sessionId: string, workspaceId: string): AgentChatRetryResult;
  insertUserMemory(record: UserMemory): void;
  updateUserMemory(id: string, patch: UpdateUserMemoryRequest): UserMemory | undefined;
  deleteUserMemory(id: string): boolean;
  findUserMemory(id: string): UserMemory | undefined;
  listUserMemory(query: UserMemoryQuery): UserMemory[];
  insertDecisionLog(record: DecisionLog): void;
  findDecisionLog(id: string): DecisionLog | undefined;
  listDecisionLog(query: DecisionLogQuery): DecisionLog[];
  deleteDecisionLog(id: string): boolean;
  insertAgentActionLog(log: AgentActionLog): void;
  listAgentActionLogs(options?: { workspaceId?: string; action?: string; limit?: number }): AgentActionLog[];
  countAgentActionLogs(options?: { workspaceId?: string; action?: string }): number;
  executeInspectQuery(sql: string, limit?: number): Array<Record<string, unknown>>;
  listInspectTables(): Array<{ name: string; sql: string }>;
};

type GeneratedCard = {
  type?: KnowledgeCard['type'];
  title?: string;
  body?: string;
};

type GeneratedKnowledgeOutput = {
  title?: string;
  summary?: string;
  cards?: GeneratedCard[];
  artifactTitle?: string;
  artifactBody?: string;
};

type ParsedMaterialContent = {
  title?: string;
  text: string;
  mediaUrls?: string[];
  needsReview?: boolean;
  reviewReason?: string;
};

type ParseFailureCategory = 'network' | 'blocked' | 'timeout' | 'too_short' | 'unsupported' | 'unknown';

type ParserCacheEntry = {
  parsed: ParsedMaterialContent;
  platform: string;
  cachedAt: number;
};

type XiaohongshuShareInfo = {
  noteId?: string;
  xsecToken?: string;
  sourceUrl: string;
};

class MemoryKnowledgeRepository implements KnowledgeRepository {
  private readonly state: StoreState = {
    workspaces: [],
    materials: [],
    cards: [],
    tasks: [],
    artifacts: [],
    messages: [],
    cardRevisions: [],
    artifactRevisions: [],
    exports: [],
    savedFilters: [],
    entities: [],
    conflictAudit: [],
    modelProviderProfiles: [],
    nodePositions: {},
    mapCustomEdges: [],
    attentionSignals: [],
    agentActionLogs: [],
    proposals: [],
    agentUsage: [],
    agentChatSessions: [],
    agentChatMessages: [],
    agentChatRuns: [],
    agentChatToolCalls: [],
    agentChatRawMessages: {},
    userMemory: [],
    decisionLog: [],
  };

  private wereadApiKey: string | null = null;

  insertWorkspace(base: WorkspaceSummary) {
    this.state.workspaces.unshift(base);
  }

  updateWorkspace(base: WorkspaceSummary) {
    const index = this.state.workspaces.findIndex((item) => item.id === base.id);
    if (index >= 0) this.state.workspaces[index] = base;
  }

  listWorkspaces() {
    return this.state.workspaces;
  }

  findWorkspace(id: string) {
    return this.state.workspaces.find((item) => item.id === id);
  }

  findWorkspaceByTitle(title: string) {
    return this.state.workspaces.find((item) => item.title === title);
  }

  deleteWorkspace(id: string) {
    this.state.workspaces = this.state.workspaces.filter((item) => item.id !== id);
    this.state.materials = this.state.materials.filter((item) => item.workspaceId !== id);
    this.state.cards = this.state.cards.filter((item) => item.workspaceId !== id);
    this.state.artifacts = this.state.artifacts.filter((item) => item.workspaceId !== id);
    this.state.entities = this.state.entities.filter((item) => item.workspaceId !== id);
    this.state.attentionSignals = this.state.attentionSignals.filter((item) => item.workspaceId !== id);
  }

  insertMaterial(material: MaterialRecord) {
    this.state.materials.unshift(material);
  }

  updateMaterial(material: MaterialRecord) {
    const index = this.state.materials.findIndex((item) => item.id === material.id);
    if (index >= 0) this.state.materials[index] = material;
  }

  findMaterial(id: string) {
    return this.state.materials.find((item) => item.id === id);
  }

  findCard(id: string) {
    return this.state.cards.find((item) => item.id === id);
  }

  listMaterials(workspaceId?: string, limit?: number) {
    const materials = (workspaceId
      ? this.state.materials.filter((item) => item.workspaceId === workspaceId)
      : this.state.materials
    ).filter((item) => !item.archived);
    return typeof limit === 'number' ? materials.slice(0, limit) : materials;
  }

  queryMaterialsPaged(options: MaterialQueryOptions): MaterialQueryResult {
    const limit = typeof options.limit === 'number' && options.limit > 0 ? options.limit : 20;
    const query = options.query?.trim().toLowerCase();
    const cursorCreatedAt = options.cursorCreatedAt?.trim();
    const cursorId = options.cursorId?.trim();
    const hasCursor = Boolean(cursorCreatedAt && cursorId);

    let items = (options.workspaceId
      ? this.state.materials.filter((item) => item.workspaceId === options.workspaceId)
      : this.state.materials
    ).filter((item) => !item.archived);

    if (options.type) items = items.filter((item) => item.type === options.type);
    if (options.parseStatus) items = items.filter((item) => item.parseStatus === options.parseStatus);
    if (query) {
      items = items.filter((item) => {
        const searchable = [item.title, item.rawInput, item.contentText, item.platform, item.sourceUrl, item.parseError]
          .filter(Boolean).join(' ').toLowerCase();
        return searchable.includes(query);
      });
    }

    items.sort((a, b) => {
      if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
      return a.id < b.id ? 1 : -1;
    });

    if (hasCursor) {
      const cc = cursorCreatedAt as string;
      const ci = cursorId as string;
      items = items.filter((item) => {
        if (item.createdAt < cc) return true;
        if (item.createdAt > cc) return false;
        return item.id < ci;
      });
    }

    const fetched = items.slice(0, limit + 1);
    const hasMore = fetched.length > limit;
    const materials = hasMore ? fetched.slice(0, limit) : fetched;
    const last = materials[materials.length - 1];
    const nextCursor = hasMore && last ? { createdAt: last.createdAt, id: last.id } : null;
    return { materials, nextCursor, hasMore };
  }

  deleteMaterial(id: string) {
    this.state.materials = this.state.materials.filter((item) => item.id !== id);
    for (const card of this.state.cards) {
      if (card.materialId === id) card.materialId = undefined;
    }
  }

  archiveMaterial(id: string) {
    const material = this.findMaterial(id);
    if (material) {
      material.archived = true;
      this.updateMaterial(material);
    }
  }

  unarchiveMaterial(id: string) {
    const material = this.findMaterial(id);
    if (material) {
      material.archived = false;
      this.updateMaterial(material);
    }
  }

  listArchivedMaterials(workspaceId?: string) {
    const materials = workspaceId
      ? this.state.materials.filter((item) => item.workspaceId === workspaceId)
      : this.state.materials;
    return materials.filter((item) => item.archived);
  }

  getNodePositions(workspaceId: string) {
    return this.state.nodePositions[workspaceId] ?? [];
  }

  saveNodePositions(workspaceId: string, positions: Array<{ nodeId: string; x: number; y: number }>) {
    this.state.nodePositions[workspaceId] = positions;
  }

  listMapCustomEdges(workspaceId: string) {
    return this.state.mapCustomEdges.filter((edge) => edge.workspaceId === workspaceId);
  }

  insertMapCustomEdge(edge: KnowledgeMapCustomEdge) {
    this.state.mapCustomEdges.unshift(edge);
  }

  deleteMapCustomEdge(workspaceId: string, edgeId: string) {
    this.state.mapCustomEdges = this.state.mapCustomEdges.filter(
      (edge) => !(edge.id === edgeId && edge.workspaceId === workspaceId),
    );
  }

  insertCards(cards: KnowledgeCard[]) {
    this.state.cards.unshift(...cards);
  }

  updateCard(card: KnowledgeCard) {
    const index = this.state.cards.findIndex((item) => item.id === card.id);
    if (index >= 0) this.state.cards[index] = card;
  }

  listCards(workspaceId?: string) {
    const cards = workspaceId
      ? this.state.cards.filter((item) => item.workspaceId === workspaceId)
      : this.state.cards;
    return cards.filter((item) => !item.archived);
  }

  archiveCard(id: string) {
    const card = this.findCard(id);
    if (card) {
      card.archived = true;
      this.updateCard(card);
    }
  }

  unarchiveCard(id: string) {
    const card = this.findCard(id);
    if (card) {
      card.archived = false;
      this.updateCard(card);
    }
  }

  listArchivedCards(workspaceId?: string) {
    const cards = workspaceId
      ? this.state.cards.filter((item) => item.workspaceId === workspaceId)
      : this.state.cards;
    return cards.filter((item) => item.archived);
  }

  insertCardRevision(revision: CardRevision) {
    this.state.cardRevisions.push(revision);
  }

  listCardRevisions(cardId: string) {
    return this.state.cardRevisions
      .filter((item) => item.cardId === cardId)
      .sort((a, b) => a.version - b.version);
  }

  insertExportRecord(record: ExportRecord) {
    this.state.exports.unshift(record);
  }

  listExportRecords(workspaceId?: string) {
    return workspaceId
      ? this.state.exports.filter((item) => item.workspaceId === workspaceId)
      : this.state.exports;
  }

  upsertSavedFilter(record: SavedFilter) {
    const index = this.state.savedFilters.findIndex((item) => item.id === record.id);
    if (index >= 0) {
      this.state.savedFilters[index] = record;
    } else {
      this.state.savedFilters.push(record);
    }
  }

  listSavedFilters(scope?: SavedFilterScope) {
    return scope
      ? this.state.savedFilters.filter((item) => item.scope === scope)
      : this.state.savedFilters;
  }

  deleteSavedFilter(id: string) {
    this.state.savedFilters = this.state.savedFilters.filter((item) => item.id !== id);
  }

  upsertEntity(record: Entity) {
    const index = this.state.entities.findIndex((item) => item.id === record.id);
    if (index >= 0) {
      this.state.entities[index] = record;
    } else {
      this.state.entities.push(record);
    }
  }

  listEntities(workspaceId: string) {
    return this.state.entities.filter((item) => item.workspaceId === workspaceId);
  }

  deleteEntity(id: string) {
    this.state.entities = this.state.entities.filter((item) => item.id !== id);
  }

  deleteEntitiesByWorkspace(workspaceId: string) {
    this.state.entities = this.state.entities.filter((item) => item.workspaceId !== workspaceId);
  }

  deleteCard(id: string) {
    this.state.cards = this.state.cards.filter((card) => card.id !== id);
    this.state.cardRevisions = this.state.cardRevisions.filter((revision) => revision.cardId !== id);
  }

  /**
   * 基于关键词包含匹配与简易评分，检索与查询文本最相关的卡片（内存实现）。
   * 标题匹配权重高于正文匹配，按评分降序排序，限制返回数量。
   * 若查询字符串无有效搜索词，返回按更新时间排序的前 limit 条。
   * @author fxbin
   * @param {string} workspaceId - 知识库ID
   * @param {string} query - 查询文本
   * @param {number} limit - 最大返回数量
   * @returns {KnowledgeCard[]} 按相关性排序的卡片数组
   */
  searchCardsByRelevance(workspaceId: string, query: string, limit: number): KnowledgeCard[] {
    const cards = this.listCards(workspaceId);
    const terms = extractSearchTerms(query);
    if (terms.length === 0) return cards.slice(0, limit);
    const scored = cards
      .map((card) => ({ card, score: scoreTextRelevance(card.title, card.body, terms) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((item) => item.card);
  }

  /**
   * 基于关键词包含匹配与简易评分，检索与查询文本最相关的资料（内存实现）。
   * 标题匹配权重高于正文匹配，按评分降序排序，限制返回数量。
   * 若查询字符串无有效搜索词，返回按创建时间排序的前 limit 条。
   * @author fxbin
   * @param {string} workspaceId - 知识库ID
   * @param {string} query - 查询文本
   * @param {number} limit - 最大返回数量
   * @returns {MaterialRecord[]} 按相关性排序的资料数组
   */
  searchMaterialsByRelevance(workspaceId: string, query: string, limit: number): MaterialRecord[] {
    const materials = this.listMaterials(workspaceId);
    const terms = extractSearchTerms(query);
    if (terms.length === 0) return materials.slice(0, limit);
    const scored = materials
      .map((material) => ({
        material,
        score: scoreTextRelevance(material.title, material.contentText ?? material.rawInput, terms),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((item) => item.material);
  }

  insertConflictAudit(entry: ConflictAuditEntry) {
    this.state.conflictAudit.unshift(entry);
  }

  listConflictAudit(limit?: number) {
    const sorted = [...this.state.conflictAudit].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    return typeof limit === 'number' ? sorted.slice(0, limit) : sorted;
  }

  insertTask(task: AgentTask) {
    this.state.tasks.unshift(task);
  }

  updateTask(task: AgentTask) {
    const index = this.state.tasks.findIndex((item) => item.id === task.id);
    if (index >= 0) this.state.tasks[index] = task;
  }

  listTasks(limit?: number) {
    return typeof limit === 'number' ? this.state.tasks.slice(0, limit) : this.state.tasks;
  }

  findTask(id: string) {
    return this.state.tasks.find((item) => item.id === id);
  }

  insertArtifact(artifact: ArtifactRecord) {
    this.state.artifacts.unshift(artifact);
  }

  updateArtifact(artifact: ArtifactRecord) {
    const index = this.state.artifacts.findIndex((item) => item.id === artifact.id);
    if (index >= 0) this.state.artifacts[index] = artifact;
  }

  listArtifacts(workspaceId?: string, limit?: number) {
    const artifacts = workspaceId
      ? this.state.artifacts.filter((item) => item.workspaceId === workspaceId)
      : this.state.artifacts;
    return typeof limit === 'number' ? artifacts.slice(0, limit) : artifacts;
  }

  findArtifact(artifactId: string) {
    return this.state.artifacts.find((item) => item.id === artifactId);
  }

  insertArtifactRevision(revision: ArtifactRevision) {
    this.state.artifactRevisions.push(revision);
  }

  listArtifactRevisions(artifactId: string) {
    return this.state.artifactRevisions
      .filter((item) => item.artifactId === artifactId)
      .sort((a, b) => a.version - b.version);
  }

  insertMessage(message: ChatMessage) {
    this.state.messages.push(message);
  }

  listMessages(workspaceId: string, limit?: number) {
    const messages = this.state.messages
      .filter((item) => item.workspaceId === workspaceId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return typeof limit === 'number' ? messages.slice(-limit) : messages;
  }

  findMessage(messageId: string) {
    return this.state.messages.find((item) => item.id === messageId);
  }

  updateMessageAcceptedCards(messageId: string, cardIds: string[]) {
    const message = this.state.messages.find((item) => item.id === messageId);
    if (message) {
      message.cardIds = cardIds;
      message.proposedCards = undefined;
    }
  }

  readModelProviderConfig() {
    return this.state.modelProviderConfig;
  }

  writeModelProviderConfig(config: PersistedModelProviderConfig) {
    this.state.modelProviderConfig = config;
  }

  listModelProviderProfiles() {
    return [...this.state.modelProviderProfiles];
  }

  findModelProviderProfile(id: string) {
    return this.state.modelProviderProfiles.find((record) => record.id === id);
  }

  insertModelProviderProfile(record: ModelProviderProfileRecord) {
    this.state.modelProviderProfiles.push(record);
  }

  updateModelProviderProfile(record: ModelProviderProfileRecord) {
    const index = this.state.modelProviderProfiles.findIndex((item) => item.id === record.id);
    if (index >= 0) this.state.modelProviderProfiles[index] = record;
  }

  deleteModelProviderProfile(id: string) {
    this.state.modelProviderProfiles = this.state.modelProviderProfiles.filter((item) => item.id !== id);
  }

  clearModelProviderProfileDefault() {
    for (const record of this.state.modelProviderProfiles) {
      if (record.isDefault) record.isDefault = false;
    }
  }

  readWeReadApiKey(): string | null {
    return this.wereadApiKey;
  }

  writeWeReadApiKey(apiKey: string) {
    this.wereadApiKey = apiKey;
  }

  deleteWeReadApiKey() {
    this.wereadApiKey = null;
  }

  private dataAccountBook: DataAccountBook | null = null;
  private verificationCoverageMap: Map<string, VerificationCoverage> = new Map();

  readDataAccountBook(): DataAccountBook | null {
    return this.dataAccountBook;
  }

  writeDataAccountBook(book: DataAccountBook): void {
    this.dataAccountBook = book;
  }

  readVerificationCoverage(bookId: string): VerificationCoverage | null {
    return this.verificationCoverageMap.get(bookId) ?? null;
  }

  writeVerificationCoverage(coverage: VerificationCoverage): void {
    this.verificationCoverageMap.set(coverage.bookId, coverage);
  }

  private wereadBookMeta: WeReadBookMetaRow[] = [];
  private wereadSyncState: WeReadSyncStateRow | null = null;

  syncWeReadBookMeta(books: WeReadShelfBook[], archiveYearMap: Map<string, string>): void {
    const nowIso = now();
    const seenIds = new Set<string>();
    for (const book of books) {
      seenIds.add(book.bookId);
      const existing = this.wereadBookMeta.find((row) => row.bookId === book.bookId);
      if (existing) {
        existing.bookIdLong = book.bookIdLong ?? null;
        existing.title = book.title;
        existing.author = book.author;
        existing.cover = book.cover ?? null;
        existing.category = book.category ?? null;
        existing.finishReading = book.finishReading ?? 0;
        existing.readUpdateTime = book.readUpdateTime ?? null;
        existing.secret = book.secret ?? 0;
        existing.archiveYear = archiveYearMap.get(book.bookId) ?? null;
        existing.presentOnShelf = 1;
        existing.lastSyncedAt = nowIso;
      } else {
        this.wereadBookMeta.push({
          bookId: book.bookId,
          bookIdLong: book.bookIdLong ?? null,
          title: book.title,
          author: book.author,
          cover: book.cover ?? null,
          category: book.category ?? null,
          finishReading: book.finishReading ?? 0,
          readUpdateTime: book.readUpdateTime ?? null,
          secret: book.secret ?? 0,
          archiveYear: archiveYearMap.get(book.bookId) ?? null,
          presentOnShelf: 1,
          materialId: null,
          bookmarkCount: null,
          reviewCount: null,
          chapterCount: null,
          longReviewCount: null,
          signalsSyncedAt: null,
          signalsHash: null,
          firstSeenAt: nowIso,
          lastSyncedAt: nowIso,
        });
      }
    }
    for (const row of this.wereadBookMeta) {
      if (!seenIds.has(row.bookId)) {
        row.presentOnShelf = 0;
      }
    }
  }

  readWeReadBookMetaList(): WeReadBookMetaRow[] {
    return this.wereadBookMeta.filter((row) => row.presentOnShelf === 1);
  }

  readAllWeReadBookMetaList(): WeReadBookMetaRow[] {
    return [...this.wereadBookMeta];
  }

  readWeReadSyncState(): WeReadSyncStateRow | null {
    return this.wereadSyncState;
  }

  writeWeReadSyncState(state: WeReadSyncStateRow): void {
    this.wereadSyncState = state;
  }

  updateWeReadBookMetaImport(bookId: string, materialId: string, bookmarkCount: number): void {
    const row = this.wereadBookMeta.find((row) => row.bookId === bookId);
    if (row) {
      row.materialId = materialId;
      row.bookmarkCount = bookmarkCount;
    }
  }

  updateWeReadBookMetaSignals(input: {
    bookId: string;
    bookmarkCount: number;
    reviewCount: number;
    chapterCount: number;
    longReviewCount: number;
    signalsSyncedAt: string;
    signalsHash: string;
  }): boolean {
    const row = this.wereadBookMeta.find((row) => row.bookId === input.bookId);
    if (row) {
      if (row.signalsHash === input.signalsHash) {
        return false;
      }
      row.bookmarkCount = input.bookmarkCount;
      row.reviewCount = input.reviewCount;
      row.chapterCount = input.chapterCount;
      row.longReviewCount = input.longReviewCount;
      row.signalsSyncedAt = input.signalsSyncedAt;
      row.signalsHash = input.signalsHash;
      return true;
    }
    return false;
  }

  private hiddenInterestState: HiddenInterestState | null = null;
  private dataPortabilityRecords: DataPortabilityRecord[] = [];
  private readerModeState: ReaderModeState | null = null;

  /**
   * 读取隐性真兴趣提示的持久化状态（NS-8）。
   */
  readHiddenInterestState(): HiddenInterestState | null {
    return this.hiddenInterestState;
  }

  /**
   * 保存隐性真兴趣提示状态（NS-8），写入时做浅拷贝以隔离外部变更。
   */
  saveHiddenInterestState(state: HiddenInterestState): void {
    this.hiddenInterestState = { ...state };
  }

  /**
   * 记录一条数据可携导出（NS-8），新记录置顶。
   */
  recordDataPortability(record: DataPortabilityRecord): void {
    this.dataPortabilityRecords = [record, ...this.dataPortabilityRecords];
  }

  /**
   * 列出全部数据可携导出记录（NS-8），按创建时间倒序返回副本。
   */
  listDataPortability(): DataPortabilityRecord[] {
    return [...this.dataPortabilityRecords].sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * 撤回指定数据可携导出记录（NS-8），写入撤回时间戳。
   */
  revokeDataPortability(id: string, revokedAt: number): void {
    this.dataPortabilityRecords = this.dataPortabilityRecords.map((record) =>
      record.id === id ? { ...record, revokedAt } : record,
    );
  }

  /**
   * 读取阅读模式（受众档位）持久化状态（NS-8）。
   */
  readReaderModeState(): ReaderModeState | null {
    return this.readerModeState;
  }

  /**
   * 保存阅读模式状态（NS-8），写入时做浅拷贝以隔离外部变更。
   */
  saveReaderModeState(state: ReaderModeState): void {
    this.readerModeState = { ...state };
  }

  computeWeReadStats(): WeReadStatsResponse {
    const rows = this.wereadBookMeta.filter((row) => row.presentOnShelf === 1);
    const totalBooks = rows.length;
    const finishedBooks = rows.filter((row) => row.finishReading === 1).length;
    const importedToZhijing = rows.filter((row) => row.materialId !== null).length;
    const nowSec = Math.floor(Date.now() / 1000);
    const activeLast7Days = rows.filter((row) => row.readUpdateTime && row.readUpdateTime >= nowSec - 7 * 86400).length;
    const activeLast30Days = rows.filter((row) => row.readUpdateTime && row.readUpdateTime >= nowSec - 30 * 86400).length;

    const categoryMap = new Map<string, number>();
    for (const row of rows) {
      const cat = row.category || '未分类';
      categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + 1);
    }
    const categoryDistribution: WeReadCategorySlice[] = Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    const yearMap = new Map<string, number>();
    for (const row of rows) {
      if (row.archiveYear) {
        yearMap.set(row.archiveYear, (yearMap.get(row.archiveYear) ?? 0) + 1);
      }
    }
    const archiveYearTrend: WeReadYearTrend[] = Array.from(yearMap.entries())
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => (a.year ?? '').localeCompare(b.year ?? ''));

    const monthMap = new Map<string, number>();
    for (const row of rows) {
      if (row.readUpdateTime && row.readUpdateTime > 0) {
        const date = new Date(row.readUpdateTime * 1000);
        const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthMap.set(month, (monthMap.get(month) ?? 0) + 1);
      }
    }
    const monthlyActivity: WeReadMonthlyActivity[] = Array.from(monthMap.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const topBooks: WeReadRecentBook[] = rows
      .filter((row) => row.readUpdateTime !== null)
      .sort((a, b) => (b.readUpdateTime ?? 0) - (a.readUpdateTime ?? 0))
      .slice(0, 5)
      .map((row) => ({
        bookId: row.bookId,
        title: row.title,
        author: row.author,
        cover: row.cover,
        readUpdateTime: row.readUpdateTime,
        finishReading: row.finishReading === 1,
      }));

    return {
      totalBooks,
      finishedBooks,
      inProgressBooks: totalBooks - finishedBooks,
      importedToZhijing,
      categoryDistribution,
      archiveYearTrend,
      monthlyActivity,
      recentReading: { activeLast7Days, activeLast30Days, topBooks },
      lastSyncedAt: this.wereadSyncState?.lastFullSyncAt ?? null,
      lastSyncError: this.wereadSyncState?.lastSyncError ?? null,
    };
  }

  /**
   * 插入一条注意力信号记录（内存实现）。
   * @param signal - 注意力信号对象
   * @author fxbin
   */
  insertAttentionSignal(signal: AttentionSignal): void {
    this.state.attentionSignals.unshift(signal);
  }

  /**
   * 查询注意力信号列表，按创建时间降序排序（内存实现）。
   * @param workspaceId - 可选，知识库 ID 过滤
   * @param limit - 可选，最大返回数量，默认 ATTENTION_LOG_LIMIT
   * @returns 注意力信号数组
   * @author fxbin
   */
  listAttentionSignals(workspaceId?: string, limit?: number): AttentionSignal[] {
    const signals = workspaceId
      ? this.state.attentionSignals.filter((item) => item.workspaceId === workspaceId)
      : this.state.attentionSignals;
    const sorted = [...signals].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    const maxRows = typeof limit === 'number' ? limit : ATTENTION_LOG_LIMIT;
    return sorted.slice(0, maxRows);
  }

  /**
   * 标记注意力信号为已消费（内存实现）。
   * @param signalId - 信号 ID
   * @author fxbin
   */
  markAttentionConsumed(signalId: string): void {
    const signal = this.state.attentionSignals.find((item) => item.id === signalId);
    if (signal) signal.consumed = true;
  }

  /**
   * 删除指定知识库的所有注意力信号（内存实现）。
   * @param workspaceId - 知识库 ID
   * @author fxbin
   */
  deleteAttentionSignals(workspaceId: string): void {
    this.state.attentionSignals = this.state.attentionSignals.filter(
      (item) => item.workspaceId !== workspaceId,
    );
  }

  insertProposal(proposal: PersistedProposal): void {
    this.state.proposals.unshift(proposal);
  }

  listProposals(workspaceId: string, status?: ProposalStatus, limit?: number): PersistedProposal[] {
    let items = this.state.proposals.filter((p) => p.workspaceId === workspaceId);
    if (status) items = items.filter((p) => p.status === status);
    items.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
    return typeof limit === 'number' ? items.slice(0, limit) : items;
  }

  updateProposalStatus(proposalId: string, status: ProposalStatus, decidedAt: string): void {
    const proposal = this.state.proposals.find((p) => p.id === proposalId);
    if (proposal) {
      proposal.status = status;
      proposal.decidedAt = decidedAt;
    }
  }

  findRecentProposals(workspaceId: string, type: string, title: string, sinceIso: string): PersistedProposal[] {
    return this.state.proposals.filter(
      (p) => p.workspaceId === workspaceId
        && p.type === type
        && p.title === title
        && p.generatedAt >= sinceIso,
    );
  }

  recordAgentUsage(record: AgentUsageRecord): void {
    this.state.agentUsage.unshift(record);
  }

  listAgentUsage(query: AgentUsageQuery): AgentUsageRecord[] {
    const filter = buildUsageFilter(query);
    const filtered = this.state.agentUsage.filter(filter);
    return applyQueryLimit(filtered, query);
  }

  summarizeAgentUsage(query: AgentUsageQuery): AgentUsageSummary {
    const filter = buildUsageFilter(query);
    const filtered = this.state.agentUsage.filter(filter);
    return buildUsageSummary(filtered);
  }

  compareAgentUsage(query: AgentUsageQuery): AgentUsageComparison {
    const filter = buildUsageFilter(query);
    const filtered = this.state.agentUsage.filter(filter);
    return buildUsageComparison(filtered);
  }

  persistAgentChatTurn(record: PersistAgentChatTurnRequest): void {
    const nowIso = now();
    const existing = this.state.agentChatSessions.find((item) => item.sessionId === record.session.sessionId);
    const rawMessages = record.rawMessages;
    const messageRecords = buildAgentChatMessageRecords(record.session.sessionId, record.session.workspaceId, rawMessages);
    const nextSession: AgentChatSessionInfo = {
      ...record.session,
      title: existing?.title ?? record.session.title,
      messageCount: messageRecords.length,
      lastUsedAt: record.session.lastUsedAt || nowIso,
      updatedAt: record.session.updatedAt || nowIso,
      lastRun: record.run,
    };
    this.state.agentChatSessions = [
      nextSession,
      ...this.state.agentChatSessions.filter((item) => item.sessionId !== record.session.sessionId),
    ];
    this.state.agentChatRawMessages[record.session.sessionId] = rawMessages;
    this.state.agentChatMessages = [
      ...this.state.agentChatMessages.filter((item) => item.sessionId !== record.session.sessionId),
      ...messageRecords,
    ];
    this.state.agentChatRuns = [
      record.run,
      ...this.state.agentChatRuns.filter((item) => item.id !== record.run.id),
    ];
    this.state.agentChatToolCalls = [
      ...this.state.agentChatToolCalls.filter((item) => item.runId !== record.run.id),
      ...record.toolCalls,
    ];
  }

  listAgentChatSessions(workspaceId: string): AgentChatSessionInfo[] {
    return this.state.agentChatSessions
      .filter((item) => item.workspaceId === workspaceId)
      .sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt));
  }

  getAgentChatSession(sessionId: string, workspaceId: string): AgentChatSessionDetail | null {
    const session = this.state.agentChatSessions.find((item) => item.sessionId === sessionId && item.workspaceId === workspaceId);
    if (!session) return null;
    const runs = this.state.agentChatRuns
      .filter((item) => item.sessionId === sessionId && item.workspaceId === workspaceId)
      .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
    return {
      ...session,
      messages: this.state.agentChatRawMessages[sessionId] ?? [],
      messageRecords: this.state.agentChatMessages
        .filter((item) => item.sessionId === sessionId && item.workspaceId === workspaceId)
        .sort((a, b) => a.sequence - b.sequence),
      runs,
      toolCalls: this.state.agentChatToolCalls
        .filter((item) => item.sessionId === sessionId && item.workspaceId === workspaceId)
        .sort((a, b) => a.startedAt.localeCompare(b.startedAt)),
    };
  }

  renameAgentChatSession(sessionId: string, workspaceId: string, title: string): boolean {
    const trimmed = title.trim();
    if (!trimmed) return false;
    const session = this.state.agentChatSessions.find((item) => item.sessionId === sessionId && item.workspaceId === workspaceId);
    if (!session) return false;
    session.title = trimmed;
    session.updatedAt = now();
    return true;
  }

  deleteAgentChatSession(sessionId: string, workspaceId: string): boolean {
    const before = this.state.agentChatSessions.length;
    this.state.agentChatSessions = this.state.agentChatSessions.filter((item) => !(item.sessionId === sessionId && item.workspaceId === workspaceId));
    if (before === this.state.agentChatSessions.length) return false;
    this.state.agentChatMessages = this.state.agentChatMessages.filter((item) => item.sessionId !== sessionId);
    this.state.agentChatRuns = this.state.agentChatRuns.filter((item) => item.sessionId !== sessionId);
    this.state.agentChatToolCalls = this.state.agentChatToolCalls.filter((item) => item.sessionId !== sessionId);
    delete this.state.agentChatRawMessages[sessionId];
    return true;
  }

  getAgentChatRawMessages(sessionId: string, workspaceId: string): unknown[] | null {
    const session = this.state.agentChatSessions.find((item) => item.sessionId === sessionId && item.workspaceId === workspaceId);
    if (!session) return null;
    return this.state.agentChatRawMessages[sessionId] ?? [];
  }

  truncateAgentChatSessionForRetry(sessionId: string, workspaceId: string): AgentChatRetryResult {
    const rawMessages = this.getAgentChatRawMessages(sessionId, workspaceId);
    if (!rawMessages) return { ok: false, beforeCount: 0, remainingCount: 0, truncated: false };
    const lastUserIndex = findLastUserMessageIndex(rawMessages);
    if (lastUserIndex < 0) {
      return { ok: false, beforeCount: rawMessages.length, remainingCount: rawMessages.length, truncated: false };
    }
    const remaining = rawMessages.slice(0, lastUserIndex);
    this.state.agentChatRawMessages[sessionId] = remaining;
    const records = buildAgentChatMessageRecords(sessionId, workspaceId, remaining);
    this.state.agentChatMessages = [
      ...this.state.agentChatMessages.filter((item) => item.sessionId !== sessionId),
      ...records,
    ];
    const session = this.state.agentChatSessions.find((item) => item.sessionId === sessionId && item.workspaceId === workspaceId);
    if (session) {
      session.messageCount = records.length;
      session.updatedAt = now();
      session.lastUsedAt = session.updatedAt;
    }
    return { ok: true, beforeCount: rawMessages.length, remainingCount: remaining.length, truncated: true };
  }

  insertUserMemory(record: UserMemory): void {
    this.state.userMemory.push(record);
  }

  updateUserMemory(id: string, patch: UpdateUserMemoryRequest): UserMemory | undefined {
    const record = this.state.userMemory.find((item) => item.id === id);
    if (!record) return undefined;
    if (patch.value !== undefined) record.value = patch.value;
    if (patch.scope !== undefined) record.scope = patch.scope;
    record.updatedAt = now();
    return record;
  }

  deleteUserMemory(id: string): boolean {
    const index = this.state.userMemory.findIndex((item) => item.id === id);
    if (index === -1) return false;
    this.state.userMemory.splice(index, 1);
    return true;
  }

  findUserMemory(id: string): UserMemory | undefined {
    return this.state.userMemory.find((item) => item.id === id);
  }

  listUserMemory(query: UserMemoryQuery): UserMemory[] {
    const filter = buildUserMemoryFilter(query);
    const filtered = this.state.userMemory.filter(filter);
    return applyUserMemoryLimit(filtered, query);
  }

  insertDecisionLog(record: DecisionLog): void {
    this.state.decisionLog.push(record);
  }

  findDecisionLog(id: string): DecisionLog | undefined {
    return this.state.decisionLog.find((item) => item.id === id);
  }

  listDecisionLog(query: DecisionLogQuery): DecisionLog[] {
    const filter = buildDecisionLogFilter(query);
    const filtered = this.state.decisionLog.filter(filter);
    return applyDecisionLogLimit(filtered, query);
  }

  deleteDecisionLog(id: string): boolean {
    const index = this.state.decisionLog.findIndex((item) => item.id === id);
    if (index === -1) return false;
    this.state.decisionLog.splice(index, 1);
    return true;
  }

  /**
   * 插入 Agent 行为日志（内存实现）。
   * @param log - 行为日志记录
   * @author fxbin
   */
  insertAgentActionLog(log: AgentActionLog): void {
    this.state.agentActionLogs.unshift(log);
  }

  /**
   * 查询 Agent 行为日志（内存实现）。
   * @param options - 查询选项
   * @author fxbin
   */
  listAgentActionLogs(options?: { workspaceId?: string; action?: string; limit?: number }): AgentActionLog[] {
    let logs = this.state.agentActionLogs;
    if (options?.workspaceId) {
      logs = logs.filter((log) => log.workspaceId === options.workspaceId);
    }
    if (options?.action) {
      logs = logs.filter((log) => log.action === options.action);
    }
    const limit = options?.limit ?? AGENT_ACTION_LOG_DEFAULT_LIMIT;
    return logs.slice(0, limit);
  }

  /**
   * 统计 Agent 行为日志数量（内存实现）。
   * @param options - 查询选项
   * @author fxbin
   */
  countAgentActionLogs(options?: { workspaceId?: string; action?: string }): number {
    return this.listAgentActionLogs({ ...options, limit: AGENT_ACTION_LOG_MAX_LIMIT }).length;
  }

  /**
   * 执行 inspect SQL 查询（内存实现，仅支持简单过滤）。
   * @param sql - SQL 语句（内存实现仅做简单解析）
   * @param limit - 最大返回行数
   * @author fxbin
   */
  executeInspectQuery(sql: string, limit?: number): Array<Record<string, unknown>> {
    const maxRows = limit ?? AGENT_ACTION_LOG_DEFAULT_LIMIT;
    const lowerSql = sql.toLowerCase();
    if (lowerSql.includes(AGENT_ACTION_LOG_TABLE_NAME)) {
      return this.state.agentActionLogs.slice(0, maxRows).map((log) => log as unknown as Record<string, unknown>);
    }
    if (lowerSql.includes('attention_log')) {
      return this.state.attentionSignals.slice(0, maxRows).map((signal) => signal as unknown as Record<string, unknown>);
    }
    return [];
  }

  /**
   * 列出 inspect 可用的表（内存实现，返回虚拟表列表）。
   * @author fxbin
   */
  listInspectTables(): Array<{ name: string; sql: string }> {
    return [
      { name: AGENT_ACTION_LOG_TABLE_NAME, sql: 'CREATE TABLE agent_action_log (id, action, workspace_id, input_json, output_json, duration_ms, success, error, created_at)' },
      { name: 'attention_log', sql: 'CREATE TABLE attention_log (id, workspace_id, signal_type, signal_strength, target_type, target_id, context_data_json, consumed, created_at)' },
    ];
  }
}

type WorkspaceRow = {
  id: string;
  title: string;
  summary: string;
  stage: WorkspaceSummary['stage'];
  source_count: number;
  card_count: number;
  sourced_ratio: number;
  created_at: string;
  updated_at: string;
};

type MaterialRow = {
  id: string;
  workspace_id: string;
  type: MaterialRecord['type'];
  raw_input: string;
  source_url: string | null;
  platform: string | null;
  title: string;
  content_text: string | null;
  media_urls_json: string | null;
  parse_status: MaterialRecord['parseStatus'];
  parse_error: string | null;
  transcript: string | null;
  transcript_status: MaterialRecord['transcriptStatus'] | null;
  transcript_error: string | null;
  created_at: string;
  status_timeline_json: string | null;
  archived: number;
};

type CardRow = {
  id: string;
  workspace_id: string;
  material_id: string | null;
  type: KnowledgeCard['type'];
  title: string;
  body: string;
  claim_status: KnowledgeCard['claimStatus'];
  recall_json: string | null;
  created_at: string;
  updated_at: string;
  archived: number;
};

type CardRevisionRow = {
  id: string;
  card_id: string;
  version: number;
  title_snapshot: string;
  body_snapshot: string;
  type_snapshot: KnowledgeCard['type'];
  claim_status_snapshot: KnowledgeCard['claimStatus'];
  changed_fields_json: string;
  created_at: string;
};

type TaskRow = {
  id: string;
  workflow: AgentTask['workflow'];
  status: AgentTask['status'];
  input_json: string;
  output_json: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};

type ArtifactRow = {
  id: string;
  workspace_id: string;
  artifact_type: ArtifactRecord['artifactType'];
  subtype: string;
  title: string;
  body: string;
  source_material_ids_json: string;
  sections_json: string | null;
  created_at: string;
};

type ArtifactRevisionRow = {
  id: string;
  artifact_id: string;
  version: number;
  section_id: string;
  section_title_snapshot: string;
  section_body_snapshot: string;
  changed_fields_json: string;
  created_at: string;
};

type MessageRow = {
  id: string;
  workspace_id: string;
  question: string;
  answer: string;
  card_ids_json: string;
  artifact_id: string | null;
  material_id: string | null;
  created_at: string;
  proposed_cards_json: string | null;
};

type ModelProviderSettingsRow = {
  id: string;
  provider: string;
  model: string;
  base_url: string | null;
  api_key: string | null;
  enabled: number;
  fallback_to_mock: number;
  updated_at: string;
};

type ModelProviderProfileRow = {
  id: string;
  name: string;
  provider: string;
  model: string;
  base_url: string | null;
  api_key: string | null;
  enabled: number;
  fallback_to_mock: number;
  is_default: number;
  created_at: string;
  updated_at: string;
};

type WeReadSettingsRow = {
  id: string;
  api_key: string;
  updated_at: string;
};

type DataAccountRow = {
  key: string;
  label: string;
  tier: string;
  dependent_metrics_json: string;
  exportable: number;
  updated_at: string;
};

type DataAccountMetaRow = {
  id: string;
  minimal_mode: number;
  updated_at: string;
};

type VerificationStateRow = {
  book_id: string;
  verified: number;
  verified_at: string | null;
  passed_count: number;
  attempts: number;
  updated_at: string;
};

class SqliteKnowledgeRepository implements KnowledgeRepository {
  private readonly db: DatabaseSync;

  constructor(private readonly path: string) {
    mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.migrate();
  }

  insertWorkspace(base: WorkspaceSummary) {
    this.db.prepare(`
      INSERT INTO workspaces (
        id, title, summary, stage, source_count, card_count, sourced_ratio, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(base.id, base.title, base.summary, base.stage, base.sourceCount, base.cardCount, base.sourcedRatio, base.createdAt, base.updatedAt);
  }

  updateWorkspace(base: WorkspaceSummary) {
    this.db.prepare(`
      UPDATE workspaces
      SET title = ?, summary = ?, stage = ?, source_count = ?, card_count = ?, sourced_ratio = ?, updated_at = ?
      WHERE id = ?
    `).run(base.title, base.summary, base.stage, base.sourceCount, base.cardCount, base.sourcedRatio, base.updatedAt, base.id);
  }

  listWorkspaces() {
    return (this.db.prepare('SELECT * FROM workspaces ORDER BY updated_at DESC, created_at DESC').all() as WorkspaceRow[]).map(mapWorkspace);
  }

  findWorkspace(id: string) {
    const row = this.db.prepare('SELECT * FROM workspaces WHERE id = ?').get(id) as WorkspaceRow | undefined;
    return row ? mapWorkspace(row) : undefined;
  }

  findWorkspaceByTitle(title: string) {
    const row = this.db.prepare('SELECT * FROM workspaces WHERE title = ? LIMIT 1').get(title) as WorkspaceRow | undefined;
    return row ? mapWorkspace(row) : undefined;
  }

  /**
   * 删除知识库及其关联数据。
   *
   * 先清理 FTS5 虚拟表中的孤立索引行（FTS5 不支持外键级联），
   * 再删除主表记录，依赖 ON DELETE CASCADE 级联清理 materials/cards。
   *
   * @param id - 知识库 ID
   * @author fxbin
   */
  deleteWorkspace(id: string) {
    this.db.exec('BEGIN');
    try {
      this.db.prepare('DELETE FROM cards_fts WHERE workspace_id = ?').run(id);
      this.db.prepare('DELETE FROM materials_fts WHERE workspace_id = ?').run(id);
      this.db.prepare('DELETE FROM attention_log WHERE workspace_id = ?').run(id);
      this.db.prepare('DELETE FROM workspaces WHERE id = ?').run(id);
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  insertMaterial(material: MaterialRecord) {
    this.db.prepare(`
      INSERT INTO materials (
        id, workspace_id, type, raw_input, source_url, platform, title, content_text, media_urls_json, parse_status, parse_error, transcript, transcript_status, transcript_error, created_at, archived
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      material.id,
      resolveWorkspaceId(material.workspaceId),
      material.type,
      material.rawInput,
      material.sourceUrl ?? null,
      material.platform ?? null,
      material.title,
      material.contentText ?? null,
      JSON.stringify(material.mediaUrls ?? []),
      material.parseStatus,
      material.parseError ?? null,
      material.transcript ?? null,
      material.transcriptStatus ?? null,
      material.transcriptError ?? null,
      material.createdAt,
      material.archived ? 1 : 0,
    );
    this.upsertMaterialFts(material);
  }

  updateMaterial(material: MaterialRecord) {
    this.db.prepare(`
      UPDATE materials
      SET workspace_id = ?, type = ?, raw_input = ?, source_url = ?, platform = ?, title = ?, content_text = ?, media_urls_json = ?, parse_status = ?, parse_error = ?, transcript = ?, transcript_status = ?, transcript_error = ?, created_at = ?, archived = ?
      WHERE id = ?
    `).run(
      resolveWorkspaceId(material.workspaceId),
      material.type,
      material.rawInput,
      material.sourceUrl ?? null,
      material.platform ?? null,
      material.title,
      material.contentText ?? null,
      JSON.stringify(material.mediaUrls ?? []),
      material.parseStatus,
      material.parseError ?? null,
      material.transcript ?? null,
      material.transcriptStatus ?? null,
      material.transcriptError ?? null,
      material.createdAt,
      material.archived ? 1 : 0,
      material.id,
    );
    this.upsertMaterialFts(material);
  }

  findMaterial(id: string) {
    const row = this.db.prepare('SELECT * FROM materials WHERE id = ?').get(id) as MaterialRow | undefined;
    return row ? mapMaterial(row) : undefined;
  }

  findCard(id: string) {
    const row = this.db.prepare('SELECT * FROM cards WHERE id = ?').get(id) as CardRow | undefined;
    return row ? mapCard(row) : undefined;
  }

  listMaterials(workspaceId?: string, limit?: number) {
    const rows = workspaceId
      ? this.db.prepare('SELECT * FROM materials WHERE workspace_id = ? AND archived = 0 ORDER BY created_at DESC').all(workspaceId)
      : this.db.prepare(`SELECT * FROM materials WHERE archived = 0 ORDER BY created_at DESC${limit ? ` LIMIT ${limit}` : ''}`).all();
    return (rows as MaterialRow[]).map(mapMaterial);
  }

  queryMaterialsPaged(options: MaterialQueryOptions): MaterialQueryResult {
    const limit = typeof options.limit === 'number' && options.limit > 0 ? options.limit : 20;
    const query = options.query?.trim();
    const cursorCreatedAt = options.cursorCreatedAt?.trim();
    const cursorId = options.cursorId?.trim();
    const hasCursor = Boolean(cursorCreatedAt && cursorId);

    const where: string[] = ['archived = 0'];
    const params: (string | number)[] = [];
    if (options.workspaceId) {
      where.push('workspace_id = ?');
      params.push(options.workspaceId);
    }
    if (options.type) {
      where.push('type = ?');
      params.push(options.type);
    }
    if (options.parseStatus) {
      where.push('parse_status = ?');
      params.push(options.parseStatus);
    }
    if (query) {
      where.push('(LOWER(title) LIKE ? OR LOWER(COALESCE(content_text, \'\')) LIKE ? OR LOWER(COALESCE(raw_input, \'\')) LIKE ?)');
      const like = `%${query.toLowerCase()}%`;
      params.push(like, like, like);
    }
    if (hasCursor) {
      where.push('(created_at < ? OR (created_at = ? AND id < ?))');
      params.push(cursorCreatedAt as string, cursorCreatedAt as string, cursorId as string);
    }

    const sql = `SELECT * FROM materials WHERE ${where.join(' AND ')} ORDER BY created_at DESC, id DESC LIMIT ?`;
    params.push(limit + 1);

    const rows = this.db.prepare(sql).all(...params) as MaterialRow[];
    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    const materials = slice.map(mapMaterial);
    const last = materials[materials.length - 1];
    const nextCursor = hasMore && last ? { createdAt: last.createdAt, id: last.id } : null;
    return { materials, nextCursor, hasMore };
  }

  archiveMaterial(id: string) {
    this.db.prepare('UPDATE materials SET archived = 1 WHERE id = ?').run(id);
    const material = this.findMaterial(id);
    if (material) upsertMaterialInZvec(toMaterialIndexInput(material));
  }

  unarchiveMaterial(id: string) {
    this.db.prepare('UPDATE materials SET archived = 0 WHERE id = ?').run(id);
    const material = this.findMaterial(id);
    if (material) upsertMaterialInZvec(toMaterialIndexInput(material));
  }

  listArchivedMaterials(workspaceId?: string) {
    const rows = workspaceId
      ? this.db.prepare('SELECT * FROM materials WHERE workspace_id = ? AND archived = 1 ORDER BY created_at DESC').all(workspaceId)
      : this.db.prepare('SELECT * FROM materials WHERE archived = 1 ORDER BY created_at DESC').all();
    return (rows as MaterialRow[]).map(mapMaterial);
  }

  deleteMaterial(id: string) {
    this.db.exec('BEGIN');
    try {
      this.db.prepare('UPDATE cards SET material_id = NULL WHERE material_id = ?').run(id);
      this.db.prepare('DELETE FROM materials WHERE id = ?').run(id);
      this.deleteMaterialFts(id);
      deleteMaterialFromZvec(id);
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  /**
   * 读取知识库的节点拖拽位置。
   * @param {string} workspaceId - 知识库 ID
   * @returns {Array<{nodeId: string; x: number; y: number}>} 节点位置数组
   */
  getNodePositions(workspaceId: string) {
    const rows = this.db
      .prepare('SELECT node_id, x, y FROM workspace_node_positions WHERE workspace_id = ?')
      .all(workspaceId) as Array<{ node_id: string; x: number; y: number }>;
    return rows.map((row) => ({ nodeId: row.node_id, x: row.x, y: row.y }));
  }

  /**
   * 保存或覆盖知识库的节点拖拽位置。
   * @param {string} workspaceId - 知识库 ID
   * @param {Array<{nodeId: string; x: number; y: number}>} positions - 节点位置数组
   */
  saveNodePositions(workspaceId: string, positions: Array<{ nodeId: string; x: number; y: number }>) {
    const upsert = this.db.prepare(`
      INSERT INTO workspace_node_positions (workspace_id, node_id, x, y, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(workspace_id, node_id) DO UPDATE SET
        x = excluded.x,
        y = excluded.y,
        updated_at = excluded.updated_at
    `);
    const timestamp = now();
    this.db.exec('BEGIN');
    try {
      for (const position of positions) {
        upsert.run(workspaceId, position.nodeId, position.x, position.y, timestamp);
      }
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  /**
   * 确保 map_custom_edges 表存在（P12-2）。
   */
  private ensureMapCustomEdgeTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${MAP_EDGE_TABLE_NAME} (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        source_node_id TEXT NOT NULL,
        target_node_id TEXT NOT NULL,
        relation TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_map_custom_edges_kb ON ${MAP_EDGE_TABLE_NAME}(workspace_id);
    `);
  }

  listMapCustomEdges(workspaceId: string) {
    this.ensureMapCustomEdgeTable();
    const rows = this.db
      .prepare(`SELECT id, workspace_id, source_node_id, target_node_id, relation, created_at FROM ${MAP_EDGE_TABLE_NAME} WHERE workspace_id = ? ORDER BY created_at DESC`)
      .all(workspaceId) as Array<MapCustomEdgeRow>;
    return rows.map(mapMapCustomEdge);
  }

  insertMapCustomEdge(edge: KnowledgeMapCustomEdge) {
    this.ensureMapCustomEdgeTable();
    this.db.prepare(`
      INSERT INTO ${MAP_EDGE_TABLE_NAME} (id, workspace_id, source_node_id, target_node_id, relation, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(edge.id, resolveWorkspaceId(edge.workspaceId), edge.sourceNodeId, edge.targetNodeId, edge.relation, edge.createdAt);
  }

  deleteMapCustomEdge(workspaceId: string, edgeId: string) {
    this.ensureMapCustomEdgeTable();
    this.db.prepare(`DELETE FROM ${MAP_EDGE_TABLE_NAME} WHERE id = ? AND workspace_id = ?`)
      .run(edgeId, workspaceId);
  }

  insertCards(cards: KnowledgeCard[]) {
    const insert = this.db.prepare(`
      INSERT INTO cards (
        id, workspace_id, material_id, type, title, body, claim_status, recall_json, created_at, updated_at, archived
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    this.db.exec('BEGIN');
    try {
      for (const card of cards) {
        insert.run(card.id, resolveWorkspaceId(card.workspaceId), card.materialId ?? null, card.type, card.title, card.body, card.claimStatus, serializeCardRecall(card.recall), card.createdAt, card.updatedAt, card.archived ? 1 : 0);
        this.upsertCardFts(card);
      }
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  updateCard(card: KnowledgeCard) {
    this.db.prepare(`
      UPDATE cards
      SET workspace_id = ?, material_id = ?, type = ?, title = ?, body = ?, claim_status = ?, recall_json = ?, created_at = ?, updated_at = ?, archived = ?
      WHERE id = ?
    `).run(
      resolveWorkspaceId(card.workspaceId),
      card.materialId ?? null,
      card.type,
      card.title,
      card.body,
      card.claimStatus,
      serializeCardRecall(card.recall),
      card.createdAt,
      card.updatedAt,
      card.archived ? 1 : 0,
      card.id,
    );
    this.upsertCardFts(card);
  }

  listCards(workspaceId?: string) {
    const rows = workspaceId
      ? this.db.prepare('SELECT * FROM cards WHERE workspace_id = ? AND archived = 0 ORDER BY updated_at DESC, created_at DESC').all(workspaceId)
      : this.db.prepare('SELECT * FROM cards WHERE archived = 0 ORDER BY updated_at DESC, created_at DESC').all();
    return (rows as CardRow[]).map(mapCard);
  }

  archiveCard(id: string) {
    this.db.prepare('UPDATE cards SET archived = 1 WHERE id = ?').run(id);
    const card = this.findCard(id);
    if (card) upsertCardInZvec(toCardIndexInput(card));
  }

  unarchiveCard(id: string) {
    this.db.prepare('UPDATE cards SET archived = 0 WHERE id = ?').run(id);
    const card = this.findCard(id);
    if (card) upsertCardInZvec(toCardIndexInput(card));
  }

  listArchivedCards(workspaceId?: string) {
    const rows = workspaceId
      ? this.db.prepare('SELECT * FROM cards WHERE workspace_id = ? AND archived = 1 ORDER BY updated_at DESC, created_at DESC').all(workspaceId)
      : this.db.prepare('SELECT * FROM cards WHERE archived = 1 ORDER BY updated_at DESC, created_at DESC').all();
    return (rows as CardRow[]).map(mapCard);
  }

  insertCardRevision(revision: CardRevision) {
    this.db.prepare(`
      INSERT INTO card_revisions (
        id, card_id, version, title_snapshot, body_snapshot, type_snapshot, claim_status_snapshot, changed_fields_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      revision.id,
      revision.cardId,
      revision.version,
      revision.titleSnapshot,
      revision.bodySnapshot,
      revision.typeSnapshot,
      revision.claimStatusSnapshot,
      JSON.stringify(revision.changedFields),
      revision.createdAt,
    );
  }

  listCardRevisions(cardId: string) {
    const rows = this.db
      .prepare('SELECT * FROM card_revisions WHERE card_id = ? ORDER BY version ASC')
      .all(cardId) as CardRevisionRow[];
    return rows.map(mapCardRevision);
  }

  insertExportRecord(record: ExportRecord) {
    this.db.prepare(`
      INSERT INTO exports (
        id, workspace_id, format, scope, include_artifacts, material_count, card_count, artifact_count, filename, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      record.id,
      resolveWorkspaceId(record.workspaceId),
      record.format,
      record.scope,
      record.includeArtifacts ? 1 : 0,
      record.materialCount,
      record.cardCount,
      record.artifactCount,
      record.filename,
      record.createdAt,
    );
  }

  listExportRecords(workspaceId?: string) {
    const rows = workspaceId
      ? this.db.prepare('SELECT * FROM exports WHERE workspace_id = ? ORDER BY created_at DESC').all(workspaceId)
      : this.db.prepare('SELECT * FROM exports ORDER BY created_at DESC').all();
    return (rows as ExportRow[]).map(mapExportRecord);
  }

  upsertSavedFilter(record: SavedFilter) {
    this.db.prepare(`
      INSERT INTO saved_filters (id, scope, card_type, claim_status, sort_key, keyword, updated_at)
      VALUES (@id, @scope, @card_type, @claim_status, @sort_key, @keyword, @updated_at)
      ON CONFLICT(id) DO UPDATE SET
        scope = excluded.scope,
        card_type = excluded.card_type,
        claim_status = excluded.claim_status,
        sort_key = excluded.sort_key,
        keyword = excluded.keyword,
        updated_at = excluded.updated_at
    `).run({
      id: record.id,
      scope: record.scope,
      card_type: record.cardType,
      claim_status: record.claimStatus,
      sort_key: record.sortKey,
      keyword: record.keyword,
      updated_at: record.updatedAt,
    });
  }

  listSavedFilters(scope?: SavedFilterScope) {
    const rows = scope
      ? this.db.prepare('SELECT * FROM saved_filters WHERE scope = ? ORDER BY updated_at DESC').all(scope)
      : this.db.prepare('SELECT * FROM saved_filters ORDER BY updated_at DESC').all();
    return (rows as SavedFilterRow[]).map(mapSavedFilter);
  }

  deleteSavedFilter(id: string) {
    this.db.prepare('DELETE FROM saved_filters WHERE id = ?').run(id);
  }

  upsertEntity(record: Entity) {
    this.db.prepare(`
      INSERT INTO entities (id, workspace_id, name, type, description, source_card_ids_json, created_at, updated_at)
      VALUES (@id, @workspace_id, @name, @type, @description, @source_card_ids_json, @created_at, @updated_at)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        type = excluded.type,
        description = excluded.description,
        source_card_ids_json = excluded.source_card_ids_json,
        updated_at = excluded.updated_at
    `).run({
      id: record.id,
      workspace_id: resolveWorkspaceId(record.workspaceId),
      name: record.name,
      type: record.type,
      description: record.description,
      source_card_ids_json: JSON.stringify(record.sourceCardIds),
      created_at: record.createdAt,
      updated_at: record.updatedAt,
    });
  }

  listEntities(workspaceId: string) {
    const rows = this.db.prepare('SELECT * FROM entities WHERE workspace_id = ? ORDER BY updated_at DESC').all(workspaceId);
    return (rows as EntityRow[]).map(mapEntity);
  }

  deleteEntity(id: string) {
    this.db.prepare('DELETE FROM entities WHERE id = ?').run(id);
  }

  deleteEntitiesByWorkspace(workspaceId: string) {
    this.db.prepare('DELETE FROM entities WHERE workspace_id = ?').run(workspaceId);
  }

  deleteCard(id: string) {
    this.db.prepare('DELETE FROM cards WHERE id = ?').run(id);
    this.deleteCardFts(id);
    deleteCardFromZvec(id);
  }

  /**
   * 同步写入或更新 materials_fts 全文索引。
   * 先删除旧索引行再插入新行，保证标题与正文内容与主表一致。
   * @author fxbin
   * @param {MaterialRecord} material - 资料记录
   */
  private upsertMaterialFts(material: MaterialRecord) {
    this.db.prepare('DELETE FROM materials_fts WHERE material_id = ?').run(material.id);
    this.db.prepare(`
      INSERT INTO materials_fts (material_id, workspace_id, title, content_text)
      VALUES (?, ?, ?, ?)
    `).run(
      material.id,
      resolveWorkspaceId(material.workspaceId),
      material.title,
      material.contentText ?? material.rawInput,
    );
    upsertMaterialInZvec(toMaterialIndexInput(material));
  }

  /**
   * 同步写入或更新 cards_fts 全文索引。
   * 先删除旧索引行再插入新行，保证标题与正文内容与主表一致。
   * @author fxbin
   * @param {KnowledgeCard} card - 卡片记录
   */
  private upsertCardFts(card: KnowledgeCard) {
    this.db.prepare('DELETE FROM cards_fts WHERE card_id = ?').run(card.id);
    this.db.prepare(`
      INSERT INTO cards_fts (card_id, workspace_id, title, body)
      VALUES (?, ?, ?, ?)
    `).run(
      card.id,
      resolveWorkspaceId(card.workspaceId),
      card.title,
      card.body,
    );
    upsertCardInZvec(toCardIndexInput(card));
  }

  /**
   * 从 materials_fts 全文索引中删除指定资料。
   * @author fxbin
   * @param {string} id - 资料ID
   */
  private deleteMaterialFts(id: string) {
    this.db.prepare('DELETE FROM materials_fts WHERE material_id = ?').run(id);
  }

  /**
   * 从 cards_fts 全文索引中删除指定卡片。
   * @author fxbin
   * @param {string} id - 卡片ID
   */
  private deleteCardFts(id: string) {
    this.db.prepare('DELETE FROM cards_fts WHERE card_id = ?').run(id);
  }

  /**
   * 基于 FTS5 全文检索与 BM25 相关性排序，检索与查询文本最相关的卡片。
   * 仅返回未归档的卡片，按相关性从高到低排序，限制返回数量。
   * 若查询字符串清理后为空或检索失败，返回空数组。
   * @author fxbin
   * @param {string} workspaceId - 知识库ID
   * @param {string} query - 查询文本
   * @param {number} limit - 最大返回数量
   * @returns {KnowledgeCard[]} 按相关性排序的卡片数组
   */
  searchCardsByRelevance(workspaceId: string, query: string, limit: number): KnowledgeCard[] {
    if (!query.trim()) return [];

    if (isZvecSearchReady()) {
      try {
        const hits = searchCardsInZvec(workspaceId, query, limit);
        if (hits.length > 0) {
          const ids = hits.map((h) => h.id);
          const placeholders = ids.map(() => '?').join(',');
          const rows = this.db.prepare(`SELECT * FROM cards WHERE id IN (${placeholders}) AND archived = 0`)
            .all(...ids) as CardRow[];
          const scoreMap = new Map(hits.map((h) => [h.id, h.score]));
          return rows
            .map(mapCard)
            .sort((a, b) => (scoreMap.get(b.id) ?? 0) - (scoreMap.get(a.id) ?? 0));
        }
      } catch (error) {
        console.warn('[searchCardsByRelevance] zvec query failed, fallback to sqlite fts5', error);
      }
    }

    const sanitized = sanitizeFtsQuery(query);
    if (!sanitized) return [];
    try {
      const rows = this.db.prepare(`
        SELECT c.* FROM cards c
        JOIN cards_fts ON c.id = cards_fts.card_id
        WHERE cards_fts.workspace_id = ? AND cards_fts MATCH ? AND c.archived = 0
        ORDER BY bm25(cards_fts)
        LIMIT ?
      `).all(workspaceId, sanitized, limit) as CardRow[];
      return rows.map(mapCard);
    } catch (error) {
      console.warn('[searchCardsByRelevance] FTS query failed', error);
      return [];
    }
  }

  /**
   * 基于 FTS5 全文检索与 BM25 相关性排序，检索与查询文本最相关的资料。
   * 仅返回未归档的资料，按相关性从高到低排序，限制返回数量。
   * 若查询字符串清理后为空或检索失败，返回空数组。
   * @author fxbin
   * @param {string} workspaceId - 知识库ID
   * @param {string} query - 查询文本
   * @param {number} limit - 最大返回数量
   * @returns {MaterialRecord[]} 按相关性排序的资料数组
   */
  searchMaterialsByRelevance(workspaceId: string, query: string, limit: number): MaterialRecord[] {
    if (!query.trim()) return [];

    if (isZvecSearchReady()) {
      try {
        const hits = searchMaterialsInZvec(workspaceId, query, limit);
        if (hits.length > 0) {
          const ids = hits.map((h) => h.id);
          const placeholders = ids.map(() => '?').join(',');
          const rows = this.db.prepare(`SELECT * FROM materials WHERE id IN (${placeholders}) AND archived = 0`)
            .all(...ids) as MaterialRow[];
          const scoreMap = new Map(hits.map((h) => [h.id, h.score]));
          return rows
            .map(mapMaterial)
            .sort((a, b) => (scoreMap.get(b.id) ?? 0) - (scoreMap.get(a.id) ?? 0));
        }
      } catch (error) {
        console.warn('[searchMaterialsByRelevance] zvec query failed, fallback to sqlite fts5', error);
      }
    }

    const sanitized = sanitizeFtsQuery(query);
    if (!sanitized) return [];
    try {
      const rows = this.db.prepare(`
        SELECT m.* FROM materials m
        JOIN materials_fts ON m.id = materials_fts.material_id
        WHERE materials_fts.workspace_id = ? AND materials_fts MATCH ? AND m.archived = 0
        ORDER BY bm25(materials_fts)
        LIMIT ?
      `).all(workspaceId, sanitized, limit) as MaterialRow[];
      return rows.map(mapMaterial);
    } catch (error) {
      console.warn('[searchMaterialsByRelevance] FTS query failed', error);
      return [];
    }
  }

  insertConflictAudit(entry: ConflictAuditEntry) {
    this.db.prepare(`
      INSERT INTO conflict_audit (id, kind, action, keep_id, drop_ids_json, workspace_id, note, created_at)
      VALUES (@id, @kind, @action, @keep_id, @drop_ids_json, @workspace_id, @note, @created_at)
    `).run({
      id: entry.id,
      kind: entry.kind,
      action: entry.action,
      keep_id: entry.keepId,
      drop_ids_json: JSON.stringify(entry.dropIds),
      workspace_id: resolveWorkspaceId(entry.workspaceId),
      note: entry.note,
      created_at: entry.createdAt,
    });
  }

  listConflictAudit(limit?: number) {
    const sql = typeof limit === 'number'
      ? this.db.prepare('SELECT * FROM conflict_audit ORDER BY created_at DESC LIMIT ?').all(limit)
      : this.db.prepare('SELECT * FROM conflict_audit ORDER BY created_at DESC').all();
    return (sql as ConflictAuditRow[]).map(mapConflictAudit);
  }

  insertTask(task: AgentTask) {
    this.db.prepare(`
      INSERT INTO tasks (
        id, workflow, status, input_json, output_json, error, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(task.id, task.workflow, task.status, JSON.stringify(task.input), task.output ? JSON.stringify(task.output) : null, task.error ?? null, task.createdAt, task.updatedAt);
  }

  updateTask(task: AgentTask) {
    this.db.prepare(`
      UPDATE tasks
      SET workflow = ?, status = ?, input_json = ?, output_json = ?, error = ?, updated_at = ?
      WHERE id = ?
    `).run(task.workflow, task.status, JSON.stringify(task.input), task.output ? JSON.stringify(task.output) : null, task.error ?? null, task.updatedAt, task.id);
  }

  listTasks(limit?: number) {
    const rows = this.db.prepare(`SELECT * FROM tasks ORDER BY updated_at DESC, created_at DESC${limit ? ` LIMIT ${limit}` : ''}`).all();
    return (rows as TaskRow[]).map(mapTask);
  }

  findTask(id: string) {
    const row = this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow | undefined;
    return row ? mapTask(row) : undefined;
  }

  insertArtifact(artifact: ArtifactRecord) {
    this.db.prepare(`
      INSERT INTO artifacts (
        id, workspace_id, artifact_type, subtype, title, body, source_material_ids_json, sections_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      artifact.id,
      resolveWorkspaceId(artifact.workspaceId),
      artifact.artifactType,
      artifact.subtype,
      artifact.title,
      artifact.body,
      JSON.stringify(artifact.sourceMaterialIds),
      artifact.sections ? JSON.stringify(artifact.sections) : null,
      artifact.createdAt,
    );
  }

  updateArtifact(artifact: ArtifactRecord) {
    this.db.prepare(`
      UPDATE artifacts
      SET workspace_id = ?, artifact_type = ?, subtype = ?, title = ?, body = ?, source_material_ids_json = ?, sections_json = ?, created_at = ?
      WHERE id = ?
    `).run(
      resolveWorkspaceId(artifact.workspaceId),
      artifact.artifactType,
      artifact.subtype,
      artifact.title,
      artifact.body,
      JSON.stringify(artifact.sourceMaterialIds),
      artifact.sections ? JSON.stringify(artifact.sections) : null,
      artifact.createdAt,
      artifact.id,
    );
  }

  listArtifacts(workspaceId?: string, limit?: number) {
    const rows = workspaceId
      ? this.db.prepare('SELECT * FROM artifacts WHERE workspace_id = ? ORDER BY created_at DESC').all(workspaceId)
      : this.db.prepare(`SELECT * FROM artifacts ORDER BY created_at DESC${limit ? ` LIMIT ${limit}` : ''}`).all();
    return (rows as ArtifactRow[]).map(mapArtifact);
  }

  findArtifact(artifactId: string) {
    const row = this.db.prepare('SELECT * FROM artifacts WHERE id = ?').get(artifactId) as ArtifactRow | undefined;
    return row ? mapArtifact(row) : undefined;
  }

  insertArtifactRevision(revision: ArtifactRevision) {
    this.db.prepare(`
      INSERT INTO artifact_revisions (
        id, artifact_id, version, section_id, section_title_snapshot, section_body_snapshot, changed_fields_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      revision.id,
      revision.artifactId,
      revision.version,
      revision.sectionId,
      revision.sectionTitleSnapshot,
      revision.sectionBodySnapshot,
      JSON.stringify(revision.changedFields),
      revision.createdAt,
    );
  }

  listArtifactRevisions(artifactId: string) {
    const rows = this.db
      .prepare('SELECT * FROM artifact_revisions WHERE artifact_id = ? ORDER BY version ASC')
      .all(artifactId) as ArtifactRevisionRow[];
    return rows.map(mapArtifactRevision);
  }

  insertMessage(message: ChatMessage) {
    this.db.prepare(`
      INSERT INTO messages (
        id, workspace_id, question, answer, card_ids_json, artifact_id, material_id, created_at, proposed_cards_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      message.id,
      resolveWorkspaceId(message.workspaceId),
      message.question,
      message.answer,
      JSON.stringify(message.cardIds),
      message.artifactId ?? null,
      message.materialId ?? null,
      message.createdAt,
      message.proposedCards ? JSON.stringify(message.proposedCards) : null,
    );
  }

  listMessages(workspaceId: string, limit?: number) {
    const rows = limit
      ? this.db.prepare('SELECT * FROM (SELECT * FROM messages WHERE workspace_id = ? ORDER BY created_at DESC LIMIT ?) ORDER BY created_at ASC').all(workspaceId, limit)
      : this.db.prepare('SELECT * FROM messages WHERE workspace_id = ? ORDER BY created_at ASC').all(workspaceId);
    return (rows as MessageRow[]).map(mapMessage);
  }

  findMessage(messageId: string) {
    const row = this.db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId) as MessageRow | undefined;
    return row ? mapMessage(row) : undefined;
  }

  updateMessageAcceptedCards(messageId: string, cardIds: string[]) {
    this.db.prepare(`
      UPDATE messages SET card_ids_json = ?, proposed_cards_json = NULL WHERE id = ?
    `).run(JSON.stringify(cardIds), messageId);
  }

  readModelProviderConfig() {
    const row = this.db.prepare('SELECT * FROM model_provider_settings WHERE id = ?').get('default') as ModelProviderSettingsRow | undefined;
    if (!row) return undefined;
    return {
      provider: row.provider,
      model: row.model,
      baseUrl: row.base_url ?? undefined,
      apiKey: row.api_key ?? undefined,
      enabled: Boolean(row.enabled),
      fallbackToMock: Boolean(row.fallback_to_mock),
      updatedAt: row.updated_at,
    };
  }

  writeModelProviderConfig(config: PersistedModelProviderConfig) {
    this.db.prepare(`
      INSERT INTO model_provider_settings (
        id, provider, model, base_url, api_key, enabled, fallback_to_mock, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        provider = excluded.provider,
        model = excluded.model,
        base_url = excluded.base_url,
        api_key = excluded.api_key,
        enabled = excluded.enabled,
        fallback_to_mock = excluded.fallback_to_mock,
        updated_at = excluded.updated_at
    `).run(
      LEGACY_MODEL_PROVIDER_SETTINGS_ID,
      config.provider ?? getDefaultPiProvider(),
      config.model ?? getDefaultPiModel(),
      config.baseUrl ?? null,
      config.apiKey ?? null,
      config.enabled ? 1 : 0,
      config.fallbackToMock ? 1 : 0,
      config.updatedAt ?? now(),
    );
  }

  listModelProviderProfiles() {
    const rows = this.db
      .prepare('SELECT * FROM model_provider_profiles ORDER BY created_at ASC')
      .all() as ModelProviderProfileRow[];
    return rows.map(mapModelProviderProfileRow);
  }

  findModelProviderProfile(id: string) {
    const row = this.db
      .prepare('SELECT * FROM model_provider_profiles WHERE id = ?')
      .get(id) as ModelProviderProfileRow | undefined;
    return row ? mapModelProviderProfileRow(row) : undefined;
  }

  insertModelProviderProfile(record: ModelProviderProfileRecord) {
    this.db.prepare(`
      INSERT INTO model_provider_profiles (
        id, name, provider, model, base_url, api_key, enabled, fallback_to_mock, is_default, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      record.id,
      record.name,
      record.provider,
      record.model,
      record.baseUrl ?? null,
      record.apiKey ?? null,
      record.enabled ? 1 : 0,
      record.fallbackToMock ? 1 : 0,
      record.isDefault ? 1 : 0,
      record.createdAt,
      record.updatedAt,
    );
  }

  updateModelProviderProfile(record: ModelProviderProfileRecord) {
    this.db.prepare(`
      UPDATE model_provider_profiles
      SET name = ?, provider = ?, model = ?, base_url = ?, api_key = ?, enabled = ?, fallback_to_mock = ?, is_default = ?, updated_at = ?
      WHERE id = ?
    `).run(
      record.name,
      record.provider,
      record.model,
      record.baseUrl ?? null,
      record.apiKey ?? null,
      record.enabled ? 1 : 0,
      record.fallbackToMock ? 1 : 0,
      record.isDefault ? 1 : 0,
      record.updatedAt,
      record.id,
    );
  }

  deleteModelProviderProfile(id: string) {
    this.db.prepare('DELETE FROM model_provider_profiles WHERE id = ?').run(id);
  }

  clearModelProviderProfileDefault() {
    this.db.prepare('UPDATE model_provider_profiles SET is_default = 0 WHERE is_default = 1').run();
  }

  /**
   * 读取微信读书 API Key 配置。
   * @returns {string | null} API Key，未配置时返回 null
   * @author fxbin
   */
  readWeReadApiKey(): string | null {
    const row = this.db.prepare('SELECT * FROM weread_settings WHERE id = ?').get('default') as WeReadSettingsRow | undefined;
    return row?.api_key ?? null;
  }

  /**
   * 保存或更新微信读书 API Key 配置。
   * @param {string} apiKey - 微信读书 API Key
   * @author fxbin
   */
  writeWeReadApiKey(apiKey: string) {
    this.db.prepare(`
      INSERT INTO weread_settings (id, api_key, updated_at)
      VALUES ('default', ?, ?)
      ON CONFLICT(id) DO UPDATE SET api_key = excluded.api_key, updated_at = excluded.updated_at
    `).run(apiKey, new Date().toISOString());
  }

  /**
   * 删除微信读书 API Key 配置。
   * @author fxbin
   */
  deleteWeReadApiKey() {
    this.db.prepare('DELETE FROM weread_settings WHERE id = ?').run('default');
  }

  /**
   * 读取数据账本（NS-4 用户数据四权）。
   *
   * 合并 data_account 表（单项维度）与 data_account_meta 表（minimalMode 全局开关）。
   * 若库中无记录，返回 null，由调用方决定是否写入默认值。
   *
   * @returns {DataAccountBook | null}
   * @author fxbin
   */
  readDataAccountBook(): DataAccountBook | null {
    const entryRows = this.db.prepare('SELECT * FROM data_account').all() as DataAccountRow[];
    if (entryRows.length === 0) return null;
    const metaRow = this.db.prepare('SELECT * FROM data_account_meta WHERE id = ?').get('default') as DataAccountMetaRow | undefined;
    const entries: DataAccountEntry[] = entryRows.map((row) => ({
      key: row.key,
      label: row.label,
      tier: row.tier as DataAccountEntry['tier'],
      dependentMetrics: JSON.parse(row.dependent_metrics_json) as string[],
      exportable: Boolean(row.exportable),
      updatedAt: row.updated_at,
    }));
    return {
      entries,
      minimalMode: Boolean(metaRow?.minimal_mode ?? 0),
      updatedAt: metaRow?.updated_at ?? entries[0].updatedAt,
    };
  }

  /**
   * 保存数据账本（全量覆盖）。
   *
   * entries 逐条 upsert 到 data_account 表，minimalMode 写入 data_account_meta。
   *
   * @param {DataAccountBook} book 数据账本
   * @author fxbin
   */
  writeDataAccountBook(book: DataAccountBook): void {
    const upsertEntry = this.db.prepare(`
      INSERT INTO data_account (key, label, tier, dependent_metrics_json, exportable, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        label = excluded.label,
        tier = excluded.tier,
        dependent_metrics_json = excluded.dependent_metrics_json,
        exportable = excluded.exportable,
        updated_at = excluded.updated_at
    `);
    for (const entry of book.entries) {
      upsertEntry.run(
        entry.key,
        entry.label,
        entry.tier,
        JSON.stringify(entry.dependentMetrics),
        entry.exportable ? 1 : 0,
        entry.updatedAt,
      );
    }
    this.db.prepare(`
      INSERT INTO data_account_meta (id, minimal_mode, updated_at)
      VALUES ('default', ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        minimal_mode = excluded.minimal_mode,
        updated_at = excluded.updated_at
    `).run(book.minimalMode ? 1 : 0, book.updatedAt);
  }

  /**
   * 读取单本书的轻校验覆盖状态（NS-7）。
   *
   * @param {string} bookId 微信读书 bookId
   * @returns {VerificationCoverage | null} 未记录返回 null
   * @author fxbin
   */
  readVerificationCoverage(bookId: string): VerificationCoverage | null {
    const row = this.db.prepare('SELECT * FROM verification_state WHERE book_id = ?').get(bookId) as VerificationStateRow | undefined;
    if (!row) return null;
    return {
      bookId: row.book_id,
      verified: Boolean(row.verified),
      verifiedAt: row.verified_at ? Number(row.verified_at) : undefined,
      passedCount: row.passed_count,
      attempts: row.attempts,
    };
  }

  /**
   * 保存单本书的轻校验覆盖状态（upsert）。
   *
   * @param {VerificationCoverage} coverage 覆盖状态
   * @author fxbin
   */
  writeVerificationCoverage(coverage: VerificationCoverage): void {
    this.db.prepare(`
      INSERT INTO verification_state (book_id, verified, verified_at, passed_count, attempts, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(book_id) DO UPDATE SET
        verified = excluded.verified,
        verified_at = excluded.verified_at,
        passed_count = excluded.passed_count,
        attempts = excluded.attempts,
        updated_at = excluded.updated_at
    `).run(
      coverage.bookId,
      coverage.verified ? 1 : 0,
      coverage.verifiedAt ? String(coverage.verifiedAt) : null,
      coverage.passedCount,
      coverage.attempts,
      new Date().toISOString(),
    );
  }

  /**
   * 插入一条注意力信号记录，供 Recall Agent 检索用户认知建构活动。
   * @param signal - 注意力信号对象
   * @author fxbin
   */
  insertAttentionSignal(signal: AttentionSignal): void {
    this.db.prepare(`
      INSERT INTO attention_log (
        id, workspace_id, signal_type, signal_strength, target_type, target_id, context_data_json, consumed, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      signal.id,
      resolveWorkspaceId(signal.workspaceId),
      signal.signalType,
      signal.signalStrength,
      signal.targetType,
      signal.targetId,
      JSON.stringify(signal.contextData),
      signal.consumed ? 1 : 0,
      signal.createdAt,
    );
  }

  /**
   * 查询注意力信号列表，按创建时间降序排序。
   * @param workspaceId - 可选，知识库 ID 过滤；未指定时返回全库信号
   * @param limit - 可选，最大返回数量，默认 ATTENTION_LOG_LIMIT
   * @returns 注意力信号数组
   * @author fxbin
   */
  listAttentionSignals(workspaceId?: string, limit?: number): AttentionSignal[] {
    const maxRows = typeof limit === 'number' ? limit : ATTENTION_LOG_LIMIT;
    const rows = workspaceId
      ? this.db.prepare('SELECT * FROM attention_log WHERE workspace_id = ? ORDER BY created_at DESC LIMIT ?').all(workspaceId, maxRows) as AttentionLogRow[]
      : this.db.prepare('SELECT * FROM attention_log ORDER BY created_at DESC LIMIT ?').all(maxRows) as AttentionLogRow[];
    return rows.map(mapAttentionSignal);
  }

  /**
   * 标记注意力信号为已消费，避免 Recall Agent 重复检索。
   * @param signalId - 信号 ID
   * @author fxbin
   */
  markAttentionConsumed(signalId: string): void {
    this.db.prepare('UPDATE attention_log SET consumed = 1 WHERE id = ?').run(signalId);
  }

  /**
   * 删除指定知识库的所有注意力信号。
   * @param workspaceId - 知识库 ID
   * @author fxbin
   */
  deleteAttentionSignals(workspaceId: string): void {
    this.db.prepare('DELETE FROM attention_log WHERE workspace_id = ?').run(workspaceId);
  }

  insertProposal(proposal: PersistedProposal): void {
    this.db.prepare(`
      INSERT INTO agent_proposals (
        id, workspace_id, type, title, description, action_label,
        metadata_json, status, generated_at, decided_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      proposal.id,
      proposal.workspaceId,
      proposal.type,
      proposal.title,
      proposal.description,
      proposal.actionLabel,
      JSON.stringify(proposal.metadata),
      proposal.status,
      proposal.generatedAt,
      proposal.decidedAt,
    );
  }

  listProposals(workspaceId: string, status?: ProposalStatus, limit?: number): PersistedProposal[] {
    const params: Array<string | number> = [workspaceId];
    let sql = 'SELECT * FROM agent_proposals WHERE workspace_id = ?';
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    sql += ' ORDER BY generated_at DESC';
    if (typeof limit === 'number') {
      sql += ' LIMIT ?';
      params.push(limit);
    }
    return (this.db.prepare(sql).all(...params) as ProposalRow[]).map(mapProposal);
  }

  updateProposalStatus(proposalId: string, status: ProposalStatus, decidedAt: string): void {
    this.db.prepare('UPDATE agent_proposals SET status = ?, decided_at = ? WHERE id = ?').run(status, decidedAt, proposalId);
  }

  findRecentProposals(workspaceId: string, type: string, title: string, sinceIso: string): PersistedProposal[] {
    return (this.db.prepare(
      'SELECT * FROM agent_proposals WHERE workspace_id = ? AND type = ? AND title = ? AND generated_at >= ? ORDER BY generated_at DESC',
    ).all(workspaceId, type, title, sinceIso) as ProposalRow[]).map(mapProposal);
  }

  recordAgentUsage(record: AgentUsageRecord): void {
    this.db.prepare(
      `INSERT INTO agent_usage (id, workspace_id, task_type, provider, model, role, input_tokens, output_tokens, cost_usd, ok, error_message, started_at, duration_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      record.id,
      record.workspaceId,
      record.taskType,
      record.provider,
      record.model,
      record.role,
      record.inputTokens,
      record.outputTokens,
      record.costUsd,
      record.ok ? 1 : 0,
      record.errorMessage,
      record.startedAt,
      record.durationMs,
    );
  }

  listAgentUsage(query: AgentUsageQuery): AgentUsageRecord[] {
    const params: Array<string | number> = [];
    let sql = 'SELECT * FROM agent_usage WHERE 1=1';
    if (query.workspaceId !== undefined) {
      sql += ' AND workspace_id = ?';
      params.push(query.workspaceId);
    }
    if (query.taskType !== undefined) {
      sql += ' AND task_type = ?';
      params.push(query.taskType);
    }
    if (query.provider !== undefined) {
      sql += ' AND provider = ?';
      params.push(query.provider);
    }
    if (query.since !== undefined) {
      sql += ' AND started_at >= ?';
      params.push(query.since);
    }
    if (query.until !== undefined) {
      sql += ' AND started_at <= ?';
      params.push(query.until);
    }
    sql += ' ORDER BY started_at DESC';
    const limit = query.limit ?? DEFAULT_QUERY_LIMIT;
    sql += ' LIMIT ?';
    params.push(limit);
    return (this.db.prepare(sql).all(...params) as AgentUsageRow[]).map(mapAgentUsage);
  }

  summarizeAgentUsage(query: AgentUsageQuery): AgentUsageSummary {
    const records = this.listAgentUsage({ ...query, limit: undefined });
    return buildUsageSummary(records);
  }

  compareAgentUsage(query: AgentUsageQuery): AgentUsageComparison {
    const records = this.listAgentUsage({ ...query, limit: undefined });
    return buildUsageComparison(records);
  }

  persistAgentChatTurn(record: PersistAgentChatTurnRequest): void {
    const existing = this.db.prepare('SELECT * FROM agent_chat_sessions WHERE session_id = ?').get(record.session.sessionId) as AgentChatSessionRow | undefined;
    const messageRecords = buildAgentChatMessageRecords(record.session.sessionId, record.session.workspaceId, record.rawMessages);
    const title = existing?.title ?? record.session.title ?? deriveAgentChatTitle(record.rawMessages);
    const createdAt = existing?.created_at ?? record.session.createdAt;
    const updatedAt = record.session.updatedAt;

    this.db.exec('BEGIN');
    try {
      this.db.prepare(`
        INSERT INTO agent_chat_sessions (
          session_id, workspace_id, title, message_count, raw_messages_json,
          provider, model, created_at, updated_at, last_used_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(session_id) DO UPDATE SET
          workspace_id = excluded.workspace_id,
          title = agent_chat_sessions.title,
          message_count = excluded.message_count,
          raw_messages_json = excluded.raw_messages_json,
          provider = excluded.provider,
          model = excluded.model,
          updated_at = excluded.updated_at,
          last_used_at = excluded.last_used_at
      `).run(
        record.session.sessionId,
        record.session.workspaceId,
        title,
        messageRecords.length,
        JSON.stringify(record.rawMessages),
        record.run.provider,
        record.run.model,
        createdAt,
        updatedAt,
        record.session.lastUsedAt,
      );

      this.db.prepare('DELETE FROM agent_chat_messages WHERE session_id = ?').run(record.session.sessionId);
      const insertMessage = this.db.prepare(`
        INSERT INTO agent_chat_messages (
          id, session_id, workspace_id, role, text, reasoning, raw_json, sequence, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const message of messageRecords) {
        insertMessage.run(
          message.id,
          message.sessionId,
          message.workspaceId,
          message.role,
          message.text,
          message.reasoning,
          JSON.stringify(message.raw),
          message.sequence,
          message.createdAt,
        );
      }

      this.db.prepare(`
        INSERT INTO agent_chat_runs (
          id, session_id, workspace_id, provider, model, input_tokens, output_tokens,
          cache_read_tokens, cache_write_tokens, cost_usd, duration_ms, status,
          error_message, started_at, ended_at, tool_call_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        record.run.id,
        record.run.sessionId,
        record.run.workspaceId,
        record.run.provider,
        record.run.model,
        record.run.inputTokens,
        record.run.outputTokens,
        record.run.cacheReadTokens,
        record.run.cacheWriteTokens,
        record.run.costUsd,
        record.run.durationMs,
        record.run.status,
        record.run.errorMessage,
        record.run.startedAt,
        record.run.endedAt,
        record.toolCalls.length,
      );

      const insertToolCall = this.db.prepare(`
        INSERT INTO agent_chat_tool_calls (
          id, run_id, session_id, workspace_id, tool_call_id, tool_name,
          args_json, result, details_json, is_error, started_at, ended_at, duration_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const toolCall of record.toolCalls) {
        insertToolCall.run(
          toolCall.id,
          toolCall.runId,
          toolCall.sessionId,
          toolCall.workspaceId,
          toolCall.toolCallId,
          toolCall.toolName,
          JSON.stringify(toolCall.args),
          toolCall.result,
          toolCall.details === undefined ? null : JSON.stringify(toolCall.details),
          toolCall.isError ? 1 : 0,
          toolCall.startedAt,
          toolCall.endedAt,
          toolCall.durationMs,
        );
      }
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  listAgentChatSessions(workspaceId: string): AgentChatSessionInfo[] {
    const rows = this.db.prepare(`
      SELECT * FROM agent_chat_sessions
      WHERE workspace_id = ?
      ORDER BY last_used_at DESC
    `).all(workspaceId) as AgentChatSessionRow[];
    return rows.map((row) => {
      const run = this.db.prepare(`
        SELECT * FROM agent_chat_runs
        WHERE session_id = ?
        ORDER BY started_at DESC
        LIMIT 1
      `).get(row.session_id) as AgentChatRunRow | undefined;
      return mapAgentChatSession(row, run ? mapAgentChatRun(run) : undefined);
    });
  }

  getAgentChatSession(sessionId: string, workspaceId: string): AgentChatSessionDetail | null {
    const row = this.db.prepare('SELECT * FROM agent_chat_sessions WHERE session_id = ? AND workspace_id = ?').get(sessionId, workspaceId) as AgentChatSessionRow | undefined;
    if (!row) return null;
    const runs = (this.db.prepare('SELECT * FROM agent_chat_runs WHERE session_id = ? ORDER BY started_at ASC').all(sessionId) as AgentChatRunRow[])
      .map(mapAgentChatRun);
    const lastRun = runs.length > 0 ? runs[runs.length - 1] : undefined;
    return {
      ...mapAgentChatSession(row, lastRun),
      messages: JSON.parse(row.raw_messages_json) as unknown[],
      messageRecords: (this.db.prepare('SELECT * FROM agent_chat_messages WHERE session_id = ? ORDER BY sequence ASC').all(sessionId) as AgentChatMessageRow[])
        .map(mapAgentChatMessage),
      runs,
      toolCalls: (this.db.prepare('SELECT * FROM agent_chat_tool_calls WHERE session_id = ? ORDER BY started_at ASC').all(sessionId) as AgentChatToolCallRow[])
        .map(mapAgentChatToolCall),
    };
  }

  renameAgentChatSession(sessionId: string, workspaceId: string, title: string): boolean {
    const trimmed = title.trim();
    if (!trimmed) return false;
    const result = this.db.prepare(`
      UPDATE agent_chat_sessions
      SET title = ?, updated_at = ?
      WHERE session_id = ? AND workspace_id = ?
    `).run(trimmed, now(), sessionId, workspaceId);
    return result.changes > 0;
  }

  deleteAgentChatSession(sessionId: string, workspaceId: string): boolean {
    const result = this.db.prepare('DELETE FROM agent_chat_sessions WHERE session_id = ? AND workspace_id = ?').run(sessionId, workspaceId);
    return result.changes > 0;
  }

  getAgentChatRawMessages(sessionId: string, workspaceId: string): unknown[] | null {
    const row = this.db.prepare('SELECT raw_messages_json FROM agent_chat_sessions WHERE session_id = ? AND workspace_id = ?').get(sessionId, workspaceId) as { raw_messages_json: string } | undefined;
    if (!row) return null;
    return JSON.parse(row.raw_messages_json) as unknown[];
  }

  truncateAgentChatSessionForRetry(sessionId: string, workspaceId: string): AgentChatRetryResult {
    const rawMessages = this.getAgentChatRawMessages(sessionId, workspaceId);
    if (!rawMessages) return { ok: false, beforeCount: 0, remainingCount: 0, truncated: false };
    const lastUserIndex = findLastUserMessageIndex(rawMessages);
    if (lastUserIndex < 0) {
      return { ok: false, beforeCount: rawMessages.length, remainingCount: rawMessages.length, truncated: false };
    }
    const remaining = rawMessages.slice(0, lastUserIndex);
    const messageRecords = buildAgentChatMessageRecords(sessionId, workspaceId, remaining);
    const stamp = now();
    this.db.exec('BEGIN');
    try {
      this.db.prepare(`
        UPDATE agent_chat_sessions
        SET raw_messages_json = ?, message_count = ?, updated_at = ?, last_used_at = ?
        WHERE session_id = ? AND workspace_id = ?
      `).run(JSON.stringify(remaining), messageRecords.length, stamp, stamp, sessionId, workspaceId);
      this.db.prepare('DELETE FROM agent_chat_messages WHERE session_id = ?').run(sessionId);
      const insertMessage = this.db.prepare(`
        INSERT INTO agent_chat_messages (
          id, session_id, workspace_id, role, text, reasoning, raw_json, sequence, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const message of messageRecords) {
        insertMessage.run(
          message.id,
          message.sessionId,
          message.workspaceId,
          message.role,
          message.text,
          message.reasoning,
          JSON.stringify(message.raw),
          message.sequence,
          message.createdAt,
        );
      }
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
    return { ok: true, beforeCount: rawMessages.length, remainingCount: remaining.length, truncated: true };
  }

  insertUserMemory(record: UserMemory): void {
    this.db.prepare(`
      INSERT INTO user_memory (id, scope, key, value, source, workspace_id, created_at, updated_at)
      VALUES (@id, @scope, @key, @value, @source, @workspace_id, @created_at, @updated_at)
      ON CONFLICT(id) DO UPDATE SET
        scope = excluded.scope,
        key = excluded.key,
        value = excluded.value,
        source = excluded.source,
        workspace_id = excluded.workspace_id,
        updated_at = excluded.updated_at
    `).run({
      id: record.id,
      scope: record.scope,
      key: record.key,
      value: record.value,
      source: record.source,
      workspace_id: record.workspaceId ?? null,
      created_at: record.createdAt,
      updated_at: record.updatedAt,
    });
  }

  updateUserMemory(id: string, patch: UpdateUserMemoryRequest): UserMemory | undefined {
    const existing = this.findUserMemory(id);
    if (!existing) return undefined;
    const next: UserMemory = {
      ...existing,
      value: patch.value ?? existing.value,
      scope: patch.scope ?? existing.scope,
      updatedAt: now(),
    };
    this.db.prepare(`
      UPDATE user_memory SET value = ?, scope = ?, updated_at = ? WHERE id = ?
    `).run(next.value, next.scope, next.updatedAt, id);
    return next;
  }

  deleteUserMemory(id: string): boolean {
    const result = this.db.prepare('DELETE FROM user_memory WHERE id = ?').run(id);
    return result.changes > 0;
  }

  findUserMemory(id: string): UserMemory | undefined {
    const row = this.db.prepare('SELECT * FROM user_memory WHERE id = ?').get(id) as UserMemoryRow | undefined;
    return row ? mapUserMemory(row) : undefined;
  }

  listUserMemory(query: UserMemoryQuery): UserMemory[] {
    const conditions: string[] = [];
    const params: Record<string, string> = {};
    if (query.scope !== undefined) {
      conditions.push('scope = @scope');
      params.scope = query.scope;
    }
    if (query.source !== undefined) {
      conditions.push('source = @source');
      params.source = query.source;
    }
    if (query.key !== undefined) {
      conditions.push('key = @key');
      params.key = query.key;
    }
    if (query.workspaceId !== undefined) {
      if (query.workspaceId === 'global') {
        conditions.push('workspace_id IS NULL');
      } else {
        conditions.push('workspace_id = @workspaceId');
        params.workspaceId = query.workspaceId;
      }
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = query.limit ?? DEFAULT_USER_MEMORY_QUERY_LIMIT;
    const rows = this.db.prepare(`SELECT * FROM user_memory ${whereClause} ORDER BY updated_at DESC LIMIT @limit`).all({ ...params, limit }) as UserMemoryRow[];
    return rows.map(mapUserMemory);
  }

  insertDecisionLog(record: DecisionLog): void {
    this.db.prepare(`
      INSERT INTO decision_log (id, kind, workspace_id, summary, reasoning, evidence_card_ids_json, agent_task_type, metadata_json, created_at)
      VALUES (@id, @kind, @workspace_id, @summary, @reasoning, @evidence_card_ids_json, @agent_task_type, @metadata_json, @created_at)
      ON CONFLICT(id) DO UPDATE SET
        kind = excluded.kind,
        summary = excluded.summary,
        reasoning = excluded.reasoning,
        evidence_card_ids_json = excluded.evidence_card_ids_json,
        metadata_json = excluded.metadata_json
    `).run({
      id: record.id,
      kind: record.kind,
      workspace_id: record.workspaceId ?? null,
      summary: record.summary,
      reasoning: record.reasoning,
      evidence_card_ids_json: JSON.stringify(record.evidenceCardIds),
      agent_task_type: record.agentTaskType ?? null,
      metadata_json: record.metadata ? JSON.stringify(record.metadata) : null,
      created_at: record.createdAt,
    });
  }

  findDecisionLog(id: string): DecisionLog | undefined {
    const row = this.db.prepare('SELECT * FROM decision_log WHERE id = ?').get(id) as DecisionLogRow | undefined;
    return row ? mapDecisionLog(row) : undefined;
  }

  listDecisionLog(query: DecisionLogQuery): DecisionLog[] {
    const conditions: string[] = ['archived = 0'];
    const params: Record<string, string> = {};
    if (query.kind !== undefined) {
      conditions.push('kind = @kind');
      params.kind = query.kind;
    }
    if (query.agentTaskType !== undefined) {
      conditions.push('agent_task_type = @agentTaskType');
      params.agentTaskType = query.agentTaskType;
    }
    if (query.workspaceId !== undefined) {
      if (query.workspaceId === 'global') {
        conditions.push('workspace_id IS NULL');
      } else {
        conditions.push('workspace_id = @workspaceId');
        params.workspaceId = query.workspaceId;
      }
    }
    if (query.since !== undefined) {
      conditions.push('created_at >= @since');
      params.since = query.since;
    }
    if (query.until !== undefined) {
      conditions.push('created_at <= @until');
      params.until = query.until;
    }
    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    const limit = query.limit ?? DEFAULT_DECISION_LOG_QUERY_LIMIT;
    const rows = this.db.prepare(`SELECT * FROM decision_log ${whereClause} ORDER BY created_at DESC LIMIT @limit`).all({ ...params, limit }) as DecisionLogRow[];
    return rows.map(mapDecisionLog);
  }

  deleteDecisionLog(id: string): boolean {
    const result = this.db.prepare('UPDATE decision_log SET archived = 1 WHERE id = ?').run(id);
    return result.changes > 0;
  }

  private ensureWorkspaceRename() {
    const renameOrMerge = (source: string, target: string) => {
      const sourceExists = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(source) as { name: string } | undefined;
      if (!sourceExists) return;
      const targetExists = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(target) as { name: string } | undefined;
      if (targetExists) {
        this.db.exec(`INSERT OR IGNORE INTO ${target} SELECT * FROM ${source}`);
        this.db.exec(`DROP TABLE ${source}`);
      } else {
        this.db.exec(`ALTER TABLE ${source} RENAME TO ${target}`);
      }
    };
    renameOrMerge('knowledge_bases', 'workspaces');
    const columnRenameTargets = ['cards', 'materials', 'artifacts', 'messages', 'attention_log', 'map_custom_edges', 'exports', 'entities', 'conflict_audit', 'agent_action_log'];
    for (const table of columnRenameTargets) {
      const columns = this.db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
      if (columns.some((column) => column.name === 'knowledge_base_id')) {
        this.db.exec(`ALTER TABLE ${table} RENAME COLUMN knowledge_base_id TO workspace_id`);
      }
    }
    renameOrMerge('knowledge_base_node_positions', 'workspace_node_positions');
    const nodePositionsColumns = this.db.prepare('PRAGMA table_info(workspace_node_positions)').all() as Array<{ name: string }>;
    if (nodePositionsColumns.some((column) => column.name === 'knowledge_base_id')) {
      this.db.exec('ALTER TABLE workspace_node_positions RENAME COLUMN knowledge_base_id TO workspace_id');
    }
  }

  private migrate() {
    this.db.exec('BEGIN');
    try {
      this.runMigrateStatements();
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  private runMigrateStatements(): void {
    this.ensureWorkspaceRename();
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        stage TEXT NOT NULL,
        source_count INTEGER NOT NULL DEFAULT 0,
        card_count INTEGER NOT NULL DEFAULT 0,
        sourced_ratio REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS materials (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        raw_input TEXT NOT NULL,
        source_url TEXT,
        platform TEXT,
        title TEXT NOT NULL,
        content_text TEXT,
        media_urls_json TEXT NOT NULL DEFAULT '[]',
        parse_status TEXT NOT NULL,
        parse_error TEXT,
        created_at TEXT NOT NULL,
        archived INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS cards (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        material_id TEXT REFERENCES materials(id) ON DELETE SET NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        claim_status TEXT NOT NULL,
        recall_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        archived INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS card_revisions (
        id TEXT PRIMARY KEY,
        card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
        version INTEGER NOT NULL,
        title_snapshot TEXT NOT NULL,
        body_snapshot TEXT NOT NULL,
        type_snapshot TEXT NOT NULL,
        claim_status_snapshot TEXT NOT NULL,
        changed_fields_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS exports (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        format TEXT NOT NULL,
        scope TEXT NOT NULL,
        include_artifacts INTEGER NOT NULL,
        material_count INTEGER NOT NULL,
        card_count INTEGER NOT NULL,
        artifact_count INTEGER NOT NULL,
        filename TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        workflow TEXT NOT NULL,
        status TEXT NOT NULL,
        input_json TEXT NOT NULL,
        output_json TEXT,
        error TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS artifacts (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        artifact_type TEXT NOT NULL,
        subtype TEXT NOT NULL DEFAULT 'summary',
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        source_material_ids_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS model_provider_settings (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        api_key TEXT,
        enabled INTEGER NOT NULL DEFAULT 0,
        fallback_to_mock INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        card_ids_json TEXT NOT NULL,
        artifact_id TEXT,
        material_id TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS weread_settings (
        id TEXT PRIMARY KEY,
        api_key TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS data_account (
        key TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        tier TEXT NOT NULL,
        dependent_metrics_json TEXT NOT NULL,
        exportable INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS data_account_meta (
        id TEXT PRIMARY KEY,
        minimal_mode INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_materials_workspace_id ON materials(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_materials_cursor ON materials(archived, workspace_id, created_at DESC, id DESC);
      CREATE INDEX IF NOT EXISTS idx_cards_workspace_id ON cards(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_card_revisions_card_id ON card_revisions(card_id, version);
      CREATE INDEX IF NOT EXISTS idx_exports_workspace_id ON exports(workspace_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at);
      CREATE INDEX IF NOT EXISTS idx_artifacts_workspace_id ON artifacts(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_messages_workspace_id ON messages(workspace_id);
    `);
    this.ensureWeReadSettingsTable();
    this.ensureWeReadBookMetaTable();
    this.ensureWeReadSyncStateTable();
    this.ensureWeReadHiddenInterestStateTable();
    this.ensureWeReadDataPortabilityTable();
    this.ensureWeReadReaderModeTable();
    this.ensureVerificationStateTable();
    this.ensureMaterialMediaColumn();
    this.ensureMaterialStatusTimelineColumn();
    this.ensureMaterialTranscriptColumns();
    this.ensureArtifactSubtypeColumn();
    this.ensureArtifactSectionsColumn();
    this.ensureCardRecallColumn();
    this.ensureArtifactRevisionsTable();
    this.ensureSavedFiltersTable();
    this.ensureEntitiesTable();
    this.ensureConflictAuditTable();
    this.ensureModelProviderProfilesTable();
    this.ensureWorkspaceNodePositionsTable();
    this.ensureArchivedColumns();
    this.ensureWorkspaceTitleUnique();
    this.ensureFtsTables();
    this.ensureAttentionLogTable();
    this.ensureMessagesProposedCardsColumn();
    this.ensureDecisionLogArchivedColumn();
  }

  /**
   * 创建 FTS5 全文检索虚拟表，用于 cards 与 materials 的相关性排序检索。
   * 虚拟表为派生索引，可随时重建；card_id/material_id/workspace_id 标记为 UNINDEXED（只存储不索引）。
   * 使用 IF NOT EXISTS 保证幂等，兼容新旧数据库。
   * @author fxbin
   */
  private ensureFtsTables() {
    this.ensureFtsTable('cards_fts', 'card_id', 'body', `
      CREATE VIRTUAL TABLE IF NOT EXISTS cards_fts USING fts5(
        card_id UNINDEXED,
        workspace_id UNINDEXED,
        title,
        body,
        tokenize = '${FTS_TOKENIZER}'
      );
    `);
    this.ensureFtsTable('materials_fts', 'material_id', 'content_text', `
      CREATE VIRTUAL TABLE IF NOT EXISTS materials_fts USING fts5(
        material_id UNINDEXED,
        workspace_id UNINDEXED,
        title,
        content_text,
        tokenize = '${FTS_TOKENIZER}'
      );
    `);
    this.backfillFtsIndex();
  }

  /**
   * 校验并创建 FTS 表：若已存在但缺少 workspace_id 列（旧 schema），先 DROP 再重建。
   * @param {string} tableName - FTS 表名
   * @param {string} idColumn - 主键列名（card_id / material_id）
   * @param {string} bodyColumn - 正文列名（body / content_text）
   * @param {string} createSql - 建表 SQL
   */
  private ensureFtsTable(tableName: string, idColumn: string, bodyColumn: string, createSql: string) {
    const exists = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(tableName);
    if (exists) {
      const columns = this.db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
      if (!columns.some((column) => column.name === 'workspace_id')) {
        this.db.exec(`DROP TABLE ${tableName};`);
      }
    }
    this.db.exec(createSql);
  }

  /**
   * 回填 FTS 索引：将主表中存在但 FTS 表缺失的卡片/资料补充到全文索引。
   *
   * 解决场景：FTS5 表在 migrate 时创建为空，历史数据未进入索引，
   * 导致 Agent 的 search_cards / search_materials 工具检索不到内容。
   * 采用 INSERT OR IGNORE 避免重复，仅补充缺失行。
   */
  private backfillFtsIndex() {
    this.db.exec(`
      INSERT OR IGNORE INTO cards_fts (card_id, workspace_id, title, body)
      SELECT id, COALESCE(workspace_id, 'default'), COALESCE(title, ''), COALESCE(body, '')
      FROM cards
      WHERE archived = 0;

      INSERT OR IGNORE INTO materials_fts (material_id, workspace_id, title, content_text)
      SELECT id, COALESCE(workspace_id, 'default'), COALESCE(title, ''), COALESCE(content_text, '')
      FROM materials
      WHERE archived = 0;
    `);
  }

  private ensureMaterialMediaColumn() {
    const columns = this.db.prepare('PRAGMA table_info(materials)').all() as Array<{ name: string }>;
    if (!columns.some((column) => column.name === 'media_urls_json')) {
      this.db.exec("ALTER TABLE materials ADD COLUMN media_urls_json TEXT NOT NULL DEFAULT '[]';");
    }
  }

  private ensureMaterialTranscriptColumns() {
    const columns = this.db.prepare('PRAGMA table_info(materials)').all() as Array<{ name: string }>;
    if (!columns.some((column) => column.name === 'transcript')) {
      this.db.exec('ALTER TABLE materials ADD COLUMN transcript TEXT;');
    }
    if (!columns.some((column) => column.name === 'transcript_status')) {
      this.db.exec('ALTER TABLE materials ADD COLUMN transcript_status TEXT;');
    }
    if (!columns.some((column) => column.name === 'transcript_error')) {
      this.db.exec('ALTER TABLE materials ADD COLUMN transcript_error TEXT;');
    }
  }

  private ensureArtifactSectionsColumn() {
    const columns = this.db.prepare('PRAGMA table_info(artifacts)').all() as Array<{ name: string }>;
    if (!columns.some((column) => column.name === 'sections_json')) {
      this.db.exec('ALTER TABLE artifacts ADD COLUMN sections_json TEXT;');
    }
  }

  private ensureArtifactRevisionsTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS artifact_revisions (
        id TEXT PRIMARY KEY,
        artifact_id TEXT NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
        version INTEGER NOT NULL,
        section_id TEXT NOT NULL,
        section_title_snapshot TEXT NOT NULL,
        section_body_snapshot TEXT NOT NULL,
        changed_fields_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_artifact_revisions_artifact_id ON artifact_revisions(artifact_id, version);
    `);
  }

  private ensureSavedFiltersTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS saved_filters (
        id TEXT PRIMARY KEY,
        scope TEXT NOT NULL,
        card_type TEXT,
        claim_status TEXT,
        sort_key TEXT NOT NULL,
        keyword TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_saved_filters_scope ON saved_filters(scope, updated_at DESC);
    `);
  }

  private ensureEntitiesTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS entities (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        source_card_ids_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_entities_kb ON entities(workspace_id, updated_at DESC);
    `);
  }

  private ensureConflictAuditTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS conflict_audit (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        action TEXT NOT NULL,
        keep_id TEXT NOT NULL,
        drop_ids_json TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        note TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_conflict_audit_created ON conflict_audit(created_at DESC);
    `);
  }

  /**
   * 创建 model_provider_profiles 表，并在表为空时从旧表 model_provider_settings
   * 幂等迁移一条 default 记录为 is_default=1 的 profile。
   * @author fxbin
   */
  private ensureModelProviderProfilesTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS model_provider_profiles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        api_key TEXT,
        enabled INTEGER NOT NULL DEFAULT 0,
        fallback_to_mock INTEGER NOT NULL DEFAULT 1,
        is_default INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_model_provider_profiles_default ON model_provider_profiles(is_default);
    `);
    this.ensureModelProviderProfilesBaseUrlColumn();
    this.ensureModelProviderSettingsBaseUrlColumn();
    this.seedModelProviderProfilesFromLegacy();
  }

  /**
   * 幂等迁移：为 model_provider_profiles 表追加 base_url 列（兼容旧库）。
   * @author fxbin
   */
  private ensureModelProviderProfilesBaseUrlColumn() {
    const columns = this.db.prepare('PRAGMA table_info(model_provider_profiles)').all() as Array<{ name: string }>;
    if (!columns.some((column) => column.name === 'base_url')) {
      this.db.exec('ALTER TABLE model_provider_profiles ADD COLUMN base_url TEXT;');
    }
  }

  /**
   * 幂等迁移：为 legacy model_provider_settings 表追加 base_url 列（兼容旧库）。
   * @author fxbin
   */
  private ensureModelProviderSettingsBaseUrlColumn() {
    const columns = this.db.prepare('PRAGMA table_info(model_provider_settings)').all() as Array<{ name: string }>;
    if (!columns.some((column) => column.name === 'base_url')) {
      this.db.exec('ALTER TABLE model_provider_settings ADD COLUMN base_url TEXT;');
    }
  }

  /**
   * 幂等迁移：若 profile 表为空且旧表存在 default 行，则迁移为一条 is_default=1 的 profile。
   * @author fxbin
   */
  private seedModelProviderProfilesFromLegacy() {
    const countRow = this.db
      .prepare('SELECT COUNT(*) AS count FROM model_provider_profiles')
      .get() as { count: number };
    if (countRow.count > 0) return;
    const legacy = this.db
      .prepare('SELECT * FROM model_provider_settings WHERE id = ?')
      .get(LEGACY_MODEL_PROVIDER_SETTINGS_ID) as ModelProviderSettingsRow | undefined;
    if (!legacy) return;
    const timestamp = now();
    this.db.prepare(`
      INSERT INTO model_provider_profiles (
        id, name, provider, model, api_key, enabled, fallback_to_mock, is_default, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id(MODEL_PROVIDER_PROFILE_ID_PREFIX),
      DEFAULT_PROFILE_NAME,
      legacy.provider,
      legacy.model,
      legacy.api_key,
      legacy.enabled,
      legacy.fallback_to_mock,
      1,
      timestamp,
      timestamp,
    );
  }

  private ensureMaterialStatusTimelineColumn() {
    const columns = this.db.prepare('PRAGMA table_info(materials)').all() as Array<{ name: string }>;
    if (!columns.some((column) => column.name === 'status_timeline_json')) {
      this.db.exec('ALTER TABLE materials ADD COLUMN status_timeline_json TEXT;');
    }
  }

  private ensureWorkspaceNodePositionsTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS workspace_node_positions (
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        node_id TEXT NOT NULL,
        x REAL NOT NULL,
        y REAL NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (workspace_id, node_id)
      );
      CREATE INDEX IF NOT EXISTS idx_workspace_node_positions_ws ON workspace_node_positions(workspace_id);
    `);
  }

  /**
   * 为 materials 与 cards 表幂等添加归档 archived 列及索引。
   * @author fxbin
   */
  private ensureArchivedColumns() {
    const materialColumns = this.db.prepare('PRAGMA table_info(materials)').all() as Array<{ name: string }>;
    if (!materialColumns.some((column) => column.name === 'archived')) {
      this.db.exec('ALTER TABLE materials ADD COLUMN archived INTEGER NOT NULL DEFAULT 0;');
    }
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_materials_archived ON materials(archived, workspace_id);');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_materials_cursor ON materials(archived, workspace_id, created_at DESC, id DESC);');

    const cardColumns = this.db.prepare('PRAGMA table_info(cards)').all() as Array<{ name: string }>;
    if (!cardColumns.some((column) => column.name === 'archived')) {
      this.db.exec('ALTER TABLE cards ADD COLUMN archived INTEGER NOT NULL DEFAULT 0;');
    }
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_cards_archived ON cards(archived, workspace_id);');
  }

  /**
   * 为 decision_log 表幂等添加归档 archived 列及索引。
   * 旧库通过 ALTER TABLE 补列，新库建表时已包含。
   * @author fxbin
   */
  private ensureDecisionLogArchivedColumn() {
    const columns = this.db.prepare('PRAGMA table_info(decision_log)').all() as Array<{ name: string }>;
    if (!columns.some((column) => column.name === 'archived')) {
      this.db.exec('ALTER TABLE decision_log ADD COLUMN archived INTEGER NOT NULL DEFAULT 0;');
    }
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_decision_log_archived ON decision_log(archived);');
  }

  /**
   * 为 workspaces.title 建立唯一索引（兜底防重名）。
   * 迁移前先检测重名：无重名则建索引升级为双重保护；
   * 有重名则自动合并（保留最早创建的工作区，迁移关联数据后删除重复记录），再建索引。
   * @author fxbin
   */
  private ensureWorkspaceTitleUnique() {
    const duplicates = this.db.prepare(
      'SELECT title FROM workspaces GROUP BY title HAVING COUNT(*) > 1'
    ).all() as Array<{ title: string }>;

    if (duplicates.length > 0) {
      this.mergeDuplicateWorkspaces(duplicates);
    }

    this.db.exec(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_workspaces_title ON workspaces(title)'
    );
  }

  /**
   * 合并重名工作区：保留最早创建的，将其余工作区的关联数据迁移至保留工作区后删除重复记录。
   * 迁移使用 UPDATE OR IGNORE 策略，遇到唯一约束冲突时跳过冲突行，保证不丢失保留工作区已有数据。
   * FTS 虚拟表不支持 UPDATE，直接删除重复工作区的索引数据（保留工作区的 FTS 数据不受影响）。
   * @param duplicates - 重名标题列表
   * @author fxbin
   */
  private mergeDuplicateWorkspaces(duplicates: Array<{ title: string }>) {
    const allTables = this.db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '%_fts'"
    ).all() as Array<{ name: string }>;

    const relatedTables = allTables
      .filter(({ name }) => {
        const columns = this.db.prepare(`PRAGMA table_info("${name}")`).all() as Array<{ name: string }>;
        return columns.some((col) => col.name === 'workspace_id');
      })
      .map(({ name }) => name);

    for (const { title } of duplicates) {
      const rows = this.db.prepare(
        'SELECT id FROM workspaces WHERE title = ? ORDER BY created_at ASC, rowid ASC'
      ).all(title) as Array<{ id: string }>;

      const keepId = rows[0].id;
      const removeIds = rows.slice(1).map((row) => row.id);

      this.db.exec('BEGIN');
      try {
        for (const table of relatedTables) {
          for (const removeId of removeIds) {
            this.db.prepare(
              `UPDATE OR IGNORE "${table}" SET workspace_id = ? WHERE workspace_id = ?`
            ).run(keepId, removeId);
          }
        }

        for (const removeId of removeIds) {
          this.db.prepare('DELETE FROM cards_fts WHERE workspace_id = ?').run(removeId);
          this.db.prepare('DELETE FROM materials_fts WHERE workspace_id = ?').run(removeId);
        }

        for (const removeId of removeIds) {
          this.db.prepare('DELETE FROM workspaces WHERE id = ?').run(removeId);
        }

        this.db.exec('COMMIT');
      } catch (error) {
        this.db.exec('ROLLBACK');
        throw error;
      }
    }
  }

  /**
   * 为微信读书配置表做向后兼容：若旧库没有 weread_settings 表则创建。
   * @author fxbin
   */
  private ensureWeReadSettingsTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS weread_settings (
        id TEXT PRIMARY KEY,
        api_key TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  }

  private ensureWeReadBookMetaTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS weread_book_meta (
        book_id TEXT PRIMARY KEY,
        book_id_long TEXT,
        title TEXT NOT NULL,
        author TEXT,
        cover TEXT,
        category TEXT,
        finish_reading INTEGER NOT NULL DEFAULT 0,
        read_update_time INTEGER,
        secret INTEGER NOT NULL DEFAULT 0,
        archive_year TEXT,
        present_on_shelf INTEGER NOT NULL DEFAULT 1,
        material_id TEXT REFERENCES materials(id) ON DELETE SET NULL,
        bookmark_count INTEGER,
        first_seen_at TEXT NOT NULL,
        last_synced_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_weread_book_meta_finish ON weread_book_meta(finish_reading);
      CREATE INDEX IF NOT EXISTS idx_weread_book_meta_archive_year ON weread_book_meta(archive_year);
      CREATE INDEX IF NOT EXISTS idx_weread_book_meta_read_update_time ON weread_book_meta(read_update_time DESC);
      CREATE INDEX IF NOT EXISTS idx_weread_book_meta_material_id ON weread_book_meta(material_id);
    `);
    const columns = this.db.prepare('PRAGMA table_info(weread_book_meta)').all() as Array<{ name: string }>;
    if (!columns.some((column) => column.name === 'book_id_long')) {
      this.db.exec('ALTER TABLE weread_book_meta ADD COLUMN book_id_long TEXT;');
    }
    if (!columns.some((column) => column.name === 'review_count')) {
      this.db.exec('ALTER TABLE weread_book_meta ADD COLUMN review_count INTEGER;');
    }
    if (!columns.some((column) => column.name === 'chapter_count')) {
      this.db.exec('ALTER TABLE weread_book_meta ADD COLUMN chapter_count INTEGER;');
    }
    if (!columns.some((column) => column.name === 'long_review_count')) {
      this.db.exec('ALTER TABLE weread_book_meta ADD COLUMN long_review_count INTEGER;');
    }
    if (!columns.some((column) => column.name === 'signals_synced_at')) {
      this.db.exec('ALTER TABLE weread_book_meta ADD COLUMN signals_synced_at TEXT;');
    }
    if (!columns.some((column) => column.name === 'signals_hash')) {
      this.db.exec('ALTER TABLE weread_book_meta ADD COLUMN signals_hash TEXT;');
    }
  }

  private ensureWeReadSyncStateTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS weread_sync_state (
        id TEXT PRIMARY KEY,
        shelf_update_time INTEGER,
        total_books INTEGER,
        last_full_sync_at TEXT,
        last_sync_error TEXT
      );
    `);
    const columns = this.db.prepare('PRAGMA table_info(weread_sync_state)').all() as Array<{ name: string }>;
    if (!columns.some((column) => column.name === 'last_probe_at')) {
      this.db.exec('ALTER TABLE weread_sync_state ADD COLUMN last_probe_at TEXT;');
    }
  }

  private ensureWeReadHiddenInterestStateTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS weread_hidden_interest_state (
        id TEXT PRIMARY KEY DEFAULT 'default',
        permanently_dismissed INTEGER NOT NULL DEFAULT 0,
        last_shown_at INTEGER NOT NULL DEFAULT 0,
        dismissed_book_ids TEXT NOT NULL DEFAULT '[]',
        updated_at INTEGER NOT NULL DEFAULT 0
      );
    `);
  }

  private ensureWeReadDataPortabilityTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS weread_data_portability (
        id TEXT PRIMARY KEY,
        format TEXT NOT NULL,
        manifest_json TEXT NOT NULL,
        filename TEXT NOT NULL,
        content_preview TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        revoke_deadline INTEGER NOT NULL,
        revoked_at INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_weread_data_portability_created ON weread_data_portability(created_at DESC);
    `);
  }

  private ensureWeReadReaderModeTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS weread_reader_mode (
        id TEXT PRIMARY KEY DEFAULT 'default',
        current_tier TEXT NOT NULL DEFAULT 'regular',
        temp_rollback_tier TEXT,
        temp_rollback_deadline INTEGER,
        updated_at INTEGER NOT NULL DEFAULT 0
      );
    `);
  }

  /**
   * 为轻校验覆盖状态表做向后兼容：若旧库没有 verification_state 表则创建（NS-7）。
   *
   * 追加块模式，兼容新旧数据库。verified_at 存毫秒时间戳字符串。
   * @author fxbin
   */
  private ensureVerificationStateTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS verification_state (
        book_id TEXT PRIMARY KEY,
        verified INTEGER NOT NULL DEFAULT 0,
        verified_at TEXT,
        passed_count INTEGER NOT NULL DEFAULT 0,
        attempts INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL
      );
    `);
  }

  syncWeReadBookMeta(books: WeReadShelfBook[], archiveYearMap: Map<string, string>): void {
    const nowIso = now();
    const seenIds = new Set<string>();
    const upsertStmt = this.db.prepare(`
      INSERT INTO weread_book_meta (
        book_id, book_id_long, title, author, cover, category,
        finish_reading, read_update_time, secret, archive_year,
        present_on_shelf, first_seen_at, last_synced_at
      ) VALUES (
        @bookId, @bookIdLong, @title, @author, @cover, @category,
        @finishReading, @readUpdateTime, @secret, @archiveYear,
        1, @nowIso, @nowIso
      )
      ON CONFLICT(book_id) DO UPDATE SET
        book_id_long = @bookIdLong,
        title = @title,
        author = @author,
        cover = @cover,
        category = @category,
        finish_reading = @finishReading,
        read_update_time = @readUpdateTime,
        secret = @secret,
        archive_year = @archiveYear,
        present_on_shelf = 1,
        last_synced_at = @nowIso
    `);
    for (const book of books) {
      seenIds.add(book.bookId);
      upsertStmt.run({
        bookId: book.bookId,
        bookIdLong: book.bookIdLong ?? null,
        title: book.title,
        author: book.author,
        cover: book.cover ?? null,
        category: book.category ?? null,
        finishReading: book.finishReading ?? 0,
        readUpdateTime: book.readUpdateTime ?? null,
        secret: book.secret ?? 0,
        archiveYear: archiveYearMap.get(book.bookId) ?? null,
        nowIso,
      });
    }
    const seenJson = JSON.stringify(Array.from(seenIds));
    this.db.prepare(`
      UPDATE weread_book_meta SET present_on_shelf = 0
      WHERE book_id NOT IN (SELECT value FROM json_each(?)) AND present_on_shelf = 1
    `).run(seenJson);
  }

  readWeReadBookMetaList(): WeReadBookMetaRow[] {
    return this.db.prepare(`
      SELECT book_id AS bookId, book_id_long AS bookIdLong, title, author, cover, category,
             finish_reading AS finishReading, read_update_time AS readUpdateTime,
             secret, archive_year AS archiveYear, present_on_shelf AS presentOnShelf,
             material_id AS materialId, bookmark_count AS bookmarkCount,
             review_count AS reviewCount, chapter_count AS chapterCount,
             long_review_count AS longReviewCount, signals_synced_at AS signalsSyncedAt,
             signals_hash AS signalsHash,
             first_seen_at AS firstSeenAt, last_synced_at AS lastSyncedAt
      FROM weread_book_meta WHERE present_on_shelf = 1
      ORDER BY read_update_time DESC
    `).all() as WeReadBookMetaRow[];
  }

  readAllWeReadBookMetaList(): WeReadBookMetaRow[] {
    return this.db.prepare(`
      SELECT book_id AS bookId, book_id_long AS bookIdLong, title, author, cover, category,
             finish_reading AS finishReading, read_update_time AS readUpdateTime,
             secret, archive_year AS archiveYear, present_on_shelf AS presentOnShelf,
             material_id AS materialId, bookmark_count AS bookmarkCount,
             review_count AS reviewCount, chapter_count AS chapterCount,
             long_review_count AS longReviewCount, signals_synced_at AS signalsSyncedAt,
             signals_hash AS signalsHash,
             first_seen_at AS firstSeenAt, last_synced_at AS lastSyncedAt
      FROM weread_book_meta
      ORDER BY read_update_time DESC
    `).all() as WeReadBookMetaRow[];
  }

  readWeReadSyncState(): WeReadSyncStateRow | null {
    const row = this.db.prepare(`
      SELECT shelf_update_time AS shelfUpdateTime, total_books AS totalBooks,
             last_full_sync_at AS lastFullSyncAt, last_probe_at AS lastProbeAt,
             last_sync_error AS lastSyncError
      FROM weread_sync_state WHERE id = 'default'
    `).get() as WeReadSyncStateRow | undefined;
    return row ?? null;
  }

  writeWeReadSyncState(state: WeReadSyncStateRow): void {
    this.db.prepare(`
      INSERT INTO weread_sync_state (id, shelf_update_time, total_books, last_full_sync_at, last_probe_at, last_sync_error)
      VALUES ('default', @shelfUpdateTime, @totalBooks, @lastFullSyncAt, @lastProbeAt, @lastSyncError)
      ON CONFLICT(id) DO UPDATE SET
        shelf_update_time = @shelfUpdateTime,
        total_books = @totalBooks,
        last_full_sync_at = @lastFullSyncAt,
        last_probe_at = @lastProbeAt,
        last_sync_error = @lastSyncError
    `).run({
      shelfUpdateTime: state.shelfUpdateTime,
      totalBooks: state.totalBooks,
      lastFullSyncAt: state.lastFullSyncAt,
      lastProbeAt: state.lastProbeAt,
      lastSyncError: state.lastSyncError,
    });
  }

  updateWeReadBookMetaImport(bookId: string, materialId: string, bookmarkCount: number): void {
    this.db.prepare(`
      UPDATE weread_book_meta SET material_id = ?, bookmark_count = ?
      WHERE book_id = ?
    `).run(materialId, bookmarkCount, bookId);
  }

  updateWeReadBookMetaSignals(input: {
    bookId: string;
    bookmarkCount: number;
    reviewCount: number;
    chapterCount: number;
    longReviewCount: number;
    signalsSyncedAt: string;
    signalsHash: string;
  }): boolean {
    const existing = this.db.prepare('SELECT signals_hash AS signalsHash FROM weread_book_meta WHERE book_id = ?').get(input.bookId) as { signalsHash: string | null } | undefined;
    if (existing && existing.signalsHash === input.signalsHash) {
      return false;
    }
    this.db.prepare(`
      UPDATE weread_book_meta SET
        bookmark_count = @bookmarkCount,
        review_count = @reviewCount,
        chapter_count = @chapterCount,
        long_review_count = @longReviewCount,
        signals_synced_at = @signalsSyncedAt,
        signals_hash = @signalsHash
      WHERE book_id = @bookId
    `).run(input);
    return true;
  }

  /**
   * 读取隐性真兴趣提示状态（NS-8）。库中无记录时返回 null。
   */
  readHiddenInterestState(): HiddenInterestState | null {
    const row = this.db.prepare('SELECT * FROM weread_hidden_interest_state WHERE id = ?').get('default') as
      | {
          permanently_dismissed: number;
          last_shown_at: number;
          dismissed_book_ids: string;
          updated_at: number;
        }
      | undefined;
    if (!row) return null;
    return {
      permanentlyDismissed: row.permanently_dismissed === 1,
      lastShownAt: row.last_shown_at,
      dismissedBookIds: JSON.parse(row.dismissed_book_ids) as string[],
      updatedAt: row.updated_at,
    };
  }

  /**
   * 保存隐性真兴趣提示状态（NS-8）。单行 upsert，主键固定为 'default'。
   */
  saveHiddenInterestState(state: HiddenInterestState): void {
    this.db
      .prepare(
        `
      INSERT INTO weread_hidden_interest_state (id, permanently_dismissed, last_shown_at, dismissed_book_ids, updated_at)
      VALUES ('default', @permanentlyDismissed, @lastShownAt, @dismissedBookIds, @updatedAt)
      ON CONFLICT(id) DO UPDATE SET
        permanently_dismissed = @permanentlyDismissed,
        last_shown_at = @lastShownAt,
        dismissed_book_ids = @dismissedBookIds,
        updated_at = @updatedAt
    `,
      )
      .run({
        permanentlyDismissed: state.permanentlyDismissed ? 1 : 0,
        lastShownAt: state.lastShownAt,
        dismissedBookIds: JSON.stringify(state.dismissedBookIds),
        updatedAt: state.updatedAt,
      });
  }

  /**
   * 记录一条数据可携导出（NS-8）。manifest 以 JSON 文本落库。
   */
  recordDataPortability(record: DataPortabilityRecord): void {
    this.db
      .prepare(
        `
      INSERT INTO weread_data_portability (id, format, manifest_json, filename, content_preview, created_at, revoke_deadline, revoked_at)
      VALUES (@id, @format, @manifestJson, @filename, @contentPreview, @createdAt, @revokeDeadline, @revokedAt)
    `,
      )
      .run({
        id: record.id,
        format: record.format,
        manifestJson: JSON.stringify(record.manifest),
        filename: record.filename,
        contentPreview: record.contentPreview,
        createdAt: record.createdAt,
        revokeDeadline: record.revokeDeadline,
        revokedAt: record.revokedAt,
      });
  }

  /**
   * 列出全部数据可携导出记录（NS-8），按创建时间倒序返回。
   */
  listDataPortability(): DataPortabilityRecord[] {
    const rows = this.db
      .prepare('SELECT * FROM weread_data_portability ORDER BY created_at DESC')
      .all() as Array<{
      id: string;
      format: string;
      manifest_json: string;
      filename: string;
      content_preview: string;
      created_at: number;
      revoke_deadline: number;
      revoked_at: number | null;
    }>;
    return rows.map((row) => ({
      id: row.id,
      format: row.format as DataPortabilityFormat,
      manifest: JSON.parse(row.manifest_json) as DataPortabilityManifest,
      filename: row.filename,
      contentPreview: row.content_preview,
      createdAt: row.created_at,
      revokeDeadline: row.revoke_deadline,
      revokedAt: row.revoked_at,
    }));
  }

  /**
   * 撤回指定数据可携导出记录（NS-8），写入撤回时间戳。
   */
  revokeDataPortability(id: string, revokedAt: number): void {
    this.db
      .prepare('UPDATE weread_data_portability SET revoked_at = ? WHERE id = ?')
      .run(revokedAt, id);
  }

  /**
   * 读取阅读模式状态（NS-8）。库中无记录时返回 null。
   */
  readReaderModeState(): ReaderModeState | null {
    const row = this.db.prepare('SELECT * FROM weread_reader_mode WHERE id = ?').get('default') as
      | {
          current_tier: string;
          temp_rollback_tier: string | null;
          temp_rollback_deadline: number | null;
          updated_at: number;
        }
      | undefined;
    if (!row) return null;
    return {
      currentTier: row.current_tier as AudienceTier,
      tempRollbackTier: row.temp_rollback_tier as AudienceTier | null,
      tempRollbackDeadline: row.temp_rollback_deadline,
      updatedAt: row.updated_at,
    };
  }

  /**
   * 保存阅读模式状态（NS-8）。单行 upsert，主键固定为 'default'。
   */
  saveReaderModeState(state: ReaderModeState): void {
    this.db
      .prepare(
        `
      INSERT INTO weread_reader_mode (id, current_tier, temp_rollback_tier, temp_rollback_deadline, updated_at)
      VALUES ('default', @currentTier, @tempRollbackTier, @tempRollbackDeadline, @updatedAt)
      ON CONFLICT(id) DO UPDATE SET
        current_tier = @currentTier,
        temp_rollback_tier = @tempRollbackTier,
        temp_rollback_deadline = @tempRollbackDeadline,
        updated_at = @updatedAt
    `,
      )
      .run({
        currentTier: state.currentTier,
        tempRollbackTier: state.tempRollbackTier,
        tempRollbackDeadline: state.tempRollbackDeadline,
        updatedAt: state.updatedAt,
      });
  }

  computeWeReadStats(): WeReadStatsResponse {
    const nowSec = Math.floor(Date.now() / 1000);
    const sevenDaysAgo = nowSec - 7 * 86400;
    const thirtyDaysAgo = nowSec - 30 * 86400;

    const totals = this.db.prepare(`
      SELECT
        COUNT(*) AS totalBooks,
        SUM(finish_reading = 1) AS finishedBooks,
        SUM(material_id IS NOT NULL) AS importedToZhijing,
        SUM(CASE WHEN read_update_time >= ? THEN 1 ELSE 0 END) AS activeLast7Days,
        SUM(CASE WHEN read_update_time >= ? THEN 1 ELSE 0 END) AS activeLast30Days
      FROM weread_book_meta WHERE present_on_shelf = 1
    `).get(sevenDaysAgo, thirtyDaysAgo) as {
      totalBooks: number;
      finishedBooks: number;
      importedToZhijing: number;
      activeLast7Days: number;
      activeLast30Days: number;
    };

    const categoryRows = this.db.prepare(`
      SELECT COALESCE(NULLIF(category, ''), '未分类') AS category, COUNT(*) AS count
      FROM weread_book_meta WHERE present_on_shelf = 1
      GROUP BY 1 ORDER BY count DESC
    `).all() as WeReadCategorySlice[];

    const yearRows = this.db.prepare(`
      SELECT archive_year AS year, COUNT(*) AS count
      FROM weread_book_meta WHERE present_on_shelf = 1 AND archive_year IS NOT NULL
      GROUP BY 1 ORDER BY year ASC
    `).all() as WeReadYearTrend[];

    const monthRows = this.db.prepare(`
      SELECT strftime('%Y-%m', read_update_time, 'unixepoch') AS month, COUNT(*) AS count
      FROM weread_book_meta WHERE present_on_shelf = 1 AND read_update_time IS NOT NULL
      GROUP BY 1 ORDER BY month ASC
    `).all() as WeReadMonthlyActivity[];

    const topBookRows = this.db.prepare(`
      SELECT book_id AS bookId, title, author, cover,
             read_update_time AS readUpdateTime, finish_reading AS finishReading
      FROM weread_book_meta WHERE present_on_shelf = 1 AND read_update_time IS NOT NULL
      ORDER BY read_update_time DESC LIMIT 5
    `).all() as unknown as WeReadRecentBook[];

    const syncState = this.readWeReadSyncState();

    return {
      totalBooks: totals.totalBooks,
      finishedBooks: totals.finishedBooks,
      inProgressBooks: totals.totalBooks - totals.finishedBooks,
      importedToZhijing: totals.importedToZhijing,
      categoryDistribution: categoryRows,
      archiveYearTrend: yearRows,
      monthlyActivity: monthRows,
      recentReading: {
        activeLast7Days: totals.activeLast7Days,
        activeLast30Days: totals.activeLast30Days,
        topBooks: topBookRows.map((row) => ({ ...row, finishReading: Boolean(row.finishReading) })),
      },
      lastSyncedAt: syncState?.lastFullSyncAt ?? null,
      lastSyncError: syncState?.lastSyncError ?? null,
    };
  }

  private ensureArtifactSubtypeColumn() {
    const columns = this.db.prepare('PRAGMA table_info(artifacts)').all() as Array<{ name: string }>;
    if (!columns.some((column) => column.name === 'subtype')) {
      this.db.exec("ALTER TABLE artifacts ADD COLUMN subtype TEXT NOT NULL DEFAULT 'summary';");
    }
  }

  private ensureCardRecallColumn() {
    const columns = this.db.prepare('PRAGMA table_info(cards)').all() as Array<{ name: string }>;
    if (!columns.some((column) => column.name === 'recall_json')) {
      this.db.exec('ALTER TABLE cards ADD COLUMN recall_json TEXT;');
    }
  }

  /**
   * 创建 attention_log 表及索引，记录用户注意力信号。
   * 使用 IF NOT EXISTS 保证幂等，兼容新旧数据库。
   * @author fxbin
   */
  private ensureAttentionLogTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS attention_log (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        signal_type TEXT NOT NULL,
        signal_strength TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        context_data_json TEXT NOT NULL DEFAULT '{}',
        consumed INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_attention_log_kb ON attention_log(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_attention_log_created ON attention_log(created_at DESC);

      CREATE TABLE IF NOT EXISTS agent_proposals (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        action_label TEXT NOT NULL,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'pending',
        generated_at TEXT NOT NULL,
        decided_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_agent_proposals_kb ON agent_proposals(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_agent_proposals_status ON agent_proposals(workspace_id, status);
      CREATE INDEX IF NOT EXISTS idx_agent_proposals_dedup ON agent_proposals(workspace_id, type, title, generated_at);
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agent_usage (
        id TEXT PRIMARY KEY,
        workspace_id TEXT,
        task_type TEXT NOT NULL,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        role TEXT NOT NULL,
        input_tokens INTEGER,
        output_tokens INTEGER,
        cost_usd REAL,
        ok INTEGER NOT NULL DEFAULT 1,
        error_message TEXT,
        started_at TEXT NOT NULL,
        duration_ms INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_agent_usage_workspace ON agent_usage(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_agent_usage_task ON agent_usage(task_type);
      CREATE INDEX IF NOT EXISTS idx_agent_usage_started ON agent_usage(started_at);
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agent_chat_sessions (
        session_id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        message_count INTEGER NOT NULL DEFAULT 0,
        raw_messages_json TEXT NOT NULL DEFAULT '[]',
        provider TEXT,
        model TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_used_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_agent_chat_sessions_workspace ON agent_chat_sessions(workspace_id, last_used_at DESC);

      CREATE TABLE IF NOT EXISTS agent_chat_messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES agent_chat_sessions(session_id) ON DELETE CASCADE,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        text TEXT NOT NULL,
        reasoning TEXT NOT NULL DEFAULT '',
        raw_json TEXT NOT NULL,
        sequence INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_agent_chat_messages_session ON agent_chat_messages(session_id, sequence);

      CREATE TABLE IF NOT EXISTS agent_chat_runs (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES agent_chat_sessions(session_id) ON DELETE CASCADE,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        input_tokens INTEGER,
        output_tokens INTEGER,
        cache_read_tokens INTEGER,
        cache_write_tokens INTEGER,
        cost_usd REAL,
        duration_ms INTEGER NOT NULL,
        status TEXT NOT NULL,
        error_message TEXT,
        started_at TEXT NOT NULL,
        ended_at TEXT NOT NULL,
        tool_call_count INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_agent_chat_runs_session ON agent_chat_runs(session_id, started_at);
      CREATE INDEX IF NOT EXISTS idx_agent_chat_runs_workspace ON agent_chat_runs(workspace_id, started_at DESC);

      CREATE TABLE IF NOT EXISTS agent_chat_tool_calls (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL REFERENCES agent_chat_runs(id) ON DELETE CASCADE,
        session_id TEXT NOT NULL REFERENCES agent_chat_sessions(session_id) ON DELETE CASCADE,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        tool_call_id TEXT NOT NULL,
        tool_name TEXT NOT NULL,
        args_json TEXT NOT NULL,
        result TEXT NOT NULL,
        details_json TEXT,
        is_error INTEGER NOT NULL DEFAULT 0,
        started_at TEXT NOT NULL,
        ended_at TEXT NOT NULL,
        duration_ms INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_agent_chat_tool_calls_run ON agent_chat_tool_calls(run_id);
      CREATE INDEX IF NOT EXISTS idx_agent_chat_tool_calls_session ON agent_chat_tool_calls(session_id, started_at);
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_memory (
        id TEXT PRIMARY KEY,
        scope TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        source TEXT NOT NULL,
        workspace_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_user_memory_scope ON user_memory(scope);
      CREATE INDEX IF NOT EXISTS idx_user_memory_workspace ON user_memory(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_user_memory_key ON user_memory(key);
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS decision_log (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        workspace_id TEXT,
        summary TEXT NOT NULL,
        reasoning TEXT NOT NULL,
        evidence_card_ids_json TEXT NOT NULL,
        agent_task_type TEXT,
        metadata_json TEXT,
        archived INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_decision_log_kind ON decision_log(kind);
      CREATE INDEX IF NOT EXISTS idx_decision_log_workspace ON decision_log(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_decision_log_created ON decision_log(created_at);
    `);
  }

  /**
   * 为 messages 表追加 proposed_cards_json 列，存储对话生成的卡片提议。
   * 兼容旧库：已存在列时跳过 ALTER。
   * @author fxbin
   */
  private ensureMessagesProposedCardsColumn() {
    const columns = this.db.prepare('PRAGMA table_info(messages)').all() as Array<{ name: string }>;
    if (!columns.some((column) => column.name === 'proposed_cards_json')) {
      this.db.exec('ALTER TABLE messages ADD COLUMN proposed_cards_json TEXT;');
    }
  }

  /**
   * 创建 agent_action_log 表及索引，记录 Agent 行为日志（P10-5）。
   * 使用 IF NOT EXISTS 保证幂等，兼容新旧数据库。
   * @author fxbin
   */
  private ensureAgentActionLogTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agent_action_log (
        id TEXT PRIMARY KEY,
        action TEXT NOT NULL,
        workspace_id TEXT,
        input_json TEXT NOT NULL,
        output_json TEXT,
        duration_ms INTEGER NOT NULL,
        success INTEGER NOT NULL,
        error TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_agent_action_log_kb ON agent_action_log(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_agent_action_log_action ON agent_action_log(action);
      CREATE INDEX IF NOT EXISTS idx_agent_action_log_created ON agent_action_log(created_at DESC);
    `);
  }

  /**
   * 插入 Agent 行为日志（SQLite 实现）。
   * @param log - 行为日志记录
   * @author fxbin
   */
  insertAgentActionLog(log: AgentActionLog): void {
    this.ensureAgentActionLogTable();
    this.db.prepare(`
      INSERT INTO agent_action_log (
        id, action, workspace_id, input_json, output_json, duration_ms, success, error, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      log.id,
      log.action,
      log.workspaceId ?? null,
      JSON.stringify(log.input),
      log.output ? JSON.stringify(log.output) : null,
      log.durationMs,
      log.success ? AGENT_ACTION_SUCCESS_TRUE : AGENT_ACTION_SUCCESS_FALSE,
      log.error ?? null,
      log.createdAt,
    );
  }

  /**
   * 查询 Agent 行为日志（SQLite 实现）。
   * @param options - 查询选项
   * @author fxbin
   */
  listAgentActionLogs(options?: { workspaceId?: string; action?: string; limit?: number }): AgentActionLog[] {
    this.ensureAgentActionLogTable();
    const limit = Math.min(options?.limit ?? AGENT_ACTION_LOG_DEFAULT_LIMIT, AGENT_ACTION_LOG_MAX_LIMIT);
    const conditions: string[] = [];
    const params: Array<string | number> = [];
    if (options?.workspaceId) {
      conditions.push('workspace_id = ?');
      params.push(options.workspaceId);
    }
    if (options?.action) {
      conditions.push('action = ?');
      params.push(options.action);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = this.db.prepare(
      `SELECT * FROM agent_action_log ${whereClause} ORDER BY created_at DESC LIMIT ?`,
    ).all(...params, limit) as AgentActionLogRow[];
    return rows.map(mapAgentActionLog);
  }

  /**
   * 统计 Agent 行为日志数量（SQLite 实现）。
   * @param options - 查询选项
   * @author fxbin
   */
  countAgentActionLogs(options?: { workspaceId?: string; action?: string }): number {
    this.ensureAgentActionLogTable();
    const conditions: string[] = [];
    const params: Array<string | number> = [];
    if (options?.workspaceId) {
      conditions.push('workspace_id = ?');
      params.push(options.workspaceId);
    }
    if (options?.action) {
      conditions.push('action = ?');
      params.push(options.action);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const row = this.db.prepare(
      `SELECT COUNT(*) as count FROM agent_action_log ${whereClause}`,
    ).get(...params) as { count: number };
    return row.count;
  }

  /**
   * 执行 inspect SQL 查询（SQLite 实现，只读）。
   *
   * 安全限制：
   * 1. 仅允许 SELECT 语句，禁止任何写操作；
   * 2. 禁止查询含凭证的敏感表（model_provider_settings、model_provider_profiles、weread_settings）；
   * 3. 禁止查询用户记忆与决策日志等隐私表（user_memory、decision_log）；
   * 4. limit 参数强制整数化并限定上限，拒绝负数（SQLite 中 LIMIT 负数表示无上限），避免 DoS。
   *
   * @param sql - SQL 语句（必须是 SELECT）
   * @param limit - 最大返回行数
   * @author fxbin
   */
  executeInspectQuery(sql: string, limit?: number): Array<Record<string, unknown>> {
    const trimmedSql = sql.trim();
    const lowered = trimmedSql.toLowerCase();
    if (!lowered.startsWith('select')) {
      throw new KnowledgeCoreError('inspect 仅支持 SELECT 语句。', 400);
    }
    for (const forbidden of INSPECT_FORBIDDEN_TABLES) {
      if (lowered.includes(forbidden)) {
        throw new KnowledgeCoreError(`inspect 禁止查询敏感表：${forbidden}`, 403);
      }
    }
    const rawLimit = Number.isFinite(limit as number) && (limit as number) >= 1
      ? Math.floor(limit as number)
      : AGENT_ACTION_LOG_DEFAULT_LIMIT;
    const maxRows = Math.min(rawLimit, AGENT_ACTION_LOG_MAX_LIMIT);
    const stmt = this.db.prepare(`${trimmedSql} LIMIT ${maxRows}`);
    return stmt.all() as Array<Record<string, unknown>>;
  }

  /**
   * 列出 inspect 可用的表（SQLite 实现）。
   * @author fxbin
   */
  listInspectTables(): Array<{ name: string; sql: string }> {
    const rows = this.db.prepare(
      "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    ).all() as Array<{ name: string; sql: string }>;
    return rows;
  }
}

function mapWorkspace(row: WorkspaceRow): WorkspaceSummary {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    stage: row.stage,
    sourceCount: row.source_count,
    cardCount: row.card_count,
    sourcedRatio: row.sourced_ratio,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMaterial(row: MaterialRow): MaterialRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    type: row.type,
    rawInput: row.raw_input,
    sourceUrl: row.source_url ?? undefined,
    platform: row.platform ?? undefined,
    title: row.title,
    contentText: row.content_text ?? undefined,
    mediaUrls: parseJsonStringArray(row.media_urls_json),
    parseStatus: row.parse_status,
    parseError: row.parse_error ?? undefined,
    transcript: row.transcript ?? undefined,
    transcriptStatus: row.transcript_status ?? undefined,
    transcriptError: row.transcript_error ?? undefined,
    createdAt: row.created_at,
    statusTimeline: parseStatusTimeline(row.status_timeline_json),
    archived: row.archived === 1,
  };
}

function parseJsonStringArray(value: string | null | undefined) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function parseStatusTimeline(value: string | null | undefined): MaterialStatusTimeline | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as MaterialStatusTimeline) : undefined;
  } catch {
    return undefined;
  }
}

function serializeTimeline(timeline: MaterialStatusTimeline | undefined): string | null {
  return timeline ? JSON.stringify(timeline) : null;
}

function stampMaterialStatus(
  material: MaterialRecord,
  nextStatus: ParseStatus,
  options?: { markQueued?: boolean },
): void {
  material.parseStatus = nextStatus;
  const timeline: MaterialStatusTimeline = material.statusTimeline ?? { capturedAt: material.createdAt };
  const stamp = new Date().toISOString();
  if (options?.markQueued && !timeline.queuedAt) timeline.queuedAt = stamp;
  if (nextStatus === 'saved') {
    if (!timeline.capturedAt) timeline.capturedAt = stamp;
  } else if (nextStatus === 'parsing') {
    timeline.parsingAt = stamp;
  } else if (nextStatus === 'needs_review') {
    timeline.reviewedAt = stamp;
  } else if (nextStatus === 'ingested') {
    timeline.ingestedAt = stamp;
  } else if (nextStatus === 'failed') {
    timeline.failedAt = stamp;
  }
  material.statusTimeline = timeline;
}

function mapCard(row: CardRow): KnowledgeCard {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    materialId: row.material_id ?? undefined,
    type: row.type,
    title: row.title,
    body: row.body,
    claimStatus: row.claim_status,
    recall: parseCardRecall(row.recall_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archived: row.archived === 1,
  };
}

function parseCardRecall(json: string | null): CardRecall | undefined {
  if (!json) return undefined;
  try {
    const parsed = JSON.parse(json) as Partial<CardRecall>;
    if (typeof parsed.dueAt !== 'string' || typeof parsed.ease !== 'number' || typeof parsed.interval !== 'number') {
      return undefined;
    }
    return {
      dueAt: parsed.dueAt,
      ease: parsed.ease,
      interval: parsed.interval,
      reviewedAt: typeof parsed.reviewedAt === 'string' ? parsed.reviewedAt : undefined,
    };
  } catch {
    return undefined;
  }
}

function serializeCardRecall(recall: CardRecall | undefined): string | null {
  if (!recall) return null;
  return JSON.stringify(recall);
}

function mapCardRevision(row: CardRevisionRow): CardRevision {
  return {
    id: row.id,
    cardId: row.card_id,
    version: row.version,
    titleSnapshot: row.title_snapshot,
    bodySnapshot: row.body_snapshot,
    typeSnapshot: row.type_snapshot,
    claimStatusSnapshot: row.claim_status_snapshot,
    changedFields: parseRevisionFields(row.changed_fields_json),
    createdAt: row.created_at,
  };
}

const FTS_SPECIAL_CHARS_PATTERN = /["*:(\-+)^]/g;
const FTS_WHITESPACE_PATTERN = /\s+/g;
const CJK_CHARACTER_PATTERN = /[\u4e00-\u9fff]/;

/**
 * 清理 FTS5 查询字符串，去除 FTS5 查询语法中的特殊字符，避免语法错误。
 * 仅保留可被分词器处理的普通文本，清理后用于 MATCH 查询。
 * @author fxbin
 * @param {string} query - 原始查询字符串
 * @returns {string} 清理后的查询字符串，可能为空字符串
 */
function sanitizeFtsQuery(query: string): string {
  return query
    .replace(FTS_SPECIAL_CHARS_PATTERN, ' ')
    .replace(FTS_WHITESPACE_PATTERN, ' ')
    .trim();
}

/**
 * 从查询字符串中提取搜索词，用于内存实现的关键词匹配。
 * 先按空格分词；若结果为单个包含 CJK 字符的词，则按字符分割以模拟 FTS5 unicode61 对中文的分词行为。
 * @author fxbin
 * @param {string} query - 原始查询字符串
 * @returns {string[]} 去重后的搜索词数组
 */
function extractSearchTerms(query: string): string[] {
  const words = query
    .replace(FTS_SPECIAL_CHARS_PATTERN, ' ')
    .split(/\s+/)
    .filter((term) => term.length > 0);
  if (words.length === 0) return [];
  if (words.length === 1 && CJK_CHARACTER_PATTERN.test(words[0])) {
    const chars = words[0].split('').filter((char) => CJK_CHARACTER_PATTERN.test(char));
    if (chars.length <= 1) return chars;
    const bigrams: string[] = [];
    for (let i = 0; i < chars.length - 1; i++) {
      bigrams.push(chars[i] + chars[i + 1]);
    }
    return Array.from(new Set(bigrams));
  }
  return Array.from(new Set(words));
}

/**
 * 计算文本与搜索词的相关性评分，用于内存实现的关键词匹配。
 * 标题匹配权重高于正文匹配，返回所有匹配词的加权总分。
 * @author fxbin
 * @param {string} title - 标题文本
 * @param {string} body - 正文文本
 * @param {string[]} terms - 搜索词数组
 * @returns {number} 相关性评分，0 表示无匹配
 */
function scoreTextRelevance(title: string, body: string, terms: string[]): number {
  let score = 0;
  for (const term of terms) {
    if (title.includes(term)) score += MEMORY_SEARCH_TITLE_WEIGHT;
    if (body.includes(term)) score += MEMORY_SEARCH_BODY_WEIGHT;
  }
  return score;
}

const REVISION_FIELDS: CardRevisionField[] = ['title', 'body', 'type', 'claimStatus'];

function parseRevisionFields(json: string): CardRevisionField[] {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is CardRevisionField =>
      typeof item === 'string' && (REVISION_FIELDS as string[]).includes(item),
    );
  } catch {
    return [];
  }
}

type ExportRow = {
  id: string;
  workspace_id: string;
  format: ExportFormat;
  scope: ExportScope;
  include_artifacts: number;
  material_count: number;
  card_count: number;
  artifact_count: number;
  filename: string;
  created_at: string;
};

function mapExportRecord(row: ExportRow): ExportRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    format: row.format,
    scope: row.scope,
    includeArtifacts: row.include_artifacts === 1,
    materialCount: row.material_count,
    cardCount: row.card_count,
    artifactCount: row.artifact_count,
    filename: row.filename,
    createdAt: row.created_at,
  };
}

type SavedFilterRow = {
  id: string;
  scope: SavedFilterScope;
  card_type: string | null;
  claim_status: string | null;
  sort_key: string;
  keyword: string;
  updated_at: string;
};

function mapSavedFilter(row: SavedFilterRow): SavedFilter {
  return {
    id: row.id,
    scope: row.scope,
    cardType: row.card_type,
    claimStatus: row.claim_status,
    sortKey: row.sort_key,
    keyword: row.keyword,
    updatedAt: row.updated_at,
  };
}

type EntityRow = {
  id: string;
  workspace_id: string;
  name: string;
  type: EntityType;
  description: string;
  source_card_ids_json: string;
  created_at: string;
  updated_at: string;
};

function mapEntity(row: EntityRow): Entity {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    type: row.type,
    description: row.description,
    sourceCardIds: JSON.parse(row.source_card_ids_json) as string[],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

type ConflictAuditRow = {
  id: string;
  kind: ConflictKind;
  action: ConflictResolutionAction;
  keep_id: string;
  drop_ids_json: string;
  workspace_id: string;
  note: string;
  created_at: string;
};

function mapConflictAudit(row: ConflictAuditRow): ConflictAuditEntry {
  return {
    id: row.id,
    kind: row.kind,
    action: row.action,
    keepId: row.keep_id,
    dropIds: JSON.parse(row.drop_ids_json) as string[],
    workspaceId: row.workspace_id,
    note: row.note,
    createdAt: row.created_at,
  };
}

type AttentionLogRow = {
  id: string;
  workspace_id: string;
  signal_type: AttentionSignalType;
  signal_strength: AttentionSignalStrength;
  target_type: AttentionSignalTargetType;
  target_id: string;
  context_data_json: string;
  consumed: number;
  created_at: string;
};

/**
 * 将 attention_log 表行映射为 AttentionSignal 对象。
 * @param row - 数据库行
 * @returns 注意力信号对象
 * @author fxbin
 */
function mapAttentionSignal(row: AttentionLogRow): AttentionSignal {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    signalType: row.signal_type,
    signalStrength: row.signal_strength,
    targetType: row.target_type,
    targetId: row.target_id,
    contextData: JSON.parse(row.context_data_json) as Record<string, unknown>,
    consumed: row.consumed === 1,
    createdAt: row.created_at,
  };
}

type ProposalRow = {
  id: string;
  workspace_id: string;
  type: string;
  title: string;
  description: string;
  action_label: string;
  metadata_json: string;
  status: string;
  generated_at: string;
  decided_at: string | null;
};

function mapProposal(row: ProposalRow): PersistedProposal {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    type: row.type as PersistedProposal['type'],
    title: row.title,
    description: row.description,
    actionLabel: row.action_label,
    metadata: JSON.parse(row.metadata_json) as Record<string, unknown>,
    status: row.status as ProposalStatus,
    generatedAt: row.generated_at,
    decidedAt: row.decided_at,
  };
}

type AgentUsageRow = {
  id: string;
  workspace_id: string | null;
  task_type: string;
  provider: string;
  model: string;
  role: string;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_usd: number | null;
  ok: number;
  error_message: string | null;
  started_at: string;
  duration_ms: number;
};

type AgentChatSessionRow = {
  session_id: string;
  workspace_id: string;
  title: string;
  message_count: number;
  raw_messages_json: string;
  provider: string | null;
  model: string | null;
  created_at: string;
  updated_at: string;
  last_used_at: string;
};

type AgentChatMessageRow = {
  id: string;
  session_id: string;
  workspace_id: string;
  role: string;
  text: string;
  reasoning: string;
  raw_json: string;
  sequence: number;
  created_at: string;
};

type AgentChatRunRow = {
  id: string;
  session_id: string;
  workspace_id: string;
  provider: string;
  model: string;
  input_tokens: number | null;
  output_tokens: number | null;
  cache_read_tokens: number | null;
  cache_write_tokens: number | null;
  cost_usd: number | null;
  duration_ms: number;
  status: string;
  error_message: string | null;
  started_at: string;
  ended_at: string;
  tool_call_count: number;
};

type AgentChatToolCallRow = {
  id: string;
  run_id: string;
  session_id: string;
  workspace_id: string;
  tool_call_id: string;
  tool_name: string;
  args_json: string;
  result: string;
  details_json: string | null;
  is_error: number;
  started_at: string;
  ended_at: string;
  duration_ms: number;
};

function mapAgentUsage(row: AgentUsageRow): AgentUsageRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    taskType: row.task_type as AgentUsageRecord['taskType'],
    provider: row.provider,
    model: row.model,
    role: row.role as AgentUsageRecord['role'],
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    costUsd: row.cost_usd,
    ok: row.ok === 1,
    errorMessage: row.error_message,
    startedAt: row.started_at,
    durationMs: row.duration_ms,
  };
}

function mapAgentChatRun(row: AgentChatRunRow): AgentChatRunRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    workspaceId: row.workspace_id,
    provider: row.provider,
    model: row.model,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    cacheReadTokens: row.cache_read_tokens,
    cacheWriteTokens: row.cache_write_tokens,
    costUsd: row.cost_usd,
    durationMs: row.duration_ms,
    status: row.status as AgentChatRunRecord['status'],
    errorMessage: row.error_message,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    toolCallCount: row.tool_call_count,
  };
}

function mapAgentChatSession(row: AgentChatSessionRow, lastRun?: AgentChatRunRecord): AgentChatSessionInfo {
  return {
    sessionId: row.session_id,
    workspaceId: row.workspace_id,
    title: row.title,
    messageCount: row.message_count,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    provider: row.provider ?? undefined,
    model: row.model ?? undefined,
    lastRun,
  };
}

function mapAgentChatMessage(row: AgentChatMessageRow): AgentChatMessageRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    workspaceId: row.workspace_id,
    role: row.role as AgentChatMessageRecord['role'],
    text: row.text,
    reasoning: row.reasoning,
    raw: JSON.parse(row.raw_json) as unknown,
    createdAt: row.created_at,
    sequence: row.sequence,
  };
}

function mapAgentChatToolCall(row: AgentChatToolCallRow): AgentChatToolCallRecord {
  return {
    id: row.id,
    runId: row.run_id,
    sessionId: row.session_id,
    workspaceId: row.workspace_id,
    toolCallId: row.tool_call_id,
    toolName: row.tool_name,
    args: JSON.parse(row.args_json) as unknown,
    result: row.result,
    details: row.details_json ? JSON.parse(row.details_json) as unknown : undefined,
    isError: row.is_error === 1,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationMs: row.duration_ms,
  };
}

type UserMemoryRow = {
  id: string;
  scope: string;
  key: string;
  value: string;
  source: string;
  workspace_id: string | null;
  created_at: string;
  updated_at: string;
};

function mapUserMemory(row: UserMemoryRow): UserMemory {
  return {
    id: row.id,
    scope: row.scope as UserMemoryScope,
    key: row.key,
    value: row.value,
    source: row.source as UserMemorySource,
    workspaceId: row.workspace_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

type DecisionLogRow = {
  id: string;
  kind: string;
  workspace_id: string | null;
  summary: string;
  reasoning: string;
  evidence_card_ids_json: string;
  agent_task_type: string | null;
  metadata_json: string | null;
  created_at: string;
};

function mapDecisionLog(row: DecisionLogRow): DecisionLog {
  return {
    id: row.id,
    kind: row.kind as DecisionLogKind,
    workspaceId: row.workspace_id ?? undefined,
    summary: row.summary,
    reasoning: row.reasoning,
    evidenceCardIds: JSON.parse(row.evidence_card_ids_json) as string[],
    agentTaskType: row.agent_task_type as DecisionLog['agentTaskType'] ?? undefined,
    metadata: row.metadata_json ? JSON.parse(row.metadata_json) as Record<string, unknown> : undefined,
    createdAt: row.created_at,
  };
}

type AgentActionLogRow = {
  id: string;
  action: string;
  workspace_id: string | null;
  input_json: string;
  output_json: string | null;
  duration_ms: number;
  success: number;
  error: string | null;
  created_at: string;
};

/**
 * 将 agent_action_log 表行映射为 AgentActionLog 对象。
 * @param row - 数据库行
 * @returns Agent 行为日志对象
 * @author fxbin
 */
function mapAgentActionLog(row: AgentActionLogRow): AgentActionLog {
  return {
    id: row.id,
    action: row.action as AgentAction,
    workspaceId: row.workspace_id ?? undefined,
    input: JSON.parse(row.input_json) as Record<string, unknown>,
    output: row.output_json ? JSON.parse(row.output_json) as Record<string, unknown> : undefined,
    durationMs: row.duration_ms,
    success: row.success === AGENT_ACTION_SUCCESS_TRUE,
    error: row.error ?? undefined,
    createdAt: row.created_at,
  };
}

type MapCustomEdgeRow = {
  id: string;
  workspace_id: string;
  source_node_id: string;
  target_node_id: string;
  relation: string;
  created_at: string;
};

/**
 * 将 map_custom_edges 表行映射为 KnowledgeMapCustomEdge 对象。
 * @param row - 数据库行
 * @returns 自定义地图边对象
 * @author fxbin
 */
function mapMapCustomEdge(row: MapCustomEdgeRow): KnowledgeMapCustomEdge {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    sourceNodeId: row.source_node_id,
    targetNodeId: row.target_node_id,
    relation: row.relation as 'supports' | 'contradicts' | 'related_to',
    createdAt: row.created_at,
  };
}

const RECALL_EASE_FLOOR = 1.3;
const RECALL_EASE_CEIL = 2.8;
const RECALL_EASE_STEP = 0.15;
const RECALL_INTERVAL_LAPSE = 1;
const RECALL_INTERVAL_GRADUATING_GOOD = 3;
const RECALL_INTERVAL_GRADUATING_EASY = 4;
const RECALL_MS_PER_DAY = 86_400_000;

function clampEase(ease: number): number {
  if (ease < RECALL_EASE_FLOOR) return RECALL_EASE_FLOOR;
  if (ease > RECALL_EASE_CEIL) return RECALL_EASE_CEIL;
  return ease;
}

export function scheduleCardRecall(prev: CardRecall | undefined, grade: RecallGrade): CardRecall {
  const ease = prev?.ease ?? clampEase(2.5);
  const prevInterval = prev?.interval ?? 0;
  const reviewedAt = new Date().toISOString();

  if (grade === 'again') {
    return { dueAt: reviewedAt, ease: clampEase(ease - RECALL_EASE_STEP), interval: RECALL_INTERVAL_LAPSE, reviewedAt };
  }

  let nextEase = ease;
  let nextInterval: number;
  if (grade === 'hard') {
    nextEase = clampEase(ease - RECALL_EASE_STEP);
    nextInterval = prevInterval <= 0 ? RECALL_INTERVAL_LAPSE : Math.max(RECALL_INTERVAL_LAPSE, Math.round(prevInterval * 1.2));
  } else if (grade === 'good') {
    nextInterval = prevInterval <= 0 ? RECALL_INTERVAL_LAPSE : prevInterval === RECALL_INTERVAL_LAPSE ? RECALL_INTERVAL_GRADUATING_GOOD : Math.round(prevInterval * ease);
  } else {
    nextEase = clampEase(ease + RECALL_EASE_STEP);
    nextInterval = prevInterval <= 0 ? 2 : prevInterval === RECALL_INTERVAL_LAPSE ? RECALL_INTERVAL_GRADUATING_EASY : Math.round(prevInterval * ease * 1.3);
  }

  const dueAt = new Date(Date.now() + nextInterval * RECALL_MS_PER_DAY).toISOString();
  return { dueAt, ease: nextEase, interval: nextInterval, reviewedAt };
}

function mapTask(row: TaskRow): AgentTask {
  return {
    id: row.id,
    workflow: row.workflow,
    status: row.status,
    input: JSON.parse(row.input_json) as Record<string, unknown>,
    output: row.output_json ? JSON.parse(row.output_json) as Record<string, unknown> : undefined,
    error: row.error ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const ARTIFACT_SUBTYPE_VALUES: readonly ArtifactSubtype[] = [
  'deep_research',
  'product',
  'topic',
  'xiaohongshu',
  'summary',
];

function normalizeArtifactSubtype(value: string | null | undefined): ArtifactSubtype {
  if (value && (ARTIFACT_SUBTYPE_VALUES as readonly string[]).includes(value)) {
    return value as ArtifactSubtype;
  }
  return 'summary';
}

function kitToSubtype(kitId: KnowledgeKitId): ArtifactSubtype {
  if (kitId === 'learning_research') return 'deep_research';
  if (kitId === 'product_research') return 'product';
  if (kitId === 'topic_decomposition') return 'topic';
  return 'xiaohongshu';
}

function mapArtifact(row: ArtifactRow): ArtifactRecord {
  const subtype = normalizeArtifactSubtype(row.subtype);
  const sections = parseArtifactSections(row.sections_json);
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    artifactType: row.artifact_type,
    subtype,
    title: row.title,
    body: row.body,
    sections: sections.length > 0 ? sections : undefined,
    sourceMaterialIds: JSON.parse(row.source_material_ids_json) as string[],
    createdAt: row.created_at,
  };
}

function parseArtifactSections(raw: string | null | undefined): ArtifactSection[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is ArtifactSection =>
        typeof item === 'object' && item !== null
        && typeof (item as ArtifactSection).id === 'string'
        && typeof (item as ArtifactSection).title === 'string'
        && typeof (item as ArtifactSection).body === 'string'
        && typeof (item as ArtifactSection).updatedAt === 'string',
      )
      .map((item) => ({ ...item }));
  } catch {
    return [];
  }
}

function mapArtifactRevision(row: ArtifactRevisionRow): ArtifactRevision {
  const changedFields = JSON.parse(row.changed_fields_json) as ArtifactRevisionField[];
  return {
    id: row.id,
    artifactId: row.artifact_id,
    version: row.version,
    sectionId: row.section_id,
    sectionTitleSnapshot: row.section_title_snapshot,
    sectionBodySnapshot: row.section_body_snapshot,
    changedFields,
    createdAt: row.created_at,
  };
}

function mapMessage(row: MessageRow): ChatMessage {
  const proposedCardsJson = row.proposed_cards_json ?? undefined;
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    question: row.question,
    answer: row.answer,
    cardIds: JSON.parse(row.card_ids_json) as string[],
    artifactId: row.artifact_id ?? undefined,
    materialId: row.material_id ?? undefined,
    createdAt: row.created_at,
    proposedCards: proposedCardsJson ? (JSON.parse(proposedCardsJson) as ProposedCard[]) : undefined,
  };
}

function getRawMessageRole(message: unknown): AgentChatMessageRecord['role'] {
  if (!message || typeof message !== 'object') return 'unknown';
  const role = (message as { role?: unknown }).role;
  if (role === 'user' || role === 'assistant' || role === 'tool' || role === 'system') return role;
  return 'unknown';
}

function extractRawMessageText(message: unknown): string {
  if (!message || typeof message !== 'object') return '';
  const content = (message as { content?: unknown }).content;
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .filter((part): part is { type: string; text: string } =>
      part !== null && typeof part === 'object'
      && (part as { type?: unknown }).type === 'text'
      && typeof (part as { text?: unknown }).text === 'string')
    .map((part) => part.text)
    .join('');
}

function extractRawMessageReasoning(message: unknown): string {
  if (!message || typeof message !== 'object') return '';
  const content = (message as { content?: unknown }).content;
  if (!Array.isArray(content)) return '';
  return content
    .filter((part): part is { type: string; text: string } =>
      part !== null && typeof part === 'object'
      && (part as { type?: unknown }).type === 'thinking'
      && typeof (part as { text?: unknown }).text === 'string')
    .map((part) => part.text)
    .join('');
}

function getRawMessageTimestamp(message: unknown, fallback: string): string {
  if (!message || typeof message !== 'object') return fallback;
  const timestamp = (message as { timestamp?: unknown; createdAt?: unknown }).timestamp;
  if (typeof timestamp === 'number' && Number.isFinite(timestamp)) return new Date(timestamp).toISOString();
  if (typeof timestamp === 'string' && timestamp.length > 0) return timestamp;
  const createdAt = (message as { createdAt?: unknown }).createdAt;
  if (typeof createdAt === 'string' && createdAt.length > 0) return createdAt;
  return fallback;
}

function buildAgentChatMessageRecords(
  sessionId: string,
  workspaceId: string,
  rawMessages: unknown[],
): AgentChatMessageRecord[] {
  const fallbackCreatedAt = now();
  return rawMessages.map((message, index) => ({
    id: `${AGENT_CHAT_MESSAGE_ID_PREFIX}_${sessionId}_${index}`,
    sessionId,
    workspaceId,
    role: getRawMessageRole(message),
    text: extractRawMessageText(message),
    reasoning: extractRawMessageReasoning(message),
    raw: message,
    createdAt: getRawMessageTimestamp(message, fallbackCreatedAt),
    sequence: index,
  }));
}

function deriveAgentChatTitle(rawMessages: unknown[]): string {
  for (const message of rawMessages) {
    if (getRawMessageRole(message) !== 'user') continue;
    const text = extractRawMessageText(message).trim();
    if (text.length > 0) {
      return text.length > AGENT_CHAT_TITLE_MAX_LENGTH
        ? `${text.slice(0, AGENT_CHAT_TITLE_MAX_LENGTH)}...`
        : text;
    }
  }
  return '未命名会话';
}

function findLastUserMessageIndex(rawMessages: unknown[]): number {
  for (let i = rawMessages.length - 1; i >= 0; i -= 1) {
    if (getRawMessageRole(rawMessages[i]) === 'user') return i;
  }
  return -1;
}

/**
 * 将 SQLite profile 行映射为内部持久化记录（包含 apiKey 明文）。
 * @author fxbin
 */
function mapModelProviderProfileRow(row: ModelProviderProfileRow): ModelProviderProfileRecord {
  return {
    id: row.id,
    name: row.name,
    provider: row.provider,
    model: row.model,
    baseUrl: row.base_url ?? undefined,
    apiKey: row.api_key ?? undefined,
    enabled: Boolean(row.enabled),
    fallbackToMock: Boolean(row.fallback_to_mock),
    isDefault: Boolean(row.is_default),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * core 包模块目录到 monorepo 根目录的上溯层级。
 * packages/core/dist/ 或 packages/core/src/ 到根目录均为 3 级。
 */
const MONOREPO_ROOT_ASCENT = 3;

/**
 * 推导 monorepo 根目录绝对路径。
 * 基于 import.meta.url 解析，避免 process.cwd() 在子目录启动时指向错误位置。
 * @returns monorepo 根目录绝对路径
 * @author fxbin
 */
function resolveProjectRoot(): string {
  const moduleDir = dirname(fileURLToPath(import.meta.url));
  let dir = moduleDir;
  for (let i = 0; i < MONOREPO_ROOT_ASCENT; i += 1) {
    dir = dirname(dir);
  }
  return dir;
}

/**
 * monorepo 根目录缓存，模块加载时计算一次。
 * 必须在 defaultSqlitePath / createSqliteKnowledgeRepository 等模块加载期
 * 调用的代码之前定义，否则会触发 const TDZ。
 */
const PROJECT_ROOT = resolveProjectRoot();

function defaultSqlitePath() {
  return process.env.ZHIJING_DB_PATH ?? join(PROJECT_ROOT, '.data', 'zhijing.sqlite');
}

/**
 * 打开文件管理器命令的最大等待毫秒数。
 */
const REVEAL_PATH_TIMEOUT_MS = 5000;

/**
 * 各平台打开文件管理器的命令名。
 */
const REVEAL_PATH_COMMANDS: Record<string, string> = {
  darwin: 'open',
  win32: 'explorer',
  linux: 'xdg-open',
};

/**
 * 获取知径数据目录的绝对路径。
 * 路径取自当前数据库路径的父目录，并保证目录存在。
 * @returns 数据目录绝对路径
 * @author fxbin
 */
export function getDataDirectory(): string {
  const dir = dirname(defaultSqlitePath());
  mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * 在系统文件管理器中打开知径数据目录。
 * 通过 child_process 调用平台原生命令（macOS 为 open、Windows 为 explorer、Linux 为 xdg-open），
 * 命令参数以数组形式传入，不经过 shell，避免命令注入风险。
 * @returns 打开成功返回 { ok: true, path }；失败返回 { ok: false, error }
 * @author fxbin
 */
export async function revealDataDirectory(): Promise<{ ok: boolean; path?: string; error?: string }> {
  const command = REVEAL_PATH_COMMANDS[process.platform];
  if (!command) {
    return { ok: false, error: `当前平台 ${process.platform} 暂不支持打开数据目录` };
  }
  const dir = getDataDirectory();
  try {
    await execFileAsync(command, [dir], { timeout: REVEAL_PATH_TIMEOUT_MS });
    return { ok: true, path: dir };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

export function createMemoryKnowledgeRepository(): KnowledgeRepository {
  return new MemoryKnowledgeRepository();
}

export function createSqliteKnowledgeRepository(path = defaultSqlitePath()): KnowledgeRepository {
  const repo = new SqliteKnowledgeRepository(path);
  initializeZvecIndex(repo);
  return repo;
}

function toCardIndexInput(card: KnowledgeCard): CardIndexInput {
  return {
    id: card.id,
    workspaceId: card.workspaceId,
    type: card.type,
    title: card.title,
    body: card.body,
    archived: card.archived ?? false,
  };
}

function toMaterialIndexInput(material: MaterialRecord): MaterialIndexInput {
  return {
    id: material.id,
    workspaceId: material.workspaceId,
    type: material.type,
    title: material.title,
    contentText: material.contentText,
    rawInput: material.rawInput,
    platform: material.platform,
    archived: material.archived ?? false,
  };
}

function initializeZvecIndex(repo: SqliteKnowledgeRepository): void {
  try {
    initZvecSearch();
    if (isZvecIndexInitialized()) return;
    const activeCards = repo.listCards();
    const archivedCards = repo.listArchivedCards();
    const activeMaterials = repo.listMaterials();
    const archivedMaterials = repo.listArchivedMaterials();
    rebuildCardZvecIndex([...activeCards, ...archivedCards].map(toCardIndexInput));
    rebuildMaterialZvecIndex([...activeMaterials, ...archivedMaterials].map(toMaterialIndexInput));
    markZvecIndexInitialized();
  } catch (error) {
    console.warn('[zvec] initialize failed, fallback to sqlite fts5', error);
  }
}

let repository: KnowledgeRepository = process.env.ZHIJING_STORAGE === 'memory'
  ? createMemoryKnowledgeRepository()
  : createSqliteKnowledgeRepository();

const parserResultCache = new Map<string, ParserCacheEntry>();
const platformParseTimestamps = new Map<string, number>();

type RuntimeModelProviderConfig = {
  provider: string;
  model: string;
  baseUrl?: string;
  apiKey?: string;
  enabled: boolean;
  fallbackToMock: boolean;
  keySource: ModelProviderSettings['keySource'];
  updatedAt?: string;
};

let modelProviderConfig: RuntimeModelProviderConfig = initialModelProviderConfig();
let piRuntime: PiRuntime = createRuntimeFromModelProviderConfig(modelProviderConfig);

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
  modelProviderConfig = initialModelProviderConfig();
  applyModelProviderConfig();
}

function initialModelProviderConfig(): RuntimeModelProviderConfig {
  const defaultProfile = ensureDefaultProfile();
  return runtimeConfigFromProfile(defaultProfile);
}

/**
 * 确保存在默认 profile：
 * - 若已有 profile，确保有且仅有一条 is_default=1
 * - 若无任何 profile，从环境变量 ZHIJING_PI_* 创建一个 env profile
 * @author fxbin
 */
function ensureDefaultProfile(): ModelProviderProfileRecord {
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
function createEnvProfile(): ModelProviderProfileRecord {
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
function runtimeConfigFromProfile(profile: ModelProviderProfileRecord): RuntimeModelProviderConfig {
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
function applyActiveProfileToRuntime(profile: ModelProviderProfileRecord) {
  modelProviderConfig = runtimeConfigFromProfile(profile);
  applyModelProviderConfig();
}

/**
 * 归一化 provider 标识。
 *
 * 已知 provider（KnownProvider）原样返回；
 * 未知但非空的 provider 字符串原样透传，支持自定义 OpenAI 兼容端点（如商汤 SenseNova）；
 * 空或 undefined 回退到默认 provider（DeepSeek）。
 *
 * @param provider - 原始 provider 字符串
 * @returns 归一化后的 provider 字符串
 * @author fxbin
 */
function normalizeProvider(provider: string | undefined): string {
  if (provider && provider.trim().length > 0) return provider.trim();
  return getDefaultPiProvider();
}

function defaultModelForProvider(provider: string) {
  if (!isKnownPiProvider(provider)) return getDefaultPiModel();
  const models = getKnownPiModels(provider);
  return models[0]?.id ?? getDefaultPiModel();
}

function providerOptions(): ModelProviderSettings['providers'] {
  return getKnownPiProviders().map((provider) => ({
    id: provider,
    models: getKnownPiModels(provider),
  }));
}

function currentApiKey() {
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
function safeEnvApiKey(provider: string): string | undefined {
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

function createRuntimeFromModelProviderConfig(config: RuntimeModelProviderConfig) {
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

function applyModelProviderConfig() {
  piRuntime = createRuntimeFromModelProviderConfig(modelProviderConfig);
  setActiveProfile({
    provider: modelProviderConfig.provider,
    model: modelProviderConfig.model,
    baseUrl: modelProviderConfig.baseUrl,
    apiKey: currentApiKey() || undefined,
  });
}

function modelSettingsSnapshot(): ModelProviderSettings {
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
function mapModelProviderProfileToApi(record: ModelProviderProfileRecord): ModelProviderProfile {
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

const MODEL_PROVIDER_TEST_PROMPTS = [
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

function normalizeSecret(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

export class KnowledgeCoreError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = 'KnowledgeCoreError';
  }
}

function now() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}_${randomUUID().slice(0, 8)}`;
}

const TITLE_PREFIX_PATTERN = /^(我想(?:了解|学习|知道|研究|搞懂|搞清楚|系统学习|知道下)|帮我(?:查|找|了解|整理|总结|看看)|请问|关于|怎么|如何|有没有人|推荐下)\s*(?:一下|关于)?\s*/;
const TITLE_SUFFIX_PUNCT = /[?？!！。.…,，、\s]+$/;
const TITLE_MAX_LENGTH = 32;

/**
 * 从原始文本中提取精炼标题。
 * 优先取首行，去除常见口语前缀与尾部标点，最后截断到最大长度。
 * AI 可用时由 LLM 返回生成标题，此函数仅作截断保护与 mock fallback。
 * @param input - 原始文本
 * @returns 精炼后的标题
 * @author fxbin
 */
function compactTitle(input: string) {
  const firstLine = input.split('\n')[0] ?? input;
  const noPrefix = firstLine.replace(TITLE_PREFIX_PATTERN, '');
  const noSuffix = noPrefix.replace(TITLE_SUFFIX_PUNCT, '');
  const cleaned = noSuffix.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '未命名知识库';
  return cleaned.length > TITLE_MAX_LENGTH ? `${cleaned.slice(0, TITLE_MAX_LENGTH)}...` : cleaned;
}

const TITLE_DUPLICATE_SUFFIX_START = 2;
const TITLE_DUPLICATE_SUFFIX_MAX = 99;

/**
 * 为 AI 生成等非用户显式命名场景生成不冲突的标题。
 * 若原标题未被占用则直接返回；否则追加 (2)、(3)... 直到找到可用标题。
 * @param rawTitle - 原始标题（未经 compactTitle 处理）
 * @returns 不与现有知识库冲突的标题
 * @author fxbin
 */
function ensureUniqueTitle(rawTitle: string): string {
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

function titleFromLink(input: string) {
  try {
    const url = new URL(input);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return compactTitle(input);
  }
}

function extractFirstUrl(input: string) {
  return input.match(/https?:\/\/[^\s"'<>]+/i)?.[0];
}

function createTask(workflow: AgentTask['workflow'], input: Record<string, unknown>, status: TaskStatus = 'running') {
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

function finishTask(task: AgentTask, output: Record<string, unknown>) {
  task.status = 'succeeded';
  task.output = output;
  task.error = undefined;
  task.updatedAt = now();
  repository.updateTask(task);
}

function failTask(task: AgentTask, error: unknown) {
  task.status = 'failed';
  task.error = error instanceof Error ? error.message : 'Knowledge generation failed.';
  task.updatedAt = now();
  repository.updateTask(task);
}

function createWorkspace(title: string, summary: string): WorkspaceSummary {
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

function upsertDefaultWorkspace(input: string) {
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

function createMaterial(base: WorkspaceSummary, request: IntakeRequest, type: MaterialRecord['type']) {
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

function extractMaterialTitle(input: string) {
  const lines = input.trim().split('\n').map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return compactTitle(input);
  const firstLine = lines[0].replace(/^#+\s*/, '').trim();
  return compactTitle(firstLine || input);
}

function createCards(
  base: WorkspaceSummary,
  material: MaterialRecord | undefined,
  seed: string,
  generatedCards: GeneratedCard[] | undefined,
) {
  const timestamp = now();
  const sourceStatus: ClaimStatus = material && material.type !== 'question' && material.parseStatus === 'ingested' ? 'sourced' : 'ai_skeleton';
  const generated = normalizeGeneratedCards(generatedCards);
  const hasModelCardOutput = Boolean(generatedCards?.length);
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
  const cardSeeds = generated.length ? generated : hasModelCardOutput ? [] : fallbackCards;
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

function createArtifact(
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
function buildSummaryArtifactBody(
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

function createKitArtifact(
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

function kitLabel(kitId: KnowledgeKitId) {
  if (kitId === 'content_creation') return '内容创作产物';
  if (kitId === 'product_research') return '产品调研产物';
  if (kitId === 'topic_decomposition') return '知识拆解清单';
  return '学习研究摘要';
}

function buildFallbackKitBody(base: WorkspaceSummary, kitId: KnowledgeKitId) {
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

function normalizeGeneratedCards(cards: GeneratedCard[] | undefined) {
  if (!cards?.length) return [];
  return cards
    .filter((card) => isUsefulGeneratedCard(card))
    .slice(0, 6);
}

function normalizeCardType(type: GeneratedCard['type']): KnowledgeCard['type'] {
  const allowed = new Set<KnowledgeCard['type']>(['concept', 'method', 'case', 'question', 'step', 'viewpoint']);
  return type && allowed.has(type) ? type : 'concept';
}

const CARD_BODY_MIN_LENGTH = 18;
const CARD_SIMILAR_TEXT_MIN_LENGTH = 6;
const CARD_GENERIC_TITLE_PATTERNS = [
  /^(核心概念|关键概念|重要概念|主要概念)$/,
  /^(关键问题|核心问题|下一步要回答的问题|待回答问题)$/,
  /^(知识卡片|资料总结|内容总结|背景补充|后续补充方向)$/,
  /^(概念|问题|方法|案例|观点|步骤)\d*$/,
];
const CARD_CONCEPT_SIGNAL_PATTERN = /是|指|定义|区别|边界|不是|属于|用于|依赖|条件|意味着|核心在于|本质/;
const CARD_QUESTION_SIGNAL_PATTERN = /[?？]|如何|为什么|是否|能否|怎样|哪些|什么|何时|哪里|谁|多大|多少/;

function normalizeCardText(value: string | undefined): string {
  return (value ?? '').trim().replace(/\s+/g, '');
}

function isGenericCardTitle(title: string): boolean {
  return CARD_GENERIC_TITLE_PATTERNS.some((pattern) => pattern.test(title));
}

function isMostlyRepeatedTitle(title: string, body: string): boolean {
  const normalizedTitle = normalizeCardText(title);
  const normalizedBody = normalizeCardText(body);
  return normalizedTitle.length >= CARD_SIMILAR_TEXT_MIN_LENGTH && normalizedBody === normalizedTitle;
}

function isUsefulGeneratedCard(card: GeneratedCard): boolean {
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

async function generateKnowledge(
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
const FOLDER_INTAKE_EXTENSIONS = ['.md', '.markdown', '.txt'];

/** 文件夹导入单文件大小上限：2MB。 */
const FOLDER_INTAKE_MAX_FILE_SIZE = 2 * 1024 * 1024;

/** 文件夹导入扫描文件数上限，避免误扫超大目录。 */
const FOLDER_INTAKE_MAX_FILES = 500;

/**
 * 文件夹导入允许的根目录列表。
 * 通过环境变量 ZHIJING_INTAKE_ROOT_DIRS 配置（逗号分隔的绝对路径）。
 * 默认为用户主目录（os.homedir()）。
 * 导入路径必须位于某个允许的根目录下，避免任意路径文件读取。
 * @author fxbin
 */
const INTAKE_ALLOWED_ROOTS: readonly string[] = (() => {
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
function isPathWithinAllowedRoots(targetPath: string): boolean {
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
async function collectSupportedFiles(
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
const FILE_BATCH_MAX_CONTENT_SIZE = 2 * 1024 * 1024;

/** 批量文件导入条数上限（防极端误操作，实质不限制日常使用）。 */
const FILE_BATCH_MAX_ITEMS = 10000;

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

const DEFAULT_INTAKE_AUDIENCE: IntakeAudience = 'intermediate';
const DEFAULT_INTAKE_DEPTH: IntakeDepth = 'standard';
const DEFAULT_INTAKE_SCOPE: IntakeScope = 'panorama';

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
const PROPOSAL_OP_CREATE_CARD = 'create_card';
const PROPOSAL_OP_EDIT_CARD = 'edit_card';
const PROPOSAL_OP_ARCHIVE_CARD = 'archive_card';
const PROPOSAL_OP_UNARCHIVE_CARD = 'unarchive_card';
const PROPOSAL_OP_ARCHIVE_MATERIAL = 'archive_material';
const PROPOSAL_OP_ALLOWED: ReadonlySet<string> = new Set([
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
function assertProposedOperationShape(operation: unknown): asserts operation is ProposedOperation {
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

function executeProposedOperation(
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

function scoreWorkspaceSuggestion(
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

function tokenizeSuggestionText(input: string) {
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

function resolveMaterialAssignmentTarget(input: AssignMaterialRequest, material: MaterialRecord) {
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

function moveMaterialAssets(materialId: string, previousWorkspaceId: string, nextWorkspaceId: string) {
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

function reconcileWorkspaceStats(workspaceId?: string) {
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

function normalizeMediaUrls(values: string[]) {
  return uniqueStrings(values
    .flatMap((value) => value.split(/\s+/))
    .map((value) => value.trim())
    .filter((value) => /^https?:\/\//i.test(value)));
}

function buildKitContext(workspaceId: string) {
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

function buildQuestionContext(workspaceId: string, questionMaterialId: string, question: string) {
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

function buildQuestionCitations(context: ReturnType<typeof buildQuestionContext>): KnowledgeCitation[] {
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

const PREVIEW_DEFAULT_MAX_LENGTH = 160;

function compactPreview(input: string, maxLength: number = PREVIEW_DEFAULT_MAX_LENGTH) {
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

async function applyParsedMaterialResult(
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

function readParserCache(material: MaterialRecord) {
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

function rememberParserCache(material: MaterialRecord, parsed: ParsedMaterialContent) {
  const key = parserCacheKey(material);
  const hasUsableContent = parsed.text.length >= 4 || (parsed.mediaUrls?.length ?? 0) > 0;
  if (!key || parsed.needsReview || !hasUsableContent) return;
  parserResultCache.set(key, {
    parsed,
    platform: material.platform ?? 'web',
    cachedAt: Date.now(),
  });
}

function parserCacheKey(material: MaterialRecord) {
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

function parserCacheTtlMs() {
  const value = Number.parseInt(process.env.ZHIJING_PARSE_CACHE_TTL_MS ?? '', 10);
  return Number.isFinite(value) && value >= 0 ? value : 6 * 60 * 60 * 1000;
}

function checkParseThrottle(material: MaterialRecord) {
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

function recordParseAttempt(material: MaterialRecord) {
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

function parseThrottleMs(platform: string | undefined) {
  const envKey = platform === 'xiaohongshu' ? 'ZHIJING_XHS_PARSE_THROTTLE_MS' : 'ZHIJING_WEB_PARSE_THROTTLE_MS';
  const explicit = Number.parseInt(process.env[envKey] ?? process.env.ZHIJING_PARSE_THROTTLE_MS ?? '', 10);
  if (Number.isFinite(explicit)) return Math.max(0, explicit);
  return platform === 'xiaohongshu' ? 3000 : 1000;
}

function queueMaterialParsing(material: MaterialRecord): MaterialParseQueueResult {
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

function canParseWithServerParser(material: MaterialRecord) {
  return material.platform === 'xiaohongshu' || material.platform === 'douyin' || material.platform === 'web' || material.platform === undefined;
}

async function parseOrdinaryWebMaterial(material: MaterialRecord): Promise<ParsedMaterialContent> {
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

const DOUYIN_SCRIPT_PATH = join(PROJECT_ROOT, 'scripts', 'douyin_extract.py');
const DOUYIN_EXTRACT_TIMEOUT_MS = 90_000;
const DOUYIN_EXTRACT_MAX_BUFFER = 2 * 1024 * 1024;
const DOUYIN_VIDEO_CDN_INDICATOR = 'douyinvod';
const DOUYIN_REFERER = 'https://www.douyin.com/';

/**
 * SSRF 安全 fetch 单例：用于 index.ts 内所有外部抓取路径（Jina Reader 等）。
 * 每次重定向后会重新校验目标 URL，避免外部 302 重定向到内网地址。
 * @author fxbin
 */
const ssrfSafeFetch = createSafeFetch();

/**
 * 抖音提取脚本返回的 JSON 结构
 * @author fxbin
 */
interface DouyinExtractResult {
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
function extractFirstDouyinUrl(input: string | undefined): string | undefined {
  if (!input) return undefined;
  const urls = extractUrls(input).filter((url) => /douyin\.com|iesdouyin\.com/i.test(url));
  return urls[0];
}

/**
 * 解析抖音短视频资料：调用外部 Python 脚本（Playwright）拦截抖音 API，
 * 提取视频地址、封面、作者、描述等元数据。
 *
 * 外部脚本路径：scripts/douyin_extract.py
 * 依赖：Python3 + Playwright（需安装浏览器）
 * 代理：通过 DOUYIN_PROXY / HTTP_PROXY 环境变量配置
 *
 * @param material - 抖音资料记录
 * @returns 解析后的内容（标题、正文、媒体 URL 列表）
 * @author fxbin
 */
async function parseDouyinMaterial(material: MaterialRecord): Promise<ParsedMaterialContent> {
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
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`抖音提取脚本执行失败：${message}。请确认已安装 Python3 和 Playwright（pip install playwright && playwright install chromium）。`);
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

async function parseXiaohongshuMaterial(material: MaterialRecord): Promise<ParsedMaterialContent> {
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

async function tryParseXiaohongshuPublicShare(
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

function extractXiaohongshuShareTitle(input: string | undefined) {
  if (!input) return undefined;
  const bracketTitle = input.match(/【(.+?)(?:\s+-\s+[^】]+)?】/)?.[1];
  if (bracketTitle) return cleanText(bracketTitle);
  const beforeUrl = input.split(/https?:\/\//i)[0]?.trim();
  return beforeUrl ? compactTitle(beforeUrl.replace(/^\d+\s*/, '')) : undefined;
}

/**
 * 小红书公开页面抓取超时（毫秒）。
 */
const XIAOHONGSHU_FETCH_TIMEOUT_MS = 12_000;

async function tryParseXiaohongshuPublicPage(sourceUrl: string) {
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

function extractUrls(input: string) {
  return input.match(/https?:\/\/[^\s"'<>]+/gi) ?? [];
}

function extractXiaohongshuNoteId(url: URL) {
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

function xiaohongshuRequestHeaders() {
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

function parseXiaohongshuInitialState(html: string): unknown {
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

function selectXiaohongshuNoteState(state: unknown): Record<string, unknown> | undefined {
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

function normalizeXiaohongshuNoteState(note: Record<string, unknown>): { title?: string; text: string; mediaUrls: string[] } {
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

function noteTitle(note: Record<string, unknown>) {
  const direct = stringValue(note.title) ?? stringValue(note.displayTitle) ?? stringValue(note.noteTitle);
  if (direct) return cleanText(direct);
  const desc = stringValue(note.desc) ?? stringValue(note.description) ?? stringValue(note.content);
  return desc ? compactTitle(desc.split('\n')[0] ?? desc) : '小红书笔记';
}

function extractXiaohongshuTags(note: Record<string, unknown>) {
  return uniqueStrings(arrayValue(note.tagList)
    .map((tag) => stringValue(asRecord(tag)?.name))
    .filter((tag): tag is string => Boolean(tag)));
}

function extractXiaohongshuMediaUrls(note: Record<string, unknown>) {
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
function xiaohongshuVideoCoverUrls(video: unknown, imageList: unknown): string[] {
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

function xiaohongshuImageUrls(image: unknown) {
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

function extractXiaohongshuImageTokenPath(imageUrl: string) {
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

function xiaohongshuVideoUrls(video: unknown) {
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

function normalizeHttpUrl(value: string | undefined) {
  if (!value) return undefined;
  if (value.startsWith('//')) return `https:${value}`;
  if (value.startsWith('http://')) return `https://${value.slice('http://'.length)}`;
  return value;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown) {
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

function expandJsonLikeValues(value: unknown): unknown {
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

function findFirstStringByKey(value: unknown, keys: string[]): string | undefined {
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

function collectMediaUrls(value: unknown, parentKey = ''): string[] {
  if (typeof value === 'string') {
    return isLikelyMediaUrl(value, parentKey) ? [value] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectMediaUrls(item, parentKey));
  }
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) => collectMediaUrls(item, key));
}

function isLikelyMediaUrl(value: string, key: string) {
  if (!/^https?:\/\//i.test(value)) return false;
  const lowerValue = value.toLowerCase();
  const lowerKey = key.toLowerCase();
  const mediaKey = /image|img|photo|picture|video|media|cover|stream|master/.test(lowerKey);
  return (
    /xhscdn\.com|sns-img|sns-video|\.(jpe?g|png|webp|gif|mp4|mov)(\?|$)/.test(lowerValue)
    || (mediaKey && !/xiaohongshu\.com|xhslink\.com/.test(lowerValue))
  );
}

function uniqueStrings(values: string[]) {
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
const JINA_READER_FETCH_TIMEOUT_MS = 15_000;

async function tryParseWithJinaReader(sourceUrl: string) {
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

function jinaReaderBaseUrl() {
  const baseUrl = process.env.JINA_READER_BASE_URL ?? 'https://r.jina.ai/';
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

function extractJinaMarkdownTitle(markdown: string) {
  const explicitTitle = markdown.match(/^Title:\s*(.+)$/im)?.[1];
  const headingTitle = markdown.match(/^#\s+(.+)$/m)?.[1];
  return cleanText(explicitTitle ?? headingTitle ?? '');
}

function stripJinaMarkdownMetadata(markdown: string) {
  const withoutMetadata = markdown
    .replace(/^Title:\s*.+$/gim, '')
    .replace(/^URL Source:\s*.+$/gim, '')
    .replace(/^Markdown Content:\s*$/gim, '');
  return cleanText(withoutMetadata);
}

function extractReadableText(html: string, fallbackTitle: string) {
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

function extractHtmlTitle(html: string) {
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i)?.[1]
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["'][^>]*>/i)?.[1];
  const title = ogTitle
    ?? html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
    ?? html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  return title ? cleanText(decodeHtmlEntities(title)) : undefined;
}

function decodeHtmlEntities(input: string) {
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

function cleanText(input: string) {
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

function failMaterialParsingTask(
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

function classifyParseFailure(error: unknown): {
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

function requireLinkMaterial(materialId: string) {
  const material = requireMaterial(materialId);
  if (material.type !== 'link') {
    throw new KnowledgeCoreError('Only link materials can be parsed through this endpoint.', 400);
  }
  return material;
}

function requireMaterial(materialId: string) {
  const material = repository.findMaterial(materialId);
  if (!material) {
    throw new KnowledgeCoreError('Material not found.', 404);
  }
  return material;
}

function requireParseTask(taskId: string, materialId: string) {
  const task = repository.findTask(taskId);
  if (!task) {
    throw new KnowledgeCoreError('Parse task not found.', 404);
  }
  if (!isParseTaskForMaterial(task, materialId)) {
    throw new KnowledgeCoreError('Parse task does not belong to this material.', 400);
  }
  return task;
}

function findActiveParseTask(materialId: string) {
  return repository.listTasks().find((task) => (
    isParseTaskForMaterial(task, materialId)
    && (task.status === 'queued' || task.status === 'running')
  ));
}

function isParseTaskForMaterial(task: AgentTask, materialId: string) {
  return task.workflow === 'parse_material' && task.input.materialId === materialId;
}

function cleanParseError(errorMessage: string) {
  const trimmed = errorMessage.trim();
  return (trimmed || 'Material parsing failed.').slice(0, 500);
}

function touchWorkspace(workspaceId?: string) {
  const resolved = resolveWorkspaceId(workspaceId);
  const base = repository.findWorkspace(resolved);
  if (!base) return;
  base.updatedAt = now();
  repository.updateWorkspace(base);
}

const execFileAsync = promisify(execFile);

const WHISPER_COMMAND_CANDIDATES = ['whisper', 'whisper-cli', 'whisper.cpp'];
const WHISPER_FALLBACK_PATHS = [
  '/opt/miniconda3/bin/whisper',
  '/opt/miniconda/bin/whisper',
  '/opt/homebrew/bin/whisper',
  '/usr/local/bin/whisper',
  '/usr/bin/whisper',
  '/opt/miniconda3/bin/whisper-cli',
  '/opt/homebrew/bin/whisper-cli',
  '/usr/local/bin/whisper-cli',
];
const MIN_CPU_CORES_FOR_TRANSCRIPTION = 4;
const MIN_MEMORY_BYTES_FOR_TRANSCRIPTION = 4 * 1024 * 1024 * 1024;
const AUDIO_SAMPLE_RATE = '16000';
const MONO_CHANNELS = '1';
const WHISPER_MODEL_TINY = 'tiny';
const TRANSCRIBE_LANGUAGE_CHINESE = 'Chinese';
const OUTPUT_FORMAT_TXT = 'txt';
const VIDEO_URL_INDICATORS = ['/video/', 'sns-video', '.mp4', '.mov', '.webm', '.mkv', '.avi'];

/**
 * 判断媒体 URL 是否为视频
 * @author fxbin
 */
function isVideoMediaUrl(url: string): boolean {
  return VIDEO_URL_INDICATORS.some((indicator) => url.toLowerCase().includes(indicator));
}

/**
 * 检测命令是否存在于系统 PATH
 * @author fxbin
 */
async function commandExists(command: string): Promise<boolean> {
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
async function pathExistsAndExecutable(filePath: string): Promise<boolean> {
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
async function findWhisperCommand(): Promise<string | undefined> {
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

let cachedTranscriptionCapability: TranscriptionCapabilityReport | undefined;

const BYTES_PER_GB = 1024 * 1024 * 1024;

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
async function scheduleMaterialTranscription(material: MaterialRecord) {
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

type ListMaterialsOptions = {
  workspaceId?: string;
  type?: MaterialRecord['type'];
  status?: MaterialRecord['parseStatus'];
  query?: string;
  limit?: number;
};

type KnowledgeSearchResult = {
  id: string;
  kind: 'workspace' | 'material' | 'card' | 'artifact';
  title: string;
  preview: string;
  workspaceId?: string;
  metadata: Record<string, string | number | boolean | undefined>;
  score: number;
};

type SearchTerm = {
  value: string;
  weight: number;
  semantic: boolean;
};

type SearchScore = {
  score: number;
  matchedTerms: string[];
  semantic: boolean;
};

const semanticSearchLexicon = [
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

const CHINESE_STOP_WORDS = new Set([
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

const TFIDF_TITLE_WEIGHT = 4;
const TFIDF_BODY_WEIGHT = 1;

function isChineseStopWord(term: string): boolean {
  return CHINESE_STOP_WORDS.has(term);
}

function tokenizeForTfidf(text: string): string[] {
  const normalized = text.toLowerCase();
  const tokens: string[] = [];
  const englishWords = normalized.match(/[a-z]{2,}/g) ?? [];
  tokens.push(...englishWords);
  const cjkChars = normalized.match(/[\u4e00-\u9fff]/g) ?? [];
  for (let i = 0; i < cjkChars.length - 1; i++) {
    const bigram = cjkChars[i] + cjkChars[i + 1];
    if (!isChineseStopWord(bigram)) {
      tokens.push(bigram);
    }
  }
  return tokens;
}

function buildIdfMap(): Map<string, number> {
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

function scoreWithTfidf(
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
const AGENT_SEARCH_RESULT_LIMIT = 8;

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
    preview: compactPreview(material.contentText ?? material.rawInput ?? material.title),
  }));
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
  return {
    id: base.id,
    title: base.title,
    summary: base.summary,
    stage: base.stage,
    sourceCount: base.sourceCount,
    cardCount: base.cardCount,
    materialCount: repository.listMaterials(workspaceId).length,
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

function addSearchResult(results: KnowledgeSearchResult[], result: KnowledgeSearchResult) {
  if (result.score > 0) {
    results.push(result);
  }
}

function buildSearchTerms(query: string) {
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

function addSearchTerm(terms: Map<string, SearchTerm>, value: string, weight: number, semantic: boolean) {
  const normalized = value.trim();
  if (!normalized) return;
  const current = terms.get(normalized);
  if (!current || current.weight < weight) {
    terms.set(normalized, { value: normalized, weight, semantic });
  }
}

function scoreSearchText(terms: SearchTerm[], title: string | undefined, ...fields: Array<string | undefined>): SearchScore {
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

function withSearchMetadata(match: SearchScore, metadata: KnowledgeSearchResult['metadata']) {
  return {
    match: match.semantic ? 'semantic' : 'exact',
    matched: match.matchedTerms.join(', '),
    ...metadata,
  };
}

export function getWorkspace(id: string): WorkspaceDetail | undefined {
  const base = repository.findWorkspace(id);
  if (!base) return undefined;
  return {
    ...base,
    materials: repository.listMaterials(id),
    cards: repository.listCards(id),
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

const SAVED_FILTER_DEFAULT_SORT = 'updated_desc';
const SAVED_FILTER_ID_PREFIX = 'filter_';

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

const ENTITY_ID_PREFIX = 'entity_';

function normalizeEntityType(raw: string): EntityType {
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

const CONFLICT_ID_PREFIX = 'conflict';
const CONFLICT_AUDIT_LIMIT = 50;
const CONFLICT_GROUP_ITEM_LIMIT = 12;

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

function detectCardConflictGroups(): ConflictGroup[] {
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

function detectMaterialConflictGroups(): ConflictGroup[] {
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

function normalizeConflictKey(value: string): string {
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
function detectSemanticTensionGroups(): ConflictGroup[] {
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

function resolveCardConflict(keepId: string, dropIds: string[]): string {
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

function resolveMaterialConflict(keepId: string, dropIds: string[]): string {
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

const CLOUD_BACKUP_LOCAL_FIRST_REASON = '当前版本采用本地优先架构：导出文件保存在用户浏览器下载目录，导出历史保存在本地 SQLite 数据库，用户可随时通过 Backup JSON 按钮手动备份。';

const CLOUD_BACKUP_LOCAL_FIRST_PLANNED_FOR = null;

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
function buildTensionEdges(
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

const INTEREST_WINDOW_DAYS = 7;
const INTEREST_TOP_TOPICS_LIMIT = 20;
const INTEREST_SIGNAL_WEIGHTS: Record<AttentionSignalType, number> = {
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

const DIGEST_WINDOW_HOURS = 24;
const DIGEST_TOP_INTEREST_LIMIT = 8;
const DIGEST_MAX_ITEMS_PER_TYPE = 30;

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

const COVERAGE_BLIND_SPOT_INTEREST_THRESHOLD = 2;
const COVERAGE_BLIND_SPOT_COVERAGE_THRESHOLD = 2;
const COVERAGE_CARD_WEIGHT = 2;
const COVERAGE_MATERIAL_WEIGHT = 1;
const COVERAGE_MAX_TOPICS = 15;

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

const REPEATED_THINKING_SIMILARITY_THRESHOLD = 0.4;
const REPEATED_THINKING_MIN_GROUP_SIZE = 2;
const REPEATED_THINKING_MAX_GROUPS = 10;
const REPEATED_THINKING_QUESTION_SIGNAL_TYPE = 'ask_question';

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

const READING_SESSION_MIN_DURATION_MS = 1000;

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

const RECALL_DECAY_HALF_LIFE_DAYS = 7;
const RECALL_DECAY_THRESHOLD = 0.1;
const RECALL_DECAY_MS_PER_DAY = 24 * 60 * 60 * 1000;

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

const PROPOSAL_MAX_PER_TYPE = 3;
const PROPOSAL_RECALL_REVIEW_THRESHOLD = 0.2;
const EMERGENCE_MIN_CARD_COUNT = 3;
const EMERGENCE_MIN_KEYWORD_LENGTH = 2;
const EMERGENCE_SAMPLE_TITLES = 3;
const EMERGENCE_MAX_CLUSTERS = 5;

/**
 * 检测默认工作区中的卡片主题聚类，发现可涌现为命名工作区的主题。
 *
 * 聚类策略（KISS）：
 *  - 取默认工作区（default）中的卡片
 *  - 对每张卡片的 title + body 用 tokenizeForTfidf 分词（bigram 为主）
 *  - 按关键词聚合卡片 ID，统计每个关键词关联的卡片数
 *  - 过滤：关联卡片数 >= 阈值、关键词长度 >= 2、关键词非停用词
 *  - 排除已有工作区标题包含的关键词（避免重复提议）
 *  - 按关联卡片数降序排序，取 Top N
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
  const cardTitleMap = new Map<string, string>();

  for (const card of defaultCards) {
    cardTitleMap.set(card.id, card.title ?? '');
    const text = [card.title ?? '', card.body ?? ''].join(' ');
    const tokens = tokenizeForTfidf(text);
    const uniqueTokens = new Set(tokens);
    for (const token of uniqueTokens) {
      if (token.length < EMERGENCE_MIN_KEYWORD_LENGTH) continue;
      if (isChineseStopWord(token)) continue;
      if (!keywordToCards.has(token)) {
        keywordToCards.set(token, new Set());
      }
      keywordToCards.get(token)!.add(card.id);
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

  clusters.sort((a, b) => b.cardCount - a.cardCount);
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
      description: `默认工作区中有 ${cluster.cardCount} 张卡片与「${cluster.keyword}」相关${sampleList ? `（如 ${sampleList}）` : ''}。建议创建命名工作区来组织这些卡片。`,
      actionLabel: '创建工作区',
      metadata: {
        keyword: cluster.keyword,
        cardCount: cluster.cardCount,
        cardIds: cluster.cardIds,
        sampleTitles: cluster.sampleTitles,
        triggerRule: `默认工作区中同一关键词关联卡片数达到 ${EMERGENCE_MIN_CARD_COUNT} 张，且该关键词未被已有工作区标题覆盖。`,
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
const INSIGHTS_SOURCE_PLATFORM_LIMIT = 6;
const DEFAULT_USER_MEMORY_QUERY_LIMIT = 200;
const DEFAULT_DECISION_LOG_QUERY_LIMIT = 200;

/**
 * 洞察页最近卡片最多展示的条数。
 */
const RECENT_CARDS_LIMIT = 4;

/**
 * 全局地图预览每个工作区最多展示的卡片数（用于派生 sourcedRatio 的分母）。
 */
const WORKSPACE_PREVIEW_TOP_LIMIT = 8;

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
  for (let i = 29; i >= 0; i -= 1) {
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
function buildWorkspacePreviews(
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
function buildSocraticPrompt(
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
function parseTensionKey(tensionKey?: string): [string, string] | undefined {
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

const WEREAD_SYNC_STALE_MS = 10 * 60 * 1000;

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

const RECOMMEND_KEYWORD_MAP: { keys: string[]; theme: string }[] = [
  { keys: ['经济', '理财', '投资', '商业', '创业', '管理', '金融'], theme: 'concept' },
  { keys: ['计算机', '编程', '互联网', '科技', '自然科学', '工程', '医学', '数学'], theme: 'method' },
  { keys: ['心理', '社科', '哲学', '教育', '社会', '政治', '法学', '宗教'], theme: 'fact' },
  { keys: ['文学', '小说', '散文', '传记', '艺术', '历史', '诗歌', '漫画'], theme: 'question' },
];

const RECOMMEND_MAX_RESULTS = 10;
const RECOMMEND_COVERAGE_WEIGHT = 3;
const RECOMMEND_DEPTH_WEIGHT = 2;
const RECOMMEND_CARD_LINKED_WEIGHT = 1;
const RECOMMEND_SEED_BOOST_WEIGHT = 5;

function resolveThemeByCategory(category: string | null): string {
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
const NOTE_CHARS_PER_REVIEW = 80;

/**
 * 计算微信读书 signals 指纹哈希。
 *
 * 输入四个 signals 维度，输出稳定字符串指纹。
 * 用于 refreshWeReadBookSignals 跳过无变化的写入，避免无谓 DB 操作。
 *
 * @author fxbin
 */
function computeWeReadSignalsHash(input: {
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
const PORTABILITY_PREVIEW_LENGTH = 200;

/**
 * 数据可携记录随机后缀长度。
 */
const PORTABILITY_RANDOM_SUFFIX_LENGTH = 6;

/**
 * ISO 日期（YYYY-MM-DD）固定字符长度。
 */
const ISO_DATE_LENGTH = 10;

/**
 * 章节数下限，用于规避除零与空章节。
 */
const MIN_CHAPTER_COUNT = 1;

/**
 * 构造隐性真兴趣状态的默认值（NS-8）。首次访问或状态缺失时使用。
 */
function createDefaultHiddenInterestState(now: number): HiddenInterestState {
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
function sumBookmarkCounts(rows: WeReadBookMetaRow[]): number {
  return rows.reduce((sum, row) => sum + (row.bookmarkCount ?? 0), 0);
}

/**
 * 从微信读书 meta 列表构造四象限输入（NS-8）。
 *
 * 数据完整度门禁：只参与已刷新过 signals 的书（signals_synced_at 非空）。
 * 未刷新 signals 的书所有 signals 字段为 null，用 0 兜底会污染四象限分类，
 * 因此直接过滤，避免「未刷新=零笔记=掉进 Q4」的稀疏陷阱。
 */
function buildQuadrantInputsFromMeta(rows: WeReadBookMetaRow[]): BookSignalInputs[] {
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
function listDataAccountEntries(): DataAccountEntry[] {
  return repository.readDataAccountBook()?.entries ?? [];
}

/**
 * 收集全部派生指标 key（NS-8）。来源为降级矩阵登记表。
 */
function collectDerivedMetricKeys(): string[] {
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

async function distribution(connection: Awaited<ReturnType<typeof DuckDBConnection.create>>, table: string, column: string) {
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

function rows(reader: { getRowObjectsJson(): Record<string, unknown>[] }) {
  return reader.getRowObjectsJson();
}

function singleRow(reader: { getRowObjectsJson(): Record<string, unknown>[] }) {
  return rows(reader)[0] ?? {};
}

/**
 * 截断文本作为回忆结果的预览，超长部分以省略号收尾。
 * 与 compactPreview 不同，本函数服务于 Recall 工具链，使用独立的预览长度上限。
 * @author fxbin
 * @param {string} input - 原始文本
 * @returns {string} 清理并截断后的预览文本
 */
function recallPreview(input: string): string {
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
function roundRelevance(score: number): number {
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
function scoreDirectFetch(title: string, query: string): number {
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
async function expandQueryWithRuntime(piRuntime: PiRuntime, query: string): Promise<string> {
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
function relabelRecallResult(result: RecallResult, tool: RecallToolName): RecallResult {
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
const ACTIVE_SUGGESTION_SENT_ACTION = 'active_suggestion_sent';

/**
 * 查询主动提议历史的最大条数（覆盖每日上限 ×7 天足够）。
 */
const SUGGESTION_HISTORY_QUERY_LIMIT = 50;

/**
 * 编排 Agent 决策入口的选项。
 */
interface BuildOrchestratorDecisionOptions {
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
function getSuggestionHistory(workspaceId: string, isWriting: boolean): SuggestionHistory {
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
  ANTI_VANITY_THRESHOLD_PASS,
  ANTI_VANITY_THRESHOLD_WARN,
  evaluateAntiVanity,
  isAllowedToShow,
  summarizeFailedChecks,
} from './privacy-gate.js';
export type { VanityCheckItem, VanityCheckInput, VanityCheckResult } from './privacy-gate.js';

export {
  DATA_ACCOUNT_DEFAULT_ENTRIES,
  createDefaultDataAccount,
  setEntryTier,
  setMinimalMode,
  findEntry,
  listActiveEntries,
  listAffectedMetrics,
  listDisabledDimensions,
  toggleEntry,
} from './data-account-book.js';

export {
  VERIFICATION_DEFAULT_MAX_QUESTIONS,
  VERIFICATION_DEFAULT_OPTIONS_COUNT,
  VERIFICATION_DEFAULT_SEED,
  VERIFICATION_MIN_REASON_LENGTH,
  VERIFICATION_MIN_POOL_SIZE,
  buildVerificationBank,
  buildEmptyCoverage,
  evaluateVerificationAttempt,
  evaluateVerificationAttempts,
  updateVerificationCoverage,
} from './statistics/verification-bank.js';
export type {
  VerificationHighlight,
  BuildVerificationBankInput,
} from './statistics/verification-bank.js';

export {
  RECOGNITION_COHERENCE_THRESHOLD,
  RECOGNITION_MANUAL_SAMPLE_COUNT,
  RECOGNITION_DEFAULT_SEED,
  assessClusterRecognition,
  applyRecognitionStatus,
  buildEmptyRecognition,
} from './statistics/recognition-check.js';
export type { RecognitionAssessment } from './statistics/recognition-check.js';

export {
  MINIMAL_RETAINED_FEATURES,
  MINIMAL_SILENCED_FEATURES,
  MINIMAL_FEATURE_CONTRACT,
  buildMinimalFeatureState,
  getFeatureDisposition,
  isFeatureVisible,
  listSilencedFeatureKeys,
} from './statistics/minimal-set.js';

export {
  DEFAULT_NOTE_DEPTH_ALPHA,
  DEFAULT_NOTE_DEPTH_BETA,
  DEFAULT_NOTE_DEPTH_GAMMA,
  DEFAULT_TAU_NOTE,
  MINIMUM_BOOKS_FOR_PERCENTILE,
  RECOMMENDATION_SEED_KINDS,
  computeNoteDepthRaw,
  computeRollingPercentile,
  computeQuadrantSummary,
} from './statistics/quadrant.js';

export {
  DEGRADE_CONF_WARN_THRESHOLD,
  DEGRADE_CONF_HIDE_THRESHOLD,
  DEFAULT_GAMMA_FACTOR,
  DEGRADE_MISSING_DIMS_PLACEHOLDER,
  DEGRADE_MATRIX_REGISTRY,
  getMatrixEntry,
  classifyBehavior,
  computeRetentionRatio,
  assessDegrade,
  assessAllDegrade,
  findDegraded,
} from './statistics/degrade-matrix.js';
export type { AssessDegradeOptions } from './statistics/degrade-matrix.js';

export {
  SATURATE_TAU_HIGHLIGHT,
  SATURATE_TAU_NOTE,
  SATURATE_TAU_REVIEW,
  LONG_REVIEW_CHAR_THRESHOLD,
  saturate,
  saturateHighlight,
  saturateNote,
  saturateReview,
  computeCoverage,
} from './statistics/saturate.js';

export {
  WEIGHT_HIGHLIGHT,
  WEIGHT_NOTE,
  WEIGHT_REVIEW,
  WEIGHT_COVERAGE,
  WEIGHT_OBJECTIVE,
  WEIGHT_SUBJECTIVE,
  TIME_DECAY_LAMBDA,
  computeTimeDecay,
  computeObjectiveScore,
  computeSubjectiveRate,
  computeTrulyReadScore,
} from './statistics/truly-read.js';
export type { ComputeTrulyReadOptions } from './statistics/truly-read.js';

export {
  TOKENIZE_NGRAM_SIZE,
  TOKENIZE_ASCII_MIN_LENGTH,
  TOKENIZE_STOP_CHARS,
  tokenizeText,
  tokenizeDocs,
} from './statistics/tokenize.js';
export type { TokenizedDoc } from './statistics/tokenize.js';

export {
  TFIDF_IDF_SMOOTHING,
  computeIdf,
  l2Normalize,
  computeTfidfVector,
  buildTfidfMatrix,
  cosineSimilarity,
  cosineDistance,
} from './statistics/tfidf.js';
export type { TfidfMatrix } from './statistics/tfidf.js';

export {
  CLUSTER_K_MIN,
  CLUSTER_K_MAX,
  CLUSTER_MAX_ITERATIONS,
  CLUSTER_DEFAULT_SEED,
  SILHOUETTE_SAMPLE_THRESHOLD,
  SILHOUETTE_DEFAULT_SAMPLE_SIZE,
  createSeededRng,
  computeSilhouette,
  runKmeans,
  findBestK,
} from './statistics/topic-cluster.js';
export type {
  ClusterResult,
  FindBestKResult,
  KmeansOptions,
  FindBestKOptions,
} from './statistics/topic-cluster.js';

export {
  COHERENCE_TOP_TERMS,
  LDA_GATE_VOCABULARY_SIZE,
  LDA_GATE_BOOKS_READ,
  LDA_GATE_COHERENCE,
  computeTopicCoherence,
  computeOverallCoherence,
  evaluateLdaGate,
} from './statistics/coherence.js';
export type { LdaGateInput, LdaGateResult } from './statistics/coherence.js';

export {
  TOPIC_DEFAULT_WINDOW_MONTHS,
  TOPIC_PALETTE,
  STABILITY_MIN_HIGHLIGHTS,
  STABILITY_MIN_MONTHS,
  STABILITY_MIN_SILHOUETTE,
  computeTopicSpectrum,
  validateTopicSpectrum,
} from './statistics/topic-spectrum.js';
export type { TopicSpectrumInput, TopicSpectrumValidation } from './statistics/topic-spectrum.js';

export {
  buildHiddenInterestHint,
  selectRepresentativeBook,
  applyHiddenInterestDismissal,
  applyPermanentDismissal,
  markHintShown,
  buildContentPreview as buildHiddenInterestPreview,
} from './statistics/hidden-interest.js';
export {
  buildDataPortabilityManifest,
  computeRevokeDeadline,
  isRevocable,
  serializePortability,
  DATA_PORTABILITY_ALGORITHM_VERSIONS,
  DATA_PORTABILITY_REVOKE_WINDOW_MS,
} from './statistics/data-export.js';
export {
  classifyAudienceTier,
  buildAudienceProfile,
  buildInitialReaderModeState,
  startTempRollback,
  cancelTempRollback,
  resolveEffectiveTier,
  isLowerTier,
  NOVICE_SIGNAL_THRESHOLD,
  POWER_SIGNAL_THRESHOLD,
  READER_MODE_ROLLBACK_WINDOW_MS,
} from './statistics/audience-adapter.js';

export type {
  HiddenInterestState,
  HiddenInterestHint,
  HiddenInterestBook,
  HiddenInterestHintMode,
  DataPortabilityFormat,
  DataPortabilityManifest,
  DataPortabilityRecord,
  DataPortabilityAlgorithmVersion,
  AudienceTier,
  AudienceProfile,
  ReaderModeState,
  RecommendationBucket,
} from '@zhijing/shared';
