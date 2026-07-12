/**
 * 纯文字版「建议」段落提取。
 *
 * 兜底场景：LLM 未输出 ```proposal-batch``` 块，但正文中含
 * 「### 建议 1️⃣」「建议一：」「1. 建议新建卡片」等模式时，
 * 逐段提取卡片标题与正文，转 create_card 提议。
 *
 * @module plain-suggestion-extractor
 * @author fxbin
 */

import type { CardType, ProposedOperation } from '@zhijing/shared';

/**
 * 文字版「建议」行中识别的卡片类型关键词 → type 映射。
 *
 * 同时覆盖英文 type 名和中文关键词，提高启发式识别准确度。
 */
const PLAIN_SUGGESTION_TYPE_KEYWORDS: ReadonlyArray<{ readonly type: CardType; readonly keywords: readonly string[] }> = [
  { type: 'concept', keywords: ['concept', '概念'] },
  { type: 'method', keywords: ['method', '方法'] },
  { type: 'case', keywords: ['case', '案例'] },
  { type: 'question', keywords: ['question', '问题'] },
  { type: 'step', keywords: ['step', '步骤'] },
  { type: 'viewpoint', keywords: ['viewpoint', '观点'] },
];

/**
 * 去除 markdown 装饰前缀（#、*、-、>）与首尾空白，返回干净行内容。
 *
 * 用于让 heading 判断不受 markdown 语法干扰。
 *
 * @param line - 原始行文本
 * @returns 去除装饰后的净文本
 * @author fxbin
 */
function stripMarkdownDecorations(line: string): string {
  return line.replace(/^\s*[#*\->≥≤•·]+\s*/, '').trim();
}

/**
 * 建议卡片 heading 的行首编号标记正则。
 *
 * 匹配以下「行首」编号形式（去除 markdown 装饰后）：
 * - keycap emoji 数字：1️⃣ 2️⃣ …（数字 + 变体选择符 + 组合用包围符）
 * - 阿拉伯数字 + 分隔符：1. / 1、 / 1) / 1： / 1(空格)
 * - 带圈数字：①②…⑩
 * - 圈圈字母数字区：\u2460-\u2473
 * - 中文数字 + 分隔符：一、 / 二. / 三：
 *
 * 用于把 heading 判定约束在「以编号开头」的行，避免误抓正文中
 * 偶然出现「建议 + 数字」的普通段落（如寒暄、小节标题）。
 */
const SUGGESTION_HEADING_NUMBER_PATTERN = /^\s*(?:\d\uFE0F?\u20E3|\d[.、)）:：\s]|[①-⑩]|[\u2460-\u2473]|[一二三四五六七八九十]+[、.：:）)])/;

/**
 * markdown 水平分隔线正则：仅由 3 个及以上 `-` / `*` / `_` 组成的行。
 *
 * 用于在累积卡片正文时跳过分隔线，避免预览正文首尾出现孤立 `---` 噪声。
 */
const HORIZONTAL_RULE_PATTERN = /^(?:-{3,}|\*{3,}|_{3,})$/;

/**
 * 判断文本是否含明确的「卡片类型」信号。
 *
 * 中文需带「卡」后缀（概念卡/方法卡/案例卡/问题卡/观点卡/步骤卡/事实卡/通用卡），
 * 避免裸词「问题/方法/观点」误伤普通编号列表；英文沿用类型关键词。
 *
 * @param text - 已去除 markdown 装饰的行文本
 * @returns 是否含卡片类型信号
 * @author fxbin
 */
function hasCardTypeSignal(text: string): boolean {
  if (/(?:概念|方法|案例|问题|观点|步骤|事实|通用)卡/.test(text)) return true;
  if (/(?:概念|方法|案例|问题|观点|步骤|事实|通用)[：:]/.test(text)) return true;
  const lower = text.toLowerCase();
  for (const candidate of PLAIN_SUGGESTION_TYPE_KEYWORDS) {
    const hit = candidate.keywords.some((kw) => {
      if (/[\u4e00-\u9fff]/.test(kw)) return false;
      return lower.includes(kw.toLowerCase());
    });
    if (hit) return true;
  }
  return text.includes('卡片');
}

/**
 * 判断一行是否为「建议卡片」heading 行。
 *
 * 判断标准（两者必须同时满足）：
 * 1. 去除 markdown 装饰后，行首为编号标记（数字/keycap/带圈/中文数字 + 分隔符）；
 * 2. 行内含建议动词（建议/推荐/提议）或卡片类型信号（X卡 / concept / 卡片）。
 *
 * 这覆盖 LLM 常见输出：
 * - `### 1️⃣ 概念卡：「标题」`（编号 + 类型卡）
 * - `### 建议 1️⃣ — 建 concept 卡片：「标题」`（编号 + 建议 + concept）
 * - `1. 建议新建卡片「标题」`（编号 + 建议）
 *
 * 同时排除两类误判：
 * - 寒暄段「…为你提炼3个…附上建议的标题…」（数字不在行首 → 排除）
 * - 小节标题 `## 📇 建议新建的 3 张知识卡片`（行首是 emoji 非编号 → 排除）
 *
 * @param rawLine - 原始行文本
 * @returns 是否为建议 heading 行
 * @author fxbin
 */
function isSuggestionHeadingLine(rawLine: string): boolean {
  const stripped = stripMarkdownDecorations(rawLine);
  if (stripped.length === 0) return false;
  if (stripped.startsWith('```')) return false;
  if (!SUGGESTION_HEADING_NUMBER_PATTERN.test(stripped)) return false;
  const hasVerb = stripped.includes('建议') || stripped.includes('推荐') || stripped.includes('提议');
  return hasVerb || hasCardTypeSignal(stripped);
}

/**
 * 方括号类型标签正则：匹配行内的 `[concept]` / `[方法]` / `[method卡]` 等类型标记。
 *
 * LLM 常在 heading 里用方括号标注卡片类型（如 `① [concept] 命运礼物的价格`），
 * 提取标题时需要剥离这类标记，避免污染最终卡片标题。
 */
const BRACKET_TYPE_TAG_PATTERN = /\[[A-Za-z\u4e00-\u9fff]{1,12}卡?\]/g;

/**
 * 剥离标题行首的噪声前缀：编号标记、建议动词、方括号类型标签、残余分隔符。
 *
 * 采用循环剥离策略（直到文本稳定），可一次性清理多种前缀的组合，例如：
 * - `① [concept] 命运礼物的价格` → `命运礼物的价格`
 * - `1. 建议新建卡片「标题」` → `「标题」`（引号由上层处理）
 * - `### 2️⃣ [method] 时间管理` → `时间管理`
 *
 * @param text - 已去除 markdown 装饰的 heading 文本
 * @returns 剥离行首噪声后的文本
 * @author fxbin
 */
function stripLeadingNoise(text: string): string {
  let prev = '';
  let cur = text;
  let guard = 0;
  while (cur !== prev && guard < 8) {
    prev = cur;
    cur = cur.replace(/^\s*[①②③④⑤⑥⑦⑧⑨⑩\u2460-\u2473]\s*/, '');
    cur = cur.replace(/^\s*\d\uFE0F?\u20E3\s*/, '');
    cur = cur.replace(/^\s*\d[.、)）：:]\s*/, '');
    cur = cur.replace(/^\s*[一二三四五六七八九十]+[、.：）)]\s*/, '');
    cur = cur.replace(/^\s*(?:建议|推荐|提议|新建|建卡)\s*/, '');
    cur = cur.replace(/^\s*(?:concept|method|case|viewpoint|step|question|fact|general)\b\s*/i, '');
    cur = cur.replace(BRACKET_TYPE_TAG_PATTERN, '');
    cur = cur.replace(/^\s*[：:、\-—–.)）]\s*/, '');
    guard += 1;
  }
  return cur.trim();
}

/**
 * 标题收尾清理：剥离行首噪声、去除星号与残余引号、截断到 80 字。
 *
 * @param text - 待清理的标题片段
 * @returns 清理后的标题（最多 80 字）
 * @author fxbin
 */
function finalizeTitle(text: string): string {
  const withoutStars = text.replace(/\*/g, '');
  return stripLeadingNoise(withoutStars).slice(0, 80);
}

/**
 * 从建议 heading 行中提取卡片标题。
 *
 * 提取优先级：
 * 1. 粗体 `**...**` 包裹的标题（LLM 常用 `**「标题」——副标题**` 或 `**标题——副标题**`）：
 *    取首个粗体段，按破折号（——/—/--）切前半作为标题，并去除引号与星号；
 * 2. 引号包裹内容（「」『』""''）——适用于无粗体的 `概念卡：「标题」`；
 * 3. 「卡片」/「资料」后面的文本；
 * 4. 冒号后面的文本（去除星号）；
 * 5. 上述均未命中时，剥离行首编号/建议动词/方括号类型标签后的整行余文。
 *
 * 所有返回值统一经 finalizeTitle 收尾，确保标题不含 `①`、`[concept]`、`*` 等噪声。
 *
 * @param rawLine - heading 行原始文本
 * @returns 提取出的标题（2-80 字）；提取失败返回空串
 * @author fxbin
 */
function extractTitleFromHeading(rawLine: string): string {
  const stripped = stripMarkdownDecorations(rawLine);
  const bold = stripped.match(/\*\*([\s\S]+?)\*\*/);
  if (bold && bold[1]) {
    const inner = bold[1];
    const headPart = inner.split(/——|—|--/)[0] ?? inner;
    const cleaned = headPart.replace(/[「」『』“”‘’""'']/g, '').trim();
    if (cleaned.length >= 2) return cleaned.slice(0, 80);
  }
  const quoted = stripped.match(/[「『“”‘’""'']([^「」『』“”‘’""''\n]{2,80})[」’”’""'']/);
  if (quoted && quoted[1]) return quoted[1].trim();
  const afterCard = stripped.match(/(?:卡片|资料)[：:是为]?\s*(.+)/);
  if (afterCard && afterCard[1]) return finalizeTitle(afterCard[1]);
  const afterColon = stripped.match(/[：:]\s*(.+)/);
  if (afterColon && afterColon[1]) return finalizeTitle(afterColon[1]);
  return finalizeTitle(stripped);
}

/**
 * 从建议 heading 行中识别卡片类型。
 *
 * @param rawLine - heading 行原始文本
 * @returns 匹配到的 CardType；无匹配时默认 concept
 * @author fxbin
 */
function detectCardTypeFromHeading(rawLine: string): CardType {
  const lower = rawLine.toLowerCase();
  for (const candidate of PLAIN_SUGGESTION_TYPE_KEYWORDS) {
    if (candidate.keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      return candidate.type;
    }
  }
  return 'concept';
}

/**
 * 从 Agent 最终响应文本中提取文字版「建议」段落，转换为 proposal-batch 结构。
 *
 * 兜底场景：LLM 未输出 ```proposal-batch``` 块，但正文中含
 * 「### 建议 1️⃣」「建议一：」「1. 建议新建卡片」等模式时，
 * 逐段提取卡片标题与正文，转 create_card 提议，由用户在前端确认。
 *
 * 设计权衡：
 * - 启发式提取准确性有限，宁可少识别一些（避免误转换），不能误把正常段落当建议；
 * - 仅提取 create_card 类型；edit/archive 等操作需要明确 cardId，文字描述中拿不到，跳过；
 * - 提取出的 title/body 较粗糙，用户在前端可编辑后再采纳。
 *
 * @param text - Agent 最终响应文本
 * @returns 兜底提取的 batch；无识别命中时返回 null
 * @author fxbin
 */
export function extractPlainTextSuggestions(
  text: string,
): { batchId: string; proposals: ProposedOperation[] } | null {
  if (typeof text !== 'string' || text.length === 0) return null;
  const lines = text.split(/\r?\n/);
  const proposals: ProposedOperation[] = [];
  let currentTitle = '';
  let currentBody = '';
  let currentType: CardType = 'concept';
  let inSuggestion = false;

  const flush = () => {
    if (!inSuggestion) return;
    const title = currentTitle.trim();
    if (title.length >= 2 && title.length <= 80) {
      proposals.push({
        op: 'create_card',
        type: currentType,
        title,
        body: currentBody.trim(),
        rationale: '由文字描述的「建议」自动转换，请确认内容后采纳。',
      });
    }
    currentTitle = '';
    currentBody = '';
    currentType = 'concept';
    inSuggestion = false;
  };

  for (const line of lines) {
    if (isSuggestionHeadingLine(line)) {
      flush();
      inSuggestion = true;
      currentTitle = extractTitleFromHeading(line);
      currentType = detectCardTypeFromHeading(line);
      continue;
    }
    if (inSuggestion) {
      const trimmed = line.trim();
      if (trimmed.length === 0) continue;
      if (HORIZONTAL_RULE_PATTERN.test(trimmed)) continue;
      if (currentBody.length < 300) {
        currentBody = currentBody.length === 0 ? trimmed : `${currentBody}\n${trimmed}`;
      }
    }
  }
  flush();
  if (proposals.length === 0) return null;
  return {
    batchId: `fallback_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    proposals,
  };
}
