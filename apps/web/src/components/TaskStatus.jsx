/**
 * 任务状态组件：展示单个任务的简要状态。
 * 失败时展示错误原因与重试入口（仅 parse_material 工作流支持重试，需通过 onRetry 回调传入）。
 * 内部任务 ID 隐藏到 title 属性，避免对用户造成困惑。
 * @module components/TaskStatus
 */

import { RotateCw } from 'lucide-react';
import { useParseErrorLabel, useTaskStatusLabel, useTaskWorkflowLabel } from '../utils/i18nLabels';
import { useTranslation } from 'react-i18next';

const PARSE_MATERIAL_WORKFLOW = 'parse_material';
const FAILED_STATUS = 'failed';

/**
 * 任务状态徽章组件。
 * @param {object} props - 组件属性
 * @param {object} props.task - 任务对象
 * @param {string} [props.materialId] - 关联资料 ID，parse_material 失败时用于触发重试
 * @param {function} [props.onRetry] - 重试回调，签名 (materialId) => void
 * @returns {JSX.Element|null} 任务状态区块
 */
export default function TaskStatus({ task, materialId, onRetry }) {
  const { t } = useTranslation();
  const taskStatusLabel = useTaskStatusLabel();
  const taskWorkflowLabel = useTaskWorkflowLabel();
  const parseErrorLabel = useParseErrorLabel();
  if (!task) return null;

  const isFailed = task.status === FAILED_STATUS;
  const isParseMaterial = task.workflow === PARSE_MATERIAL_WORKFLOW;
  const canRetry = isFailed && isParseMaterial && Boolean(materialId) && typeof onRetry === 'function';
  const rawError = task.error?.trim();
  const friendlyError = rawError ? parseErrorLabel(rawError) : '';

  return (
    <div className={`task-status ${task.status}`} title={`${taskWorkflowLabel(task.workflow)} · ${task.id}${rawError ? `\n${rawError}` : ''}`}>
      <span>{taskStatusLabel(task.status)}</span>
      <strong>{taskWorkflowLabel(task.workflow)}</strong>
      {isFailed && friendlyError && (
        <small className="task-status-error" title={rawError || friendlyError}>{friendlyError}</small>
      )}
      {canRetry && (
        <button
          type="button"
          className="task-status-retry"
          onClick={() => onRetry(materialId)}
          aria-label={t('detail.retryButton')}
          title={t('detail.retryButton')}
        >
          <RotateCw size={14} />
          {t('detail.retryButton')}
        </button>
      )}
    </div>
  );
}
