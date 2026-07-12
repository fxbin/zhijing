/**
 * @module views/settings/KitsSection
 * 设置视图 - Kit 分区：快捷能力入口。
 * @author fxbin
 */

import { Sparkles } from 'lucide-react';

/**
 * Kit 分区组件。
 * @param {Object} props - 组件属性
 * @param {Function} props.setView - 切换视图回调
 * @param {Function} props.t - i18n 翻译函数
 * @returns {JSX.Element} Kit 分区
 */
export default function KitsSection({ setView, t }) {
  return (
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
  );
}
