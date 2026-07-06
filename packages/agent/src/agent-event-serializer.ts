/**
 * Agent 事件流序列化模块。
 *
 * 将 pi-agent-core 的 AgentEvent 转换为前端可消费的紧凑 wire 事件
 * （AgentStreamEvent，类型契约定义在 @zhijing/shared）。
 *
 * 从 apps/api/src/agent-stream.ts 迁入 agent 包（P1.3）：
 * agent 编排层需要直接序列化事件，避免 api 层反向依赖。
 *
 * @module agent-event-serializer
 * @author fxbin
 */

import type { AgentEvent, AgentMessage } from '@earendil-works/pi-agent-core';
import type { AgentStreamEvent } from '@zhijing/shared';

/**
 * 工具结果文本摘要的最大字符数，超过截断以控制 wire 体积。
 */
const TOOL_RESULT_PREVIEW_MAX_LENGTH = 500;

/**
 * Agent 错误消息的 stopReason 值。
 */
const ERROR_STOP_REASONS = new Set(['error', 'aborted']);

/**
 * 从 AssistantMessage 中提取 usage 信息并映射字段名。
 *
 * pi-ai 的 Usage 字段是 input / output / cost.total，映射为
 * inputTokens / outputTokens / costUsd，与前端消费结构一致。
 *
 * @param message - Assistant 消息对象
 * @returns 映射后的 usage；无 usage 时返回 undefined
 * @author fxbin
 */
function extractMessageUsage(message: AgentMessage):
  | { inputTokens: number | null; outputTokens: number | null; costUsd: number | null }
  | undefined {
  if (message.role !== 'assistant') return undefined;
  const usage = (message as { usage?: { input?: number; output?: number; cost?: { total?: number } } }).usage;
  if (!usage) return undefined;
  return {
    inputTokens: typeof usage.input === 'number' ? usage.input : null,
    outputTokens: typeof usage.output === 'number' ? usage.output : null,
    costUsd: typeof usage.cost?.total === 'number' ? usage.cost.total : null,
  };
}

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
 * 检查 assistant 消息是否包含工具调用块。
 *
 * 多轮 Agent 编排中，中间轮的 message 可能只含 tool_call 没有 text，
 * 这是正常的工具调用轮次，不应视为"空响应"。
 *
 * @param message - Agent 消息
 * @returns 包含工具调用时返回 true
 * @author fxbin
 */
function hasToolCallBlock(message: AgentMessage): boolean {
  if (message.role !== 'assistant') return false;
  return message.content.some((block) => block.type === 'toolCall');
}

/**
 * 从 assistant 消息提取运行错误。
 *
 * pi-agent-core 在底层 streamFn 抛错时会生成一个空 assistant 消息，
 * 并把 stopReason/errorMessage 挂在消息上；若不转成 error 事件，前端会把它当作
 * “正常结束但没有正文”，用户看到的就是对话静默中断。
 *
 * @param message - Agent 消息
 * @returns 错误文案；无错误时返回 undefined
 */
function extractAssistantError(message: AgentMessage): string | undefined {
  if (message.role !== 'assistant') return undefined;
  const errorMessage = (message as { errorMessage?: unknown }).errorMessage;
  if (typeof errorMessage !== 'string' || errorMessage.trim().length === 0) return undefined;
  const stopReason = (message as { stopReason?: unknown }).stopReason;
  if (typeof stopReason === 'string' && ERROR_STOP_REASONS.has(stopReason)) {
    return errorMessage;
  }
  return undefined;
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
 * 从 AgentToolResult.details 中提取结构化结果，供前端按工具类型定向渲染。
 *
 * 仅当 details 为非空对象时透传，避免把 null / undefined 一并写入 wire。
 * 工具实现保证 details 已做 JSON-safe 序列化（无函数 / 循环引用）。
 *
 * @param result - 工具执行结果（AgentToolResult）
 * @returns 结构化 details；无 details 时返回 undefined
 * @author fxbin
 */
function extractToolResultDetails(result: unknown): unknown {
  if (!result || typeof result !== 'object') return undefined;
  const details = (result as { details?: unknown }).details;
  if (details === null || typeof details === 'undefined') return undefined;
  if (typeof details !== 'object') return undefined;
  return details;
}

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
    case 'message_end': {
      const usage = extractMessageUsage(event.message);
      const text = extractAssistantText(event.message);
      const messageEnd: AgentStreamEvent = {
        type: 'message_end',
        text,
        ...(usage ? { usage } : {}),
      };
      const error = extractAssistantError(event.message);
      if (error) {
        return [messageEnd, { type: 'error', message: error }];
      }
      if (text.length === 0 && !hasToolCallBlock(event.message)) {
        return [messageEnd, { type: 'error', message: '模型未返回正文内容，请重试或检查模型配置。' }];
      }
      return [messageEnd];
    }
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
        details: extractToolResultDetails(event.result),
      }];
    default:
      return [];
  }
}
