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
import { useStreamChat } from './useStreamChat';

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

  const {
    chatMessages,
    isStreaming,
    streamAsk,
    abortStream,
    clearChat,
  } = useStreamChat({ selectedWorkspaceId, apiStatus, setActivity, t });

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
    abortStream,
    clearChat,
  };
}
