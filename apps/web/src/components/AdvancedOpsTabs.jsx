/**
 * 高级运维标签页组件：资产/综合/对比/冲突视图的导航标签。
 * @module components/AdvancedOpsTabs
 * @author fxbin
 */

import { useTranslation } from 'react-i18next';

const TAB_ITEMS = [
  { key: 'assets', labelKey: 'advancedOps.assets' },
  { key: 'synthesis', labelKey: 'advancedOps.synthesis' },
  { key: 'compare', labelKey: 'advancedOps.compare' },
  { key: 'conflicts', labelKey: 'advancedOps.conflicts' },
];

/**
 * 高级运维视图的标签页导航。
 * @param {object} props - 组件属性
 * @param {string} props.active - 当前激活的标签
 * @param {function} props.setView - 视图切换函数
 * @returns {JSX.Element} 标签页导航
 */
export default function AdvancedOpsTabs({ active, setView }) {
  const { t } = useTranslation();
  return (
    <nav className="advanced-ops-tabs">
      {TAB_ITEMS.map((tab) => (
        <button
          className={active === tab.key ? 'active' : ''}
          key={tab.key}
          onClick={() => setView(tab.key)}
          type="button"
        >
          {t(tab.labelKey)}
        </button>
      ))}
    </nav>
  );
}
