/**
 * JSON 提取与规范化工具模块。
 *
 * 从 LLM 返回的文本中提取 JSON 片段，并对解析后的 JSON 做结构规范化
 *（去除空字符串字段、递归 trim），供 runtime-factory 解析结构化输出使用。
 *
 * @module json-utils
 * @author fxbin
 */

/**
 * 从 LLM 返回的文本中提取 JSON 字符串。
 *
 * 依次尝试：Markdown 代码块 → 首尾花括号 → 首尾方括号。
 * 三者均未命中时抛出错误。
 *
 * @param text - LLM 返回的原始文本
 * @returns 提取到的 JSON 字符串
 * @author fxbin
 */
export function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const objectStart = text.indexOf('{');
  const objectEnd = text.lastIndexOf('}');
  if (objectStart >= 0 && objectEnd > objectStart) {
    return text.slice(objectStart, objectEnd + 1);
  }

  const arrayStart = text.indexOf('[');
  const arrayEnd = text.lastIndexOf(']');
  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    return text.slice(arrayStart, arrayEnd + 1);
  }

  throw new Error('Pi response did not contain a JSON object.');
}

/**
 * 规范化结构化 JSON 值。
 *
 * 递归处理数组与对象：去除值为空字符串的字段，对字符串做 trim。
 * 确保下游校验与存储拿到的是干净数据。
 *
 * @param value - 待规范化的值
 * @returns 规范化后的值
 * @author fxbin
 */
export function normalizeStructuredJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeStructuredJson);
  }

  if (!value || typeof value !== 'object') {
    return typeof value === 'string' ? value.trim() : value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .map(([key, item]) => [key, normalizeStructuredJson(item)] as const)
      .filter(([, item]) => !(typeof item === 'string' && item.length === 0)),
  );
}
