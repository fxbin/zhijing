/**
 * @file 知径核心工具函数：Mapper、搜索辅助、项目根解析等
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
  WorkspaceRow, MaterialRow, CardRow, CardRevisionRow, TaskRow, ArtifactRow,
  ArtifactRevisionRow, MessageRow, ModelProviderSettingsRow, ModelProviderProfileRow,
  WeReadSettingsRow, DataAccountRow, DataAccountMetaRow, VerificationStateRow,
} from './types.js';
import {
  now, execFileAsync,
} from './business.js';
import {
  MEMORY_SEARCH_TITLE_WEIGHT, MEMORY_SEARCH_BODY_WEIGHT,
  AGENT_ACTION_SUCCESS_TRUE,
  AGENT_CHAT_MESSAGE_ID_PREFIX, AGENT_CHAT_TITLE_MAX_LENGTH,
  defaultSqlitePath,
} from './constants.js';

export const jiebaRequire = createRequireForJieba(import.meta.url);
export const jiebaCut: (text: string, hmm?: boolean) => string[] = (jiebaRequire('jieba-wasm') as { cut: (text: string, hmm?: boolean) => string[] }).cut;

export function mapWorkspace(row: WorkspaceRow): WorkspaceSummary {
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

export function mapMaterial(row: MaterialRow): MaterialRecord {
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

export function parseJsonStringArray(value: string | null | undefined) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export function parseStatusTimeline(value: string | null | undefined): MaterialStatusTimeline | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as MaterialStatusTimeline) : undefined;
  } catch {
    return undefined;
  }
}

export function serializeTimeline(timeline: MaterialStatusTimeline | undefined): string | null {
  return timeline ? JSON.stringify(timeline) : null;
}

export function stampMaterialStatus(
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

export function mapCard(row: CardRow): KnowledgeCard {
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

export function parseCardRecall(json: string | null): CardRecall | undefined {
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

export function serializeCardRecall(recall: CardRecall | undefined): string | null {
  if (!recall) return null;
  return JSON.stringify(recall);
}

export function mapCardRevision(row: CardRevisionRow): CardRevision {
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

export const FTS_SPECIAL_CHARS_PATTERN = /["*:(\-+)^]/g;
export const FTS_WHITESPACE_PATTERN = /\s+/g;
export const CJK_CHARACTER_PATTERN = /[\u4e00-\u9fff]/;

/**
 * LIKE fallback 分词后保留的最小 token 长度。
 * 长度 < 2 的 token（单个中文字、单字母）不参与 LIKE 匹配，避免召回噪音过大。
 */
export const LIKE_FALLBACK_MIN_TOKEN_LENGTH = 2;

/**
 * LIKE fallback 分词后保留的最大 token 数量。
 * 上限避免 SQL IN 列表或 OR 子句过长影响性能。
 */
export const LIKE_FALLBACK_MAX_TOKENS = 8;

/**
 * 判断字符是否为 CJK 统一表意文字（U+4E00 - U+9FFF）。
 * @param ch - 待检测字符
 * @returns 是否为中文汉字
 */
export function isCjkCharForLike(ch: string): boolean {
  const code = ch.codePointAt(0) ?? 0;
  return code >= 0x4e00 && code <= 0x9fff;
}

/**
 * 将查询字符串分词为 LIKE fallback 可用的 token 数组。
 *
 * 设计目的：LLM 倾向于把用户短查询改写成多关键词长句（如「命运赠送」→「命运赠送 礼物 暗中标好了价格」），
 * 原来的 `%query%` 连续子串匹配在这种场景下必然 0 命中。本函数用 jieba 分词后，
 * 保留长度 >= 2 的有效 token，让 LIKE fallback 按 token OR 匹配，任一词命中即召回。
 *
 * 处理流程：
 * 1. jieba cut(HMM=true) 切词
 * 2. 过滤长度 < 2 的 token（单字、单字母）
 * 3. 过滤纯标点、纯空白
 * 4. 去重
 * 5. 截断至上限数量
 *
 * 兜底：若分词后 token 数组为空（如全标点输入），返回原始 query 去空格后的单元素数组，
 * 让 LIKE 仍能做一次完整子串匹配，避免完全无保底。
 *
 * @param query - 原始或 LLM 改写后的查询字符串
 * @returns 用于 LIKE OR 匹配的 token 数组，长度 >= 1
 * @author fxbin
 */
export function splitQueryForLikeFallback(query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const raw = jiebaCut(trimmed, true);
  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const token of raw) {
    if (!token || token.length < LIKE_FALLBACK_MIN_TOKEN_LENGTH) continue;
    const cleaned = token.trim();
    if (!cleaned) continue;
    let hasContent = false;
    for (const ch of cleaned) {
      if (isCjkCharForLike(ch) || /[A-Za-z0-9]/.test(ch)) {
        hasContent = true;
        break;
      }
    }
    if (!hasContent) continue;
    if (seen.has(cleaned)) continue;
    seen.add(cleaned);
    tokens.push(cleaned);
    if (tokens.length >= LIKE_FALLBACK_MAX_TOKENS) break;
  }
  if (tokens.length === 0) {
    return [trimmed];
  }
  return tokens;
}

/**
 * 清理 FTS5 查询字符串，去除 FTS5 查询语法中的特殊字符，避免语法错误。
 * 仅保留可被分词器处理的普通文本，清理后用于 MATCH 查询。
 * @author fxbin
 * @param {string} query - 原始查询字符串
 * @returns {string} 清理后的查询字符串，可能为空字符串
 */
export function sanitizeFtsQuery(query: string): string {
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
export function extractSearchTerms(query: string): string[] {
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
export function scoreTextRelevance(title: string, body: string, terms: string[]): number {
  let score = 0;
  for (const term of terms) {
    if (title.includes(term)) score += MEMORY_SEARCH_TITLE_WEIGHT;
    if (body.includes(term)) score += MEMORY_SEARCH_BODY_WEIGHT;
  }
  return score;
}

export const REVISION_FIELDS: CardRevisionField[] = ['title', 'body', 'type', 'claimStatus'];

export function parseRevisionFields(json: string): CardRevisionField[] {
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

export type ExportRow = {
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

export function mapExportRecord(row: ExportRow): ExportRecord {
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

export type SavedFilterRow = {
  id: string;
  scope: SavedFilterScope;
  card_type: string | null;
  claim_status: string | null;
  sort_key: string;
  keyword: string;
  updated_at: string;
};

export function mapSavedFilter(row: SavedFilterRow): SavedFilter {
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

export type EntityRow = {
  id: string;
  workspace_id: string;
  name: string;
  type: EntityType;
  description: string;
  source_card_ids_json: string;
  created_at: string;
  updated_at: string;
};

export function mapEntity(row: EntityRow): Entity {
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

export type ConflictAuditRow = {
  id: string;
  kind: ConflictKind;
  action: ConflictResolutionAction;
  keep_id: string;
  drop_ids_json: string;
  workspace_id: string;
  note: string;
  created_at: string;
};

export function mapConflictAudit(row: ConflictAuditRow): ConflictAuditEntry {
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

export type AttentionLogRow = {
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
export function mapAttentionSignal(row: AttentionLogRow): AttentionSignal {
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

export type ProposalRow = {
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

export function mapProposal(row: ProposalRow): PersistedProposal {
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

export type AgentUsageRow = {
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

export type AgentChatSessionRow = {
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

export type AgentChatMessageRow = {
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

export type AgentChatRunRow = {
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

export type AgentChatToolCallRow = {
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

export function mapAgentUsage(row: AgentUsageRow): AgentUsageRecord {
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

export function mapAgentChatRun(row: AgentChatRunRow): AgentChatRunRecord {
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

export function mapAgentChatSession(row: AgentChatSessionRow, lastRun?: AgentChatRunRecord): AgentChatSessionInfo {
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

export function mapAgentChatMessage(row: AgentChatMessageRow): AgentChatMessageRecord {
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

export function mapAgentChatToolCall(row: AgentChatToolCallRow): AgentChatToolCallRecord {
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

export type UserMemoryRow = {
  id: string;
  scope: string;
  key: string;
  value: string;
  source: string;
  workspace_id: string | null;
  created_at: string;
  updated_at: string;
};

export function mapUserMemory(row: UserMemoryRow): UserMemory {
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

export type DecisionLogRow = {
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

export function mapDecisionLog(row: DecisionLogRow): DecisionLog {
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

export type AgentActionLogRow = {
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
export function mapAgentActionLog(row: AgentActionLogRow): AgentActionLog {
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

export type MapCustomEdgeRow = {
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
export function mapMapCustomEdge(row: MapCustomEdgeRow): KnowledgeMapCustomEdge {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    sourceNodeId: row.source_node_id,
    targetNodeId: row.target_node_id,
    relation: row.relation as 'supports' | 'contradicts' | 'related_to',
    createdAt: row.created_at,
  };
}

export const RECALL_EASE_FLOOR = 1.3;
export const RECALL_EASE_CEIL = 2.8;
export const RECALL_EASE_STEP = 0.15;
export const RECALL_INTERVAL_LAPSE = 1;
export const RECALL_INTERVAL_GRADUATING_GOOD = 3;
export const RECALL_INTERVAL_GRADUATING_EASY = 4;
export const RECALL_MS_PER_DAY = 86_400_000;

export function clampEase(ease: number): number {
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

export function mapTask(row: TaskRow): AgentTask {
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

export const ARTIFACT_SUBTYPE_VALUES: readonly ArtifactSubtype[] = [
  'deep_research',
  'product',
  'topic',
  'xiaohongshu',
  'summary',
];

export function normalizeArtifactSubtype(value: string | null | undefined): ArtifactSubtype {
  if (value && (ARTIFACT_SUBTYPE_VALUES as readonly string[]).includes(value)) {
    return value as ArtifactSubtype;
  }
  return 'summary';
}

export function kitToSubtype(kitId: KnowledgeKitId): ArtifactSubtype {
  if (kitId === 'learning_research') return 'deep_research';
  if (kitId === 'product_research') return 'product';
  if (kitId === 'topic_decomposition') return 'topic';
  return 'xiaohongshu';
}

export function mapArtifact(row: ArtifactRow): ArtifactRecord {
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

export function parseArtifactSections(raw: string | null | undefined): ArtifactSection[] {
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

export function mapArtifactRevision(row: ArtifactRevisionRow): ArtifactRevision {
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

export function mapMessage(row: MessageRow): ChatMessage {
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

export function getRawMessageRole(message: unknown): AgentChatMessageRecord['role'] {
  if (!message || typeof message !== 'object') return 'unknown';
  const role = (message as { role?: unknown }).role;
  if (role === 'user' || role === 'assistant' || role === 'tool' || role === 'system') return role;
  return 'unknown';
}

export function extractRawMessageText(message: unknown): string {
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

export function extractRawMessageReasoning(message: unknown): string {
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

export function getRawMessageTimestamp(message: unknown, fallback: string): string {
  if (!message || typeof message !== 'object') return fallback;
  const timestamp = (message as { timestamp?: unknown; createdAt?: unknown }).timestamp;
  if (typeof timestamp === 'number' && Number.isFinite(timestamp)) return new Date(timestamp).toISOString();
  if (typeof timestamp === 'string' && timestamp.length > 0) return timestamp;
  const createdAt = (message as { createdAt?: unknown }).createdAt;
  if (typeof createdAt === 'string' && createdAt.length > 0) return createdAt;
  return fallback;
}

export function buildAgentChatMessageRecords(
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

export function deriveAgentChatTitle(rawMessages: unknown[]): string {
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

export function findLastUserMessageIndex(rawMessages: unknown[]): number {
  for (let i = rawMessages.length - 1; i >= 0; i -= 1) {
    if (getRawMessageRole(rawMessages[i]) === 'user') return i;
  }
  return -1;
}

/**
 * 将 SQLite profile 行映射为内部持久化记录（包含 apiKey 明文）。
 * @author fxbin
 */
export function mapModelProviderProfileRow(row: ModelProviderProfileRow): ModelProviderProfileRecord {
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
 * 打开文件管理器命令的最大等待毫秒数。
 */
export const REVEAL_PATH_TIMEOUT_MS = 5000;

/**
 * 各平台打开文件管理器的命令名。
 */
export const REVEAL_PATH_COMMANDS: Record<string, string> = {
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


