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
