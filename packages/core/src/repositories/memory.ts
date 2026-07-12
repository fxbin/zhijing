/**
 * @file 内存仓库实现：MemoryKnowledgeRepository
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
import { fetchUrlAsMarkdown, parseRawHtml } from '../web-fetch.js';
import * as ssrfGuard from '../ssrf-guard.js';
import { createSsrfSafeFetch as createSafeFetch } from '../ssrf-guard.js';
import {
  createDefaultDataAccount,
  setMinimalMode,
} from '../data-account-book.js';
import { buildEmptyCoverage } from '../statistics/verification-bank.js';
import { LONG_REVIEW_CHAR_THRESHOLD } from '../statistics/saturate.js';
import {
  buildHiddenInterestHint,
  applyHiddenInterestDismissal,
  applyPermanentDismissal,
  markHintShown,
} from '../statistics/hidden-interest.js';
import {
  buildDataPortabilityManifest,
  computeRevokeDeadline,
  serializePortability,
  DATA_PORTABILITY_ALGORITHM_VERSIONS,
} from '../statistics/data-export.js';
import {
  classifyAudienceTier,
  buildAudienceProfile,
  buildInitialReaderModeState,
  startTempRollback,
  cancelTempRollback,
  resolveEffectiveTier,
} from '../statistics/audience-adapter.js';
import type { BookSignalInputs, QuadrantSummary, TopicSpectrum } from '@zhijing/shared';
import { DEGRADE_MATRIX_REGISTRY } from '../statistics/degrade-matrix.js';
import { computeQuadrantSummary } from '../statistics/quadrant.js';
import { computeTopicSpectrum } from '../statistics/topic-spectrum.js';
import { tokenizeText } from '../statistics/tokenize.js';
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
} from '../search-zvec.js';

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
} from '../memory.js';
import {
  buildUsageFilter,
  buildUsageSummary,
  buildUsageComparison,
  applyQueryLimit,
  DEFAULT_QUERY_LIMIT,
  type AgentUsageRepository,
} from '../agent-usage.js';
import {
  buildUserMemoryFilter,
  applyUserMemoryLimit,
  validateCreateUserMemoryRequest,
  type UserMemoryRepository,
  type UserMemoryQuery,
} from '../user-memory.js';
import {
  buildDecisionLogFilter,
  applyDecisionLogLimit,
  validateCreateDecisionLogRequest,
  type DecisionLogRepository,
  type DecisionLogQuery,
} from '../decision-log.js';
import {
  computeEvidenceFeedback,
  extractRejectedFeatures,
  buildNegativeExampleSection,
  EVIDENCE_ACTION_ACCEPT_PROPOSED_CARDS,
  DEFAULT_REJECTED_FEATURES_LIMIT,
} from '../evidence-feedback.js';
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
} from '../weread.js';

import type {
  StoreState, KnowledgeRepository,
  PersistedModelProviderConfig, ModelProviderProfileRecord, AgentChatRetryResult,
} from '../types.js';
import {
  extractSearchTerms, scoreTextRelevance,
  buildAgentChatMessageRecords, findLastUserMessageIndex,
} from '../utils.js';
import { now } from '../business.js';
import {
  ATTENTION_LOG_LIMIT,
  AGENT_ACTION_LOG_DEFAULT_LIMIT, AGENT_ACTION_LOG_MAX_LIMIT,
  AGENT_ACTION_LOG_TABLE_NAME,
} from '../constants.js';

export class MemoryKnowledgeRepository implements KnowledgeRepository {
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
  private topicLabelStore: Map<string, { label: string; expiresAt: number }> = new Map();
  private globalTopicSpectrumCache: { spectrumJson: string; expiresAt: number } | null = null;

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
   * 内存版主题标签缓存查询。测试环境不调 LLM，正常不会命中。
   */
  readWeReadTopicLabel(cacheKey: string): { label: string; expiresAt: number } | null {
    return this.topicLabelStore.get(cacheKey) ?? null;
  }

  /**
   * 内存版主题标签缓存写入。
   */
  saveWeReadTopicLabel(cacheKey: string, label: string, expiresAt: number): void {
    this.topicLabelStore.set(cacheKey, { label, expiresAt });
  }

  /**
   * 内存版全局主题谱缓存查询。测试环境不调 LLM，正常不会命中。
   */
  readWeReadGlobalTopicSpectrumCache(): { spectrumJson: string; expiresAt: number } | null {
    return this.globalTopicSpectrumCache;
  }

  /**
   * 内存版全局主题谱缓存写入。
   */
  saveWeReadGlobalTopicSpectrumCache(spectrumJson: string, expiresAt: number): void {
    this.globalTopicSpectrumCache = { spectrumJson, expiresAt };
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

