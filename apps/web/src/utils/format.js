/**
 * 格式化工具函数：百分比、文件名、修订时间等。
 * @module utils/format
 */

/**
 * 将 0-1 的小数格式化为百分比字符串。
 * @param {number} value - 0 到 1 之间的小数
 * @returns {string} 百分比字符串（如 "62%"）
 */
export function formatPercent(value) {
  return `${Math.round((value ?? 0) * 100)}%`;
}

/**
 * 将字符串清理为安全的文件名。
 * @param {string} value - 原始字符串
 * @returns {string} 安全的文件名（默认 zhijing-artifact）
 */
export function safeFilename(value) {
  const cleaned = value.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim();
  return cleaned || 'zhijing-artifact';
}

/**
 * 格式化修订时间为 "YYYY-MM-DD HH:mm" 格式。
 * @param {string} iso - ISO 时间戳
 * @returns {string} 格式化后的时间字符串
 */
export function formatRevisionTime(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
