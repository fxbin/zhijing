import type { FastifyInstance } from 'fastify';
import {
  listWorkspaceProposals,
  decideWorkspaceProposal,
  listAgentActionLogs,
  listMessages,
  listDueCards,
  listArchivedItems,
  listExports,
  recordExport,
  describeCloudBackupStatus,
  loadFilter,
  saveFilter,
  clearFilter,
  listEntities,
  extractEntities,
  listConflictGroups,
  listConflictAuditEntries,
  resolveConflictGroup,
  runKnowledgeKit,
  getTask,
  getTranscriptionCapabilityReport,
  KnowledgeCoreError,
} from '@zhijing/core';
import type {
  ProposalStatus,
  RunKnowledgeKitRequest,
} from '@zhijing/shared';
import { parseKitId } from '../common/parsers.js';

/**
 * 注册杂项路由（agent 提议、消息、归档、导出、云备份、筛选器、实体、冲突、知识套件、任务、转录能力）。
 * @param app - Fastify 实例
 * @author fxbin
 */
export function registerMiscRoutes(app: FastifyInstance): void {
  app.get<{ Params: { workspaceId: string }; Querystring: { status?: string; limit?: string } }>(
    '/api/workspaces/:workspaceId/agent-proposals',
    async (request, reply) => {
      const validStatuses = new Set<string>(['pending', 'accepted', 'rejected', 'dismissed']);
      const statusRaw = typeof request.query.status === 'string' ? request.query.status.trim() : '';
      const status: ProposalStatus | undefined = statusRaw && validStatuses.has(statusRaw)
        ? (statusRaw as ProposalStatus)
        : undefined;
      if (statusRaw && !status) {
        return reply.code(400).send({ error: 'status 必须是 pending / accepted / rejected / dismissed 之一。' });
      }
      const limitRaw = typeof request.query.limit === 'string' ? request.query.limit.trim() : '';
      const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      return { proposals: listWorkspaceProposals(request.params.workspaceId, status, limit) };
    },
  );

  app.post<{ Params: { workspaceId: string; proposalId: string }; Body: { decision?: string } }>(
    '/api/workspaces/:workspaceId/agent-proposals/:proposalId/decide',
    async (request, reply) => {
      const decisionRaw = typeof request.body?.decision === 'string' ? request.body.decision.trim() : '';
      const validDecisions: ProposalStatus[] = ['accepted', 'rejected', 'dismissed'];
      if (!validDecisions.includes(decisionRaw as ProposalStatus)) {
        return reply.code(400).send({ error: 'decision 必须是 accepted / rejected / dismissed 之一。' });
      }
      try {
        const updated = decideWorkspaceProposal(
          request.params.workspaceId,
          request.params.proposalId,
          decisionRaw as ProposalStatus,
        );
        return { proposal: updated };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Proposal decide failed.';
        const isNotFound = message.includes('not found');
        const isInvalidTransition = message.includes('Cannot transition');
        const code = isNotFound ? 404 : isInvalidTransition ? 409 : 500;
        return reply.code(code).send({ error: message });
      }
    },
  );

  app.get<{ Querystring: { workspaceId?: string; action?: string; limit?: string } }>(
    '/api/agent-action-logs',
    async (request) => {
      const workspaceId = typeof request.query.workspaceId === 'string' && request.query.workspaceId.trim()
        ? request.query.workspaceId.trim()
        : undefined;
      const action = typeof request.query.action === 'string' && request.query.action.trim()
        ? request.query.action.trim()
        : undefined;
      const limitRaw = typeof request.query.limit === 'string' ? request.query.limit.trim() : '';
      const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      return listAgentActionLogs({ workspaceId, action, limit });
    },
  );

  app.get<{ Params: { id: string }; Querystring: { limit?: string } }>('/api/workspaces/:id/messages', async (request, reply) => {
    const limit = request.query.limit ? Number(request.query.limit) : undefined;
    const messages = await listMessages(request.params.id, limit);
    return { messages };
  });

  app.get<{ Params: { id: string }; Querystring: { limit?: string } }>('/api/workspaces/:id/due-cards', async (request, reply) => {
    const limit = request.query.limit ? Number(request.query.limit) : undefined;
    const cards = await listDueCards(request.params.id, limit);
    return { cards };
  });

  app.get<{
    Querystring: {
      workspaceId?: string;
    };
  }>('/api/archive', async (request) => listArchivedItems({
    workspaceId: typeof request.query.workspaceId === 'string' ? request.query.workspaceId : undefined,
  }));

  app.get<{ Params: { id: string } }>('/api/workspaces/:id/exports', async (request, reply) => {
    const exports = await listExports(request.params.id);
    return { exports };
  });

  app.post<{ Params: { id: string }; Body: { format?: string; scope?: string; includeArtifacts?: boolean; filename?: string; materialCount?: number; cardCount?: number; artifactCount?: number } }>('/api/workspaces/:id/exports', async (request, reply) => {
    const body = request.body ?? {};
    const format = body.format;
    if (format !== 'markdown' && format !== 'json' && format !== 'pdf') {
      return reply.status(400).send({ error: 'format must be one of markdown/json/pdf' });
    }
    const scope = body.scope;
    if (scope !== 'all' && scope !== 'materials' && scope !== 'cards') {
      return reply.status(400).send({ error: 'scope must be one of all/materials/cards' });
    }
    const filename = typeof body.filename === 'string' && body.filename.trim().length > 0 ? body.filename.trim() : `export.${format === 'markdown' ? 'md' : format}`;
    const record = await recordExport(request.params.id, {
      format,
      scope,
      includeArtifacts: Boolean(body.includeArtifacts),
      filename,
      materialCount: Number.isFinite(body.materialCount) ? Math.max(0, body.materialCount ?? 0) : 0,
      cardCount: Number.isFinite(body.cardCount) ? Math.max(0, body.cardCount ?? 0) : 0,
      artifactCount: Number.isFinite(body.artifactCount) ? Math.max(0, body.artifactCount ?? 0) : 0,
    });
    return { export: record };
  });

  app.get('/api/cloud-backup/status', async () => describeCloudBackupStatus());

  app.post<{ Params: { id: string } }>('/api/workspaces/:id/cloud-backup', async (request, reply) => {
    const stub = describeCloudBackupStatus();
    return reply.status(501).send({
      ...stub,
      workspaceId: request.params.id,
      message: '云备份功能尚未启用。请使用 ExportView 的 Backup JSON 按钮进行本地整库备份。',
    });
  });

  app.get<{ Params: { scope: string } }>('/api/saved-filters/:scope', async (request) => {
    const filter = loadFilter(request.params.scope as 'assets' | 'compare');
    return { filter };
  });

  app.put<{ Params: { scope: string }; Body: { cardType?: string; claimStatus?: string; sortKey?: string; keyword?: string } }>('/api/saved-filters/:scope', async (request) => {
    const body = request.body ?? {};
    const record = saveFilter(request.params.scope as 'assets' | 'compare', {
      cardType: typeof body.cardType === 'string' && body.cardType.length > 0 ? body.cardType : null,
      claimStatus: typeof body.claimStatus === 'string' && body.claimStatus.length > 0 ? body.claimStatus : null,
      sortKey: typeof body.sortKey === 'string' ? body.sortKey : 'updated_desc',
      keyword: typeof body.keyword === 'string' ? body.keyword : '',
    });
    return { filter: record };
  });

  app.delete<{ Params: { scope: string } }>('/api/saved-filters/:scope', async (request) => {
    clearFilter(request.params.scope as 'assets' | 'compare');
    return { ok: true };
  });

  app.get<{ Params: { id: string } }>('/api/workspaces/:id/entities', async (request) => {
    const entities = listEntities(request.params.id);
    return { entities };
  });

  app.post<{ Params: { id: string } }>('/api/workspaces/:id/entities/extract', async (request, reply) => {
    try {
      const entities = await extractEntities(request.params.id);
      return { entities };
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.status(error.statusCode).send({ error: error.message });
      }
      throw error;
    }
  });

  app.get<{ Querystring: { kind?: string } }>('/api/conflicts/groups', async (request) => {
    const kind = request.query.kind;
    const groups = listConflictGroups(kind === 'duplicate_card' || kind === 'duplicate_material' ? kind : undefined);
    return { groups };
  });

  app.get<{ Querystring: { limit?: string } }>('/api/conflicts/audit', async (request) => {
    const limit = request.query.limit ? Number.parseInt(request.query.limit, 10) : undefined;
    const entries = listConflictAuditEntries(Number.isFinite(limit) ? limit : undefined);
    return { entries };
  });

  app.post<{ Body: { kind?: string; keepId?: string; dropIds?: string[] } }>('/api/conflicts/resolve', async (request, reply) => {
    const kind = request.body?.kind;
    const keepId = request.body?.keepId;
    const dropIds = Array.isArray(request.body?.dropIds) ? request.body.dropIds : [];
    if (kind !== 'duplicate_card' && kind !== 'duplicate_material') {
      return reply.status(400).send({ error: 'kind 必须是 duplicate_card 或 duplicate_material。' });
    }
    if (!keepId) {
      return reply.status(400).send({ error: 'keepId 为必填。' });
    }
    if (dropIds.length === 0) {
      return reply.status(400).send({ error: 'dropIds 至少需要一项。' });
    }
    try {
      const entry = resolveConflictGroup({ kind, keepId, dropIds });
      return { entry };
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.status(error.statusCode).send({ error: error.message });
      }
      throw error;
    }
  });

  app.post<{ Params: { id: string }; Body: Partial<RunKnowledgeKitRequest> }>('/api/workspaces/:id/kits/run', async (request, reply) => {
    try {
      return await runKnowledgeKit(
        request.params.id,
        parseKitId(request.body?.kitId),
      );
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'knowledge kit run failed');
      return reply.code(500).send({ error: 'Knowledge kit run failed.' });
    }
  });

  app.get<{ Params: { id: string } }>('/api/tasks/:id', async (request, reply) => {
    const task = getTask(request.params.id);
    if (!task) {
      return reply.code(404).send({ error: 'Task not found.' });
    }
    return task;
  });

  app.get<{ Querystring: { refresh?: string } }>('/api/transcription/capability', async (request, reply) => {
    try {
      const forceRefresh = request.query.refresh === '1' || request.query.refresh === 'true';
      return await getTranscriptionCapabilityReport(forceRefresh);
    } catch (error) {
      request.log.error({ error }, 'transcription capability check failed');
      return reply.code(500).send({ error: 'Transcription capability check failed.' });
    }
  });
}
