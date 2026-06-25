/**
 * 设置视图 · Profile 域状态 Hook。
 * 统一管理模型 Profile 列表、激活/选中 ID、服务商选项、表单字段、
 * 保存/测试状态、测试结果、新建表单开关与字段、待删除 Profile 等状态，
 * 并提供 V2 设置加载、Profile 增删改、激活、测试、清 Key、表单同步等业务函数。
 * 视图层通过 setStatus 共享跨域状态文案，故作为入参注入。
 * @module hooks/useSettingsProfile
 * @author fxbin
 */

import { useEffect, useState } from 'react';
import api from '../utils/api';

/**
 * V2 设置接口路径。
 */
const V2_SETTINGS_PATH = '/api/settings/model-provider/v2';

/**
 * Profile 集合接口路径前缀。
 */
const PROFILES_PATH = '/api/settings/model-provider/profiles';

/**
 * 模型测试接口路径。
 */
const TEST_PATH = '/api/settings/model-provider/test';

/**
 * Key 来源标签的 i18n key 映射。
 */
const KEY_SOURCE_KEYS = {
  none: 'settings.keyNotConfigured',
  env: 'common.envVar',
  runtime: 'common.runtime',
};

/**
 * 新建 Profile 表单的空值。
 */
const EMPTY_PROFILE_FORM = {
  name: '',
  provider: '',
  model: '',
  apiKey: '',
};

/**
 * Key 来源默认值：未配置。
 */
const INITIAL_KEY_SOURCE = 'none';

/**
 * 默认启用真实模型。
 */
const INITIAL_ENABLED = true;

/**
 * 默认启用失败回退到 Mock。
 */
const INITIAL_FALLBACK_TO_MOCK = true;

/**
 * 未配置 API Key 的初始态。
 */
const INITIAL_HAS_API_KEY = false;

/**
 * 初始未选中任何 Profile。
 */
const INITIAL_SELECTED_PROFILE_ID = null;

/**
 * 初始未激活任何 Profile。
 */
const INITIAL_ACTIVE_PROFILE_ID = null;

/**
 * 初始 Profile 列表为空数组。
 */
const INITIAL_PROFILES = [];

/**
 * 初始服务商选项为空数组。
 */
const INITIAL_PROVIDER_OPTIONS = [];

/**
 * 初始未在保存中。
 */
const INITIAL_IS_SAVING = false;

/**
 * 初始未在测试中。
 */
const INITIAL_IS_TESTING = false;

/**
 * 初始未产生测试结果。
 */
const INITIAL_TEST_RESULT = null;

/**
 * 初始不显示新建表单。
 */
const INITIAL_SHOW_CREATE_FORM = false;

/**
 * 初始无待删除 Profile。
 */
const INITIAL_PROFILE_TO_DELETE = null;

/**
 * 初始未拉取到更新时间。
 */
const INITIAL_UPDATED_AT = null;

/**
 * 表单字段初始空字符串。
 */
const INITIAL_FORM_TEXT = '';

/**
 * 将 ID 格式化为可读名称（deepseek-v3 → Deepseek V3）。
 * @param {string} id - 原始 ID
 * @returns {string} 格式化后的名称
 * @author fxbin
 */
function formatDisplayName(id) {
  if (!id) return '';
  return id
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * 使用 Profile 域状态。
 * @param {object} params - 入参对象
 * @param {function} params.setStatus - 跨域状态文案更新函数（由视图层维护并注入）
 * @param {function} params.t - i18n 翻译函数
 * @returns {object} Profile 域 state、setter、派生量与业务函数
 * @author fxbin
 */
export function useSettingsProfile({ setStatus, t }) {
  const [profiles, setProfiles] = useState(INITIAL_PROFILES);
  const [activeProfileId, setActiveProfileId] = useState(INITIAL_ACTIVE_PROFILE_ID);
  const [selectedProfileId, setSelectedProfileId] = useState(INITIAL_SELECTED_PROFILE_ID);
  const [providerOptions, setProviderOptions] = useState(INITIAL_PROVIDER_OPTIONS);
  const [profileName, setProfileName] = useState(INITIAL_FORM_TEXT);
  const [provider, setProvider] = useState(INITIAL_FORM_TEXT);
  const [model, setModel] = useState(INITIAL_FORM_TEXT);
  const [apiKey, setApiKey] = useState(INITIAL_FORM_TEXT);
  const [enabled, setEnabled] = useState(INITIAL_ENABLED);
  const [fallbackToMock, setFallbackToMock] = useState(INITIAL_FALLBACK_TO_MOCK);
  const [hasApiKey, setHasApiKey] = useState(INITIAL_HAS_API_KEY);
  const [keySource, setKeySource] = useState(INITIAL_KEY_SOURCE);
  const [updatedAt, setUpdatedAt] = useState(INITIAL_UPDATED_AT);
  const [isSaving, setIsSaving] = useState(INITIAL_IS_SAVING);
  const [isTesting, setIsTesting] = useState(INITIAL_IS_TESTING);
  const [testResult, setTestResult] = useState(INITIAL_TEST_RESULT);
  const [showCreateForm, setShowCreateForm] = useState(INITIAL_SHOW_CREATE_FORM);
  const [newProfile, setNewProfile] = useState(EMPTY_PROFILE_FORM);
  const [profileToDelete, setProfileToDelete] = useState(INITIAL_PROFILE_TO_DELETE);

  const activeProvider = providerOptions.find((item) => item.id === provider);
  const modelOptions = activeProvider?.models ?? [];
  const selectedProfile = profiles.find((item) => item.id === selectedProfileId);

  useEffect(() => {
    let ignore = false;
    async function loadSettings() {
      try {
        const result = await api.get(V2_SETTINGS_PATH);
        if (ignore) return;
        applyV2Settings(result);
        setStatus(t('settings.modelSettingsReady'));
      } catch {
        if (!ignore) setStatus(t('settings.modelSettingsOffline'));
      }
    }
    loadSettings();
    return () => {
      ignore = true;
    };
  }, []);

  /**
   * 应用 V2 设置到本地 state。
   * @param {object} v2Result - V2 API 返回的设置
   * @param {string|null} forceSelectId - 强制选中的 profile id
   * @author fxbin
   */
  function applyV2Settings(v2Result, forceSelectId = null) {
    const list = v2Result.profiles ?? [];
    setProfiles(list);
    setActiveProfileId(v2Result.activeProfileId ?? null);
    setProviderOptions(v2Result.providers ?? []);
    const selectedExists = Boolean(selectedProfileId) && list.some((item) => item.id === selectedProfileId);
    const fallbackId = (selectedExists ? selectedProfileId : null)
      ?? v2Result.activeProfileId
      ?? list[0]?.id
      ?? null;
    const targetId = forceSelectId ?? fallbackId;
    setSelectedProfileId(targetId);
    syncFormFromProfiles(list, targetId);
  }

  /**
   * 从 profile 列表同步表单字段到 state。
   * @param {Array} list - profile 列表
   * @param {string|null} targetId - 目标 profile id
   * @author fxbin
   */
  function syncFormFromProfiles(list, targetId) {
    const target = list.find((item) => item.id === targetId);
    if (!target) {
      setProfileName(INITIAL_FORM_TEXT);
      setProvider(INITIAL_FORM_TEXT);
      setModel(INITIAL_FORM_TEXT);
      setEnabled(INITIAL_ENABLED);
      setFallbackToMock(INITIAL_FALLBACK_TO_MOCK);
      setHasApiKey(INITIAL_HAS_API_KEY);
      setKeySource(INITIAL_KEY_SOURCE);
      setUpdatedAt(INITIAL_UPDATED_AT);
      setApiKey(INITIAL_FORM_TEXT);
      return;
    }
    setProfileName(target.name);
    setProvider(target.provider);
    setModel(target.model);
    setEnabled(target.enabled);
    setFallbackToMock(target.fallbackToMock);
    setHasApiKey(target.hasApiKey);
    setKeySource(target.keySource);
    setUpdatedAt(target.updatedAt);
    setApiKey(INITIAL_FORM_TEXT);
  }

  /**
   * 选中指定 profile（仅切换选中，不激活）。
   * @param {string} id - profile id
   * @author fxbin
   */
  function selectProfile(id) {
    if (id === selectedProfileId) return;
    setSelectedProfileId(id);
    syncFormFromProfiles(profiles, id);
    setTestResult(INITIAL_TEST_RESULT);
  }

  /**
   * 切换服务商，并自动选择第一个模型。
   * @param {string} nextProvider - 服务商 id
   * @author fxbin
   */
  function changeProvider(nextProvider) {
    setProvider(nextProvider);
    const nextModels = providerOptions.find((item) => item.id === nextProvider)?.models ?? [];
    setModel(nextModels[0]?.id ?? INITIAL_FORM_TEXT);
  }

  /**
   * 刷新 profile 列表（从后端重新拉取 V2 设置）。
   * @param {string|null} forceSelectId - 强制选中的 profile id
   * @returns {Promise<object|null>} V2 设置结果
   * @author fxbin
   */
  async function refreshProfiles(forceSelectId = null) {
    try {
      const result = await api.get(V2_SETTINGS_PATH);
      applyV2Settings(result, forceSelectId);
      return result;
    } catch {
      setStatus(t('settings.refreshProfilesFailed'));
      return null;
    }
  }

  /**
   * 激活指定 profile（设为默认，应用到运行时）。
   * @param {string} id - profile id
   * @author fxbin
   */
  async function activateProfile(id) {
    setStatus(t('settings.activatingProfile'));
    try {
      const result = await api.post(`${PROFILES_PATH}/${id}/activate`);
      setStatus(`${t('settings.profileActivated')}：${result.profile.name}`);
      await refreshProfiles();
    } catch {
      setStatus(t('settings.activationFailed'));
    }
  }

  /**
   * 打开删除 Profile 确认弹窗。
   * @param {string} id - profile id
   * @author fxbin
   */
  function requestDeleteProfile(id) {
    const target = profiles.find((item) => item.id === id);
    if (!target) return;
    setProfileToDelete(id);
  }

  /**
   * 确认删除当前待删除的 Profile。
   * @author fxbin
   */
  async function confirmDeleteProfile() {
    if (!profileToDelete) return;
    const id = profileToDelete;
    const target = profiles.find((item) => item.id === id);
    setProfileToDelete(INITIAL_PROFILE_TO_DELETE);
    if (!target) return;
    setStatus(t('settings.deletingProfile'));
    try {
      await api.del(`${PROFILES_PATH}/${id}`);
      const remaining = profiles.filter((item) => item.id !== id);
      const nextSelected = selectedProfileId === id ? (remaining[0]?.id ?? null) : selectedProfileId;
      setStatus(`${t('settings.profileDeleted')}：${target.name}`);
      await refreshProfiles(nextSelected);
    } catch {
      setStatus(t('settings.deleteFailed'));
    }
  }

  /**
   * 保存当前选中 profile 的配置。
   * @author fxbin
   */
  async function saveProfile() {
    if (!selectedProfileId || !provider || !model || isSaving) return;
    setIsSaving(true);
    setTestResult(INITIAL_TEST_RESULT);
    try {
      const result = await api.patch(`${PROFILES_PATH}/${selectedProfileId}`, {
        name: profileName.trim(),
        provider,
        model,
        apiKey: apiKey.trim() || undefined,
        enabled,
        fallbackToMock,
      });
      const updated = result.profile;
      setProfiles((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setHasApiKey(updated.hasApiKey);
      setKeySource(updated.keySource);
      setUpdatedAt(updated.updatedAt);
      setApiKey(INITIAL_FORM_TEXT);
      setStatus(t('settings.saveSuccess'));
    } catch {
      setStatus(t('settings.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * 测试当前选中 profile 的模型配置。
   * @author fxbin
   */
  async function testSettings() {
    if (!provider || !model || isTesting) return;
    setIsTesting(true);
    setTestResult(INITIAL_TEST_RESULT);
    try {
      const result = await api.post(TEST_PATH, {
        provider,
        model,
        apiKey: apiKey.trim() || undefined,
      });
      setTestResult(result);
      setStatus(result.ok ? t('settings.testPass') : t('settings.testFail'));
    } catch {
      setStatus(t('settings.testFailed'));
    } finally {
      setIsTesting(false);
    }
  }

  /**
   * 清除当前选中 profile 的运行期 API Key（不影响环境变量 Key）。
   * @author fxbin
   */
  async function clearKey() {
    if (!selectedProfileId || !provider || !model || isSaving) return;
    setIsSaving(true);
    setTestResult(INITIAL_TEST_RESULT);
    try {
      const result = await api.patch(`${PROFILES_PATH}/${selectedProfileId}`, {
        provider,
        model,
        enabled,
        fallbackToMock,
        clearApiKey: true,
      });
      const updated = result.profile;
      setProfiles((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setHasApiKey(updated.hasApiKey);
      setKeySource(updated.keySource);
      setStatus(t('settings.clearKeySuccess'));
    } catch {
      setStatus(t('settings.clearKeyFailed'));
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * 打开创建 Profile 表单，并初始化默认值。
   * @author fxbin
   */
  function openCreateForm() {
    const firstProvider = providerOptions[0]?.id ?? INITIAL_FORM_TEXT;
    const firstModel = providerOptions[0]?.models?.[0]?.id ?? INITIAL_FORM_TEXT;
    setNewProfile({ ...EMPTY_PROFILE_FORM, provider: firstProvider, model: firstModel });
    setShowCreateForm(true);
  }

  /**
   * 切换新建 Profile 表单中的服务商，并自动选择第一个模型。
   * @param {string} nextProvider - 服务商 id
   * @author fxbin
   */
  function changeNewProfileProvider(nextProvider) {
    const nextModels = providerOptions.find((item) => item.id === nextProvider)?.models ?? [];
    setNewProfile((prev) => ({ ...prev, provider: nextProvider, model: nextModels[0]?.id ?? INITIAL_FORM_TEXT }));
  }

  /**
   * 创建新的 Profile。
   * @author fxbin
   */
  async function createProfile() {
    const name = newProfile.name.trim();
    const providerValue = newProfile.provider;
    const modelValue = newProfile.model;
    if (!name || !providerValue || !modelValue) {
      setStatus(t('settings.requiredFields'));
      return;
    }
    setIsSaving(true);
    try {
      const result = await api.post(PROFILES_PATH, {
        name,
        provider: providerValue,
        model: modelValue,
        apiKey: newProfile.apiKey.trim() || undefined,
      });
      setShowCreateForm(false);
      setStatus(`${t('settings.profileCreated')}：${result.profile.name}`);
      await refreshProfiles(result.profile.id);
    } catch {
      setStatus(t('settings.createFailed'));
    } finally {
      setIsSaving(false);
    }
  }

  return {
    profiles,
    activeProfileId,
    selectedProfileId,
    providerOptions,
    profileName,
    setProfileName,
    provider,
    setProvider,
    model,
    setModel,
    apiKey,
    setApiKey,
    enabled,
    setEnabled,
    fallbackToMock,
    setFallbackToMock,
    hasApiKey,
    keySource,
    updatedAt,
    isSaving,
    isTesting,
    testResult,
    showCreateForm,
    setShowCreateForm,
    newProfile,
    setNewProfile,
    profileToDelete,
    setProfileToDelete,
    activeProvider,
    modelOptions,
    selectedProfile,
    selectProfile,
    changeProvider,
    refreshProfiles,
    activateProfile,
    requestDeleteProfile,
    confirmDeleteProfile,
    saveProfile,
    testSettings,
    clearKey,
    openCreateForm,
    changeNewProfileProvider,
    createProfile,
  };
}

export {
  KEY_SOURCE_KEYS,
  EMPTY_PROFILE_FORM,
  formatDisplayName,
};
