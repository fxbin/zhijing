/**
 * Agent 消息工具函数。
 *
 * 提供与 AI SDK 消息格式无关的纯函数实现，
 * 供 packages/agent 与 apps/web 共享，避免重复实现。
 *
 * @author fxbin
 */

/**
 * Agent 消息内容片段的最小结构。
 */
interface AgentMessagePart {
  type: string;
  text?: string;
}

/**
 * Agent 消息的最小结构，仅声明 content 字段以支持文本提取。
 */
interface AgentMessageLike {
  content?: string | AgentMessagePart[];
}

/**
 * 从 Agent 消息的 content 中提取纯文本。
 *
 * 兼容两种 content 形态：
 *  - 字符串：直接返回
 *  - 数组：收集 type 为 text 且 text 为字符串的部分，拼接返回
 *  - 其他：返回空串
 *
 * @param message - Agent 消息对象
 * @returns 提取到的纯文本；无法提取时返回空串
 * @author fxbin
 */
export function extractAgentMessageText(message: unknown): string {
  if (!message || typeof message !== 'object') return '';
  const msg = message as AgentMessageLike;
  const content = msg.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    const parts: string[] = [];
    for (const part of content) {
      if (part && typeof part === 'object' && part.type === 'text' && typeof part.text === 'string') {
        parts.push(part.text);
      }
    }
    return parts.join('');
  }
  return '';
}
