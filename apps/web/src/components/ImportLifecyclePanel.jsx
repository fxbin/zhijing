/**
 * 导入生命周期面板组件：展示采集队列、复核入口和数据清洗信号。
 * @module components/ImportLifecyclePanel
 */

import { AlertTriangle, CheckCircle2, Layers, ListChecks } from 'lucide-react';

import { statusLabels } from '../constants/labels';

/**
 * 导入生命周期面板，展示采集→排队→复核→入库四个阶段。
 * @param {object} props - 组件属性
 * @param {string} props.apiStatus - API 状态（online/offline/checking）
 * @param {object} props.stats - 统计数据
 * @param {function} props.onReviewItem - 复核条目点击回调
 * @returns {JSX.Element} 生命周期面板
 */
export default function ImportLifecyclePanel({ apiStatus, stats, onReviewItem }) {
  const lifecycle = [
    { key: 'captured', label: 'Captured', value: stats.total, body: 'Raw links, notes, and documents saved locally.' },
    { key: 'queued', label: 'Queued', value: stats.saved + stats.parsing, body: 'Waiting for parsing, enrichment, or manual completion.' },
    { key: 'review', label: 'Review', value: stats.needsReview + stats.failed, body: 'Needs user action before it can become knowledge cards.' },
    { key: 'ingested', label: 'Ingested', value: stats.ingested, body: 'Converted into structured knowledge assets.' },
  ];
  const hasReview = stats.reviewItems.length > 0;

  return (
    <section className="import-lifecycle-panel" aria-label="导入生命周期">
      <div className="lifecycle-summary">
        <div>
          <span>Collection Summary</span>
          <h3>{stats.total ? '采集队列正在形成知识资产' : '等待第一批资料进入队列'}</h3>
          <p>
            {apiStatus === 'online'
              ? '链接、文本和文档会先进入资料库，再根据解析状态进入补全、归属和卡片生成。'
              : 'API 离线时仍可观察界面状态；重新连接后资料队列会自动同步。'}
          </p>
        </div>
        <div className="lifecycle-metrics">
          <strong>{stats.total}</strong>
          <span>materials</span>
          <strong>{stats.media}</strong>
          <span>media</span>
          <strong>{stats.ingested}</strong>
          <span>ready</span>
        </div>
      </div>

      <div className="lifecycle-steps">
        {lifecycle.map((step) => (
          <article className={step.key === 'review' && step.value > 0 ? 'attention' : ''} key={step.key}>
            <div>
              {step.key === 'review' && step.value > 0 ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
              <span>{step.label}</span>
            </div>
            <strong>{step.value}</strong>
            <p>{step.body}</p>
          </article>
        ))}
      </div>

      <div className="lifecycle-workbench">
        <article className={hasReview ? 'source-recovery-card needs-action' : 'source-recovery-card'}>
          <div className="panel-title">
            <AlertTriangle size={20} />
            <div>
              <span>Source Recovery</span>
              <h4>{hasReview ? '有资料需要手动处理' : '来源连接状态正常'}</h4>
            </div>
          </div>
          {hasReview ? (
            <div className="recovery-list">
              {stats.reviewItems.map((item) => (
                <button key={item.id} onClick={() => onReviewItem(item)} type="button">
                  <span>{item.platform ?? item.type}</span>
                  <strong>{item.title}</strong>
                  <small>{item.parseError ?? '等待补全正文或媒体链接。'}</small>
                </button>
              ))}
            </div>
          ) : (
            <p>当前没有失败或需要复核的资料。后续如果平台解析受限，会在这里提供可恢复入口。</p>
          )}
        </article>

        <article className="data-hygiene-card">
          <div className="panel-title">
            <ListChecks size={20} />
            <div>
              <span>Data Hygiene</span>
              <h4>清洗信号</h4>
            </div>
          </div>
          <div className="hygiene-grid">
            <div>
              <strong>{stats.duplicateSignals}</strong>
              <span>possible duplicates</span>
            </div>
            <div>
              <strong>{stats.needsReview}</strong>
              <span>needs review</span>
            </div>
            <div>
              <strong>{stats.failed}</strong>
              <span>failed</span>
            </div>
          </div>
          <p>先用这些信号定位需要处理的资料；真正的自动去重和合并建议会在后续数据治理切片接入。</p>
        </article>

        <article className="recent-capture-card">
          <div className="panel-title">
            <Layers size={20} />
            <div>
              <span>Recent Captures</span>
              <h4>最近进入队列</h4>
            </div>
          </div>
          {stats.recent.length === 0 ? (
            <p>暂无资料。可以从上方粘贴链接、文本，或导入 Markdown / TXT 文档。</p>
          ) : (
            <ol>
              {stats.recent.map((item) => (
                <li key={item.id}>
                  <span>{statusLabels[item.parseStatus] ?? item.parseStatus}</span>
                  <strong>{item.title}</strong>
                </li>
              ))}
            </ol>
          )}
        </article>
      </div>
    </section>
  );
}
