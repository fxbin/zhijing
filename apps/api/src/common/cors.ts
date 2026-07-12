export const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

/**
 * 通配符 origin，禁止作为 CORS 允许来源。
 * 防止误配置 ZHIJING_ALLOWED_ORIGINS=* 导致任意站点跨域访问。
 */
export const CORS_WILDCARD_ORIGIN = '*';

/**
 * 解析 CORS 允许来源列表。
 * 优先读环境变量 ZHIJING_ALLOWED_ORIGINS（逗号分隔），未设置时使用默认值。
 * 通配符 * 会被过滤，防止任意站点跨域访问。
 * @returns CORS 允许来源数组
 * @author fxbin
 */
export function resolveAllowedOrigins(): string[] {
  const raw = process.env.ZHIJING_ALLOWED_ORIGINS;
  if (!raw) return DEFAULT_ALLOWED_ORIGINS;
  const origins = raw
    .split(',')
    .map((item) => item.trim())
    .filter((item) => Boolean(item) && item !== CORS_WILDCARD_ORIGIN);
  return origins.length > 0 ? origins : DEFAULT_ALLOWED_ORIGINS;
}
