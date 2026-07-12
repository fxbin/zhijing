/**
 * 注意力信号与兴趣画像类型。
 *
 * 包含用户认知行为的注意力信号记录、兴趣主题、用户画像、
 * 每日关注摘要，以及供编排 Agent 使用的注意力聚合摘要。
 *
 * @author fxbin
 */

/**
 * 注意力信号类型，标识用户在知识库中产生的不同认知行为。
 * - question_card_created 创建问题型卡片（强信号）
 * - manual_layout 手动调整知识地图节点布局（中信号）
 * - ask_question 向知识库提问（中信号）
 * - card_opened 打开卡片查看（弱信号，前端埋点）
 * - cannot_answer 用户反馈"答不上来"（中信号，标识知识盲区）
 * @author fxbin
 */
export type AttentionSignalType = 'question_card_created' | 'manual_layout' | 'ask_question' | 'card_opened' | 'cannot_answer';

/**
 * 注意力信号强度，用于 Recall Agent 检索时加权排序。
 * - strong 高价值认知行为（如主动创建问题卡片）
 * - medium 中等价值认知行为（如提问、手动布局）
 * - weak 低价值行为（如浏览卡片）
 * @author fxbin
 */
export type AttentionSignalStrength = 'strong' | 'medium' | 'weak';

/**
 * 注意力信号的目标类型，标识信号关联的实体类别。
 * - card 知识卡片
 * - material 资料
 * - layout 知识地图布局
 * - question 提问
 * @author fxbin
 */
export type AttentionSignalTargetType = 'card' | 'material' | 'layout' | 'question';

/**
 * 注意力信号记录，供 Recall Agent 检索用户认知建构活动。
 * 存储无关设计：通过 KnowledgeRepository 接口抽象，兼容 SQLite 与未来文件化存储。
 * @author fxbin
 */
export interface AttentionSignal {
  id: string;
  workspaceId?: string;
  signalType: AttentionSignalType;
  signalStrength: AttentionSignalStrength;
  targetType: AttentionSignalTargetType;
  targetId: string;
  contextData: Record<string, unknown>;
  consumed: boolean;
  createdAt: string;
}

/**
 * 兴趣主题项，表示用户近期关注的一个主题词及其权重。
 * @author fxbin
 */
export interface InterestTopic {
  term: string;
  weight: number;
  sourceCount: number;
}

/**
 * 用户兴趣画像，基于近期认知行为（卡片创建、提问、回忆评分等）
 * 构建的滚动兴趣向量，用于主动推荐与盲区检测。
 * @author fxbin
 */
export interface UserInterestProfile {
  windowDays: number;
  topics: InterestTopic[];
  totalSignals: number;
  generatedAt: string;
}

/**
 * 每日关注摘要条目，表示今日新增的一个认知建构项。
 * @author fxbin
 */
export interface DailyDigestItem {
  id: string;
  type: 'card' | 'material' | 'signal';
  title: string;
  workspaceId?: string;
  workspaceTitle?: string;
  createdAt: string;
}

/**
 * 每日关注摘要，由后台调度器每日扫描生成，
 * 汇总过去 24 小时内的新增卡片、材料、注意力信号及兴趣主题。
 * @author fxbin
 */
export interface DailyDigest {
  date: string;
  newCards: DailyDigestItem[];
  newMaterials: DailyDigestItem[];
  newSignals: DailyDigestItem[];
  topInterestTopics: InterestTopic[];
  totalNewItems: number;
  generatedAt: string;
}

/**
 * 聚合后的注意力信号摘要，供编排 Agent 做模式选择。
 * @author fxbin
 */
export interface AttentionAggregate {
  /** 最近注意力信号的统一强度评分（0-3） */
  maxStrength: number;
  /** 未消费的强信号数量 */
  unconsumedStrongCount: number;
  /** 最近一条信号的类型 */
  latestSignalType: string;
  /** 当前 Agent 提议的类型列表 */
  proposalTypes: string[];
  /** 是否存在知识盲区提议 */
  hasBlindSpot: boolean;
  /** 是否存在遗忘复习提议 */
  hasRecallReview: boolean;
  /** 聚合时间戳 */
  evaluatedAt: string;
}
