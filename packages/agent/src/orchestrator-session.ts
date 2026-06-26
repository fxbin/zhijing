/**
 * 编排会话运行时（P1.3）。
 *
 * 收敛 api 层 /agent/stream 路由中的编排逻辑：主 Agent 装配、事件订阅转发、
 * 流中拦截、辅 probe Agent 触发与 aux_* 事件下发，统一暴露
 * startOrchestratorSession 入口，让 api 层回归薄路由。
 *
 * 单独成文件以避免与 orchestrator-integration.ts 形成循环依赖
 * （orchestrator-integration 依赖 multi-agent-orchestrator 的角色配置，
 *  本模块反向依赖 orchestrator-integration 的装配函数）。
 *
 * @module orchestrator-session
 * @author fxbin
 */

import type { KnownProvider } from '@earendil-works/pi-ai';
import { Agent } from '@earendil-works/pi-agent-core';
import type { AgentStreamEvent, OrchestratorDecision } from '@zhijing/shared';
import type { ToolCallSummary } from '@zhijing/core';
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
} from './multi-agent-orchestrator.js';

/**
 * 编排运行凭证。
 */
export interface OrchestratorCredentials {
  /** LLM provider 标识 */
  provider: KnownProvider;
  /** 模型 id */
  model: string;
  /** API key；与 WorkspaceAgentOptions 一致保持可选，由 agent-factory 兜底解析 */
  apiKey?: string;
}

/**
 * 编排运行上下文。
 *
 * 由 api 薄路由层组装：先调用 core 的 buildInterceptedDecision / classifyUserIntent
 * 得到决策与意图，再连同凭证一起传入编排层。
 */
export interface OrchestratorRunContext {
  /** 工作区 id */
  workspaceId: string;
  /** 用户消息原文 */
  message: string;
  /** 用户意图分类（来自 core/classifyUserIntent） */
  intent: string;
  /** 编排决策（来自 core/buildInterceptedDecision）；null 表示决策失败回退 mirror */
  decision: OrchestratorDecision | null;
  /** LLM 凭证 */
  credentials: OrchestratorCredentials;
  /** 是否写作模式（影响决策，预留字段） */
  isWriting: boolean;
}

/**
 * 编排运行回调。
 *
 * 由 api 薄路由层实现，编排层通过回调与 HTTP 层解耦，
 * 不直接接触 reply.raw / request.log 等 Fastify 对象。
 */
export interface OrchestratorRunCallbacks {
  /**
   * 发送 wire 事件到客户端。
   * 编排层所有 wire 事件（含 mode_update / aux_*）统一通过此回调下发。
   */
  onEvent: (event: AgentStreamEvent) => void;
  /**
   * 检查客户端连接是否仍可写。
   * 辅 Agent 启动前检查，避免客户端断开后无谓运行。
   */
  isWritable: () => boolean;
  /**
   * 流中拦截器触发时通知（api 层记录日志）。
   */
  onStreamIntercept?: (info: { mode: string; reason: string }) => void;
  /**
   * 编排过程警告日志。
   */
  onWarn: (info: unknown, message: string) => void;
}

/**
 * 编排会话句柄。
 *
 * 由 startOrchestratorSession 同步返回，供 api 层：
 * - 保存到 activeAgents Map，供 /agent/abort 端点调用 abort()
 * - await done 等待编排结束
 */
export interface OrchestratorSession {
  /**
   * 中断当前编排（主 Agent + 辅 Agent 同时 abort）。
   * 多次调用安全（内部幂等）。
   */
  abort(): void;
  /**
   * 编排完成时 resolve；异常在编排层内部已转 error 事件，不会 reject。
   * api 层 await 此 Promise 后执行 reply.raw.end()。
   */
  done: Promise<void>;
}

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
 * @returns 编排会话句柄；调用方应保存引用用于 abort，并 await session.done
 * @author fxbin
 */
export function startOrchestratorSession(
  ctx: OrchestratorRunContext,
  callbacks: OrchestratorRunCallbacks,
): OrchestratorSession {
  const { workspaceId, message, intent, decision, credentials } = ctx;

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
   */
  async function runMainAgent() {
    const agentOptions: WorkspaceAgentOptions = {
      provider: credentials.provider,
      modelId: credentials.model,
      apiKey: credentials.apiKey,
    };

    const supportsRoleOverride = credentials.provider === 'deepseek';
    const selectedRole = selectAgentRole(intent);
    const role = supportsRoleOverride ? selectedRole : undefined;
    if (selectedRole && !supportsRoleOverride) {
      callbacks.onWarn(
        { provider: credentials.provider },
        'role model override skipped: provider mismatch, fallback to user-configured model',
      );
    }

    mainAgent = decision
      ? createOrchestratedWorkspaceAgent(workspaceId, { ...agentOptions, decision, role })
      : createWorkspaceAgent(workspaceId, agentOptions);

    let currentDecision: OrchestratorDecision | null = decision;
    let turnToolCalls: ToolCallSummary[] = [];

    const unsubscribe = mainAgent.subscribe((event) => {
      const wireEvents = serializeAgentEvent(event);
      for (const wire of wireEvents) {
        callbacks.onEvent(wire);

        if (wire.type === 'tool_end') {
          turnToolCalls.push({
            toolName: wire.toolName,
            isError: wire.isError,
            resultText: wire.result,
          });
          mainToolCallCount += 1;
        }

        if (wire.type === 'message_end' && typeof wire.text === 'string') {
          mainAssistantText = wire.text;
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
      unsubscribe();
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
      probeAgent = createRoleBasedAgent(workspaceId, {
        role: 'probe',
        provider: credentials.provider,
        modelId: credentials.model,
        apiKey: credentials.apiKey,
      });
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
            probeText = wire.text;
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
