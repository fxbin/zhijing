/**
 * 微信读书视图分页与列表行为常量。
 * 集中管理列表初始可见条数、滚动加载增量、搜索防抖、骨架屏、Toast 自动消失等行为阈值，
 * 避免在多文件中重复定义或出现魔法值。
 * @module constants/weread/pagination
 * @author fxbin
 */

/**
 * 列表初始可见条数。
 */
const INITIAL_PAGE_SIZE = 60;

/**
 * 列表滚动加载增量。
 */
const PAGE_INCREMENT = 60;

/**
 * 搜索防抖时长（毫秒）。
 */
const SEARCH_DEBOUNCE_MS = 200;

/**
 * 骨架屏占位数量。
 */
const SKELETON_COUNT = 12;

/**
 * Toast 自动消失时长（毫秒）。
 */
const TOAST_AUTODISMISS_MS = 4000;

/**
 * 滚动加载 rootMargin。
 */
const SCROLL_ROOT_MARGIN = '240px';

export {
  INITIAL_PAGE_SIZE,
  PAGE_INCREMENT,
  SEARCH_DEBOUNCE_MS,
  SKELETON_COUNT,
  TOAST_AUTODISMISS_MS,
  SCROLL_ROOT_MARGIN,
};
