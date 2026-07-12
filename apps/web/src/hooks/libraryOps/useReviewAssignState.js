/**
 * 资料库操作域 · 复核与归属状态 Hook。
 *
 * 管理资料复核抽屉与归属草稿相关状态：复核中资料 ID、复核草稿（标题/正文/媒体 URL）、
 * 归属草稿（按资料 ID 索引）、新建工作区标题草稿、归属建议提示、变更中资料 ID 互斥锁。
 * 提供打开/关闭复核、保存复核草稿（可选标记已摄入）、单条归属、归属建议四类业务函数。
 *
 * 依赖数据域 hook 提供的 setStatus / loadMaterials，以及外部 onMaterialMutation 回调。
 *
 * @module hooks/libraryOps/useReviewAssignState
 * @author fxbin
 */

import { useState } from 'react';
import api from '../../utils/api';
import {
  materialMediaUrls,
  splitMediaUrls,
} from '../../utils/material';
import { MATERIALS_PATH } from '../../constants/apiPaths';
import {
  INITIAL_REVIEW_DRAFT,
  NEW_WORKSPACE_MARKER,
} from './constants';

/**
 * 使用复核与归属状态。
 * @param {object} params - 入参对象
 * @param {function} params.t - i18n 翻译函数
 * @param {string} params.apiStatus - API 连接状态
 * @param {function} params.setStatus - 设置状态文案（来自数据域 hook）
 * @param {function} params.loadMaterials - 重新加载资料列表（来自数据域 hook）
 * @param {function} [params.onMaterialMutation] - 资料变更回调
 * @returns {object} 复核/归属域 state、setter 与业务函数
 * @author fxbin
 */
export function useReviewAssignState({
  t,
  apiStatus,
  setStatus,
  loadMaterials,
  onMaterialMutation,
}) {
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewDraft, setReviewDraft] = useState(INITIAL_REVIEW_DRAFT);
  const [assignDrafts, setAssignDrafts] = useState({});
  const [newBaseTitles, setNewBaseTitles] = useState({});
  const [assignmentHints, setAssignmentHints] = useState({});
  const [mutatingMaterialId, setMutatingMaterialId] = useState(null);

  /**
   * 开启复核抽屉：设置复核资料 ID 并根据资料初始化复核草稿。
   * 关闭动作统一由 closeReview 负责，避免与抽屉 onClose 行为冲突。
   * @param {object} item - 资料对象
   * @author fxbin
   */
  function openReview(item) {
    setReviewingId(item.id);
    setReviewDraft({
      title: item.title ?? '',
      contentText: item.contentText ?? '',
      mediaUrls: (materialMediaUrls(item) ?? []).join('\n'),
    });
  }

  /**
   * 关闭复核抽屉：清空复核资料 ID。草稿不主动重置，下次 openReview 会重新初始化。
   * @author fxbin
   */
  function closeReview() {
    setReviewingId(null);
  }

  /**
   * 保存复核草稿：可选标记为已摄入，结束后重新加载资料。
   * @param {object} item - 资料对象
   * @param {boolean} markIngested - 是否标记为已摄入
   * @author fxbin
   */
  async function saveReview(item, markIngested) {
    if (!item?.id || apiStatus !== 'online' || mutatingMaterialId) return;
    setMutatingMaterialId(item.id);
    setStatus(markIngested ? t('library.status.completingMaterial') : t('library.status.savingReviewDraft'));
    try {
      const result = await api.post(`${MATERIALS_PATH}/${item.id}/review`, {
        title: reviewDraft.title,
        contentText: reviewDraft.contentText,
        mediaUrls: splitMediaUrls(reviewDraft.mediaUrls),
        markIngested,
      });
      onMaterialMutation?.(result);
      setStatus(result.message);
      if (markIngested) setReviewingId(null);
      await loadMaterials();
    } catch {
      setStatus(t('library.status.saveReviewFailed'));
    } finally {
      setMutatingMaterialId(null);
    }
  }

  /**
   * 归属单条资料：依据草稿选择的目标工作区或新建工作区标题调用归属接口。
   * @param {object} item - 资料对象
   * @author fxbin
   */
  async function assignMaterial(item) {
    if (!item?.id || apiStatus !== 'online' || mutatingMaterialId) return;
    const target = assignDrafts[item.id] ?? item.workspaceId ?? '';
    const newWorkspaceTitle = (newBaseTitles[item.id] ?? item.title ?? '').trim();
    if (!target) return;
    if (target === item.workspaceId && target !== NEW_WORKSPACE_MARKER) {
      setStatus(t('library.status.alreadyInThisKb'));
      setAssignDrafts((current) => ({ ...current, [item.id]: undefined }));
      return;
    }
    setMutatingMaterialId(item.id);
    setStatus(t('library.status.updatingAssignment'));
    try {
      const result = await api.post(
        `${MATERIALS_PATH}/${item.id}/assign`,
        target === NEW_WORKSPACE_MARKER ? { newWorkspaceTitle } : { workspaceId: target },
      );
      onMaterialMutation?.(result);
      setStatus(result.message);
      setAssignDrafts((current) => ({ ...current, [item.id]: result.workspace.id }));
      await loadMaterials();
    } catch {
      setStatus(t('library.status.moveMaterialFailed'));
    } finally {
      setMutatingMaterialId(null);
    }
  }

  /**
   * 请求归属建议：调用建议接口，写入归属草稿、新建标题与提示文案。
   * @param {object} item - 资料对象
   * @author fxbin
   */
  async function suggestAssignment(item) {
    if (!item?.id || apiStatus !== 'online' || mutatingMaterialId) return;
    setMutatingMaterialId(item.id);
    setStatus(t('library.status.findingSuggestion'));
    try {
      const result = await api.get(`${MATERIALS_PATH}/${item.id}/assignment-suggestions`);
      const suggestion = result.suggestions?.[0];
      if (suggestion?.isNew) {
        setAssignDrafts((current) => ({ ...current, [item.id]: NEW_WORKSPACE_MARKER }));
        setNewBaseTitles((current) => ({ ...current, [item.id]: suggestion.title }));
      } else if (suggestion?.workspaceId) {
        setAssignDrafts((current) => ({ ...current, [item.id]: suggestion.workspaceId }));
      }
      setAssignmentHints((current) => ({
        ...current,
        [item.id]: suggestion ? `${suggestion.title} · ${suggestion.reason}` : result.message,
      }));
      setStatus(result.message);
    } catch {
      setStatus(t('library.status.suggestionFailed'));
    } finally {
      setMutatingMaterialId(null);
    }
  }

  return {
    reviewingId,
    reviewDraft,
    setReviewDraft,
    assignDrafts,
    setAssignDrafts,
    newBaseTitles,
    setNewBaseTitles,
    assignmentHints,
    setAssignmentHints,
    mutatingMaterialId,
    openReview,
    closeReview,
    saveReview,
    assignMaterial,
    suggestAssignment,
  };
}
