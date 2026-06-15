import {
  complete,
  getEnvApiKey,
  getModel,
  Type,
  type Api,
  type AssistantMessage,
  type Context,
  type KnownProvider,
  type Model,
  type TSchema,
} from '@earendil-works/pi-ai';

export { Type };
export type { TSchema };

export interface StructuredGenerationRequest<TSchemaInput = unknown> {
  task: 'knowledge_base_skeleton' | 'material_summary' | 'knowledge_cards' | 'question_answer';
  prompt: string;
  schema?: TSchemaInput;
  context?: Record<string, unknown>;
}

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

export interface PiRuntime {
  completeStructured<TOutput = unknown, TSchemaInput = unknown>(
    request: StructuredGenerationRequest<TSchemaInput>,
  ): Promise<StructuredGenerationResult<TOutput>>;
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
      return {
        provider: 'mock',
        model: 'mock-local',
        output: mockOutputFor(request) as TOutput,
        usage: {
          inputTokens: request.prompt.length,
          outputTokens: 96,
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

function parseStructuredJson<TOutput>(response: AssistantMessage): TOutput {
  const text = response.content
    .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();
  const json = extractJson(text);
  return JSON.parse(json) as TOutput;
}

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const objectStart = text.indexOf('{');
  const objectEnd = text.lastIndexOf('}');
  if (objectStart >= 0 && objectEnd > objectStart) {
    return text.slice(objectStart, objectEnd + 1);
  }

  throw new Error('Pi response did not contain a JSON object.');
}

function withFallbackReason<TOutput>(
  result: StructuredGenerationResult<TOutput>,
  fallbackReason: string,
): StructuredGenerationResult<TOutput> {
  return {
    ...result,
    fallbackReason,
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
