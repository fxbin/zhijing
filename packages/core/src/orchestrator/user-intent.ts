/**
 * 用户消息意图识别与前置拦截模块。
 *
 * 职责：
 * - 基于规则识别用户消息意图（skeptic / request_advice / request_probe / ...）
 * - 在 Agent 处理用户消息之前根据意图动态调整编排决策
 *
 * 不引入 LLM，符合 KISS 原则。
 *
 * @module orchestrator/user-intent
 * @author fxbin
 */

import type {
  AgentProposal,
  OrchestratorDecision,
  OrchestratorMode,
} from '@zhijing/shared';
import { buildSuggestedAction, filterActiveProposals } from './proposal-filter.js';

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
