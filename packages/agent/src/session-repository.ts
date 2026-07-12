/**
 * 会话管理 API：列表、详情、重命名、删除、重试截断。
 *
 * 这些函数操作 sessionStore，但不涉及 Agent 编排逻辑，
 * 与 orchestrator-session 的主流程分离，便于 api 层独立调用。
 *
 * @module session-repository
 * @author fxbin
 */

import { sessionStore, sweepExpiredSessions, deriveSessionTitle, isUserMessage } from './session-store.js';
import type { AgentSessionInfo, AgentSessionDetail, RetryTurnResult } from './session-types.js';

/**
 * 截断会话到最后一条 user 消息之前，丢弃该 user 消息及其后续所有 assistant/toolResult。
 *
 * 用于「重试上一条」：调用方随后会带着相同 message 走 /agent/stream，
 * startOrchestratorSession 会读取此处截断后的 messages 作为 priorMessages，
 * prompt(message) 自动追加新 user 消息 → 等价于重答上一条。
 *
 * 静默失败场景（返回 ok=false，不阻断后续流程）：
 * - sessionId 为空
 * - sessionStore 中无对应记录
 * - workspaceId 与 sessionStore 中记录不匹配
 * - messages 中找不到任何 role="user" 的消息
 *
 * @param sessionId - 会话 id
 * @param workspaceId - 工作区 id（必须匹配 sessionStore 中的记录）
 * @returns 截断结果
 * @author fxbin
 */
export function truncateSessionForRetry(
  sessionId: string,
  workspaceId: string,
): RetryTurnResult {
  if (!sessionId) {
    return { ok: false, beforeCount: 0, remainingCount: 0, truncated: false };
  }
  const record = sessionStore.get(sessionId);
  if (!record || record.workspaceId !== workspaceId) {
    return { ok: false, beforeCount: 0, remainingCount: 0, truncated: false };
  }
  const messages = record.messages;
  let lastUserIndex = -1;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (isUserMessage(messages[i])) {
      lastUserIndex = i;
      break;
    }
  }
  if (lastUserIndex < 0) {
    return { ok: false, beforeCount: messages.length, remainingCount: messages.length, truncated: false };
  }
  const remaining = messages.slice(0, lastUserIndex);
  record.messages = remaining;
  record.lastUsedAt = Date.now();
  return {
    ok: true,
    beforeCount: messages.length,
    remainingCount: remaining.length,
    truncated: true,
  };
}

/**
 * 列出当前缓存的会话信息。
 * 可选 workspaceId 过滤；返回按 lastUsedAt 倒序。
 *
 * @param workspaceId - 可选工作区 id 过滤
 * @returns 会话信息列表
 * @author fxbin
 */
export function listAgentSessions(workspaceId?: string): AgentSessionInfo[] {
  sweepExpiredSessions();
  const list: AgentSessionInfo[] = [];
  for (const [sessionId, record] of sessionStore) {
    if (workspaceId && record.workspaceId !== workspaceId) continue;
    list.push({
      sessionId,
      workspaceId: record.workspaceId,
      messageCount: record.messages.length,
      lastUsedAt: new Date(record.lastUsedAt).toISOString(),
      title: record.title ?? deriveSessionTitle(record.messages),
    });
  }
  list.sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt));
  return list;
}

/**
 * 获取指定会话的详情（含完整 messages）。
 * 用于前端切换会话时回填 chatMessages 渲染。
 *
 * @param sessionId - 会话 id
 * @param workspaceId - 工作区 id（必须匹配）
 * @returns 会话详情；sessionId 不存在或 workspaceId 不匹配时返回 null
 * @author fxbin
 */
export function getAgentSessionMessages(
  sessionId: string,
  workspaceId: string,
): AgentSessionDetail | null {
  if (!sessionId) return null;
  const record = sessionStore.get(sessionId);
  if (!record || record.workspaceId !== workspaceId) return null;
  return {
    sessionId,
    workspaceId: record.workspaceId,
    messageCount: record.messages.length,
    lastUsedAt: new Date(record.lastUsedAt).toISOString(),
    title: record.title ?? deriveSessionTitle(record.messages),
    messages: record.messages,
  };
}

/**
 * 重命名指定会话。
 * 标题去空白后非空才写入；空字符串视为取消重命名，返回 false。
 *
 * @param sessionId - 会话 id
 * @param workspaceId - 工作区 id（必须匹配）
 * @param title - 新标题
 * @returns 是否重命名成功（sessionId 不存在 / workspaceId 不匹配 / 标题为空时返回 false）
 * @author fxbin
 */
export function renameAgentSession(
  sessionId: string,
  workspaceId: string,
  title: string,
): boolean {
  if (!sessionId) return false;
  const record = sessionStore.get(sessionId);
  if (!record || record.workspaceId !== workspaceId) return false;
  const trimmed = (title ?? '').trim();
  if (!trimmed) return false;
  record.title = trimmed;
  record.lastUsedAt = Date.now();
  return true;
}

/**
 * 删除指定会话（带 workspaceId 校验），避免跨工作区误删。
 *
 * @param sessionId - 会话 id
 * @param workspaceId - 工作区 id（必须匹配）
 * @returns 是否删除成功（sessionId 不存在或 workspaceId 不匹配时返回 false）
 * @author fxbin
 */
export function deleteAgentSession(
  sessionId: string,
  workspaceId: string,
): boolean {
  if (!sessionId) return false;
  const record = sessionStore.get(sessionId);
  if (!record || record.workspaceId !== workspaceId) return false;
  sessionStore.delete(sessionId);
  return true;
}
