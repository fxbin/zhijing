/**
 * 网页抓取适配器：自研 readability 优先 + Tavily Extract 兜底。
 *
 * 作为 agent 层所有网页抓取的统一入口：
 * - fetchUrlAsMarkdown（@zhijing/core）：直连目标 URL，readability 提取正文
 *   优点：免费、快、支持 PDF
 *   缺点：JS 渲染页面、反爬页面无法处理
 * - extractWithTavily（./tavily-extract.ts）：Tavily 服务端渲染后抽取
 *   优点：能处理 JS 渲染页面、反爬页面
 *   缺点：消耗 Tavily 配额、延迟更高
 *
 * 编排策略：readability 优先 → 失败时 Tavily 兜底 → 两者均失败抛出明确错误
 *
 * @module tools/web-fetch-adapter
 * @author fxbin
 */

import { fetchUrlAsMarkdown, type FetchedContent } from '@zhijing/core';
import { extractWithTavily, isTavilyExtractConfigured } from './tavily-extract.js';

/**
 * 抓取 URL 正文，readability 优先 + Tavily Extract 兜底。
 *
 * 编排流程：
 * 1. 先调 fetchUrlAsMarkdown（自研 readability + turndown）
 * 2. 失败且 Tavily 已配置时，调 extractWithTavily 兜底
 * 3. 两者均失败时抛出 Error，错误信息包含两层失败原因
 *
 * @param sourceUrl - 要抓取的 URL，必须为 http/https
 * @returns 抓取结果（FetchedContent）
 * @throws {Error} URL 协议非法、两层抓取均失败
 * @author fxbin
 */
export async function fetchUrlWithFallback(sourceUrl: string): Promise<FetchedContent> {
  let primaryError: Error | null = null;

  try {
    return await fetchUrlAsMarkdown(sourceUrl);
  } catch (error) {
    primaryError = error instanceof Error ? error : new Error(String(error));
  }

  if (isTavilyExtractConfigured()) {
    const tavilyResult = await extractWithTavily(sourceUrl);
    if (tavilyResult) {
      return tavilyResult;
    }
  }

  const primaryMsg = primaryError?.message ?? 'unknown error';
  const tavilyNote = isTavilyExtractConfigured()
    ? '；Tavily Extract 兜底也未返回有效内容'
    : '；未配置 TAVILY_API_KEY，无法兜底';
  throw new Error(`网页抓取失败：${primaryMsg}${tavilyNote}`);
}
