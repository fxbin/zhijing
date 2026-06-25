export type IntakeKind = 'theme' | 'link' | 'question' | 'text';

export type WorkspaceStage = 'ai_skeleton' | 'organizing' | 'grounded';

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

/**
 * 创建知识库时的意图澄清字段：受众水平。
 * - beginner 零基础，主动补前置知识与术语解释
 * - intermediate 有基础，默认掌握领域常识
 * - expert 专家级，跳过共识聚焦争议与前沿
 * @author fxbin
 */
export const INTAKE_AUDIENCE_VALUES = ['beginner', 'intermediate', 'expert'] as const;
export type IntakeAudience = typeof INTAKE_AUDIENCE_VALUES[number];

/**
 * 创建知识库时的意图澄清字段：内容深度。
 * - overview 入门概览，5-8 张卡片
 * - standard 系统掌握，12-20 张卡片
 * - deep 深度研究，20-35 张卡片含推导与前沿
 * @author fxbin
 */
export const INTAKE_DEPTH_VALUES = ['overview', 'standard', 'deep'] as const;
export type IntakeDepth = typeof INTAKE_DEPTH_VALUES[number];

/**
 * 创建知识库时的意图澄清字段：范围边界。
 * - focused 聚焦核心概念群
 * - panorama 全景覆盖主要分支
 * - cross 跨领域延伸，额外生成交叉应用卡
 * @author fxbin
 */
export const INTAKE_SCOPE_VALUES = ['focused', 'panorama', 'cross'] as const;
export type IntakeScope = typeof INTAKE_SCOPE_VALUES[number];

export interface IntakeRequest {
  input: string;
  workspaceId?: string;
  audience?: IntakeAudience;
  depth?: IntakeDepth;
  scope?: IntakeScope;
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

/**
 * 模型 Provider Profile（多配置档案）
 * 用于支持配置多个模型 profile，可在研究、创作等场景间切换激活。
 * @author fxbin
 */
export interface ModelProviderProfile {
  id: string;
  name: string;
  provider: string;
  model: string;
  enabled: boolean;
  fallbackToMock: boolean;
  hasApiKey: boolean;
  keySource: 'none' | 'env' | 'runtime';
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * 模型 Provider 设置 V2（多 profile 聚合视图）
 * @author fxbin
 */
export interface ModelProviderSettingsV2 {
  profiles: ModelProviderProfile[];
  activeProfileId: string | null;
  providers: ModelProviderOption[];
}

/**
 * 创建模型 Provider Profile 请求
 * @author fxbin
 */
export interface CreateModelProviderProfileRequest {
  name: string;
  provider: string;
  model: string;
  apiKey?: string;
  enabled?: boolean;
  fallbackToMock?: boolean;
  isDefault?: boolean;
}

/**
 * 更新模型 Provider Profile 请求
 * @author fxbin
 */
export interface UpdateModelProviderProfileRequest {
  name?: string;
  provider?: string;
  model?: string;
  apiKey?: string;
  enabled?: boolean;
  fallbackToMock?: boolean;
  isDefault?: boolean;
  clearApiKey?: boolean;
}

export interface TestModelProviderSettingsRequest {
  provider?: string;
  model?: string;
  apiKey?: string;
}

export interface AssignMaterialRequest {
  workspaceId?: string;
  newWorkspaceTitle?: string;
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

export interface WorkspaceSummary {
  id: string;
  title: string;
  summary: string;
  stage: WorkspaceStage;
  sourceCount: number;
  cardCount: number;
  sourcedRatio: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 资料归档状态。
 * @author fxbin
 */
export type ArchiveStatus = 'active' | 'archived';

export interface MaterialRecord {
  id: string;
  workspaceId?: string;
  type: MaterialType;
  rawInput: string;
  sourceUrl?: string;
  platform?: string;
  title: string;
  contentText?: string;
  mediaUrls?: string[];
  parseStatus: ParseStatus;
  parseError?: string;
  transcript?: string;
  transcriptStatus?: MaterialTranscriptStatus;
  transcriptError?: string;
  createdAt: string;
  statusTimeline?: MaterialStatusTimeline;
  archived?: boolean;
}

export type MaterialTranscriptStatus = 'pending' | 'done' | 'failed' | 'skipped';

export interface CardRecall {
  dueAt: string;
  ease: number;
  interval: number;
  reviewedAt?: string;
}

export type RecallGrade = 'again' | 'hard' | 'good' | 'easy';

export interface KnowledgeCard {
  id: string;
  workspaceId?: string;
  materialId?: string;
  type: CardType;
  title: string;
  body: string;
  claimStatus: ClaimStatus;
  recall?: CardRecall;
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
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
  workspaceId?: string;
  question: string;
  answer: string;
  cardIds: string[];
  artifactId?: string;
  materialId?: string;
  createdAt: string;
  proposedCards?: ProposedCard[];
}

/**
 * 对话生成的卡片提议，尚未落库为 KnowledgeCard。
 * 用户在前端确认采纳后，才会通过 acceptProposedCards 正式写入 cards 表。
 * 守提议权不写入权：对话只产生提议，不直接生成卡片。
 * @author fxbin
 */
export interface ProposedCard {
  type: CardType;
  title: string;
  body: string;
}

/**
 * 采纳提议卡片请求，支持逐张选择。
 * selectedIndices 为空或省略时采纳全部提议。
 * @author fxbin
 */
export interface AcceptProposedCardsRequest {
  selectedIndices?: number[];
}

export interface AgentTask {
  id: string;
  workflow: 'create_workspace' | 'ingest_material' | 'answer_question' | 'parse_material' | 'run_kit';
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
  workspaceId?: string;
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
  workspaceId?: string;
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
  workspaceId?: string;
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

export type ConflictKind = 'duplicate_card' | 'duplicate_material' | 'semantic_tension';

export type ConflictResolutionAction = 'merge' | 'delete';

export interface ConflictGroupItem {
  id: string;
  workspaceId?: string;
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
  workspaceId?: string;
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
  workspace: WorkspaceSummary;
  material?: MaterialRecord;
  cards: KnowledgeCard[];
  task: AgentTask;
  artifact?: ArtifactRecord;
  citations?: KnowledgeCitation[];
  message: string;
  proposedCards?: ProposedCard[];
  messageId?: string;
}

export interface MaterialParseQueueResult {
  material: MaterialRecord;
  task: AgentTask;
  workspace?: WorkspaceSummary;
  cards?: KnowledgeCard[];
  artifact?: ArtifactRecord;
  queued: boolean;
  retry: boolean;
  message: string;
}

export interface MaterialAssignmentResult {
  material: MaterialRecord;
  workspace: WorkspaceSummary;
  previousWorkspaceId: string;
  message: string;
}

export interface MaterialAssignmentSuggestion {
  workspaceId?: string;
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
  workspace: WorkspaceSummary;
  task?: AgentTask;
  cards?: KnowledgeCard[];
  artifact?: ArtifactRecord;
  message: string;
}

export interface RunKnowledgeKitRequest {
  kitId?: KnowledgeKitId;
}

export interface KnowledgeKitRunResult {
  workspace: WorkspaceSummary;
  artifact: ArtifactRecord;
  task: AgentTask;
  message: string;
}

export interface WorkspaceDetail extends WorkspaceSummary {
  materials: MaterialRecord[];
  cards: KnowledgeCard[];
  artifacts: ArtifactRecord[];
}

/**
 * 单条归档操作结果。
 * @author fxbin
 */
export interface ArchiveItemResult {
  id: string;
  workspaceId?: string;
  kind: 'material' | 'card';
  archived: boolean;
}

/**
 * 归档列表聚合结果。
 * @author fxbin
 */
export interface ArchivedItemsResult {
  materials: MaterialRecord[];
  cards: KnowledgeCard[];
  workspaces: WorkspaceSummary[];
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

export interface WorkspaceAnalytics {
  workspaceId: string;
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

export type KnowledgeMapNodeKind = 'workspace' | 'material' | 'card';

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
  relation: 'contains' | 'source' | 'supports' | 'contradicts' | 'related_to';
  custom?: boolean;
}

export interface KnowledgeMapResult {
  workspaceId: string;
  generatedAt: string;
  nodes: KnowledgeMapNode[];
  edges: KnowledgeMapEdge[];
  nodePositions: KnowledgeMapNodePosition[];
  stats: {
    materials: number;
    cards: number;
    sourcedCards: number;
    skeletonCards: number;
    tensionEdges: number;
  };
}

export interface GlobalInsights {
  generatedAt: string;
  totals: {
    workspaces: number;
    materials: number;
    cards: number;
    sourcedCards: number;
    artifacts: number;
    tasks: number;
  };
  growth: {
    labels: string[];
    data: number[];
  };
  sourceDistribution: {
    name: string;
    count: number;
    ratio: number;
  }[];
  recentCards: {
    id: string;
    workspaceId: string;
    workspaceTitle: string;
    title: string;
    type: CardType;
    claimStatus: ClaimStatus;
    createdAt: string;
  }[];
  mapPreview: {
    nodeCount: number;
    edgeCount: number;
    workspaceCount: number;
  };
}

/**
 * 知识库建构阶段。
 *
 * 基于骨架卡（ai_skeleton）占比划分：
 *  - seedling 幼苗期：骨架卡占比 > 60%，知识库仍以 AI 生成为主
 *  - growing 成长期：骨架卡占比 30%-60%，用户正在主动建构
 *  - mature 成熟期：骨架卡占比 < 30%，建构接近完成
 *
 * @author fxbin
 */
export type ConstructionStage = 'seedling' | 'growing' | 'mature';

/**
 * 知识库建构进度报告。
 *
 * 用于"骨架卡强制建构流程"（P11-1），量化用户认知劳动量，
 * 引导用户从 AI 骨架转向自主建构。
 *
 * @author fxbin
 */
export interface ConstructionProgress {
  workspaceId: string;
  totalCards: number;
  skeletonCards: number;
  confirmedCards: number;
  sourcedCards: number;
  unsupportedCards: number;
  skeletonRatio: number;
  confirmedRatio: number;
  sourcedRatio: number;
  constructionStage: ConstructionStage;
  suggestedAction: string;
}

/**
 * 苏格拉底追问类型，标识 Agent 生成的问题所属的认知追问维度。
 *
 * 设计原则（P11-2 铁律）：
 *  - Agent 只生成提问，不生成答案
 *  - 提问引导用户自己思考，不代写认知
 *  - 镜子不保姆：反映用户当前认知状态，不替代用户建构
 *
 * 五种追问维度：
 *  - definition_clarity 定义澄清：追问概念边界与定义
 *  - evidence_probe 证据追问：追问支撑论断的证据来源
 *  - counterexample_challenge 反例挑战：追问是否存在反例
 *  - boundary_probe 边界追问：追问适用范围与失效条件
 *  - connection_probe 关联追问：追问与其他概念的关系
 *
 * @author fxbin
 */
export type SocraticQuestionType =
  | 'definition_clarity'
  | 'evidence_probe'
  | 'counterexample_challenge'
  | 'boundary_probe'
  | 'connection_probe';

/**
 * 苏格拉底追问触发来源，标识问题生成的上下文。
 *  - skeleton_card 骨架卡待建构时触发
 *  - semantic_tension 语义张力检测到认知冲突时触发
 *  - manual 用户主动请求追问
 * @author fxbin
 */
export type SocraticTrigger = 'skeleton_card' | 'semantic_tension' | 'manual';

/**
 * 单条苏格拉底追问。
 *
 * 注意：rationale 字段是系统内部使用的提问理由（供可审计性），
 * 不应展示给用户作为"答案提示"。question 字段才是展示给用户的问题。
 *
 * @author fxbin
 */
export interface SocraticQuestion {
  question: string;
  type: SocraticQuestionType;
  rationale: string;
  targetCardId?: string;
}

/**
 * 苏格拉底追问结果。
 *
 * @author fxbin
 */
export interface SocraticQuestioningResult {
  workspaceId: string;
  questions: SocraticQuestion[];
  triggerContext: {
    trigger: SocraticTrigger;
    cardId?: string;
    tensionKey?: string;
  };
  generatedAt: string;
}

/**
 * "可能相关"建议项（P10-4）。
 *
 * 基于 Recall Agent 检索结果生成，展示在侧边栏供用户参考。
 * 用户可忽略（dismiss）或否决（reject），这两种操作仅影响前端展示，不持久化。
 *
 * 设计原则：
 *  - 镜子不保姆：只提供检索建议，不替代用户决策
 *  - 提议权不写入权：建议不自动修改任何数据
 *
 * @author fxbin
 */
export interface RelatedSuggestion {
  cardId: string;
  title: string;
  relevanceScore: number;
  recalledBy: string;
  reason: string;
}

/**
 * "可能相关"建议结果（P10-4）。
 *
 * @author fxbin
 */
export interface RelatedSuggestionsResult {
  workspaceId: string;
  currentCardId?: string;
  suggestions: RelatedSuggestion[];
  generatedAt: string;
}

/**
 * Agent 行为类型（P10-5）。
 *
 * 标识 Agent 执行的具体行为类别，用于行为日志审计。
 *  - socratic_questioning 苏格拉底追问
 *  - related_suggestions 可能相关建议
 *  - cross_kb_synthesis 跨库综合
 *  - entity_extraction 实体提取
 *  - knowledge_intake 知识摄入
 *  - material_parse 资料解析
 *  - card_edit 卡片编辑
 *  - conflict_resolve 冲突解决
 * @author fxbin
 */
export type AgentAction =
  | 'socratic_questioning'
  | 'related_suggestions'
  | 'cross_kb_synthesis'
  | 'entity_extraction'
  | 'knowledge_intake'
  | 'material_parse'
  | 'card_edit'
  | 'conflict_resolve';

/**
 * Agent 行为日志记录（P10-5）。
 *
 * 记录每次 Agent 调用的输入、输出、耗时与结果，
 * 供可审计性使用（datasette inspect 能力通过 SQL 导出端点实现）。
 *
 * @author fxbin
 */
export interface AgentActionLog {
  id: string;
  action: AgentAction;
  workspaceId?: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  durationMs: number;
  success: boolean;
  error?: string;
  createdAt: string;
}

/**
 * Agent 行为日志查询结果（P10-5）。
 *
 * @author fxbin
 */
export interface AgentActionLogResult {
  logs: AgentActionLog[];
  total: number;
}

export interface PathStep {
  id: string;
  order: number;
  title: string;
  description: string;
  cardId?: string;
  status: 'completed' | 'current' | 'locked';
  type: CardType | 'general';
}

export interface WorkspacePath {
  workspaceId: string;
  workspaceTitle: string;
  generatedAt: string;
  steps: PathStep[];
  currentStepIndex: number;
  completedCount: number;
}

export interface KnowledgeMapNodePosition {
  nodeId: string;
  x: number;
  y: number;
}

export interface SaveKnowledgeMapNodePositionsRequest {
  positions: KnowledgeMapNodePosition[];
}

/**
 * 自定义地图边（用户手动添加的关系）。
 * @author fxbin
 */
export interface KnowledgeMapCustomEdge {
  id: string;
  workspaceId?: string;
  sourceNodeId: string;
  targetNodeId: string;
  relation: 'supports' | 'contradicts' | 'related_to';
  createdAt: string;
}

/**
 * 添加自定义地图边请求。
 * @author fxbin
 */
export interface AddMapEdgeRequest {
  sourceNodeId: string;
  targetNodeId: string;
  relation: 'supports' | 'contradicts' | 'related_to';
}

/**
 * 证据审计报告（P13-1）。
 *
 * 扫描知识库中所有卡片的溯源状态，分类统计并识别覆盖缺口。
 * 帮助用户发现哪些认知仍停留在 AI 骨架阶段，需要补充证据。
 *
 * @author fxbin
 */
export interface EvidenceAuditReport {
  workspaceId: string;
  generatedAt: string;
  totals: {
    cards: number;
    sourced: number;
    userConfirmed: number;
    skeleton: number;
    unsupported: number;
  };
  sourcedRatio: number;
  gaps: EvidenceGap[];
}

/**
 * 证据覆盖缺口（P13-1）。
 *
 * 按卡片类型分组，识别该类型下骨架卡占比过高的区域。
 *
 * @author fxbin
 */
export interface EvidenceGap {
  cardType: string;
  total: number;
  skeleton: number;
  skeletonRatio: number;
  sampleCardIds: string[];
}

/**
 * 假设检验结果（P13-2）。
 *
 * 用户提交一个假设，系统在知识库中搜索支持与反对的证据，
 * 返回判定和引用卡片。遵循"镜子不保姆"铁律——只呈现证据，不替代用户判断。
 *
 * @author fxbin
 */
export interface HypothesisTestResult {
  workspaceId: string;
  hypothesis: string;
  generatedAt: string;
  verdict: 'supported' | 'contradicted' | 'mixed' | 'insufficient';
  supportingCards: HypothesisEvidence[];
  contradictingCards: HypothesisEvidence[];
  neutralCards: HypothesisEvidence[];
  summary: string;
}

/**
 * 假设检验证据项（P13-2）。
 *
 * @author fxbin
 */
export interface HypothesisEvidence {
  cardId: string;
  title: string;
  preview: string;
  claimStatus: ClaimStatus;
  relevanceScore: number;
}

export function classifyInput(input: string): IntakeKind {
  const value = input.trim();
  if (/https?:\/\//i.test(value)) return 'link';
  if (value.length > 80 || value.includes('\n')) return 'text';
  if (/[?？]|怎么|如何|why|what|how/i.test(value)) return 'question';
  return 'theme';
}

export function detectPlatform(input: string): string | undefined {
  const value = input.toLowerCase();
  if (value.includes('xiaohongshu.com') || value.includes('xhslink.com')) return 'xiaohongshu';
  if (value.includes('douyin.com') || value.includes('iesdouyin.com')) return 'douyin';
  if (/https?:\/\//i.test(value)) return 'web';
  return undefined;
}

/**
 * 注意力信号类型，标识用户在知识库中产生的不同认知行为。
 * - question_card_created 创建问题型卡片（强信号）
 * - manual_layout 手动调整知识地图节点布局（中信号）
 * - ask_question 向知识库提问（中信号）
 * - card_opened 打开卡片查看（弱信号，前端埋点）
 * - cannot_answer 用户反馈"答不上来"（中信号，标识知识盲区）
 * @author fxbin
 */
export type AttentionSignalType = 'question_card_created' | 'manual_layout' | 'ask_question' | 'card_opened' | 'cannot_answer';

/**
 * 注意力信号强度，用于 Recall Agent 检索时加权排序。
 * - strong 高价值认知行为（如主动创建问题卡片）
 * - medium 中等价值认知行为（如提问、手动布局）
 * - weak 低价值行为（如浏览卡片）
 * @author fxbin
 */
export type AttentionSignalStrength = 'strong' | 'medium' | 'weak';

/**
 * 注意力信号的目标类型，标识信号关联的实体类别。
 * - card 知识卡片
 * - material 资料
 * - layout 知识地图布局
 * - question 提问
 * @author fxbin
 */
export type AttentionSignalTargetType = 'card' | 'material' | 'layout' | 'question';

/**
 * 注意力信号记录，供 Recall Agent 检索用户认知建构活动。
 * 存储无关设计：通过 KnowledgeRepository 接口抽象，兼容 SQLite 与未来文件化存储。
 * @author fxbin
 */
export interface AttentionSignal {
  id: string;
  workspaceId?: string;
  signalType: AttentionSignalType;
  signalStrength: AttentionSignalStrength;
  targetType: AttentionSignalTargetType;
  targetId: string;
  contextData: Record<string, unknown>;
  consumed: boolean;
  createdAt: string;
}

/**
 * 兴趣主题项，表示用户近期关注的一个主题词及其权重。
 * @author fxbin
 */
export interface InterestTopic {
  term: string;
  weight: number;
  sourceCount: number;
}

/**
 * 用户兴趣画像，基于近期认知行为（卡片创建、提问、回忆评分等）
 * 构建的滚动兴趣向量，用于主动推荐与盲区检测。
 * @author fxbin
 */
export interface UserInterestProfile {
  windowDays: number;
  topics: InterestTopic[];
  totalSignals: number;
  generatedAt: string;
}

/**
 * 每日关注摘要条目，表示今日新增的一个认知建构项。
 * @author fxbin
 */
export interface DailyDigestItem {
  id: string;
  type: 'card' | 'material' | 'signal';
  title: string;
  workspaceId?: string;
  workspaceTitle?: string;
  createdAt: string;
}

/**
 * 每日关注摘要，由后台调度器每日扫描生成，
 * 汇总过去 24 小时内的新增卡片、材料、注意力信号及兴趣主题。
 * @author fxbin
 */
export interface DailyDigest {
  date: string;
  newCards: DailyDigestItem[];
  newMaterials: DailyDigestItem[];
  newSignals: DailyDigestItem[];
  topInterestTopics: InterestTopic[];
  totalNewItems: number;
  generatedAt: string;
}

/**
 * 主题覆盖热力图单元格，表示某个主题在某个知识库中的覆盖情况。
 * @author fxbin
 */
export interface TopicCoverageCell {
  workspaceId: string;
  workspaceTitle: string;
  cardCount: number;
  materialCount: number;
}

/**
 * 主题覆盖热力图条目，表示一个兴趣主题的覆盖情况及盲区标记。
 * @author fxbin
 */
export interface TopicCoverageItem {
  term: string;
  interestWeight: number;
  totalCards: number;
  totalMaterials: number;
  coverageScore: number;
  isBlindSpot: boolean;
  cells: TopicCoverageCell[];
}

/**
 * 主题覆盖热力图，可视化用户兴趣主题在知识库中的覆盖情况，识别盲区。
 * @author fxbin
 */
export interface TopicCoverageHeatmap {
  topics: TopicCoverageItem[];
  blindSpotCount: number;
  generatedAt: string;
}

/**
 * 重复思考问题组，表示一组语义相似的用户提问。
 * @author fxbin
 */
export interface RepeatedQuestionGroup {
  representativeQuestion: string;
  questions: Array<{
    id: string;
    question: string;
    createdAt: string;
    workspaceId?: string;
  }>;
  similarityScore: number;
  firstAskedAt: string;
  lastAskedAt: string;
  repeatCount: number;
}

/**
 * 重复思考模式检测报告，识别用户是否在重复思考相似问题。
 * @author fxbin
 */
export interface RepeatedThinkingReport {
  groups: RepeatedQuestionGroup[];
  totalRepeatedQuestions: number;
  hasRepetitivePattern: boolean;
  generatedAt: string;
}

/**
 * 阅读行为记录请求，由前端在卡片关闭时上报停留时长。
 * @author fxbin
 */
export interface ReadingSessionRequest {
  cardId: string;
  workspaceId?: string;
  durationMs: number;
}

/**
 * "答不上来"反馈请求，由前端在用户点击反馈按钮时上报。
 * @author fxbin
 */
export interface CannotAnswerFeedbackRequest {
  workspaceId?: string;
  question: string;
}

/**
 * 遗忘衰减条目，表示一张卡片的 recall 分数及归档建议。
 * @author fxbin
 */
export interface RecallDecayItem {
  cardId: string;
  cardTitle: string;
  workspaceId?: string;
  workspaceTitle: string;
  lastAccessedAt: string;
  daysSinceLastAccess: number;
  recallScore: number;
  shouldArchive: boolean;
}

/**
 * 遗忘衰减报告，汇总所有未归档卡片的 recall 分数并标记归档候选。
 * @author fxbin
 */
export interface RecallDecayReport {
  items: RecallDecayItem[];
  totalCards: number;
  archiveCandidateCount: number;
  halfLifeDays: number;
  threshold: number;
  generatedAt: string;
}

/**
 * 遗忘衰减应用结果，记录归档执行的卡片列表与数量。
 * @author fxbin
 */
export interface RecallDecayApplyResult {
  archivedCount: number;
  skippedCount: number;
  archivedCardIds: string[];
}

/**
 * Agent 主动提议类型，标识提议的来源场景。
 * - blind_spot 盲区补充建议（高兴趣低覆盖的主题）
 * - repeated_thinking 重复思考提醒（相似问题反复提问）
 * - recall_review 遗忘复习建议（recall 分数低的卡片）
 * - topic_explore 主题探索建议（高兴趣主题的延伸探索）
 * - workspace_emergence 工作区涌现建议（默认工作区中卡片聚类达到阈值，提议创建命名工作区）
 * @author fxbin
 */
export type AgentProposalType = 'blind_spot' | 'repeated_thinking' | 'recall_review' | 'topic_explore' | 'workspace_emergence';

/**
 * 工作区涌现聚类结果，描述从默认工作区卡片中发现的主题聚类。
 * @author fxbin
 */
export interface WorkspaceEmergenceCluster {
  keyword: string;
  cardIds: string[];
  cardCount: number;
  sampleTitles: string[];
}

/**
 * Agent 主动提议条目，向用户建议下一步认知行动。
 * 守提议权不写入权：Agent 只提议，不直接执行任何写入操作。
 * @author fxbin
 */
export interface AgentProposal {
  type: AgentProposalType;
  title: string;
  description: string;
  actionLabel: string;
  metadata: Record<string, unknown>;
}

/**
 * Agent 主动提议报告，汇总各类提议供前端展示。
 * @author fxbin
 */
export interface AgentProposalReport {
  proposals: AgentProposal[];
  generatedAt: string;
}

/**
 * 回忆工具名称，标识 Recall Agent 使用的四种检索策略。
 * - direct_fetch 精确命中，零成本内存匹配
 * - shallow_recall 浅层回忆，基于 FTS5 + BM25 排序
 * - deep_recall 深层回忆，借助 LLM 语义扩展后检索
 * - topic_exploration 主题探索，基于知识地图邻居遍历
 * @author fxbin
 */
export type RecallToolName = 'direct_fetch' | 'shallow_recall' | 'deep_recall' | 'topic_exploration';

/**
 * 单条回忆结果项，描述被检索到的卡片或资料及其相关性分数。
 * recalledBy 字段用于审计追踪，标识由哪个工具检索到本条目。
 * @author fxbin
 */
export interface RecallResultItem {
  kind: 'card' | 'material';
  id: string;
  workspaceId?: string;
  title: string;
  preview: string;
  relevanceScore: number;
  recalledBy: RecallToolName;
}

/**
 * 单个回忆工具的检索结果集合，包含结果列表与查询元信息。
 * totalFound 为该工具命中的原始条目数（去重前），items 为最终返回项。
 * @author fxbin
 */
export interface RecallResult {
  items: RecallResultItem[];
  tool: RecallToolName;
  query: string;
  totalFound: number;
}
