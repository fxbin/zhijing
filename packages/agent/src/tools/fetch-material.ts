import { Type } from '@zhijing/pi-runtime';
import { getWorkspaceMaterial, type WorkspaceMaterialDetail } from '@zhijing/core';
import type { AgentTool, AgentToolResult } from '@earendil-works/pi-agent-core';
import { sanitizeForLlmContext } from './sanitize.js';

/**
 * fetch_material 工具的入参 schema。
 *
 * - materialId：资料 ID，必填。来自 search_materials 返回结果中的 id 字段。
 */
const FetchMaterialParameters = Type.Object({
  materialId: Type.String({
    description: [
      '要获取完整正文的资料 ID，必填。',
      '该 ID 来自 search_materials 返回结果中的 id 字段。',
    ].join(' '),
  }),
});

/**
 * fetch_material 工具执行结果结构（details 字段）。
 */
export interface FetchMaterialDetails {
  ok: boolean;
  material?: WorkspaceMaterialDetail;
  errorMessage?: string;
}

/**
 * 完整正文字符数上限，超过截断以控制上下文窗口。
 * 超长资料（如整本书笔记）可能挤占上下文，因此做硬截断。
 */
const MATERIAL_CONTENT_MAX_LENGTH = 4000;

/**
 * 构造当前工作区的「获取资料完整正文」工具。
 *
 * 工具职责：按 materialId 拉取资料的完整 contentText，用于 search_materials
 * 返回的 preview（命中位置周围片段）不足以作答时，获取原文以定位完整上下文。
 *
 * 使用场景：
 * - search_materials 命中但 preview 未覆盖用户关心的段落
 * - 需要引用原文具体段落（如提炼 quote 卡片）
 * - 验证 preview 中片段的完整上下文
 *
 * 工具不调用任何外部模型，仅做数据库读取；调用成本低，
 * 但应仅在 search_materials preview 不足时按需调用，避免拉取大段正文挤占上下文。
 *
 * @param workspaceId - 工作区 id；工厂在请求入口注入，工具内部不再校验
 * @returns AgentTool 实例，可直接挂载到 Agent 工具集
 * @author fxbin
 */
export function createFetchMaterialTool(workspaceId: string): AgentTool<typeof FetchMaterialParameters, FetchMaterialDetails> {
  return {
    name: 'fetch_material',
    label: '获取资料正文',
    description: [
      '按 materialId 获取工作区内资料的完整正文，用于 search_materials 返回的 preview 不足以定位原文段落时。',
      '仅在需要引用原文具体段落或 preview 未覆盖关键内容时调用；常规问答基于 preview 即可。',
    ].join(' '),
    parameters: FetchMaterialParameters,
    async execute(_toolCallId, params): Promise<AgentToolResult<FetchMaterialDetails>> {
      const material = getWorkspaceMaterial(workspaceId, params.materialId);
      if (!material) {
        return {
          content: [{ type: 'text', text: `未找到 ID 为 ${params.materialId} 的资料，或该资料不属于当前工作区。` }],
          details: { ok: false, errorMessage: 'Material not found or not in this workspace.' },
        };
      }
      const safeTitle = sanitizeForLlmContext(material.title);
      const safeContent = sanitizeForLlmContext(material.contentText);
      const trimmedContent = safeContent.length > MATERIAL_CONTENT_MAX_LENGTH
        ? `${safeContent.slice(0, MATERIAL_CONTENT_MAX_LENGTH)}…（正文共 ${safeContent.length} 字符，已截断）`
        : safeContent;
      const summary = `资料《${safeTitle}》完整正文：\n${trimmedContent}`;
      return {
        content: [{ type: 'text', text: summary }],
        details: { ok: true, material },
      };
    },
  };
}
