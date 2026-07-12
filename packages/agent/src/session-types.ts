/**
 * 编排会话相关接口类型定义。
 *
 * 集中 OrchestratorCredentials / OrchestratorRunContext / OrchestratorRunCallbacks /
 * OrchestratorSession 以及 AgentSessionInfo / AgentSessionDetail / RetryTurnResult
 * 等对外类型，供 orchestrator-session 实现、session-repository 操作、api 薄路由消费。
 *
 * @module session-types
 * @author fxbin
 */

import type { AgentMessage } from '@earendil-works/pi-agent-core';
import type { AgentStreamEvent, OrchestratorDecision } from '@zhijing/shared';

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
