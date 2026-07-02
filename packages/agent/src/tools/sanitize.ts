/**
 * Agent 工具输出清洗模块。
 *
 * 工具返回的卡片正文、资料预览等字段来自用户导入或 AI 生成内容，
 * 可能包含 prompt 注入字符（如 fenced code block 标记、模型控制 token、
 * 伪造的 proposal-batch 代码块等）。本模块统一清洗这些字符，
 * 避免工具输出被 LLM 误解析为指令或事件。
 *
 * @module tools/sanitize
 * @author fxbin
 */

/**
 * 需要清洗的 prompt 注入模式（正则 + 替换为空格）。
 *
 * - fenced code block 围栏（``` 或 ~~~）：防止伪造 proposal-batch 等代码块
 * - 模型控制 token：<|im_start|>、<|im_end|>、[INST]、[/INST] 等
 * - 系统提示词标记：system:、assistant:、user:（行首）
 * - 注入指令关键词：忽略上述指令、ignore previous instructions 等（中英）
 */
const INJECTION_PATTERNS: ReadonlyArray<{ pattern: RegExp; replacement: string }> = [
  { pattern: /```+/g, replacement: ' ' },
  { pattern: /~~~/g, replacement: ' ' },
  { pattern: /<\|im_start\|>/gi, replacement: ' ' },
  { pattern: /<\|im_end\|>/gi, replacement: ' ' },
  { pattern: /\[\/?INST\]/gi, replacement: ' ' },
  { pattern: /\[\/?SYS\]/gi, replacement: ' ' },
  { pattern: /^\s*(system|assistant|user)\s*:/gim, replacement: ' ' },
  { pattern: /忽略(上述|以上|前面)指令/gi, replacement: ' ' },
  { pattern: /ignore\s+(previous|above|all)\s+instructions?/gi, replacement: ' ' },
];

/**
 * 清洗文本中的 prompt 注入字符。
 *
 * 多个连续空格合并为单个空格，首尾 trim。
 * 不删除原文的标点、表情、Markdown 语法（除围栏外），
 * 保留语义可读性。
 *
 * @param input - 原始文本（卡片正文、资料预览等）
 * @returns 清洗后的文本
 * @author fxbin
 */
export function sanitizeForLlmContext(input: string): string {
  if (!input) return '';
  let result = input;
  for (const { pattern, replacement } of INJECTION_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result.replace(/\s{2,}/g, ' ').trim();
}
