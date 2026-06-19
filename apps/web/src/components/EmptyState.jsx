/**
 * 空状态组件：统一的空数据提示样式。
 * @module components/EmptyState
 */

import { Sparkles } from 'lucide-react';

/**
 * 通用空状态提示卡片。
 * @param {object} props - 组件属性
 * @param {string} props.title - 标题
 * @param {string} props.body - 描述文本
 * @returns {JSX.Element} 空状态卡片
 */
export default function EmptyState({ title, body }) {
  return (
    <article className="empty-state">
      <Sparkles size={22} />
      <div>
        <strong>{title}</strong>
        <p>{body}</p>
      </div>
    </article>
  );
}
