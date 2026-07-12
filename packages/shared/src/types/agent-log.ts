/**
 * Agent 行为日志与证据审计类型。
 *
 * 包含 Agent 行为类型、行为日志、Evidence 飞轮反馈聚合、
 * 证据审计报告、证据覆盖缺口与假设检验结果。
 *
 * @author fxbin
 */

import type { ClaimStatus } from './enums.js';

/**
 * Agent 行为类型（P10-5）。
 *
 * 标识 Agent 执行的具体行为类别，用于行为日志审计。
 *  - socratic_questioning 苏格拉底追问
 *  - related_suggestions 可能相关建议
 *  - cross_kb_synthesis 跨库综合
 *  - entity_extraction 实体提取
 *  - knowledge_intake 知识摄入
 *  - material_parse 资料解析
 *  - card_edit 卡片编辑
 *  - conflict_resolve 冲突解决
 *  - active_suggestion_sent 主动提议下发（P0.3 约束引擎追踪用）
 *  - accept_proposed_cards 用户裁决提议卡片（evidence 飞轮数据源）
 * @author fxbin
 */
export type AgentAction =
  | 'socratic_questioning'
  | 'related_suggestions'
  | 'cross_kb_synthesis'
  | 'entity_extraction'
  | 'knowledge_intake'
  | 'material_parse'
  | 'card_edit'
  | 'conflict_resolve'
  | 'active_suggestion_sent'
  | 'accept_proposed_cards';

/**
 * Agent 行为日志记录（P10-5）。
 *
 * 记录每次 Agent 调用的输入、输出、耗时与结果，
 * 供可审计性使用（datasette inspect 能力通过 SQL 导出端点实现）。
 *
 * @author fxbin
 */
export interface AgentActionLog {
  id: string;
  action: AgentAction;
  workspaceId?: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  durationMs: number;
  success: boolean;
  error?: string;
  createdAt: string;
}

/**
 * Agent 行为日志查询结果（P10-5）。
 *
 * @author fxbin
 */
export interface AgentActionLogResult {
  logs: AgentActionLog[];
  total: number;
}

/**
 * Evidence 飞轮反馈聚合结果。
 *
 * 基于 agent_action_log 中 accept_proposed_cards 动作记录聚合，
 * 作为"镜子不保姆"的可测量指标（accept_rate）。
 * accept_rate = totalAccepted / totalProposed，无数据时为 null。
 *
 * @author fxbin
 */
export interface EvidenceFeedback {
  /** 总提议卡片数 */
  totalProposed: number;
  /** 被接受卡片数 */
  totalAccepted: number;
  /** 被拒绝卡片数（提议但未采纳） */
  totalRejected: number;
  /** 接受率：accepted / totalProposed；无数据时为 null */
  acceptRate: number | null;
}

/**
 * 证据审计报告（P13-1）。
 *
 * 扫描知识库中所有卡片的溯源状态，分类统计并识别覆盖缺口。
 * 帮助用户发现哪些认知仍停留在 AI 骨架阶段，需要补充证据。
 *
 * @author fxbin
 */
export interface EvidenceAuditReport {
  workspaceId: string;
  generatedAt: string;
  totals: {
    cards: number;
    sourced: number;
    userConfirmed: number;
    skeleton: number;
    unsupported: number;
  };
  sourcedRatio: number;
  gaps: EvidenceGap[];
}

/**
 * 证据覆盖缺口（P13-1）。
 *
 * 按卡片类型分组，识别该类型下骨架卡占比过高的区域。
 *
 * @author fxbin
 */
export interface EvidenceGap {
  cardType: string;
  total: number;
  skeleton: number;
  skeletonRatio: number;
  sampleCardIds: string[];
}

/**
 * 假设检验结果（P13-2）。
 *
 * 用户提交一个假设，系统在知识库中搜索支持与反对的证据，
 * 返回判定和引用卡片。遵循"镜子不保姆"铁律——只呈现证据，不替代用户判断。
 *
 * @author fxbin
 */
export interface HypothesisTestResult {
  workspaceId: string;
  hypothesis: string;
  generatedAt: string;
  verdict: 'supported' | 'contradicted' | 'mixed' | 'insufficient';
  supportingCards: HypothesisEvidence[];
  contradictingCards: HypothesisEvidence[];
  neutralCards: HypothesisEvidence[];
  summary: string;
}

/**
 * 假设检验证据项（P13-2）。
 *
 * @author fxbin
 */
export interface HypothesisEvidence {
  cardId: string;
  title: string;
  preview: string;
  claimStatus: ClaimStatus;
  relevanceScore: number;
}
