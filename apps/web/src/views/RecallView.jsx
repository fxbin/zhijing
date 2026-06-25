/**
 * 主动回忆视图组件：卡片自测队列、评分调度、内容编辑与修订历史。
 * @module views/RecallView
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Database, History, Pencil, RefreshCw, Save } from 'lucide-react';

import EmptyState from '../components/EmptyState';
import { REVISION_FIELD_LABELS } from '../constants/labels';
import api, { ApiError } from '../utils/api';
import { formatRevisionTime } from '../utils/format';
import { useCardTypeLabel, useClaimStatusLabel } from '../utils/i18nLabels';

/**
 * 主动回忆视图，支持卡片队列、揭示答案、四档评分和内容编辑。
 * @param {object} props - 组件属性
 * @param {object} props.detail - 工作区详情
 * @param {object[]} [props.workspaces=[]] - 全量工作区列表（用于全局入口选择）
 * @param {(workspaceId: string) => void} [props.onSelectWorkspace] - 选择工作区回调
 * @param {function} props.setView - 视图切换函数
 * @returns {JSX.Element} 回忆视图
 */
export default function RecallView({
  detail,
  workspaces = [],
  onSelectWorkspace,
  setView,
}) {
  const { t } = useTranslation();
  const cardTypeLabel = useCardTypeLabel();
  const claimStatusLabel = useClaimStatusLabel();
  const [queue, setQueue] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [draftType, setDraftType] = useState('concept');
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const [revisions, setRevisions] = useState([]);
  const [loadingRevisions, setLoadingRevisions] = useState(false);

  useEffect(() => {
    if (!detail?.id) {
      setQueue(detail.cards ?? []);
      return;
    }
    let ignore = false;
    async function loadDue() {
      try {
        const payload = await api.get(`/api/workspaces/${detail.id}/due-cards?limit=20`);
        if (!ignore) setQueue(payload.cards ?? []);
      } catch {
        if (!ignore) setQueue(detail.cards ?? []);
      }
    }
    loadDue();
    return () => { ignore = true; };
  }, [detail?.id, detail.cards]);

  const activeCard = queue[activeIndex];

  useEffect(() => {
    setEditing(false);
    setRevisions([]);
    if (!activeCard?.id) return;
    let ignore = false;
    setLoadingRevisions(true);
    async function loadRevisions() {
      try {
        const payload = await api.get(`/api/cards/${activeCard.id}/revisions`);
        if (!ignore) setRevisions(payload.revisions ?? []);
      } catch {
        if (!ignore) setRevisions([]);
      } finally {
        if (!ignore) setLoadingRevisions(false);
      }
    }
    loadRevisions();
    return () => { ignore = true; };
  }, [activeCard?.id]);

  if (!detail?.id) {
    return (
      <section className="page-main full">
        <div className="recall-workbench">
          <div className="recall-head">
            <button className="back-button" onClick={() => setView('workspace')} type="button">
              ←
              {t('common.back')}
            </button>
            <span>{t('recall.activeRecall')}</span>
            <h2>{t('recall.selectWorkspace')}</h2>
          </div>
          {workspaces.length === 0 ? (
            <EmptyState title={t('recall.noWorkspaces')} body={t('common.empty')} icon={Database} />
          ) : (
            <div className="kb-picker-grid">
              {workspaces.map((kb) => (
                <button
                  key={kb.id}
                  className="kb-picker-card"
                  onClick={() => onSelectWorkspace?.(kb.id)}
                  type="button"
                >
                  <Database size={18} />
                  <strong>{kb.title}</strong>
                  {kb.summary && <span>{kb.summary}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  function startEdit() {
    if (!activeCard) return;
    setDraftTitle(activeCard.title);
    setDraftBody(activeCard.body);
    setDraftType(activeCard.type);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
  }

  async function saveEdit() {
    if (!activeCard?.id || saving) return;
    setSaving(true);
    setActionError('');
    try {
      const payload = await api.patch(`/api/cards/${activeCard.id}`, {
        title: draftTitle,
        body: draftBody,
        type: draftType,
      });
      const updatedCard = payload.card;
      setQueue((current) => current.map((card) => (card.id === updatedCard.id ? updatedCard : card)));
      setRevisions(payload.revision ? [...revisions, payload.revision] : revisions);
      setEditing(false);
    } catch {
      setActionError(t('recall.saveFailed'));
      return;
    } finally {
      setSaving(false);
    }
  }

  function advanceQueue() {
    setActiveIndex((current) => queue.length ? (current + 1) % queue.length : 0);
    setRevealed(false);
  }

  async function gradeCard(grade) {
    if (!activeCard?.id) return;
    setActionError('');
    try {
      await api.post(`/api/cards/${activeCard.id}/review`, { grade });
    } catch {
      setActionError(t('recall.gradeFailed'));
      return;
    }
    setQueue((current) => {
      const next = current.filter((card) => card.id !== activeCard.id);
      setActiveIndex((idx) => (next.length ? idx % next.length : 0));
      return next;
    });
    setRevealed(false);
  }

  return (
    <section className="page-main full">
      <div className="recall-workbench">
        <div className="recall-head">
          <button className="back-button" onClick={() => setView('detail')} type="button">{t('recall.backToWorkspace')}</button>
          <span>{t('recall.activeRecall')}</span>
          <h2>{detail.title}</h2>
          <p>{t('recall.editDescription')}</p>
        </div>
        {actionError && <p className="recall-action-error" role="alert">{actionError}</p>}

        {queue.length === 0 ? (
          <EmptyState title={t('recall.noCards')} body={t('recall.noCardsHint')} />
        ) : (
          <div className="recall-layout">
            <aside className="recall-queue">
              <strong>{t('recall.practiceQueue', { count: queue.length })}</strong>
              {queue.slice(0, 8).map((card, index) => (
                <button className={index === activeIndex ? 'active' : ''} key={card.id ?? card.title} onClick={() => {
                  setActiveIndex(index);
                  setRevealed(false);
                }} type="button">
                  <span>{index + 1}</span>
                  <div>
                    <strong>{card.title}</strong>
                    <small>{cardTypeLabel(card.type)} · {claimStatusLabel(card.claimStatus)}</small>
                  </div>
                </button>
              ))}
            </aside>

            <article className="recall-card">
              {editing ? (
                <div className="recall-edit-form">
                  <label className="recall-edit-field">
                    <span>{t('recall.form.title')}</span>
                    <input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} type="text" />
                  </label>
                  <label className="recall-edit-field">
                    <span>{t('recall.form.type')}</span>
                    <select value={draftType} onChange={(event) => setDraftType(event.target.value)}>
                      <option value="concept">{cardTypeLabel('concept')}</option>
                      <option value="method">{cardTypeLabel('method')}</option>
                      <option value="case">{cardTypeLabel('case')}</option>
                      <option value="question">{cardTypeLabel('question')}</option>
                      <option value="step">{cardTypeLabel('step')}</option>
                      <option value="viewpoint">{cardTypeLabel('viewpoint')}</option>
                    </select>
                  </label>
                  <label className="recall-edit-field">
                    <span>{t('recall.form.body')}</span>
                    <textarea value={draftBody} onChange={(event) => setDraftBody(event.target.value)} rows={6} />
                  </label>
                  <div className="recall-edit-actions">
                    <button className="recall-edit-save" onClick={saveEdit} disabled={saving} type="button">
                      <Save size={15} /> {saving ? t('recall.savingRevision') : t('recall.saveRevision')}
                    </button>
                    <button className="recall-edit-cancel" onClick={cancelEdit} disabled={saving} type="button">{t('common.cancel')}</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="recall-card-head">
                    <span>{cardTypeLabel(activeCard.type)}</span>
                    <button className="recall-edit-trigger" onClick={startEdit} type="button">
                      <Pencil size={14} /> {t('common.edit')}
                    </button>
                  </div>
                  <h3>{activeCard.title}</h3>
                  <p className={revealed ? '' : 'recall-prompt'}>{revealed ? activeCard.body : t('recall.prompt')}</p>
                  <footer>
                    <button onClick={() => setRevealed((current) => !current)} type="button">
                      {revealed ? t('recall.hideAnswer') : t('recall.revealAnswer')}
                    </button>
                    {revealed ? (
                      <div className="recall-grade-actions">
                        <button className="recall-grade recall-grade-again" onClick={() => gradeCard('again')} type="button">{t('recall.gradeAgain')}</button>
                        <button className="recall-grade recall-grade-hard" onClick={() => gradeCard('hard')} type="button">{t('recall.gradeHard')}</button>
                        <button className="recall-grade recall-grade-good" onClick={() => gradeCard('good')} type="button">{t('recall.gradeGood')}</button>
                        <button className="recall-grade recall-grade-easy" onClick={() => gradeCard('easy')} type="button">{t('recall.gradeEasy')}</button>
                      </div>
                    ) : (
                      <button onClick={advanceQueue} type="button">
                        {t('recall.nextCard')}
                        <RefreshCw size={16} />
                      </button>
                    )}
                  </footer>
                </>
              )}
            </article>

            {!editing && (
              <aside className="recall-revisions">
                <strong><History size={15} /> {t('recall.revisionHistory', { count: revisions.length })}</strong>
                {loadingRevisions ? (
                  <p className="recall-revisions-empty">{t('recall.loadingRevisions')}</p>
                ) : revisions.length === 0 ? (
                  <p className="recall-revisions-empty">{t('recall.noRevisions')}</p>
                ) : (
                  <ol className="recall-revision-list">
                    {revisions.slice().reverse().map((revision) => (
                      <li key={revision.id} className="recall-revision-item">
                        <div className="recall-revision-meta">
                          <span className="recall-revision-version">v{revision.version}</span>
                          <time>{formatRevisionTime(revision.createdAt)}</time>
                        </div>
                        <div className="recall-revision-fields">
                          {revision.changedFields.map((field) => (
                            <span key={field} className="recall-revision-field">{t(REVISION_FIELD_LABELS[field] ?? `recall.revisionField.${field}`)}</span>
                          ))}
                        </div>
                        {revision.changedFields.includes('title') && (
                          <p className="recall-revision-diff">
                            <span>{t('recall.originalTitle')}</span>
                            {revision.titleSnapshot}
                          </p>
                        )}
                        {revision.changedFields.includes('body') && (
                          <p className="recall-revision-diff">
                            <span>{t('recall.originalBody')}</span>
                            {revision.bodySnapshot}
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </aside>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
