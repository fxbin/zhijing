/**
 * 门禁放行的公开路径前缀。
 * 健康检查、登录、图片/视频代理（带 SSRF 校验）、前端静态资源不需鉴权；
 * 前端静态资源放行以让 AccessGate 登录界面可加载，业务 API 仍需鉴权。
 * @author fxbin
 */
export const PUBLIC_PATH_PREFIXES = [
  '/health',
  '/api/health',
  '/api/auth/login',
  '/api/auth/status',
  '/api/proxy-image',
  '/api/proxy-video',
  '/assets/',
  '/favicon.ico',
];

/**
 * 前端入口文件，放行以让门禁页可加载，后续 API 请求仍需鉴权。
 */
export const PUBLIC_EXACT_PATHS = new Set(['/', '/index.html']);

/**
 * 判断路径是否属于公开放行路径。
 * 前端静态资源（/assets/、/、/index.html）放行以让登录界面可加载，
 * 业务 API 请求仍需携带 access token。
 * @param url - 请求 URL
 * @returns 是否放行
 * @author fxbin
 */
export function isPublicPath(url: string): boolean {
  if (PUBLIC_EXACT_PATHS.has(url)) return true;
  return PUBLIC_PATH_PREFIXES.some((prefix) => url === prefix || url.startsWith(prefix + '/') || url.startsWith(prefix));
}
