/**
 * @module views/settings/ProfilesSection
 * 设置视图 - Profiles 分区：多 Profile 管理、创建表单、删除确认。
 * @author fxbin
 */

import {
  AlertTriangle,
  Cpu,
  KeyRound,
  Plus,
  PlugZap,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import {
  KEY_SOURCE_KEYS,
  formatDisplayName,
} from '../../hooks/useSettingsProfile';

/**
 * Profiles 分区组件。
 * @param {Object} props - 组件属性，详见字段列表
 * @param {Array} props.profiles - 已有 Profile 列表
 * @param {string|null} props.selectedProfileId - 当前选中的 Profile ID
 * @param {Array} props.providerOptions - 可选 Provider 列表
 * @param {string} props.profileName - 当前编辑的 Profile 名称
 * @param {Function} props.setProfileName - 设置 Profile 名称
 * @param {string} props.provider - 当前 Provider
 * @param {Function} props.setProvider - 设置 Provider（保留兼容，本组件内未直接使用）
 * @param {string} props.model - 当前模型 ID
 * @param {Function} props.setModel - 设置模型
 * @param {string} props.baseUrl - 自定义 baseUrl
 * @param {Function} props.setBaseUrl - 设置 baseUrl
 * @param {string} props.apiKey - 当前 apiKey 输入
 * @param {Function} props.setApiKey - 设置 apiKey
 * @param {boolean} props.enabled - 是否启用真实模型
 * @param {Function} props.setEnabled - 设置启用状态
 * @param {boolean} props.fallbackToMock - 是否允许回退到 Mock
 * @param {Function} props.setFallbackToMock - 设置回退开关
 * @param {boolean} props.hasApiKey - 当前 Profile 是否已配置 Key
 * @param {string} props.keySource - Key 来源标识
 * @param {string|number} props.updatedAt - 最后更新时间（保留兼容，本组件内未直接使用）
 * @param {boolean} props.isSaving - 是否保存中
 * @param {boolean} props.isTesting - 是否测试中
 * @param {Object|null} props.testResult - 测试结果
 * @param {boolean} props.showCreateForm - 是否显示创建表单抽屉
 * @param {Function} props.setShowCreateForm - 设置创建表单显隐
 * @param {Object} props.newProfile - 新建 Profile 草稿
 * @param {Function} props.setNewProfile - 设置新建 Profile 草稿
 * @param {Object|null} props.profileToDelete - 待删除的 Profile
 * @param {Function} props.setProfileToDelete - 设置待删除 Profile
 * @param {Array} props.modelOptions - 当前 Provider 可选模型列表
 * @param {Object|null} props.selectedProfile - 当前选中的 Profile 对象
 * @param {Function} props.selectProfile - 选中指定 Profile
 * @param {Function} props.changeProvider - 修改 Provider（带副作用）
 * @param {Function} props.activateProfile - 激活 Profile
 * @param {Function} props.requestDeleteProfile - 发起删除 Profile
 * @param {Function} props.confirmDeleteProfile - 确认删除 Profile
 * @param {Function} props.saveProfile - 保存当前 Profile
 * @param {Function} props.testSettings - 测试当前 Profile
 * @param {Function} props.clearKey - 清除运行时 Key
 * @param {Function} props.openCreateForm - 打开创建表单
 * @param {Function} props.changeNewProfileProvider - 修改新建 Profile 的 Provider
 * @param {Function} props.createProfile - 创建 Profile
 * @param {boolean} props.endpointExpanded - endpoint 区块是否展开
 * @param {Function} props.setEndpointExpanded - 设置 endpoint 区块展开
 * @param {boolean} props.policyExpanded - 策略区块是否展开
 * @param {Function} props.setPolicyExpanded - 设置策略区块展开
 * @param {string} props.status - 跨域共享的 status 文案
 * @param {string} props.browserAiStatus - 浏览器内置 AI 模型状态
 * @param {Function} props.t - i18n 翻译函数
 * @returns {JSX.Element} Profiles 分区
 */
export default function ProfilesSection({
  profiles,
  selectedProfileId,
  providerOptions,
  profileName,
  setProfileName,
  provider,
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
}) {
  return (
    <section className="settings-panel">
      <div className="settings-panel-head">
        <PlugZap size={24} />
        <div>
          <h3>{t('settings.profiles')}</h3>
          <p>{t('settings.profilesDesc')}</p>
        </div>
      </div>

      <div className="settings-profile-layout">
        <div className="settings-profile-list-panel">
          <div className="settings-actions">
            <button type="button" onClick={openCreateForm}>
              <Plus size={16} />
              {t('settings.createProfile')}
            </button>
          </div>

            {profiles.length === 0 ? (
              <div className="settings-empty-state">
                <PlugZap size={32} />
                <strong>{t('settings.noProfilesTitle')}</strong>
                <p>{t('settings.noProfiles')}</p>
                <button type="button" onClick={openCreateForm}>
                  <Plus size={16} />
                  {t('settings.createProfile')}
                </button>
              </div>
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
                        <button type="button" className="activate-link" onClick={() => activateProfile(profile.id)}>
                          {t('settings.activate')}
                        </button>
                      )}
                      <button type="button" className="delete-btn" onClick={() => requestDeleteProfile(profile.id)}>
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
                    <input
                      list="provider-options"
                      autoComplete="off"
                      type="text"
                      value={provider}
                      onChange={(event) => changeProvider(event.target.value)}
                    />
                    <datalist id="provider-options">
                      {providerOptions.map((item) => <option key={item.id} value={item.id}>{formatDisplayName(item.id)}</option>)}
                    </datalist>
                  </label>
                  <label className="field-row">
                    <span>{t('settings.model')}</span>
                    <input
                      list={`model-options-${provider}`}
                      autoComplete="off"
                      type="text"
                      value={model}
                      onChange={(event) => setModel(event.target.value)}
                    />
                    <datalist id={`model-options-${provider}`}>
                      {modelOptions.map((item) => <option key={item.id} value={item.id}>{formatDisplayName(item.id)}</option>)}
                    </datalist>
                  </label>
                </div>

                <div className={`settings-form-section collapsible ${endpointExpanded ? '' : 'collapsed'}`}>
                  <strong onClick={() => setEndpointExpanded((prev) => !prev)}>{t('settings.endpoint')}</strong>
                  <label className="field-row">
                    <span>{t('settings.baseUrl')}</span>
                    <input
                      autoComplete="off"
                      placeholder={t('settings.baseUrlPlaceholder')}
                      type="text"
                      value={baseUrl}
                      onChange={(event) => setBaseUrl(event.target.value)}
                    />
                  </label>
                  <p className="settings-security-note">{t('settings.baseUrlHint')}</p>
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
                  <p className="settings-security-note">{t('settings.apiKeyStorageNotice')}</p>
                </div>

                <div className={`settings-form-section collapsible ${policyExpanded ? '' : 'collapsed'}`}>
                  <strong onClick={() => setPolicyExpanded((prev) => !prev)}>{t('settings.policyGroup')}</strong>
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
                  <p className="settings-security-note">{fallbackToMock ? t('settings.mockFallbackNotice') : t('settings.noMockFallbackNotice')}</p>
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
                {testResult && (
                  <div className={`test-result ${testResult.ok ? 'ok' : 'failed'}`}>
                    <strong>{testResult.ok ? t('settings.testPassed') : t('settings.testNotPassed')}</strong>
                    <p>{testResult.message}</p>
                    {testResult.sampleTitle && <small>{t('settings.returnedCard')}{testResult.sampleTitle}</small>}
                  </div>
                )}
                <p className="settings-note">{status}</p>
              </>
            ) : (
              <p className="settings-note">{t('settings.noProfileSelected')}</p>
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
          </div>
        </div>

        {showCreateForm && (
          <>
            <div
              className="settings-drawer-overlay open"
              onClick={() => setShowCreateForm(false)}
            />
            <aside className="settings-drawer open">
              <div className="settings-drawer-head">
                <h4>{t('settings.createProfile')}</h4>
                <button type="button" onClick={() => setShowCreateForm(false)} aria-label={t('common.cancel')}>
                  <X size={18} />
                </button>
              </div>
              <div className="settings-drawer-body">
                <label className="field-row">
                  <span>{t('settings.profileName')}</span>
                  <input
                    autoComplete="off"
                    type="text"
                    value={newProfile.name}
                    onChange={(event) => setNewProfile((prev) => ({ ...prev, name: event.target.value }))}
                  />
                </label>
                <label className="field-row">
                  <span>{t('settings.provider')}</span>
                  <input
                    list="provider-options-new"
                    autoComplete="off"
                    type="text"
                    value={newProfile.provider}
                    onChange={(event) => changeNewProfileProvider(event.target.value)}
                  />
                  <datalist id="provider-options-new">
                    {providerOptions.map((item) => <option key={item.id} value={item.id}>{formatDisplayName(item.id)}</option>)}
                  </datalist>
                </label>
                <label className="field-row">
                  <span>{t('settings.model')}</span>
                  <input
                    list={`model-options-new-${newProfile.provider}`}
                    autoComplete="off"
                    type="text"
                    value={newProfile.model}
                    onChange={(event) => setNewProfile((prev) => ({ ...prev, model: event.target.value }))}
                  />
                  <datalist id={`model-options-new-${newProfile.provider}`}>
                    {(providerOptions.find((item) => item.id === newProfile.provider)?.models ?? [])
                      .map((item) => <option key={item.id} value={item.id}>{formatDisplayName(item.id)}</option>)}
                  </datalist>
                </label>
                <label className="field-row">
                  <span>{t('settings.baseUrl')}</span>
                  <input
                    autoComplete="off"
                    placeholder={t('settings.baseUrlPlaceholder')}
                    type="text"
                    value={newProfile.baseUrl}
                    onChange={(event) => setNewProfile((prev) => ({ ...prev, baseUrl: event.target.value }))}
                  />
                </label>
                <label className="field-row">
                  <span>{t('settings.apiKey')}</span>
                  <div className="secret-input">
                    <KeyRound size={18} />
                    <input
                      autoComplete="off"
                      placeholder={t('settings.apiKeyPlaceholder.empty')}
                      type="password"
                      value={newProfile.apiKey}
                      onChange={(event) => setNewProfile((prev) => ({ ...prev, apiKey: event.target.value }))}
                    />
                  </div>
                </label>
                <p className="settings-security-note">{t('settings.apiKeyStorageNotice')}</p>
                <div className="settings-actions settings-actions-primary">
                  <button
                    disabled={isSaving || !newProfile.name.trim() || !newProfile.provider || !newProfile.model}
                    onClick={createProfile}
                    type="button"
                  >
                    {isSaving ? t('common.saving') : t('common.create')}
                  </button>
                  <button type="button" onClick={() => setShowCreateForm(false)}>
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            </aside>
          </>
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
  );
}
