export type IntakeKind = 'theme' | 'link' | 'question' | 'text';

export type KnowledgeBaseStage = 'ai_skeleton' | 'organizing' | 'grounded';

export type MaterialType = 'link' | 'text' | 'question' | 'topic';

export type ParseStatus = 'saved' | 'parsing' | 'needs_review' | 'ingested' | 'failed';

export interface MaterialStatusTimeline {
  capturedAt?: string;
  queuedAt?: string;
  parsingAt?: string;
  reviewedAt?: string;
  ingestedAt?: string;
  failedAt?: string;
}

export type TaskStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'needs_user_action';

export type CardType = 'concept' | 'method' | 'case' | 'question' | 'step' | 'viewpoint';

export type ClaimStatus = 'ai_skeleton' | 'sourced' | 'user_confirmed' | 'unsupported';

export type KnowledgeKitId = 'learning_research' | 'content_creation' | 'product_research' | 'topic_decomposition';

export interface IntakeRequest {
  input: string;
  knowledgeBaseId?: string;
}

export interface ModelProviderModel {
  id: string;
}

export interface ModelProviderOption {
  id: string;
  models: ModelProviderModel[];
}

export interface ModelProviderSettings {
  provider: string;
  model: string;
  enabled: boolean;
  fallbackToMock: boolean;
  hasApiKey: boolean;
  keySource: 'none' | 'env' | 'runtime';
  updatedAt?: string;
  providers: ModelProviderOption[];
}

export interface SaveModelProviderSettingsRequest {
  provider: string;
  model: string;
  apiKey?: string;
  enabled?: boolean;
  fallbackToMock?: boolean;
  clearApiKey?: boolean;
}

export interface TestModelProviderSettingsRequest {
  provider?: string;
  model?: string;
  apiKey?: string;
}

export interface AssignMaterialRequest {
  knowledgeBaseId?: string;
  newKnowledgeBaseTitle?: string;
}

export interface CompleteMaterialReviewRequest {
  title?: string;
  contentText?: string;
  mediaUrls?: string[];
  markIngested?: boolean;
}

export interface ModelProviderTestResult {
  ok: boolean;
  provider: string;
  model: string;
  message: string;
  sampleTitle?: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    costUsd?: number;
  };
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
  mediaUrls?: string[];
  parseStatus: ParseStatus;
  parseError?: string;
  createdAt: string;
  statusTimeline?: MaterialStatusTimeline;
}

export interface CardRecall {
  dueAt: string;
  ease: number;
  interval: number;
  reviewedAt?: string;
}

export type RecallGrade = 'again' | 'hard' | 'good' | 'easy';

export interface KnowledgeCard {
  id: string;
  knowledgeBaseId: string;
  materialId?: string;
  type: CardType;
  title: string;
  body: string;
  claimStatus: ClaimStatus;
  recall?: CardRecall;
  createdAt: string;
  updatedAt: string;
}

export type CardRevisionField = 'title' | 'body' | 'type' | 'claimStatus';

export interface CardRevision {
  id: string;
  cardId: string;
  version: number;
  titleSnapshot: string;
  bodySnapshot: string;
  typeSnapshot: CardType;
  claimStatusSnapshot: ClaimStatus;
  changedFields: CardRevisionField[];
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  knowledgeBaseId: string;
  question: string;
  answer: string;
  cardIds: string[];
  artifactId?: string;
  materialId?: string;
  createdAt: string;
}

export interface AgentTask {
  id: string;
  workflow: 'create_knowledge_base' | 'ingest_material' | 'answer_question' | 'parse_material' | 'run_kit';
  status: TaskStatus;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export type ArtifactSubtype =
  | 'deep_research'
  | 'product'
  | 'topic'
  | 'xiaohongshu'
  | 'summary';

export interface ArtifactRecord {
  id: string;
  knowledgeBaseId: string;
  artifactType: 'summary' | 'research_report' | 'cards' | 'kit_report';
  subtype: ArtifactSubtype;
  title: string;
  body: string;
  sourceMaterialIds: string[];
  createdAt: string;
  sections?: ArtifactSection[];
}

export interface ArtifactSection {
  id: string;
  title: string;
  body: string;
  updatedAt: string;
}

export type ArtifactRevisionField = 'title' | 'body';

export interface ArtifactRevision {
  id: string;
  artifactId: string;
  version: number;
  sectionId: string;
  sectionTitleSnapshot: string;
  sectionBodySnapshot: string;
  changedFields: ArtifactRevisionField[];
  createdAt: string;
}

export interface ArtifactSectionInit {
  title: string;
  body: string;
}

export interface ArtifactSectionEdit {
  title?: string;
  body?: string;
}

export interface ArtifactSectionEditResult {
  artifact: ArtifactRecord;
  revision?: ArtifactRevision;
}

export type ExportFormat = 'markdown' | 'json' | 'pdf';

export type ExportScope = 'all' | 'materials' | 'cards';

export interface ExportRecord {
  id: string;
  knowledgeBaseId: string;
  format: ExportFormat;
  scope: ExportScope;
  includeArtifacts: boolean;
  materialCount: number;
  cardCount: number;
  artifactCount: number;
  filename: string;
  createdAt: string;
}

export interface CloudBackupStub {
  status: 'not_implemented';
  decision: 'local_first';
  reason: string;
  plannedFor: string | null;
}

export type SavedFilterScope = 'assets' | 'compare';

export interface SavedFilter {
  id: string;
  scope: SavedFilterScope;
  cardType: string | null;
  claimStatus: string | null;
  sortKey: string;
  keyword: string;
  updatedAt: string;
}

export type EntityType = 'person' | 'organization' | 'concept' | 'tool' | 'place' | 'event' | 'other';

export interface Entity {
  id: string;
  knowledgeBaseId: string;
  name: string;
  type: EntityType;
  description: string;
  sourceCardIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ExtractedEntitySeed {
  name: string;
  type: EntityType;
  description: string;
}

export type ConflictKind = 'duplicate_card' | 'duplicate_material';

export type ConflictResolutionAction = 'merge' | 'delete';

export interface ConflictGroupItem {
  id: string;
  knowledgeBaseId: string;
  title: string;
  meta: string;
}

export interface ConflictGroup {
  kind: ConflictKind;
  key: string;
  title: string;
  items: ConflictGroupItem[];
}

export interface ConflictAuditEntry {
  id: string;
  kind: ConflictKind;
  action: ConflictResolutionAction;
  keepId: string;
  dropIds: string[];
  knowledgeBaseId: string;
  note: string;
  createdAt: string;
}

export interface ConflictResolutionRequest {
  kind: ConflictKind;
  keepId: string;
  dropIds: string[];
}

export interface KnowledgeCitation {
  id: string;
  kind: 'material' | 'card';
  title: string;
  preview: string;
  sourceUrl?: string;
  materialId?: string;
  cardId?: string;
}

export interface IntakeResult {
  kind: IntakeKind;
  knowledgeBase: KnowledgeBaseSummary;
  material?: MaterialRecord;
  cards: KnowledgeCard[];
  task: AgentTask;
  artifact?: ArtifactRecord;
  citations?: KnowledgeCitation[];
  message: string;
}

export interface MaterialParseQueueResult {
  material: MaterialRecord;
  task: AgentTask;
  knowledgeBase?: KnowledgeBaseSummary;
  cards?: KnowledgeCard[];
  artifact?: ArtifactRecord;
  queued: boolean;
  retry: boolean;
  message: string;
}

export interface MaterialAssignmentResult {
  material: MaterialRecord;
  knowledgeBase: KnowledgeBaseSummary;
  previousKnowledgeBaseId: string;
  message: string;
}

export interface MaterialAssignmentSuggestion {
  knowledgeBaseId?: string;
  title: string;
  score: number;
  reason: string;
  isNew?: boolean;
}

export interface MaterialAssignmentSuggestionsResult {
  material: MaterialRecord;
  suggestions: MaterialAssignmentSuggestion[];
  message: string;
}

export interface MaterialReviewResult {
  material: MaterialRecord;
  knowledgeBase: KnowledgeBaseSummary;
  task?: AgentTask;
  cards?: KnowledgeCard[];
  artifact?: ArtifactRecord;
  message: string;
}

export interface RunKnowledgeKitRequest {
  kitId?: KnowledgeKitId;
}

export interface KnowledgeKitRunResult {
  knowledgeBase: KnowledgeBaseSummary;
  artifact: ArtifactRecord;
  task: AgentTask;
  message: string;
}

export interface KnowledgeBaseDetail extends KnowledgeBaseSummary {
  materials: MaterialRecord[];
  cards: KnowledgeCard[];
  artifacts: ArtifactRecord[];
}

export interface AnalyticsDistributionItem {
  name: string;
  count: number;
}

export interface AnalyticsExportRow {
  section: string;
  label: string;
  value: string;
}

export interface KnowledgeBaseAnalytics {
  knowledgeBaseId: string;
  generatedAt: string;
  totals: {
    materials: number;
    cards: number;
    sourcedCards: number;
    aiSkeletonCards: number;
    artifacts: number;
    tasks: number;
  };
  sourcedRatio: number;
  platformDistribution: AnalyticsDistributionItem[];
  materialStatusDistribution: AnalyticsDistributionItem[];
  cardTypeDistribution: AnalyticsDistributionItem[];
  taskStatusDistribution: AnalyticsDistributionItem[];
  exportRows: AnalyticsExportRow[];
}

export type KnowledgeMapNodeKind = 'knowledge_base' | 'material' | 'card';

export interface KnowledgeMapNode {
  id: string;
  kind: KnowledgeMapNodeKind;
  label: string;
  summary?: string;
  status?: string;
  metadata?: Record<string, string | number | boolean | undefined>;
}

export interface KnowledgeMapEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relation: 'contains' | 'source' | 'supports';
}

export interface KnowledgeMapResult {
  knowledgeBaseId: string;
  generatedAt: string;
  nodes: KnowledgeMapNode[];
  edges: KnowledgeMapEdge[];
  stats: {
    materials: number;
    cards: number;
    sourcedCards: number;
  };
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
