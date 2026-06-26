import {
  getModel,
  getEnvApiKey,
  streamSimple,
  type Api,
  type KnownProvider,
  type Message,
  type Model,
} from '@earendil-works/pi-ai';
import { Agent, type AgentMessage, type AgentOptions, type ThinkingLevel } from '@earendil-works/pi-agent-core';
import { routeProvider, type AgentTaskType } from '@zhijing/pi-runtime';
import { createWorkspaceTools, getToolCapabilityDeclaration } from './tools/index.js';
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
 * 知径工作区 Agent 的系统提示词。
 *
 * 设计目标：
 * 1. 明确能力边界——只能通过三件套检索工具访问当前工作区，禁止联网/跨工作区/写操作。
 * 2. 给出工具调用策略——先整体后局部、先卡片后资料。
 * 3. 规范输出风格——中文、附 id、证据不足时如实说明。
 *
 * 不写死任何工作区特定信息，所有动态上下文通过工具按需获取。
 */
const ZHIJING_AGENT_SYSTEM_PROMPT = [
  '你是「知径」工作台的智能助理，专门帮助用户管理当前工作区内的个人知识库。',
  '',
  '能力边界：',
  '- 只能通过提供的三个检索工具访问当前工作区内容：search_cards（搜索已结构化卡片）、search_materials（搜索原始来源资料）、get_workspace_summary（查看工作区整体概览）。',
  '- 不能联网、不能访问其他工作区、不能修改任何数据。',
  '- 不能替代用户做最终判断；证据不足时如实说明，不要编造内容或引用不存在的卡片/资料。',
  '',
  '工具调用策略：',
  '- 接入新对话或处理宏观问题（如「这个工作区讲什么」）时，先调 get_workspace_summary。',
  '- 处理具体问题（如「X 是什么」「Y 怎么做」）时，先调 search_cards；若卡片结果不足以作答，再调 search_materials。',
  '- 同一轮可并行调用多次检索工具，使用不同关键词扩展检索面。',
  '',
  '输出风格：',
  '- 中文回答；引用卡片/资料时附上其 id，方便用户定位。',
  '- 若检索结果为空或不足以作答，明确告知用户当前工作区缺少哪些信息，并建议如何补充。',
  '- 不输出与用户问题无关的客套话或重复信息。',
].join('\n');

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
  provider?: KnownProvider;
  modelId?: string;
  apiKey?: string;
  thinkingLevel?: ThinkingLevel;
  toolExecution?: AgentOptions['toolExecution'];
  systemPromptOverride?: string;
  auditSink?: ToolCallAuditSink;
  taskType?: AgentTaskType;
}

/**
 * 解析 apiKey：参数 > 环境变量 > pi-ai 默认查找规则。
 *
 * @param provider - 最终生效的 provider
 * @param explicit - 调用方显式传入的 apiKey
 * @returns 最终生效的 apiKey
 * @author fxbin
 */
function resolveApiKey(provider: KnownProvider, explicit?: string): string | undefined {
  if (explicit) return explicit;
  const envApiKey = process.env.ZHIJING_PI_API_KEY;
  return envApiKey && envApiKey.length > 0 ? envApiKey : getEnvApiKey(provider);
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
 * 1. 工作区专属工具集（search_cards / search_materials / get_workspace_summary）
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
  const provider = (options.provider ?? resolution.resolvedProvider) as KnownProvider;
  const modelId = options.modelId ?? resolution.resolvedModel;
  const apiKey = resolveApiKey(provider, options.apiKey);

  if (!apiKey) {
    throw new Error(`createWorkspaceAgent: no API key resolved for provider "${provider}". Set ZHIJING_PI_API_KEY or pass options.apiKey.`);
  }

  const model = getModel(provider, modelId as never) as Model<Api>;
  const tools = createGuardedWorkspaceTools(workspaceId, options.auditSink);

  return new Agent({
    initialState: {
      systemPrompt: options.systemPromptOverride ?? ZHIJING_AGENT_SYSTEM_PROMPT,
      model,
      thinkingLevel: options.thinkingLevel ?? DEFAULT_THINKING_LEVEL,
      tools,
      messages: [],
    },
    convertToLlm: defaultConvertToLlm,
    streamFn: (...args) => {
      const streamOptions = args[2] ?? {};
      return streamSimple(args[0], args[1], { ...streamOptions, apiKey });
    },
    toolExecution: options.toolExecution ?? DEFAULT_TOOL_EXECUTION,
  });
}

/**
 * 导出默认系统提示词，便于调用方在其基础上做定制拼接。
 */
export { ZHIJING_AGENT_SYSTEM_PROMPT };
