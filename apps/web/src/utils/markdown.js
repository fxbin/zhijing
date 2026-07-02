/**
 * Markdown 渲染工具。
 *
 * 使用 marked 将 Markdown 文本转换为 HTML，再经 DOMPurify 清洗，
 * 防止 prompt 注入与 stored XSS（script/iframe/onerror/javascript: 等）。
 * 配置 gfm/breaks 扩展以支持表格、删除线和换行。
 *
 * @module utils/markdown
 * @author fxbin
 */

import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.use({
  gfm: true,
  breaks: true,
});

/**
 * DOMPurify 清洗配置。
 * - 禁止 script/iframe/style/object/embed 等危险标签；
 * - 禁止 on* 事件属性与 style 属性；
 * - 禁止 javascript: 协议；
 * - 保留常见的格式化与链接标签，确保 Markdown 语义不丢失。
 */
const PURIFY_CONFIG = {
  FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout', 'onfocus', 'onblur', 'onchange', 'oninput', 'onsubmit', 'style'],
  ALLOWED_URI_REGEXP: /^(?!(?:javascript|data|vbscript):)/i,
};

/**
 * 将 Markdown 文本渲染为安全的 HTML 字符串。
 *
 * @param {string} text - 原始 Markdown 文本
 * @returns {string} 经 DOMPurify 清洗后的 HTML 字符串
 * @author fxbin
 */
export function renderMarkdown(text) {
  if (!text) return '';
  const rawHtml = marked.parse(text);
  return DOMPurify.sanitize(rawHtml, PURIFY_CONFIG);
}
