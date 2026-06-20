/**
 * 主动回忆视图组件：卡片自测队列、评分调度、内容编辑与修订历史。
 * @module views/RecallView
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { History, Pencil, RefreshCw, Save } from 'lucide-react';

import EmptyState from '../components/EmptyState';
import { REVISION_FIELD_LABELS } from '../constants/labels';
import { formatRevisionTime } from '../utils/format';
import { useCardTypeLabel, useClaimStatusLabel } from '../utils/i18nLabels';

/**
 * 主动回忆视图，支持卡片队列、揭示答案、四档评分和内容编辑。
 * @param {object} props - 组件属性
 * @param {object} props.detail - 知识库详情
 * @param {function} props.setView - 视图切换函数
 * @returns {JSX.Element} 回忆视图
 */
export default function RecallView({ detail, setView }) {
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
        const response = await fetch(`/api/knowledge-bases/${detail.id}/due-cards?limit=20`);
        if (!response.ok) return;
        const payload = await response.json();
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
        const response = await fetch(`/api/cards/${activeCard.id}/revisions`);
        if (!response.ok) return;
        const payload = await response.json();
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
    try {
      const response = await fetch(`/api/cards/${activeCard.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draftTitle,
          body: draftBody,
          type: draftType,
        }),
      });
      if (!response.ok) return;
      const payload = await response.json();
      const updatedCard = payload.card;
      setQueue((current) => current.map((card) => (card.id === updatedCard.id ? updatedCard : card)));
      setRevisions(payload.revision ? [...revisions, payload.revision] : revisions);
      setEditing(false);
    } catch {
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
    try {
      await fetch(`/api/cards/${activeCard.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grade }),
      });
    } catch {
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
          <button className="back-button" onClick={() => setView('detail')} type="button">← Back to Knowledge Base</button>
          <span>Active Recall</span>
          <h2>{detail.title}</h2>
          <p>把知识卡片转成自测队列：先回忆，再揭示答案，最后按掌握程度评分，系统会据此安排下次复习。复习中发现卡片内容需要修正，可直接编辑并留下修订记录。</p>
        </div>

        {queue.length === 0 ? (
          <EmptyState title="暂无可练习卡片" body="导入资料或创建主题后，知识卡片会成为主动回忆题目。" />
        ) : (
          <div className="recall-layout">
            <aside className="recall-queue">
              <strong>Practice Queue · {queue.length}</strong>
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
                    <span>标题</span>
                    <input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} type="text" />
                  </label>
                  <label className="recall-edit-field">
                    <span>类型</span>
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
                    <span>正文</span>
                    <textarea value={draftBody} onChange={(event) => setDraftBody(event.target.value)} rows={6} />
                  </label>
                  <div className="recall-edit-actions">
                    <button className="recall-edit-save" onClick={saveEdit} disabled={saving} type="button">
                      <Save size={15} /> {saving ? '保存中…' : '保存修订'}
                    </button>
                    <button className="recall-edit-cancel" onClick={cancelEdit} disabled={saving} type="button">取消</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="recall-card-head">
                    <span>{cardTypeLabel(activeCard.type)}</span>
                    <button className="recall-edit-trigger" onClick={startEdit} type="button">
                      <Pencil size={14} /> 编辑
                    </button>
                  </div>
                  <h3>{activeCard.title}</h3>
                  <p className={revealed ? '' : 'recall-prompt'}>{revealed ? activeCard.body : '先合上资料，用自己的话解释这张卡片。准备好后再揭示参考答案。'}</p>
                  <footer>
                    <button onClick={() => setRevealed((current) => !current)} type="button">
                      {revealed ? 'Hide Answer' : 'Reveal Answer'}
                    </button>
                    {revealed ? (
                      <div className="recall-grade-actions">
                        <button className="recall-grade recall-grade-again" onClick={() => gradeCard('again')} type="button">Again</button>
                        <button className="recall-grade recall-grade-hard" onClick={() => gradeCard('hard')} type="button">Hard</button>
                        <button className="recall-grade recall-grade-good" onClick={() => gradeCard('good')} type="button">Good</button>
                        <button className="recall-grade recall-grade-easy" onClick={() => gradeCard('easy')} type="button">Easy</button>
                      </div>
                    ) : (
                      <button onClick={advanceQueue} type="button">
                        Next Card
                        <RefreshCw size={16} />
                      </button>
                    )}
                  </footer>
                </>
              )}
            </article>

            {!editing && (
              <aside className="recall-revisions">
                <strong><History size={15} /> 修订历史 · {revisions.length}</strong>
                {loadingRevisions ? (
                  <p className="recall-revisions-empty">加载中…</p>
                ) : revisions.length === 0 ? (
                  <p className="recall-revisions-empty">暂无修订记录。编辑卡片后会在此留痕。</p>
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
                            <span key={field} className="recall-revision-field">{REVISION_FIELD_LABELS[field] ?? field}</span>
                          ))}
                        </div>
                        {revision.changedFields.includes('title') && (
                          <p className="recall-revision-diff">
                            <span>原标题</span>
                            {revision.titleSnapshot}
                          </p>
                        )}
                        {revision.changedFields.includes('body') && (
                          <p className="recall-revision-diff">
                            <span>原正文</span>
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
