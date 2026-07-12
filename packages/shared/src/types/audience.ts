/**
 * 受众分层与推荐实验桶类型（NS-8）。
 *
 * 包含受众分层、受众档案、阅读模式状态与推荐实验桶标识。
 * 同一架构 + 不同默认参数 + 渐进解锁。
 *
 * @author fxbin
 */

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
