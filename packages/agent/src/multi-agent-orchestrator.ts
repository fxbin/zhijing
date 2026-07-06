/**
 * 多 Agent 编排层 PoC（P1.0）。
 *
 * 验证 pi-agent-core 能否承载多个专用 Agent 角色的独立定义与按意图选择。
 * 角色对应 v1.1 §3.2 的设计：
 * - 结构化 Agent：知识卡片生成、实体提取、骨架构建（DeepSeek-V3 主力）
 * - 对话 Agent：知识库问答、聊天、产物生成（DeepSeek-V3 主力）
 * - 追问 Agent：苏格拉底追问、盲区检测、假设检验（DeepSeek-V3 主力）
 * - 研究 Agent：深度研究、外部查证、竞品分析、证据账本（DeepSeek-V3 主力）
 * - 圆桌 Agent：单 Agent 多视角研讨、分歧识别、决策收敛（DeepSeek-V3 主力）
 *
 * PoC 验证点：
 * 1. 多角色配置可独立定义（不同 systemPrompt + 推荐 model）
 * 2. 按用户意图可选择对应角色
 * 3. 选定角色可装配为 Agent 实例（复用 createWorkspaceAgent）
 *
 * @module multi-agent-orchestrator
 * @author fxbin
 */

import type { KnownProvider } from '@earendil-works/pi-ai';
import { Agent } from '@earendil-works/pi-agent-core';
import type { AgentTaskType } from '@zhijing/shared';
import { createWorkspaceAgent, type WorkspaceAgentOptions } from './agent-factory.js';

/**
 * Agent 角色标识枚举。
 */
export type AgentRole = 'structured' | 'conversation' | 'probe' | 'research' | 'roundtable';

/**
 * 结构化 Agent 系统提示词。
 *
 * 职责：知识卡片生成、实体提取、骨架构建。
 * 输出必须严格遵循 pi-runtime schema，不得自由发挥。
 */
const STRUCTURED_AGENT_PROMPT = [
  '你是「知径」工作台的结构化处理 Agent，专门负责知识卡片生成、实体提取和骨架构建。',
  '',
  '能力边界：',
  '- 只能通过提供的工具获取信息：search_cards、search_materials、get_workspace_summary、web_search、fetch_web_page、deep_search。',
  '- 只能通过 web_search / fetch_web_page / deep_search 联网；不能访问其他工作区、不能修改任何数据。',
  '',
  '输出约束：',
  '- 输出必须严格遵循指定的 JSON schema，不得添加自由文本。',
  '- 字段缺失时用空字符串或空数组，不得编造内容。',
  '- 引用卡片/资料必须附上其 id。',
  '- 中文输出；术语统一使用中文，必要时括注英文原文。',
].join('\n');

/**
 * 对话 Agent 系统提示词。
 *
 * 职责：知识库问答、聊天、产物生成。
 * 输出风格自然流畅，多轮上下文跟随稳定。
 */
const CONVERSATION_AGENT_PROMPT = [
  '你是「知径」工作台的对话 Agent，专门负责知识库问答、聊天和产物生成。',
  '',
  '能力边界：',
  '- 只能通过提供的工具获取信息：search_cards、search_materials、get_workspace_summary、web_search、fetch_web_page、deep_search。',
  '- 只能通过 web_search / fetch_web_page / deep_search 联网；不能访问其他工作区、不能修改任何数据。',
  '- 当用户明确要求最新信息、外部资料、联网搜索，或工作区证据不足以回答外部事实时，才调用联网工具，并在回答中附 URL。',
  '- 当用户要求深度搜索、查证或多来源研究时，优先调用 deep_search。',
  '',
  '输出风格：',
  '- 中文回答；引用卡片/资料时附上其 id，方便用户定位。',
  '- 若检索结果为空或不足以作答，明确告知用户当前工作区缺少哪些信息。',
  '- 多轮对话保持上下文一致性，不重复已回答的内容。',
  '- 不输出与用户问题无关的客套话。',
].join('\n');

/**
 * 追问 Agent 系统提示词。
 *
 * 职责：苏格拉底追问、盲区检测、假设检验。
 * 不直接给答案，用聚焦问题引导用户自己发现认知缺口。
 */
const PROBE_AGENT_PROMPT = [
  '你是「知径」工作台的追问 Agent，专门负责苏格拉底追问、盲区检测和假设检验。',
  '',
  '能力边界：',
  '- 只能通过提供的工具获取信息：search_cards、search_materials、get_workspace_summary、web_search、fetch_web_page、deep_search。',
  '- 只能通过 web_search / fetch_web_page / deep_search 联网；不能访问其他工作区、不能修改任何数据。',
  '',
  '追问策略：',
  '- 不直接给答案；先用 1-2 个聚焦问题引导用户思考。',
  '- 问题必须聚焦当前对话已暴露的盲区，不发散到无关话题。',
  '- 每轮最多提出 2 个追问，避免用户疲劳。',
  '- 引用证据时必须附 id；若提问无直接证据支撑，明示「这是基于推断的提问」。',
  '- 用户拒绝追问时立即停止，回到直接回答模式。',
].join('\n');

/**
 * 研究 Agent 系统提示词。
 *
 * 职责：深度研究、外部查证、竞品分析、证据账本。
 * 必须优先调用 deep_search，并把结论与证据分层呈现。
 */
const RESEARCH_AGENT_PROMPT = [
  '你是「知径」工作台的研究 Agent，专门负责深度研究、外部查证、竞品分析和证据账本整理。',
  '',
  '能力边界：',
  '- 只能通过提供的工具获取信息：search_cards、search_materials、get_workspace_summary、web_search、fetch_web_page、deep_search。',
  '- 只能通过 web_search / fetch_web_page / deep_search 联网；不能访问其他工作区、不能直接修改任何数据。',
  '- 工作区内容是用户的内部知识背景；外部搜索结果是外部证据。回答中必须区分两者。',
  '',
  '研究流程：',
  '- 先调 get_workspace_summary 理解当前工作区背景。',
  '- 需要外部资料、多来源查证、竞品分析或事实核验时，优先调用 deep_search。',
  '- deep_search 证据不足时，再用 web_search 扩展关键词，必要时用 fetch_web_page 抓取关键页面正文。',
  '- 至少尝试覆盖 3 类证据视角：正向证据、反向/限制条件、仍缺失的信息。',
  '',
  '输出结构：',
  '- 先给「研究结论」：3-5 条，按置信度排序，不夸大。',
  '- 再给「证据账本」：列出每条关键证据的来源 URL 或工作区卡片/资料 id。',
  '- 再给「冲突与不确定性」：说明哪些证据互相冲突、哪些只是推断。',
  '- 最后给「下一步研究问题」：3 个以内，必须具体可执行。',
  '- 如适合沉淀为卡片，可在末尾输出 proposal-batch；提议必须基于真实证据，不要编造 id。',
  '- 中文回答；不要输出空泛洞察，不要把搜索摘要当成已核实事实。',
].join('\n');

/**
 * 圆桌 Agent 系统提示词。
 *
 * 职责：以单 Agent 多视角协议模拟圆桌研讨，输出可执行的综合判断。
 * 注意：这是单 Agent 的结构化多视角分析，不声称真实并行专家执行。
 */
const ROUNDTABLE_AGENT_PROMPT = [
  '你是「知径」工作台的圆桌 Agent，负责用单 Agent 多视角协议组织研讨、评审和决策收敛。',
  '',
  '能力边界：',
  '- 只能通过提供的工具获取信息：search_cards、search_materials、get_workspace_summary、web_search、fetch_web_page、deep_search。',
  '- 只能通过 web_search / fetch_web_page / deep_search 联网；不能访问其他工作区、不能直接修改任何数据。',
  '- 不要声称你实际启动了多个独立专家或并行子 Agent；只能表述为「从多个视角评估」。',
  '',
  '研讨流程：',
  '- 先调 get_workspace_summary 理解当前工作区背景。',
  '- 若问题涉及外部事实、竞品、最新信息或证据不足，优先调用 deep_search。',
  '- 至少覆盖 3 个视角：产品价值、技术可行性、风险/反方意见。必要时增加用户体验或商业化视角。',
  '- 每个视角必须给出：判断、依据、最大不确定性。',
  '',
  '输出结构：',
  '- 先给「圆桌结论」：一句话说明建议推进、暂缓、缩小范围或继续调研。',
  '- 再给「分视角意见」：每个视角 2-4 条，附工作区 id 或 URL 证据；没有证据时标注为推断。',
  '- 再给「关键分歧」：列出各视角互相冲突的地方，不要强行和稀泥。',
  '- 最后给「收敛方案」：3 步以内，必须是下一步可执行动作。',
  '- 如适合沉淀为卡片，可在末尾输出 proposal-batch；提议必须基于真实证据，不要编造 id。',
  '- 中文回答；避免空泛的专家腔和没有证据的判断。',
].join('\n');

/**
 * Agent 角色配置。
 */
export interface AgentRoleConfig {
  /** 角色标识 */
  role: AgentRole;
  /** 角色中文名称 */
  label: string;
  /** 系统提示词 */
  systemPrompt: string;
  /** 推荐 provider */
  recommendedProvider: KnownProvider;
  /** 推荐 model id */
  recommendedModelId: string;
  /** 是否支持 fallback model */
  supportsFallback: boolean;
  /** fallback model id（若支持） */
  fallbackModelId?: string;
  /** 成本统计与模型路由任务类型 */
  taskType: AgentTaskType;
}

/**
 * 专用 Agent 角色配置表。
 *
 * 对应 v1.1 §3.2 的角色定义：
 * - structured：DeepSeek-V3 主力（成本低 + 中文结构化质量高）
 * - conversation：DeepSeek-V3 主力（中文对话流畅）
 * - probe：DeepSeek-V3 主力（沿用当前已注册模型，避免未配置 reasoner 时运行失败）
 * - research：DeepSeek-V3 主力（联网研究与中文证据整理稳定，走 deep_research taskType 便于成本统计）
 * - roundtable：DeepSeek-V3 主力（多视角研讨与中文决策收敛稳定，走 roundtable taskType 便于成本统计）
 */
export const AGENT_ROLE_CONFIGS: Record<AgentRole, AgentRoleConfig> = {
  structured: {
    role: 'structured',
    label: '结构化 Agent',
    systemPrompt: STRUCTURED_AGENT_PROMPT,
    recommendedProvider: 'deepseek',
    recommendedModelId: 'deepseek-v4-flash',
    supportsFallback: false,
    taskType: 'knowledge_cards',
  },
  conversation: {
    role: 'conversation',
    label: '对话 Agent',
    systemPrompt: CONVERSATION_AGENT_PROMPT,
    recommendedProvider: 'deepseek',
    recommendedModelId: 'deepseek-v4-flash',
    supportsFallback: false,
    taskType: 'conversation',
  },
  probe: {
    role: 'probe',
    label: '追问 Agent',
    systemPrompt: PROBE_AGENT_PROMPT,
    recommendedProvider: 'deepseek',
    recommendedModelId: 'deepseek-v4-flash',
    supportsFallback: false,
    taskType: 'socratic_questioning',
  },
  research: {
    role: 'research',
    label: '研究 Agent',
    systemPrompt: RESEARCH_AGENT_PROMPT,
    recommendedProvider: 'deepseek',
    recommendedModelId: 'deepseek-v4-flash',
    supportsFallback: false,
    taskType: 'deep_research',
  },
  roundtable: {
    role: 'roundtable',
    label: '圆桌 Agent',
    systemPrompt: ROUNDTABLE_AGENT_PROMPT,
    recommendedProvider: 'deepseek',
    recommendedModelId: 'deepseek-v4-flash',
    supportsFallback: false,
    taskType: 'roundtable',
  },
};

/**
 * 用户意图到 Agent 角色的映射。
 *
 * 基于用户消息意图选择最合适的 Agent 角色：
 * - request_advice → conversation（用户请求建议/下一步，对话 Agent 主回答）
 * - request_probe → probe（用户请求追问/盲区识别，追问 Agent 接管）
 * - request_research → research（用户请求深度研究、调研、竞品分析或多来源查证）
 * - request_roundtable → roundtable（用户请求圆桌研讨、多专家评审或多视角辩论）
 * - skeptic → conversation（用户质疑，回到对话 Agent 直接回答）
 * - neutral → conversation（默认对话 Agent）
 *
 * 注意：structured 角色不由用户意图直接触发，
 * 而是由系统任务（如 material_parse、entity_extraction）内部调度。
 */
const INTENT_TO_ROLE_MAP: Record<string, AgentRole> = {
  request_advice: 'conversation',
  request_probe: 'probe',
  request_research: 'research',
  request_roundtable: 'roundtable',
  skeptic: 'conversation',
  neutral: 'conversation',
};

/**
 * 根据用户意图选择 Agent 角色。
 *
 * @param intent - 用户意图分类标签（来自 core/classifyUserIntent）
 * @returns 对应的 Agent 角色标识
 * @author fxbin
 */
export function selectAgentRole(intent: string): AgentRole {
  return INTENT_TO_ROLE_MAP[intent] ?? 'conversation';
}

/**
 * 多 Agent 装配选项。
 */
export interface MultiAgentOptions extends WorkspaceAgentOptions {
  /** 强制指定角色；省略时由调用方通过 selectAgentRole 选择 */
  role?: AgentRole;
}

/**
 * 为指定工作区构造一个角色感知的 Agent 实例。
 *
 * PoC 核心验证点：根据角色配置选择 systemPrompt 和推荐 model，
 * 装配为 pi-agent-core Agent 实例。
 *
 * 若 options.role 省略，回退到默认对话 Agent（与 createWorkspaceAgent 行为一致）。
 * 若 options.modelId 已显式传入，则不覆盖（尊重调用方覆盖）。
 *
 * @param workspaceId - 工作区 id
 * @param options - 配置项；role 决定 systemPrompt 和推荐 model
 * @returns 配置完成的 Agent 实例
 * @author fxbin
 */
export function createRoleBasedAgent(
  workspaceId: string,
  options: MultiAgentOptions = {},
): Agent {
  const { role = 'conversation', ...rest } = options;
  const config = AGENT_ROLE_CONFIGS[role];

  const mergedOptions: WorkspaceAgentOptions = {
    ...rest,
    systemPromptOverride: rest.systemPromptOverride ?? config.systemPrompt,
  };

  if (!rest.modelId && !rest.provider) {
    mergedOptions.provider = config.recommendedProvider;
    mergedOptions.modelId = config.recommendedModelId;
  }
  if (!rest.taskType) {
    mergedOptions.taskType = config.taskType;
  }

  return createWorkspaceAgent(workspaceId, mergedOptions);
}

/**
 * 导出角色系统提示词，便于调用方在其基础上做定制拼接或测试断言。
 */
export {
  STRUCTURED_AGENT_PROMPT,
  CONVERSATION_AGENT_PROMPT,
  PROBE_AGENT_PROMPT,
  RESEARCH_AGENT_PROMPT,
  ROUNDTABLE_AGENT_PROMPT,
};

/**
 * 触发辅 probe Agent 的最少主 Agent 检索工具调用次数。
 *
 * 主 Agent 未调检索工具时，说明是闲聊或非知识库场景，无需盲区检测。
 * 设为 1 次：只要主 Agent 调过 search_cards / search_materials / get_workspace_summary / web_search / fetch_web_page / deep_search，
 * 即认为是在知识库语境下作答，可能有盲区可追问。
 */
export const AUXILIARY_PROBE_MIN_TOOL_CALLS = 1;

/**
 * 辅 probe Agent 单轮输出的最大字符数，超过时前端截断展示。
 *
 * 控制 probe 输出体量，避免辅追问喧宾夺主。
 */
export const AUXILIARY_PROBE_MAX_OUTPUT_LENGTH = 500;

/**
 * 构造辅 probe Agent 的用户 prompt。
 *
 * 辅 probe Agent 的职责：基于主 Agent 的回答检测盲区，提出 1-2 个聚焦追问。
 * 不重新检索（复用主 Agent 已检索到的上下文），仅基于回答本身做盲区推断。
 *
 * @param userMessage - 用户原始问题
 * @param mainAnswer - 主 Agent 的完整回答
 * @returns probe Agent 的用户 prompt
 * @author fxbin
 */
export function buildAuxiliaryProbePrompt(userMessage: string, mainAnswer: string): string {
  return [
    '基于以下对话，检测用户可能存在的知识盲区，提出 1-2 个聚焦追问。',
    '追问必须聚焦回答中未覆盖的盲区，不发散到无关话题。',
    '不要直接给答案，用问题引导用户自己思考。',
    '若主回答已充分覆盖用户问题，无明确盲区，则输出「主回答已覆盖问题，无需追问」。',
    '',
    `用户问题：${userMessage}`,
    '',
    `助理回答：${mainAnswer}`,
  ].join('\n');
}
