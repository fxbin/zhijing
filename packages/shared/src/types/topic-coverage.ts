/**
 * 主题覆盖与重复思考类型。
 *
 * 包含主题覆盖热力图、重复问题检测、阅读行为记录、
 * "答不上来"反馈，以及遗忘衰减报告相关类型。
 *
 * @author fxbin
 */

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
