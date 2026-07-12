/**
 * Agent 提议类型。
 *
 * 包含提议卡片、结构化操作（创建/编辑/归档）、提议批次、采纳请求与响应，
 * 以及持久化的 Agent 主动提议（盲区/复习/主题探索等）。
 * 守提议权不写入权：Agent 只产生提议，需用户确认后才会落库。
 *
 * @author fxbin
 */

import type { CardType } from './enums.js';

/**
 * 对话生成的卡片提议，尚未落库为 KnowledgeCard。
 * 用户在前端确认采纳后，才会通过 acceptProposedCards 正式写入 cards 表。
 * 守提议权不写入权：对话只产生提议，不直接生成卡片。
 * @author fxbin
 */
export interface ProposedCard {
  type: CardType;
  title: string;
  body: string;
}

/**
 * 采纳提议卡片请求，支持逐张选择。
 * selectedIndices 为空或省略时采纳全部提议。
 * @author fxbin
 */
export interface AcceptProposedCardsRequest {
  selectedIndices?: number[];
}

/**
 * Agent 提议的操作类型枚举。
 * 与 ProposedOperation 联合类型中的 op 字段保持同步。
 * @author fxbin
 */
export type ProposedOperationType =
  | 'create_card'
  | 'edit_card'
  | 'archive_card'
  | 'unarchive_card'
  | 'archive_material';

/**
 * Agent 提议的结构化操作。
 *
 * 与 ProposedCard 的区别：ProposedCard 仅支持「新建卡片」一种操作；
 * ProposedOperation 覆盖创建、编辑、归档、取消归档等多种原子变更，
 * 用于流式路径下的 apply diff 能力。
 *
 * 守提议权不写入权：Agent 只产生提议，需用户在前端确认后才会调用
 * 既有原子端点（acceptProposedCards / editCardContent / archiveCard /
 * archiveMaterial / unarchiveCard）落库。
 *
 * @author fxbin
 */
export type ProposedOperation =
  | {
      op: 'create_card';
      type: CardType;
      title: string;
      body: string;
      materialId?: string;
      rationale?: string;
    }
  | {
      op: 'edit_card';
      cardId: string;
      title?: string;
      body?: string;
      type?: CardType;
      rationale?: string;
    }
  | {
      op: 'archive_card';
      cardId: string;
      rationale?: string;
    }
  | {
      op: 'unarchive_card';
      cardId: string;
      rationale?: string;
    }
  | {
      op: 'archive_material';
      materialId: string;
      rationale?: string;
    };

/**
 * 一批 Agent 提议操作，承载于流式 proposal_batch 事件下发到前端。
 * batchId 仅作为审计标识使用，服务端不持久化 batch 状态，
 * 前端在 accept 请求中需重新提交 operations 原文。
 * fallback=true 表示该 batch 来自兜底解析（LLM 未按 proposal-batch 协议输出），
 * 前端应展示降级提示条告知用户内容可能粗糙。
 * @author fxbin
 */
export interface ProposalBatch {
  batchId: string;
  proposals: ProposedOperation[];
  fallback?: boolean;
}

/**
 * 采纳提议操作请求。
 * selectedIndices 为空或省略时采纳全部提议；否则只采纳指定下标的操作。
 * @author fxbin
 */
export interface AcceptProposalBatchRequest {
  operations: ProposedOperation[];
  selectedIndices?: number[];
}

/**
 * 单条提议操作的执行结果。
 * ok=false 时 error 字段承载失败原因；ok=true 时 cardId/materialId
 * 字段承载新建或更新的资源 id，便于前端刷新对应数据。
 * @author fxbin
 */
export interface ProposedOperationResult {
  index: number;
  op: ProposedOperationType;
  ok: boolean;
  error?: string;
  cardId?: string;
  materialId?: string;
}

/**
 * 采纳提议操作的整体响应。
 * results 与请求 operations 数组顺序一致，前端可逐条展示成功/失败状态。
 * @author fxbin
 */
export interface AcceptProposalBatchResponse {
  batchId: string;
  results: ProposedOperationResult[];
}

/**
 * Agent 主动提议类型，标识提议的来源场景。
 * - blind_spot 盲区补充建议（高兴趣低覆盖的主题）
 * - repeated_thinking 重复思考提醒（相似问题反复提问）
 * - recall_review 遗忘复习建议（recall 分数低的卡片）
 * - topic_explore 主题探索建议（高兴趣主题的延伸探索）
 * - workspace_emergence 工作区涌现建议（默认工作区中卡片聚类达到阈值，提议创建命名工作区）
 * @author fxbin
 */
export type AgentProposalType = 'blind_spot' | 'repeated_thinking' | 'recall_review' | 'topic_explore' | 'workspace_emergence';

/**
 * 工作区涌现聚类结果，描述从默认工作区卡片中发现的主题聚类。
 * @author fxbin
 */
export interface WorkspaceEmergenceCluster {
  keyword: string;
  cardIds: string[];
  cardCount: number;
  sampleTitles: string[];
}

/**
 * Agent 主动提议条目，向用户建议下一步认知行动。
 * 守提议权不写入权：Agent 只提议，不直接执行任何写入操作。
 * @author fxbin
 */
export interface AgentProposal {
  type: AgentProposalType;
  title: string;
  description: string;
  actionLabel: string;
  metadata: Record<string, unknown>;
}

/**
 * Agent 主动提议报告，汇总各类提议供前端展示。
 * @author fxbin
 */
export interface AgentProposalReport {
  proposals: AgentProposal[];
  generatedAt: string;
}

/**
 * 持久化 Proposal 状态。
 *
 * 状态机流转：
 * - pending → accepted：用户采纳建议（如复习了卡片、补充了盲区）
 * - pending → rejected：用户明确拒绝
 * - pending → dismissed：用户忽略（超时自动 dismiss 或主动关闭）
 * - accepted/rejected/dismissed 为终态，不再流转
 *
 * @author fxbin
 */
export type ProposalStatus = 'pending' | 'accepted' | 'rejected' | 'dismissed';

/**
 * 持久化的 AgentProposal 记录，带 id / 状态 / 时间戳。
 *
 * 与 AgentProposal 的差异：AgentProposal 是临时生成的一次性对象，
 * PersistedProposal 是持久化到 agent_proposals 表的记录，
 * 支持状态机流转与反馈闭环追踪。
 *
 * @author fxbin
 */
export interface PersistedProposal {
  /** 记录主键 */
  id: string;
  /** 工作区 id */
  workspaceId: string;
  /** 提议类型 */
  type: AgentProposalType;
  /** 提议标题 */
  title: string;
  /** 提议描述 */
  description: string;
  /** 行动标签 */
  actionLabel: string;
  /** 元数据（cardId / recallScore / term 等） */
  metadata: Record<string, unknown>;
  /** 当前状态 */
  status: ProposalStatus;
  /** 生成时间 ISO */
  generatedAt: string;
  /** 状态变更时间 ISO；未变更时为 null */
  decidedAt: string | null;
}
