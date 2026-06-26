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
import { createWorkspaceTools } from './tools/index.js';

/**
 * 默认 LLM provider；与 pi-runtime 保持一致以便复用同一份环境变量配置。
 */
const DEFAULT_PROVIDER: KnownProvider = 'deepseek';

/**
 * 默认模型 id；与 pi-runtime 保持一致，控制成本与响应延迟。
 */
const DEFAULT_MODEL_ID = 'deepseek-v4-flash';

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
 * - provider：LLM provider，省略时读 ZHIJING_PI_PROVIDER，再退化为 'deepseek'
 * - modelId：模型 id，省略时读 ZHIJING_PI_MODEL，再退化为 'deepseek-v4-flash'
 * - apiKey：API key，省略时读 ZHIJING_PI_API_KEY 再退化为 provider 默认环境变量
 * - thinkingLevel：推理强度，省略时使用 medium
 * - toolExecution：工具执行模式，省略时使用 parallel
 * - systemPromptOverride：覆盖默认系统提示词
 */
export interface WorkspaceAgentOptions {
  provider?: KnownProvider;
  modelId?: string;
  apiKey?: string;
  thinkingLevel?: ThinkingLevel;
  toolExecution?: AgentOptions['toolExecution'];
  systemPromptOverride?: string;
}

/**
 * 解析 provider：参数 > 环境变量 > 默认值。
 *
 * @param explicit - 调用方显式传入的 provider
 * @returns 最终生效的 provider
 * @author fxbin
 */
function resolveProvider(explicit?: KnownProvider): KnownProvider {
  if (explicit) return explicit;
  const envProvider = process.env.ZHIJING_PI_PROVIDER;
  return envProvider && envProvider.length > 0 ? (envProvider as KnownProvider) : DEFAULT_PROVIDER;
}

/**
 * 解析 modelId：参数 > 环境变量 > 默认值。
 *
 * @param explicit - 调用方显式传入的 modelId
 * @returns 最终生效的 modelId
 * @author fxbin
 */
function resolveModelId(explicit?: string): string {
  if (explicit) return explicit;
  return process.env.ZHIJING_PI_MODEL ?? DEFAULT_MODEL_ID;
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

  const provider = resolveProvider(options.provider);
  const modelId = resolveModelId(options.modelId);
  const apiKey = resolveApiKey(provider, options.apiKey);

  if (!apiKey) {
    throw new Error(`createWorkspaceAgent: no API key resolved for provider "${provider}". Set ZHIJING_PI_API_KEY or pass options.apiKey.`);
  }

  const model = getModel(provider, modelId as never) as Model<Api>;
  const tools = createWorkspaceTools(workspaceId);

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
