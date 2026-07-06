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

/**
 * 文件夹导入请求：扫描本地路径下的 .md/.txt 文件批量入库。
 * 不触发 AI 处理，仅入库为 parseStatus='pending' 的资料。
 * @author fxbin
 */
export interface FolderIntakeRequest {
  /** 本地绝对路径，必须存在且是目录 */
  path: string;
  /** 目标工作区 ID，缺省时使用当前选中工作区或 default */
  workspaceId?: string;
}

/**
 * 文件夹导入单条文件结果。
 * @author fxbin
 */
export interface FolderIntakeItem {
  /** 相对于扫描根目录的文件路径 */
  relativePath: string;
  /** 文件名 */
  fileName: string;
  /** 是否成功入库 */
  ok: boolean;
  /** 失败原因（ok=false 时填充） */
  error?: string;
  /** 入库后的 materialId（ok=true 时填充） */
  materialId?: string;
}

/**
 * 文件夹导入汇总结果。
 * @author fxbin
 */
export interface FolderIntakeResult {
  /** 扫描根目录绝对路径 */
  scannedPath: string;
  /** 目标工作区 ID */
  workspaceId: string;
  /** 目标工作区标题 */
  workspaceTitle: string;
  /** 成功入库条数 */
  imported: number;
  /** 跳过条数（如空文件、不支持格式） */
  skipped: number;
  /** 失败条数 */
  failed: number;
  /** 逐条结果 */
  items: FolderIntakeItem[];
}

/**
 * 批量文件导入单条项（前端 webkitdirectory 读取后上传）。
 * @author fxbin
 */
export interface FileBatchIntakeItem {
  /** 文件相对路径（含子目录），如 "notes/ch1.md" */
  relativePath: string;
  /** 文件名 */
  fileName: string;
  /** 文件文本内容（前端已读取） */
  content: string;
}

/**
 * 批量文件导入请求：前端通过 webkitdirectory 选择文件夹后，
 * 读取所有 .md/.txt 文件内容批量上传。
 * @author fxbin
 */
export interface FileBatchIntakeRequest {
  /** 文件列表 */
  items: FileBatchIntakeItem[];
  /** 目标工作区 ID，缺省时使用 default */
  workspaceId?: string;
}

/**
 * 批量文件导入结果（与 FolderIntakeResult 字段对齐，scannedPath 留空）。
 * @author fxbin
 */
export interface FileBatchIntakeResult {
  /** 目标工作区 ID */
  workspaceId: string;
  /** 目标工作区标题 */
  workspaceTitle: string;
  /** 成功入库条数 */
  imported: number;
  /** 跳过条数 */
  skipped: number;
  /** 失败条数 */
  failed: number;
  /** 逐条结果 */
  items: FolderIntakeItem[];
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
  baseUrl?: string;
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
  baseUrl?: string;
  enabled?: boolean;
  fallbackToMock?: boolean;
  clearApiKey?: boolean;
  clearBaseUrl?: boolean;
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
  baseUrl?: string;
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
  baseUrl?: string;
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
  baseUrl?: string;
  enabled?: boolean;
  fallbackToMock?: boolean;
  isDefault?: boolean;
  clearApiKey?: boolean;
  clearBaseUrl?: boolean;
}

export interface TestModelProviderSettingsRequest {
  profileId?: string;
  provider?: string;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
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

/**
 * 资料分页游标，按 (createdAt DESC, id DESC) 排序。
 * 用于 LibraryView 等列表场景的 cursor 分页。
 *
 * @author fxbin
 */
export type MaterialCursor = {
  createdAt: string;
  id: string;
};

/**
 * 资料分页查询参数。
 * cursorCreatedAt / cursorId 同时传入才生效；只传一个会被忽略。
 * limit 缺省时由 core 层兜底默认值。
 *
 * @author fxbin
 */
export type MaterialQueryOptions = {
  workspaceId?: string;
  type?: MaterialType;
  parseStatus?: ParseStatus;
  query?: string;
  cursorCreatedAt?: string;
  cursorId?: string;
  limit?: number;
};

/**
 * 资料分页查询结果。
 * nextCursor 为 null 表示无下一页；hasMore 表示是否还有更多数据。
 *
 * @author fxbin
 */
export type MaterialQueryResult = {
  materials: MaterialRecord[];
  nextCursor: MaterialCursor | null;
  hasMore: boolean;
};

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

export type AgentChatMessageRole = 'user' | 'assistant' | 'tool' | 'system' | 'unknown';

export interface AgentChatMessageRecord {
  id: string;
  sessionId: string;
  workspaceId: string;
  role: AgentChatMessageRole;
  text: string;
  reasoning: string;
  raw: unknown;
  createdAt: string;
  sequence: number;
}

export interface AgentChatToolCallRecord {
  id: string;
  runId: string;
  sessionId: string;
  workspaceId: string;
  toolCallId: string;
  toolName: string;
  args: unknown;
  result: string;
  details?: unknown;
  isError: boolean;
  startedAt: string;
  endedAt: string;
  durationMs: number;
}

export interface AgentChatRunRecord {
  id: string;
  sessionId: string;
  workspaceId: string;
  provider: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  cacheReadTokens: number | null;
  cacheWriteTokens: number | null;
  costUsd: number | null;
  durationMs: number;
  status: 'completed' | 'failed' | 'aborted';
  errorMessage: string | null;
  startedAt: string;
  endedAt: string;
  toolCallCount: number;
}

export interface AgentChatSessionInfo {
  sessionId: string;
  workspaceId: string;
  title: string;
  messageCount: number;
  lastUsedAt: string;
  createdAt: string;
  updatedAt: string;
  provider?: string;
  model?: string;
  lastRun?: AgentChatRunRecord;
}

export interface AgentChatSessionDetail extends AgentChatSessionInfo {
  messages: unknown[];
  messageRecords: AgentChatMessageRecord[];
  runs: AgentChatRunRecord[];
  toolCalls: AgentChatToolCallRecord[];
}

export interface PersistAgentChatTurnRequest {
  session: AgentChatSessionInfo;
  rawMessages: unknown[];
  run: AgentChatRunRecord;
  toolCalls: AgentChatToolCallRecord[];
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

/**
 * Agent 提议的操作类型枚举。
 * 与 ProposedOperation 联合类型中的 op 字段保持同步。
 * @author fxbin
 */
export type ProposedOperationType =
  | 'create_card'
  | 'edit_card'
  | 'archive_card'
  | 'unarchive_card'
  | 'archive_material';

/**
 * Agent 提议的结构化操作。
 *
 * 与 ProposedCard 的区别：ProposedCard 仅支持「新建卡片」一种操作；
 * ProposedOperation 覆盖创建、编辑、归档、取消归档等多种原子变更，
 * 用于流式路径下的 apply diff 能力。
 *
 * 守提议权不写入权：Agent 只产生提议，需用户在前端确认后才会调用
 * 既有原子端点（acceptProposedCards / editCardContent / archiveCard /
 * archiveMaterial / unarchiveCard）落库。
 *
 * @author fxbin
 */
export type ProposedOperation =
  | {
      op: 'create_card';
      type: CardType;
      title: string;
      body: string;
      materialId?: string;
      rationale?: string;
    }
  | {
      op: 'edit_card';
      cardId: string;
      title?: string;
      body?: string;
      type?: CardType;
      rationale?: string;
    }
  | {
      op: 'archive_card';
      cardId: string;
      rationale?: string;
    }
  | {
      op: 'unarchive_card';
      cardId: string;
      rationale?: string;
    }
  | {
      op: 'archive_material';
      materialId: string;
      rationale?: string;
    };

/**
 * 一批 Agent 提议操作，承载于流式 proposal_batch 事件下发到前端。
 * batchId 仅作为审计标识使用，服务端不持久化 batch 状态，
 * 前端在 accept 请求中需重新提交 operations 原文。
 * @author fxbin
 */
export interface ProposalBatch {
  batchId: string;
  proposals: ProposedOperation[];
}

/**
 * 采纳提议操作请求。
 * selectedIndices 为空或省略时采纳全部提议；否则只采纳指定下标的操作。
 * @author fxbin
 */
export interface AcceptProposalBatchRequest {
  operations: ProposedOperation[];
  selectedIndices?: number[];
}

/**
 * 单条提议操作的执行结果。
 * ok=false 时 error 字段承载失败原因；ok=true 时 cardId/materialId
 * 字段承载新建或更新的资源 id，便于前端刷新对应数据。
 * @author fxbin
 */
export interface ProposedOperationResult {
  index: number;
  op: ProposedOperationType;
  ok: boolean;
  error?: string;
  cardId?: string;
  materialId?: string;
}

/**
 * 采纳提议操作的整体响应。
 * results 与请求 operations 数组顺序一致，前端可逐条展示成功/失败状态。
 * @author fxbin
 */
export interface AcceptProposalBatchResponse {
  batchId: string;
  results: ProposedOperationResult[];
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
    visibleMaterials?: number;
    visibleCards?: number;
    hiddenMaterials?: number;
    hiddenCards?: number;
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
    body: string;
    type: CardType;
    claimStatus: ClaimStatus;
    createdAt: string;
  }[];
  mapPreview: {
    nodeCount: number;
    edgeCount: number;
    workspaceCount: number;
    workspaces: GlobalInsightsWorkspacePreview[];
  };
  /**
   * Evidence 飞轮反馈聚合（accept_rate 作为"镜子不保姆"可测量指标）。
   * 基于 agent_action_log 中 accept_proposed_cards 动作聚合。
   */
  evidence: EvidenceFeedback;
}

/**
 * 洞察页单个工作区预览项，用于在「知识地图预览」卡片内
 * 以可点击网格的形式展示，用户点击后进入对应工作区详情。
 *
 * @author fxbin
 */
export interface GlobalInsightsWorkspacePreview {
  id: string;
  title: string;
  cardCount: number;
  sourcedRatio: number;
  stage: WorkspaceStage;
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
 *  - active_suggestion_sent 主动提议下发（P0.3 约束引擎追踪用）
 *  - accept_proposed_cards 用户裁决提议卡片（evidence 飞轮数据源）
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
  | 'conflict_resolve'
  | 'active_suggestion_sent'
  | 'accept_proposed_cards';

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

/**
 * Evidence 飞轮反馈聚合结果。
 *
 * 基于 agent_action_log 中 accept_proposed_cards 动作记录聚合，
 * 作为"镜子不保姆"的可测量指标（accept_rate）。
 * accept_rate = totalAccepted / totalProposed，无数据时为 null。
 *
 * @author fxbin
 */
export interface EvidenceFeedback {
  /** 总提议卡片数 */
  totalProposed: number;
  /** 被接受卡片数 */
  totalAccepted: number;
  /** 被拒绝卡片数（提议但未采纳） */
  totalRejected: number;
  /** 接受率：accepted / totalProposed；无数据时为 null */
  acceptRate: number | null;
}

/**
 * 被拒绝提议卡片的特征偏移。
 *
 * 用于下一轮 socraticQuestioning 注入 negative example，
 * 让 Agent 不再产生类似 rejected 的提问。
 *
 * @author fxbin
 */
export interface RejectedCardFeature {
  /** 卡片类型偏移 */
  type: string;
  /** 标题前缀（前 20 字符，作为聚合维度） */
  titlePrefix: string;
  /** 出现次数 */
  count: number;
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
 * 持久化 Proposal 状态。
 *
 * 状态机流转：
 * - pending → accepted：用户采纳建议（如复习了卡片、补充了盲区）
 * - pending → rejected：用户明确拒绝
 * - pending → dismissed：用户忽略（超时自动 dismiss 或主动关闭）
 * - accepted/rejected/dismissed 为终态，不再流转
 *
 * @author fxbin
 */
export type ProposalStatus = 'pending' | 'accepted' | 'rejected' | 'dismissed';

/**
 * 持久化的 AgentProposal 记录，带 id / 状态 / 时间戳。
 *
 * 与 AgentProposal 的差异：AgentProposal 是临时生成的一次性对象，
 * PersistedProposal 是持久化到 agent_proposals 表的记录，
 * 支持状态机流转与反馈闭环追踪。
 *
 * @author fxbin
 */
export interface PersistedProposal {
  /** 记录主键 */
  id: string;
  /** 工作区 id */
  workspaceId: string;
  /** 提议类型 */
  type: AgentProposalType;
  /** 提议标题 */
  title: string;
  /** 提议描述 */
  description: string;
  /** 行动标签 */
  actionLabel: string;
  /** 元数据（cardId / recallScore / term 等） */
  metadata: Record<string, unknown>;
  /** 当前状态 */
  status: ProposalStatus;
  /** 生成时间 ISO */
  generatedAt: string;
  /** 状态变更时间 ISO；未变更时为 null */
  decidedAt: string | null;
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

/**
 * 编排 Agent 的三种交互模式，对应「镜子不保姆」理念的不同姿态。
 * - mirror 镜子模式（默认）：只呈现、不打扰，被动响应用户提问
 * - catalyst 催化剂模式：主动提问、不替代，用苏格拉底追问引导用户自己得出答案
 * - navigator 导航员模式：主动建议、可操作，生成具体行动建议
 * @author fxbin
 */
export type OrchestratorMode = 'mirror' | 'catalyst' | 'navigator';

/**
 * 体验约束配置，落实「对用户注意力的尊重」这一最高约束。
 * 编排 Agent 在做出主动提议前必须通过约束评估。
 * @author fxbin
 */
export interface ExperienceConstraints {
  /** 每日主动提议上限 */
  maxDailyActiveSuggestions: number;
  /** 两次提议间最小间隔（毫秒） */
  minIntervalBetweenSuggestionsMs: number;
  /** 用户正在编辑时永远不打断 */
  neverInterruptDuringWriting: boolean;
  /** 没有来源时不声称知识 */
  neverClaimKnowledgeWithoutSource: boolean;
  /** 始终提供怀疑模式选项 */
  alwaysOfferSkepticMode: boolean;
}

/**
 * 聚合后的注意力信号摘要，供编排 Agent 做模式选择。
 * @author fxbin
 */
export interface AttentionAggregate {
  /** 最近注意力信号的统一强度评分（0-3） */
  maxStrength: number;
  /** 未消费的强信号数量 */
  unconsumedStrongCount: number;
  /** 最近一条信号的类型 */
  latestSignalType: string;
  /** 当前 Agent 提议的类型列表 */
  proposalTypes: string[];
  /** 是否存在知识盲区提议 */
  hasBlindSpot: boolean;
  /** 是否存在遗忘复习提议 */
  hasRecallReview: boolean;
  /** 聚合时间戳 */
  evaluatedAt: string;
}

/**
 * 编排 Agent 的完整决策结果，包含模式选择、信号摘要和约束评估。
 * @author fxbin
 */
export interface OrchestratorDecision {
  /** 选中的交互模式 */
  mode: OrchestratorMode;
  /** 模式选择的理由（日志可见，P0.1 不做 UI） */
  reason: string;
  /** 信号聚合摘要 */
  aggregate: AttentionAggregate;
  /** 约束评估结果 */
  constraintsPassed: boolean;
  /** 约束未通过时的说明 */
  constraintsReason: string;
  /** 建议的后续行动（催化剂/导航员模式下有值） */
  suggestedAction: string;
  /**
   * 当前模式下应注入到 systemPrompt 的活跃提议列表。
   *
   * P0.2 引入：让 catalyst/navigator 模式拿到具体证据（盲区术语、
   * 复习卡片 id、主题权重等），从而生成有据可依的追问和建议。
   * mirror 模式恒为空数组。
   * @author fxbin
   */
  activeProposals: AgentProposal[];
  /** 决策时间戳 */
  decidedAt: string;
}

/**
 * Agent 事件流前端 wire 格式（紧凑版）。
 *
 * 跨层共享契约：api 层、agent 编排层、web 前端共用此类型。
 *
 * 设计原则：
 * - 仅保留前端渲染所需字段，剔除 partial / history 等大体积数据
 * - 文本以 delta 增量传输（message_delta），message_end 携带最终完整文本
 * - reasoning 以 delta 增量传输（reasoning_delta），前端折叠展示
 * - tool 保留 id/name/args/isError + result 文本摘要，前端可展开查看
 * - mode_update 在 agent_start 后立即下发，前端显示当前编排模式与理由
 * - aux_* 系列承载辅 Agent（probe）输出，前端渲染为「可能还想知道」折叠区
 * - proposal_batch 承载 Agent 提议的结构化操作（create/edit/archive 等），
 *   前端渲染为 apply diff 卡片，用户确认后调用既有原子端点落库
 *
 * @author fxbin
 */
export type AgentStreamEvent =
  | { type: 'session_info'; model: string; provider: string }
  | { type: 'agent_start' }
  | { type: 'agent_end' }
  | { type: 'turn_start' }
  | { type: 'turn_end' }
  | { type: 'message_start' }
  | { type: 'message_delta'; delta: string }
  | { type: 'reasoning_delta'; delta: string }
  | { type: 'message_end'; text: string; usage?: { inputTokens: number | null; outputTokens: number | null; costUsd: number | null } }
  | { type: 'tool_start'; toolCallId: string; toolName: string; args: unknown }
  | { type: 'tool_end'; toolCallId: string; toolName: string; isError: boolean; result: string; details?: unknown }
  | { type: 'mode_update'; mode: string; reason: string; suggestedAction: string }
  | { type: 'aux_start' }
  | { type: 'aux_delta'; delta: string }
  | { type: 'aux_end'; text: string }
  | { type: 'proposal_batch'; batchId: string; proposals: ProposedOperation[] }
  | { type: 'error'; message: string };

/**
 * Agent LLM 调用的任务类型分类。
 *
 * 用于 Provider 路由引擎按任务类型选择最优 Provider/Model 组合。
 * 前六项与 pi-runtime 的 StructuredGenerationRequest.task 对齐，
 * 后三项覆盖对话路径与辅助探查路径。
 *
 * @author fxbin
 */
export type AgentTaskType =
  | 'workspace_skeleton'
  | 'material_summary'
  | 'knowledge_cards'
  | 'question_answer'
  | 'entity_extraction'
  | 'socratic_questioning'
  | 'deep_research'
  | 'roundtable'
  | 'conversation'
  | 'auxiliary_probe'
  | 'recall_deep';

/**
 * AgentTaskType 合法值集合。
 *
 * 用于 API 层做白名单校验，拦截非法 taskType 查询参数。
 * 与 AgentTaskType 联合类型保持同步。
 *
 * @author fxbin
 */
export const AGENT_TASK_TYPE_VALUES: readonly AgentTaskType[] = [
  'workspace_skeleton',
  'material_summary',
  'knowledge_cards',
  'question_answer',
  'entity_extraction',
  'socratic_questioning',
  'deep_research',
  'roundtable',
  'conversation',
  'auxiliary_probe',
  'recall_deep',
];

/**
 * Provider 路由角色。
 *
 * - primary：主力 Provider，承载大部分任务（知径当前为 DeepSeek）
 * - complementary：互补 Provider，仅在 primary 存在短板的特定场景启用
 *
 * @author fxbin
 */
export type ProviderRole = 'primary' | 'complementary';

/**
 * Provider 路由配置项。
 *
 * 描述某个 Provider/Model 组合承担哪些任务类型、承担角色、选择理由，
 * 以及该 Provider 不可用时的 fallback。
 *
 * - provider / model：LLM Provider 与模型 id（string，避免 shared 包依赖 pi-ai）
 * - role：主力或互补
 * - taskTypes：该路由承担的任务类型列表
 * - reason：选择理由，用于审计与 dashboard 展示
 * - fallbackProvider / fallbackModel：该 Provider 不可用时的回退
 *
 * @author fxbin
 */
export interface ProviderRoute {
  provider: string;
  model: string;
  role: ProviderRole;
  taskTypes: AgentTaskType[];
  reason: string;
  fallbackProvider?: string;
  fallbackModel?: string;
}

/**
 * 路由解析结果。
 *
 * routeProvider(taskType) 返回此结构，包含命中的路由与最终生效的 Provider/Model。
 * 当命中 complementary 路由但其 Provider 不可用时，resolved 会回退到 fallback。
 *
 * - route：命中的原始路由配置
 * - resolvedProvider / resolvedModel：最终生效的 Provider/Model（可能为 fallback）
 * - fellBack：是否发生了 fallback
 *
 * @author fxbin
 */
export interface RouteResolution {
  route: ProviderRoute;
  resolvedProvider: string;
  resolvedModel: string;
  resolvedBaseUrl?: string;
  fellBack: boolean;
}

/**
 * Agent LLM 调用成本记录。
 *
 * 每次 completeStructured / streamText / runToolCalling 调用产生一条记录，
 * 用于成本追踪 dashboard 与智能路由策略优化（P2.3）。
 *
 * - workspaceId：工作区 id；对话路径可能为 null（全局调用）
 * - taskType：任务类型，与 AgentTaskType 对齐
 * - provider / model：实际生效的 Provider/Model（含 fallback 后的值）
 * - role：Provider 角色（primary / complementary）
 * - inputTokens / outputTokens / costUsd：token 用量与成本
 * - ok：调用是否成功；false 时 errorMessage 含错误信息
 * - startedAt / durationMs：调用开始时间与耗时
 *
 * @author fxbin
 */
export interface AgentUsageRecord {
  id: string;
  workspaceId: string | null;
  taskType: AgentTaskType;
  provider: string;
  model: string;
  role: ProviderRole;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
  ok: boolean;
  errorMessage: string | null;
  startedAt: string;
  durationMs: number;
}

/**
 * 成本追踪查询过滤条件。
 *
 * - workspaceId：按工作区过滤；省略时查全部
 * - taskType：按任务类型过滤
 * - provider：按 Provider 过滤
 * - since / until：时间范围（ISO 字符串）
 * - limit：返回条数上限
 *
 * @author fxbin
 */
export interface AgentUsageQuery {
  workspaceId?: string;
  taskType?: AgentTaskType;
  provider?: string;
  since?: string;
  until?: string;
  limit?: number;
}

/**
 * 成本追踪聚合结果。
 *
 * 用于 dashboard 展示，按 taskType / provider / role 拆分。
 *
 * @author fxbin
 */
export interface AgentUsageSummary {
  totalCount: number;
  totalCostUsd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  byTaskType: Array<{ taskType: AgentTaskType; count: number; costUsd: number }>;
  byProvider: Array<{ provider: string; count: number; costUsd: number }>;
}

/**
 * Provider 成本对比单项。
 *
 * 用于 P2.3 智能路由策略优化，对比各 Provider 的成功率、平均成本与平均耗时，
 * 辅助判断互补 Provider 是否值得启用。
 *
 * @author fxbin
 */
export interface AgentUsageComparisonItem {
  provider: string;
  totalCalls: number;
  successCount: number;
  failedCount: number;
  successRate: number;
  totalCostUsd: number;
  avgCostUsd: number;
  avgDurationMs: number;
}

/**
 * Provider 成本对比结果。
 *
 * @author fxbin
 */
export interface AgentUsageComparison {
  items: AgentUsageComparisonItem[];
}

/**
 * 路由建议单项评分。
 *
 * 对单个 (taskType, provider) 组合的综合评分，基于 agent_usage 历史数据计算。
 * 评分公式：综合评分 = 成功率 × W_SUCCESS + 速度分 × W_SPEED - 成本分 × W_COST
 * 各权重常量定义在 pi-runtime/advisor.ts 中，默认成功率优先。
 *
 * - samples 不足 MIN_SAMPLES 时返回 score=null，调用方应跳过该候选
 * - 速度分 = avgDurationMs > 0 ? 1 / avgDurationMs : 0（归一化到 0~1）
 * - 成本分 = avgCostUsd（直接相减，成本越低评分越高）
 *
 * @author fxbin
 */
export interface RouteAdvisorScore {
  taskType: AgentTaskType;
  provider: string;
  model: string;
  totalCalls: number;
  successRate: number;
  avgDurationMs: number;
  avgCostUsd: number;
  /** 综合评分；样本不足时为 null */
  score: number | null;
  /** 评分计算使用的权重快照，供透明化展示 */
  weights: { success: number; speed: number; cost: number };
}

/**
 * 路由建议单项结果。
 *
 * 对单个 taskType 给出评分对比 + 建议的 primary provider。
 * 建议仅当存在 score 非 null 的候选时才有效；否则保留 DEFAULT_ROUTES。
 *
 * @author fxbin
 */
export interface RouteAdvisorItem {
  taskType: AgentTaskType;
  /** 所有候选的评分明细（含当前路由 provider 与其他可用 provider） */
  scores: RouteAdvisorScore[];
  /** 建议的 primary provider；无有效候选时为 null */
  suggestedProvider: string | null;
  /** 建议的 model；与 suggestedProvider 配对 */
  suggestedModel: string | null;
  /** 建议理由，供透明化展示与 decision_log 记录 */
  reason: string;
  /** 当前 DEFAULT_ROUTES 中该 taskType 的 primary provider，用于对比 */
  currentProvider: string;
  /** 建议是否与当前路由不同 */
  changed: boolean;
}

/**
 * 路由建议聚合结果。
 *
 * 由 buildRouteAdvisor 对所有 taskType 评分后聚合返回，
 * 供 API 层透明化展示与运维决策参考。
 * 本结果仅作为建议，不会自动覆盖 ACTIVE_ROUTES。
 *
 * @author fxbin
 */
export interface RouteAdvisorResult {
  /** 评分权重快照 */
  weights: { success: number; speed: number; cost: number };
  /** 最小样本数阈值，低于此值的候选不参与建议 */
  minSamples: number;
  /** 各 taskType 的建议明细 */
  items: RouteAdvisorItem[];
  /** 建议发生变更的 taskType 数量（changed=true 的项数） */
  changedCount: number;
  /** 参与评分的 agent_usage 样本总数 */
  totalSamples: number;
}

/**
 * 用户记忆作用域。
 *
 * user_memory 表用于存储跨工作区的用户偏好与画像，
 * 现有表都带 workspace_id 无法表达"全局偏好"，故新增此表。
 *
 * - preference：用户显式表达的偏好（如深度、受众、风格）
 * - profile：用户画像（由 Agent 推断沉淀）
 * - feedback：用户对 Agent 输出的反馈（如"不要再说客套话"）
 *
 * @author fxbin
 */
export type UserMemoryScope = 'preference' | 'profile' | 'feedback';

/**
 * 用户记忆来源。
 *
 * - user_input：用户显式输入
 * - agent_inferred：Agent 推断沉淀（需用户可见可删）
 * - system_default：系统默认值
 *
 * @author fxbin
 */
export type UserMemorySource = 'user_input' | 'agent_inferred' | 'system_default';

/**
 * 用户记忆记录（跨工作区）。
 *
 * 落实"Agent memory must be visible, editable, and deletable by users"原则，
 * 所有用户记忆对用户可见、可编辑、可删除，避免黑盒信任问题。
 *
 * workspaceId 为空表示全局记忆；非空表示特定工作区记忆。
 *
 * @author fxbin
 */
export interface UserMemory {
  id: string;
  scope: UserMemoryScope;
  key: string;
  value: string;
  source: UserMemorySource;
  workspaceId?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 创建用户记忆请求。
 *
 * @author fxbin
 */
export interface CreateUserMemoryRequest {
  scope: UserMemoryScope;
  key: string;
  value: string;
  source?: UserMemorySource;
  workspaceId?: string;
}

/**
 * 更新用户记忆请求。
 *
 * @author fxbin
 */
export interface UpdateUserMemoryRequest {
  value?: string;
  scope?: UserMemoryScope;
}

/**
 * 决策日志类型。
 *
 * decision_log 表用于记录 Agent 的关键决策，强制带证据引用，
 * 落实"知识输出必须带证据"与"Agent memory 必须可见可删"原则。
 *
 * - route_choice：Provider 路由决策
 * - card_accept：用户采纳提议卡片
 * - card_reject：用户否决提议卡片
 * - mode_switch：编排 Agent 模式切换
 * - orchestrator：编排 Agent 其他决策
 *
 * @author fxbin
 */
export type DecisionLogKind = 'route_choice' | 'card_accept' | 'card_reject' | 'mode_switch' | 'orchestrator';

/**
 * 决策日志记录。
 *
 * evidenceCardIds 强制引用 cards.id 作为证据，即使为空也需声明，
 * 用于审计 Agent 决策的证据链可追溯性。
 *
 * @author fxbin
 */
export interface DecisionLog {
  id: string;
  kind: DecisionLogKind;
  workspaceId?: string;
  summary: string;
  reasoning: string;
  evidenceCardIds: string[];
  agentTaskType?: AgentTaskType;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

/**
 * 创建决策日志请求。
 *
 * @author fxbin
 */
export interface CreateDecisionLogRequest {
  kind: DecisionLogKind;
  workspaceId?: string;
  summary: string;
  reasoning: string;
  evidenceCardIds?: string[];
  agentTaskType?: AgentTaskType;
  metadata?: Record<string, unknown>;
}

/**
 * 用户记忆白名单值集合。
 *
 * 用于 API 层做白名单校验。
 *
 * @author fxbin
 */
export const USER_MEMORY_SCOPE_VALUES: readonly UserMemoryScope[] = ['preference', 'profile', 'feedback'];
export const USER_MEMORY_SOURCE_VALUES: readonly UserMemorySource[] = ['user_input', 'agent_inferred', 'system_default'];
export const DECISION_LOG_KIND_VALUES: readonly DecisionLogKind[] = [
  'route_choice',
  'card_accept',
  'card_reject',
  'mode_switch',
  'orchestrator',
];

/**
 * 统计视图可见性等级（反虚荣规范 NS-4）。
 * - hidden 默认隐藏，用户主动查询才展示
 * - passive 被动展示，但不在显眼位置
 * - visible 正常展示
 * - prominent 显著展示（仅对真正对用户决策有用的核心指标开放）
 * @author fxbin
 */
export const STATISTICS_VIEW_VISIBILITY_VALUES = ['hidden', 'passive', 'visible', 'prominent'] as const;
export type StatisticsViewVisibility = typeof STATISTICS_VIEW_VISIBILITY_VALUES[number];

/**
 * 数据隐私等级（反虚荣规范 NS-4 + 用户数据四权）。
 * - public_local 仅本地可见，不参与任何对外聚合
 * - private_only 仅本人可见（默认）
 * - shared_explicit 用户明确同意后参与聚合
 * - disabled 完全关闭采集（受用户关闭权保护）
 * @author fxbin
 */
export const STATISTICS_PRIVACY_TIER_VALUES = ['public_local', 'private_only', 'shared_explicit', 'disabled'] as const;
export type StatisticsPrivacyTier = typeof STATISTICS_PRIVACY_TIER_VALUES[number];

/**
 * 数据账本单项（用户数据四权：知情/导出/删除/关闭）。
 * 每个数据账本单项对应一个原始采集维度（如划线、笔记、重读、停留），
 * 用户可独立控制每个单项的隐私等级。
 * @author fxbin
 */
export interface DataAccountEntry {
  key: string;
  label: string;
  tier: StatisticsPrivacyTier;
  /**
   * 派生指标依赖声明：该项被关闭时影响哪些派生指标
   * 用于降级矩阵（NS-6）的反向查询
   */
  dependentMetrics: string[];
  /**
   * 是否允许导出（数据可携 NS-8 的一部分）
   */
  exportable: boolean;
  updatedAt: string;
}

export interface DataAccountBook {
  entries: DataAccountEntry[];
  /**
   * 全局极简模式（NS-4）：一键关闭所有统计采集
   * 开启后所有 entries 的 tier 强制设为 disabled
   */
  minimalMode: boolean;
  updatedAt: string;
}

/**
 * 四象限类型（NS-1）。
 * - core_reading：核心阅读（在书架 + 深笔记）
 * - commitment_debt：承诺债务（在书架 + 浅/无笔记）
 * - hidden_interest：隐性真兴趣（不在书架 + 深笔记）
 * - irrelevant：无关（不在书架 + 浅/无笔记）
 *
 * @author fxbin
 */
export const QUADRANT_KIND_VALUES = ['core_reading', 'commitment_debt', 'hidden_interest', 'irrelevant'] as const;
export type QuadrantKind = typeof QUADRANT_KIND_VALUES[number];

/**
 * note_depth 计算输入：每本书的基础信号。
 * @author fxbin
 */
export interface BookSignalInputs {
  bookId: string;
  /**
   * 书名（可选，用于前端展示，避免裸显示数字 ID）
   */
  title?: string;
  /**
   * 是否在用户书架（on shelf vs off shelf）
   */
  onShelf: boolean;
  /**
   * 是否已读完（finish_reading 标记）
   */
  finishReading: boolean;
  /**
   * 是否有阅读痕迹（read_update_time 非空，即至少翻开过一次）
   * 用于区分「在书架从未打开」与「在书架翻过但未读完」两种状态
   */
  hasReadActivity: boolean;
  /**
   * 划线条数
   */
  highlightCount: number;
  /**
   * 原创笔记字数（不含想法/便签）
   */
  noteCharCount: number;
  /**
   * 章节数
   */
  chapterCount: number;
  /**
   * 是否有长评（≥500 字原创笔记）
   */
  hasLongReview: boolean;
}

/**
 * note_depth 输出：0-1 标准化深度分。
 */
export interface NoteDepthScore {
  bookId: string;
  /**
   * 原始分（α·划线密度 + β·log 笔记字数 + γ·长评指示）
   */
  raw: number;
  /**
   * 用户自身滚动分位（0-1），null 表示数据不足无法计算
   */
  rollingPercentile: number | null;
  /**
   * 是否判定为「深」（rollingPercentile > τ_note）
   */
  isDeep: boolean;
}

/**
 * 单本书的象限归属结果。
 */
export interface BookQuadrant {
  bookId: string;
  /**
   * 书名（可选，从 BookSignalInputs 透传，用于前端展示）
   */
  title?: string;
  kind: QuadrantKind;
  noteDepth: NoteDepthScore;
  /**
   * 是否推荐种子（Q1 ∪ Q3）
   */
  isRecommendationSeed: boolean;
}

/**
 * 整组统计的四象限汇总（NS-1 PRD 主输出）。
 */
export interface QuadrantSummary {
  coreReading: BookQuadrant[];
  commitmentDebt: BookQuadrant[];
  hiddenInterest: BookQuadrant[];
  irrelevant: BookQuadrant[];
  /**
   * 数据充分性警告：滚动分位不足时为 true
   */
  insufficientData: boolean;
  /**
   * 推荐种子集合：Q1 ∪ Q3
   */
  recommendationSeeds: string[];
  computedAt: string;
}

/**
 * 降级行为枚举（NS-6）。
 *
 * 当用户关闭某个原始采集维度后，依赖该维度的派生指标按置信度走三档降级：
 * - normal        正常展示（置信度充足）
 * - degraded      灰色缺角展示 + tooltip 三要素（置信度不足但仍有部分信号）
 * - hidden        完全隐藏（置信度过低，展示反而误导）
 *
 * 红线：禁止用默认值「悄悄补齐」被关闭的维度。
 *
 * @author fxbin
 */
export const DEGRADE_BEHAVIOR_VALUES = ['normal', 'degraded', 'hidden'] as const;
export type DegradeBehavior = typeof DEGRADE_BEHAVIOR_VALUES[number];

/**
 * 派生指标登记项（NS-6 派生指标登记表）。
 *
 * 每一个派生指标（truly_read_score / quadrant / topic_spectrum / reading_health 等）
 * 都必须在此登记，声明它依赖哪些原始维度、基准置信度是多少。
 *
 * @author fxbin
 */
export interface DerivedMetric {
  /**
   * 派生指标唯一键（蛇形命名，与 data-account-book.dependentMetrics 对齐）
   */
  key: string;
  /**
   * 中文展示名（用于 tooltip / 设置页）
   */
  label: string;
  /**
   * 基准置信度 [0,1]：所有依赖维度都开启时的置信度
   */
  baseConfidence: number;
  /**
   * 依赖的原始维度 key 列表（对应 DataAccountEntry.key）
   */
  requiredDimensions: string[];
}

/**
 * 降级矩阵登记项（NS-6）：派生指标 + 降置信量化参数 + tooltip 三要素模板。
 *
 * 置信度公式：conf = baseConfidence × retentionRatio × gammaFactor
 * - retentionRatio = retainedDimensions / requiredDimensions.length
 * - gammaFactor    数据充分性等附加因子（默认 1.0，由调用方按上下文调整）
 *
 * @author fxbin
 */
export interface DegradeMatrixEntry extends DerivedMetric {
  /**
   * 附加置信因子（数据充分性 / 算法版本 / 样本量等），默认 1.0
   */
  gammaFactor: number;
  /**
   * tooltip 三要素之一：缺失了什么维度（动态拼接模板，占位符 {dims}）
   */
  missingHint: string;
  /**
   * tooltip 三要素之二：为什么这个指标重要
   */
  whyItMatters: string;
  /**
   * tooltip 三要素之三：如何恢复（引导用户回到数据账本开启维度）
   */
  howToRestore: string;
}

/**
 * 单个派生指标的降级评估结果（NS-6 主输出）。
 *
 * 由 assessDegrade 函数计算：输入被关闭的维度集合，输出该指标的当前置信度与降级行为。
 * 前端 DegradeBadge 直接消费本结构。
 *
 * @author fxbin
 */
export interface DegradeAssessment {
  /**
   * 派生指标 key
   */
  metricKey: string;
  /**
   * 仍然开启的依赖维度
   */
  retainedDimensions: string[];
  /**
   * 被关闭的依赖维度
   */
  disabledDimensions: string[];
  /**
   * 保留比 = retainedDimensions / requiredDimensions.length
   */
  retentionRatio: number;
  /**
   * 最终权衡置信度 [0,1]
   */
  confidence: number;
  /**
   * 三档降级行为
   */
  behavior: DegradeBehavior;
  /**
   * tooltip 三要素（按当前缺失维度动态填充后）
   */
  tooltip: {
    whatIsMissing: string;
    whyItMatters: string;
    howToRestore: string;
  };
}

/**
 * 真读过原始信号维度（NS-3）。
 *
 * 描述单本书的客观阅读信号，由 WeRead 书签/笔记 API 聚合而来。
 * rereadCount 与 dwellSeconds 当前 WeRead API 不直接暴露，保留为可选字段，
 * 待后续 API 扩展或代理信号接入后启用。
 *
 * @author fxbin
 */
export interface ReadSignalDims {
  /**
   * 划线总数（WeRead bookmarkCount）
   */
  highlightCount: number;
  /**
   * 笔记正文字符总量（所有 review.content 拼接长度）
   */
  noteCharCount: number;
  /**
   * 长书评正文字符量（独立长评，不计入零散笔记）
   */
  reviewCharCount: number;
  /**
   * 是否存在长书评（字符数超过阈值视为强信号）
   */
  hasLongReview: boolean;
  /**
   * 书籍总章节数（WeRead chapters.length）
   */
  totalChapters: number;
  /**
   * 被划线/笔记覆盖的章节数（去重 chapterUid 计数）
   */
  chaptersCovered: number;
  /**
   * 最后一次阅读活动的时间戳（ms），用于时间衰减
   */
  lastActivityTime: number;
  /**
   * 首次阅读活动的时间戳（ms），用于计算阅读跨度
   */
  firstActivityTime: number;
  /**
   * 重读次数（当前 API 不暴露，可选）
   */
  rereadCount?: number;
  /**
   * 停留时长秒数（当前 API 不暴露，可选）
   */
  dwellSeconds?: number;
}

/**
 * 单条轻校验作答记录（NS-3 主观确认路径）。
 *
 * 轻校验通过分层抽样题（如「这本书第三章你划了哪句？」）确认用户真的读过。
 * 题库契约与抽样逻辑推迟到 S6（NS-7 verification-bank），本结构仅承载作答结果。
 *
 * @author fxbin
 */
export interface VerificationClaim {
  /**
   * 题目 ID（由题库分配，S6 落地）
   */
  questionId: string;
  /**
   * 用户作答内容
   */
  userAnswer: string;
  /**
   * 是否回答正确
   */
  correct: boolean;
  /**
   * 作答时间戳（ms）
   */
  claimedAt: number;
}

/**
 * 一本书的轻校验结果汇总（NS-3）。
 *
 * @author fxbin
 */
export interface LightVerification {
  /**
   * 书籍 ID
   */
  bookId: string;
  /**
   * 全部作答记录
   */
  claims: VerificationClaim[];
  /**
   * 通过率 [0,1] = correctCount / totalQuestions
   */
  passRate: number;
  /**
   * 校验完成时间戳（ms）
   */
  verifiedAt: number;
}

/**
 * 真读过置信度评分结果（NS-3 主输出）。
 *
 * 红线：必须输出置信度 N%（[0,1] 浮点），禁止输出布尔值「读过/没读过」。
 * 前端必须展示 N%，不得四舍五入为二元判断。
 *
 * @author fxbin
 */
export interface TrulyReadScore {
  /**
   * 书籍 ID
   */
  bookId: string;
  /**
   * 最终置信度 [0,1]，前端展示为 N%
   */
  confidence: number;
  /**
   * 客观分（加权四维归一化后）[0,1]
   */
  objectiveRaw: number;
  /**
   * 主观校验通过率 [0,1]（无校验时为 0）
   */
  subjectiveRate: number;
  /**
   * 时间衰减因子 (0,1]（越近期越接近 1）
   */
  timeDecayFactor: number;
  /**
   * 降级置信度 [0,1]（来自降级矩阵，默认 1.0）
   */
  degradeConfidence: number;
  /**
   * 分维度拆解（用于前端展示评分构成）
   */
  dimBreakdown: {
    highlight: number;
    note: number;
    review: number;
    coverage: number;
  };
  /**
   * 关联的轻校验结果（可选，未校验时为 undefined）
   */
  verification?: LightVerification;
  /**
   * 评分计算时间戳（ms）
   */
  computedAt: number;
}

/**
 * 单本书的阅读信号档案（NS-3 评分输入）。
 *
 * @author fxbin
 */
export interface ReadSignalProfile {
  /**
   * 书籍 ID
   */
  bookId: string;
  /**
   * 原始信号维度
   */
  dims: ReadSignalDims;
  /**
   * 该用户历史所有书籍的信号统计，用于滚动分位（可选）
   */
  history?: {
    highlightCounts: number[];
    noteCharCounts: number[];
  };
}

/**
 * 主题谱聚类算法标识（NS-2）。
 *
 * - tfidf：TF-IDF 加权 + k-means 基线（默认）
 * - lda：LDA 概率主题模型（升级闸门通过后启用，Node 端暂缺成熟库，当前留接口）
 */
export const TOPIC_ALGORITHM_VALUES = ['tfidf', 'lda'] as const;

/**
 * 主题谱使用的算法类型（NS-2）。
 */
export type TopicAlgorithm = (typeof TOPIC_ALGORITHM_VALUES)[number];

/**
 * 主题稳定性三档等级（NS-2）。
 *
 * stable / borderline / unstable，由划线数量、时间跨度、轮廓系数三条件共同判定。
 */
export const TOPIC_STABILITY_VALUES = ['stable', 'borderline', 'unstable'] as const;

/**
 * 主题稳定性等级（NS-2）。
 */
export type TopicStabilityLevel = (typeof TOPIC_STABILITY_VALUES)[number];

/**
 * 主题可辨认性状态（NS-7 逐主题自检）。
 *
 * 与 S5 的 LDA 全局闸门正交：全局闸门决定 algorithm=tfidf|lda，
 * 逐主题自检决定单个 cluster 是否可公开展示。
 */
export const RECOGNITION_STATUS_VALUES = ['confirmed', 'pending'] as const;

/**
 * 主题可辨认性等级（NS-7）。
 */
export type RecognitionStatus = (typeof RECOGNITION_STATUS_VALUES)[number];

/**
 * 单个主题簇（NS-2）。
 *
 * 一个簇代表一组语义相近的划线，包含代表词、原始划线索引与 coherence 评分，
 * 供前端「点开看原始划线和代表句」使用。
 *
 * NS-7 追加 recognitionStatus 可选字段：未参与自检时缺省，参与自检后必填。
 */
export interface TopicCluster {
  /** 主题簇 ID（从 0 开始，全局唯一） */
  id: number;
  /** 主题标签（代表词拼接而成，用于图例与摘要） */
  label: string;
  /** 代表词列表（按 TF-IDF 权重降序，取前若干） */
  representativeTerms: string[];
  /** 该簇包含的划线数量 */
  highlightCount: number;
  /** 该簇包含的划线 ID 列表（前端据此展开原始划线） */
  highlightIds: string[];
  /** 该簇内部的 coherence 一致性评分 [0,1] */
  coherenceScore: number;
  /** 该簇在图表中的颜色（调色板索引或十六进制色值） */
  color: string;
  /** 可辨认性状态（NS-7 自检后填充；confirmed 可公开展示，pending 需人工确认或合并） */
  recognitionStatus?: RecognitionStatus;
}

/**
 * 时间轴单个滑动窗口的主题分布（NS-2 堆叠面积图数据点）。
 *
 * 不使用「年」一刀切，而是按月滑动窗口聚合，避免跨年假信号。
 */
export interface TopicTimelinePoint {
  /** 窗口起始时间（毫秒时间戳） */
  windowStart: number;
  /** 窗口结束时间（毫秒时间戳） */
  windowEnd: number;
  /** 窗口可读标签（如 "2024-03"） */
  windowLabel: string;
  /** 各主题簇在该窗口内的划线数量分布（键为簇 ID） */
  distribution: Record<number, number>;
}

/**
 * 主题稳定性评估结果（NS-2）。
 *
 * 三条件同真判 stable，部分满足判 borderline，大量不足判 unstable（标注「仅供参考」）。
 */
export interface TopicStability {
  /** 稳定性等级 */
  level: TopicStabilityLevel;
  /** 轮廓系数（衡量簇间分离度，越大越稳定） */
  silhouetteScore: number;
  /** 参与聚类的划线总数 */
  highlightCount: number;
  /** 划线时间跨度（月） */
  monthSpan: number;
  /** 三档评级理由（逐条说明各条件是否满足） */
  reasons: string[];
}

/**
 * 完整主题谱（NS-2 核心输出）。
 *
 * 主题演变谱的端到端产物，包含聚类结果、时间轴分布、稳定性评估与 LDA 升级闸门状态，
 * 是堆叠面积图与「待确认」标注的唯一数据源。
 */
export interface TopicSpectrum {
  /** 书籍 ID（单本分析）或 'all'（全书架聚合） */
  bookId: string;
  /** 实际使用的聚类算法 */
  algorithm: TopicAlgorithm;
  /** 主题簇列表（按 highlightCount 降序） */
  clusters: TopicCluster[];
  /** 时间轴分布（堆叠面积图数据，按 windowStart 升序） */
  timeline: TopicTimelinePoint[];
  /** 全局 coherence 评分（所有簇的加权均值） */
  coherenceScore: number;
  /** 稳定性评估 */
  stability: TopicStability;
  /** LDA 升级闸门是否通过（未通过则停留 TF-IDF 基线） */
  ldaGatePassed: boolean;
  /** 滑动窗口月数（默认 3） */
  windowMonths: number;
  /** 参与分析的划线总数 */
  totalHighlights: number;
  /** 计算时间戳（毫秒） */
  computedAt: number;
}

/**
 * 轻校验题目类型（NS-7）。
 *
 * - sampling：从划线/笔记中分层抽样生成选择题（如「第三章你划了哪句？」）
 * - marking：要求用户标记自己划过的内容并附理由（防作弊两层约束）
 */
export const VERIFICATION_KIND_VALUES = ['sampling', 'marking'] as const;

/**
 * 轻校验题目类型枚举（NS-7）。
 */
export type VerificationKind = (typeof VERIFICATION_KIND_VALUES)[number];

/**
 * 单道轻校验题目（NS-7）。
 *
 * 形状与 S4 LightVerifyDialog 的 props 对齐：questionId/prompt/options/expectedAnswer。
 * 追加 kind/chapterRef/minReasonLength 用于防作弊约束与 UI 提示。
 */
export interface VerificationQuestion {
  /** 题目 ID（确定性生成，便于幂等） */
  questionId: string;
  /** 题目类型 */
  kind: VerificationKind;
  /** 题干 */
  prompt: string;
  /** 选项（sampling 选择题提供） */
  options?: string[];
  /** 正确答案（与 options 元素匹配，或文本题的参考答案） */
  expectedAnswer?: string;
  /** 章节引用（如「第三章」，分层抽样的定位信息） */
  chapterRef?: string;
  /** marking 题要求的最小理由字数（默认 10，对应 PRD「附≥10字理由」） */
  minReasonLength?: number;
}

/**
 * 轻校验题库输出（NS-7）。
 *
 * 上限两道（抽样问 + 标记），通过一次后该书永久获覆盖权。
 */
export interface VerificationBankResult {
  /** 书籍 ID */
  bookId: string;
  /** 生成的题目（≤ maxQuestions） */
  questions: VerificationQuestion[];
  /** 题目上限（PRD 约束：最多两道） */
  maxQuestions: number;
  /** 抽样池大小（参与抽样的有效划线数） */
  sourceHighlights: number;
  /** 生成时间戳（毫秒） */
  generatedAt: number;
}

/**
 * 单道题的作答记录（NS-7）。
 */
export interface VerificationAttempt {
  /** 对应题目 ID */
  questionId: string;
  /** 题目类型 */
  kind: VerificationKind;
  /** 用户作答 */
  userAnswer: string;
  /** 附注理由（marking 题） */
  reason?: string;
  /** 是否通过（答案匹配 + 防作弊约束达标） */
  correct: boolean;
  /** 作答时间戳（毫秒） */
  claimedAt: number;
}

/**
 * 轻校验覆盖权状态（NS-7）。
 *
 * PRD：通过一次轻校验后，该书永久获得「真读过」覆盖权，不反复考核。
 */
export interface VerificationCoverage {
  /** 书籍 ID */
  bookId: string;
  /** 是否已获永久覆盖权 */
  verified: boolean;
  /** 获权时间戳（毫秒，未获权则缺省） */
  verifiedAt?: number;
  /** 累计通过题数 */
  passedCount: number;
  /** 累计尝试次数 */
  attempts: number;
}

/**
 * 极简模式功能处置方式（NS-7）。
 *
 * 红线「数据静默 ≠ 数据剥夺」：
 * - retained：核心功能保留（阅读器、书架、原始划线知情权）
 * - silenced：派生指标静默（统计、推荐、排行、年度回望）
 */
export const MINIMAL_FEATURE_DISPOSITION_VALUES = ['retained', 'silenced'] as const;

/**
 * 极简模式功能处置枚举（NS-7）。
 */
export type MinimalFeatureDisposition = (typeof MINIMAL_FEATURE_DISPOSITION_VALUES)[number];

/**
 * 极简模式单条功能契约（NS-7）。
 */
export interface MinimalFeatureEntry {
  /** 功能标识（如 reader、shelf、topic_spectrum） */
  featureKey: string;
  /** 功能展示名 */
  label: string;
  /** 处置方式 */
  disposition: MinimalFeatureDisposition;
  /** 处置理由（向用户解释为何保留/静默） */
  reason: string;
}

/**
 * 极简模式状态快照（NS-7）。
 */
export interface MinimalFeatureState {
  /** 极简模式是否启用 */
  enabled: boolean;
  /** 功能集契约清单 */
  features: MinimalFeatureEntry[];
  /** 更新时间戳（毫秒） */
  updatedAt: number;
}

/**
 * 隐性真兴趣提示模式（NS-8）。
 * - banner_24h：轻量横幅提示（首次发现 Q3 后展示，可关闭）
 * - annual_review：年度回望汇总（推迟实现，当前仅占位）
 * - permanently_disabled：用户已永久关闭提示
 */
export const HIDDEN_INTEREST_HINT_MODE_VALUES = ['banner_24h', 'annual_review', 'permanently_disabled'] as const;
export type HiddenInterestHintMode = typeof HIDDEN_INTEREST_HINT_MODE_VALUES[number];

/**
 * 隐性真兴趣代表书目（NS-8）：从 Q3 中选出的高 noteDepth 代表。
 */
export interface HiddenInterestBook {
  bookId: string;
  title: string;
  /** 笔记深度原始分（取自 NoteDepthScore.raw） */
  noteDepthRaw: number;
  /** 是否判定为深读（取自 NoteDepthScore.isDeep） */
  isDeep: boolean;
}

/**
 * 隐性真兴趣提示结果（NS-8）：四象限 Q3 数据 + 频率控制 + 永久关闭状态。
 */
export interface HiddenInterestHint {
  /** 是否应当展示提示 */
  shouldShow: boolean;
  /** 当前提示模式 */
  mode: HiddenInterestHintMode;
  /** Q3 书籍总数 */
  totalCount: number;
  /** 代表书目（noteDepth 最高的 1 本） */
  representativeBook: HiddenInterestBook | null;
  /** 提示理由（向用户解释为何推荐关注） */
  reason: string;
}

/**
 * 隐性真兴趣提示持久化状态（NS-8）。
 */
export interface HiddenInterestState {
  /** 是否永久关闭 */
  permanentlyDismissed: boolean;
  /** 上次展示时间戳（毫秒，0 表示从未展示） */
  lastShownAt: number;
  /** 已被用户单本忽略的书籍 ID 列表 */
  dismissedBookIds: string[];
  /** 更新时间戳（毫秒） */
  updatedAt: number;
}

/**
 * 数据可携导出格式（NS-8）。
 */
export const DATA_PORTABILITY_FORMAT_VALUES = ['json', 'markdown'] as const;
export type DataPortabilityFormat = typeof DATA_PORTABILITY_FORMAT_VALUES[number];

/**
 * 数据可携算法版本记录（NS-8）：向用户声明产出了哪些派生指标、用了什么算法。
 */
export interface DataPortabilityAlgorithmVersion {
  /** 指标/算法名称（如 truly_read_score、topic_spectrum） */
  name: string;
  /** 版本号（如 v1、sm2-lite） */
  version: string;
}

/**
 * 数据可携说明书（NS-8）：随导出数据附带的元信息清单。
 */
export interface DataPortabilityManifest {
  /** 生成时间戳（毫秒） */
  generatedAt: number;
  /** 算法版本清单 */
  algorithmVersions: DataPortabilityAlgorithmVersion[];
  /** 原始信号源 key 列表（对应 DataAccountEntry.key） */
  signalSources: string[];
  /** 派生指标 key 列表（对应 DegradeMatrixEntry.metricKey） */
  derivedMetrics: string[];
  /** 数据账本条目总数 */
  dataAccountEntries: number;
  /** 微信读书书籍总数 */
  bookCount: number;
}

/**
 * 数据可携导出记录（NS-8）：一次导出操作的结果 + 30 天撤回窗口。
 *
 * 与 D3 ExportRecord 的区别：ExportRecord 导出知识库内容（卡片/产物），
 * DataPortabilityRecord 导出用户统计数据画像（信号+派生指标+算法版本+说明书）。
 */
export interface DataPortabilityRecord {
  /** 记录 ID */
  id: string;
  /** 导出格式 */
  format: DataPortabilityFormat;
  /** 数据说明书 */
  manifest: DataPortabilityManifest;
  /** 文件名 */
  filename: string;
  /** 导出内容预览（截断，用于历史列表展示） */
  contentPreview: string;
  /** 创建时间戳（毫秒） */
  createdAt: number;
  /** 撤回截止时间戳（毫秒，createdAt + 30 天） */
  revokeDeadline: number;
  /** 已撤回时间戳（毫秒，null 表示未撤回） */
  revokedAt: number | null;
}

/**
 * 受众分层（NS-8）：基于信号丰富度自动判定的用户档位。
 * - novice：新手（信号稀疏，默认隐藏复杂统计）
 * - regular：常规用户
 * - power：重度用户（信号丰富，默认展示全部统计）
 */
export const AUDIENCE_TIER_VALUES = ['novice', 'regular', 'power'] as const;
export type AudienceTier = typeof AUDIENCE_TIER_VALUES[number];

/**
 * 受众档案（NS-8）：同一架构 + 不同默认参数 + 渐进解锁。
 */
export interface AudienceProfile {
  /** 当前档位 */
  tier: AudienceTier;
  /** 该档位的信号阈值（划线总数） */
  signalThreshold: number;
  /** 该档位默认可见的功能 featureKey 列表 */
  visibleFeatures: string[];
  /** 该档位默认隐藏的功能 featureKey 列表 */
  hiddenFeatures: string[];
  /** 档位判定理由 */
  reason: string;
}

/**
 * 阅读模式状态（NS-8）：当前档位 + 可临时回退到更低档位（30 天自动恢复）。
 */
export interface ReaderModeState {
  /** 当前生效档位 */
  currentTier: AudienceTier;
  /** 临时回退到的档位（null 表示无回退） */
  tempRollbackTier: AudienceTier | null;
  /** 临时回退截止时间戳（毫秒，null 表示无回退） */
  tempRollbackDeadline: number | null;
  /** 更新时间戳（毫秒） */
  updatedAt: number;
}

/** 推荐实验桶标识（NS-5）。control 为现有三策略逻辑，treatment 为 Q1∪Q3 种子优先。 */
export const RECOMMENDATION_BUCKET_VALUES = ['control', 'treatment'] as const;
/** 推荐实验桶类型 */
export type RecommendationBucket = typeof RECOMMENDATION_BUCKET_VALUES[number];
