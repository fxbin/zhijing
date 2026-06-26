/**
 * 洞察视图：全局认知仪表盘，展示知识增长、来源分布、最新卡片与知识地图预览。
 * @module views/InsightsView
 */

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowUpRight,
  BookOpen,
  CheckCircle,
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
 * @param {Function} [props.onSelectWorkspace] - 选中工作区回调，接收 workspaceId 参数后跳转到工作区详情
 * @param {(cardId: string, workspaceId: string) => void} [props.onSelectCard] - 选中知识卡片回调，跳转到工作区详情页高亮该卡片
 * @returns {JSX.Element} 洞察视图
 */
export default function InsightsView({ setView, onCreateWorkspace, onSelectWorkspace, onSelectCard, onOpenCardDetail }) {
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
  const evidence = insights.evidence;
  const acceptRateLabel = evidence && evidence.acceptRate != null
    ? `${Math.round(evidence.acceptRate * 100)}%`
    : '—';
  const hasEvidence = Boolean(evidence && evidence.totalProposed > 0);

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
        <article className="insights-metric-card metric-card--evidence">
          <CheckCircle size={22} />
          <div>
            <strong>{acceptRateLabel}</strong>
            <span>{t('insights.metric.acceptRate')}</span>
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
              {insights.recentCards.map((card) => {
                const handleOpen = () => onOpenCardDetail?.(card, card.workspaceTitle);
                return (
                  <article
                    key={card.id}
                    className={`recent-card-item type-${card.type} is-clickable`}
                    onClick={handleOpen}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleOpen();
                      }
                    }}
                  >
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
                );
              })}
            </div>
          )}
        </section>

        <section className="bento-card insights-map-card">
          <div className="bento-head">
            <div>
              <h2>{t('insights.mapTitle')}</h2>
              <span className="bento-meta">{t('insights.mapMeta')}</span>
            </div>
            <Map size={20} />
          </div>
          <p className="insights-map-summary">
            {t('insights.mapBody', { kbCount: insights.mapPreview.workspaceCount })}
          </p>
          {insights.mapPreview.workspaces.length === 0 ? (
            <EmptyState
              icon={Map}
              title={t('insights.noWorkspaces')}
              body={t('insights.noWorkspacesHint')}
              compact
            />
          ) : (
            <div className="workspace-preview-grid">
              {insights.mapPreview.workspaces.map((ws) => (
                <button
                  key={ws.id}
                  type="button"
                  className="workspace-preview-card"
                  onClick={() => onSelectWorkspace?.(ws.id)}
                >
                  <header className="workspace-preview-head">
                    <h3>{ws.title}</h3>
                    <span className={`workspace-stage-badge stage-${ws.stage}`}>
                      {t(`insights.workspaceStage.${ws.stage}`)}
                    </span>
                  </header>
                  <div className="workspace-preview-stats">
                    <div className="workspace-preview-stat">
                      <strong>{ws.cardCount}</strong>
                      <span>{t('insights.workspaceCards', { count: ws.cardCount })}</span>
                    </div>
                    <div className="workspace-preview-stat">
                      <strong>{Math.round(ws.sourcedRatio * 100)}%</strong>
                      <span>{t('insights.workspaceSourced')}</span>
                    </div>
                  </div>
                  <div className="workspace-preview-ratio" aria-hidden="true">
                    <div
                      className="workspace-preview-ratio-fill"
                      style={{ width: `${Math.round(ws.sourcedRatio * 100)}%` }}
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
          <div className="insights-map-stats">
            <div className="insights-map-stat">
              <strong>{insights.mapPreview.nodeCount}</strong>
              <span>{t('insights.mapNodes', { count: insights.mapPreview.nodeCount })}</span>
            </div>
            <div className="insights-map-stat">
              <strong>{insights.mapPreview.edgeCount}</strong>
              <span>{t('insights.mapEdges', { count: insights.mapPreview.edgeCount })}</span>
            </div>
          </div>
          <button className="secondary" onClick={() => setView('maps')} type="button">
            <Map size={18} />
            {t('insights.mapAction')}
            <ArrowUpRight size={16} />
          </button>
        </section>

        <section className="bento-card evidence-card">
          <div className="bento-head">
            <div>
              <h2>{t('insights.evidenceTitle')}</h2>
              <span className="bento-meta">{t('insights.evidenceMeta')}</span>
            </div>
            <CheckCircle size={20} />
          </div>
          {!hasEvidence ? (
            <EmptyState
              icon={CheckCircle}
              title={t('insights.evidenceNoData')}
              body={t('insights.evidenceNoDataHint')}
              compact
            />
          ) : (
            <div className="evidence-body">
              <p className="evidence-totals">
                {t('insights.evidenceTotals', {
                  proposed: evidence.totalProposed,
                  accepted: evidence.totalAccepted,
                  rejected: evidence.totalRejected,
                })}
              </p>
            </div>
          )}
        </section>

        <AgentProposalsPanel onCreateWorkspace={onCreateWorkspace} />
      </div>
    </div>
  );
}
