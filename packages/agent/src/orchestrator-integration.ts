/**
 * 编排 Agent 集成层。
 *
 * 基于 core/orchestrator 产出的 OrchestratorDecision，
 * 为 Agent 装配与当前模式匹配的 systemPrompt + 动态行为上下文。
 *
 * 三模式对应「镜子不保姆」理念的不同执行强度：
 * - mirror：被动响应，只在被提问时作答，不延伸不引导
 * - catalyst：识别盲区，用苏格拉底式追问引导用户自己建构认知
 * - navigator：基于证据主动建议下一步行动，但建议非命令
 *
 * P0.2 升级：从静态 prompt 拼接升级为动态行为注入——
 * 把 decision.activeProposals 渲染为 evidence 段落注入 systemPrompt，
 * 让 catalyst/navigator 有据可依地追问和建议。
 *
 * @module orchestrator-integration
 * @author fxbin
 */

import type { AgentProposal, OrchestratorDecision, OrchestratorMode } from '@zhijing/shared';
import { Agent } from '@earendil-works/pi-agent-core';
import { createWorkspaceAgent, type WorkspaceAgentOptions } from './agent-factory.js';
import { AGENT_ROLE_CONFIGS, type AgentRole } from './multi-agent-orchestrator.js';

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
  '- 只能通过提供的工具获取信息：search_cards（搜索已结构化卡片）、search_materials（搜索原始来源资料）、get_workspace_summary（查看工作区整体概览）、web_search（联网搜索外部资料摘要）。',
  '- 只能通过 web_search 联网；不能访问其他工作区、不能修改任何数据。',
  '- 不能替代用户做最终判断；证据不足时如实说明，不要编造内容或引用不存在的卡片/资料。',
  '',
  '工具调用策略：',
  '- 接入新对话或处理宏观问题时，先调 get_workspace_summary。',
  '- 处理具体问题时，先调 search_cards；若卡片结果不足以作答，再调 search_materials。',
  '- 当用户明确要求最新信息、外部资料、联网搜索，或工作区证据不足以回答外部事实时，才调用 web_search。',
  '- web_search 的结果只能作为外部参考；回答中必须附上使用到的 URL，且不要把搜索结果当成工作区内证据。',
  '- 同一轮可并行调用多次检索工具，使用不同关键词扩展检索面。',
  '',
  '输出风格：',
  '- 中文回答；引用卡片/资料时附上其 id，方便用户定位。',
  '- 若工作区检索结果为空或不足以作答，明确告知用户当前工作区缺少哪些信息；如已使用 web_search，区分「工作区证据」与「外部搜索结果」。',
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
 * 单条提议注入到 prompt 的最大描述长度，避免 prompt 过长挤占上下文窗口。
 */
const PROPOSAL_DESCRIPTION_MAX_LENGTH = 200;

/**
 * 单模式注入到 prompt 的最大提议条数，避免一次追问/建议过多导致用户疲劳。
 */
const MAX_ACTIVE_PROPOSALS_PER_MODE = 3;

/**
 * 把单条 AgentProposal 渲染为 prompt 行，截断超长描述。
 *
 * 仅作为结构化 hints 渲染失败时的回退路径，确保 evidence 不丢失。
 *
 * @param proposal - 提议条目
 * @returns prompt 行（含类型标签、标题、描述）
 * @author fxbin
 */
function formatProposalLine(proposal: AgentProposal): string {
  const trimmedDescription = proposal.description.length > PROPOSAL_DESCRIPTION_MAX_LENGTH
    ? `${proposal.description.slice(0, PROPOSAL_DESCRIPTION_MAX_LENGTH)}…`
    : proposal.description;
  return `- [${proposal.type}] ${proposal.title}：${trimmedDescription}`;
}

/**
 * 把单条提议的 metadata 渲染为可读字段列表，供 Agent 引用具体证据（如卡片 id、recall 分数）。
 *
 * 仅作为结构化 hints 渲染失败时的回退路径。
 *
 * @param proposal - 提议条目
 * @returns metadata 字段列表；空则返回空字符串
 * @author fxbin
 */
function formatProposalMetadata(proposal: AgentProposal): string {
  const entries = Object.entries(proposal.metadata ?? {});
  if (entries.length === 0) return '';
  return entries.map(([key, value]) => `  · ${key}: ${JSON.stringify(value)}`).join('\n');
}

/**
 * 从 AgentProposal.metadata 中安全读取字符串字段。
 *
 * @param metadata - 提议元数据
 * @param key - 字段名
 * @returns 字符串值；不存在或类型不符时返回空字符串
 * @author fxbin
 */
function readStringMetadata(metadata: Record<string, unknown> | undefined, key: string): string {
  const value = metadata?.[key];
  return typeof value === 'string' ? value : '';
}

/**
 * 从 AgentProposal.metadata 中安全读取数字字段。
 *
 * @param metadata - 提议元数据
 * @param key - 字段名
 * @returns 数字值；不存在或非有限数字时返回 null
 * @author fxbin
 */
function readNumberMetadata(metadata: Record<string, unknown> | undefined, key: string): number | null {
  const value = metadata?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * 数字转保留两位小数的字符串；null 返回空字符串。
 *
 * @param value - 数字值
 * @returns 格式化字符串
 * @author fxbin
 */
function formatNumber(value: number | null): string {
  return value === null ? '' : value.toFixed(2);
}

/**
 * 把单条催化剂模式 proposal 渲染为「最尖锐的提问」模板。
 *
 * 催化剂模式的核心理念是「不直接给答案，用最尖锐的问题引导用户自己发现认知缺口」。
 * 因此本函数不是简单列出 proposal，而是把 evidence 转化为具体追问方向：
 * - blind_spot：把「盲区术语 + 兴趣权重 + 覆盖分数」转化为「为什么这片一直没补」的反思追问
 * - repeated_thinking：把「重复次数 + 相似度」转化为「是否该换角度」的元认知追问
 *
 * @param proposal - 催化剂模式下的活跃提议（blind_spot 或 repeated_thinking）
 * @returns 结构化追问模板；非催化剂类型返回空字符串
 * @author fxbin
 */
function buildCatalystQuestionHint(proposal: AgentProposal): string {
  if (proposal.type === 'blind_spot') {
    const term = readStringMetadata(proposal.metadata, 'term');
    if (!term) return '';
    const interestWeight = readNumberMetadata(proposal.metadata, 'interestWeight');
    const coverageScore = readNumberMetadata(proposal.metadata, 'coverageScore');
    const weightPart = interestWeight !== null ? `兴趣权重 ${formatNumber(interestWeight)}` : '';
    const coveragePart = coverageScore !== null ? `覆盖分数 ${formatNumber(coverageScore)}` : '';
    const evidence = [weightPart, coveragePart].filter((s) => s.length > 0).join('，');
    return `• 盲区追问：你对「${term}」关注度高${evidence ? `（${evidence}）` : ''}，但知识库覆盖不足。请用一个聚焦问题引导用户反思：为什么这片一直没补？是难度太大、还是优先级被其他主题挤掉了？不要直接告诉用户该补什么，要让用户自己说出原因。`;
  }
  if (proposal.type === 'repeated_thinking') {
    const repeatCount = readNumberMetadata(proposal.metadata, 'repeatCount');
    const similarityScore = readNumberMetadata(proposal.metadata, 'similarityScore');
    const countPart = repeatCount !== null ? `${repeatCount} 次` : '多次';
    const simPart = similarityScore !== null ? `，相似度 ${formatNumber(similarityScore)}` : '';
    return `• 元认知追问：用户已 ${countPart}提出相似问题${simPart}。请用一个聚焦问题引导用户做元认知反思：是同一问题没想清楚需要深化，还是陷入了思维定式需要换角度？不要直接告诉用户「你在重复」，要让用户自己意识到。`;
  }
  return '';
}

/**
 * 把单条导航员模式 proposal 渲染为「具体可执行建议」模板。
 *
 * 导航员模式的核心理念是「建议必须可执行，明示这是建议而非命令」。
 * 因此本函数把 evidence 转化为带具体 id/分数/天数的可执行行动：
 * - recall_review：建议复习具体卡片（附 cardId + recall 分数 + 未访问天数）
 * - topic_explore：建议探索具体主题（附 term + 权重 + 来源数）
 * - workspace_emergence：建议创建命名工作区（附 keyword + 卡片数）
 *
 * @param proposal - 导航员模式下的活跃提议（recall_review / topic_explore / workspace_emergence）
 * @returns 结构化可执行建议模板；非导航员类型返回空字符串
 * @author fxbin
 */
function buildNavigatorActionHint(proposal: AgentProposal): string {
  if (proposal.type === 'recall_review') {
    const cardId = readStringMetadata(proposal.metadata, 'cardId');
    if (!cardId) return '';
    const recallScore = readNumberMetadata(proposal.metadata, 'recallScore');
    const daysSinceLastAccess = readNumberMetadata(proposal.metadata, 'daysSinceLastAccess');
    const scorePart = recallScore !== null ? `recall 分数 ${formatNumber(recallScore)}` : '';
    const daysPart = daysSinceLastAccess !== null ? `已 ${daysSinceLastAccess} 天未访问` : '';
    const evidence = [scorePart, daysPart].filter((s) => s.length > 0).join('，');
    return `• 复习建议：建议复习卡片 ${cardId}${evidence ? `（${evidence}）` : ''}。请在回答中明示这是建议而非命令，用户可拒绝，拒绝后不重复推送。`;
  }
  if (proposal.type === 'topic_explore') {
    const term = readStringMetadata(proposal.metadata, 'term');
    if (!term) return '';
    const weight = readNumberMetadata(proposal.metadata, 'weight');
    const sourceCount = readNumberMetadata(proposal.metadata, 'sourceCount');
    const weightPart = weight !== null ? `权重 ${formatNumber(weight)}` : '';
    const sourcePart = sourceCount !== null ? `来源 ${sourceCount} 篇` : '';
    const evidence = [weightPart, sourcePart].filter((s) => s.length > 0).join('，');
    return `• 探索建议：建议探索主题「${term}」${evidence ? `（${evidence}）` : ''}。可考虑深化已有资料或建立专题知识库。明示这是建议，用户可拒绝。`;
  }
  if (proposal.type === 'workspace_emergence') {
    const keyword = readStringMetadata(proposal.metadata, 'keyword');
    if (!keyword) return '';
    const cardCount = readNumberMetadata(proposal.metadata, 'cardCount');
    const countPart = cardCount !== null ? `${cardCount} 张` : '多张';
    return `• 组织建议：默认工作区中有 ${countPart}卡片与「${keyword}」相关。建议创建命名工作区来组织这些卡片。明示这是建议，用户可拒绝。`;
  }
  return '';
}

/**
 * 根据编排决策构建动态行为上下文段，注入到 systemPrompt。
 *
 * P0.2 升级：从通用 evidence 列表升级为模式差异化注入——
 * - catalyst：调用 buildCatalystQuestionHint 生成「最尖锐的提问」模板
 * - navigator：调用 buildNavigatorActionHint 生成「具体可执行建议」模板
 * - 结构化渲染失败时回退到通用 formatProposalLine，确保 evidence 不丢失
 *
 * 上下文段结构：
 * - 当前模式标签 + 选择理由
 * - 建议行动（若有）
 * - 模式差异化的 evidence 段（catalyst/navigator 才有）
 *
 * mirror 模式不注入 evidence，保持纯被动响应。
 *
 * @param decision - 编排决策
 * @returns 行为上下文段；mirror 模式返回空字符串
 * @author fxbin
 */
export function buildBehaviorContext(decision: OrchestratorDecision): string {
  if (decision.mode === 'mirror' || decision.activeProposals.length === 0) {
    return '';
  }

  const limited = decision.activeProposals.slice(0, MAX_ACTIVE_PROPOSALS_PER_MODE);
  const hintBuilder = decision.mode === 'catalyst' ? buildCatalystQuestionHint : buildNavigatorActionHint;
  const hintLines = limited.map(hintBuilder).filter((line) => line.length > 0);

  const evidenceLabel = decision.mode === 'catalyst'
    ? '追问引导（基于盲区/重复思考证据生成的聚焦问题方向，须转化为 1-2 个具体追问，不得直接复制给用户）'
    : '行动建议（基于复习/探索/组织证据生成的可执行建议，须转化为 1-3 条具体行动，明示建议非命令）';

  if (hintLines.length > 0) {
    return [
      '',
      '【当前编排上下文】',
      `模式：${decision.mode}`,
      `选择理由：${decision.reason}`,
      decision.suggestedAction ? `建议行动：${decision.suggestedAction}` : '',
      '',
      `${evidenceLabel}：`,
      ...hintLines,
    ].filter((line) => line.length > 0).join('\n');
  }

  const fallbackLines = limited.map((proposal) => {
    const line = formatProposalLine(proposal);
    const meta = formatProposalMetadata(proposal);
    return meta ? `${line}\n${meta}` : line;
  }).join('\n');

  return [
    '',
    '【当前编排上下文】',
    `模式：${decision.mode}`,
    `选择理由：${decision.reason}`,
    decision.suggestedAction ? `建议行动：${decision.suggestedAction}` : '',
    '',
    '活跃证据（基于工作区注意力信号聚合，可作为追问/建议的依据，但不得直接复制给用户）：',
    fallbackLines,
  ].filter((line) => line.length > 0).join('\n');
}

/**
 * 根据编排决策选择对应的完整 systemPrompt。
 *
 * P0.2 升级：从静态拼接升级为动态注入——
 * 在 ORCHESTRATOR_BASE_PROMPT + 模式行为段之后，
 * 追加 buildBehaviorContext 产出的 evidence 段。
 *
 * @param decision - 编排决策；其 mode 决定行为段，activeProposals 决定 evidence 段
 * @returns 拼接后的完整 systemPrompt
 * @author fxbin
 */
export function selectOrchestratorSystemPrompt(decision: OrchestratorDecision): string {
  const behavior = MODE_BEHAVIOR_PROMPTS[decision.mode];
  const context = buildBehaviorContext(decision);
  return context
    ? `${ORCHESTRATOR_BASE_PROMPT}\n${behavior}\n${context}`
    : `${ORCHESTRATOR_BASE_PROMPT}\n${behavior}`;
}

/**
 * 编排 Agent 工厂配置项。
 *
 * 在 WorkspaceAgentOptions 基础上新增 decision 字段，
 * 用于驱动 systemPrompt 的模式选择。
 *
 * P1.1a 新增 role 字段，用于按用户意图选择 Agent 角色，
 * 角色配置会覆盖 provider/modelId（apiKey 保持调用方传入）。
 */
export interface OrchestratedAgentOptions extends WorkspaceAgentOptions {
  /**
   * 编排决策；其 mode 字段决定 systemPrompt 的行为段。
   * 若省略则回退到 createWorkspaceAgent 的默认 systemPrompt。
   */
  decision?: OrchestratorDecision;
  /**
   * Agent 角色；其 recommendedProvider/recommendedModelId 会覆盖调用方传入的 provider/modelId。
   *
   * P1.1a 引入：让 /agent/stream 路由按 classifyUserIntent(message) → selectAgentRole(intent)
   * 选择对应角色，probe 角色自动用 deepseek-reasoner，structured/conversation 保持 deepseek-v4-flash。
   * apiKey 不被覆盖（同 provider 共用 key）。
   *
   * 若省略则保持调用方传入的 provider/modelId 不变（向后兼容 P0.x 行为）。
   */
  role?: AgentRole;
}

/**
 * 为指定工作区构造一个编排感知的 Agent 实例。
 *
 * 与 createWorkspaceAgent 的差异：
 * - 若提供 decision，按 decision.mode 选择 systemPrompt（覆盖 systemPromptOverride）
 * - 若提供 role，按 AGENT_ROLE_CONFIGS[role] 覆盖 provider/modelId（P1.1a 新增）
 * - 若均未提供，回退到 createWorkspaceAgent 的默认行为
 *
 * 调用方负责先通过 core.buildInterceptedDecision(workspaceId, message) 获取决策，
 * 再通过 core.classifyUserIntent(message) → agent.selectAgentRole(intent) 选择角色，
 * 最后将 decision + role 一并传入本函数。本函数不做信号聚合或意图识别，保持薄装配层定位。
 *
 * @param workspaceId - 工作区 id；所有工具会绑定此 id 做检索
 * @param options - 配置项；decision.mode 决定 systemPrompt，role 决定 provider/modelId
 * @returns 配置完成的 Agent 实例
 * @author fxbin
 */
export function createOrchestratedWorkspaceAgent(
  workspaceId: string,
  options: OrchestratedAgentOptions = {},
): Agent {
  const { decision, role, ...rest } = options;
  const mergedOptions: WorkspaceAgentOptions = { ...rest };

  if (decision) {
    mergedOptions.systemPromptOverride = selectOrchestratorSystemPrompt(decision);
  }

  if (role) {
    const roleConfig = AGENT_ROLE_CONFIGS[role];
    mergedOptions.provider = roleConfig.recommendedProvider;
    mergedOptions.modelId = roleConfig.recommendedModelId;
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
