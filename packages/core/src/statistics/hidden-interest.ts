/**
 * 隐性真兴趣提示契约（NS-8）。
 *
 * 从四象限 Q3（不在书架但笔记深度较高）提取代表书目，
 * 结合用户持久化状态（永久关闭 / 已忽略单本 / 上次展示时间）决定是否提示。
 *
 * 设计要点：
 * - Q3 数据源由 quadrant.ts 产出，本模块不重复计算象限；
 * - 频率控制：banner_24h 模式下，距上次展示不足窗口期则不展示；
 * - 永久关闭优先级最高，一经关闭不再展示（除非用户主动重置）。
 *
 * @module statistics/hidden-interest
 * @author fxbin
 */

import type {
  BookQuadrant,
  HiddenInterestBook,
  HiddenInterestHint,
  HiddenInterestHintMode,
  HiddenInterestState,
  QuadrantSummary,
} from '@zhijing/shared';

/**
 * banner_24h 模式的最小展示间隔（毫秒）。
 * 命名为 24h 但实际取 24 小时，避免高频打扰。
 */
const BANNER_MIN_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * 内容预览最大字符数。
 */
const PREVIEW_MAX_CHARS = 120;

/**
 * 从 Q3 候选列表中选出 noteDepth.raw 最高的代表书目。
 * 若存在同分，优先取 rollingPercentile 更高者，保证代表性强。
 *
 * @param candidates Q3 书籍列表（hiddenInterest）
 * @returns 代表书目，候选为空时返回 null
 */
export function selectRepresentativeBook(
  candidates: readonly BookQuadrant[],
): HiddenInterestBook | null {
  if (candidates.length === 0) return null;
  const sorted = [...candidates].sort((a, b) => {
    if (b.noteDepth.raw !== a.noteDepth.raw) return b.noteDepth.raw - a.noteDepth.raw;
    const bp = b.noteDepth.rollingPercentile ?? 0;
    const ap = a.noteDepth.rollingPercentile ?? 0;
    return bp - ap;
  });
  const top = sorted[0];
  return {
    bookId: top.bookId,
    title: top.title ?? top.bookId,
    noteDepthRaw: top.noteDepth.raw,
    isDeep: top.noteDepth.isDeep,
  };
}

/**
 * 构造隐性真兴趣提示结果。
 *
 * 判定逻辑：
 * 1. permanentlyDismissed 为真 → shouldShow=false，mode=permanently_disabled；
 * 2. Q3 为空 → shouldShow=false，mode=banner_24h（无内容可提示）；
 * 3. 距上次展示不足 24h → shouldShow=false；
 * 4. 其余情况 → shouldShow=true，返回代表书目。
 *
 * @param quadrant 四象限汇总（含 Q3 hiddenInterest 列表）
 * @param state 用户持久化状态
 * @param now 当前时间戳（毫秒）
 * @returns 提示结果
 */
export function buildHiddenInterestHint(
  quadrant: QuadrantSummary,
  state: HiddenInterestState,
  now: number,
): HiddenInterestHint {
  if (state.permanentlyDismissed) {
    return {
      shouldShow: false,
      mode: 'permanently_disabled',
      totalCount: quadrant.hiddenInterest.length,
      representativeBook: null,
      reason: '用户已永久关闭隐性真兴趣提示。',
    };
  }

  const filtered = quadrant.hiddenInterest.filter(
    (book) => !state.dismissedBookIds.includes(book.bookId),
  );

  if (filtered.length === 0) {
    return {
      shouldShow: false,
      mode: 'banner_24h',
      totalCount: quadrant.hiddenInterest.length,
      representativeBook: null,
      reason: '暂无未被忽略的隐性真兴趣书目。',
    };
  }

  const mode: HiddenInterestHintMode = 'banner_24h';
  const withinInterval =
    state.lastShownAt > 0 && now - state.lastShownAt < BANNER_MIN_INTERVAL_MS;
  if (withinInterval) {
    return {
      shouldShow: false,
      mode,
      totalCount: filtered.length,
      representativeBook: selectRepresentativeBook(filtered),
      reason: '距上次提示不足 24 小时，暂不重复展示。',
    };
  }

  return {
    shouldShow: true,
    mode,
    totalCount: filtered.length,
    representativeBook: selectRepresentativeBook(filtered),
    reason: `发现 ${filtered.length} 本不在书架但笔记深度较高的书目，或值得正式纳入阅读计划。`,
  };
}

/**
 * 记录单本忽略，返回更新后的状态（不可变）。
 *
 * @param state 当前状态
 * @param bookId 被忽略的书籍 ID
 * @param now 当前时间戳（毫秒）
 * @returns 更新后的状态
 */
export function applyHiddenInterestDismissal(
  state: HiddenInterestState,
  bookId: string,
  now: number,
): HiddenInterestState {
  if (state.dismissedBookIds.includes(bookId)) return state;
  return {
    ...state,
    dismissedBookIds: [...state.dismissedBookIds, bookId],
    updatedAt: now,
  };
}

/**
 * 标记永久关闭，返回更新后的状态（不可变）。
 *
 * @param state 当前状态
 * @param dismissed 是否关闭（false 时表示重置为重新开启）
 * @param now 当前时间戳（毫秒）
 * @returns 更新后的状态
 */
export function applyPermanentDismissal(
  state: HiddenInterestState,
  dismissed: boolean,
  now: number,
): HiddenInterestState {
  return {
    ...state,
    permanentlyDismissed: dismissed,
    updatedAt: now,
  };
}

/**
 * 标记本次已展示（更新 lastShownAt），返回更新后的状态（不可变）。
 *
 * @param state 当前状态
 * @param now 展示时间戳（毫秒）
 * @returns 更新后的状态
 */
export function markHintShown(
  state: HiddenInterestState,
  now: number,
): HiddenInterestState {
  return {
    ...state,
    lastShownAt: now,
    updatedAt: now,
  };
}

/**
 * 截取内容预览，超出长度以省略号收尾。
 *
 * @param content 原始内容
 * @returns 截断后的预览
 */
export function buildContentPreview(content: string): string {
  if (content.length <= PREVIEW_MAX_CHARS) return content;
  return `${content.slice(0, PREVIEW_MAX_CHARS)}…`;
}
