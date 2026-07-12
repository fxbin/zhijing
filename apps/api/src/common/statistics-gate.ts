/**
 * 反虚荣门禁允许评估的统计视图 ID 白名单。
 * 防止前端任意构造 viewId 探测未注册视图的可见性。
 */
export const STATISTICS_GATE_ALLOWED_VIEW_IDS = new Set<string>([
  'weReadStatsBand',
  'wereadQuadrant',
  'topicSpectrum',
  'readingHealth',
]);

/**
 * 反虚荣门禁必须为 boolean 的字段名集合。
 * 用于在 evaluate-gate 端点逐字段校验类型，非 boolean 一律拒绝。
 */
export const STATISTICS_GATE_BOOLEAN_FIELDS = [
  'dependsOnBehaviorTrace',
  'sharedAcrossUsers',
  'hasRankingOrComparison',
  'emphasizesQuantity',
  'exposesRawData',
  'allowsUserChallenge',
  'isLinearlyOptimizable',
] as const;

export const AGENT_USAGE_DEFAULT_LIMIT = 100;
export const AGENT_USAGE_MAX_LIMIT = 500;
