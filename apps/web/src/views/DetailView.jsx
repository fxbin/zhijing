/**
 * 工作区详情视图：展示卡片、来源、实体、Roadmap 与工作区分析。
 * @module views/DetailView
 */

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { formatDate, formatTime, materialMediaUrls } from '../utils/material';
import { formatPercent } from '../utils/format';
import { extractConceptTags, groupCardsByType } from '../utils/knowledge';
import { useCardTypeLabel, useClaimStatusLabel, useIntakeKindLabel, useParseStatusLabel } from '../utils/i18nLabels';
import EmptyState from '../components/EmptyState';
import EvidenceToolsPanel from '../components/EvidenceToolsPanel';
import MediaPreview from '../components/MediaPreview';
import RelatedSuggestionsPanel from '../components/RelatedSuggestionsPanel';
import TaskStatus from '../components/TaskStatus';
import { useDetailFeedState } from '../hooks/useDetailFeedState';
import { useDetailEntitiesState } from '../hooks/useDetailEntitiesState';
import { startReadingSession, flushReadingSession } from '../utils/readingTracker';
import api from '../utils/api';
import { CHAT_OPEN_EVENT } from '../constants/options';

const BYTES_PER_GB = 1024 * 1024 * 1024;

/**
 * 知识卡片类型在 Feed 中的展示顺序。
 */
const CARD_TYPE_ORDER = ['concept', 'method', 'case', 'step', 'viewpoint', 'fact', 'question', 'general'];

/**
 * 主张状态在筛选器中的展示顺序。
 */
const CLAIM_STATUS_ORDER = ['ai_skeleton', 'sourced', 'verified', 'disputed'];

/**
 * 实体类型到 i18n key 的映射。
 */
const ENTITY_TYPE_LABELS = {
  person: 'detail.entityType.person',
  organization: 'detail.entityType.organization',
  concept: 'detail.entityType.concept',
  tool: 'detail.entityType.tool',
  place: 'detail.entityType.location',
  event: 'detail.entityType.event',
  other: 'detail.entityType.other',
};

/**
 * 资料视频字幕面板：展示转写状态，并在跳过时提供机器能力检测报告。
 * @param {object} props - 组件属性
 * @param {object} props.material - 资料对象
 * @returns {JSX.Element | null} 字幕面板
 */
function MaterialTranscriptPanel({ material }) {
  const { t } = useTranslation();
  const [report, setReport] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);

  useEffect(() => {
    if (material.transcriptStatus !== 'skipped' || report) {
      return;
    }
    let ignore = false;
    setLoadingReport(true);
    async function loadReport() {
      try {
        const payload = await api.get('/api/transcription/capability');
        if (!ignore) setReport(payload);
      } catch {
        // 静默失败，保持无报告状态
      } finally {
        if (!ignore) setLoadingReport(false);
      }
    }
    loadReport();
    return () => { ignore = true; };
  }, [material.transcriptStatus, report]);

  if (!material.transcriptStatus) {
    return null;
  }

  return (
    <div className="material-transcript">
      <strong>{t('detail.transcriptTitle')}</strong>
      {material.transcriptStatus === 'pending' && <p className="transcript-pending">{t('detail.transcriptPending')}</p>}
      {material.transcriptStatus === 'done' && (
        <>
          <p className="transcript-meta">{t('detail.transcriptFromVideo')}</p>
          <p className="transcript-body">{material.transcript || t('detail.transcriptEmpty')}</p>
        </>
      )}
      {material.transcriptStatus === 'failed' && (
        <p className="transcript-error">{t('detail.transcriptFailed')}：{material.transcriptError}</p>
      )}
      {material.transcriptStatus === 'skipped' && (
        <>
          <p className="transcript-skipped">{t('detail.transcriptSkipped')}</p>
          <button
            type="button"
            className="transcript-report-toggle"
            onClick={() => setShowReport((prev) => !prev)}
            disabled={loadingReport}
          >
            {showReport ? t('detail.hideTranscriptReport') : t('detail.showTranscriptReport')}
          </button>
          {showReport && report && (
            <ul className="transcript-report">
              <li>{t('detail.transcriptReportPlatform')}：{report.platform}</li>
              <li>{t('detail.transcriptReportFfmpeg')}：{report.ffmpegAvailable ? t('detail.transcriptReportDetected') : t('detail.transcriptReportMissing')}</li>
              <li>
                {t('detail.transcriptReportWhisper')}：
                {report.whisperAvailable
                  ? `${t('detail.transcriptReportDetected')}（${report.whisperCommand}）`
                  : t('detail.transcriptReportMissing')}
              </li>
              <li>{t('detail.transcriptReportCpu')}：{report.cpuCores} {t('detail.transcriptReportCores')}</li>
              <li>{t('detail.transcriptReportMemory')}：{(report.totalMemoryBytes / BYTES_PER_GB).toFixed(1)} GB</li>
              {report.reasons?.length > 0 && (
                <li className="transcript-report-reasons">
                  {t('detail.transcriptReportReasons')}：
                  <ul>
                    {report.reasons.map((reason, index) => (
                      <li key={index}>{reason}</li>
                    ))}
                  </ul>
                </li>
              )}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

/**
 * 工作区详情视图。
 * @param {object} props - 组件属性
 * @param {object} props.analytics - 工作区分析数据
 * @param {object} props.detail - 工作区详情
 * @param {object} props.latestTask - 最近任务
 * @param {(materialId: string) => void} props.onParseMaterial - 解析资料回调
 * @param {string} props.parsingMaterialId - 正在解析的资料 ID
 * @param {string} props.selectedWorkspaceId - 当前选中工作区 ID
 * @param {(value: string) => void} props.setAssistantQuestion - 设置助手问题输入（概念标签唤起胶囊用）
 * @param {(view: string) => void} props.setView - 切换视图
 * @returns {JSX.Element} 详情视图
 */
export default function DetailView({
  analytics,
  detail,
  latestTask,
  onOpenCardDetail,
  onParseMaterial,
  parsingMaterialId,
  selectedWorkspaceId,
  setAssistantQuestion,
  setView,
}) {
  const { t } = useTranslation();
  const cardTypeLabel = useCardTypeLabel();
  const claimStatusLabel = useClaimStatusLabel();
  const parseStatusLabel = useParseStatusLabel();
  const intakeKindLabel = useIntakeKindLabel();

  const cards = detail.cards ?? [];
  const materials = detail.materials ?? [];

  const [highlightedMaterialId, setHighlightedMaterialId] = useState(null);
  const materialHighlightTimerRef = useRef(null);

  useEffect(() => {
    const materialId = sessionStorage.getItem('zhijing:pathMaterialId');
    if (!materialId) return;
    if (materials.length === 0) return;
    sessionStorage.removeItem('zhijing:pathMaterialId');
    setHighlightedMaterialId(materialId);
    const element = document.getElementById(`material-${materialId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (materialHighlightTimerRef.current) clearTimeout(materialHighlightTimerRef.current);
    materialHighlightTimerRef.current = setTimeout(() => setHighlightedMaterialId(null), 2000);
    return () => {
      if (materialHighlightTimerRef.current) clearTimeout(materialHighlightTimerRef.current);
    };
  }, [materials]);

  const {
    feedMode,
    setFeedMode,
    feedViewMode,
    setFeedViewMode,
    collapsedGroups,
    feedSearch,
    setFeedSearch,
    feedTypeFilter,
    setFeedTypeFilter,
    feedStatusFilter,
    setFeedStatusFilter,
    highlightedCardId,
    toggleGroup,
    handleRoadmapNodeClick,
  } = useDetailFeedState({ cards });

  const {
    entities,
    loadingEntities,
    extracting,
    entityError,
    extractEntitiesAction,
  } = useDetailEntitiesState({
    selectedWorkspaceId,
    t,
  });

  const roadmapCards = cards.slice(0, 4);
  const conceptTags = extractConceptTags(cards);
  const cardGroups = groupCardsByType(cards);
  const pendingSourceCount = cards.filter((card) => card.claimStatus !== 'sourced').length;
  const guideMessage = materials.length === 0
    ? t('detail.guideNoMaterials')
    : (pendingSourceCount > 0 && cards.length > 0 && pendingSourceCount / cards.length >= 0.5
        ? t('detail.guideLowSourcing', { pending: pendingSourceCount })
        : null);
  const totals = analytics?.totals;
  const statusDistribution = analytics?.materialStatusDistribution?.slice(0, 4) ?? [];
  const platformDistribution = analytics?.platformDistribution?.slice(0, 4) ?? [];
  const sortedGroupEntries = CARD_TYPE_ORDER
    .filter((type) => (cardGroups[type]?.length ?? 0) > 0)
    .map((type) => [type, cardGroups[type]]);

  const filteredCards = cards.filter((card) => {
    const searchTerm = feedSearch.trim().toLowerCase();
    const matchesSearch = !searchTerm
      || (card.title ?? '').toLowerCase().includes(searchTerm)
      || (card.body ?? '').toLowerCase().includes(searchTerm);
    const matchesType = feedTypeFilter === 'all' || card.type === feedTypeFilter;
    const matchesStatus = feedStatusFilter === 'all' || card.claimStatus === feedStatusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });
  const filteredCardGroups = groupCardsByType(filteredCards);
  const filteredSortedGroupEntries = CARD_TYPE_ORDER
    .filter((type) => (filteredCardGroups[type]?.length ?? 0) > 0)
    .map((type) => [type, filteredCardGroups[type]]);

  useEffect(() => {
    if (!selectedWorkspaceId) return;
    startReadingSession(selectedWorkspaceId);
    return () => {
      void flushReadingSession();
    };
  }, [selectedWorkspaceId]);

  /**
   * 概念标签点击：填入助手问题输入并唤起全局 AI 助手胶囊。
   * @param {string} tag - 概念标签文本
   * @author fxbin
   */
  function handleConceptTagClick(tag) {
    setAssistantQuestion(tag);
    window.dispatchEvent(new CustomEvent(CHAT_OPEN_EVENT));
  }

  /**
   * 渲染单张知识卡片。
   * @param {object} card - 卡片对象
   * @param {string} [extraClass] - 额外 CSS 类
   * @returns {JSX.Element}
   */
  function renderCard(card, extraClass = '') {
    const cardKey = card.id ?? card.title;
    const handleOpen = () => onOpenCardDetail?.(card);
    return (
      <article
        id={`card-${card.id}`}
        className={`knowledge-card type-${card.type ?? 'general'} ${highlightedCardId === card.id ? 'highlighted' : ''} ${extraClass} is-clickable`}
        key={cardKey}
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
        <div className="card-head">
          <span className="card-type-badge">{cardTypeLabel(card.type)}</span>
          {card.claimStatus === 'sourced' && (
            <span className="card-source-badge"><CheckCircle2 size={14} />{claimStatusLabel(card.claimStatus)}</span>
          )}
        </div>
        <h3>{card.title}</h3>
        <p>{card.body}</p>
        <footer onClick={(e) => e.stopPropagation()}>
          <span>{claimStatusLabel(card.claimStatus)} · {card.updatedAt ? formatDate(card.updatedAt) : t('detail.today')}</span>
          {card.claimStatus !== 'sourced' && (
            <button
              type="button"
              className="card-source-action"
              onClick={() => setView('library')}
            >
              {t('detail.guideAction')}
            </button>
          )}
        </footer>
      </article>
    );
  }

  return (
    <section className="page-grid detail-page">
      <div className="page-main">
        <p className="breadcrumb">{t('detail.breadcrumb.workspace')}{t('detail.breadcrumb.separator')}{detail.title}</p>
        <div className="page-title-row">
          <div>
            <span className="status-chip">{t('detail.inProgress')}</span>
            <h2>{detail.title}</h2>
            <p>{detail.summary}</p>
          </div>
          <div className="page-title-actions">
            <button
              type="button"
              className="detail-back-overview"
              onClick={() => {
                try {
                  sessionStorage.removeItem('zhijing:pathMaterialId');
                  sessionStorage.removeItem('zhijing:pathCardId');
                } catch {
                  // 静默降级
                }
                setView('workspace');
              }}
            >
              <ArrowLeft size={16} />
              {t('detail.backToOverview')}
            </button>
            <button onClick={() => setView('workflow')} type="button">{t('detail.runKit')}</button>
          </div>
        </div>
        {guideMessage && (
          <aside className="detail-guide" role="status" aria-label={t('detail.guideTitle')}>
            <span className="detail-guide-text">{guideMessage}</span>
            <button type="button" onClick={() => setView('library')} className="detail-guide-action">
              {t('detail.guideAction')}
            </button>
          </aside>
        )}
        {analytics && (
          <section className="detail-metrics" aria-label={t('detail.metrics')}>
            <article>
              <span>{t('detail.metric.sources')}</span>
              <strong>{totals?.materials ?? materials.length}</strong>
            </article>
            <article>
              <span>{t('detail.metric.cards')}</span>
              <strong>{totals?.cards ?? cards.length}</strong>
            </article>
            <article>
              <span>{t('detail.metric.sourced')}</span>
              <strong>{formatPercent(analytics.sourcedRatio)}</strong>
            </article>
            <article>
              <span>{t('detail.metric.tasks')}</span>
              <strong>{totals?.tasks ?? 0}</strong>
            </article>
          </section>
        )}
        {cards.length > 0 && (
          <section className="detail-analysis" aria-label={t('detail.analysis')}>
            <div className="analysis-head">
              <BarChart3 size={18} />
              <strong>{t('detail.typeDistribution')}</strong>
            </div>
            <div className="analysis-bars">
              {Object.entries(cardGroups).map(([type, group]) => {
                const ratio = cards.length > 0 ? Math.round((group.length / cards.length) * 100) : 0;
                return (
                  <div className="analysis-bar-row" key={type}>
                    <span className={`analysis-bar-label type-${type}`}>{cardTypeLabel(type)}</span>
                    <div className="analysis-bar-track">
                      <div className={`analysis-bar-fill type-${type}`} style={{ width: `${ratio}%` }} />
                    </div>
                    <span className="analysis-bar-count">{t('detail.analysisBarCount', { count: group.length, ratio })}</span>
                  </div>
                );
              })}
            </div>
            <div className="analysis-coverage">
              <span>{t('detail.coverage')}</span>
              <strong>{formatPercent(cards.length > 0 ? cards.filter((card) => card.claimStatus === 'sourced').length / cards.length : 0)}</strong>
              <small>{t('detail.sourcedCount', { sourced: cards.filter((card) => card.claimStatus === 'sourced').length, total: cards.length })}</small>
            </div>
          </section>
        )}
        {analytics && (
          <section className="source-health" aria-label={t('detail.sourceHealth')}>
            <header className="source-health-head">
              <span className="source-health-title">
                <ShieldCheck size={18} />
                <strong>{t('detail.sourceHealth')}</strong>
              </span>
              <span className="source-health-meta">
                {analytics.generatedAt ? formatTime(analytics.generatedAt) : t('detail.now')}
              </span>
            </header>
            <p className="source-health-hint">{t('detail.sourceHealthHint')}</p>
            {statusDistribution.length === 0 && platformDistribution.length === 0 ? (
              <p className="source-health-empty">{t('detail.sourceHealthEmpty')}</p>
            ) : (
              <>
                {statusDistribution.length > 0 && (
                  <div className="source-health-block">
                    <small className="source-health-block-label">{t('detail.statusDistribution')}</small>
                    <div className="source-health-bars">
                      {statusDistribution.map((item) => {
                        const total = statusDistribution.reduce((sum, it) => sum + it.count, 0);
                        const ratio = total > 0 ? Math.round((item.count / total) * 100) : 0;
                        const statusKey = item.name || 'unknown';
                        return (
                          <div className="source-health-bar-row" key={item.name}>
                            <span className="source-health-bar-label">{parseStatusLabel(statusKey)}</span>
                            <div className="source-health-bar-track">
                              <div
                                className={`source-health-bar-fill status-${statusKey}`}
                                style={{ width: `${ratio}%` }}
                              />
                            </div>
                            <span className="source-health-bar-count">
                              <strong>{item.count}</strong>
                              <small>{ratio}%</small>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {platformDistribution.length > 0 && (
                  <div className="source-health-block">
                    <small className="source-health-block-label">{t('detail.platformDistribution')}</small>
                    <div className="source-health-chips">
                      {platformDistribution.map((item) => (
                        <span className="source-health-chip" key={item.name}>
                          <span className="source-health-chip-name">{item.name || 'unknown'}</span>
                          <span className="source-health-chip-count">{item.count}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        )}
        <TaskStatus task={latestTask} />
        {selectedWorkspaceId && cards.length > 0 && (
          <EvidenceToolsPanel workspaceId={selectedWorkspaceId} />
        )}
        <div className="detail-layout">
          <aside className="roadmap">
            <h3>{t('detail.roadmap')}</h3>
            {roadmapCards.map((card, index) => (
              <div
                className={`roadmap-node ${index === 0 ? 'active' : ''} ${card.claimStatus === 'sourced' ? 'done' : ''}`}
                key={card.id ?? card.title}
                onClick={() => handleRoadmapNodeClick(card.id)}
                onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') handleRoadmapNodeClick(card.id); }}
                role="button"
                tabIndex={0}
                title={t('detail.roadmapNodeTitle')}
              >
                <span className="roadmap-index">{index + 1}</span>
                <div className="roadmap-body">
                  <strong>{card.title}</strong>
                  <small>{card.claimStatus === 'sourced' ? claimStatusLabel('sourced') : t('detail.pendingSource')}</small>
                </div>
              </div>
            ))}
          </aside>
          <RelatedSuggestionsPanel
            workspaceId={selectedWorkspaceId}
            currentCardId={highlightedCardId}
            onCardClick={handleRoadmapNodeClick}
          />
          <section className="entity-panel">
            <div className="panel-title">
              <Users size={20} />
              <div>
                <span>{t('detail.entities')}</span>
                <h4>{t('detail.entityList')}</h4>
              </div>
              <button
                className="entity-extract-btn"
                type="button"
                onClick={extractEntitiesAction}
                disabled={extracting || cards.length === 0}
                title={cards.length === 0 ? t('detail.extractEntitiesDisabled') : t('detail.extractEntities')}
              >
                {extracting ? t('detail.extracting') : t('detail.extractEntities')}
              </button>
            </div>
            {entityError && <p className="entity-error">{entityError}</p>}
            {loadingEntities ? (
              <p className="entity-empty">{t('common.loading')}</p>
            ) : entities.length === 0 ? (
              <p className="entity-empty">{t('detail.noEntities')}</p>
            ) : (
              <ul className="entity-list">
                {entities.map((entity) => (
                  <li key={entity.id} className="entity-item">
                    <div className="entity-head">
                      <strong>{entity.name}</strong>
                      <span className="entity-type-badge">{ENTITY_TYPE_LABELS[entity.type] ? t(ENTITY_TYPE_LABELS[entity.type]) : entity.type}</span>
                    </div>
                    <p>{entity.description}</p>
                    <small>{t('detail.mentionedInCards', { count: entity.sourceCardIds.length })}</small>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="feed">
            <div className="tabs">
              <button className={feedMode === 'feed' ? 'active' : ''} onClick={() => setFeedMode('feed')} type="button">{t('detail.structuredFeed')}</button>
              <button className={feedMode === 'cluster' ? 'active' : ''} onClick={() => setFeedMode('cluster')} type="button">{t('detail.connections')}</button>
            </div>
            {cards.length === 0 ? (
              <EmptyState title={t('detail.noCards')} body={t('detail.noCardsHint')} />
            ) : (
              <>
                <div className="feed-controls">
                  <div className="feed-filters">
                    <label className="feed-search">
                      <Search size={16} />
                      <input
                        placeholder={t('detail.searchCards')}
                        type="text"
                        value={feedSearch}
                        onChange={(event) => setFeedSearch(event.target.value)}
                      />
                    </label>
                    <label className="feed-filter-select">
                      <Filter size={14} />
                      <select value={feedTypeFilter} onChange={(event) => setFeedTypeFilter(event.target.value)}>
                        <option value="all">{t('detail.allTypes')}</option>
                        {CARD_TYPE_ORDER.map((type) => (
                          <option key={type} value={type}>{cardTypeLabel(type)}</option>
                        ))}
                      </select>
                    </label>
                    <label className="feed-filter-select">
                      <CheckCircle2 size={14} />
                      <select value={feedStatusFilter} onChange={(event) => setFeedStatusFilter(event.target.value)}>
                        <option value="all">{t('detail.allStatuses')}</option>
                        {CLAIM_STATUS_ORDER.map((status) => (
                          <option key={status} value={status}>{claimStatusLabel(status)}</option>
                        ))}
                      </select>
                    </label>
                    {feedMode === 'feed' && (
                      <div className="feed-view-toggle">
                        <button className={feedViewMode === 'board' ? 'active' : ''} onClick={() => setFeedViewMode('board')} type="button">{t('detail.boardView')}</button>
                        <button className={feedViewMode === 'grouped' ? 'active' : ''} onClick={() => setFeedViewMode('grouped')} type="button">{t('detail.groupedView')}</button>
                        <button className={feedViewMode === 'list' ? 'active' : ''} onClick={() => setFeedViewMode('list')} type="button">{t('detail.listView')}</button>
                      </div>
                    )}
                  </div>
                  {feedMode === 'feed' && (
                    <div className="feed-type-distribution">
                      {filteredSortedGroupEntries.map(([type, group]) => {
                        const ratio = filteredCards.length > 0 ? Math.round((group.length / filteredCards.length) * 100) : 0;
                        return (
                          <div
                            key={type}
                            className={`feed-dist-segment type-${type}`}
                            style={{ width: `${ratio}%` }}
                            title={t('detail.distributionTooltip', { label: cardTypeLabel(type), count: group.length, ratio })}>
                            <span className="feed-dist-label">{cardTypeLabel(type)}</span>
                            <span className="feed-dist-count">{group.length}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                {feedMode === 'feed' ? (
                  <>
                    {feedViewMode === 'board' ? (
                      <div className="feed-board">
                        {filteredSortedGroupEntries.map(([type, group]) => (
                          <section className="feed-column" key={type}>
                            <header className="feed-column-head">
                              <i className={`feed-column-dot ${type}`} />
                              <strong>{cardTypeLabel(type)}</strong>
                              <small>{group.length}</small>
                            </header>
                            <div className="feed-column-body">
                              {group.map((card) => renderCard(card, 'compact'))}
                            </div>
                          </section>
                        ))}
                      </div>
                    ) : feedViewMode === 'grouped' ? (
                      <div className="feed-groups">
                        {filteredSortedGroupEntries.map(([type, group]) => {
                          const isCollapsed = collapsedGroups.has(type);
                          return (
                            <section className="feed-group" key={type}>
                              <header className="feed-group-head" onClick={() => toggleGroup(type)}>
                                <div>
                                  <i className={`feed-group-dot ${type}`} />
                                  <strong>{cardTypeLabel(type)}</strong>
                                  <small>{t('detail.cardCount', { count: group.length })}</small>
                                </div>
                                {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                              </header>
                              {!isCollapsed && (
                                <div className="feed-group-body">
                                  {group.map((card) => renderCard(card))}
                                </div>
                              )}
                            </section>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="feed-list">
                        {filteredCards.map((card) => renderCard(card))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="card-cluster">
                    {filteredSortedGroupEntries.map(([type, group]) => (
                      <section className="cluster-group" key={type}>
                        <header className="cluster-head">
                          <i className={`cluster-type-dot ${type}`} />
                          <strong>{cardTypeLabel(type)}</strong>
                          <small>{t('detail.cardCount', { count: group.length })}</small>
                        </header>
                        {group.map((card) => (
                          <article className={`knowledge-card type-${type}`} key={card.id ?? card.title}>
                            <div className="card-head">
                              <span className="card-type-badge">{cardTypeLabel(card.type)}</span>
                              {card.claimStatus === 'sourced' && (
                                <span className="card-source-badge"><CheckCircle2 size={14} />{claimStatusLabel(card.claimStatus)}</span>
                              )}
                            </div>
                            <h3>{card.title}</h3>
                            <p>{card.body}</p>
                          </article>
                        ))}
                      </section>
                    ))}
                  </div>
                )}
              </>
            )}
            {cards.length > 0 && conceptTags.length > 0 && (
              <div className="concept-tags">
                <div className="concept-tags-head">
                  <Sparkles size={16} />
                  <strong>{t('detail.relatedConcepts')}</strong>
                </div>
                <div className="concept-tag-list">
                  {conceptTags.map((tag) => (
                    <button className="concept-tag" key={tag} onClick={() => handleConceptTagClick(tag)} type="button">{tag}</button>
                  ))}
                </div>
              </div>
            )}
            {materials.map((material) => (
              <article className={`source-strip${highlightedMaterialId === material.id ? ' highlighted' : ''}`} id={`material-${material.id}`} key={material.id ?? material.title}>
                <BookOpen size={22} />
                <div>
                  <strong>{material.title}</strong>
                  <span>
                    {material.platform ?? intakeKindLabel(material.type)} · {parseStatusLabel(material.parseStatus)}
                    {materialMediaUrls(material).length > 0 ? ` · ${t('detail.mediaCount', { count: materialMediaUrls(material).length })}` : ''}
                  </span>
                  <MediaPreview urls={materialMediaUrls(material)} compact />
                  <MaterialTranscriptPanel material={material} />
                </div>
                {material.type === 'link' && (
                  <button
                    disabled={parsingMaterialId === material.id || material.parseStatus === 'parsing' || material.parseStatus === 'ingested'}
                    onClick={() => onParseMaterial(material.id)}
                    type="button"
                  >
                    {material.parseStatus === 'failed' ? t('detail.retryButton') : material.parseStatus === 'ingested' ? t('detail.parsedButton') : t('detail.parseButton')}
                  </button>
                )}
              </article>
            ))}
          </section>
        </div>
        {materials.length === 0 && <EmptyState title={t('detail.noMaterials')} body={t('detail.noMaterialsHint')} />}
      </div>
    </section>
  );
}
