/**
 * @module views/LibraryView
 * @description 资料库视图，提供资料收集、筛选、批量操作、解析、复核与归属管理。
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Clock3,
  FileText,
  RefreshCw,
  Search,
  Send,
  SquareArrowOutUpRight,
  Trash2,
  Upload,
} from 'lucide-react';
import { captureModeOptions, materialFilterOptions, maxImportedFileSize, supportedImportExtensions } from '../constants/options';
import { statusLabels, typeLabels } from '../constants/labels';
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
 * 资料库视图组件
 * @param {Object} props - 组件参数
 * @param {string} props.apiStatus - API 连接状态
 * @param {Array} props.knowledgeBases - 知识库列表
 * @param {Function} props.onCaptureResult - 收集结果回调
 * @param {Function} props.onMaterialMutation - 资料变更回调
 * @param {Function} props.onParseMaterial - 解析资料回调
 * @param {string} props.parsingMaterialId - 正在解析的资料 ID
 * @returns {JSX.Element} 资料库视图
 */
export default function LibraryView({ apiStatus, knowledgeBases, onCaptureResult, onMaterialMutation, onParseMaterial, parsingMaterialId }) {
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
  const [status, setStatus] = useState('Loading materials...');
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState(null);
  const [batchAssignTarget, setBatchAssignTarget] = useState('');
  const [captureSummary, setCaptureSummary] = useState(null);
  useEffect(() => {
    if (!captureSummary) return undefined;
    const timer = setTimeout(() => setCaptureSummary(null), 9000);
    return () => clearTimeout(timer);
  }, [captureSummary]);

  async function loadMaterials() {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: '180' });
      if (searchValue.trim()) params.set('q', searchValue.trim());
      const response = await fetch(`/api/materials?${params.toString()}`);
      if (!response.ok) throw new Error('Material list unavailable.');
      const result = await response.json();
      setItems(result.materials ?? []);
      setStatus('Materials synced.');
    } catch {
      setStatus('API 未连接，暂时无法读取真实资料库。');
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ limit: '180' });
        if (searchValue.trim()) params.set('q', searchValue.trim());
        const response = await fetch(`/api/materials?${params.toString()}`);
        if (!response.ok) throw new Error('Material list unavailable.');
        const result = await response.json();
        if (!cancelled) {
          setItems(result.materials ?? []);
          setStatus('Materials synced.');
        }
      } catch {
        if (!cancelled) {
          setStatus('API 未连接，暂时无法读取真实资料库。');
          setItems([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [searchValue]);

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

  async function capture() {
    const value = captureValue.trim();
    if (!value || isCapturing || apiStatus !== 'online') return;
    setIsCapturing(true);
    const batchItems = captureMode === 'batch' ? splitBatchCaptureInput(value) : [];
    setStatus(captureMode === 'batch' ? 'Capturing batch...' : 'Capturing material...');
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
        setStatus(failed ? `${captured} 条已收集，${failed} 条失败。` : `${captured} 条资料已进入收集队列。`);
        setCaptureSummary({ message: failed ? `${captured} 条已收集，${failed} 条失败。` : `${captured} 条资料已进入收集队列`, count: captured, at: Date.now() });
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
      setCaptureSummary({ message: result.message || '资料已进入收集队列', count: 1, at: Date.now() });
      await loadMaterials();
    } catch {
      setStatus('收集失败，请确认 API 正在运行。');
    } finally {
      setIsCapturing(false);
    }
  }

  async function importTextFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || isImportingFile) return;
    if (apiStatus !== 'online') {
      setStatus('API 未连接，暂时无法导入本地文档。');
      return;
    }
    const lowerName = file.name.toLowerCase();
    const isSupported = supportedImportExtensions.some((extension) => lowerName.endsWith(extension));
    if (!isSupported) {
      setStatus('目前仅支持 Markdown / TXT 文本文档导入。');
      return;
    }
    if (file.size > maxImportedFileSize) {
      setStatus('文档过大，请先拆分到 2MB 以内再导入。');
      return;
    }
    setIsImportingFile(true);
    setStatus('Importing local document...');
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
      setCaptureSummary({ message: result.message || '本地文档已进入收集队列', count: 1, at: Date.now() });
      await loadMaterials();
    } catch {
      setStatus('导入本地文档失败，请确认文件内容可读取。');
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
    setStatus(markIngested ? 'Completing material...' : 'Saving review draft...');
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
      setStatus('保存补全内容失败，请确认 API 正在运行。');
    } finally {
      setMutatingMaterialId(null);
    }
  }

  async function assignMaterial(item) {
    if (!item?.id || apiStatus !== 'online' || mutatingMaterialId) return;
    const target = assignDrafts[item.id] ?? item.knowledgeBaseId ?? '';
    const newKnowledgeBaseTitle = (newBaseTitles[item.id] ?? item.title ?? '').trim();
    if (!target || (target === item.knowledgeBaseId && target !== '__new')) return;
    setMutatingMaterialId(item.id);
    setStatus('Updating material assignment...');
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
      setStatus('移动资料失败，请确认目标知识库可用。');
    } finally {
      setMutatingMaterialId(null);
    }
  }

  async function suggestAssignment(item) {
    if (!item?.id || apiStatus !== 'online' || mutatingMaterialId) return;
    setMutatingMaterialId(item.id);
    setStatus('Finding assignment suggestion...');
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
      setStatus('生成归属建议失败，请稍后重试。');
    } finally {
      setMutatingMaterialId(null);
    }
  }

  async function deleteSelected() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0 || apiStatus !== 'online' || isBatchProcessing) return;
    const confirmed = window.confirm(`确认删除选中的 ${ids.length} 条资料？相关卡片将解除关联但不会删除。`);
    if (!confirmed) return;
    const snapshot = items;
    setIsBatchProcessing(true);
    setBatchProgress({ done: 0, total: ids.length, action: '删除' });
    setStatus(`正在删除 ${ids.length} 条资料...`);
    const selectedSnapshot = new Set(selectedIds);
    clearSelection();
    setItems((current) => current.filter((item) => !selectedSnapshot.has(item.id)));
    let failed = 0;
    for (let i = 0; i < ids.length; i += 1) {
      try {
        const response = await fetch(`/api/materials/${ids[i]}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('delete failed');
        const result = await response.json();
        onMaterialMutation?.(result);
      } catch {
        failed += 1;
      }
      setBatchProgress({ done: i + 1, total: ids.length, action: '删除' });
    }
    if (failed > 0) {
      setStatus(`${ids.length - failed} 条已删除，${failed} 条失败，正在同步资料库。`);
      setItems(snapshot);
      await loadMaterials();
    } else {
      setStatus(`${ids.length} 条资料已删除。`);
    }
    setBatchProgress(null);
    setIsBatchProcessing(false);
  }

  async function reparseSelected() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0 || apiStatus !== 'online' || isBatchProcessing) return;
    const targets = items.filter((item) => selectedIds.has(item.id) && canParseMaterial(item));
    if (targets.length === 0) {
      setStatus('所选资料暂无可重新解析的条目。');
      return;
    }
    setIsBatchProcessing(true);
    setBatchProgress({ done: 0, total: targets.length, action: '解析' });
    setStatus(`正在重新解析 ${targets.length} 条资料...`);
    let failed = 0;
    for (let i = 0; i < targets.length; i += 1) {
      try {
        if (onParseMaterial) await onParseMaterial(targets[i].id);
      } catch {
        failed += 1;
      }
      setBatchProgress({ done: i + 1, total: targets.length, action: '解析' });
    }
    await loadMaterials();
    setStatus(failed ? `${targets.length - failed} 条已重新解析，${failed} 条失败。` : `${targets.length} 条资料已重新解析。`);
    setBatchProgress(null);
    setIsBatchProcessing(false);
  }

  async function assignSelected() {
    const target = batchAssignTarget;
    const ids = Array.from(selectedIds);
    if (ids.length === 0 || apiStatus !== 'online' || isBatchProcessing || !target) return;
    setIsBatchProcessing(true);
    setBatchProgress({ done: 0, total: ids.length, action: '分配' });
    setStatus(`正在移动 ${ids.length} 条资料...`);
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
      setBatchProgress({ done: i + 1, total: ids.length, action: '分配' });
    }
    await loadMaterials();
    setStatus(failed ? `${ids.length - failed} 条已移动，${failed} 条失败。` : `${ids.length} 条资料已移动。`);
    setBatchAssignTarget('');
    clearSelection();
    setBatchProgress(null);
    setIsBatchProcessing(false);
  }

  return (
    <section className="page-main full">
      <div className="page-title-row">
        <div>
          <h2>Material Repository</h2>
          <p>把链接、文本和问题都收进同一个资料库，再按状态继续解析和整理。</p>
        </div>
        <div className="library-stats">
          <span>{counts.total} items</span>
          <span>{counts.ingested ?? 0} ingested</span>
          <span>{counts.failed ?? 0} failed</span>
        </div>
      </div>

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
            <span>Quick Capture</span>
            <h3>Inbox</h3>
          </div>
          <div className="capture-mode">
            {captureModeOptions.map((mode) => (
              <button className={captureMode === mode ? 'active' : ''} key={mode} onClick={() => setCaptureMode(mode)} type="button">
                {mode}
              </button>
            ))}
          </div>
        </div>
        <div className="capture-box">
          <textarea
            aria-label="快速收集资料"
            value={captureValue}
            onChange={(event) => setCaptureValue(event.target.value)}
            placeholder={captureMode === 'batch' ? 'Paste one source, note, or question per line...' : captureMode === 'link' ? 'Paste a source link...' : 'Paste a note, question, or topic...'}
          />
          <div className="capture-actions">
            <button disabled={apiStatus !== 'online' || isCapturing || !captureValue.trim()} onClick={capture} type="button">
              {isCapturing ? <Clock3 size={18} /> : <Send size={18} />}
              Capture
            </button>
            <label className={`file-import-button ${apiStatus !== 'online' || isImportingFile ? 'disabled' : ''}`}>
              {isImportingFile ? <Clock3 size={18} /> : <Upload size={18} />}
              Import
              <input
                accept=".md,.markdown,.txt,text/markdown,text/plain"
                aria-label="导入本地文档"
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
            aria-label="全选当前可见资料"
            checked={allVisibleSelected}
            ref={(node) => { if (node) node.indeterminate = someVisibleSelected; }}
            onChange={toggleSelectAllVisible}
            disabled={filteredItems.length === 0}
          />
          <span>{selectedIds.size > 0 ? `已选 ${selectedIds.size}` : '全选'}</span>
        </label>
        <div className="filter-bar">
          {materialFilterOptions.map((option) => (
            <button className={filter === option.key ? 'active' : ''} key={option.key} onClick={() => setFilter(option.key)} type="button">
              {option.label}
            </button>
          ))}
        </div>
        <label className="library-search">
          <Search size={18} />
          <input aria-label="搜索资料" value={searchValue} onChange={(event) => setSearchValue(event.target.value)} placeholder="Search materials..." />
        </label>
      </div>

      {selectedIds.size > 0 && (
        <div className="library-batch-bar">
          <div className="library-batch-info">
            <strong>已选 {selectedIds.size}</strong>
            {batchProgress && (
              <span className="library-batch-progress">
                {batchProgress.action} {batchProgress.done}/{batchProgress.total}
              </span>
            )}
          </div>
          <div className="library-batch-actions">
            <button type="button" disabled={isBatchProcessing || apiStatus !== 'online'} onClick={reparseSelected}>
              <RefreshCw size={14} />
              重新解析
            </button>
            <select
              aria-label="批量移动到知识库"
              value={batchAssignTarget}
              onChange={(event) => setBatchAssignTarget(event.target.value)}
              disabled={isBatchProcessing || apiStatus !== 'online'}
            >
              <option value="">移动到…</option>
              {knowledgeBases.map((base) => <option key={base.id ?? base.title} value={base.id}>{base.title}</option>)}
            </select>
            <button type="button" disabled={isBatchProcessing || apiStatus !== 'online' || !batchAssignTarget} onClick={assignSelected}>
              移动
            </button>
            <button type="button" className="danger" disabled={isBatchProcessing || apiStatus !== 'online'} onClick={deleteSelected}>
              <Trash2 size={14} />
              删除
            </button>
            <button type="button" disabled={isBatchProcessing} onClick={clearSelection}>
              取消选择
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <EmptyState title="正在同步资料库" body="稍等一下，正在读取本地 API 里的资料。" />
      ) : filteredItems.length === 0 ? (
        <EmptyState title="暂无匹配资料" body="换一个筛选条件，或先从上方收集一条链接/文本。" />
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
                  aria-label={`选择 ${item.title}`}
                  checked={selectedIds.has(item.id)}
                  onChange={() => toggleMaterialSelection(item.id)}
                />
              </label>
              <Icon size={22} />
              <div className="material-meta">
                <span>{typeLabels[item.type] ?? item.type}</span>
                <span>{statusLabels[item.parseStatus] ?? item.parseStatus}</span>
              </div>
            </div>
            <h3>{item.title}</h3>
            <p>{materialPreview(item)}</p>
            <ParseTimeline item={item} />
            {item.parseError && <p className="library-error">{item.parseError}</p>}
            <div className="tag-row">
              <span>{knowledgeBaseTitle(knowledgeBases, item.knowledgeBaseId)}</span>
              <span>{item.platform ?? 'local'}</span>
              <span>{formatMaterialTime(item.createdAt)}</span>
              {materialMediaUrls(item).length > 0 && <span>{materialMediaUrls(item).length} media</span>}
            </div>
            <MediaPreview urls={materialMediaUrls(item)} compact />
            <div className="assignment-row">
              <select
                aria-label="选择资料归属知识库"
                value={assignDrafts[item.id] ?? item.knowledgeBaseId ?? ''}
                onChange={(event) => setAssignDrafts((current) => ({ ...current, [item.id]: event.target.value }))}
              >
                <option value="">Move to...</option>
                {knowledgeBases.map((base) => <option key={base.id ?? base.title} value={base.id}>{base.title}</option>)}
                <option value="__new">New knowledge base</option>
              </select>
              {(assignDrafts[item.id] ?? item.knowledgeBaseId) === '__new' && (
                <input
                  aria-label="新知识库标题"
                  value={newBaseTitles[item.id] ?? item.title ?? ''}
                  onChange={(event) => setNewBaseTitles((current) => ({ ...current, [item.id]: event.target.value }))}
                  placeholder="Knowledge base title"
                />
              )}
              <button disabled={apiStatus !== 'online' || mutatingMaterialId === item.id} onClick={() => assignMaterial(item)} type="button">
                Assign
              </button>
              <button disabled={apiStatus !== 'online' || mutatingMaterialId === item.id} onClick={() => suggestAssignment(item)} type="button">
                Suggest
              </button>
            </div>
            {assignmentHints[item.id] && <p className="assignment-hint">{assignmentHints[item.id]}</p>}
            {reviewingId === item.id && (
              <div className="review-box">
                <input
                  aria-label="资料标题"
                  value={reviewDraft.title}
                  onChange={(event) => setReviewDraft((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Title"
                />
                <textarea
                  aria-label="手动补充正文"
                  value={reviewDraft.contentText}
                  onChange={(event) => setReviewDraft((current) => ({ ...current, contentText: event.target.value }))}
                  placeholder="Paste or edit the material text..."
                />
                <textarea
                  aria-label="手动补充媒体链接"
                  value={reviewDraft.mediaUrls}
                  onChange={(event) => setReviewDraft((current) => ({ ...current, mediaUrls: event.target.value }))}
                  placeholder="Media URLs, one per line..."
                />
                <div className="review-actions">
                  <button disabled={mutatingMaterialId === item.id} onClick={() => saveReview(item, false)} type="button">Save Draft</button>
                  <button disabled={mutatingMaterialId === item.id} onClick={() => saveReview(item, true)} type="button">Complete</button>
                </div>
              </div>
            )}
            <div className="library-card-actions">
              {materialSourceUrl(item) && (
                <a href={materialSourceUrl(item)} target="_blank" rel="noreferrer">
                  Open
                  <SquareArrowOutUpRight size={14} />
                </a>
              )}
              {canParseMaterial(item) && (
                <button disabled={parsingMaterialId === item.id} onClick={() => parseFromLibrary(item.id)} type="button">
                  <RefreshCw size={14} />
                  {item.parseStatus === 'failed' ? 'Retry Parse' : 'Parse'}
                </button>
              )}
              <button disabled={apiStatus !== 'online'} onClick={() => openReview(item)} type="button">
                <FileText size={14} />
                {reviewingId === item.id ? 'Close Review' : 'Review'}
              </button>
            </div>
          </article>
          );
        })}
      </div>
      )}
    </section>
  );
}
