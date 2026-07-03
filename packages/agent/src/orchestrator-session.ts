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
import type { AgentStreamEvent, OrchestratorDecision, ProposedOperation } from '@zhijing/shared';
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
  /** 用户自定义标题；未设置时按首条 user 消息文本动态生成 */
  title?: string;
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
 * sessionStore 总容量上限，防止攻击者快速创建大量会话导致内存膨胀。
 * 超过时按 lastUsedAt 升序清理最旧会话。
 */
const SESSION_MAX_COUNT = 50;

/**
 * 会话默认标题最大长度（字符），超过时尾部省略号。
 */
const SESSION_TITLE_MAX_LENGTH = 40;

/**
 * 会话默认标题（找不到 user 消息时的兜底文案）。
 */
const SESSION_DEFAULT_TITLE = '未命名会话';

/**
 * 从单条 AgentMessage 中提取纯文本内容。
 * 兼容 string content 与 TextContent[] 两种结构。
 * 用结构化类型访问绕开 AgentMessage 联合类型 narrow 限制
 * （联合中包含无 content 字段的自定义消息类型）。
 *
 * @param message - Agent 消息
 * @returns 纯文本；无法提取时返回空串
 * @author fxbin
 */
function extractAgentMessageText(message: AgentMessage): string {
  const msg = message as { content?: unknown };
  if (typeof msg.content === 'string') return msg.content;
  if (Array.isArray(msg.content)) {
    const parts: string[] = [];
    for (const part of msg.content) {
      if (part && typeof part === 'object' && part.type === 'text' && typeof part.text === 'string') {
        parts.push(part.text);
      }
    }
    return parts.join('');
  }
  return '';
}

/**
 * 判断 AgentMessage 是否为 user 角色。
 * 用结构化类型访问绕开联合类型 narrow 限制。
 *
 * @param message - Agent 消息
 * @returns 是否为 user 消息
 * @author fxbin
 */
function isUserMessage(message: AgentMessage): boolean {
  return (message as { role?: string }).role === 'user';
}

/**
 * 按会话 messages 推导默认标题：取首条 user 消息文本，截断到 SESSION_TITLE_MAX_LENGTH。
 * 找不到 user 消息时回退为 SESSION_DEFAULT_TITLE。
 *
 * @param messages - 会话累积消息
 * @returns 默认标题
 * @author fxbin
 */
function deriveSessionTitle(messages: AgentMessage[]): string {
  for (const msg of messages) {
    if (isUserMessage(msg)) {
      const text = extractAgentMessageText(msg).trim();
      if (text) {
        return text.length > SESSION_TITLE_MAX_LENGTH
          ? `${text.slice(0, SESSION_TITLE_MAX_LENGTH)}…`
          : text;
      }
    }
  }
  return SESSION_DEFAULT_TITLE;
}

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
  if (sessionStore.size > SESSION_MAX_COUNT) {
    const sorted = Array.from(sessionStore.entries())
      .sort((a, b) => a[1].lastUsedAt - b[1].lastUsedAt);
    const toRemove = sorted.length - SESSION_MAX_COUNT;
    for (let i = 0; i < toRemove; i += 1) {
      sessionStore.delete(sorted[i][0]);
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

    const supportsRoleOverride = credentials.provider === getDefaultPiProvider();
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
          const batch = extractProposalBatchFromText(wire.text);
          if (batch) {
            callbacks.onEvent({
              type: 'proposal_batch',
              batchId: batch.batchId,
              proposals: batch.proposals,
            });
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
      const supportsProbeRoleOverride = credentials.provider === getDefaultPiProvider();
      const probeOptions: Parameters<typeof createRoleBasedAgent>[1] = {
        role: 'probe',
        apiKey: credentials.apiKey,
      };
      if (!supportsProbeRoleOverride) {
        probeOptions.provider = credentials.provider;
        probeOptions.modelId = credentials.model;
      }
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
  /** 会话标题；用户未自定义时按首条 user 消息文本生成 */
  title: string;
}

/**
 * 会话详情（包含完整 messages，用于切换会话时回填前端 chatMessages）。
 */
export interface AgentSessionDetail extends AgentSessionInfo {
  /** 完整消息列表（AgentMessage[] 原样返回，由前端转换渲染） */
  messages: AgentMessage[];
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
    if (isUserMessage(messages[i])) {
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
      title: record.title ?? deriveSessionTitle(record.messages),
    });
  }
  list.sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt));
  return list;
}

/**
 * 获取指定会话的详情（含完整 messages）。
 * 用于前端切换会话时回填 chatMessages 渲染。
 *
 * @param sessionId - 会话 id
 * @param workspaceId - 工作区 id（必须匹配）
 * @returns 会话详情；sessionId 不存在或 workspaceId 不匹配时返回 null
 * @author fxbin
 */
export function getAgentSessionMessages(
  sessionId: string,
  workspaceId: string,
): AgentSessionDetail | null {
  if (!sessionId) return null;
  const record = sessionStore.get(sessionId);
  if (!record || record.workspaceId !== workspaceId) return null;
  return {
    sessionId,
    workspaceId: record.workspaceId,
    messageCount: record.messages.length,
    lastUsedAt: new Date(record.lastUsedAt).toISOString(),
    title: record.title ?? deriveSessionTitle(record.messages),
    messages: record.messages,
  };
}

/**
 * 重命名指定会话。
 * 标题去空白后非空才写入；空字符串视为取消重命名，返回 false。
 *
 * @param sessionId - 会话 id
 * @param workspaceId - 工作区 id（必须匹配）
 * @param title - 新标题
 * @returns 是否重命名成功（sessionId 不存在 / workspaceId 不匹配 / 标题为空时返回 false）
 * @author fxbin
 */
export function renameAgentSession(
  sessionId: string,
  workspaceId: string,
  title: string,
): boolean {
  if (!sessionId) return false;
  const record = sessionStore.get(sessionId);
  if (!record || record.workspaceId !== workspaceId) return false;
  const trimmed = (title ?? '').trim();
  if (!trimmed) return false;
  record.title = trimmed;
  record.lastUsedAt = Date.now();
  return true;
}

/**
 * 删除指定会话（带 workspaceId 校验），避免跨工作区误删。
 *
 * @param sessionId - 会话 id
 * @param workspaceId - 工作区 id（必须匹配）
 * @returns 是否删除成功（sessionId 不存在或 workspaceId 不匹配时返回 false）
 * @author fxbin
 */
export function deleteAgentSession(
  sessionId: string,
  workspaceId: string,
): boolean {
  if (!sessionId) return false;
  const record = sessionStore.get(sessionId);
  if (!record || record.workspaceId !== workspaceId) return false;
  sessionStore.delete(sessionId);
  return true;
}

/**
 * proposal-batch 代码块的正则匹配模式。
 * 匹配形如 ```proposal-batch\n{...}\n``` 的 fenced code block。
 */
const PROPOSAL_BATCH_BLOCK_PATTERN = /```proposal-batch\s*\n([\s\S]*?)\n```/;

/**
 * proposal-batch 块中合法的 op 值集合，用于过滤非法操作类型。
 */
const PROPOSAL_OP_WHITELIST = new Set<ProposedOperation['op']>([
  'create_card',
  'edit_card',
  'archive_card',
  'unarchive_card',
  'archive_material',
]);

/**
 * 从 Agent 最终响应文本中提取 proposal-batch JSON 块。
 *
 * Agent 在 systemPrompt 指示下可在回答末尾追加 ```proposal-batch 代码块，
 * 本函数解析该 JSON 块为结构化 ProposedOperation[]，下发到前端
 * 渲染为 apply diff 卡片，由用户确认后落库。
 *
 * 容错策略：
 * - 无 proposal-batch 块时返回 null（常规问答不附带 proposal）
 * - JSON 解析失败时返回 null，不影响主对话流
 * - proposals 数组过滤掉 op 非法或缺少必填字段的项
 * - 过滤后为空数组时返回 null
 *
 * @param text - Agent 最终响应文本
 * @returns 提取出的 batch；无合法 proposal 时返回 null
 * @author fxbin
 */
function extractProposalBatchFromText(
  text: string,
): { batchId: string; proposals: ProposedOperation[] } | null {
  if (typeof text !== 'string' || text.length === 0) return null;
  const match = PROPOSAL_BATCH_BLOCK_PATTERN.exec(text);
  if (!match) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(match[1]);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const rawProposals = (parsed as { proposals?: unknown }).proposals;
  if (!Array.isArray(rawProposals) || rawProposals.length === 0) return null;
  const proposals: ProposedOperation[] = [];
  for (const item of rawProposals) {
    if (!item || typeof item !== 'object') continue;
    const candidate = item as { op?: unknown };
    if (typeof candidate.op !== 'string' || !PROPOSAL_OP_WHITELIST.has(candidate.op as ProposedOperation['op'])) {
      continue;
    }
    proposals.push(sanitizeProposedOperation(candidate as ProposedOperation));
  }
  if (proposals.length === 0) return null;
  const batchId = typeof (parsed as { batchId?: unknown }).batchId === 'string'
    ? (parsed as { batchId: string }).batchId
    : `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return { batchId, proposals };
}

/**
 * 清洗单条 ProposedOperation，剔除未通过类型守卫的字段。
 *
 * @param operation - 原始对象（op 字段已通过白名单校验）
 * @returns 清洗后的 ProposedOperation
 * @author fxbin
 */
function sanitizeProposedOperation(operation: ProposedOperation): ProposedOperation {
  switch (operation.op) {
    case 'create_card': {
      return {
        op: 'create_card',
        type: operation.type,
        title: typeof operation.title === 'string' ? operation.title : '',
        body: typeof operation.body === 'string' ? operation.body : '',
        materialId: typeof operation.materialId === 'string' ? operation.materialId : undefined,
        rationale: typeof operation.rationale === 'string' ? operation.rationale : undefined,
      };
    }
    case 'edit_card': {
      return {
        op: 'edit_card',
        cardId: operation.cardId,
        title: typeof operation.title === 'string' ? operation.title : undefined,
        body: typeof operation.body === 'string' ? operation.body : undefined,
        type: operation.type,
        rationale: typeof operation.rationale === 'string' ? operation.rationale : undefined,
      };
    }
    case 'archive_card':
    case 'unarchive_card': {
      return {
        op: operation.op,
        cardId: operation.cardId,
        rationale: typeof operation.rationale === 'string' ? operation.rationale : undefined,
      };
    }
    case 'archive_material': {
      return {
        op: 'archive_material',
        materialId: operation.materialId,
        rationale: typeof operation.rationale === 'string' ? operation.rationale : undefined,
      };
    }
    default: {
      return operation;
    }
  }
}
