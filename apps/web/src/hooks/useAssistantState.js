/**
 * 助手/对话域状态 Hook。
 * 统一管理助手问题输入、助手回答、加载态、工作区消息列表，
 * 并提供 askWorkspace 业务函数（向工作区提问并合并返回的工作区、资料、卡片、产物）
 * 与 loadMessages 业务函数（拉取工作区最近消息列表）。
 * @module hooks/useAssistantState
 * @author fxbin
 */

import { useState } from 'react';
import api from '../utils/api';
import { API_STATUS_ONLINE } from './useUiState';
import { TASKS_MAX_COUNT } from './useWorkspaceState';

/**
 * 工作区接口路径前缀。
 */
const WORKSPACES_PATH = '/api/workspaces';

/**
 * 工作区消息接口查询参数：拉取条数上限。
 */
const MESSAGES_LIMIT = 50;

/**
 * 客户端兜底消息 ID 前缀（服务端未返回 messageId 时使用）。
 */
const MESSAGE_ID_PREFIX = 'msg_';

/**
 * 助手问题输入框初始空字符串。
 */
const INITIAL_ASSISTANT_QUESTION = '';

/**
 * 助手回答初始为 null（未提问）。
 */
const INITIAL_ASSISTANT_ANSWER = null;

/**
 * 提问加载态初始为 false。
 */
const INITIAL_IS_ASKING = false;

/**
 * 工作区消息列表初始为空数组。
 */
const INITIAL_WORKSPACE_MESSAGES = [];

/**
 * 流式 Agent 对话消息列表初始为空数组。
 * 与 workspaceMessages（持久化消息）解耦：chatMessages 仅承载当前会话内的流式渲染状态。
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
 * SSE 流式 Agent 对话的 wire 事件类型枚举。
 * 与 apps/api/src/app.ts 中 AgentStreamEvent 保持一致，前端按 type 分发渲染。
 */
const STREAM_EVENT = Object.freeze({
  AGENT_START: 'agent_start',
  AGENT_END: 'agent_end',
  TURN_START: 'turn_start',
  TURN_END: 'turn_end',
  MESSAGE_START: 'message_start',
  MESSAGE_DELTA: 'message_delta',
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
 * 将任务前置并去重，截断到最大保留条数。
 * @param {Array} tasks - 当前任务列表
 * @param {object} task - 待插入的任务
 * @returns {Array} 处理后的任务列表
 */
function prependTask(tasks, task) {
  return [task, ...tasks.filter((item) => item.id !== task.id)].slice(0, TASKS_MAX_COUNT);
}

/**
 * 使用助手/对话域状态。
 * @param {object} params - 入参对象
 * @param {string|null} params.selectedWorkspaceId - 当前选中的工作区 ID
 * @param {string} params.apiStatus - 当前 API 在线状态
 * @param {function} params.setActivity - 设置活动文案（UI 域 setter）
 * @param {function} params.setWorkspaces - 设置工作区列表
 * @param {function} params.setWorkspaceDetail - 设置工作区详情
 * @param {function} params.setTasks - 设置任务列表
 * @param {function} params.setLatestTaskId - 设置最新任务 ID
 * @param {function} params.setLatestTask - 设置最新任务对象
 * @param {function} params.setSelectedArtifact - 设置当前选中的产物
 * @param {function} params.t - i18n 翻译函数
 * @returns {object} 助手域 state、setter 与 askWorkspace 业务函数
 * @author fxbin
 */
export function useAssistantState({
  selectedWorkspaceId,
  apiStatus,
  setActivity,
  setWorkspaces,
  setWorkspaceDetail,
  setTasks,
  setLatestTaskId,
  setLatestTask,
  setSelectedArtifact,
  t,
}) {
  const [assistantQuestion, setAssistantQuestion] = useState(INITIAL_ASSISTANT_QUESTION);
  const [assistantAnswer, setAssistantAnswer] = useState(INITIAL_ASSISTANT_ANSWER);
  const [isAsking, setIsAsking] = useState(INITIAL_IS_ASKING);
  const [workspaceMessages, setWorkspaceMessages] = useState(INITIAL_WORKSPACE_MESSAGES);
  const [chatMessages, setChatMessages] = useState(INITIAL_CHAT_MESSAGES);
  const [isStreaming, setIsStreaming] = useState(INITIAL_IS_STREAMING);

  /**
   * 加载指定工作区的最近消息列表。
   * @param {string} workspaceId - 工作区 ID
   * @param {function} [isCancelled] - 取消判定函数，返回 true 时跳过状态写入（用于 effect 清理）
   * @returns {Promise<void>}
   * @author fxbin
   */
  async function loadMessages(workspaceId, isCancelled = () => false) {
    try {
      const payload = await api.get(`${WORKSPACES_PATH}/${workspaceId}/messages?limit=${MESSAGES_LIMIT}`);
      if (!isCancelled()) setWorkspaceMessages(payload.messages ?? []);
    } catch {
      if (!isCancelled()) setWorkspaceMessages([]);
    }
  }

  /**
   * 向当前选中工作区提问。
   * 成功时合并返回的工作区、资料、卡片、产物，并将消息追加到列表；失败时展示错误回答。
   * @returns {Promise<void>}
   * @author fxbin
   */
  async function askWorkspace() {
    const value = assistantQuestion.trim();
    if (!value || !selectedWorkspaceId || apiStatus !== API_STATUS_ONLINE || isAsking) return;
    setIsAsking(true);
    setAssistantAnswer({ question: value, loading: true });
    setActivity(t('activity.askWorkspace'));

    try {
      const result = await api.post(`${WORKSPACES_PATH}/${selectedWorkspaceId}/ask`, { question: value });
      setActivity(`${result.message} ${t('activity.completed')} ${result.task.id}`);
      setLatestTaskId(result.task.id);
      setLatestTask(result.task);
      setTasks((current) => prependTask(current, result.task));
      setWorkspaces((current) => {
        const withoutDuplicate = current.filter((base) => base.id !== result.workspace.id);
        return [result.workspace, ...withoutDuplicate];
      });
      setWorkspaceDetail((current) => ({
        ...current,
        ...result.workspace,
        materials: result.material
          ? [result.material, ...(current.materials ?? []).filter((material) => material.id !== result.material.id)]
          : current.materials ?? [],
        cards: [...(result.cards ?? []), ...(current.cards ?? []).filter((card) => !(result.cards ?? []).some((item) => item.id === card.id))],
        artifacts: result.artifact
          ? [result.artifact, ...(current.artifacts ?? []).filter((artifact) => artifact.id !== result.artifact.id)]
          : current.artifacts ?? [],
      }));
      setAssistantAnswer({
        question: value,
        message: result.message,
        cards: result.cards ?? [],
        proposedCards: result.proposedCards ?? [],
        messageId: result.messageId,
        artifact: result.artifact,
        citations: result.citations ?? [],
        task: result.task,
      });
      if (result.artifact) {
        setWorkspaceMessages((current) => [
          ...current,
          {
            id: result.messageId ?? `${MESSAGE_ID_PREFIX}${Date.now()}`,
            workspaceId: selectedWorkspaceId,
            question: value,
            answer: result.artifact?.body ?? result.message,
            cardIds: (result.cards ?? []).map((card) => card.id),
            artifactId: result.artifact?.id,
            createdAt: new Date().toISOString(),
            proposedCards: result.proposedCards,
          },
        ]);
      }
      if (result.artifact) setSelectedArtifact(result.artifact);
      setAssistantQuestion('');
    } catch {
      setAssistantAnswer({
        question: value,
        error: t('activity.askFailed'),
      });
    } finally {
      setIsAsking(false);
    }
  }

  /**
   * 向当前选中工作区发起 SSE 流式 Agent 对话。
   *
   * 与 askWorkspace 的关系：
   * - askWorkspace 走旧 /ask 端点（一次性响应，附带卡片/资料/产物落地）
   * - streamAsk 走新 /agent/stream 端点（流式渲染，仅产出对话文本，不落地业务数据）
   * 两条路径共存，便于阶段二灰度切换；后续若全面切换可废弃 askWorkspace。
   *
   * 状态变更顺序：
   * 1. 立即追加 user 消息 + assistant 占位消息（isStreaming=true）
   * 2. message_delta 事件增量累加 assistant 文本
   * 3. tool_start/tool_end 事件维护 assistant.toolCalls 列表
   * 4. message_end 用服务端最终文本兜底（覆盖增量拼接结果）
   * 5. error 事件把错误文案写入 assistant.error
   * 6. 流结束（正常/异常/reader done）统一把 assistant.isStreaming 置为 false
   *
   * @param {string} text - 用户输入文本
   * @returns {Promise<void>}
   * @author fxbin
   */
  async function streamAsk(text) {
    const trimmed = (text ?? '').trim();
    if (!trimmed || !selectedWorkspaceId || apiStatus !== API_STATUS_ONLINE || isStreaming) return;

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
        body: { message: trimmed },
        timeout: STREAM_TIMEOUT_DISABLED,
      });
    } catch (error) {
      setChatMessages((prev) => prev.map((message) => (message.id === assistantId
        ? { ...message, isStreaming: false, error: error?.serverMessage ?? error?.message ?? t('activity.askFailed') }
        : message)));
      setIsStreaming(false);
      return;
    }

    if (!response.body) {
      setChatMessages((prev) => prev.map((message) => (message.id === assistantId
        ? { ...message, isStreaming: false, error: t('activity.askFailed') }
        : message)));
      setIsStreaming(false);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let assistantText = '';
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
     * @param {string} next - 最新文本快照
     */
    function syncAssistantText(next) {
      setChatMessages((prev) => prev.map((message) => (message.id === assistantId
        ? { ...message, text: next }
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
            case STREAM_EVENT.MESSAGE_DELTA:
              if (typeof event.delta === 'string' && event.delta.length > 0) {
                assistantText += event.delta;
                syncAssistantText(assistantText);
              }
              break;
            case STREAM_EVENT.MESSAGE_END:
              if (typeof event.text === 'string' && event.text.length > 0) {
                assistantText = event.text;
                syncAssistantText(assistantText);
              }
              break;
            case STREAM_EVENT.TOOL_START:
              toolCallsByKey.set(event.toolCallId, {
                toolCallId: event.toolCallId,
                toolName: event.toolName,
                args: event.args,
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
              // agent_start/agent_end/turn_start/turn_end/message_start 不驱动当前 UI
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
      reader.releaseLock?.();
    }
  }

  /**
   * 清空当前流式对话历史（用于切换工作区或用户主动清屏）。
   * @author fxbin
   */
  function clearChat() {
    setChatMessages(INITIAL_CHAT_MESSAGES);
  }

  return {
    assistantQuestion,
    setAssistantQuestion,
    assistantAnswer,
    setAssistantAnswer,
    isAsking,
    setIsAsking,
    workspaceMessages,
    setWorkspaceMessages,
    loadMessages,
    askWorkspace,
    chatMessages,
    isStreaming,
    streamAsk,
    clearChat,
  };
}
