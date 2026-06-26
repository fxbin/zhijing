/**
 * 资料解析域状态 Hook。
 * 统一管理当前正在解析的资料 ID，并提供 parseMaterial 业务函数：
 * 调用资料解析接口，合并返回的任务、详情、工作区、产物。
 * @module hooks/useMaterialParseState
 * @author fxbin
 */

import { useState } from 'react';
import api from '../utils/api';
import { TASKS_MAX_COUNT } from './useWorkspaceState';

/**
 * 资料接口路径前缀。
 */
const MATERIALS_PATH = '/api/materials';

/**
 * 资料解析接口路径后缀。
 */
const PARSE_PATH_SUFFIX = '/parse';

/**
 * 解析中资料 ID 初始为 null（无解析任务）。
 */
const INITIAL_PARSING_MATERIAL_ID = null;

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
 * 使用资料解析域状态。
 * @param {object} params - 入参对象
 * @param {function} params.setActivity - 设置活动文案（UI 域 setter）
 * @param {function} params.setTasks - 设置任务列表
 * @param {function} params.setLatestTaskId - 设置最新任务 ID
 * @param {function} params.setLatestTask - 设置最新任务对象
 * @param {function} params.setWorkspaceDetail - 设置工作区详情
 * @param {function} params.setWorkspaces - 设置工作区列表
 * @param {function} params.setSelectedArtifact - 设置当前选中的产物
 * @param {function} params.t - i18n 翻译函数
 * @returns {object} 资料解析域 state、setter 与 parseMaterial 业务函数
 * @author fxbin
 */
export function useMaterialParseState({
  setActivity,
  setTasks,
  setLatestTaskId,
  setLatestTask,
  setWorkspaceDetail,
  setWorkspaces,
  setSelectedArtifact,
  t,
}) {
  const [parsingMaterialId, setParsingMaterialId] = useState(INITIAL_PARSING_MATERIAL_ID);

  /**
   * 解析指定资料。
   * 成功时合并返回的任务、详情、工作区、产物；失败时展示失败文案。
   * @param {string} materialId - 资料 ID
   * @returns {Promise<object|null>} 成功返回结果对象，失败返回 null
   * @author fxbin
   */
  async function parseMaterial(materialId) {
    if (!materialId || parsingMaterialId) return null;
    setParsingMaterialId(materialId);
    setActivity(t('activity.parseMaterial'));

    try {
      const result = await api.post(`${MATERIALS_PATH}/${materialId}${PARSE_PATH_SUFFIX}`, null, { timeout: 120000 });
      setActivity(result.message);
      setLatestTaskId(result.task.id);
      setLatestTask(result.task);
      setTasks((current) => prependTask(current, result.task));
      setWorkspaceDetail((current) => ({
        ...current,
        ...(result.workspace ?? {}),
        materials: [result.material, ...(current.materials ?? []).filter((material) => material.id !== result.material.id)],
        cards: [...(result.cards ?? []), ...(current.cards ?? []).filter((card) => !(result.cards ?? []).some((item) => item.id === card.id))],
        artifacts: result.artifact
          ? [result.artifact, ...(current.artifacts ?? []).filter((artifact) => artifact.id !== result.artifact.id)]
          : current.artifacts ?? [],
      }));
      setWorkspaces((current) => (result.workspace
        ? [result.workspace, ...current.filter((base) => base.id !== result.workspace.id)]
        : current));
      if (result.artifact) setSelectedArtifact(result.artifact);
      return result;
    } catch {
      setActivity(t('activity.parseFailed'));
      return null;
    } finally {
      setParsingMaterialId(null);
    }
  }

  return {
    parsingMaterialId,
    setParsingMaterialId,
    parseMaterial,
  };
}
