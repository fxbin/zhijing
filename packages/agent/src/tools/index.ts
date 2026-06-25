import type { AgentTool } from '@earendil-works/pi-agent-core';
import { createSearchCardsTool } from './search-cards.js';
import { createSearchMaterialsTool } from './search-materials.js';
import { createGetWorkspaceSummaryTool } from './get-workspace-summary.js';

export { createSearchCardsTool, createSearchMaterialsTool, createGetWorkspaceSummaryTool };

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
