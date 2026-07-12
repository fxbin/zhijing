/**
 * 回忆（Recall）与编排 Agent 决策类型。
 *
 * 包含回忆工具名称、回忆结果项与结果集、编排 Agent 的三种交互模式
 * （镜子/催化剂/导航员）、体验约束配置与完整决策结果。
 *
 * @author fxbin
 */

import type { AttentionAggregate } from './attention.js';
import type { AgentProposal } from './proposal.js';

/**
 * 回忆工具名称，标识 Recall Agent 使用的四种检索策略。
 * - direct_fetch 精确命中，零成本内存匹配
 * - shallow_recall 浅层回忆，基于 FTS5 + BM25 排序
 * - deep_recall 深层回忆，借助 LLM 语义扩展后检索
 * - topic_exploration 主题探索，基于知识地图邻居遍历
 * @author fxbin
 */
export type RecallToolName = 'direct_fetch' | 'shallow_recall' | 'deep_recall' | 'topic_exploration';

/**
 * 单条回忆结果项，描述被检索到的卡片或资料及其相关性分数。
 * recalledBy 字段用于审计追踪，标识由哪个工具检索到本条目。
 * @author fxbin
 */
export interface RecallResultItem {
  kind: 'card' | 'material';
  id: string;
  workspaceId?: string;
  title: string;
  preview: string;
  relevanceScore: number;
  recalledBy: RecallToolName;
}

/**
 * 单个回忆工具的检索结果集合，包含结果列表与查询元信息。
 * totalFound 为该工具命中的原始条目数（去重前），items 为最终返回项。
 * @author fxbin
 */
export interface RecallResult {
  items: RecallResultItem[];
  tool: RecallToolName;
  query: string;
  totalFound: number;
}

/**
 * 编排 Agent 的三种交互模式，对应「镜子不保姆」理念的不同姿态。
 * - mirror 镜子模式（默认）：只呈现、不打扰，被动响应用户提问
 * - catalyst 催化剂模式：主动提问、不替代，用苏格拉底追问引导用户自己得出答案
 * - navigator 导航员模式：主动建议、可操作，生成具体行动建议
 * @author fxbin
 */
export type OrchestratorMode = 'mirror' | 'catalyst' | 'navigator';

/**
 * 体验约束配置，落实「对用户注意力的尊重」这一最高约束。
 * 编排 Agent 在做出主动提议前必须通过约束评估。
 * @author fxbin
 */
export interface ExperienceConstraints {
  /** 每日主动提议上限 */
  maxDailyActiveSuggestions: number;
  /** 两次提议间最小间隔（毫秒） */
  minIntervalBetweenSuggestionsMs: number;
  /** 用户正在编辑时永远不打断 */
  neverInterruptDuringWriting: boolean;
  /** 没有来源时不声称知识 */
  neverClaimKnowledgeWithoutSource: boolean;
  /** 始终提供怀疑模式选项 */
  alwaysOfferSkepticMode: boolean;
}

/**
 * 编排 Agent 的完整决策结果，包含模式选择、信号摘要和约束评估。
 * @author fxbin
 */
export interface OrchestratorDecision {
  /** 选中的交互模式 */
  mode: OrchestratorMode;
  /** 模式选择的理由（日志可见，P0.1 不做 UI） */
  reason: string;
  /** 信号聚合摘要 */
  aggregate: AttentionAggregate;
  /** 约束评估结果 */
  constraintsPassed: boolean;
  /** 约束未通过时的说明 */
  constraintsReason: string;
  /** 建议的后续行动（催化剂/导航员模式下有值） */
  suggestedAction: string;
  /**
   * 当前模式下应注入到 systemPrompt 的活跃提议列表。
   *
   * P0.2 引入：让 catalyst/navigator 模式拿到具体证据（盲区术语、
   * 复习卡片 id、主题权重等），从而生成有据可依的追问和建议。
   * mirror 模式恒为空数组。
   * @author fxbin
   */
  activeProposals: AgentProposal[];
  /** 决策时间戳 */
  decidedAt: string;
}
