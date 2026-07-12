/**
 * ChatMessageItem 子组件共享的常量与工具函数。
 *
 * 收纳提议操作类型常量、i18n key 映射表、兜底集合等，
 * 避免魔法字符串散落在 JSX 中；同时提供 safeFormatJson
 * 用于工具入参/结果的安全序列化展示。
 *
 * @module components/chat/constants
 * @author fxbin
 */

/**
 * 提议操作类型常量。
 * 与 packages/shared 中 ProposedOperation 联合类型保持一致。
 */
export const PROPOSAL_OP_CREATE_CARD = 'create_card';
export const PROPOSAL_OP_EDIT_CARD = 'edit_card';
export const PROPOSAL_OP_ARCHIVE_CARD = 'archive_card';
export const PROPOSAL_OP_UNARCHIVE_CARD = 'unarchive_card';
export const PROPOSAL_OP_ARCHIVE_MATERIAL = 'archive_material';

/**
 * 提议操作类型 → i18n key 映射表。
 * 渲染时按 op 取对应文案，避免魔法字符串散落在 JSX 中。
 */
export const PROPOSAL_OP_LABEL_KEYS = Object.freeze({
  [PROPOSAL_OP_CREATE_CARD]: 'chat.proposalOp.create_card',
  [PROPOSAL_OP_EDIT_CARD]: 'chat.proposalOp.edit_card',
  [PROPOSAL_OP_ARCHIVE_CARD]: 'chat.proposalOp.archive_card',
  [PROPOSAL_OP_UNARCHIVE_CARD]: 'chat.proposalOp.unarchive_card',
  [PROPOSAL_OP_ARCHIVE_MATERIAL]: 'chat.proposalOp.archive_material',
});

/**
 * 兜底 i18n key，当 proposal.op 不在白名单内时使用。
 */
export const PROPOSAL_OP_FALLBACK_KEY = 'chat.proposalOp.create_card';

/**
 * 冻结的空集合常量，用于 appliedIndicesByMessage / dismissedIndicesByMessage
 * 未命中时的兜底引用，避免每次渲染创建新 Set 对象。
 */
export const EMPTY_INDEX_SET = Object.freeze(new Set());

/**
 * 安全地把任意值格式化为 JSON 字符串，用于工具入参折叠展示。
 * 循环引用、BigInt、函数等会被 JSON.stringify 跳过或转换为字符串。
 *
 * @param {unknown} value - 任意入参值
 * @returns {string} 格式化后的 JSON 字符串；转换失败时回退为 String(value)
 * @author fxbin
 */
export function safeFormatJson(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
