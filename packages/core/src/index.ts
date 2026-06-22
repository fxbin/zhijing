import {
  type AgentTask,
  type ArchiveItemResult,
  type ArchivedItemsResult,
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
  type RecallGrade,
  classifyInput,
  type Entity,
  type EntityType,
  type ExtractedEntitySeed,
  type SavedFilter,
  type SavedFilterScope,
  type CompleteMaterialReviewRequest,
  type IntakeRequest,
  type IntakeResult,
  type KnowledgeBaseAnalytics,
  type KnowledgeBaseDetail,
  type KnowledgeBasePath,
  type KnowledgeMapResult,
  type KnowledgeMapNodePosition,
  type PathStep,
  type SaveKnowledgeMapNodePositionsRequest,
  type KnowledgeBaseSummary,
  type KnowledgeCitation,
  type KnowledgeCard,
  type KnowledgeKitId,
  type KnowledgeKitRunResult,
  type MaterialAssignmentResult,
  type MaterialAssignmentSuggestion,
  type MaterialAssignmentSuggestionsResult,
  type MaterialParseQueueResult,
  type MaterialRecord,
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
  type TaskStatus,
  type TestModelProviderSettingsRequest,
  detectPlatform,
} from '@zhijing/shared';
import {
  createPiAiRuntime,
  createMockPiRuntime,
  entityExtractionSchema,
  getDefaultPiModel,
  getDefaultPiProvider,
  getKnownPiModels,
  getKnownPiProviders,
  getPiEnvApiKey,
  isKnownPiProvider,
  questionAnswerSchema,
  structuredSchemas,
  type KnownProvider,
  type PiRuntime,
  type TSchema,
} from '@zhijing/pi-runtime';
import { DuckDBConnection } from '@duckdb/node-api';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { readFile, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
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
} from './weread.js';

type PersistedModelProviderConfig = Partial<{
  provider: string;
  model: string;
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

type StoreState = {
  knowledgeBases: KnowledgeBaseSummary[];
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
};

type KnowledgeRepository = {
  insertKnowledgeBase(base: KnowledgeBaseSummary): void;
  updateKnowledgeBase(base: KnowledgeBaseSummary): void;
  listKnowledgeBases(): KnowledgeBaseSummary[];
  findKnowledgeBase(id: string): KnowledgeBaseSummary | undefined;
  insertMaterial(material: MaterialRecord): void;
  updateMaterial(material: MaterialRecord): void;
  findMaterial(id: string): MaterialRecord | undefined;
  listMaterials(knowledgeBaseId?: string, limit?: number): MaterialRecord[];
  findCard(id: string): KnowledgeCard | undefined;
  deleteMaterial(id: string): void;
  archiveMaterial(id: string): void;
  unarchiveMaterial(id: string): void;
  listArchivedMaterials(knowledgeBaseId?: string): MaterialRecord[];
  getNodePositions(knowledgeBaseId: string): Array<{ nodeId: string; x: number; y: number }>;
  saveNodePositions(knowledgeBaseId: string, positions: Array<{ nodeId: string; x: number; y: number }>): void;
  insertCards(cards: KnowledgeCard[]): void;
  updateCard(card: KnowledgeCard): void;
  listCards(knowledgeBaseId?: string): KnowledgeCard[];
  archiveCard(id: string): void;
  unarchiveCard(id: string): void;
  listArchivedCards(knowledgeBaseId?: string): KnowledgeCard[];
  insertCardRevision(revision: CardRevision): void;
  listCardRevisions(cardId: string): CardRevision[];
  insertExportRecord(record: ExportRecord): void;
  listExportRecords(knowledgeBaseId?: string): ExportRecord[];
  upsertSavedFilter(record: SavedFilter): void;
  listSavedFilters(scope?: SavedFilterScope): SavedFilter[];
  deleteSavedFilter(id: string): void;
  upsertEntity(record: Entity): void;
  listEntities(knowledgeBaseId: string): Entity[];
  deleteEntity(id: string): void;
  deleteEntitiesByKnowledgeBase(knowledgeBaseId: string): void;
  deleteCard(id: string): void;
  insertConflictAudit(entry: ConflictAuditEntry): void;
  listConflictAudit(limit?: number): ConflictAuditEntry[];
  insertTask(task: AgentTask): void;
  updateTask(task: AgentTask): void;
  listTasks(limit?: number): AgentTask[];
  findTask(id: string): AgentTask | undefined;
  insertArtifact(artifact: ArtifactRecord): void;
  updateArtifact(artifact: ArtifactRecord): void;
  listArtifacts(knowledgeBaseId?: string, limit?: number): ArtifactRecord[];
  insertArtifactRevision(revision: ArtifactRevision): void;
  listArtifactRevisions(artifactId: string): ArtifactRevision[];
  findArtifact(artifactId: string): ArtifactRecord | undefined;
  insertMessage(message: ChatMessage): void;
  listMessages(knowledgeBaseId: string, limit?: number): ChatMessage[];
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
  syncWeReadBookMeta(books: WeReadShelfBook[], archiveYearMap: Map<string, string>): void;
  readWeReadBookMetaList(): WeReadBookMetaRow[];
  readWeReadSyncState(): WeReadSyncStateRow | null;
  writeWeReadSyncState(state: WeReadSyncStateRow): void;
  updateWeReadBookMetaImport(bookId: string, materialId: string, bookmarkCount: number): void;
  computeWeReadStats(): WeReadStatsResponse;
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
    knowledgeBases: [],
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
  };

  private wereadApiKey: string | null = null;

  insertKnowledgeBase(base: KnowledgeBaseSummary) {
    this.state.knowledgeBases.unshift(base);
  }

  updateKnowledgeBase(base: KnowledgeBaseSummary) {
    const index = this.state.knowledgeBases.findIndex((item) => item.id === base.id);
    if (index >= 0) this.state.knowledgeBases[index] = base;
  }

  listKnowledgeBases() {
    return this.state.knowledgeBases;
  }

  findKnowledgeBase(id: string) {
    return this.state.knowledgeBases.find((item) => item.id === id);
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

  listMaterials(knowledgeBaseId?: string, limit?: number) {
    const materials = (knowledgeBaseId
      ? this.state.materials.filter((item) => item.knowledgeBaseId === knowledgeBaseId)
      : this.state.materials
    ).filter((item) => !item.archived);
    return typeof limit === 'number' ? materials.slice(0, limit) : materials;
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

  listArchivedMaterials(knowledgeBaseId?: string) {
    const materials = knowledgeBaseId
      ? this.state.materials.filter((item) => item.knowledgeBaseId === knowledgeBaseId)
      : this.state.materials;
    return materials.filter((item) => item.archived);
  }

  getNodePositions(knowledgeBaseId: string) {
    return this.state.nodePositions[knowledgeBaseId] ?? [];
  }

  saveNodePositions(knowledgeBaseId: string, positions: Array<{ nodeId: string; x: number; y: number }>) {
    this.state.nodePositions[knowledgeBaseId] = positions;
  }

  insertCards(cards: KnowledgeCard[]) {
    this.state.cards.unshift(...cards);
  }

  updateCard(card: KnowledgeCard) {
    const index = this.state.cards.findIndex((item) => item.id === card.id);
    if (index >= 0) this.state.cards[index] = card;
  }

  listCards(knowledgeBaseId?: string) {
    const cards = knowledgeBaseId
      ? this.state.cards.filter((item) => item.knowledgeBaseId === knowledgeBaseId)
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

  listArchivedCards(knowledgeBaseId?: string) {
    const cards = knowledgeBaseId
      ? this.state.cards.filter((item) => item.knowledgeBaseId === knowledgeBaseId)
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

  listExportRecords(knowledgeBaseId?: string) {
    return knowledgeBaseId
      ? this.state.exports.filter((item) => item.knowledgeBaseId === knowledgeBaseId)
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

  listEntities(knowledgeBaseId: string) {
    return this.state.entities.filter((item) => item.knowledgeBaseId === knowledgeBaseId);
  }

  deleteEntity(id: string) {
    this.state.entities = this.state.entities.filter((item) => item.id !== id);
  }

  deleteEntitiesByKnowledgeBase(knowledgeBaseId: string) {
    this.state.entities = this.state.entities.filter((item) => item.knowledgeBaseId !== knowledgeBaseId);
  }

  deleteCard(id: string) {
    this.state.cards = this.state.cards.filter((card) => card.id !== id);
    this.state.cardRevisions = this.state.cardRevisions.filter((revision) => revision.cardId !== id);
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

  listArtifacts(knowledgeBaseId?: string, limit?: number) {
    const artifacts = knowledgeBaseId
      ? this.state.artifacts.filter((item) => item.knowledgeBaseId === knowledgeBaseId)
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

  listMessages(knowledgeBaseId: string, limit?: number) {
    const messages = this.state.messages
      .filter((item) => item.knowledgeBaseId === knowledgeBaseId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return typeof limit === 'number' ? messages.slice(-limit) : messages;
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
}

type KnowledgeBaseRow = {
  id: string;
  title: string;
  summary: string;
  stage: KnowledgeBaseSummary['stage'];
  source_count: number;
  card_count: number;
  sourced_ratio: number;
  created_at: string;
  updated_at: string;
};

type MaterialRow = {
  id: string;
  knowledge_base_id: string;
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
  knowledge_base_id: string;
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
  knowledge_base_id: string;
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
  knowledge_base_id: string;
  question: string;
  answer: string;
  card_ids_json: string;
  artifact_id: string | null;
  material_id: string | null;
  created_at: string;
};

type ModelProviderSettingsRow = {
  id: string;
  provider: string;
  model: string;
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

class SqliteKnowledgeRepository implements KnowledgeRepository {
  private readonly db: DatabaseSync;

  constructor(private readonly path: string) {
    mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.migrate();
  }

  insertKnowledgeBase(base: KnowledgeBaseSummary) {
    this.db.prepare(`
      INSERT INTO knowledge_bases (
        id, title, summary, stage, source_count, card_count, sourced_ratio, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(base.id, base.title, base.summary, base.stage, base.sourceCount, base.cardCount, base.sourcedRatio, base.createdAt, base.updatedAt);
  }

  updateKnowledgeBase(base: KnowledgeBaseSummary) {
    this.db.prepare(`
      UPDATE knowledge_bases
      SET title = ?, summary = ?, stage = ?, source_count = ?, card_count = ?, sourced_ratio = ?, updated_at = ?
      WHERE id = ?
    `).run(base.title, base.summary, base.stage, base.sourceCount, base.cardCount, base.sourcedRatio, base.updatedAt, base.id);
  }

  listKnowledgeBases() {
    return (this.db.prepare('SELECT * FROM knowledge_bases ORDER BY updated_at DESC, created_at DESC').all() as KnowledgeBaseRow[]).map(mapKnowledgeBase);
  }

  findKnowledgeBase(id: string) {
    const row = this.db.prepare('SELECT * FROM knowledge_bases WHERE id = ?').get(id) as KnowledgeBaseRow | undefined;
    return row ? mapKnowledgeBase(row) : undefined;
  }

  insertMaterial(material: MaterialRecord) {
    this.db.prepare(`
      INSERT INTO materials (
        id, knowledge_base_id, type, raw_input, source_url, platform, title, content_text, media_urls_json, parse_status, parse_error, transcript, transcript_status, transcript_error, created_at, archived
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      material.id,
      material.knowledgeBaseId,
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
  }

  updateMaterial(material: MaterialRecord) {
    this.db.prepare(`
      UPDATE materials
      SET knowledge_base_id = ?, type = ?, raw_input = ?, source_url = ?, platform = ?, title = ?, content_text = ?, media_urls_json = ?, parse_status = ?, parse_error = ?, transcript = ?, transcript_status = ?, transcript_error = ?, created_at = ?, archived = ?
      WHERE id = ?
    `).run(
      material.knowledgeBaseId,
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
  }

  findMaterial(id: string) {
    const row = this.db.prepare('SELECT * FROM materials WHERE id = ?').get(id) as MaterialRow | undefined;
    return row ? mapMaterial(row) : undefined;
  }

  findCard(id: string) {
    const row = this.db.prepare('SELECT * FROM cards WHERE id = ?').get(id) as CardRow | undefined;
    return row ? mapCard(row) : undefined;
  }

  listMaterials(knowledgeBaseId?: string, limit?: number) {
    const rows = knowledgeBaseId
      ? this.db.prepare('SELECT * FROM materials WHERE knowledge_base_id = ? AND archived = 0 ORDER BY created_at DESC').all(knowledgeBaseId)
      : this.db.prepare(`SELECT * FROM materials WHERE archived = 0 ORDER BY created_at DESC${limit ? ` LIMIT ${limit}` : ''}`).all();
    return (rows as MaterialRow[]).map(mapMaterial);
  }

  archiveMaterial(id: string) {
    this.db.prepare('UPDATE materials SET archived = 1 WHERE id = ?').run(id);
  }

  unarchiveMaterial(id: string) {
    this.db.prepare('UPDATE materials SET archived = 0 WHERE id = ?').run(id);
  }

  listArchivedMaterials(knowledgeBaseId?: string) {
    const rows = knowledgeBaseId
      ? this.db.prepare('SELECT * FROM materials WHERE knowledge_base_id = ? AND archived = 1 ORDER BY created_at DESC').all(knowledgeBaseId)
      : this.db.prepare('SELECT * FROM materials WHERE archived = 1 ORDER BY created_at DESC').all();
    return (rows as MaterialRow[]).map(mapMaterial);
  }

  deleteMaterial(id: string) {
    this.db.exec('BEGIN');
    try {
      this.db.prepare('UPDATE cards SET material_id = NULL WHERE material_id = ?').run(id);
      this.db.prepare('DELETE FROM materials WHERE id = ?').run(id);
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  /**
   * 读取知识库的节点拖拽位置。
   * @param {string} knowledgeBaseId - 知识库 ID
   * @returns {Array<{nodeId: string; x: number; y: number}>} 节点位置数组
   */
  getNodePositions(knowledgeBaseId: string) {
    const rows = this.db
      .prepare('SELECT node_id, x, y FROM knowledge_base_node_positions WHERE knowledge_base_id = ?')
      .all(knowledgeBaseId) as Array<{ node_id: string; x: number; y: number }>;
    return rows.map((row) => ({ nodeId: row.node_id, x: row.x, y: row.y }));
  }

  /**
   * 保存或覆盖知识库的节点拖拽位置。
   * @param {string} knowledgeBaseId - 知识库 ID
   * @param {Array<{nodeId: string; x: number; y: number}>} positions - 节点位置数组
   */
  saveNodePositions(knowledgeBaseId: string, positions: Array<{ nodeId: string; x: number; y: number }>) {
    const upsert = this.db.prepare(`
      INSERT INTO knowledge_base_node_positions (knowledge_base_id, node_id, x, y, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(knowledge_base_id, node_id) DO UPDATE SET
        x = excluded.x,
        y = excluded.y,
        updated_at = excluded.updated_at
    `);
    const timestamp = now();
    this.db.exec('BEGIN');
    try {
      for (const position of positions) {
        upsert.run(knowledgeBaseId, position.nodeId, position.x, position.y, timestamp);
      }
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  insertCards(cards: KnowledgeCard[]) {
    const insert = this.db.prepare(`
      INSERT INTO cards (
        id, knowledge_base_id, material_id, type, title, body, claim_status, recall_json, created_at, updated_at, archived
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    this.db.exec('BEGIN');
    try {
      for (const card of cards) {
        insert.run(card.id, card.knowledgeBaseId, card.materialId ?? null, card.type, card.title, card.body, card.claimStatus, serializeCardRecall(card.recall), card.createdAt, card.updatedAt, card.archived ? 1 : 0);
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
      SET knowledge_base_id = ?, material_id = ?, type = ?, title = ?, body = ?, claim_status = ?, recall_json = ?, created_at = ?, updated_at = ?, archived = ?
      WHERE id = ?
    `).run(
      card.knowledgeBaseId,
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
  }

  listCards(knowledgeBaseId?: string) {
    const rows = knowledgeBaseId
      ? this.db.prepare('SELECT * FROM cards WHERE knowledge_base_id = ? AND archived = 0 ORDER BY updated_at DESC, created_at DESC').all(knowledgeBaseId)
      : this.db.prepare('SELECT * FROM cards WHERE archived = 0 ORDER BY updated_at DESC, created_at DESC').all();
    return (rows as CardRow[]).map(mapCard);
  }

  archiveCard(id: string) {
    this.db.prepare('UPDATE cards SET archived = 1 WHERE id = ?').run(id);
  }

  unarchiveCard(id: string) {
    this.db.prepare('UPDATE cards SET archived = 0 WHERE id = ?').run(id);
  }

  listArchivedCards(knowledgeBaseId?: string) {
    const rows = knowledgeBaseId
      ? this.db.prepare('SELECT * FROM cards WHERE knowledge_base_id = ? AND archived = 1 ORDER BY updated_at DESC, created_at DESC').all(knowledgeBaseId)
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
        id, knowledge_base_id, format, scope, include_artifacts, material_count, card_count, artifact_count, filename, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      record.id,
      record.knowledgeBaseId,
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

  listExportRecords(knowledgeBaseId?: string) {
    const rows = knowledgeBaseId
      ? this.db.prepare('SELECT * FROM exports WHERE knowledge_base_id = ? ORDER BY created_at DESC').all(knowledgeBaseId)
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
      INSERT INTO entities (id, knowledge_base_id, name, type, description, source_card_ids_json, created_at, updated_at)
      VALUES (@id, @knowledge_base_id, @name, @type, @description, @source_card_ids_json, @created_at, @updated_at)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        type = excluded.type,
        description = excluded.description,
        source_card_ids_json = excluded.source_card_ids_json,
        updated_at = excluded.updated_at
    `).run({
      id: record.id,
      knowledge_base_id: record.knowledgeBaseId,
      name: record.name,
      type: record.type,
      description: record.description,
      source_card_ids_json: JSON.stringify(record.sourceCardIds),
      created_at: record.createdAt,
      updated_at: record.updatedAt,
    });
  }

  listEntities(knowledgeBaseId: string) {
    const rows = this.db.prepare('SELECT * FROM entities WHERE knowledge_base_id = ? ORDER BY updated_at DESC').all(knowledgeBaseId);
    return (rows as EntityRow[]).map(mapEntity);
  }

  deleteEntity(id: string) {
    this.db.prepare('DELETE FROM entities WHERE id = ?').run(id);
  }

  deleteEntitiesByKnowledgeBase(knowledgeBaseId: string) {
    this.db.prepare('DELETE FROM entities WHERE knowledge_base_id = ?').run(knowledgeBaseId);
  }

  deleteCard(id: string) {
    this.db.prepare('DELETE FROM cards WHERE id = ?').run(id);
  }

  insertConflictAudit(entry: ConflictAuditEntry) {
    this.db.prepare(`
      INSERT INTO conflict_audit (id, kind, action, keep_id, drop_ids_json, knowledge_base_id, note, created_at)
      VALUES (@id, @kind, @action, @keep_id, @drop_ids_json, @knowledge_base_id, @note, @created_at)
    `).run({
      id: entry.id,
      kind: entry.kind,
      action: entry.action,
      keep_id: entry.keepId,
      drop_ids_json: JSON.stringify(entry.dropIds),
      knowledge_base_id: entry.knowledgeBaseId,
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
        id, knowledge_base_id, artifact_type, subtype, title, body, source_material_ids_json, sections_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      artifact.id,
      artifact.knowledgeBaseId,
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
      SET knowledge_base_id = ?, artifact_type = ?, subtype = ?, title = ?, body = ?, source_material_ids_json = ?, sections_json = ?, created_at = ?
      WHERE id = ?
    `).run(
      artifact.knowledgeBaseId,
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

  listArtifacts(knowledgeBaseId?: string, limit?: number) {
    const rows = knowledgeBaseId
      ? this.db.prepare('SELECT * FROM artifacts WHERE knowledge_base_id = ? ORDER BY created_at DESC').all(knowledgeBaseId)
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
        id, knowledge_base_id, question, answer, card_ids_json, artifact_id, material_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      message.id,
      message.knowledgeBaseId,
      message.question,
      message.answer,
      JSON.stringify(message.cardIds),
      message.artifactId ?? null,
      message.materialId ?? null,
      message.createdAt,
    );
  }

  listMessages(knowledgeBaseId: string, limit?: number) {
    const rows = limit
      ? this.db.prepare('SELECT * FROM (SELECT * FROM messages WHERE knowledge_base_id = ? ORDER BY created_at DESC LIMIT ?) ORDER BY created_at ASC').all(knowledgeBaseId, limit)
      : this.db.prepare('SELECT * FROM messages WHERE knowledge_base_id = ? ORDER BY created_at ASC').all(knowledgeBaseId);
    return (rows as MessageRow[]).map(mapMessage);
  }

  readModelProviderConfig() {
    const row = this.db.prepare('SELECT * FROM model_provider_settings WHERE id = ?').get('default') as ModelProviderSettingsRow | undefined;
    if (!row) return undefined;
    return {
      provider: row.provider,
      model: row.model,
      apiKey: row.api_key ?? undefined,
      enabled: Boolean(row.enabled),
      fallbackToMock: Boolean(row.fallback_to_mock),
      updatedAt: row.updated_at,
    };
  }

  writeModelProviderConfig(config: PersistedModelProviderConfig) {
    this.db.prepare(`
      INSERT INTO model_provider_settings (
        id, provider, model, api_key, enabled, fallback_to_mock, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        provider = excluded.provider,
        model = excluded.model,
        api_key = excluded.api_key,
        enabled = excluded.enabled,
        fallback_to_mock = excluded.fallback_to_mock,
        updated_at = excluded.updated_at
    `).run(
      LEGACY_MODEL_PROVIDER_SETTINGS_ID,
      config.provider ?? getDefaultPiProvider(),
      config.model ?? getDefaultPiModel(),
      config.apiKey ?? null,
      config.enabled === false ? 0 : 1,
      config.fallbackToMock === false ? 0 : 1,
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
        id, name, provider, model, api_key, enabled, fallback_to_mock, is_default, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      record.id,
      record.name,
      record.provider,
      record.model,
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
      SET name = ?, provider = ?, model = ?, api_key = ?, enabled = ?, fallback_to_mock = ?, is_default = ?, updated_at = ?
      WHERE id = ?
    `).run(
      record.name,
      record.provider,
      record.model,
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

  private migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS knowledge_bases (
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
        knowledge_base_id TEXT NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
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
        knowledge_base_id TEXT NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
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
        knowledge_base_id TEXT NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
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
        knowledge_base_id TEXT NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
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
        knowledge_base_id TEXT NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
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

      CREATE INDEX IF NOT EXISTS idx_materials_knowledge_base_id ON materials(knowledge_base_id);
      CREATE INDEX IF NOT EXISTS idx_cards_knowledge_base_id ON cards(knowledge_base_id);
      CREATE INDEX IF NOT EXISTS idx_card_revisions_card_id ON card_revisions(card_id, version);
      CREATE INDEX IF NOT EXISTS idx_exports_knowledge_base_id ON exports(knowledge_base_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at);
      CREATE INDEX IF NOT EXISTS idx_artifacts_knowledge_base_id ON artifacts(knowledge_base_id);
      CREATE INDEX IF NOT EXISTS idx_messages_knowledge_base_id ON messages(knowledge_base_id);
    `);
    this.ensureWeReadSettingsTable();
    this.ensureWeReadBookMetaTable();
    this.ensureWeReadSyncStateTable();
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
    this.ensureKnowledgeBaseNodePositionsTable();
    this.ensureArchivedColumns();
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
        knowledge_base_id TEXT NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        source_card_ids_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_entities_kb ON entities(knowledge_base_id, updated_at DESC);
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
        knowledge_base_id TEXT NOT NULL,
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
    this.seedModelProviderProfilesFromLegacy();
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

  private ensureKnowledgeBaseNodePositionsTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS knowledge_base_node_positions (
        knowledge_base_id TEXT NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
        node_id TEXT NOT NULL,
        x REAL NOT NULL,
        y REAL NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (knowledge_base_id, node_id)
      );
      CREATE INDEX IF NOT EXISTS idx_kb_node_positions_kb ON knowledge_base_node_positions(knowledge_base_id);
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
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_materials_archived ON materials(archived, knowledge_base_id);');

    const cardColumns = this.db.prepare('PRAGMA table_info(cards)').all() as Array<{ name: string }>;
    if (!cardColumns.some((column) => column.name === 'archived')) {
      this.db.exec('ALTER TABLE cards ADD COLUMN archived INTEGER NOT NULL DEFAULT 0;');
    }
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_cards_archived ON cards(archived, knowledge_base_id);');
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
             first_seen_at AS firstSeenAt, last_synced_at AS lastSyncedAt
      FROM weread_book_meta WHERE present_on_shelf = 1
      ORDER BY read_update_time DESC
    `).all() as WeReadBookMetaRow[];
  }

  readWeReadSyncState(): WeReadSyncStateRow | null {
    const row = this.db.prepare(`
      SELECT shelf_update_time AS shelfUpdateTime, total_books AS totalBooks,
             last_full_sync_at AS lastFullSyncAt, last_sync_error AS lastSyncError
      FROM weread_sync_state WHERE id = 'default'
    `).get() as WeReadSyncStateRow | undefined;
    return row ?? null;
  }

  writeWeReadSyncState(state: WeReadSyncStateRow): void {
    this.db.prepare(`
      INSERT INTO weread_sync_state (id, shelf_update_time, total_books, last_full_sync_at, last_sync_error)
      VALUES ('default', @shelfUpdateTime, @totalBooks, @lastFullSyncAt, @lastSyncError)
      ON CONFLICT(id) DO UPDATE SET
        shelf_update_time = @shelfUpdateTime,
        total_books = @totalBooks,
        last_full_sync_at = @lastFullSyncAt,
        last_sync_error = @lastSyncError
    `).run({
      shelfUpdateTime: state.shelfUpdateTime,
      totalBooks: state.totalBooks,
      lastFullSyncAt: state.lastFullSyncAt,
      lastSyncError: state.lastSyncError,
    });
  }

  updateWeReadBookMetaImport(bookId: string, materialId: string, bookmarkCount: number): void {
    this.db.prepare(`
      UPDATE weread_book_meta SET material_id = ?, bookmark_count = ?
      WHERE book_id = ?
    `).run(materialId, bookmarkCount, bookId);
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
}

function mapKnowledgeBase(row: KnowledgeBaseRow): KnowledgeBaseSummary {
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
    knowledgeBaseId: row.knowledge_base_id,
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
    knowledgeBaseId: row.knowledge_base_id,
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
  knowledge_base_id: string;
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
    knowledgeBaseId: row.knowledge_base_id,
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
  knowledge_base_id: string;
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
    knowledgeBaseId: row.knowledge_base_id,
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
  knowledge_base_id: string;
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
    knowledgeBaseId: row.knowledge_base_id,
    note: row.note,
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
    knowledgeBaseId: row.knowledge_base_id,
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
  return {
    id: row.id,
    knowledgeBaseId: row.knowledge_base_id,
    question: row.question,
    answer: row.answer,
    cardIds: JSON.parse(row.card_ids_json) as string[],
    artifactId: row.artifact_id ?? undefined,
    materialId: row.material_id ?? undefined,
    createdAt: row.created_at,
  };
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
    apiKey: row.api_key ?? undefined,
    enabled: Boolean(row.enabled),
    fallbackToMock: Boolean(row.fallback_to_mock),
    isDefault: Boolean(row.is_default),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function defaultSqlitePath() {
  return process.env.ZHIJING_DB_PATH ?? join(process.cwd(), '.data', 'zhijing.sqlite');
}

export function createMemoryKnowledgeRepository(): KnowledgeRepository {
  return new MemoryKnowledgeRepository();
}

export function createSqliteKnowledgeRepository(path = defaultSqlitePath()): KnowledgeRepository {
  return new SqliteKnowledgeRepository(path);
}

let repository: KnowledgeRepository = process.env.ZHIJING_STORAGE === 'memory'
  ? createMemoryKnowledgeRepository()
  : createSqliteKnowledgeRepository();

const parserResultCache = new Map<string, ParserCacheEntry>();
const platformParseTimestamps = new Map<string, number>();

type RuntimeModelProviderConfig = {
  provider: KnownProvider;
  model: string;
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
  const envApiKey = process.env.ZHIJING_PI_API_KEY ?? getPiEnvApiKey(provider);
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
  const envApiKey = getPiEnvApiKey(provider);
  return {
    provider,
    model: profile.model,
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

function normalizeProvider(provider: string | undefined): KnownProvider {
  if (provider && isKnownPiProvider(provider)) return provider;
  return getDefaultPiProvider();
}

function defaultModelForProvider(provider: KnownProvider) {
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
  return modelProviderConfig.apiKey ?? getPiEnvApiKey(modelProviderConfig.provider);
}

function createRuntimeFromModelProviderConfig(config: RuntimeModelProviderConfig) {
  return createPiAiRuntime({
    provider: config.provider,
    model: config.model,
    apiKey: config.apiKey ?? getPiEnvApiKey(config.provider),
    enabled: config.enabled,
    fallbackToMock: config.fallbackToMock,
  });
}

function applyModelProviderConfig() {
  piRuntime = createRuntimeFromModelProviderConfig(modelProviderConfig);
}

function modelSettingsSnapshot(): ModelProviderSettings {
  return {
    provider: modelProviderConfig.provider,
    model: modelProviderConfig.model,
    enabled: modelProviderConfig.enabled,
    fallbackToMock: modelProviderConfig.fallbackToMock,
    hasApiKey: Boolean(currentApiKey()),
    keySource: modelProviderConfig.apiKey ? modelProviderConfig.keySource : getPiEnvApiKey(modelProviderConfig.provider) ? 'env' : 'none',
    updatedAt: modelProviderConfig.updatedAt,
    providers: providerOptions(),
  };
}

export function getModelProviderSettings(): ModelProviderSettings {
  return modelSettingsSnapshot();
}

export function saveModelProviderSettings(input: SaveModelProviderSettingsRequest): ModelProviderSettings {
  const provider = normalizeProvider(input.provider);
  const availableModels = getKnownPiModels(provider);
  const model = availableModels.some((item) => item.id === input.model)
    ? input.model
    : defaultModelForProvider(provider);
  const profiles = repository.listModelProviderProfiles();
  const activeProfile = profiles.find((record) => record.isDefault) ?? profiles[0];
  const providerScopedExistingKey = activeProfile && activeProfile.provider === provider
    ? activeProfile.apiKey
    : undefined;
  const inputApiKey = normalizeSecret(input.apiKey);
  const envApiKey = getPiEnvApiKey(provider);
  const apiKey = input.clearApiKey
    ? undefined
    : inputApiKey ?? providerScopedExistingKey;

  modelProviderConfig = {
    provider,
    model,
    apiKey,
    enabled: input.enabled ?? Boolean(apiKey ?? envApiKey),
    fallbackToMock: input.fallbackToMock ?? true,
    keySource: apiKey ? 'runtime' : envApiKey ? 'env' : 'none',
    updatedAt: now(),
  };
  if (activeProfile) {
    const syncedProfile: ModelProviderProfileRecord = {
      ...activeProfile,
      provider,
      model,
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
  const envApiKey = getPiEnvApiKey(provider);
  const hasApiKey = Boolean(record.apiKey ?? envApiKey);
  const keySource = record.apiKey ? 'runtime' : envApiKey ? 'env' : 'none';
  return {
    id: record.id,
    name: record.name,
    provider: record.provider,
    model: record.model,
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
  const availableModels = getKnownPiModels(provider);
  const model = availableModels.some((item) => item.id === input.model)
    ? input.model
    : defaultModelForProvider(provider);
  const apiKey = normalizeSecret(input.apiKey);
  const envApiKey = getPiEnvApiKey(provider);
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
    apiKey,
    enabled: input.enabled ?? Boolean(apiKey ?? envApiKey),
    fallbackToMock: input.fallbackToMock ?? true,
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
  const availableModels = getKnownPiModels(provider);
  const model = input.model !== undefined
    ? (availableModels.some((item) => item.id === input.model) ? input.model : defaultModelForProvider(provider))
    : existing.model;
  const apiKey = input.clearApiKey
    ? undefined
    : (input.apiKey !== undefined ? normalizeSecret(input.apiKey) : existing.apiKey);
  const enabled = input.enabled ?? existing.enabled;
  const fallbackToMock = input.fallbackToMock ?? existing.fallbackToMock;
  const updatedAt = now();
  const updated: ModelProviderProfileRecord = {
    ...existing,
    name,
    provider,
    model,
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

export async function testModelProviderSettings(input: TestModelProviderSettingsRequest = {}): Promise<ModelProviderTestResult> {
  const provider = normalizeProvider(input.provider ?? modelProviderConfig.provider);
  const requestedModel = input.model ?? modelProviderConfig.model;
  const model = getKnownPiModels(provider).some((item) => item.id === requestedModel)
    ? requestedModel
    : defaultModelForProvider(provider);
  const apiKey = input.apiKey?.trim() || currentApiKey();

  if (!apiKey) {
    return {
      ok: false,
      provider,
      model,
      message: '请先填写 Provider API Key。',
    };
  }

  try {
    const runtime = createPiAiRuntime({
      provider,
      model,
      apiKey,
      enabled: true,
      fallbackToMock: false,
      maxTokens: 700,
    });
    const result = await runtime.completeStructured<{ cards: { title: string }[] }, TSchema>({
      task: 'knowledge_cards',
      prompt: '用中文生成一张用于验证模型设置的知识卡片，主题是「知径模型设置」。',
      schema: structuredSchemas.knowledge_cards as TSchema,
      context: {
        verification: true,
        expectedLanguage: 'zh-CN',
      },
    });
    return {
      ok: true,
      provider,
      model,
      message: '模型连接正常，已返回真实结构化 JSON。',
      sampleTitle: result.output.cards[0]?.title,
      usage: result.usage,
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

function compactTitle(input: string) {
  const cleaned = input.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '未命名知识库';
  return cleaned.length > 32 ? `${cleaned.slice(0, 32)}...` : cleaned;
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

function createKnowledgeBase(title: string, summary: string): KnowledgeBaseSummary {
  const timestamp = now();
  const base: KnowledgeBaseSummary = {
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
  repository.insertKnowledgeBase(base);
  return base;
}

function upsertDefaultKnowledgeBase(input: string) {
  const bases = repository.listKnowledgeBases();
  if (bases.length > 0) return bases[0];
  return createKnowledgeBase(compactTitle(input), `围绕「${compactTitle(input)}」生成的知识库骨架。`);
}

/**
 * 显式创建空知识库，不触发 LLM 生成。
 * 用户可通过模态输入标题和可选摘要，后续再导入资料或运行 Kit。
 */
export function createEmptyKnowledgeBase(title: string, summary?: string): KnowledgeBaseSummary {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    throw new KnowledgeCoreError('知识库标题不能为空。', 400);
  }
  const finalSummary = (summary?.trim()) || `围绕「${trimmedTitle}」的知识库，等待导入资料。`;
  return createKnowledgeBase(compactTitle(trimmedTitle), finalSummary);
}

function createMaterial(base: KnowledgeBaseSummary, request: IntakeRequest, type: MaterialRecord['type']) {
  const timestamp = now();
  const platform = detectPlatform(request.input);
  const sourceUrl = type === 'link' ? extractFirstUrl(request.input) ?? request.input.trim() : undefined;
  const initialStatus: ParseStatus = type === 'link' ? 'saved' : 'ingested';
  const timeline: MaterialStatusTimeline = { capturedAt: timestamp };
  if (initialStatus === 'ingested') timeline.ingestedAt = timestamp;
  const material: MaterialRecord = {
    id: id('mat'),
    knowledgeBaseId: base.id,
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
  repository.updateKnowledgeBase(base);
  return material;
}

function extractMaterialTitle(input: string) {
  const lines = input.trim().split('\n').map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return compactTitle(input);
  const firstLine = lines[0].replace(/^#+\s*/, '').trim();
  return compactTitle(firstLine || input);
}

function createCards(
  base: KnowledgeBaseSummary,
  material: MaterialRecord | undefined,
  seed: string,
  generatedCards: GeneratedCard[] | undefined,
) {
  const timestamp = now();
  const sourceStatus = material && material.type !== 'question' && material.parseStatus === 'ingested' ? 'sourced' : 'ai_skeleton';
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
      title: '下一步要回答的问题',
      body: '这个主题还需要补充哪些高质量来源、案例和可验证证据？',
    },
  ];
  const cards: KnowledgeCard[] = (generated.length ? generated : fallbackCards).map((card) => ({
      id: id('card'),
      knowledgeBaseId: base.id,
      materialId: material?.id,
      type: normalizeCardType(card.type),
      title: compactTitle(card.title ?? `${compactTitle(seed)} 的知识卡片`),
      body: card.body?.trim() || '这张知识卡片还需要补充内容。',
      claimStatus: sourceStatus,
      createdAt: timestamp,
      updatedAt: timestamp,
  }));
  base.cardCount += cards.length;
  const existingCards = repository.listCards(base.id);
  const sourcedCount = [...existingCards, ...cards].filter((card) => card.claimStatus === 'sourced').length;
  base.sourcedRatio = base.cardCount > 0 ? sourcedCount / base.cardCount : 0;
  base.updatedAt = timestamp;
  repository.insertCards(cards);
  repository.updateKnowledgeBase(base);
  return cards;
}

function createArtifact(
  base: KnowledgeBaseSummary,
  material: MaterialRecord | undefined,
  seed: string,
  generated: GeneratedKnowledgeOutput,
) {
  const timestamp = now();
  const sourceMaterialIds = material && material.type !== 'question' ? [material.id] : [];
  const artifact: ArtifactRecord = {
    id: id('art'),
    knowledgeBaseId: base.id,
    artifactType: 'summary',
    subtype: 'summary',
    title: compactTitle(generated.artifactTitle ?? `${compactTitle(seed)} 摘要`),
    body: generated.artifactBody ?? generated.summary ?? (material
      ? `已保存资料「${material.title}」，并生成可继续整理的摘要占位。`
      : `已创建「${base.title}」主题骨架，下一步可以继续导入来源资料。`),
    sourceMaterialIds,
    createdAt: timestamp,
  };
  repository.insertArtifact(artifact);
  return artifact;
}

function createKitArtifact(
  base: KnowledgeBaseSummary,
  kitId: KnowledgeKitId,
  sourceMaterialIds: string[],
  generated: GeneratedKnowledgeOutput,
) {
  const timestamp = now();
  const artifact: ArtifactRecord = {
    id: id('art'),
    knowledgeBaseId: base.id,
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
  repository.updateKnowledgeBase(base);
  return artifact;
}

function kitLabel(kitId: KnowledgeKitId) {
  if (kitId === 'content_creation') return '内容创作产物';
  if (kitId === 'product_research') return '产品调研产物';
  if (kitId === 'topic_decomposition') return '知识拆解清单';
  return '学习研究摘要';
}

function buildFallbackKitBody(base: KnowledgeBaseSummary, kitId: KnowledgeKitId) {
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
    .filter((card) => card.title?.trim() || card.body?.trim())
    .slice(0, 6);
}

function normalizeCardType(type: GeneratedCard['type']): KnowledgeCard['type'] {
  const allowed = new Set<KnowledgeCard['type']>(['concept', 'method', 'case', 'question', 'step', 'viewpoint']);
  return type && allowed.has(type) ? type : 'concept';
}

async function generateKnowledge(
  task: 'knowledge_base_skeleton' | 'material_summary' | 'knowledge_cards' | 'question_answer',
  prompt: string,
  context: Record<string, unknown>,
) {
  const schema = structuredSchemas[task] as TSchema;
  return piRuntime.completeStructured<GeneratedKnowledgeOutput, TSchema>({
    task,
    prompt,
    schema,
    context,
  });
}

export async function intakeKnowledge(request: IntakeRequest): Promise<IntakeResult> {
  const value = request.input.trim();
  if (!value) {
    throw new Error('Input is required.');
  }

  const kind = classifyInput(value);
  const workflow = kind === 'question' ? 'answer_question' : kind === 'theme' ? 'create_knowledge_base' : 'ingest_material';
  const task = createTask(workflow, { input: value, knowledgeBaseId: request.knowledgeBaseId });

  try {
    let base: KnowledgeBaseSummary | undefined;
    let material: MaterialRecord | undefined;
    if (kind !== 'theme') {
      base = (request.knowledgeBaseId ? repository.findKnowledgeBase(request.knowledgeBaseId) : undefined) ?? upsertDefaultKnowledgeBase(value);
      material = createMaterial(base, request, kind === 'link' ? 'link' : kind === 'question' ? 'question' : 'text');
    }

    if (kind === 'link' && base && material) {
      if (material.platform === 'xiaohongshu') {
        try {
          const parseResult = await requestMaterialParsing(material.id);
          finishTask(task, {
            kind,
            knowledgeBaseId: base.id,
            materialId: parseResult.material.id,
            parseStatus: parseResult.material.parseStatus,
            platform: parseResult.material.platform,
            sourceUrl: parseResult.material.sourceUrl,
          });
          return {
            kind,
            knowledgeBase: parseResult.knowledgeBase ?? base,
            material: parseResult.material,
            cards: parseResult.cards ?? [],
            task: parseResult.task ?? task,
            artifact: parseResult.artifact,
            message: parseResult.message ?? '小红书链接已自动解析。',
          };
        } catch {
          finishTask(task, {
            kind,
            knowledgeBaseId: base.id,
            materialId: material.id,
            parseStatus: material.parseStatus,
            platform: material.platform,
            sourceUrl: material.sourceUrl,
          });
          return {
            kind,
            knowledgeBase: base,
            material,
            cards: [],
            task,
            message: '链接已保存，自动解析失败，可稍后手动重试。',
          };
        }
      }

      finishTask(task, {
        kind,
        knowledgeBaseId: base.id,
        materialId: material.id,
        parseStatus: material.parseStatus,
        platform: material.platform,
        sourceUrl: material.sourceUrl,
      });

      return {
        kind,
        knowledgeBase: base,
        material,
        cards: [],
        task,
        message: '链接已保存，等待正文补充或后续解析。',
      };
    }

    const generation = await generateKnowledge(
      kind === 'theme' ? 'knowledge_base_skeleton' : kind === 'question' ? 'question_answer' : 'material_summary',
      value,
      {
        kind,
        knowledgeBaseId: base?.id,
        materialId: material?.id,
        hasSourceMaterial: Boolean(material),
        parseStatus: material?.parseStatus,
      },
    );
    const generated = generation.output;

    const knowledgeBase = base ?? createKnowledgeBase(
      compactTitle(generated.title ?? value),
      generated.summary ?? `围绕「${compactTitle(value)}」生成的知识库骨架。`,
    );

    const cards = createCards(knowledgeBase, material, value, generated.cards);
    const artifact = createArtifact(knowledgeBase, material, value, generated);

    if (kind !== 'theme' && generated.summary) {
      knowledgeBase.summary = generated.summary;
      repository.updateKnowledgeBase(knowledgeBase);
    }

    finishTask(task, {
      kind,
      knowledgeBaseId: knowledgeBase.id,
      materialId: material?.id,
      cardIds: cards.map((card) => card.id),
      artifactId: artifact.id,
      generationProvider: generation.provider,
      generationModel: generation.model,
      generationFallbackReason: generation.fallbackReason,
    });

    return {
      kind,
      knowledgeBase,
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

export async function answerKnowledgeBaseQuestion(knowledgeBaseId: string, question: string): Promise<IntakeResult> {
  const value = question.trim();
  if (!value) {
    throw new KnowledgeCoreError('Question is required.', 400);
  }

  const base = repository.findKnowledgeBase(knowledgeBaseId);
  if (!base) {
    throw new KnowledgeCoreError('Knowledge base not found.', 404);
  }

  const task = createTask('answer_question', { input: value, knowledgeBaseId });

  try {
    const material = createMaterial(base, { input: value, knowledgeBaseId }, 'question');
    const generationContext = buildQuestionContext(base.id, material.id);
    const generation = await generateKnowledge('question_answer', value, {
      kind: 'question',
      knowledgeBaseId: base.id,
      materialId: material.id,
      hasSourceMaterial: generationContext.materials.length > 0,
      parseStatus: material.parseStatus,
      ...generationContext,
    });
    const generated = generation.output;
    const citations = buildQuestionCitations(generationContext);
    const cards = createCards(base, material, value, generated.cards);
    const artifact = createArtifact(base, material, value, generated);

    finishTask(task, {
      kind: 'question',
      knowledgeBaseId: base.id,
      materialId: material.id,
      cardIds: cards.map((card) => card.id),
      artifactId: artifact.id,
      generationProvider: generation.provider,
      generationModel: generation.model,
      generationFallbackReason: generation.fallbackReason,
      contextMaterialCount: generationContext.materials.length,
      contextCardCount: generationContext.cards.length,
      citationCount: citations.length,
    });

    repository.insertMessage({
      id: id('msg'),
      knowledgeBaseId: base.id,
      question: value,
      answer: generated.summary ?? artifact.body,
      cardIds: cards.map((card) => card.id),
      artifactId: artifact.id,
      materialId: material.id,
      createdAt: now(),
    });

    return {
      kind: 'question',
      knowledgeBase: base,
      material,
      cards,
      task,
      artifact,
      citations,
      message: '问题已基于当前知识库生成回答线索。',
    };
  } catch (error) {
    failTask(task, error);
    throw error;
  }
}

export async function runKnowledgeKit(
  knowledgeBaseId: string,
  kitId: KnowledgeKitId = 'learning_research',
): Promise<KnowledgeKitRunResult> {
  const base = repository.findKnowledgeBase(knowledgeBaseId);
  if (!base) {
    throw new KnowledgeCoreError('Knowledge base not found.', 404);
  }

  const task = createTask('run_kit', { knowledgeBaseId, kitId });

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
      knowledgeBaseId: base.id,
      knowledgeBaseTitle: base.title,
      knowledgeBaseSummary: base.summary,
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
      knowledgeBaseId: base.id,
      artifactId: artifact.id,
      sourceMaterialCount: context.materials.length,
      cardCount: context.cards.length,
      generationProvider: generation.provider,
      generationModel: generation.model,
      generationFallbackReason: generation.fallbackReason,
    });

    return {
      knowledgeBase: base,
      artifact,
      task,
      message: `${kitLabel(kitId)}已生成。`,
    };
  } catch (error) {
    failTask(task, error);
    throw error;
  }
}

export function assignMaterialToKnowledgeBase(
  materialId: string,
  input: AssignMaterialRequest,
): MaterialAssignmentResult {
  const material = requireMaterial(materialId);
  const previousKnowledgeBaseId = material.knowledgeBaseId;
  const targetBase = resolveMaterialAssignmentTarget(input, material);

  material.knowledgeBaseId = targetBase.id;
  repository.updateMaterial(material);
  moveMaterialAssets(material.id, previousKnowledgeBaseId, targetBase.id);
  reconcileKnowledgeBaseStats(previousKnowledgeBaseId);
  const knowledgeBase = reconcileKnowledgeBaseStats(targetBase.id) ?? targetBase;

  return {
    material,
    knowledgeBase,
    previousKnowledgeBaseId,
    message: previousKnowledgeBaseId === targetBase.id
      ? '资料已在当前知识库中。'
      : `资料已移动到「${knowledgeBase.title}」。`,
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
  const scored = repository.listKnowledgeBases()
    .map((base) => scoreKnowledgeBaseSuggestion(base, material, terms))
    .filter((suggestion) => suggestion.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 4);
  const currentBase = repository.findKnowledgeBase(material.knowledgeBaseId);
  const currentSuggestion: MaterialAssignmentSuggestion[] = currentBase && !scored.some((item) => item.knowledgeBaseId === currentBase.id)
    ? [{
        knowledgeBaseId: currentBase.id,
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

function scoreKnowledgeBaseSuggestion(
  base: KnowledgeBaseSummary,
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
  if (material.knowledgeBaseId === base.id) score += 3;
  const matched = [...terms].filter((term) => baseTerms.has(term)).slice(0, 3);
  return {
    knowledgeBaseId: base.id,
    title: base.title,
    score,
    reason: matched.length
      ? `匹配关键词：${matched.join('、')}`
      : material.knowledgeBaseId === base.id
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
  const knowledgeBase = repository.findKnowledgeBase(material.knowledgeBaseId);
  if (!knowledgeBase) {
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
  reconcileKnowledgeBaseStats(material.knowledgeBaseId);

  if (!markIngested) {
    return {
      material,
      knowledgeBase: repository.findKnowledgeBase(material.knowledgeBaseId) ?? knowledgeBase,
      message: '资料补充已保存，仍保留为待复核状态。',
    };
  }

  const task = createTask('parse_material', {
    materialId: material.id,
    knowledgeBaseId: material.knowledgeBaseId,
    source: 'manual_review',
    previousParseStatus: 'needs_review',
  });

  try {
    const generation = await generateKnowledge('material_summary', contentForGeneration, {
      kind: 'manual_review',
      knowledgeBaseId: material.knowledgeBaseId,
      materialId: material.id,
      hasSourceMaterial: true,
      parseStatus: material.parseStatus,
      sourceUrl: material.sourceUrl,
      mediaUrls: material.mediaUrls,
      mediaCount: material.mediaUrls.length,
    });
    const base = repository.findKnowledgeBase(material.knowledgeBaseId) ?? knowledgeBase;
    const cards = createCards(base, material, contentForGeneration, generation.output.cards);
    const artifact = createArtifact(base, material, contentForGeneration, generation.output);
    const reconciledBase = reconcileKnowledgeBaseStats(base.id) ?? base;

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
      knowledgeBase: reconciledBase,
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
  const targetId = normalizeSecret(input.knowledgeBaseId);
  if (targetId) {
    const target = repository.findKnowledgeBase(targetId);
    if (!target) {
      throw new KnowledgeCoreError('Target knowledge base not found.', 404);
    }
    return target;
  }

  const title = normalizeSecret(input.newKnowledgeBaseTitle);
  if (title) {
    return createKnowledgeBase(compactTitle(title), `由资料「${material.title}」新建的知识库。`);
  }

  throw new KnowledgeCoreError('Target knowledge base or new title is required.', 400);
}

function moveMaterialAssets(materialId: string, previousKnowledgeBaseId: string, nextKnowledgeBaseId: string) {
  if (previousKnowledgeBaseId === nextKnowledgeBaseId) return;
  const movedCardIds = new Set<string>();
  for (const card of repository.listCards(previousKnowledgeBaseId)) {
    if (card.materialId !== materialId) continue;
    card.knowledgeBaseId = nextKnowledgeBaseId;
    card.updatedAt = now();
    repository.updateCard(card);
    movedCardIds.add(card.id);
  }
  for (const artifact of repository.listArtifacts(previousKnowledgeBaseId)) {
    if (!artifact.sourceMaterialIds.includes(materialId)) continue;
    artifact.knowledgeBaseId = nextKnowledgeBaseId;
    repository.updateArtifact(artifact);
  }
  for (const entity of repository.listEntities(previousKnowledgeBaseId)) {
    if (!entity.sourceCardIds.some((id) => movedCardIds.has(id))) continue;
    repository.deleteEntity(entity.id);
  }
}

function reconcileKnowledgeBaseStats(knowledgeBaseId: string) {
  const base = repository.findKnowledgeBase(knowledgeBaseId);
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
  repository.updateKnowledgeBase(base);
  return base;
}

export function deleteMaterial(materialId: string): { materialId: string; knowledgeBaseId: string } {
  const material = repository.findMaterial(materialId);
  if (!material) {
    throw new KnowledgeCoreError('Material not found.', 404);
  }
  const knowledgeBaseId = material.knowledgeBaseId;
  for (const artifact of repository.listArtifacts()) {
    if (!artifact.sourceMaterialIds.includes(materialId)) continue;
    artifact.sourceMaterialIds = artifact.sourceMaterialIds.filter((id) => id !== materialId);
    repository.updateArtifact(artifact);
  }
  repository.deleteMaterial(materialId);
  reconcileKnowledgeBaseStats(knowledgeBaseId);
  return { materialId, knowledgeBaseId };
}

function normalizeMediaUrls(values: string[]) {
  return uniqueStrings(values
    .flatMap((value) => value.split(/\s+/))
    .map((value) => value.trim())
    .filter((value) => /^https?:\/\//i.test(value)));
}

function buildKitContext(knowledgeBaseId: string) {
  const materials = repository.listMaterials(knowledgeBaseId)
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
  const cards = repository.listCards(knowledgeBaseId)
    .slice(0, 16)
    .map((card) => ({
      id: card.id,
      type: card.type,
      title: card.title,
      bodyPreview: compactPreview(card.body),
      claimStatus: card.claimStatus,
    }));
  const artifacts = repository.listArtifacts(knowledgeBaseId, 4)
    .map((artifact) => ({
      id: artifact.id,
      type: artifact.artifactType,
      title: artifact.title,
      bodyPreview: compactPreview(artifact.body),
    }));
  return { materials, cards, artifacts };
}

function buildQuestionContext(knowledgeBaseId: string, questionMaterialId: string) {
  const materials = repository.listMaterials(knowledgeBaseId)
    .filter((material) => material.id !== questionMaterialId)
    .slice(0, 8)
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
  const cards = repository.listCards(knowledgeBaseId)
    .slice(0, 8)
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

function compactPreview(input: string) {
  const cleaned = input.replace(/\s+/g, ' ').trim();
  return cleaned.length > 160 ? `${cleaned.slice(0, 160)}...` : cleaned;
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
      touchKnowledgeBase(material.knowledgeBaseId);
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
        knowledgeBaseId: material.knowledgeBaseId,
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
        knowledgeBaseId: material.knowledgeBaseId,
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
        knowledgeBaseId: material.knowledgeBaseId,
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
    touchKnowledgeBase(material.knowledgeBaseId);
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
  touchKnowledgeBase(material.knowledgeBaseId);

  const retry = previousStatus === 'failed' || previousStatus === 'needs_review';
  const task = createTask(
    'parse_material',
    {
      materialId: material.id,
      knowledgeBaseId: material.knowledgeBaseId,
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

  const base = repository.findKnowledgeBase(material.knowledgeBaseId);
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
      knowledgeBaseId: base.id,
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
    knowledgeBase: base,
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
      touchKnowledgeBase(material.knowledgeBaseId);
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
  touchKnowledgeBase(material.knowledgeBaseId);

  const retry = previousStatus === 'failed' || previousStatus === 'needs_review';
  const task = createTask(
    'parse_material',
    {
      materialId: material.id,
      knowledgeBaseId: material.knowledgeBaseId,
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
      knowledgeBaseId: material.knowledgeBaseId,
      sourceUrl: material.sourceUrl,
      platform: material.platform,
      previousParseStatus: material.parseStatus,
    },
  );
  const parseError = cleanParseError(errorMessage);

  stampMaterialStatus(material, 'failed');
  material.parseError = parseError;
  repository.updateMaterial(material);
  touchKnowledgeBase(material.knowledgeBaseId);

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
  return material.platform === 'xiaohongshu' || material.platform === 'web' || material.platform === undefined;
}

async function parseOrdinaryWebMaterial(material: MaterialRecord): Promise<ParsedMaterialContent> {
  const sourceUrl = material.sourceUrl;
  if (!sourceUrl) {
    throw new KnowledgeCoreError('Material source URL is required for parsing.', 400);
  }

  const url = new URL(sourceUrl);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new KnowledgeCoreError('Only http and https URLs can be parsed.', 400);
  }

  const jinaParsed = await tryParseWithJinaReader(sourceUrl);
  if (jinaParsed) return jinaParsed;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8',
        'user-agent': 'ZhijingBot/0.1 (+https://local.zhijing.app)',
      },
    });
    if (!response.ok) {
      throw new Error(`Web parser received HTTP ${response.status}.`);
    }

    const contentType = response.headers.get('content-type') ?? '';
    const raw = await response.text();
    const limited = raw.slice(0, 500_000);
    const parsed = contentType.includes('text/plain')
      ? { title: titleFromLink(sourceUrl), text: cleanText(decodeHtmlEntities(limited)) }
      : extractReadableText(limited, titleFromLink(sourceUrl));

    if (parsed.text.length < 120) {
      throw new Error('Parsed web content is too short for a reliable summary.');
    }

    return {
      title: parsed.title,
      text: parsed.text.slice(0, 18_000),
      mediaUrls: [],
    };
  } finally {
    clearTimeout(timer);
  }
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

async function tryParseXiaohongshuPublicPage(sourceUrl: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
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
    return [videoUrls[0]];
  }
  const imageUrls = arrayValue(note.imageList).flatMap(xiaohongshuImageUrls);
  return imageUrls.length ? uniqueStrings(imageUrls) : uniqueStrings(collectMediaUrls(note));
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

async function tryParseWithJinaReader(sourceUrl: string) {
  const readerUrl = `${jinaReaderBaseUrl()}${sourceUrl}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const headers: Record<string, string> = {
      accept: 'text/plain;charset=utf-8',
    };
    if (process.env.JINA_API_KEY) {
      headers.authorization = `Bearer ${process.env.JINA_API_KEY}`;
    }

    const response = await fetch(readerUrl, {
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
  touchKnowledgeBase(material.knowledgeBaseId);

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

function touchKnowledgeBase(knowledgeBaseId: string) {
  const base = repository.findKnowledgeBase(knowledgeBaseId);
  if (!base) return;
  base.updatedAt = now();
  repository.updateKnowledgeBase(base);
}

const execFileAsync = promisify(execFile);

const WHISPER_COMMAND_CANDIDATES = ['whisper', 'whisper-cli', 'whisper.cpp'];
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
 * 查找可用的本地 whisper 命令
 * @author fxbin
 */
async function findWhisperCommand(): Promise<string | undefined> {
  for (const command of WHISPER_COMMAND_CANDIDATES) {
    if (await commandExists(command)) {
      return command;
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
 * @author fxbin
 */
export async function getTranscriptionCapabilityReport(): Promise<TranscriptionCapabilityReport> {
  if (cachedTranscriptionCapability) {
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
    await execFileAsync('ffmpeg', [
      '-y',
      '-i',
      videoUrl,
      '-vn',
      '-acodec',
      'pcm_s16le',
      '-ar',
      AUDIO_SAMPLE_RATE,
      '-ac',
      MONO_CHANNELS,
      audioPath,
    ]);

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

export function listKnowledgeBases() {
  return repository.listKnowledgeBases();
}

type ListMaterialsOptions = {
  knowledgeBaseId?: string;
  type?: MaterialRecord['type'];
  status?: MaterialRecord['parseStatus'];
  query?: string;
  limit?: number;
};

type KnowledgeSearchResult = {
  id: string;
  kind: 'knowledge_base' | 'material' | 'card' | 'artifact';
  title: string;
  preview: string;
  knowledgeBaseId?: string;
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

export function listMaterials(options: ListMaterialsOptions = {}) {
  const query = options.query?.trim().toLowerCase();
  const materials = repository.listMaterials(options.knowledgeBaseId);
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
  const results: KnowledgeSearchResult[] = [];

  for (const base of repository.listKnowledgeBases()) {
    const match = scoreSearchText(terms, base.title, base.summary);
    addSearchResult(results, {
      id: base.id,
      kind: 'knowledge_base',
      title: base.title,
      preview: base.summary,
      knowledgeBaseId: base.id,
      metadata: withSearchMetadata(match, {
        stage: base.stage,
        sourceCount: base.sourceCount,
        cardCount: base.cardCount,
      }),
      score: match.score,
    });
  }

  for (const material of repository.listMaterials()) {
    const match = scoreSearchText(
      terms,
      material.title,
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
      knowledgeBaseId: material.knowledgeBaseId,
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
    const match = scoreSearchText(terms, card.title, card.body, card.type, card.claimStatus);
    addSearchResult(results, {
      id: card.id,
      kind: 'card',
      title: card.title,
      preview: compactPreview(card.body),
      knowledgeBaseId: card.knowledgeBaseId,
      metadata: withSearchMetadata(match, {
        type: card.type,
        claimStatus: card.claimStatus,
      }),
      score: match.score,
    });
  }

  for (const artifact of repository.listArtifacts()) {
    const match = scoreSearchText(terms, artifact.title, artifact.body, artifact.artifactType);
    addSearchResult(results, {
      id: artifact.id,
      kind: 'artifact',
      title: artifact.title,
      preview: compactPreview(artifact.body),
      knowledgeBaseId: artifact.knowledgeBaseId,
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
    addSearchTerm(terms, term, 1, false);
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

export function getKnowledgeBase(id: string): KnowledgeBaseDetail | undefined {
  const base = repository.findKnowledgeBase(id);
  if (!base) return undefined;
  return {
    ...base,
    materials: repository.listMaterials(id),
    cards: repository.listCards(id),
    artifacts: repository.listArtifacts(id),
  };
}

export function listMessages(knowledgeBaseId: string, limit?: number): ChatMessage[] {
  return repository.listMessages(knowledgeBaseId, limit);
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

export function recordExport(knowledgeBaseId: string, summary: ExportSummary): ExportRecord {
  const record: ExportRecord = {
    id: `export_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    knowledgeBaseId,
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

export function listExports(knowledgeBaseId: string): ExportRecord[] {
  return repository.listExportRecords(knowledgeBaseId);
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
export async function extractEntities(knowledgeBaseId: string, piRuntime?: PiRuntime): Promise<Entity[]> {
  const base = repository.findKnowledgeBase(knowledgeBaseId);
  if (!base) {
    throw new KnowledgeCoreError(`Knowledge base ${knowledgeBaseId} not found.`, 404);
  }
  const cards = repository.listCards(knowledgeBaseId);
  if (cards.length === 0) {
    throw new KnowledgeCoreError('当前知识库没有卡片，无法提取实体。', 400);
  }
  const cardDigest = cards.slice(0, 40).map((card) => `- ${card.title}: ${card.body.slice(0, 120)}`).join('\n');
  const prompt = `请从以下知识库卡片中提取关键实体（人物、组织、概念、工具、地点、事件等）。\n知识库主题：${base.title}\n卡片摘要：\n${cardDigest}`;
  const runtime = piRuntime ?? createMockPiRuntime();
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
  const existing = repository.listEntities(knowledgeBaseId);
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
        knowledgeBaseId,
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

export function listEntities(knowledgeBaseId: string): Entity[] {
  return repository.listEntities(knowledgeBaseId);
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
        knowledgeBaseId: card.knowledgeBaseId,
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
        knowledgeBaseId: material.knowledgeBaseId,
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
  const knowledgeBaseId = request.kind === 'duplicate_card'
    ? resolveCardConflict(request.keepId, request.dropIds)
    : resolveMaterialConflict(request.keepId, request.dropIds);
  const entry: ConflictAuditEntry = {
    id: id(CONFLICT_ID_PREFIX),
    kind: request.kind,
    action: 'merge',
    keepId: request.keepId,
    dropIds: [...request.dropIds],
    knowledgeBaseId,
    note: `合并 ${request.dropIds.length} 个重复${request.kind === 'duplicate_card' ? '卡片' : '资料'}到保留项。`,
    createdAt: new Date().toISOString(),
  };
  repository.insertConflictAudit(entry);
  reconcileKnowledgeBaseStats(knowledgeBaseId);
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
  return keepCard.knowledgeBaseId;
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
  return keepMaterial.knowledgeBaseId;
}

/**
 * 返回最近的冲突解决审计记录，按时间倒序。
 */
export function listConflictAuditEntries(limit?: number): ConflictAuditEntry[] {
  return repository.listConflictAudit(limit ?? CONFLICT_AUDIT_LIMIT);
}

const SYNTHESIS_OVERLAP_LIMIT = 12;
const SYNTHESIS_CARD_DIGEST_LIMIT = 30;
const SYNTHESIS_ARTIFACT_TYPE = 'research_report' as const;

/**
 * 跨库综合生成：取两个知识库的卡片，构造综合 prompt，
 * 通过 pi-runtime 生成跨库研究摘要，持久化为 research_report 产物。
 */
export async function generateCrossKbSynthesis(leftKbId: string, rightKbId: string): Promise<{ artifact: ArtifactRecord; overlapKeywords: string[] }> {
  if (leftKbId === rightKbId) {
    throw new KnowledgeCoreError('跨库综合需要两个不同的知识库。', 400);
  }
  const leftBase = repository.findKnowledgeBase(leftKbId);
  if (!leftBase) {
    throw new KnowledgeCoreError(`Knowledge base ${leftKbId} not found.`, 404);
  }
  const rightBase = repository.findKnowledgeBase(rightKbId);
  if (!rightBase) {
    throw new KnowledgeCoreError(`Knowledge base ${rightKbId} not found.`, 404);
  }
  const leftCards = repository.listCards(leftKbId);
  const rightCards = repository.listCards(rightKbId);
  if (leftCards.length === 0 && rightCards.length === 0) {
    throw new KnowledgeCoreError('两个知识库都没有卡片，无法进行跨库综合。', 400);
  }
  const overlapKeywords = computeOverlapKeywords(leftCards, rightCards);
  const leftDigest = leftCards.slice(0, SYNTHESIS_CARD_DIGEST_LIMIT).map((card) => `- ${card.title}`).join('\n');
  const rightDigest = rightCards.slice(0, SYNTHESIS_CARD_DIGEST_LIMIT).map((card) => `- ${card.title}`).join('\n');
  const prompt = [
    `请基于以下两个知识库执行跨库综合分析。`,
    `左库「${leftBase.title}」核心卡片：\n${leftDigest || '（暂无卡片）'}`,
    `右库「${rightBase.title}」核心卡片：\n${rightDigest || '（暂无卡片）'}`,
    `已知重叠关键词：${overlapKeywords.length > 0 ? overlapKeywords.join('、') : '暂无明显重叠'}`,
    `请输出：共同概念、分歧观点、证据来源对比、可行动的下一步研究问题。`,
  ].join('\n');
  const runtime = createMockPiRuntime();
  const result = await runtime.completeStructured<{ summary: string }>({
    task: 'question_answer',
    prompt,
    schema: questionAnswerSchema,
  });
  const summary = result.output.summary ?? `「${leftBase.title}」与「${rightBase.title}」的跨库综合已生成占位摘要。`;
  const now = new Date().toISOString();
  const artifact: ArtifactRecord = {
    id: id('art'),
    knowledgeBaseId: leftKbId,
    artifactType: SYNTHESIS_ARTIFACT_TYPE,
    subtype: 'summary',
    title: `跨库综合：${leftBase.title} × ${rightBase.title}`,
    body: [
      `## 综合摘要\n${summary}`,
      `\n## 重叠关键词\n${overlapKeywords.length > 0 ? overlapKeywords.join('、') : '两个知识库暂无明显关键词重叠。'}`,
      `\n## 左库「${leftBase.title}」\n共 ${leftCards.length} 张卡片参与综合。`,
      `\n## 右库「${rightBase.title}」\n共 ${rightCards.length} 张卡片参与综合。`,
    ].join('\n'),
    sourceMaterialIds: [],
    createdAt: now,
  };
  repository.insertArtifact(artifact);
  return { artifact, overlapKeywords };
}

function computeOverlapKeywords(leftCards: KnowledgeCard[], rightCards: KnowledgeCard[]): string[] {
  const tokenize = (cards: KnowledgeCard[]) => {
    const tokens = new Set<string>();
    for (const card of cards) {
      for (const token of card.title.split(/[\s,，、。./]+/).filter((item) => item.length >= 2)) {
        tokens.add(token.toLowerCase());
      }
    }
    return tokens;
  };
  const leftTokens = tokenize(leftCards);
  const rightTokens = tokenize(rightCards);
  const overlap: string[] = [];
  for (const token of leftTokens) {
    if (rightTokens.has(token)) overlap.push(token);
  }
  return overlap.slice(0, SYNTHESIS_OVERLAP_LIMIT);
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

export function listDueCards(knowledgeBaseId: string, limit?: number): KnowledgeCard[] {
  const now = new Date().toISOString();
  const all = repository.listCards(knowledgeBaseId);
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
  const base = repository.findKnowledgeBase(id);
  if (!base) return undefined;

  const materials = repository.listMaterials(id);
  const cards = repository.listCards(id);
  const materialNodes = materials.slice(0, 18).map((material) => ({
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
  const cardNodes = cards.slice(0, 28).map((card) => ({
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
      id: `knowledge_base:${base.id}`,
      kind: 'knowledge_base' as const,
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
  const edges = [
    ...materialNodes.map((node) => ({
      id: `edge:${base.id}:${node.id}`,
      sourceId: `knowledge_base:${base.id}`,
      targetId: node.id,
      relation: 'contains' as const,
    })),
    ...cardNodes.map((node) => {
      const materialId = typeof node.metadata?.materialId === 'string' ? node.metadata.materialId : undefined;
      const sourceId = materialId && visibleMaterialIds.has(materialId)
        ? `material:${materialId}`
        : `knowledge_base:${base.id}`;
      return {
        id: `edge:${sourceId}:${node.id}`,
        sourceId,
        targetId: node.id,
        relation: materialId && visibleMaterialIds.has(materialId) ? 'source' as const : 'supports' as const,
      };
    }),
  ];

  return {
    knowledgeBaseId: id,
    generatedAt: now(),
    nodes,
    edges,
    nodePositions: repository.getNodePositions(id),
    stats: {
      materials: materials.length,
      cards: cards.length,
      sourcedCards: cards.filter((card) => card.claimStatus === 'sourced').length,
    },
  };
}

/**
 * 读取知识库的节点拖拽位置。
 * @param {string} id - 知识库 ID
 * @returns {KnowledgeMapNodePosition[]|undefined} 节点位置数组，知识库不存在时返回 undefined
 */
export function getKnowledgeBaseNodePositions(id: string): KnowledgeMapNodePosition[] | undefined {
  const base = repository.findKnowledgeBase(id);
  if (!base) return undefined;
  return repository.getNodePositions(id);
}

/**
 * 保存知识库的节点拖拽位置。
 * @param {string} id - 知识库 ID
 * @param {SaveKnowledgeMapNodePositionsRequest} request - 保存请求
 * @returns {KnowledgeMapNodePosition[]} 保存后的节点位置数组
 */
export function saveKnowledgeBaseNodePositions(
  id: string,
  request: SaveKnowledgeMapNodePositionsRequest,
): KnowledgeMapNodePosition[] {
  const base = repository.findKnowledgeBase(id);
  if (!base) throw new KnowledgeCoreError('Knowledge base not found.', 404);
  const positions = (request.positions ?? []).filter(
    (position): position is KnowledgeMapNodePosition =>
      typeof position?.nodeId === 'string'
      && typeof position?.x === 'number'
      && typeof position?.y === 'number'
      && Number.isFinite(position.x)
      && Number.isFinite(position.y),
  );
  repository.saveNodePositions(id, positions);
  return positions;
}

export function getTask(id: string) {
  return repository.findTask(id);
}

export function getDashboard(knowledgeBaseId?: string) {
  return {
    knowledgeBases: repository.listKnowledgeBases(),
    materials: repository.listMaterials(knowledgeBaseId, 6),
    tasks: repository.listTasks(6),
    artifacts: repository.listArtifacts(knowledgeBaseId, 6),
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
  return { id, knowledgeBaseId: material.knowledgeBaseId, kind: 'material', archived: true };
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
  return { id, knowledgeBaseId: material.knowledgeBaseId, kind: 'material', archived: false };
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
  return { id, knowledgeBaseId: card.knowledgeBaseId, kind: 'card', archived: true };
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
  return { id, knowledgeBaseId: card.knowledgeBaseId, kind: 'card', archived: false };
}

/**
 * 获取全局或指定知识库下的归档资料与卡片列表。
 * @param {Object} options - 查询选项
 * @param {string} [options.knowledgeBaseId] - 可选知识库 ID
 * @returns {ArchivedItemsResult} 归档列表
 * @author fxbin
 */
export function listArchivedItems(options: { knowledgeBaseId?: string } = {}): ArchivedItemsResult {
  const materials = repository.listArchivedMaterials(options.knowledgeBaseId);
  const cards = repository.listArchivedCards(options.knowledgeBaseId);
  const allBases = repository.listKnowledgeBases();
  const baseIds = new Set([...materials.map((m) => m.knowledgeBaseId), ...cards.map((c) => c.knowledgeBaseId)]);
  const knowledgeBases = options.knowledgeBaseId
    ? allBases.filter((base) => base.id === options.knowledgeBaseId)
    : allBases.filter((base) => baseIds.has(base.id));
  return { materials, cards, knowledgeBases };
}

export async function getKnowledgeBaseAnalytics(id: string): Promise<KnowledgeBaseAnalytics | undefined> {
  const base = repository.findKnowledgeBase(id);
  if (!base) return undefined;

  const materials = repository.listMaterials(id);
  const cards = repository.listCards(id);
  const artifacts = repository.listArtifacts(id);
  const tasks = repository.listTasks().filter((task) => {
    const inputKnowledgeBaseId = typeof task.input.knowledgeBaseId === 'string' ? task.input.knowledgeBaseId : undefined;
    const outputKnowledgeBaseId = typeof task.output?.knowledgeBaseId === 'string' ? task.output.knowledgeBaseId : undefined;
    return inputKnowledgeBaseId === id || outputKnowledgeBaseId === id;
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
      knowledgeBaseId: id,
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

export function getGlobalInsights(): GlobalInsights {
  const bases = repository.listKnowledgeBases();
  const materials = repository.listMaterials();
  const cards = repository.listCards();
  const artifacts = repository.listArtifacts();
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
    .slice(0, 6);
  const totalMaterials = materials.length || 1;
  const sourceDistribution = sortedPlatforms.map(([name, count]) => ({
    name,
    count,
    ratio: count / totalMaterials,
  }));

  const recentCards = cards
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8)
    .map((card) => {
      const base = bases.find((b) => b.id === card.knowledgeBaseId);
      return {
        id: card.id,
        knowledgeBaseId: card.knowledgeBaseId,
        knowledgeBaseTitle: base?.title ?? card.knowledgeBaseId,
        title: card.title,
        type: card.type,
        claimStatus: card.claimStatus,
        createdAt: card.createdAt,
      };
    });

  const nodeCount = bases.length + materials.length + cards.length;
  const edgeCount = materials.length + cards.filter((card) => card.materialId).length;

  return {
    generatedAt: now(),
    totals: {
      knowledgeBases: bases.length,
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
      nodeCount,
      edgeCount,
      knowledgeBaseCount: bases.length,
    },
  };
}

export function getKnowledgeBasePath(id: string): KnowledgeBasePath | undefined {
  const base = repository.findKnowledgeBase(id);
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
    knowledgeBaseId: id,
    knowledgeBaseTitle: base.title,
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
 * @param knowledgeBaseId - 可选目标知识库 ID，未提供时自动创建/复用默认知识库
 * @returns 导入结果
 */
export async function importWeReadBook(bookId: string, knowledgeBaseId?: string): Promise<WeReadImportResult> {
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
  const base = (knowledgeBaseId ? repository.findKnowledgeBase(knowledgeBaseId) : undefined) ?? upsertDefaultKnowledgeBase(bookInfo.title);

  const metaRow = repository.readWeReadBookMetaList().find((row) => row.bookId === bookId);
  const readerId = metaRow?.bookIdLong ?? bookId;
  const sourceUrl = `https://weread.qq.com/web/reader/${readerId}`;

  const timestamp = now();
  const material: MaterialRecord = {
    id: id('mat'),
    knowledgeBaseId: base.id,
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
  repository.updateKnowledgeBase(base);

  const generation = await generateKnowledge('material_summary', contentText, {
    kind: 'text',
    knowledgeBaseId: base.id,
    materialId: material.id,
    hasSourceMaterial: true,
    parseStatus: material.parseStatus,
  });
  const generated = generation.output;

  createCards(base, material, contentText, generated.cards);
  createArtifact(base, material, contentText, generated);
  touchKnowledgeBase(base.id);

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
 * 同步微信读书书架到本地缓存（SWR 模式）。
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

  if (!force && existingState?.lastFullSyncAt) {
    const lastSyncMs = new Date(existingState.lastFullSyncAt).getTime();
    if (nowMs - lastSyncMs < WEREAD_SYNC_STALE_MS) {
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

    const archiveYearMap = new Map<string, string>();
    for (const archive of shelf.archive ?? []) {
      for (const bookId of archive.bookIds ?? []) {
        archiveYearMap.set(bookId, archive.name);
      }
    }

    repository.syncWeReadBookMeta(shelf.books ?? [], archiveYearMap);

    const totalBooks = shelf.books?.length ?? 0;
    repository.writeWeReadSyncState({
      shelfUpdateTime: shelf.updateTime ?? null,
      totalBooks,
      lastFullSyncAt: now(),
      lastSyncError: null,
    });

    return { synced: true, totalBooks, skipped: false, error: null };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    repository.writeWeReadSyncState({
      shelfUpdateTime: existingState?.shelfUpdateTime ?? null,
      totalBooks: existingState?.totalBooks ?? 0,
      lastFullSyncAt: existingState?.lastFullSyncAt ?? now(),
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
 * @param knowledgeBaseId - 当前知识库 ID，用于计算覆盖缺口
 * @returns 推荐结果，包含推荐书籍列表和覆盖缺口分析
 */
export function computeWeReadRecommendations(knowledgeBaseId?: string): WeReadRecommendResult {
  const books = repository.readWeReadBookMetaList().filter((b) => b.presentOnShelf === 1);
  const unimportedBooks = books.filter((b) => !b.materialId);
  const importedBooks = books.filter((b) => b.materialId);

  let kbCards: { type: string }[] = [];
  if (knowledgeBaseId) {
    const detail = repository.findKnowledgeBase(knowledgeBaseId);
    if (detail) {
      kbCards = repository.listCards(knowledgeBaseId);
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
    const weightA = a.reason === 'coverage_gap' ? RECOMMEND_COVERAGE_WEIGHT
      : a.reason === 'depth' ? RECOMMEND_DEPTH_WEIGHT
      : RECOMMEND_CARD_LINKED_WEIGHT;
    const weightB = b.reason === 'coverage_gap' ? RECOMMEND_COVERAGE_WEIGHT
      : b.reason === 'depth' ? RECOMMEND_DEPTH_WEIGHT
      : RECOMMEND_CARD_LINKED_WEIGHT;
    return weightB - weightA;
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
