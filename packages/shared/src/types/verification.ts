/**
 * 轻校验题库类型（NS-7）。
 *
 * 包含题目类型、题目结构、题库输出、作答记录与覆盖权状态。
 * 通过一次轻校验后，该书永久获得「真读过」覆盖权，不反复考核。
 *
 * @author fxbin
 */

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
