/**
 * 高级运维标签页组件：资产/综合/对比/冲突视图的导航标签。
 * @module components/AdvancedOpsTabs
 */

const TAB_ITEMS = [
  { key: 'assets', label: 'Assets' },
  { key: 'synthesis', label: 'Synthesis' },
  { key: 'compare', label: 'Compare' },
  { key: 'conflicts', label: 'Conflicts' },
];

/**
 * 高级运维视图的标签页导航。
 * @param {object} props - 组件属性
 * @param {string} props.active - 当前激活的标签
 * @param {function} props.setView - 视图切换函数
 * @returns {JSX.Element} 标签页导航
 */
export default function AdvancedOpsTabs({ active, setView }) {
  return (
    <nav className="advanced-ops-tabs">
      {TAB_ITEMS.map((tab) => (
        <button
          className={active === tab.key ? 'active' : ''}
          key={tab.key}
          onClick={() => setView(tab.key)}
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
