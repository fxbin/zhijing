/**
 * 新手 vs 重度受众适配契约（NS-8）。
 *
 * 同一套统计架构，按信号丰富度自动判定用户档位，
 * 不同档位采用不同默认参数（可见功能集），
 * 支持临时回退到更低档位（30 天自动恢复）。
 *
 * 设计原则：
 * - 渐进解锁：信号积累到阈值自动升级档位，展示更多统计；
 * - 可临时回退：重度用户可手动切回新手视角，30 天后自动恢复，避免永久降级；
 * - 档位与极简模式正交：极简模式是功能开关，档位是默认参数差异。
 *
 * @module statistics/audience-adapter
 * @author fxbin
 */

import type {
  AudienceProfile,
  AudienceTier,
  ReaderModeState,
} from '@zhijing/shared';

/**
 * 新手档位信号阈值（划线总数）：低于此值判定为 novice。
 */
export const NOVICE_SIGNAL_THRESHOLD = 50;

/**
 * 重度档位信号阈值（划线总数）：达到或超过此值判定为 power。
 * 区间 [NOVICE_SIGNAL_THRESHOLD, POWER_SIGNAL_THRESHOLD) 为 regular。
 */
export const POWER_SIGNAL_THRESHOLD = 200;

/**
 * 临时回退窗口时长（毫秒）：30 天。
 * 与数据可携撤回窗口对齐，保持一致的「可逆操作」心智模型。
 */
export const READER_MODE_ROLLBACK_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * 新手档位默认可见功能集：保留基础阅读 + 直观的四象限，
 * 隐藏依赖多维度或概念较重的派生统计。
 */
const NOVICE_VISIBLE_FEATURES: readonly string[] = [
  'reader',
  'shelf',
  'raw_highlight',
  'raw_note',
  'quadrant',
];

/**
 * 新手档位默认隐藏功能集。
 */
const NOVICE_HIDDEN_FEATURES: readonly string[] = [
  'truly_read_score',
  'topic_spectrum',
  'reading_health',
];

/**
 * 常规用户默认可见功能集：在 novice 基础上解锁真读过与主题谱。
 */
const REGULAR_VISIBLE_FEATURES: readonly string[] = [
  'reader',
  'shelf',
  'raw_highlight',
  'raw_note',
  'quadrant',
  'truly_read_score',
  'topic_spectrum',
];

/**
 * 常规用户默认隐藏功能集：仅隐藏依赖停留时长的阅读健康度。
 */
const REGULAR_HIDDEN_FEATURES: readonly string[] = ['reading_health'];

/**
 * 重度用户默认可见功能集：全部功能解锁。
 */
const POWER_VISIBLE_FEATURES: readonly string[] = [
  'reader',
  'shelf',
  'raw_highlight',
  'raw_note',
  'quadrant',
  'truly_read_score',
  'topic_spectrum',
  'reading_health',
];

/**
 * 重度用户默认隐藏功能集：无隐藏。
 */
const POWER_HIDDEN_FEATURES: readonly string[] = [];

/**
 * 根据信号丰富度（划线总数）判定受众档位。
 *
 * @param totalHighlights 划线总数
 * @returns 受众档位
 */
export function classifyAudienceTier(totalHighlights: number): AudienceTier {
  if (totalHighlights < NOVICE_SIGNAL_THRESHOLD) return 'novice';
  if (totalHighlights >= POWER_SIGNAL_THRESHOLD) return 'power';
  return 'regular';
}

/**
 * 构造指定档位的受众档案（可见 / 隐藏功能集 + 判定理由）。
 *
 * @param tier 受众档位
 * @returns 受众档案
 */
export function buildAudienceProfile(tier: AudienceTier): AudienceProfile {
  switch (tier) {
    case 'novice':
      return {
        tier,
        signalThreshold: NOVICE_SIGNAL_THRESHOLD,
        visibleFeatures: [...NOVICE_VISIBLE_FEATURES],
        hiddenFeatures: [...NOVICE_HIDDEN_FEATURES],
        reason: '划线总数较少，默认展示基础阅读与直观四象限，隐藏依赖多维度的派生统计。',
      };
    case 'regular':
      return {
        tier,
        signalThreshold: POWER_SIGNAL_THRESHOLD,
        visibleFeatures: [...REGULAR_VISIBLE_FEATURES],
        hiddenFeatures: [...REGULAR_HIDDEN_FEATURES],
        reason: '划线积累达到常规水平，解锁真读过与主题谱，仍隐藏依赖停留时长的阅读健康度。',
      };
    case 'power':
      return {
        tier,
        signalThreshold: POWER_SIGNAL_THRESHOLD,
        visibleFeatures: [...POWER_VISIBLE_FEATURES],
        hiddenFeatures: [...POWER_HIDDEN_FEATURES],
        reason: '划线积累丰富，全部统计功能解锁。',
      };
    default: {
      const exhaustive: never = tier;
      throw new Error(`未知的受众档位：${String(exhaustive)}`);
    }
  }
}

/**
 * 构造初始阅读模式状态（无临时回退）。
 *
 * @param tier 初始档位
 * @param now 当前时间戳（毫秒）
 * @returns 初始阅读模式状态
 */
export function buildInitialReaderModeState(
  tier: AudienceTier,
  now: number,
): ReaderModeState {
  return {
    currentTier: tier,
    tempRollbackTier: null,
    tempRollbackDeadline: null,
    updatedAt: now,
  };
}

/**
 * 发起临时回退：从当前档位回退到更低档位，设定 30 天自动恢复截止。
 * 仅允许向更低档位回退（power→regular/novice、regular→novice），同档或升档视为无效。
 *
 * @param state 当前阅读模式状态
 * @param targetTier 目标回退档位
 * @param now 当前时间戳（毫秒）
 * @returns 更新后的状态（若目标档位不更低则原样返回）
 */
export function startTempRollback(
  state: ReaderModeState,
  targetTier: AudienceTier,
  now: number,
): ReaderModeState {
  if (!isLowerTier(targetTier, state.currentTier)) return state;
  return {
    ...state,
    tempRollbackTier: targetTier,
    tempRollbackDeadline: now + READER_MODE_ROLLBACK_WINDOW_MS,
    updatedAt: now,
  };
}

/**
 * 取消临时回退，立即恢复到基准档位。
 *
 * @param state 当前阅读模式状态
 * @param baseTier 基准档位（由信号重新判定）
 * @param now 当前时间戳（毫秒）
 * @returns 更新后的状态
 */
export function cancelTempRollback(
  state: ReaderModeState,
  baseTier: AudienceTier,
  now: number,
): ReaderModeState {
  return {
    currentTier: baseTier,
    tempRollbackTier: null,
    tempRollbackDeadline: null,
    updatedAt: now,
  };
}

/**
 * 解析当前生效档位：若临时回退未过期则取回退档位，否则取基准档位。
 * 过期的临时回退会被清除（返回的状态已合并清理）。
 *
 * @param state 当前阅读模式状态
 * @param baseTier 基准档位（由信号重新判定）
 * @param now 当前时间戳（毫秒）
 * @returns { effectiveTier, nextState }
 */
export function resolveEffectiveTier(
  state: ReaderModeState,
  baseTier: AudienceTier,
  now: number,
): { effectiveTier: AudienceTier; nextState: ReaderModeState } {
  if (
    state.tempRollbackTier !== null &&
    state.tempRollbackDeadline !== null &&
    now < state.tempRollbackDeadline
  ) {
    return { effectiveTier: state.tempRollbackTier, nextState: state };
  }
  const expired =
    state.tempRollbackTier !== null &&
    state.tempRollbackDeadline !== null &&
    now >= state.tempRollbackDeadline;
  const nextState: ReaderModeState = expired
    ? cancelTempRollback(state, baseTier, now)
    : { ...state, currentTier: baseTier };
  return { effectiveTier: baseTier, nextState };
}

/**
 * 判断 candidate 是否比 reference 更低档。
 * 档位序：novice < regular < power。
 *
 * @param candidate 待判定档位
 * @param reference 参照档位
 * @returns candidate 是否更低
 */
export function isLowerTier(
  candidate: AudienceTier,
  reference: AudienceTier,
): boolean {
  const order: Record<AudienceTier, number> = { novice: 0, regular: 1, power: 2 };
  return order[candidate] < order[reference];
}
