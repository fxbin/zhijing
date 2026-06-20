/**
 * 任务状态组件：展示单个任务的简要状态。
 * @module components/TaskStatus
 */

import { useTaskStatusLabel, useTaskWorkflowLabel } from '../utils/i18nLabels';

/**
 * 任务状态徽章组件。
 * @param {object} props - 组件属性
 * @param {object} props.task - 任务对象
 * @returns {JSX.Element|null} 任务状态区块
 */
export default function TaskStatus({ task }) {
  const { t } = useTranslation();
  const taskStatusLabel = useTaskStatusLabel();
  const taskWorkflowLabel = useTaskWorkflowLabel();
  if (!task) return null;
  return (
    <div className={`task-status ${task.status}`}>
      <span>{taskStatusLabel(task.status)}</span>
      <strong>{taskWorkflowLabel(task.workflow)}</strong>
      <small>{task.id}</small>
    </div>
  );
}
