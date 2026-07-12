/**
 * 引用标记提取与归一化。
 *
 * 从 Agent 响应文本中提取 <cite> 标签与 markdown 链接两种格式的引用标记，
 * 生成 KnowledgeCitation 数组并将正文中的引用替换为 [n] 占位符。
 * 同时提供 populateKnownIdsFromToolResult 与 normalizeBareCardIds 用于
 * 从工具返回结果中提取已知 ID 并将裸 ID 归一化为 <cite> 标签。
 *
 * @module citation-extractor
 * @author fxbin
 */

import type { KnowledgeCitation } from '@zhijing/shared';

/**
 * 裸 ID 正则：匹配 card_ 或 mat_ 前缀 + 8 位以上十六进制的 ID。
 *
 * 用于兜底识别 LLM 未用 <cite> 标签包裹、直接在正文中输出的裸 ID（如 card_d2bfca15）。
 * card_ / mat_ 前缀 + 8 位以上十六进制在自然中文/英文正文里几乎不会自然出现，
 * 误判风险极低。
 */
export const BARE_ID_PATTERN = /(?:card|mat)_[a-f0-9]{8,}/g;

/**
 * 卡片 ID 提取正则：从 search_cards 工具结果文本中提取 cardId 与标题。
 *
 * 工具输出格式：`- (type) title claim\n  body (cardId=card_xxx)`
 * 本正则匹配行尾的 (cardId=xxx) 并回溯提取行首标题。
 */
export const CARD_LINE_PATTERN = /^- \((\w+)\) (.+?)(?:\s\[[^\]]*\])*\n\s+.+?\(cardId=(card_[a-f0-9]+)\)$/gm;

/**
 * 资料 ID 提取正则：从 search_materials 工具结果文本中提取 materialId 与标题。
 *
 * 工具输出格式：`- title [platform][parseStatus] (materialId=mat_xxx)\n  preview`
 */
export const MATERIAL_LINE_PATTERN = /^- (.+?)(?:\s\[[^\]]*\])*\s\(materialId=(mat_[a-f0-9]+)\)$/gm;

/**
 * 从工具返回结果中提取已知的卡片/资料 ID 与标题，写入会话级缓存。
 *
 * 当 LLM 调用 search_cards / search_materials 工具后，工具结果文本中包含
 * 所有检索到的卡片/资料 ID 与标题。本函数解析这些信息，填充到 knownCards /
 * knownMaterials Map 中，供 normalizeBareCardIds 做裸 ID 兜底转换时查标题。
 *
 * @param toolName - 工具名称（search_cards / search_materials）
 * @param resultText - 工具返回的文本结果
 * @param knownCards - 会话级卡片缓存（id → title）
 * @param knownMaterials - 会话级资料缓存（id → title）
 * @author fxbin
 */
export function populateKnownIdsFromToolResult(
  toolName: string,
  resultText: string,
  knownCards: Map<string, string>,
  knownMaterials: Map<string, string>,
): void {
  if (toolName === 'search_cards') {
  let match = CARD_LINE_PATTERN.exec(resultText);
  while (match !== null) {
  const title = match[2]?.trim();
  const id = match[3];
  if (id && title) {
  knownCards.set(id, title);
  }
  match = CARD_LINE_PATTERN.exec(resultText);
  }
  CARD_LINE_PATTERN.lastIndex = 0;
  return;
  }
  if (toolName === 'search_materials') {
  let match = MATERIAL_LINE_PATTERN.exec(resultText);
  while (match !== null) {
  const title = match[1]?.trim();
  const id = match[2];
  if (id && title) {
  knownMaterials.set(id, title);
  }
  match = MATERIAL_LINE_PATTERN.exec(resultText);
  }
  MATERIAL_LINE_PATTERN.lastIndex = 0;
  return;
  }
}

/**
 * 将正文中裸露的 card_xxx / mat_xxx ID 归一化为 <cite> 标签。
 *
 * 当 LLM 不遵守 <cite> 语法、直接在正文中输出 `卡片 card_d2bfca15` 时，
 * 本函数用 BARE_ID_PATTERN 匹配裸 ID，查 knownCards / knownMaterials 获取标题，
 * 命中则替换为 <cite cardId="xxx">真实标题</cite>，未命中则保留原文不转换。
 *
 * 白名单策略：只转换会话内 search_cards / search_materials 工具返回过的合法 ID，
 * 避免误判 LLM 编造的 ID。死链接比纯文本更伤信任，因此宁可不转换。
 *
 * @param text - 待处理的文本
 * @param knownCards - 会话级卡片缓存（id → title）
 * @param knownMaterials - 会话级资料缓存（id → title）
 * @returns 归一化后的文本（裸 ID 已尽可能替换为 <cite> 标签）
 * @author fxbin
 */
export function normalizeBareCardIds(
  text: string,
  knownCards: Map<string, string>,
  knownMaterials: Map<string, string>,
): string {
  if (typeof text !== 'string' || text.length === 0) return text;
  return text.replace(BARE_ID_PATTERN, (match) => {
  if (match.startsWith('card_')) {
  const title = knownCards.get(match);
  if (title) {
  return `<cite cardId="${match}">${title}</cite>`;
  }
  return match;
  }
  if (match.startsWith('mat_')) {
  const title = knownMaterials.get(match);
  if (title) {
  return `<cite materialId="${match}">${title}</cite>`;
  }
  return match;
  }
  return match;
  });
}

/**
 * <cite> 标签全局正则：匹配所有 cardId 或 materialId 引用标记（旧格式，向后兼容）。
 *
 * 捕获组：
 * - group(1): cardId 属性值（可能为 undefined）
 * - group(2): materialId 属性值（可能为 undefined）
 * - group(3): 标签内标题文本
 */
export const CITE_TAG_GLOBAL_PATTERN = /<cite\s+(?:cardId="([^"]*)"|materialId="([^"]*)")\s*>([^<]*)<\/cite>/g;

/**
 * markdown 链接引用正则：匹配 [标题](cardId) 或 [标题](materialId) 格式（新格式，推荐）。
 *
 * 捕获组：
 * - group(1): 链接文本（卡片/资料标题）
 * - group(2): cardId 值（可能为 undefined）
 * - group(3): materialId 值（可能为 undefined）
 *
 * 仅匹配 card_ / mat_ 前缀的合法 ID，避免误判普通 markdown 链接。
 */
export const CITE_MARKDOWN_PATTERN = /\[([^\]]+)\]\((card_[a-f0-9]{8,}|mat_[a-f0-9]{8,})\)/g;

/**
 * 从展示文本中提取所有引用标记（支持 markdown 链接和 <cite> 标签两种格式），
 * 生成 KnowledgeCitation 数组，并将正文中的引用替换为 [n] 占位符
 * （前端渲染为可点击锚点）。
 *
 * 支持两种格式：
 * - 新格式（推荐）：[标题](card_xxx) 或 [标题](mat_xxx) markdown 链接
 * - 旧格式（兼容）：<cite cardId="xxx">标题</cite> XML 标签
 *
 * 同一卡片多次引用时复用编号（Map<idKey, index>），降低认知负荷。
 *
 * 容错策略：
 * - 无引用标记时返回 { citations: [], text }（原文本不变）
 * - ID 缺失时保留原文不做替换（降级为纯文本显示）
 *
 * @param text - Agent 原始响应文本
 * @returns 提取出的 citations 数组（可能为空）和剥离标记后的文本
 * @author fxbin
 */
export function extractCitationsFromText(text: string): { citations: KnowledgeCitation[]; text: string } {
  if (typeof text !== 'string' || text.length === 0) {
    return { citations: [], text };
  }
  const citations: KnowledgeCitation[] = [];
  let citeIndex = 0;
  const idToIndex = new Map<string, number>();

  /**
   * 内部辅助：根据 kind/idValue/title 处理一次引用命中。
   * 复用编号逻辑：同 kind+id 多次出现只生成一条 citation，正文复用 [n]。
   * @returns 替换后的 [n] 占位符或原文（ID 缺失时）
   */
  const handleHit = (idValue: string, title: string, isCard: boolean): string => {
  const kind: 'card' | 'material' = isCard ? 'card' : 'material';
  const idKey = `${kind}:${idValue}`;
  const existing = idToIndex.get(idKey);
  if (existing !== undefined) {
  return `[${existing}]`;
  }
  citeIndex += 1;
  idToIndex.set(idKey, citeIndex);
  citations.push({
  id: `citation:${kind}:${idValue}:${citeIndex}`,
  kind,
  title: title || idValue,
  preview: '',
  ...(isCard ? { cardId: idValue } : { materialId: idValue }),
  });
  return `[${citeIndex}]`;
  };

  let work = text.replace(CITE_MARKDOWN_PATTERN, (match, title, idValue) => {
  if (typeof idValue !== 'string' || idValue.length === 0) return match;
  const isCard = idValue.startsWith('card_');
  const trimmedTitle = typeof title === 'string' ? title.trim() : '';
  return handleHit(idValue, trimmedTitle, isCard);
  });

  work = work.replace(CITE_TAG_GLOBAL_PATTERN, (match, cardId, materialId, title) => {
  const trimmedTitle = typeof title === 'string' ? title.trim() : '';
  const hasCardId = typeof cardId === 'string' && cardId.length > 0;
  const hasMaterialId = typeof materialId === 'string' && materialId.length > 0;
  if (!hasCardId && !hasMaterialId) {
  return match;
  }
  const isCard = hasCardId;
  const idValue = hasCardId ? cardId : materialId;
  return handleHit(idValue, trimmedTitle, isCard);
  });

  return { citations, text: work };
}
