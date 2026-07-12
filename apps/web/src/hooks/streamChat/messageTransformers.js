/**
 * 流式对话消息转换工具集。
 *
 * 集中处理后端 AgentMessage 与前端 chatMessages 之间的格式转换：
 * - 引用标记剥离（流式增量期间）
 * - 消息 id 与 sessionId 生成
 * - reasoning 文本提取
 * - AgentMessage[] → chatMessages[]
 *
 * @module hooks/streamChat/messageTransformers
 * @author fxbin
 */

import { extractAgentMessageText } from '@zhijing/shared';
import {
  CITE_TAG_STREAMING_PATTERN,
  CITE_MARKDOWN_STREAMING_PATTERN,
  INITIAL_CHAT_MESSAGES,
  ROLE_USER,
  ROLE_ASSISTANT,
} from './constants';

/**
 * 流式增量期间剥离引用标记但保留标题文本，避免标记原样显示造成闪烁。
 * 支持两种格式：<cite> 标签（旧）和 markdown 链接（新）。
 * @param {string} text - 流式累积的原始文本（可能含引用标记）
 * @returns {string} 剥离标记后的文本（保留标题）
 * @author fxbin
 */
export function stripCiteTagsForStreaming(text) {
  if (typeof text !== 'string' || text.length === 0) return text;
  let work = text.replace(CITE_TAG_STREAMING_PATTERN, (_match, title) => title || '');
  work = work.replace(CITE_MARKDOWN_STREAMING_PATTERN, (_match, title) => title || '');
  return work;
}

/**
 * 生成带随机后缀的消息 id，避免毫秒级并发冲突。
 * @param {string} role - 消息角色
 * @param {number} timestamp - 创建时间戳
 * @returns {string} 全局唯一 id
 * @author fxbin
 */
export function createChatMessageId(role, timestamp) {
  return `${role}_${timestamp}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 生成 sessionId，用于 abort 端点定位运行中的 Agent 实例。
 * @returns {string} 全局唯一 sessionId
 * @author fxbin
 */
export function createSessionId() {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * 从 AssistantMessage.content 提取推理文本（thinking 类型部分）。
 *
 * @param {object} message - 后端 AgentMessage
 * @returns {string} 推理文本
 * @author fxbin
 */
export function extractAgentMessageReasoning(message) {
  const content = message?.content;
  if (!Array.isArray(content)) return '';
  return content
    .filter((part) => part && typeof part === 'object' && part.type === 'thinking' && typeof part.text === 'string')
    .map((part) => part.text)
    .join('');
}

/**
 * 把后端 AgentMessage[] 转换为前端 chatMessages 格式。
 * toolResult 消息跳过；assistant 消息提取 text + reasoning，不还原 toolCalls（最小可用）。
 *
 * @param {Array} agentMessages - 后端 AgentMessage 列表
 * @returns {Array} 前端 chatMessages 列表
 * @author fxbin
 */
export function agentMessagesToChatMessages(agentMessages) {
  if (!Array.isArray(agentMessages)) return INITIAL_CHAT_MESSAGES;
  const result = [];
  for (const msg of agentMessages) {
    if (msg.role === ROLE_USER) {
      result.push({
        id: createChatMessageId(ROLE_USER, msg.timestamp ?? Date.now()),
        role: ROLE_USER,
        text: extractAgentMessageText(msg),
      });
    } else if (msg.role === ROLE_ASSISTANT) {
      result.push({
        id: createChatMessageId(ROLE_ASSISTANT, msg.timestamp ?? Date.now() + 1),
        role: ROLE_ASSISTANT,
        text: extractAgentMessageText(msg),
        reasoning: extractAgentMessageReasoning(msg),
        toolCalls: [],
        auxContent: '',
        agentRole: '',
        isStreaming: false,
      });
    }
  }
  return result;
}
