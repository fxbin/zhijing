import { Type } from '@zhijing/pi-runtime';
import { searchWorkspaceMaterials, type WorkspaceMaterialSearchResult } from '@zhijing/core';
import type { AgentTool, AgentToolResult } from '@earendil-works/pi-agent-core';
import { sanitizeForLlmContext } from './sanitize.js';

/**
 * search_materials 工具的入参 schema。
 *
 * - query：用户提问或检索片段，必填，不可为空字符串。
 * - limit：返回资料数量上限，可选；省略时使用 core 默认值。
 */
const SearchMaterialsParameters = Type.Object({
  query: Type.String({ description: '检索关键词或自然语言片段，必填' }),
  limit: Type.Optional(
    Type.Integer({ description: '返回资料数量上限，省略时使用默认值', minimum: 1, maximum: 20 }),
  ),
});

/**
 * search_materials 工具执行结果结构（details 字段）。
 */
export interface SearchMaterialsDetails {
  count: number;
  items: WorkspaceMaterialSearchResult[];
}

/**
 * 文本摘要的单条资料预览最大字符数，避免 content 数组过长挤占上下文窗口。
 */
const MATERIAL_PREVIEW_MAX_LENGTH = 320;

/**
 * 将单条资料渲染为文本摘要片段，截断超长预览以保证上下文可控。
 *
 * 标题与预览均经过 sanitizeForLlmContext 清洗，移除围栏、模型控制 token
 * 与 prompt 注入字符，避免工具输出被 LLM 误解析为指令或事件。
 *
 * @param material - 资料检索结果
 * @returns 文本摘要片段
 * @author fxbin
 */
function formatMaterialLine(material: WorkspaceMaterialSearchResult): string {
  const safeTitle = sanitizeForLlmContext(material.title);
  const safePreview = sanitizeForLlmContext(material.preview);
  const trimmedPreview = safePreview.length > MATERIAL_PREVIEW_MAX_LENGTH
    ? `${safePreview.slice(0, MATERIAL_PREVIEW_MAX_LENGTH)}…`
    : safePreview;
  const platformSuffix = material.platform ? `[${material.platform}]` : '';
  const parseSuffix = material.parseStatus ? `[${material.parseStatus}]` : '';
  return `- ${safeTitle} ${platformSuffix}${parseSuffix} (id=${material.id})\n  ${trimmedPreview}`;
}

/**
 * 构造当前工作区的「搜索来源资料」工具。
 *
 * 工具职责：在用户当前工作区内按关键词检索已导入的来源资料（material），
 * 返回标题、平台、解析状态与内容预览。用于追溯一手资料、查阅卡片未覆盖的信息，
 * 或在卡片检索结果不足时补充上下文。
 *
 * 工具不调用任何外部模型，仅做 TF-IDF 关键词检索；调用顺序应排在 search_cards 之后，
 * 仅在卡片结果不足以作答时再调用，以控制上下文体积。
 *
 * @param workspaceId - 工作区 id；工厂在请求入口注入，工具内部不再校验
 * @returns AgentTool 实例，可直接挂载到 Agent 工具集
 * @author fxbin
 */
export function createSearchMaterialsTool(workspaceId: string): AgentTool<typeof SearchMaterialsParameters, SearchMaterialsDetails> {
  return {
    name: 'search_materials',
    label: '搜索来源资料',
    description: [
      '在当前工作区内按关键词搜索已导入的来源资料（material），返回标题、平台、解析状态与内容预览。',
      '用于追溯一手资料或查阅卡片未覆盖的信息；仅在 search_cards 结果不足以作答时调用。',
    ].join(' '),
    parameters: SearchMaterialsParameters,
    async execute(_toolCallId, params): Promise<AgentToolResult<SearchMaterialsDetails>> {
      const items = searchWorkspaceMaterials(workspaceId, params.query, params.limit);
      const summary = items.length === 0
        ? `未在工作区内检索到与「${params.query}」相关的来源资料。`
        : `已检索到 ${items.length} 条与「${params.query}」相关的来源资料：\n${items.map(formatMaterialLine).join('\n')}`;
      return {
        content: [{ type: 'text', text: summary }],
        details: { count: items.length, items },
      };
    },
  };
}
