import {
  type AgentTask,
  type ArtifactRecord,
  classifyInput,
  type IntakeRequest,
  type IntakeResult,
  type KnowledgeBaseAnalytics,
  type KnowledgeBaseDetail,
  type KnowledgeBaseSummary,
  type KnowledgeCard,
  type MaterialRecord,
  detectPlatform,
} from '@zhijing/shared';
import {
  createConfiguredPiRuntime,
  structuredSchemas,
  type PiRuntime,
  type TSchema,
} from '@zhijing/pi-runtime';
import { DuckDBConnection } from '@duckdb/node-api';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

type StoreState = {
  knowledgeBases: KnowledgeBaseSummary[];
  materials: MaterialRecord[];
  cards: KnowledgeCard[];
  tasks: AgentTask[];
  artifacts: ArtifactRecord[];
};

type KnowledgeRepository = {
  insertKnowledgeBase(base: KnowledgeBaseSummary): void;
  updateKnowledgeBase(base: KnowledgeBaseSummary): void;
  listKnowledgeBases(): KnowledgeBaseSummary[];
  findKnowledgeBase(id: string): KnowledgeBaseSummary | undefined;
  insertMaterial(material: MaterialRecord): void;
  listMaterials(knowledgeBaseId?: string, limit?: number): MaterialRecord[];
  insertCards(cards: KnowledgeCard[]): void;
  listCards(knowledgeBaseId?: string): KnowledgeCard[];
  insertTask(task: AgentTask): void;
  updateTask(task: AgentTask): void;
  listTasks(limit?: number): AgentTask[];
  findTask(id: string): AgentTask | undefined;
  insertArtifact(artifact: ArtifactRecord): void;
  listArtifacts(knowledgeBaseId?: string, limit?: number): ArtifactRecord[];
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

  listMaterials(knowledgeBaseId?: string, limit?: number) {
    const materials = knowledgeBaseId
      ? this.state.materials.filter((item) => item.knowledgeBaseId === knowledgeBaseId)
      : this.state.materials;
    return typeof limit === 'number' ? materials.slice(0, limit) : materials;
  }

  insertCards(cards: KnowledgeCard[]) {
    this.state.cards.unshift(...cards);
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

  listArtifacts(knowledgeBaseId?: string, limit?: number) {
    const artifacts = knowledgeBaseId
      ? this.state.artifacts.filter((item) => item.knowledgeBaseId === knowledgeBaseId)
      : this.state.artifacts;
    return typeof limit === 'number' ? artifacts.slice(0, limit) : artifacts;
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
        id, knowledge_base_id, type, raw_input, source_url, platform, title, content_text, parse_status, parse_error, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      material.id,
      material.knowledgeBaseId,
      material.type,
      material.rawInput,
      material.sourceUrl ?? null,
      material.platform ?? null,
      material.title,
      material.contentText ?? null,
      material.parseStatus,
      material.parseError ?? null,
      material.createdAt,
    );
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

  listArtifacts(knowledgeBaseId?: string, limit?: number) {
    const rows = knowledgeBaseId
      ? this.db.prepare('SELECT * FROM artifacts WHERE knowledge_base_id = ? ORDER BY created_at DESC').all(knowledgeBaseId)
      : this.db.prepare(`SELECT * FROM artifacts ORDER BY created_at DESC${limit ? ` LIMIT ${limit}` : ''}`).all();
    return (rows as ArtifactRow[]).map(mapArtifact);
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

      CREATE INDEX IF NOT EXISTS idx_materials_knowledge_base_id ON materials(knowledge_base_id);
      CREATE INDEX IF NOT EXISTS idx_cards_knowledge_base_id ON cards(knowledge_base_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at);
      CREATE INDEX IF NOT EXISTS idx_artifacts_knowledge_base_id ON artifacts(knowledge_base_id);
    `);
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
    parseStatus: row.parse_status,
    parseError: row.parse_error ?? undefined,
    createdAt: row.created_at,
  };
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
let piRuntime: PiRuntime = createConfiguredPiRuntime();

export function configureKnowledgeRepository(nextRepository: KnowledgeRepository) {
  repository = nextRepository;
}

export function configurePiRuntime(nextRuntime: PiRuntime) {
  piRuntime = nextRuntime;
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

function createTask(workflow: AgentTask['workflow'], input: Record<string, unknown>) {
  const timestamp = now();
  const task: AgentTask = {
    id: id('task'),
    workflow,
    status: 'running',
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
  const material: MaterialRecord = {
    id: id('mat'),
    knowledgeBaseId: base.id,
    type,
    rawInput: request.input.trim(),
    sourceUrl: type === 'link' ? request.input.trim() : undefined,
    platform,
    title: type === 'link' ? titleFromLink(request.input) : compactTitle(request.input),
    contentText: type === 'text' ? request.input.trim() : undefined,
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
  const sourceStatus = material ? 'sourced' : 'ai_skeleton';
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
  const artifact: ArtifactRecord = {
    id: id('art'),
    knowledgeBaseId: base.id,
    artifactType: 'summary',
    title: compactTitle(generated.artifactTitle ?? `${compactTitle(seed)} 摘要`),
    body: generated.artifactBody ?? generated.summary ?? (material
      ? `已保存资料「${material.title}」，并生成可继续整理的摘要占位。`
      : `已创建「${base.title}」主题骨架，下一步可以继续导入来源资料。`),
    sourceMaterialIds: material ? [material.id] : [],
    createdAt: timestamp,
  };
  repository.insertArtifact(artifact);
  return artifact;
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

export function listKnowledgeBases() {
  return repository.listKnowledgeBases();
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
