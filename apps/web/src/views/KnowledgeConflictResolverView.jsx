/**
 * @module views/KnowledgeConflictResolverView
 * @description 知识冲突解决视图，集中展示重复卡片与资料，支持选择保留项并合并删除重复项。
 */

import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import AdvancedOpsTabs from '../components/AdvancedOpsTabs';
import EmptyState from '../components/EmptyState';

/**
 * 知识冲突解决视图组件
 * @param {Object} props - 组件参数
 * @param {Object} props.data - 高级操作数据
 * @param {Function} props.setView - 视图切换函数
 * @returns {JSX.Element} 知识冲突解决视图
 */
export default function KnowledgeConflictResolverView({ data, setView }) {
  const [groups, setGroups] = useState([]);
  const [auditEntries, setAuditEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(null);
  const [keepMap, setKeepMap] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadConflicts() {
      setLoading(true);
      setError('');
      try {
        const [groupsRes, auditRes] = await Promise.all([
          fetch('/api/conflicts/groups'),
          fetch('/api/conflicts/audit'),
        ]);
        if (!groupsRes.ok || !auditRes.ok) throw new Error('加载冲突数据失败');
        const groupsData = await groupsRes.json();
        const auditData = await auditRes.json();
        if (cancelled) return;
        setGroups(groupsData.groups ?? []);
        setAuditEntries(auditData.entries ?? []);
        const initialKeep = {};
        for (const group of groupsData.groups ?? []) {
          if (group.items.length > 0) initialKeep[group.key] = group.items[0].id;
        }
        setKeepMap(initialKeep);
      } catch (err) {
        if (!cancelled) setError(err.message || '网络错误');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadConflicts();
    return () => { cancelled = true; };
  }, []);

  async function handleResolve(group) {
    const keepId = keepMap[group.key];
    if (!keepId) return;
    const dropIds = group.items.filter((item) => item.id !== keepId).map((item) => item.id);
    if (dropIds.length === 0) return;
    setResolving(group.key);
    setError('');
    try {
      const response = await fetch('/api/conflicts/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: group.kind, keepId, dropIds }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || '合并失败');
      }
      const groupsRes = await fetch('/api/conflicts/groups');
      const auditRes = await fetch('/api/conflicts/audit');
      setGroups((await groupsRes.json()).groups ?? []);
      setAuditEntries((await auditRes.json()).entries ?? []);
    } catch (err) {
      setError(err.message || '网络错误');
    } finally {
      setResolving(null);
    }
  }

  const typeLabelsMap = {
    duplicate_material: '重复资料',
    duplicate_card: '重复卡片',
    needs_review: '待复核',
    unsourced_card: '缺来源',
  };

  return (
    <section className="page-main full advanced-page">
      <div className="advanced-head">
        <div>
          <span>Conflict Resolver</span>
          <h2>Review knowledge conflicts</h2>
          <p>集中展示重复卡片与资料，支持选择保留项并合并删除重复项，所有操作写入审计记录。</p>
        </div>
        <button onClick={() => setView('library')} type="button">Review library</button>
      </div>
      <AdvancedOpsTabs active="conflicts" setView={setView} />

      {error && <div className="conflict-error">{error}</div>}

      {loading ? (
        <EmptyState title="正在扫描冲突…" body="正在从全库聚合重复卡片与资料分组。" />
      ) : groups.length === 0 ? (
        <EmptyState title="暂未发现可合并的重复" body="当出现标题或来源相同的卡片/资料时，会在此显示分组供合并。" />
      ) : (
        <div className="conflict-group-list">
          {groups.map((group) => (
            <article className="conflict-group-card" key={`${group.kind}-${group.key}`}>
              <div className="conflict-group-head">
                <span className="conflict-kind-badge">{typeLabelsMap[group.kind] ?? group.kind}</span>
                <h3>{group.title}</h3>
                <span className="conflict-count">{group.items.length} 项</span>
              </div>
              <div className="conflict-group-items">
                {group.items.map((item) => (
                  <label className={`conflict-item${keepMap[group.key] === item.id ? ' selected' : ''}`} key={item.id}>
                    <input
                      type="radio"
                      name={`keep-${group.key}`}
                      checked={keepMap[group.key] === item.id}
                      onChange={() => setKeepMap((prev) => ({ ...prev, [group.key]: item.id }))}
                    />
                    <div className="conflict-item-body">
                      <strong>{item.title}</strong>
                      <span className="conflict-item-meta">{item.meta}</span>
                    </div>
                  </label>
                ))}
              </div>
              <div className="conflict-group-actions">
                <button
                  onClick={() => handleResolve(group)}
                  disabled={resolving === group.key}
                  type="button"
                >
                  {resolving === group.key ? '合并中…' : '合并并删除重复项'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <section className="advanced-panel conflict-audit-panel">
        <div className="panel-title">
          <AlertTriangle size={20} />
          <div>
            <span>Audit Trail</span>
            <h4>冲突解决审计</h4>
          </div>
        </div>
        {auditEntries.length === 0 ? (
          <p className="conflict-audit-empty">暂无审计记录。合并操作完成后会在此显示。</p>
        ) : (
          <ul className="conflict-audit-list">
            {auditEntries.map((entry) => (
              <li className="conflict-audit-item" key={entry.id}>
                <div className="conflict-audit-head">
                  <span className="conflict-kind-badge">{typeLabelsMap[entry.kind] ?? entry.kind}</span>
                  <span className="conflict-audit-action">{entry.action === 'merge' ? '合并' : entry.action}</span>
                  <time>{new Date(entry.createdAt).toLocaleString('zh-CN')}</time>
                </div>
                <p>{entry.note}</p>
                <div className="conflict-audit-ids">
                  <span>保留 {entry.keepId.slice(0, 12)}</span>
                  <span>删除 {entry.dropIds.length} 项</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}

/**
 * 根据冲突信号类型生成说明文本
 * @param {Object} signal - 冲突信号对象
 * @returns {string} 冲突说明文本
 */
function conflictBody(signal) {
  if (signal.type === 'duplicate_material') return `${signal.count} 条资料可能来自同一链接或同一段内容，建议先核对来源再合并。`;
  if (signal.type === 'duplicate_card') return `${signal.count} 张卡片标题相近，建议保留证据最完整的一张。`;
  if (signal.type === 'needs_review') return '资料解析或内容补全需要人工复核，确认后再生成卡片。';
  if (signal.type === 'unsourced_card') return '这张卡片缺少明确来源，建议补充引用或降级为草稿。';
  return '建议先进入来源或知识库详情页人工确认。';
}
