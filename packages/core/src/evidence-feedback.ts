/**
 * Evidence 飞轮纯逻辑层。
 *
 * 承载 accept_rate 计算与被拒绝提议卡片的特征提取，
 * 作为"镜子不保姆"的可测量指标与 socraticQuestioning 的 negative example 来源。
 * 参照 user-memory.ts / decision-log.ts 的拆分模式，避免 core/index.ts 继续膨胀。
 *
 * 数据源：agent_action_log 中 action='accept_proposed_cards' 的记录。
 * 每条记录的 input/output 约定：
 *   input:  { messageId: string, totalProposed: number, selectedCount: number }
 *   output: { acceptedCards: Array<{ type: string, title: string }>,
 *             rejectedCards: Array<{ type: string, title: string }> }
 *
 * @module core/evidence-feedback
 * @author fxbin
 */

import type {
  AgentActionLog,
  EvidenceFeedback,
  RejectedCardFeature,
} from '@zhijing/shared';

/**
 * accept_proposed_cards 动作名，用于过滤 agent_action_log。
 */
export const EVIDENCE_ACTION_ACCEPT_PROPOSED_CARDS = 'accept_proposed_cards';

/**
 * 被拒绝卡片标题前缀截取长度（作为聚合维度，避免过长导致聚合失效）。
 */
export const REJECTED_TITLE_PREFIX_LENGTH = 20;

/**
 * 默认返回的 negative example 数量上限。
 */
export const DEFAULT_REJECTED_FEATURES_LIMIT = 5;

/**
 * 单条 accept_proposed_cards 日志的 output 结构（部分字段）。
 */
interface AcceptProposedCardsOutput {
  acceptedCards?: unknown;
  rejectedCards?: unknown;
}

/**
 * 单张被拒绝卡片的特征结构。
 */
interface RejectedCardEntry {
  type?: unknown;
  title?: unknown;
}

/**
 * 从未知结构中安全读取 rejectedCards 数组。
 *
 * @param output - 日志 output 字段（未知结构）
 * @returns 被拒绝卡片数组；结构异常时返回空数组
 */
function readRejectedCards(output: unknown): RejectedCardEntry[] {
  const candidate = (output as AcceptProposedCardsOutput | undefined)?.rejectedCards;
  if (!Array.isArray(candidate)) return [];
  return candidate.filter((item): item is RejectedCardEntry => {
    return typeof item === 'object' && item !== null;
  });
}

/**
 * 从未知结构中安全读取 acceptedCount 数值。
 *
 * @param output - 日志 output 字段（未知结构）
 * @returns 接受卡片数；缺失时返回 0
 */
function readAcceptedCount(output: unknown): number {
  const accepted = (output as AcceptProposedCardsOutput | undefined)?.acceptedCards;
  return Array.isArray(accepted) ? accepted.length : 0;
}

/**
 * 从未知结构中安全读取 rejectedCount 数值。
 *
 * @param output - 日志 output 字段（未知结构）
 * @returns 拒绝卡片数；缺失时返回 0
 */
function readRejectedCount(output: unknown): number {
  const rejected = (output as AcceptProposedCardsOutput | undefined)?.rejectedCards;
  return Array.isArray(rejected) ? rejected.length : 0;
}

/**
 * 计算 evidence 飞轮反馈聚合（accept_rate）。
 *
 * 输入应为已过滤的 accept_proposed_cards 日志数组（调用方负责按 workspace 过滤）。
 * 空数组返回 acceptRate=null，表示无 evidence 数据。
 *
 * @param logs - accept_proposed_cards 动作日志数组
 * @returns 聚合后的 EvidenceFeedback
 * @author fxbin
 */
export function computeEvidenceFeedback(logs: AgentActionLog[]): EvidenceFeedback {
  let totalAccepted = 0;
  let totalRejected = 0;
  for (const log of logs) {
    totalAccepted += readAcceptedCount(log.output);
    totalRejected += readRejectedCount(log.output);
  }
  const totalProposed = totalAccepted + totalRejected;
  const acceptRate = totalProposed > 0 ? totalAccepted / totalProposed : null;
  return {
    totalProposed,
    totalAccepted,
    totalRejected,
    acceptRate,
  };
}

/**
 * 从被拒绝提议卡片中提取特征偏移（type + titlePrefix 聚合）。
 *
 * 用于下一轮 socraticQuestioning 注入 negative example。
 * 同 type + 同 titlePrefix 的卡片聚合成一条，按出现次数降序。
 *
 * @param logs - accept_proposed_cards 动作日志数组
 * @param limit - 返回数量上限；默认 DEFAULT_REJECTED_FEATURES_LIMIT
 * @returns 排序后的特征数组
 * @author fxbin
 */
export function extractRejectedFeatures(
  logs: AgentActionLog[],
  limit: number = DEFAULT_REJECTED_FEATURES_LIMIT,
): RejectedCardFeature[] {
  const counter = new Map<string, RejectedCardFeature>();
  for (const log of logs) {
    const entries = readRejectedCards(log.output);
    for (const entry of entries) {
      const type = typeof entry.type === 'string' && entry.type.trim().length > 0
        ? entry.type.trim()
        : 'unknown';
      const rawTitle = typeof entry.title === 'string' ? entry.title : '';
      const titlePrefix = rawTitle.trim().slice(0, REJECTED_TITLE_PREFIX_LENGTH);
      const key = `${type}::${titlePrefix}`;
      const existing = counter.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        counter.set(key, { type, titlePrefix, count: 1 });
      }
    }
  }
  return [...counter.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, Math.max(0, limit));
}

/**
 * 构造 negative example 文本段，供 buildSocraticPrompt 注入。
 *
 * 空特征数组返回空字符串（调用方据此决定是否追加）。
 *
 * @param features - 被拒绝卡片特征数组
 * @returns prompt 注入文本
 * @author fxbin
 */
export function buildNegativeExampleSection(features: RejectedCardFeature[]): string {
  if (features.length === 0) return '';
  const lines = features.map((feature) => `- 类型 ${feature.type} / 标题前缀「${feature.titlePrefix || '（空）'}」/ 出现 ${feature.count} 次`);
  return [
    '历史被拒绝的提议特征（negative example，请避免再次生成类似提问）：',
    lines.join('\n'),
  ].join('\n');
}
