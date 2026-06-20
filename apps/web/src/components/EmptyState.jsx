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
 * @param {import('lucide-react').LucideIcon} [props.icon] - 图标组件
 * @param {string} [props.action] - 操作按钮文本
 * @param {() => void} [props.onAction] - 操作按钮点击回调
 * @param {boolean} [props.compact] - 是否使用紧凑样式
 * @returns {JSX.Element} 空状态卡片
 */
export default function EmptyState({ title, body, icon: Icon, action, onAction, compact }) {
  const IconComponent = Icon ?? Sparkles;
  return (
    <article className={`empty-state ${compact ? 'compact' : ''}`}>
      <IconComponent size={22} />
      <div>
        <strong>{title}</strong>
        <p>{body}</p>
        {action && (
          <button className="empty-state-action" onClick={onAction} type="button">
            {action}
          </button>
        )}
      </div>
    </article>
  );
}
