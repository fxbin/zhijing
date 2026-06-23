/**
 * @module views/LibraryView
 * @description 资料库视图，提供资料收集、筛选、批量操作、解析、复核与归属管理。
 * @author fxbin
 */

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  BookOpen,
  Clock3,
  FileText,
  RefreshCw,
  Search,
  Send,
  SquareArrowOutUpRight,
  Trash2,
  Upload,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { captureModeOptions, materialFilterOptions, maxImportedFileSize, supportedImportExtensions } from '../constants/options';
import { getIntakeKindLabel, getParseStatusLabel } from '../utils/i18nLabels';
import {
  canParseMaterial,
  formatMaterialTime,
  materialIcon,
  materialMediaUrls,
  materialPreview,
  materialSourceUrl,
  materialState,
  splitBatchCaptureInput,
  splitMediaUrls,
} from '../utils/material';
import { knowledgeBaseTitle } from '../utils/knowledge';
import CaptureSuccessBanner from '../components/CaptureSuccessBanner';
import EmptyState from '../components/EmptyState';
import ImportLifecyclePanel from '../components/ImportLifecyclePanel';
import MediaPreview from '../components/MediaPreview';
import ParseTimeline from '../components/ParseTimeline';

/**
 * 资料库搜索防抖时长（毫秒），避免用户每输入一个字符就触发一次请求。
 */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * 资料库视图组件
 * @param {Object} props - 组件参数
 * @param {string} props.apiStatus - API 连接状态
 * @param {Array} props.knowledgeBases - 知识库列表
 * @param {Function} props.onCaptureResult - 收集结果回调
 * @param {Function} props.onMaterialMutation - 资料变更回调
 * @param {Function} props.onNavigate - 视图跳转回调，用于跳转到其他视图（如微信读书导入）
 * @param {Function} props.onParseMaterial - 解析资料回调
 * @param {string} props.parsingMaterialId - 正在解析的资料 ID
 * @returns {JSX.Element} 资料库视图
 * @author fxbin
 */
export default function LibraryView({ apiStatus, knowledgeBases, onCaptureResult, onMaterialMutation, onNavigate, onParseMaterial, parsingMaterialId, selectedKnowledgeBaseId }) {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchValue, setSearchValue] = useState('');
  const [captureValue, setCaptureValue] = useState('');
  const [captureMode, setCaptureMode] = useState('auto');
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewDraft, setReviewDraft] = useState({ title: '', contentText: '', mediaUrls: '' });
  const [assignDrafts, setAssignDrafts] = useState({});
  const [newBaseTitles, setNewBaseTitles] = useState({});
  const [assignmentHints, setAssignmentHints] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isImportingFile, setIsImportingFile] = useState(false);
  const [mutatingMaterialId, setMutatingMaterialId] = useState(null);
  const [status, setStatus] = useState(t('library.status.loadingMaterials'));
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState(null);
  const [batchAssignTarget, setBatchAssignTarget] = useState('');
  const [captureSummary, setCaptureSummary] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [dedupeNotice, setDedupeNotice] = useState(null);
  useEffect(() => {
    if (!captureSummary) return undefined;
    const timer = setTimeout(() => setCaptureSummary(null), 9000);
    return () => clearTimeout(timer);
  }, [captureSummary]);

  async function loadMaterials() {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: '180' });
      if (selectedKnowledgeBaseId) params.set('knowledgeBaseId', selectedKnowledgeBaseId);
      if (searchValue.trim()) params.set('q', searchValue.trim());
      const response = await fetch(`/api/materials?${params.toString()}`);
      if (!response.ok) throw new Error('Material list unavailable.');
      const result = await response.json();
      setItems(result.materials ?? []);
      setStatus(t('library.status.materialsSynced'));
    } catch {
      setStatus(t('library.status.apiDisconnectedLibrary'));
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      async function run() {
        setIsLoading(true);
        try {
          const params = new URLSearchParams({ limit: '180' });
          if (selectedKnowledgeBaseId) params.set('knowledgeBaseId', selectedKnowledgeBaseId);
          if (searchValue.trim()) params.set('q', searchValue.trim());
          const response = await fetch(`/api/materials?${params.toString()}`);
          if (!response.ok) throw new Error('Material list unavailable.');
          const result = await response.json();
          if (!cancelled) {
            setItems(result.materials ?? []);
            setStatus(t('library.status.materialsSynced'));
          }
        } catch {
          if (!cancelled) {
            setStatus(t('library.status.apiDisconnectedLibrary'));
            setItems([]);
          }
        } finally {
          if (!cancelled) setIsLoading(false);
        }
      }
      run();
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchValue, selectedKnowledgeBaseId, t]);

  const filteredItems = items.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'failed' || filter === 'parsing') return item.parseStatus === filter;
    return item.type === filter;
  });

  const visibleIds = filteredItems.map((item) => item.id);
  const selectedVisibleCount = visibleIds.filter((id) => selectedIds.has(id)).length;
  const allVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;
  const someVisibleSelected = selectedVisibleCount > 0 && !allVisibleSelected;

  function toggleMaterialSelection(id) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllVisible() {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        for (const id of visibleIds) next.delete(id);
      } else {
        for (const id of visibleIds) next.add(id);
      }
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function archiveSingleMaterial(id) {
    try {
      const response = await fetch(`/api/materials/${id}/archive`, { method: 'POST' });
      if (!response.ok) throw new Error('Archive failed.');
      setItems((current) => current.filter((item) => item.id !== id));
      setSelectedIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
      if (onMaterialMutation) onMaterialMutation();
    } catch {
      setStatus(t('library.archiveFailed'));
    }
  }

  const counts = items.reduce((acc, item) => {
    acc.total += 1;
    acc[item.type] = (acc[item.type] ?? 0) + 1;
    acc[item.parseStatus] = (acc[item.parseStatus] ?? 0) + 1;
    return acc;
  }, { total: 0 });

  const lifecycleStats = useMemo(() => {
    const sources = new Map();
    let duplicateSignals = 0;
    for (const item of items) {
      const key = (item.sourceUrl || item.rawInput || item.title || '').trim().toLowerCase();
      if (!key) continue;
      const next = (sources.get(key) ?? 0) + 1;
      sources.set(key, next);
      if (next === 2) duplicateSignals += 1;
    }
    return {
      total: items.length,
      saved: counts.saved ?? 0,
      parsing: counts.parsing ?? 0,
      needsReview: counts.needs_review ?? 0,
      failed: counts.failed ?? 0,
      ingested: counts.ingested ?? 0,
      media: items.reduce((sum, item) => sum + materialMediaUrls(item).length, 0),
      duplicateSignals,
      recent: items.slice(0, 4),
      reviewItems: items.filter((item) => item.parseStatus === 'needs_review' || item.parseStatus === 'failed').slice(0, 3),
    };
  }, [items, counts.failed, counts.ingested, counts.needs_review, counts.parsing, counts.saved]);

  useEffect(() => {
    if (lifecycleStats.duplicateSignals > 0) {
      setDedupeNotice({
        count: lifecycleStats.duplicateSignals,
        hint: t('library.dedupeNotice.hint'),
      });
    } else {
      setDedupeNotice(null);
    }
  }, [lifecycleStats.duplicateSignals]);

  async function capture() {
    const value = captureValue.trim();
    if (!value || isCapturing || apiStatus !== 'online') return;
    setIsCapturing(true);
    const batchItems = captureMode === 'batch' ? splitBatchCaptureInput(value) : [];
    setStatus(captureMode === 'batch' ? t('library.status.capturingBatch') : t('library.status.capturingMaterial'));
    try {
      if (captureMode === 'batch') {
        if (batchItems.length === 0) throw new Error('Empty batch.');
        let captured = 0;
        let failed = 0;
        let lastResult = null;
        for (const input of batchItems) {
          const response = await fetch('/api/intake', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input }),
          });
          if (response.ok) {
            lastResult = await response.json();
            captured += 1;
          } else {
            failed += 1;
          }
        }
        if (lastResult) onCaptureResult(lastResult);
        setCaptureValue('');
        setStatus(failed ? t('library.status.captureBatchResultWithFailed', { captured, failed }) : t('library.status.captureBatchResultSuccess', { captured }));
        setCaptureSummary({ message: failed ? t('library.status.captureBatchResultWithFailed', { captured, failed }) : t('library.status.captureBatchResultSuccess', { captured }), count: captured, at: Date.now() });
        await loadMaterials();
        return;
      }
      const response = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: value }),
      });
      if (!response.ok) throw new Error('Capture failed.');
      const result = await response.json();
      onCaptureResult(result);
      setCaptureValue('');
      setStatus(result.message);
      setCaptureSummary({ message: result.message || t('library.status.materialCaptured'), count: 1, at: Date.now() });
      await loadMaterials();
    } catch {
      setStatus(t('library.status.captureFailed'));
    } finally {
      setIsCapturing(false);
    }
  }

  async function importTextFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || isImportingFile) return;
    if (apiStatus !== 'online') {
      setStatus(t('library.status.apiDisconnectedImport'));
      return;
    }
    const lowerName = file.name.toLowerCase();
    const isSupported = supportedImportExtensions.some((extension) => lowerName.endsWith(extension));
    if (!isSupported) {
      setStatus(t('library.status.unsupportedFileType'));
      return;
    }
    if (file.size > maxImportedFileSize) {
      setStatus(t('library.status.fileTooLarge'));
      return;
    }
    setIsImportingFile(true);
    setStatus(t('library.status.importingFile'));
    try {
      const text = (await file.text()).trim();
      if (!text) throw new Error('Empty file.');
      const response = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: `本地文档：${file.name}\n\n${text}` }),
      });
      if (!response.ok) throw new Error('File import failed.');
      const result = await response.json();
      onCaptureResult(result);
      setStatus(result.message);
      setCaptureSummary({ message: result.message || t('library.status.localFileCaptured'), count: 1, at: Date.now() });
      await loadMaterials();
    } catch {
      setStatus(t('library.status.importFileFailed'));
    } finally {
      setIsImportingFile(false);
    }
  }

  async function parseFromLibrary(materialId) {
    if (!onParseMaterial) return;
    await onParseMaterial(materialId);
    await loadMaterials();
  }

  function openReview(item) {
    setReviewingId((current) => current === item.id ? null : item.id);
    setReviewDraft({
      title: item.title ?? '',
      contentText: item.contentText ?? '',
      mediaUrls: (materialMediaUrls(item) ?? []).join('\n'),
    });
  }

  async function saveReview(item, markIngested) {
    if (!item?.id || apiStatus !== 'online' || mutatingMaterialId) return;
    setMutatingMaterialId(item.id);
    setStatus(markIngested ? t('library.status.completingMaterial') : t('library.status.savingReviewDraft'));
    try {
      const response = await fetch(`/api/materials/${item.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: reviewDraft.title,
          contentText: reviewDraft.contentText,
          mediaUrls: splitMediaUrls(reviewDraft.mediaUrls),
          markIngested,
        }),
      });
      if (!response.ok) throw new Error('Review save failed.');
      const result = await response.json();
      onMaterialMutation?.(result);
      setStatus(result.message);
      if (markIngested) setReviewingId(null);
      await loadMaterials();
    } catch {
      setStatus(t('library.status.saveReviewFailed'));
    } finally {
      setMutatingMaterialId(null);
    }
  }

  async function assignMaterial(item) {
    if (!item?.id || apiStatus !== 'online' || mutatingMaterialId) return;
    const target = assignDrafts[item.id] ?? item.knowledgeBaseId ?? '';
    const newKnowledgeBaseTitle = (newBaseTitles[item.id] ?? item.title ?? '').trim();
    if (!target) return;
    if (target === item.knowledgeBaseId && target !== '__new') {
      setStatus(t('library.status.alreadyInThisKb'));
      setAssignDrafts((current) => ({ ...current, [item.id]: undefined }));
      return;
    }
    setMutatingMaterialId(item.id);
    setStatus(t('library.status.updatingAssignment'));
    try {
      const response = await fetch(`/api/materials/${item.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(target === '__new'
          ? { newKnowledgeBaseTitle }
          : { knowledgeBaseId: target }),
      });
      if (!response.ok) throw new Error('Assignment failed.');
      const result = await response.json();
      onMaterialMutation?.(result);
      setStatus(result.message);
      setAssignDrafts((current) => ({ ...current, [item.id]: result.knowledgeBase.id }));
      await loadMaterials();
    } catch {
      setStatus(t('library.status.moveMaterialFailed'));
    } finally {
      setMutatingMaterialId(null);
    }
  }

  async function suggestAssignment(item) {
    if (!item?.id || apiStatus !== 'online' || mutatingMaterialId) return;
    setMutatingMaterialId(item.id);
    setStatus(t('library.status.findingSuggestion'));
    try {
      const response = await fetch(`/api/materials/${item.id}/assignment-suggestions`);
      if (!response.ok) throw new Error('Suggestion failed.');
      const result = await response.json();
      const suggestion = result.suggestions?.[0];
      if (suggestion?.isNew) {
        setAssignDrafts((current) => ({ ...current, [item.id]: '__new' }));
        setNewBaseTitles((current) => ({ ...current, [item.id]: suggestion.title }));
      } else if (suggestion?.knowledgeBaseId) {
        setAssignDrafts((current) => ({ ...current, [item.id]: suggestion.knowledgeBaseId }));
      }
      setAssignmentHints((current) => ({
        ...current,
        [item.id]: suggestion ? `${suggestion.title} · ${suggestion.reason}` : result.message,
      }));
      setStatus(result.message);
    } catch {
      setStatus(t('library.status.suggestionFailed'));
    } finally {
      setMutatingMaterialId(null);
    }
  }

  function requestDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0 || apiStatus !== 'online' || isBatchProcessing) return;
    setDeleteConfirm({ ids });
  }

  async function confirmDelete() {
    const ids = deleteConfirm?.ids ?? [];
    if (ids.length === 0) return;
    setDeleteConfirm(null);
    const snapshot = items;
    setIsBatchProcessing(true);
    setBatchProgress({ done: 0, total: ids.length, action: t('common.delete') });
    setStatus(t('library.status.deletingMaterials', { count: ids.length }));
    const selectedSnapshot = new Set(ids);
    clearSelection();
    setItems((current) => current.filter((item) => !selectedSnapshot.has(item.id)));
    let failed = 0;
    const failedIds = [];
    for (let i = 0; i < ids.length; i += 1) {
      try {
        const response = await fetch(`/api/materials/${ids[i]}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('delete failed');
        const result = await response.json();
        onMaterialMutation?.(result);
      } catch {
        failed += 1;
        failedIds.push(ids[i]);
      }
      setBatchProgress({ done: i + 1, total: ids.length, action: t('common.delete') });
    }
    if (failed > 0) {
      setStatus(t('library.status.deletePartialFailed', { success: ids.length - failed, failed }));
      setItems(snapshot);
      setSelectedIds(new Set(failedIds));
      await loadMaterials();
    } else {
      setStatus(t('library.status.deleteSuccess', { count: ids.length }));
    }
    setBatchProgress(null);
    setIsBatchProcessing(false);
  }

  async function reparseSelected() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0 || apiStatus !== 'online' || isBatchProcessing) return;
    const targets = items.filter((item) => selectedIds.has(item.id) && canParseMaterial(item));
    if (targets.length === 0) {
      setStatus(t('library.status.noReparseTargets'));
      return;
    }
    setIsBatchProcessing(true);
    setBatchProgress({ done: 0, total: targets.length, action: t('library.parse') });
    setStatus(t('library.status.reparsingMaterials', { count: targets.length }));
    let failed = 0;
    for (let i = 0; i < targets.length; i += 1) {
      try {
        if (onParseMaterial) await onParseMaterial(targets[i].id);
      } catch {
        failed += 1;
      }
      setBatchProgress({ done: i + 1, total: targets.length, action: t('library.parse') });
    }
    await loadMaterials();
    setStatus(failed ? t('library.status.reparsePartialFailed', { success: targets.length - failed, failed }) : t('library.status.reparseSuccess', { count: targets.length }));
    setBatchProgress(null);
    setIsBatchProcessing(false);
  }

  async function assignSelected() {
    const target = batchAssignTarget;
    const ids = Array.from(selectedIds);
    if (ids.length === 0 || apiStatus !== 'online' || isBatchProcessing || !target) return;
    setIsBatchProcessing(true);
    setBatchProgress({ done: 0, total: ids.length, action: t('library.assign') });
    setStatus(t('library.status.movingMaterials', { count: ids.length }));
    let failed = 0;
    for (let i = 0; i < ids.length; i += 1) {
      try {
        const response = await fetch(`/api/materials/${ids[i]}/assign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ knowledgeBaseId: target }),
        });
        if (!response.ok) throw new Error('assign failed');
        const result = await response.json();
        onMaterialMutation?.(result);
      } catch {
        failed += 1;
      }
      setBatchProgress({ done: i + 1, total: ids.length, action: t('library.assign') });
    }
    await loadMaterials();
    setStatus(failed ? t('library.status.movePartialFailed', { success: ids.length - failed, failed }) : t('library.status.moveSuccess', { count: ids.length }));
    setBatchAssignTarget('');
    clearSelection();
    setBatchProgress(null);
    setIsBatchProcessing(false);
  }

  return (
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
                accept=".md,.markdown,.txt,text/markdown,text/plain"
                aria-label={t('library.importDocument')}
                disabled={apiStatus !== 'online' || isImportingFile}
                onChange={importTextFile}
                type="file"
              />
            </label>
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
            onChange={toggleSelectAllVisible}
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
              {knowledgeBases.map((base) => <option key={base.id ?? base.title} value={base.id}>{base.title}</option>)}
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
          return (
          <article className={`library-card ${materialState(item.parseStatus)} ${selectedIds.has(item.id) ? 'selected' : ''}`} key={item.id}>
            <div className="library-card-head">
              <label className="library-card-select">
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
            </div>
            <h3>{item.title}</h3>
            <p>{materialPreview(item)}</p>
            <ParseTimeline item={item} />
            {item.parseError && <p className="library-error">{item.parseError}</p>}
            <div className="tag-row">
              <span>{knowledgeBaseTitle(knowledgeBases, item.knowledgeBaseId)}</span>
              <span>{item.platform ?? t('library.localPlatform')}</span>
              <span>{formatMaterialTime(item.createdAt)}</span>
              {materialMediaUrls(item).length > 0 && <span>{t('library.mediaCount', { count: materialMediaUrls(item).length })}</span>}
            </div>
            <MediaPreview urls={materialMediaUrls(item)} compact />
            <div className="assignment-row">
              <select
                aria-label={t('library.selectKb')}
                value={assignDrafts[item.id] ?? item.knowledgeBaseId ?? ''}
                onChange={(event) => setAssignDrafts((current) => ({ ...current, [item.id]: event.target.value }))}
              >
                <option value="">{t('library.moveTo')}</option>
                {knowledgeBases.map((base) => <option key={base.id ?? base.title} value={base.id}>{base.title}</option>)}
                <option value="__new">{t('library.newKnowledgeBase')}</option>
              </select>
              {(assignDrafts[item.id] ?? item.knowledgeBaseId) === '__new' && (
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
              <div className="review-box">
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
            <div className="library-card-actions">
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
        <div className="modal-overlay" role="dialog" aria-modal="true">
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
  );
}
