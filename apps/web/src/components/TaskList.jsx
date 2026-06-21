/**
 * 任务列表组件：展示任务队列。
 * @module components/TaskList
 */

import { ClipboardList } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { formatTime } from '../utils/material';
import { useTaskStatusLabel, useTaskWorkflowLabel } from '../utils/i18nLabels';

/**
 * 任务队列面板，最多展示 6 条任务。
 * 没有任务时不渲染任何内容，避免在首页留下空占位。
 * @param {object} props - 组件属性
 * @param {Array<object>} props.tasks - 任务数组
 * @param {boolean} [props.showTitle=true] - 是否显示面板标题
 * @returns {JSX.Element|null} 任务列表面板
 */
export default function TaskList({ tasks, showTitle = true }) {
  const { t } = useTranslation();
  const taskStatusLabel = useTaskStatusLabel();
  const taskWorkflowLabel = useTaskWorkflowLabel();

  if (tasks.length === 0) {
    return null;
  }

  return (
    <section className="task-panel">
      {showTitle && (
        <div className="section-title">
          <ClipboardList size={22} />
          <h3>{t('taskList.title')}</h3>
        </div>
      )}
      <div className="task-list">
        {tasks.slice(0, 6).map((task) => (
          <article className={`task-row ${task.status}`} key={task.id}>
            <span className="task-row-status">{taskStatusLabel(task.status)}</span>
            <div className="task-row-main">
              <strong>{taskWorkflowLabel(task.workflow)}</strong>
              <small>{task.error ?? task.id}</small>
            </div>
            <time>{formatTime(task.updatedAt)}</time>
          </article>
        ))}
      </div>
    </section>
  );
}
