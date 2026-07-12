/**
 * @module views/settings/WereadSection
 * 设置视图 - 微信读书分区：API Key 配置与测试。
 * @author fxbin
 */

import { BookOpen, ExternalLink, KeyRound } from 'lucide-react';

/**
 * 微信读书分区组件。
 * @param {Object} props - 组件属性
 * @param {string} props.wereadApiKey - 当前输入的 API Key
 * @param {Function} props.setWereadApiKey - 设置 API Key
 * @param {boolean} props.wereadConfigured - 是否已配置
 * @param {boolean} props.wereadSaving - 是否保存中
 * @param {boolean} props.wereadTesting - 是否测试中
 * @param {Object|null} props.wereadTestResult - 测试结果
 * @param {Function} props.saveWeReadKey - 保存 API Key
 * @param {Function} props.testWeReadKey - 测试 API Key
 * @param {Function} props.t - i18n 翻译函数
 * @returns {JSX.Element} 微信读书分区
 */
export default function WereadSection({
  wereadApiKey,
  setWereadApiKey,
  wereadConfigured,
  wereadSaving,
  wereadTesting,
  wereadTestResult,
  saveWeReadKey,
  testWeReadKey,
  t,
}) {
  return (
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
        <p className="settings-note">
          {t('settings.weread.apiKeyGetHint')}{' '}
          <a
            className="settings-link"
            href="https://weread.qq.com/r/weread-skills"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('settings.weread.apiKeyGetLink')}
            <ExternalLink size={14} />
          </a>
        </p>
        <p className="settings-security-note">{t('settings.weread.apiKeyStorageNotice')}</p>
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
  );
}
