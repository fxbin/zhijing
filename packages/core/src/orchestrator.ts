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

/**
 * 用户意图分类标签。
 *
 * P0.4 前置拦截器使用：基于用户消息文本做规则意图识别，
 * 识别结果用于动态调整编排模式，而非依赖流开始前的静态 decision。
 *
 * - skeptic：用户在质疑 Agent 的追问方向，应回到被动响应
 * - request_advice：用户主动请求建议或下一步行动
 * - request_probe：用户主动请求追问或盲区识别
 * - request_research：用户主动请求深度研究、调研、查证或竞品分析
 * - request_roundtable：用户主动请求圆桌讨论、多专家评审或多视角辩论
 * - neutral：无明确意图信号，沿用 baseDecision
 *
 * @author fxbin
 */
export type UserIntent = 'skeptic' | 'request_advice' | 'request_probe' | 'request_research' | 'request_roundtable' | 'neutral';

/**
 * 质疑/拒绝信号关键词。
 *
 * 命中时强制切换到 mirror 模式：
 * 用户在质疑 Agent 的追问方向是否合理，应立即回到被动响应，不再追问。
 */
const SKEPTIC_KEYWORDS: readonly string[] = [
  '质疑', '方向不对', '追问方向', '为什么这么问', '别追问', '不要追问',
  '你问的不对', '问错了', '换个方向', '回到正题', '直接回答',
];

/**
 * 请求建议关键词。
 *
 * 命中时倾向切换到 navigator 模式：
 * 用户主动请求建议、下一步行动、复习推荐等。
 */
const REQUEST_ADVICE_KEYWORDS: readonly string[] = [
  '建议', '下一步', '怎么复习', '还有什么', '推荐', '该怎么', '应该做什么',
  '接下来', '行动', '怎么做', '如何安排',
];

/**
 * 请求追问关键词。
 *
 * 命中时倾向切换到 catalyst 模式：
 * 用户主动请求盲区识别、追问引导、自我反思。
 */
const REQUEST_PROBE_KEYWORDS: readonly string[] = [
  '我哪里没想到', '盲区', '思考盲点', '帮我追问', '引导我', '我漏了什么',
  '认知缺口', '反思', '元认知', '我没考虑到',
];

/**
 * 请求深度研究关键词。
 *
 * 命中时不改变编排模式，只由 agent 层选择 research 角色：
 * 这类请求需要更严格的证据账本、结论分级和开放问题，而不是主动提议模式切换。
 */
const REQUEST_RESEARCH_KEYWORDS: readonly string[] = [
  '深度研究', '深度调研', '深入研究', '系统调研', '研究一下', '调研一下',
  '帮我调研', '帮我研究', '竞品分析', '多来源查证', '交叉验证', '证据账本',
  '研究报告', '背景研究', '外部分析',
];

/**
 * 请求圆桌讨论关键词。
 *
 * 命中时不改变编排模式，只由 agent 层选择 roundtable 角色：
 * 这类请求需要多视角评审与分歧收敛，而不是主动提议模式切换。
 */
const REQUEST_ROUNDTABLE_KEYWORDS: readonly string[] = [
  '圆桌', '圆桌讨论', '圆桌研讨', '多专家', '专家评审', '多角色讨论',
  '多视角', '几个角度', '不同视角', '辩论一下', '一起讨论', '评估一下',
  '反方意见', '正反双方', '产品视角', '技术视角', '风险视角',
];

/**
 * 负向上下文正则列表：匹配到时抑制对应意图，避免子串误命中。
 *
 * 例如「我研究一下再回你」命中 request_research 的「研究一下」，
 * 但实际是用户自我表态而非请求；「评估一下这张卡片」命中 request_roundtable
 * 的「评估一下」，但实际只是要 Agent 评价一张卡片。
 */
const NEGATIVE_CONTEXT_PATTERNS: ReadonlyArray<{ pattern: RegExp; suppress: UserIntent }> = [
  { pattern: /我(再|先)?(研究|调研|看看|了解)一下/, suppress: 'request_research' },
  { pattern: /我(再|先)?(研究|调研)下/, suppress: 'request_research' },
  { pattern: /(评估|评价)一下(这张|这张卡|这个卡片|这个卡)/, suppress: 'request_roundtable' },
];

/**
 * 对用户消息做规则意图识别。
 *
 * 基于关键词匹配识别用户意图，不引入 LLM（KISS 原则）。
 * 增加负向上下文模式检测，避免「我研究一下再回你」等自我表态被误判为请求。
 *
 * 识别优先级：skeptic > request_roundtable > request_research > request_probe > request_advice > neutral
 * （质疑信号优先级最高，确保用户拒绝时立即回到被动响应）。
 *
 * @param message - 用户当前消息文本
 * @returns 意图分类标签
 * @author fxbin
 */
export function classifyUserIntent(message: string): UserIntent {
  const text = message.trim();
  if (text.length === 0) return 'neutral';

  const suppressedIntents = new Set<UserIntent>();
  for (const { pattern, suppress } of NEGATIVE_CONTEXT_PATTERNS) {
    if (pattern.test(text)) {
      suppressedIntents.add(suppress);
    }
  }

  for (const keyword of SKEPTIC_KEYWORDS) {
    if (text.includes(keyword)) return 'skeptic';
  }
  for (const keyword of REQUEST_ROUNDTABLE_KEYWORDS) {
    if (text.includes(keyword) && !suppressedIntents.has('request_roundtable')) return 'request_roundtable';
  }
  for (const keyword of REQUEST_RESEARCH_KEYWORDS) {
    if (text.includes(keyword) && !suppressedIntents.has('request_research')) return 'request_research';
  }
  for (const keyword of REQUEST_PROBE_KEYWORDS) {
    if (text.includes(keyword)) return 'request_probe';
  }
  for (const keyword of REQUEST_ADVICE_KEYWORDS) {
    if (text.includes(keyword)) return 'request_advice';
  }
  return 'neutral';
}

/**
 * 前置拦截器：根据用户消息意图动态调整编排决策。
 *
 * P0.4 核心入口：在 Agent 处理用户消息之前调用，
 * 基于规则意图识别调整 baseDecision.mode，让编排模式能随对话上下文实时变化，
 * 而非流开始前一次性决定。
 *
 * 拦截规则：
 * 1. skeptic → 强制 mirror，清空 activeProposals（用户拒绝追问，立即回到被动响应）
 * 2. request_advice → 切换到 navigator（若 baseDecision 非 navigator 且有可用提议）
 * 3. request_probe → 切换到 catalyst（若 baseDecision 非 catalyst 且有可用提议）
 * 4. neutral → 沿用 baseDecision，不调整
 *
 * 拦截后的 decision.reason 会附加「由前置拦截器从 X 调整为 Y」的说明，
 * 便于日志审计与前端 mode_update 事件展示。
 *
 * 注意：拦截器不重新评估约束引擎，约束未通过时即使意图命中也不切换到主动模式，
 * 避免绕过体验约束。mirror 是被动模式，无约束限制，skeptic 意图始终生效。
 *
 * @param message - 用户当前消息文本
 * @param baseDecision - 流开始前由 buildOrchestratorDecision 产出的基础决策
 * @param allProposals - 当前可用的全量 Agent 提议列表（用于切换主动模式时重新过滤）
 * @returns 拦截后的最终决策（可能是 baseDecision 原样，也可能是调整后的新决策）
 * @author fxbin
 */
export function preInterceptUserMessage(
  message: string,
  baseDecision: OrchestratorDecision,
  allProposals: AgentProposal[],
): OrchestratorDecision {
  const intent = classifyUserIntent(message);

  if (intent === 'neutral' || intent === 'request_research' || intent === 'request_roundtable') {
    return baseDecision;
  }

  if (intent === 'skeptic') {
    if (baseDecision.mode === 'mirror') {
      return baseDecision;
    }
    return {
      ...baseDecision,
      mode: 'mirror',
      reason: `用户消息触发质疑信号，由前置拦截器从 ${baseDecision.mode} 调整为 mirror`,
      activeProposals: [],
      suggestedAction: '',
      decidedAt: new Date().toISOString(),
    };
  }

  if (!baseDecision.constraintsPassed) {
    return baseDecision;
  }

  const targetMode: OrchestratorMode = intent === 'request_advice' ? 'navigator' : 'catalyst';
  if (baseDecision.mode === targetMode) {
    return baseDecision;
  }

  const proposalsForMode = filterActiveProposals(targetMode, allProposals);
  if (proposalsForMode.length === 0) {
    return baseDecision;
  }

  return {
    ...baseDecision,
    mode: targetMode,
    reason: `用户消息触发 ${intent === 'request_advice' ? '请求建议' : '请求追问'} 信号，由前置拦截器从 ${baseDecision.mode} 调整为 ${targetMode}`,
    activeProposals: proposalsForMode,
    suggestedAction: buildSuggestedAction(targetMode, baseDecision.aggregate),
    decidedAt: new Date().toISOString(),
  };
}

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
