/**
 * 中文短文本分词（NS-2 主题谱前置模块）。
 *
 * Node 端缺乏成熟的 jieba 纯 JS 移植：nodejieba 为 native binding，跨平台编译风险高，
 * 且 core 包保持零 NLP 依赖。本模块采用「字符 2-gram + 停用词过滤 + ASCII 连续 token」的
 * fallback 策略。划线为短文本（平均 20-80 字），2-gram 足以捕捉双字词片段（如「认知」
 * 「学习」「知识」），配合 TF-IDF 加权可在 k-means 聚类中形成有意义的主题簇。
 *
 * jieba / LDA 升级闸门见 coherence.ts：当语料规模与 coherence 达标后可切换更精细的分词。
 *
 * @module statistics/tokenize
 * @author fxbin
 */

/**
 * 字符 N-gram 窗口大小。2-gram 在中文短文本上兼顾语义片段与噪声控制。
 */
export const TOKENIZE_NGRAM_SIZE = 2;

/**
 * ASCII token 最小长度。长度为 1 的英文字母通常无主题意义（变量名残片、单字母前缀）。
 */
export const TOKENIZE_ASCII_MIN_LENGTH = 2;

/**
 * 中文停用字集合（高频虚词与无主题意义字符）。
 *
 * 当一个 2-gram 的两个字符均属于停用集时，该 gram 被丢弃，避免「的了」「是在」这类噪声进入聚类。
 */
export const TOKENIZE_STOP_CHARS = new Set<string>([
  '的', '了', '是', '在', '一', '不', '有', '和', '人', '都', '上', '也', '很',
  '到', '说', '要', '去', '你', '会', '着', '看', '好', '自', '己', '这', '那',
  '他', '她', '它', '们', '我', '个', '为', '以', '及', '或', '但', '而', '与',
  '则', '其', '之', '于', '所', '被', '把', '让', '使', '给', '对', '从', '向',
  '里', '外', '下', '后', '前', '中', '间', '时', '地', '得', '吗', '呢', '吧',
  '啊', '哦', '嗯', '啦', '喔', '若', '如', '此', '因', '故', '可', '能', '才',
  '只', '还', '又', '再', '已', '曾', '将', '即', '却', '虽', '且', '并', '就',
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
 * 判断一个 N-gram 是否全部由停用字组成。
 *
 * @param gram - 候选 gram
 * @returns 全停用则返回 true（应丢弃）
 */
function isStopGram(gram: string): boolean {
  for (const ch of gram) {
    if (!TOKENIZE_STOP_CHARS.has(ch)) return false;
  }
  return true;
}

/**
 * 对一段纯 CJK 文本滑窗提取 N-gram，过滤停用 gram 后追加到 tokens。
 *
 * @param segment - 连续的 CJK 字符段
 * @param tokens - 累积 token 数组（原地追加）
 */
function emitCjkGrams(segment: string, tokens: string[]): void {
  if (segment.length < TOKENIZE_NGRAM_SIZE) return;
  for (let i = 0; i + TOKENIZE_NGRAM_SIZE <= segment.length; i += 1) {
    const gram = segment.slice(i, i + TOKENIZE_NGRAM_SIZE);
    if (isStopGram(gram)) continue;
    tokens.push(gram);
  }
}

/**
 * 对单条文本执行分词，返回 token 数组。
 *
 * 算法：按 CJK / ASCII 两类字符分段扫描；CJK 段滑窗取 2-gram 并过滤停用 gram；
 * ASCII 段按连续字母数字切成 token（长度低于阈值丢弃，统一小写）。标点与空白作为分隔符。
 *
 * @param text - 原始划线文本
 * @returns token 数组（已去停用、去空）
 */
export function tokenizeText(text: string): string[] {
  if (typeof text !== 'string' || text.length === 0) return [];
  const tokens: string[] = [];
  let buffer = '';
  let bufferKind: 'cjk' | 'ascii' | null = null;

  const flushAscii = () => {
    if (bufferKind === 'ascii' && buffer.length >= TOKENIZE_ASCII_MIN_LENGTH) {
      tokens.push(buffer.toLowerCase());
    }
    buffer = '';
    bufferKind = null;
  };

  for (const ch of text) {
    if (isCjkChar(ch)) {
      if (bufferKind === 'ascii') flushAscii();
      bufferKind = 'cjk';
      buffer += ch;
    } else if (isAsciiWordChar(ch)) {
      if (bufferKind === 'cjk') {
        emitCjkGrams(buffer, tokens);
        buffer = '';
      }
      bufferKind = 'ascii';
      buffer += ch;
    } else {
      if (bufferKind === 'cjk') {
        emitCjkGrams(buffer, tokens);
        buffer = '';
      } else if (bufferKind === 'ascii') {
        flushAscii();
      }
      bufferKind = null;
    }
  }

  if (bufferKind === 'cjk') emitCjkGrams(buffer, tokens);
  else if (bufferKind === 'ascii') flushAscii();

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
