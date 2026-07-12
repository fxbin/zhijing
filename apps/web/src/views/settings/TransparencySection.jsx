/**
 * @module views/settings/TransparencySection
 * 设置视图 - 系统透明度分区：API 状态、数据规模、近期任务。
 * @author fxbin
 */

import { BarChart3, Database, ShieldCheck } from 'lucide-react';

/**
 * 系统透明度分区组件。
 * @param {Object} props - 组件属性
 * @param {Object|null} props.systemStats - 系统统计数据
 * @param {Function} props.taskWorkflowLabel - 工作流标签翻译函数
 * @param {Function} props.taskStatusLabel - 任务状态标签翻译函数
 * @param {Function} props.t - i18n 翻译函数
 * @returns {JSX.Element} 系统透明度分区
 */
export default function TransparencySection({
  systemStats,
  taskWorkflowLabel,
  taskStatusLabel,
  t,
}) {
  return (
    <section className="settings-panel">
      <div className="settings-panel-head">
        <BarChart3 size={24} />
        <div>
          <h3>{t('settings.systemTransparency')}</h3>
          <p>{t('settings.systemTransparency.desc')}</p>
        </div>
      </div>
      {systemStats ? (
        <div className="settings-transparency">
          <div className="status-card">
            <Database size={20} />
            <div>
              <span>{t('settings.apiStatus')}</span>
              <strong>{systemStats.apiOnline ? t('settings.online') : t('settings.offline')}</strong>
              <p>{systemStats.apiOnline ? t('settings.apiOnline') : t('settings.apiOffline')}</p>
            </div>
          </div>
          <div className="status-card">
            <ShieldCheck size={20} />
            <div>
              <span>{t('settings.dataScale')}</span>
              <strong>{t('settings.dataScaleCount', { kb: systemStats.workspaces, materials: systemStats.materials })}</strong>
              <p>{t('settings.tasksRecorded', { count: systemStats.tasks })}</p>
            </div>
          </div>
          {systemStats.recentTasks?.length > 0 && (
            <div className="settings-recent-tasks">
              <strong>{t('settings.recentTasks')}</strong>
              {systemStats.recentTasks.map((task) => (
                <div key={task.id} className="settings-task-row">
                  <span>{taskWorkflowLabel(task.workflow)}</span>
                  <span>{taskStatusLabel(task.status)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="settings-note">{t('settings.loadingSystem')}</p>
      )}
    </section>
  );
}
