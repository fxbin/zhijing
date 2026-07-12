/**
 * 对话（Chat）类型。
 *
 * 包含对话消息、Agent 对话消息记录、工具调用记录、运行记录、
 * 会话信息与会话详情，以及持久化对话轮次请求。
 *
 * @author fxbin
 */

import type { ProposedCard } from './proposal.js';

export interface ChatMessage {
  id: string;
  workspaceId?: string;
  question: string;
  answer: string;
  cardIds: string[];
  artifactId?: string;
  materialId?: string;
  createdAt: string;
  proposedCards?: ProposedCard[];
}

export type AgentChatMessageRole = 'user' | 'assistant' | 'tool' | 'system' | 'unknown';

export interface AgentChatMessageRecord {
  id: string;
  sessionId: string;
  workspaceId: string;
  role: AgentChatMessageRole;
  text: string;
  reasoning: string;
  raw: unknown;
  createdAt: string;
  sequence: number;
}

export interface AgentChatToolCallRecord {
  id: string;
  runId: string;
  sessionId: string;
  workspaceId: string;
  toolCallId: string;
  toolName: string;
  args: unknown;
  result: string;
  details?: unknown;
  isError: boolean;
  startedAt: string;
  endedAt: string;
  durationMs: number;
}

export interface AgentChatRunRecord {
  id: string;
  sessionId: string;
  workspaceId: string;
  provider: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  cacheReadTokens: number | null;
  cacheWriteTokens: number | null;
  costUsd: number | null;
  durationMs: number;
  status: 'completed' | 'failed' | 'aborted';
  errorMessage: string | null;
  startedAt: string;
  endedAt: string;
  toolCallCount: number;
}

export interface AgentChatSessionInfo {
  sessionId: string;
  workspaceId: string;
  title: string;
  messageCount: number;
  lastUsedAt: string;
  createdAt: string;
  updatedAt: string;
  provider?: string;
  model?: string;
  lastRun?: AgentChatRunRecord;
}

export interface AgentChatSessionDetail extends AgentChatSessionInfo {
  messages: unknown[];
  messageRecords: AgentChatMessageRecord[];
  runs: AgentChatRunRecord[];
  toolCalls: AgentChatToolCallRecord[];
}

export interface PersistAgentChatTurnRequest {
  session: AgentChatSessionInfo;
  rawMessages: unknown[];
  run: AgentChatRunRecord;
  toolCalls: AgentChatToolCallRecord[];
}
