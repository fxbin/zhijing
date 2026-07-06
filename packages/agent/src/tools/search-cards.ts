import { Type } from '@zhijing/pi-runtime';
import { searchWorkspaceCards, type WorkspaceCardSearchResult } from '@zhijing/core';
import type { AgentTool, AgentToolResult } from '@earendil-works/pi-agent-core';
import { sanitizeForLlmContext } from './sanitize.js';

/**
 * search_cards 工具的入参 schema。
 *
 * - query：用户提问或检索片段，必填，不可为空字符串。
 * - limit：返回卡片数量上限，可选；省略时使用 core 默认值。
 */
const SearchCardsParameters = Type.Object({
  query: Type.String({
    description: [
      '检索关键词或自然语言片段，必填。',
      '重要：query 必须直接取自用户原始输入中的原词，禁止自行改写、扩写、补全或拼接多个关键词。',
      '若用户输入是「命运赠送」，query 就传「命运赠送」，不要改写成「命运赠送 礼物 价格」等长句。',
      '如需多关键词检索，应通过多次并行调用实现，每次调用使用一个原词。',
    ].join(' '),
  }),
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
 * 标题与正文均经过 sanitizeForLlmContext 清洗，移除围栏、模型控制 token
 * 与 prompt 注入字符，避免工具输出被 LLM 误解析为指令或事件。
 *
 * @param card - 卡片检索结果
 * @returns 文本摘要片段
 * @author fxbin
 */
function formatCardLine(card: WorkspaceCardSearchResult): string {
  const safeTitle = sanitizeForLlmContext(card.title);
  const safeBody = sanitizeForLlmContext(card.body);
  const trimmedBody = safeBody.length > CARD_BODY_PREVIEW_MAX_LENGTH
    ? `${safeBody.slice(0, CARD_BODY_PREVIEW_MAX_LENGTH)}…`
    : safeBody;
  const claimSuffix = card.claimStatus ? `[${card.claimStatus}]` : '';
  return `- (${card.type}) ${safeTitle} ${claimSuffix}\n  ${trimmedBody} (id=${card.id})`;
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
      '重要：query 参数必须直接取自用户原始输入中的原词，禁止自行改写、扩写或拼接关键词。',
    ].join(' '),
    parameters: SearchCardsParameters,
    async execute(_toolCallId, params): Promise<AgentToolResult<SearchCardsDetails>> {
      const items = searchWorkspaceCards(workspaceId, params.query, params.limit);
      const summary = items.length === 0
        ? [
            `未在工作区内检索到与「${params.query}」相关的知识卡片。`,
            '建议：',
            '(1) 确认 query 是否为用户原始输入中的原词——若你已改写或扩写，请用用户原词重试；',
            '(2) 调用 search_materials 检索原始资料，原文可能包含相关内容但尚未结构化为卡片；',
            '(3) 若 search_materials 也无结果，再判断工作区是否缺少相关内容，不要仅凭卡片 0 命中就断言"无实质内容"。',
          ].join('\n')
        : `已检索到 ${items.length} 张与「${params.query}」相关的知识卡片：\n${items.map(formatCardLine).join('\n')}`;
      return {
        content: [{ type: 'text', text: summary }],
        details: { count: items.length, items },
      };
    },
  };
}
