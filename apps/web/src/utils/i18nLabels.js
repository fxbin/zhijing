import { useTranslation } from 'react-i18next';

/**
 * 使用 react-i18next 的 t 函数，获取卡片类型的本地化显示名称。
 * @param {Function} t - react-i18next 的 t 函数
 * @param {string} type - 卡片类型，如 concept / method / case
 * @returns {string} 本地化后的类型名称；找不到时返回原值
 */
export function getCardTypeLabel(t, type) {
  return t(`cardType.${type}`, type ?? 'general');
}

/**
 * 使用 react-i18next 的 t 函数，获取卡片溯源状态的本地化显示名称。
 * @param {Function} t - react-i18next 的 t 函数
 * @param {string} status - 溯源状态，如 sourced / ai_skeleton
 * @returns {string} 本地化后的状态名称；找不到时返回原值
 */
export function getClaimStatusLabel(t, status) {
  return t(`claimStatus.${status}`, status ?? 'ai_skeleton');
}

/**
 * 使用 react-i18next 的 t 函数，获取资料解析状态的本地化显示名称。
 * @param {Function} t - react-i18next 的 t 函数
 * @param {string} status - 解析状态，如 saved / parsing / ingested
 * @returns {string} 本地化后的状态名称；找不到时返回原值
 */
export function getParseStatusLabel(t, status) {
  return t(`parseStatus.${status}`, status ?? 'saved');
}

/**
 * 使用 react-i18next 的 t 函数，获取 intake 类型的本地化显示名称。
 * @param {Function} t - react-i18next 的 t 函数
 * @param {string} kind - intake 类型，如 link / text / question
 * @returns {string} 本地化后的类型名称；找不到时返回原值
 */
export function getIntakeKindLabel(t, kind) {
  return t(`intakeKind.${kind}`, kind ?? 'text');
}

/**
 * 使用 react-i18next 的 t 函数，获取资料来源平台的本地化显示名称。
 * 当 platform 为空时返回 library.localPlatform；未命中 platform.* 时回退到 platform.unknown。
 * @param {Function} t - react-i18next 的 t 函数
 * @param {string|undefined} platform - 平台标识，如 weread / xiaohongshu / web
 * @returns {string} 本地化后的平台名称
 */
export function getPlatformLabel(t, platform) {
  if (!platform) return t('library.localPlatform');
  return t(`platform.${platform}`, { defaultValue: t('platform.unknown') });
}

/**
 * 错误关键词 → i18n key 映射表。
 * 顺序敏感：靠前的先匹配，命中即返回。
 * 每条规则包含 pattern（正则，忽略大小写）与 key（i18n 路径）。
 */
const PARSE_ERROR_RULES = [
  { pattern: /(\[timeout\]|timed?\s*out|aborted|ETIMEDOUT)/i, key: 'parseError.timeout' },
  { pattern: /(fetch\s*failed|ECONNREFUSED|ENOTFOUND|ENETUNREACH|network\s*error|socket\s*hang\s*up)/i, key: 'parseError.network' },
  { pattern: /(401|unauthorized|403|forbidden)/i, key: 'parseError.unauthorized' },
  { pattern: /(429|rate\s*limit|too\s*many\s*requests)/i, key: 'parseError.rateLimit' },
  { pattern: /(500|502|503|504|internal\s*server\s*error|bad\s*gateway|service\s*unavailable)/i, key: 'parseError.serverError' },
  { pattern: /(insufficient.{0,10}quota|billing|payment|credit)/i, key: 'parseError.quota' },
  { pattern: /(context.{0,10}length|token.{0,10}limit|too\s*long|payload\s*too\s*large)/i, key: 'parseError.tooLarge' },
];

/**
 * 将后端返回的原始错误文案映射成本地化 i18n key。
 * 命中任一规则返回对应 key；未命中返回 'parseError.unknown'。
 * 原始文案由调用方保留在 title 属性供技术排查。
 * @param {string} rawError - 后端原始错误文案
 * @returns {string} i18n key，如 'parseError.timeout'
 */
export function classifyParseError(rawError) {
  const text = String(rawError ?? '').trim();
  if (!text) return 'parseError.unknown';
  const hit = PARSE_ERROR_RULES.find((rule) => rule.pattern.test(text));
  return hit ? hit.key : 'parseError.unknown';
}

/**
 * 使用 react-i18next 的 t 函数，将原始错误文案本地化为用户可读的中文。
 * @param {Function} t - react-i18next 的 t 函数
 * @param {string} rawError - 后端原始错误文案
 * @returns {string} 本地化后的错误文案
 */
export function getParseErrorLabel(t, rawError) {
  return t(classifyParseError(rawError), String(rawError ?? '').slice(0, 120));
}

/**
 * 在 React 组件中获取卡片类型标签的便捷 Hook。
 * @returns {(type: string) => string} 接收类型返回本地化名称的函数
 */
export function useCardTypeLabel() {
  const { t } = useTranslation();
  return (type) => getCardTypeLabel(t, type);
}

/**
 * 在 React 组件中获取卡片溯源状态标签的便捷 Hook。
 * @returns {(status: string) => string} 接收状态返回本地化名称的函数
 */
export function useClaimStatusLabel() {
  const { t } = useTranslation();
  return (status) => getClaimStatusLabel(t, status);
}

/**
 * 在 React 组件中将后端原始错误文案本地化为用户可读文案的便捷 Hook。
 * @returns {(rawError: string) => string} 接收原始错误返回本地化文案的函数
 */
export function useParseErrorLabel() {
  const { t } = useTranslation();
  return (rawError) => getParseErrorLabel(t, rawError);
}

/**
 * 在 React 组件中获取资料解析状态标签的便捷 Hook。
 * @returns {(status: string) => string} 接收状态返回本地化名称的函数
 */
export function useParseStatusLabel() {
  const { t } = useTranslation();
  return (status) => getParseStatusLabel(t, status);
}

/**
 * 使用 react-i18next 的 t 函数，获取任务状态的本地化显示名称。
 * @param {Function} t - react-i18next 的 t 函数
 * @param {string} status - 任务状态，如 queued / running / succeeded
 * @returns {string} 本地化后的状态名称
 */
export function getTaskStatusLabel(t, status) {
  return t(`task.status.${status}`, status ?? 'queued');
}

/**
 * 使用 react-i18next 的 t 函数，获取任务工作流类型的本地化显示名称。
 * @param {Function} t - react-i18next 的 t 函数
 * @param {string} workflow - 任务工作流，如 ingest_material / parse_material
 * @returns {string} 本地化后的工作流名称
 */
export function getTaskWorkflowLabel(t, workflow) {
  return t(`task.workflow.${workflow}`, workflow ?? 'task');
}

/**
 * 在 React 组件中获取 intake 类型标签的便捷 Hook。
 * @returns {(kind: string) => string} 接收类型返回本地化名称的函数
 */
export function useIntakeKindLabel() {
  const { t } = useTranslation();
  return (kind) => getIntakeKindLabel(t, kind);
}

/**
 * 在 React 组件中获取任务状态标签的便捷 Hook。
 * @returns {(status: string) => string} 接收状态返回本地化名称的函数
 */
export function useTaskStatusLabel() {
  const { t } = useTranslation();
  return (status) => getTaskStatusLabel(t, status);
}

/**
 * 在 React 组件中获取任务工作流标签的便捷 Hook。
 * @returns {(workflow: string) => string} 接收工作流返回本地化名称的函数
 */
export function useTaskWorkflowLabel() {
  const { t } = useTranslation();
  return (workflow) => getTaskWorkflowLabel(t, workflow);
}
