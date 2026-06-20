/**
 * @module views/SettingsView
 * 设置视图：配置多模型 Profile、系统透明度、数据控制。
 * @author fxbin
 */

import { useEffect, useState } from 'react';
import {
  BarChart3,
  Database,
  Download,
  KeyRound,
  PlugZap,
  Plus,
  Settings,
  ShieldCheck,
  Star,
  Trash2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTaskStatusLabel, useTaskWorkflowLabel } from '../utils/i18nLabels';
import { formatDateTime } from '../utils/material';

/**
 * 将 ID 格式化为可读名称（deepseek-v3 → Deepseek V3）
 * @param {string} id - 原始 ID
 * @returns {string} 格式化后的名称
 */
function formatDisplayName(id) {
  if (!id) return '';
  return id
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * 后端 API 路径常量
 */
const API_PATHS = {
  v2Settings: '/api/settings/model-provider/v2',
  profiles: '/api/settings/model-provider/profiles',
  test: '/api/settings/model-provider/test',
  dashboard: '/api/dashboard',
};

/**
 * Key 来源标签（在组件内通过 t() 动态获取）
 */
const KEY_SOURCE_KEYS = {
  none: 'settings.keyNotConfigured',
  env: 'common.envVar',
  runtime: 'common.runtime',
};

/**
 * 新建 Profile 表单的空值
 */
const EMPTY_PROFILE_FORM = {
  name: '',
  provider: '',
  model: '',
  apiKey: '',
};

/**
 * Profile 卡片默认样式（复用 .status-card 的 grid 布局，通过 inline style 补充完整边框）
 */
const PROFILE_CARD_STYLE = {
  cursor: 'pointer',
  border: '1px solid var(--line-soft)',
  borderRadius: '10px',
  padding: '16px',
};

/**
 * Profile 卡片选中样式
 */
const PROFILE_CARD_SELECTED_STYLE = {
  cursor: 'pointer',
  border: '1px solid var(--primary)',
  borderRadius: '10px',
  background: 'rgba(216, 227, 251, 0.32)',
  padding: '16px',
};

/**
 * Profile 列表容器样式
 */
const PROFILE_LIST_STYLE = {
  display: 'grid',
  gap: '12px',
};

/**
 * 创建表单容器样式
 */
const CREATE_FORM_STYLE = {
  display: 'grid',
  gap: '16px',
  borderTop: '1px solid var(--line-soft)',
  paddingTop: '18px',
};

/**
 * 设置视图组件：多 Profile 管理 + 系统透明度 + 数据控制
 * @returns {JSX.Element} 设置视图
 * @author fxbin
 */
export default function SettingsView() {
  const { t } = useTranslation();
  const taskStatusLabel = useTaskStatusLabel();
  const taskWorkflowLabel = useTaskWorkflowLabel();
  const [profiles, setProfiles] = useState([]);
  const [activeProfileId, setActiveProfileId] = useState(null);
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [providerOptions, setProviderOptions] = useState([]);
  const [profileName, setProfileName] = useState('');
  const [provider, setProvider] = useState('');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [fallbackToMock, setFallbackToMock] = useState(true);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [keySource, setKeySource] = useState('none');
  const [updatedAt, setUpdatedAt] = useState(null);
  const [status, setStatus] = useState(t('settings.loadingModelSettings'));
  const [systemStats, setSystemStats] = useState(null);
  const [dataAction, setDataAction] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProfile, setNewProfile] = useState(EMPTY_PROFILE_FORM);
  const [activeSection, setActiveSection] = useState('profiles');

  const activeProvider = providerOptions.find((item) => item.id === provider);
  const modelOptions = activeProvider?.models ?? [];
  const selectedProfile = profiles.find((item) => item.id === selectedProfileId);

  useEffect(() => {
    let ignore = false;
    async function loadSettings() {
      try {
        const response = await fetch(API_PATHS.v2Settings);
        if (!response.ok) throw new Error('Settings unavailable.');
        const result = await response.json();
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

  useEffect(() => {
    let ignore = false;
    async function loadSystemStats() {
      try {
        const response = await fetch(API_PATHS.dashboard);
        if (!response.ok) throw new Error('Dashboard unavailable.');
        const result = await response.json();
        if (ignore) return;
        setSystemStats({
          apiOnline: true,
          knowledgeBases: result.knowledgeBases?.length ?? 0,
          materials: result.materials?.length ?? 0,
          tasks: result.tasks?.length ?? 0,
          recentTasks: (result.tasks ?? []).slice(0, 3),
        });
      } catch {
        if (!ignore) setSystemStats({ apiOnline: false });
      }
    }
    loadSystemStats();
    return () => {
      ignore = true;
    };
  }, []);

  /**
   * 应用 V2 设置到本地 state
   * @param {object} v2Result - V2 API 返回的设置
   * @param {string|null} forceSelectId - 强制选中的 profile id
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
   * 从 profile 列表同步表单字段到 state
   * @param {Array} list - profile 列表
   * @param {string|null} targetId - 目标 profile id
   */
  function syncFormFromProfiles(list, targetId) {
    const target = list.find((item) => item.id === targetId);
    if (!target) {
      setProfileName('');
      setProvider('');
      setModel('');
      setEnabled(true);
      setFallbackToMock(true);
      setHasApiKey(false);
      setKeySource('none');
      setUpdatedAt(null);
      setApiKey('');
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
    setApiKey('');
  }

  /**
   * 选中指定 profile（仅切换选中，不激活）
   * @param {string} id - profile id
   */
  function selectProfile(id) {
    if (id === selectedProfileId) return;
    setSelectedProfileId(id);
    syncFormFromProfiles(profiles, id);
    setTestResult(null);
  }

  /**
   * 切换服务商，并自动选择第一个模型
   * @param {string} nextProvider - 服务商 id
   */
  function changeProvider(nextProvider) {
    setProvider(nextProvider);
    const nextModels = providerOptions.find((item) => item.id === nextProvider)?.models ?? [];
    setModel(nextModels[0]?.id ?? '');
  }

  /**
   * 刷新 profile 列表（从后端重新拉取 V2 设置）
   * @param {string|null} forceSelectId - 强制选中的 profile id
   * @returns {Promise<object|null>} V2 设置结果
   */
  async function refreshProfiles(forceSelectId = null) {
    try {
      const response = await fetch(API_PATHS.v2Settings);
      if (!response.ok) throw new Error('Settings unavailable.');
      const result = await response.json();
      applyV2Settings(result, forceSelectId);
      return result;
    } catch {
      setStatus(t('settings.refreshProfilesFailed'));
      return null;
    }
  }

  /**
   * 激活指定 profile（设为默认，应用到运行时）
   * @param {string} id - profile id
   */
  async function activateProfile(id) {
    setStatus(t('settings.activatingProfile'));
    try {
      const response = await fetch(`${API_PATHS.profiles}/${id}/activate`, { method: 'POST' });
      if (!response.ok) throw new Error('Activate failed.');
      const result = await response.json();
      setStatus(`${t('settings.profileActivated')}：${result.profile.name}`);
      await refreshProfiles();
    } catch {
      setStatus(t('settings.activationFailed'));
    }
  }

  /**
   * 删除指定 profile
   * @param {string} id - profile id
   */
  async function deleteProfile(id) {
    const target = profiles.find((item) => item.id === id);
    if (!target) return;
    if (!window.confirm(t('settings.deleteProfileConfirm'))) return;
    setStatus(t('settings.deletingProfile'));
    try {
      const response = await fetch(`${API_PATHS.profiles}/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Delete failed.');
      const remaining = profiles.filter((item) => item.id !== id);
      const nextSelected = selectedProfileId === id ? (remaining[0]?.id ?? null) : selectedProfileId;
      setStatus(`${t('settings.profileDeleted')}：${target.name}`);
      await refreshProfiles(nextSelected);
    } catch {
      setStatus(t('settings.deleteFailed'));
    }
  }

  /**
   * 保存当前选中 profile 的配置
   */
  async function saveProfile() {
    if (!selectedProfileId || !provider || !model || isSaving) return;
    setIsSaving(true);
    setTestResult(null);
    try {
      const response = await fetch(`${API_PATHS.profiles}/${selectedProfileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileName.trim(),
          provider,
          model,
          apiKey: apiKey.trim() || undefined,
          enabled,
          fallbackToMock,
        }),
      });
      if (!response.ok) throw new Error('Save failed.');
      const result = await response.json();
      const updated = result.profile;
      setProfiles((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setHasApiKey(updated.hasApiKey);
      setKeySource(updated.keySource);
      setUpdatedAt(updated.updatedAt);
      setApiKey('');
      setStatus(t('settings.saveSuccess'));
    } catch {
      setStatus(t('settings.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * 测试当前选中 profile 的模型配置
   */
  async function testSettings() {
    if (!provider || !model || isTesting) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const response = await fetch(API_PATHS.test, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          model,
          apiKey: apiKey.trim() || undefined,
        }),
      });
      if (!response.ok) throw new Error('Test failed.');
      const result = await response.json();
      setTestResult(result);
      setStatus(result.ok ? t('settings.testPass') : t('settings.testFail'));
    } catch {
      setStatus(t('settings.testFailed'));
    } finally {
      setIsTesting(false);
    }
  }

  /**
   * 清除当前选中 profile 的运行期 API Key（不影响环境变量 Key）
   */
  async function clearKey() {
    if (!selectedProfileId || !provider || !model || isSaving) return;
    setIsSaving(true);
    setTestResult(null);
    try {
      const response = await fetch(`${API_PATHS.profiles}/${selectedProfileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          model,
          enabled,
          fallbackToMock,
          clearApiKey: true,
        }),
      });
      if (!response.ok) throw new Error('Clear failed.');
      const result = await response.json();
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
   * 打开创建 Profile 表单，并初始化默认值
   */
  function openCreateForm() {
    const firstProvider = providerOptions[0]?.id ?? '';
    const firstModel = providerOptions[0]?.models?.[0]?.id ?? '';
    setNewProfile({ ...EMPTY_PROFILE_FORM, provider: firstProvider, model: firstModel });
    setShowCreateForm(true);
  }

  /**
   * 切换新建 Profile 表单中的服务商，并自动选择第一个模型
   * @param {string} nextProvider - 服务商 id
   */
  function changeNewProfileProvider(nextProvider) {
    const nextModels = providerOptions.find((item) => item.id === nextProvider)?.models ?? [];
    setNewProfile((prev) => ({ ...prev, provider: nextProvider, model: nextModels[0]?.id ?? '' }));
  }

  /**
   * 创建新的 Profile
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
      const response = await fetch(API_PATHS.profiles, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          provider: providerValue,
          model: modelValue,
          apiKey: newProfile.apiKey.trim() || undefined,
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Create failed.');
      }
      const result = await response.json();
      setShowCreateForm(false);
      setStatus(`${t('settings.profileCreated')}：${result.profile.name}`);
      await refreshProfiles(result.profile.id);
    } catch (error) {
      setStatus(t('settings.createFailed'));
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * 导出全部数据为 JSON 文件
   */
  async function exportAllData() {
    setDataAction({ type: 'export', loading: true });
    try {
      const response = await fetch(API_PATHS.dashboard);
      if (!response.ok) throw new Error('Export failed.');
      const result = await response.json();
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `zhijing-backup-${Date.now()}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setDataAction({ type: 'export', loading: false, ok: true });
    } catch {
      setDataAction({ type: 'export', loading: false, ok: false });
    }
  }

  /**
   * 清除本地缓存（localStorage 中 zhijing_ 前缀的项）
   */
  function clearLocalCache() {
    try {
      const keys = Object.keys(localStorage).filter((key) => key.startsWith('zhijing_'));
      keys.forEach((key) => localStorage.removeItem(key));
      setDataAction({ type: 'clear', loading: false, ok: true, count: keys.length });
    } catch {
      setDataAction({ type: 'clear', loading: false, ok: false });
    }
  }

  const SETTINGS_TABS = [
    { key: 'profiles', label: t('settings.profiles'), icon: PlugZap },
    { key: 'transparency', label: t('settings.systemTransparency'), icon: BarChart3 },
    { key: 'dataControls', label: t('settings.dataControls'), icon: Database },
  ];

  return (
    <section className="page-main full settings-page">
      <div className="page-title-row">
        <div>
          <h2>{t('settings.title')}</h2>
          <p>{t('settings.subtitle')}</p>
        </div>
      </div>

      <div className="settings-tabs" role="tablist" aria-label={t('settings.title')}>
        {SETTINGS_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.key;
          return (
            <button
              key={tab.key}
              aria-selected={isActive}
              className={isActive ? 'active' : ''}
              onClick={() => setActiveSection(tab.key)}
              role="tab"
              type="button"
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="settings-grid">
        {activeSection === 'profiles' && (
          <section className="settings-panel">
            <div className="settings-panel-head">
              <PlugZap size={24} />
              <div>
                <h3>{t('settings.profiles')}</h3>
                <p>{t('settings.profilesDesc')}</p>
              </div>
            </div>

            <div className="settings-actions">
              <button type="button" onClick={openCreateForm}>
                <Plus size={16} />
                {t('settings.createProfile')}
              </button>
            </div>

            {profiles.length === 0 ? (
              <p className="settings-note">{t('settings.noProfiles')}</p>
            ) : (
              <div className="settings-profile-list">
                {profiles.map((profile) => (
                  <div
                    key={profile.id}
                    className={`settings-profile-item ${selectedProfileId === profile.id ? 'selected' : ''}`}
                  >
                    <button
                      className="settings-profile-info"
                      onClick={() => selectProfile(profile.id)}
                      type="button"
                    >
                      <Star size={22} fill={profile.isDefault ? 'currentColor' : 'none'} />
                      <div>
                        <strong>
                          {profile.name}
                          {profile.isDefault ? ` · ${t('settings.activated')}` : ''}
                        </strong>
                        <span>{formatDisplayName(profile.provider)} / {formatDisplayName(profile.model)}</span>
                        <small>
                          {profile.hasApiKey
                            ? `${t('settings.keyConfigured')}（${t(KEY_SOURCE_KEYS[profile.keySource])}）`
                            : t('settings.keyNotConfigured')}
                        </small>
                      </div>
                    </button>
                    <div className="settings-profile-actions">
                      {!profile.isDefault && (
                        <button type="button" onClick={() => activateProfile(profile.id)}>
                          {t('settings.activate')}
                        </button>
                      )}
                      <button type="button" className="danger" onClick={() => deleteProfile(profile.id)}>
                        <Trash2 size={16} />
                        {t('common.delete')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showCreateForm && (
              <div style={CREATE_FORM_STYLE}>
                <strong>{t('settings.createProfile')}</strong>
                <label className="field-row">
                  <span>{t('settings.profileName')}</span>
                  <input
                    autoComplete="off"
                    placeholder={t('settings.profileNameExample')}
                    type="text"
                    value={newProfile.name}
                    onChange={(event) => setNewProfile((prev) => ({ ...prev, name: event.target.value }))}
                  />
                </label>
                <label className="field-row">
                  <span>{t('settings.provider')}</span>
                  <select value={newProfile.provider} onChange={(event) => changeNewProfileProvider(event.target.value)}>
                    {providerOptions.map((item) => <option key={item.id} value={item.id}>{formatDisplayName(item.id)}</option>)}
                  </select>
                </label>
                <label className="field-row">
                  <span>{t('settings.model')}</span>
                  <select value={newProfile.model} onChange={(event) => setNewProfile((prev) => ({ ...prev, model: event.target.value }))}>
                    {(providerOptions.find((item) => item.id === newProfile.provider)?.models ?? []).map((item) => <option key={item.id} value={item.id}>{formatDisplayName(item.id)}</option>)}
                  </select>
                </label>
                <label className="field-row">
                  <span>{t('settings.apiKey')}</span>
                  <div className="secret-input">
                    <KeyRound size={18} />
                    <input
                      autoComplete="off"
                      placeholder={t('settings.apiKeyOptional')}
                      type="password"
                      value={newProfile.apiKey}
                      onChange={(event) => setNewProfile((prev) => ({ ...prev, apiKey: event.target.value }))}
                    />
                  </div>
                </label>
                <div className="settings-actions">
                  <button type="button" disabled={isSaving} onClick={createProfile}>
                    {isSaving ? t('common.creating') : t('common.create')}
                  </button>
                  <button type="button" onClick={() => setShowCreateForm(false)}>{t('common.cancel')}</button>
                </div>
              </div>
            )}

            {selectedProfile && !showCreateForm && (
              <>
                <div className="settings-toggles">
                  <label className="field-row">
                    <span>{t('settings.profileName')}</span>
                    <input
                      autoComplete="off"
                      type="text"
                      value={profileName}
                      onChange={(event) => setProfileName(event.target.value)}
                    />
                  </label>
                </div>

                <label className="field-row">
                  <span>{t('settings.provider')}</span>
                  <select value={provider} onChange={(event) => changeProvider(event.target.value)}>
                    {providerOptions.map((item) => <option key={item.id} value={item.id}>{formatDisplayName(item.id)}</option>)}
                  </select>
                </label>

                <label className="field-row">
                  <span>{t('settings.model')}</span>
                  <select value={model} onChange={(event) => setModel(event.target.value)}>
                    {modelOptions.map((item) => <option key={item.id} value={item.id}>{formatDisplayName(item.id)}</option>)}
                  </select>
                </label>

                <label className="field-row">
                  <span>{t('settings.apiKey')}</span>
                  <div className="secret-input">
                    <KeyRound size={18} />
                    <input
                      autoComplete="off"
                      placeholder={hasApiKey ? t('settings.apiKeyPlaceholder.configured') : t('settings.apiKeyPlaceholder.empty')}
                      type="password"
                      value={apiKey}
                      onChange={(event) => setApiKey(event.target.value)}
                    />
                  </div>
                </label>

                <div className="settings-toggles">
                  <label>
                    <input checked={enabled} onChange={(event) => setEnabled(event.target.checked)} type="checkbox" />
                    {t('settings.enableRealModel')}
                  </label>
                  <label>
                    <input checked={fallbackToMock} onChange={(event) => setFallbackToMock(event.target.checked)} type="checkbox" />
                    {t('settings.fallbackToMock')}
                  </label>
                </div>

                <div className="settings-actions settings-actions-primary">
                  <button disabled={isSaving || !provider || !model} onClick={saveProfile} type="button">
                    {isSaving ? t('common.saving') : t('common.save')}
                  </button>
                  <button disabled={isTesting || !provider || !model} onClick={testSettings} type="button">
                    {isTesting ? t('settings.testingConnection') : t('settings.test')}
                  </button>
                </div>
                <div className="settings-actions settings-actions-danger">
                  <button disabled={isSaving || !hasApiKey} onClick={clearKey} type="button">
                    {t('settings.clearRuntimeKey')}
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        {activeSection === 'transparency' && (
          <section className="settings-panel">
            <div className="settings-panel-head">
              <BarChart3 size={24} />
              <div>
                <h3>{t('settings.systemTransparency')}</h3>
                <p>{t('settings.systemTransparency.desc')}</p>
              </div>
            </div>
            {systemStats ? (
              <div className="settings-transparency">
                <div className="status-card">
                  <Database size={22} />
                  <div>
                    <span>{t('settings.apiStatus')}</span>
                    <strong>{systemStats.apiOnline ? t('settings.online') : t('settings.offline')}</strong>
                    <p>{systemStats.apiOnline ? t('settings.apiOnline') : t('settings.apiOffline')}</p>
                  </div>
                </div>
                <div className="status-card">
                  <ShieldCheck size={22} />
                  <div>
                    <span>{t('settings.dataScale')}</span>
                    <strong>{t('settings.dataScaleCount', { kb: systemStats.knowledgeBases, materials: systemStats.materials })}</strong>
                    <p>{t('settings.tasksRecorded', { count: systemStats.tasks })}</p>
                  </div>
                </div>
                {systemStats.recentTasks?.length > 0 && (
                  <div className="settings-recent-tasks">
                    <strong>{t('settings.recentTasks')}</strong>
                    {systemStats.recentTasks.map((task) => (
                      <div key={task.id} className="settings-task-row">
                        <span>{taskWorkflowLabel(task.workflow)}</span>
                        <span>{taskStatusLabel(task.status)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="settings-note">{t('settings.loadingSystem')}</p>
            )}
          </section>
        )}

        {activeSection === 'dataControls' && (
          <section className="settings-panel">
            <div className="settings-panel-head">
              <Database size={24} />
              <div>
                <h3>{t('settings.dataControls')}</h3>
                <p>{t('settings.dataControls.desc')}</p>
              </div>
            </div>
            <div className="settings-actions">
              <button
                type="button"
                disabled={dataAction?.type === 'export' && dataAction?.loading}
                onClick={exportAllData}
              >
                <Download size={16} />
                {dataAction?.type === 'export' && dataAction?.loading ? t('settings.exporting') : t('settings.exportAll')}
              </button>
              <button
                type="button"
                className="danger"
                onClick={clearLocalCache}
              >
                <Trash2 size={16} />
                {t('settings.clearLocalCache')}
              </button>
            </div>
            {dataAction?.type === 'export' && dataAction?.ok && (
              <p className="settings-note">{t('settings.exportSuccess')}</p>
            )}
            {dataAction?.type === 'export' && dataAction?.ok === false && (
              <p className="settings-note">{t('settings.exportFailed')}</p>
            )}
            {dataAction?.type === 'clear' && dataAction?.ok && (
              <p className="settings-note">{t('settings.clearSuccess')} {dataAction.count} {t('settings.items')}</p>
            )}
            {dataAction?.type === 'clear' && dataAction?.ok === false && (
              <p className="settings-note">{t('settings.clearFailed')}</p>
            )}
          </section>
        )}

        <aside className="settings-status">
          <div className="status-card">
            <ShieldCheck size={25} />
            <div>
              <span>{t('settings.currentRuntime')}</span>
              <strong>{formatDisplayName(provider) || t('settings.provider')} / {formatDisplayName(model) || t('settings.model')}</strong>
              {hasApiKey ? (
                <p>{t('settings.keyConfigured')} ({t(KEY_SOURCE_KEYS[keySource])})</p>
              ) : (
                <p>{t('settings.keyNotConfigured')}</p>
              )}
              {updatedAt && <small>{t('settings.lastSaved')}: {formatDateTime(updatedAt)}</small>}
            </div>
          </div>
          <div className="status-card">
            <Settings size={25} />
            <div>
              <span>{t('settings.policy')}</span>
              <strong>{enabled ? t('settings.realModelFirst') : t('settings.mockOnly')}</strong>
              <p>{fallbackToMock ? t('settings.fallbackHint') : t('settings.noFallbackHint')}</p>
            </div>
          </div>
          <p className="settings-note">{status}</p>
          {testResult && (
            <div className={`test-result ${testResult.ok ? 'ok' : 'failed'}`}>
              <strong>{testResult.ok ? t('settings.testPassed') : t('settings.testNotPassed')}</strong>
              <p>{testResult.message}</p>
              {testResult.sampleTitle && <small>{t('settings.returnedCard')}{testResult.sampleTitle}</small>}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
