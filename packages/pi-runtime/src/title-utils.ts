/**
 * 标题精炼工具模块。
 *
 * 从原始文本中提取精炼标题，供 mock fallback 生成产物时使用。
 * 负责去除常见口语前缀与尾部标点，并截断到最大长度。
 *
 * @module title-utils
 * @author fxbin
 */

const TITLE_PREFIX_PATTERN = /^(我想(?:了解|学习|知道|研究|搞懂|搞清楚|系统学习|知道下)|帮我(?:查|找|了解|整理|总结|看看)|请问|关于|怎么|如何|有没有人|推荐下)\s*(?:一下|关于)?\s*/;
const TITLE_SUFFIX_PUNCT = /[?？!！。.…,，、\s]+$/;
const TITLE_MAX_LENGTH = 32;

/**
 * 从原始文本中提取精炼标题（mock fallback 使用）。
 * 优先取首行，去除常见口语前缀与尾部标点，最后截断到最大长度。
 * @param input - 原始文本
 * @returns 精炼后的标题
 * @author fxbin
 */
export function compactTitle(input: string) {
  const firstLine = input.split('\n')[0] ?? input;
  const noPrefix = firstLine.replace(TITLE_PREFIX_PATTERN, '');
  const noSuffix = noPrefix.replace(TITLE_SUFFIX_PUNCT, '');
  const cleaned = noSuffix.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '未命名知识库';
  return cleaned.length > TITLE_MAX_LENGTH ? `${cleaned.slice(0, TITLE_MAX_LENGTH)}...` : cleaned;
}
