/**
 * @module views/SettingsView
 * 设置视图：配置多模型 Profile、系统透明度、数据控制。
 * @author fxbin
 */

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Cpu,
  Database,
  Download,
  KeyRound,
  PlugZap,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
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
 * 设置视图组件：多 Profile 管理 + 系统透明度 + 数据控制 + 微信读书
 *
 * @param {object} props - 组件属性
 * @param {string|null} props.initialSection - 初始激活的设置分区
 * @param {() => void} props.onSectionConsumed - 初始分区消费后的回调
 * @param {string} props.browserAiStatus - 浏览器内置 AI 模型状态（checking/ready/need_download/no_api/no_model）
 * @returns {JSX.Element} 设置视图
 * @author fxbin
 */
export default function SettingsView({ initialSection = null, onSectionConsumed, browserAiStatus = 'checking' }) {
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
  const [wereadApiKey, setWereadApiKey] = useState('');
  const [wereadConfigured, setWereadConfigured] = useState(false);
  const [wereadSaving, setWereadSaving] = useState(false);
  const [wereadTesting, setWereadTesting] = useState(false);
  const [wereadTestResult, setWereadTestResult] = useState(null);
  const [profileToDelete, setProfileToDelete] = useState(null);

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
    async function loadWeReadSettings() {
      try {
        const response = await fetch('/api/weread/settings');
        if (!response.ok) throw new Error('WeRead settings unavailable.');
        const result = await response.json();
        if (ignore) return;
        setWereadConfigured(result.configured);
      } catch {
        if (!ignore) setWereadConfigured(false);
      }
    }
    loadWeReadSettings();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
      if (onSectionConsumed) {
        onSectionConsumed();
      }
    }
  }, [initialSection, onSectionConsumed]);

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
          workspaces: result.workspaces?.length ?? 0,
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
   * 打开删除 Profile 确认弹窗
   * @param {string} id - profile id
   */
  function requestDeleteProfile(id) {
    const target = profiles.find((item) => item.id === id);
    if (!target) return;
    setProfileToDelete(id);
  }

  /**
   * 确认删除当前待删除的 Profile
   */
  async function confirmDeleteProfile() {
    if (!profileToDelete) return;
    const id = profileToDelete;
    const target = profiles.find((item) => item.id === id);
    setProfileToDelete(null);
    if (!target) return;
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
   * 保存微信读书 API Key
   */
  async function saveWeReadKey() {
    const value = wereadApiKey.trim();
    if (!value || wereadSaving) return;
    setWereadSaving(true);
    setWereadTestResult(null);
    try {
      const response = await fetch('/api/weread/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: value }),
      });
      if (!response.ok) throw new Error('Save failed.');
      setWereadConfigured(true);
      setWereadApiKey('');
      setStatus(t('settings.weread.saveSuccess'));
    } catch {
      setStatus(t('settings.weread.saveFailed'));
    } finally {
      setWereadSaving(false);
    }
  }

  /**
   * 测试微信读书 API Key 连接
   */
  async function testWeReadKey() {
    if (wereadTesting) return;
    setWereadTesting(true);
    setWereadTestResult(null);
    try {
      const response = await fetch('/api/weread/settings/test', { method: 'POST' });
      if (!response.ok) throw new Error('Test failed.');
      const result = await response.json();
      setWereadTestResult(result);
      setStatus(result.ok ? t('settings.weread.testSuccess') : t('settings.weread.testFailed'));
    } catch {
      setWereadTestResult({ ok: false, error: t('settings.weread.testFailed') });
      setStatus(t('settings.weread.testFailed'));
    } finally {
      setWereadTesting(false);
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
    { key: 'weread', label: t('settings.weread.title'), icon: BookOpen },
    { key: 'transparency', label: t('settings.systemTransparency'), icon: BarChart3 },
    { key: 'dataControls', label: t('settings.dataControls'), icon: Database },
    { key: 'kits', label: t('kit.title'), icon: Sparkles },
  ];

  /**
   * 渲染右侧上下文相关的状态摘要
   * @returns {JSX.Element} 状态摘要面板
   */
  function renderStatusSidebar() {
    if (activeSection === 'profiles') {
      return (
        <>
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
          <div className={`status-card browser-ai-card browser-ai-card--${browserAiStatus}`}>
            <Cpu size={25} />
            <div>
              <span>{t('settings.browserAi.title')}</span>
              <strong>
                {browserAiStatus === 'ready' && t('settings.browserAi.ready')}
                {browserAiStatus === 'need_download' && t('settings.browserAi.needDownload')}
                {browserAiStatus === 'checking' && t('settings.browserAi.checking')}
                {(browserAiStatus === 'no_api' || browserAiStatus === 'no_model') && t('settings.browserAi.unavailable')}
              </strong>
              <p>
                {browserAiStatus === 'ready' && t('settings.browserAi.readyHint')}
                {browserAiStatus === 'need_download' && t('settings.browserAi.needDownloadHint')}
                {browserAiStatus === 'checking' && t('settings.browserAi.checkingHint')}
                {(browserAiStatus === 'no_api' || browserAiStatus === 'no_model') && t('settings.browserAi.unavailableHint')}
              </p>
            </div>
          </div>
        </>
      );
    }

    if (activeSection === 'weread') {
      return (
        <>
          <div className="status-card">
            <BookOpen size={25} />
            <div>
              <span>{t('settings.weread.title')}</span>
              <strong>{wereadConfigured ? t('settings.weread.configured') : t('settings.weread.notConfigured')}</strong>
              <p>{t('settings.weread.hint')}</p>
            </div>
          </div>
          {wereadTestResult && (
            <div className={`test-result ${wereadTestResult.ok ? 'ok' : 'failed'}`}>
              <strong>{wereadTestResult.ok ? t('settings.testPassed') : t('settings.testNotPassed')}</strong>
              {wereadTestResult.error && <p>{wereadTestResult.error}</p>}
            </div>
          )}
          <p className="settings-note">{status}</p>
        </>
      );
    }

    if (activeSection === 'transparency') {
      return (
        <>
          <div className="status-card">
            <BarChart3 size={25} />
            <div>
              <span>{t('settings.systemTransparency')}</span>
              <strong>{systemStats?.apiOnline ? t('settings.online') : t('settings.offline')}</strong>
              <p>{t('settings.transparencyHint')}</p>
            </div>
          </div>
          {systemStats && (
            <div className="status-card">
              <Database size={25} />
              <div>
                <span>{t('settings.dataScale')}</span>
                <strong>{t('settings.dataScaleCount', { kb: systemStats.workspaces, materials: systemStats.materials })}</strong>
                <p>{t('settings.tasksRecorded', { count: systemStats.tasks })}</p>
              </div>
            </div>
          )}
          <p className="settings-note">{status}</p>
        </>
      );
    }

    if (activeSection === 'kits') {
      return (
        <>
          <div className="status-card">
            <Sparkles size={25} />
            <div>
              <span>{t('kit.title')}</span>
              <strong>{t('kit.subtitle')}</strong>
              <p>{t('kit.selectWorkspaceHint')}</p>
            </div>
          </div>
          <p className="settings-note">{status}</p>
        </>
      );
    }

    return (
      <>
        <div className="status-card">
          <Database size={25} />
          <div>
            <span>{t('settings.dataSafety')}</span>
            <strong>{t('settings.dataControls')}</strong>
            <p>{t('settings.dataSafetyHint')}</p>
          </div>
        </div>
        <p className="settings-note">{status}</p>
      </>
    );
  }

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

            {showCreateForm ? (
              <div className="settings-create-form">
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
            ) : (
              <div className="settings-profile-layout">
                <div className="settings-profile-list-panel">
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
                            <Star size={20} fill={profile.isDefault ? 'currentColor' : 'none'} />
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
                            <button type="button" className="danger" onClick={() => requestDeleteProfile(profile.id)}>
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="settings-profile-form-panel">
                  {selectedProfile ? (
                    <>
                      <div className="settings-form-section">
                        <strong>{t('settings.basicInfo')}</strong>
                        <label className="field-row">
                          <span>{t('settings.profileName')}</span>
                          <input
                            autoComplete="off"
                            type="text"
                            value={profileName}
                            onChange={(event) => setProfileName(event.target.value)}
                          />
                        </label>
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
                      </div>

                      <div className="settings-form-section">
                        <strong>{t('settings.authentication')}</strong>
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
                      </div>

                      <div className="settings-form-section">
                        <strong>{t('settings.policyGroup')}</strong>
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
                  ) : (
                    <p className="settings-note">{t('settings.noProfileSelected')}</p>
                  )}
                </div>
              </div>
            )}

            {profileToDelete && (
              <div
                className="modal-overlay"
                role="dialog"
                aria-modal="true"
                onClick={(event) => {
                  if (event.target === event.currentTarget) {
                    setProfileToDelete(null);
                  }
                }}
              >
                <div className="modal-card">
                  <div className="modal-head">
                    <AlertTriangle size={24} />
                    <h3>{t('settings.deleteProfileTitle')}</h3>
                  </div>
                  <div className="modal-body">
                    <p>{t('settings.deleteProfileConfirm')}</p>
                    <div className="modal-actions">
                      <button type="button" onClick={() => setProfileToDelete(null)}>{t('common.cancel')}</button>
                      <button type="button" className="danger" onClick={confirmDeleteProfile}>
                        <Trash2 size={16} />
                        {t('common.delete')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {activeSection === 'weread' && (
          <section className="settings-panel">
            <div className="settings-panel-head">
              <BookOpen size={24} />
              <div>
                <h3>{t('settings.weread.title')}</h3>
                <p>{t('settings.weread.desc')}</p>
              </div>
            </div>
            <div className="settings-form-section">
              <strong>{t('settings.weread.apiKey')}</strong>
              <label className="field-row">
                <span>{t('settings.weread.apiKeyLabel')}</span>
                <div className="secret-input">
                  <KeyRound size={18} />
                  <input
                    autoComplete="off"
                    placeholder={wereadConfigured ? t('settings.weread.apiKeyPlaceholder.configured') : t('settings.weread.apiKeyPlaceholder.empty')}
                    type="password"
                    value={wereadApiKey}
                    onChange={(event) => setWereadApiKey(event.target.value)}
                  />
                </div>
              </label>
              <p className="settings-note">{t('settings.weread.apiKeyHint')}</p>
            </div>
            <div className="settings-actions settings-actions-primary">
              <button disabled={wereadSaving || !wereadApiKey.trim()} onClick={saveWeReadKey} type="button">
                {wereadSaving ? t('common.saving') : t('common.save')}
              </button>
              <button disabled={wereadTesting || !wereadConfigured} onClick={testWeReadKey} type="button">
                {wereadTesting ? t('settings.testingConnection') : t('settings.test')}
              </button>
            </div>
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
                    <strong>{t('settings.dataScaleCount', { kb: systemStats.workspaces, materials: systemStats.materials })}</strong>
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

        {activeSection === 'kits' && (
          <section className="settings-panel">
            <div className="settings-panel-head">
              <Sparkles size={24} />
              <div>
                <h3>{t('kit.title')}</h3>
                <p>{t('kit.subtitle')}</p>
              </div>
            </div>
            <div className="settings-actions settings-actions-primary">
              <button
                disabled={!setView}
                onClick={() => setView && setView('kits')}
                type="button"
              >
                <Sparkles size={16} />
                {t('kit.runKit')}
              </button>
            </div>
          </section>
        )}

        <aside className="settings-status">
          {renderStatusSidebar()}
        </aside>
      </div>
    </section>
  );
}
