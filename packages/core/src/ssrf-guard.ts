/**
 * SSRF 防护模块。
 *
 * 提供 URL 安全校验与内网地址拦截能力，覆盖：
 * - IPv4 私有/保留段（10/8、172.16/12、192.168/16、127/8、169.254/16、0/8、100.64/10）
 * - IPv6 本地与链路本地（::1、fe80::/10、fc00::/7）
 * - IPv4-mapped IPv6（::ffff:127.0.0.1）
 * - 主机名为 localhost 或内网字面量
 * - 协议白名单（仅 http/https）
 *
 * 用于 web-fetch、Jina Reader、proxy-image/video 等所有外部 fetch 路径。
 *
 * @module ssrf-guard
 * @author fxbin
 */

/**
 * 协议白名单：仅允许 http/https。
 */
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * 是否允许 loopback 地址（127.0.0.1/::1/localhost）。
 * 仅在测试环境（ZHIJING_SSRF_ALLOW_LOOPBACK=1）下启用，
 * 生产环境必须保持 false，避免 SSRF 攻击。
 */
const ALLOW_LOOPBACK = process.env.ZHIJING_SSRF_ALLOW_LOOPBACK === '1';

/**
 * 主机名黑名单字面量（小写匹配）。
 * 涵盖 localhost、localhost.localdomain、ip6-localhost 等常见本地主机名。
 */
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
  'broadcasthost',
]);

/**
 * 判断 IPv4 字符串是否属于内网/保留段。
 *
 * @param ip - 形如 "10.0.0.1" 的 IPv4 字符串
 * @returns 内网返回 true，公网返回 false
 * @author fxbin
 */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  const octets = parts.map((part) => Number.parseInt(part, 10));
  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return false;
  }
  const [a, b] = octets;
  if (a === 0) return true;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 224) return true;
  if (a === 240) return true;
  return false;
}

/**
 * 判断 IPv6 字符串是否属于本地/链路本地/唯一本地等保留段。
 *
 * 兼容 IPv4-mapped IPv6（::ffff:a.b.c.d）。
 *
 * @param ip - 形如 "::1" 或 "fe80::1" 的 IPv6 字符串
 * @returns 内网/保留返回 true，公网返回 false
 * @author fxbin
 */
function isPrivateIPv6(ip: string): boolean {
  const lowered = ip.toLowerCase();
  if (lowered === '::1') return true;
  if (lowered === '::') return true;
  if (lowered.startsWith('fe80:')) return true;
  if (lowered.startsWith('fc') || lowered.startsWith('fd')) return true;
  if (lowered.startsWith('ff')) return true;
  const mappedMatch = lowered.match(/::ffff:([0-9.]+)$/);
  if (mappedMatch) {
    return isPrivateIPv4(mappedMatch[1]);
  }
  if (lowered.startsWith('::ffff:')) {
    const tail = lowered.slice('::ffff:'.length);
    if (/^[0-9.]+$/.test(tail)) {
      return isPrivateIPv4(tail);
    }
  }
  return false;
}

/**
 * 判断主机名是否为 IP 字面量（IPv4 或 IPv6）。
 *
 * @param hostname - URL hostname
 * @returns IP 字面量返回 true
 * @author fxbin
 */
function isIpLiteral(hostname: string): boolean {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return true;
  if (hostname.includes(':')) return true;
  return false;
}

/**
 * 判断主机名是否为内网地址。
 *
 * 优先匹配字面量黑名单（localhost 等），
 * 其次匹配 IPv4/IPv6 私有段。
 *
 * @param hostname - URL hostname（已 toLowerCase）
 * @returns 内网返回 true
 * @author fxbin
 */
function isInternalHostname(hostname: string): boolean {
  const lowered = hostname.toLowerCase();
  if (ALLOW_LOOPBACK) {
    if (lowered === 'localhost' || lowered === '127.0.0.1' || lowered === '::1') {
      return false;
    }
  }
  if (BLOCKED_HOSTNAMES.has(lowered)) return true;
  if (lowered.endsWith('.localhost')) return true;
  if (lowered.endsWith('.local')) return true;
  if (lowered.endsWith('.internal')) return true;
  if (isIpLiteral(lowered)) {
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(lowered)) {
      return isPrivateIPv4(lowered);
    }
    return isPrivateIPv6(lowered);
  }
  return false;
}

/**
 * SSRF 校验结果。
 */
export interface SsrfCheckResult {
  /** 是否通过校验（true 表示可访问，false 表示被拦截） */
  ok: boolean;
  /** 拦截原因；ok=true 时为空字符串 */
  reason: string;
}

/**
 * 校验单个 URL 是否可安全访问。
 *
 * 检查项：
 * 1. 协议必须为 http/https；
 * 2. hostname 不能是 localhost 等字面量；
 * 3. hostname 不能解析为内网 IP（仅校验字面量 IP，不解析 DNS）。
 *
 * 注意：本函数不解析 DNS，仅校验字面量。
 * 若 hostname 为域名（如 example.com），即使 DNS 解析到内网也不会被拦截。
 * 这是出于性能与稳定性的权衡，与 cloud metadata 防护对齐。
 *
 * @param sourceUrl - 待校验的 URL 字符串
 * @returns 校验结果
 * @author fxbin
 */
export function checkUrlForSsrf(sourceUrl: string): SsrfCheckResult {
  let parsed: URL;
  try {
    parsed = new URL(sourceUrl);
  } catch {
    return { ok: false, reason: 'URL 格式非法' };
  }
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    return { ok: false, reason: `协议 ${parsed.protocol} 不在白名单（仅允许 http/https）` };
  }
  if (isInternalHostname(parsed.hostname)) {
    return { ok: false, reason: `主机名 ${parsed.hostname} 属于内网/保留地址` };
  }
  return { ok: true, reason: '' };
}

/**
 * 断言 URL 可安全访问；不可访问时抛出 Error。
 *
 * @param sourceUrl - 待校验的 URL 字符串
 * @throws {Error} URL 协议非法或主机名为内网地址
 * @author fxbin
 */
export function assertUrlSafeForSsrf(sourceUrl: string): void {
  const result = checkUrlForSsrf(sourceUrl);
  if (!result.ok) {
    throw new Error(`SSRF 防护拦截：${result.reason}`);
  }
}

/**
 * 构造一个会在每次重定向后重新校验目标 URL 的 fetch 包装器。
 *
 * 用法：
 * ```ts
 * const safeFetch = createSsrfSafeFetch();
 * const response = await safeFetch(url, { redirect: 'follow' });
 * ```
 *
 * 实现策略：禁用自动 follow，手动处理 3xx，每次重定向都重新校验目标 URL，
 * 最大重定向次数 5，避免无限重定向。
 *
 * @returns 与全局 fetch 签名兼容的函数
 * @author fxbin
 */
export function createSsrfSafeFetch(): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const MAX_REDIRECTS = 5;
    let currentUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    let currentInit: RequestInit = { ...init, redirect: 'manual' };
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      assertUrlSafeForSsrf(currentUrl);
      const response = await fetch(currentUrl, currentInit);
      if (response.status < 300 || response.status >= 400) {
        return response;
      }
      const location = response.headers.get('location');
      if (!location) {
        return response;
      }
      currentUrl = new URL(location, currentUrl).toString();
      currentInit = { ...currentInit, redirect: 'manual' };
    }
    throw new Error('SSRF 防护拦截：重定向次数超限（>5）');
  };
}
