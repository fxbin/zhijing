/**
 * Markdown frontmatter 手写轻量级 YAML 序列化器。
 *
 * 与 parser.ts 对称，将普通对象序列化为 YAML 文本片段（不含 `---` 分隔符），
 * 处理嵌套对象 / 数组 / 标量三类节点，并对需要引号包裹的字符串值进行转义判断。
 *
 * @author fxbin
 */

import { EMPTY_STRING, NEWLINE } from '../common/constants.js';
import {
  WIKILINK_PREFIX,
  FRONTMATTER_NESTED_INDENT,
  FRONTMATTER_ARRAY_PREFIX,
  ISO_DATE_PATTERN,
  DOUBLE_QUOTE,
  SINGLE_QUOTE,
} from './constants.js';

/**
 * 判断字符串值在序列化时是否需要用双引号包裹。
 *
 * 需要引号的场景：
 *  - 空字符串
 *  - 含冒号（会被 YAML 解析为键值分隔）
 *  - wikilink 前缀 `[[`
 *  - 含双引号或单引号
 *  - ISO 日期时间格式
 *
 * @param value 待序列化的字符串
 * @returns 是否需要引号包裹
 * @author fxbin
 */
export function needsQuoting(value: string): boolean {
  if (value === EMPTY_STRING) {
    return true;
  }
  if (value.includes(':')) {
    return true;
  }
  if (value.startsWith(WIKILINK_PREFIX)) {
    return true;
  }
  if (value.includes(DOUBLE_QUOTE) || value.includes(SINGLE_QUOTE)) {
    return true;
  }
  if (ISO_DATE_PATTERN.test(value)) {
    return true;
  }
  return false;
}

/**
 * 将标量值序列化为 frontmatter 文本片段。
 *
 * @param value 标量值（string / number / boolean）
 * @returns frontmatter 文本片段
 * @author fxbin
 */
export function serializeScalar(value: unknown): string {
  if (typeof value === 'string') {
    if (needsQuoting(value)) {
      return `${DOUBLE_QUOTE}${value}${DOUBLE_QUOTE}`;
    }
    return value;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'boolean') {
    return String(value);
  }
  return String(value);
}

/**
 * 将一个 frontmatter 条目（key + value）序列化并追加到行数组。
 *
 * 递归处理嵌套对象与数组：
 *  - 数组输出 `key:` 后换行，每个元素以 `- ` 前缀缩进输出
 *  - 嵌套对象输出 `key:` 后换行，子属性缩进输出
 *  - null / undefined 跳过不输出
 *
 * @param key 字段名
 * @param value 字段值
 * @param indent 当前缩进层级（0 表示顶层）
 * @param lines 输出行数组
 * @author fxbin
 */
export function serializeEntry(key: string, value: unknown, indent: number, lines: string[]): void {
  if (value === null || value === undefined) {
    return;
  }
  const indentStr = FRONTMATTER_NESTED_INDENT.repeat(indent);
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return;
    }
    lines.push(`${indentStr}${key}:`);
    for (const item of value) {
      const childIndent = indentStr + FRONTMATTER_NESTED_INDENT;
      lines.push(`${childIndent}${FRONTMATTER_ARRAY_PREFIX}${serializeScalar(item)}`);
    }
    return;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return;
    }
    lines.push(`${indentStr}${key}:`);
    for (const [childKey, childValue] of entries) {
      serializeEntry(childKey, childValue, indent + 1, lines);
    }
    return;
  }
  lines.push(`${indentStr}${key}: ${serializeScalar(value)}`);
}

/**
 * 将 frontmatter 对象序列化为 YAML 文本。
 *
 * @param data frontmatter 普通对象
 * @returns YAML 文本（不含 `---` 分隔符）
 * @author fxbin
 */
export function serializeFrontmatter(data: Record<string, unknown>): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    serializeEntry(key, value, 0, lines);
  }
  return lines.join(NEWLINE);
}
