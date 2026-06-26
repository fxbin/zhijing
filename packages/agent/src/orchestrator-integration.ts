/**
 * 编排 Agent 集成层。
 *
 * 基于 core/orchestrator 产出的 OrchestratorDecision，
 * 为 Agent 装配与当前模式匹配的 systemPrompt。
 *
 * 三模式对应「镜子不保姆」理念的不同执行强度：
 * - mirror：被动响应，只在被提问时作答，不延伸不引导
 * - catalyst：识别盲区，用苏格拉底式追问引导用户自己建构认知
 * - navigator：基于证据主动建议下一步行动，但建议非命令
 *
 * @module orchestrator-integration
 * @author fxbin
 */

import type { OrchestratorDecision, OrchestratorMode } from '@zhijing/shared';
import { Agent } from '@earendil-works/pi-agent-core';
import { createWorkspaceAgent, type WorkspaceAgentOptions } from './agent-factory.js';

/**
 * 编排 Agent 公共能力边界段。
 *
 * 三模式共享，定义工具边界、调用策略与输出风格。
 * 与 agent-factory.ts 中的 ZHIJING_AGENT_SYSTEM_PROMPT 内容一致，
 * 此处独立提取以便三模式拼接复用，避免运行时依赖。
 */
const ORCHESTRATOR_BASE_PROMPT = [
  '你是「知径」工作台的智能助理，专门帮助用户管理当前工作区内的个人知识库。',
  '',
  '能力边界：',
  '- 只能通过提供的三个检索工具访问当前工作区内容：search_cards（搜索已结构化卡片）、search_materials（搜索原始来源资料）、get_workspace_summary（查看工作区整体概览）。',
  '- 不能联网、不能访问其他工作区、不能修改任何数据。',
  '- 不能替代用户做最终判断；证据不足时如实说明，不要编造内容或引用不存在的卡片/资料。',
  '',
  '工具调用策略：',
  '- 接入新对话或处理宏观问题时，先调 get_workspace_summary。',
  '- 处理具体问题时，先调 search_cards；若卡片结果不足以作答，再调 search_materials。',
  '- 同一轮可并行调用多次检索工具，使用不同关键词扩展检索面。',
  '',
  '输出风格：',
  '- 中文回答；引用卡片/资料时附上其 id，方便用户定位。',
  '- 若检索结果为空或不足以作答，明确告知用户当前工作区缺少哪些信息，并建议如何补充。',
  '- 不输出与用户问题无关的客套话或重复信息。',
].join('\n');

/**
 * 镜子模式行为段。
 *
 * 被动响应：只在被提问时作答，不主动追问或延伸话题。
 * 严格基于检索结果，证据不足时如实说明，不替用户建构认知。
 */
const MIRROR_BEHAVIOR_PROMPT = [
  '',
  '当前模式：镜子模式（被动响应）',
  '',
  '本模式仅在被提问时回应，不主动追问或建议。',
  '行为约束：',
  '- 严格基于检索结果回答，证据不足时如实说明，不要补全。',
  '- 不延伸话题，不引导用户思考，不主动提及用户未问的内容。',
  '- 若用户问题模糊，请用户澄清而非自行猜测。',
  '- 引用卡片/资料必须附 id；无 id 的内容不得作为证据呈现。',
].join('\n');

/**
 * 催化剂模式行为段。
 *
 * 苏格拉底追问：识别知识盲区，通过提问引导用户自己发现认知缺口。
 * 不直接给答案，每轮最多 2 个追问，提供质疑模式入口。
 */
const CATALYST_BEHAVIOR_PROMPT = [
  '',
  '当前模式：催化剂模式（苏格拉底追问）',
  '',
  '本模式识别用户的知识盲区，通过提问引导用户自己发现认知缺口。',
  '行为约束：',
  '- 不直接给答案；先用 1-2 个聚焦问题引导用户思考，再视情况补充证据。',
  '- 问题必须聚焦当前对话已暴露的盲区，不发散到无关话题。',
  '- 每轮最多提出 2 个追问，避免用户疲劳。',
  '- 在追问后，主动提供「质疑模式」入口：用户可质疑 Agent 的提问方向是否合理。',
  '- 引用证据时必须附 id；若提问无直接证据支撑，明示「这是基于推断的提问」。',
  '- 不替代用户做最终判断；用户拒绝追问时立即回到镜子模式。',
].join('\n');

/**
 * 导航员模式行为段。
 *
 * 主动建议：基于遗忘曲线、盲区提议等证据推荐下一步行动。
 * 建议必须可执行，明示这是建议而非命令。
 */
const NAVIGATOR_BEHAVIOR_PROMPT = [
  '',
  '当前模式：导航员模式（主动建议）',
  '',
  '本模式基于工作区状态主动推荐下一步行动，包括复习、补盲区、拓展主题。',
  '行为约束：',
  '- 建议必须基于检索证据（卡片 recall、material、盲区提议等），不得凭空生成。',
  '- 每轮最多给出 3 条建议，按优先级从高到低排序。',
  '- 建议必须可执行（如「复习卡片 X」「补充资料 Y」），而非抽象概念。',
  '- 明确这是建议而非命令；用户可拒绝，拒绝后不重复推送同一条建议。',
  '- 不输出「你必须」「你应该」类指令性表述；改用「建议」「可以考虑」。',
  '- 引用证据必须附 id；无证据支撑的建议不得呈现。',
].join('\n');

/**
 * 模式到行为段 prompt 的映射表。
 *
 * 集中管理便于新增模式或调整 prompt 时只改一处。
 */
const MODE_BEHAVIOR_PROMPTS: Record<OrchestratorMode, string> = {
  mirror: MIRROR_BEHAVIOR_PROMPT,
  catalyst: CATALYST_BEHAVIOR_PROMPT,
  navigator: NAVIGATOR_BEHAVIOR_PROMPT,
};

/**
 * 根据编排模式选择对应的完整 systemPrompt。
 *
 * 拼接策略：ORCHESTRATOR_BASE_PROMPT + 模式行为段。
 * 所有模式共享公共能力边界，差异仅在行为约束段。
 *
 * @param mode - 编排模式（mirror / catalyst / navigator）
 * @returns 拼接后的完整 systemPrompt
 * @author fxbin
 */
export function selectOrchestratorSystemPrompt(mode: OrchestratorMode): string {
  const behavior = MODE_BEHAVIOR_PROMPTS[mode];
  return `${ORCHESTRATOR_BASE_PROMPT}\n${behavior}`;
}

/**
 * 编排 Agent 工厂配置项。
 *
 * 在 WorkspaceAgentOptions 基础上新增 decision 字段，
 * 用于驱动 systemPrompt 的模式选择。
 */
export interface OrchestratedAgentOptions extends WorkspaceAgentOptions {
  /**
   * 编排决策；其 mode 字段决定 systemPrompt 的行为段。
   * 若省略则回退到 createWorkspaceAgent 的默认 systemPrompt。
   */
  decision?: OrchestratorDecision;
}

/**
 * 为指定工作区构造一个编排感知的 Agent 实例。
 *
 * 与 createWorkspaceAgent 的差异：
 * - 若提供 decision，按 decision.mode 选择 systemPrompt（覆盖 systemPromptOverride）
 * - 若未提供 decision 或 decision.mode 无法识别，回退到默认 systemPrompt
 *
 * 调用方负责先通过 core.buildOrchestratorDecision(workspaceId) 获取决策，
 * 再将决策传入本函数。本函数不做信号聚合，保持薄装配层定位。
 *
 * @param workspaceId - 工作区 id；所有工具会绑定此 id 做检索
 * @param options - 配置项；decision.mode 决定 systemPrompt
 * @returns 配置完成的 Agent 实例
 * @author fxbin
 */
export function createOrchestratedWorkspaceAgent(
  workspaceId: string,
  options: OrchestratedAgentOptions = {},
): Agent {
  const { decision, ...rest } = options;
  const mergedOptions: WorkspaceAgentOptions = { ...rest };

  if (decision) {
    mergedOptions.systemPromptOverride = selectOrchestratorSystemPrompt(decision.mode);
  }

  return createWorkspaceAgent(workspaceId, mergedOptions);
}

/**
 * 导出三模式 prompt 段，便于调用方在其基础上做定制拼接或测试断言。
 */
export {
  ORCHESTRATOR_BASE_PROMPT,
  MIRROR_BEHAVIOR_PROMPT,
  CATALYST_BEHAVIOR_PROMPT,
  NAVIGATOR_BEHAVIOR_PROMPT,
};
