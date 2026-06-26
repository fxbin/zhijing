/**
 * 对话线程统一数据模型与转换工具。
 *
 * 将流式对话消息（useStreamChat）、历史消息（workspaceMessages）、
 * 一次性回答（assistantAnswer）三套结构统一为 ChatThreadItem，
 * 供 ChatMessageItem 组件单一渲染，消除 GlobalChatDock 的结构不稳定根源。
 *
 * @module utils/chatThread
 * @author fxbin
 */

/**
 * 消息来源路径枚举。
 * - stream：流式 Agent 对话（useStreamChat 产出）
 * - history：历史消息（workspaceMessages，旧 /ask 路径落库后回拉）
 * - answer：一次性回答（assistantAnswer，旧 /ask 同步返回未落库）
 */
export const THREAD_SOURCE = Object.freeze({
  STREAM: 'stream',
  HISTORY: 'history',
  ANSWER: 'answer',
});

/**
 * 消息角色枚举。
 */
export const THREAD_ROLE = Object.freeze({
  USER: 'user',
  ASSISTANT: 'assistant',
});

/**
 * 工具调用对象占位（无工具时使用）。
 */
export const EMPTY_TOOL_CALLS = [];

/**
 * 引用列表占位（无引用时使用）。
 */
export const EMPTY_CITATIONS = [];

/**
 * 提议卡片列表占位（无提议时使用）。
 */
export const EMPTY_PROPOSED_CARDS = [];

/**
 * 构造一个 ChatThreadItem。
 *
 * ChatThreadItem 是对话线程的统一渲染单元，承载所有路径的消息形态：
 * - 流式消息：含 reasoning/toolCalls/text/error/isStreaming
 * - 历史消息：含 answer/cardIds/artifactId
 * - 一次性回答：含 message/cards/citations/proposedCards/artifact
 *
 * 所有可选字段在缺失时收敛为占位值，避免渲染层重复 null 判断。
 *
 * @param {object} fields - 消息字段
 * @param {string} fields.id - 消息唯一 id
 * @param {string} fields.role - 角色（user / assistant）
 * @param {string} fields.source - 来源路径（stream / history / answer）
 * @param {string} [fields.text=''] - 助手正文（流式累积或历史回答）
 * @param {string} [fields.userText=''] - 用户提问文本
 * @param {string} [fields.reasoning=''] - 推理过程（流式独有）
 * @param {Array} [fields.toolCalls=EMPTY_TOOL_CALLS] - 工具调用列表（流式独有）
 * @param {boolean} [fields.isStreaming=false] - 是否仍在流式输出
 * @param {string} [fields.error=''] - 错误文案
 * @param {Array} [fields.citations=EMPTY_CITATIONS] - 引用列表
 * @param {Array} [fields.proposedCards=EMPTY_PROPOSED_CARDS] - 提议卡片列表
 * @param {string} [fields.messageId=''] - 后端消息 id（用于提议卡片采纳）
 * @param {object} [fields.artifact=null] - 关联产物
 * @param {Array} [fields.cardIds=[]] - 关联卡片 id 列表（历史消息）
 * @param {number} [fields.timestamp=0] - 消息时间戳，用于排序
 * @returns {object} 规范化的 ChatThreadItem
 * @author fxbin
 */
export function createChatThreadItem(fields) {
  const {
    id,
    role,
    source,
    text = '',
    userText = '',
    reasoning = '',
    toolCalls = EMPTY_TOOL_CALLS,
    isStreaming = false,
    error = '',
    citations = EMPTY_CITATIONS,
    proposedCards = EMPTY_PROPOSED_CARDS,
    messageId = '',
    artifact = null,
    cardIds = [],
    timestamp = 0,
  } = fields;

  if (!id || !role || !source) {
    throw new Error('createChatThreadItem: id, role, source are required.');
  }

  return {
    id,
    role,
    source,
    text,
    userText,
    reasoning,
    toolCalls,
    isStreaming,
    error,
    citations,
    proposedCards,
    messageId,
    artifact,
    cardIds,
    timestamp,
  };
}

/**
 * 将流式对话消息（useStreamChat 产出）转换为 ChatThreadItem。
 *
 * 流式消息分 user / assistant 两种角色：
 * - user 消息仅含 text，映射为 userText
 * - assistant 消息含 reasoning/toolCalls/text/error/isStreaming，原样保留
 *
 * @param {object} message - useStreamChat 的消息对象
 * @returns {object} ChatThreadItem
 * @author fxbin
 */
export function fromStreamMessage(message) {
  if (message.role === THREAD_ROLE.USER) {
    return createChatThreadItem({
      id: message.id,
      role: THREAD_ROLE.USER,
      source: THREAD_SOURCE.STREAM,
      userText: message.text ?? '',
      timestamp: extractTimestampFromId(message.id),
    });
  }

  return createChatThreadItem({
    id: message.id,
    role: THREAD_ROLE.ASSISTANT,
    source: THREAD_SOURCE.STREAM,
    text: message.text ?? '',
    reasoning: message.reasoning ?? '',
    toolCalls: message.toolCalls ?? EMPTY_TOOL_CALLS,
    isStreaming: Boolean(message.isStreaming),
    error: message.error ?? '',
    timestamp: extractTimestampFromId(message.id),
  });
}

/**
 * 将历史消息（workspaceMessages）转换为 ChatThreadItem。
 *
 * 历史消息结构：{ id, question, answer, cardIds, artifactId, createdAt }
 * 拆分为 user + assistant 两条 ChatThreadItem，保持时序。
 *
 * @param {object} message - 历史消息对象
 * @param {Array} [artifacts=[]] - 工作区产物列表，用于查找 artifactId 对应产物
 * @returns {Array<object>} [userItem, assistantItem] 双元素数组
 * @author fxbin
 */
export function fromHistoryMessage(message, artifacts = []) {
  const userItem = createChatThreadItem({
    id: `${message.id}:user`,
    role: THREAD_ROLE.USER,
    source: THREAD_SOURCE.HISTORY,
    userText: message.question ?? '',
    timestamp: parseTimestamp(message.createdAt, message.id),
  });

  const artifact = message.artifactId
    ? artifacts.find((item) => item.id === message.artifactId) ?? null
    : null;

  const assistantItem = createChatThreadItem({
    id: `${message.id}:assistant`,
    role: THREAD_ROLE.ASSISTANT,
    source: THREAD_SOURCE.HISTORY,
    text: message.answer ?? '',
    cardIds: message.cardIds ?? [],
    proposedCards: message.proposedCards ?? EMPTY_PROPOSED_CARDS,
    messageId: message.id,
    artifact,
    timestamp: parseTimestamp(message.createdAt, message.id) + 1,
  });

  return [userItem, assistantItem];
}

/**
 * 将一次性回答（assistantAnswer）转换为 ChatThreadItem。
 *
 * 一次性回答结构：{ question, message, cards, proposedCards, messageId, artifact, citations, loading, error }
 * 拆分为 user + assistant 两条，assistant 携带提议卡片与引用。
 *
 * @param {object} answer - assistantAnswer 对象
 * @returns {Array<object>} [userItem, assistantItem] 双元素数组；answer 为 null 时返回空数组
 * @author fxbin
 */
export function fromAssistantAnswer(answer) {
  if (!answer) return [];

  const baseTimestamp = Date.now();

  const userItem = createChatThreadItem({
    id: `answer:${baseTimestamp}:user`,
    role: THREAD_ROLE.USER,
    source: THREAD_SOURCE.ANSWER,
    userText: answer.question ?? '',
    timestamp: baseTimestamp,
  });

  const assistantItem = createChatThreadItem({
    id: `answer:${baseTimestamp}:assistant`,
    role: THREAD_ROLE.ASSISTANT,
    source: THREAD_SOURCE.ANSWER,
    text: answer.artifact?.body ?? answer.message ?? '',
    error: answer.error ?? '',
    citations: answer.citations ?? EMPTY_CITATIONS,
    proposedCards: answer.proposedCards ?? EMPTY_PROPOSED_CARDS,
    messageId: answer.messageId ?? '',
    artifact: answer.artifact ?? null,
    isStreaming: Boolean(answer.loading),
    timestamp: baseTimestamp + 1,
  });

  return [userItem, assistantItem];
}

/**
 * 从流式消息 id 中提取时间戳。
 * 流式消息 id 格式：{role}_{timestamp}_{random}
 * @param {string} id - 消息 id
 * @returns {number} 时间戳；解析失败返回 0
 * @author fxbin
 */
function extractTimestampFromId(id) {
  const parts = id.split('_');
  const parsed = Number(parts[1]);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * 将 ISO 时间字符串或消息 id 转换为时间戳。
 * @param {string} [isoString] - ISO 时间字符串
 * @param {string} [fallbackId=''] - 解析失败时从 id 提取的消息 id
 * @returns {number} 时间戳；解析失败返回 0
 * @author fxbin
 */
function parseTimestamp(isoString, fallbackId = '') {
  if (isoString) {
    const parsed = Date.parse(isoString);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return extractTimestampFromId(fallbackId);
}

/**
 * 将多个来源的消息合并为按时间戳排序的统一线程。
 *
 * 合并顺序：
 * 1. 历史消息（最早，落库回拉）
 * 2. 流式对话消息（中期，useStreamChat 累积）
 * 3. 一次性回答（最新，assistantAnswer）
 *
 * 同时间戳按插入顺序稳定排序（Array.prototype.sort 稳定）。
 *
 * @param {Array<object>} streamMessages - 流式消息列表
 * @param {Array<object>} historyMessages - 历史消息列表
 * @param {Array<object>} artifacts - 产物列表（历史消息查找关联产物）
 * @param {object|null} assistantAnswer - 一次性回答
 * @returns {Array<object>} 合并并排序后的 ChatThreadItem 列表
 * @author fxbin
 */
export function mergeToThread(streamMessages, historyMessages, artifacts, assistantAnswer) {
  const items = [];

  for (const message of historyMessages ?? []) {
    items.push(...fromHistoryMessage(message, artifacts));
  }

  for (const message of streamMessages ?? []) {
    items.push(fromStreamMessage(message));
  }

  items.push(...fromAssistantAnswer(assistantAnswer));

  return items.sort((a, b) => a.timestamp - b.timestamp);
}
