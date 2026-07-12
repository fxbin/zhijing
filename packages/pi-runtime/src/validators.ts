/**
 * 结构化输出校验模块。
 *
 * 对 LLM 返回的结构化 JSON 产物做运行时校验：卡片字段、实体类型、
 * 苏格拉底追问、artifact subtype 产物等。校验失败抛 StructuredOutputValidationError。
 *
 * @module validators
 * @author fxbin
 */
import type { StructuredGenerationTask } from './types.js';
import { ARTIFACT_SUBTYPE_LIST, type ArtifactSubtype } from './schemas.js';

export class StructuredOutputValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StructuredOutputValidationError';
  }
}

export function validateStructuredOutput(task: StructuredGenerationTask, output: unknown): void {
  const value = requirePlainObject(output, task);

  if (task === 'workspace_skeleton') {
    requireNonEmptyString(value.title, `${task}.title`);
    requireNonEmptyString(value.summary, `${task}.summary`);
    validateCards(value.cards, `${task}.cards`);
    validateOptionalString(value.artifactTitle, `${task}.artifactTitle`);
    validateOptionalString(value.artifactBody, `${task}.artifactBody`);
    return;
  }

  if (task === 'material_summary' || task === 'question_answer') {
    requireNonEmptyString(value.summary, `${task}.summary`);
    validateCards(value.cards, `${task}.cards`);
    validateOptionalString(value.artifactTitle, `${task}.artifactTitle`);
    validateOptionalString(value.artifactBody, `${task}.artifactBody`);
    validateOptionalCitationScope(value.citationScope, `${task}.citationScope`);
    return;
  }

  if (task === 'entity_extraction') {
    validateEntities(value.entities, `${task}.entities`);
    return;
  }

  if (task === 'socratic_questioning') {
    validateSocraticQuestions(value.questions, `${task}.questions`);
    return;
  }

  validateCards(value.cards, `${task}.cards`);
}

/**
 * 苏格拉底追问问题类型白名单。
 */
const ALLOWED_SOCRATIC_TYPES = new Set([
  'definition_clarity',
  'evidence_probe',
  'counterexample_challenge',
  'boundary_probe',
  'connection_probe',
]);

/**
 * 校验苏格拉底追问问题数组。
 *
 * 铁律：只校验 question/type/rationale 字段，绝不接受 answer 字段。
 * 若问题数组为空或字段不合规，抛出 StructuredOutputValidationError。
 *
 * @author fxbin
 */
function validateSocraticQuestions(value: unknown, path: string): void {
  if (!Array.isArray(value)) {
    throw new StructuredOutputValidationError(`${path} must be an array of questions.`);
  }
  if (value.length === 0) {
    throw new StructuredOutputValidationError(`${path} must contain at least one question.`);
  }
  value.forEach((item, index) => {
    const question = requirePlainObject(item, `${path}[${index}]`);
    requireNonEmptyString(question.question, `${path}[${index}].question`);
    requireNonEmptyString(question.rationale, `${path}[${index}].rationale`);
    if (typeof question.type !== 'string' || !ALLOWED_SOCRATIC_TYPES.has(question.type)) {
      throw new StructuredOutputValidationError(`${path}[${index}].type must be one of the supported socratic question types.`);
    }
    if (question.targetCardId !== undefined && typeof question.targetCardId !== 'string') {
      throw new StructuredOutputValidationError(`${path}[${index}].targetCardId must be a string when present.`);
    }
  });
}

const allowedEntityTypes = new Set(['person', 'organization', 'concept', 'tool', 'place', 'event', 'other']);

function validateEntities(value: unknown, path: string): void {
  if (!Array.isArray(value)) {
    throw new StructuredOutputValidationError(`${path} must be an array of entities.`);
  }
  if (value.length === 0) {
    throw new StructuredOutputValidationError(`${path} must contain at least one entity.`);
  }
  value.forEach((entity, index) => validateEntity(entity, `${path}[${index}]`));
}

function validateEntity(value: unknown, path: string): void {
  const entity = requirePlainObject(value, path);
  requireNonEmptyString(entity.name, `${path}.name`);
  requireNonEmptyString(entity.description, `${path}.description`);
  if (entity.type !== undefined && (typeof entity.type !== 'string' || !allowedEntityTypes.has(entity.type))) {
    throw new StructuredOutputValidationError(`${path}.type must be one of the supported entity types.`);
  }
}

export function validateArtifactSubtypeOutput(subtype: ArtifactSubtype, output: unknown): void {
  if (!ARTIFACT_SUBTYPE_LIST.includes(subtype)) {
    throw new StructuredOutputValidationError(`Unknown artifact subtype: ${String(subtype)}`);
  }
  const value = requirePlainObject(output, subtype);
  requireNonEmptyString(value.summary, `${subtype}.summary`);
  validateSections(value.sections, `${subtype}.sections`);

  if (subtype === 'summary') {
    validateOptionalStringArray(value.followUpQuestions, `${subtype}.followUpQuestions`);
    return;
  }
  if (subtype === 'topic' || subtype === 'deep_research') {
    validateOptionalStringArray(value.openQuestions, `${subtype}.openQuestions`);
    if (subtype === 'deep_research') {
      validateOptionalSections(value.references, `${subtype}.references`);
    }
    return;
  }
  if (subtype === 'product') {
    validateOptionalSections(value.accountDiagnosis, `${subtype}.accountDiagnosis`);
    validateOptionalSections(value.alternatives, `${subtype}.alternatives`);
    return;
  }
  validateOptionalSections(value.publishingQueue, `${subtype}.publishingQueue`);
  validateOptionalSection(value.accountStrategy, `${subtype}.accountStrategy`);
}

function validateSections(value: unknown, path: string): void {
  if (!Array.isArray(value) || value.length === 0) {
    throw new StructuredOutputValidationError(`${path} must contain at least one section.`);
  }
  value.forEach((section, index) => validateSection(section, `${path}[${index}]`));
}

function validateOptionalSections(value: unknown, path: string): void {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    throw new StructuredOutputValidationError(`${path} must be an array.`);
  }
  value.forEach((section, index) => validateSection(section, `${path}[${index}]`));
}

function validateOptionalSection(value: unknown, path: string): void {
  if (value === undefined) return;
  validateSection(value, path);
}

function validateSection(value: unknown, path: string): void {
  const section = requirePlainObject(value, path);
  requireNonEmptyString(section.title, `${path}.title`);
  requireNonEmptyString(section.body, `${path}.body`);
}

function validateOptionalStringArray(value: unknown, path: string): void {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    throw new StructuredOutputValidationError(`${path} must be an array of strings.`);
  }
  value.forEach((item, index) => requireNonEmptyString(item, `${path}[${index}]`));
}

const allowedCardTypes = new Set(['concept', 'method', 'case', 'question', 'step', 'viewpoint']);

function requirePlainObject(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new StructuredOutputValidationError(`${path} must be a JSON object.`);
  }
  return value as Record<string, unknown>;
}

function validateCards(value: unknown, path: string): void {
  if (!Array.isArray(value) || value.length === 0) {
    throw new StructuredOutputValidationError(`${path} must contain at least one card.`);
  }
  value.forEach((card, index) => validateCard(card, `${path}[${index}]`));
}

function validateCard(value: unknown, path: string): void {
  const card = requirePlainObject(value, path);
  requireNonEmptyString(card.title, `${path}.title`);
  requireNonEmptyString(card.body, `${path}.body`);
  if (card.type !== undefined && (typeof card.type !== 'string' || !allowedCardTypes.has(card.type))) {
    throw new StructuredOutputValidationError(`${path}.type must be one of the supported card types.`);
  }
  validateOptionalCitationScope(card.citationScope, `${path}.citationScope`);
}

function validateOptionalCitationScope(value: unknown, path: string): void {
  if (value === undefined) return;
  const citation = requirePlainObject(value, path);
  validateOptionalString(citation.materialId, `${path}.materialId`);
  validateOptionalString(citation.sourceUrl, `${path}.sourceUrl`);
  validateOptionalString(citation.quote, `${path}.quote`);
  validateOptionalString(citation.note, `${path}.note`);
}

function validateOptionalString(value: unknown, path: string): void {
  if (value === undefined) return;
  requireNonEmptyString(value, path);
}

function requireNonEmptyString(value: unknown, path: string): void {
  if (typeof value !== 'string' || !value.trim()) {
    throw new StructuredOutputValidationError(`${path} must be a non-empty string.`);
  }
}
