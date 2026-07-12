import { Readable, Transform } from 'node:stream';
import { createSsrfSafeFetch } from '@zhijing/core';

/**
 * proxy-image 单次响应最大字节数（50MB）。
 * 防止 OOM 攻击与带宽放大。
 * @author fxbin
 */
export const PROXY_MAX_BYTES = 50 * 1024 * 1024;

/**
 * proxy-video 完整响应最大字节数（200MB）。
 */
export const PROXY_VIDEO_MAX_BYTES = 200 * 1024 * 1024;

/**
 * proxy-video 单个 Range 响应最大字节数（20MB）。
 */
export const PROXY_VIDEO_MAX_RANGE_BYTES = 20 * 1024 * 1024;

/**
 * proxy-video 上游首包超时（毫秒）。
 */
export const PROXY_VIDEO_FETCH_TIMEOUT_MS = 30_000;

/**
 * SSRF 安全 fetch 单例：用于 proxy-image / proxy-video。
 * 每次重定向后会重新校验目标 URL，避免外部 302 重定向到内网地址。
 * @author fxbin
 */
export const ssrfSafeFetch = createSsrfSafeFetch();

/**
 * 解析正整数请求头，非合法值返回 null。
 * @author fxbin
 */
export function parsePositiveIntegerHeader(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/**
 * 构造安全的 Range 请求头，限制单次范围长度，防止超大范围请求。
 * @author fxbin
 */
export function buildSafeVideoRangeHeader(rawRange: string | undefined): string | null {
  if (!rawRange) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(rawRange.trim());
  if (!match) return null;
  const startRaw = match[1];
  const endRaw = match[2];
  if (!startRaw && !endRaw) return null;
  if (!startRaw) {
    const suffixLength = Number.parseInt(endRaw, 10);
    if (!Number.isFinite(suffixLength) || suffixLength < 1 || suffixLength > PROXY_VIDEO_MAX_RANGE_BYTES) {
      return null;
    }
    return `bytes=-${suffixLength}`;
  }
  const start = Number.parseInt(startRaw, 10);
  if (!Number.isFinite(start) || start < 0) return null;
  if (!endRaw) {
    return `bytes=${start}-${start + PROXY_VIDEO_MAX_RANGE_BYTES - 1}`;
  }
  const end = Number.parseInt(endRaw, 10);
  if (!Number.isFinite(end) || end < start) return null;
  const requestedLength = end - start + 1;
  if (requestedLength > PROXY_VIDEO_MAX_RANGE_BYTES) return null;
  return rawRange.trim();
}

/**
 * 创建字节限制流，超过 maxBytes 时抛出错误。
 * @author fxbin
 */
export function createByteLimitStream(maxBytes: number) {
  let transferred = 0;
  return new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      transferred += chunk.byteLength;
      if (transferred > maxBytes) {
        callback(new Error('Proxy response exceeded byte limit.'));
        return;
      }
      callback(null, chunk);
    },
  });
}

/**
 * 判断错误是否为 AbortError（客户端主动取消或超时中止）。
 * @author fxbin
 */
export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}
