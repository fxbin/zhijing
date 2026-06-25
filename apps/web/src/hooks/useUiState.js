/**
 * UI/导航域状态 Hook。
 * 统一管理视图切换、搜索输入、活动文案、移动端导航开关、顶栏搜索词、
 * 设置面板分区、API 在线状态、浏览器 AI 状态、提交锁等纯 UI 状态。
 * @module hooks/useUiState
 * @author fxbin
 */

import { useState } from 'react';
import { viewFromHash } from '../utils/navigation';

/**
 * API 状态枚举：检测中。
 */
const API_STATUS_CHECKING = 'checking';

/**
 * API 状态枚举：在线。
 */
const API_STATUS_ONLINE = 'online';

/**
 * API 状态枚举：离线。
 */
const API_STATUS_OFFLINE = 'offline';

/**
 * 浏览器 AI 状态枚举：无可用 API。
 */
const BROWSER_AI_STATUS_NO_API = 'no_api';

/**
 * 顶栏搜索框初始占位文案。
 */
const INITIAL_QUERY = '';

/**
 * 移动端导航默认收起。
 */
const INITIAL_NAV_OPEN = false;

/**
 * 顶栏搜索词默认空字符串。
 */
const INITIAL_TOP_SEARCH_QUERY = '';

/**
 * 设置面板初始不指定分区。
 */
const INITIAL_SETTINGS_SECTION = null;

/**
 * 提交动作初始未进行。
 */
const INITIAL_IS_SUBMITTING = false;

/**
 * 使用 UI/导航域状态。
 * @param {function} t - i18n 翻译函数，用于初始化活动文案
 * @returns {{
 *   view: string,
 *   setView: function,
 *   query: string,
 *   setQuery: function,
 *   activity: string,
 *   setActivity: function,
 *   navOpen: boolean,
 *   setNavOpen: function,
 *   topSearchQuery: string,
 *   setTopSearchQuery: function,
 *   settingsSection: string|null,
 *   setSettingsSection: function,
 *   apiStatus: string,
 *   setApiStatus: function,
 *   browserAiStatus: string,
 *   setBrowserAiStatus: function,
 *   isSubmitting: boolean,
 *   setIsSubmitting: function,
 * }} UI 状态与对应 setter
 * @author fxbin
 */
export function useUiState(t) {
  const [view, setView] = useState(viewFromHash);
  const [query, setQuery] = useState(INITIAL_QUERY);
  const [activity, setActivity] = useState(t('activity.ready'));
  const [navOpen, setNavOpen] = useState(INITIAL_NAV_OPEN);
  const [topSearchQuery, setTopSearchQuery] = useState(INITIAL_TOP_SEARCH_QUERY);
  const [settingsSection, setSettingsSection] = useState(INITIAL_SETTINGS_SECTION);
  const [apiStatus, setApiStatus] = useState(API_STATUS_CHECKING);
  const [browserAiStatus, setBrowserAiStatus] = useState(API_STATUS_CHECKING);
  const [isSubmitting, setIsSubmitting] = useState(INITIAL_IS_SUBMITTING);

  return {
    view,
    setView,
    query,
    setQuery,
    activity,
    setActivity,
    navOpen,
    setNavOpen,
    topSearchQuery,
    setTopSearchQuery,
    settingsSection,
    setSettingsSection,
    apiStatus,
    setApiStatus,
    browserAiStatus,
    setBrowserAiStatus,
    isSubmitting,
    setIsSubmitting,
  };
}

export {
  API_STATUS_CHECKING,
  API_STATUS_ONLINE,
  API_STATUS_OFFLINE,
  BROWSER_AI_STATUS_NO_API,
};
