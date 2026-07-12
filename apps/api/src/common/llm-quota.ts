/**
 * LLM 调用相关路径前缀。
 * 这些路径触发 LLM 调用，成本较高，需按日限额控制。
 * @author fxbin
 */
export const LLM_PATH_PREFIXES = [
  '/agent/stream',
  '/api/intake',
  '/api/socratic',
];

/**
 * LLM 调用相关路径模式。
 * 用于匹配动态路径，如工作区 agent stream。
 * @author fxbin
 */
export const LLM_PATH_PATTERNS = [
  /^\/api\/workspaces\/[^/]+\/agent\/stream$/,
];

/**
 * 单 IP 每日 LLM 调用最大次数。
 * 超过此限额返回 429，防止演示 Key 额度被恶意耗尽。
 * @author fxbin
 */
export const LLM_DAILY_LIMIT = 80;

/**
 * LLM 日限额桶：key 为 ip，value 为 { count, resetAt }。
 * 按自然日重置（UTC+8 0 点），进程内 Map，不持久化。
 * @author fxbin
 */
export const llmDailyBuckets = new Map<string, { count: number; resetAt: number }>();

/**
 * 判断路径是否属于 LLM 调用路径。
 * 先匹配前缀，再匹配动态路径模式。
 * @param url - 请求 URL
 * @returns 是否命中
 * @author fxbin
 */
export function matchLlmPath(url: string): boolean {
  return LLM_PATH_PREFIXES.some((prefix) => url.startsWith(prefix))
    || LLM_PATH_PATTERNS.some((pattern) => pattern.test(url));
}

/**
 * 计算下一个自然日 0 点（UTC+8）的时间戳。
 * @returns 下个自然日 0 点的毫秒时间戳
 * @author fxbin
 */
export function nextDayResetTimestamp(): number {
  const now = new Date();
  const nextDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const utc8NextDay = new Date(nextDay.getTime() + 8 * 60 * 60 * 1000);
  utc8NextDay.setUTCHours(0, 0, 0, 0);
  return utc8NextDay.getTime() - 8 * 60 * 60 * 1000;
}

/**
 * 检查 IP 是否超过每日 LLM 调用限额。
 * @param ip - 客户端 IP
 * @returns 是否超限
 * @author fxbin
 */
export function isLlmQuotaExceeded(ip: string): boolean {
  const now = Date.now();
  const bucket = llmDailyBuckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    llmDailyBuckets.set(ip, { count: 1, resetAt: nextDayResetTimestamp() });
    return false;
  }
  bucket.count += 1;
  return bucket.count > LLM_DAILY_LIMIT;
}
