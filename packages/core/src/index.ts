import {
  type AgentTask,
  type ArtifactRecord,
  classifyInput,
  type IntakeRequest,
  type IntakeResult,
  type KnowledgeBaseDetail,
  type KnowledgeBaseSummary,
  type KnowledgeCard,
  type MaterialRecord,
  detectPlatform,
} from '@zhijing/shared';
import { randomUUID } from 'node:crypto';

type StoreState = {
  knowledgeBases: KnowledgeBaseSummary[];
  materials: MaterialRecord[];
  cards: KnowledgeCard[];
  tasks: AgentTask[];
  artifacts: ArtifactRecord[];
};

const state: StoreState = {
  knowledgeBases: [],
  materials: [],
  cards: [],
  tasks: [],
  artifacts: [],
};

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
  state.tasks.unshift(task);
  return task;
}

function finishTask(task: AgentTask, output: Record<string, unknown>) {
  task.status = 'succeeded';
  task.output = output;
  task.updatedAt = now();
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
  state.knowledgeBases.unshift(base);
  return base;
}

function upsertDefaultKnowledgeBase(input: string) {
  if (state.knowledgeBases.length > 0) return state.knowledgeBases[0];
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
  state.materials.unshift(material);
  base.sourceCount += 1;
  base.updatedAt = timestamp;
  return material;
}

function createCards(base: KnowledgeBaseSummary, material: MaterialRecord | undefined, seed: string) {
  const timestamp = now();
  const sourceStatus = material ? 'sourced' : 'ai_skeleton';
  const cards: KnowledgeCard[] = [
    {
      id: id('card'),
      knowledgeBaseId: base.id,
      materialId: material?.id,
      type: 'concept',
      title: `${compactTitle(seed)} 的核心概念`,
      body: material
        ? '从导入资料中提取出的第一张知识卡片，后续会由 Pi 替换为结构化生成。'
        : '根据主题先生成的 AI 骨架卡片，等待资料导入后补充来源。',
      claimStatus: sourceStatus,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: id('card'),
      knowledgeBaseId: base.id,
      materialId: material?.id,
      type: 'question',
      title: '下一步要回答的问题',
      body: '这个主题还需要补充哪些高质量来源、案例和可验证证据？',
      claimStatus: sourceStatus,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];
  state.cards.unshift(...cards);
  base.cardCount += cards.length;
  base.sourcedRatio = state.cards.filter((card) => card.knowledgeBaseId === base.id && card.claimStatus === 'sourced').length / base.cardCount;
  base.updatedAt = timestamp;
  return cards;
}

function createArtifact(base: KnowledgeBaseSummary, material: MaterialRecord | undefined, seed: string) {
  const timestamp = now();
  const artifact: ArtifactRecord = {
    id: id('art'),
    knowledgeBaseId: base.id,
    artifactType: 'summary',
    title: `${compactTitle(seed)} 摘要`,
    body: material
      ? `已保存资料「${material.title}」，并生成可继续整理的摘要占位。`
      : `已创建「${base.title}」主题骨架，下一步可以继续导入来源资料。`,
    sourceMaterialIds: material ? [material.id] : [],
    createdAt: timestamp,
  };
  state.artifacts.unshift(artifact);
  return artifact;
}

export function intakeKnowledge(request: IntakeRequest): IntakeResult {
  const value = request.input.trim();
  if (!value) {
    throw new Error('Input is required.');
  }

  const kind = classifyInput(value);
  const workflow = kind === 'question' ? 'answer_question' : kind === 'theme' ? 'create_knowledge_base' : 'ingest_material';
  const task = createTask(workflow, { input: value, knowledgeBaseId: request.knowledgeBaseId });

  const base = kind === 'theme'
    ? createKnowledgeBase(compactTitle(value), `围绕「${compactTitle(value)}」生成的知识库骨架。`)
    : state.knowledgeBases.find((item) => item.id === request.knowledgeBaseId) ?? upsertDefaultKnowledgeBase(value);

  const material = kind === 'theme'
    ? undefined
    : createMaterial(base, request, kind === 'link' ? 'link' : kind === 'question' ? 'question' : 'text');

  const cards = createCards(base, material, value);
  const artifact = createArtifact(base, material, value);

  finishTask(task, {
    kind,
    knowledgeBaseId: base.id,
    materialId: material?.id,
    cardIds: cards.map((card) => card.id),
    artifactId: artifact.id,
  });

  return {
    kind,
    knowledgeBase: base,
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
}

export function listKnowledgeBases() {
  return state.knowledgeBases;
}

export function getKnowledgeBase(id: string): KnowledgeBaseDetail | undefined {
  const base = state.knowledgeBases.find((item) => item.id === id);
  if (!base) return undefined;
  return {
    ...base,
    materials: state.materials.filter((item) => item.knowledgeBaseId === id),
    cards: state.cards.filter((item) => item.knowledgeBaseId === id),
    artifacts: state.artifacts.filter((item) => item.knowledgeBaseId === id),
  };
}

export function getTask(id: string) {
  return state.tasks.find((item) => item.id === id);
}

export function getDashboard() {
  return {
    knowledgeBases: state.knowledgeBases,
    materials: state.materials.slice(0, 6),
    tasks: state.tasks.slice(0, 6),
    artifacts: state.artifacts.slice(0, 6),
  };
}
