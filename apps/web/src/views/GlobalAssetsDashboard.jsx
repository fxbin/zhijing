/**
 * 全局资产仪表盘组件：聚合所有知识库的资料、卡片、产物和任务，支持持久化筛选。
 * @module views/GlobalAssetsDashboard
 */

import { useEffect, useState } from 'react';
import { Database, FileText, Layers } from 'lucide-react';

import AdvancedOpsTabs from '../components/AdvancedOpsTabs';
import EmptyState from '../components/EmptyState';
import { statusLabels } from '../constants/labels';
import { formatMaterialTime } from '../utils/material';

/**
 * 全局资产仪表盘，展示聚合指标、筛选器和资产列表。
 * @param {object} props - 组件属性
 * @param {object} props.data - 高级运维聚合数据
 * @param {function} props.setView - 视图切换函数
 * @returns {JSX.Element} 资产仪表盘
 */
export default function GlobalAssetsDashboard({ data, setView }) {
  const [filterCardType, setFilterCardType] = useState('all');
  const [filterClaimStatus, setFilterClaimStatus] = useState('all');
  const [filterSort, setFilterSort] = useState('updated_desc');
  const [filterKeyword, setFilterKeyword] = useState('');
  const [filterLoaded, setFilterLoaded] = useState(false);

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
    { label: 'Knowledge bases', value: data.totals.knowledgeBases, body: '主题知识库' },
    { label: 'Materials', value: data.totals.materials, body: '来源资料' },
    { label: 'Cards', value: data.totals.cards, body: '结构化卡片' },
    { label: 'Artifacts', value: data.totals.artifacts, body: '生成产物' },
    { label: 'Tasks', value: data.totals.tasks, body: '近期任务' },
    { label: 'Sourced cards', value: data.totals.sourcedCards, body: '有来源支撑' },
    { label: 'Needs review', value: data.totals.reviewMaterials, body: '等待复核' },
    { label: 'Duplicate signals', value: data.totals.duplicateSignals, body: '疑似重复' },
  ];

  const CARD_TYPE_OPTIONS = ['all', 'concept', 'method', 'fact', 'question', 'general'];
  const CLAIM_STATUS_OPTIONS = ['all', 'draft', 'sourced', 'verified'];
  const SORT_OPTIONS = [
    { key: 'updated_desc', label: '最近更新' },
    { key: 'title_asc', label: '标题 A→Z' },
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
    .filter((material) => matchesKeyword(material.title))
    .slice(0, 5);

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
          <span>Global Assets</span>
          <h2>Knowledge asset dashboard</h2>
          <p>把所有知识库、来源资料、卡片、产物和任务聚合到一个资产视角，先用于盘点和发现风险。</p>
        </div>
        <button onClick={() => setView('library')} type="button">Open Library</button>
      </div>
      <AdvancedOpsTabs active="assets" setView={setView} />

      <div className="advanced-metric-grid">
        {metrics.map((metric) => (
          <article className="advanced-metric-card" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.body}</small>
          </article>
        ))}
      </div>

      <section className="assets-filter-bar">
        <div className="assets-filter-group">
          <label>
            <span>卡片类型</span>
            <select value={filterCardType} onChange={(event) => setFilterCardType(event.target.value)}>
              {CARD_TYPE_OPTIONS.map((option) => <option key={option} value={option}>{option === 'all' ? '全部' : option}</option>)}
            </select>
          </label>
          <label>
            <span>证据状态</span>
            <select value={filterClaimStatus} onChange={(event) => setFilterClaimStatus(event.target.value)}>
              {CLAIM_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option === 'all' ? '全部' : option}</option>)}
            </select>
          </label>
          <label>
            <span>排序</span>
            <select value={filterSort} onChange={(event) => setFilterSort(event.target.value)}>
              {SORT_OPTIONS.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
            </select>
          </label>
          <label className="assets-filter-keyword">
            <span>关键词</span>
            <input value={filterKeyword} onChange={(event) => setFilterKeyword(event.target.value)} placeholder="标题或正文搜索" />
          </label>
        </div>
        <button type="button" className="assets-filter-reset" onClick={resetFilter}>重置筛选</button>
      </section>

      <div className="advanced-panel-grid">
        <section className="advanced-panel">
          <div className="panel-title">
            <Database size={20} />
            <div>
              <span>Source Materials</span>
              <h4>最近资料</h4>
            </div>
          </div>
          {filteredMaterials.length === 0 ? (
            <EmptyState title="暂无资料资产" body="导入链接或文本后，会在这里汇总全局资料。" />
          ) : (
            <div className="asset-list">
              {filteredMaterials.map((item, index) => (
                <article key={item.id ?? `${item.title}-${index}`}>
                  <span>{item.platform ?? item.source ?? item.type ?? 'material'}</span>
                  <strong>{item.title}</strong>
                  <small>{statusLabels[item.parseStatus] ?? item.status ?? 'saved'} · {formatMaterialTime(item.createdAt)}</small>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="advanced-panel">
          <div className="panel-title">
            <Layers size={20} />
            <div>
              <span>Knowledge Cards</span>
              <h4>证据状态</h4>
            </div>
          </div>
          {filteredCards.length === 0 ? (
            <EmptyState title="暂无知识卡片" body="调整筛选条件或生成主题后，卡片会成为跨库操作的基础。" />
          ) : (
            <div className="asset-list">
              {filteredCards.slice(0, 5).map((card, index) => (
                <article key={card.id ?? `${card.title}-${index}`}>
                  <span>{card.type ?? 'card'}</span>
                  <strong>{card.title}</strong>
                  <small>{card.claimStatus ?? 'draft'}</small>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="advanced-panel advanced-wide-panel">
          <div className="panel-title">
            <FileText size={20} />
            <div>
              <span>Generated Artifacts</span>
              <h4>产物资产</h4>
            </div>
          </div>
          {data.allArtifacts.length === 0 ? (
            <EmptyState title="暂无生成产物" body="运行 Kit 或提问后，研究摘要、主题库和行动清单会进入这里。" />
          ) : (
            <div className="artifact-strip-list">
              {data.allArtifacts.slice(0, 4).map((artifact, index) => (
                <article key={artifact.id ?? `${artifact.title}-${index}`}>
                  <div>
                    <strong>{artifact.title}</strong>
                    <span>{artifact.type ?? 'artifact'} · {artifact.sections?.length ?? 0} sections</span>
                  </div>
                  <button onClick={() => setView('artifact')} type="button">Open</button>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
