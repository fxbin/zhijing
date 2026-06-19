/**
 * @module views/WorkflowView
 * Workflow 执行视图：展示 Kit 运行流程、步骤状态与实时产物预览。
 */

import { CheckCircle2, CircleX, Clock3 } from 'lucide-react';

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
  const dynamicSteps = [
    ['读取知识库', `${detail.materials?.length ?? 0} materials · ${detail.cards?.length ?? 0} cards`, hasKnowledgeBase ? 'done' : 'waiting'],
    ['整理上下文', '合并资料、卡片和最近产物作为 Kit 输入。', hasKnowledgeBase ? 'done' : 'waiting'],
    ['生成产物', activeTask?.workflow === 'run_kit' ? activeTask.status : 'waiting', isRunningKit ? 'active' : activeArtifact ? 'done' : 'waiting'],
    ['导出归档', activeArtifact ? '产物已可打开和导出 Markdown。' : '等待 Kit 生成产物。', activeArtifact ? 'done' : 'waiting'],
  ];

  return (
    <section className="workflow-page">
      <header className="run-header">
        <button onClick={() => setView('kits')} type="button"><CircleX size={22} /></button>
        <div><h2>{detail.title || 'Knowledge Kit'}</h2><p>{activeTask?.id ?? 'Ready to run a minimal knowledge loop'}</p></div>
        <span>{isRunningKit ? 'Executing' : activeArtifact ? 'Ready' : 'Idle'}</span>
      </header>
      <div className="run-grid">
        <aside className="run-steps">
          <div className="section-title"><h3>Execution Flow</h3><button type="button">{activeArtifact ? '4 of 4 Steps' : 'Ready'}</button></div>
          {dynamicSteps.map(([title, body, state], index) => (
            <article className={state} key={title}>
              {state === 'done' ? <CheckCircle2 size={22} /> : <Clock3 size={22} />}
              <div><h3>{index + 1}. {title}</h3><p>{body}</p>{state === 'active' && <div className="progress"><span /></div>}</div>
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
