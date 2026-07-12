import type { FastifyInstance } from 'fastify';
import {
  listAllArtifacts,
  initializeArtifactSections,
  editArtifactSection,
  listArtifactRevisions,
  KnowledgeCoreError,
} from '@zhijing/core';

/**
 * 注册产物路由（列表、节初始化、节编辑、修订历史）。
 * @param app - Fastify 实例
 * @author fxbin
 */
export function registerArtifactRoutes(app: FastifyInstance): void {
  app.get<{
    Querystring: { query?: string; limit?: string };
  }>('/api/artifacts', async (request) => {
    const { query, limit } = request.query;
    return listAllArtifacts({
      query: query ?? undefined,
      limit: limit ? Number(limit) : undefined,
    });
  });

  app.post<{ Params: { id: string }; Body: { sections?: Array<{ title?: string; body?: string }> } }>('/api/artifacts/:id/sections/initialize', async (request, reply) => {
    const rawSections = Array.isArray(request.body?.sections) ? request.body.sections : [];
    const sectionInits = rawSections
      .map((section) => ({
        title: typeof section?.title === 'string' ? section.title : '',
        body: typeof section?.body === 'string' ? section.body : '',
      }))
      .filter((section) => section.title.trim().length > 0 || section.body.trim().length > 0);
    if (sectionInits.length === 0) {
      return reply.status(400).send({ error: 'sections 数组不能为空，且每项需包含非空 title 或 body' });
    }
    try {
      const artifact = await initializeArtifactSections(request.params.id, sectionInits);
      return { artifact };
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.status(error.statusCode).send({ error: error.message });
      }
      throw error;
    }
  });

  app.patch<{ Params: { id: string; sectionId: string }; Body: { title?: string; body?: string } }>('/api/artifacts/:id/sections/:sectionId', async (request, reply) => {
    const body = request.body ?? {};
    const hasTitle = typeof body.title === 'string';
    const hasBody = typeof body.body === 'string';
    if (!hasTitle && !hasBody) {
      return reply.status(400).send({ error: '至少需要提供 title 或 body 字段' });
    }
    try {
      const result = await editArtifactSection(request.params.id, request.params.sectionId, {
        title: hasTitle ? body.title : undefined,
        body: hasBody ? body.body : undefined,
      });
      return result;
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.status(error.statusCode).send({ error: error.message });
      }
      throw error;
    }
  });

  app.get<{ Params: { id: string } }>('/api/artifacts/:id/revisions', async (request) => {
    const revisions = await listArtifactRevisions(request.params.id);
    return { revisions };
  });
}
