import { Type } from '@zhijing/pi-runtime';
import { getWorkspaceOverview, type WorkspaceOverview } from '@zhijing/core';
import type { AgentTool, AgentToolResult } from '@earendil-works/pi-agent-core';

/**
 * get_workspace_summary 工具的入参 schema。
 *
 * 工具不需要任何参数：工作区 id 在工厂注入时已固定。
 */
const GetWorkspaceSummaryParameters = Type.Object({});

/**
 * 将工作区概览渲染为面向 LLM 的文本摘要。
 *
 * @param overview - 工作区概览数据
 * @returns 文本摘要
 * @author fxbin
 */
function formatOverview(overview: WorkspaceOverview): string {
  const stageLine = overview.stage ? `\n- 阶段：${overview.stage}` : '';
  return [
    `工作区概览：`,
    `- 标题：${overview.title}`,
    `- 摘要：${overview.summary || '（暂无摘要）'}`,
    `- 来源数：${overview.sourceCount}`,
    `- 卡片数：${overview.cardCount}`,
    `- 资料数：${overview.materialCount}`,
  ].join('\n') + stageLine;
}

/**
 * 构造当前工作区的「查看工作区概览」工具。
 *
 * 工具职责：返回当前工作区的基础信息（标题、摘要、阶段、来源/卡片/资料数量），
 * 用于回答用户对工作区整体状况的提问，或在不确定是否需要更细粒度检索时先做整体了解。
 *
 * 工具不调用任何外部模型，仅做一次数据库查询；调用成本极低，
 * 适合作为 Agent 接入新工作区或处理宏观问题时的第一手信息来源。
 *
 * @param workspaceId - 工作区 id；工厂在请求入口注入，工具内部不再校验
 * @returns AgentTool 实例，可直接挂载到 Agent 工具集
 * @author fxbin
 */
export function createGetWorkspaceSummaryTool(workspaceId: string): AgentTool<typeof GetWorkspaceSummaryParameters, WorkspaceOverview | null> {
  return {
    name: 'get_workspace_summary',
    label: '查看工作区概览',
    description: [
      '获取当前工作区的基础信息：标题、摘要、阶段、来源/卡片/资料数量。',
      '用于回答关于工作区整体状况的提问，或决定后续是否需要更细粒度的检索。',
    ].join(' '),
    parameters: GetWorkspaceSummaryParameters,
    async execute(_toolCallId, _params): Promise<AgentToolResult<WorkspaceOverview | null>> {
      const overview = getWorkspaceOverview(workspaceId) ?? null;
      const text = overview
        ? formatOverview(overview)
        : `未找到 id 为 ${workspaceId} 的工作区，请确认工作区是否存在。`;
      return {
        content: [{ type: 'text', text }],
        details: overview,
      };
    },
  };
}
