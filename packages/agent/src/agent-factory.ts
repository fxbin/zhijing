import { randomUUID } from 'node:crypto';
import {
  getEnvApiKey,
  streamSimple,
  createAssistantMessageEventStream,
  type Api,
  type AssistantMessage,
  type AssistantMessageEvent,
  type Message,
  type Model,
} from '@earendil-works/pi-ai';
import { Agent, type AgentMessage, type AgentOptions, type ThinkingLevel } from '@earendil-works/pi-agent-core';
import { routeProvider, resolveConfiguredModel, isKnownPiProvider, type AgentTaskType } from '@zhijing/pi-runtime';
import { recordAgentUsage } from '@zhijing/core';
import type { ProviderRole } from '@zhijing/shared';
import { createWorkspaceTools, getToolCapabilityDeclaration } from './tools/index.js';
import { buildBaseSystemPrompt } from './prompts/index.js';
import {
  assertToolCapabilityAllowed,
  wrapToolWithGuard,
  defaultConsoleAuditSink,
  type ToolCallAuditSink,
} from './capability-guard.js';

/**
 * 默认推理强度；off 表示不在请求中附加 thinking/reasoning 参数，
 * 由模型自身的 reasoning 能力决定是否产出推理内容。
 *
 * 知径默认使用 deepseek-v4-flash 等 reasoning 模型，模型本身会输出
 * reasoning_content；若再叠加 thinkingLevel=medium，pi-ai 会同时发送
 * thinking 与 reasoning_effort 字段，部分 provider 组合下会导致空响应。
 * @author fxbin
 */
const DEFAULT_THINKING_LEVEL: ThinkingLevel = 'off';

/**
 * 默认工具执行模式；parallel 允许多个无依赖工具调用并行执行，
 * 缩短单轮多检索场景下的等待时间。
 */
const DEFAULT_TOOL_EXECUTION: AgentOptions['toolExecution'] = 'parallel';

/**
 * 从 streamSimple 的 chunk 中提取 usage 信息。
 *
 * pi-ai 的 chunk 类型是 AssistantMessageEvent 联合类型，不同事件 usage
 * 挂载位置不同：
 * - start / text_* / thinking_* / toolcall_* 事件：usage 在 chunk.partial.usage（流式累计值）
 * - done 事件：usage 在 chunk.message.usage（最终值）
 * - error 事件：usage 在 chunk.error.usage（已用值）
 *
 * pi-ai 的 Usage 字段是 input / output / cost.total，与 AgentUsageRecord 的
 * inputTokens / outputTokens / costUsd 不同名，这里做字段映射。
 *
 * @param chunk - streamSimple 的事件 chunk
 * @returns 映射后的 usage 信息；无 usage 时返回 null
 * @author fxbin
 */
function extractStreamChunkUsage(
  chunk: AssistantMessageEvent,
): { inputTokens: number | null; outputTokens: number | null; costUsd: number | null } | null {
  let message: AssistantMessage | undefined;
  if ('partial' in chunk) {
    message = chunk.partial;
  } else if ('message' in chunk) {
    message = chunk.message;
  } else if ('error' in chunk) {
    message = chunk.error;
  }
  const usage = message?.usage;
  if (!usage) return null;
  return {
    inputTokens: usage.input ?? null,
    outputTokens: usage.output ?? null,
    costUsd: usage.cost?.total ?? null,
  };
}

/**
 * 知径默认系统提示词。
 *
 * 定义 Agent 的能力边界、工具调用策略、输出风格和提议变更协议。
 * 所有工作区 Agent 实例共享此提示词作为 systemPrompt 基线。
 *
 * 各段落从 prompts/segments.ts 唯一导出，消除跨文件重复。
 */
const ZHIJING_AGENT_SYSTEM_PROMPT = buildBaseSystemPrompt();

/**
 * 默认 convertToLlm：将 AgentMessage[] 透传为 LLM Message[]。
 *
 * 知径当前不引入自定义消息类型，AgentMessage 退化为 Message 联合类型；
 * 仍保留 filter 防御，未来若加入自定义消息类型时可自动剔除。
 *
 * @param messages - Agent 当前对话消息序列
 * @returns LLM 可消费的标准消息数组
 * @author fxbin
 */
function defaultConvertToLlm(messages: AgentMessage[]): Message[] {
  return messages.filter((message): message is Message => typeof (message as Message).role === 'string');
}

/**
 * Agent 工厂配置项。
 *
 * - provider：LLM provider，省略时走路由引擎解析（尊重 ZHIJING_PI_PROVIDER）
 * - modelId：模型 id，省略时走路由引擎解析（尊重 ZHIJING_PI_MODEL）
 * - apiKey：API key，省略时读 ZHIJING_PI_API_KEY 再退化为 provider 默认环境变量
 * - thinkingLevel：推理强度，省略时使用 medium
 * - toolExecution：工具执行模式，省略时使用 parallel
 * - systemPromptOverride：覆盖默认系统提示词
 * - auditSink：工具调用审计日志接收器，省略时使用 defaultConsoleAuditSink
 * - taskType：任务类型，省略时使用 'conversation'；驱动路由引擎选择 Provider/Model
 */
export interface WorkspaceAgentOptions {
  /** LLM provider；可为 SDK 内置 KnownProvider 或自定义字符串（OpenAI 兼容端点） */
  provider?: string;
  modelId?: string;
  baseUrl?: string;
  apiKey?: string;
  thinkingLevel?: ThinkingLevel;
  toolExecution?: AgentOptions['toolExecution'];
  systemPromptOverride?: string;
  auditSink?: ToolCallAuditSink;
  taskType?: AgentTaskType;
  /** 历史消息，用于多轮对话上下文累积；省略时从空对话开始 */
  messages?: AgentMessage[];
}

/**
 * 解析 apiKey：参数 > 环境变量 > pi-ai 默认查找规则。
 *
 * provider 为自定义字符串（非 KnownProvider）时跳过 SDK 环境变量查找，
 * 仅依赖显式传入的 apiKey 或 ZHIJING_PI_API_KEY 环境变量。
 *
 * @param provider - 最终生效的 provider（可为自定义字符串）
 * @param explicit - 调用方显式传入的 apiKey
 * @returns 最终生效的 apiKey
 * @author fxbin
 */
function resolveApiKey(provider: string, explicit?: string): string | undefined {
  if (explicit) return explicit;
  const envApiKey = process.env.ZHIJING_PI_API_KEY;
  if (envApiKey && envApiKey.length > 0) return envApiKey;
  if (isKnownPiProvider(provider)) {
    return getEnvApiKey(provider);
  }
  return undefined;
}

/**
 * 为指定工作区构造经 capability 门禁包装的工具集。
 *
 * 流程：
 * 1. 调用 createWorkspaceTools 生成原始工具集
 * 2. 逐个查表 getToolCapabilityDeclaration 获取能力声明
 *    - 未声明：fail-fast，抛错（防止新增工具忘记声明 capability）
 * 3. assertToolCapabilityAllowed 校验 capability 是否在白名单内
 *    - 非白名单：fail-fast，抛错（防止越界工具挂载）
 * 4. wrapToolWithGuard 包装 execute，注入审计日志
 *
 * @param workspaceId - 工作区 id
 * @param auditSink - 审计日志接收器；省略时使用 defaultConsoleAuditSink
 * @returns 经门禁包装的工具集，可直接传入 AgentState.tools
 * @author fxbin
 */
function createGuardedWorkspaceTools(workspaceId: string, auditSink?: ToolCallAuditSink) {
  const sink = auditSink ?? defaultConsoleAuditSink;
  const rawTools = createWorkspaceTools(workspaceId);
  return rawTools.map((tool) => {
    const declaration = getToolCapabilityDeclaration(tool.name);
    if (!declaration) {
      throw new Error(`createGuardedWorkspaceTools: tool "${tool.name}" has no capability declaration. Add it to TOOL_CAPABILITY_DECLARATIONS.`);
    }
    assertToolCapabilityAllowed(declaration);
    return wrapToolWithGuard(tool, declaration, sink);
  });
}

/**
 * 为指定工作区构造一个可即用的 Agent 实例。
 *
 * 装配内容：
 * 1. 工作区专属工具集（search_cards / search_materials / get_workspace_summary / web_search / fetch_web_page / deep_search）
 * 2. 知径默认 systemPrompt（中文、能力边界、工具策略、输出规范）
 * 3. pi-ai provider/model/apiKey 解析（与 pi-runtime 同源环境变量）
 * 4. streamSimple 作为 streamFn（pi-agent-core 的默认契约）
 * 5. identity convertToLlm（剔除未来可能引入的自定义消息类型）
 *
 * @param workspaceId - 工作区 id；所有工具会绑定此 id 做检索
 * @param options - 可选配置项；省略时全部使用默认值
 * @returns 配置完成的 Agent 实例，调用方负责 subscribe + prompt
 * @author fxbin
 */
export function createWorkspaceAgent(workspaceId: string, options: WorkspaceAgentOptions = {}): Agent {
  if (!workspaceId) {
    throw new Error('createWorkspaceAgent: workspaceId is required.');
  }

  const taskType = options.taskType ?? 'conversation';
  const resolution = routeProvider(taskType);
  const provider = options.provider ?? resolution.resolvedProvider;
  const modelId = options.modelId ?? resolution.resolvedModel;
  const baseUrl = options.baseUrl ?? resolution.resolvedBaseUrl;
  const apiKey = resolveApiKey(provider, options.apiKey);

  if (!apiKey) {
    throw new Error(`createWorkspaceAgent: no API key resolved for provider "${provider}". Set ZHIJING_PI_API_KEY or pass options.apiKey.`);
  }

  const model = resolveConfiguredModel(provider, modelId, baseUrl);
  const tools = createGuardedWorkspaceTools(workspaceId, options.auditSink);

  return new Agent({
    initialState: {
      systemPrompt: options.systemPromptOverride ?? ZHIJING_AGENT_SYSTEM_PROMPT,
      model,
      thinkingLevel: options.thinkingLevel ?? DEFAULT_THINKING_LEVEL,
      tools,
      messages: options.messages ?? [],
    },
    convertToLlm: defaultConvertToLlm,
    streamFn: (...args) => {
      const streamOptions = args[2] ?? {};
      const innerStream = streamSimple(args[0], args[1], { ...streamOptions, apiKey });
      const startedAt = new Date().toISOString();
      const startMs = Date.now();
      let lastUsage: { inputTokens: number | null; outputTokens: number | null; costUsd: number | null } = {
        inputTokens: null,
        outputTokens: null,
        costUsd: null,
      };
      const role: ProviderRole = resolution.route.role;
      const outStream = createAssistantMessageEventStream();

      void (async () => {
        let ok = true;
        let errorMessage: string | null = null;
        let finalMessage: AssistantMessage | undefined;
        try {
          for await (const chunk of innerStream) {
            const usage = extractStreamChunkUsage(chunk);
            if (usage) lastUsage = usage;
            outStream.push(chunk);
            if (chunk.type === 'done') {
              finalMessage = chunk.message;
            } else if (chunk.type === 'error') {
              ok = false;
              errorMessage = chunk.error.errorMessage ?? chunk.reason ?? 'stream error';
              finalMessage = chunk.error;
            }
          }
        } catch (error) {
          ok = false;
          errorMessage = error instanceof Error ? error.message : String(error);
        } finally {
          if (finalMessage) {
            outStream.end(finalMessage);
          } else {
            outStream.end();
          }
          recordAgentUsage({
            id: randomUUID(),
            workspaceId,
            taskType,
            provider,
            model: modelId,
            role,
            inputTokens: lastUsage.inputTokens,
            outputTokens: lastUsage.outputTokens,
            costUsd: lastUsage.costUsd,
            ok,
            errorMessage,
            startedAt,
            durationMs: Date.now() - startMs,
          });
        }
      })();

      return outStream;
    },
    toolExecution: options.toolExecution ?? DEFAULT_TOOL_EXECUTION,
  });
}

/**
 * 导出默认系统提示词，便于调用方在其基础上做定制拼接。
 */
export { ZHIJING_AGENT_SYSTEM_PROMPT };
