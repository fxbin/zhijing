/**
 * 微信读书四象限类型（NS-1）。
 *
 * 包含四象限分类、书籍信号输入、笔记深度评分与象限汇总结果。
 * 用于区分"核心阅读/承诺债务/隐性真兴趣/无关"四类书籍。
 *
 * @author fxbin
 */

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
