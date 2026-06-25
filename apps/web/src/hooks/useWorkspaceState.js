/**
 * 工作区数据域状态 Hook。
 * 统一管理工作区列表、资料列表、任务列表、当前选中工作区、工作区详情、
 * 工作区分析数据、最新任务 ID 与最新任务对象，并提供仪表盘加载、详情加载、
 * 分析加载、任务轮询加载、工作区增删改、归集结果应用、资料变更应用等业务函数。
 * 注：消息加载（loadMessages）已下沉到 useAssistantState，因消息列表属于助手域 state。
 * @module hooks/useWorkspaceState
 * @author fxbin
 */

import { useState } from 'react';
import api from '../utils/api';
import { materialFromApi } from '../utils/material';
import { fallbackDetail, emptyDetail } from '../utils/knowledge';
import { seedWorkspaces, seedMaterials } from '../constants/seedData';
import { API_STATUS_ONLINE, API_STATUS_OFFLINE } from './useUiState';

/**
 * 仪表盘接口路径。
 */
const DASHBOARD_PATH = '/api/dashboard';

/**
 * 工作区接口路径前缀。
 */
const WORKSPACES_PATH = '/api/workspaces';

/**
 * 任务接口路径前缀。
 */
const TASKS_PATH = '/api/tasks';

/**
 * 任务列表保留的最大条数。
 */
const TASKS_MAX_COUNT = 8;

/**
 * 资料列表保留的最大条数。
 */
const MATERIALS_MAX_COUNT = 6;

/**
 * 查询参数序列化工具函数：将 workspaceId 拼接到 dashboard 路径。
 * @param {string|null} workspaceId - 工作区 ID
 * @returns {string} 完整请求路径
 */
function buildDashboardUrl(workspaceId) {
  if (!workspaceId) return DASHBOARD_PATH;
  return `${DASHBOARD_PATH}?workspaceId=${encodeURIComponent(workspaceId)}`;
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
 * 将资料前置并去重，截断到最大保留条数。
 * @param {Array} materials - 当前资料列表
 * @param {object} material - 待插入的资料（API 原始结构）
 * @returns {Array} 处理后的资料列表
 */
function prependMaterial(materials, material) {
  return [materialFromApi(material), ...materials.filter((item) => item.id !== material.id)].slice(0, MATERIALS_MAX_COUNT);
}

/**
 * 使用工作区数据域状态。
 * @param {object} params - 入参对象
 * @param {string} params.apiStatus - 当前 API 在线状态，用于决定详情回退策略
 * @param {function} params.setApiStatus - 设置 API 在线状态
 * @param {function} params.setEditingKb - 设置编辑中的工作区模态框状态
 * @param {function} params.setDeletingKb - 设置删除中的工作区模态框状态
 * @param {function} params.go - 视图跳转函数
 * @param {function} params.t - i18n 翻译函数
 * @returns {object} 工作区数据域 state、setter 与业务函数
 * @author fxbin
 */
export function useWorkspaceState({
  apiStatus,
  setApiStatus,
  setEditingKb,
  setDeletingKb,
  go,
  t,
}) {
  const [workspaces, setWorkspaces] = useState(seedWorkspaces);
  const [materials, setMaterials] = useState(seedMaterials);
  const [tasks, setTasks] = useState([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(null);
  const [workspaceDetail, setWorkspaceDetail] = useState(fallbackDetail);
  const [workspaceAnalytics, setWorkspaceAnalytics] = useState(null);
  const [latestTaskId, setLatestTaskId] = useState(null);
  const [latestTask, setLatestTask] = useState(null);

  /**
   * 加载仪表盘数据：工作区列表、资料列表、任务列表，并自动选中首个工作区。
   * @param {string|null} currentSelectedId - 当前选中的工作区 ID
   * @param {function} [isCancelled] - 取消判定函数，返回 true 时跳过状态写入（用于 effect 清理）
   * @returns {Promise<void>}
   * @author fxbin
   */
  async function loadDashboard(currentSelectedId, isCancelled = () => false) {
    try {
      const url = buildDashboardUrl(currentSelectedId);
      const dashboard = await api.get(url);
      if (isCancelled()) return;
      const nextWorkspaces = dashboard.workspaces ?? [];
      const nextMaterials = dashboard.materials ?? [];
      const nextTasks = dashboard.tasks ?? [];
      setApiStatus(API_STATUS_ONLINE);
      setWorkspaces(nextWorkspaces);
      setMaterials(nextMaterials.map(materialFromApi));
      setTasks(nextTasks);
      setSelectedWorkspaceId((current) => {
        if (current || nextWorkspaces.length === 0) return current;
        return nextWorkspaces[0].id;
      });
      if (nextTasks.length) {
        setLatestTaskId(nextTasks[0].id);
        setLatestTask(nextTasks[0]);
      } else {
        setLatestTaskId(null);
        setLatestTask(null);
      }
    } catch {
      if (!isCancelled()) setApiStatus(API_STATUS_OFFLINE);
    }
  }

  /**
   * 加载指定工作区的详情。
   * @param {string} workspaceId - 工作区 ID
   * @param {function} [isCancelled] - 取消判定函数
   * @returns {Promise<void>}
   * @author fxbin
   */
  async function loadDetail(workspaceId, isCancelled = () => false) {
    try {
      const detail = await api.get(`${WORKSPACES_PATH}/${workspaceId}`);
      if (!isCancelled()) setWorkspaceDetail(detail);
    } catch {
      if (!isCancelled()) setWorkspaceDetail(fallbackDetail());
    }
  }

  /**
   * 加载指定工作区的分析数据。
   * @param {string} workspaceId - 工作区 ID
   * @param {function} [isCancelled] - 取消判定函数
   * @returns {Promise<void>}
   * @author fxbin
   */
  async function loadAnalytics(workspaceId, isCancelled = () => false) {
    try {
      const analytics = await api.get(`${WORKSPACES_PATH}/${workspaceId}/analytics`);
      if (!isCancelled()) setWorkspaceAnalytics(analytics);
    } catch {
      if (!isCancelled()) setWorkspaceAnalytics(null);
    }
  }

  /**
   * 加载指定任务详情（轮询用）。
   * @param {string} taskId - 任务 ID
   * @param {function} [isCancelled] - 取消判定函数
   * @returns {Promise<void>}
   * @author fxbin
   */
  async function loadTask(taskId, isCancelled = () => false) {
    try {
      const task = await api.get(`${TASKS_PATH}/${taskId}`);
      if (!isCancelled()) setLatestTask(task);
    } catch {
      // API 不可用时保留上一次任务状态
    }
  }

  /**
   * 应用归集结果：更新最新任务、任务列表、选中工作区、工作区列表，并按需合并资料/卡片/产物到详情。
   * @param {object} result - 归集接口返回结果
   * @author fxbin
   */
  function applyIntakeResult(result) {
    setLatestTaskId(result.task.id);
    setLatestTask(result.task);
    setTasks((current) => prependTask(current, result.task));
    setSelectedWorkspaceId(result.workspace.id);
    setWorkspaces((current) => {
      const withoutDuplicate = current.filter((base) => base.id !== result.workspace.id && base.title !== result.workspace.title);
      return [result.workspace, ...withoutDuplicate];
    });
    if (result.material) {
      setMaterials((current) => prependMaterial(current, result.material));
      setWorkspaceDetail((current) => (current.id === result.workspace.id ? ({
        ...current,
        ...result.workspace,
        materials: [result.material, ...(current.materials ?? []).filter((material) => material.id !== result.material.id)],
        cards: [...(result.cards ?? []), ...(current.cards ?? []).filter((card) => !(result.cards ?? []).some((item) => item.id === card.id))],
        artifacts: result.artifact
          ? [result.artifact, ...(current.artifacts ?? []).filter((artifact) => artifact.id !== result.artifact.id)]
          : current.artifacts ?? [],
      }) : current));
    }
  }

  /**
   * 应用资料变更结果：更新任务、工作区、资料、详情，并按需更新选中产物。
   * @param {object} result - 资料变更接口返回结果
   * @author fxbin
   */
  function applyMaterialMutation(result, setSelectedArtifact) {
    if (!result?.material) return;
    if (result.task) {
      setLatestTaskId(result.task.id);
      setLatestTask(result.task);
      setTasks((current) => prependTask(current, result.task));
    }
    if (result.workspace) {
      setWorkspaces((current) => [result.workspace, ...current.filter((base) => base.id !== result.workspace.id)]);
    }
    setMaterials((current) => prependMaterial(current, result.material));
    setWorkspaceDetail((current) => {
      const isTargetDetail = current.id === result.material.workspaceId;
      const isPreviousDetail = current.id === result.previousWorkspaceId;
      if (!isTargetDetail && !isPreviousDetail) return current;
      if (isPreviousDetail && !isTargetDetail) {
        return {
          ...current,
          materials: (current.materials ?? []).filter((material) => material.id !== result.material.id),
        };
      }
      return {
        ...current,
        ...(result.workspace ?? {}),
        materials: [result.material, ...(current.materials ?? []).filter((material) => material.id !== result.material.id)],
        cards: [...(result.cards ?? []), ...(current.cards ?? []).filter((card) => !(result.cards ?? []).some((item) => item.id === card.id))],
        artifacts: result.artifact
          ? [result.artifact, ...(current.artifacts ?? []).filter((artifact) => artifact.id !== result.artifact.id)]
          : current.artifacts ?? [],
      };
    });
    if (result.artifact) setSelectedArtifact(result.artifact);
  }

  /**
   * 保存工作区编辑：标题与摘要。
   * @param {string} id - 工作区 ID
   * @param {string} title - 标题
   * @param {string} summary - 摘要
   * @author fxbin
   */
  async function handleSaveWorkspace(id, title, summary) {
    try {
      const result = await api.put(`${WORKSPACES_PATH}/${id}`, { title, summary });
      setWorkspaces((current) => current.map((base) => (base.id === id ? result.workspace : base)));
      setEditingKb(null);
    } catch (err) {
      setEditingKb((current) => ({ ...current, error: err.serverMessage || err.message || t('workspace.edit') }));
    }
  }

  /**
   * 创建工作区，成功后切换到详情视图。
   * @param {object} param0 - 入参对象
   * @param {string} param0.title - 标题
   * @param {string} param0.summary - 摘要
   * @throws {Error} 创建失败时抛出包含服务端文案的错误
   * @author fxbin
   */
  async function handleCreateWorkspace({ title, summary }) {
    let result;
    try {
      result = await api.post(WORKSPACES_PATH, { title, summary });
    } catch (err) {
      throw new Error(err.serverMessage || err.message || t('common.createFailed'));
    }
    if (result.workspace?.id) {
      setWorkspaces((current) => [
        result.workspace,
        ...current.filter((base) => base.id !== result.workspace.id),
      ]);
      setSelectedWorkspaceId(result.workspace.id);
      go('detail');
    }
  }

  /**
   * 删除工作区，成功后若删除的是当前选中工作区则清空选中。
   * @param {string} id - 工作区 ID
   * @author fxbin
   */
  async function handleDeleteWorkspace(id, currentSelectedId) {
    try {
      await api.del(`${WORKSPACES_PATH}/${id}`);
      setWorkspaces((current) => current.filter((base) => base.id !== id));
      if (currentSelectedId === id) {
        setSelectedWorkspaceId(null);
      }
      setDeletingKb(null);
    } catch (err) {
      setDeletingKb((current) => ({ ...current, error: err.serverMessage || err.message || t('workspace.delete') }));
    }
  }

  /**
   * 重置工作区详情为空或回退态（依据 API 状态），并清空分析数据。
   * @author fxbin
   */
  function resetDetailForEmptySelection() {
    setWorkspaceDetail(apiStatus === API_STATUS_ONLINE ? emptyDetail() : fallbackDetail());
    setWorkspaceAnalytics(null);
  }

  return {
    workspaces,
    setWorkspaces,
    materials,
    setMaterials,
    tasks,
    setTasks,
    selectedWorkspaceId,
    setSelectedWorkspaceId,
    workspaceDetail,
    setWorkspaceDetail,
    workspaceAnalytics,
    setWorkspaceAnalytics,
    latestTaskId,
    setLatestTaskId,
    latestTask,
    setLatestTask,
    loadDashboard,
    loadDetail,
    loadAnalytics,
    loadTask,
    applyIntakeResult,
    applyMaterialMutation,
    handleSaveWorkspace,
    handleCreateWorkspace,
    handleDeleteWorkspace,
    resetDetailForEmptySelection,
  };
}

export {
  TASKS_MAX_COUNT,
  MATERIALS_MAX_COUNT,
};
