/**
 * Markdown 渲染工具。
 *
 * 使用 marked 将 Markdown 文本转换为安全的 HTML。
 * 配置 gfm/breaks 扩展以支持表格、删除线和换行。
 *
 * @module utils/markdown
 */

import { marked } from 'marked';

marked.use({
  gfm: true,
  breaks: true,
});

/**
 * 将 Markdown 文本渲染为安全的 HTML 字符串。
 *
 * @param {string} text - 原始 Markdown 文本
 * @returns {string} HTML 字符串
 * @author fxbin
 */
export function renderMarkdown(text) {
  if (!text) return '';
  return marked.parse(text);
}
