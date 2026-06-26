/**
 * 记忆层模块（P1.4）。
 *
 * 自研轻量记忆层，替代 pi-hermes-memory 的 fork 方案。设计理念：
 * - 复用现有 attention_log / computeUserInterestProfile / generateAgentProposals
 * - 补齐 proposal 持久化 + 状态机（最大短板）
 * - consolidation 调度延后到下一切片
 *
 * 本模块为纯逻辑层，db 访问通过 index.ts 暴露的薄 CRUD 函数完成。
 * 状态机转换规则、去重逻辑、活跃 proposal 筛选等业务逻辑集中在此。
 *
 * @module memory
 * @author fxbin
 */

import type { AgentProposal, PersistedProposal, ProposalStatus } from '@zhijing/shared';

/**
 * Proposal 去重窗口（小时）。
 *
 * 同一 workspace + type + title 在此窗口内已有 pending 记录时，
 * 不重复生成，避免重复推送相同提议导致用户疲劳。
 */
const PROPOSAL_DEDUP_WINDOW_HOURS = 24;

/**
 * 决策时读取的活跃 proposal 最大条数。
 *
 * 与 orchestrator-integration.ts 的 MAX_ACTIVE_PROPOSALS_PER_MODE 对齐，
 * 确保注入 systemPrompt 的 proposal 数量可控。
 */
const ACTIVE_PROPOSALS_LIMIT = 10;

/**
 * Proposal 状态机的合法流转规则。
 *
 * key 为当前状态，value 为可流转到的目标状态。
 * accepted / rejected / dismissed 为终态，不可再流转。
 */
const PROPOSAL_TRANSITIONS: Record<ProposalStatus, ProposalStatus[]> = {
  pending: ['accepted', 'rejected', 'dismissed'],
  accepted: [],
  rejected: [],
  dismissed: [],
};

/**
 * db 层 Proposal CRUD 接口（由 index.ts 的 SqliteKnowledgeRepository 实现）。
 *
 * memory.ts 通过此接口访问 db，保持纯逻辑层定位，不直接接触 DatabaseSync。
 */
export interface ProposalRepository {
  /** 插入一条 proposal 记录 */
  insertProposal(proposal: PersistedProposal): void;
  /** 查询指定 workspace 的 proposal，可选按状态过滤 */
  listProposals(workspaceId: string, status?: ProposalStatus, limit?: number): PersistedProposal[];
  /** 更新 proposal 状态 */
  updateProposalStatus(proposalId: string, status: ProposalStatus, decidedAt: string): void;
  /** 查询去重窗口内已有的 proposal（按 workspace + type + title） */
  findRecentProposals(workspaceId: string, type: string, title: string, sinceIso: string): PersistedProposal[];
}

/**
 * 生成持久化 proposal 的主键。
 *
 * 格式：`proposal_${timestamp}_${随机6位}`，确保分布式场景下也基本不碰撞。
 *
 * @returns proposal id
 * @author fxbin
 */
function generateProposalId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `proposal_${timestamp}_${random}`;
}

/**
 * 将临时 AgentProposal 转换为持久化 PersistedProposal。
 *
 * @param workspaceId - 工作区 id
 * @param proposal - 临时生成的 AgentProposal
 * @returns 持久化记录（status=pending, decidedAt=null）
 * @author fxbin
 */
function toPersisted(workspaceId: string, proposal: AgentProposal): PersistedProposal {
  const nowIso = new Date().toISOString();
  return {
    id: generateProposalId(),
    workspaceId,
    type: proposal.type,
    title: proposal.title,
    description: proposal.description,
    actionLabel: proposal.actionLabel,
    metadata: proposal.metadata,
    status: 'pending',
    generatedAt: nowIso,
    decidedAt: null,
  };
}

/**
 * 判断 proposal 状态转换是否合法。
 *
 * @param from - 当前状态
 * @param to - 目标状态
 * @returns 是否允许流转
 * @author fxbin
 */
export function canTransitionProposalStatus(from: ProposalStatus, to: ProposalStatus): boolean {
  return PROPOSAL_TRANSITIONS[from].includes(to);
}

/**
 * 持久化新生成的 proposal，带去重逻辑。
 *
 * 去重规则：同 workspace + type + title 在 PROPOSAL_DEDUP_WINDOW_HOURS 小时内
 * 已有 pending 记录时，跳过插入。这避免了 Agent 每次对话都推送相同提议。
 *
 * 返回值是实际写入的 proposal 列表（去重后），调用方可用于日志或注入 systemPrompt。
 *
 * @param repo - db 访问接口
 * @param workspaceId - 工作区 id
 * @param proposals - 临时生成的 proposal 列表
 * @returns 实际持久化的 proposal 列表（已去重）
 * @author fxbin
 */
export function persistGeneratedProposals(
  repo: ProposalRepository,
  workspaceId: string,
  proposals: AgentProposal[],
): PersistedProposal[] {
  const sinceIso = new Date(Date.now() - PROPOSAL_DEDUP_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
  const persisted: PersistedProposal[] = [];

  for (const proposal of proposals) {
    const duplicates = repo.findRecentProposals(workspaceId, proposal.type, proposal.title, sinceIso);
    const hasPending = duplicates.some((d) => d.status === 'pending');
    if (hasPending) continue;

    const record = toPersisted(workspaceId, proposal);
    repo.insertProposal(record);
    persisted.push(record);
  }

  return persisted;
}

/**
 * 读取活跃 proposal 供编排决策使用。
 *
 * 活跃定义：status=pending，按生成时间倒序，最多 ACTIVE_PROPOSALS_LIMIT 条。
 * 这些 proposal 会被注入 systemPrompt，驱动 catalyst/navigator 模式的追问与建议。
 *
 * @param repo - db 访问接口
 * @param workspaceId - 工作区 id
 * @returns 活跃 proposal 列表
 * @author fxbin
 */
export function getActiveProposals(repo: ProposalRepository, workspaceId: string): PersistedProposal[] {
  return repo.listProposals(workspaceId, 'pending', ACTIVE_PROPOSALS_LIMIT);
}

/**
 * 将 PersistedProposal 转换回 AgentProposal，供现有 buildInterceptedDecision 链路使用。
 *
 * 现有链路（generateAgentProposals → buildDecisionFromData）使用 AgentProposal 类型，
 * 本函数提供向后兼容的转换，避免改动 orchestrator.ts 的接口。
 *
 * @param persisted - 持久化记录
 * @returns 临时 AgentProposal 对象
 * @author fxbin
 */
export function toAgentProposal(persisted: PersistedProposal): AgentProposal {
  return {
    type: persisted.type,
    title: persisted.title,
    description: persisted.description,
    actionLabel: persisted.actionLabel,
    metadata: persisted.metadata,
  };
}

/**
 * 批量转换 PersistedProposal 为 AgentProposal。
 *
 * @param persisted - 持久化记录列表
 * @returns 临时 AgentProposal 列表
 * @author fxbin
 */
export function toAgentProposals(persisted: PersistedProposal[]): AgentProposal[] {
  return persisted.map(toAgentProposal);
}

/**
 * 处理用户对 proposal 的决策（accept / reject / dismiss）。
 *
 * 状态机校验：
 * - 只有 pending 状态的 proposal 可以流转
 * - 非法流转抛出错误（如 accepted → rejected）
 * - proposal 不存在抛出错误
 *
 * @param repo - db 访问接口
 * @param workspaceId - 工作区 id（用于定位 proposal）
 * @param proposalId - proposal 主键
 * @param decision - 目标状态
 * @returns 更新后的 proposal；不存在或非法流转时抛出错误
 * @throws {Error} proposal 不存在或状态转换非法
 * @author fxbin
 */
export function decideProposal(
  repo: ProposalRepository,
  workspaceId: string,
  proposalId: string,
  decision: ProposalStatus,
): PersistedProposal {
  const proposals = repo.listProposals(workspaceId, undefined, 10000);
  const proposal = proposals.find((p) => p.id === proposalId);
  if (!proposal) {
    throw new Error(`Proposal ${proposalId} not found.`);
  }

  if (!canTransitionProposalStatus(proposal.status, decision)) {
    throw new Error(`Cannot transition proposal from ${proposal.status} to ${decision}.`);
  }

  const decidedAt = new Date().toISOString();
  repo.updateProposalStatus(proposalId, decision, decidedAt);
  return { ...proposal, status: decision, decidedAt };
}
