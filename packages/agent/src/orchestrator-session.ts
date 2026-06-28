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

import { randomUUID } from 'node:crypto';
import type { KnownProvider } from '@earendil-works/pi-ai';
import { Agent, type AgentMessage } from '@earendil-works/pi-agent-core';
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
 * 会话上下文累积条目：保存最近一轮 Agent 运行结束后的 messages 快照，
 * 供下一轮 startOrchestratorSession 复用，实现跨轮上下文累积。
 */
interface SessionRecord {
  /** 工作区 id；切换工作区时不应复用 */
  workspaceId: string;
  /** 最近一轮运行结束后从 agent.state.messages 提取的消息快照 */
  messages: AgentMessage[];
  /** 最近一次访问时间戳（毫秒），用于 idle 过期清理 */
  lastUsedAt: number;
}

/**
 * 会话级 Agent 状态存储：sessionId → SessionRecord。
 *
 * 设计要点：
 * - 仅缓存 messages 快照，不缓存 Agent 实例；每轮新建 Agent，
 *   通过 initialState.messages 注入历史，避免 Agent 内部状态管理的不可控副作用
 * - 主 Agent 复用历史 messages；辅 probe Agent 不复用（设计本意是临时盲区检测）
 * - idle TTL 30 分钟，过期自动清理
 */
const sessionStore = new Map<string, SessionRecord>();

/**
 * 会话 idle 过期时长（毫秒），30 分钟。
 */
const SESSION_IDLE_TTL_MS = 30 * 60 * 1000;

/**
 * 单会话最大保留消息条数，超过时按 FIFO 截断以控制上下文体积。
 */
const SESSION_MAX_MESSAGES = 100;

/**
 * 清理过期会话。在每次 startOrchestratorSession 入口调用，
 * 顺带清理所有 lastUsedAt 超过 TTL 的条目。
 */
function sweepExpiredSessions(): void {
  const now = Date.now();
  for (const [id, record] of sessionStore) {
    if (now - record.lastUsedAt > SESSION_IDLE_TTL_MS) {
      sessionStore.delete(id);
    }
  }
}

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
    : [];
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
    const agentOptions: WorkspaceAgentOptions = {
      provider: credentials.provider,
      modelId: credentials.model,
      apiKey: credentials.apiKey,
      messages: priorMessages,
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

/**
 * 会话基本信息（用于列表展示）。
 */
export interface AgentSessionInfo {
  /** 会话 id */
  sessionId: string;
  /** 工作区 id */
  workspaceId: string;
  /** 当前累积的消息条数 */
  messageCount: number;
  /** 最近一次访问时间（ISO 字符串） */
  lastUsedAt: string;
}

/**
 * 清除指定会话的上下文累积。
 * 已 abort / 不存在的 sessionId 静默处理，不抛错。
 *
 * @param sessionId - 会话 id
 * @author fxbin
 */
export function clearAgentSession(sessionId: string): void {
  if (!sessionId) return;
  sessionStore.delete(sessionId);
}

/**
 * 「重试上一条」的截断结果。
 */
export interface RetryTurnResult {
  /** 是否成功截断（sessionId 不存在 / workspaceId 不匹配 / 找不到 user 消息时为 false） */
  ok: boolean;
  /** 截断前的消息总数 */
  beforeCount: number;
  /** 截断后剩余的消息数 */
  remainingCount: number;
  /** 是否真的丢弃了 user 消息及其后续 */
  truncated: boolean;
}

/**
 * 截断会话到最后一条 user 消息之前，丢弃该 user 消息及其后续所有 assistant/toolResult。
 *
 * 用于「重试上一条」：调用方随后会带着相同 message 走 /agent/stream，
 * startOrchestratorSession 会读取此处截断后的 messages 作为 priorMessages，
 * prompt(message) 自动追加新 user 消息 → 等价于重答上一条。
 *
 * 静默失败场景（返回 ok=false，不阻断后续流程）：
 * - sessionId 为空
 * - sessionStore 中无对应记录
 * - workspaceId 与 sessionStore 中记录不匹配
 * - messages 中找不到任何 role="user" 的消息
 *
 * @param sessionId - 会话 id
 * @param workspaceId - 工作区 id（必须匹配 sessionStore 中的记录）
 * @returns 截断结果
 * @author fxbin
 */
export function truncateSessionForRetry(
  sessionId: string,
  workspaceId: string,
): RetryTurnResult {
  if (!sessionId) {
    return { ok: false, beforeCount: 0, remainingCount: 0, truncated: false };
  }
  const record = sessionStore.get(sessionId);
  if (!record || record.workspaceId !== workspaceId) {
    return { ok: false, beforeCount: 0, remainingCount: 0, truncated: false };
  }
  const messages = record.messages;
  let lastUserIndex = -1;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === 'user') {
      lastUserIndex = i;
      break;
    }
  }
  if (lastUserIndex < 0) {
    return { ok: false, beforeCount: messages.length, remainingCount: messages.length, truncated: false };
  }
  const remaining = messages.slice(0, lastUserIndex);
  record.messages = remaining;
  record.lastUsedAt = Date.now();
  return {
    ok: true,
    beforeCount: messages.length,
    remainingCount: remaining.length,
    truncated: true,
  };
}

/**
 * 列出当前缓存的会话信息。
 * 可选 workspaceId 过滤；返回按 lastUsedAt 倒序。
 *
 * @param workspaceId - 可选工作区 id 过滤
 * @returns 会话信息列表
 * @author fxbin
 */
export function listAgentSessions(workspaceId?: string): AgentSessionInfo[] {
  sweepExpiredSessions();
  const list: AgentSessionInfo[] = [];
  for (const [sessionId, record] of sessionStore) {
    if (workspaceId && record.workspaceId !== workspaceId) continue;
    list.push({
      sessionId,
      workspaceId: record.workspaceId,
      messageCount: record.messages.length,
      lastUsedAt: new Date(record.lastUsedAt).toISOString(),
    });
  }
  list.sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt));
  return list;
}
