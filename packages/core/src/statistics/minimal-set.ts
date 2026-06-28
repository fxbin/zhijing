/**
 * 极简模式功能集契约（NS-7）。
 *
 * PRD 红线：「数据静默 ≠ 数据剥夺」。
 * 极简模式下，原始数据（阅读器 / 书架 / 划线 / 笔记的查阅权）始终保留，
 * 仅静默派生统计（真读过 / 四象限 / 主题谱 / 健康度）及其下游推荐与排行。
 *
 * 本模块是「契约清单」的单一事实源：
 * - 前端 SettingsView 读取它展示「会关什么 / 会留什么」
 * - 前端各功能页读取它判断自身是否被静默
 * - 与 data-account-book.setMinimalMode 正交：setMinimalMode 负责把原始维度 tier 置 disabled，
 *   本模块负责声明派生层的处置（纯函数，不写库）
 *
 * 派生功能 featureKey 与 degrade-matrix.DEGRADE_MATRIX_REGISTRY 的 key 对齐，
 * 便于前端联动降级矩阵统一隐藏。
 *
 * @module statistics/minimal-set
 * @author fxbin
 */

import type {
  MinimalFeatureDisposition,
  MinimalFeatureEntry,
  MinimalFeatureState,
} from '@zhijing/shared';

/**
 * 极简模式下「保留」的功能（原始数据访问权，不可静默）。
 *
 * 对应 PRD：阅读器、书架、原始划线 / 笔记的查阅。
 */
export const MINIMAL_RETAINED_FEATURES: readonly MinimalFeatureEntry[] = [
  {
    featureKey: 'reader',
    label: '阅读器',
    disposition: 'retained',
    reason: '极简模式仅静默派生统计，阅读本身不受影响。',
  },
  {
    featureKey: 'shelf',
    label: '书架',
    disposition: 'retained',
    reason: '书架是个人藏书的原始入口，始终保留查阅权。',
  },
  {
    featureKey: 'raw_highlight',
    label: '原始划线查阅',
    disposition: 'retained',
    reason: '已采集的划线属于用户数据所有权范围，不因模式切换而剥夺。',
  },
  {
    featureKey: 'raw_note',
    label: '原始笔记查阅',
    disposition: 'retained',
    reason: '已采集的笔记属于用户数据所有权范围，不因模式切换而剥夺。',
  },
];

/**
 * 极简模式下「静默」的功能（派生统计层）。
 *
 * featureKey 与 DEGRADE_MATRIX_REGISTRY 对齐：
 * truly_read_score / quadrant / topic_spectrum / reading_health。
 */
export const MINIMAL_SILENCED_FEATURES: readonly MinimalFeatureEntry[] = [
  {
    featureKey: 'truly_read_score',
    label: '真读过置信度',
    disposition: 'silenced',
    reason: '依赖全部四个原始维度，极简模式下信号不足，暂停展示。',
  },
  {
    featureKey: 'quadrant',
    label: '书架×笔记四象限',
    disposition: 'silenced',
    reason: '依赖划线与笔记维度，极简模式下静默。',
  },
  {
    featureKey: 'topic_spectrum',
    label: '主题演变谱',
    disposition: 'silenced',
    reason: '依赖划线与笔记维度，极简模式下静默。',
  },
  {
    featureKey: 'reading_health',
    label: '阅读健康度',
    disposition: 'silenced',
    reason: '依赖停留时长维度，极简模式下静默。',
  },
];

/**
 * 完整功能契约（保留 + 静默），按固定顺序展示。
 *
 * 前端 SettingsView 直接渲染此清单。
 */
export const MINIMAL_FEATURE_CONTRACT: readonly MinimalFeatureEntry[] = [
  ...MINIMAL_RETAINED_FEATURES,
  ...MINIMAL_SILENCED_FEATURES,
];

/**
 * 构造极简模式功能集状态快照。
 *
 * 不读取数据库，仅根据入参生成契约快照，供前端展示与持久化。
 *
 * @param {boolean} enabled 是否启用极简模式
 * @param {number} now 当前时间戳（毫秒）
 * @returns {MinimalFeatureState}
 */
export function buildMinimalFeatureState(enabled: boolean, now: number): MinimalFeatureState {
  return {
    enabled,
    features: MINIMAL_FEATURE_CONTRACT.map((entry) => ({ ...entry })),
    updatedAt: now,
  };
}

/**
 * 查询某功能在极简模式契约中的处置。
 *
 * @param {string} featureKey 功能标识
 * @returns {MinimalFeatureDisposition | undefined} 未登记返回 undefined
 */
export function getFeatureDisposition(
  featureKey: string,
): MinimalFeatureDisposition | undefined {
  const entry = MINIMAL_FEATURE_CONTRACT.find((item) => item.featureKey === featureKey);
  return entry?.disposition;
}

/**
 * 判断某功能在当前极简模式下是否对用户可见。
 *
 * 规则：
 * - 极简模式关闭 → 全部可见
 * - 极简模式开启 → retained 可见，silenced 不可见，未登记默认可见
 *
 * @param {string} featureKey 功能标识
 * @param {boolean} minimalEnabled 极简模式是否启用
 * @returns {boolean}
 */
export function isFeatureVisible(featureKey: string, minimalEnabled: boolean): boolean {
  if (!minimalEnabled) return true;
  return getFeatureDisposition(featureKey) !== 'silenced';
}

/**
 * 列出极简模式下被静默的功能 key（供前端批量隐藏）。
 *
 * @returns {string[]}
 */
export function listSilencedFeatureKeys(): string[] {
  return MINIMAL_SILENCED_FEATURES.map((entry) => entry.featureKey);
}
