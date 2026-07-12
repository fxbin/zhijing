/**
 * 流式对话 localStorage 持久化工具集。
 *
 * 按 workspaceId 分键存储：
 * - 对话历史（chatMessages）：刷新/切换可恢复
 * - sessionId：跨轮对话复用同一 sessionId，让后端累积上下文
 *
 * 所有函数在 localStorage 不可用时静默降级，不影响对话功能本身。
 *
 * @module hooks/streamChat/sessionStorage
 * @author fxbin
 */

import {
  STORAGE_KEY_PREFIX,
  SESSION_ID_STORAGE_KEY_PREFIX,
  STORAGE_MAX_MESSAGES,
  INITIAL_CHAT_MESSAGES,
} from './constants';

/**
 * 从 localStorage 读取指定工作区持久化的 sessionId。
 * 用于跨轮对话复用同一 sessionId，让后端累积上下文。
 *
 * @param {string} workspaceId - 工作区 ID
 * @returns {string|null} 持久化的 sessionId；无记录时返回 null
 * @author fxbin
 */
export function loadSessionId(workspaceId) {
  if (!workspaceId) return null;
  try {
    return localStorage.getItem(`${SESSION_ID_STORAGE_KEY_PREFIX}${workspaceId}`);
  } catch {
    return null;
  }
}

/**
 * 把 sessionId 写入 localStorage，绑定到指定工作区。
 *
 * @param {string} workspaceId - 工作区 ID
 * @param {string} sessionId - 会话 ID
 * @author fxbin
 */
export function saveSessionId(workspaceId, sessionId) {
  if (!workspaceId || !sessionId) return;
  try {
    localStorage.setItem(`${SESSION_ID_STORAGE_KEY_PREFIX}${workspaceId}`, sessionId);
  } catch {
    // localStorage 不可用时静默降级，每次新生成 sessionId
  }
}

/**
 * 从 localStorage 删除指定工作区的 sessionId。
 * 清空对话或切换工作区时调用。
 *
 * @param {string} workspaceId - 工作区 ID
 * @author fxbin
 */
export function removeSessionId(workspaceId) {
  if (!workspaceId) return;
  try {
    localStorage.removeItem(`${SESSION_ID_STORAGE_KEY_PREFIX}${workspaceId}`);
  } catch {
    // 静默降级
  }
}

/**
 * 从 localStorage 读取指定工作区的持久化对话历史。
 * 恢复时清除所有消息的 isStreaming 标记，避免刷新后出现永久 streaming 状态。
 *
 * @param {string} workspaceId - 工作区 ID
 * @returns {Array} 恢复的消息列表；无记录时返回空数组
 * @author fxbin
 */
export function loadChatFromStorage(workspaceId) {
  if (!workspaceId) return INITIAL_CHAT_MESSAGES;
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${workspaceId}`);
    if (!raw) return INITIAL_CHAT_MESSAGES;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return INITIAL_CHAT_MESSAGES;
    return parsed.map((message) => ({ ...message, isStreaming: false }));
  } catch {
    return INITIAL_CHAT_MESSAGES;
  }
}

/**
 * 将对话历史写入 localStorage，超过上限时截断最早的消息。
 *
 * @param {string} workspaceId - 工作区 ID
 * @param {Array} messages - 当前消息列表
 * @author fxbin
 */
export function saveChatToStorage(workspaceId, messages) {
  if (!workspaceId) return;
  try {
    const toStore = messages.length > STORAGE_MAX_MESSAGES
      ? messages.slice(messages.length - STORAGE_MAX_MESSAGES)
      : messages;
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${workspaceId}`, JSON.stringify(toStore));
  } catch {
    // localStorage 满或不可用时静默降级，不影响对话功能
  }
}

/**
 * 从 localStorage 删除指定工作区的对话历史。
 *
 * @param {string} workspaceId - 工作区 ID
 * @author fxbin
 */
export function removeChatFromStorage(workspaceId) {
  if (!workspaceId) return;
  try {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${workspaceId}`);
  } catch {
    // 静默降级
  }
}
