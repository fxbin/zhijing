import { Type } from '@zhijing/pi-runtime';
import { fetchUrlAsMarkdown } from '@zhijing/core';
import type { AgentTool, AgentToolResult } from '@earendil-works/pi-agent-core';
import { sanitizeForLlmContext } from './sanitize.js';
import { searchWeb, type WebSearchResultItem } from './web-search.js';

const DeepSearchParameters = Type.Object({
  question: Type.String({ description: '需要深度搜索的问题，必填' }),
  queries: Type.Optional(
    Type.Array(Type.String({ description: '可选的补充搜索关键词' }), { description: '补充搜索关键词数组' }),
  ),
  maxQueries: Type.Optional(
    Type.Integer({ description: '最多执行几个搜索查询', minimum: 1, maximum: 4 }),
  ),
  maxSources: Type.Optional(
    Type.Integer({ description: '最多保留几个去重来源', minimum: 1, maximum: 8 }),
  ),
  fetchTopK: Type.Optional(
    Type.Integer({ description: '最多抓取几个来源正文', minimum: 0, maximum: 4 }),
  ),
});

const DEFAULT_MAX_QUERIES = 3;
const DEFAULT_MAX_SOURCES = 6;
const DEFAULT_FETCH_TOP_K = 3;
const SEARCH_LIMIT_PER_QUERY = 8;
const QUERY_MAX_LENGTH = 180;
const SOURCE_TEXT_MAX_LENGTH = 1800;
const SOURCE_SNIPPET_MAX_LENGTH = 720;
const CLAIM_MAX_LENGTH = 220;
const MAX_CLAIMS = 8;
const MAX_GAPS = 6;

export interface DeepSearchSource {
  title: string;
  url: string;
  snippet: string;
  fetched: boolean;
  contentType?: 'html' | 'pdf' | 'text';
  textPreview?: string;
  errorMessage?: string;
}

export interface DeepSearchClaim {
  claim: string;
  sourceUrl: string;
  sourceTitle: string;
}

export interface DeepSearchDetails {
  ok: boolean;
  question: string;
  queries: string[];
  sources: DeepSearchSource[];
  claims: DeepSearchClaim[];
  conflicts: string[];
  gaps: string[];
  durationMs: number;
  errorMessage?: string;
}

function clampInteger(value: number | undefined, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function normalizeText(value: string, maxLength: number): string {
  const cleaned = sanitizeForLlmContext(value).replace(/\s+/g, ' ').trim();
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength)}…` : cleaned;
}

function uniqueStrings(values: string[], limit: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const cleaned = normalizeText(value, QUERY_MAX_LENGTH);
    if (!cleaned || seen.has(cleaned)) continue;
    seen.add(cleaned);
    result.push(cleaned);
    if (result.length >= limit) break;
  }
  return result;
}

function buildSearchQueries(question: string, explicitQueries: string[] | undefined, maxQueries: number): string[] {
  const base = normalizeText(question, QUERY_MAX_LENGTH);
  const explicit = Array.isArray(explicitQueries) ? explicitQueries : [];
  return uniqueStrings([
    base,
    ...explicit,
    `${base} 优缺点`,
    `${base} 案例 实践`,
  ], maxQueries);
}

function mergeSearchResults(results: WebSearchResultItem[], maxSources: number): DeepSearchSource[] {
  const seen = new Set<string>();
  const sources: DeepSearchSource[] = [];
  for (const result of results) {
    if (!result.url || seen.has(result.url)) continue;
    seen.add(result.url);
    sources.push({
      title: normalizeText(result.title || result.url, 160),
      url: result.url,
      snippet: normalizeText(result.snippet, SOURCE_SNIPPET_MAX_LENGTH),
      fetched: false,
    });
    if (sources.length >= maxSources) break;
  }
  return sources;
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[。！？.!?])\s+|\n+/)
    .map((line) => normalizeText(line, CLAIM_MAX_LENGTH))
    .filter((line) => line.length >= 24);
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => normalizeText(paragraph, CLAIM_MAX_LENGTH))
    .filter((paragraph) => paragraph.length >= 24);
}

function selectClaimSentence(text: string): string {
  if (!text) return '';
  const paragraphs = splitParagraphs(text);
  if (paragraphs.length > 0) {
    return paragraphs[0];
  }
  const candidates = splitSentences(text);
  return candidates.find((line) => /(?:is|are|will|can|because|therefore|显示|表明|认为|指出|导致|支持|反对|限制|风险|核心|关键|主要|结论)/i.test(line))
    ?? candidates[0]
    ?? normalizeText(text, CLAIM_MAX_LENGTH);
}

function extractClaims(sources: DeepSearchSource[]): DeepSearchClaim[] {
  const claims: DeepSearchClaim[] = [];
  for (const source of sources) {
    const claim = selectClaimSentence(source.textPreview || source.snippet);
    if (!claim) continue;
    claims.push({
      claim,
      sourceUrl: source.url,
      sourceTitle: source.title,
    });
    if (claims.length >= MAX_CLAIMS) break;
  }
  return claims;
}

function detectConflictHints(claims: DeepSearchClaim[]): string[] {
  const positive = claims.filter((item) => /支持|有效|增长|优势|benefit|support|increase|positive/i.test(item.claim));
  const negative = claims.filter((item) => /反对|限制|风险|下降|失败|criticism|risk|limit|decline|negative/i.test(item.claim));
  if (positive.length === 0 || negative.length === 0) return [];
  return [
    `搜索结果同时出现支持性与限制/风险性表述：例如「${positive[0].claim}」与「${negative[0].claim}」。需要在最终回答中区分适用条件。`,
  ];
}

function buildGaps(sources: DeepSearchSource[], fetchTopK: number): string[] {
  const gaps: string[] = [];
  const failed = sources.filter((source) => source.errorMessage);
  if (failed.length > 0) {
    gaps.push(`${failed.length} 个来源未能抓取正文，只能使用搜索摘要，需要人工复核。`);
  }
  if (fetchTopK === 0) {
    gaps.push('本次未抓取网页正文，结论只能基于搜索摘要。');
  }
  if (sources.length < 3) {
    gaps.push('可用来源少于 3 个，证据覆盖不足。');
  }
  return gaps.slice(0, MAX_GAPS);
}

async function fetchSourcePreview(source: DeepSearchSource): Promise<DeepSearchSource> {
  try {
    const fetched = await fetchUrlAsMarkdown(source.url);
    return {
      ...source,
      title: normalizeText(fetched.title || source.title, 160),
      fetched: true,
      contentType: fetched.contentType,
      textPreview: normalizeText(fetched.text, SOURCE_TEXT_MAX_LENGTH),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      ...source,
      fetched: false,
      errorMessage,
    };
  }
}

function formatDeepSearchSummary(details: DeepSearchDetails): string {
  if (!details.ok) {
    return `深度搜索失败：${details.errorMessage ?? 'unknown error'}`;
  }
  const sourceLines = details.sources.map((source, index) => [
    `${index + 1}. ${source.title}`,
    `   URL: ${source.url}`,
    source.fetched ? '   正文: 已抓取' : '   正文: 未抓取',
    source.snippet ? `   摘要: ${source.snippet}` : '',
    source.textPreview ? `   正文预览: ${source.textPreview}` : '',
    source.errorMessage ? `   抓取错误: ${source.errorMessage}` : '',
  ].filter(Boolean).join('\n'));
  const claimLines = details.claims.map((claim, index) => `${index + 1}. ${claim.claim}\n   来源: ${claim.sourceTitle} ${claim.sourceUrl}`);
  const gapLines = details.gaps.map((gap) => `- ${gap}`);
  const conflictLines = details.conflicts.map((conflict) => `- ${conflict}`);
  return [
    `深度搜索问题：${details.question}`,
    `执行查询：${details.queries.join(' / ')}`,
    '',
    '来源：',
    sourceLines.join('\n'),
    '',
    details.claims.length > 0 ? '候选主张：' : '',
    claimLines.join('\n'),
    '',
    details.conflicts.length > 0 ? '冲突线索：' : '',
    conflictLines.join('\n'),
    '',
    details.gaps.length > 0 ? '证据缺口：' : '',
    gapLines.join('\n'),
  ].filter((part) => part.length > 0).join('\n');
}

export function createDeepSearchTool(): AgentTool<typeof DeepSearchParameters, DeepSearchDetails> {
  return {
    name: 'deep_search',
    label: '深度搜索',
    description: [
      '围绕一个问题执行多查询联网搜索、来源去重、正文抓取和轻量证据账本整理。',
      '适合用户要求深度搜索、研究、查证、竞品/外部事实分析时调用。',
      '返回来源、候选主张、冲突线索和证据缺口；最终判断仍需在回答中明确引用 URL 和置信度。',
    ].join(' '),
    parameters: DeepSearchParameters,
    async execute(_toolCallId, params): Promise<AgentToolResult<DeepSearchDetails>> {
      const startedAt = Date.now();
      const question = normalizeText(params.question, QUERY_MAX_LENGTH);
      const maxQueries = clampInteger(params.maxQueries, DEFAULT_MAX_QUERIES, 1, 4);
      const maxSources = clampInteger(params.maxSources, DEFAULT_MAX_SOURCES, 1, 8);
      const fetchTopK = clampInteger(params.fetchTopK, DEFAULT_FETCH_TOP_K, 0, 4);
      try {
        const queries = buildSearchQueries(question, params.queries, maxQueries);
        const searchResults = (await Promise.all(
          queries.map((query) => searchWeb(query, SEARCH_LIMIT_PER_QUERY)
            .then((outcome) => outcome.results)
            .catch(() => [] as WebSearchResultItem[])),
        )).flat();
        const sources = mergeSearchResults(searchResults, maxSources);
        const fetchedSources = await Promise.all(
          sources.map((source, index) => index < fetchTopK ? fetchSourcePreview(source) : source),
        );
        const claims = extractClaims(fetchedSources);
        const conflicts = detectConflictHints(claims);
        const gaps = buildGaps(fetchedSources, fetchTopK);
        const details: DeepSearchDetails = {
          ok: true,
          question,
          queries,
          sources: fetchedSources,
          claims,
          conflicts,
          gaps,
          durationMs: Date.now() - startedAt,
        };
        return {
          content: [{ type: 'text', text: formatDeepSearchSummary(details) }],
          details,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const details: DeepSearchDetails = {
          ok: false,
          question,
          queries: [],
          sources: [],
          claims: [],
          conflicts: [],
          gaps: [],
          durationMs: Date.now() - startedAt,
          errorMessage,
        };
        return {
          content: [{ type: 'text', text: formatDeepSearchSummary(details) }],
          details,
        };
      }
    },
  };
}
