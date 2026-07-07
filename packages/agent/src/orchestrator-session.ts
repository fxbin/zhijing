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
import { Agent, type AgentMessage } from '@earendil-works/pi-agent-core';
import type { AgentStreamEvent, CardType, KnowledgeCitation, OrchestratorDecision, ProposedOperation } from '@zhijing/shared';
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
 *
 * provider 放宽为 string，支持自定义 provider（如商汤 SenseNova 等 OpenAI 兼容端点）。
 * baseUrl 配合自定义 provider 使用，覆盖 SDK 内置默认端点地址。
 */
export interface OrchestratorCredentials {
  /** LLM provider 标识；可为 SDK 内置 KnownProvider 或自定义字符串 */
  provider: string;
  /** 模型 id */
  model: string;
  /** API key；与 WorkspaceAgentOptions 一致保持可选，由 agent-factory 兜底解析 */
  apiKey?: string;
  /** 自定义 base URL；用于 OpenAI 兼容的第三方端点 */
  baseUrl?: string;
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
  /** 从持久化存储恢复的历史消息；内存 sessionStore 未命中时使用 */
  priorMessages?: AgentMessage[];
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
   * 主 Agent 完整结束后回传最终消息快照。
   * API 层用于持久化到 SQLite，agent 层保持不直接依赖数据库。
   */
  onSessionPersist?: (info: { sessionId: string; workspaceId: string; messages: AgentMessage[]; lastUsedAt: number }) => void;
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
          const batch = extractProposalBatchFromText(wire.text) ?? extractPlainTextSuggestions(wire.text);
          const proposalStripped = stripProposalBatchBlock(wire.text);
          const { citations, text: citeStripped } = extractCitationsFromText(proposalStripped);
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
 * 全局匹配模式，用于从文本中移除所有 proposal-batch 代码块。
 *
 * 与 PROPOSAL_BATCH_BLOCK_PATTERN 的区别：前者仅匹配第一个（exec），
 * 此模式用 g flag 匹配所有出现，确保多块场景也能完全清除。
 */
const PROPOSAL_BATCH_BLOCK_GLOBAL_PATTERN = /```proposal-batch\s*\n[\s\S]*?\n```/g;

/**
 * 从展示文本中剥离所有 ```proposal-batch``` 代码块。
 *
 * 用途：Agent 回复中可能包含 proposal-batch JSON 块（供后端提取结构化提议），
 * 但该 JSON 不应展示给用户。本函数在转发 message_end 事件前调用，
 * 确保前端 renderMarkdown 只渲染正常 Markdown 文本，不出现原始 JSON。
 *
 * 剥离后清理多余空行，保持文本紧凑。
 *
 * @param text - Agent 原始响应文本
 * @returns 剥离 proposal-batch 块后的干净文本
 * @author fxbin
 */
function stripProposalBatchBlock(text: string): string {
  if (typeof text !== 'string' || text.length === 0) return text;
  const stripped = text.replace(PROPOSAL_BATCH_BLOCK_GLOBAL_PATTERN, '');
  return stripped.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * <cite> 标签全局正则：匹配所有 cardId 或 materialId 引用标记。
 *
 * 捕获组：
 * - group(1): cardId 属性值（可能为 undefined）
 * - group(2): materialId 属性值（可能为 undefined）
 * - group(3): 标签内标题文本
 */
const CITE_TAG_GLOBAL_PATTERN = /<cite\s+(?:cardId="([^"]*)"|materialId="([^"]*)")\s*>([^<]*)<\/cite>/g;

/**
 * 从展示文本中提取所有 <cite> 引用标记，生成 KnowledgeCitation 数组，
 * 并将正文中的 <cite> 标签替换为 [n] 占位符（前端渲染为可点击锚点）。
 *
 * 用途：Agent 在 systemPrompt 指示下用 <cite cardId="xxx">标题</cite> 标记
 * 引用的卡片/资料；本函数在转发 message_end 事件前调用，把结构化引用
 * 从正文中剥离为独立 citations 数组，前端用 SourceCitation 组件渲染为
 * 可交互卡片，正文中的 [n] 作为可点击锚点。
 *
 * 同一卡片多次引用时，每次出现都生成一条独立的 citation（id 加序号后缀），
 * 保证 [n] 锚点与 citations 数组一一对应。
 *
 * 容错策略：
 * - 无 <cite> 标签时返回 { citations: [], text }（原文本不变）
 * - cardId/materialId 都缺失时保留原文不做替换（降级为纯文本显示）
 *
 * @param text - Agent 原始响应文本
 * @returns 提取出的 citations 数组（可能为空）和剥离标记后的文本
 * @author fxbin
 */
function extractCitationsFromText(text: string): { citations: KnowledgeCitation[]; text: string } {
  if (typeof text !== 'string' || text.length === 0) {
  return { citations: [], text };
  }
  const citations: KnowledgeCitation[] = [];
  let citeIndex = 0;
  const replaced = text.replace(CITE_TAG_GLOBAL_PATTERN, (match, cardId, materialId, title) => {
  const trimmedTitle = typeof title === 'string' ? title.trim() : '';
  const hasCardId = typeof cardId === 'string' && cardId.length > 0;
  const hasMaterialId = typeof materialId === 'string' && materialId.length > 0;
  if (!hasCardId && !hasMaterialId) {
  return match;
  }
  citeIndex += 1;
  const kind: 'card' | 'material' = hasCardId ? 'card' : 'material';
  const idValue = hasCardId ? cardId : materialId;
  citations.push({
  id: `citation:${kind}:${idValue}:${citeIndex}`,
  kind,
  title: trimmedTitle || idValue,
  preview: '',
  ...(hasCardId ? { cardId } : {}),
  ...(hasMaterialId ? { materialId } : {}),
  });
  return `[${citeIndex}]`;
  });
  return { citations, text: replaced };
}

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

/**
 * 文字版「建议」行中识别的卡片类型关键词 → type 映射。
 *
 * 同时覆盖英文 type 名和中文关键词，提高启发式识别准确度。
 */
const PLAIN_SUGGESTION_TYPE_KEYWORDS: ReadonlyArray<{ readonly type: CardType; readonly keywords: readonly string[] }> = [
  { type: 'concept', keywords: ['concept', '概念'] },
  { type: 'method', keywords: ['method', '方法'] },
  { type: 'case', keywords: ['case', '案例'] },
  { type: 'question', keywords: ['question', '问题'] },
  { type: 'step', keywords: ['step', '步骤'] },
  { type: 'viewpoint', keywords: ['viewpoint', '观点'] },
];

/**
 * 去除 markdown 装饰前缀（#、*、-、>）与首尾空白，返回干净行内容。
 *
 * 用于让 heading 判断不受 markdown 语法干扰。
 *
 * @param line - 原始行文本
 * @returns 去除装饰后的净文本
 * @author fxbin
 */
function stripMarkdownDecorations(line: string): string {
  return line.replace(/^\s*[#*\->≥≤•·]+\s*/, '').trim();
}

/**
 * 建议卡片 heading 的行首编号标记正则。
 *
 * 匹配以下「行首」编号形式（去除 markdown 装饰后）：
 * - keycap emoji 数字：1️⃣ 2️⃣ …（数字 + 变体选择符 + 组合用包围符）
 * - 阿拉伯数字 + 分隔符：1. / 1、 / 1) / 1： / 1(空格)
 * - 带圈数字：①②…⑩
 * - 圈圈字母数字区：\u2460-\u2473
 * - 中文数字 + 分隔符：一、 / 二. / 三：
 *
 * 用于把 heading 判定约束在「以编号开头」的行，避免误抓正文中
 * 偶然出现「建议 + 数字」的普通段落（如寒暄、小节标题）。
 */
const SUGGESTION_HEADING_NUMBER_PATTERN = /^\s*(?:\d\uFE0F?\u20E3|\d[.、)）:：\s]|[①-⑩]|[\u2460-\u2473]|[一二三四五六七八九十]+[、.：:）)])/;

/**
 * markdown 水平分隔线正则：仅由 3 个及以上 `-` / `*` / `_` 组成的行。
 *
 * 用于在累积卡片正文时跳过分隔线，避免预览正文首尾出现孤立 `---` 噪声。
 */
const HORIZONTAL_RULE_PATTERN = /^(?:-{3,}|\*{3,}|_{3,})$/;

/**
 * 判断文本是否含明确的「卡片类型」信号。
 *
 * 中文需带「卡」后缀（概念卡/方法卡/案例卡/问题卡/观点卡/步骤卡/事实卡/通用卡），
 * 避免裸词「问题/方法/观点」误伤普通编号列表；英文沿用类型关键词。
 *
 * @param text - 已去除 markdown 装饰的行文本
 * @returns 是否含卡片类型信号
 * @author fxbin
 */
function hasCardTypeSignal(text: string): boolean {
  if (/(?:概念|方法|案例|问题|观点|步骤|事实|通用)卡/.test(text)) return true;
  if (/(?:概念|方法|案例|问题|观点|步骤|事实|通用)[：:]/.test(text)) return true;
  const lower = text.toLowerCase();
  for (const candidate of PLAIN_SUGGESTION_TYPE_KEYWORDS) {
    const hit = candidate.keywords.some((kw) => {
      if (/[\u4e00-\u9fff]/.test(kw)) return false;
      return lower.includes(kw.toLowerCase());
    });
    if (hit) return true;
  }
  return text.includes('卡片');
}

/**
 * 判断一行是否为「建议卡片」heading 行。
 *
 * 判断标准（两者必须同时满足）：
 * 1. 去除 markdown 装饰后，行首为编号标记（数字/keycap/带圈/中文数字 + 分隔符）；
 * 2. 行内含建议动词（建议/推荐/提议）或卡片类型信号（X卡 / concept / 卡片）。
 *
 * 这覆盖 LLM 常见输出：
 * - `### 1️⃣ 概念卡：「标题」`（编号 + 类型卡）
 * - `### 建议 1️⃣ — 建 concept 卡片：「标题」`（编号 + 建议 + concept）
 * - `1. 建议新建卡片「标题」`（编号 + 建议）
 *
 * 同时排除两类误判：
 * - 寒暄段「…为你提炼3个…附上建议的标题…」（数字不在行首 → 排除）
 * - 小节标题 `## 📇 建议新建的 3 张知识卡片`（行首是 emoji 非编号 → 排除）
 *
 * @param rawLine - 原始行文本
 * @returns 是否为建议 heading 行
 * @author fxbin
 */
function isSuggestionHeadingLine(rawLine: string): boolean {
  const stripped = stripMarkdownDecorations(rawLine);
  if (stripped.length === 0) return false;
  if (stripped.startsWith('```')) return false;
  if (!SUGGESTION_HEADING_NUMBER_PATTERN.test(stripped)) return false;
  const hasVerb = stripped.includes('建议') || stripped.includes('推荐') || stripped.includes('提议');
  return hasVerb || hasCardTypeSignal(stripped);
}

/**
 * 方括号类型标签正则：匹配行内的 `[concept]` / `[方法]` / `[method卡]` 等类型标记。
 *
 * LLM 常在 heading 里用方括号标注卡片类型（如 `① [concept] 命运礼物的价格`），
 * 提取标题时需要剥离这类标记，避免污染最终卡片标题。
 */
const BRACKET_TYPE_TAG_PATTERN = /\[[A-Za-z\u4e00-\u9fff]{1,12}卡?\]/g;

/**
 * 剥离标题行首的噪声前缀：编号标记、建议动词、方括号类型标签、残余分隔符。
 *
 * 采用循环剥离策略（直到文本稳定），可一次性清理多种前缀的组合，例如：
 * - `① [concept] 命运礼物的价格` → `命运礼物的价格`
 * - `1. 建议新建卡片「标题」` → `「标题」`（引号由上层处理）
 * - `### 2️⃣ [method] 时间管理` → `时间管理`
 *
 * @param text - 已去除 markdown 装饰的 heading 文本
 * @returns 剥离行首噪声后的文本
 * @author fxbin
 */
function stripLeadingNoise(text: string): string {
  let prev = '';
  let cur = text;
  let guard = 0;
  while (cur !== prev && guard < 8) {
    prev = cur;
    cur = cur.replace(/^\s*[①②③④⑤⑥⑦⑧⑨⑩\u2460-\u2473]\s*/, '');
    cur = cur.replace(/^\s*\d\uFE0F?\u20E3\s*/, '');
    cur = cur.replace(/^\s*\d[.、)）：:]\s*/, '');
    cur = cur.replace(/^\s*[一二三四五六七八九十]+[、.：）)]\s*/, '');
    cur = cur.replace(/^\s*(?:建议|推荐|提议|新建|建卡)\s*/, '');
    cur = cur.replace(/^\s*(?:concept|method|case|viewpoint|step|question|fact|general)\b\s*/i, '');
    cur = cur.replace(BRACKET_TYPE_TAG_PATTERN, '');
    cur = cur.replace(/^\s*[：:、\-—–.)）]\s*/, '');
    guard += 1;
  }
  return cur.trim();
}

/**
 * 标题收尾清理：剥离行首噪声、去除星号与残余引号、截断到 80 字。
 *
 * @param text - 待清理的标题片段
 * @returns 清理后的标题（最多 80 字）
 * @author fxbin
 */
function finalizeTitle(text: string): string {
  const withoutStars = text.replace(/\*/g, '');
  return stripLeadingNoise(withoutStars).slice(0, 80);
}

/**
 * 从建议 heading 行中提取卡片标题。
 *
 * 提取优先级：
 * 1. 粗体 `**...**` 包裹的标题（LLM 常用 `**「标题」——副标题**` 或 `**标题——副标题**`）：
 *    取首个粗体段，按破折号（——/—/--）切前半作为标题，并去除引号与星号；
 * 2. 引号包裹内容（「」『』""''）——适用于无粗体的 `概念卡：「标题」`；
 * 3. 「卡片」/「资料」后面的文本；
 * 4. 冒号后面的文本（去除星号）；
 * 5. 上述均未命中时，剥离行首编号/建议动词/方括号类型标签后的整行余文。
 *
 * 所有返回值统一经 finalizeTitle 收尾，确保标题不含 `①`、`[concept]`、`*` 等噪声。
 *
 * @param rawLine - heading 行原始文本
 * @returns 提取出的标题（2-80 字）；提取失败返回空串
 * @author fxbin
 */
function extractTitleFromHeading(rawLine: string): string {
  const stripped = stripMarkdownDecorations(rawLine);
  const bold = stripped.match(/\*\*([\s\S]+?)\*\*/);
  if (bold && bold[1]) {
    const inner = bold[1];
    const headPart = inner.split(/——|—|--/)[0] ?? inner;
    const cleaned = headPart.replace(/[「」『』“”‘’""'']/g, '').trim();
    if (cleaned.length >= 2) return cleaned.slice(0, 80);
  }
  const quoted = stripped.match(/[「『“”‘’""'']([^「」『』“”‘’""''\n]{2,80})[」’”’""'']/);
  if (quoted && quoted[1]) return quoted[1].trim();
  const afterCard = stripped.match(/(?:卡片|资料)[：:是为]?\s*(.+)/);
  if (afterCard && afterCard[1]) return finalizeTitle(afterCard[1]);
  const afterColon = stripped.match(/[：:]\s*(.+)/);
  if (afterColon && afterColon[1]) return finalizeTitle(afterColon[1]);
  return finalizeTitle(stripped);
}

/**
 * 从建议 heading 行中识别卡片类型。
 *
 * @param rawLine - heading 行原始文本
 * @returns 匹配到的 CardType；无匹配时默认 concept
 * @author fxbin
 */
function detectCardTypeFromHeading(rawLine: string): CardType {
  const lower = rawLine.toLowerCase();
  for (const candidate of PLAIN_SUGGESTION_TYPE_KEYWORDS) {
    if (candidate.keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      return candidate.type;
    }
  }
  return 'concept';
}

/**
 * 从 Agent 最终响应文本中提取文字版「建议」段落，转换为 proposal-batch 结构。
 *
 * 兜底场景：LLM 未输出 ```proposal-batch``` 块，但正文中含
 * 「### 建议 1️⃣」「建议一：」「1. 建议新建卡片」等模式时，
 * 逐段提取卡片标题与正文，转 create_card 提议，由用户在前端确认。
 *
 * 设计权衡：
 * - 启发式提取准确性有限，宁可少识别一些（避免误转换），不能误把正常段落当建议；
 * - 仅提取 create_card 类型；edit/archive 等操作需要明确 cardId，文字描述中拿不到，跳过；
 * - 提取出的 title/body 较粗糙，用户在前端可编辑后再采纳。
 *
 * @param text - Agent 最终响应文本
 * @returns 兜底提取的 batch；无识别命中时返回 null
 * @author fxbin
 */
function extractPlainTextSuggestions(
  text: string,
): { batchId: string; proposals: ProposedOperation[] } | null {
  if (typeof text !== 'string' || text.length === 0) return null;
  const lines = text.split(/\r?\n/);
  const proposals: ProposedOperation[] = [];
  let currentTitle = '';
  let currentBody = '';
  let currentType: CardType = 'concept';
  let inSuggestion = false;

  const flush = () => {
    if (!inSuggestion) return;
    const title = currentTitle.trim();
    if (title.length >= 2 && title.length <= 80) {
      proposals.push({
        op: 'create_card',
        type: currentType,
        title,
        body: currentBody.trim(),
        rationale: '由文字描述的「建议」自动转换，请确认内容后采纳。',
      });
    }
    currentTitle = '';
    currentBody = '';
    currentType = 'concept';
    inSuggestion = false;
  };

  for (const line of lines) {
    if (isSuggestionHeadingLine(line)) {
      flush();
      inSuggestion = true;
      currentTitle = extractTitleFromHeading(line);
      currentType = detectCardTypeFromHeading(line);
      continue;
    }
    if (inSuggestion) {
      const trimmed = line.trim();
      if (trimmed.length === 0) continue;
      if (HORIZONTAL_RULE_PATTERN.test(trimmed)) continue;
      if (currentBody.length < 300) {
        currentBody = currentBody.length === 0 ? trimmed : `${currentBody}\n${trimmed}`;
      }
    }
  }
  flush();
  if (proposals.length === 0) return null;
  return {
    batchId: `fallback_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    proposals,
  };
}
