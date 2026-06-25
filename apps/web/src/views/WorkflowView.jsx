/**
 * @module views/WorkflowView
 * Workflow 执行视图：展示 Kit 运行流程、步骤时间线、证据槽位、任务状态徽章与实时产物预览。
 * @author fxbin
 */

import { useTranslation } from 'react-i18next';
import { CheckCircle2, CircleX, Clock3 } from 'lucide-react';

import i18n from '../i18n';

/**
 * 任务状态徽章元数据映射
 * key: 任务状态值；value: { tone, label } 复用 map-status-badge 配色
 */
const TASK_STATUS_META = {
  queued: { tone: 'neutral', labelKey: 'workflow.status.queued' },
  running: { tone: 'pending', labelKey: 'workflow.status.running' },
  succeeded: { tone: 'positive', labelKey: 'workflow.status.succeeded' },
  failed: { tone: 'negative', labelKey: 'workflow.status.failed' },
  needs_user_action: { tone: 'pending', labelKey: 'workflow.status.needsUserAction' },
};

/**
 * 默认状态徽章（未知状态时回退）
 */
const DEFAULT_STATUS_META = { tone: 'neutral', labelKey: 'workflow.status.unknown' };

/**
 * 时间戳格式化选项（zh-CN 本地时间）
 */
const TIMESTAMP_FORMAT_OPTIONS = {
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
};

/**
 * 步骤图标尺寸
 */
const STEP_ICON_SIZE = 22;

/**
 * 时间戳图标尺寸
 */
const TIMESTAMP_ICON_SIZE = 12;

/**
 * 时间戳图标右侧外边距
 */
const TIMESTAMP_ICON_MARGIN = 4;

/**
 * 错误提示图标尺寸
 */
const NOTICE_ICON_SIZE = 21;

/**
 * 将 ISO 时间字符串格式化为本地可读时间
 * @param {string} iso - ISO 时间字符串
 * @returns {string|null} 格式化后的时间，无效时返回 null
 */
function formatTimestamp(iso) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const locale = i18n.language === 'zh' ? 'zh-CN' : 'en-US';
  return date.toLocaleString(locale, TIMESTAMP_FORMAT_OPTIONS);
}

/**
 * 根据任务状态获取徽章元数据
 * @param {string} status - 任务状态
 * @param {Function} t - react-i18next 翻译函数
 * @returns {{ tone: string, label: string }} 徽章色调与文案
 */
function describeTaskStatus(status, t) {
  const meta = TASK_STATUS_META[status] ?? DEFAULT_STATUS_META;
  return { tone: meta.tone, label: t(meta.labelKey) };
}

/**
 * Workflow 执行视图组件
 * @param {Object} props - 组件属性
 * @param {Object} props.detail - 工作区详情
 * @param {boolean} props.isRunningKit - 是否正在运行 Kit
 * @param {Object} props.kitRunResult - Kit 运行结果
 * @param {Object} props.latestTask - 最近一次任务
 * @param {Function} props.onOpenArtifact - 打开产物回调
 * @param {Function} props.onRunKit - 运行 Kit 回调
 * @param {string} props.selectedWorkspaceId - 当前选中的工作区 ID
 * @param {Function} props.setView - 切换视图回调
 * @returns {JSX.Element} Workflow 视图
 */
export default function WorkflowView({ detail, isRunningKit, kitRunResult, latestTask, onOpenArtifact, onRunKit, selectedWorkspaceId, setView }) {
  const { t } = useTranslation();
  const activeArtifact = kitRunResult?.artifact ?? detail.artifacts?.[0];
  const activeTask = kitRunResult?.task ?? latestTask;
  const hasWorkspace = Boolean(selectedWorkspaceId);
  const materialsCount = detail.materials?.length ?? 0;
  const cardsCount = detail.cards?.length ?? 0;
  const artifactsCount = detail.artifacts?.length ?? 0;
  const taskStartedAt = activeTask?.createdAt ?? null;
  const taskUpdatedAt = activeTask?.updatedAt ?? null;
  const statusMeta = describeTaskStatus(activeTask?.status, t);
  const taskFailed = activeTask?.status === 'failed';
  const taskError = activeTask?.error ?? null;

  const dynamicSteps = [
    {
      title: t('workflow.step.readWorkspace'),
      description: t('workflow.step.readDescription', { materialsCount, cardsCount }),
      state: hasWorkspace ? 'done' : 'waiting',
      timestamp: taskStartedAt,
      evidence: hasWorkspace ? t('workflow.step.readEvidence', { materialsCount, cardsCount }) : null,
    },
    {
      title: t('workflow.step.organizeContext'),
      description: t('workflow.step.organizeDescription'),
      state: hasWorkspace ? 'done' : 'waiting',
      timestamp: taskStartedAt,
      evidence: hasWorkspace ? t('workflow.step.organizeEvidence', { count: materialsCount + cardsCount + artifactsCount }) : null,
    },
    {
      title: t('workflow.step.generateArtifact'),
      description: activeTask?.workflow === 'run_kit' ? activeTask.status : t('workflow.step.generateWaiting'),
      state: isRunningKit ? 'active' : activeArtifact ? 'done' : 'waiting',
      timestamp: taskUpdatedAt,
      evidence: activeArtifact ? activeArtifact.title : null,
    },
    {
      title: t('workflow.step.exportArchive'),
      description: activeArtifact ? t('workflow.step.exportReady') : t('workflow.step.exportWaiting'),
      state: activeArtifact ? 'done' : 'waiting',
      timestamp: activeArtifact ? taskUpdatedAt : null,
      evidence: activeArtifact ? t('workflow.step.exportEvidence') : null,
    },
  ];

  return (
    <section className="workflow-page">
      <header className="run-header">
        <button onClick={() => setView('kits')} type="button"><CircleX size={22} /></button>
        <div>
          <h2>{detail.title || t('workflow.defaultTitle')}</h2>
          <p>{activeTask?.id ?? t('workflow.readyHint')}</p>
        </div>
        {activeTask && (
          <span className={`map-status-badge ${statusMeta.tone}`}>{statusMeta.label}</span>
        )}
        <span>{isRunningKit ? t('workflow.state.executing') : activeArtifact ? t('workflow.state.ready') : t('workflow.state.idle')}</span>
      </header>
      {taskFailed && taskError && (
        <section className="system-notice">
          <CircleX size={NOTICE_ICON_SIZE} />
          <div>
            <strong>{t('workflow.errorTitle')}</strong>
            <p>{taskError}</p>
          </div>
        </section>
      )}
      <div className="run-grid">
        <aside className="run-steps">
          <div className="section-title">
            <h3>{t('workflow.executionFlow')}</h3>
            <button type="button">{activeArtifact ? t('workflow.stepsCount', { current: dynamicSteps.length, total: dynamicSteps.length }) : t('workflow.state.ready')}</button>
          </div>
          {dynamicSteps.map((step, index) => (
            <article className={step.state} key={step.title}>
              {step.state === 'done' ? <CheckCircle2 size={STEP_ICON_SIZE} /> : <Clock3 size={STEP_ICON_SIZE} />}
              <div>
                <h3>{index + 1}. {step.title}</h3>
                <p>{step.description}</p>
                {step.timestamp && (
                  <p>
                    <Clock3 size={TIMESTAMP_ICON_SIZE} style={{ verticalAlign: 'middle', marginRight: TIMESTAMP_ICON_MARGIN }} />
                    {formatTimestamp(step.timestamp)}
                  </p>
                )}
                {step.evidence && <p>{step.evidence}</p>}
                {step.state === 'active' && <div className="progress"><span /></div>}
              </div>
            </article>
          ))}
          <button
            className="run-kit-button"
            disabled={!hasWorkspace || isRunningKit}
            onClick={() => onRunKit('learning_research')}
            type="button"
          >
            {isRunningKit ? t('workflow.runKit.running') : activeArtifact ? t('workflow.runKit.runAgain') : t('workflow.runKit.runLearningKit')}
          </button>
        </aside>
        <article className="artifact-preview">
          <div className="section-title">
            <h3>{t('workflow.artifactPreview')}</h3>
            <button disabled={!activeArtifact} onClick={() => onOpenArtifact(activeArtifact)} type="button">{t('common.open')}</button>
          </div>
          {activeArtifact ? (
            <>
              <h1>{activeArtifact.title}</h1>
              {activeArtifact.body.split(/\n+/).slice(0, 3).map((block) => <p key={block}>{block}</p>)}
            </>
          ) : (
            <>
              <h1>{t('workflow.emptyTitle')}</h1>
              <p>{t('workflow.emptyBody')}</p>
              <div className="skeleton" />
            </>
          )}
        </article>
      </div>
    </section>
  );
}
