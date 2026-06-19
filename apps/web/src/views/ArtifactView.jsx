/**
 * @module views/ArtifactView
 * 产物详情视图：展示产物分区内容、来源边界、修订历史，并支持分区编辑。
 */

import { useEffect, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import {
  inferArtifactVariant,
  artifactVariantConfig,
  artifactBodyBlocks,
  distributeArtifactBlocks,
} from '../utils/artifact';
import { downloadArtifactMarkdown } from '../utils/export';
import { formatPercent } from '../utils/format';

/**
 * 产物详情视图组件
 * @param {Object} props - 组件属性
 * @param {Object} [props.artifact] - 当前打开的产物
 * @param {Object} props.detail - 知识库详情
 * @param {Function} props.setView - 切换视图回调
 * @param {Object} [props.artifactOrigin] - 产物来源信息
 * @param {Function} [props.onClearOrigin] - 清除来源标记回调
 * @param {Function} [props.onArtifactUpdate] - 产物更新回调
 * @returns {JSX.Element} 产物视图
 */
export default function ArtifactView({ artifact, detail, setView, artifactOrigin, onClearOrigin, onArtifactUpdate }) {
  const fallbackArtifact = detail.artifacts?.[0];
  const activeArtifact = artifact ?? fallbackArtifact;
  const variant = inferArtifactVariant(activeArtifact, detail);
  const config = artifactVariantConfig(variant);
  const bodyBlocks = artifactBodyBlocks(activeArtifact);
  const sectionBlocks = distributeArtifactBlocks(bodyBlocks, config.sections.length);
  const sourceCount = activeArtifact?.sourceMaterialIds?.length ?? 0;
  const cards = detail.cards ?? [];
  const materials = detail.materials ?? [];
  const sourceCards = cards.filter((card) => card.claimStatus === 'sourced');
  const persistedSections = activeArtifact?.sections ?? [];
  const hasPersistedSections = persistedSections.length > 0;

  const [editingSectionId, setEditingSectionId] = useState(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [revisions, setRevisions] = useState([]);
  const [loadingRevisions, setLoadingRevisions] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    if (!activeArtifact?.id) return;
    let ignore = false;
    setLoadingRevisions(true);
    setRevisions([]);
    async function loadArtifactRevisions() {
      try {
        const response = await fetch(`/api/artifacts/${activeArtifact.id}/revisions`);
        if (!response.ok) return;
        const payload = await response.json();
        if (!ignore) setRevisions(payload.revisions ?? []);
      } catch {
        if (!ignore) setRevisions([]);
      } finally {
        if (!ignore) setLoadingRevisions(false);
      }
    }
    loadArtifactRevisions();
    return () => { ignore = true; };
  }, [activeArtifact?.id]);

  const displaySections = hasPersistedSections
    ? persistedSections
    : config.sections.map((title, index) => ({
        id: `config_${index}`,
        title,
        body: (sectionBlocks[index]?.length ? sectionBlocks[index] : ['暂无内容。']).join('\n\n'),
      }));

  async function enableEditing() {
    if (!activeArtifact?.id || initializing) return;
    setInitializing(true);
    setEditError('');
    try {
      const sectionInits = config.sections.map((title, index) => ({
        title,
        body: (sectionBlocks[index]?.length ? sectionBlocks[index] : ['暂无内容。']).join('\n\n'),
      }));
      const response = await fetch(`/api/artifacts/${activeArtifact.id}/sections/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: sectionInits }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setEditError(payload.error ?? '初始化分区失败');
        return;
      }
      const payload = await response.json();
      onArtifactUpdate?.(payload.artifact);
    } catch {
      setEditError('网络错误，初始化分区失败');
    } finally {
      setInitializing(false);
    }
  }

  function startEditSection(section) {
    setEditingSectionId(section.id);
    setDraftTitle(section.title);
    setDraftBody(section.body);
    setEditError('');
  }

  function cancelEditSection() {
    setEditingSectionId(null);
  }

  async function saveSectionEdit() {
    if (!editingSectionId || saving || !activeArtifact?.id) return;
    setSaving(true);
    setEditError('');
    try {
      const response = await fetch(`/api/artifacts/${activeArtifact.id}/sections/${editingSectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: draftTitle, body: draftBody }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setEditError(payload.error ?? '保存失败');
        return;
      }
      const payload = await response.json();
      onArtifactUpdate?.(payload.artifact);
      if (payload.revision) setRevisions((current) => [...current, payload.revision]);
      setEditingSectionId(null);
    } catch {
      setEditError('网络错误，保存失败');
    } finally {
      setSaving(false);
    }
  }

  if (!activeArtifact) {
    return (
      <section className="artifact-page">
        <div className="page-title-row">
          <div><h2>Artifact Archive</h2><p>问答或 Kit 生成产物后，会在这里打开完整内容。</p></div>
          <div className="button-row"><button onClick={() => setView('detail')} type="button">回到知识库</button></div>
        </div>
        <EmptyState title="暂无可打开产物" body="在知识库详情页提问，或运行 Kit 后，可以从助手面板打开产物。" />
      </section>
    );
  }

  return (
    <section className={`artifact-page variant-${variant}`}>
      <div className="artifact-hero">
        <div>
          <div className="back-button-row">
            <button className="back-button" onClick={() => { onClearOrigin?.(); setView('detail'); }} type="button">← Back to Knowledge Base</button>
            {artifactOrigin?.label && (
              <button className="back-button artifact-origin-link" type="button" onClick={() => { onClearOrigin?.(); setView('detail'); }}>
                ↩ 来自对话：{artifactOrigin.label}
              </button>
            )}
          </div>
          <span>{config.label}</span>
          <h2>{activeArtifact.title}</h2>
          <p>{config.lead}</p>
        </div>
        <div className="artifact-actions">
          <button onClick={() => setView('export')} type="button">Open Export</button>
          <button onClick={() => downloadArtifactMarkdown(activeArtifact, detail)} type="button">导出 Markdown</button>
        </div>
      </div>

      <div className="artifact-metrics">
        <article><span>Source links</span><strong>{sourceCount}</strong></article>
        <article><span>Cards</span><strong>{detail.cardCount ?? cards.length}</strong></article>
        <article><span>Sourced cards</span><strong>{sourceCards.length}</strong></article>
        <article><span>Updated</span><strong>{new Date(activeArtifact.createdAt).toLocaleDateString()}</strong></article>
      </div>

      <div className="typed-artifact-grid">
        <section className="artifact-document">
          <div className="panel-title">
            <ClipboardList size={20} />
            <div>
              <span>{config.label}</span>
              <h4>{config.title}</h4>
            </div>
            <button
              className="artifact-edit-toggle"
              type="button"
              onClick={enableEditing}
              disabled={initializing || hasPersistedSections}
              title={hasPersistedSections ? '分区已可编辑，直接点击右侧编辑按钮' : '把当前内容固化为可编辑分区'}
            >
              {initializing ? '初始化中…' : hasPersistedSections ? '✓ 可编辑' : '启用编辑'}
            </button>
          </div>
          {editError && <p className="artifact-edit-error">{editError}</p>}
          {displaySections.map((section, index) => {
            const isEditing = editingSectionId === section.id;
            const canEdit = hasPersistedSections && section.id !== 'config_0';
            return (
              <article className={`artifact-section${isEditing ? ' editing' : ''}`} key={section.id}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  {isEditing ? (
                    <div className="artifact-section-form">
                      <label>
                        <span>分区标题</span>
                        <input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} placeholder="分区标题" />
                      </label>
                      <label>
                        <span>分区正文</span>
                        <textarea rows={6} value={draftBody} onChange={(event) => setDraftBody(event.target.value)} placeholder="分区正文（支持多段落，空行分隔）" />
                      </label>
                      <div className="artifact-section-form-actions">
                        <button type="button" className="primary" onClick={saveSectionEdit} disabled={saving}>{saving ? '保存中…' : '保存修订'}</button>
                        <button type="button" className="ghost" onClick={cancelEditSection} disabled={saving}>取消</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="artifact-section-head">
                        <h3>{section.title}</h3>
                        {canEdit && (
                          <button type="button" className="artifact-section-edit-btn" onClick={() => startEditSection(section)}>编辑</button>
                        )}
                      </div>
                      {section.body.split(/\n+/).filter(Boolean).map((block, blockIndex) => <p key={`${section.id}-${blockIndex}`}>{block}</p>)}
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </section>

        <aside className="artifact-sidebar">
          <article className="artifact-boundary-card">
            <h3>来源边界</h3>
            <p>{sourceCount ? 'This artifact references saved source material.' : 'This artifact is an AI skeleton and needs source review.'}</p>
            <div>
              <span>{materials.length} materials</span>
              <span>{cards.length} cards</span>
              <span>{formatPercent(detail.sourcedRatio)} sourced</span>
            </div>
          </article>
          <article className="artifact-action-card">
            <h3>Next Actions</h3>
            <button onClick={() => setView('chat')} type="button">Discuss in Chat</button>
            <button onClick={() => setView('recall')} type="button">PracticeCards</button>
            <button onClick={() => setView('export')} type="button">Export Bundle</button>
          </article>
          <article className="artifact-source-list">
            <h3>Representative Sources</h3>
            {(materials.slice(0, 4).length ? materials.slice(0, 4) : [{ id: 'empty', title: 'No source material yet', parseStatus: 'needs_review' }]).map((material) => (
              <div key={material.id ?? material.title}>
                <strong>{material.title}</strong>
                <span>{material.platform ?? material.type ?? 'local'} · {material.parseStatus ?? 'saved'}</span>
              </div>
            ))}
          </article>
          <article className="artifact-revisions-panel">
            <h3>修订历史</h3>
            {loadingRevisions ? (
              <p className="artifact-revisions-empty">加载中…</p>
            ) : revisions.length === 0 ? (
              <p className="artifact-revisions-empty">暂无修订记录。启用编辑并保存分区后，每次修改都会留下版本快照。</p>
            ) : (
              <ul className="artifact-revisions-list">
                {revisions.map((revision) => (
                  <li key={revision.id} className="artifact-revision-item">
                    <div>
                      <strong>v{revision.version}</strong>
                      <span>{new Date(revision.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="artifact-revision-snapshot">
                      <span className="artifact-revision-field">{revision.sectionTitleSnapshot}</span>
                      <span className="artifact-revision-changes">{revision.changedFields.join(' · ')}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </aside>
      </div>
    </section>
  );
}
