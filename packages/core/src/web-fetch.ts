/**
 * 网页与文档抓取模块（P1.6）。
 *
 * 自研实现，替代 pi-web-access 的 fork 方案。设计理念：
 * - 不作为 Agent 工具（保持 Agent「只检索工作区」边界）
 * - 作为资料导入的能力增强（URL → markdown，喂给 intake link 分支）
 * - 底层依赖独立 MIT 包：@mozilla/readability + linkedom + turndown + unpdf
 *
 * 与 index.ts 中 parseOrdinaryWebMaterial 的关系：
 * - parseOrdinaryWebMaterial 先尝试 Jina Reader，失败后调用本模块
 * - 本模块用 readability 提取正文，turndown 转 markdown，保留文章结构
 * - PDF 用 unpdf 提取文本（现有实现不支持 PDF）
 *
 * @module web-fetch
 * @author fxbin
 */

import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';
import TurndownService from 'turndown';
import { extractText, getDocumentProxy } from 'unpdf';

/**
 * 抓取超时时间（毫秒），与 parseOrdinaryWebMaterial 保持一致。
 */
const FETCH_TIMEOUT_MS = 10_000;

/**
 * 原始响应体最大字节数，防止超大页面拖垮进程。
 */
const MAX_RESPONSE_LENGTH = 500_000;

/**
 * 最终输出 markdown 最大字符数，控制喂给 LLM 的上下文体积。
 */
const MAX_OUTPUT_LENGTH = 18_000;

/**
 * 最终输出文本过短时视为抓取失败的最小长度阈值。
 */
const MIN_VALID_LENGTH = 120;

/**
 * 知径爬虫 UA 标识，与 parseOrdinaryWebMaterial 保持一致。
 */
const USER_AGENT = 'ZhijingBot/0.1 (+https://local.zhijing.app)';

/**
 * TurndownService 单例，配置 markdown 输出风格。
 *
 * - atx 标题：# 风格（非 setext 下划线风格）
 * - fenced 代码块：``` 风格
 * - 列表 `-` 符号
 */
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});

/**
 * turndown 默认会转义 markdown 特殊字符，对正文场景过于激进。
 * 移除默认转义规则，保留原始字符。
 */
turndownService.escape = (input: string): string => input;

/**
 * 抓取结果。
 */
export interface FetchedContent {
  /** 文章标题；提取失败时回退到 URL 衍生标题 */
  title: string;
  /** 正文 markdown；已截断到 MAX_OUTPUT_LENGTH */
  text: string;
  /** 正文中的图片/媒体 URL（当前未提取，保留接口） */
  mediaUrls: string[];
  /** 内容类型：html / pdf / text */
  contentType: 'html' | 'pdf' | 'text';
}

/**
 * 抓取 URL 并提取正文为 markdown。
 *
 * 处理流程：
 * 1. 校验 URL 协议（仅 http/https）
 * 2. fetch 抓取，带超时与长度限制
 * 3. 按 content-type 分流：
 *    - application/pdf：unpdf 提取文本
 *    - text/html：readability 提取正文 + turndown 转 markdown
 *    - text/plain：直接清洗返回
 *    - 其他：按 html 处理（兼容性回退）
 * 4. 输出长度校验与截断
 *
 * 不负责（由调用方处理）：
 * - Jina Reader 优先回退（parseOrdinaryWebMaterial 已实现）
 * - 抖音/小红书特殊平台解析（canParseWithServerParser 分流）
 * - SSRF 防护（与现有 parseOrdinaryWebMaterial 保持一致，后续可加）
 *
 * @param sourceUrl - 要抓取的 URL，必须为 http/https
 * @returns 抓取结果；文本过短时抛出错误由调用方决定回退策略
 * @throws {Error} URL 协议非法、fetch 失败、内容过短
 * @author fxbin
 */
export async function fetchUrlAsMarkdown(sourceUrl: string): Promise<FetchedContent> {
  const url = new URL(sourceUrl);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http and https URLs can be parsed.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        accept: 'text/html,application/xhtml+xml,application/pdf,text/plain;q=0.9,*/*;q=0.8',
        'user-agent': USER_AGENT,
      },
    });
    if (!response.ok) {
      throw new Error(`Web fetch received HTTP ${response.status}.`);
    }

    const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
    const fallbackTitle = titleFromUrl(sourceUrl);

    if (contentType.includes('application/pdf')) {
      return await parsePdfContent(await response.arrayBuffer(), fallbackTitle);
    }

    if (contentType.includes('text/plain')) {
      return parsePlainTextContent(await response.text(), fallbackTitle);
    }

    return parseHtmlContent(await response.text(), fallbackTitle);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 从用户粘贴的 HTML/源码直接提取 markdown（无需后端访问外网）。
 *
 * 使用场景：用户浏览器能打开页面但后端无法访问（受限网络、墙、登录态等）。
 * 用户从浏览器 View Source 复制 HTML，粘贴到前端入口，后端直接复用 parseHtmlContent 解析。
 *
 * @param html - 原始 HTML 字符串（可为完整页面或片段）
 * @param fallbackTitle - 标题回退值（如用户输入的页面标题）
 * @returns 解析结果；内容过短时抛出错误
 * @throws {Error} 内容过短
 * @author fxbin
 */
export function parseRawHtml(html: string, fallbackTitle: string): FetchedContent {
  return parseHtmlContent(html, fallbackTitle);
}

/**
 * 从 HTML 提取正文并转为 markdown。
 *
 * 使用 @mozilla/readability + linkedom 组合（无需 jsdom，更轻量）：
 * 1. linkedom parseHTML 构造 document
 * 2. Readability 提取正文 article DOM
 * 3. turndown 将 article HTML 转 markdown
 *
 * Readability 提取失败（返回 null）时回退到清洗后的纯文本，
 * 与原 extractReadableText 行为对齐，确保不丢失内容。
 *
 * @param html - 原始 HTML 字符串
 * @param fallbackTitle - Readability 提取标题失败时的回退标题
 * @returns 抓取结果
 * @author fxbin
 */
function parseHtmlContent(html: string, fallbackTitle: string): FetchedContent {
  const limited = html.slice(0, MAX_RESPONSE_LENGTH);
  const { document } = parseHTML(limited);

  const reader = new Readability(document as unknown as Document, {
    charThreshold: MIN_VALID_LENGTH,
  });
  const article = reader.parse();

  if (!article || !article.content) {
    const plainText = stripHtmlTags(limited);
    if (plainText.length < MIN_VALID_LENGTH) {
      throw new Error('Parsed web content is too short for a reliable summary.');
    }
    return {
      title: article?.title ?? fallbackTitle,
      text: plainText.slice(0, MAX_OUTPUT_LENGTH),
      mediaUrls: [],
      contentType: 'html',
    };
  }

  const markdown = turndownService.turndown(article.content);
  const finalText = markdown.length > MAX_OUTPUT_LENGTH
    ? `${markdown.slice(0, MAX_OUTPUT_LENGTH)}…`
    : markdown;

  if (finalText.length < MIN_VALID_LENGTH) {
    throw new Error('Parsed web content is too short for a reliable summary.');
  }

  return {
    title: article.title ?? fallbackTitle,
    text: finalText,
    mediaUrls: [],
    contentType: 'html',
  };
}

/**
 * 用 unpdf 提取 PDF 文本内容。
 *
 * unpdf 基于 pdfjs，支持中文与多页提取。返回纯文本（PDF 无 markdown 结构）。
 *
 * @param buffer - PDF ArrayBuffer
 * @param fallbackTitle - 标题回退值
 * @returns 抓取结果
 * @author fxbin
 */
async function parsePdfContent(buffer: ArrayBuffer, fallbackTitle: string): Promise<FetchedContent> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text: rawText } = await extractText(pdf, { mergePages: true });

  const text = rawText.length > MAX_OUTPUT_LENGTH
    ? `${rawText.slice(0, MAX_OUTPUT_LENGTH)}…`
    : rawText;

  if (text.length < MIN_VALID_LENGTH) {
    throw new Error('Parsed PDF content is too short for a reliable summary.');
  }

  return {
    title: fallbackTitle,
    text,
    mediaUrls: [],
    contentType: 'pdf',
  };
}

/**
 * 处理 text/plain 响应，清洗后返回。
 *
 * @param raw - 原始文本
 * @param fallbackTitle - 标题回退值
 * @returns 抓取结果
 * @author fxbin
 */
function parsePlainTextContent(raw: string, fallbackTitle: string): FetchedContent {
  const limited = raw.slice(0, MAX_RESPONSE_LENGTH);
  const text = limited.length > MAX_OUTPUT_LENGTH
    ? `${limited.slice(0, MAX_OUTPUT_LENGTH)}…`
    : limited;

  if (text.length < MIN_VALID_LENGTH) {
    throw new Error('Parsed web content is too short for a reliable summary.');
  }

  return {
    title: fallbackTitle,
    text,
    mediaUrls: [],
    contentType: 'text',
  };
}

/**
 * 简易 HTML 标签清洗，作为 Readability 失败的回退。
 *
 * 移除 script/style/svg/noscript 与注释，标签替换为空格，
 * 与原 index.ts 中 extractReadableText 的逻辑保持一致。
 *
 * @param html - 原始 HTML
 * @returns 清洗后的纯文本
 * @author fxbin
 */
function stripHtmlTags(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(p|div|section|article|header|footer|li|ul|ol|h[1-6]|blockquote|br)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 从 URL 路径推导回退标题。
 *
 * 取路径最后一段，去除扩展名与查询参数，作为标题回退值。
 *
 * @param sourceUrl - URL 字符串
 * @returns 回退标题
 * @author fxbin
 */
function titleFromUrl(sourceUrl: string): string {
  try {
    const path = new URL(sourceUrl).pathname;
    const segments = path.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    if (!last) return sourceUrl;
    return decodeURIComponent(last.replace(/\.\w+$/, '').replace(/[-_]/g, ' '));
  } catch {
    return sourceUrl;
  }
}
