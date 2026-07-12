/**
 * Provider 注册与解析模块。
 *
 * 集中管理 LLM provider 的默认配置、环境变量读取、model 实例解析。
 * 支持 SDK 内置 KnownProvider 与自定义 OpenAI 兼容端点（如商汤 SenseNova）。
 * 被 runtime-factory 与 agent-factory 共用，保证两条 LLM 入口配置一致。
 *
 * @module provider-registry
 * @author fxbin
 */
import {
  getEnvApiKey,
  getModel,
  getModels,
  getProviders,
  type Api,
  type KnownProvider,
  type Model,
} from '@earendil-works/pi-ai';

export const defaultProvider: KnownProvider = 'deepseek';
export const defaultModel = 'deepseek-v4-flash';

/**
 * 自定义 base URL 环境变量名。
 * 设置时覆盖 SDK 内置 provider 的默认 base URL，
 * 用于接入 OpenAI 兼容的第三方端点（如商汤 SenseNova Token Plan）。
 * @author fxbin
 */
export const PI_BASE_URL_ENV = 'ZHIJING_PI_BASE_URL';

export const CARD_QUALITY_CONTRACT = [
  'Knowledge-card quality contract:',
  '- Prefer fewer high-signal cards over many generic cards. If the source does not support a useful card, omit it.',
  '- Every card must be atomic: one reusable concept, method, case, step, viewpoint, or open question.',
  '- Ground cards in the prompt/source text. Do not invent facts, names, citations, or user intent.',
  '- Avoid filler titles such as 核心概念, 关键问题, 下一步要回答的问题, 知识卡片, 资料总结, 背景补充.',
  '- concept cards must define the concept and include a boundary, contrast, condition, or source clue.',
  '- question cards must be genuine unresolved questions implied by the source, not generic next-step reminders.',
  '- Body text must explain why the card matters or how it can be used; avoid repeating the title.',
].join('\n');

export function getDefaultPiProvider() {
  return defaultProvider;
}

export function getDefaultPiModel() {
  return defaultModel;
}

export function getKnownPiProviders() {
  return getProviders();
}

export function getKnownPiModels(provider: KnownProvider) {
  return getModels(provider).map((model) => ({
    id: model.id,
  }));
}

export function getPiEnvApiKey(provider: KnownProvider) {
  return getEnvApiKey(provider);
}

export function isKnownPiProvider(provider: string): provider is KnownProvider {
  return getKnownPiProviders().includes(provider as KnownProvider);
}

/**
 * 获取已配置的 Model 实例（resolveConfiguredModel 的薄封装）。
 *
 * @param provider - LLM provider 字符串
 * @param modelId - 模型 id
 * @param baseUrl - 可选 base URL 覆盖
 * @returns 最终生效的 Model 实例
 * @author fxbin
 */
export function getConfiguredModel(provider: string, modelId: string, baseUrl?: string): Model<Api> {
  return resolveConfiguredModel(provider, modelId, baseUrl);
}

/**
 * 解析最终生效的 Model 实例。
 *
 * baseUrl 优先级：
 * 1. 显式传入的 baseUrl 参数（来自 PiAiRuntimeConfig / agent-factory options）
 * 2. 环境变量 ZHIJING_PI_BASE_URL
 * 3. SDK 内置 provider 的默认 base URL
 *
 * provider 解析：
 * - 已知 provider（KnownProvider）：走 SDK 原逻辑 getModel(provider, modelId)
 * - 未知 provider（自定义字符串）：遍历所有已知 provider 查找第一个注册了该 modelId 的，
 *   作为基础 Model 再覆盖 baseUrl。适用于 OpenAI 兼容的第三方端点（如商汤 SenseNova
 *   Token Plan：`https://token.sensenova.cn/v1`，model id 直接复用 `deepseek-v4-flash`）。
 *   旧实现硬编码 'openai' 会在 modelId 不在 openai provider 注册时返回 undefined，
 *   导致后续 stream 调用抛 "No API provider registered for api: undefined"。
 *
 * OpenAI 兼容端点的协议降级：
 * - 只要 baseUrl 被显式覆盖（非空且非默认），即视为第三方 OpenAI 兼容端点
 * - 强制 supportsDeveloperRole=false，避免原 provider 的 reasoning 模型用 developer
 *   role 发 systemPrompt 导致第三方端点返回 400（商汤等不兼容 developer role）
 * - 这让用户配商汤 Token Plan 时只需：provider=deepseek + model=deepseek-v4-flash
 *   + baseUrl=https://token.sensenova.cn/v1 + apiKey=商汤token
 *
 * 该函数被 pi-runtime 与 agent-factory 共用，保证两条 LLM 入口的 base URL 一致。
 *
 * @param provider - LLM provider；可为 SDK 内置 KnownProvider 或自定义字符串
 * @param modelId - 模型 id，如 'deepseek-v4-flash'
 * @param baseUrl - 可选 base URL 覆盖，优先级高于环境变量
 * @returns 最终生效的 Model 实例，baseUrl 可能被覆盖
 * @author fxbin
 */
export function resolveConfiguredModel(provider: string, modelId: string, baseUrl?: string): Model<Api> {
  const knownProvider = isKnownPiProvider(provider) ? provider : null;
  let baseModel: Model<Api> | undefined;
  if (knownProvider) {
    baseModel = getModel(knownProvider, modelId as never) as Model<Api> | undefined;
  } else {
    for (const candidate of getKnownPiProviders()) {
      const candidateModel = getModel(candidate, modelId as never) as Model<Api> | undefined;
      if (candidateModel) {
        baseModel = candidateModel;
        break;
      }
    }
  }
  if (!baseModel) {
    throw new Error(`未找到 model id "${modelId}" 在任何已知 provider 下的注册记录。请检查 Settings → Model Provider 的 model 配置。`);
  }
  const effectiveBaseUrl = baseUrl && baseUrl.trim().length > 0
    ? baseUrl.trim()
    : process.env[PI_BASE_URL_ENV];
  if (!effectiveBaseUrl || effectiveBaseUrl.trim().length === 0) {
    return baseModel;
  }
  const overriddenCompat = { ...baseModel.compat, supportsDeveloperRole: false };
  return { ...baseModel, baseUrl: effectiveBaseUrl.trim(), compat: overriddenCompat };
}
