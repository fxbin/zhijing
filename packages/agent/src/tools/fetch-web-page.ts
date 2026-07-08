import { Type } from '@zhijing/pi-runtime';
import type { AgentTool, AgentToolResult } from '@earendil-works/pi-agent-core';
import { sanitizeForLlmContext } from './sanitize.js';
import { fetchUrlWithFallback } from './web-fetch-adapter.js';

const FetchWebPageParameters = Type.Object({
  url: Type.String({ description: '要抓取正文的网页 URL，必须是 http/https' }),
  maxLength: Type.Optional(
    Type.Integer({ description: '返回正文最大字符数，省略时使用默认值', minimum: 500, maximum: 8000 }),
  ),
});

const DEFAULT_PAGE_TEXT_MAX_LENGTH = 4000;
const MAX_PAGE_TEXT_LENGTH = 8000;

export interface FetchWebPageDetails {
  ok: boolean;
  url: string;
  title?: string;
  text?: string;
  contentType?: 'html' | 'pdf' | 'text';
  durationMs: number;
  errorMessage?: string;
}

function clampPageTextLength(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_PAGE_TEXT_MAX_LENGTH;
  return Math.max(500, Math.min(MAX_PAGE_TEXT_LENGTH, Math.floor(value)));
}

function truncatePageText(value: string, maxLength: number): string {
  const cleaned = sanitizeForLlmContext(value);
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength)}…` : cleaned;
}

function formatFetchedPage(details: FetchWebPageDetails): string {
  if (!details.ok) {
    return `网页抓取失败：${details.errorMessage ?? 'unknown error'}\nURL: ${details.url}`;
  }
  return [
    `已抓取网页：${details.title ?? details.url}`,
    `URL: ${details.url}`,
    details.contentType ? `类型: ${details.contentType}` : '',
    '',
    details.text ?? '',
  ].filter(Boolean).join('\n');
}

export function createFetchWebPageTool(): AgentTool<typeof FetchWebPageParameters, FetchWebPageDetails> {
  return {
    name: 'fetch_web_page',
    label: '抓取网页正文',
    description: [
      '抓取指定 http/https URL 的正文并转为可读文本，适合在 web_search 找到来源后继续核验证据。',
      '工具带 SSRF 防护、超时和长度限制；回答中必须标注 URL。',
      '不要抓取登录页、私有地址或与用户问题无关的页面。',
    ].join(' '),
    parameters: FetchWebPageParameters,
    async execute(_toolCallId, params): Promise<AgentToolResult<FetchWebPageDetails>> {
      const startedAt = Date.now();
      const url = params.url.trim();
      const maxLength = clampPageTextLength(params.maxLength);
      try {
        const fetched = await fetchUrlWithFallback(url);
        const details: FetchWebPageDetails = {
          ok: true,
          url,
          title: sanitizeForLlmContext(fetched.title),
          text: truncatePageText(fetched.text, maxLength),
          contentType: fetched.contentType,
          durationMs: Date.now() - startedAt,
        };
        return {
          content: [{ type: 'text', text: formatFetchedPage(details) }],
          details,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const details: FetchWebPageDetails = {
          ok: false,
          url,
          durationMs: Date.now() - startedAt,
          errorMessage,
        };
        return {
          content: [{ type: 'text', text: formatFetchedPage(details) }],
          details,
        };
      }
    },
  };
}
