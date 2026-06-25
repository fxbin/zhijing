/**
 * 知识地图工具函数：节点过滤、布局计算、元数据描述等。
 * @module utils/map
 */

import i18n from '../i18n';

const MAP_LAYOUT = {
  centerX: 500,
  centerY: 400,
  rings: {
    material: { startAngle: 100, endAngle: 260, radius: 210 },
    card: { startAngle: 280, endAngle: 440, radius: 320 },
    other: { startAngle: 260, endAngle: 280, radius: 260 },
  },
  nodeRadius: { workspace: 34, material: 22, card: 18, other: 16 },
};

const NODE_METADATA_SPECS = {
  material: [
    { key: 'platform', label: '平台' },
    { key: 'type', label: '类型' },
    { key: 'mediaCount', label: '媒体数' },
  ],
  card: [
    { key: 'type', label: '卡片类型' },
    { key: 'materialId', label: '来源资料' },
  ],
  workspace: [
    { key: 'sourceCount', label: '资料数' },
    { key: 'cardCount', label: '卡片数' },
  ],
};

const NODE_STATUS_META = {
  ready: { tone: 'positive', label: '就绪' },
  active: { tone: 'positive', label: '活跃' },
  seeded: { tone: 'positive', label: '已初始化' },
  pending: { tone: 'pending', label: '待处理' },
  queued: { tone: 'pending', label: '排队中' },
  draft: { tone: 'pending', label: '草稿' },
  parsing: { tone: 'pending', label: '解析中' },
  failed: { tone: 'negative', label: '失败' },
  error: { tone: 'negative', label: '异常' },
  ai_skeleton: { tone: 'skeleton', label: 'AI 骨架' },
  sourced: { tone: 'sourced', label: '已溯源' },
  user_confirmed: { tone: 'confirmed', label: '已确认' },
  unsupported: { tone: 'negative', label: '无支撑' },
  grounded: { tone: 'positive', label: '已落地' },
  organizing: { tone: 'pending', label: '建构中' },
};

const CLAIM_STATUS_ORDER = ['ai_skeleton', 'organizing', 'sourced', 'user_confirmed', 'grounded', 'unsupported'];

/**
 * 判断节点是否匹配过滤器和搜索关键词。
 * @param {object} node - 地图节点
 * @param {string} filter - 过滤类型（all/material/card/...）
 * @param {string} query - 搜索关键词
 * @returns {boolean} 是否匹配
 */
export function mapNodeMatches(node, filter, query) {
  const matchesFilter = filter === 'all' || node.kind === filter;
  const keyword = query.trim().toLowerCase();
  if (!matchesFilter) return false;
  if (!keyword) return true;
  return [node.label, node.summary, node.status, ...Object.values(node.metadata ?? {})]
    .join(' ')
    .toLowerCase()
    .includes(keyword);
}

/**
 * 根据节点类型构建环形布局坐标，并应用已保存的拖拽位置。
 * @param {Array<object>} nodes - 节点数组
 * @param {Record<string, {x: number; y: number}>} nodePositions - 已保存的节点位置映射
 * @returns {Array<object>} 带坐标的节点数组
 */
export function buildMapLayout(nodes, nodePositions = {}) {
  const center = nodes.find((node) => node.kind === 'workspace') ?? nodes[0];
  const remaining = nodes.filter((node) => node.id !== center?.id);
  const materialNodes = remaining.filter((node) => node.kind === 'material');
  const cardNodes = remaining.filter((node) => node.kind === 'card');
  const otherNodes = remaining.filter(
    (node) => node.kind !== 'material' && node.kind !== 'card',
  );
  const positioned = center
    ? [
        {
          ...center,
          x: MAP_LAYOUT.centerX,
          y: MAP_LAYOUT.centerY,
          originalX: MAP_LAYOUT.centerX,
          originalY: MAP_LAYOUT.centerY,
          radius: MAP_LAYOUT.nodeRadius.workspace,
        },
      ]
    : [];
  const layout = [
    ...positioned,
    ...positionRing(materialNodes, MAP_LAYOUT.rings.material),
    ...positionRing(cardNodes, MAP_LAYOUT.rings.card),
    ...positionRing(otherNodes, MAP_LAYOUT.rings.other),
  ];
  return layout.map((node) => {
    const saved = nodePositions[node.id];
    if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
      return {
        ...node,
        x: saved.x,
        y: saved.y,
      };
    }
    return node;
  });
}

/**
 * 将节点数组按环形布局分配坐标。
 * @param {Array<object>} nodes - 节点数组
 * @param {object} ring - 环形配置（startAngle/endAngle/radius）
 * @returns {Array<object>} 带坐标的节点数组
 */
export function positionRing(nodes, ring) {
  const total = Math.max(nodes.length, 1);
  return nodes.map((node, index) => {
    const angle =
      total === 1
        ? (ring.startAngle + ring.endAngle) / 2
        : ring.startAngle + ((ring.endAngle - ring.startAngle) * index) / (total - 1);
    const radian = (angle * Math.PI) / 180;
    const x = MAP_LAYOUT.centerX + Math.cos(radian) * ring.radius;
    const y = MAP_LAYOUT.centerY + Math.sin(radian) * ring.radius;
    return {
      ...node,
      x,
      y,
      originalX: x,
      originalY: y,
      radius: MAP_LAYOUT.nodeRadius[node.kind] ?? MAP_LAYOUT.nodeRadius.other,
    };
  });
}

/**
 * 截断节点标签到 22 字符。
 * @param {string} label - 原始标签
 * @returns {string} 截断后的标签
 */
export function truncateNodeLabel(label) {
  const value = label ?? i18n.t('material.untitled');
  return value.length > 22 ? `${value.slice(0, 20)}...` : value;
}

/**
 * 返回节点类型的中文标签。
 * @param {string} kind - 节点类型
 * @returns {string} 中文标签
 */
export function mapKindLabel(kind) {
  if (kind === 'workspace') return 'Workspace';
  if (kind === 'material') return 'Material';
  return 'Card';
}

/**
 * 返回节点状态的色调和标签。
 * @param {string} status - 状态标识
 * @returns {object} 状态元信息（tone/label）
 */
export function describeNodeStatus(status) {
  return NODE_STATUS_META[status] ?? { tone: 'neutral', label: status ?? '未知' };
}

/**
 * 返回边的样式类名，用于在 SVG 中区分不同关系类型。
 * @param {string} relation - 边的关系类型
 * @param {boolean} isCustom - 是否为用户自定义边
 * @returns {string} CSS 类名
 */
export function describeEdgeClass(relation, isCustom) {
  if (relation === 'contradicts') return 'map-edge contradicts';
  if (relation === 'related_to') return 'map-edge related-to';
  if (isCustom) return 'map-edge custom';
  return 'map-edge';
}

/**
 * 返回 claim status 的图例列表，用于地图画布上展示认知状态分布。
 * @returns {Array<{key: string; label: string; tone: string}>} 图例项数组
 */
export function getClaimStatusLegend() {
  return CLAIM_STATUS_ORDER
    .filter((key) => NODE_STATUS_META[key])
    .map((key) => ({ key, label: NODE_STATUS_META[key].label, tone: NODE_STATUS_META[key].tone }));
}

/**
 * 根据节点类型返回可展示的元数据键值对。
 * @param {object} node - 地图节点
 * @returns {Array<{label: string, value: string}>} 元数据数组
 */
export function describeNodeMetadata(node) {
  const specs = NODE_METADATA_SPECS[node.kind] ?? [];
  return specs
    .filter((spec) => node.metadata?.[spec.key] !== undefined && node.metadata?.[spec.key] !== null)
    .map((spec) => ({
      label: spec.label,
      value: formatMetadataValue(spec.key, node.metadata[spec.key]),
    }));
}

/**
 * 格式化元数据值（数字转字符串，materialId 截断）。
 * @param {string} key - 元数据键
 * @param {*} value - 元数据值
 * @returns {string} 格式化后的字符串
 */
export function formatMetadataValue(key, value) {
  if (typeof value === 'number') return String(value);
  if (key === 'materialId' && typeof value === 'string') {
    return value.length > 12 ? `${value.slice(0, 10)}…` : value;
  }
  return String(value ?? '-');
}
