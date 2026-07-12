import type { FastifyInstance } from 'fastify';
import {
  listUserMemoryRecords,
  createUserMemoryRecord,
  findUserMemoryRecord,
  updateUserMemoryRecord,
  deleteUserMemoryRecord,
} from '@zhijing/core';
import type { UserMemoryQuery } from '@zhijing/core';
import type {
  UserMemoryScope,
  UserMemorySource,
  CreateUserMemoryRequest,
  UpdateUserMemoryRequest,
} from '@zhijing/shared';
import {
  USER_MEMORY_SCOPE_VALUES,
  USER_MEMORY_SOURCE_VALUES,
} from '@zhijing/shared';
import {
  USER_MEMORY_SCOPE_SET,
  USER_MEMORY_SOURCE_SET,
} from '../common/parsers.js';

/**
 * 注册用户记忆路由（列表、创建、查询、更新、删除）。
 * @param app - Fastify 实例
 * @author fxbin
 */
export function registerUserMemoryRoutes(app: FastifyInstance): void {
  app.get<{
    Querystring: {
      scope?: string;
      source?: string;
      workspaceId?: string;
      key?: string;
      limit?: string;
    };
  }>('/api/user-memory', async (request, reply) => {
    const query = request.query;
    if (query.scope !== undefined && !USER_MEMORY_SCOPE_SET.has(query.scope)) {
      return reply.code(400).send({ error: `Invalid scope. Allowed: ${USER_MEMORY_SCOPE_VALUES.join(', ')}` });
    }
    if (query.source !== undefined && !USER_MEMORY_SOURCE_SET.has(query.source)) {
      return reply.code(400).send({ error: `Invalid source. Allowed: ${USER_MEMORY_SOURCE_VALUES.join(', ')}` });
    }
    const limit = query.limit !== undefined ? Number(query.limit) : undefined;
    if (limit !== undefined && (!Number.isFinite(limit) || limit <= 0)) {
      return reply.code(400).send({ error: 'Invalid limit. Must be a positive number.' });
    }
    const memoryQuery: UserMemoryQuery = {
      scope: query.scope as UserMemoryScope | undefined,
      source: query.source as UserMemorySource | undefined,
      workspaceId: query.workspaceId,
      key: query.key,
      limit,
    };
    return { records: listUserMemoryRecords(memoryQuery) };
  });

  app.post<{
    Body: CreateUserMemoryRequest;
  }>('/api/user-memory', async (request, reply) => {
    const body = request.body;
    if (!body || typeof body !== 'object') {
      return reply.code(400).send({ error: 'Request body is required.' });
    }
    if (body.scope !== undefined && !USER_MEMORY_SCOPE_SET.has(body.scope)) {
      return reply.code(400).send({ error: `Invalid scope. Allowed: ${USER_MEMORY_SCOPE_VALUES.join(', ')}` });
    }
    if (body.source !== undefined && !USER_MEMORY_SOURCE_SET.has(body.source)) {
      return reply.code(400).send({ error: `Invalid source. Allowed: ${USER_MEMORY_SOURCE_VALUES.join(', ')}` });
    }
    try {
      const record = createUserMemoryRecord(body);
      return reply.code(201).send(record);
    } catch (error) {
      return reply.code(400).send({ error: error instanceof Error ? error.message : 'Failed to create user memory.' });
    }
  });

  app.get<{ Params: { id: string } }>('/api/user-memory/:id', async (request, reply) => {
    const record = findUserMemoryRecord(request.params.id);
    if (!record) {
      return reply.code(404).send({ error: 'User memory not found.' });
    }
    return record;
  });

  app.patch<{
    Params: { id: string };
    Body: UpdateUserMemoryRequest;
  }>('/api/user-memory/:id', async (request, reply) => {
    const body = request.body;
    if (!body || typeof body !== 'object') {
      return reply.code(400).send({ error: 'Request body is required.' });
    }
    if (body.scope !== undefined && !USER_MEMORY_SCOPE_SET.has(body.scope)) {
      return reply.code(400).send({ error: `Invalid scope. Allowed: ${USER_MEMORY_SCOPE_VALUES.join(', ')}` });
    }
    const record = updateUserMemoryRecord(request.params.id, body);
    if (!record) {
      return reply.code(404).send({ error: 'User memory not found.' });
    }
    return record;
  });

  app.delete<{ Params: { id: string } }>('/api/user-memory/:id', async (request, reply) => {
    const ok = deleteUserMemoryRecord(request.params.id);
    if (!ok) {
      return reply.code(404).send({ error: 'User memory not found.' });
    }
    return reply.code(204).send();
  });
}
