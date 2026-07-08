/**
 * Tavily Extract 网页正文抽取实现。
 *
 * 作为 fetchUrlAsMarkdown（自研 readability）失败时的兜底：
 * - readability 直连目标 URL 抓 HTML，对 JS 渲染页面、反爬页面无能为力
 * - Tavily Extract 在服务端渲染后抽取正文，能处理 JS 渲染页面
 * - 两者互补：readability 优先（免费、快），Tavily 兜底（消耗配额但更强大）
 *
 * @module tools/tavily-extract
 * @author fxbin
 */

import type { FetchedContent } from '@zhijing/core';

/**
 * Tavily Extract REST API 端点。
 */
const TAVILY_EXTRACT_ENDPOINT = 'https://api.tavily.com/extract';

/**
 * 抓取超时时间（毫秒）。
 */
const EXTRACT_TIMEOUT_MS = 20_000;

/**
 * 返回正文最大字符数，与 web-fetch.ts 的 MAX_OUTPUT_LENGTH 对齐。
 */
const MAX_OUTPUT_LENGTH = 18_000;

/**
 * 正文过短时视为抽取失败的最小长度阈值。
 */
const MIN_VALID_LENGTH = 120;

/**
 * 请求 UA 标识。
 */
const USER_AGENT = 'ZhijingBot/0.1 (+https://local.zhijing.app)';

/**
 * 判断 Tavily Extract 是否已配置（key 存在）。
 *
 * @returns 是否配置了 TAVILY_API_KEY
 * @author fxbin
 */
export function isTavilyExtractConfigured(): boolean {
  return Boolean(process.env.TAVILY_API_KEY);
}

/**
 * 用 Tavily Extract API 抽取网页正文。
 *
 * 调用 POST https://api.tavily.com/extract，传入 urls 数组，
 * 返回 results[]{url, raw_content} 与 failed_results[]{url, error}。
 *
 * 失败场景（返回 null，由调用方决定后续策略）：
 * - TAVILY_API_KEY 未配置
 * - HTTP 非 200
 * - 响应解析失败
 * - 返回 raw_content 为空或过短
 * - 网络/超时异常
 *
 * @param sourceUrl - 要抓取的网页 URL
 * @returns 抽取结果；失败返回 null
 * @author fxbin
 */
export async function extractWithTavily(sourceUrl: string): Promise<FetchedContent | null> {
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (!tavilyKey) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EXTRACT_TIMEOUT_MS);
  try {
    const body = JSON.stringify({
      api_key: tavilyKey,
      urls: [sourceUrl],
      extract_depth: 'basic',
      format: 'markdown',
    });

    const response = await fetch(TAVILY_EXTRACT_ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        'user-agent': USER_AGENT,
      },
      body,
    });
    if (!response.ok) return null;

    const json = (await response.json()) as {
      results?: Array<{ url?: string; raw_content?: string; text?: string }>;
      failed_results?: Array<{ url?: string; error?: string }>;
    };

    const firstResult = json.results?.[0];
    if (!firstResult) return null;

    const rawText = firstResult.raw_content ?? firstResult.text ?? '';
    if (rawText.length < MIN_VALID_LENGTH) return null;

    const text = rawText.length > MAX_OUTPUT_LENGTH
      ? `${rawText.slice(0, MAX_OUTPUT_LENGTH)}…`
      : rawText;

    return {
      title: deriveTitleFromUrl(sourceUrl),
      text,
      mediaUrls: [],
      contentType: 'html',
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
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
function deriveTitleFromUrl(sourceUrl: string): string {
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
