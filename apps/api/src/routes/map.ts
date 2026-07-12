import type { FastifyInstance } from 'fastify';
import {
  getKnowledgeMap,
  getWorkspaceNodePositions,
  saveWorkspaceNodePositions,
  addMapEdge,
  removeMapEdge,
  KnowledgeCoreError,
} from '@zhijing/core';
import type {
  AddMapEdgeRequest,
  SaveKnowledgeMapNodePositionsRequest,
} from '@zhijing/shared';

/**
 * 注册知识地图路由（地图查询、节点位置、边增删）。
 * @param app - Fastify 实例
 * @author fxbin
 */
export function registerMapRoutes(app: FastifyInstance): void {
  app.get<{ Params: { id: string } }>('/api/workspaces/:id/map', async (request, reply) => {
    const map = getKnowledgeMap(request.params.id);
    if (!map) {
      return reply.code(404).send({ error: 'Knowledge base not found.' });
    }
    return map;
  });

  app.get<{ Params: { id: string } }>('/api/workspaces/:id/node-positions', async (request, reply) => {
    const positions = getWorkspaceNodePositions(request.params.id);
    if (positions === undefined) {
      return reply.code(404).send({ error: 'Knowledge base not found.' });
    }
    return { positions };
  });

  app.put<{ Params: { id: string }; Body: SaveKnowledgeMapNodePositionsRequest }>('/api/workspaces/:id/node-positions', async (request, reply) => {
    try {
      const positions = saveWorkspaceNodePositions(request.params.id, {
        positions: Array.isArray(request.body?.positions) ? request.body.positions : [],
      });
      return { positions };
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'save knowledge base node positions failed');
      return reply.code(500).send({ error: 'Save node positions failed.' });
    }
  });

  app.post<{ Params: { id: string }; Body: AddMapEdgeRequest }>('/api/workspaces/:id/map/edges', async (request, reply) => {
    try {
      const edge = addMapEdge(request.params.id, {
        sourceNodeId: typeof request.body?.sourceNodeId === 'string' ? request.body.sourceNodeId : '',
        targetNodeId: typeof request.body?.targetNodeId === 'string' ? request.body.targetNodeId : '',
        relation: typeof request.body?.relation === 'string' ? (request.body.relation as AddMapEdgeRequest['relation']) : 'related_to',
      });
      return reply.code(201).send(edge);
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'add map edge failed');
      return reply.code(500).send({ error: 'Add map edge failed.' });
    }
  });

  app.delete<{ Params: { id: string; edgeId: string } }>('/api/workspaces/:id/map/edges/:edgeId', async (request, reply) => {
    try {
      removeMapEdge(request.params.id, request.params.edgeId);
      return reply.code(204).send();
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'remove map edge failed');
      return reply.code(500).send({ error: 'Remove map edge failed.' });
    }
  });
}
