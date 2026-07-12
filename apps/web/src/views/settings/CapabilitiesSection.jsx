/**
 * @module views/settings/CapabilitiesSection
 * 设置视图 - 能力清单分区：展示 Agent 能力边界与触发条件。
 * @author fxbin
 */

import { Info, Layers } from 'lucide-react';
import { CAPABILITIES } from '../../constants/capabilities';

/**
 * 能力清单分区组件。
 * @param {Object} props - 组件属性
 * @param {Function} props.t - i18n 翻译函数
 * @returns {JSX.Element} 能力清单分区
 */
export default function CapabilitiesSection({ t }) {
  return (
    <section className="settings-panel">
      <div className="settings-panel-head">
        <Layers size={24} />
        <div>
          <h3>{t('capabilities.title')}</h3>
          <p>{t('capabilities.subtitle')}</p>
        </div>
      </div>
      <div className="settings-capabilities-list">
        {CAPABILITIES.map((capability) => (
          <div key={capability.id} className="settings-capability-card">
            <div className="settings-capability-head">
              <strong>{t(capability.labelKey)}</strong>
              <span className={`settings-capability-mode settings-capability-mode--${capability.executionMode}`}>
                {t(capability.executionModeLabelKey)}
              </span>
            </div>
            <p className="settings-capability-desc">{t(capability.descriptionKey)}</p>
            <div className="settings-capability-block">
              <span className="settings-capability-block-label">{t('capabilities.boundariesLabel')}</span>
              <ul>
                {capability.boundariesKeys.map((key) => (
                  <li key={key}>{t(key)}</li>
                ))}
              </ul>
            </div>
            <div className="settings-capability-block">
              <span className="settings-capability-block-label">{t('capabilities.triggerLabel')}</span>
              <p>{t(capability.triggerKey)}</p>
            </div>
            <div className="settings-capability-future">
              <Info size={14} />
              <span>{t(capability.futurePlanKey)}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
