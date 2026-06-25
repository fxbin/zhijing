/**
 * 全局视图：不限定工作区，展示全库卡片、资料与产物。
 * 支持按类型、状态、关键词筛选，用于跨库浏览与发现。
 * @module views/GlobalView
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Filter, Search } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { formatDate } from '../utils/material';
import { useCardTypeLabel, useClaimStatusLabel } from '../utils/i18nLabels';
import { PATH_CARD_ID_STORAGE_KEY } from '../constants/options';

const CARD_TYPE_FILTER_OPTIONS = ['all', 'concept', 'method', 'case', 'step', 'viewpoint', 'question', 'fact', 'general'];
const CLAIM_STATUS_FILTER_OPTIONS = ['all', 'ai_skeleton', 'sourced', 'user_confirmed', 'unsupported'];
const MATERIAL_TYPE_FILTER_OPTIONS = ['all', 'link', 'text', 'question', 'topic'];
const PARSE_STATUS_FILTER_OPTIONS = ['all', 'saved', 'parsing', 'needs_review', 'ingested', 'failed'];
const GLOBAL_FETCH_LIMIT = 200;

/**
 * 全局视图组件。
 * @param {object} props - 组件属性
 * @param {(view: string) => void} props.setView - 切换视图回调
 * @returns {JSX.Element} 全局视图
 */
export default function GlobalView({ setView }) {
  const { t } = useTranslation();
  const cardTypeLabel = useCardTypeLabel();
  const claimStatusLabel = useClaimStatusLabel();
  const [activeTab, setActiveTab] = useState('cards');
  const [cards, setCards] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [artifacts, setArtifacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cardQuery, setCardQuery] = useState('');
  const [cardTypeFilter, setCardTypeFilter] = useState('all');
  const [cardClaimFilter, setCardClaimFilter] = useState('all');
  const [materialQuery, setMaterialQuery] = useState('');
  const [materialTypeFilter, setMaterialTypeFilter] = useState('all');
  const [materialStatusFilter, setMaterialStatusFilter] = useState('all');
  const [artifactQuery, setArtifactQuery] = useState('');

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    async function loadAll() {
      try {
        const [cardsRes, materialsRes, artifactsRes] = await Promise.all([
          fetch(`/api/cards?limit=${GLOBAL_FETCH_LIMIT}`).then((r) => r.ok ? r.json() : []),
          fetch(`/api/materials?limit=${GLOBAL_FETCH_LIMIT}`).then((r) => r.ok ? r.json() : []),
          fetch(`/api/artifacts?limit=${GLOBAL_FETCH_LIMIT}`).then((r) => r.ok ? r.json() : []),
        ]);
        if (!ignore) {
          setCards(Array.isArray(cardsRes) ? cardsRes : []);
          setMaterials(Array.isArray(materialsRes) ? materialsRes : []);
          setArtifacts(Array.isArray(artifactsRes) ? artifactsRes : []);
        }
      } catch {
        if (!ignore) {
          setCards([]);
          setMaterials([]);
          setArtifacts([]);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadAll();
    return () => { ignore = true; };
  }, []);

  const filteredCards = cards.filter((card) => {
    const query = cardQuery.trim().toLowerCase();
    const matchesQuery = !query || (card.title ?? '').toLowerCase().includes(query) || (card.body ?? '').toLowerCase().includes(query);
    const matchesType = cardTypeFilter === 'all' || card.type === cardTypeFilter;
    const matchesClaim = cardClaimFilter === 'all' || card.claimStatus === cardClaimFilter;
    return matchesQuery && matchesType && matchesClaim;
  });

  const filteredMaterials = materials.filter((material) => {
    const query = materialQuery.trim().toLowerCase();
    const matchesQuery = !query || (material.title ?? '').toLowerCase().includes(query) || (material.rawInput ?? '').toLowerCase().includes(query);
    const matchesType = materialTypeFilter === 'all' || material.type === materialTypeFilter;
    const matchesStatus = materialStatusFilter === 'all' || material.parseStatus === materialStatusFilter;
    return matchesQuery && matchesType && matchesStatus;
  });

  const filteredArtifacts = artifacts.filter((artifact) => {
    const query = artifactQuery.trim().toLowerCase();
    return !query || (artifact.title ?? '').toLowerCase().includes(query) || (artifact.body ?? '').toLowerCase().includes(query);
  });

  const tabs = [
    { key: 'cards', label: t('global.tabCards'), count: filteredCards.length },
    { key: 'materials', label: t('global.tabMaterials'), count: filteredMaterials.length },
    { key: 'artifacts', label: t('global.tabArtifacts'), count: filteredArtifacts.length },
  ];

  return (
    <section className="global-view">
      <header className="global-header">
        <h2>{t('global.title')}</h2>
        <p className="global-subtitle">{t('global.subtitle')}</p>
      </header>

      <div className="global-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={activeTab === tab.key ? 'active' : ''}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label} <span className="tab-count">{tab.count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <EmptyState title={t('common.loading')} />
      ) : (
        <>
          {activeTab === 'cards' && (
            <div className="global-panel">
              <div className="global-filters">
                <div className="filter-search">
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder={t('global.searchCards')}
                    value={cardQuery}
                    onChange={(e) => setCardQuery(e.target.value)}
                  />
                </div>
                <Filter size={16} />
                <select value={cardTypeFilter} onChange={(e) => setCardTypeFilter(e.target.value)}>
                  {CARD_TYPE_FILTER_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option === 'all' ? t('detail.allTypes') : cardTypeLabel(option)}
                    </option>
                  ))}
                </select>
                <select value={cardClaimFilter} onChange={(e) => setCardClaimFilter(e.target.value)}>
                  {CLAIM_STATUS_FILTER_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option === 'all' ? t('detail.allStatuses') : claimStatusLabel(option)}
                    </option>
                  ))}
                </select>
              </div>
              {filteredCards.length === 0 ? (
                <EmptyState title={t('global.noCards')} />
              ) : (
                <div className="global-card-grid">
                  {filteredCards.map((card) => (
                    <article
                      key={card.id}
                      className={`global-card-item type-${card.type ?? 'general'}`}
                      onClick={() => {
                        if (card.workspaceId) {
                          sessionStorage.setItem(PATH_CARD_ID_STORAGE_KEY, card.id);
                          setView('detail');
                        }
                      }}
                      role="button"
                      tabIndex={0}
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
                        <span>{claimStatusLabel(card.claimStatus)}</span>
                        <span>{formatDate(card.updatedAt ?? card.createdAt)}</span>
                      </footer>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'materials' && (
            <div className="global-panel">
              <div className="global-filters">
                <div className="filter-search">
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder={t('global.searchMaterials')}
                    value={materialQuery}
                    onChange={(e) => setMaterialQuery(e.target.value)}
                  />
                </div>
                <Filter size={16} />
                <select value={materialTypeFilter} onChange={(e) => setMaterialTypeFilter(e.target.value)}>
                  {MATERIAL_TYPE_FILTER_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option === 'all' ? t('detail.allTypes') : option}
                    </option>
                  ))}
                </select>
                <select value={materialStatusFilter} onChange={(e) => setMaterialStatusFilter(e.target.value)}>
                  {PARSE_STATUS_FILTER_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option === 'all' ? t('detail.allStatuses') : option}
                    </option>
                  ))}
                </select>
              </div>
              {filteredMaterials.length === 0 ? (
                <EmptyState title={t('global.noMaterials')} />
              ) : (
                <div className="global-material-list">
                  {filteredMaterials.map((material) => (
                    <article
                      key={material.id}
                      className="global-material-item"
                      onClick={() => {
                        if (material.workspaceId) {
                          setView('detail');
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="material-head">
                        <span className="material-type-badge">{material.type}</span>
                        {material.platform && <span className="material-platform">{material.platform}</span>}
                      </div>
                      <h3>{material.title}</h3>
                      <p>{material.contentText ?? material.rawInput}</p>
                      <footer>
                        <span>{material.parseStatus}</span>
                        <span>{formatDate(material.createdAt)}</span>
                      </footer>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'artifacts' && (
            <div className="global-panel">
              <div className="global-filters">
                <div className="filter-search">
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder={t('global.searchArtifacts')}
                    value={artifactQuery}
                    onChange={(e) => setArtifactQuery(e.target.value)}
                  />
                </div>
              </div>
              {filteredArtifacts.length === 0 ? (
                <EmptyState title={t('global.noArtifacts')} />
              ) : (
                <div className="global-artifact-list">
                  {filteredArtifacts.map((artifact) => (
                    <article
                      key={artifact.id}
                      className="global-artifact-item"
                      onClick={() => {
                        if (artifact.workspaceId) {
                          setView('detail');
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="artifact-head">
                        <span className="artifact-type-badge">{artifact.artifactType}</span>
                        {artifact.subtype && <span className="artifact-subtype">{artifact.subtype}</span>}
                      </div>
                      <h3>{artifact.title}</h3>
                      <p>{artifact.body}</p>
                      <footer>
                        <span>{formatDate(artifact.createdAt)}</span>
                      </footer>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
