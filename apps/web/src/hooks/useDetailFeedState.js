/**
 * 工作区详情视图 · Feed 视图域状态 Hook。
 * 统一管理卡片 Feed 的视图模式、分组折叠、搜索与类型/状态筛选，
 * 以及卡片高亮（包含路径跳转高亮与 Roadmap 节点点击高亮）。
 * @module hooks/useDetailFeedState
 * @author fxbin
 */

import { useEffect, useRef, useState } from 'react';
import { PATH_CARD_ID_STORAGE_KEY } from '../constants/options';

/**
 * 卡片高亮自动清除延时（毫秒）。
 */
const HIGHLIGHT_TIMEOUT_MS = 2000;

/**
 * 滚动到目标卡片时的对齐方式。
 */
const SCROLL_BLOCK = 'center';

/**
 * 滚动到目标卡片时的行为。
 */
const SCROLL_BEHAVIOR = 'smooth';

/**
 * Feed 模式默认值：结构化 Feed。
 */
const INITIAL_FEED_MODE = 'feed';

/**
 * Feed 视图模式默认值：看板视图。
 */
const INITIAL_FEED_VIEW_MODE = 'board';

/**
 * 类型筛选默认值：全部类型。
 */
const INITIAL_FEED_TYPE_FILTER = 'all';

/**
 * 状态筛选默认值：全部状态。
 */
const INITIAL_FEED_STATUS_FILTER = 'all';

/**
 * 搜索关键字初始空字符串。
 */
const INITIAL_FEED_SEARCH = '';

/**
 * 折叠分组初始为空集合。
 */
const INITIAL_COLLAPSED_GROUPS = new Set();

/**
 * 高亮卡片 ID 初始为 null。
 */
const INITIAL_HIGHLIGHTED_CARD_ID = null;

/**
 * 滚动并高亮指定卡片，同时启动高亮自动清除定时器。
 * @param {string} cardId - 卡片 ID
 * @param {object} timerRef - 定时器 ref 对象
 * @param {function} setHighlightedCardId - 高亮 ID setter
 * @author fxbin
 */
function highlightCard(cardId, timerRef, setHighlightedCardId) {
  setHighlightedCardId(cardId);
  const element = document.getElementById(`card-${cardId}`);
  if (element) {
    element.scrollIntoView({ behavior: SCROLL_BEHAVIOR, block: SCROLL_BLOCK });
  }
  if (timerRef.current) clearTimeout(timerRef.current);
  timerRef.current = setTimeout(() => setHighlightedCardId(null), HIGHLIGHT_TIMEOUT_MS);
}

/**
 * 使用 Feed 视图域状态。
 * @param {object} params - 入参对象
 * @param {Array} params.cards - 当前工作区卡片列表（用于路径跳转高亮 effect 依赖）
 * @returns {object} Feed 视图域 state、setter 与高亮交互函数
 * @author fxbin
 */
export function useDetailFeedState({ cards }) {
  const [feedMode, setFeedMode] = useState(INITIAL_FEED_MODE);
  const [feedViewMode, setFeedViewMode] = useState(INITIAL_FEED_VIEW_MODE);
  const [collapsedGroups, setCollapsedGroups] = useState(INITIAL_COLLAPSED_GROUPS);
  const [feedSearch, setFeedSearch] = useState(INITIAL_FEED_SEARCH);
  const [feedTypeFilter, setFeedTypeFilter] = useState(INITIAL_FEED_TYPE_FILTER);
  const [feedStatusFilter, setFeedStatusFilter] = useState(INITIAL_FEED_STATUS_FILTER);
  const [highlightedCardId, setHighlightedCardId] = useState(INITIAL_HIGHLIGHTED_CARD_ID);
  const highlightTimerRef = useRef(null);

  /**
   * 挂载时读取路径视图传递的卡片 ID，滚动并高亮对应卡片。
   * 依赖 cards：当卡片列表加载完成后触发，触发后清除存储键避免重复高亮。
   * @author fxbin
   */
  useEffect(() => {
    const cardId = sessionStorage.getItem(PATH_CARD_ID_STORAGE_KEY);
    if (!cardId) return;
    if (cards.length === 0) return;
    sessionStorage.removeItem(PATH_CARD_ID_STORAGE_KEY);
    highlightCard(cardId, highlightTimerRef, setHighlightedCardId);
  }, [cards]);

  /**
   * 切换 Feed 分组的折叠状态。
   * @param {string} type - 卡片类型
   * @author fxbin
   */
  function toggleGroup(type) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  /**
   * 点击 Roadmap 节点后滚动并高亮对应卡片。
   * @param {string} cardId - 卡片 ID
   * @author fxbin
   */
  function handleRoadmapNodeClick(cardId) {
    highlightCard(cardId, highlightTimerRef, setHighlightedCardId);
  }

  return {
    feedMode,
    setFeedMode,
    feedViewMode,
    setFeedViewMode,
    collapsedGroups,
    feedSearch,
    setFeedSearch,
    feedTypeFilter,
    setFeedTypeFilter,
    feedStatusFilter,
    setFeedStatusFilter,
    highlightedCardId,
    toggleGroup,
    handleRoadmapNodeClick,
  };
}
