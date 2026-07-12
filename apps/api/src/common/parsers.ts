import type {
  KnowledgeKitId,
  MaterialType,
  ParseStatus,
  SocraticTrigger,
} from '@zhijing/shared';
import {
  INTAKE_AUDIENCE_VALUES,
  INTAKE_DEPTH_VALUES,
  INTAKE_SCOPE_VALUES,
  AGENT_TASK_TYPE_VALUES,
  USER_MEMORY_SCOPE_VALUES,
  USER_MEMORY_SOURCE_VALUES,
  DECISION_LOG_KIND_VALUES,
} from '@zhijing/shared';

export const INTAKE_AUDIENCE_SET = new Set<string>(INTAKE_AUDIENCE_VALUES);
export const INTAKE_DEPTH_SET = new Set<string>(INTAKE_DEPTH_VALUES);
export const INTAKE_SCOPE_SET = new Set<string>(INTAKE_SCOPE_VALUES);

export const SOCRATIC_TRIGGER_VALUES: readonly SocraticTrigger[] = ['skeleton_card', 'semantic_tension', 'manual'];
export const SOCRATIC_TRIGGER_SET = new Set<string>(SOCRATIC_TRIGGER_VALUES);

export const AGENT_TASK_TYPE_SET = new Set<string>(AGENT_TASK_TYPE_VALUES);
export const USER_MEMORY_SCOPE_SET = new Set<string>(USER_MEMORY_SCOPE_VALUES);
export const USER_MEMORY_SOURCE_SET = new Set<string>(USER_MEMORY_SOURCE_VALUES);
export const DECISION_LOG_KIND_SET = new Set<string>(DECISION_LOG_KIND_VALUES);

const materialTypes = new Set<MaterialType>(['link', 'text', 'question', 'topic']);
const parseStatuses = new Set<ParseStatus>(['saved', 'parsing', 'needs_review', 'ingested', 'failed']);
const knowledgeKitIds = new Set<KnowledgeKitId>(['learning_research', 'content_creation', 'product_research', 'topic_decomposition']);

export function parseMaterialType(value: string | undefined) {
  return value && materialTypes.has(value as MaterialType) ? value as MaterialType : undefined;
}

export function parseStatus(value: string | undefined) {
  return value && parseStatuses.has(value as ParseStatus) ? value as ParseStatus : undefined;
}

export function parseKitId(value: string | undefined) {
  return value && knowledgeKitIds.has(value as KnowledgeKitId) ? value as KnowledgeKitId : 'learning_research';
}

export function parseLimit(value: string | undefined) {
  if (!value) return 120;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 120;
  return Math.max(1, Math.min(parsed, 300));
}
