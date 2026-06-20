/**
 * @module views/ArtifactView
 * 产物详情视图：展示产物分区内容、来源边界、修订历史，并支持分区编辑。
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { formatDate, formatDateTime } from '../utils/material';

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
  const { t } = useTranslation();
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
      title: t(`artifact.variant.${variant}.section.${index}`, { defaultValue: title }),
      body: (sectionBlocks[index]?.length ? sectionBlocks[index] : [t('artifact.emptySection')]).join('\n\n'),
    }));

  async function enableEditing() {
    if (!activeArtifact?.id || initializing) return;
    setInitializing(true);
    setEditError('');
    try {
      const sectionInits = config.sections.map((title, index) => ({
        title: t(`artifact.variant.${variant}.section.${index}`, { defaultValue: title }),
        body: (sectionBlocks[index]?.length ? sectionBlocks[index] : [t('artifact.emptySection')]).join('\n\n'),
      }));
      const response = await fetch(`/api/artifacts/${activeArtifact.id}/sections/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: sectionInits }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setEditError(payload.error ?? t('artifact.initSectionFailed'));
        return;
      }
      const payload = await response.json();
      onArtifactUpdate?.(payload.artifact);
    } catch {
      setEditError(t('artifact.initSectionNetworkError'));
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
        setEditError(payload.error ?? t('artifact.saveFailed'));
        return;
      }
      const payload = await response.json();
      onArtifactUpdate?.(payload.artifact);
      if (payload.revision) setRevisions((current) => [...current, payload.revision]);
      setEditingSectionId(null);
    } catch {
      setEditError(t('artifact.saveNetworkError'));
    } finally {
      setSaving(false);
    }
  }

  if (!activeArtifact) {
    return (
      <section className="artifact-page">
        <div className="page-title-row">
          <div><h2>{t('artifact.title')}</h2><p>{t('artifact.subtitle')}</p></div>
          <div className="button-row"><button onClick={() => setView('detail')} type="button">{t('maps.back')}</button></div>
        </div>
        <EmptyState title={t('artifact.noArtifact')} body={t('artifact.noArtifactHint')} />
      </section>
    );
  }

  return (
    <section className={`artifact-page variant-${variant}`}>
      <div className="artifact-hero">
        <div>
          <div className="back-button-row">
            <button className="back-button" onClick={() => { onClearOrigin?.(); setView('detail'); }} type="button">{t('artifact.backToKnowledgeBase')}</button>
            {artifactOrigin?.label && (
              <button className="back-button artifact-origin-link" type="button" onClick={() => { onClearOrigin?.(); setView('detail'); }}>
                {t('artifact.fromChat', { label: artifactOrigin.label })}
              </button>
            )}
          </div>
          <span>{t(`artifact.variant.${variant}.label`, { defaultValue: config.label })}</span>
          <h2>{activeArtifact.title}</h2>
          <p>{t(`artifact.variant.${variant}.lead`, { defaultValue: config.lead })}</p>
        </div>
        <div className="artifact-actions">
          <button onClick={() => setView('export')} type="button">{t('artifact.openExport')}</button>
          <button onClick={() => downloadArtifactMarkdown(activeArtifact, detail)} type="button">{t('artifact.exportMarkdown')}</button>
        </div>
      </div>

      <div className="artifact-metrics">
        <article><span>{t('artifact.metric.sourceLinks')}</span><strong>{sourceCount}</strong></article>
        <article><span>{t('detail.metric.cards')}</span><strong>{detail.cardCount ?? cards.length}</strong></article>
        <article><span>{t('artifact.metric.sourcedCards')}</span><strong>{sourceCards.length}</strong></article>
        <article><span>{t('artifact.metric.updated')}</span><strong>{formatDate(activeArtifact.createdAt)}</strong></article>
      </div>

      <div className="typed-artifact-grid">
        <section className="artifact-document">
          <div className="panel-title">
            <ClipboardList size={20} />
            <div>
              <span>{t(`artifact.variant.${variant}.label`, { defaultValue: config.label })}</span>
              <h4>{t(`artifact.variant.${variant}.title`, { defaultValue: config.title })}</h4>
            </div>
            <button
              className="artifact-edit-toggle"
              type="button"
              onClick={enableEditing}
              disabled={initializing || hasPersistedSections}
              title={hasPersistedSections ? t('artifact.sectionEditable') : t('artifact.sectionReadonly')}
            >
              {initializing ? t('artifact.initializing') : hasPersistedSections ? t('artifact.editable') : t('artifact.enableEdit')}
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
                        <span>{t('artifact.sectionTitle')}</span>
                        <input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} placeholder={t('artifact.sectionTitle')} />
                      </label>
                      <label>
                        <span>{t('artifact.sectionBodyLabel')}</span>
                        <textarea rows={6} value={draftBody} onChange={(event) => setDraftBody(event.target.value)} placeholder={t('artifact.sectionBody')} />
                      </label>
                      <div className="artifact-section-form-actions">
                        <button type="button" className="primary" onClick={saveSectionEdit} disabled={saving}>{saving ? t('common.saving') : t('artifact.saveRevision')}</button>
                        <button type="button" className="ghost" onClick={cancelEditSection} disabled={saving}>{t('common.cancel')}</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="artifact-section-head">
                        <h3>{section.title}</h3>
                        {canEdit && (
                          <button type="button" className="artifact-section-edit-btn" onClick={() => startEditSection(section)}>{t('common.edit')}</button>
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
            <h3>{t('artifact.sourceBoundary')}</h3>
            <p>{sourceCount ? t('artifact.sourceBoundaryHas') : t('artifact.sourceBoundaryNeeds')}</p>
            <div>
              <span>{t('artifact.count.materials', { count: materials.length })}</span>
              <span>{t('artifact.count.cards', { count: cards.length })}</span>
              <span>{t('artifact.sourcedRatio', { ratio: formatPercent(detail.sourcedRatio) })}</span>
            </div>
          </article>
          <article className="artifact-action-card">
            <h3>{t('artifact.nextActions')}</h3>
            <button onClick={() => setView('chat')} type="button">{t('artifact.discussInChat')}</button>
            <button onClick={() => setView('recall')} type="button">{t('artifact.practiceCards')}</button>
            <button onClick={() => setView('export')} type="button">{t('artifact.exportBundle')}</button>
          </article>
          <article className="artifact-source-list">
            <h3>{t('artifact.representativeSources')}</h3>
            {(materials.slice(0, 4).length ? materials.slice(0, 4) : [{ id: 'empty', title: t('artifact.noSourceMaterial'), parseStatus: 'needs_review' }]).map((material) => (
              <div key={material.id ?? material.title}>
                <strong>{material.title}</strong>
                <span>{material.platform ?? material.type ?? t('library.localPlatform')} · {t(`parseStatus.${material.parseStatus ?? 'saved'}`)}</span>
              </div>
            ))}
          </article>
          <article className="artifact-revisions-panel">
            <h3>{t('artifact.revisions')}</h3>
            {loadingRevisions ? (
              <p className="artifact-revisions-empty">{t('common.loading')}</p>
            ) : revisions.length === 0 ? (
              <p className="artifact-revisions-empty">{t('artifact.noRevisions')}</p>
            ) : (
              <ul className="artifact-revisions-list">
                {revisions.map((revision) => (
                  <li key={revision.id} className="artifact-revision-item">
                    <div>
                      <strong>{t('artifact.versionLabel', { version: revision.version })}</strong>
                      <span>{formatDateTime(revision.createdAt)}</span>
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
