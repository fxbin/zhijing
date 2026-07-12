/**
 * Markdown 文件模块的内部常量。
 *
 * 集中存放 frontmatter 解析 / 序列化、slug 生成等流程中复用的字面量与正则模式，
 * 避免散点维护与魔法值。
 *
 * @author fxbin
 */

/**
 * frontmatter 起始 / 结束 分隔符。
 */
export const FRONTMATTER_DELIMITER = '---';

/**
 * frontmatter 数组元素前缀。
 */
export const FRONTMATTER_ARRAY_PREFIX = '- ';

/**
 * frontmatter 嵌套层级缩进。
 */
export const FRONTMATTER_NESTED_INDENT = '  ';

/**
 * slug 最大长度。
 */
export const SLUG_MAX_LENGTH = 50;

/**
 * slug 中替换非法字符 / 空白所使用的占位符。
 */
export const SLUG_REPLACE_CHAR = '-';

/**
 * wikilink 前缀。
 */
export const WIKILINK_PREFIX = '[[';

/**
 * wikilink 后缀。
 */
export const WIKILINK_SUFFIX = ']]';

/**
 * frontmatter 块整体匹配模式（含可选 CRLF）。
 */
export const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/**
 * frontmatter 与正文之间的空行分隔。
 */
export const DOUBLE_NEWLINE = '\n\n';

/**
 * 布尔值 true 的字面量。
 */
export const BOOLEAN_TRUE = 'true';

/**
 * 布尔值 false 的字面量。
 */
export const BOOLEAN_FALSE = 'false';

/**
 * 整数匹配模式。
 */
export const INTEGER_PATTERN = /^-?\d+$/;

/**
 * 浮点数匹配模式。
 */
export const FLOAT_PATTERN = /^-?\d+\.\d+$/;

/**
 * ISO 日期时间格式匹配模式。
 */
export const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T/;

/**
 * slug 中需要被替换的特殊字符（文件名非法字符）。
 */
export const SLUG_SPECIAL_CHARS_PATTERN = /[\/\\:*?"<>|]/g;

/**
 * slug 中需要被替换的空白字符。
 */
export const SLUG_WHITESPACE_PATTERN = /\s+/g;

/**
 * slug 首尾需要被去除的连字符。
 */
export const SLUG_TRIM_DASHES_PATTERN = /^-+|-+$/g;

/**
 * 双引号字符。
 */
export const DOUBLE_QUOTE = '"';

/**
 * 单引号字符。
 */
export const SINGLE_QUOTE = "'";
