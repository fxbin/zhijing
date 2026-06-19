/**
 * 任务列表组件：展示任务队列。
 * @module components/TaskList
 */

import { ClipboardList } from 'lucide-react';

import EmptyState from './EmptyState';

/**
 * 任务队列面板，最多展示 6 条任务。
 * @param {object} props - 组件属性
 * @param {Array<object>} props.tasks - 任务数组
 * @returns {JSX.Element} 任务列表面板
 */
export default function TaskList({ tasks }) {
  return (
    <section className="task-panel">
      <div className="section-title">
        <ClipboardList size={22} />
        <h3>Task Queue</h3>
      </div>
      {tasks.length === 0 ? (
        <EmptyState title="暂无任务" body="提交主题、链接或问题后，任务会显示在这里。" />
      ) : (
        <div className="task-list">
          {tasks.slice(0, 6).map((task) => (
            <article className={`task-row ${task.status}`} key={task.id}>
              <span>{task.status}</span>
              <div>
                <strong>{task.workflow}</strong>
                <small>{task.error ?? task.id}</small>
              </div>
              <time>{task.updatedAt ? new Date(task.updatedAt).toLocaleTimeString() : 'now'}</time>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
