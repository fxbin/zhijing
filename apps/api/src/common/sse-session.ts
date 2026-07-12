import { searchWorkspaceCards, searchWorkspaceMaterials } from '@zhijing/core';

/**
 * SSE 流空闲超时阈值（毫秒），5 分钟。
 * 超过此时间无任何事件写入则主动 abort 会话并关闭连接，
 * 防止 LLM 卡死或网络异常导致连接无限挂起。
 */
export const SSE_IDLE_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * 会话 id 合法格式正则：sess_{timestamp}_{base36}。
 * 用于校验前端传入的 sessionId，防止注入控制字符或超长字符串。
 */
export const SESSION_ID_PATTERN = /^sess_\d+_[a-z0-9]{4,32}$/;

export const CHAT_SESSION_TITLE_MAX_LENGTH = 40;

export type AgentRunTokenStats = {
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
};

export type AgentToolCallDraft = {
  toolCallId: string;
  toolName: string;
  args: unknown;
  startedAt: string;
  startedMs: number;
};

export function addNullableNumber(current: number | null, value: number | null | undefined): number | null {
  if (typeof value !== 'number') return current;
  return (current ?? 0) + value;
}

export function deriveAgentChatSessionTitle(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) return '未命名会话';
  return trimmed.length > CHAT_SESSION_TITLE_MAX_LENGTH
    ? `${trimmed.slice(0, CHAT_SESSION_TITLE_MAX_LENGTH)}...`
    : trimmed;
}

/**
 * Pre-fetch 检索每个集合（cards / materials）的默认 top-K。
 * 取 5 条平衡召回率与上下文体积，避免 token 膨胀。
 */
export const PREFETCH_SEARCH_TOP_K = 5;

/**
 * Pre-fetch 检索关键词最大长度，超过则截断，避免长问题场景下整段话做 TF-IDF 失效。
 */
export const PREFETCH_QUERY_MAX_LENGTH = 50;

/**
 * 构造 Pre-fetch 上下文注入文本。
 *
 * 设计目的：LLM 倾向于改写用户短 query 导致召回失败，Pre-fetch 用用户原始消息
 * 在代码层做一次确定性检索，把命中结果作为上下文注入 LLM 输入，让 LLM 优先基于
 * 系统预检索结果作答，而非自行改写 query 调 search 工具。
 *
 * 触发条件：用户消息长度 >= 2 且非纯空白；命中结果为空时不注入，避免污染 LLM 上下文。
 *
 * @param workspaceId - 工作区 id
 * @param userMessage - 用户原始消息
 * @returns 注入文本，空字符串表示不注入
 * @author fxbin
 */
export function buildPrefetchContext(workspaceId: string, userMessage: string): string {
  const trimmed = userMessage.trim();
  if (trimmed.length < 2) return '';
  const query = trimmed.slice(0, PREFETCH_QUERY_MAX_LENGTH);
  let cards: ReturnType<typeof searchWorkspaceCards> = [];
  let materials: ReturnType<typeof searchWorkspaceMaterials> = [];
  try {
    cards = searchWorkspaceCards(workspaceId, query, PREFETCH_SEARCH_TOP_K);
    materials = searchWorkspaceMaterials(workspaceId, query, PREFETCH_SEARCH_TOP_K);
  } catch {
    return '';
  }
  if (cards.length === 0 && materials.length === 0) return '';
  const lines: string[] = [
    '=== 系统预检索结果（基于用户原始输入，覆盖 search_cards + search_materials） ===',
    `原始输入：${query}`,
  ];
  if (cards.length > 0) {
    lines.push(`知识卡片（命中 ${cards.length} 张）：`);
    for (const card of cards) {
      lines.push(`- [${card.type}] ${card.title}：${card.body.slice(0, 120)}`);
    }
  }
  if (materials.length > 0) {
    lines.push(`来源资料（命中 ${materials.length} 条）：`);
    for (const m of materials) {
      lines.push(`- ${m.title}：${m.preview.slice(0, 200)}`);
    }
  }
  lines.push('=== 预检索结束。请优先基于以上结果作答；若不足，再调用 search_cards / search_materials 补充检索 ===');
  return lines.join('\n');
}
