/**
 * 编排会话运行时（P1.3）。
 *
 * 收敛 api 层 /agent/stream 路由中的编排逻辑：主 Agent 装配、事件订阅转发、
 * 流中拦截、辅 probe Agent 触发与 aux_* 事件下发，统一暴露
 * startOrchestratorSession 入口，让 api 层回归薄路由。
 *
 * 会话存储、proposal 解析、引用提取、纯文字建议提取已拆分至独立子模块，
 * 本文件仅保留主编排入口与主/辅 Agent 协调逻辑。
 *
 * @module orchestrator-session
 * @author fxbin
 */

import { randomUUID } from 'node:crypto';
import { Agent } from '@earendil-works/pi-agent-core';
import type { AgentStreamEvent, OrchestratorDecision } from '@zhijing/shared';
import type { ToolCallSummary } from '@zhijing/core';
import { getDefaultPiProvider } from '@zhijing/pi-runtime';
import { interceptInStream } from '@zhijing/core';
import { serializeAgentEvent } from './agent-event-serializer.js';
import { createWorkspaceAgent, type WorkspaceAgentOptions } from './agent-factory.js';
import { createOrchestratedWorkspaceAgent } from './orchestrator-integration.js';
import {
  selectAgentRole,
  createRoleBasedAgent,
  buildAuxiliaryProbePrompt,
  AUXILIARY_PROBE_MIN_TOOL_CALLS,
  AUXILIARY_PROBE_MAX_OUTPUT_LENGTH,
  AUXILIARY_PROBE_SYSTEM_PROMPT,
} from './multi-agent-orchestrator.js';
import { sessionStore, sweepExpiredSessions, SESSION_MAX_MESSAGES } from './session-store.js';
import type { OrchestratorRunContext, OrchestratorRunCallbacks, OrchestratorSession } from './session-types.js';
import { extractProposalBatchFromText, stripProposalBatchBlock } from './proposal-batch-parser.js';
import { extractCitationsFromText, populateKnownIdsFromToolResult, normalizeBareCardIds } from './citation-extractor.js';
import { extractPlainTextSuggestions } from './plain-suggestion-extractor.js';

/**
 * 启动一次完整编排对话（主 Agent + 辅 probe Agent）。
 *
 * 职责收敛点（P1.3）：
 * - 主 Agent 装配（createOrchestratedWorkspaceAgent）
 * - 主 Agent 事件订阅 + 转发 + 状态累积（mainText/toolCount/turnToolCalls）
 * - 流中拦截器（interceptInStream）触发与 mode_update 下发
 * - 辅 probe Agent 触发决策（4 条件）
 * - 辅 Agent 装配 + 事件订阅 + aux_* 事件下发
 * - 主+辅 abort 统一管理
 * - 跨轮上下文累积：通过 sessionId 复用历史 messages
 *
 * 不负责（保留在 api 薄路由层）：
 * - HTTP 参数解析 / SSE header
 * - activeAgents Map 维护（api 层通过 session 引用管理）
 * - reply.raw 生命周期
 * - buildInterceptedDecision / classifyUserIntent 调用（api 层决策后传入 ctx）
 * - recordSuggestionSent 副作用（api 层在决策广播后调用）
 *
 * @param ctx - 编排运行上下文
 * @param callbacks - 编排运行回调
 * @param sessionId - 可选会话 id；传入且 workspaceId 匹配时复用历史 messages，
 *                    实现多轮上下文累积；省略时生成新 id 并从空对话开始
 * @returns 编排会话句柄；调用方应保存引用用于 abort，并 await session.done
 * @author fxbin
 */
export function startOrchestratorSession(
  ctx: OrchestratorRunContext,
  callbacks: OrchestratorRunCallbacks,
  sessionId?: string,
): OrchestratorSession {
  const { workspaceId, message, intent, decision, credentials } = ctx;

  sweepExpiredSessions();
  const sessionKey = sessionId ?? randomUUID();
  const existing = sessionStore.get(sessionKey);
  const priorMessages = existing && existing.workspaceId === workspaceId
    ? existing.messages
    : (ctx.priorMessages ?? []);
  if (existing) {
    existing.lastUsedAt = Date.now();
  }

  let mainAgent: Agent | null = null;
  let probeAgent: Agent | null = null;
  let aborted = false;
  let mainToolCallCount = 0;
  let mainAssistantText = '';

  const done = runMainAgent();

  return {
    abort() {
      if (aborted) return;
      aborted = true;
      try {
        mainAgent?.abort();
      } catch {
        // abort 失败不阻断清理
      }
      try {
        probeAgent?.abort();
      } catch {
        // 静默
      }
    },
    done,
  };

  /**
   * 主 Agent 编排：装配、订阅转发、prompt、流中拦截，完成后触发辅 probe。
   * 装配时注入 priorMessages 实现跨轮上下文累积；
   * 结束时把 agent.state.messages 存回 sessionStore 供下一轮复用。
   */
  async function runMainAgent() {
    const supportsRoleOverride = credentials.provider === getDefaultPiProvider();
    const selectedRole = selectAgentRole(intent);
    const knownCards = new Map<string, string>();
    const knownMaterials = new Map<string, string>();
    const agentOptions: WorkspaceAgentOptions = {
      provider: credentials.provider,
      modelId: credentials.model,
      apiKey: credentials.apiKey,
      baseUrl: credentials.baseUrl,
      messages: priorMessages,
    };
    const role = selectedRole;
    if (selectedRole && !supportsRoleOverride) {
      callbacks.onWarn(
        { provider: credentials.provider, role: selectedRole },
        'role model override skipped: provider mismatch, role prompt and taskType retained',
      );
    }

    mainAgent = decision
      ? createOrchestratedWorkspaceAgent(workspaceId, { ...agentOptions, decision, role })
      : createWorkspaceAgent(workspaceId, agentOptions);

    callbacks.onEvent({ type: 'role_update', role: selectedRole });

    let currentDecision: OrchestratorDecision | null = decision;
    let turnToolCalls: ToolCallSummary[] = [];

    const unsubscribe = mainAgent.subscribe((event) => {
      const wireEvents = serializeAgentEvent(event);
      for (const wire of wireEvents) {
        if (wire.type === 'message_end' && typeof wire.text === 'string') {
          mainAssistantText = wire.text;
          const structuredBatch = extractProposalBatchFromText(wire.text);
          const fallbackBatch = structuredBatch ? null : extractPlainTextSuggestions(wire.text);
          const batch = structuredBatch ?? fallbackBatch;
          const isFallback = !structuredBatch && fallbackBatch !== null;
          const proposalStripped = stripProposalBatchBlock(wire.text);
          const normalized = normalizeBareCardIds(proposalStripped, knownCards, knownMaterials);
          const { citations, text: citeStripped } = extractCitationsFromText(normalized);
          callbacks.onEvent({
            ...wire,
            text: citeStripped,
            ...(citations.length > 0 ? { citations } : {}),
          });
          if (batch) {
            callbacks.onEvent({
              type: 'proposal_batch',
              batchId: batch.batchId,
              proposals: batch.proposals,
              ...(isFallback ? { fallback: true } : {}),
            });
          }
          continue;
        }

        callbacks.onEvent(wire);

        if (wire.type === 'tool_end') {
          turnToolCalls.push({
            toolName: wire.toolName,
            isError: wire.isError,
            resultText: wire.result,
          });
          mainToolCallCount += 1;
          if (!wire.isError && typeof wire.result === 'string') {
            populateKnownIdsFromToolResult(wire.toolName, wire.result, knownCards, knownMaterials);
          }
        }

        if (wire.type === 'turn_end' && currentDecision && turnToolCalls.length > 0) {
          try {
            const intercepted = interceptInStream(workspaceId, turnToolCalls, currentDecision);
            if (intercepted.mode !== currentDecision.mode) {
              currentDecision = intercepted;
              callbacks.onEvent({
                type: 'mode_update',
                mode: intercepted.mode,
                reason: intercepted.reason,
                suggestedAction: intercepted.suggestedAction,
              });
              callbacks.onStreamIntercept?.({ mode: intercepted.mode, reason: intercepted.reason });
            }
          } catch (streamInterceptError) {
            callbacks.onWarn({ streamInterceptError }, 'stream interceptor failed');
          }
          turnToolCalls = [];
        }
      }
    });

    try {
      await mainAgent.prompt(message);
      await mainAgent.waitForIdle();
      await runAuxiliaryProbeIfNeeded();
    } catch (error) {
      callbacks.onEvent({ type: 'error', message: error instanceof Error ? error.message : 'Agent run failed.' });
    } finally {
      persistSessionMessages();
      unsubscribe();
    }
  }

  /**
   * 从主 Agent 提取最新 messages 存回 sessionStore。
   * 仅在主 Agent 完整结束时持久化；abort / 异常路径不写回，保留上一轮快照。
   * 超过 SESSION_MAX_MESSAGES 时按 FIFO 截断。
   */
  function persistSessionMessages() {
    if (!mainAgent || aborted) return;
    try {
      const nextMessages = mainAgent.state.messages;
      const trimmed = nextMessages.length > SESSION_MAX_MESSAGES
        ? nextMessages.slice(nextMessages.length - SESSION_MAX_MESSAGES)
        : nextMessages;
      sessionStore.set(sessionKey, {
        workspaceId,
        messages: trimmed,
        lastUsedAt: Date.now(),
      });
      callbacks.onSessionPersist?.({
        sessionId: sessionKey,
        workspaceId,
        messages: trimmed,
        lastUsedAt: Date.now(),
      });
    } catch {
      // state 读取失败不阻断流程，下一轮从空对话开始
    }
  }

  /**
   * 主 Agent 完成后，按条件异步启动辅 probe Agent 做盲区检测。
   *
   * 触发条件（全部满足）：
   * 1. 主 Agent 调过检索工具（mainToolCallCount >= AUXILIARY_PROBE_MIN_TOOL_CALLS）
   * 2. 主 Agent 回答非空（mainAssistantText 有内容）
   * 3. 用户意图不是 request_probe（用户已主动请求追问时，主 Agent 已是 probe 角色，无需辅 Agent）
   * 4. 客户端未断开（callbacks.isWritable() 为 true）
   *
   * 辅 Agent 输出通过 aux_start / aux_delta / aux_end 事件发送，
   * 前端渲染为「可能还想知道」折叠区。
   * 辅 Agent 失败不影响主流程，仅 onWarn + 发空 aux_end 兜底。
   */
  async function runAuxiliaryProbeIfNeeded() {
    const shouldRunProbe = mainToolCallCount >= AUXILIARY_PROBE_MIN_TOOL_CALLS
      && mainAssistantText.length > 0
      && intent !== 'request_probe'
      && callbacks.isWritable();
    if (!shouldRunProbe) return;

    try {
      const probeOptions: Parameters<typeof createRoleBasedAgent>[1] = {
        role: 'probe',
        provider: credentials.provider,
        modelId: credentials.model,
        apiKey: credentials.apiKey,
        baseUrl: credentials.baseUrl,
        systemPromptOverride: AUXILIARY_PROBE_SYSTEM_PROMPT,
      };
      probeAgent = createRoleBasedAgent(workspaceId, probeOptions);
      const probePrompt = buildAuxiliaryProbePrompt(message, mainAssistantText);
      let probeText = '';

      callbacks.onEvent({ type: 'aux_start' });

      const probeUnsubscribe = probeAgent.subscribe((probeEvent) => {
        const probeWires = serializeAgentEvent(probeEvent);
        for (const wire of probeWires) {
          if (wire.type === 'message_delta' && typeof wire.delta === 'string') {
            probeText += wire.delta;
            callbacks.onEvent({ type: 'aux_delta', delta: wire.delta });
          }
          if (wire.type === 'message_end' && typeof wire.text === 'string') {
            const { text: probeCleanText } = extractCitationsFromText(wire.text);
            probeText = probeCleanText;
          }
        }
      });

      try {
        await probeAgent.prompt(probePrompt);
        await probeAgent.waitForIdle();
        const finalText = probeText.length > AUXILIARY_PROBE_MAX_OUTPUT_LENGTH
          ? `${probeText.slice(0, AUXILIARY_PROBE_MAX_OUTPUT_LENGTH)}…`
          : probeText;
        callbacks.onEvent({ type: 'aux_end', text: finalText });
      } finally {
        probeUnsubscribe();
      }
    } catch (probeError) {
      callbacks.onWarn({ probeError }, 'auxiliary probe agent failed');
      callbacks.onEvent({ type: 'aux_end', text: '' });
    } finally {
      probeAgent = null;
    }
  }
}
