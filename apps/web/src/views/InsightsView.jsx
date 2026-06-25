/**
 * 洞察视图：全局认知仪表盘，展示知识增长、来源分布、最新卡片与知识地图预览。
 * @module views/InsightsView
 */

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowUpRight,
  BookOpen,
  FileText,
  Layers,
  Lightbulb,
  Map,
  TrendingUp,
} from 'lucide-react';
import AgentProposalsPanel from '../components/AgentProposalsPanel';
import EmptyState from '../components/EmptyState';
import api from '../utils/api';
import { useCardTypeLabel, useClaimStatusLabel } from '../utils/i18nLabels';
import { formatDate } from '../utils/material';

/**
 * 获取最近 30 天的日期标签，按周分组显示。
 * @param {string[]} labels - 日期标签数组
 * @returns {string[]} 稀疏化后的标签
 */
function sparseLabels(labels) {
  return labels.map((label, index) => {
    if (index === 0 || index === labels.length - 1 || index % 7 === 0) {
      return label.slice(5);
    }
    return '';
  });
}

/**
 * 洞察仪表盘组件。
 * @param {object} props - 组件属性
 * @param {Function} props.setView - 视图切换回调
 * @param {Function} [props.onCreateWorkspace] - 创建工作区回调，接收 { title, summary, cardIds } 参数
 * @returns {JSX.Element} 洞察视图
 */
export default function InsightsView({ setView, onCreateWorkspace }) {
  const { t } = useTranslation();
  const cardTypeLabel = useCardTypeLabel();
  const claimStatusLabel = useClaimStatusLabel();
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;
    async function loadInsights() {
      setLoading(true);
      setError('');
      try {
        const payload = await api.get('/api/insights');
        if (!ignore) setInsights(payload);
      } catch {
        if (!ignore) setError(t('insights.loadError'));
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadInsights();
    return () => { ignore = true; };
  }, [t]);

  const maxGrowth = useMemo(() => {
    if (!insights) return 1;
    return Math.max(1, ...insights.growth.data);
  }, [insights]);

  const growthLabels = useMemo(() => {
    if (!insights) return [];
    return sparseLabels(insights.growth.labels);
  }, [insights]);

  const totalSources = useMemo(() => {
    if (!insights?.sourceDistribution.length) return 0;
    return insights.sourceDistribution.reduce((sum, item) => sum + item.count, 0);
  }, [insights]);

  if (loading) {
    return (
      <div className="page-main full insights-page">
        <div className="insights-header skeleton">
          <div className="skeleton-line title" />
          <div className="skeleton-line subtitle" />
        </div>
        <div className="insights-grid">
          <div className="bento-card skeleton" />
          <div className="bento-card skeleton" />
          <div className="bento-card skeleton" />
        </div>
      </div>
    );
  }

  if (error || !insights) {
    return (
      <div className="page-main full insights-page">
        <EmptyState
          icon={TrendingUp}
          title={t('insights.errorTitle')}
          body={error || t('insights.errorBody')}
        />
      </div>
    );
  }

  const totals = insights.totals;

  return (
    <div className="page-main full insights-page">
      <header className="insights-header">
        <h1>{t('insights.title')}</h1>
        <p>{t('insights.subtitle')}</p>
      </header>

      <section className="insights-metrics-grid">
        <article className="insights-metric-card">
          <Layers size={22} />
          <div>
            <strong>{totals.workspaces}</strong>
            <span>{t('insights.metric.workspaces')}</span>
          </div>
        </article>
        <article className="insights-metric-card">
          <BookOpen size={22} />
          <div>
            <strong>{totals.materials}</strong>
            <span>{t('insights.metric.materials')}</span>
          </div>
        </article>
        <article className="insights-metric-card metric-card--primary">
          <Lightbulb size={22} />
          <div>
            <strong>{totals.cards}</strong>
            <span>{t('insights.metric.cards')}</span>
          </div>
        </article>
        <article className="insights-metric-card">
          <FileText size={22} />
          <div>
            <strong>{totals.artifacts}</strong>
            <span>{t('insights.metric.artifacts')}</span>
          </div>
        </article>
      </section>

      <div className="insights-grid">
        <section className="bento-card growth-card">
          <div className="bento-head">
            <div>
              <h2>{t('insights.growthTitle')}</h2>
              <span className="bento-meta">{t('insights.growthMeta')}</span>
            </div>
            <span className="period-badge">30D</span>
          </div>
          <div className="growth-chart">
            {insights.growth.data.map((value, index) => (
              <div key={insights.growth.labels[index]} className="growth-bar-wrapper">
                <div
                  className="growth-bar"
                  style={{ height: `${(value / maxGrowth) * 100}%` }}
                  title={`${insights.growth.labels[index]}: ${value}`}
                />
                <span className="growth-label">{growthLabels[index]}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="bento-card source-card">
          <div className="bento-head">
            <div>
              <h2>{t('insights.sourceTitle')}</h2>
              <span className="bento-meta">{t('insights.sourceMeta')}</span>
            </div>
          </div>
          {insights.sourceDistribution.length === 0 ? (
            <EmptyState icon={FileText} title={t('insights.noSources')} body={t('insights.noSourcesHint')} compact />
          ) : (
            <div className="source-list">
              {insights.sourceDistribution.map((item, index) => (
                <div key={item.name} className="source-item">
                  <div className="source-info">
                    <span className="source-name">{item.name}</span>
                    <span className="source-value">{Math.round(item.ratio * 100)}%</span>
                  </div>
                  <div className="source-track">
                    <div
                      className={`source-fill type-${index % 4}`}
                      style={{ width: `${Math.round(item.ratio * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bento-card recent-card">
          <div className="bento-head">
            <div>
              <h2>{t('insights.recentTitle')}</h2>
              <span className="bento-meta">{t('insights.recentMeta')}</span>
            </div>
          </div>
          {insights.recentCards.length === 0 ? (
            <EmptyState icon={Lightbulb} title={t('insights.noCards')} body={t('insights.noCardsHint')} compact />
          ) : (
            <div className="recent-card-list">
              {insights.recentCards.map((card) => (
                <article key={card.id} className={`recent-card-item type-${card.type}`}>
                  <div className="recent-card-head">
                    <span className="recent-card-type">{cardTypeLabel(card.type)}</span>
                    <span className="recent-card-status">{claimStatusLabel(card.claimStatus)}</span>
                  </div>
                  <h3>{card.title}</h3>
                  <footer>
                    <span>{card.workspaceTitle}</span>
                    <span>{formatDate(card.createdAt)}</span>
                  </footer>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="bento-card map-card">
          <div className="map-card-content">
            <div>
              <h2>{t('insights.mapTitle')}</h2>
              <p>{t('insights.mapBody', { count: insights.mapPreview.nodeCount, kbCount: insights.mapPreview.workspaceCount })}</p>
              <button className="secondary" onClick={() => setView('maps')} type="button">
                <Map size={18} />
                {t('insights.mapAction')}
                <ArrowUpRight size={16} />
              </button>
            </div>
            <div className="map-preview">
              <div className="map-node-grid">
                {Array.from({ length: Math.min(24, Math.max(12, insights.mapPreview.nodeCount)) }).map((_, i) => (
                  <span
                    key={i}
                    className="map-preview-dot"
                    style={{ opacity: 0.3 + (i % 5) * 0.15 }}
                  />
                ))}
              </div>
              <div className="map-preview-stats">
                <span>{t('insights.mapNodes', { count: insights.mapPreview.nodeCount })}</span>
                <span>{t('insights.mapEdges', { count: insights.mapPreview.edgeCount })}</span>
              </div>
              <span className="map-preview-hint">{t('insights.mapPreviewHint')}</span>
            </div>
          </div>
        </section>
      </div>

      <AgentProposalsPanel onCreateWorkspace={onCreateWorkspace} />
    </div>
  );
}
