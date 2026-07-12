/**
 * 工作区与统计类型。
 *
 * 包含工作区摘要、详情、分析统计、归档操作结果。
 * 工作区是知径的一级组织单元，承载资料、卡片与产物。
 *
 * @author fxbin
 */

import type { WorkspaceStage } from './enums.js';
import type { MaterialRecord } from './material.js';
import type { KnowledgeCard } from './card.js';
import type { ArtifactRecord } from './artifact.js';

export interface WorkspaceSummary {
  id: string;
  title: string;
  summary: string;
  stage: WorkspaceStage;
  sourceCount: number;
  cardCount: number;
  sourcedRatio: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceDetail extends WorkspaceSummary {
  materials: MaterialRecord[];
  cards: KnowledgeCard[];
  artifacts: ArtifactRecord[];
}

/**
 * 单条归档操作结果。
 * @author fxbin
 */
export interface ArchiveItemResult {
  id: string;
  workspaceId?: string;
  kind: 'material' | 'card';
  archived: boolean;
}

/**
 * 归档列表聚合结果。
 * @author fxbin
 */
export interface ArchivedItemsResult {
  materials: MaterialRecord[];
  cards: KnowledgeCard[];
  workspaces: WorkspaceSummary[];
}

export interface AnalyticsDistributionItem {
  name: string;
  count: number;
}

export interface AnalyticsExportRow {
  section: string;
  label: string;
  value: string;
}

export interface WorkspaceAnalytics {
  workspaceId: string;
  generatedAt: string;
  totals: {
    materials: number;
    cards: number;
    sourcedCards: number;
    aiSkeletonCards: number;
    artifacts: number;
    tasks: number;
  };
  sourcedRatio: number;
  platformDistribution: AnalyticsDistributionItem[];
  materialStatusDistribution: AnalyticsDistributionItem[];
  cardTypeDistribution: AnalyticsDistributionItem[];
  taskStatusDistribution: AnalyticsDistributionItem[];
  exportRows: AnalyticsExportRow[];
}
