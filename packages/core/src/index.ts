import {
  type AgentTask,
  type AssignMaterialRequest,
  type ArtifactRecord,
  classifyInput,
  type CompleteMaterialReviewRequest,
  type IntakeRequest,
  type IntakeResult,
  type KnowledgeBaseAnalytics,
  type KnowledgeBaseDetail,
  type KnowledgeMapResult,
  type KnowledgeBaseSummary,
  type KnowledgeCard,
  type KnowledgeKitId,
  type KnowledgeKitRunResult,
  type MaterialAssignmentResult,
  type MaterialParseQueueResult,
  type MaterialRecord,
  type MaterialReviewResult,
  type ModelProviderSettings,
  type ModelProviderTestResult,
  type SaveModelProviderSettingsRequest,
  type TaskStatus,
  type TestModelProviderSettingsRequest,
  detectPlatform,
} from '@zhijing/shared';
import {
  createPiAiRuntime,
  getDefaultPiModel,
  getDefaultPiProvider,
  getKnownPiModels,
  getKnownPiProviders,
  getPiEnvApiKey,
  isKnownPiProvider,
  structuredSchemas,
  type KnownProvider,
  type PiRuntime,
  type TSchema,
} from '@zhijing/pi-runtime';
import { DuckDBConnection } from '@duckdb/node-api';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

type PersistedModelProviderConfig = Partial<{
  provider: string;
  model: string;
  apiKey: string;
  enabled: boolean;
  fallbackToMock: boolean;
  updatedAt: string;
}>;

type StoreState = {
  knowledgeBases: KnowledgeBaseSummary[];
  materials: MaterialRecord[];
  cards: KnowledgeCard[];
  tasks: AgentTask[];
  artifacts: ArtifactRecord[];
  modelProviderConfig?: PersistedModelProviderConfig;
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
  insertCards(cards: KnowledgeCard[]): void;
  updateCard(card: KnowledgeCard): void;
  listCards(knowledgeBaseId?: string): KnowledgeCard[];
  insertTask(task: AgentTask): void;
  updateTask(task: AgentTask): void;
  listTasks(limit?: number): AgentTask[];
  findTask(id: string): AgentTask | undefined;
  insertArtifact(artifact: ArtifactRecord): void;
  updateArtifact(artifact: ArtifactRecord): void;
  listArtifacts(knowledgeBaseId?: string, limit?: number): ArtifactRecord[];
  readModelProviderConfig(): PersistedModelProviderConfig | undefined;
  writeModelProviderConfig(config: PersistedModelProviderConfig): void;
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
  };

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

  listMaterials(knowledgeBaseId?: string, limit?: number) {
    const materials = knowledgeBaseId
      ? this.state.materials.filter((item) => item.knowledgeBaseId === knowledgeBaseId)
      : this.state.materials;
    return typeof limit === 'number' ? materials.slice(0, limit) : materials;
  }

  insertCards(cards: KnowledgeCard[]) {
    this.state.cards.unshift(...cards);
  }

  updateCard(card: KnowledgeCard) {
    const index = this.state.cards.findIndex((item) => item.id === card.id);
    if (index >= 0) this.state.cards[index] = card;
  }

  listCards(knowledgeBaseId?: string) {
    return knowledgeBaseId
      ? this.state.cards.filter((item) => item.knowledgeBaseId === knowledgeBaseId)
      : this.state.cards;
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

  readModelProviderConfig() {
    return this.state.modelProviderConfig;
  }

  writeModelProviderConfig(config: PersistedModelProviderConfig) {
    this.state.modelProviderConfig = config;
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
  created_at: string;
};

type CardRow = {
  id: string;
  knowledge_base_id: string;
  material_id: string | null;
  type: KnowledgeCard['type'];
  title: string;
  body: string;
  claim_status: KnowledgeCard['claimStatus'];
  created_at: string;
  updated_at: string;
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
  title: string;
  body: string;
  source_material_ids_json: string;
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
        id, knowledge_base_id, type, raw_input, source_url, platform, title, content_text, media_urls_json, parse_status, parse_error, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      material.createdAt,
    );
  }

  updateMaterial(material: MaterialRecord) {
    this.db.prepare(`
      UPDATE materials
      SET knowledge_base_id = ?, type = ?, raw_input = ?, source_url = ?, platform = ?, title = ?, content_text = ?, media_urls_json = ?, parse_status = ?, parse_error = ?, created_at = ?
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
      material.createdAt,
      material.id,
    );
  }

  findMaterial(id: string) {
    const row = this.db.prepare('SELECT * FROM materials WHERE id = ?').get(id) as MaterialRow | undefined;
    return row ? mapMaterial(row) : undefined;
  }

  listMaterials(knowledgeBaseId?: string, limit?: number) {
    const rows = knowledgeBaseId
      ? this.db.prepare('SELECT * FROM materials WHERE knowledge_base_id = ? ORDER BY created_at DESC').all(knowledgeBaseId)
      : this.db.prepare(`SELECT * FROM materials ORDER BY created_at DESC${limit ? ` LIMIT ${limit}` : ''}`).all();
    return (rows as MaterialRow[]).map(mapMaterial);
  }

  insertCards(cards: KnowledgeCard[]) {
    const insert = this.db.prepare(`
      INSERT INTO cards (
        id, knowledge_base_id, material_id, type, title, body, claim_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    this.db.exec('BEGIN');
    try {
      for (const card of cards) {
        insert.run(card.id, card.knowledgeBaseId, card.materialId ?? null, card.type, card.title, card.body, card.claimStatus, card.createdAt, card.updatedAt);
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
      SET knowledge_base_id = ?, material_id = ?, type = ?, title = ?, body = ?, claim_status = ?, created_at = ?, updated_at = ?
      WHERE id = ?
    `).run(
      card.knowledgeBaseId,
      card.materialId ?? null,
      card.type,
      card.title,
      card.body,
      card.claimStatus,
      card.createdAt,
      card.updatedAt,
      card.id,
    );
  }

  listCards(knowledgeBaseId?: string) {
    const rows = knowledgeBaseId
      ? this.db.prepare('SELECT * FROM cards WHERE knowledge_base_id = ? ORDER BY updated_at DESC, created_at DESC').all(knowledgeBaseId)
      : this.db.prepare('SELECT * FROM cards ORDER BY updated_at DESC, created_at DESC').all();
    return (rows as CardRow[]).map(mapCard);
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
        id, knowledge_base_id, artifact_type, title, body, source_material_ids_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      artifact.id,
      artifact.knowledgeBaseId,
      artifact.artifactType,
      artifact.title,
      artifact.body,
      JSON.stringify(artifact.sourceMaterialIds),
      artifact.createdAt,
    );
  }

  updateArtifact(artifact: ArtifactRecord) {
    this.db.prepare(`
      UPDATE artifacts
      SET knowledge_base_id = ?, artifact_type = ?, title = ?, body = ?, source_material_ids_json = ?, created_at = ?
      WHERE id = ?
    `).run(
      artifact.knowledgeBaseId,
      artifact.artifactType,
      artifact.title,
      artifact.body,
      JSON.stringify(artifact.sourceMaterialIds),
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
      'default',
      config.provider ?? getDefaultPiProvider(),
      config.model ?? getDefaultPiModel(),
      config.apiKey ?? null,
      config.enabled === false ? 0 : 1,
      config.fallbackToMock === false ? 0 : 1,
      config.updatedAt ?? now(),
    );
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
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS cards (
        id TEXT PRIMARY KEY,
        knowledge_base_id TEXT NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
        material_id TEXT REFERENCES materials(id) ON DELETE SET NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        claim_status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
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

      CREATE INDEX IF NOT EXISTS idx_materials_knowledge_base_id ON materials(knowledge_base_id);
      CREATE INDEX IF NOT EXISTS idx_cards_knowledge_base_id ON cards(knowledge_base_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at);
      CREATE INDEX IF NOT EXISTS idx_artifacts_knowledge_base_id ON artifacts(knowledge_base_id);
    `);
    this.ensureMaterialMediaColumn();
  }

  private ensureMaterialMediaColumn() {
    const columns = this.db.prepare('PRAGMA table_info(materials)').all() as Array<{ name: string }>;
    if (!columns.some((column) => column.name === 'media_urls_json')) {
      this.db.exec("ALTER TABLE materials ADD COLUMN media_urls_json TEXT NOT NULL DEFAULT '[]';");
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
    createdAt: row.created_at,
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

function mapCard(row: CardRow): KnowledgeCard {
  return {
    id: row.id,
    knowledgeBaseId: row.knowledge_base_id,
    materialId: row.material_id ?? undefined,
    type: row.type,
    title: row.title,
    body: row.body,
    claimStatus: row.claim_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
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

function mapArtifact(row: ArtifactRow): ArtifactRecord {
  return {
    id: row.id,
    knowledgeBaseId: row.knowledge_base_id,
    artifactType: row.artifact_type,
    title: row.title,
    body: row.body,
    sourceMaterialIds: JSON.parse(row.source_material_ids_json) as string[],
    createdAt: row.created_at,
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

function initialModelProviderConfig(): RuntimeModelProviderConfig {
  const persisted = repository.readModelProviderConfig();
  const provider = normalizeProvider(process.env.ZHIJING_PI_PROVIDER ?? persisted?.provider);
  const persistedMatchesProvider = persisted?.provider === provider;
  const envApiKey = process.env.ZHIJING_PI_API_KEY ?? getPiEnvApiKey(provider);
  const runtimeApiKey = persistedMatchesProvider ? normalizeSecret(persisted.apiKey) : undefined;
  return {
    provider,
    model: process.env.ZHIJING_PI_MODEL
      ?? (persistedMatchesProvider ? persisted?.model : undefined)
      ?? (provider === getDefaultPiProvider() ? getDefaultPiModel() : defaultModelForProvider(provider)),
    apiKey: runtimeApiKey,
    enabled: process.env.ZHIJING_PI_ENABLED === '1' || persisted?.enabled === true || Boolean(envApiKey ?? runtimeApiKey),
    fallbackToMock: process.env.ZHIJING_PI_FALLBACK === '0' ? false : persisted?.fallbackToMock ?? true,
    keySource: envApiKey ? 'env' : runtimeApiKey ? 'runtime' : 'none',
    updatedAt: persisted?.updatedAt,
  };
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
  const providerScopedExistingKey = modelProviderConfig.provider === provider
    ? modelProviderConfig.apiKey
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

function createMaterial(base: KnowledgeBaseSummary, request: IntakeRequest, type: MaterialRecord['type']) {
  const timestamp = now();
  const platform = detectPlatform(request.input);
  const sourceUrl = type === 'link' ? extractFirstUrl(request.input) ?? request.input.trim() : undefined;
  const material: MaterialRecord = {
    id: id('mat'),
    knowledgeBaseId: base.id,
    type,
    rawInput: request.input.trim(),
    sourceUrl,
    platform,
    title: type === 'link' ? titleFromLink(sourceUrl ?? request.input) : compactTitle(request.input),
    contentText: type === 'text' ? request.input.trim() : undefined,
    mediaUrls: [],
    parseStatus: type === 'link' ? 'saved' : 'ingested',
    createdAt: timestamp,
  };
  base.sourceCount += 1;
  base.updatedAt = timestamp;
  repository.insertMaterial(material);
  repository.updateKnowledgeBase(base);
  return material;
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
    });

    return {
      kind: 'question',
      knowledgeBase: base,
      material,
      cards,
      task,
      artifact,
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
    const prompt = [
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
  material.parseStatus = markIngested ? 'ingested' : 'needs_review';
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
  for (const card of repository.listCards(previousKnowledgeBaseId)) {
    if (card.materialId !== materialId) continue;
    card.knowledgeBaseId = nextKnowledgeBaseId;
    card.updatedAt = now();
    repository.updateCard(card);
  }
  for (const artifact of repository.listArtifacts(previousKnowledgeBaseId)) {
    if (!artifact.sourceMaterialIds.includes(materialId)) continue;
    artifact.knowledgeBaseId = nextKnowledgeBaseId;
    repository.updateArtifact(artifact);
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
      material.parseStatus = 'parsing';
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

  const previousStatus = material.parseStatus;
  material.parseStatus = 'parsing';
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
    const parsed = material.platform === 'xiaohongshu'
      ? await parseXiaohongshuMaterial(material)
      : await parseOrdinaryWebMaterial(material);
    material.title = parsed.title ? compactTitle(parsed.title) : material.title;
    material.contentText = parsed.text;
    material.mediaUrls = parsed.mediaUrls ?? [];
    material.parseStatus = parsed.needsReview ? 'needs_review' : 'ingested';
    material.parseError = parsed.reviewReason;
    repository.updateMaterial(material);

    const base = repository.findKnowledgeBase(material.knowledgeBaseId);
    if (!base) {
      throw new KnowledgeCoreError('Knowledge base not found.', 404);
    }

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
    });
    const generated = generation.output;
    const cards = createCards(base, material, parsed.text, generated.cards);
    const artifact = createArtifact(base, material, parsed.text, generated);

    finishTask(task, {
      materialId: material.id,
      parseStatus: material.parseStatus,
      queueState: parsed.needsReview ? 'needs_review' : 'completed',
      retry,
      contentLength: parsed.text.length,
      mediaCount: material.mediaUrls.length,
      cardIds: cards.map((card) => card.id),
      artifactId: artifact.id,
      generationProvider: generation.provider,
      generationModel: generation.model,
      generationFallbackReason: generation.fallbackReason,
    });

    return {
      material,
      task,
      knowledgeBase: base,
      cards,
      artifact,
      queued: false,
      retry,
      message: parsed.needsReview
        ? '小红书链接已保存，公开页面暂未暴露完整正文或媒体，需要稍后重试或手动补充。'
        : material.platform === 'xiaohongshu'
          ? '小红书笔记已解析并生成知识卡片。'
        : '普通网页已解析并生成知识卡片。',
    };
  } catch (error) {
    return failMaterialParsingTask(material, task, error);
  }
}

function queueMaterialParsing(material: MaterialRecord): MaterialParseQueueResult {
  const activeTask = findActiveParseTask(material.id);
  if (activeTask) {
    if (material.parseStatus !== 'parsing') {
      material.parseStatus = 'parsing';
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
  material.parseStatus = 'parsing';
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

  material.parseStatus = 'failed';
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
  return {
    title,
    text: cleanText([title, `来源链接：${shareInfo.sourceUrl}`].filter(Boolean).join('\n\n')),
    mediaUrls: [],
    needsReview: true,
    reviewReason: '公开页面没有暴露可解析的笔记状态，可能需要登录、稍后重试或手动补充正文媒体。',
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
  const imageUrls = arrayValue(note.imageList).flatMap(xiaohongshuImageUrls);
  const videoUrls = xiaohongshuVideoUrls(note.video);
  const mediaUrls = uniqueStrings([...imageUrls, ...videoUrls]);
  return mediaUrls.length ? mediaUrls : uniqueStrings(collectMediaUrls(note));
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
  const originVideoKey = stringValue(asRecord(record.consumer)?.originVideoKey);
  const generated = originVideoKey ? [`https://sns-video-bd.xhscdn.com/${originVideoKey}`] : [];
  const stream = asRecord(asRecord(record.media)?.stream);
  const streamUrls = ['h264', 'h265', 'h266']
    .flatMap((key) => arrayValue(stream?.[key]))
    .flatMap((item) => {
      const itemRecord = asRecord(item);
      return [
        stringValue(itemRecord?.masterUrl),
        ...arrayValue(itemRecord?.backupUrls).map(stringValue),
      ];
    })
    .filter((url): url is string => Boolean(url))
    .map(normalizeHttpUrl)
    .filter((url): url is string => Boolean(url));
  return uniqueStrings([...generated, ...streamUrls]);
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
  const parseError = cleanParseError(error instanceof Error ? error.message : 'Material parsing failed.');
  material.parseStatus = 'failed';
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
    message: '网页解析失败，已保留原链接，可稍后重试或手动补充正文。',
  };
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
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const results: KnowledgeSearchResult[] = [];

  for (const base of repository.listKnowledgeBases()) {
    addSearchResult(results, {
      id: base.id,
      kind: 'knowledge_base',
      title: base.title,
      preview: base.summary,
      knowledgeBaseId: base.id,
      metadata: {
        stage: base.stage,
        sourceCount: base.sourceCount,
        cardCount: base.cardCount,
      },
      score: scoreSearchText(terms, base.title, base.summary),
    });
  }

  for (const material of repository.listMaterials()) {
    addSearchResult(results, {
      id: material.id,
      kind: 'material',
      title: material.title,
      preview: compactPreview(material.contentText ?? material.rawInput),
      knowledgeBaseId: material.knowledgeBaseId,
      metadata: {
        type: material.type,
        platform: material.platform ?? 'local',
        parseStatus: material.parseStatus,
        mediaCount: material.mediaUrls?.length ?? 0,
      },
      score: scoreSearchText(
        terms,
        material.title,
        material.rawInput,
        material.contentText,
        ...(material.mediaUrls ?? []),
        material.platform,
        material.sourceUrl,
        material.parseError,
      ),
    });
  }

  for (const card of repository.listCards()) {
    addSearchResult(results, {
      id: card.id,
      kind: 'card',
      title: card.title,
      preview: compactPreview(card.body),
      knowledgeBaseId: card.knowledgeBaseId,
      metadata: {
        type: card.type,
        claimStatus: card.claimStatus,
      },
      score: scoreSearchText(terms, card.title, card.body, card.type, card.claimStatus),
    });
  }

  for (const artifact of repository.listArtifacts()) {
    addSearchResult(results, {
      id: artifact.id,
      kind: 'artifact',
      title: artifact.title,
      preview: compactPreview(artifact.body),
      knowledgeBaseId: artifact.knowledgeBaseId,
      metadata: {
        artifactType: artifact.artifactType,
        sourceMaterialCount: artifact.sourceMaterialIds.length,
      },
      score: scoreSearchText(terms, artifact.title, artifact.body, artifact.artifactType),
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

function scoreSearchText(terms: string[], title: string | undefined, ...fields: Array<string | undefined>) {
  const titleText = title?.toLowerCase() ?? '';
  const bodyText = fields.filter(Boolean).join(' ').toLowerCase();
  return terms.reduce((score, term) => {
    if (titleText.includes(term)) return score + 4;
    if (bodyText.includes(term)) return score + 1;
    return score;
  }, 0);
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
    stats: {
      materials: materials.length,
      cards: cards.length,
      sourcedCards: cards.filter((card) => card.claimStatus === 'sourced').length,
    },
  };
}

export function getTask(id: string) {
  return repository.findTask(id);
}

export function getDashboard() {
  return {
    knowledgeBases: repository.listKnowledgeBases(),
    materials: repository.listMaterials(undefined, 6),
    tasks: repository.listTasks(6),
    artifacts: repository.listArtifacts(undefined, 6),
  };
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
