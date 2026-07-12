/**
 * 真读过评分类型（NS-3）。
 *
 * 包含阅读信号维度、轻校验作答记录、轻校验结果汇总、
 * 真读过置信度评分与阅读信号档案。
 * 红线：必须输出置信度 N%，禁止输出布尔值「读过/没读过」。
 *
 * @author fxbin
 */

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
