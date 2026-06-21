/**
 * 全局资产仪表盘组件：聚合所有知识库的资料、卡片、产物和任务，支持持久化筛选。
 * @module views/GlobalAssetsDashboard
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Database, FileText, Layers } from 'lucide-react';

import AdvancedOpsTabs from '../components/AdvancedOpsTabs';
import EmptyState from '../components/EmptyState';
import { formatMaterialTime } from '../utils/material';
import { useCardTypeLabel, useClaimStatusLabel, useParseStatusLabel } from '../utils/i18nLabels';

/** 资料列表预览条数，超出后显示「显示全部」按钮。 */
const PREVIEW_LIMIT_MATERIALS = 5;

/** 卡片列表预览条数，超出后显示「显示全部」按钮。 */
const PREVIEW_LIMIT_CARDS = 5;

/** 产物列表预览条数，超出后通过「显示全部」跳转到资料库。 */
const PREVIEW_LIMIT_ARTIFACTS = 4;

/**
 * 全局资产仪表盘，展示聚合指标、筛选器和资产列表。
 * @param {object} props - 组件属性
 * @param {object} props.data - 高级运维聚合数据
 * @param {function} props.setView - 视图切换函数
 * @param {(artifact: object) => void} props.onOpenArtifact - 打开指定产物的回调，传入当前点击的产物对象
 * @returns {JSX.Element} 资产仪表盘
 */
export default function GlobalAssetsDashboard({ data, setView, onOpenArtifact }) {
  const { t } = useTranslation();
  const cardTypeLabel = useCardTypeLabel();
  const claimStatusLabel = useClaimStatusLabel();
  const parseStatusLabel = useParseStatusLabel();
  const [filterCardType, setFilterCardType] = useState('all');
  const [filterClaimStatus, setFilterClaimStatus] = useState('all');
  const [filterSort, setFilterSort] = useState('updated_desc');
  const [filterKeyword, setFilterKeyword] = useState('');
  const [filterLoaded, setFilterLoaded] = useState(false);
  const [expandedMaterials, setExpandedMaterials] = useState(false);
  const [expandedCards, setExpandedCards] = useState(false);

  useEffect(() => {
    if (filterLoaded) return;
    let ignore = false;
    async function loadAssetsFilter() {
      try {
        const response = await fetch('/api/saved-filters/assets');
        if (!response.ok) return;
        const payload = await response.json();
        const filter = payload.filter;
        if (ignore || !filter) return;
        if (filter.cardType) setFilterCardType(filter.cardType);
        if (filter.claimStatus) setFilterClaimStatus(filter.claimStatus);
        if (filter.sortKey) setFilterSort(filter.sortKey);
        if (typeof filter.keyword === 'string') setFilterKeyword(filter.keyword);
      } catch {
        // 静默降级到默认筛选
      } finally {
        if (!ignore) setFilterLoaded(true);
      }
    }
    loadAssetsFilter();
    return () => { ignore = true; };
  }, [filterLoaded]);

  useEffect(() => {
    if (!filterLoaded) return;
    const timer = setTimeout(() => {
      fetch('/api/saved-filters/assets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardType: filterCardType === 'all' ? '' : filterCardType,
          claimStatus: filterClaimStatus === 'all' ? '' : filterClaimStatus,
          sortKey: filterSort,
          keyword: filterKeyword,
        }),
      }).catch(() => {});
    }, 600);
    return () => clearTimeout(timer);
  }, [filterLoaded, filterCardType, filterClaimStatus, filterSort, filterKeyword]);

  const metrics = [
    { id: 'knowledgeBases', label: t('assets.metric.knowledgeBases'), value: data.totals.knowledgeBases, body: t('assets.metric.knowledgeBasesBody') },
    { id: 'materials', label: t('assets.metric.materials'), value: data.totals.materials, body: t('assets.metric.materialsBody') },
    { id: 'cards', label: t('assets.metric.cards'), value: data.totals.cards, body: t('assets.metric.cardsBody') },
    { id: 'artifacts', label: t('assets.metric.artifacts'), value: data.totals.artifacts, body: t('assets.metric.artifactsBody') },
    { id: 'tasks', label: t('assets.metric.tasks'), value: data.totals.tasks, body: t('assets.metric.tasksBody') },
    { id: 'sourcedCards', label: t('assets.metric.sourcedCards'), value: data.totals.sourcedCards, body: t('assets.metric.sourcedCardsBody') },
    { id: 'needsReview', label: t('assets.metric.needsReview'), value: data.totals.reviewMaterials, body: t('assets.metric.needsReviewBody') },
    { id: 'duplicateSignals', label: t('assets.metric.duplicateSignals'), value: data.totals.duplicateSignals, body: t('assets.metric.duplicateSignalsBody') },
  ];

  const CARD_TYPE_OPTIONS = ['all', 'concept', 'method', 'case', 'step', 'viewpoint', 'fact', 'question', 'general'];
  const CLAIM_STATUS_OPTIONS = ['all', 'ai_skeleton', 'sourced', 'disputed', 'verified'];
  const SORT_OPTIONS = [
    { key: 'updated_desc', label: t('assets.sort.updatedDesc') },
    { key: 'title_asc', label: t('assets.sort.titleAsc') },
  ];

  const matchesKeyword = (text) => filterKeyword.trim().length === 0
    || (text ?? '').toLowerCase().includes(filterKeyword.trim().toLowerCase());

  const filteredCards = data.allCards
    .filter((card) => filterCardType === 'all' || card.type === filterCardType)
    .filter((card) => filterClaimStatus === 'all' || card.claimStatus === filterClaimStatus)
    .filter((card) => matchesKeyword(card.title) || matchesKeyword(card.body))
    .sort((a, b) => {
      if (filterSort === 'title_asc') return (a.title ?? '').localeCompare(b.title ?? '');
      return (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '');
    });

  const filteredMaterials = data.allMaterials
    .filter((material) => matchesKeyword(material.title));

  const displayedMaterials = expandedMaterials
    ? filteredMaterials
    : filteredMaterials.slice(0, PREVIEW_LIMIT_MATERIALS);

  const displayedCards = expandedCards
    ? filteredCards
    : filteredCards.slice(0, PREVIEW_LIMIT_CARDS);

  const displayedArtifacts = data.allArtifacts.slice(0, PREVIEW_LIMIT_ARTIFACTS);

  async function resetFilter() {
    setFilterCardType('all');
    setFilterClaimStatus('all');
    setFilterSort('updated_desc');
    setFilterKeyword('');
    try {
      await fetch('/api/saved-filters/assets', { method: 'DELETE' });
    } catch {
      // 静默降级
    }
  }

  return (
    <section className="page-main full advanced-page">
      <div className="advanced-head">
        <div>
          <span>{t('assets.title')}</span>
          <h2>{t('assets.subtitle')}</h2>
          <p>{t('assets.description')}</p>
        </div>
        <button onClick={() => setView('library')} type="button">{t('assets.openLibrary')}</button>
      </div>
      <AdvancedOpsTabs active="assets" setView={setView} />

      <div className="advanced-metric-grid">
        {metrics.map((metric) => (
          <article className="advanced-metric-card" key={metric.id}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.body}</small>
          </article>
        ))}
      </div>

      <section className="assets-filter-bar">
        <div className="assets-filter-group">
          <label>
            <span>{t('assets.filter.cardType')}</span>
            <select value={filterCardType} onChange={(event) => setFilterCardType(event.target.value)}>
              {CARD_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>{option === 'all' ? t('assets.filter.all') : cardTypeLabel(option)}</option>
              ))}
            </select>
          </label>
          <label>
            <span>{t('assets.filter.claimStatus')}</span>
            <select value={filterClaimStatus} onChange={(event) => setFilterClaimStatus(event.target.value)}>
              {CLAIM_STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>{option === 'all' ? t('assets.filter.all') : claimStatusLabel(option)}</option>
              ))}
            </select>
          </label>
          <label>
            <span>{t('assets.filter.sort')}</span>
            <select value={filterSort} onChange={(event) => setFilterSort(event.target.value)}>
              {SORT_OPTIONS.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
            </select>
          </label>
          <label className="assets-filter-keyword">
            <span>{t('assets.filter.keyword')}</span>
            <input value={filterKeyword} onChange={(event) => setFilterKeyword(event.target.value)} placeholder={t('assets.search')} />
          </label>
        </div>
        <button type="button" className="assets-filter-reset" onClick={resetFilter}>{t('assets.resetFilter')}</button>
      </section>

      <div className="advanced-panel-grid">
        <section className="advanced-panel">
          <div className="panel-title">
            <Database size={20} />
            <div>
              <span>{t('assets.panel.materials')}</span>
              <h4>{t('assets.panel.materialsSubtitle')}</h4>
            </div>
          </div>
          {filteredMaterials.length === 0 ? (
            <EmptyState title={t('assets.noMaterials')} body={t('assets.noMaterialsHint')} />
          ) : (
            <>
              <div className="asset-list">
                {displayedMaterials.map((item, index) => (
                  <article key={item.id ?? `${item.title}-${index}`}>
                    <span>{item.platform ?? item.source ?? item.type ?? t('assets.materialFallback')}</span>
                    <strong>{item.title}</strong>
                    <small>{parseStatusLabel(item.parseStatus)} · {formatMaterialTime(item.createdAt)}</small>
                  </article>
                ))}
              </div>
              {filteredMaterials.length > PREVIEW_LIMIT_MATERIALS && (
                <button
                  type="button"
                  className="asset-show-all"
                  onClick={() => setExpandedMaterials((prev) => !prev)}
                >
                  {expandedMaterials ? t('compare.collapse') : t('common.showAll')}
                </button>
              )}
            </>
          )}
        </section>

        <section className="advanced-panel">
          <div className="panel-title">
            <Layers size={20} />
            <div>
              <span>{t('assets.panel.cards')}</span>
              <h4>{t('assets.panel.cardsSubtitle')}</h4>
            </div>
          </div>
          {filteredCards.length === 0 ? (
            <EmptyState title={t('assets.noCards')} body={t('assets.noCardsHint')} />
          ) : (
            <>
              <div className="asset-list">
                {displayedCards.map((card, index) => (
                  <article key={card.id ?? `${card.title}-${index}`}>
                    <span>{cardTypeLabel(card.type)}</span>
                    <strong>{card.title}</strong>
                    <small>{claimStatusLabel(card.claimStatus)}</small>
                  </article>
                ))}
              </div>
              {filteredCards.length > PREVIEW_LIMIT_CARDS && (
                <button
                  type="button"
                  className="asset-show-all"
                  onClick={() => setExpandedCards((prev) => !prev)}
                >
                  {expandedCards ? t('compare.collapse') : t('common.showAll')}
                </button>
              )}
            </>
          )}
        </section>

        <section className="advanced-panel advanced-wide-panel">
          <div className="panel-title">
            <FileText size={20} />
            <div>
              <span>{t('assets.panel.artifacts')}</span>
              <h4>{t('assets.panel.artifactsSubtitle')}</h4>
            </div>
          </div>
          {data.allArtifacts.length === 0 ? (
            <EmptyState title={t('assets.noArtifacts')} body={t('assets.noArtifactsHint')} />
          ) : (
            <>
              <div className="artifact-strip-list">
                {displayedArtifacts.map((artifact, index) => (
                  <article key={artifact.id ?? `${artifact.title}-${index}`}>
                    <div>
                      <strong>{artifact.title}</strong>
                      <span>{artifact.type ?? t('assets.artifactFallback')} · {t('assets.sectionsCount', { count: artifact.sections?.length ?? 0 })}</span>
                    </div>
                    <button onClick={() => onOpenArtifact(artifact)} type="button">{t('common.open')}</button>
                  </article>
                ))}
              </div>
              {data.allArtifacts.length > PREVIEW_LIMIT_ARTIFACTS && (
                <button
                  type="button"
                  className="asset-show-all"
                  onClick={() => setView('library')}
                >
                  {t('common.showAll')}
                </button>
              )}
            </>
          )}
        </section>
      </div>
    </section>
  );
}
