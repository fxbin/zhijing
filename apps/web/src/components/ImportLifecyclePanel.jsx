/**
 * 导入生命周期面板组件：展示采集队列、复核入口和数据清洗信号。
 * @module components/ImportLifecyclePanel
 */

import { AlertTriangle, CheckCircle2, Layers, ListChecks } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * 导入生命周期面板，展示采集→排队→复核→入库四个阶段。
 * @param {object} props - 组件属性
 * @param {string} props.apiStatus - API 状态（online/offline/checking）
 * @param {object} props.stats - 统计数据
 * @param {function} props.onReviewItem - 复核条目点击回调
 * @returns {JSX.Element} 生命周期面板
 */
export default function ImportLifecyclePanel({ apiStatus, stats, onReviewItem }) {
  const { t } = useTranslation();

  const lifecycle = [
    {
      key: 'captured',
      label: t('importLifecycle.stage.captured'),
      value: stats.total,
      body: t('importLifecycle.stage.capturedBody'),
    },
    {
      key: 'queued',
      label: t('importLifecycle.stage.queued'),
      value: stats.saved + stats.parsing,
      body: t('importLifecycle.stage.queuedBody'),
    },
    {
      key: 'review',
      label: t('importLifecycle.stage.review'),
      value: stats.needsReview + stats.failed,
      body: t('importLifecycle.stage.reviewBody'),
    },
    {
      key: 'ingested',
      label: t('importLifecycle.stage.ingested'),
      value: stats.ingested,
      body: t('importLifecycle.stage.ingestedBody'),
    },
  ];
  const hasReview = stats.reviewItems.length > 0;

  return (
    <section className="import-lifecycle-panel" aria-label={t('importLifecycle.title')}>
      <div className="lifecycle-summary">
        <div>
          <span>{t('importLifecycle.collectionSummary')}</span>
          <h3>{stats.total ? t('importLifecycle.queueForming') : t('importLifecycle.waitingForQueue')}</h3>
          <p>
            {apiStatus === 'online'
              ? t('importLifecycle.onlineDescription')
              : t('importLifecycle.offlineDescription')}
          </p>
        </div>
        <div className="lifecycle-metrics">
          <strong>{stats.total}</strong>
          <span>{t('importLifecycle.materials')}</span>
          <strong>{stats.media}</strong>
          <span>{t('importLifecycle.media')}</span>
          <strong>{stats.ingested}</strong>
          <span>{t('importLifecycle.ready')}</span>
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
              <span>{t('importLifecycle.sourceRecovery')}</span>
              <h4>{hasReview ? t('importLifecycle.needsManual') : t('importLifecycle.sourceHealthy')}</h4>
            </div>
          </div>
          {hasReview ? (
            <div className="recovery-list">
              {stats.reviewItems.map((item) => (
                <button key={item.id} onClick={() => onReviewItem(item)} type="button">
                  <span>{item.platform ?? item.type}</span>
                  <strong>{item.title}</strong>
                  <small>{item.parseError ?? t('importLifecycle.waitingCompletion')}</small>
                </button>
              ))}
            </div>
          ) : (
            <p>{t('importLifecycle.noReviewItems')}</p>
          )}
        </article>

        <article className="data-hygiene-card">
          <div className="panel-title">
            <ListChecks size={20} />
            <div>
              <span>{t('importLifecycle.dataHygiene')}</span>
              <h4>{t('importLifecycle.hygieneSignals')}</h4>
            </div>
          </div>
          <div className="hygiene-grid">
            <div>
              <strong>{stats.duplicateSignals}</strong>
              <span>{t('importLifecycle.possibleDuplicates')}</span>
            </div>
            <div>
              <strong>{stats.needsReview}</strong>
              <span>{t('importLifecycle.needsReview')}</span>
            </div>
            <div>
              <strong>{stats.failed}</strong>
              <span>{t('importLifecycle.failed')}</span>
            </div>
          </div>
          <p>{t('importLifecycle.hygieneHint')}</p>
        </article>

        <article className="recent-capture-card">
          <div className="panel-title">
            <Layers size={20} />
            <div>
              <span>{t('importLifecycle.recentCaptures')}</span>
              <h4>{t('importLifecycle.recentQueue')}</h4>
            </div>
          </div>
          {stats.recent.length === 0 ? (
            <p>{t('importLifecycle.noRecentCaptures')}</p>
          ) : (
            <ol>
              {stats.recent.map((item) => (
                <li key={item.id}>
                  <span>{t(`parseStatus.${item.parseStatus}`, { defaultValue: item.parseStatus })}</span>
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
