/**
 * 用户记忆与决策日志类型。
 *
 * 包含跨工作区的用户记忆（偏好/画像/反馈）与 Agent 决策日志。
 * 落实"Agent memory must be visible, editable, and deletable by users"原则。
 *
 * @author fxbin
 */

import type { AgentTaskType } from './agent-stream.js';

/**
 * 用户记忆作用域。
 *
 * user_memory 表用于存储跨工作区的用户偏好与画像，
 * 现有表都带 workspace_id 无法表达"全局偏好"，故新增此表。
 *
 * - preference：用户显式表达的偏好（如深度、受众、风格）
 * - profile：用户画像（由 Agent 推断沉淀）
 * - feedback：用户对 Agent 输出的反馈（如"不要再说客套话"）
 *
 * @author fxbin
 */
export type UserMemoryScope = 'preference' | 'profile' | 'feedback';

/**
 * 用户记忆来源。
 *
 * - user_input：用户显式输入
 * - agent_inferred：Agent 推断沉淀（需用户可见可删）
 * - system_default：系统默认值
 *
 * @author fxbin
 */
export type UserMemorySource = 'user_input' | 'agent_inferred' | 'system_default';

/**
 * 用户记忆记录（跨工作区）。
 *
 * 落实"Agent memory must be visible, editable, and deletable by users"原则，
 * 所有用户记忆对用户可见、可编辑、可删除，避免黑盒信任问题。
 *
 * workspaceId 为空表示全局记忆；非空表示特定工作区记忆。
 *
 * @author fxbin
 */
export interface UserMemory {
  id: string;
  scope: UserMemoryScope;
  key: string;
  value: string;
  source: UserMemorySource;
  workspaceId?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 创建用户记忆请求。
 *
 * @author fxbin
 */
export interface CreateUserMemoryRequest {
  scope: UserMemoryScope;
  key: string;
  value: string;
  source?: UserMemorySource;
  workspaceId?: string;
}

/**
 * 更新用户记忆请求。
 *
 * @author fxbin
 */
export interface UpdateUserMemoryRequest {
  value?: string;
  scope?: UserMemoryScope;
}

/**
 * 决策日志类型。
 *
 * decision_log 表用于记录 Agent 的关键决策，强制带证据引用，
 * 落实"知识输出必须带证据"与"Agent memory 必须可见可删"原则。
 *
 * - route_choice：Provider 路由决策
 * - card_accept：用户采纳提议卡片
 * - card_reject：用户否决提议卡片
 * - mode_switch：编排 Agent 模式切换
 * - orchestrator：编排 Agent 其他决策
 *
 * @author fxbin
 */
export type DecisionLogKind = 'route_choice' | 'card_accept' | 'card_reject' | 'mode_switch' | 'orchestrator';

/**
 * 决策日志记录。
 *
 * evidenceCardIds 强制引用 cards.id 作为证据，即使为空也需声明，
 * 用于审计 Agent 决策的证据链可追溯性。
 *
 * @author fxbin
 */
export interface DecisionLog {
  id: string;
  kind: DecisionLogKind;
  workspaceId?: string;
  summary: string;
  reasoning: string;
  evidenceCardIds: string[];
  agentTaskType?: AgentTaskType;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

/**
 * 创建决策日志请求。
 *
 * @author fxbin
 */
export interface CreateDecisionLogRequest {
  kind: DecisionLogKind;
  workspaceId?: string;
  summary: string;
  reasoning: string;
  evidenceCardIds?: string[];
  agentTaskType?: AgentTaskType;
  metadata?: Record<string, unknown>;
}

/**
 * 用户记忆白名单值集合。
 *
 * 用于 API 层做白名单校验。
 *
 * @author fxbin
 */
export const USER_MEMORY_SCOPE_VALUES: readonly UserMemoryScope[] = ['preference', 'profile', 'feedback'];
export const USER_MEMORY_SOURCE_VALUES: readonly UserMemorySource[] = ['user_input', 'agent_inferred', 'system_default'];
export const DECISION_LOG_KIND_VALUES: readonly DecisionLogKind[] = [
  'route_choice',
  'card_accept',
  'card_reject',
  'mode_switch',
  'orchestrator',
];
