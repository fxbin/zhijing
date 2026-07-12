/**
 * 模型 Provider 配置类型。
 *
 * 包含单配置与多 profile 两种模式的设置结构、请求与测试结果。
 * 用于 apps/api 的模型 Provider 配置端点与 apps/web 的设置页面。
 *
 * @author fxbin
 */

export interface ModelProviderModel {
  id: string;
}

export interface ModelProviderOption {
  id: string;
  models: ModelProviderModel[];
}

export interface ModelProviderSettings {
  provider: string;
  model: string;
  baseUrl?: string;
  enabled: boolean;
  fallbackToMock: boolean;
  hasApiKey: boolean;
  keySource: 'none' | 'env' | 'runtime';
  updatedAt?: string;
  providers: ModelProviderOption[];
}

export interface SaveModelProviderSettingsRequest {
  provider: string;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  enabled?: boolean;
  fallbackToMock?: boolean;
  clearApiKey?: boolean;
  clearBaseUrl?: boolean;
}

/**
 * 模型 Provider Profile（多配置档案）
 * 用于支持配置多个模型 profile，可在研究、创作等场景间切换激活。
 * @author fxbin
 */
export interface ModelProviderProfile {
  id: string;
  name: string;
  provider: string;
  model: string;
  baseUrl?: string;
  enabled: boolean;
  fallbackToMock: boolean;
  hasApiKey: boolean;
  keySource: 'none' | 'env' | 'runtime';
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * 模型 Provider 设置 V2（多 profile 聚合视图）
 * @author fxbin
 */
export interface ModelProviderSettingsV2 {
  profiles: ModelProviderProfile[];
  activeProfileId: string | null;
  providers: ModelProviderOption[];
}

/**
 * 创建模型 Provider Profile 请求
 * @author fxbin
 */
export interface CreateModelProviderProfileRequest {
  name: string;
  provider: string;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  enabled?: boolean;
  fallbackToMock?: boolean;
  isDefault?: boolean;
}

/**
 * 更新模型 Provider Profile 请求
 * @author fxbin
 */
export interface UpdateModelProviderProfileRequest {
  name?: string;
  provider?: string;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  enabled?: boolean;
  fallbackToMock?: boolean;
  isDefault?: boolean;
  clearApiKey?: boolean;
  clearBaseUrl?: boolean;
}

export interface TestModelProviderSettingsRequest {
  profileId?: string;
  provider?: string;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
}

export interface ModelProviderTestResult {
  ok: boolean;
  provider: string;
  model: string;
  message: string;
  sampleTitle?: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    costUsd?: number;
  };
}
