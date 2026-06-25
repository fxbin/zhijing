import { Type } from '@zhijing/pi-runtime';
import { searchWorkspaceCards, type WorkspaceCardSearchResult } from '@zhijing/core';
import type { AgentTool, AgentToolResult } from '@earendil-works/pi-agent-core';

/**
 * search_cards 工具的入参 schema。
 *
 * - query：用户提问或检索片段，必填，不可为空字符串。
 * - limit：返回卡片数量上限，可选；省略时使用 core 默认值。
 */
const SearchCardsParameters = Type.Object({
  query: Type.String({ description: '检索关键词或自然语言片段，必填' }),
  limit: Type.Optional(
    Type.Integer({ description: '返回卡片数量上限，省略时使用默认值', minimum: 1, maximum: 20 }),
  ),
});

/**
 * search_cards 工具执行结果结构（details 字段）。
 */
export interface SearchCardsDetails {
  count: number;
  items: WorkspaceCardSearchResult[];
}

/**
 * 文本摘要的单卡最大字符数，避免 content 数组过长挤占上下文窗口。
 */
const CARD_BODY_PREVIEW_MAX_LENGTH = 240;

/**
 * 将单张卡片渲染为文本摘要片段，截断超长正文以保证上下文可控。
 *
 * @param card - 卡片检索结果
 * @returns 文本摘要片段
 * @author fxbin
 */
function formatCardLine(card: WorkspaceCardSearchResult): string {
  const trimmedBody = card.body.length > CARD_BODY_PREVIEW_MAX_LENGTH
    ? `${card.body.slice(0, CARD_BODY_PREVIEW_MAX_LENGTH)}…`
    : card.body;
  const claimSuffix = card.claimStatus ? `[${card.claimStatus}]` : '';
  return `- (${card.type}) ${card.title} ${claimSuffix}\n  ${trimmedBody} (id=${card.id})`;
}

/**
 * 构造当前工作区的「搜索知识卡片」工具。
 *
 * 工具职责：在用户当前工作区内按关键词检索已结构化的知识卡片
 * （concept / method / fact / question / general 等），返回标题、正文与 id。
 * 用于回答用户对已有知识的查询、复核事实或衔接已有结论。
 *
 * 工具不调用任何外部模型，仅做 TF-IDF 关键词检索，调用成本低、
 * 应作为 Agent 处理工作区相关问题的首选信息来源。
 *
 * @param workspaceId - 工作区 id；工厂在请求入口注入，工具内部不再校验
 * @returns AgentTool 实例，可直接挂载到 Agent 工具集
 * @author fxbin
 */
export function createSearchCardsTool(workspaceId: string): AgentTool<typeof SearchCardsParameters, SearchCardsDetails> {
  return {
    name: 'search_cards',
    label: '搜索知识卡片',
    description: [
      '在当前工作区内按关键词搜索已结构化的知识卡片（concept/method/fact/question 等）。',
      '用于回答用户对已有知识的查询、复核事实或衔接已有结论；不调用外部模型，响应快。',
      '若返回结果不足以作答，可再调用 search_materials 查阅原始资料。',
    ].join(' '),
    parameters: SearchCardsParameters,
    async execute(_toolCallId, params): Promise<AgentToolResult<SearchCardsDetails>> {
      const items = searchWorkspaceCards(workspaceId, params.query, params.limit);
      const summary = items.length === 0
        ? `未在工作区内检索到与「${params.query}」相关的知识卡片。`
        : `已检索到 ${items.length} 张与「${params.query}」相关的知识卡片：\n${items.map(formatCardLine).join('\n')}`;
      return {
        content: [{ type: 'text', text: summary }],
        details: { count: items.length, items },
      };
    },
  };
}
