/**
 * @module views/WorkflowView
 * Workflow 执行视图：展示 Kit 运行流程、步骤时间线、证据槽位、任务状态徽章与实时产物预览。
 * @author fxbin
 */

import { CheckCircle2, CircleX, Clock3 } from 'lucide-react';

/**
 * 任务状态徽章元数据映射
 * key: 任务状态值；value: { tone, label } 复用 map-status-badge 配色
 */
const TASK_STATUS_META = {
  queued: { tone: 'neutral', label: '排队中' },
  running: { tone: 'pending', label: '运行中' },
  succeeded: { tone: 'positive', label: '已完成' },
  failed: { tone: 'negative', label: '已失败' },
  needs_user_action: { tone: 'pending', label: '需处理' },
};

/**
 * 默认状态徽章（未知状态时回退）
 */
const DEFAULT_STATUS_META = { tone: 'neutral', label: '未知' };

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
  return date.toLocaleString('zh-CN', TIMESTAMP_FORMAT_OPTIONS);
}

/**
 * 根据任务状态获取徽章元数据
 * @param {string} status - 任务状态
 * @returns {{ tone: string, label: string }} 徽章色调与文案
 */
function describeTaskStatus(status) {
  return TASK_STATUS_META[status] ?? DEFAULT_STATUS_META;
}

/**
 * Workflow 执行视图组件
 * @param {Object} props - 组件属性
 * @param {Object} props.detail - 知识库详情
 * @param {boolean} props.isRunningKit - 是否正在运行 Kit
 * @param {Object} props.kitRunResult - Kit 运行结果
 * @param {Object} props.latestTask - 最近一次任务
 * @param {Function} props.onOpenArtifact - 打开产物回调
 * @param {Function} props.onRunKit - 运行 Kit 回调
 * @param {string} props.selectedKnowledgeBaseId - 当前选中的知识库 ID
 * @param {Function} props.setView - 切换视图回调
 * @returns {JSX.Element} Workflow 视图
 */
export default function WorkflowView({ detail, isRunningKit, kitRunResult, latestTask, onOpenArtifact, onRunKit, selectedKnowledgeBaseId, setView }) {
  const activeArtifact = kitRunResult?.artifact ?? detail.artifacts?.[0];
  const activeTask = kitRunResult?.task ?? latestTask;
  const hasKnowledgeBase = Boolean(selectedKnowledgeBaseId);
  const materialsCount = detail.materials?.length ?? 0;
  const cardsCount = detail.cards?.length ?? 0;
  const artifactsCount = detail.artifacts?.length ?? 0;
  const taskStartedAt = activeTask?.createdAt ?? null;
  const taskUpdatedAt = activeTask?.updatedAt ?? null;
  const statusMeta = describeTaskStatus(activeTask?.status);
  const taskFailed = activeTask?.status === 'failed';
  const taskError = activeTask?.error ?? null;

  const dynamicSteps = [
    {
      title: '读取知识库',
      description: `${materialsCount} materials · ${cardsCount} cards`,
      state: hasKnowledgeBase ? 'done' : 'waiting',
      timestamp: taskStartedAt,
      evidence: hasKnowledgeBase ? `资料 ${materialsCount} 条 · 卡片 ${cardsCount} 张` : null,
    },
    {
      title: '整理上下文',
      description: '合并资料、卡片和最近产物作为 Kit 输入。',
      state: hasKnowledgeBase ? 'done' : 'waiting',
      timestamp: taskStartedAt,
      evidence: hasKnowledgeBase ? `输入源 ${materialsCount + cardsCount + artifactsCount} 项` : null,
    },
    {
      title: '生成产物',
      description: activeTask?.workflow === 'run_kit' ? activeTask.status : '等待运行 Kit。',
      state: isRunningKit ? 'active' : activeArtifact ? 'done' : 'waiting',
      timestamp: taskUpdatedAt,
      evidence: activeArtifact ? activeArtifact.title : null,
    },
    {
      title: '导出归档',
      description: activeArtifact ? '产物已可打开和导出 Markdown。' : '等待 Kit 生成产物。',
      state: activeArtifact ? 'done' : 'waiting',
      timestamp: activeArtifact ? taskUpdatedAt : null,
      evidence: activeArtifact ? '已归档至知识库' : null,
    },
  ];

  return (
    <section className="workflow-page">
      <header className="run-header">
        <button onClick={() => setView('kits')} type="button"><CircleX size={22} /></button>
        <div>
          <h2>{detail.title || 'Knowledge Kit'}</h2>
          <p>{activeTask?.id ?? 'Ready to run a minimal knowledge loop'}</p>
        </div>
        {activeTask && (
          <span className={`map-status-badge ${statusMeta.tone}`}>{statusMeta.label}</span>
        )}
        <span>{isRunningKit ? 'Executing' : activeArtifact ? 'Ready' : 'Idle'}</span>
      </header>
      {taskFailed && taskError && (
        <section className="system-notice">
          <CircleX size={NOTICE_ICON_SIZE} />
          <div>
            <strong>任务执行失败</strong>
            <p>{taskError}</p>
          </div>
        </section>
      )}
      <div className="run-grid">
        <aside className="run-steps">
          <div className="section-title">
            <h3>Execution Flow</h3>
            <button type="button">{activeArtifact ? '4 of 4 Steps' : 'Ready'}</button>
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
            disabled={!hasKnowledgeBase || isRunningKit}
            onClick={() => onRunKit('learning_research')}
            type="button"
          >
            {isRunningKit ? 'Running Kit...' : activeArtifact ? 'Run Again' : 'Run Learning Kit'}
          </button>
        </aside>
        <article className="artifact-preview">
          <div className="section-title">
            <h3>Live Artifact Preview</h3>
            <button disabled={!activeArtifact} onClick={() => onOpenArtifact(activeArtifact)} type="button">Open</button>
          </div>
          {activeArtifact ? (
            <>
              <h1>{activeArtifact.title}</h1>
              {activeArtifact.body.split(/\n+/).slice(0, 3).map((block) => <p key={block}>{block}</p>)}
            </>
          ) : (
            <>
              <h1>Run a Kit to create an artifact</h1>
              <p>当前知识库会被整理成一份可保存、可打开、可导出的 Markdown 产物。</p>
              <div className="skeleton" />
            </>
          )}
        </article>
      </div>
    </section>
  );
}
