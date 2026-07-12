import type { FastifyInstance } from 'fastify';
import {
  ACCESS_PASSWORD,
  ACCESS_TOKEN_TTL_MS,
  issueAccessToken,
} from '../common/auth.js';

/**
 * 注册访问门鉴权路由（登录、门禁状态查询）。
 * @param app - Fastify 实例
 * @author fxbin
 */
export function registerAuthRoutes(app: FastifyInstance): void {
  /**
   * 访问密码登录端点。
   * 仅当 ZHIJING_ACCESS_PASSWORD 已配置时启用门禁。
   * 未配置密码时返回门禁未启用信息，便于前端判断。
   */
  app.post<{ Body: { password?: string } }>('/api/auth/login', async (request, reply) => {
    if (!ACCESS_PASSWORD) {
      return { ok: true, gateEnabled: false, token: '' };
    }
    const provided = typeof request.body?.password === 'string' ? request.body.password : '';
    if (!provided || provided !== ACCESS_PASSWORD) {
      return reply.code(401).send({ error: 'Invalid password.', code: 'INVALID_PASSWORD' });
    }
    const token = issueAccessToken();
    return { ok: true, gateEnabled: true, token, expiresIn: ACCESS_TOKEN_TTL_MS };
  });

  /**
   * 查询门禁状态。
   * 前端据此判断是否需要弹出密码框。
   */
  app.get('/api/auth/status', async () => ({
    gateEnabled: Boolean(ACCESS_PASSWORD),
  }));
}
