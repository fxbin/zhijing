/**
 * 产物（Artifact）与导出类型。
 *
 * 包含 Agent 任务记录、产物记录、产物分节与版本、导出格式与记录、
 * 云备份占位与保存的筛选器。产物是 AI 生成的结构化输出（摘要、研究报告等）。
 *
 * @author fxbin
 */

import type { TaskStatus } from './enums.js';

export interface AgentTask {
  id: string;
  workflow: 'create_workspace' | 'ingest_material' | 'answer_question' | 'parse_material' | 'run_kit';
  status: TaskStatus;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export type ArtifactSubtype =
  | 'deep_research'
  | 'product'
  | 'topic'
  | 'xiaohongshu'
  | 'summary';

export interface ArtifactRecord {
  id: string;
  workspaceId?: string;
  artifactType: 'summary' | 'research_report' | 'cards' | 'kit_report';
  subtype: ArtifactSubtype;
  title: string;
  body: string;
  sourceMaterialIds: string[];
  createdAt: string;
  sections?: ArtifactSection[];
}

export interface ArtifactSection {
  id: string;
  title: string;
  body: string;
  updatedAt: string;
}

export type ArtifactRevisionField = 'title' | 'body';

export interface ArtifactRevision {
  id: string;
  artifactId: string;
  version: number;
  sectionId: string;
  sectionTitleSnapshot: string;
  sectionBodySnapshot: string;
  changedFields: ArtifactRevisionField[];
  createdAt: string;
}

export interface ArtifactSectionInit {
  title: string;
  body: string;
}

export interface ArtifactSectionEdit {
  title?: string;
  body?: string;
}

export interface ArtifactSectionEditResult {
  artifact: ArtifactRecord;
  revision?: ArtifactRevision;
}

export type ExportFormat = 'markdown' | 'json' | 'pdf';

export type ExportScope = 'all' | 'materials' | 'cards';

export interface ExportRecord {
  id: string;
  workspaceId?: string;
  format: ExportFormat;
  scope: ExportScope;
  includeArtifacts: boolean;
  materialCount: number;
  cardCount: number;
  artifactCount: number;
  filename: string;
  createdAt: string;
}

export interface CloudBackupStub {
  status: 'not_implemented';
  decision: 'local_first';
  reason: string;
  plannedFor: string | null;
}

export type SavedFilterScope = 'assets' | 'compare';

export interface SavedFilter {
  id: string;
  scope: SavedFilterScope;
  cardType: string | null;
  claimStatus: string | null;
  sortKey: string;
  keyword: string;
  updatedAt: string;
}
