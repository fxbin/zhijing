/**
 * 模态框域状态 Hook。
 * 统一管理创建知识库弹窗开关与错误、编辑中知识库、删除中知识库四类模态框状态。
 * 这些状态由 App 顶层的 useModalA11y 直接消费，故单独成域。
 * @module hooks/useModalState
 * @author fxbin
 */

import { useState } from 'react';

/**
 * 创建知识库弹窗初始关闭。
 */
const INITIAL_IS_CREATE_KB_OPEN = false;

/**
 * 创建知识库错误初始为 null。
 */
const INITIAL_CREATE_KB_ERROR = null;

/**
 * 编辑中知识库初始为 null。
 */
const INITIAL_EDITING_KB = null;

/**
 * 删除中知识库初始为 null。
 */
const INITIAL_DELETING_KB = null;

/**
 * 使用模态框域状态。
 * @returns {object} 模态框域 state 与对应 setter
 * @author fxbin
 */
export function useModalState() {
  const [isCreateKbOpen, setIsCreateKbOpen] = useState(INITIAL_IS_CREATE_KB_OPEN);
  const [createKbError, setCreateKbError] = useState(INITIAL_CREATE_KB_ERROR);
  const [editingKb, setEditingKb] = useState(INITIAL_EDITING_KB);
  const [deletingKb, setDeletingKb] = useState(INITIAL_DELETING_KB);

  return {
    isCreateKbOpen,
    setIsCreateKbOpen,
    createKbError,
    setCreateKbError,
    editingKb,
    setEditingKb,
    deletingKb,
    setDeletingKb,
  };
}
