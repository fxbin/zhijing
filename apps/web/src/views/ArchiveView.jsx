/**
 * 归档视图：管理已归档的资料与卡片，支持按工作区筛选与恢复。
 * @module views/ArchiveView
 */

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Archive, CheckCircle2, FileText, RotateCcw, StickyNote, Trash2 } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { useCardTypeLabel } from '../utils/i18nLabels';
import { formatDate } from '../utils/material';
import api from '../utils/api';

/** 恢复成功提示的自动消失时长（毫秒） */
const RESTORE_FEEDBACK_MS = 2000;

/**
 * 归档视图组件。
 * @param {object} props - 组件属性
 * @param {string|null} props.selectedWorkspaceId - 当前选中的工作区 ID
 * @param {Function} props.setView - 视图切换回调
 * @returns {JSX.Element} 归档视图
 */
export default function ArchiveView({ selectedWorkspaceId, setView }) {
  const { t } = useTranslation();
  const cardTypeLabel = useCardTypeLabel();
  const [items, setItems] = useState({ materials: [], cards: [], workspaces: [] });
  const [filterBaseId, setFilterBaseId] = useState(selectedWorkspaceId ?? 'all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState(null);
  const [restoreSuccessId, setRestoreSuccessId] = useState(null);
  const [restoreErrorId, setRestoreErrorId] = useState(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);
  const [deleteSuccessId, setDeleteSuccessId] = useState(null);
  const [deleteErrorId, setDeleteErrorId] = useState(null);

  useEffect(() => {
    setFilterBaseId(selectedWorkspaceId ?? 'all');
  }, [selectedWorkspaceId]);

  useEffect(() => {
    let ignore = false;
    async function loadArchive() {
      setLoading(true);
      setError('');
      try {
        const query = filterBaseId && filterBaseId !== 'all' ? `?workspaceId=${encodeURIComponent(filterBaseId)}` : '';
        const payload = await api.get(`/api/archive${query}`);
        if (!ignore) setItems(payload);
      } catch {
        if (!ignore) setError(t('archive.loadError'));
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadArchive();
    return () => { ignore = true; };
  }, [filterBaseId, t]);

  const allItems = useMemo(() => {
    const materials = (items.materials ?? []).map((item) => ({ ...item, kind: 'material' }));
    const cards = (items.cards ?? []).map((item) => ({ ...item, kind: 'card' }));
    return [...materials, ...cards].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [items]);

  const workspaceMap = useMemo(() => {
    const map = new Map();
    for (const base of items.workspaces ?? []) {
      map.set(base.id, base.title);
    }
    return map;
  }, [items.workspaces]);

  async function restore(item) {
    const endpoint = item.kind === 'material'
      ? `/api/materials/${item.id}/unarchive`
      : `/api/cards/${item.id}/unarchive`;
    setActionId(item.id);
    setRestoreErrorId((current) => (current === item.id ? null : current));
    try {
      await api.post(endpoint);
      setItems((current) => ({
        ...current,
        materials: item.kind === 'material'
          ? current.materials.filter((m) => m.id !== item.id)
          : current.materials,
        cards: item.kind === 'card'
          ? current.cards.filter((c) => c.id !== item.id)
          : current.cards,
      }));
      setRestoreSuccessId(item.id);
      setTimeout(() => {
        setRestoreSuccessId((current) => (current === item.id ? null : current));
      }, RESTORE_FEEDBACK_MS);
    } catch {
      setRestoreErrorId(item.id);
    } finally {
      setActionId(null);
    }
  }

  async function permanentDelete(item) {
    const endpoint = item.kind === 'material'
      ? `/api/materials/${item.id}`
      : `/api/cards/${item.id}`;
    setActionId(item.id);
    setDeleteErrorId((current) => (current === item.id ? null : current));
    try {
      await api.del(endpoint);
      setItems((current) => ({
        ...current,
        materials: item.kind === 'material'
          ? current.materials.filter((m) => m.id !== item.id)
          : current.materials,
        cards: item.kind === 'card'
          ? current.cards.filter((c) => c.id !== item.id)
          : current.cards,
      }));
      setDeleteConfirmItem(null);
      setDeleteSuccessId(item.id);
      setTimeout(() => {
        setDeleteSuccessId((current) => (current === item.id ? null : current));
      }, RESTORE_FEEDBACK_MS);
    } catch {
      setDeleteErrorId(item.id);
    } finally {
      setActionId(null);
    }
  }

  if (loading) {
    return (
      <div className="page-main full archive-page">
        <div className="archive-header skeleton">
          <div className="skeleton-line title" />
          <div className="skeleton-line subtitle" />
        </div>
        <div className="archive-list skeleton">
          <div className="archive-row skeleton" />
          <div className="archive-row skeleton" />
          <div className="archive-row skeleton" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-main full archive-page">
        <EmptyState
          icon={Archive}
          title={t('archive.errorTitle')}
          body={error}
        />
      </div>
    );
  }

  return (
    <div className="page-main full archive-page">
      <header className="archive-header">
        <div>
          <h1>{t('archive.title')}</h1>
          <p>{t('archive.subtitle')}</p>
        </div>
        <div className="archive-toolbar">
          <select
            value={filterBaseId}
            onChange={(event) => setFilterBaseId(event.target.value)}
            aria-label={t('archive.filterLabel')}
          >
            <option value="all">{t('archive.allBases')}</option>
            {items.workspaces.map((base) => (
              <option key={base.id} value={base.id}>{base.title}</option>
            ))}
          </select>
        </div>
      </header>

      <section className="archive-stats">
        <div className="stat-pill">
          <FileText size={18} />
          <span>{t('archive.materialCount', { count: items.materials.length })}</span>
        </div>
        <div className="stat-pill">
          <StickyNote size={18} />
          <span>{t('archive.cardCount', { count: items.cards.length })}</span>
        </div>
      </section>

      {restoreSuccessId && (
        <div className="archive-feedback" role="status">
          <CheckCircle2 size={16} />
          <span>{t('archive.restoreSuccess')}</span>
        </div>
      )}

      {deleteSuccessId && (
        <div className="archive-feedback" role="status">
          <CheckCircle2 size={16} />
          <span>{t('archive.deleteSuccess')}</span>
        </div>
      )}

      {allItems.length === 0 ? (
        <EmptyState
          icon={Archive}
          title={t('archive.emptyTitle')}
          body={t('archive.emptyBody')}
        />
      ) : (
        <ul className="archive-list">
          {allItems.map((item) => {
            const isMaterial = item.kind === 'material';
            const Icon = isMaterial ? FileText : StickyNote;
            const meta = isMaterial
              ? [t('archive.kindMaterial'), item.platform || t('archive.local'), formatDate(item.createdAt)]
              : [t('archive.kindCard'), cardTypeLabel(item.type), formatDate(item.createdAt)];
            return (
              <li key={`${item.kind}_${item.id}`} className="archive-row">
                <div className="archive-row-icon">
                  <Icon size={20} />
                </div>
                <div className="archive-row-body">
                  <strong>{item.title}</strong>
                  <span className="archive-row-meta">
                    {meta.join(' · ')}
                    {item.workspaceId && (
                      <span className="archive-row-base">
                        {' · '}
                        {workspaceMap.has(item.workspaceId)
                          ? workspaceMap.get(item.workspaceId)
                          : <span className="archive-row-base-deleted">{t('archive.deletedWorkspace')}</span>}
                      </span>
                    )}
                  </span>
                  {restoreErrorId === item.id && (
                    <span className="archive-row-error" role="alert">{t('archive.restoreError')}</span>
                  )}
                  {deleteErrorId === item.id && (
                    <span className="archive-row-error" role="alert">{t('archive.deleteError')}</span>
                  )}
                </div>
                <button
                  className="archive-restore"
                  disabled={actionId === item.id}
                  onClick={() => restore(item)}
                  type="button"
                >
                  <RotateCcw size={16} />
                  {t('archive.restore')}
                </button>
                <button
                  className="archive-delete"
                  disabled={actionId === item.id}
                  onClick={() => setDeleteConfirmItem(item)}
                  type="button"
                  aria-label={t('archive.permanentDelete')}
                >
                  <Trash2 size={16} />
                  {t('archive.permanentDelete')}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {deleteConfirmItem && (
        <div className="modal-backdrop" onClick={() => setDeleteConfirmItem(null)} aria-hidden="true">
          <div className="modal-card archive-delete-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal-head">
              <h3>{t('archive.deleteConfirmTitle')}</h3>
            </div>
            <div className="modal-body">
              <p>{t('archive.deleteConfirmBody', { title: deleteConfirmItem.title })}</p>
              <p className="archive-delete-warning">{t('archive.deleteConfirmWarning')}</p>
            </div>
            <div className="modal-foot">
              <button type="button" onClick={() => setDeleteConfirmItem(null)} disabled={actionId === deleteConfirmItem.id}>
                {t('common.cancel', { defaultValue: '取消' })}
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => permanentDelete(deleteConfirmItem)}
                disabled={actionId === deleteConfirmItem.id}
              >
                {actionId === deleteConfirmItem.id
                  ? t('archive.deleting', { defaultValue: '删除中…' })
                  : t('archive.permanentDelete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
