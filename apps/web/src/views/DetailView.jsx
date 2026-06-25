/**
 * 工作区详情视图：展示卡片、来源、实体、Roadmap 与 AI 助手面板。
 * @module views/DetailView
 */

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleX,
  Clock3,
  Filter,
  History,
  Search,
  Send,
  Sparkles,
  SquareArrowOutUpRight,
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
import SourceCitation from '../components/SourceCitation';
import TaskStatus from '../components/TaskStatus';
import AIChatShell from '../components/AIChatShell';
import { useChatLayout } from '../hooks/useChatLayout';
import { PATH_CARD_ID_STORAGE_KEY } from '../constants/options';
import { startReadingSession, flushReadingSession } from '../utils/readingTracker';

const BYTES_PER_GB = 1024 * 1024 * 1024;

const HIGHLIGHT_TIMEOUT_MS = 2000;

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
        const response = await fetch('/api/transcription/capability');
        if (!response.ok) return;
        const payload = await response.json();
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
 * @param {string} props.apiStatus - API 在线状态
 * @param {object} props.analytics - 工作区分析数据
 * @param {object} props.assistantAnswer - 助手回答对象
 * @param {string} props.assistantQuestion - 当前问题输入
 * @param {object} props.detail - 工作区详情
 * @param {boolean} props.isAsking - 是否正在提问
 * @param {object} props.latestTask - 最近任务
 * @param {Array} props.messages - 历史消息列表
 * @param {() => void} props.onAsk - 提问回调
 * @param {(artifact: object, meta?: object) => void} props.onOpenArtifact - 打开产物回调
 * @param {(newCards: object[], updatedMessage: object) => void} props.onCardsAccepted - 提议卡片采纳成功回调
 * @param {(materialId: string) => void} props.onParseMaterial - 解析资料回调
 * @param {string} props.parsingMaterialId - 正在解析的资料 ID
 * @param {string} props.selectedWorkspaceId - 当前选中工作区 ID
 * @param {(value: string) => void} props.setAssistantQuestion - 设置问题输入
 * @param {(view: string) => void} props.setView - 切换视图
 * @returns {JSX.Element} 详情视图
 */
export default function DetailView({
  apiStatus,
  analytics,
  assistantAnswer,
  assistantQuestion,
  detail,
  isAsking,
  latestTask,
  messages,
  onAsk,
  onCardsAccepted,
  onOpenArtifact,
  onParseMaterial,
  parsingMaterialId,
  selectedWorkspaceId,
  setAssistantQuestion,
  setView,
}) {
  const { t } = useTranslation();
  const cardTypeLabel = useCardTypeLabel();
  const claimStatusLabel = useClaimStatusLabel();
  const layout = useChatLayout();
  const parseStatusLabel = useParseStatusLabel();
  const intakeKindLabel = useIntakeKindLabel();
  const [feedMode, setFeedMode] = useState('feed');
  const [feedViewMode, setFeedViewMode] = useState('board');
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());
  const [feedSearch, setFeedSearch] = useState('');
  const [feedTypeFilter, setFeedTypeFilter] = useState('all');
  const [feedStatusFilter, setFeedStatusFilter] = useState('all');
  const cards = detail.cards ?? [];
  const materials = detail.materials ?? [];
  const artifacts = detail.artifacts ?? [];
  const roadmapCards = cards.slice(0, 4);
  const conceptTags = extractConceptTags(cards);
  const cardGroups = groupCardsByType(cards);
  const canAsk = apiStatus === 'online' && Boolean(selectedWorkspaceId) && !isAsking;
  const latestAnswerCards = assistantAnswer?.cards ?? [];
  const pendingSourceCount = cards.filter((card) => card.claimStatus !== 'sourced').length;
  const guideMessage = materials.length === 0
    ? t('detail.guideNoMaterials')
    : (pendingSourceCount > 0 && cards.length > 0 && pendingSourceCount / cards.length >= 0.5
        ? t('detail.guideLowSourcing', { pending: pendingSourceCount })
        : null);
  const latestCitations = assistantAnswer?.citations ?? [];
  const questionHistory = materials.filter((material) => material.type === 'question').slice(0, 3);
  const totals = analytics?.totals;
  const statusDistribution = analytics?.materialStatusDistribution?.slice(0, 4) ?? [];
  const platformDistribution = analytics?.platformDistribution?.slice(0, 4) ?? [];
  const CARD_TYPE_ORDER = ['concept', 'method', 'case', 'step', 'viewpoint', 'fact', 'question', 'general'];
  const CLAIM_STATUS_ORDER = ['ai_skeleton', 'sourced', 'verified', 'disputed'];
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

  const [entities, setEntities] = useState([]);
  const [loadingEntities, setLoadingEntities] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [entityError, setEntityError] = useState('');
  const [highlightedCardId, setHighlightedCardId] = useState(null);
  const highlightTimerRef = useRef(null);
  const [cannotAnswerFeedbackSent, setCannotAnswerFeedbackSent] = useState(false);
  const [proposedCardSelections, setProposedCardSelections] = useState(new Set());
  const [acceptingCards, setAcceptingCards] = useState(false);

  useEffect(() => {
    if (!selectedWorkspaceId) return;
    startReadingSession(selectedWorkspaceId);
    return () => {
      void flushReadingSession();
    };
  }, [selectedWorkspaceId]);

  useEffect(() => {
    setCannotAnswerFeedbackSent(false);
  }, [assistantAnswer?.question]);

  useEffect(() => {
    const proposedCards = assistantAnswer?.proposedCards ?? [];
    setProposedCardSelections(new Set(proposedCards.map((_, index) => index)));
  }, [assistantAnswer?.proposedCards]);

  useEffect(() => {
    if (!selectedWorkspaceId) return;
    let ignore = false;
    setLoadingEntities(true);
    setEntityError('');
    async function loadEntities() {
      try {
        const response = await fetch(`/api/workspaces/${selectedWorkspaceId}/entities`);
        if (!response.ok) return;
        const payload = await response.json();
        if (!ignore) setEntities(payload.entities ?? []);
      } catch {
        if (!ignore) setEntities([]);
      } finally {
        if (!ignore) setLoadingEntities(false);
      }
    }
    loadEntities();
    return () => { ignore = true; };
  }, [selectedWorkspaceId]);

  /**
   * 挂载时读取路径视图传递的卡片 ID，滚动并高亮对应卡片。
   * 依赖 cards：当卡片列表加载完成后触发，触发后清除存储键避免重复高亮。
   */
  useEffect(() => {
    const cardId = sessionStorage.getItem(PATH_CARD_ID_STORAGE_KEY);
    if (!cardId) return;
    if (cards.length === 0) return;
    sessionStorage.removeItem(PATH_CARD_ID_STORAGE_KEY);
    setHighlightedCardId(cardId);
    const element = document.getElementById(`card-${cardId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => setHighlightedCardId(null), HIGHLIGHT_TIMEOUT_MS);
  }, [cards]);

  /**
   * 点击 Roadmap 节点后滚动并高亮对应卡片。
   * @param {string} cardId - 卡片 ID
   */
  function handleRoadmapNodeClick(cardId) {
    setHighlightedCardId(cardId);
    const element = document.getElementById(`card-${cardId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => setHighlightedCardId(null), HIGHLIGHT_TIMEOUT_MS);
  }

  /**
   * 切换 Feed 分组的折叠状态。
   * @param {string} type - 卡片类型
   */
  function toggleGroup(type) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  /**
   * 切换单张提议卡片的选中状态。
   * @param {number} index - 提议卡片索引
   */
  function toggleProposedCard(index) {
    setProposedCardSelections((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  /**
   * 采纳选中的提议卡片，调用后端 API 正式落库。
   */
  async function acceptProposedCards() {
    const messageId = assistantAnswer?.messageId;
    if (!messageId || acceptingCards) return;
    const selectedIndices = Array.from(proposedCardSelections).sort((a, b) => a - b);
    if (selectedIndices.length === 0) return;
    setAcceptingCards(true);
    try {
      const response = await fetch(`/api/messages/${messageId}/accept-cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedIndices }),
      });
      if (!response.ok) return;
      const result = await response.json();
      if (onCardsAccepted) onCardsAccepted(result.cards ?? [], result.message);
    } catch {
      // 静默失败
    } finally {
      setAcceptingCards(false);
    }
  }

  /**
   * 忽略全部提议卡片，清除本地选中状态。
   */
  function dismissProposedCards() {
    setProposedCardSelections(new Set());
    if (onCardsAccepted) onCardsAccepted([], { id: assistantAnswer?.messageId });
  }

  /**
   * 渲染单张知识卡片。
   * @param {object} card - 卡片对象
   * @param {string} [extraClass] - 额外 CSS 类
   * @returns {JSX.Element}
   */
  function renderCard(card, extraClass = '') {
    return (
      <article
        id={`card-${card.id}`}
        className={`knowledge-card type-${card.type ?? 'general'} ${highlightedCardId === card.id ? 'highlighted' : ''} ${extraClass}`}
        key={card.id ?? card.title}
      >
        <div className="card-head">
          <span className="card-type-badge">{cardTypeLabel(card.type)}</span>
          {card.claimStatus === 'sourced' && (
            <span className="card-source-badge"><CheckCircle2 size={14} />{claimStatusLabel(card.claimStatus)}</span>
          )}
        </div>
        <h3>{card.title}</h3>
        <p>{card.body}</p>
        <footer>
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

  async function extractEntitiesAction() {
    if (!selectedWorkspaceId || extracting) return;
    setExtracting(true);
    setEntityError('');
    try {
      const response = await fetch(`/api/workspaces/${selectedWorkspaceId}/entities/extract`, { method: 'POST' });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setEntityError(payload.error ?? t('detail.entityExtractFailed'));
        return;
      }
      const payload = await response.json();
      setEntities(payload.entities ?? []);
    } catch {
      setEntityError(t('detail.entityNetworkError'));
    } finally {
      setExtracting(false);
    }
  }

  const ENTITY_TYPE_LABELS = {
    person: 'detail.entityType.person',
    organization: 'detail.entityType.organization',
    concept: 'detail.entityType.concept',
    tool: 'detail.entityType.tool',
    place: 'detail.entityType.location',
    event: 'detail.entityType.event',
    other: 'detail.entityType.other',
  };

  return (
    <section className={`page-grid detail-page ${layout.mode === 'floating' ? 'ai-chat-floating' : ''}`}>
      <div className="page-main">
        <p className="breadcrumb">{t('detail.breadcrumb.workspace')}{t('detail.breadcrumb.separator')}{detail.title}</p>
        <div className="page-title-row">
          <div>
            <span className="status-chip">{t('detail.inProgress')}</span>
            <h2>{detail.title}</h2>
            <p>{detail.summary}</p>
          </div>
          <div className="page-title-actions">
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
                    <button className="concept-tag" key={tag} onClick={() => setAssistantQuestion(tag)} type="button">{tag}</button>
                  ))}
                </div>
              </div>
            )}
            {materials.map((material) => (
              <article className="source-strip" key={material.id ?? material.title}>
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
      <AIChatShell layout={layout} title={t('detail.aiAssistant')}>
        <p>{t('detail.sourceOverview', { sources: detail.sourceCount ?? materials.length, cards: detail.cardCount ?? cards.length })}</p>
        {analytics && (
          <section className="source-health">
            <div>
              <strong>{t('detail.sourceHealth')}</strong>
              <span>{analytics.generatedAt ? formatTime(analytics.generatedAt) : t('detail.now')}</span>
            </div>
            <div className="health-list">
              {statusDistribution.map((item) => (
                <p key={item.name}><span>{item.name}</span><strong>{item.count}</strong></p>
              ))}
            </div>
            <div className="health-list muted">
              {platformDistribution.map((item) => (
                <p key={item.name}><span>{item.name}</span><strong>{item.count}</strong></p>
              ))}
            </div>
          </section>
        )}
        <TaskStatus task={latestTask} />
        <div className="assistant-thread">
          <div className="assistant-message">
            <Sparkles size={19} />
            <p>{artifacts[0]?.body ?? t('detail.answerHint')}</p>
          </div>
          {assistantAnswer?.question && <div className="chat-user">{assistantAnswer.question}</div>}
          {assistantAnswer?.loading && <div className="assistant-message pending"><Clock3 size={19} /><p>{t('detail.loadingAnswer')}</p></div>}
          {assistantAnswer?.error && <div className="assistant-message failed"><CircleX size={19} /><p>{assistantAnswer.error}</p></div>}
          {assistantAnswer?.message && (
            <div className="assistant-message">
              <Sparkles size={19} />
              <div>
                <p>{assistantAnswer.artifact?.body ?? assistantAnswer.message}</p>
                {latestAnswerCards.length > 0 && (
                  <div className="answer-card-list">
                    {latestAnswerCards.map((card) => (
                      <article key={card.id ?? card.title}>
                        <span>{cardTypeLabel(card.type)}</span>
                        <strong>{card.title}</strong>
                      </article>
                    ))}
                  </div>
                )}
                {assistantAnswer?.proposedCards?.length > 0 && (
                  <div className="proposed-cards-panel">
                    <div className="proposed-cards-head">
                      <strong>{t('detail.proposedCardsTitle')}</strong>
                      <span className="proposed-cards-hint">{t('detail.proposedCardsHint')}</span>
                    </div>
                    <div className="proposed-cards-list">
                      {assistantAnswer.proposedCards.map((card, index) => (
                        <label key={index} className={`proposed-card-item ${proposedCardSelections.has(index) ? 'selected' : ''}`}>
                          <input
                            type="checkbox"
                            checked={proposedCardSelections.has(index)}
                            onChange={() => toggleProposedCard(index)}
                          />
                          <span className="card-type-badge">{cardTypeLabel(card.type)}</span>
                          <div className="proposed-card-body">
                            <strong>{card.title}</strong>
                            <p>{card.body}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                    <div className="proposed-cards-actions">
                      <button
                        type="button"
                        className="proposed-cards-accept"
                        disabled={acceptingCards || proposedCardSelections.size === 0}
                        onClick={() => void acceptProposedCards()}
                      >
                        {acceptingCards ? t('detail.proposedCardsAccepting') : t('detail.proposedCardsAccept')}
                      </button>
                      <button
                        type="button"
                        className="proposed-cards-dismiss"
                        disabled={acceptingCards}
                        onClick={dismissProposedCards}
                      >
                        {t('detail.proposedCardsDismiss')}
                      </button>
                    </div>
                  </div>
                )}
                {assistantAnswer.citations && (
                  <div className="citation-list">
                    <strong>{t('detail.citations')}</strong>
                    {latestCitations.length === 0 ? (
                      <p>{t('detail.noCitations')}</p>
                    ) : latestCitations.slice(0, 6).map((citation) => (
                      <SourceCitation key={citation.id} citation={citation} cards={cards} materials={materials} />
                    ))}
                  </div>
                )}
                {assistantAnswer.artifact && (
                  <button className="assistant-link-button" onClick={() => onOpenArtifact(assistantAnswer.artifact)} type="button">
                    {t('detail.openArtifact')}
                    <SquareArrowOutUpRight size={15} />
                  </button>
                )}
                {cannotAnswerFeedbackSent ? (
                  <span className="cannot-answer-sent">{t('detail.cannotAnswered')}</span>
                ) : (
                  <button
                    className="assistant-link-button cannot-answer-btn"
                    onClick={() => {
                      fetch('/api/cannot-answer-feedback', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          workspaceId: selectedWorkspaceId,
                          question: assistantAnswer.question ?? assistantQuestion,
                        }),
                      })
                        .then(() => setCannotAnswerFeedbackSent(true))
                        .catch(() => {});
                    }}
                    type="button"
                  >
                    {t('detail.cannotAnswer')}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        {questionHistory.length > 0 && (
          <section className="question-history" aria-label={t('detail.questionHistory')}>
            <div className="question-history-head">
              <History size={16} />
              <strong>{t('detail.questionHistory')}</strong>
            </div>
            {questionHistory.map((material) => (
              <button key={material.id ?? material.title} onClick={() => setAssistantQuestion(material.rawInput ?? material.title)} type="button">
                {material.rawInput ?? material.title}
              </button>
            ))}
          </section>
        )}
        <div className="assistant-input">
          <input
            aria-label={t('detail.askPlaceholderOnline')}
            disabled={!canAsk}
            onChange={(event) => setAssistantQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') onAsk();
            }}
            placeholder={apiStatus === 'online' && selectedWorkspaceId ? t('detail.askPlaceholderOnline') : t('detail.askPlaceholderOffline')}
            value={assistantQuestion}
          />
          <button disabled={!canAsk || !assistantQuestion.trim()} onClick={onAsk} title={t('detail.askTitle')} type="button">
            <Send size={18} />
          </button>
        </div>
      </AIChatShell>
    </section>
  );
}
