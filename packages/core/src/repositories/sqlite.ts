/**
 * @file SQLite 仓库实现：SqliteKnowledgeRepository
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
  ModelProviderProfileRecord, PersistedModelProviderConfig, AgentChatRetryResult,
  WorkspaceRow, MaterialRow, CardRow, CardRevisionRow, TaskRow, ArtifactRow,
  ArtifactRevisionRow, MessageRow, ModelProviderSettingsRow, ModelProviderProfileRow,
  WeReadSettingsRow, DataAccountRow, DataAccountMetaRow, VerificationStateRow,
} from '../types.js';
import type { RuntimeModelProviderConfig } from '../state.js';
import type {
  ExportRow, SavedFilterRow, EntityRow, ConflictAuditRow, AttentionLogRow,
  ProposalRow, AgentUsageRow, AgentChatSessionRow, AgentChatMessageRow,
  AgentChatRunRow, AgentChatToolCallRow, UserMemoryRow, DecisionLogRow,
  AgentActionLogRow, MapCustomEdgeRow,
} from '../utils.js';
import {
  mapWorkspace, mapMaterial, mapCard, mapCardRevision,
  mapExportRecord, mapSavedFilter, mapEntity, mapConflictAudit,
  mapAttentionSignal, mapProposal, mapAgentUsage,
  mapAgentChatSession, mapAgentChatRun, mapAgentChatMessage, mapAgentChatToolCall,
  mapUserMemory, mapDecisionLog, mapMapCustomEdge,
  mapTask, mapArtifact, mapArtifactRevision, mapMessage,
  mapModelProviderProfileRow, mapAgentActionLog,
  serializeCardRecall, sanitizeFtsQuery, splitQueryForLikeFallback,
  deriveAgentChatTitle, buildAgentChatMessageRecords, findLastUserMessageIndex,
} from '../utils.js';
import {
  now, id, resolveWorkspaceId,
  DEFAULT_USER_MEMORY_QUERY_LIMIT, DEFAULT_DECISION_LOG_QUERY_LIMIT,
} from '../business.js';
import {
  MAP_EDGE_TABLE_NAME, ATTENTION_LOG_LIMIT,
  LEGACY_MODEL_PROVIDER_SETTINGS_ID, FTS_TOKENIZER,
  AGENT_ACTION_LOG_DEFAULT_LIMIT, AGENT_ACTION_LOG_MAX_LIMIT,
  MODEL_PROVIDER_PROFILE_ID_PREFIX, DEFAULT_PROFILE_NAME,
  AGENT_ACTION_SUCCESS_TRUE, AGENT_ACTION_SUCCESS_FALSE,
  INSPECT_FORBIDDEN_TABLES,
} from '../constants.js';
import { KnowledgeCoreError } from '../errors.js';
import {
  toCardIndexInput, toMaterialIndexInput,
} from './registry.js';

export class SqliteKnowledgeRepository implements KnowledgeRepository {
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
    if (sanitized) {
      try {
        const rows = this.db.prepare(`
          SELECT c.* FROM cards c
          JOIN cards_fts ON c.id = cards_fts.card_id
          WHERE cards_fts.workspace_id = ? AND cards_fts MATCH ? AND c.archived = 0
          ORDER BY bm25(cards_fts)
          LIMIT ?
        `).all(workspaceId, sanitized, limit) as CardRow[];
        if (rows.length > 0) return rows.map(mapCard);
      } catch (error) {
        console.warn('[searchCardsByRelevance] FTS query failed', error);
      }
    }

    const likeTokens = splitQueryForLikeFallback(query);
    if (likeTokens.length === 0) return [];
    try {
      const escapedTokens = likeTokens.map((t) => `%${t.replace(/[%_]/g, (m) => `\\${m}`)}%`);
      const orClauses: string[] = escapedTokens.map(() => '(title LIKE ? ESCAPE \'\\\' OR body LIKE ? ESCAPE \'\\\')');
      const params: Array<string | number> = [workspaceId];
      for (const escaped of escapedTokens) {
        params.push(escaped, escaped);
      }
      params.push(limit * 3);
      const rows = this.db.prepare(`
        SELECT * FROM cards
        WHERE workspace_id = ? AND archived = 0 AND (
          ${orClauses.join(' OR ')}
        )
        ORDER BY updated_at DESC
        LIMIT ?
      `).all(...params) as CardRow[];
      const scored = rows.map((row) => {
        const card = mapCard(row);
        const titleLower = card.title.toLowerCase();
        const bodyLower = card.body.toLowerCase();
        let hitCount = 0;
        for (const token of likeTokens) {
          const tokenLower = token.toLowerCase();
          if (titleLower.includes(tokenLower) || bodyLower.includes(tokenLower)) {
            hitCount += 1;
          }
        }
        return { card, hitCount };
      });
      scored.sort((a, b) => b.hitCount - a.hitCount);
      return scored.slice(0, limit).map((s) => s.card);
    } catch (error) {
      console.warn('[searchCardsByRelevance] content LIKE fallback failed', error);
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
    if (sanitized) {
      try {
        const rows = this.db.prepare(`
          SELECT m.* FROM materials m
          JOIN materials_fts ON m.id = materials_fts.material_id
          WHERE materials_fts.workspace_id = ? AND materials_fts MATCH ? AND m.archived = 0
          ORDER BY bm25(materials_fts)
          LIMIT ?
        `).all(workspaceId, sanitized, limit) as MaterialRow[];
        if (rows.length > 0) return rows.map(mapMaterial);
      } catch (error) {
        console.warn('[searchMaterialsByRelevance] FTS query failed', error);
      }
    }

    const likeTokens = splitQueryForLikeFallback(query);
    if (likeTokens.length === 0) return [];
    try {
      const escapedTokens = likeTokens.map((t) => `%${t.replace(/[%_]/g, (m) => `\\${m}`)}%`);
      const orClauses: string[] = escapedTokens.map(() => '(title LIKE ? ESCAPE \'\\\' OR content_text LIKE ? ESCAPE \'\\\')');
      const params: Array<string | number> = [workspaceId];
      for (const escaped of escapedTokens) {
        params.push(escaped, escaped);
      }
      params.push(limit * 3);
      const rows = this.db.prepare(`
        SELECT * FROM materials
        WHERE workspace_id = ? AND archived = 0 AND (
          ${orClauses.join(' OR ')}
        )
        ORDER BY created_at DESC
        LIMIT ?
      `).all(...params) as MaterialRow[];
      const scored = rows.map((row) => {
        const material = mapMaterial(row);
        const titleLower = material.title.toLowerCase();
        const contentLower = (material.contentText ?? material.rawInput ?? '').toLowerCase();
        let hitCount = 0;
        for (const token of likeTokens) {
          const tokenLower = token.toLowerCase();
          if (titleLower.includes(tokenLower) || contentLower.includes(tokenLower)) {
            hitCount += 1;
          }
        }
        return { material, hitCount };
      });
      scored.sort((a, b) => b.hitCount - a.hitCount);
      return scored.slice(0, limit).map((s) => s.material);
    } catch (error) {
      console.warn('[searchMaterialsByRelevance] content LIKE fallback failed', error);
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

    let rawMessagesJson: string;
    try {
      rawMessagesJson = JSON.stringify(record.rawMessages);
    } catch {
      rawMessagesJson = '[]';
    }

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
        record.rawMessages.length,
        rawMessagesJson,
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
        let rawJson: string;
        try {
          rawJson = JSON.stringify(message.raw);
        } catch {
          rawJson = '{}';
        }
        insertMessage.run(
          message.id,
          message.sessionId,
          message.workspaceId,
          message.role,
          message.text,
          message.reasoning,
          rawJson,
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
        let argsJson: string;
        try {
          argsJson = JSON.stringify(toolCall.args);
        } catch {
          argsJson = '{}';
        }
        let detailsJson: string | null;
        if (toolCall.details === undefined) {
          detailsJson = null;
        } else {
          try {
            detailsJson = JSON.stringify(toolCall.details);
          } catch {
            detailsJson = '{}';
          }
        }
        insertToolCall.run(
          toolCall.id,
          toolCall.runId,
          toolCall.sessionId,
          toolCall.workspaceId,
          toolCall.toolCallId,
          toolCall.toolName,
          argsJson,
          toolCall.result,
          detailsJson,
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
    this.ensureWeReadTopicLabelTable();
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
   * 微信读书全局主题谱 LLM 标签缓存表。
   *
   * 持久化每个主题簇的 LLM 生成标签，避免后端重启或 24h 内存缓存失效后
   * 重复调 LLM（17 个簇 × 1.5s 间隔 = 浪费 token 与时间）。
   *
   * cacheKey 为代表词排序后拼接，label 为 4-12 字主题短语，
   * expiresAt 为毫秒时间戳，过期后下次读取视为未命中。
   *
   * @author fxbin
   */
  private ensureWeReadTopicLabelTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS weread_topic_label_cache (
        cache_key TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        expires_at INTEGER NOT NULL
      );
      DELETE FROM weread_topic_label_cache WHERE label = '待补充';
      CREATE TABLE IF NOT EXISTS weread_global_topic_spectrum_cache (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        spectrum_json TEXT NOT NULL,
        expires_at INTEGER NOT NULL
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
   * 读取微信读书全局主题谱 LLM 标签缓存。过期或不存在返回 null。
   */
  readWeReadTopicLabel(cacheKey: string): { label: string; expiresAt: number } | null {
    const row = this.db
      .prepare('SELECT label, expires_at FROM weread_topic_label_cache WHERE cache_key = ?')
      .get(cacheKey) as { label: string; expires_at: number } | undefined;
    if (!row) return null;
    return { label: row.label, expiresAt: row.expires_at };
  }

  /**
   * 保存微信读书全局主题谱 LLM 标签缓存。upsert 语义，同 cacheKey 覆盖。
   */
  saveWeReadTopicLabel(cacheKey: string, label: string, expiresAt: number): void {
    this.db
      .prepare(
        `
      INSERT INTO weread_topic_label_cache (cache_key, label, expires_at)
      VALUES (@cacheKey, @label, @expiresAt)
      ON CONFLICT(cache_key) DO UPDATE SET
        label = @label,
        expires_at = @expiresAt
    `,
      )
      .run({ cacheKey, label, expiresAt });
  }

  /**
   * 读取全局主题谱缓存。单行表（id=1），不存在或过期返回 null。
   *
   * 持久化整个 spectrum JSON，避免每次进入统计 tab 都重新聚类 + 调 LLM。
   * 默认 TTL 7 天，过期后下次读取视为未命中，触发重算。
   */
  readWeReadGlobalTopicSpectrumCache(): { spectrumJson: string; expiresAt: number } | null {
    const row = this.db
      .prepare('SELECT spectrum_json, expires_at FROM weread_global_topic_spectrum_cache WHERE id = 1')
      .get() as { spectrum_json: string; expires_at: number } | undefined;
    if (!row) return null;
    return { spectrumJson: row.spectrum_json, expiresAt: row.expires_at };
  }

  /**
   * 保存全局主题谱缓存。upsert 语义，单行表始终只保留最新一份。
   */
  saveWeReadGlobalTopicSpectrumCache(spectrumJson: string, expiresAt: number): void {
    this.db
      .prepare(
        `
      INSERT INTO weread_global_topic_spectrum_cache (id, spectrum_json, expires_at)
      VALUES (1, @spectrumJson, @expiresAt)
      ON CONFLICT(id) DO UPDATE SET
        spectrum_json = @spectrumJson,
        expires_at = @expiresAt
    `,
      )
      .run({ spectrumJson, expiresAt });
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

