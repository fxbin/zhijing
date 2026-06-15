export type IntakeKind = 'theme' | 'link' | 'question' | 'text';

export type KnowledgeBaseStage = 'ai_skeleton' | 'organizing' | 'grounded';

export type MaterialType = 'link' | 'text' | 'question' | 'topic';

export type ParseStatus = 'saved' | 'parsing' | 'needs_review' | 'ingested' | 'failed';

export type TaskStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'needs_user_action';

export type CardType = 'concept' | 'method' | 'case' | 'question' | 'step' | 'viewpoint';

export type ClaimStatus = 'ai_skeleton' | 'sourced' | 'user_confirmed' | 'unsupported';

export interface IntakeRequest {
  input: string;
  knowledgeBaseId?: string;
}

export interface KnowledgeBaseSummary {
  id: string;
  title: string;
  summary: string;
  stage: KnowledgeBaseStage;
  sourceCount: number;
  cardCount: number;
  sourcedRatio: number;
  createdAt: string;
  updatedAt: string;
}

export interface MaterialRecord {
  id: string;
  knowledgeBaseId: string;
  type: MaterialType;
  rawInput: string;
  sourceUrl?: string;
  platform?: string;
  title: string;
  contentText?: string;
  parseStatus: ParseStatus;
  parseError?: string;
  createdAt: string;
}

export interface KnowledgeCard {
  id: string;
  knowledgeBaseId: string;
  materialId?: string;
  type: CardType;
  title: string;
  body: string;
  claimStatus: ClaimStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AgentTask {
  id: string;
  workflow: 'create_knowledge_base' | 'ingest_material' | 'answer_question';
  status: TaskStatus;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ArtifactRecord {
  id: string;
  knowledgeBaseId: string;
  artifactType: 'summary' | 'research_report' | 'cards';
  title: string;
  body: string;
  sourceMaterialIds: string[];
  createdAt: string;
}

export interface IntakeResult {
  kind: IntakeKind;
  knowledgeBase: KnowledgeBaseSummary;
  material?: MaterialRecord;
  cards: KnowledgeCard[];
  task: AgentTask;
  artifact?: ArtifactRecord;
  message: string;
}

export interface KnowledgeBaseDetail extends KnowledgeBaseSummary {
  materials: MaterialRecord[];
  cards: KnowledgeCard[];
  artifacts: ArtifactRecord[];
}

export function classifyInput(input: string): IntakeKind {
  const value = input.trim();
  if (/https?:\/\//i.test(value)) return 'link';
  if (/[?？]|怎么|如何|why|what|how/i.test(value)) return 'question';
  if (value.length > 80 || value.includes('\n')) return 'text';
  return 'theme';
}

export function detectPlatform(input: string): string | undefined {
  const value = input.toLowerCase();
  if (value.includes('xiaohongshu.com') || value.includes('xhslink.com')) return 'xiaohongshu';
  if (value.includes('douyin.com') || value.includes('iesdouyin.com')) return 'douyin';
  if (/https?:\/\//i.test(value)) return 'web';
  return undefined;
}
