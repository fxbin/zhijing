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
 * Jina Search 默认端点。可通过 ZHIJING_WEB_SEARCH_BASE_URL 覆盖为兼容接口。
 */
const DEFAULT_SEARCH_BASE_URL = 'https://s.jina.ai/';

/**
 * Tavily Search REST API 端点。
 */
const TAVILY_SEARCH_ENDPOINT = 'https://api.tavily.com/search';

/**
 * Tavily search_depth 参数：basic 快速、advanced 深度。
 * 兜底场景用 basic 控制延迟与配额消耗。
 */
const TAVILY_SEARCH_DEPTH = 'basic';

/**
 * Tavily topic 参数：general 通用搜索。
 */
const TAVILY_TOPIC_GENERAL = 'general';

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

/**
 * Provider 名称枚举常量，用于 details.provider 字段与日志。
 */
const PROVIDER_JINA = 'jina-search';
const PROVIDER_TAVILY = 'tavily-search';
const PROVIDER_NONE = 'none';

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

/**
 * searchWeb 的返回类型，携带实际使用的 provider 与是否走了兜底。
 */
export interface WebSearchOutcome {
  results: WebSearchResultItem[];
  provider: string;
  usedFallback: boolean;
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

function buildJinaSearchUrl(query: string): URL {
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

/**
 * 将 fetch 异常分类为面向用户的明确错误提示。
 *
 * 区分场景：
 * - 401/403：key 失效或未配置
 * - 超时（abort）：响应超时
 * - fetch failed（网络/代理）：网络不通
 * - 其他：透传 HTTP 状态码
 */
function classifyFetchError(error: unknown, provider: string, httpStatus?: number): string {
  const msg = error instanceof Error ? error.message : String(error);
  if (error instanceof Error && error.name === 'AbortError') {
    return `${provider} 搜索响应超时（${WEB_SEARCH_TIMEOUT_MS / 1000}秒），请稍后重试`;
  }
  if (httpStatus === 401 || httpStatus === 403) {
    const envKey = provider === PROVIDER_JINA ? 'JINA_API_KEY' : 'TAVILY_API_KEY';
    return `${provider} API key 失效或未配置，请在 .env 中检查 ${envKey}`;
  }
  if (/fetch failed/i.test(msg)) {
    return `${provider} 搜索请求失败：网络不通或代理异常，请检查代理配置`;
  }
  if (httpStatus !== undefined) {
    return `${provider} 搜索失败：HTTP ${httpStatus}`;
  }
  return `${provider} 搜索失败：${msg}`;
}

/**
 * Jina Search 实现。走 s.jina.ai，返回 JSON 或文本格式。
 * 失败时抛出带分类信息的 Error。
 */
async function searchWithJina(query: string, limit: number): Promise<WebSearchResultItem[]> {
  const jinaKey = process.env.JINA_API_KEY;
  if (!jinaKey) {
    throw new Error(`${PROVIDER_JINA} API key 失效或未配置，请在 .env 中检查 JINA_API_KEY`);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WEB_SEARCH_TIMEOUT_MS);
  try {
    const headers: Record<string, string> = {
      accept: 'application/json,text/plain;charset=utf-8',
      'user-agent': USER_AGENT,
      authorization: `Bearer ${jinaKey}`,
    };

    const response = await fetch(buildJinaSearchUrl(query), {
      signal: controller.signal,
      redirect: 'follow',
      headers,
    });
    if (!response.ok) {
      throw new Error(classifyFetchError(null, PROVIDER_JINA, response.status));
    }

    const text = (await response.text()).slice(0, MAX_RESPONSE_TEXT_LENGTH);
    let results: WebSearchResultItem[];
    try {
      const jsonResults = parseJsonResults(JSON.parse(text), limit);
      results = jsonResults.length > 0 ? jsonResults : parseTextResults(text, limit);
    } catch {
      results = parseTextResults(text, limit);
    }
    return results;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(classifyFetchError(error, PROVIDER_JINA));
    }
    if (error instanceof Error && /^(jina-search|tavily-search)/.test(error.message)) {
      throw error;
    }
    throw new Error(classifyFetchError(error, PROVIDER_JINA));
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Tavily Search 实现。走 api.tavily.com/search，返回结构化 JSON。
 * 失败时抛出带分类信息的 Error。
 */
async function searchWithTavily(query: string, limit: number): Promise<WebSearchResultItem[]> {
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (!tavilyKey) {
    throw new Error(`${PROVIDER_TAVILY} API key 失效或未配置，请在 .env 中检查 TAVILY_API_KEY`);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WEB_SEARCH_TIMEOUT_MS);
  try {
    const body = JSON.stringify({
      api_key: tavilyKey,
      query,
      search_depth: TAVILY_SEARCH_DEPTH,
      topic: TAVILY_TOPIC_GENERAL,
      max_results: limit,
      include_answer: false,
      include_raw_content: false,
    });

    const response = await fetch(TAVILY_SEARCH_ENDPOINT, {
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
    if (!response.ok) {
      throw new Error(classifyFetchError(null, PROVIDER_TAVILY, response.status));
    }

    const text = (await response.text()).slice(0, MAX_RESPONSE_TEXT_LENGTH);
    const json = JSON.parse(text);
    const results = parseJsonResults(json, limit);
    return results;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(classifyFetchError(error, PROVIDER_TAVILY));
    }
    if (error instanceof Error && /^(jina-search|tavily-search)/.test(error.message)) {
      throw error;
    }
    throw new Error(classifyFetchError(error, PROVIDER_TAVILY));
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 联网搜索主入口：Jina 优先，Tavily 兜底。
 *
 * 编排策略：
 * 1. 缓存命中直接返回（provider 标记为缓存来源，不区分）
 * 2. Jina 配置且调用成功 → 返回 Jina 结果
 * 3. Jina 失败 → 若 Tavily 已配置 → 降级到 Tavily
 * 4. 两者均不可用 → 抛出明确错误，提示用户检查 key 与网络
 *
 * @returns 搜索结果 + 实际使用的 provider + 是否走了兜底
 * @author fxbin
 */
export async function searchWeb(query: string, limit: number): Promise<WebSearchOutcome> {
  const cacheKey = `${query}::${limit}`;
  const cached = readSearchCache(cacheKey);
  if (cached) {
    return { results: cached, provider: PROVIDER_JINA, usedFallback: false };
  }

  const jinaConfigured = Boolean(process.env.JINA_API_KEY);
  const tavilyConfigured = Boolean(process.env.TAVILY_API_KEY);

  if (!jinaConfigured && !tavilyConfigured) {
    return {
      results: [],
      provider: PROVIDER_NONE,
      usedFallback: false,
      errorMessage: '未配置搜索 API key，请在 .env 中设置 JINA_API_KEY 或 TAVILY_API_KEY',
    };
  }

  const errors: string[] = [];

  if (jinaConfigured) {
    try {
      const results = await searchWithJina(query, limit);
      if (results.length > 0) {
        writeSearchCache(cacheKey, results);
      }
      return { results, provider: PROVIDER_JINA, usedFallback: false };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (tavilyConfigured) {
    try {
      const results = await searchWithTavily(query, limit);
      if (results.length > 0) {
        writeSearchCache(cacheKey, results);
      }
      return { results, provider: PROVIDER_TAVILY, usedFallback: true };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  const errorMessage = errors.length > 0
    ? `联网搜索暂不可用：${errors.join('；')}`
    : '联网搜索暂不可用：Jina 与 Tavily 均未配置或均失败，请检查 API key 与网络';

  return {
    results: [],
    provider: PROVIDER_NONE,
    usedFallback: false,
    errorMessage,
  };
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
 * 搜索 provider 采用「Jina 优先 + Tavily 兜底」策略：
 * - Jina 配置且成功时优先使用
 * - Jina 失败（key 失效/超时/网络异常）时自动降级到 Tavily
 * - 两者均不可用时返回明确的分类错误提示，便于用户排查
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
          provider: PROVIDER_NONE,
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

      const outcome = await searchWeb(query, limit);
      const durationMs = Date.now() - startedAt;

      if (outcome.errorMessage) {
        const details: WebSearchDetails = {
          ok: false,
          query,
          provider: outcome.provider,
          count: 0,
          durationMs,
          results: [],
          errorMessage: outcome.errorMessage,
        };
        return {
          content: [{ type: 'text', text: `联网搜索失败：${outcome.errorMessage}` }],
          details,
        };
      }

      const fallbackNote = outcome.usedFallback ? '（由 Tavily 兜底）' : '';
      const summary = outcome.results.length === 0
        ? `联网搜索未找到与「${query}」直接相关的结果。${fallbackNote}`
        : `联网搜索到 ${outcome.results.length} 条与「${query}」相关的结果${fallbackNote}：\n${outcome.results.map(formatResultLine).join('\n')}`;
      return {
        content: [{ type: 'text', text: summary }],
        details: {
          ok: true,
          query,
          provider: outcome.provider,
          count: outcome.results.length,
          durationMs,
          results: outcome.results,
        },
      };
    },
  };
}
