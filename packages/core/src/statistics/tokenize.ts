/**
 * 中文分词（NS-2 主题谱前置模块）。
 *
 * 基于 jieba-wasm（jieba-rs 的 WASM 绑定），提供真正的中文分词能力，
 * 取代早期 2-gram 滑窗 fallback。WASM 形态避免 native binding 的跨平台编译风险，
 * core 包仍保持纯 JS 可移植性。
 *
 * 流程：jieba cut(HMM=true) → 停用词过滤 → 单字过滤 → 标点过滤
 * 划线为短文本（平均 20-80 字），分词后配合 TF-IDF 加权可在 k-means 聚类中
 * 形成有意义的主题簇。
 *
 * @module statistics/tokenize
 * @author fxbin
 */

import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { cut: jiebaCut } = require('jieba-wasm') as { cut: (text: string, hmm?: boolean) => string[] };

/**
 * ASCII token 最小长度。长度为 1 的英文字母通常无主题意义（变量名残片、单字母前缀）。
 */
export const TOKENIZE_ASCII_MIN_LENGTH = 2;

/**
 * 中文停用词集合（高频虚词与无主题意义词组）。
 *
 * jieba 切出的虚词、代词、副词、连词等无主题承载能力的词，应在分词后过滤。
 *
 * 英文停用词覆盖代词、助动词、否定/连接词、介词/冠词、常见动词与撇号碎片，
 * 防止英文原版或中英混排划线中的语法虚词污染主题代表词（如 don/know/care）。
 * 缩写词（AI/CEO/KPI/ROI 等中文语境下仍常用的术语）不在此集合，保留为主题词。
 */
export const TOKENIZE_STOP_WORDS = new Set<string>([
  '的', '了', '是', '在', '一', '不', '有', '和', '人', '都', '上', '也', '很',
  '到', '说', '要', '去', '你', '会', '着', '看', '好', '自', '己', '这', '那',
  '他', '她', '它', '们', '我', '个', '为', '以', '及', '或', '但', '而', '与',
  '则', '其', '之', '于', '所', '被', '把', '让', '使', '给', '对', '从', '向',
  '里', '外', '下', '后', '前', '中', '间', '时', '地', '得', '吗', '呢', '吧',
  '啊', '哦', '嗯', '啦', '喔', '若', '如', '此', '因', '故', '可', '能', '才',
  '只', '还', '又', '再', '已', '曾', '将', '即', '却', '虽', '且', '并', '就',
  '我们', '你们', '他们', '她们', '它们', '咱们', '自己', '别人', '大家',
  '什么', '怎么', '怎样', '怎么样', '为什么', '那么', '这么', '多少',
  '可以', '可能', '应该', '必须', '或者', '但是', '因为', '所以', '虽然',
  '如果', '即使', '哪怕', '不过', '而且', '并且', '或者', '还是', '已经',
  '正在', '将要', '曾经', '现在', '以后', '以前', '之前', '之后', '之间',
  '一些', '一种', '一个', '一样', '一直', '一定', '一般', '一切',
  '没有', '不是', '不会', '不能', '不要', '不用', '不必',
  '这个', '那个', '这些', '那些', '这里', '那里', '这是', '那是',
  '的话', '似的', '一样', '一般', '等等', '之类', '什么的',
  '起来', '下去', '过来', '过去', '出来', '出去', '下来', '上来', '上去',
  '得到', '进行', '做', '作', '里', '外', '上', '下', '中',
  '觉得', '认为', '知道', '明白', '感觉',
  '相对', '要么', '关于', '比起', '最终', '什么样', '具有', '所有', '最好', '想要',
  '对于', '至于', '首先', '其次', '最后', '拥有', '存在', '全部', '最多', '最少',
  '需要', '希望', '始终', '始终认为', '来说', '的话', '总之', '总的来说',
  '其实', '实际上', '事实上', '确实', '真的', '当然', '也许', '或许', '大概',
  '一定', '肯定', '必须', '应该', '似乎', '好像', '差不多',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'its', 'our', 'their',
  'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'doing',
  'will', 'would', 'can', 'could', 'should', 'shall', 'may', 'might', 'must',
  'not', 'no', 'nor', 'and', 'or', 'but', 'if', 'then', 'so', 'because', 'as',
  'than', 'too', 'very', 'just', 'only', 'also',
  'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from',
  'about', 'into', 'onto', 'over', 'under', 'between', 'through',
  'get', 'got', 'make', 'made', 'take', 'took', 'know', 'knew', 'see', 'saw',
  'come', 'came', 'go', 'went', 'look', 'feel', 'felt', 'think', 'thought', 'say', 'said',
  'don', 'won', 'can', 'll', 've', 're', 's', 't', 'm', 'd',
  'this', 'that', 'these', 'those', 'there', 'here', 'what', 'which', 'who', 'whom',
  'when', 'where', 'why', 'how',
]);

/**
 * 分词后的文档（NS-2 中间产物，供 TF-IDF 与聚类消费）。
 */
export interface TokenizedDoc {
  /** 文档 ID（通常为划线 ID） */
  docId: string;
  /** 分词后的 token 数组 */
  tokens: string[];
}

/**
 * 判断字符是否为 CJK 统一表意文字（U+4E00 - U+9FFF）。
 *
 * @param ch - 待检测字符
 * @returns 是否为中文汉字
 */
function isCjkChar(ch: string): boolean {
  const code = ch.codePointAt(0) ?? 0;
  return code >= 0x4e00 && code <= 0x9fff;
}

/**
 * 判断字符是否为 ASCII 字母数字或下划线（用于保留英文术语 token）。
 *
 * @param ch - 待检测字符
 * @returns 是否为 ASCII 单词字符
 */
function isAsciiWordChar(ch: string): boolean {
  return /[A-Za-z0-9_]/.test(ch);
}

/**
 * 判断一个 token 是否应被保留。
 *
 * 规则：
 * 1. 停用词直接丢弃
 * 2. 纯标点/空白丢弃
 * 3. 单个中文字丢弃（无主题承载能力）
 * 4. ASCII token 长度低于阈值丢弃
 * 5. 其余保留
 *
 * @param token - jieba 切出的候选词
 * @returns 是否保留
 */
function shouldKeepToken(token: string): boolean {
  if (!token) return false;
  if (TOKENIZE_STOP_WORDS.has(token)) return false;
  const trimmed = token.trim();
  if (trimmed.length === 0) return false;
  const firstChar = trimmed[0];
  const isAscii = isAsciiWordChar(firstChar);
  if (isAscii) {
    return trimmed.length >= TOKENIZE_ASCII_MIN_LENGTH;
  }
  if (trimmed.length === 1 && isCjkChar(firstChar)) return false;
  let hasContent = false;
  for (const ch of trimmed) {
    if (isCjkChar(ch) || isAsciiWordChar(ch)) {
      hasContent = true;
      break;
    }
  }
  return hasContent;
}

/**
 * 对单条文本执行分词，返回 token 数组。
 *
 * 算法：jieba cut(HMM=true) 切词 → 停用词过滤 → 单字过滤 → 标点过滤 → ASCII 统一小写
 *
 * @param text - 原始划线文本
 * @returns token 数组（已去停用、去单字、去标点）
 */
export function tokenizeText(text: string): string[] {
  if (typeof text !== 'string' || text.length === 0) return [];
  const raw = jiebaCut(text, true);
  const tokens: string[] = [];
  for (const token of raw) {
    if (!shouldKeepToken(token)) continue;
    const firstChar = token[0];
    if (isAsciiWordChar(firstChar)) {
      tokens.push(token.toLowerCase());
    } else {
      tokens.push(token);
    }
  }
  return tokens;
}

/**
 * 批量分词，返回 TokenizedDoc 数组（NS-2 聚类输入）。
 *
 * 空文本文档保留空 tokens 数组，便于后续按 docId 对齐回原始划线。
 *
 * @param docs - 原始文档集合（id + text）
 * @returns 分词后的文档集合，顺序与输入一致
 */
export function tokenizeDocs(docs: { id: string; text: string }[]): TokenizedDoc[] {
  return docs.map((doc) => ({
    docId: doc.id,
    tokens: tokenizeText(doc.text),
  }));
}
