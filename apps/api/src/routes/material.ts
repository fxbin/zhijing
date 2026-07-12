import type { FastifyInstance } from 'fastify';
import {
  listMaterialsPaged,
  requestMaterialParsing,
  recordMaterialParsingFailure,
  assignMaterialToWorkspace,
  suggestMaterialAssignments,
  completeMaterialReview,
  getMaterialDeletionImpact,
  deleteMaterial,
  archiveMaterial,
  unarchiveMaterial,
  retryMaterialCardGeneration,
  intakeKnowledge,
  intakeFolderFromPath,
  intakeFilesFromBatch,
  intakeRawHtml,
  type RawHtmlIntakeRequest,
  KnowledgeCoreError,
} from '@zhijing/core';
import type {
  IntakeRequest,
  FolderIntakeRequest,
  FileBatchIntakeRequest,
  AssignMaterialRequest,
  CompleteMaterialReviewRequest,
} from '@zhijing/shared';
import {
  parseMaterialType,
  parseStatus,
  parseLimit,
  INTAKE_AUDIENCE_SET,
  INTAKE_DEPTH_SET,
  INTAKE_SCOPE_SET,
} from '../common/parsers.js';

/**
 * 注册资料路由（列表、解析、分配、审阅、删除、归档、卡片重生成、导入）。
 * @param app - Fastify 实例
 * @author fxbin
 */
export function registerMaterialRoutes(app: FastifyInstance): void {
  app.get<{
    Querystring: {
      type?: string;
      status?: string;
      q?: string;
      limit?: string;
      workspaceId?: string;
      cursorCreatedAt?: string;
      cursorId?: string;
    };
  }>('/api/materials', async (request) => {
    const cursorCreatedAt = request.query.cursorCreatedAt?.trim();
    const cursorId = request.query.cursorId?.trim();
    return listMaterialsPaged({
      workspaceId: request.query.workspaceId || undefined,
      type: parseMaterialType(request.query.type),
      parseStatus: parseStatus(request.query.status),
      query: request.query.q,
      limit: parseLimit(request.query.limit),
      cursorCreatedAt: cursorCreatedAt || undefined,
      cursorId: cursorId || undefined,
    });
  });

  app.post<{ Params: { id: string } }>('/api/materials/:id/parse', async (request, reply) => {
    try {
      return await requestMaterialParsing(request.params.id);
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'material parse queue failed');
      return reply.code(500).send({ error: 'Material parse queue failed.' });
    }
  });

  app.post<{ Params: { id: string }; Body: { taskId?: string; error?: string } }>('/api/materials/:id/parse/failure', async (request, reply) => {
    try {
      return recordMaterialParsingFailure(
        request.params.id,
        typeof request.body?.error === 'string' ? request.body.error : 'Material parsing failed.',
        typeof request.body?.taskId === 'string' ? request.body.taskId : undefined,
      );
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'material parse failure report failed');
      return reply.code(500).send({ error: 'Material parse failure report failed.' });
    }
  });

  app.post<{ Params: { id: string }; Body: Partial<AssignMaterialRequest> }>('/api/materials/:id/assign', async (request, reply) => {
    try {
      return assignMaterialToWorkspace(request.params.id, {
        workspaceId: typeof request.body?.workspaceId === 'string' ? request.body.workspaceId.trim() : undefined,
        newWorkspaceTitle: typeof request.body?.newWorkspaceTitle === 'string' ? request.body.newWorkspaceTitle.trim() : undefined,
      });
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'material assignment failed');
      return reply.code(500).send({ error: 'Material assignment failed.' });
    }
  });

  app.get<{ Params: { id: string } }>('/api/materials/:id/assignment-suggestions', async (request, reply) => {
    try {
      return suggestMaterialAssignments(request.params.id);
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'material assignment suggestions failed');
      return reply.code(500).send({ error: 'Material assignment suggestions failed.' });
    }
  });

  app.post<{ Params: { id: string }; Body: Partial<CompleteMaterialReviewRequest> }>('/api/materials/:id/review', async (request, reply) => {
    try {
      return await completeMaterialReview(request.params.id, {
        title: typeof request.body?.title === 'string' ? request.body.title : undefined,
        contentText: typeof request.body?.contentText === 'string' ? request.body.contentText : undefined,
        mediaUrls: Array.isArray(request.body?.mediaUrls)
          ? request.body.mediaUrls.filter((item): item is string => typeof item === 'string')
          : undefined,
        markIngested: request.body?.markIngested === true,
      });
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'material manual review failed');
      return reply.code(500).send({ error: 'Material manual review failed.' });
    }
  });

  app.get<{ Params: { id: string } }>('/api/materials/:id/delete-impact', async (request, reply) => {
    try {
      return getMaterialDeletionImpact(request.params.id);
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'material delete impact failed');
      return reply.code(500).send({ error: 'Material delete impact failed.' });
    }
  });

  app.delete<{ Params: { id: string } }>('/api/materials/:id', async (request, reply) => {
    try {
      return deleteMaterial(request.params.id);
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'material delete failed');
      return reply.code(500).send({ error: 'Material delete failed.' });
    }
  });

  app.post<{ Params: { id: string } }>('/api/materials/:id/archive', async (request, reply) => {
    try {
      return archiveMaterial(request.params.id);
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'material archive failed');
      return reply.code(500).send({ error: 'Material archive failed.' });
    }
  });

  app.post<{ Params: { id: string } }>('/api/materials/:id/unarchive', async (request, reply) => {
    try {
      return unarchiveMaterial(request.params.id);
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'material unarchive failed');
      return reply.code(500).send({ error: 'Material unarchive failed.' });
    }
  });

  app.post<{ Params: { id: string } }>('/api/materials/:id/regenerate-cards', async (request, reply) => {
    try {
      const result = await retryMaterialCardGeneration(request.params.id);
      return { ok: true, cardCount: result.cards.length, cardIds: result.cards.map((card) => card.id) };
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'material card regeneration failed');
      return reply.code(500).send({ error: 'Material card regeneration failed.' });
    }
  });

  app.post<{ Body: Partial<IntakeRequest> }>('/api/intake', async (request, reply) => {
    const input = typeof request.body?.input === 'string' ? request.body.input.trim() : '';
    if (!input) {
      return reply.code(400).send({ error: 'Input is required.' });
    }

    const audience = request.body?.audience;
    const depth = request.body?.depth;
    const scope = request.body?.scope;

    if (audience !== undefined && !INTAKE_AUDIENCE_SET.has(audience)) {
      return reply.code(400).send({ error: 'audience 字段值非法。' });
    }
    if (depth !== undefined && !INTAKE_DEPTH_SET.has(depth)) {
      return reply.code(400).send({ error: 'depth 字段值非法。' });
    }
    if (scope !== undefined && !INTAKE_SCOPE_SET.has(scope)) {
      return reply.code(400).send({ error: 'scope 字段值非法。' });
    }

    try {
      return await intakeKnowledge({
        input,
        workspaceId: request.body.workspaceId,
        audience,
        depth,
        scope,
      });
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'intake failed');
      return reply.code(500).send({ error: 'Intake failed.' });
    }
  });

  app.post<{ Body: Partial<FolderIntakeRequest> }>('/api/intake/folder', async (request, reply) => {
    const path = typeof request.body?.path === 'string' ? request.body.path.trim() : '';
    if (!path) {
      return reply.code(400).send({ error: 'path is required.' });
    }
    try {
      return await intakeFolderFromPath({
        path,
        workspaceId: request.body.workspaceId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Folder intake failed.';
      if (/Path (not found|is not a directory)|Workspace not found|Too many files/.test(message)) {
        return reply.code(400).send({ error: message });
      }
      request.log.error({ error }, 'folder intake failed');
      return reply.code(500).send({ error: 'Folder intake failed.' });
    }
  });

  app.post<{ Body: Partial<FileBatchIntakeRequest> }>('/api/intake/files', async (request, reply) => {
    const items = Array.isArray(request.body?.items) ? request.body.items : null;
    if (!items || items.length === 0) {
      return reply.code(400).send({ error: 'items is required and must be a non-empty array.' });
    }
    try {
      return await intakeFilesFromBatch({
        items,
        workspaceId: request.body.workspaceId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'File batch intake failed.';
      if (/items|Workspace not found|Too many files/.test(message)) {
        return reply.code(400).send({ error: message });
      }
      request.log.error({ error }, 'file batch intake failed');
      return reply.code(500).send({ error: 'File batch intake failed.' });
    }
  });

  app.post<{ Body: Partial<RawHtmlIntakeRequest> }>('/api/intake/raw-html', async (request, reply) => {
    const html = typeof request.body?.html === 'string' ? request.body.html.trim() : '';
    if (!html) {
      return reply.code(400).send({ error: 'HTML content is required.' });
    }
    try {
      const result = intakeRawHtml({
        html,
        title: typeof request.body?.title === 'string' ? request.body.title.trim() : undefined,
        sourceUrl: typeof request.body?.sourceUrl === 'string' ? request.body.sourceUrl.trim() : undefined,
        workspaceId: request.body?.workspaceId,
      });
      return result;
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'raw html intake failed');
      return reply.code(500).send({ error: 'Raw HTML intake failed.' });
    }
  });
}
