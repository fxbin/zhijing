/**
 * 最近导入资料组件：展示最近导入的材料卡片。
 * @module components/RecentImports
 */

import { Upload } from 'lucide-react';

import EmptyState from './EmptyState';

/**
 * 最近导入资料面板。
 * @param {object} props - 组件属性
 * @param {Array<object>} props.materials - 材料数组
 * @returns {JSX.Element} 最近导入面板
 */
export default function RecentImports({ materials }) {
  return (
    <article className="recent-panel">
      <div className="section-title">
        <Upload size={22} />
        <h3>Recently Imported</h3>
        <button type="button">View All</button>
      </div>
      <div className="material-list">
        {materials.length === 0 ? (
          <EmptyState title="暂无导入资料" body="导入链接或文本后，最近资料会出现在这里。" />
        ) : materials.map((item) => (
          <article className={`material-card ${item.state}`} key={item.title}>
            <div className="material-meta">
              <span>{item.source}</span>
              <span>{item.status}</span>
              <time>{item.time}</time>
            </div>
            <h4>{item.title}</h4>
            <p>{item.summary}</p>
            <div className="tag-row">{item.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
          </article>
        ))}
      </div>
    </article>
  );
}
