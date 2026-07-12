/**
 * 微信读书视图状态枚举常量。
 * 集中管理书籍完成标记、卡片导入状态、Toast 类型、localStorage 标记等状态枚举，
 * 避免在多文件中重复定义或出现魔法值。
 * @module constants/weread/states
 * @author fxbin
 */

/**
 * 统计折叠状态持久化 Key。
 */
const STATS_COLLAPSED_KEY = 'weread-stats-collapsed';

/**
 * 书籍已读完标记值。
 */
const FINISHED_FLAG = 1;

/**
 * 卡片状态：空闲。
 */
const CARD_STATE_IDLE = 'idle';

/**
 * 卡片状态：导入中。
 */
const CARD_STATE_IMPORTING = 'importing';

/**
 * 卡片状态：已完成。
 */
const CARD_STATE_DONE = 'done';

/**
 * 卡片状态：失败。
 */
const CARD_STATE_FAILED = 'failed';

/**
 * Toast 类型：成功。
 */
const TOAST_TYPE_SUCCESS = 'success';

/**
 * Toast 类型：错误。
 */
const TOAST_TYPE_ERROR = 'error';

/**
 * localStorage 标记值：折叠。
 */
const LOCAL_STORAGE_COLLAPSED_FLAG = '1';

/**
 * localStorage 标记值：展开。
 */
const LOCAL_STORAGE_EXPANDED_FLAG = '0';

export {
  STATS_COLLAPSED_KEY,
  FINISHED_FLAG,
  CARD_STATE_IDLE,
  CARD_STATE_IMPORTING,
  CARD_STATE_DONE,
  CARD_STATE_FAILED,
  TOAST_TYPE_SUCCESS,
  TOAST_TYPE_ERROR,
  LOCAL_STORAGE_COLLAPSED_FLAG,
  LOCAL_STORAGE_EXPANDED_FLAG,
};
