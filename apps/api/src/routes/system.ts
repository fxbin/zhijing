import type { FastifyInstance } from 'fastify';
import { revealDataDirectory } from '@zhijing/core';

/**
 * 注册系统基础路由（健康检查、数据目录揭示）。
 * @param app - Fastify 实例
 * @author fxbin
 */
export function registerSystemRoutes(app: FastifyInstance): void {
  app.get('/health', async () => ({
    ok: true,
    service: 'zhijing-api',
    timestamp: new Date().toISOString(),
  }));

  app.get('/api/health', async () => ({
    ok: true,
    service: 'zhijing-api',
    timestamp: new Date().toISOString(),
  }));

  app.post('/api/system/reveal-data-dir', async () => {
    const result = await revealDataDirectory();
    if (!result.ok) {
      return { ok: false, error: result.error };
    }
    return { ok: true, path: result.path };
  });
}
