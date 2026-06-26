/**
 * 编排 Agent 核心逻辑层。
 *
 * 实现「镜子不保姆」理念的三模式切换：
 * 1. 信号聚合：将 AttentionSignal（用户行为）+ AgentProposal（Agent 提议）聚合为统一摘要
 * 2. 模式选择：基于聚合信号的强度和类型选择 mirror/catalyst/navigator
 * 3. 约束评估：检查体验约束（不打断、不超量、有来源才声称）
 *
 * 本文件为纯逻辑层，不直接访问 repository，所有数据通过参数传入。
 * 入口函数 buildOrchestratorDecision 在 index.ts 中做薄包装。
 *
 * @module orchestrator
 * @author fxbin
 */

import type {
  AttentionSignal,
  AttentionSignalStrength,
  AgentProposal,
  AttentionAggregate,
  ExperienceConstraints,
  OrchestratorDecision,
  OrchestratorMode,
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
const CATALYST_MIN_STRENGTH = 2;

/**
 * 触发导航员模式的最低信号强度。
 */
const NAVIGATOR_MIN_STRENGTH = 3;

/**
 * 信号聚合时拉取的最近信号条数。
 */
const AGGREGATE_SIGNAL_LIMIT = 20;

/**
 * 默认体验约束配置，对应「对用户注意力的尊重」这一最高约束。
 */
export const DEFAULT_EXPERIENCE_CONSTRAINTS: ExperienceConstraints = {
  maxDailyActiveSuggestions: 3,
  minIntervalBetweenSuggestionsMs: 2 * 60 * 60 * 1000,
  neverInterruptDuringWriting: true,
  neverClaimKnowledgeWithoutSource: true,
  alwaysOfferSkepticMode: true,
};

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

/**
 * 基于聚合信号选择编排模式。
 *
 * 选择规则（按优先级从高到低）：
 * 1. 信号强度 >= 3 且有遗忘复习提议 → navigator（用户可能遗忘，需要引导）
 * 2. 信号强度 >= 2 且有盲区提议 → catalyst（存在知识盲区，需要追问）
 * 3. 信号强度 >= 3 → navigator（高强度信号需要主动建议）
 * 4. 信号强度 >= 2 → catalyst（中强度信号适合追问引导）
 * 5. 默认 → mirror（无足够信号，被动响应）
 *
 * @param aggregate - 聚合后的信号摘要
 * @returns 模式 + 选择理由
 * @author fxbin
 */
export function selectMode(aggregate: AttentionAggregate): { mode: OrchestratorMode; reason: string } {
  const { maxStrength, hasBlindSpot, hasRecallReview, unconsumedStrongCount } = aggregate;

  if (maxStrength >= NAVIGATOR_MIN_STRENGTH && hasRecallReview) {
    return {
      mode: 'navigator',
      reason: `信号强度 ${maxStrength} 且存在遗忘复习提议，切换到导航员模式引导复习`,
    };
  }

  if (maxStrength >= CATALYST_MIN_STRENGTH && hasBlindSpot) {
    return {
      mode: 'catalyst',
      reason: `信号强度 ${maxStrength} 且存在知识盲区提议，切换到催化剂模式追问引导`,
    };
  }

  if (maxStrength >= NAVIGATOR_MIN_STRENGTH || unconsumedStrongCount > 0) {
    return {
      mode: 'navigator',
      reason: `信号强度 ${maxStrength}，未消费强信号 ${unconsumedStrongCount} 条，切换到导航员模式主动建议`,
    };
  }

  if (maxStrength >= CATALYST_MIN_STRENGTH) {
    return {
      mode: 'catalyst',
      reason: `信号强度 ${maxStrength}，切换到催化剂模式追问引导`,
    };
  }

  return {
    mode: 'mirror',
    reason: '无足够注意力信号，保持镜子模式被动响应',
  };
}

/**
 * 评估体验约束是否允许当前模式下的主动行为。
 *
 * P0.1 阶段仅做基础检查：
 * - mirror 模式始终通过（不主动提议）
 * - catalyst/navigator 模式检查提议类型是否为空
 * - 完整的时间间隔和频率追踪留到 P0.3 实现
 *
 * @param mode - 当前选中的模式
 * @param aggregate - 信号聚合摘要
 * @param constraints - 体验约束配置
 * @returns 约束评估结果（通过/未通过 + 原因）
 * @author fxbin
 */
export function evaluateConstraints(
  mode: OrchestratorMode,
  aggregate: AttentionAggregate,
  constraints: ExperienceConstraints,
): { passed: boolean; reason: string } {
  if (mode === 'mirror') {
    return { passed: true, reason: '' };
  }

  if (aggregate.proposalTypes.length === 0) {
    return {
      passed: false,
      reason: '当前无可用提议，主动行为无内容可展示',
    };
  }

  if (constraints.neverClaimKnowledgeWithoutSource && !aggregate.hasBlindSpot && !aggregate.hasRecallReview) {
    return {
      passed: false,
      reason: '提议类型无来源支撑，约束禁止无来源的知识声称',
    };
  }

  return { passed: true, reason: '' };
}

/**
 * 根据模式和聚合信号生成建议的后续行动描述。
 *
 * @param mode - 当前模式
 * @param aggregate - 信号聚合摘要
 * @returns 建议行动描述（mirror 模式返回空字符串）
 * @author fxbin
 */
function buildSuggestedAction(mode: OrchestratorMode, aggregate: AttentionAggregate): string {
  if (mode === 'mirror') return '';

  if (mode === 'catalyst' && aggregate.hasBlindSpot) {
    return '建议针对知识盲区发起苏格拉底追问，引导用户自己发现认知缺口';
  }

  if (mode === 'navigator' && aggregate.hasRecallReview) {
    return '建议推荐最该复习的卡片，并附上上次访问时间和 recall 分数';
  }

  if (mode === 'navigator') {
    return '建议基于学习进度推荐下一步学习方向或行动';
  }

  return '建议发起苏格拉底追问，引导用户深化思考';
}

/**
 * 构建完整的编排决策（纯逻辑入口，不访问 repository）。
 *
 * 调用方负责传入注意力信号和 Agent 提议数据，
 * 本函数完成聚合 → 模式选择 → 约束评估 → 决策构建的完整链路。
 *
 * @param signals - 注意力信号列表
 * @param proposals - Agent 主动提议列表
 * @param constraints - 体验约束配置（可选，默认使用 DEFAULT_EXPERIENCE_CONSTRAINTS）
 * @returns 完整的编排决策
 * @author fxbin
 */
export function buildOrchestratorDecisionFromData(
  signals: AttentionSignal[],
  proposals: AgentProposal[],
  constraints: ExperienceConstraints = DEFAULT_EXPERIENCE_CONSTRAINTS,
): OrchestratorDecision {
  const aggregate = aggregateAttentionSignals(signals, proposals);
  const { mode, reason } = selectMode(aggregate);
  const constraintResult = evaluateConstraints(mode, aggregate, constraints);
  const suggestedAction = constraintResult.passed ? buildSuggestedAction(mode, aggregate) : '';

  return {
    mode,
    reason,
    aggregate,
    constraintsPassed: constraintResult.passed,
    constraintsReason: constraintResult.reason,
    suggestedAction,
    decidedAt: new Date().toISOString(),
  };
}
