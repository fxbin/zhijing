/**
 * 知识地图与学习路径类型。
 *
 * 包含知识地图节点/边/结果、节点位置、自定义边、添加边请求，
 * 以及学习路径步骤与工作区路径。
 *
 * @author fxbin
 */

import type { CardType } from './enums.js';

export type KnowledgeMapNodeKind = 'workspace' | 'material' | 'card';

export interface KnowledgeMapNode {
  id: string;
  kind: KnowledgeMapNodeKind;
  label: string;
  summary?: string;
  status?: string;
  metadata?: Record<string, string | number | boolean | undefined>;
}

export interface KnowledgeMapEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relation: 'contains' | 'source' | 'supports' | 'contradicts' | 'related_to';
  custom?: boolean;
}

export interface KnowledgeMapResult {
  workspaceId: string;
  generatedAt: string;
  nodes: KnowledgeMapNode[];
  edges: KnowledgeMapEdge[];
  nodePositions: KnowledgeMapNodePosition[];
  stats: {
    materials: number;
    cards: number;
    visibleMaterials?: number;
    visibleCards?: number;
    hiddenMaterials?: number;
    hiddenCards?: number;
    sourcedCards: number;
    skeletonCards: number;
    tensionEdges: number;
  };
}

export interface PathStep {
  id: string;
  order: number;
  title: string;
  description: string;
  cardId?: string;
  status: 'completed' | 'current' | 'locked';
  type: CardType | 'general';
}

export interface WorkspacePath {
  workspaceId: string;
  workspaceTitle: string;
  generatedAt: string;
  steps: PathStep[];
  currentStepIndex: number;
  completedCount: number;
}

export interface KnowledgeMapNodePosition {
  nodeId: string;
  x: number;
  y: number;
}

export interface SaveKnowledgeMapNodePositionsRequest {
  positions: KnowledgeMapNodePosition[];
}

/**
 * 自定义地图边（用户手动添加的关系）。
 * @author fxbin
 */
export interface KnowledgeMapCustomEdge {
  id: string;
  workspaceId?: string;
  sourceNodeId: string;
  targetNodeId: string;
  relation: 'supports' | 'contradicts' | 'related_to';
  createdAt: string;
}

/**
 * 添加自定义地图边请求。
 * @author fxbin
 */
export interface AddMapEdgeRequest {
  sourceNodeId: string;
  targetNodeId: string;
  relation: 'supports' | 'contradicts' | 'related_to';
}
