/**
 * 饱和函数（NS-3 天花板效应解决方案）。
 *
 * 圆桌 R3 共识：林深级账号 5269 条划线，若用线性归一化会瞬间触顶 100%，
 * 导致「读了 50 本深度书」和「翻了 200 本流水书」无法区分。
 *
 * 饱和函数将原始值压缩到 [0,1)，使得：
 * - 低值区域近似线性增长（新手友好）
 * - 高值区域逐渐逼近 1（天花板效应消除，但保留排序信息）
 *
 * 采用 Michaelis-Menten 型饱和：score = value / (value + tau)
 * - tau = 半饱和常数：当 value = tau 时 score = 0.5
 * - value → ∞ 时 score → 1（永不触顶）
 * - value = 0 时 score = 0
 *
 * @author fxbin
 */

/**
 * 划线维度半饱和常数：30 条划线 → score = 0.5。
 */
export const SATURATE_TAU_HIGHLIGHT = 30;

/**
 * 笔记维度半饱和常数：500 字符 → score = 0.5。
 * 笔记权重最高，阈值设得比划线更严格，鼓励真实写作。
 */
export const SATURATE_TAU_NOTE = 500;

/**
 * 长书评维度半饱和常数：800 字符 → score = 0.5。
 */
export const SATURATE_TAU_REVIEW = 800;

/**
 * 长书评判定阈值：单条评论超过 300 字符视为长书评（强信号直接 1.0）。
 */
export const LONG_REVIEW_CHAR_THRESHOLD = 300;

/**
 * 通用饱和函数：score = value / (value + tau)。
 *
 * @param value 原始非负值
 * @param tau   半饱和常数（正值）
 * @returns 饱和后分数 [0,1)
 */
export function saturate(value: number, tau: number): number {
  const safeValue = Math.max(0, value);
  const safeTau = Math.max(1, tau);
  return safeValue / (safeValue + safeTau);
}

/**
 * 划线维度饱和（使用 SATURATE_TAU_HIGHLIGHT）。
 */
export function saturateHighlight(highlightCount: number): number {
  return saturate(highlightCount, SATURATE_TAU_HIGHLIGHT);
}

/**
 * 笔记维度饱和（使用 SATURATE_TAU_NOTE）。
 */
export function saturateNote(noteCharCount: number): number {
  return saturate(noteCharCount, SATURATE_TAU_NOTE);
}

/**
 * 长书评维度饱和：hasLongReview 为真时直接返回 1.0，否则按字符数饱和。
 */
export function saturateReview(
  reviewCharCount: number,
  hasLongReview: boolean,
): number {
  if (hasLongReview) return 1;
  return saturate(reviewCharCount, SATURATE_TAU_REVIEW);
}

/**
 * 章节覆盖率：chaptersCovered / totalChapters，截断到 [0,1]。
 */
export function computeCoverage(
  chaptersCovered: number,
  totalChapters: number,
): number {
  const safeTotal = Math.max(1, totalChapters);
  const ratio = Math.max(0, chaptersCovered) / safeTotal;
  return Math.min(1, ratio);
}
