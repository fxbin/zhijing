import { randomUUID } from 'node:crypto';
import type {
  AgentTaskType,
  AgentUsageRecord,
  ProviderRole,
} from '@zhijing/shared';
import type {
  PiRuntime,
  StructuredGenerationRequest,
  StructuredGenerationResult,
  TextGenerationRequest,
  TextGenerationResult,
  ToolCallingRequest,
  ToolCallingResult,
} from './index.js';
import { routeProvider } from './router.js';

/**
 * Agent 调用成本记录回调。
 *
 * InstrumentedPiRuntime 每次调用后通过此回调写入 AgentUsageRecord。
 * 调用方通常传入 core 包的 recordAgentUsage 函数。
 *
 * @param record - 成本记录
 * @author fxbin
 */
export type UsageRecorder = (record: AgentUsageRecord) => void;

/**
 * InstrumentedPiRuntime 配置项。
 *
 * - taskType：任务类型，用于路由解析与成本记录
 * - workspaceId：工作区 id；对话路径传入，结构化生成路径可省略
 * - recorder：成本记录回调
 *
 * @author fxbin
 */
export interface InstrumentedRuntimeOptions {
  taskType: AgentTaskType;
  workspaceId?: string;
  recorder: UsageRecorder;
}

/**
 * 从生成结果中提取 usage 信息。
 *
 * @param result - LLM 调用结果
 * @returns usage 信息；无 usage 时返回 null
 * @author fxbin
 */
function extractUsage<T extends { usage?: { inputTokens?: number; outputTokens?: number; costUsd?: number } }>(
  result: T,
): { inputTokens: number | null; outputTokens: number | null; costUsd: number | null } {
  const usage = result.usage;
  if (!usage) {
    return { inputTokens: null, outputTokens: null, costUsd: null };
  }
  return {
    inputTokens: usage.inputTokens ?? null,
    outputTokens: usage.outputTokens ?? null,
    costUsd: usage.costUsd ?? null,
  };
}

/**
 * 构建一条 AgentUsageRecord。
 *
 * @param options - 配置项
 * @param ok - 调用是否成功
 * @param usage - token 用量与成本
 * @param errorMessage - 错误信息（失败时）
 * @param startedAt - 开始时间 ISO
 * @param durationMs - 耗时毫秒
 * @returns AgentUsageRecord 实例
 * @author fxbin
 */
function buildUsageRecord(
  options: InstrumentedRuntimeOptions,
  ok: boolean,
  usage: { inputTokens: number | null; outputTokens: number | null; costUsd: number | null },
  errorMessage: string | null,
  startedAt: string,
  durationMs: number,
): AgentUsageRecord {
  const resolution = routeProvider(options.taskType);
  const role: ProviderRole = resolution.route.role;
  return {
    id: randomUUID(),
    workspaceId: options.workspaceId ?? null,
    taskType: options.taskType,
    provider: resolution.resolvedProvider,
    model: resolution.resolvedModel,
    role,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    costUsd: usage.costUsd,
    ok,
    errorMessage,
    startedAt,
    durationMs,
  };
}

/**
 * 创建带成本追踪的 PiRuntime 包装器。
 *
 * 包装给定 runtime，在每次 completeStructured / streamText / runToolCalling 调用后
 * 通过 recorder 回调写入 AgentUsageRecord。调用失败时也会记录（ok=false）。
 *
 * 包装器不改变 runtime 的行为，仅增加成本追踪副作用。
 * 失败时原样抛出原始错误，不吞错、不转换错误类型。
 *
 * @param inner - 被包装的原始 runtime
 * @param options - 配置项（taskType / workspaceId / recorder）
 * @returns 包装后的 PiRuntime
 * @author fxbin
 */
export function createInstrumentedPiRuntime(
  inner: PiRuntime,
  options: InstrumentedRuntimeOptions,
): PiRuntime {
  return {
    async completeStructured<TOutput, TSchemaInput>(
      request: StructuredGenerationRequest<TSchemaInput>,
    ): Promise<StructuredGenerationResult<TOutput>> {
      const startedAt = new Date().toISOString();
      const startMs = Date.now();
      try {
        const result = await inner.completeStructured<TOutput>(request);
        const usage = extractUsage(result);
        const record = buildUsageRecord(options, true, usage, null, startedAt, Date.now() - startMs);
        options.recorder(record);
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const record = buildUsageRecord(
          options,
          false,
          { inputTokens: null, outputTokens: null, costUsd: null },
          errorMessage,
          startedAt,
          Date.now() - startMs,
        );
        options.recorder(record);
        throw error;
      }
    },
    async *streamText(request: TextGenerationRequest): AsyncIterable<TextGenerationResult> {
      const startedAt = new Date().toISOString();
      const startMs = Date.now();
      let lastUsage: { inputTokens: number | null; outputTokens: number | null; costUsd: number | null } = {
        inputTokens: null,
        outputTokens: null,
        costUsd: null,
      };
      let streamError: string | null = null;
      try {
        for await (const chunk of inner.streamText(request)) {
          if (chunk.usage) {
            lastUsage = extractUsage(chunk);
          }
          yield chunk;
        }
      } catch (error) {
        streamError = error instanceof Error ? error.message : String(error);
        const record = buildUsageRecord(options, false, lastUsage, streamError, startedAt, Date.now() - startMs);
        options.recorder(record);
        throw error;
      }
      const record = buildUsageRecord(options, true, lastUsage, null, startedAt, Date.now() - startMs);
      options.recorder(record);
    },
    async runToolCalling(request: ToolCallingRequest): Promise<ToolCallingResult> {
      const startedAt = new Date().toISOString();
      const startMs = Date.now();
      try {
        const result = await inner.runToolCalling(request);
        const usage = extractUsage(result);
        const record = buildUsageRecord(options, true, usage, null, startedAt, Date.now() - startMs);
        options.recorder(record);
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const record = buildUsageRecord(
          options,
          false,
          { inputTokens: null, outputTokens: null, costUsd: null },
          errorMessage,
          startedAt,
          Date.now() - startMs,
        );
        options.recorder(record);
        throw error;
      }
    },
  };
}
