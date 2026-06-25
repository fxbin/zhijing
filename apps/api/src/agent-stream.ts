/**
 * Agent 事件流序列化模块。
 *
 * 将 pi-agent-core 的 AgentEvent 转换为前端可消费的紧凑 wire 事件，
 * 与 app.ts 路由层解耦，便于独立维护事件协议。
 *
 * @module agent-stream
 * @author fxbin
 */

import type { AgentEvent, AgentMessage } from '@earendil-works/pi-agent-core';

/**
 * 工具结果文本摘要的最大字符数，超过截断以控制 wire 体积。
 */
const TOOL_RESULT_PREVIEW_MAX_LENGTH = 500;

/**
 * 从 AssistantMessage 中拼接所有 text 内容块的文本，剔除 toolCall / reasoning 等非文本块。
 *
 * @param message - Agent 消息
 * @returns 纯文本内容；非 assistant 消息返回空字符串
 * @author fxbin
 */
function extractAssistantText(message: AgentMessage): string {
  if (message.role !== 'assistant') return '';
  return message.content
    .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
    .map((block) => block.text)
    .join('');
}

/**
 * 从 AgentToolResult.content 中提取纯文本摘要，供前端折叠展示。
 *
 * @param result - 工具执行结果（AgentToolResult）
 * @returns 文本摘要；无文本块时返回空字符串
 * @author fxbin
 */
function extractToolResultText(result: unknown): string {
  if (!result || typeof result !== 'object') return '';
  const content = (result as { content?: unknown }).content;
  if (!Array.isArray(content)) return '';
  const text = content
    .filter((block): block is { type: 'text'; text: string } =>
      block !== null && typeof block === 'object' && (block as { type: string }).type === 'text')
    .map((block) => block.text)
    .join('\n');
  return text.length > TOOL_RESULT_PREVIEW_MAX_LENGTH
    ? `${text.slice(0, TOOL_RESULT_PREVIEW_MAX_LENGTH)}…`
    : text;
}

/**
 * Agent 事件流前端 wire 格式（紧凑版）。
 *
 * 设计原则：
 * - 仅保留前端渲染所需字段，剔除 partial / history 等大体积数据
 * - 文本以 delta 增量传输（message_delta），message_end 携带最终完整文本
 * - reasoning 以 delta 增量传输（reasoning_delta），前端折叠展示
 * - tool 保留 id/name/args/isError + result 文本摘要，前端可展开查看
 */
export type AgentStreamEvent =
  | { type: 'agent_start' }
  | { type: 'agent_end' }
  | { type: 'turn_start' }
  | { type: 'turn_end' }
  | { type: 'message_start' }
  | { type: 'message_delta'; delta: string }
  | { type: 'reasoning_delta'; delta: string }
  | { type: 'message_end'; text: string }
  | { type: 'tool_start'; toolCallId: string; toolName: string; args: unknown }
  | { type: 'tool_end'; toolCallId: string; toolName: string; isError: boolean; result: string }
  | { type: 'error'; message: string };

/**
 * 将 pi-agent-core 的 AgentEvent 转换为前端可消费的 wire 事件。
 *
 * 处理细节：
 * - message_update 的 text_delta → message_delta（正文增量）
 * - message_update 的 thinking_delta → reasoning_delta（推理增量）
 * - message_end 携带从 message 提取的完整文本，便于前端兜底重渲染
 * - tool_execution_end 携带 result 文本摘要，前端可展开查看检索结果
 *
 * @param event - Agent 原始事件
 * @returns 0 或多个 wire 事件（数组形式，便于一次转发多事件）
 * @author fxbin
 */
export function serializeAgentEvent(event: AgentEvent): AgentStreamEvent[] {
  switch (event.type) {
    case 'agent_start':
      return [{ type: 'agent_start' }];
    case 'agent_end':
      return [{ type: 'agent_end' }];
    case 'turn_start':
      return [{ type: 'turn_start' }];
    case 'turn_end':
      return [{ type: 'turn_end' }];
    case 'message_start':
      return [{ type: 'message_start' }];
    case 'message_update': {
      const subType = event.assistantMessageEvent.type;
      if (subType === 'text_delta') {
        return [{ type: 'message_delta', delta: event.assistantMessageEvent.delta }];
      }
      if (subType === 'thinking_delta') {
        return [{ type: 'reasoning_delta', delta: event.assistantMessageEvent.delta }];
      }
      return [];
    }
    case 'message_end':
      return [{ type: 'message_end', text: extractAssistantText(event.message) }];
    case 'tool_execution_start':
      return [{
        type: 'tool_start',
        toolCallId: event.toolCallId,
        toolName: event.toolName,
        args: event.args,
      }];
    case 'tool_execution_update':
      return [];
    case 'tool_execution_end':
      return [{
        type: 'tool_end',
        toolCallId: event.toolCallId,
        toolName: event.toolName,
        isError: event.isError,
        result: extractToolResultText(event.result),
      }];
    default:
      return [];
  }
}
