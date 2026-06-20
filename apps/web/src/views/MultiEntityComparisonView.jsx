/**
 * @module views/MultiEntityComparisonView
 * @description 多实体对比视图，按知识库粒度展示资料量、卡片量、产物量与来源健康度，
 * 并补充提取实体（卡片类型）对比、行内展开卡片明细与对比洞察。
 * @author fxbin
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Network, ShieldCheck, Layers, ChevronDown } from 'lucide-react';
import AdvancedOpsTabs from '../components/AdvancedOpsTabs';
import EmptyState from '../components/EmptyState';
import { useCardTypeLabel } from '../utils/i18nLabels';

const CARD_TYPE_KEYS = ['concept', 'method', 'case', 'step', 'viewpoint', 'fact', 'question', 'general'];
const MAX_EXPANDED_CARDS = 5;
const PERCENT_MAX = 100;

/**
 * 按卡片类型分组统计数量
 * @param {Array} cards - 卡片列表
 * @returns {Object} 各类型卡片数量映射
 */
function countCardsByType(cards) {
  const counts = Object.fromEntries(CARD_TYPE_KEYS.map((type) => [type, 0]));
  cards.forEach((card) => {
    const type = card.type ?? 'general';
    if (counts[type] !== undefined) {
      counts[type] += 1;
    } else {
      counts.general += 1;
    }
  });
  return counts;
}

/**
 * 取出某实体对应的卡片明细，最多 MAX_EXPANDED_CARDS 条
 * 优先按 knowledgeBaseId 精确匹配，无匹配时回退到全量卡片前 N 条
 * @param {Array} allCards - 全量卡片列表
 * @param {string} rowId - 实体标识
 * @returns {Array} 卡片明细列表
 */
function cardsForEntity(allCards, rowId) {
  const matched = allCards.filter((card) => card.knowledgeBaseId === rowId);
  if (matched.length > 0) {
    return matched.slice(0, MAX_EXPANDED_CARDS);
  }
  return allCards.slice(0, MAX_EXPANDED_CARDS);
}

/**
 * 计算实体的总资产数（资料 + 卡片 + 产物）
 * @param {Object} entity - 实体对象
 * @returns {number} 总资产数
 */
function totalAssets(entity) {
  return entity.materials + entity.cards + entity.artifacts;
}

/**
 * 多实体对比视图组件
 * @param {Object} props - 组件参数
 * @param {Object} props.data - 高级操作数据，包含 comparisonEntities 与 allCards
 * @param {Function} props.setView - 视图切换函数
 * @returns {JSX.Element} 多实体对比视图
 */
export default function MultiEntityComparisonView({ data, setView }) {
  const { t } = useTranslation();
  const cardTypeLabel = useCardTypeLabel();
  const rows = data.comparisonEntities;
  const [expandedId, setExpandedId] = useState(null);
  const allCards = data.allCards ?? [];
  const typeCounts = countCardsByType(allCards);
  const totalCards = allCards.length;
  const typeRows = CARD_TYPE_KEYS.map((key) => ({
    key,
    label: cardTypeLabel(key),
    count: typeCounts[key],
    sharePercent: totalCards > 0
      ? Math.round((typeCounts[key] / totalCards) * PERCENT_MAX)
      : 0,
  }));

  const topAssetEntity = rows.length
    ? rows.reduce((prev, curr) => (totalAssets(curr) > totalAssets(prev) ? curr : prev))
    : null;
  const topHealthEntity = rows.length
    ? rows.reduce((prev, curr) => (curr.health > prev.health ? curr : prev))
    : null;

  function toggleRow(id) {
    setExpandedId((current) => (current === id ? null : id));
  }

  function handleRowKeyDown(event, id) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleRow(id);
    }
  }

  return (
    <section className="page-main full advanced-page">
      <div className="advanced-head">
        <div>
          <span>Entity Comparison</span>
          <h2>Compare knowledge entities</h2>
          <p>把知识库当作第一版可比较实体，展示资料量、卡片量、产物量和来源健康度，并支持展开查看卡片明细。</p>
        </div>
        <button onClick={() => setView('synthesis')} type="button">Synthesize</button>
      </div>
      <AdvancedOpsTabs active="compare" setView={setView} />

      {rows.length === 0 ? (
        <EmptyState title="暂无可对比实体" body="创建知识库后，会自动出现第一批对比维度。" />
      ) : (
        <>
          <section className="comparison-board">
            <div className="comparison-header">
              <span>Entity</span>
              <span>Materials</span>
              <span>Cards</span>
              <span>Artifacts</span>
              <span>Source health</span>
            </div>
            {rows.flatMap((row) => {
              const items = [
                <article
                  className="comparison-row"
                  key={row.id}
                  onClick={() => toggleRow(row.id)}
                  onKeyDown={(event) => handleRowKeyDown(event, row.id)}
                  role="button"
                  tabIndex={0}
                >
                  <div>
                    <strong>{row.title}</strong>
                    <small>
                      {totalAssets(row)} total assets · {expandedId === row.id ? '点击收起' : '点击展开'}
                    </small>
                  </div>
                  <span>{row.materials}</span>
                  <span>{row.cards}</span>
                  <span>{row.artifacts}</span>
                  <div className="health-cell">
                    <div className="health-bar">
                      <span style={{ width: `${Math.min(row.health, PERCENT_MAX)}%` }} />
                    </div>
                    <small>{row.health}%</small>
                  </div>
                </article>,
              ];
              if (expandedId === row.id) {
                const cards = cardsForEntity(allCards, row.id);
                items.push(
                  <div className="asset-list" key={`${row.id}-detail`}>
                    {cards.length === 0 ? (
                      <article><small>该实体暂无卡片明细</small></article>
                    ) : (
                      cards.map((card, index) => (
                        <article
                          key={card.id ?? index}
                          className={`type-${card.type ?? 'general'}`}
                        >
                          <div className="card-head">
                            <span className="card-type-badge">
                              {cardTypeLabel(card.type)}
                            </span>
                          </div>
                          <strong>{card.title ?? '未命名卡片'}</strong>
                          <small>{card.body ?? '无正文'}</small>
                        </article>
                      ))
                    )}
                  </div>
                );
              }
              return items;
            })}
          </section>

          <section className="comparison-board">
            <div className="comparison-header">
              <span>Card type</span>
              <span>Count</span>
              <span>Share</span>
              <span aria-hidden="true" />
              <span>Distribution</span>
            </div>
            {typeRows.map((row) => (
              <article className="comparison-row" key={row.key}>
                <div>
                  <strong>{row.label}</strong>
                  <small>{row.key}</small>
                </div>
                <span>{row.count}</span>
                <span>{row.sharePercent}%</span>
                <span aria-hidden="true" />
                <div className="health-cell">
                  <div className="health-bar">
                    <span style={{ width: `${row.sharePercent}%` }} />
                  </div>
                  <small>{row.sharePercent}%</small>
                </div>
              </article>
            ))}
          </section>
        </>
      )}

      <div className="comparison-insight-grid">
        <article>
          <Layers size={20} />
          <strong>总资产最多</strong>
          <p>
            {topAssetEntity
              ? `${topAssetEntity.title}（${totalAssets(topAssetEntity)} 项）`
              : '暂无可对比实体'}
          </p>
        </article>
        <article>
          <ShieldCheck size={20} />
          <strong>来源健康度最高</strong>
          <p>
            {topHealthEntity
              ? `${topHealthEntity.title}（${topHealthEntity.health}%）`
              : '暂无可对比实体'}
          </p>
        </article>
        <article>
          <Network size={20} />
          <strong>对比口径</strong>
          <p>当前阶段按知识库粒度比较，后续可升级到人物、品牌、概念或平台实体。</p>
        </article>
        <article>
          <ChevronDown size={20} />
          <strong>行内展开</strong>
          <p>点击任意知识库行可展开查看该库的卡片明细（最多 5 条），再次点击收起。</p>
        </article>
      </div>
    </section>
  );
}
