/**
 * 编排会话状态存储与基础工具。
 *
 * 提供 sessionStore（sessionId → SessionRecord）、过期清理、标题推导等
 * 会话级基础设施，供 session-repository 与 orchestrator-session 复用。
 *
 * @module session-store
 * @author fxbin
 */

import { type AgentMessage } from '@earendil-works/pi-agent-core';
import { extractAgentMessageText } from '@zhijing/shared';

/**
 * 会话上下文累积条目：保存最近一轮 Agent 运行结束后的 messages 快照，
 * 供下一轮 startOrchestratorSession 复用，实现跨轮上下文累积。
 */
interface SessionRecord {
  /** 工作区 id；切换工作区时不应复用 */
  workspaceId: string;
  /** 最近一轮运行结束后从 agent.state.messages 提取的消息快照 */
  messages: AgentMessage[];
  /** 最近一次访问时间戳（毫秒），用于 idle 过期清理 */
  lastUsedAt: number;
  /** 用户自定义标题；未设置时按首条 user 消息文本动态生成 */
  title?: string;
}

/**
 * 会话级 Agent 状态存储：sessionId → SessionRecord。
 *
 * 设计要点：
 * - 仅缓存 messages 快照，不缓存 Agent 实例；每轮新建 Agent，
 *   通过 initialState.messages 注入历史，避免 Agent 内部状态管理的不可控副作用
 * - 主 Agent 复用历史 messages；辅 probe Agent 不复用（设计本意是临时盲区检测）
 * - idle TTL 30 分钟，过期自动清理
 */
export const sessionStore = new Map<string, SessionRecord>();

/**
 * 会话 idle 过期时长（毫秒），30 分钟。
 */
export const SESSION_IDLE_TTL_MS = 30 * 60 * 1000;

/**
 * 单会话最大保留消息条数，超过时按 FIFO 截断以控制上下文体积。
 */
export const SESSION_MAX_MESSAGES = 100;

/**
 * sessionStore 总容量上限，防止攻击者快速创建大量会话导致内存膨胀。
 * 超过时按 lastUsedAt 升序清理最旧会话。
 */
export const SESSION_MAX_COUNT = 50;

/**
 * 会话默认标题最大长度（字符），超过时尾部省略号。
 */
export const SESSION_TITLE_MAX_LENGTH = 40;

/**
 * 会话默认标题（找不到 user 消息时的兜底文案）。
 */
export const SESSION_DEFAULT_TITLE = '未命名会话';

/**
 * 判断 AgentMessage 是否为 user 角色。
 * 用结构化类型访问绕开联合类型 narrow 限制。
 *
 * @param message - Agent 消息
 * @returns 是否为 user 消息
 * @author fxbin
 */
export function isUserMessage(message: AgentMessage): boolean {
  return (message as { role?: string }).role === 'user';
}

/**
 * 按会话 messages 推导默认标题：取首条 user 消息文本，截断到 SESSION_TITLE_MAX_LENGTH。
 * 找不到 user 消息时回退为 SESSION_DEFAULT_TITLE。
 *
 * @param messages - 会话累积消息
 * @returns 默认标题
 * @author fxbin
 */
export function deriveSessionTitle(messages: AgentMessage[]): string {
  for (const msg of messages) {
    if (isUserMessage(msg)) {
      const text = extractAgentMessageText(msg).trim();
      if (text) {
        return text.length > SESSION_TITLE_MAX_LENGTH
          ? `${text.slice(0, SESSION_TITLE_MAX_LENGTH)}…`
          : text;
      }
    }
  }
  return SESSION_DEFAULT_TITLE;
}

/**
 * 清理过期会话。在每次 startOrchestratorSession 入口调用，
 * 顺带清理所有 lastUsedAt 超过 TTL 的条目。
 */
export function sweepExpiredSessions(): void {
  const now = Date.now();
  for (const [id, record] of sessionStore) {
    if (now - record.lastUsedAt > SESSION_IDLE_TTL_MS) {
      sessionStore.delete(id);
    }
  }
  if (sessionStore.size > SESSION_MAX_COUNT) {
    const sorted = Array.from(sessionStore.entries())
      .sort((a, b) => a[1].lastUsedAt - b[1].lastUsedAt);
    const toRemove = sorted.length - SESSION_MAX_COUNT;
    for (let i = 0; i < toRemove; i += 1) {
      sessionStore.delete(sorted[i][0]);
    }
  }
}
