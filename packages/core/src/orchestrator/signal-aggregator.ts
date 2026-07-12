/**
 * 编排信号聚合模块。
 *
 * 职责：
 * - 维护信号强度常量（催化剂/导航员触发阈值）
 * - 维护默认体验约束配置（agent-constraints 入口）
 * - 将 AttentionSignal（用户行为）+ AgentProposal（Agent 提议）聚合为统一摘要
 *
 * 纯逻辑层，不直接访问 repository，所有数据通过参数传入。
 *
 * @module orchestrator/signal-aggregator
 * @author fxbin
 */

import type {
  AttentionSignal,
  AttentionSignalStrength,
  AgentProposal,
  AttentionAggregate,
  ExperienceConstraints,
} from '@zhijing/shared';

/**
 * 信号强度字符串到数字的映射，用于统一评分。
 */
const STRENGTH_MAP: Record<AttentionSignalStrength, number> = {
  weak: 1,
  medium: 2,
  strong: 3,
};

/**
 * 触发催化剂模式的最低信号强度。
 */
export const CATALYST_MIN_STRENGTH = 2;

/**
 * 触发导航员模式的最低信号强度。
 */
export const NAVIGATOR_MIN_STRENGTH = 3;

/**
 * 信号聚合时拉取的最近信号条数。
 */
const AGGREGATE_SIGNAL_LIMIT = 20;

/**
 * 默认体验约束配置，对应「对用户注意力的尊重」这一最高约束。
 *
 * P0.3 升级：这组常量即为 v1.1 §2.4 设计的 agent-constraints 配置入口，
 * 不引入 YAML 解析依赖（符合 KISS 原则）。调整约束只需修改此常量。
 *
 * neverInterruptDuringWriting 设计局限说明：
 * 该约束在当前架构下处于「保留但不生效」状态。原因：
 * 1. 前置拦截路径（buildInterceptedDecision）在用户发送消息后触发，此时用户已按回车，
 *    isWriting 必为 false（用户已停止编辑）。
 * 2. 流式回复期间 textarea 被 disabled（GlobalChatDock canAsk = ... && !isStreaming），
 *    用户无法编辑，无法产生 isWriting=true 信号。
 * 3. preInterceptInStream 不评估 isWriting（流中拦截只调整 mode，不立即下发主动提议）。
 * 保留该约束标记是为了未来引入 WebSocket/心跳双向通信时可复用评估逻辑，
 * 同时表达「对用户注意力的尊重」这一设计意图。
 */
export const DEFAULT_EXPERIENCE_CONSTRAINTS: ExperienceConstraints = {
  maxDailyActiveSuggestions: 3,
  minIntervalBetweenSuggestionsMs: 2 * 60 * 60 * 1000,
  neverInterruptDuringWriting: true,
  neverClaimKnowledgeWithoutSource: true,
  alwaysOfferSkepticMode: true,
};

/**
 * 主动提议历史摘要，供约束引擎评估频率与间隔。
 *
 * P0.3 引入：从 agent_action_log 查询当日已下发的 active_suggestion_sent 记录，
 * 配合前端传递的 isWriting 标志，让 evaluateConstraints 能完整评估 5 条体验约束。
 *
 * @author fxbin
 */
export interface SuggestionHistory {
  /** 今日已下发的主动提议次数（基于本地时区当日 00:00 起算） */
  todayCount: number;
  /** 上次主动提议下发时间戳（ISO 字符串）；无记录时为 null */
  lastSuggestionAt: string | null;
  /** 用户当前是否正在编辑（前端基于输入框焦点/未发送文本判定） */
  isWriting: boolean;
}

/**
 * 将信号强度字符串转为数字评分。
 *
 * @param strength - 信号强度字符串
 * @returns 数字评分（weak=1, medium=2, strong=3）
 * @author fxbin
 */
function strengthToScore(strength: AttentionSignalStrength): number {
  return STRENGTH_MAP[strength] ?? 0;
}

/**
 * 聚合注意力信号和 Agent 提议，生成统一的信号摘要。
 *
 * 聚合逻辑：
 * - 从最近 N 条 AttentionSignal 中提取最大强度和未消费强信号数
 * - 从 AgentProposal 列表中提取提议类型和盲区/复习标记
 *
 * @param signals - 注意力信号列表（已按时间降序排列）
 * @param proposals - Agent 主动提议列表
 * @returns 聚合后的信号摘要
 * @author fxbin
 */
export function aggregateAttentionSignals(
  signals: AttentionSignal[],
  proposals: AgentProposal[],
): AttentionAggregate {
  const recent = signals.slice(0, AGGREGATE_SIGNAL_LIMIT);

  let maxStrength = 0;
  let unconsumedStrongCount = 0;

  for (const signal of recent) {
    const score = strengthToScore(signal.signalStrength);
    if (score > maxStrength) {
      maxStrength = score;
    }
    if (!signal.consumed && score >= NAVIGATOR_MIN_STRENGTH) {
      unconsumedStrongCount += 1;
    }
  }

  const proposalTypes = proposals.map((item) => item.type);
  const hasBlindSpot = proposalTypes.includes('blind_spot');
  const hasRecallReview = proposalTypes.includes('recall_review');

  return {
    maxStrength,
    unconsumedStrongCount,
    latestSignalType: recent.length > 0 ? recent[0].signalType : '',
    proposalTypes,
    hasBlindSpot,
    hasRecallReview,
    evaluatedAt: new Date().toISOString(),
  };
}
