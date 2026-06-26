/**
 * @module views/LibraryView
 * @description 资料库视图，提供资料收集、筛选、批量操作、解析、复核与归属管理。
 *              状态层下沉到 useLibraryDataState（数据域）与 useLibraryOperationsState（操作域），
 *              本组件仅负责组合 hook、派生可见性相关值与 JSX 渲染。
 * @author fxbin
 */

import {
  AlertTriangle,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Clock3,
  FileText,
  FolderOpen,
  RefreshCw,
  Search,
  Send,
  SquareArrowOutUpRight,
  Trash2,
  Upload,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { captureModeOptions, materialFilterOptions } from '../constants/options';
import { getIntakeKindLabel, getParseStatusLabel } from '../utils/i18nLabels';
import {
  canParseMaterial,
  formatMaterialTime,
  materialIcon,
  materialMediaUrls,
  materialPreview,
  materialSourceUrl,
  materialState,
} from '../utils/material';
import { workspaceTitle } from '../utils/knowledge';
import CaptureSuccessBanner from '../components/CaptureSuccessBanner';
import EmptyState from '../components/EmptyState';
import FolderImportDialog from '../components/FolderImportDialog';
import ImportLifecyclePanel from '../components/ImportLifecyclePanel';
import MediaPreview from '../components/MediaPreview';
import ParseTimeline from '../components/ParseTimeline';
import { useLibraryDataState } from '../hooks/useLibraryDataState';
import {
  FILE_INPUT_ACCEPT,
  NEW_WORKSPACE_MARKER,
  useLibraryOperationsState,
} from '../hooks/useLibraryOperationsState';

/**
 * 资料库视图组件
 * @param {Object} props - 组件参数
 * @param {string} props.apiStatus - API 连接状态
 * @param {Array} props.workspaces - 工作区列表
 * @param {Function} props.onCaptureResult - 收集结果回调
 * @param {Function} props.onMaterialMutation - 资料变更回调
 * @param {Function} props.onNavigate - 视图跳转回调，用于跳转到其他视图（如微信读书导入）
 * @param {Function} props.onParseMaterial - 解析资料回调
 * @param {string} props.parsingMaterialId - 正在解析的资料 ID
 * @param {string} [props.selectedWorkspaceId] - 当前选中工作区 ID
 * @returns {JSX.Element} 资料库视图
 * @author fxbin
 */
export default function LibraryView({ apiStatus, workspaces, onCaptureResult, onMaterialMutation, onNavigate, onParseMaterial, parsingMaterialId, selectedWorkspaceId }) {
  const { t } = useTranslation();
  const [expandedMaterialId, setExpandedMaterialId] = useState(null);
  const [folderImportOpen, setFolderImportOpen] = useState(false);

  const {
    items,
    filter,
    setFilter,
    searchValue,
    setSearchValue,
    isLoading,
    status,
    captureSummary,
    setCaptureSummary,
    dedupeNotice,
    setDedupeNotice,
    counts,
    lifecycleStats,
    setItems,
    setStatus,
    loadMaterials,
  } = useLibraryDataState({ t, selectedWorkspaceId });

  const {
    captureValue,
    setCaptureValue,
    captureMode,
    setCaptureMode,
    isCapturing,
    isImportingFile,
    selectedIds,
    isBatchProcessing,
    batchProgress,
    batchAssignTarget,
    setBatchAssignTarget,
    deleteConfirm,
    setDeleteConfirm,
    deleteModalRef,
    reviewingId,
    reviewDraft,
    setReviewDraft,
    assignDrafts,
    setAssignDrafts,
    newBaseTitles,
    setNewBaseTitles,
    assignmentHints,
    mutatingMaterialId,
    toggleMaterialSelection,
    toggleSelectAllVisible,
    clearSelection,
    capture,
    importTextFile,
    parseFromLibrary,
    openReview,
    saveReview,
    assignMaterial,
    suggestAssignment,
    requestDelete,
    confirmDelete,
    reparseSelected,
    assignSelected,
  } = useLibraryOperationsState({
    t,
    apiStatus,
    items,
    setItems,
    setStatus,
    setCaptureSummary,
    loadMaterials,
    onCaptureResult,
    onMaterialMutation,
    onParseMaterial,
  });

  const filteredItems = items.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'failed' || filter === 'parsing') return item.parseStatus === filter;
    return item.type === filter;
  });

  const visibleIds = filteredItems.map((item) => item.id);
  const selectedVisibleCount = visibleIds.filter((id) => selectedIds.has(id)).length;
  const allVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;
  const someVisibleSelected = selectedVisibleCount > 0 && !allVisibleSelected;

  return (
    <>
    <section className="page-main full">
      <div className="page-title-row">
        <div>
          <h2>{t('library.title')}</h2>
          <p>{t('library.subtitle')}</p>
        </div>
        <div className="library-stats">
          <span>{t('library.itemsCount', { count: counts.total })}</span>
          <span>{t('library.ingestedCount', { count: counts.ingested ?? 0 })}</span>
          <span>{t('library.failedCount', { count: counts.failed ?? 0 })}</span>
          {onNavigate && (
            <button
              type="button"
              className="library-import-weread-button"
              onClick={() => onNavigate('weread')}
            >
              <BookOpen size={16} />
              {t('library.importFromWeread')}
            </button>
          )}
        </div>
      </div>

      {dedupeNotice && (
        <div className="library-dedupe-notice">
          <AlertTriangle size={18} />
          <span>{t('library.dedupeNotice', { count: dedupeNotice.count })} {dedupeNotice.hint}</span>
          <button type="button" onClick={() => setDedupeNotice(null)}>{t('library.dedupeNotice.dismiss')}</button>
        </div>
      )}

      {captureSummary && (
        <CaptureSuccessBanner
          summary={captureSummary}
          stats={lifecycleStats}
          onReview={() => {
            const target = lifecycleStats.reviewItems[0];
            if (target) openReview(target);
          }}
          onDismiss={() => setCaptureSummary(null)}
        />
      )}

      <section className="quick-capture-panel">
        <div className="capture-head">
          <div>
            <span>{t('library.quickCapture')}</span>
            <h3>{t('library.inbox')}</h3>
          </div>
          <div className="capture-mode">
            {captureModeOptions.map((mode) => (
              <button className={captureMode === mode ? 'active' : ''} key={mode} onClick={() => setCaptureMode(mode)} type="button">
                {t(`library.captureMode.${mode}`)}
              </button>
            ))}
          </div>
        </div>
        <div className="capture-box">
          <textarea
            aria-label={t('library.captureInputAria')}
            value={captureValue}
            onChange={(event) => setCaptureValue(event.target.value)}
            placeholder={captureMode === 'batch' ? t('library.capturePlaceholder.batch') : captureMode === 'link' ? t('library.capturePlaceholder.link') : t('library.capturePlaceholder.auto')}
          />
          <div className="capture-actions">
            <button disabled={apiStatus !== 'online' || isCapturing || !captureValue.trim()} onClick={capture} type="button">
              {isCapturing ? <Clock3 size={18} /> : <Send size={18} />}
              {t('library.capture')}
            </button>
            <label className={`file-import-button ${apiStatus !== 'online' || isImportingFile ? 'disabled' : ''}`}>
              {isImportingFile ? <Clock3 size={18} /> : <Upload size={18} />}
              {t('library.import')}
              <input
                accept={FILE_INPUT_ACCEPT}
                aria-label={t('library.importDocument')}
                disabled={apiStatus !== 'online' || isImportingFile}
                onChange={importTextFile}
                type="file"
              />
            </label>
            <button
              type="button"
              className="folder-import-button"
              disabled={apiStatus !== 'online'}
              onClick={() => setFolderImportOpen(true)}
            >
              <FolderOpen size={18} />
              {t('folderImport.button')}
            </button>
          </div>
        </div>
        <p>{status}</p>
      </section>

      <ImportLifecyclePanel apiStatus={apiStatus} stats={lifecycleStats} onReviewItem={openReview} />

      <div className="library-toolbar">
        <label className={`library-select-all ${allVisibleSelected ? 'is-checked' : ''} ${someVisibleSelected ? 'is-indeterminate' : ''}`}>
          <input
            type="checkbox"
            aria-label={t('library.selectAllVisible')}
            checked={allVisibleSelected}
            ref={(node) => { if (node) node.indeterminate = someVisibleSelected; }}
            onChange={() => toggleSelectAllVisible(visibleIds)}
            disabled={filteredItems.length === 0}
          />
          <span>{selectedIds.size > 0 ? t('library.selectedCount', { count: selectedIds.size }) : t('library.selectAll')}</span>
        </label>
        <div className="filter-bar">
          {materialFilterOptions.map((option) => (
            <button className={filter === option.key ? 'active' : ''} key={option.key} onClick={() => setFilter(option.key)} type="button">
              {t(option.label)}
            </button>
          ))}
        </div>
        <label className="library-search">
          <Search size={18} />
          <input aria-label={t('library.searchMaterials')} value={searchValue} onChange={(event) => setSearchValue(event.target.value)} placeholder={t('library.searchPlaceholder')} />
        </label>
      </div>

      {selectedIds.size > 0 && (
        <div className="library-batch-bar">
          <div className="library-batch-info">
            <strong>{t('library.selectedCount', { count: selectedIds.size })}</strong>
            {batchProgress && (
              <span className="library-batch-progress">
                {batchProgress.action} {batchProgress.done}/{batchProgress.total}
              </span>
            )}
          </div>
          <div className="library-batch-actions">
            <button type="button" disabled={isBatchProcessing || apiStatus !== 'online'} onClick={reparseSelected}>
              <RefreshCw size={14} />
              {t('library.reparse')}
            </button>
            <select
              aria-label={t('library.moveToKb')}
              value={batchAssignTarget}
              onChange={(event) => setBatchAssignTarget(event.target.value)}
              disabled={isBatchProcessing || apiStatus !== 'online'}
            >
              <option value="">{t('library.moveTo')}</option>
              {workspaces.map((base) => <option key={base.id ?? base.title} value={base.id}>{base.title}</option>)}
            </select>
            <button type="button" disabled={isBatchProcessing || apiStatus !== 'online' || !batchAssignTarget} onClick={assignSelected}>
              {t('library.move')}
            </button>
            <button type="button" className="danger" disabled={isBatchProcessing || apiStatus !== 'online'} onClick={requestDelete}>
              <Trash2 size={14} />
              {t('common.delete')}
            </button>
            <button type="button" disabled={isBatchProcessing} onClick={clearSelection}>
              {t('library.cancelSelection')}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <EmptyState title={t('library.syncing')} body={t('library.syncingHint')} />
      ) : filteredItems.length === 0 ? (
        <EmptyState title={t('library.noMatch')} body={t('library.noMatchHint')} />
      ) : (
      <div className="library-grid">
        {filteredItems.map((item) => {
          const Icon = materialIcon(item.type);
          const isExpanded = expandedMaterialId === item.id;
          const handleToggle = () => setExpandedMaterialId(isExpanded ? null : item.id);
          return (
          <article
            className={`library-card ${materialState(item.parseStatus)} ${selectedIds.has(item.id) ? 'selected' : ''} is-expandable${isExpanded ? ' is-expanded' : ''}`}
            key={item.id}
            onClick={handleToggle}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleToggle();
              }
            }}
          >
            <div className="library-card-head">
              <label className="library-card-select" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  aria-label={t('library.selectMaterialWithTitle', { title: item.title })}
                  checked={selectedIds.has(item.id)}
                  onChange={() => toggleMaterialSelection(item.id)}
                />
              </label>
              <Icon size={22} />
              <div className="material-meta">
                <span>{getIntakeKindLabel(t, item.type)}</span>
                <span>{getParseStatusLabel(t, item.parseStatus)}</span>
              </div>
              {isExpanded ? <ChevronUp size={16} className="library-card-chevron" /> : <ChevronDown size={16} className="library-card-chevron" />}
            </div>
            <h3>{item.title}</h3>
            {isExpanded ? (
              <p className="library-card-body-full">{item.contentText || item.rawInput || materialPreview(item)}</p>
            ) : (
              <p>{materialPreview(item)}</p>
            )}
            <ParseTimeline item={item} />
            {item.parseError && <p className="library-error">{item.parseError}</p>}
            <div className="tag-row">
              <span>{workspaceTitle(workspaces, item.workspaceId)}</span>
              <span>{item.platform ?? t('library.localPlatform')}</span>
              <span>{formatMaterialTime(item.createdAt)}</span>
              {materialMediaUrls(item).length > 0 && <span>{t('library.mediaCount', { count: materialMediaUrls(item).length })}</span>}
            </div>
            <MediaPreview urls={materialMediaUrls(item)} compact />
            <div className="assignment-row" onClick={(e) => e.stopPropagation()}>
              <select
                aria-label={t('library.selectKb')}
                value={assignDrafts[item.id] ?? item.workspaceId ?? ''}
                onChange={(event) => setAssignDrafts((current) => ({ ...current, [item.id]: event.target.value }))}
              >
                <option value="">{t('library.moveTo')}</option>
                {workspaces.map((base) => <option key={base.id ?? base.title} value={base.id}>{base.title}</option>)}
                <option value={NEW_WORKSPACE_MARKER}>{t('library.newWorkspace')}</option>
              </select>
              {(assignDrafts[item.id] ?? item.workspaceId) === NEW_WORKSPACE_MARKER && (
                <input
                  aria-label={t('library.newKbTitle')}
                  value={newBaseTitles[item.id] ?? item.title ?? ''}
                  onChange={(event) => setNewBaseTitles((current) => ({ ...current, [item.id]: event.target.value }))}
                  placeholder={t('library.titlePlaceholder')}
                />
              )}
              <button disabled={apiStatus !== 'online' || mutatingMaterialId === item.id} onClick={() => assignMaterial(item)} type="button">
                {t('library.assign')}
              </button>
              <button disabled={apiStatus !== 'online' || mutatingMaterialId === item.id} onClick={() => suggestAssignment(item)} type="button">
                {t('library.suggest')}
              </button>
            </div>
            {assignmentHints[item.id] && <p className="assignment-hint">{assignmentHints[item.id]}</p>}
            {reviewingId === item.id && (
              <div className="review-box" onClick={(e) => e.stopPropagation()}>
                <input
                  aria-label={t('library.materialTitle')}
                  value={reviewDraft.title}
                  onChange={(event) => setReviewDraft((current) => ({ ...current, title: event.target.value }))}
                  placeholder={t('library.materialTitlePlaceholder')}
                />
                <textarea
                  aria-label={t('library.materialBody')}
                  value={reviewDraft.contentText}
                  onChange={(event) => setReviewDraft((current) => ({ ...current, contentText: event.target.value }))}
                  placeholder={t('library.bodyPlaceholder')}
                />
                <textarea
                  aria-label={t('library.mediaLinks')}
                  value={reviewDraft.mediaUrls}
                  onChange={(event) => setReviewDraft((current) => ({ ...current, mediaUrls: event.target.value }))}
                  placeholder={t('library.mediaPlaceholder')}
                />
                <div className="review-actions">
                  <button disabled={mutatingMaterialId === item.id} onClick={() => saveReview(item, false)} type="button">{t('library.saveDraft')}</button>
                  <button disabled={mutatingMaterialId === item.id} onClick={() => saveReview(item, true)} type="button">{t('library.complete')}</button>
                </div>
              </div>
            )}
            <div className="library-card-actions" onClick={(e) => e.stopPropagation()}>
              {materialSourceUrl(item) && (
                <a href={materialSourceUrl(item)} target="_blank" rel="noreferrer">
                  {t('library.open')}
                  <SquareArrowOutUpRight size={14} />
                </a>
              )}
              {canParseMaterial(item) && (
                <button disabled={parsingMaterialId === item.id} onClick={() => parseFromLibrary(item.id)} type="button">
                  <RefreshCw size={14} />
                  {item.parseStatus === 'failed' ? t('library.retryParse') : t('library.parse')}
                </button>
              )}
              <button disabled={apiStatus !== 'online'} onClick={() => openReview(item)} type="button">
                <FileText size={14} />
                {reviewingId === item.id ? t('library.closeReview') : t('library.review')}
              </button>
            </div>
          </article>
          );
        })}
      </div>
      )}
      {deleteConfirm && (
        <div className="modal-overlay" ref={deleteModalRef} onClick={(event) => { if (event.target === event.currentTarget) setDeleteConfirm(null); }} role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="modal-head">
              <AlertTriangle size={24} />
              <h3>{t('library.deleteConfirm.title')}</h3>
            </div>
            <p>{t('library.deleteConfirm.body')} <strong>{deleteConfirm.ids.length}</strong> {t('library.deleteConfirm.materials')}</p>
            <div className="modal-actions">
              <button type="button" onClick={() => setDeleteConfirm(null)}>{t('common.cancel')}</button>
              <button type="button" className="danger" onClick={confirmDelete}>
                <Trash2 size={16} />
                {t('library.deleteConfirm.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
    <FolderImportDialog
      open={folderImportOpen}
      onClose={() => setFolderImportOpen(false)}
      workspaceId={selectedWorkspaceId}
      workspaceTitle={workspaceTitle(workspaces, selectedWorkspaceId)}
      onImported={() => {
        loadMaterials();
        onMaterialMutation?.();
      }}
    />
    </>
  );
}
