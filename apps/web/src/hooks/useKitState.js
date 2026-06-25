/**
 * Kit 运行域状态 Hook。
 * 统一管理 Kit 运行加载态与运行结果，并提供 runKnowledgeKit 业务函数：
 * 调用工作区 Kit 执行接口，合并返回的任务、工作区、详情、产物。
 * @module hooks/useKitState
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
 * Kit 运行接口路径后缀。
 */
const KITS_RUN_PATH_SUFFIX = '/kits/run';

/**
 * 默认 Kit ID。
 */
const DEFAULT_KIT_ID = 'learning_research';

/**
 * Kit 运行加载态初始为 false。
 */
const INITIAL_IS_RUNNING_KIT = false;

/**
 * Kit 运行结果初始为 null（未运行）。
 */
const INITIAL_KIT_RUN_RESULT = null;

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
 * 使用 Kit 运行域状态。
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
 * @returns {object} Kit 域 state、setter 与 runKnowledgeKit 业务函数
 * @author fxbin
 */
export function useKitState({
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
  const [isRunningKit, setIsRunningKit] = useState(INITIAL_IS_RUNNING_KIT);
  const [kitRunResult, setKitRunResult] = useState(INITIAL_KIT_RUN_RESULT);

  /**
   * 运行指定 Kit。
   * 成功时合并返回的任务、工作区、详情、产物，并记录运行结果；失败时展示失败文案。
   * @param {string} [kitId=DEFAULT_KIT_ID] - Kit ID
   * @returns {Promise<object|null>} 成功返回结果对象，失败返回 null
   * @author fxbin
   */
  async function runKnowledgeKit(kitId = DEFAULT_KIT_ID) {
    if (!selectedWorkspaceId || apiStatus !== API_STATUS_ONLINE || isRunningKit) return null;
    setIsRunningKit(true);
    setActivity(t('activity.runKit'));

    try {
      const result = await api.post(`${WORKSPACES_PATH}/${selectedWorkspaceId}${KITS_RUN_PATH_SUFFIX}`, { kitId });
      setActivity(`${result.message} ${t('activity.completed')} ${result.task.id}`);
      setLatestTaskId(result.task.id);
      setLatestTask(result.task);
      setTasks((current) => prependTask(current, result.task));
      setWorkspaces((current) => [result.workspace, ...current.filter((base) => base.id !== result.workspace.id)]);
      setWorkspaceDetail((current) => ({
        ...current,
        ...result.workspace,
        artifacts: [result.artifact, ...(current.artifacts ?? []).filter((artifact) => artifact.id !== result.artifact.id)],
      }));
      setSelectedArtifact(result.artifact);
      setKitRunResult(result);
      return result;
    } catch {
      setActivity(t('activity.kitFailed'));
      return null;
    } finally {
      setIsRunningKit(false);
    }
  }

  return {
    isRunningKit,
    setIsRunningKit,
    kitRunResult,
    setKitRunResult,
    runKnowledgeKit,
  };
}

export { DEFAULT_KIT_ID };
