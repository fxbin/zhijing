/**
 * 工具调用结果意图识别与流中拦截模块。
 *
 * 职责：
 * - 基于 Agent 工具调用结果识别认知缺口
 * - 在 Agent 每轮 turn_end 后动态调整编排决策
 *
 * 与前置拦截器协同工作：前置拦截基于用户消息文本，
 * 流中拦截基于工具结果，两者互补。
 *
 * @module orchestrator/tool-result-intent
 * @author fxbin
 */

import type {
  AgentProposal,
  OrchestratorDecision,
  OrchestratorMode,
} from '@zhijing/shared';
import { buildSuggestedAction, filterActiveProposals } from './proposal-filter.js';
import type { UserIntent } from './user-intent.js';

/**
 * 流中工具调用结果摘要。
 *
 * P0.5 流中实时模式切换使用：Agent 每轮工具调用完成后，
 * 基于工具名称和结果文本做规则意图识别，动态调整编排模式。
 *
 * @author fxbin
 */
export interface ToolCallSummary {
  /** 工具名称（search_cards / search_materials / get_workspace_summary） */
  toolName: string;
  /** 工具是否返回错误 */
  isError: boolean;
  /** 工具结果文本摘要（已截断） */
  resultText: string;
}

/**
 * 空结果标识关键词，用于判断检索工具是否返回了有效内容。
 *
 * 当工具结果文本包含这些关键词时，判定为空结果（认知缺口信号）。
 */
const EMPTY_RESULT_INDICATORS: readonly string[] = [
  '没有找到', '无结果', '未找到', 'no results', '[]', '暂无',
];

/**
 * 基于工具调用结果做流中意图识别。
 *
 * P0.5 核心逻辑：在 Agent 多轮工具调用过程中（turn_end 后），
 * 基于工具结果识别认知缺口，动态调整编排模式。
 *
 * 识别规则：
 * - search_cards / search_materials 返回空 → request_probe（有盲区，适合催化剂追问）
 * - get_workspace_summary 返回卡片数 > 阈值 → request_advice（可建议复习，适合导航员）
 * - 默认 → neutral（不调整）
 *
 * @param toolCalls - 本轮所有工具调用结果摘要
 * @returns 意图分类标签
 * @author fxbin
 */
export function classifyToolResultIntent(toolCalls: ToolCallSummary[]): UserIntent {
  if (toolCalls.length === 0) return 'neutral';

  for (const call of toolCalls) {
    if (call.isError) continue;
    const lowerText = call.resultText.toLowerCase();
    const isEmpty = EMPTY_RESULT_INDICATORS.some((indicator) => lowerText.includes(indicator.toLowerCase()))
      || call.resultText.trim().length === 0;

    if ((call.toolName === 'search_cards' || call.toolName === 'search_materials') && isEmpty) {
      return 'request_probe';
    }
  }

  return 'neutral';
}

/**
 * 流中拦截器：基于工具调用结果动态调整编排决策。
 *
 * P0.5 入口：在 Agent 每轮 turn_end 后调用，
 * 基于本轮工具结果做意图识别，若模式变化则发送 mode_update 通知前端。
 *
 * 与 preInterceptUserMessage 的差异：
 * - preInterceptUserMessage 在 Agent 处理消息前执行（基于用户消息文本）
 * - preInterceptInStream 在 Agent 工具调用后执行（基于工具结果）
 * - 流中拦截产出的决策是「建议」，当前轮 Agent 已按原 systemPrompt 运行，
 *   mode_update 通知前端展示新模式，下一轮对话时前置拦截器会使用更新后的上下文
 *
 * 为何不评估 isWriting 约束：
 * 流中拦截只调整 mode（mirror→catalyst/navigator）并下发 mode_update 事件，
 * 不会立即下发主动提议（active_suggestion_sent），因此不会增加用户的打断频率。
 * 真正的主动提议下发发生在前置拦截路径（buildInterceptedDecision）中，
 * 由 evaluateConstraints 评估 isWriting 约束。故本函数无需接收 isWriting 参数。
 *
 * @param toolCalls - 本轮所有工具调用结果摘要
 * @param currentDecision - 当前生效的编排决策
 * @param allProposals - 当前可用的全量 Agent 提议列表
 * @returns 拦截后的决策（可能是原决策，也可能是调整后的新决策）
 * @author fxbin
 */
export function preInterceptInStream(
  toolCalls: ToolCallSummary[],
  currentDecision: OrchestratorDecision,
  allProposals: AgentProposal[],
): OrchestratorDecision {
  const intent = classifyToolResultIntent(toolCalls);

  if (intent === 'neutral') {
    return currentDecision;
  }

  if (!currentDecision.constraintsPassed) {
    return currentDecision;
  }

  const targetMode: OrchestratorMode = intent === 'request_advice' ? 'navigator' : 'catalyst';
  if (currentDecision.mode === targetMode) {
    return currentDecision;
  }

  const proposalsForMode = filterActiveProposals(targetMode, allProposals);
  if (proposalsForMode.length === 0) {
    return currentDecision;
  }

  return {
    ...currentDecision,
    mode: targetMode,
    reason: `流中工具结果触发 ${intent === 'request_advice' ? '请求建议' : '认知缺口'} 信号，由流中拦截器从 ${currentDecision.mode} 调整为 ${targetMode}`,
    activeProposals: proposalsForMode,
    suggestedAction: buildSuggestedAction(targetMode, currentDecision.aggregate),
    decidedAt: new Date().toISOString(),
  };
}
