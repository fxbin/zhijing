/**
 * Agent 事件流与任务类型。
 *
 * 包含 Agent 流式事件的前端 wire 格式（跨层共享契约）
 * 与 Agent LLM 调用的任务类型分类。用于 Provider 路由引擎按任务类型选择 Provider/Model。
 *
 * @author fxbin
 */

import type { KnowledgeCitation } from './entity.js';
import type { ProposedOperation } from './proposal.js';

/**
 * Agent 事件流前端 wire 格式（紧凑版）。
 *
 * 跨层共享契约：api 层、agent 编排层、web 前端共用此类型。
 *
 * 设计原则：
 * - 仅保留前端渲染所需字段，剔除 partial / history 等大体积数据
 * - 文本以 delta 增量传输（message_delta），message_end 携带最终完整文本
 * - reasoning 以 delta 增量传输（reasoning_delta），前端折叠展示
 * - tool 保留 id/name/args/isError + result 文本摘要，前端可展开查看
 * - mode_update 在 agent_start 后立即下发，前端显示当前编排模式与理由
 * - role_update 在 agent_start 后立即下发，前端按角色显示能力边界 badge（如圆桌=单 Agent 模拟）
 * - aux_* 系列承载辅 Agent（probe）输出，前端渲染为「可能还想知道」折叠区
 * - proposal_batch 承载 Agent 提议的结构化操作（create/edit/archive 等），
 *   前端渲染为 apply diff 卡片，用户确认后调用既有原子端点落库
 *
 * @author fxbin
 */
export type AgentStreamEvent =
  | { type: 'session_info'; model: string; provider: string }
  | { type: 'agent_start' }
  | { type: 'agent_end' }
  | { type: 'turn_start' }
  | { type: 'turn_end' }
  | { type: 'message_start' }
  | { type: 'message_delta'; delta: string }
  | { type: 'reasoning_delta'; delta: string }
  | { type: 'message_end'; text: string; usage?: { inputTokens: number | null; outputTokens: number | null; costUsd: number | null }; citations?: KnowledgeCitation[] }
  | { type: 'tool_start'; toolCallId: string; toolName: string; args: unknown }
  | { type: 'tool_end'; toolCallId: string; toolName: string; isError: boolean; result: string; details?: unknown }
  | { type: 'mode_update'; mode: string; reason: string; suggestedAction: string }
  | { type: 'role_update'; role: string }
  | { type: 'aux_start' }
  | { type: 'aux_delta'; delta: string }
  | { type: 'aux_end'; text: string }
  | { type: 'proposal_batch'; batchId: string; proposals: ProposedOperation[]; fallback?: boolean }
  | { type: 'error'; message: string };

/**
 * Agent LLM 调用的任务类型分类。
 *
 * 用于 Provider 路由引擎按任务类型选择最优 Provider/Model 组合。
 * 前六项与 pi-runtime 的 StructuredGenerationRequest.task 对齐，
 * 后三项覆盖对话路径与辅助探查路径。
 *
 * @author fxbin
 */
export type AgentTaskType =
  | 'workspace_skeleton'
  | 'material_summary'
  | 'knowledge_cards'
  | 'question_answer'
  | 'entity_extraction'
  | 'socratic_questioning'
  | 'deep_research'
  | 'roundtable'
  | 'conversation'
  | 'auxiliary_probe'
  | 'recall_deep';

/**
 * AgentTaskType 合法值集合。
 *
 * 用于 API 层做白名单校验，拦截非法 taskType 查询参数。
 * 与 AgentTaskType 联合类型保持同步。
 *
 * @author fxbin
 */
export const AGENT_TASK_TYPE_VALUES: readonly AgentTaskType[] = [
  'workspace_skeleton',
  'material_summary',
  'knowledge_cards',
  'question_answer',
  'entity_extraction',
  'socratic_questioning',
  'deep_research',
  'roundtable',
  'conversation',
  'auxiliary_probe',
  'recall_deep',
];
