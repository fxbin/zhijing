import type { FastifyInstance } from 'fastify';
import {
  listInspectTables,
  inspectQuery,
  KnowledgeCoreError,
} from '@zhijing/core';
import { isInspectAllowed } from '../common/auth.js';

/**
 * 注册 inspect 调试路由（表列表、SQL 查询）。
 * @param app - Fastify 实例
 * @author fxbin
 */
export function registerInspectRoutes(app: FastifyInstance): void {
  app.get('/api/inspect/tables', async (request, reply) => {
    if (!isInspectAllowed(request)) {
      return reply.code(404).send({ error: 'Not Found' });
    }
    return { tables: listInspectTables() };
  });

  app.post<{ Body: { sql?: string; limit?: number } }>('/api/inspect/query', async (request, reply) => {
    if (!isInspectAllowed(request)) {
      return reply.code(404).send({ error: 'Not Found' });
    }
    const sql = typeof request.body?.sql === 'string' ? request.body.sql.trim() : '';
    if (!sql) {
      return reply.code(400).send({ error: 'sql 为必填。' });
    }
    const limit = typeof request.body?.limit === 'number' ? request.body.limit : undefined;
    try {
      const rows = inspectQuery(sql, limit);
      return { rows, count: rows.length };
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'inspect query failed');
      return reply.code(500).send({ error: 'Inspect query failed.' });
    }
  });
}
