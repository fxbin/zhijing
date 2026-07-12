/**
 * @module views/maps/constants
 * 知识地图视图常量与 i18n 派生配置构建函数。
 * @author fxbin
 */

/**
 * SVG 画布基础宽度（viewBox 基准）。
 */
const MAP_BASE_WIDTH = 1000;

/**
 * SVG 画布基础高度（viewBox 基准）。
 */
const MAP_BASE_HEIGHT = 800;

/**
 * 最小缩放倍数。
 */
const MAP_MIN_ZOOM = 0.3;

/**
 * 最大缩放倍数。
 */
const MAP_MAX_ZOOM = 3;

/**
 * 判定点击与拖拽的位移阈值（像素），小于该值视为点击而非拖拽。
 */
const MAP_CLICK_DRAG_THRESHOLD = 6;

/**
 * 关系拖拽落点判定的额外 padding（像素），用于 findRelationTarget 命中半径扩展。
 */
const MAP_RELATION_TARGET_PADDING = 14;

/**
 * localStorage 中地图筛选器持久化的键名。
 */
const STORAGE_KEY_FILTER = 'zhijing_map_filter';

/**
 * 构建地图筛选按钮选项列表。
 * all 项计数为各类型节点数之和，等价于 nodes.length。
 * @param {Object} typeCounts - 各 kind 的节点计数映射，如 { workspace: 3, material: 5, card: 8 }
 * @param {Function} t - i18n 翻译函数
 * @returns {Array<{key: string, label: string, count: number}>} 筛选选项数组
 */
function buildFilterOptions(typeCounts, t) {
  const totalCount = Object.values(typeCounts).reduce((sum, count) => sum + count, 0);
  return [
    { key: 'all', label: t('maps.filter.allNodes'), count: totalCount },
    { key: 'workspace', label: t('maps.filter.workspace'), count: typeCounts.workspace ?? 0 },
    { key: 'material', label: t('maps.filter.materials'), count: typeCounts.material ?? 0 },
    { key: 'card', label: t('maps.filter.cards'), count: typeCounts.card ?? 0 },
  ];
}

/**
 * 构建关系类型到本地化标签的映射。
 * @param {Function} t - i18n 翻译函数
 * @returns {Object<string, string>} 关系类型 -> 标签映射
 */
function buildRelationTypeLabelMap(t) {
  return {
    related_to: t('maps.relationType.relatedTo'),
    supports: t('maps.relationType.supports'),
    contradicts: t('maps.relationType.contradicts'),
    contains: t('maps.relationType.contains'),
    source: t('maps.relationType.source'),
  };
}

/**
 * 构建可编辑关系类型选项列表（用于关系类型选择器弹层）。
 * @param {Function} t - i18n 翻译函数
 * @returns {Array<{value: string, label: string}>} 可编辑关系选项
 */
function buildEditableRelationOptions(t) {
  return [
    { value: 'related_to', label: t('maps.relationType.relatedTo') },
    { value: 'supports', label: t('maps.relationType.supports') },
    { value: 'contradicts', label: t('maps.relationType.contradicts') },
  ];
}

export {
  MAP_BASE_WIDTH,
  MAP_BASE_HEIGHT,
  MAP_MIN_ZOOM,
  MAP_MAX_ZOOM,
  MAP_CLICK_DRAG_THRESHOLD,
  MAP_RELATION_TARGET_PADDING,
  STORAGE_KEY_FILTER,
  buildFilterOptions,
  buildRelationTypeLabelMap,
  buildEditableRelationOptions,
};
