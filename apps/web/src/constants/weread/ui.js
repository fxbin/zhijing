/**
 * 微信读书视图 UI 枚举常量。
 * 集中管理标签页、排序、视图模式、过滤器、预览类型、推荐理由等 UI 层枚举，
 * 避免在多文件中重复定义或出现魔法值。
 * @module constants/weread/ui
 * @author fxbin
 */

/**
 * 标签页：书架。
 */
const TAB_BOOKS = 'books';

/**
 * 标签页：书单。
 */
const TAB_ALBUMS = 'albums';

/**
 * 标签页：归档。
 */
const TAB_ARCHIVE = 'archive';

/**
 * 标签页：回顾。
 */
const TAB_REVIEW = 'review';

/**
 * 标签页：统计。
 */
const TAB_STATS = 'stats';

/**
 * 标签页：推荐。
 */
const TAB_RECOMMEND = 'recommend';

/**
 * 排序方式：最近阅读。
 */
const SORT_RECENT = 'recent';

/**
 * 排序方式：标题。
 */
const SORT_TITLE = 'title';

/**
 * 排序方式：作者。
 */
const SORT_AUTHOR = 'author';

/**
 * 视图模式：网格。
 */
const VIEW_GRID = 'grid';

/**
 * 视图模式：列表。
 */
const VIEW_LIST = 'list';

/**
 * 过滤器：全部。
 */
const FILTER_ALL = 'all';

/**
 * 过滤器：已读完。
 */
const FILTER_FINISHED = 'finished';

/**
 * 过滤器：在读。
 */
const FILTER_READING = 'reading';

/**
 * 过滤器：已导入。
 */
const FILTER_IMPORTED = 'imported';

/**
 * 预览笔记类型：全部。
 */
const PREVIEW_TYPE_ALL = 'all';

/**
 * 预览笔记类型：划线。
 */
const PREVIEW_TYPE_BOOKMARK = 'bookmark';

/**
 * 预览笔记类型：评论。
 */
const PREVIEW_TYPE_REVIEW = 'review';

/**
 * 预览模式：单本。
 */
const PREVIEW_MODE_SINGLE = 'single';

/**
 * 预览模式：批量。
 */
const PREVIEW_MODE_BATCH = 'batch';

/**
 * 推荐理由：覆盖缺口。
 */
const REASON_COVERAGE_GAP = 'coverage_gap';

/**
 * 推荐理由：深度补充。
 */
const REASON_DEPTH = 'depth';

/**
 * 推荐理由默认值：卡片关联。
 */
const REASON_CARD_LINKED = 'card_linked';

export {
  TAB_BOOKS,
  TAB_ALBUMS,
  TAB_ARCHIVE,
  TAB_REVIEW,
  TAB_STATS,
  TAB_RECOMMEND,
  SORT_RECENT,
  SORT_TITLE,
  SORT_AUTHOR,
  VIEW_GRID,
  VIEW_LIST,
  FILTER_ALL,
  FILTER_FINISHED,
  FILTER_READING,
  FILTER_IMPORTED,
  PREVIEW_TYPE_ALL,
  PREVIEW_TYPE_BOOKMARK,
  PREVIEW_TYPE_REVIEW,
  PREVIEW_MODE_SINGLE,
  PREVIEW_MODE_BATCH,
  REASON_COVERAGE_GAP,
  REASON_DEPTH,
  REASON_CARD_LINKED,
};
