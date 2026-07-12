/**
 * 知识卡片类型。
 *
 * 包含卡片回忆、知识卡片主体、卡片修订与被拒绝提议卡片特征。
 * 卡片是知径的核心知识单元，分为 concept / method / case / question / step / viewpoint 六类。
 *
 * @author fxbin
 */

import type { CardType, ClaimStatus } from './enums.js';

export interface CardRecall {
  dueAt: string;
  ease: number;
  interval: number;
  reviewedAt?: string;
}

export type RecallGrade = 'again' | 'hard' | 'good' | 'easy';

export interface KnowledgeCard {
  id: string;
  workspaceId?: string;
  materialId?: string;
  type: CardType;
  title: string;
  body: string;
  claimStatus: ClaimStatus;
  recall?: CardRecall;
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
}

export type CardRevisionField = 'title' | 'body' | 'type' | 'claimStatus';

export interface CardRevision {
  id: string;
  cardId: string;
  version: number;
  titleSnapshot: string;
  bodySnapshot: string;
  typeSnapshot: CardType;
  claimStatusSnapshot: ClaimStatus;
  changedFields: CardRevisionField[];
  createdAt: string;
}

/**
 * 被拒绝提议卡片的特征偏移。
 *
 * 用于下一轮 socraticQuestioning 注入 negative example，
 * 让 Agent 不再产生类似 rejected 的提问。
 *
 * @author fxbin
 */
export interface RejectedCardFeature {
  /** 卡片类型偏移 */
  type: string;
  /** 标题前缀（前 20 字符，作为聚合维度） */
  titlePrefix: string;
  /** 出现次数 */
  count: number;
}
