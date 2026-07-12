/**
 * 编排模式选择与提议筛选模块。
 *
 * 职责：
 * - 基于聚合信号选择编排模式（mirror/catalyst/navigator）
 * - 评估体验约束是否允许主动行为
 * - 按模式筛选活跃提议
 * - 构建完整编排决策（聚合 → 模式选择 → 约束评估 → 筛选 → 决策）
 *
 * 纯逻辑层，所有数据通过参数传入。
 *
 * @module orchestrator/proposal-filter
 * @author fxbin
 */

import type {
  AttentionSignal,
  AgentProposal,
  AttentionAggregate,
  ExperienceConstraints,
  OrchestratorDecision,
  OrchestratorMode,
} from '@zhijing/shared';
import {
  CATALYST_MIN_STRENGTH,
  NAVIGATOR_MIN_STRENGTH,
  DEFAULT_EXPERIENCE_CONSTRAINTS,
  aggregateAttentionSignals,
  type SuggestionHistory,
} from './signal-aggregator.js';

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
 * P0.3 升级：从基础检查升级为完整 5 约束评估——
 * 1. neverInterruptDuringWriting：用户正在编辑时永远不下发主动提议
 * 2. maxDailyActiveSuggestions：今日已下发次数不得超过上限
 * 3. minIntervalBetweenSuggestionsMs：距上次下发间隔不得小于最小间隔
 * 4. neverClaimKnowledgeWithoutSource：无来源支撑的提议类型不得下发
 * 5. alwaysOfferSkepticMode：catalyst 模式必须可提供质疑入口（前端 UI 保证，此处只记日志不阻塞）
 *
 * mirror 模式始终通过（不主动提议，无需评估约束）。
 *
 * @param mode - 当前选中的模式
 * @param aggregate - 信号聚合摘要
 * @param constraints - 体验约束配置
 * @param history - 主动提议历史摘要（P0.3 新增）
 * @returns 约束评估结果（通过/未通过 + 原因）
 * @author fxbin
 */
export function evaluateConstraints(
  mode: OrchestratorMode,
  aggregate: AttentionAggregate,
  constraints: ExperienceConstraints,
  history: SuggestionHistory = { todayCount: 0, lastSuggestionAt: null, isWriting: false },
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

  if (constraints.neverInterruptDuringWriting && history.isWriting) {
    return {
      passed: false,
      reason: '用户正在编辑，约束禁止打断',
    };
  }

  if (history.todayCount >= constraints.maxDailyActiveSuggestions) {
    return {
      passed: false,
      reason: `今日已下发 ${history.todayCount} 次主动提议，达到每日上限 ${constraints.maxDailyActiveSuggestions}`,
    };
  }

  if (history.lastSuggestionAt) {
    const lastTime = new Date(history.lastSuggestionAt).getTime();
    const now = Date.now();
    const elapsed = now - lastTime;
    if (elapsed < constraints.minIntervalBetweenSuggestionsMs) {
      const remainMs = constraints.minIntervalBetweenSuggestionsMs - elapsed;
      const remainMin = Math.ceil(remainMs / (60 * 1000));
      return {
        passed: false,
        reason: `距上次主动提议仅 ${Math.floor(elapsed / (60 * 1000))} 分钟，需间隔 ${Math.floor(constraints.minIntervalBetweenSuggestionsMs / (60 * 1000))} 分钟（剩余 ${remainMin} 分钟）`,
      };
    }
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
export function buildSuggestedAction(mode: OrchestratorMode, aggregate: AttentionAggregate): string {
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
 * 催化剂模式应注入的提议类型；用于从全量 proposals 中筛选当前模式的活跃提议。
 *
 * 催化剂聚焦认知引导：盲区补充用于追问「为何忽略这片」，
 * 重复思考用于追问「是否需要换角度」。
 */
const CATALYST_PROPOSAL_TYPES: ReadonlySet<AgentProposal['type']> = new Set([
  'blind_spot',
  'repeated_thinking',
]);

/**
 * 导航员模式应注入的提议类型；用于从全量 proposals 中筛选当前模式的活跃提议。
 *
 * 导航员聚焦行动建议：复习卡片、主题探索、工作区涌现都是
 * 用户可立即执行的下一步行动。
 */
const NAVIGATOR_PROPOSAL_TYPES: ReadonlySet<AgentProposal['type']> = new Set([
  'recall_review',
  'topic_explore',
  'workspace_emergence',
]);

/**
 * 根据模式从全量提议中筛选当前模式的活跃提议。
 *
 * - mirror：恒为空数组（镜子模式不主动提议，无需注入证据）
 * - catalyst：盲区补充 + 重复思考（用于苏格拉底追问）
 * - navigator：复习建议 + 主题探索 + 工作区涌现（用于行动建议）
 *
 * @param mode - 当前编排模式
 * @param proposals - 全量提议列表
 * @returns 当前模式下应注入到 systemPrompt 的活跃提议
 * @author fxbin
 */
export function filterActiveProposals(
  mode: OrchestratorMode,
  proposals: AgentProposal[],
): AgentProposal[] {
  if (mode === 'mirror') return [];
  const allowed = mode === 'catalyst' ? CATALYST_PROPOSAL_TYPES : NAVIGATOR_PROPOSAL_TYPES;
  return proposals.filter((proposal) => allowed.has(proposal.type));
}

/**
 * 构建完整的编排决策（纯逻辑入口，不访问 repository）。
 *
 * 调用方负责传入注意力信号和 Agent 提议数据，
 * 本函数完成聚合 → 模式选择 → 约束评估 → 活跃提议筛选 → 决策构建的完整链路。
 *
 * P0.3 升级：新增 history 参数，让约束引擎能评估频率/间隔/编辑态。
 * 约束未通过时，activeProposals 强制为空数组，mode 仍保留以供日志诊断，
 * 调用方应基于 constraintsPassed 决定是否真正下发主动提议。
 *
 * @param signals - 注意力信号列表
 * @param proposals - Agent 主动提议列表
 * @param constraints - 体验约束配置（可选，默认使用 DEFAULT_EXPERIENCE_CONSTRAINTS）
 * @param history - 主动提议历史摘要（可选，默认空历史即无限制）
 * @returns 完整的编排决策
 * @author fxbin
 */
export function buildOrchestratorDecisionFromData(
  signals: AttentionSignal[],
  proposals: AgentProposal[],
  constraints: ExperienceConstraints = DEFAULT_EXPERIENCE_CONSTRAINTS,
  history: SuggestionHistory = { todayCount: 0, lastSuggestionAt: null, isWriting: false },
): OrchestratorDecision {
  const aggregate = aggregateAttentionSignals(signals, proposals);
  const { mode, reason } = selectMode(aggregate);
  const constraintResult = evaluateConstraints(mode, aggregate, constraints, history);
  const activeProposals = constraintResult.passed ? filterActiveProposals(mode, proposals) : [];
  const suggestedAction = constraintResult.passed ? buildSuggestedAction(mode, aggregate) : '';

  return {
    mode,
    reason,
    aggregate,
    constraintsPassed: constraintResult.passed,
    constraintsReason: constraintResult.reason,
    suggestedAction,
    activeProposals,
    decidedAt: new Date().toISOString(),
  };
}
