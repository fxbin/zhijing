/**
 * 资料与知识库 Kit 类型。
 *
 * 包含资料记录、转写状态、资料分配与审查请求/结果、知识库 Kit 运行请求与结果。
 * MaterialStatusTimeline 是资料状态变更的时间线记录。
 *
 * @author fxbin
 */

import type { MaterialType, ParseStatus, KnowledgeKitId } from './enums.js';
import type { MaterialCursor, MaterialQueryOptions, MaterialQueryResult } from './common.js';
import type { WorkspaceSummary } from './workspace.js';
import type { KnowledgeCard } from './card.js';
import type { AgentTask, ArtifactRecord } from './artifact.js';

export interface MaterialStatusTimeline {
  capturedAt?: string;
  queuedAt?: string;
  parsingAt?: string;
  reviewedAt?: string;
  ingestedAt?: string;
  failedAt?: string;
}

export interface MaterialRecord {
  id: string;
  workspaceId?: string;
  type: MaterialType;
  rawInput: string;
  sourceUrl?: string;
  platform?: string;
  title: string;
  contentText?: string;
  mediaUrls?: string[];
  parseStatus: ParseStatus;
  parseError?: string;
  transcript?: string;
  transcriptStatus?: MaterialTranscriptStatus;
  transcriptError?: string;
  createdAt: string;
  statusTimeline?: MaterialStatusTimeline;
  archived?: boolean;
}

export type MaterialTranscriptStatus = 'pending' | 'done' | 'failed' | 'skipped';

export interface AssignMaterialRequest {
  workspaceId?: string;
  newWorkspaceTitle?: string;
}

export interface CompleteMaterialReviewRequest {
  title?: string;
  contentText?: string;
  mediaUrls?: string[];
  markIngested?: boolean;
}

export interface MaterialAssignmentResult {
  material: MaterialRecord;
  workspace: WorkspaceSummary;
  previousWorkspaceId: string;
  message: string;
}

export interface MaterialAssignmentSuggestion {
  workspaceId?: string;
  title: string;
  score: number;
  reason: string;
  isNew?: boolean;
}

export interface MaterialAssignmentSuggestionsResult {
  material: MaterialRecord;
  suggestions: MaterialAssignmentSuggestion[];
  message: string;
}

export interface MaterialReviewResult {
  material: MaterialRecord;
  workspace: WorkspaceSummary;
  task?: AgentTask;
  cards?: KnowledgeCard[];
  artifact?: ArtifactRecord;
  message: string;
}

export interface RunKnowledgeKitRequest {
  kitId?: KnowledgeKitId;
}

export interface KnowledgeKitRunResult {
  workspace: WorkspaceSummary;
  artifact: ArtifactRecord;
  task: AgentTask;
  message: string;
}

export type { MaterialCursor, MaterialQueryOptions, MaterialQueryResult };
