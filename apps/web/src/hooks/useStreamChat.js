/**
 * 流式 Agent 对话状态 Hook。
 *
 * 从 useAssistantState 拆出，专注管理 SSE 流式 Agent 对话的完整生命周期：
 * - chatMessages 状态与渲染增量同步
 * - localStorage 按 workspaceId 持久化（刷新/切换可恢复）
 * - sessionId 管理与 abort 主动中断
 * - reasoning 增量累加（折叠展示）
 * - tool 调用状态与结果文本（可展开查看）
 *
 * @module hooks/useStreamChat
 * @author fxbin
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { API_STATUS_ONLINE } from './useUiState';

/**
 * 工作区接口路径前缀。
 */
const WORKSPACES_PATH = '/api/workspaces';

/**
 * 流式对话消息列表初始为空数组。
 */
const INITIAL_CHAT_MESSAGES = [];

/**
 * 流式对话运行态初始为 false。
 */
const INITIAL_IS_STREAMING = false;

/**
 * SSE 事件块分隔符（HTTP chunk 中事件之间以空行分隔）。
 */
const SSE_CHUNK_SEPARATOR = '\n\n';

/**
 * SSE data: 行前缀。
 */
const SSE_DATA_PREFIX = 'data:';

/**
 * 流式请求禁用超时（SSE 长连接保持开启，由后端关闭）。
 */
const STREAM_TIMEOUT_DISABLED = 0;

/**
 * localStorage 持久化 key 前缀，按 workspaceId 分键存储对话历史。
 */
const STORAGE_KEY_PREFIX = 'zhijing:agent-chat:';

/**
 * localStorage 持久化最大消息条数，超过时丢弃最早的消息以控制容量。
 */
const STORAGE_MAX_MESSAGES = 100;

/**
 * SSE 流式 Agent 对话的 wire 事件类型枚举。
 * 与 apps/api/src/agent-stream.ts 中 AgentStreamEvent 保持一致。
 */
const STREAM_EVENT = Object.freeze({
  AGENT_START: 'agent_start',
  AGENT_END: 'agent_end',
  TURN_START: 'turn_start',
  TURN_END: 'turn_end',
  MESSAGE_START: 'message_start',
  MESSAGE_DELTA: 'message_delta',
  REASONING_DELTA: 'reasoning_delta',
  MESSAGE_END: 'message_end',
  TOOL_START: 'tool_start',
  TOOL_END: 'tool_end',
  ERROR: 'error',
});

/**
 * 流式对话消息角色常量。
 */
const ROLE_USER = 'user';
const ROLE_ASSISTANT = 'assistant';

/**
 * 生成带随机后缀的消息 id，避免毫秒级并发冲突。
 * @param {string} role - 消息角色
 * @param {number} timestamp - 创建时间戳
 * @returns {string} 全局唯一 id
 * @author fxbin
 */
function createChatMessageId(role, timestamp) {
  return `${role}_${timestamp}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 生成 sessionId，用于 abort 端点定位运行中的 Agent 实例。
 * @returns {string} 全局唯一 sessionId
 * @author fxbin
 */
function createSessionId() {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * 从 localStorage 读取指定工作区的持久化对话历史。
 * 恢复时清除所有消息的 isStreaming 标记，避免刷新后出现永久 streaming 状态。
 *
 * @param {string} workspaceId - 工作区 ID
 * @returns {Array} 恢复的消息列表；无记录时返回空数组
 * @author fxbin
 */
function loadChatFromStorage(workspaceId) {
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
function saveChatToStorage(workspaceId, messages) {
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
function removeChatFromStorage(workspaceId) {
  if (!workspaceId) return;
  try {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${workspaceId}`);
  } catch {
    // 静默降级
  }
}

/**
 * 流式 Agent 对话状态 Hook。
 *
 * @param {object} params - 入参对象
 * @param {string|null} params.selectedWorkspaceId - 当前选中的工作区 ID
 * @param {string} params.apiStatus - 当前 API 在线状态
 * @param {function} params.setActivity - 设置活动文案（UI 域 setter）
 * @param {function} params.t - i18n 翻译函数
 * @returns {object} chatMessages / isStreaming / streamAsk / abortStream / clearChat
 * @author fxbin
 */
export function useStreamChat({ selectedWorkspaceId, apiStatus, setActivity, t }) {
  const [chatMessages, setChatMessages] = useState(INITIAL_CHAT_MESSAGES);
  const [isStreaming, setIsStreaming] = useState(INITIAL_IS_STREAMING);
  const currentSessionId = useRef(null);

  /**
   * 切换工作区时从 localStorage 恢复对话历史。
   */
  useEffect(() => {
    setChatMessages(loadChatFromStorage(selectedWorkspaceId));
  }, [selectedWorkspaceId]);

  /**
   * chatMessages 变化时持久化到 localStorage（流式进行中也写入，刷新可恢复最近状态）。
   */
  useEffect(() => {
    if (chatMessages.length > 0) {
      saveChatToStorage(selectedWorkspaceId, chatMessages);
    }
  }, [chatMessages, selectedWorkspaceId]);

  /**
   * 向当前选中工作区发起 SSE 流式 Agent 对话。
   *
   * 状态变更顺序：
   * 1. 立即追加 user 消息 + assistant 占位消息（isStreaming=true）
   * 2. reasoning_delta 事件增量累加 assistant.reasoning
   * 3. message_delta 事件增量累加 assistant.text
   * 4. tool_start/tool_end 事件维护 assistant.toolCalls 列表（含 result 文本）
   * 5. message_end 用服务端最终文本兜底
   * 6. error 事件把错误文案写入 assistant.error
   * 7. 流结束统一把 assistant.isStreaming 置为 false
   *
   * @param {string} text - 用户输入文本
   * @returns {Promise<void>}
   * @author fxbin
   */
  const streamAsk = useCallback(async (text) => {
    const trimmed = (text ?? '').trim();
    if (!trimmed || !selectedWorkspaceId || apiStatus !== API_STATUS_ONLINE || isStreaming) return;

    const sessionId = createSessionId();
    currentSessionId.current = sessionId;

    const userTimestamp = Date.now();
    const assistantTimestamp = userTimestamp + 1;
    const userMessage = {
      id: createChatMessageId(ROLE_USER, userTimestamp),
      role: ROLE_USER,
      text: trimmed,
    };
    const assistantId = createChatMessageId(ROLE_ASSISTANT, assistantTimestamp);
    const assistantPlaceholder = {
      id: assistantId,
      role: ROLE_ASSISTANT,
      text: '',
      reasoning: '',
      toolCalls: [],
      isStreaming: true,
    };

    setChatMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
    setIsStreaming(true);
    setActivity(t('activity.askWorkspace'));

    let response;
    try {
      response = await api.raw(`${WORKSPACES_PATH}/${selectedWorkspaceId}/agent/stream`, {
        method: 'POST',
        body: { message: trimmed, sessionId },
        timeout: STREAM_TIMEOUT_DISABLED,
      });
    } catch (error) {
      setChatMessages((prev) => prev.map((message) => (message.id === assistantId
        ? { ...message, isStreaming: false, error: error?.serverMessage ?? error?.message ?? t('activity.askFailed') }
        : message)));
      setIsStreaming(false);
      currentSessionId.current = null;
      return;
    }

    if (!response.body) {
      setChatMessages((prev) => prev.map((message) => (message.id === assistantId
        ? { ...message, isStreaming: false, error: t('activity.askFailed') }
        : message)));
      setIsStreaming(false);
      currentSessionId.current = null;
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let assistantText = '';
    let assistantReasoning = '';
    const toolCallsByKey = new Map();

    /**
     * 把当前累积的工具调用列表写回 assistant 占位消息。
     */
    function syncToolCallsToMessage() {
      const toolCallsList = Array.from(toolCallsByKey.values());
      setChatMessages((prev) => prev.map((message) => (message.id === assistantId
        ? { ...message, toolCalls: toolCallsList }
        : message)));
    }

    /**
     * 把累积文本写回 assistant 占位消息。
     * @param {string} nextText - 最新文本快照
     * @param {string} [nextReasoning] - 最新推理快照
     */
    function syncAssistantContent(nextText, nextReasoning) {
      setChatMessages((prev) => prev.map((message) => (message.id === assistantId
        ? { ...message, text: nextText, reasoning: nextReasoning ?? assistantReasoning }
        : message)));
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split(SSE_CHUNK_SEPARATOR);
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          const dataLine = part.split('\n').find((line) => line.startsWith(SSE_DATA_PREFIX));
          if (!dataLine) continue;
          const json = dataLine.slice(SSE_DATA_PREFIX.length).trim();
          if (!json) continue;

          let event;
          try {
            event = JSON.parse(json);
          } catch {
            continue;
          }

          switch (event.type) {
            case STREAM_EVENT.REASONING_DELTA:
              if (typeof event.delta === 'string' && event.delta.length > 0) {
                assistantReasoning += event.delta;
                syncAssistantContent(assistantText, assistantReasoning);
              }
              break;
            case STREAM_EVENT.MESSAGE_DELTA:
              if (typeof event.delta === 'string' && event.delta.length > 0) {
                assistantText += event.delta;
                syncAssistantContent(assistantText);
              }
              break;
            case STREAM_EVENT.MESSAGE_END:
              if (typeof event.text === 'string' && event.text.length > 0) {
                assistantText = event.text;
                syncAssistantContent(assistantText);
              }
              break;
            case STREAM_EVENT.TOOL_START:
              toolCallsByKey.set(event.toolCallId, {
                toolCallId: event.toolCallId,
                toolName: event.toolName,
                args: event.args,
                result: '',
                isError: false,
                isStreaming: true,
              });
              syncToolCallsToMessage();
              break;
            case STREAM_EVENT.TOOL_END: {
              const previous = toolCallsByKey.get(event.toolCallId) ?? { toolName: event.toolName, args: undefined };
              toolCallsByKey.set(event.toolCallId, {
                ...previous,
                toolCallId: event.toolCallId,
                toolName: event.toolName,
                isError: Boolean(event.isError),
                result: typeof event.result === 'string' ? event.result : '',
                isStreaming: false,
              });
              syncToolCallsToMessage();
              break;
            }
            case STREAM_EVENT.ERROR:
              setChatMessages((prev) => prev.map((message) => (message.id === assistantId
                ? { ...message, error: event.message ?? t('activity.askFailed') }
                : message)));
              break;
            default:
              break;
          }
        }
      }
    } catch (error) {
      setChatMessages((prev) => prev.map((message) => (message.id === assistantId
        ? { ...message, error: error?.message ?? t('activity.askFailed') }
        : message)));
    } finally {
      setChatMessages((prev) => prev.map((message) => (message.id === assistantId
        ? { ...message, isStreaming: false }
        : message)));
      setIsStreaming(false);
      currentSessionId.current = null;
      reader.releaseLock?.();
    }
  }, [selectedWorkspaceId, apiStatus, isStreaming, setActivity, t]);

  /**
   * 主动中断当前流式对话。
   * 通过 sessionId 调用后端 abort 端点，Agent 实例收到 abort 信号后优雅停止。
   *
   * @returns {Promise<void>}
   * @author fxbin
   */
  const abortStream = useCallback(async () => {
    const sessionId = currentSessionId.current;
    if (!sessionId || !selectedWorkspaceId) return;
    try {
      await api.post(`${WORKSPACES_PATH}/${selectedWorkspaceId}/agent/abort`, { sessionId });
    } catch {
      // abort 失败不影响前端状态，SSE 流会在服务端关闭后自然结束
    }
  }, [selectedWorkspaceId]);

  /**
   * 清空当前流式对话历史并删除 localStorage 持久化记录。
   * @author fxbin
   */
  const clearChat = useCallback(() => {
    setChatMessages(INITIAL_CHAT_MESSAGES);
    removeChatFromStorage(selectedWorkspaceId);
  }, [selectedWorkspaceId]);

  return {
    chatMessages,
    isStreaming,
    streamAsk,
    abortStream,
    clearChat,
  };
}
