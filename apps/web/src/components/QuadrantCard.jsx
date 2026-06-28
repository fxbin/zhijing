/**
 * 四象限卡片组件（NS-1）。
 *
 * 实现圆桌 R1 共识：
 * - Q1 核心阅读（on shelf + 深笔记）：推荐种子
 * - Q2 承诺债务（on shelf + 浅笔记）：仅主动查询时显示，**禁止主动弹窗**
 * - Q3 隐性真兴趣（off shelf + 深笔记）：推荐种子
 * - Q4 无关（off shelf + 浅笔记）：不展示
 *
 * @module components/QuadrantCard
 * @author fxbin
 */

import { Fragment } from 'react';

/**
 * 单个象限卡片。
 * @param {object} props
 * @param {string} props.title 象限标题
 * @param {string} props.description 象限描述
 * @param {Array<{bookId: string, noteDepth: {raw: number, rollingPercentile: number|null}}>} props.books 该象限的书列表
 * @param {boolean} props.isSeed 是否为推荐种子（Q1/Q3）
 * @param {string} props.emptyHint 空状态文案
 * @returns {JSX.Element}
 */
export default function QuadrantCard({ title, description, books, isSeed, emptyHint }) {
  const seedBadge = isSeed ? (
    <span className="quadrant-seed-badge" aria-label="推荐种子">
      推荐种子
    </span>
  ) : null;

  return (
    <article className={`quadrant-card ${isSeed ? 'is-seed' : ''}`}>
      <header className="quadrant-card-header">
        <h3>{title}</h3>
        {seedBadge}
      </header>
      <p className="quadrant-card-description">{description}</p>
      {books.length === 0 ? (
        <p className="quadrant-card-empty">{emptyHint}</p>
      ) : (
        <ul className="quadrant-card-list">
          {books.slice(0, 8).map((book) => {
            const percentile = book.noteDepth?.rollingPercentile;
            const percentileLabel =
              typeof percentile === 'number'
                ? `${Math.round(percentile * 100)}%`
                : '—';
            return (
              <li key={book.bookId} className="quadrant-card-item">
                <span className="quadrant-card-bookid">{book.bookId}</span>
                <span className="quadrant-card-percentile" title="在你自己的读过序列里的分位">
                  {percentileLabel}
                </span>
              </li>
            );
          })}
          {books.length > 8 ? (
            <li className="quadrant-card-more">等共 {books.length} 本</li>
          ) : null}
        </ul>
      )}
    </article>
  );
}

/**
 * 四象限 2×2 网格布局。
 * @param {object} props
 * @param {object} props.summary QuadrantSummary
 * @param {{coreReading:string, commitmentDebt:string, hiddenInterest:string, irrelevant:string}} props.labels 4 个象限的本地化标题
 * @param {{coreReading:string, commitmentDebt:string, hiddenInterest:string, irrelevant:string}} props.descriptions 4 个象限的本地化描述
 * @param {{coreReading:string, commitmentDebt:string, hiddenInterest:string, irrelevant:string}} props.emptyHints 4 个象限的空状态文案
 * @returns {JSX.Element}
 */
export function QuadrantGrid({ summary, labels, descriptions, emptyHints }) {
  if (!summary) {
    return <p className="quadrant-grid-empty">尚未生成四象限</p>;
  }
  const cards = [
    {
      kind: 'coreReading',
      title: labels.coreReading,
      description: descriptions.coreReading,
      books: summary.coreReading,
      isSeed: true,
      emptyHint: emptyHints.coreReading,
    },
    {
      kind: 'commitmentDebt',
      title: labels.commitmentDebt,
      description: descriptions.commitmentDebt,
      books: summary.commitmentDebt,
      isSeed: false,
      emptyHint: emptyHints.commitmentDebt,
    },
    {
      kind: 'hiddenInterest',
      title: labels.hiddenInterest,
      description: descriptions.hiddenInterest,
      books: summary.hiddenInterest,
      isSeed: true,
      emptyHint: emptyHints.hiddenInterest,
    },
    {
      kind: 'irrelevant',
      title: labels.irrelevant,
      description: descriptions.irrelevant,
      books: [],
      isSeed: false,
      emptyHint: `${summary.irrelevant} 本`,
    },
  ];

  return (
    <Fragment>
      {summary.insufficientData && (
        <p className="quadrant-grid-warning" role="status">
          你的阅读数据尚不充分，分位数为估算值，仅供参考。
        </p>
      )}
      <div className="quadrant-grid">
        {cards.map((card) => (
          <QuadrantCard
            key={card.kind}
            title={card.title}
            description={card.description}
            books={card.books}
            isSeed={card.isSeed}
            emptyHint={card.emptyHint}
          />
        ))}
      </div>
    </Fragment>
  );
}