/**
 * 简易内存限流窗口时长（毫秒），60 秒。
 */
export const RATE_LIMIT_WINDOW_MS = 60_000;

/**
 * 简易内存限流单 IP 单路径最大请求数。
 */
export const RATE_LIMIT_MAX_REQUESTS = 30;

/**
 * 需要限流的敏感路径前缀。
 * 这些路径触发 LLM 调用或外部抓取，成本较高，需防止滥用。
 */
export const RATE_LIMITED_PATH_PREFIXES = [
  '/agent/stream',
  '/api/intake',
  '/api/weread/sync',
  '/api/weread/signals/refresh',
];

/**
 * 限流桶：key 为 `${ip}:${pathPrefix}`，value 为 { count, resetAt }。
 * 模块级 Map，进程内共享，不持久化。
 */
export const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

/**
 * 判断路径是否命中限流前缀。
 * @param url - 请求 URL
 * @returns 命中的限流前缀，未命中返回 null
 * @author fxbin
 */
export function matchRateLimitedPath(url: string): string | null {
  for (const prefix of RATE_LIMITED_PATH_PREFIXES) {
    if (url.startsWith(prefix)) return prefix;
  }
  return null;
}

/**
 * 检查请求是否超过限流阈值。
 * 超限时返回 true，调用方应返回 429。
 * @param ip - 客户端 IP
 * @param pathPrefix - 命中的限流前缀
 * @returns 是否超过限流阈值
 * @author fxbin
 */
export function isRateLimited(ip: string, pathPrefix: string): boolean {
  const key = `${ip}:${pathPrefix}`;
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_LIMIT_MAX_REQUESTS;
}
