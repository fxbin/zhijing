import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import {
  getAgentChatRawMessages,
  truncateAgentChatSessionForRetry,
  persistAgentChatTurn,
  listAgentChatSessions,
  getAgentChatSession,
  renameAgentChatSession,
  deleteAgentChatSession,
  buildOrchestratorDecision,
  buildInterceptedDecision,
  classifyUserIntent,
  recordSuggestionSent,
  getActiveAgentCredentials,
} from '@zhijing/core';
import {
  startOrchestratorSession,
  truncateSessionForRetry,
} from '@zhijing/agent';
import type { AgentMessage } from '@earendil-works/pi-agent-core';
import type {
  AgentStreamEvent,
  AgentChatToolCallRecord,
  OrchestratorDecision,
} from '@zhijing/shared';
import type { RouteContext } from '../common/route-context.js';
import {
  SSE_IDLE_TIMEOUT_MS,
  SESSION_ID_PATTERN,
  type AgentRunTokenStats,
  type AgentToolCallDraft,
  addNullableNumber,
  deriveAgentChatSessionTitle,
  buildPrefetchContext,
} from '../common/sse-session.js';

/**
 * 注册 Agent 路由（流式对话、中止、会话管理）。
 *
 * @param app - Fastify 实例
 * @param ctx - 路由共享上下文（activeAgents 用于会话注册表）
 * @author fxbin
 */
export function registerAgentRoutes(app: FastifyInstance, ctx?: RouteContext): void {
  app.post<{ Params: { id: string }; Body: { message?: string; sessionId?: string; isWriting?: boolean; retryLastTurn?: boolean } }>(
    '/api/workspaces/:id/agent/stream',
    async (request, reply) => {
      const message = typeof request.body?.message === 'string' ? request.body.message.trim() : '';
      if (!message) {
        return reply.code(400).send({ error: 'Message is required.' });
      }
      const providedSessionId = typeof request.body?.sessionId === 'string' && request.body.sessionId.length > 0
        ? request.body.sessionId
        : '';
      if (providedSessionId && !SESSION_ID_PATTERN.test(providedSessionId)) {
        return reply.code(400).send({ error: 'Invalid sessionId format.' });
      }
      const sessionId = providedSessionId || `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const isWriting = Boolean(request.body?.isWriting);
      const retryRequested = Boolean(request.body?.retryLastTurn);

      if (retryRequested) {
        const memoryRetryResult = truncateSessionForRetry(sessionId, request.params.id);
        const persistedRetryResult = truncateAgentChatSessionForRetry(sessionId, request.params.id);
        const retryResult = persistedRetryResult.truncated ? persistedRetryResult : memoryRetryResult;
        if (retryResult.truncated) {
          request.log.info(
            { sessionId, workspaceId: request.params.id, before: retryResult.beforeCount, remaining: retryResult.remainingCount },
            'agent retry: session truncated before last user message',
          );
        } else {
          request.log.info(
            { sessionId, workspaceId: request.params.id, reason: 'no-op' },
            'agent retry: session missing or no user message, fallback to fresh turn',
          );
        }
      }

      const priorMessages = getAgentChatRawMessages(sessionId, request.params.id) as AgentMessage[] | null;
      const runId = `run_${Date.now()}_${randomUUID()}`;
      const runStartedAt = new Date().toISOString();
      const runStartMs = Date.now();
      const tokenStats: AgentRunTokenStats = { inputTokens: null, outputTokens: null, costUsd: null };
      const pendingToolCalls = new Map<string, AgentToolCallDraft>();
      const persistedToolCalls: AgentChatToolCallRecord[] = [];
      let runStatus: 'completed' | 'failed' | 'aborted' = 'completed';
      let runErrorMessage: string | null = null;

      reply.hijack();
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        'X-Session-Id': sessionId,
      });

      const idleTimer = setTimeout(() => {
        request.log.warn({ sessionId }, 'agent stream idle timeout, aborting');
        session?.abort();
      }, SSE_IDLE_TIMEOUT_MS);
      const send = (event: AgentStreamEvent) => {
        idleTimer.refresh();
        if (event.type === 'message_end' && event.usage) {
          tokenStats.inputTokens = addNullableNumber(tokenStats.inputTokens, event.usage.inputTokens);
          tokenStats.outputTokens = addNullableNumber(tokenStats.outputTokens, event.usage.outputTokens);
          tokenStats.costUsd = addNullableNumber(tokenStats.costUsd, event.usage.costUsd);
        }
        if (event.type === 'tool_start') {
          pendingToolCalls.set(event.toolCallId, {
            toolCallId: event.toolCallId,
            toolName: event.toolName,
            args: event.args,
            startedAt: new Date().toISOString(),
            startedMs: Date.now(),
          });
        }
        if (event.type === 'tool_end') {
          const draft = pendingToolCalls.get(event.toolCallId);
          const endedAt = new Date().toISOString();
          const endedMs = Date.now();
          persistedToolCalls.push({
            id: `tool_${runId}_${event.toolCallId}`,
            runId,
            sessionId,
            workspaceId: request.params.id,
            toolCallId: event.toolCallId,
            toolName: event.toolName,
            args: draft?.args ?? null,
            result: event.result,
            details: event.details,
            isError: event.isError,
            startedAt: draft?.startedAt ?? endedAt,
            endedAt,
            durationMs: draft ? Math.max(0, endedMs - draft.startedMs) : 0,
          });
          pendingToolCalls.delete(event.toolCallId);
        }
        if (event.type === 'error') {
          runStatus = 'failed';
          runErrorMessage = event.message;
        }
        try {
          reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
        } catch (writeError) {
          request.log.warn({ writeError }, 'agent stream write failed');
        }
      };

      let credentials: ReturnType<typeof getActiveAgentCredentials> | null = null;
      let decision: OrchestratorDecision | null = null;
      try {
        credentials = getActiveAgentCredentials();

        try {
          decision = buildInterceptedDecision(request.params.id, message, { isWriting });
          if (!decision.constraintsPassed) {
            request.log.info(
              { mode: decision.mode, reason: decision.constraintsReason },
              'orchestrator constraints blocked active suggestion',
            );
          }
          if (decision.reason.includes('前置拦截器')) {
            request.log.info(
              { mode: decision.mode, reason: decision.reason },
              'orchestrator pre-interceptor adjusted mode',
            );
          }
        } catch (decisionError) {
          request.log.warn({ decisionError }, 'orchestrator decision failed, fallback to mirror');
        }
      } catch (error) {
        send({ type: 'error', message: error instanceof Error ? error.message : 'Agent init failed.' });
        reply.raw.end();
        return;
      }

      if (!credentials) {
        reply.raw.end();
        return;
      }

      if (decision) {
        send({
          type: 'mode_update',
          mode: decision.mode,
          reason: decision.reason,
          suggestedAction: decision.suggestedAction,
        });

        if (decision.constraintsPassed && decision.mode !== 'mirror' && decision.activeProposals.length > 0) {
          try {
            recordSuggestionSent(request.params.id, decision.mode, decision.activeProposals);
          } catch (recordError) {
            request.log.warn({ recordError }, 'record suggestion sent failed');
          }
        }
      }

      const intent = classifyUserIntent(message);
      if (intent !== 'neutral') {
        request.log.info({ intent }, 'orchestrator intent classified');
      }

      send({
        type: 'session_info',
        provider: credentials.provider,
        model: credentials.model,
      });

      const prefetchContext = buildPrefetchContext(request.params.id, message);
      const effectiveMessage = prefetchContext
        ? `${prefetchContext}\n\n用户问题：${message}`
        : message;

      const session = startOrchestratorSession(
        {
          workspaceId: request.params.id,
          message: effectiveMessage,
          intent,
          decision,
          credentials: {
            provider: credentials.provider,
            model: credentials.model,
            apiKey: credentials.apiKey,
            baseUrl: credentials.baseUrl,
          },
          isWriting,
          priorMessages: priorMessages ?? undefined,
        },
        {
          onEvent: send,
          isWritable: () => !reply.raw.writableEnded,
          onStreamIntercept: ({ mode, reason }) => {
            request.log.info({ mode, reason }, 'stream interceptor adjusted mode mid-stream');
          },
          onWarn: (info, warnMessage) => {
            request.log.warn(info, warnMessage);
          },
          onSessionPersist: (info) => {
            const endedAt = new Date().toISOString();
            try {
              persistAgentChatTurn({
                session: {
                  sessionId: info.sessionId,
                  workspaceId: info.workspaceId,
                  title: deriveAgentChatSessionTitle(message),
                  messageCount: info.messages.length,
                  lastUsedAt: new Date(info.lastUsedAt).toISOString(),
                  createdAt: runStartedAt,
                  updatedAt: endedAt,
                  provider: credentials.provider,
                  model: credentials.model,
                },
                rawMessages: info.messages,
                run: {
                  id: runId,
                  sessionId: info.sessionId,
                  workspaceId: info.workspaceId,
                  provider: credentials.provider,
                  model: credentials.model,
                  inputTokens: tokenStats.inputTokens,
                  outputTokens: tokenStats.outputTokens,
                  cacheReadTokens: null,
                  cacheWriteTokens: null,
                  costUsd: tokenStats.costUsd,
                  durationMs: Date.now() - runStartMs,
                  status: runStatus,
                  errorMessage: runErrorMessage,
                  startedAt: runStartedAt,
                  endedAt,
                  toolCallCount: persistedToolCalls.length,
                },
                toolCalls: persistedToolCalls,
              });
            } catch (persistError) {
              request.log.warn({ persistError, sessionId: info.sessionId }, 'agent chat persistence failed');
            }
          },
        },
        sessionId,
      );

      ctx?.activeAgents.set(sessionId, session);

      reply.raw.on('close', () => {
        if (!reply.raw.writableEnded) {
          runStatus = 'aborted';
          runErrorMessage = 'Client connection closed before stream completed.';
          session.abort();
        }
      });

      try {
        await session.done;
      } finally {
        clearTimeout(idleTimer);
        ctx?.activeAgents.delete(sessionId);
        reply.raw.end();
      }
    },
  );

  app.post<{ Params: { id: string }; Body: { sessionId?: string } }>(
    '/api/workspaces/:id/agent/abort',
    async (request, reply) => {
      const sessionId = typeof request.body?.sessionId === 'string' ? request.body.sessionId : '';
      if (!sessionId) {
        return reply.code(400).send({ error: 'sessionId is required.' });
      }
      if (!SESSION_ID_PATTERN.test(sessionId)) {
        return reply.code(400).send({ error: 'Invalid sessionId format.' });
      }
      const session = ctx?.activeAgents.get(sessionId);
      if (!session) {
        return reply.code(404).send({ error: 'Session not found or already ended.' });
      }
      try {
        session.abort();
      } catch (error) {
        request.log.warn({ error, sessionId }, 'agent abort failed');
      }
      return reply.send({ ok: true });
    },
  );

  app.get<{ Params: { id: string } }>(
    '/api/workspaces/:id/agent/sessions',
    async (request) => {
      const sessions = listAgentChatSessions(request.params.id);
      return { sessions };
    },
  );

  app.get<{ Params: { id: string; sessionId: string } }>(
    '/api/workspaces/:id/agent/sessions/:sessionId',
    async (request, reply) => {
      const detail = getAgentChatSession(request.params.sessionId, request.params.id);
      if (!detail) {
        return reply.code(404).send({ error: 'Session not found.' });
      }
      return detail;
    },
  );

  app.patch<{ Params: { id: string; sessionId: string }; Body: { title?: string } }>(
    '/api/workspaces/:id/agent/sessions/:sessionId',
    async (request, reply) => {
      const title = typeof request.body?.title === 'string' ? request.body.title : '';
      const ok = renameAgentChatSession(request.params.sessionId, request.params.id, title);
      if (!ok) {
        return reply.code(404).send({ error: 'Session not found or title empty.' });
      }
      return { ok: true };
    },
  );

  app.delete<{ Params: { id: string; sessionId: string } }>(
    '/api/workspaces/:id/agent/sessions/:sessionId',
    async (request, reply) => {
      const ok = deleteAgentChatSession(request.params.sessionId, request.params.id);
      if (!ok) {
        return reply.code(404).send({ error: 'Session not found.' });
      }
      return { ok: true };
    },
  );
}
