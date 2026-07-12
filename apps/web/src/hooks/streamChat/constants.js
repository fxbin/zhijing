/**
 * 流式 Agent 对话相关常量集合。
 *
 * 汇总 useStreamChat 在 SSE 流式对话生命周期中用到的全部常量：
 * - 初始状态值
 * - SSE 协议相关分隔符与前缀
 * - localStorage 持久化 key 前缀与上限
 * - SSE wire 事件类型枚举
 * - 流式期间引用标记剥离正则
 * - 编排模式标签映射与默认值
 * - 运行统计初始值
 * - 消息角色常量
 *
 * @module hooks/streamChat/constants
 * @author fxbin
 */

/**
 * 流式对话消息列表初始为空数组。
 */
export const INITIAL_CHAT_MESSAGES = [];

/**
 * 流式对话运行态初始为 false。
 */
export const INITIAL_IS_STREAMING = false;

/**
 * SSE 事件块分隔符（HTTP chunk 中事件之间以空行分隔）。
 */
export const SSE_CHUNK_SEPARATOR = '\n\n';

/**
 * SSE data: 行前缀。
 */
export const SSE_DATA_PREFIX = 'data:';

/**
 * 流式请求禁用超时（SSE 长连接保持开启，由后端关闭）。
 */
export const STREAM_TIMEOUT_DISABLED = 0;

/**
 * localStorage 持久化 key 前缀，按 workspaceId 分键存储对话历史。
 */
export const STORAGE_KEY_PREFIX = 'zhijing:agent-chat:';

/**
 * 会话 id 持久化 key 前缀（与消息持久化分离，便于独立清理）。
 * 跨轮对话时复用同一 sessionId，让后端累积上下文。
 */
export const SESSION_ID_STORAGE_KEY_PREFIX = 'zhijing:agent-session:';

/**
 * localStorage 持久化最大消息条数，超过时丢弃最早的消息以控制容量。
 */
export const STORAGE_MAX_MESSAGES = 100;

/**
 * SSE 流式 Agent 对话的 wire 事件类型枚举。
 * 与 apps/api/src/agent-stream.ts 中 AgentStreamEvent 保持一致。
 */
export const STREAM_EVENT = Object.freeze({
  SESSION_INFO: 'session_info',
  AGENT_START: 'agent_start',
  AGENT_END: 'agent_end',
  TURN_START: 'turn_start',
  TURN_END: 'turn_end',
  MESSAGE_START: 'message_start',
  MESSAGE_DELTA: 'message_delta',
  REASONING_DELTA: 'reasoning_delta',
  MESSAGE_END: 'message_end',
  TOOL_START: 'tool_start',
  TOOL_END: 'tool_end',
  MODE_UPDATE: 'mode_update',
  ROLE_UPDATE: 'role_update',
  AUX_START: 'aux_start',
  AUX_DELTA: 'aux_delta',
  AUX_END: 'aux_end',
  PROPOSAL_BATCH: 'proposal_batch',
  ERROR: 'error',
});

/**
 * <cite> 标签正则：流式增量期间用于剥离标签但保留标题文本。
 *
 * 后端 message_end 会把引用标记替换为 [n] 占位符并下发 citations 数组，
 * 但流式增量期间引用标记会原样显示，造成闪烁。stripCiteTagsForStreaming
 * 调用本正则，把 <cite cardId="xxx">标题</cite> 和 [标题](card_xxx) 替换为「标题」
 * 纯文本，保证流式过程中文本干净；message_end 后由后端清理后的文本（含 [n]
 * 占位符）覆盖。
 */
export const CITE_TAG_STREAMING_PATTERN = /<cite\s+(?:cardId="[^"]*"|materialId="[^"]*")\s*>([^<]*)<\/cite>/g;
export const CITE_MARKDOWN_STREAMING_PATTERN = /\[([^\]]+)\]\((?:card_[a-f0-9]{8,}|mat_[a-f0-9]{8,})\)/g;

/**
 * 编排模式中文标签映射，供 ChatDock 头部展示。
 */
export const ORCHESTRATOR_MODE_LABELS = Object.freeze({
  mirror: '镜子',
  catalyst: '催化剂',
  navigator: '导航员',
});

/**
 * 默认编排模式（无 mode_update 事件时使用）。
 */
export const DEFAULT_ORCHESTRATOR_MODE = 'mirror';

/**
 * 运行统计初始值：流式对话未开始时的空状态。
 */
export const INITIAL_RUN_STATS = Object.freeze({
  model: '',
  provider: '',
  startedAt: 0,
  endedAt: 0,
  toolCount: 0,
  toolErrorCount: 0,
  outputChars: 0,
  inputTokens: 0,
  outputTokens: 0,
  costUsd: null,
});

/**
 * 流式对话消息角色常量。
 */
export const ROLE_USER = 'user';
export const ROLE_ASSISTANT = 'assistant';
