/**
 * 任务列表组件：展示任务队列。
 * @module components/TaskList
 */

import { ClipboardList } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import EmptyState from './EmptyState';
import { formatTime } from '../utils/material';
import { useTaskStatusLabel, useTaskWorkflowLabel } from '../utils/i18nLabels';

/**
 * 任务队列面板，最多展示 6 条任务。
 * @param {object} props - 组件属性
 * @param {Array<object>} props.tasks - 任务数组
 * @returns {JSX.Element} 任务列表面板
 */
export default function TaskList({ tasks }) {
  const { t } = useTranslation();
  const taskStatusLabel = useTaskStatusLabel();
  const taskWorkflowLabel = useTaskWorkflowLabel();

  return (
    <section className="task-panel">
      <div className="section-title">
        <ClipboardList size={22} />
        <h3>{t('taskList.title')}</h3>
      </div>
      {tasks.length === 0 ? (
        <EmptyState title={t('taskList.noTasks')} body={t('taskList.noTasksHint')} />
      ) : (
        <div className="task-list">
          {tasks.slice(0, 6).map((task) => (
            <article className={`task-row ${task.status}`} key={task.id}>
              <span>{taskStatusLabel(task.status)}</span>
              <div>
                <strong>{taskWorkflowLabel(task.workflow)}</strong>
                <small>{task.error ?? task.id}</small>
              </div>
              <time>{formatTime(task.updatedAt)}</time>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
