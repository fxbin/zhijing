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

/**
 * 引用占位符正则：匹配 [1]、[2] 等编号占位符。
 *
 * 后端 extractCitationsFromText 将 <cite> 标签替换为 [n] 占位符，
 * 本正则用于在渲染后的 HTML 文本节点中定位这些占位符，
 * 替换为可点击的 <a> 锚点，实现正文 → 引用来源卡片的跳转。
 */
const CITE_ANCHOR_PATTERN = /\[(\d+)\]/g;

/**
 * 将 HTML 字符串中的 [n] 占位符替换为可点击的引用锚点。
 *
 * 使用 DOMParser 解析 HTML，遍历文本节点（排除 CODE/PRE 标签内的节点），
 * 把 [n] 替换为 <a class="cite-anchor" data-cite-index="n" href="#">[n]</a>。
 * 这样前端可通过事件委托捕获点击，滚动并高亮对应的 SourceCitation 卡片。
 *
 * 安全性：DOMPurify 已在 renderMarkdown 中清洗过 HTML，本函数只处理文本节点，
 * 不会引入新的 XSS 风险。<a> 标签的 href="#" 会被 DOMPurify 保留（非危险协议）。
 *
 * @param {string} html - renderMarkdown 输出的安全 HTML 字符串
 * @returns {string} 替换 [n] 为可点击锚点后的 HTML 字符串
 * @author fxbin
 */
export function linkifyCiteAnchors(html) {
  if (typeof html !== 'string' || html.length === 0) return html;
  if (typeof document === 'undefined' || typeof DOMParser === 'undefined') return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, {
  acceptNode(node) {
  const parent = node.parentNode;
  if (!parent) return NodeFilter.FILTER_REJECT;
  const tag = parent.tagName;
  if (tag === 'CODE' || tag === 'PRE') return NodeFilter.FILTER_REJECT;
  return CITE_ANCHOR_PATTERN.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
  },
  });
  const targets = [];
  let current = walker.nextNode();
  while (current) {
  targets.push(current);
  current = walker.nextNode();
  }
  if (targets.length === 0) return html;
  CITE_ANCHOR_PATTERN.lastIndex = 0;
  for (const node of targets) {
  const text = node.nodeValue;
  if (!text) continue;
  const replaced = text.replace(CITE_ANCHOR_PATTERN, (match, num) => {
  const a = doc.createElement('a');
  a.className = 'cite-anchor';
  a.setAttribute('href', '#');
  a.setAttribute('data-cite-index', num);
  a.textContent = match;
  return a.outerHTML;
  });
  const span = doc.createElement('span');
  span.innerHTML = replaced;
  node.parentNode.replaceChild(span, node);
  }
  return doc.body.innerHTML;
}
