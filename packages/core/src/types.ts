/**
 * @file 知径核心类型定义
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

export type PersistedModelProviderConfig = Partial<{
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
export type ModelProviderProfileRecord = {
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


export type StoreState = {
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

export type AgentChatRetryResult = {
  ok: boolean;
  beforeCount: number;
  remainingCount: number;
  truncated: boolean;
};

export type KnowledgeRepository = {
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
  readWeReadTopicLabel(cacheKey: string): { label: string; expiresAt: number } | null;
  saveWeReadTopicLabel(cacheKey: string, label: string, expiresAt: number): void;
  readWeReadGlobalTopicSpectrumCache(): { spectrumJson: string; expiresAt: number } | null;
  saveWeReadGlobalTopicSpectrumCache(spectrumJson: string, expiresAt: number): void;
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

export type GeneratedCard = {
  type?: KnowledgeCard['type'];
  title?: string;
  body?: string;
};

export type GeneratedKnowledgeOutput = {
  title?: string;
  summary?: string;
  cards?: GeneratedCard[];
  artifactTitle?: string;
  artifactBody?: string;
};

export type ParsedMaterialContent = {
  title?: string;
  text: string;
  mediaUrls?: string[];
  needsReview?: boolean;
  reviewReason?: string;
};

export type ParseFailureCategory = 'network' | 'blocked' | 'timeout' | 'too_short' | 'unsupported' | 'unknown';

export type ParserCacheEntry = {
  parsed: ParsedMaterialContent;
  platform: string;
  cachedAt: number;
};

export type XiaohongshuShareInfo = {
  noteId?: string;
  xsecToken?: string;
  sourceUrl: string;
};


export type WorkspaceRow = {
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

export type MaterialRow = {
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

export type CardRow = {
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

export type CardRevisionRow = {
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

export type TaskRow = {
  id: string;
  workflow: AgentTask['workflow'];
  status: AgentTask['status'];
  input_json: string;
  output_json: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};

export type ArtifactRow = {
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

export type ArtifactRevisionRow = {
  id: string;
  artifact_id: string;
  version: number;
  section_id: string;
  section_title_snapshot: string;
  section_body_snapshot: string;
  changed_fields_json: string;
  created_at: string;
};

export type MessageRow = {
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

export type ModelProviderSettingsRow = {
  id: string;
  provider: string;
  model: string;
  base_url: string | null;
  api_key: string | null;
  enabled: number;
  fallback_to_mock: number;
  updated_at: string;
};

export type ModelProviderProfileRow = {
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

export type WeReadSettingsRow = {
  id: string;
  api_key: string;
  updated_at: string;
};

export type DataAccountRow = {
  key: string;
  label: string;
  tier: string;
  dependent_metrics_json: string;
  exportable: number;
  updated_at: string;
};

export type DataAccountMetaRow = {
  id: string;
  minimal_mode: number;
  updated_at: string;
};

export type VerificationStateRow = {
  book_id: string;
  verified: number;
  verified_at: string | null;
  passed_count: number;
  attempts: number;
  updated_at: string;
};


