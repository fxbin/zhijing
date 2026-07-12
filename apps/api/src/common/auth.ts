import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * inspect 调试路由访问令牌。
 * 仅当环境变量 ZHIJING_INSPECT_TOKEN 被设置时，inspect 路由才可用；
 * 客户端必须通过 x-inspect-token 请求头传入相同令牌。
 * 未设置时 inspect 路由返回 404，避免任意客户端拖库。
 * @author fxbin
 */
export const INSPECT_TOKEN = process.env.ZHIJING_INSPECT_TOKEN ?? '';

/**
 * 访问密码门禁密码。
 * 仅当环境变量 ZHIJING_ACCESS_PASSWORD 被设置时，全站门禁才启用；
 * 未设置时所有接口可自由访问（本地开发场景）。
 * 公网部署必须设置此变量，防止未授权访问。
 * @author fxbin
 */
export const ACCESS_PASSWORD = process.env.ZHIJING_ACCESS_PASSWORD ?? '';

/**
 * 访问令牌有效期（毫秒），7 天。
 * 令牌由密码 + 过期时间戳经 HMAC-SHA256 签名生成，无需持久化存储。
 * @author fxbin
 */
export const ACCESS_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * 访问令牌签名密钥。
 * 优先使用环境变量 ZHIJING_ACCESS_TOKEN_SECRET，未设置时由密码派生，
 * 保证部署后重启不影响已签发令牌的有效性。
 * @author fxbin
 */
export const ACCESS_TOKEN_SECRET = process.env.ZHIJING_ACCESS_TOKEN_SECRET ?? ACCESS_PASSWORD;

/**
 * 校验 inspect 调试路由的访问令牌。
 * 未配置令牌或令牌不匹配时返回 false，调用方应返回 404 或 403。
 * @author fxbin
 */
export function isInspectAllowed(request: { headers: Record<string, string | string[] | undefined> }): boolean {
  if (!INSPECT_TOKEN) return false;
  const headerValue = request.headers['x-inspect-token'];
  const provided = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  return typeof provided === 'string' && provided.length > 0 && provided === INSPECT_TOKEN;
}

/**
 * 签发访问令牌。
 * 令牌格式：{expireAt}.{hmac}，hmac = HMAC-SHA256(secret, password + ':' + expireAt)。
 * @returns 签发的访问令牌字符串
 * @author fxbin
 */
export function issueAccessToken(): string {
  const expireAt = Date.now() + ACCESS_TOKEN_TTL_MS;
  const payload = `${ACCESS_PASSWORD}:${expireAt}`;
  const hmac = createHmac('sha256', ACCESS_TOKEN_SECRET).update(payload).digest('hex');
  return `${expireAt}.${hmac}`;
}

/**
 * 校验访问令牌。
 * @param token - 待校验的令牌字符串
 * @returns 是否有效
 * @author fxbin
 */
export function verifyAccessToken(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const expireAt = Number.parseInt(parts[0], 10);
  if (!Number.isFinite(expireAt) || expireAt < Date.now()) return false;
  const payload = `${ACCESS_PASSWORD}:${expireAt}`;
  const expectedHmac = createHmac('sha256', ACCESS_TOKEN_SECRET).update(payload).digest('hex');
  const provided = Buffer.from(parts[1], 'hex');
  const expected = Buffer.from(expectedHmac, 'hex');
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}

/**
 * 从请求中提取访问令牌。
 * 优先级：X-Access-Token 头 > access_token cookie > query 参数 access_token。
 * @param request - Fastify 请求对象
 * @returns 访问令牌字符串或空
 * @author fxbin
 */
export function extractAccessToken(request: { headers: Record<string, string | string[] | undefined>; query?: unknown }): string {
  const headerValue = request.headers['x-access-token'];
  if (typeof headerValue === 'string' && headerValue.length > 0) return headerValue;
  if (Array.isArray(headerValue) && headerValue.length > 0) return headerValue[0];
  const cookieHeader = request.headers.cookie;
  if (typeof cookieHeader === 'string') {
    const match = /access_token=([^;]+)/.exec(cookieHeader);
    if (match) return match[1];
  }
  const query = request.query as Record<string, unknown> | undefined;
  const queryToken = query?.access_token;
  if (typeof queryToken === 'string' && queryToken.length > 0) return queryToken;
  return '';
}
