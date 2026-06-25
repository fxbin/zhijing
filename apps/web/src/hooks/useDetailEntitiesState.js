/**
 * 工作区详情视图 · 实体提取与提议卡片域状态 Hook。
 * 统一管理实体列表加载/提取、提议卡片选中/采纳/忽略、
 * 无法回答反馈上报等状态与业务函数。
 * @module hooks/useDetailEntitiesState
 * @author fxbin
 */

import { useEffect, useState } from 'react';
import api, { ApiError } from '../utils/api';

/**
 * 工作区接口路径前缀。
 */
const WORKSPACES_PATH = '/api/workspaces';

/**
 * 实体列表接口路径后缀。
 */
const ENTITIES_PATH_SUFFIX = '/entities';

/**
 * 实体提取接口路径后缀。
 */
const ENTITIES_EXTRACT_PATH_SUFFIX = '/entities/extract';

/**
 * 消息接口路径前缀。
 */
const MESSAGES_PATH = '/api/messages';

/**
 * 提议卡片采纳接口路径后缀。
 */
const ACCEPT_CARDS_PATH_SUFFIX = '/accept-cards';

/**
 * 无法回答反馈接口路径。
 */
const CANNOT_ANSWER_FEEDBACK_PATH = '/api/cannot-answer-feedback';

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
 * 提议卡片选中集合初始为空。
 */
const INITIAL_PROPOSED_CARD_SELECTIONS = new Set();

/**
 * 提议卡片采纳进行态初始为 false。
 */
const INITIAL_ACCEPTING_CARDS = false;

/**
 * 提议卡片采纳错误文案初始为空字符串。
 */
const INITIAL_ACCEPT_ERROR = '';

/**
 * 无法回答反馈已上报初始为 false。
 */
const INITIAL_CANNOT_ANSWER_FEEDBACK_SENT = false;

/**
 * 提议卡片选中索引排序比较函数。
 * @param {number} a - 索引 a
 * @param {number} b - 索引 b
 * @returns {number} 排序结果
 * @author fxbin
 */
function compareAscending(a, b) {
  return a - b;
}

/**
 * 使用实体提取与提议卡片域状态。
 * @param {object} params - 入参对象
 * @param {string|null} params.selectedWorkspaceId - 当前选中的工作区 ID
 * @param {object|null} params.assistantAnswer - 助手回答对象（含 proposedCards、messageId、question）
 * @param {string} params.assistantQuestion - 当前助手问题输入（无法回答反馈兜底使用）
 * @param {(newCards: object[], updatedMessage: object) => void} [params.onCardsAccepted] - 提议卡片采纳成功回调
 * @param {function} params.t - i18n 翻译函数
 * @returns {object} 实体与提议卡片域 state、setter 与业务函数
 * @author fxbin
 */
export function useDetailEntitiesState({
  selectedWorkspaceId,
  assistantAnswer,
  assistantQuestion,
  onCardsAccepted,
  t,
}) {
  const [entities, setEntities] = useState(INITIAL_ENTITIES);
  const [loadingEntities, setLoadingEntities] = useState(INITIAL_LOADING_ENTITIES);
  const [extracting, setExtracting] = useState(INITIAL_EXTRACTING);
  const [entityError, setEntityError] = useState(INITIAL_ENTITY_ERROR);
  const [proposedCardSelections, setProposedCardSelections] = useState(INITIAL_PROPOSED_CARD_SELECTIONS);
  const [acceptingCards, setAcceptingCards] = useState(INITIAL_ACCEPTING_CARDS);
  const [acceptError, setAcceptError] = useState(INITIAL_ACCEPT_ERROR);
  const [cannotAnswerFeedbackSent, setCannotAnswerFeedbackSent] = useState(INITIAL_CANNOT_ANSWER_FEEDBACK_SENT);

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
   * 切换到新的助手回答时，重置无法回答反馈已上报状态。
   * @author fxbin
   */
  useEffect(() => {
    setCannotAnswerFeedbackSent(INITIAL_CANNOT_ANSWER_FEEDBACK_SENT);
  }, [assistantAnswer?.question]);

  /**
   * 助手回答的提议卡片变化时，默认全选所有提议卡片。
   * @author fxbin
   */
  useEffect(() => {
    const proposedCards = assistantAnswer?.proposedCards ?? INITIAL_ENTITIES;
    setProposedCardSelections(new Set(proposedCards.map((_, index) => index)));
  }, [assistantAnswer?.proposedCards]);

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

  /**
   * 切换单张提议卡片的选中状态。
   * @param {number} index - 提议卡片索引
   * @author fxbin
   */
  function toggleProposedCard(index) {
    setProposedCardSelections((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  /**
   * 采纳选中的提议卡片，调用后端 API 正式落库。
   * 成功后通过 onCardsAccepted 回调通知父组件更新消息与卡片列表。
   * @returns {Promise<void>}
   * @author fxbin
   */
  async function acceptProposedCards() {
    const messageId = assistantAnswer?.messageId;
    if (!messageId || acceptingCards) return;
    const selectedIndices = Array.from(proposedCardSelections).sort(compareAscending);
    if (selectedIndices.length === 0) return;
    setAcceptingCards(true);
    setAcceptError(INITIAL_ACCEPT_ERROR);
    try {
      const result = await api.post(`${MESSAGES_PATH}/${messageId}${ACCEPT_CARDS_PATH_SUFFIX}`, { selectedIndices });
      if (onCardsAccepted) onCardsAccepted(result.cards ?? INITIAL_ENTITIES, result.message);
    } catch {
      setAcceptError(t('detail.proposedCardsAcceptFailed'));
    } finally {
      setAcceptingCards(false);
    }
  }

  /**
   * 忽略全部提议卡片，清除本地选中状态并通知父组件。
   * @author fxbin
   */
  function dismissProposedCards() {
    setProposedCardSelections(INITIAL_PROPOSED_CARD_SELECTIONS);
    if (onCardsAccepted) onCardsAccepted(INITIAL_ENTITIES, { id: assistantAnswer?.messageId });
  }

  /**
   * 上报"无法回答"反馈到后端。
   * 成功后切换按钮为已上报状态；失败时静默处理，不影响核心功能。
   * @returns {Promise<void>}
   * @author fxbin
   */
  async function submitCannotAnswerFeedback() {
    try {
      await api.post(CANNOT_ANSWER_FEEDBACK_PATH, {
        workspaceId: selectedWorkspaceId,
        question: assistantAnswer?.question ?? assistantQuestion,
      });
      setCannotAnswerFeedbackSent(true);
    } catch {
      // 反馈上报失败不影响核心功能，静默处理
    }
  }

  return {
    entities,
    loadingEntities,
    extracting,
    entityError,
    extractEntitiesAction,
    proposedCardSelections,
    toggleProposedCard,
    acceptingCards,
    acceptError,
    acceptProposedCards,
    dismissProposedCards,
    cannotAnswerFeedbackSent,
    submitCannotAnswerFeedback,
  };
}
