/**
 * pi-runtime 接口类型定义模块。
 *
 * 声明结构化生成、文本生成、工具调用等场景的请求/结果接口，
 * 以及 PiRuntime 抽象接口与 PiAiRuntimeConfig 配置类型。
 *
 * @module types
 * @author fxbin
 */
import type { Tool, ToolCall } from '@earendil-works/pi-ai';

export interface StructuredGenerationRequest<TSchemaInput = unknown> {
  task: 'workspace_skeleton' | 'material_summary' | 'knowledge_cards' | 'question_answer' | 'entity_extraction' | 'socratic_questioning';
  prompt: string;
  schema?: TSchemaInput;
  context?: Record<string, unknown>;
}

export type StructuredGenerationTask = StructuredGenerationRequest['task'];

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
  /** LLM provider；可为 SDK 内置 KnownProvider 或自定义字符串（OpenAI 兼容端点） */
  provider?: string;
  model?: string;
  baseUrl?: string;
  apiKey?: string;
  enabled?: boolean;
  fallbackToMock?: boolean;
  temperature?: number;
  maxTokens?: number;
}
