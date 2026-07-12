/**
 * @module views/SettingsView
 * 设置视图：配置多模型 Profile、系统状态、数据控制。
 * 状态层已下沉至 useSettingsProfile / useSettingsWeread / useSettingsStats 三个 hook，
 * 本视图仅保留跨域共享的 status 文案与 activeSection 路由两个 UI state。
 * 各分区 JSX 已拆分至 ./settings/ 子目录，本文件仅保留 hooks 调用与主 JSX 编排。
 * @author fxbin
 */

import { Fragment, useEffect, useState } from 'react';
import { Cpu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTaskStatusLabel, useTaskWorkflowLabel } from '../utils/i18nLabels';
import AgentUsageDashboard from '../components/AgentUsageDashboard';
import { useSettingsProfile } from '../hooks/useSettingsProfile';
import { useSettingsWeread } from '../hooks/useSettingsWeread';
import { useSettingsStats } from '../hooks/useSettingsStats';
import { useMinimalMode } from '../hooks/useMinimalMode';
import { useDataPortability } from '../hooks/useDataPortability';
import { useReaderMode } from '../hooks/useReaderMode';
import { INITIAL_ACTIVE_SECTION, buildSettingsTabs } from './settings/constants';
import ProfilesSection from './settings/ProfilesSection';
import WereadSection from './settings/WereadSection';
import TransparencySection from './settings/TransparencySection';
import CapabilitiesSection from './settings/CapabilitiesSection';
import DataControlsSection from './settings/DataControlsSection';
import KitsSection from './settings/KitsSection';
import StatusSidebar from './settings/StatusSidebar';

/**
 * 设置视图组件：多 Profile 管理 + 系统状态 + 数据控制 + 微信读书。
 *
 * @param {object} props - 组件属性
 * @param {string|null} props.initialSection - 初始激活的设置分区
 * @param {() => void} props.onSectionConsumed - 初始分区消费后的回调
 * @param {string} props.browserAiStatus - 浏览器内置 AI 模型状态（checking/ready/need_download/no_api/no_model）
 * @param {Function} props.setView - 切换视图回调
 * @returns {JSX.Element} 设置视图
 * @author fxbin
 */
export default function SettingsView({ initialSection = null, onSectionConsumed, browserAiStatus = 'checking', setView }) {
  const { t } = useTranslation();
  const taskStatusLabel = useTaskStatusLabel();
  const taskWorkflowLabel = useTaskWorkflowLabel();
  const [status, setStatus] = useState(t('settings.loadingModelSettings'));
  const [activeSection, setActiveSection] = useState(INITIAL_ACTIVE_SECTION);
  const [endpointExpanded, setEndpointExpanded] = useState(false);
  const [policyExpanded, setPolicyExpanded] = useState(false);

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
    baseUrl,
    setBaseUrl,
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
  }, [minimalMode.fetchMinimalMode]);

  const dataPortability = useDataPortability();

  useEffect(() => {
    dataPortability.fetchRecords();
  }, [dataPortability.fetchRecords]);

  const readerMode = useReaderMode();

  useEffect(() => {
    readerMode.fetchProfile();
  }, [readerMode.fetchProfile]);

  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
      if (onSectionConsumed) {
        onSectionConsumed();
      }
    }
  }, [initialSection, onSectionConsumed]);

  const settingsTabs = buildSettingsTabs(t);

  const profilesProps = {
    profiles,
    selectedProfileId,
    providerOptions,
    profileName,
    setProfileName,
    provider,
    setProvider,
    model,
    setModel,
    baseUrl,
    setBaseUrl,
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
    endpointExpanded,
    setEndpointExpanded,
    policyExpanded,
    setPolicyExpanded,
    status,
    browserAiStatus,
    t,
  };

  const wereadProps = {
    wereadApiKey,
    setWereadApiKey,
    wereadConfigured,
    wereadSaving,
    wereadTesting,
    wereadTestResult,
    saveWeReadKey,
    testWeReadKey,
    t,
  };

  const transparencyProps = {
    systemStats,
    taskWorkflowLabel,
    taskStatusLabel,
    t,
  };

  const dataControlsProps = {
    dataAction,
    revealDataDir,
    exportAllData,
    clearLocalCache,
    minimalMode,
    dataPortability,
    readerMode,
    t,
  };

  const statusSidebarProps = {
    activeSection,
    wereadConfigured,
    wereadTestResult,
    systemStats,
    status,
    t,
  };

  return (
    <section className="page-main full settings-page">
      <div className="page-title-row">
        <div>
          <h2>{t('settings.title')}</h2>
          <p>{t('settings.subtitle')}</p>
        </div>
      </div>

      <div className="settings-tabs" role="tablist" aria-label={t('settings.title')}>
        {settingsTabs.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.key;
          const showDivider = index > 0 && settingsTabs[index - 1].group !== tab.group;
          return (
            <Fragment key={tab.key}>
              {showDivider && <span className="settings-tabs-divider" aria-hidden="true" />}
              <button
                aria-selected={isActive}
                className={isActive ? 'active' : ''}
                onClick={() => setActiveSection(tab.key)}
                role="tab"
                type="button"
              >
                <Icon size={18} />
                {tab.label}
              </button>
            </Fragment>
          );
        })}
      </div>

      <div className={`settings-grid ${activeSection === 'profiles' ? 'settings-grid-single' : ''}`}>
        {activeSection === 'profiles' && <ProfilesSection {...profilesProps} />}

        {activeSection === 'weread' && <WereadSection {...wereadProps} />}

        {activeSection === 'transparency' && <TransparencySection {...transparencyProps} />}

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

        {activeSection === 'capabilities' && <CapabilitiesSection t={t} />}

        {activeSection === 'dataControls' && <DataControlsSection {...dataControlsProps} />}

        {activeSection === 'kits' && <KitsSection setView={setView} t={t} />}

        {activeSection !== 'profiles' && (
          <aside className="settings-status">
            <StatusSidebar {...statusSidebarProps} />
          </aside>
        )}
      </div>
    </section>
  );
}
