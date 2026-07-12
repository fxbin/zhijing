/**
 * proposal-batch 代码块解析与清洗。
 *
 * 从 Agent 最终响应文本中提取 ```proposal-batch``` JSON 块，
 * 解析为结构化 ProposedOperation[]，供前端渲染为 apply diff 卡片。
 * 同时提供 stripProposalBatchBlock 用于从展示文本中剥离该代码块。
 *
 * @module proposal-batch-parser
 * @author fxbin
 */

import type { ProposedOperation } from '@zhijing/shared';

/**
 * proposal-batch 代码块的正则匹配模式。
 * 匹配形如 ```proposal-batch\n{...}\n``` 的 fenced code block。
 */
const PROPOSAL_BATCH_BLOCK_PATTERN = /```proposal-batch\s*\n([\s\S]*?)\n```/;

/**
 * 全局匹配模式，用于从文本中移除所有 proposal-batch 代码块。
 *
 * 与 PROPOSAL_BATCH_BLOCK_PATTERN 的区别：前者仅匹配第一个（exec），
 * 此模式用 g flag 匹配所有出现，确保多块场景也能完全清除。
 */
const PROPOSAL_BATCH_BLOCK_GLOBAL_PATTERN = /```proposal-batch\s*\n[\s\S]*?\n```/g;

/**
 * 从展示文本中剥离所有 ```proposal-batch``` 代码块。
 *
 * 用途：Agent 回复中可能包含 proposal-batch JSON 块（供后端提取结构化提议），
 * 但该 JSON 不应展示给用户。本函数在转发 message_end 事件前调用，
 * 确保前端 renderMarkdown 只渲染正常 Markdown 文本，不出现原始 JSON。
 *
 * 剥离后清理多余空行，保持文本紧凑。
 *
 * @param text - Agent 原始响应文本
 * @returns 剥离 proposal-batch 块后的干净文本
 * @author fxbin
 */
export function stripProposalBatchBlock(text: string): string {
  if (typeof text !== 'string' || text.length === 0) return text;
  const stripped = text.replace(PROPOSAL_BATCH_BLOCK_GLOBAL_PATTERN, '');
  return stripped.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * proposal-batch 块中合法的 op 值集合，用于过滤非法操作类型。
 */
const PROPOSAL_OP_WHITELIST = new Set<ProposedOperation['op']>([
  'create_card',
  'edit_card',
  'archive_card',
  'unarchive_card',
  'archive_material',
]);

/**
 * 从 Agent 最终响应文本中提取 proposal-batch JSON 块。
 *
 * Agent 在 systemPrompt 指示下可在回答末尾追加 ```proposal-batch 代码块，
 * 本函数解析该 JSON 块为结构化 ProposedOperation[]，下发到前端
 * 渲染为 apply diff 卡片，由用户确认后落库。
 *
 * 容错策略：
 * - 无 proposal-batch 块时返回 null（常规问答不附带 proposal）
 * - JSON 解析失败时返回 null，不影响主对话流
 * - proposals 数组过滤掉 op 非法或缺少必填字段的项
 * - 过滤后为空数组时返回 null
 *
 * @param text - Agent 最终响应文本
 * @returns 提取出的 batch；无合法 proposal 时返回 null
 * @author fxbin
 */
export function extractProposalBatchFromText(
  text: string,
): { batchId: string; proposals: ProposedOperation[] } | null {
  if (typeof text !== 'string' || text.length === 0) return null;
  const match = PROPOSAL_BATCH_BLOCK_PATTERN.exec(text);
  if (!match) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(match[1]);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const rawProposals = (parsed as { proposals?: unknown }).proposals;
  if (!Array.isArray(rawProposals) || rawProposals.length === 0) return null;
  const proposals: ProposedOperation[] = [];
  for (const item of rawProposals) {
    if (!item || typeof item !== 'object') continue;
    const candidate = item as { op?: unknown };
    if (typeof candidate.op !== 'string' || !PROPOSAL_OP_WHITELIST.has(candidate.op as ProposedOperation['op'])) {
      continue;
    }
    proposals.push(sanitizeProposedOperation(candidate as ProposedOperation));
  }
  if (proposals.length === 0) return null;
  const batchId = typeof (parsed as { batchId?: unknown }).batchId === 'string'
    ? (parsed as { batchId: string }).batchId
    : `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return { batchId, proposals };
}

/**
 * 清洗单条 ProposedOperation，剔除未通过类型守卫的字段。
 *
 * @param operation - 原始对象（op 字段已通过白名单校验）
 * @returns 清洗后的 ProposedOperation
 * @author fxbin
 */
function sanitizeProposedOperation(operation: ProposedOperation): ProposedOperation {
  switch (operation.op) {
    case 'create_card': {
      return {
        op: 'create_card',
        type: operation.type,
        title: typeof operation.title === 'string' ? operation.title : '',
        body: typeof operation.body === 'string' ? operation.body : '',
        materialId: typeof operation.materialId === 'string' ? operation.materialId : undefined,
        rationale: typeof operation.rationale === 'string' ? operation.rationale : undefined,
      };
    }
    case 'edit_card': {
      return {
        op: 'edit_card',
        cardId: operation.cardId,
        title: typeof operation.title === 'string' ? operation.title : undefined,
        body: typeof operation.body === 'string' ? operation.body : undefined,
        type: operation.type,
        rationale: typeof operation.rationale === 'string' ? operation.rationale : undefined,
      };
    }
    case 'archive_card':
    case 'unarchive_card': {
      return {
        op: operation.op,
        cardId: operation.cardId,
        rationale: typeof operation.rationale === 'string' ? operation.rationale : undefined,
      };
    }
    case 'archive_material': {
      return {
        op: 'archive_material',
        materialId: operation.materialId,
        rationale: typeof operation.rationale === 'string' ? operation.rationale : undefined,
      };
    }
    default: {
      return operation;
    }
  }
}
