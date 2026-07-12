/**
 * 工作区详情视图 · 实体提取域状态 Hook。
 * 统一管理实体列表加载与提取的状态与业务函数。
 *
 * 注意：提议卡片采纳 / 无法回答反馈已迁移至 useProposedCards，
 * 本 Hook 仅保留实体提取职责，避免与全局助手胶囊重复请求接口。
 *
 * @module hooks/useDetailEntitiesState
 * @author fxbin
 */

import { useEffect, useState } from 'react';
import api, { ApiError } from '../utils/api';
import { WORKSPACES_PATH } from '../constants/apiPaths';

/**
 * 实体列表接口路径后缀。
 */
const ENTITIES_PATH_SUFFIX = '/entities';

/**
 * 实体提取接口路径后缀。
 */
const ENTITIES_EXTRACT_PATH_SUFFIX = '/entities/extract';

/**
 * 实体列表初始为空数组。
 */
const INITIAL_ENTITIES = [];

/**
 * 实体加载态初始为 false。
 */
const INITIAL_LOADING_ENTITIES = false;

/**
 * 实体提取进行态初始为 false。
 */
const INITIAL_EXTRACTING = false;

/**
 * 实体错误文案初始为空字符串。
 */
const INITIAL_ENTITY_ERROR = '';

/**
 * 使用实体提取域状态。
 * @param {object} params - 入参对象
 * @param {string|null} params.selectedWorkspaceId - 当前选中的工作区 ID
 * @param {function} params.t - i18n 翻译函数
 * @returns {object} 实体域 state、setter 与业务函数
 * @author fxbin
 */
export function useDetailEntitiesState({
  selectedWorkspaceId,
  t,
}) {
  const [entities, setEntities] = useState(INITIAL_ENTITIES);
  const [loadingEntities, setLoadingEntities] = useState(INITIAL_LOADING_ENTITIES);
  const [extracting, setExtracting] = useState(INITIAL_EXTRACTING);
  const [entityError, setEntityError] = useState(INITIAL_ENTITY_ERROR);

  /**
   * 工作区切换时加载实体列表。
   * 失败时静默回退到空列表，避免阻塞详情视图渲染。
   * @author fxbin
   */
  useEffect(() => {
    if (!selectedWorkspaceId) return;
    let ignore = false;
    setLoadingEntities(true);
    setEntityError(INITIAL_ENTITY_ERROR);
    async function loadEntities() {
      try {
        const payload = await api.get(`${WORKSPACES_PATH}/${selectedWorkspaceId}${ENTITIES_PATH_SUFFIX}`);
        if (!ignore) setEntities(payload.entities ?? INITIAL_ENTITIES);
      } catch {
        if (!ignore) setEntities(INITIAL_ENTITIES);
      } finally {
        if (!ignore) setLoadingEntities(false);
      }
    }
    loadEntities();
    return () => { ignore = true; };
  }, [selectedWorkspaceId]);

  /**
   * 触发实体提取：调用后端接口刷新实体列表。
   * 网络异常与服务端错误分别给出不同文案。
   * @returns {Promise<void>}
   * @author fxbin
   */
  async function extractEntitiesAction() {
    if (!selectedWorkspaceId || extracting) return;
    setExtracting(true);
    setEntityError(INITIAL_ENTITY_ERROR);
    try {
      const payload = await api.post(`${WORKSPACES_PATH}/${selectedWorkspaceId}${ENTITIES_EXTRACT_PATH_SUFFIX}`);
      setEntities(payload.entities ?? INITIAL_ENTITIES);
    } catch (err) {
      if (err instanceof ApiError && err.status > 0) {
        setEntityError(err.serverMessage ?? t('detail.entityExtractFailed'));
      } else {
        setEntityError(t('detail.entityNetworkError'));
      }
    } finally {
      setExtracting(false);
    }
  }

  return {
    entities,
    loadingEntities,
    extracting,
    entityError,
    extractEntitiesAction,
  };
}
