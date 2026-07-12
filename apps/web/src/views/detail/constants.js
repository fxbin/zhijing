/**
 * @module views/detail/constants
 * 工作区详情视图常量：单位换算、展示顺序与实体类型 i18n 映射。
 * @author fxbin
 */

/**
 * GB 与字节之间的换算系数（1024^3）。
 */
const BYTES_PER_GB = 1024 * 1024 * 1024;

/**
 * 知识卡片类型在 Feed 中的展示顺序。
 */
const CARD_TYPE_ORDER = ['concept', 'method', 'case', 'step', 'viewpoint', 'fact', 'question', 'general'];

/**
 * 主张状态在筛选器中的展示顺序。
 */
const CLAIM_STATUS_ORDER = ['ai_skeleton', 'sourced', 'verified', 'disputed'];

/**
 * 实体类型到 i18n key 的映射。
 */
const ENTITY_TYPE_LABELS = {
  person: 'detail.entityType.person',
  organization: 'detail.entityType.organization',
  concept: 'detail.entityType.concept',
  tool: 'detail.entityType.tool',
  place: 'detail.entityType.location',
  event: 'detail.entityType.event',
  other: 'detail.entityType.other',
};

export {
  BYTES_PER_GB,
  CARD_TYPE_ORDER,
  CLAIM_STATUS_ORDER,
  ENTITY_TYPE_LABELS,
};
