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
 * 会话 id 持久化 key 前缀（与消息持久化分离，便于独立清理）。
 * 跨轮对话时复用同一 sessionId，让后端累积上下文。
 */
const SESSION_ID_STORAGE_KEY_PREFIX = 'zhijing:agent-session:';

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
  MODE_UPDATE: 'mode_update',
  AUX_START: 'aux_start',
  AUX_DELTA: 'aux_delta',
  AUX_END: 'aux_end',
  PROPOSAL_BATCH: 'proposal_batch',
  ERROR: 'error',
});

/**
 * 编排模式中文标签映射，供 ChatDock 头部展示。
 */
const ORCHESTRATOR_MODE_LABELS = Object.freeze({
  mirror: '镜子',
  catalyst: '催化剂',
  navigator: '导航员',
});

/**
 * 默认编排模式（无 mode_update 事件时使用）。
 */
const DEFAULT_ORCHESTRATOR_MODE = 'mirror';

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
 * 从 localStorage 读取指定工作区持久化的 sessionId。
 * 用于跨轮对话复用同一 sessionId，让后端累积上下文。
 *
 * @param {string} workspaceId - 工作区 ID
 * @returns {string|null} 持久化的 sessionId；无记录时返回 null
 * @author fxbin
 */
function loadSessionId(workspaceId) {
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
function saveSessionId(workspaceId, sessionId) {
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
function removeSessionId(workspaceId) {
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
 * 从 AgentMessage.content 提取纯文本（兼容 string 与 TextContent[]）。
 *
 * @param {object} message - 后端 AgentMessage
 * @returns {string} 纯文本
 * @author fxbin
 */
function extractAgentMessageText(message) {
  const content = message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((part) => part && typeof part === 'object' && part.type === 'text' && typeof part.text === 'string')
      .map((part) => part.text)
      .join('');
  }
  return '';
}

/**
 * 从 AssistantMessage.content 提取推理文本（thinking 类型部分）。
 *
 * @param {object} message - 后端 AgentMessage
 * @returns {string} 推理文本
 * @author fxbin
 */
function extractAgentMessageReasoning(message) {
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
function agentMessagesToChatMessages(agentMessages) {
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
        isStreaming: false,
      });
    }
  }
  return result;
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
  const [orchestratorMode, setOrchestratorMode] = useState(DEFAULT_ORCHESTRATOR_MODE);
  const [orchestratorReason, setOrchestratorReason] = useState('');
  const currentSessionId = useRef(null);
  const streamWorkspaceId = useRef(null);
  const abortControllerRef = useRef(null);

  /**
   * 中断当前正在进行的流式对话（如果有）。
   * 同时中断 fetch 请求并通知后端停止 Agent。
   * 立即清空流相关的 ref，避免后续持久化写错工作区。
   */
  function abortCurrentStream() {
    const sessionId = currentSessionId.current;
    const workspaceId = streamWorkspaceId.current;

    currentSessionId.current = null;
    streamWorkspaceId.current = null;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    if (sessionId && workspaceId) {
      api.post(`${WORKSPACES_PATH}/${workspaceId}/agent/abort`, { sessionId })
        .catch(() => {});
    }
  }

  /**
   * 切换工作区时从 localStorage 恢复对话历史，
   * 并中断旧工作区正在进行的流式对话，避免状态污染与资源泄漏。
   */
  useEffect(() => {
    abortCurrentStream();
    setChatMessages(loadChatFromStorage(selectedWorkspaceId));
    setIsStreaming(INITIAL_IS_STREAMING);
  }, [selectedWorkspaceId]);

  /**
   * 组件卸载时清理正在进行的流。
   */
  useEffect(() => {
    return () => {
      abortCurrentStream();
    };
  }, []);

  /**
   * chatMessages 变化时持久化到 localStorage（流式进行中也写入，刷新可恢复最近状态）。
   * 持久化时以流所属工作区为准，避免工作区切换时消息写错位置。
   */
  useEffect(() => {
    const targetWorkspaceId = streamWorkspaceId.current ?? selectedWorkspaceId;
    if (chatMessages.length > 0 && targetWorkspaceId) {
      saveChatToStorage(targetWorkspaceId, chatMessages);
    }
  }, [chatMessages, selectedWorkspaceId]);

  /**
   * 向当前选中工作区发起 SSE 流式 Agent 对话。
   *
   * 状态变更顺序：
   * 1. （可选）retry 模式下先移除被重试的 user 消息及其后续
   * 2. 立即追加 user 消息 + assistant 占位消息（isStreaming=true）
   * 3. reasoning_delta 事件增量累加 assistant.reasoning
   * 4. message_delta 事件增量累加 assistant.text
   * 5. tool_start/tool_end 事件维护 assistant.toolCalls 列表（含 result 文本）
   * 6. message_end 用服务端最终文本兜底
   * 7. error 事件把错误文案写入 assistant.error
   * 8. 流结束统一把 assistant.isStreaming 置为 false
   *
   * @param {string} text - 用户输入文本
   * @param {object} [options] - 选项对象
   * @param {boolean} [options.retry=false] - 是否为「重试上一条」模式；
   *                                          true 时会在请求体带上 retryLastTurn 标志，
   *                                          让后端同步截断 sessionStore 中最后一条 user 消息
   * @param {string} [options.retryUserId] - 被重试的 user 消息 id；
   *                                          提供时会在追加新消息前先从 chatMessages 移除该消息及其后续
   * @returns {Promise<void>}
   * @author fxbin
   */
  const streamAsk = useCallback(async (text, options = {}) => {
    const trimmed = (text ?? '').trim();
    if (!trimmed || !selectedWorkspaceId || apiStatus !== API_STATUS_ONLINE || isStreaming) return;

    abortCurrentStream();

    const persistedSessionId = loadSessionId(selectedWorkspaceId);
    const sessionId = persistedSessionId ?? createSessionId();
    const controller = new AbortController();
    currentSessionId.current = sessionId;
    streamWorkspaceId.current = selectedWorkspaceId;
    abortControllerRef.current = controller;

    setOrchestratorMode(DEFAULT_ORCHESTRATOR_MODE);
    setOrchestratorReason('');

    if (options.retryUserId) {
      const retryUserId = options.retryUserId;
      setChatMessages((prev) => {
        const targetIndex = prev.findIndex((message) => message.id === retryUserId && message.role === ROLE_USER);
        if (targetIndex < 0) return prev;
        return prev.slice(0, targetIndex);
      });
    }

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
      auxContent: '',
      isStreaming: true,
    };

    setChatMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
    setIsStreaming(true);
    setActivity(t('activity.askWorkspace'));

    let response;
    try {
      response = await api.raw(`${WORKSPACES_PATH}/${selectedWorkspaceId}/agent/stream`, {
        method: 'POST',
        body: { message: trimmed, sessionId, isWriting: false, retryLastTurn: options.retry === true },
        timeout: STREAM_TIMEOUT_DISABLED,
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted) {
        currentSessionId.current = null;
        streamWorkspaceId.current = null;
        abortControllerRef.current = null;
        return;
      }
      setChatMessages((prev) => prev.map((message) => (message.id === assistantId
        ? { ...message, isStreaming: false, error: error?.serverMessage ?? error?.message ?? t('activity.askFailed') }
        : message)));
      setIsStreaming(false);
      currentSessionId.current = null;
      streamWorkspaceId.current = null;
      abortControllerRef.current = null;
      return;
    }

    if (!response.body) {
      setChatMessages((prev) => prev.map((message) => (message.id === assistantId
        ? { ...message, isStreaming: false, error: t('activity.askFailed') }
        : message)));
      setIsStreaming(false);
      currentSessionId.current = null;
      streamWorkspaceId.current = null;
      abortControllerRef.current = null;
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let assistantText = '';
    let assistantReasoning = '';
    let auxText = '';
    const toolCallsByKey = new Map();

    /**
     * 从响应头读取后端下发的 sessionId 并持久化。
     * 后端可能在客户端未传 sessionId 或会话已过期时生成新的，
     * 这里同步更新本地状态，保证下一轮请求能复用同一 sessionId。
     */
    const responseSessionId = response.headers.get('X-Session-Id');
    if (responseSessionId && responseSessionId !== sessionId) {
      currentSessionId.current = responseSessionId;
    }
    if (responseSessionId) {
      saveSessionId(selectedWorkspaceId, responseSessionId);
    }

    /**
     * 检查当前流是否仍然有效（工作区未切换、未被 abort）。
     * @returns {boolean} 流是否有效
     */
    function isStreamActive() {
      return streamWorkspaceId.current === selectedWorkspaceId && !controller.signal.aborted;
    }

    /**
     * 把当前累积的工具调用列表写回 assistant 占位消息。
     */
    function syncToolCallsToMessage() {
      if (!isStreamActive()) return;
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
      if (!isStreamActive()) return;
      setChatMessages((prev) => prev.map((message) => (message.id === assistantId
        ? { ...message, text: nextText, reasoning: nextReasoning ?? assistantReasoning }
        : message)));
    }

    /**
     * 把辅 Agent 累积文本写回 assistant 占位消息的 auxContent 字段。
     * @param {string} nextAuxText - 最新辅 Agent 文本快照
     */
    function syncAuxContent(nextAuxText) {
      if (!isStreamActive()) return;
      setChatMessages((prev) => prev.map((message) => (message.id === assistantId
        ? { ...message, auxContent: nextAuxText }
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
          if (!isStreamActive()) break;
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
            case STREAM_EVENT.MODE_UPDATE:
              if (typeof event.mode === 'string' && event.mode.length > 0) {
                setOrchestratorMode(event.mode);
                setOrchestratorReason(typeof event.reason === 'string' ? event.reason : '');
              }
              break;
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
                details: event.details,
                isStreaming: false,
              });
              syncToolCallsToMessage();
              break;
            }
            case STREAM_EVENT.AUX_DELTA:
              if (typeof event.delta === 'string' && event.delta.length > 0) {
                auxText += event.delta;
                syncAuxContent(auxText);
              }
              break;
            case STREAM_EVENT.AUX_END:
              if (typeof event.text === 'string' && event.text.length > 0) {
                auxText = event.text;
                syncAuxContent(auxText);
              }
              break;
            case STREAM_EVENT.PROPOSAL_BATCH: {
              const proposals = Array.isArray(event.proposals) ? event.proposals : [];
              if (proposals.length > 0) {
                const batchId = typeof event.batchId === 'string' ? event.batchId : '';
                setChatMessages((prev) => prev.map((message) => (message.id === assistantId
                  ? { ...message, proposalBatch: { batchId, proposals } }
                  : message)));
              }
              break;
            }
            case STREAM_EVENT.ERROR:
              if (isStreamActive()) {
                setChatMessages((prev) => prev.map((message) => (message.id === assistantId
                  ? { ...message, error: event.message ?? t('activity.askFailed') }
                  : message)));
              }
              break;
            default:
              break;
          }
        }
      }
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }
      if (isStreamActive()) {
        setChatMessages((prev) => prev.map((message) => (message.id === assistantId
          ? { ...message, error: error?.message ?? t('activity.askFailed') }
          : message)));
      }
    } finally {
      if (isStreamActive()) {
        setChatMessages((prev) => prev.map((message) => (message.id === assistantId
          ? { ...message, isStreaming: false }
          : message)));
        setIsStreaming(false);
      }
      currentSessionId.current = null;
      streamWorkspaceId.current = null;
      abortControllerRef.current = null;
      reader.releaseLock?.();
    }
  }, [selectedWorkspaceId, apiStatus, isStreaming, setActivity, t]);

  /**
   * 主动中断当前流式对话。
   * 通过 AbortController 中断前端请求，同时调用后端 abort 端点通知 Agent 停止。
   *
   * @returns {Promise<void>}
   * @author fxbin
   */
  const abortStream = useCallback(async () => {
    abortCurrentStream();
  }, []);

  /**
   * 清空当前流式对话历史并删除 localStorage 持久化记录。
   * 若流式对话正在进行，先中断再清空，避免状态不一致。
   * @author fxbin
   */
  const clearChat = useCallback(() => {
    abortCurrentStream();
    setChatMessages(INITIAL_CHAT_MESSAGES);
    setIsStreaming(INITIAL_IS_STREAMING);
    setOrchestratorMode(DEFAULT_ORCHESTRATOR_MODE);
    setOrchestratorReason('');
    const targetWorkspaceId = streamWorkspaceId.current ?? selectedWorkspaceId;
    removeChatFromStorage(targetWorkspaceId);
    removeSessionId(targetWorkspaceId);
  }, [selectedWorkspaceId]);

  /**
   * 重试指定的 user 消息：从 chatMessages 中读取该消息的文本，
   * 然后调用 streamAsk 携带 retry 标志重新发起流式请求。
   *
   * streamAsk 内部会先从 chatMessages 中移除该 user 消息及其后续 assistant/tool 消息，
   * 再追加新的 user + assistant 占位；同时通过 retryLastTurn 标志让后端同步截断
   * sessionStore 中最后一条 user 消息，等价于「重答上一条」。
   *
   * 流式对话进行中或消息不存在时静默返回。
   *
   * @param {string} userId - 被重试的 user 消息 id
   * @returns {Promise<void>}
   * @author fxbin
   */
  const retryLastMessage = useCallback(async (userId) => {
    if (!userId || isStreaming) return;
    const target = chatMessages.find((message) => message.id === userId && message.role === ROLE_USER);
    if (!target) return;
    await streamAsk(target.text, { retry: true, retryUserId: userId });
  }, [chatMessages, isStreaming, streamAsk]);

  /**
   * 切换到指定会话：设置 localStorage sessionId，并从后端拉取该会话的 messages
   * 转换为 chatMessages 渲染。流式对话进行中或目标 sessionId 与当前相同时静默返回。
   *
   * @param {string} sessionId - 目标会话 id
   * @returns {Promise<void>}
   * @author fxbin
   */
  const switchSession = useCallback(async (sessionId) => {
    if (!sessionId || !selectedWorkspaceId || isStreaming) return;
    if (sessionId === currentSessionId.current) return;
    abortCurrentStream();
    saveSessionId(selectedWorkspaceId, sessionId);
    currentSessionId.current = sessionId;
    setOrchestratorMode(DEFAULT_ORCHESTRATOR_MODE);
    setOrchestratorReason('');
    setActivity(t('activity.askWorkspace'));
    try {
      const detail = await api.get(`${WORKSPACES_PATH}/${selectedWorkspaceId}/agent/sessions/${sessionId}`);
      const restored = agentMessagesToChatMessages(detail?.messages ?? []);
      setChatMessages(restored);
      saveChatToStorage(selectedWorkspaceId, restored);
    } catch {
      setChatMessages(INITIAL_CHAT_MESSAGES);
    }
  }, [selectedWorkspaceId, isStreaming, t, setActivity]);

  /**
   * 当前会话 id（用于历史面板高亮当前条目）。
   */
  const currentSessionIdValue = currentSessionId.current;

  return {
    chatMessages,
    isStreaming,
    orchestratorMode,
    orchestratorReason,
    orchestratorModeLabel: ORCHESTRATOR_MODE_LABELS[orchestratorMode] ?? ORCHESTRATOR_MODE_LABELS.mirror,
    streamAsk,
    abortStream,
    clearChat,
    retryLastMessage,
    switchSession,
    currentSessionId: currentSessionIdValue,
  };
}
