/**
 * @module views/KnowledgeConflictResolverView
 * @description 知识冲突解决视图，集中展示重复卡片与资料，支持选择保留项并合并删除重复项。
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import AdvancedOpsTabs from '../components/AdvancedOpsTabs';
import EmptyState from '../components/EmptyState';
import api from '../utils/api';
import { formatDateTime } from '../utils/material';

/**
 * 知识冲突解决视图组件
 * @param {Object} props - 组件参数
 * @param {Object} props.data - 高级操作数据
 * @param {Function} props.setView - 视图切换函数
 * @returns {JSX.Element} 知识冲突解决视图
 */
export default function KnowledgeConflictResolverView({ data, setView }) {
  const { t } = useTranslation();
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
        const [groupsData, auditData] = await Promise.all([
          api.get('/api/conflicts/groups'),
          api.get('/api/conflicts/audit'),
        ]);
        if (cancelled) return;
        setGroups(groupsData.groups ?? []);
        setAuditEntries(auditData.entries ?? []);
        const initialKeep = {};
        for (const group of groupsData.groups ?? []) {
          if (group.items.length > 0) initialKeep[group.key] = group.items[0].id;
        }
        setKeepMap(initialKeep);
      } catch (err) {
        if (!cancelled) setError(err.message || t('conflicts.networkError'));
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
      try {
        await api.post('/api/conflicts/resolve', { kind: group.kind, keepId, dropIds });
      } catch (err) {
        throw new Error(err.serverMessage || t('conflicts.mergeFailed'));
      }
      const groupsData = await api.get('/api/conflicts/groups');
      const auditData = await api.get('/api/conflicts/audit');
      setGroups(groupsData.groups ?? []);
      setAuditEntries(auditData.entries ?? []);
    } catch (err) {
      setError(err.message || t('conflicts.networkError'));
    } finally {
      setResolving(null);
    }
  }

  const typeLabelsMap = {
    duplicate_material: t('conflicts.type.duplicateMaterial'),
    duplicate_card: t('conflicts.type.duplicateCard'),
    needs_review: t('conflicts.type.needsReview'),
    unsourced_card: t('conflicts.type.unsourcedCard'),
  };

  return (
    <section className="page-main full advanced-page">
      <div className="advanced-head">
        <div>
          <span>{t('conflicts.title')}</span>
          <h2>{t('conflicts.heading')}</h2>
          <p>{t('conflicts.description')}</p>
        </div>
        <button onClick={() => setView('library')} type="button">{t('conflicts.reviewLibrary')}</button>
      </div>
      <AdvancedOpsTabs active="conflicts" setView={setView} />

      {error && <div className="conflict-error">{error}</div>}

      {loading ? (
        <EmptyState title={t('conflicts.scanning')} body={t('conflicts.scanningHint')} />
      ) : groups.length === 0 ? (
        <EmptyState title={t('conflicts.noConflicts')} body={t('conflicts.noConflictsHint')} />
      ) : (
        <div className="conflict-group-list">
          {groups.map((group) => (
            <article className="conflict-group-card" key={`${group.kind}-${group.key}`}>
              <div className="conflict-group-head">
                <span className="conflict-kind-badge">{typeLabelsMap[group.kind] ?? group.kind}</span>
                <h3>{group.title}</h3>
                <span className="conflict-count">{t('conflicts.itemCount', { count: group.items.length })}</span>
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
                  {resolving === group.key ? t('conflicts.merging') : t('conflicts.mergeAndDelete')}
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
            <span>{t('conflicts.auditTrail')}</span>
            <h4>{t('conflicts.auditTitle')}</h4>
          </div>
        </div>
        {auditEntries.length === 0 ? (
          <p className="conflict-audit-empty">{t('conflicts.auditEmpty')}</p>
        ) : (
          <ul className="conflict-audit-list">
            {auditEntries.map((entry) => (
              <li className="conflict-audit-item" key={entry.id}>
                <div className="conflict-audit-head">
                  <span className="conflict-kind-badge">{typeLabelsMap[entry.kind] ?? entry.kind}</span>
                  <span className="conflict-audit-action">{entry.action === 'merge' ? t('conflicts.actionMerge') : entry.action}</span>
                  <time>{formatDateTime(entry.createdAt)}</time>
                </div>
                <p>{entry.note}</p>
                <div className="conflict-audit-ids">
                  <span>{t('conflicts.keepLabel')} {entry.keepId.slice(0, 12)}</span>
                  <span>{t('conflicts.deleteCount', { count: entry.dropIds.length })}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
