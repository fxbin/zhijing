/**
 * 微信读书视图时间换算常量。
 * 集中管理毫秒/秒/百分比换算基数以及各时间单位对应的秒数，
 * 避免在多文件中重复定义或出现魔法值。
 * @module constants/weread/time
 * @author fxbin
 */

/**
 * 毫秒与秒换算基数。
 */
const MS_PER_SECOND = 1000;

/**
 * 百分比换算基数。
 */
const PERCENT_BASE = 100;

/**
 * 一分钟对应的秒数。
 */
const MINUTE_SECONDS = 60;

/**
 * 一小时对应的秒数。
 */
const HOUR_SECONDS = 3600;

/**
 * 一天对应的秒数。
 */
const DAY_SECONDS = 86400;

/**
 * 一个月对应的秒数（按 30 天近似）。
 */
const MONTH_SECONDS = 2592000;

/**
 * 一年对应的秒数（按 365 天近似）。
 */
const YEAR_SECONDS = 31536000;

export {
  MS_PER_SECOND,
  PERCENT_BASE,
  MINUTE_SECONDS,
  HOUR_SECONDS,
  DAY_SECONDS,
  MONTH_SECONDS,
  YEAR_SECONDS,
};
