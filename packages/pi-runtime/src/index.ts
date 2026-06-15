import {
  complete,
  getEnvApiKey,
  getModel,
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
export type { TSchema, Tool };

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

export const structuredSchemas = {
  knowledge_base_skeleton: topicSkeletonSchema,
  material_summary: materialSummarySchema,
  knowledge_cards: knowledgeCardsSchema,
  question_answer: questionAnswerSchema,
} as const;

export interface StructuredGenerationRequest<TSchemaInput = unknown> {
  task: 'knowledge_base_skeleton' | 'material_summary' | 'knowledge_cards' | 'question_answer';
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

const defaultProvider: KnownProvider = 'openai';
const defaultModel = 'gpt-4o-mini';

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
  return JSON.parse(json) as TOutput;
}

export class StructuredOutputValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StructuredOutputValidationError';
  }
}

export function validateStructuredOutput(task: StructuredGenerationTask, output: unknown): void {
  const value = requirePlainObject(output, task);

  if (task === 'knowledge_base_skeleton') {
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

  validateCards(value.cards, `${task}.cards`);
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
  if (request.task === 'knowledge_base_skeleton') {
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

function compactTitle(input: string) {
  const cleaned = input.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '未命名知识库';
  return cleaned.length > 32 ? `${cleaned.slice(0, 32)}...` : cleaned;
}
