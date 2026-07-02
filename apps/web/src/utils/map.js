/**
 * 知识地图工具函数：节点过滤、布局计算、元数据描述等。
 * @module utils/map
 */

import i18n from '../i18n';

/**
 * 地图布局常量：中心点、各类型节点的扇形配置与半径。
 * 动态扇形布局会根据节点数量自动扩展半径，保证最小弧长避免重叠。
 */
const MAP_LAYOUT = {
  centerX: 500,
  centerY: 400,
  rings: {
    material: { startAngle: 100, endAngle: 260, baseRadius: 210 },
    card: { startAngle: 280, endAngle: 440, baseRadius: 320 },
    other: { startAngle: 260, endAngle: 280, baseRadius: 260 },
  },
  nodeRadius: { workspace: 34, material: 22, card: 22, other: 18 },
};

/**
 * 最小弧长：节点直径 + 间距，用于动态计算防重叠半径。
 */
const MIN_ARC_LENGTH = 64;

/**
 * 根据节点数量与可用角度，动态计算防重叠半径。
 * 当节点较多时自动扩大半径，保证每个节点的弧长不小于 MIN_ARC_LENGTH。
 * @param {number} count - 节点数量
 * @param {number} baseRadius - 基础半径
 * @param {number} angleSpan - 可用角度范围（度）
 * @returns {number} 动态半径
 */
function computeDynamicRadius(count, baseRadius, angleSpan) {
  if (count <= 1) return baseRadius;
  const minRadius = (MIN_ARC_LENGTH * count * 360) / (2 * Math.PI * angleSpan);
  return Math.max(baseRadius, minRadius);
}

const NODE_METADATA_SPECS = {
  material: [
    { key: 'platform', labelKey: 'maps.metadata.platform' },
    { key: 'type', labelKey: 'maps.metadata.kind' },
    { key: 'mediaCount', labelKey: 'maps.metadata.mediaCount' },
  ],
  card: [
    { key: 'type', labelKey: 'maps.metadata.cardType' },
    { key: 'materialId', labelKey: 'maps.metadata.sourceMaterial' },
  ],
  workspace: [
    { key: 'sourceCount', labelKey: 'maps.metadata.sourceCount' },
    { key: 'cardCount', labelKey: 'maps.metadata.cardCount' },
  ],
};

const NODE_STATUS_META = {
  ready: { tone: 'positive', labelKey: 'maps.nodeStatus.ready' },
  active: { tone: 'positive', labelKey: 'maps.nodeStatus.active' },
  seeded: { tone: 'positive', labelKey: 'maps.nodeStatus.seeded' },
  pending: { tone: 'pending', labelKey: 'maps.nodeStatus.pending' },
  queued: { tone: 'pending', labelKey: 'maps.nodeStatus.queued' },
  draft: { tone: 'pending', labelKey: 'maps.nodeStatus.draft' },
  parsing: { tone: 'pending', labelKey: 'maps.nodeStatus.parsing' },
  failed: { tone: 'negative', labelKey: 'maps.nodeStatus.failed' },
  error: { tone: 'negative', labelKey: 'maps.nodeStatus.error' },
  ai_skeleton: { tone: 'skeleton', labelKey: 'maps.nodeStatus.ai_skeleton' },
  sourced: { tone: 'sourced', labelKey: 'maps.nodeStatus.sourced' },
  user_confirmed: { tone: 'confirmed', labelKey: 'maps.nodeStatus.user_confirmed' },
  unsupported: { tone: 'negative', labelKey: 'maps.nodeStatus.unsupported' },
  grounded: { tone: 'positive', labelKey: 'maps.nodeStatus.grounded' },
  organizing: { tone: 'pending', labelKey: 'maps.nodeStatus.organizing' },
  saved: { tone: 'pending', labelKey: 'parseStatus.saved' },
  ingested: { tone: 'positive', labelKey: 'parseStatus.ingested' },
  needs_review: { tone: 'pending', labelKey: 'parseStatus.needs_review' },
  review: { tone: 'pending', labelKey: 'parseStatus.needs_review' },
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
 * 动态扇形布局：根据节点数量自动扩展半径，保证最小弧长避免重叠。
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
 * 将节点数组按环形布局分配坐标，动态计算半径防止重叠。
 * @param {Array<object>} nodes - 节点数组
 * @param {object} ring - 环形配置（startAngle/endAngle/baseRadius）
 * @returns {Array<object>} 带坐标的节点数组
 */
export function positionRing(nodes, ring) {
  const total = Math.max(nodes.length, 1);
  const angleSpan = ring.endAngle - ring.startAngle;
  const radius = computeDynamicRadius(total, ring.baseRadius, angleSpan);
  return nodes.map((node, index) => {
    const angle =
      total === 1
        ? (ring.startAngle + ring.endAngle) / 2
        : ring.startAngle + (angleSpan * index) / (total - 1);
    const radian = (angle * Math.PI) / 180;
    const x = MAP_LAYOUT.centerX + Math.cos(radian) * radius;
    const y = MAP_LAYOUT.centerY + Math.sin(radian) * radius;
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
 * 截断节点标签到 30 字符。
 * @param {string} label - 原始标签
 * @returns {string} 截断后的标签
 */
export function truncateNodeLabel(label) {
  const value = label ?? i18n.t('material.untitled');
  return value.length > 30 ? `${value.slice(0, 28)}...` : value;
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
 * @param {(key: string, options?: object) => string} [t] - i18n 翻译函数，可选
 * @returns {object} 状态元信息（tone/label）
 */
export function describeNodeStatus(status, t) {
  const meta = NODE_STATUS_META[status];
  const translate = t ?? ((key) => key);
  if (meta) {
    return { tone: meta.tone, label: translate(meta.labelKey, { defaultValue: status ?? '未知' }) };
  }
  return { tone: 'neutral', label: status ?? translate('maps.nodeStatus.unknown') };
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
export function getClaimStatusLegend(t) {
  const translate = t ?? ((key) => key);
  return CLAIM_STATUS_ORDER
    .filter((key) => NODE_STATUS_META[key])
    .map((key) => ({
      key,
      label: translate(NODE_STATUS_META[key].labelKey, { defaultValue: key }),
      tone: NODE_STATUS_META[key].tone,
    }));
}

/**
 * 根据节点类型返回可展示的元数据键值对。
 * 支持可选 context 参数，用于本地化标签、解析资料标题、标记可点击项。
 * @param {object} node - 地图节点
 * @param {object} [context] - 上下文
 * @param {Function} [context.t] - i18n 翻译函数
 * @param {Array<{id: string; title: string}>} [context.materials] - 资料列表，用于将 materialId 解析为标题
 * @returns {Array<{label: string; value: string; kind?: string; materialId?: string}>} 元数据数组
 */
export function describeNodeMetadata(node, context = {}) {
  const specs = NODE_METADATA_SPECS[node.kind] ?? [];
  const t = context.t ?? ((key) => key);
  const materials = context.materials ?? [];
  return specs
    .filter((spec) => node.metadata?.[spec.key] !== undefined && node.metadata?.[spec.key] !== null)
    .map((spec) => {
      const rawValue = node.metadata[spec.key];
      if (spec.key === 'materialId') {
        const matched = materials.find((material) => material.id === rawValue);
        const displayTitle = matched?.title ?? rawValue;
        return {
          label: t(spec.labelKey),
          value: displayTitle,
          kind: 'materialLink',
          materialId: rawValue,
        };
      }
      if (spec.key === 'type' && node.kind === 'card') {
        return {
          label: t(spec.labelKey),
          value: t(`cardType.${rawValue}`, { defaultValue: rawValue }),
          kind: 'cardType',
        };
      }
      if (spec.key === 'platform') {
        return {
          label: t(spec.labelKey),
          value: t(`platform.${rawValue}`, { defaultValue: rawValue ?? t('platform.unknown') }),
          kind: 'platform',
        };
      }
      return {
        label: t(spec.labelKey),
        value: formatMetadataValue(spec.key, rawValue),
      };
    });
}

/**
 * 格式化元数据值（数字转字符串，长字符串截断）。
 * @param {string} key - 元数据键
 * @param {*} value - 元数据值
 * @returns {string} 格式化后的字符串
 */
export function formatMetadataValue(key, value) {
  if (typeof value === 'number') return String(value);
  return String(value ?? '-');
}
