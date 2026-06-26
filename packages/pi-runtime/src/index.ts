import {
  complete,
  getEnvApiKey,
  getModel,
  getModels,
  getProviders,
  stream,
  Type,
  type Api,
  type AssistantMessage,
  type Context,
  type KnownProvider,
  type Model,
  type TSchema,
  type Tool,
  type ToolCall,
} from '@earendil-works/pi-ai';

export { Type };
export type { KnownProvider, TSchema, Tool };

export const citationScopeSchema = Type.Object({
  materialId: Type.Optional(Type.String()),
  sourceUrl: Type.Optional(Type.String()),
  quote: Type.Optional(Type.String()),
  note: Type.Optional(Type.String()),
});

export const knowledgeCardSchema = Type.Object({
  type: Type.Optional(Type.Union([
    Type.Literal('concept'),
    Type.Literal('method'),
    Type.Literal('case'),
    Type.Literal('question'),
    Type.Literal('step'),
    Type.Literal('viewpoint'),
  ])),
  title: Type.String(),
  body: Type.String(),
  citationScope: Type.Optional(citationScopeSchema),
});

export const knowledgeCardsSchema = Type.Object({
  cards: Type.Array(knowledgeCardSchema),
});

export const topicSkeletonSchema = Type.Object({
  title: Type.String(),
  summary: Type.String(),
  cards: Type.Array(knowledgeCardSchema),
  artifactTitle: Type.Optional(Type.String()),
  artifactBody: Type.Optional(Type.String()),
});

export const materialSummarySchema = Type.Object({
  summary: Type.String(),
  cards: Type.Array(knowledgeCardSchema),
  artifactTitle: Type.Optional(Type.String()),
  artifactBody: Type.Optional(Type.String()),
  citationScope: Type.Optional(citationScopeSchema),
});

export const questionAnswerSchema = Type.Object({
  summary: Type.String(),
  cards: Type.Array(knowledgeCardSchema),
  artifactTitle: Type.Optional(Type.String()),
  artifactBody: Type.Optional(Type.String()),
  citationScope: Type.Optional(citationScopeSchema),
});

export const entityExtractionSchema = Type.Object({
  entities: Type.Array(Type.Object({
    name: Type.String(),
    type: Type.Union([
      Type.Literal('person'),
      Type.Literal('organization'),
      Type.Literal('concept'),
      Type.Literal('tool'),
      Type.Literal('place'),
      Type.Literal('event'),
      Type.Literal('other'),
    ]),
    description: Type.String(),
  })),
});

/**
 * 苏格拉底追问 schema（P11-2）。
 *
 * 铁律：只包含 questions 字段，绝不包含 answer 字段。
 * Agent 只生成提问，不生成答案，避免替代用户建构认知。
 *
 * @author fxbin
 */
export const socraticQuestioningSchema = Type.Object({
  questions: Type.Array(Type.Object({
    question: Type.String(),
    type: Type.Union([
      Type.Literal('definition_clarity'),
      Type.Literal('evidence_probe'),
      Type.Literal('counterexample_challenge'),
      Type.Literal('boundary_probe'),
      Type.Literal('connection_probe'),
    ]),
    rationale: Type.String(),
    targetCardId: Type.Optional(Type.String()),
  })),
});

export const structuredSchemas = {
  workspace_skeleton: topicSkeletonSchema,
  material_summary: materialSummarySchema,
  knowledge_cards: knowledgeCardsSchema,
  question_answer: questionAnswerSchema,
  entity_extraction: entityExtractionSchema,
  socratic_questioning: socraticQuestioningSchema,
} as const;

const artifactSectionSchema = Type.Object({
  title: Type.String(),
  body: Type.String(),
});

export const artifactSubtypeSchemas = {
  summary: Type.Object({
    summary: Type.String(),
    sections: Type.Array(artifactSectionSchema),
    followUpQuestions: Type.Optional(Type.Array(Type.String())),
  }),
  deep_research: Type.Object({
    summary: Type.String(),
    sections: Type.Array(artifactSectionSchema),
    openQuestions: Type.Optional(Type.Array(Type.String())),
    references: Type.Optional(Type.Array(artifactSectionSchema)),
  }),
  product: Type.Object({
    summary: Type.String(),
    sections: Type.Array(artifactSectionSchema),
    accountDiagnosis: Type.Optional(Type.Array(artifactSectionSchema)),
    alternatives: Type.Optional(Type.Array(artifactSectionSchema)),
  }),
  xiaohongshu: Type.Object({
    summary: Type.String(),
    sections: Type.Array(artifactSectionSchema),
    publishingQueue: Type.Optional(Type.Array(artifactSectionSchema)),
    accountStrategy: Type.Optional(artifactSectionSchema),
  }),
  topic: Type.Object({
    summary: Type.String(),
    sections: Type.Array(artifactSectionSchema),
    openQuestions: Type.Optional(Type.Array(Type.String())),
  }),
} as const;

export type ArtifactSubtype = keyof typeof artifactSubtypeSchemas;

const ARTIFACT_SUBTYPE_LIST = Object.keys(artifactSubtypeSchemas) as ArtifactSubtype[];

export interface StructuredGenerationRequest<TSchemaInput = unknown> {
  task: 'workspace_skeleton' | 'material_summary' | 'knowledge_cards' | 'question_answer' | 'entity_extraction' | 'socratic_questioning';
  prompt: string;
  schema?: TSchemaInput;
  context?: Record<string, unknown>;
}

type StructuredGenerationTask = StructuredGenerationRequest['task'];

export interface StructuredGenerationResult<TOutput = unknown> {
  output: TOutput;
  provider: 'mock' | 'pi-ai';
  model?: string;
  fallbackReason?: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    costUsd?: number;
  };
}

export interface TextGenerationResult {
  text: string;
  provider: 'mock' | 'pi-ai';
  model?: string;
  fallbackReason?: string;
  usage?: StructuredGenerationResult['usage'];
}

export interface TextGenerationRequest {
  prompt: string;
  context?: Record<string, unknown>;
}

export interface ToolCallingRequest {
  prompt: string;
  tools: Tool[];
  context?: Record<string, unknown>;
}

export interface ToolCallingResult {
  toolCalls: ToolCall[];
  text: string;
  provider: 'mock' | 'pi-ai';
  model?: string;
  fallbackReason?: string;
  usage?: StructuredGenerationResult['usage'];
}

export interface PiRuntime {
  completeStructured<TOutput = unknown, TSchemaInput = unknown>(
    request: StructuredGenerationRequest<TSchemaInput>,
  ): Promise<StructuredGenerationResult<TOutput>>;
  streamText(request: TextGenerationRequest): AsyncIterable<TextGenerationResult>;
  runToolCalling(request: ToolCallingRequest): Promise<ToolCallingResult>;
}

export interface PiAiRuntimeConfig {
  provider?: KnownProvider;
  model?: string;
  apiKey?: string;
  enabled?: boolean;
  fallbackToMock?: boolean;
  temperature?: number;
  maxTokens?: number;
}

const defaultProvider: KnownProvider = 'deepseek';
const defaultModel = 'deepseek-v4-flash';

export function getDefaultPiProvider() {
  return defaultProvider;
}

export function getDefaultPiModel() {
  return defaultModel;
}

export function getKnownPiProviders() {
  return getProviders();
}

export function getKnownPiModels(provider: KnownProvider) {
  return getModels(provider).map((model) => ({
    id: model.id,
  }));
}

export function getPiEnvApiKey(provider: KnownProvider) {
  return getEnvApiKey(provider);
}

export function isKnownPiProvider(provider: string): provider is KnownProvider {
  return getKnownPiProviders().includes(provider as KnownProvider);
}

export function createMockPiRuntime(): PiRuntime {
  return {
    async completeStructured<TOutput>(request: StructuredGenerationRequest): Promise<StructuredGenerationResult<TOutput>> {
      const output = mockOutputFor(request);
      validateStructuredOutput(request.task, output);
      return {
        provider: 'mock',
        model: 'mock-local',
        output: output as TOutput,
        usage: {
          inputTokens: request.prompt.length,
          outputTokens: 96,
          costUsd: 0,
        },
      };
    },
    async *streamText(request: TextGenerationRequest): AsyncIterable<TextGenerationResult> {
      yield {
        provider: 'mock',
        model: 'mock-local',
        text: `本地 mock 文本生成：${compactTitle(request.prompt)}`,
        usage: {
          inputTokens: request.prompt.length,
          outputTokens: 32,
          costUsd: 0,
        },
      };
    },
    async runToolCalling(request: ToolCallingRequest): Promise<ToolCallingResult> {
      return {
        provider: 'mock',
        model: 'mock-local',
        text: '本地 mock tool calling 未调用外部工具。',
        toolCalls: [],
        usage: {
          inputTokens: request.prompt.length,
          outputTokens: 24,
          costUsd: 0,
        },
      };
    },
  };
}

export function createPiAiRuntime(config: PiAiRuntimeConfig = {}): PiRuntime {
  const fallback = createMockPiRuntime();
  const provider = config.provider ?? defaultProvider;
  const modelId = config.model ?? defaultModel;
  const apiKey = config.apiKey ?? getEnvApiKey(provider);
  const fallbackToMock = config.fallbackToMock ?? true;
  const enabled = config.enabled ?? Boolean(apiKey);

  return {
    async completeStructured<TOutput, TSchemaInput>(
      request: StructuredGenerationRequest<TSchemaInput>,
    ): Promise<StructuredGenerationResult<TOutput>> {
      if (!enabled) {
        return withFallbackReason(await fallback.completeStructured<TOutput>(request), 'Pi runtime is not enabled or no provider API key was found.');
      }

      try {
        const model = getConfiguredModel(provider, modelId);
        const response = await complete(model, buildContext(request), {
          apiKey,
          temperature: config.temperature ?? 0.2,
          maxTokens: config.maxTokens ?? 1200,
        });
        const output = parseStructuredJson<TOutput>(response);
        validateStructuredOutput(request.task, output);
        return {
          provider: 'pi-ai',
          model: `${provider}/${modelId}`,
          output,
          usage: {
            inputTokens: response.usage.input,
            outputTokens: response.usage.output,
            costUsd: response.usage.cost.total,
          },
        };
      } catch (error) {
        if (!fallbackToMock) throw error;
        return withFallbackReason(await fallback.completeStructured<TOutput>(request), error instanceof Error ? error.message : 'Pi runtime failed.');
      }
    },
    async *streamText(request: TextGenerationRequest): AsyncIterable<TextGenerationResult> {
      if (!enabled) {
        for await (const chunk of fallback.streamText(request)) {
          yield {
            ...chunk,
            fallbackReason: 'Pi runtime is not enabled or no provider API key was found.',
          };
        }
        return;
      }

      try {
        const model = getConfiguredModel(provider, modelId);
        const context = buildTextContext(request);
        const eventStream = stream(model, context, {
          apiKey,
          temperature: config.temperature ?? 0.2,
          maxTokens: config.maxTokens ?? 1200,
        });
        for await (const event of eventStream) {
          if (event.type === 'text_delta') {
            yield {
              provider: 'pi-ai',
              model: `${provider}/${modelId}`,
              text: event.delta,
            };
          }
          if (event.type === 'done') {
            yield {
              provider: 'pi-ai',
              model: `${provider}/${modelId}`,
              text: '',
              usage: usageFromMessage(event.message),
            };
          }
        }
      } catch (error) {
        if (!fallbackToMock) throw error;
        for await (const chunk of fallback.streamText(request)) {
          yield {
            ...chunk,
            fallbackReason: error instanceof Error ? error.message : 'Pi runtime stream failed.',
          };
        }
      }
    },
    async runToolCalling(request: ToolCallingRequest): Promise<ToolCallingResult> {
      if (!enabled) {
        return withReason(await fallback.runToolCalling(request), 'Pi runtime is not enabled or no provider API key was found.');
      }

      try {
        const model = getConfiguredModel(provider, modelId);
        const response = await complete(model, buildToolContext(request), {
          apiKey,
          temperature: config.temperature ?? 0.2,
          maxTokens: config.maxTokens ?? 1200,
        });
        return {
          provider: 'pi-ai',
          model: `${provider}/${modelId}`,
          text: textFromMessage(response),
          toolCalls: response.content.filter((block): block is ToolCall => block.type === 'toolCall'),
          usage: usageFromMessage(response),
        };
      } catch (error) {
        if (!fallbackToMock) throw error;
        return withReason(await fallback.runToolCalling(request), error instanceof Error ? error.message : 'Pi runtime tool calling failed.');
      }
    },
  };
}

export function createConfiguredPiRuntime(): PiRuntime {
  const provider = (process.env.ZHIJING_PI_PROVIDER as KnownProvider | undefined) ?? defaultProvider;
  return createPiAiRuntime({
    provider,
    model: process.env.ZHIJING_PI_MODEL ?? defaultModel,
    apiKey: process.env.ZHIJING_PI_API_KEY ?? getEnvApiKey(provider),
    enabled: process.env.ZHIJING_PI_ENABLED === '1' ? true : undefined,
    fallbackToMock: process.env.ZHIJING_PI_FALLBACK === '0' ? false : true,
  });
}

export {
  routeProvider,
  createRoutedPiRuntime,
  DEFAULT_ROUTES,
} from './router.js';
export type { ProviderRoute, RouteResolution, AgentTaskType, ProviderRole } from '@zhijing/shared';

export {
  createInstrumentedPiRuntime,
  type UsageRecorder,
  type InstrumentedRuntimeOptions,
} from './instrumented.js';

function getConfiguredModel(provider: KnownProvider, modelId: string): Model<Api> {
  return getModel(provider, modelId as never) as Model<Api>;
}

function buildContext(request: StructuredGenerationRequest): Context {
  const schema = request.schema ? `\nJSON schema:\n${JSON.stringify(request.schema, null, 2)}` : '';
  const extraContext = request.context ? `\nContext:\n${JSON.stringify(request.context, null, 2)}` : '';
  return {
    systemPrompt: [
      'You are the structured generation runtime for Zhijing, a personal knowledge-base workbench.',
      'Return only valid JSON. Do not wrap the JSON in Markdown. Do not include commentary.',
      'Preserve provenance boundaries: use ai_skeleton for unsourced topic scaffolds and sourced only when source material is provided.',
    ].join('\n'),
    messages: [
      {
        role: 'user',
        timestamp: Date.now(),
        content: [
          `Task: ${request.task}`,
          `Prompt:\n${request.prompt}`,
          schema,
          extraContext,
        ].join('\n'),
      },
    ],
  };
}

function buildTextContext(request: TextGenerationRequest): Context {
  const extraContext = request.context ? `\nContext:\n${JSON.stringify(request.context, null, 2)}` : '';
  return {
    systemPrompt: 'You are the text generation runtime for Zhijing. Keep answers concise and practical.',
    messages: [
      {
        role: 'user',
        timestamp: Date.now(),
        content: [`Prompt:\n${request.prompt}`, extraContext].join('\n'),
      },
    ],
  };
}

function buildToolContext(request: ToolCallingRequest): Context {
  const extraContext = request.context ? `\nContext:\n${JSON.stringify(request.context, null, 2)}` : '';
  return {
    systemPrompt: [
      'You are the controlled tool-calling runtime for Zhijing.',
      'Only call the supplied tools when they are necessary. Do not request shell or filesystem access.',
    ].join('\n'),
    tools: request.tools,
    messages: [
      {
        role: 'user',
        timestamp: Date.now(),
        content: [`Prompt:\n${request.prompt}`, extraContext].join('\n'),
      },
    ],
  };
}

function parseStructuredJson<TOutput>(response: AssistantMessage): TOutput {
  const text = textFromMessage(response);
  const json = extractJson(text);
  return normalizeStructuredJson(JSON.parse(json)) as TOutput;
}

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

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const objectStart = text.indexOf('{');
  const objectEnd = text.lastIndexOf('}');
  if (objectStart >= 0 && objectEnd > objectStart) {
    return text.slice(objectStart, objectEnd + 1);
  }

  const arrayStart = text.indexOf('[');
  const arrayEnd = text.lastIndexOf(']');
  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    return text.slice(arrayStart, arrayEnd + 1);
  }

  throw new Error('Pi response did not contain a JSON object.');
}

function normalizeStructuredJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeStructuredJson);
  }

  if (!value || typeof value !== 'object') {
    return typeof value === 'string' ? value.trim() : value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .map(([key, item]) => [key, normalizeStructuredJson(item)] as const)
      .filter(([, item]) => !(typeof item === 'string' && item.length === 0)),
  );
}

function withFallbackReason<TOutput>(
  result: StructuredGenerationResult<TOutput>,
  fallbackReason: string,
): StructuredGenerationResult<TOutput> {
  return withReason(result, fallbackReason);
}

function withReason<T extends { fallbackReason?: string }>(result: T, fallbackReason: string): T {
  return {
    ...result,
    fallbackReason,
  };
}

function textFromMessage(response: AssistantMessage) {
  return response.content
    .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();
}

function usageFromMessage(response: AssistantMessage): StructuredGenerationResult['usage'] {
  return {
    inputTokens: response.usage.input,
    outputTokens: response.usage.output,
    costUsd: response.usage.cost.total,
  };
}

function mockOutputFor(request: StructuredGenerationRequest) {
  const title = compactTitle(request.prompt);
  if (request.task === 'workspace_skeleton') {
    return {
      title,
      summary: `围绕「${title}」生成的本地知识库骨架。配置 Pi provider 后会替换为真实结构化生成。`,
      cards: [
        {
          type: 'concept',
          title: `${title} 的核心概念`,
          body: '这是一张本地 mock 骨架卡片，用于先跑通知识库创建闭环。',
        },
        {
          type: 'question',
          title: '下一步要回答的问题',
          body: '这个主题还需要补充哪些高质量来源、案例和可验证证据？',
        },
      ],
      artifactTitle: `${title} 摘要`,
      artifactBody: `已创建「${title}」主题骨架，下一步可以继续导入来源资料。`,
    };
  }

  if (request.task === 'question_answer') {
    return {
      summary: '问题已保存为当前知识库的待回答线索。配置 Pi provider 后会生成真实回答和引用范围。',
      cards: [
        {
          type: 'question',
          title,
          body: '这是一个待回答问题，后续会基于知识库资料生成有引用的回答。',
        },
      ],
      artifactTitle: `${title} 问答线索`,
      artifactBody: '已保存问题，等待后续基于来源资料回答。',
    };
  }

  if (request.task === 'entity_extraction') {
    return {
      entities: [
        { name: `${title} 核心概念`, type: 'concept', description: '从当前知识库卡片中提取的核心概念占位，配置 Pi provider 后会替换为真实实体。' },
        { name: '相关工具', type: 'tool', description: '与该主题相关的工具或平台占位。' },
      ],
    };
  }

  if (request.task === 'socratic_questioning') {
    return {
      questions: [
        {
          question: `「${title}」这个概念的核心边界是什么？哪些情况不属于它的范畴？`,
          type: 'definition_clarity',
          rationale: '骨架卡缺乏明确定义，需要用户澄清概念边界',
        },
        {
          question: `支撑「${title}」这一论断的证据来源是什么？是否可验证？`,
          type: 'evidence_probe',
          rationale: '骨架卡未标注证据来源，需要用户补充可验证依据',
        },
        {
          question: `是否存在与「${title}」相反的案例或反例？这些反例如何解释？`,
          type: 'counterexample_challenge',
          rationale: '引导用户思考反例，避免确认偏误',
        },
      ],
    };
  }

  return {
    summary: '本地 mock 已保存资料并生成初始卡片。配置 Pi provider 后会替换为真实摘要和抽取结果。',
    cards: [
      {
        type: 'concept',
        title: `${title} 的核心概念`,
        body: '从导入资料中提取出的第一张知识卡片，后续会由 Pi 结构化生成替换。',
      },
      {
        type: 'question',
        title: '下一步要回答的问题',
        body: '这份资料还需要补充哪些背景、案例和可验证证据？',
      },
    ],
    artifactTitle: `${title} 摘要`,
    artifactBody: `已保存资料「${title}」，并生成可继续整理的摘要占位。`,
  };
}

export function mockArtifactSubtypeOutput(subtype: ArtifactSubtype, prompt: string): unknown {
  const title = compactTitle(prompt);
  const summary = `${title} 的本地 mock 结构化产物。配置 Pi provider 后会替换为真实生成内容。`;
  const sections = [
    { title: `${title} 核心要点`, body: '这是本地 mock 生成的产物片段，用于先跑通结构化校验与渲染闭环。' },
    { title: '后续补充方向', body: '配置真实 Pi provider 后，该内容会被替换为基于资料的生成结果。' },
  ];

  if (subtype === 'summary') {
    return { summary, sections, followUpQuestions: ['这个主题还需要补充哪些高质量来源？'] };
  }
  if (subtype === 'deep_research') {
    return {
      summary,
      sections,
      openQuestions: ['当前资料是否足以支撑深度结论？'],
      references: [{ title: '参考来源占位', body: '配置真实生成后会回填引用资料。' }],
    };
  }
  if (subtype === 'product') {
    return {
      summary,
      sections,
      accountDiagnosis: [{ title: '账号诊断占位', body: '配置真实生成后会给出账号定位建议。' }],
      alternatives: [{ title: '替代方案占位', body: '配置真实生成后会列出竞品或替代路径。' }],
    };
  }
  if (subtype === 'xiaohongshu') {
    return {
      summary,
      sections,
      publishingQueue: [{ title: '选题占位', body: '配置真实生成后会生成发布队列选题。' }],
      accountStrategy: { title: '账号策略占位', body: '配置真实生成后会给出账号内容策略。' },
    };
  }
  return { summary, sections, openQuestions: ['该主题还有哪些值得展开的方向？'] };
}

const TITLE_PREFIX_PATTERN = /^(我想(?:了解|学习|知道|研究|搞懂|搞清楚|系统学习|知道下)|帮我(?:查|找|了解|整理|总结|看看)|请问|关于|怎么|如何|有没有人|推荐下)\s*(?:一下|关于)?\s*/;
const TITLE_SUFFIX_PUNCT = /[?？!！。.…,，、\s]+$/;
const TITLE_MAX_LENGTH = 32;

/**
 * 从原始文本中提取精炼标题（mock fallback 使用）。
 * 优先取首行，去除常见口语前缀与尾部标点，最后截断到最大长度。
 * @param input - 原始文本
 * @returns 精炼后的标题
 * @author fxbin
 */
function compactTitle(input: string) {
  const firstLine = input.split('\n')[0] ?? input;
  const noPrefix = firstLine.replace(TITLE_PREFIX_PATTERN, '');
  const noSuffix = noPrefix.replace(TITLE_SUFFIX_PUNCT, '');
  const cleaned = noSuffix.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '未命名知识库';
  return cleaned.length > TITLE_MAX_LENGTH ? `${cleaned.slice(0, TITLE_MAX_LENGTH)}...` : cleaned;
}
