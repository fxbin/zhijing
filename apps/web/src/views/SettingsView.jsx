/**
 * @module views/SettingsView
 * 设置视图：配置多模型 Profile、系统透明度、数据控制。
 * 状态层已下沉至 useSettingsProfile / useSettingsWeread / useSettingsStats 三个 hook，
 * 本视图仅保留跨域共享的 status 文案与 activeSection 路由两个 UI state。
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
  FolderOpen,
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
import AgentUsageDashboard from '../components/AgentUsageDashboard';
import {
  useSettingsProfile,
  KEY_SOURCE_KEYS,
  formatDisplayName,
} from '../hooks/useSettingsProfile';
import { useSettingsWeread } from '../hooks/useSettingsWeread';
import {
  useSettingsStats,
  DATA_ACTION_TYPE_EXPORT,
  DATA_ACTION_TYPE_CLEAR,
  DATA_ACTION_TYPE_REVEAL,
} from '../hooks/useSettingsStats';
import { useMinimalMode } from '../hooks/useMinimalMode';
import { useDataPortability } from '../hooks/useDataPortability';
import { useReaderMode } from '../hooks/useReaderMode';

/**
 * 设置分区默认激活 profiles。
 */
const INITIAL_ACTIVE_SECTION = 'profiles';

/**
 * 设置视图组件：多 Profile 管理 + 系统透明度 + 数据控制 + 微信读书。
 *
 * @param {object} props - 组件属性
 * @param {string|null} props.initialSection - 初始激活的设置分区
 * @param {() => void} props.onSectionConsumed - 初始分区消费后的回调
 * @param {string} props.browserAiStatus - 浏览器内置 AI 模型状态（checking/ready/need_download/no_api/no_model）
 * @returns {JSX.Element} 设置视图
 * @author fxbin
 */
export default function SettingsView({ initialSection = null, onSectionConsumed, browserAiStatus = 'checking', setView }) {
  const { t } = useTranslation();
  const taskStatusLabel = useTaskStatusLabel();
  const taskWorkflowLabel = useTaskWorkflowLabel();
  const [status, setStatus] = useState(t('settings.loadingModelSettings'));
  const [activeSection, setActiveSection] = useState(INITIAL_ACTIVE_SECTION);

  const {
    profiles,
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
    modelOptions,
    selectedProfile,
    selectProfile,
    changeProvider,
    activateProfile,
    requestDeleteProfile,
    confirmDeleteProfile,
    saveProfile,
    testSettings,
    clearKey,
    openCreateForm,
    changeNewProfileProvider,
    createProfile,
  } = useSettingsProfile({ setStatus, t });

  const {
    wereadApiKey,
    setWereadApiKey,
    wereadConfigured,
    wereadSaving,
    wereadTesting,
    wereadTestResult,
    saveWeReadKey,
    testWeReadKey,
  } = useSettingsWeread({ setStatus, t });

  const {
    systemStats,
    dataAction,
    exportAllData,
    clearLocalCache,
    revealDataDir,
  } = useSettingsStats();

  const minimalMode = useMinimalMode();

  useEffect(() => {
    minimalMode.fetchMinimalMode();
  }, [minimalMode]);

  const dataPortability = useDataPortability();

  useEffect(() => {
    dataPortability.fetchRecords();
  }, [dataPortability]);

  const readerMode = useReaderMode();

  useEffect(() => {
    readerMode.fetchProfile();
  }, [readerMode]);

  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
      if (onSectionConsumed) {
        onSectionConsumed();
      }
    }
  }, [initialSection, onSectionConsumed]);

  const SETTINGS_TABS = [
    { key: 'profiles', label: t('settings.profiles'), icon: PlugZap },
    { key: 'weread', label: t('settings.weread.title'), icon: BookOpen },
    { key: 'transparency', label: t('settings.systemTransparency'), icon: BarChart3 },
    { key: 'agentUsage', label: t('agentUsage.title'), icon: Cpu },
    { key: 'dataControls', label: t('settings.dataControls'), icon: Database },
    { key: 'kits', label: t('kit.title'), icon: Sparkles },
  ];

  /**
   * 渲染右侧上下文相关的状态摘要。
   * @returns {JSX.Element} 状态摘要面板
   * @author fxbin
   */
  function renderStatusSidebar() {
    if (activeSection === 'profiles') {
      return (
        <>
          <div className="status-card">
            <ShieldCheck size={22} />
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
            <Settings size={22} />
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
            <Cpu size={22} />
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
            <BookOpen size={22} />
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
            <BarChart3 size={22} />
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
            <Sparkles size={22} />
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
          <Database size={22} />
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
                            <Star size={18} fill={profile.isDefault ? 'currentColor' : 'none'} />
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
                  <Database size={20} />
                  <div>
                    <span>{t('settings.apiStatus')}</span>
                    <strong>{systemStats.apiOnline ? t('settings.online') : t('settings.offline')}</strong>
                    <p>{systemStats.apiOnline ? t('settings.apiOnline') : t('settings.apiOffline')}</p>
                  </div>
                </div>
                <div className="status-card">
                  <ShieldCheck size={20} />
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

        {activeSection === 'agentUsage' && (
          <section className="settings-panel">
            <div className="settings-panel-head">
              <Cpu size={24} />
              <div>
                <h3>{t('agentUsage.title')}</h3>
                <p>{t('agentUsage.subtitle')}</p>
              </div>
            </div>
            <AgentUsageDashboard />
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
                disabled={dataAction?.type === DATA_ACTION_TYPE_REVEAL && dataAction?.loading}
                onClick={revealDataDir}
              >
                <FolderOpen size={16} />
                {dataAction?.type === DATA_ACTION_TYPE_REVEAL && dataAction?.loading ? t('settings.openingDataDirectory') : t('settings.openDataDirectory')}
              </button>
              <button
                type="button"
                disabled={dataAction?.type === DATA_ACTION_TYPE_EXPORT && dataAction?.loading}
                onClick={exportAllData}
              >
                <Download size={16} />
                {dataAction?.type === DATA_ACTION_TYPE_EXPORT && dataAction?.loading ? t('settings.exporting') : t('settings.exportAll')}
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
            {dataAction?.type === DATA_ACTION_TYPE_REVEAL && dataAction?.ok && (
              <p className="settings-note">{t('settings.openDataDirectorySuccess')} {dataAction.path}</p>
            )}
            {dataAction?.type === DATA_ACTION_TYPE_REVEAL && dataAction?.ok === false && (
              <p className="settings-note">{t('settings.openDataDirectoryFailed')}{dataAction.error ? ` ${dataAction.error}` : ''}</p>
            )}
            {dataAction?.type === DATA_ACTION_TYPE_EXPORT && dataAction?.ok && (
              <p className="settings-note">{t('settings.exportSuccess')}</p>
            )}
            {dataAction?.type === DATA_ACTION_TYPE_EXPORT && dataAction?.ok === false && (
              <p className="settings-note">{t('settings.exportFailed')}</p>
            )}
            {dataAction?.type === DATA_ACTION_TYPE_CLEAR && dataAction?.ok && (
              <p className="settings-note">{t('settings.clearSuccess')} {dataAction.count} {t('settings.items')}</p>
            )}
            {dataAction?.type === DATA_ACTION_TYPE_CLEAR && dataAction?.ok === false && (
              <p className="settings-note">{t('settings.clearFailed')}</p>
            )}
            <div className="minimal-mode-block">
              <div className="minimal-mode-head">
                <h4>{t('settings.minimalMode.title')}</h4>
                <p>{t('settings.minimalMode.desc')}</p>
              </div>
              <label className="minimal-mode-toggle">
                <input
                  type="checkbox"
                  checked={minimalMode.enabled}
                  disabled={minimalMode.loading}
                  onChange={(e) => minimalMode.toggleMinimalMode(e.target.checked)}
                />
                <span>
                  {minimalMode.enabled
                    ? t('settings.minimalMode.on')
                    : t('settings.minimalMode.off')}
                </span>
              </label>
              {minimalMode.featureState?.features && (
                <ul className="minimal-mode-contract">
                  {minimalMode.featureState.features.map((feature) => (
                    <li
                      key={feature.featureKey}
                      className={`minimal-mode-feature minimal-mode-feature--${feature.disposition}`}
                    >
                      <span className="minimal-mode-feature-label">{feature.label}</span>
                      <span className="minimal-mode-feature-disposition">
                        {feature.disposition === 'retained'
                          ? t('settings.minimalMode.retained')
                          : t('settings.minimalMode.silenced')}
                      </span>
                      <span className="minimal-mode-feature-reason">{feature.reason}</span>
                    </li>
                  ))}
                </ul>
              )}
              {minimalMode.error && (
                <p className="settings-note">{t('settings.minimalMode.failed')}</p>
              )}
            </div>

            <div className="data-portability-block">
              <div className="data-portability-head">
                <h4>数据可携</h4>
                <p>导出你的统计数据画像（信号源 + 派生指标 + 算法版本），30 天内可撤回。</p>
              </div>
              <div className="data-portability-actions">
                <button
                  type="button"
                  disabled={dataPortability.loading}
                  onClick={() => dataPortability.exportProfile('json')}
                >
                  导出 JSON
                </button>
                <button
                  type="button"
                  disabled={dataPortability.loading}
                  onClick={() => dataPortability.exportProfile('markdown')}
                >
                  导出 Markdown
                </button>
              </div>
              {dataPortability.records.length > 0 && (
                <ul className="data-portability-list">
                  {dataPortability.records.map((record) => (
                    <li key={record.id} className="data-portability-item">
                      <div className="data-portability-item-info">
                        <span className="data-portability-item-name">{record.filename}</span>
                        <span className="data-portability-item-meta">
                          {record.format.toUpperCase()} ·{' '}
                          {new Date(record.createdAt).toLocaleDateString()}
                          {record.revokedAt ? ' · 已撤回' : ''}
                        </span>
                      </div>
                      {!record.revokedAt && Date.now() < record.revokeDeadline && (
                        <button
                          type="button"
                          className="data-portability-revoke-btn"
                          disabled={dataPortability.loading}
                          onClick={() => dataPortability.revokeRecord(record.id)}
                        >
                          撤回
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {dataPortability.error && (
                <p className="settings-note">数据可携操作失败，请重试。</p>
              )}
            </div>

            <div className="reader-mode-block">
              <div className="reader-mode-head">
                <h4>阅读模式适配</h4>
                <p>根据划线量自动适配功能可见度，可临时回退到新手模式（30 天后自动恢复）。</p>
              </div>
              {readerMode.profile && (
                <div className="reader-mode-profile">
                  <span className={`reader-mode-tier reader-mode-tier--${readerMode.profile.tier}`}>
                    {readerMode.profile.tier === 'novice' ? '新手' : readerMode.profile.tier === 'power' ? '重度' : '常规'}
                  </span>
                  <span className="reader-mode-reason">{readerMode.profile.reason}</span>
                </div>
              )}
              <div className="reader-mode-actions">
                {readerMode.profile && readerMode.profile.tier !== 'novice' && (
                  <button
                    type="button"
                    disabled={readerMode.loading}
                    onClick={() => {
                      readerMode.startRollback('novice').then((ok) => {
                        if (ok) readerMode.fetchProfile();
                      });
                    }}
                  >
                    临时回到新手模式
                  </button>
                )}
                {readerMode.profile && readerMode.profile.tier !== 'power' && (
                  <button
                    type="button"
                    disabled={readerMode.loading}
                    onClick={() => {
                      readerMode.startRollback('regular').then((ok) => {
                        if (ok) readerMode.fetchProfile();
                      });
                    }}
                  >
                    临时回到常规模式
                  </button>
                )}
                <button
                  type="button"
                  disabled={readerMode.loading}
                  onClick={() => {
                    readerMode.cancelRollback().then((ok) => {
                      if (ok) readerMode.fetchProfile();
                    });
                  }}
                >
                  取消临时回退
                </button>
              </div>
              {readerMode.profile && readerMode.profile.visibleFeatures && (
                <div className="reader-mode-features">
                  <p className="reader-mode-features-label">可见功能：</p>
                  <span className="reader-mode-features-list">
                    {readerMode.profile.visibleFeatures.join('、')}
                  </span>
                </div>
              )}
              {readerMode.error && (
                <p className="settings-note">阅读模式查询失败，请重试。</p>
              )}
            </div>
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
                onClick={() => setView('kits')}
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
