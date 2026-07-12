/**
 * PiRuntime 实现工厂模块。
 *
 * 提供 PiRuntime 接口的三种实现工厂：
 * - createMockPiRuntime：纯本地 mock，不调用外部 API
 * - createPiAiRuntime：基于 pi-ai SDK 的真实实现，带 fallback 到 mock
 * - createConfiguredPiRuntime：从环境变量读取配置并创建 runtime
 *
 * @module runtime-factory
 * @author fxbin
 */
import {
  complete,
  stream,
  getEnvApiKey,
  type Context,
  type AssistantMessage,
  type ToolCall,
} from '@earendil-works/pi-ai';
import type {
  StructuredGenerationRequest,
  StructuredGenerationResult,
  TextGenerationRequest,
  TextGenerationResult,
  ToolCallingRequest,
  ToolCallingResult,
  PiRuntime,
  PiAiRuntimeConfig,
} from './types.js';
import {
  defaultProvider,
  defaultModel,
  CARD_QUALITY_CONTRACT,
  isKnownPiProvider,
  getConfiguredModel,
} from './provider-registry.js';
import { validateStructuredOutput } from './validators.js';
import { extractJson, normalizeStructuredJson } from './json-utils.js';
import { mockOutputFor } from './mock-outputs.js';
import { compactTitle } from './title-utils.js';

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
  const apiKey = config.apiKey ?? (isKnownPiProvider(provider) ? getEnvApiKey(provider) : undefined);
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
        const model = getConfiguredModel(provider, modelId, config.baseUrl);
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
        const model = getConfiguredModel(provider, modelId, config.baseUrl);
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
        const model = getConfiguredModel(provider, modelId, config.baseUrl);
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
  const provider = process.env.ZHIJING_PI_PROVIDER ?? defaultProvider;
  return createPiAiRuntime({
    provider,
    model: process.env.ZHIJING_PI_MODEL ?? defaultModel,
    apiKey: process.env.ZHIJING_PI_API_KEY ?? (isKnownPiProvider(provider) ? getEnvApiKey(provider) : undefined),
    enabled: process.env.ZHIJING_PI_ENABLED === '1' ? true : undefined,
    fallbackToMock: process.env.ZHIJING_PI_FALLBACK === '0' ? false : true,
  });
}

function buildContext(request: StructuredGenerationRequest): Context {
  const schema = request.schema ? `\nJSON schema:\n${JSON.stringify(request.schema, null, 2)}` : '';
  const extraContext = request.context ? `\nContext:\n${JSON.stringify(request.context, null, 2)}` : '';
  const cardContract = ['workspace_skeleton', 'material_summary', 'knowledge_cards', 'question_answer'].includes(request.task)
    ? CARD_QUALITY_CONTRACT
    : '';
  return {
    systemPrompt: [
      'You are the structured generation runtime for Zhijing, a personal knowledge-base workbench.',
      'Return only valid JSON. Do not wrap the JSON in Markdown. Do not include commentary.',
      'Preserve provenance boundaries: use ai_skeleton for unsourced topic scaffolds and sourced only when source material is provided.',
      cardContract,
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
