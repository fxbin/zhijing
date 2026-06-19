/**
 * @module views/MultiEntityComparisonView
 * @description 多实体对比视图，按知识库粒度展示资料量、卡片量、产物量与来源健康度。
 */

import { Network, ShieldCheck } from 'lucide-react';
import AdvancedOpsTabs from '../components/AdvancedOpsTabs';
import EmptyState from '../components/EmptyState';

/**
 * 多实体对比视图组件
 * @param {Object} props - 组件参数
 * @param {Object} props.data - 高级操作数据，包含 comparisonEntities
 * @param {Function} props.setView - 视图切换函数
 * @returns {JSX.Element} 多实体对比视图
 */
export default function MultiEntityComparisonView({ data, setView }) {
  const rows = data.comparisonEntities;

  return (
    <section className="page-main full advanced-page">
      <div className="advanced-head">
        <div>
          <span>Entity Comparison</span>
          <h2>Compare knowledge entities</h2>
          <p>把知识库当作第一版可比较实体，展示资料量、卡片量、产物量和来源健康度。</p>
        </div>
        <button onClick={() => setView('synthesis')} type="button">Synthesize</button>
      </div>
      <AdvancedOpsTabs active="compare" setView={setView} />

      {rows.length === 0 ? (
        <EmptyState title="暂无可对比实体" body="创建知识库后，会自动出现第一批对比维度。" />
      ) : (
        <section className="comparison-board">
          <div className="comparison-header">
            <span>Entity</span>
            <span>Materials</span>
            <span>Cards</span>
            <span>Artifacts</span>
            <span>Source health</span>
          </div>
          {rows.map((row) => (
            <article className="comparison-row" key={row.id}>
              <div>
                <strong>{row.title}</strong>
                <small>{row.materials + row.cards + row.artifacts} total assets</small>
              </div>
              <span>{row.materials}</span>
              <span>{row.cards}</span>
              <span>{row.artifacts}</span>
              <div className="health-cell">
                <div className="health-bar"><span style={{ width: `${Math.min(row.health, 100)}%` }} /></div>
                <small>{row.health}%</small>
              </div>
            </article>
          ))}
        </section>
      )}

      <div className="comparison-insight-grid">
        <article>
          <ShieldCheck size={20} />
          <strong>对比口径</strong>
          <p>当前阶段按知识库粒度比较，后续可升级到人物、品牌、概念或平台实体。</p>
        </article>
        <article>
          <Network size={20} />
          <strong>下一步综合</strong>
          <p>对比结果可以作为跨库综合的输入，生成差异、共性和待验证问题。</p>
        </article>
      </div>
    </section>
  );
}
