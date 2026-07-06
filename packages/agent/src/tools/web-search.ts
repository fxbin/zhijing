import { Type } from '@zhijing/pi-runtime';
import type { AgentTool, AgentToolResult } from '@earendil-works/pi-agent-core';
import { sanitizeForLlmContext } from './sanitize.js';

/**
 * web_search 工具的入参 schema。
 *
 * - query：搜索关键词或自然语言问题，必填。
 * - limit：返回结果数量上限，可选。
 */
const WebSearchParameters = Type.Object({
  query: Type.String({ description: '要联网搜索的关键词或自然语言问题，必填' }),
  limit: Type.Optional(
    Type.Integer({ description: '返回搜索结果数量上限，省略时使用默认值', minimum: 1, maximum: 8 }),
  ),
});

/**
 * 默认搜索结果数量。
 */
const DEFAULT_RESULT_LIMIT = 5;

/**
 * 搜索结果数量硬上限，避免工具输出挤占上下文窗口。
 */
const MAX_RESULT_LIMIT = 8;

/**
 * 搜索查询最大字符数。
 */
const QUERY_MAX_LENGTH = 240;

/**
 * 搜索响应超时时间。
 */
const WEB_SEARCH_TIMEOUT_MS = 20_000;

/**
 * 原始响应体最大字符数。
 */
const MAX_RESPONSE_TEXT_LENGTH = 120_000;

/**
 * 传给 LLM 的单条摘要最大字符数。
 */
const RESULT_SNIPPET_MAX_LENGTH = 720;

/**
 * 工具 details 中保留的单条摘要最大字符数。
 */
const DETAIL_SNIPPET_MAX_LENGTH = 480;

/**
 * 默认使用 Jina AI Search。可通过 ZHIJING_WEB_SEARCH_BASE_URL 覆盖为兼容接口。
 */
const DEFAULT_SEARCH_BASE_URL = 'https://s.jina.ai/';

/**
 * 搜索请求 UA 标识。
 */
const USER_AGENT = 'ZhijingBot/0.1 (+https://local.zhijing.app)';

/**
 * 内存缓存有效期（毫秒），5 分钟内相同 query 复用结果。
 */
const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * 内存缓存最大条目数，避免无界增长。
 */
const SEARCH_CACHE_MAX_SIZE = 64;

interface SearchCacheEntry {
  results: WebSearchResultItem[];
  expireAt: number;
}

const searchCache = new Map<string, SearchCacheEntry>();

/**
 * 读取缓存。命中且未过期时返回结果，否则返回 null。
 */
function readSearchCache(key: string): WebSearchResultItem[] | null {
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expireAt) {
    searchCache.delete(key);
    return null;
  }
  return entry.results;
}

/**
 * 写入缓存。超过上限时按 FIFO 淘汰最早条目。
 */
function writeSearchCache(key: string, results: WebSearchResultItem[]): void {
  if (searchCache.size >= SEARCH_CACHE_MAX_SIZE) {
    const oldestKey = searchCache.keys().next().value;
    if (oldestKey) searchCache.delete(oldestKey);
  }
  searchCache.set(key, { results, expireAt: Date.now() + SEARCH_CACHE_TTL_MS });
}

export interface WebSearchResultItem {
  title: string;
  url: string;
  snippet: string;
}

export interface WebSearchDetails {
  ok: boolean;
  query: string;
  provider: string;
  count: number;
  durationMs: number;
  results: WebSearchResultItem[];
  errorMessage?: string;
}

export function clampWebSearchLimit(limit: number | undefined): number {
  if (typeof limit !== 'number' || !Number.isFinite(limit)) return DEFAULT_RESULT_LIMIT;
  return Math.max(1, Math.min(MAX_RESULT_LIMIT, Math.floor(limit)));
}

function truncateText(value: string, maxLength: number): string {
  const normalized = sanitizeForLlmContext(value).replace(/\s+/g, ' ').trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}…` : normalized;
}

function buildSearchUrl(query: string): URL {
  const configuredBaseUrl = process.env.ZHIJING_WEB_SEARCH_BASE_URL ?? DEFAULT_SEARCH_BASE_URL;
  const url = new URL(configuredBaseUrl);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('web_search only supports http/https search endpoints.');
  }
  url.searchParams.set('q', query);
  return url;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readStringField(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) return value;
  }
  return '';
}

function normalizeUrl(value: string): string {
  return value.trim().replace(/[),.;\]]+$/g, '');
}

function normalizeResult(item: { title: string; url: string; snippet: string }): WebSearchResultItem | null {
  const url = normalizeUrl(item.url);
  if (!url || !/^https?:\/\//i.test(url)) return null;
  const title = truncateText(item.title || url, 160);
  const snippet = truncateText(item.snippet, DETAIL_SNIPPET_MAX_LENGTH);
  return { title, url, snippet };
}

function dedupeResults(items: WebSearchResultItem[], limit: number): WebSearchResultItem[] {
  const seen = new Set<string>();
  const results: WebSearchResultItem[] = [];
  for (const item of items) {
    if (seen.has(item.url)) continue;
    seen.add(item.url);
    results.push(item);
    if (results.length >= limit) break;
  }
  return results;
}

function parseJsonResults(value: unknown, limit: number): WebSearchResultItem[] {
  const sourceItems = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.results)
      ? value.results
      : isRecord(value) && Array.isArray(value.data)
        ? value.data
        : [];

  const parsed: WebSearchResultItem[] = [];
  for (const rawItem of sourceItems) {
    if (!isRecord(rawItem)) continue;
    const title = readStringField(rawItem, ['title', 'name']);
    const url = readStringField(rawItem, ['url', 'link', 'href']);
    const snippet = readStringField(rawItem, ['snippet', 'content', 'description', 'summary', 'text']);
    const normalized = normalizeResult({ title, url, snippet });
    if (normalized) parsed.push(normalized);
  }
  return dedupeResults(parsed, limit);
}

function extractFirstUrl(text: string): string {
  const match = text.match(/https?:\/\/[^\s)>}\]]+/i);
  return match ? normalizeUrl(match[0]) : '';
}

function cleanSearchBlockSnippet(block: string, title: string, url: string): string {
  return block
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      if (trimmed === title) return false;
      if (trimmed.includes(url)) return false;
      return !/^(title|url source|url|markdown content|content)\s*:/i.test(trimmed);
    })
    .join(' ');
}

function parseTextResults(text: string, limit: number): WebSearchResultItem[] {
  const parsed: WebSearchResultItem[] = [];
  const blockPattern = /(?:^|\n)\s*\[(\d+)\]\s+([^\n]+)\n([\s\S]*?)(?=\n\s*\[\d+\]\s+[^\n]+\n|$)/g;
  let match: RegExpExecArray | null;
  while ((match = blockPattern.exec(text)) !== null) {
    const title = match[2]?.trim() ?? '';
    const block = match[3] ?? '';
    const url = block.match(/^(?:URL Source|URL|Source):\s*(https?:\/\/\S+)/im)?.[1] ?? extractFirstUrl(block);
    const snippet = cleanSearchBlockSnippet(block, title, url);
    const normalized = normalizeResult({ title, url, snippet });
    if (normalized) parsed.push(normalized);
  }

  if (parsed.length > 0) return dedupeResults(parsed, limit);

  const url = extractFirstUrl(text);
  if (!url) return [];
  const title = text.split('\n').map((line) => line.trim()).find(Boolean) ?? url;
  const normalized = normalizeResult({ title, url, snippet: text });
  return normalized ? [normalized] : [];
}

export async function searchWeb(query: string, limit: number): Promise<WebSearchResultItem[]> {
  const cacheKey = `${query}::${limit}`;
  const cached = readSearchCache(cacheKey);
  if (cached) return cached;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WEB_SEARCH_TIMEOUT_MS);
  try {
    const headers: Record<string, string> = {
      accept: 'application/json,text/plain;charset=utf-8',
      'user-agent': USER_AGENT,
    };
    if (process.env.JINA_API_KEY) {
      headers.authorization = `Bearer ${process.env.JINA_API_KEY}`;
    }

    const response = await fetch(buildSearchUrl(query), {
      signal: controller.signal,
      redirect: 'follow',
      headers,
    });
    if (!response.ok) {
      throw new Error(`search endpoint returned HTTP ${response.status}.`);
    }

    const text = (await response.text()).slice(0, MAX_RESPONSE_TEXT_LENGTH);
    let results: WebSearchResultItem[];
    try {
      const jsonResults = parseJsonResults(JSON.parse(text), limit);
      if (jsonResults.length > 0) {
        results = jsonResults;
      } else {
        results = parseTextResults(text, limit);
      }
    } catch {
      results = parseTextResults(text, limit);
    }
    if (results.length > 0) {
      writeSearchCache(cacheKey, results);
    }
    return results;
  } finally {
    clearTimeout(timer);
  }
}

function formatResultLine(result: WebSearchResultItem, index: number): string {
  const snippet = truncateText(result.snippet, RESULT_SNIPPET_MAX_LENGTH);
  return [
    `${index + 1}. ${result.title}`,
    `   URL: ${result.url}`,
    snippet ? `   摘要: ${snippet}` : '',
  ].filter(Boolean).join('\n');
}

/**
 * 构造「联网搜索」工具。
 *
 * 工具职责：在当前知识库证据不足、用户明确询问外部或实时信息时，查询外部搜索入口，
 * 返回标题、URL 与摘要。工具只访问配置好的搜索端点，不接受模型传入任意抓取 URL。
 *
 * @returns AgentTool 实例，可直接挂载到 Agent 工具集
 * @author fxbin
 */
export function createWebSearchTool(): AgentTool<typeof WebSearchParameters, WebSearchDetails> {
  return {
    name: 'web_search',
    label: '联网搜索',
    description: [
      '通过受控搜索端点联网搜索外部资料，返回标题、URL 与摘要。',
      '仅在用户明确需要最新/外部信息，或当前工作区检索不足以回答时调用。',
      '回答中必须标注使用到的 URL；不要把搜索结果写入工作区，除非用户确认后通过 proposal 提议。',
    ].join(' '),
    parameters: WebSearchParameters,
    async execute(_toolCallId, params): Promise<AgentToolResult<WebSearchDetails>> {
      const startedAt = Date.now();
      const query = truncateText(params.query, QUERY_MAX_LENGTH);
      const limit = clampWebSearchLimit(params.limit);
      if (!query) {
        const details: WebSearchDetails = {
          ok: false,
          query,
          provider: 'jina-search',
          count: 0,
          durationMs: Date.now() - startedAt,
          results: [],
          errorMessage: 'Search query is empty.',
        };
        return {
          content: [{ type: 'text', text: '联网搜索失败：搜索关键词为空。' }],
          details,
        };
      }

      try {
        const results = await searchWeb(query, limit);
        const summary = results.length === 0
          ? `联网搜索未找到与「${query}」直接相关的结果。`
          : `联网搜索到 ${results.length} 条与「${query}」相关的结果：\n${results.map(formatResultLine).join('\n')}`;
        return {
          content: [{ type: 'text', text: summary }],
          details: {
            ok: true,
            query,
            provider: 'jina-search',
            count: results.length,
            durationMs: Date.now() - startedAt,
            results,
          },
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const details: WebSearchDetails = {
          ok: false,
          query,
          provider: 'jina-search',
          count: 0,
          durationMs: Date.now() - startedAt,
          results: [],
          errorMessage,
        };
        return {
          content: [{ type: 'text', text: `联网搜索失败：${errorMessage}` }],
          details,
        };
      }
    },
  };
}
