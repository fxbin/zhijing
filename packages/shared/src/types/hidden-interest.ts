/**
 * 极简模式与隐性真兴趣类型（NS-7 + NS-8）。
 *
 * 包含极简模式功能处置、隐性真兴趣提示模式、代表书目、
 * 提示结果与持久化状态。红线：「数据静默 ≠ 数据剥夺」。
 *
 * @author fxbin
 */

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
