/**
 * WeReadView 子组件共享的工具函数与分类主题映射。
 *
 * 该模块从 WeReadView.jsx 中拆分而来，集中存放与微信读书视图相关的纯函数：
 * - 微信读书 Web 端书籍 URL 拼装
 * - 剪贴板复制（带 execCommand 兜底）
 * - 相对时间格式化（依赖 i18n）
 * - 分类主题解析（CATEGORY_THEME_MAP / CATEGORY_KEYWORD_MAP / resolveCategoryTheme）
 * - 书籍卡片 submeta 构造（buildBookSubmeta）
 *
 * 注意：本模块不引入 React，保持为纯工具函数集合，便于子组件复用。
 *
 * @module views/weread/utils
 * @author fxbin
 */

import {
  WEREAD_WEB_ORIGIN,
  WEREAD_WEB_READER_PATH,
  MS_PER_SECOND,
  MINUTE_SECONDS,
  HOUR_SECONDS,
  DAY_SECONDS,
  MONTH_SECONDS,
  YEAR_SECONDS,
  FINISHED_FLAG,
} from '../../constants/weread';

/**
 * 拼装微信读书 Web 端阅读器 URL。
 * 优先使用长 bookId，缺失时回退到主页 origin。
 * @param {Object} book - 书籍元数据对象
 * @param {string} [book.bookIdLong] - 微信读书长 bookId
 * @returns {string} 完整的阅读器 URL
 */
const wereadWebBookUrl = (book) => {
  if (book?.bookIdLong) {
    return `${WEREAD_WEB_ORIGIN}${WEREAD_WEB_READER_PATH}${book.bookIdLong}`;
  }
  return WEREAD_WEB_ORIGIN;
};

/**
 * 复制文本到剪贴板(兼容 HTTPS 与降级场景)
 * 优先使用 navigator.clipboard,失败时回退到 textarea + execCommand
 * @param {string} text - 待复制文本
 * @returns {Promise<boolean>} 是否复制成功
 */
async function copyTextToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // 进入降级路径
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

/**
 * 格式化相对时间
 * 输入秒级时间戳，输出"刚刚"/"X分钟前"/"X小时前"/"X天前"/"X个月前"/"X年前"
 * 0 或 null 返回空字符串
 * @param {number} timestamp - 秒级时间戳
 * @param {Function} t - i18n 翻译函数
 * @returns {string} 格式化后的相对时间
 */
function formatRelativeTime(timestamp, t) {
  if (!timestamp) return '';
  const now = Math.floor(Date.now() / MS_PER_SECOND);
  const diff = now - timestamp;
  if (diff < MINUTE_SECONDS) return t('time.justNow');
  if (diff < HOUR_SECONDS) {
    return t('weread.minutesAgo', { count: Math.floor(diff / MINUTE_SECONDS) });
  }
  if (diff < DAY_SECONDS) {
    return t('weread.hoursAgo', { count: Math.floor(diff / HOUR_SECONDS) });
  }
  if (diff < MONTH_SECONDS) {
    return t('weread.daysAgo', { count: Math.floor(diff / DAY_SECONDS) });
  }
  if (diff < YEAR_SECONDS) {
    return t('weread.monthsAgo', { count: Math.floor(diff / MONTH_SECONDS) });
  }
  return t('weread.yearsAgo', { count: Math.floor(diff / YEAR_SECONDS) });
}

/**
 * 分类主题色映射表。
 * 与知识卡片类型颜色保持一致，用于 CategoryChip、StatsBand、RecommendPanel 等。
 */
const CATEGORY_THEME_MAP = {
  concept: { color: '#2C5F8D', bg: 'rgba(44,95,141,0.14)' },
  method: { color: '#6B8E7F', bg: 'rgba(107,142,127,0.18)' },
  fact: { color: '#8B6FB0', bg: 'rgba(139,111,176,0.16)' },
  question: { color: '#D4944A', bg: 'rgba(212,148,74,0.18)' },
  general: { color: 'var(--muted)', bg: 'rgba(69,71,76,0.10)' },
};

/**
 * 分类关键词到主题名的规则表。
 * 顺序敏感：自上而下匹配，命中即返回对应主题。
 */
const CATEGORY_KEYWORD_MAP = [
  { keys: ['经济', '理财', '投资', '商业', '创业', '管理', '金融'], theme: 'concept' },
  { keys: ['计算机', '编程', '互联网', '科技', '自然科学', '工程', '医学', '数学'], theme: 'method' },
  { keys: ['心理', '社科', '哲学', '教育', '社会', '政治', '法学', '宗教'], theme: 'fact' },
  { keys: ['文学', '小说', '散文', '传记', '艺术', '历史', '诗歌', '漫画'], theme: 'question' },
];

/**
 * 依据分类名解析对应的主题色对象。
 * 遍历 CATEGORY_KEYWORD_MAP 关键词命中即返回；无命中返回 general 主题；空入参返回 null。
 * @param {string} category - 分类名称
 * @returns {{color: string, bg: string} | null}
 */
function resolveCategoryTheme(category) {
  if (!category) return null;
  for (const rule of CATEGORY_KEYWORD_MAP) {
    if (rule.keys.some((k) => category.includes(k))) {
      return CATEGORY_THEME_MAP[rule.theme];
    }
  }
  return CATEGORY_THEME_MAP.general;
}

/**
 * 构建书籍卡片的 submeta 显示信息
 * 降级链：已导入 > 已读完 > 在读 > 仅有年份 > 不显示
 * @param {Object} book - 书籍元数据对象
 * @param {Function} t - i18n 翻译函数
 * @returns {{text: string, dotClass: string} | null}
 */
function buildBookSubmeta(book, t) {
  if (book.materialId) {
    return {
      text: t('weread.metaImported', { count: book.bookmarkCount || 0 }),
      dotClass: 'is-imported',
    };
  }
  if (book.finishReading === FINISHED_FLAG) {
    const time = formatRelativeTime(book.readUpdateTime, t);
    return {
      text: time ? `${t('weread.metaFinished')} · ${time}` : t('weread.metaFinished'),
      dotClass: 'is-finished',
    };
  }
  if (book.readUpdateTime) {
    const time = formatRelativeTime(book.readUpdateTime, t);
    const year = book.archiveYear || '';
    return {
      text: year ? `${t('weread.metaYearJoined', { year })} · ${time}` : time,
      dotClass: 'is-reading',
    };
  }
  if (book.archiveYear) {
    return {
      text: t('weread.metaYearJoined', { year: book.archiveYear }),
      dotClass: 'is-reading',
    };
  }
  return null;
}

export {
  wereadWebBookUrl,
  copyTextToClipboard,
  formatRelativeTime,
  resolveCategoryTheme,
  buildBookSubmeta,
  CATEGORY_THEME_MAP,
  CATEGORY_KEYWORD_MAP,
};
