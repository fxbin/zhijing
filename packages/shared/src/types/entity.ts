/**
 * 实体与冲突类型。
 *
 * 包含知识实体定义、冲突检测与解决相关类型，
 * 以及知识引用（citation）结构。
 *
 * @author fxbin
 */

export type EntityType = 'person' | 'organization' | 'concept' | 'tool' | 'place' | 'event' | 'other';

export interface Entity {
  id: string;
  workspaceId?: string;
  name: string;
  type: EntityType;
  description: string;
  sourceCardIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ExtractedEntitySeed {
  name: string;
  type: EntityType;
  description: string;
}

export type ConflictKind = 'duplicate_card' | 'duplicate_material' | 'semantic_tension';

export type ConflictResolutionAction = 'merge' | 'delete';

export interface ConflictGroupItem {
  id: string;
  workspaceId?: string;
  title: string;
  meta: string;
}

export interface ConflictGroup {
  kind: ConflictKind;
  key: string;
  title: string;
  items: ConflictGroupItem[];
}

export interface ConflictAuditEntry {
  id: string;
  kind: ConflictKind;
  action: ConflictResolutionAction;
  keepId: string;
  dropIds: string[];
  workspaceId?: string;
  note: string;
  createdAt: string;
}

export interface ConflictResolutionRequest {
  kind: ConflictKind;
  keepId: string;
  dropIds: string[];
}

export interface KnowledgeCitation {
  id: string;
  kind: 'material' | 'card';
  title: string;
  preview: string;
  sourceUrl?: string;
  materialId?: string;
  cardId?: string;
}
