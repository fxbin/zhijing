/**
 * 微信读书 Web 端配置常量。
 * 集中管理微信读书 Web 端域名与阅读器路径前缀，
 * 避免在多文件中重复定义或出现魔法值。
 * @module constants/weread/web
 * @author fxbin
 */

/**
 * 微信读书 Web 端域名。
 */
const WEREAD_WEB_ORIGIN = 'https://weread.qq.com';

/**
 * 微信读书 Web 端阅读器路径前缀。
 */
const WEREAD_WEB_READER_PATH = '/web/reader/';

export {
  WEREAD_WEB_ORIGIN,
  WEREAD_WEB_READER_PATH,
};
