/**
 * @module views/settings/DataControlsSection
 * 设置视图 - 数据控制分区：数据导出/清理、极简模式、数据可携、阅读模式适配。
 * @author fxbin
 */

import { Database, Download, FolderOpen, Trash2 } from 'lucide-react';
import {
  DATA_ACTION_TYPE_EXPORT,
  DATA_ACTION_TYPE_CLEAR,
  DATA_ACTION_TYPE_REVEAL,
} from '../../hooks/useSettingsStats';

/**
 * 数据控制分区组件。
 *
 * 包含四个子块：
 * 1. 数据操作（打开数据目录 / 导出全部 / 清理本地缓存）
 * 2. 极简模式开关与可见功能契约
 * 3. 数据可携（导出 JSON/Markdown，30 天可撤回）
 * 4. 阅读模式适配（根据划线量自动适配，可临时回退）
 *
 * 注意：数据可携与阅读模式子块中的中文文案为硬编码，
 * 按行为零变化约束保持原样，不改为 i18n。
 *
 * @param {Object} props - 组件属性
 * @param {Object|null} props.dataAction - 当前数据操作状态
 * @param {Function} props.revealDataDir - 打开数据目录
 * @param {Function} props.exportAllData - 导出全部数据
 * @param {Function} props.clearLocalCache - 清理本地缓存
 * @param {Object} props.minimalMode - 极简模式状态（来自 useMinimalMode）
 * @param {Object} props.dataPortability - 数据可携状态（来自 useDataPortability）
 * @param {Object} props.readerMode - 阅读模式状态（来自 useReaderMode）
 * @param {Function} props.t - i18n 翻译函数
 * @returns {JSX.Element} 数据控制分区
 */
export default function DataControlsSection({
  dataAction,
  revealDataDir,
  exportAllData,
  clearLocalCache,
  minimalMode,
  dataPortability,
  readerMode,
  t,
}) {
  return (
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
  );
}
