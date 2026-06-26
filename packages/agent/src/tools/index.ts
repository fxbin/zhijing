import type { AgentTool } from '@earendil-works/pi-agent-core';
import { createSearchCardsTool } from './search-cards.js';
import { createSearchMaterialsTool } from './search-materials.js';
import { createGetWorkspaceSummaryTool } from './get-workspace-summary.js';
import type { ToolCapabilityDeclaration } from '../capability-guard.js';

export { createSearchCardsTool, createSearchMaterialsTool, createGetWorkspaceSummaryTool };

/**
 * 工具名常量：search_cards。
 *
 * 与 createSearchCardsTool 返回的 tool.name 保持一致，
 * 集中维护避免魔法值散落。
 *
 * @author fxbin
 */
const TOOL_NAME_SEARCH_CARDS = 'search_cards';

/**
 * 工具名常量：search_materials。
 *
 * @author fxbin
 */
const TOOL_NAME_SEARCH_MATERIALS = 'search_materials';

/**
 * 工具名常量：get_workspace_summary。
 *
 * @author fxbin
 */
const TOOL_NAME_GET_WORKSPACE_SUMMARY = 'get_workspace_summary';

/**
 * 工具能力声明映射表。
 *
 * 每个挂载到知径 Agent 的工具都必须在此声明其 capability 与 workspaceScoped，
 * 否则 createWorkspaceAgent 会拒绝挂载（fail-fast）。
 *
 * 当前所有工具都是 read 类且绑定到单个工作区：
 * - search_cards：检索当前工作区卡片
 * - search_materials：检索当前工作区资料
 * - get_workspace_summary：返回当前工作区概览
 *
 * 未来若引入 mutate/network 工具（如写入卡片、抓取网页），
 * 必须在此声明并显式放开 ALLOWED_TOOL_CAPABILITIES 白名单后方可挂载。
 *
 * @author fxbin
 */
const TOOL_CAPABILITY_DECLARATIONS: Record<string, ToolCapabilityDeclaration> = {
  [TOOL_NAME_SEARCH_CARDS]: { capability: 'read', workspaceScoped: true },
  [TOOL_NAME_SEARCH_MATERIALS]: { capability: 'read', workspaceScoped: true },
  [TOOL_NAME_GET_WORKSPACE_SUMMARY]: { capability: 'read', workspaceScoped: true },
};

/**
 * 获取工具的能力声明。
 *
 * @param toolName - 工具名
 * @returns 能力声明；未声明的工具返回 undefined，调用方应据此 fail-fast
 * @author fxbin
 */
export function getToolCapabilityDeclaration(toolName: string): ToolCapabilityDeclaration | undefined {
  return TOOL_CAPABILITY_DECLARATIONS[toolName];
}

/**
 * 为指定工作区构造全部检索工具，返回 Agent 可用的工具集。
 *
 * 当前包含三件套：
 * - search_cards：检索已结构化的知识卡片
 * - search_materials：检索已导入的来源资料
 * - get_workspace_summary：返回工作区整体概览
 *
 * 工具按「先局部后整体、先卡片后资料」的检索策略排序，
 * 由 systemPrompt 引导模型按需调用。
 *
 * @param workspaceId - 工作区 id；所有工具都会绑定此 id 做检索
 * @returns AgentTool 数组，可直接传入 AgentState.tools
 * @author fxbin
 */
export function createWorkspaceTools(workspaceId: string): AgentTool[] {
  return [
    createSearchCardsTool(workspaceId),
    createSearchMaterialsTool(workspaceId),
    createGetWorkspaceSummaryTool(workspaceId),
  ];
}
