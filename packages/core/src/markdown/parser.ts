/**
 * Markdown frontmatter 手写轻量级 YAML 解析器。
 *
 * 仅支持知径用到的有限子集：标量（string / number / boolean）、字符串数组、
 * 单层嵌套对象。采用按缩进递归下降方式解析，不依赖 js-yaml / gray-matter 等第三方库。
 *
 * @author fxbin
 */

import { EMPTY_STRING } from '../common/constants.js';
import {
  FRONTMATTER_PATTERN,
  FRONTMATTER_ARRAY_PREFIX,
  BOOLEAN_TRUE,
  BOOLEAN_FALSE,
  INTEGER_PATTERN,
  FLOAT_PATTERN,
  DOUBLE_QUOTE,
  SINGLE_QUOTE,
} from './constants.js';

/**
 * 从 Markdown 文件内容中提取 frontmatter 原始文本与正文部分。
 *
 * 若文件不以合法的 frontmatter 起始，则将整段内容视为正文，frontmatter 为空字符串。
 *
 * @param content Markdown 文件完整内容
 * @returns frontmatter 原始文本与正文
 * @author fxbin
 */
export function extractFrontmatter(content: string): { rawFrontmatter: string; body: string } {
  const match = content.match(FRONTMATTER_PATTERN);
  if (!match || match[1] === undefined) {
    return { rawFrontmatter: EMPTY_STRING, body: content };
  }
  const rawFrontmatter = match[1];
  const body = content.slice(match[0].length);
  return { rawFrontmatter, body };
}

/**
 * 计算一行的缩进空格数。
 *
 * @param line 单行文本
 * @returns 行首空格数量
 * @author fxbin
 */
export function getIndent(line: string): number {
  return line.length - line.trimStart().length;
}

/**
 * 将 frontmatter 中的标量字符串解析为对应的 JavaScript 值。
 *
 * 处理规则：
 *  - 双引号 / 单引号包裹的值去掉外层引号
 *  - `true` / `false` 解析为 boolean
 *  - 纯整数解析为 number
 *  - 浮点数解析为 number
 *  - 其余按原始字符串返回
 *
 * @param valuePart frontmatter 中冒号右侧的原始字符串（已 trim）
 * @returns 解析后的标量值
 * @author fxbin
 */
export function parseScalar(valuePart: string): unknown {
  if (valuePart === EMPTY_STRING) {
    return EMPTY_STRING;
  }
  if (
    (valuePart.startsWith(DOUBLE_QUOTE) && valuePart.endsWith(DOUBLE_QUOTE)) ||
    (valuePart.startsWith(SINGLE_QUOTE) && valuePart.endsWith(SINGLE_QUOTE))
  ) {
    return valuePart.slice(1, -1);
  }
  if (valuePart === BOOLEAN_TRUE) {
    return true;
  }
  if (valuePart === BOOLEAN_FALSE) {
    return false;
  }
  if (INTEGER_PATTERN.test(valuePart)) {
    return Number.parseInt(valuePart, 10);
  }
  if (FLOAT_PATTERN.test(valuePart)) {
    return Number.parseFloat(valuePart);
  }
  return valuePart;
}

/**
 * 手写轻量级 YAML frontmatter 解析器。
 *
 * 支持的字段类型：
 *  - string
 *  - number（整数 / 浮点）
 *  - boolean
 *  - string 数组（`- ` 前缀）
 *  - 嵌套对象（2 空格缩进）
 *
 * 采用递归下降方式，按缩进层级判断嵌套关系。
 *
 * @param raw frontmatter `---` 之间的原始文本
 * @returns 解析后的普通对象
 * @author fxbin
 */
export function parseFrontmatter(raw: string): Record<string, unknown> {
  const lines = raw.split(/\r?\n/);
  let cursor = 0;

  function parseObject(parentIndent: number): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    while (cursor < lines.length) {
      const line = lines[cursor];
      if (line === undefined) {
        break;
      }
      if (line.trim() === EMPTY_STRING) {
        cursor += 1;
        continue;
      }
      const indent = getIndent(line);
      if (indent <= parentIndent) {
        break;
      }
      const trimmed = line.trim();
      if (trimmed.startsWith(FRONTMATTER_ARRAY_PREFIX)) {
        break;
      }
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx === -1) {
        cursor += 1;
        continue;
      }
      const key = trimmed.slice(0, colonIdx).trim();
      const valuePart = trimmed.slice(colonIdx + 1).trim();
      if (valuePart === EMPTY_STRING) {
        cursor += 1;
        if (cursor < lines.length) {
          const nextLine = lines[cursor];
          if (nextLine !== undefined && nextLine.trim() !== EMPTY_STRING) {
            const nextIndent = getIndent(nextLine);
            const nextTrimmed = nextLine.trim();
            if (nextIndent > indent && nextTrimmed.startsWith(FRONTMATTER_ARRAY_PREFIX)) {
              obj[key] = parseArray(indent);
            } else if (nextIndent > indent) {
              obj[key] = parseObject(indent);
            } else {
              obj[key] = null;
            }
          } else {
            obj[key] = null;
          }
        } else {
          obj[key] = null;
        }
      } else {
        obj[key] = parseScalar(valuePart);
        cursor += 1;
      }
    }
    return obj;
  }

  function parseArray(parentIndent: number): unknown[] {
    const arr: unknown[] = [];
    while (cursor < lines.length) {
      const line = lines[cursor];
      if (line === undefined) {
        break;
      }
      if (line.trim() === EMPTY_STRING) {
        cursor += 1;
        continue;
      }
      const indent = getIndent(line);
      if (indent <= parentIndent) {
        break;
      }
      const trimmed = line.trim();
      if (!trimmed.startsWith(FRONTMATTER_ARRAY_PREFIX)) {
        break;
      }
      const valuePart = trimmed.slice(FRONTMATTER_ARRAY_PREFIX.length).trim();
      if (valuePart === EMPTY_STRING) {
        cursor += 1;
        continue;
      }
      arr.push(parseScalar(valuePart));
      cursor += 1;
    }
    return arr;
  }

  return parseObject(-1);
}
