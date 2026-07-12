/**
 * 微信读书笔记预览抽屉
 * 点"导入笔记"后先调 preview 获取结构化笔记
 * 支持按章节分组、类型筛选、搜索、勾选
 * 底部显示已选数量和字数，可导入选中笔记
 *
 * 从 WeReadView.jsx 拆分而来，原 props 表面与渲染行为完全保持不变。
 *
 * @module views/weread/WeReadPreviewDrawer
 * @author fxbin
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  ChevronDown,
  Loader2,
  Search,
  X,
} from 'lucide-react';

import api from '../../utils/api';
import {
  PREVIEW_TYPE_ALL,
  PREVIEW_TYPE_BOOKMARK,
  PREVIEW_TYPE_REVIEW,
  PREVIEW_MODE_BATCH,
  PREVIEW_MODE_SINGLE,
  WEREAD_PREVIEW_PATH,
} from '../../constants/weread';

/**
 * 微信读书笔记预览抽屉
 * 点"导入笔记"后先调 preview 获取结构化笔记
 * 支持按章节分组、类型筛选、搜索、勾选
 * 底部显示已选数量和字数，可导入选中笔记
 * @param {Object} props
 * @param {Object} props.book - 当前预览的书籍
 * @param {string} props.mode - 预览模式：single 或 batch
 * @param {number} props.batchCount - 批量模式下的选中书籍数
 * @param {Function} props.onClose - 关闭抽屉回调
 * @param {Function} props.onImport - 确认导入回调
 * @param {Function} props.t - i18n 翻译函数
 */
function WeReadPreviewDrawer({ book, mode, batchCount, onClose, onImport, t }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [type, setType] = useState(PREVIEW_TYPE_ALL);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [collapsedChapters, setCollapsedChapters] = useState(() => new Set());

  useEffect(() => {
    if (!book) return;
    let alive = true;
    setLoading(true);
    setError(null);
    setData(null);
    setSelectedIds(new Set());
    setCollapsedChapters(new Set());
    (async () => {
      try {
        const result = await api.post(WEREAD_PREVIEW_PATH, { bookId: book.bookId });
        if (!alive) return;
        setData(result);
        setLoading(false);
      } catch {
        if (!alive) return;
        setError(t('weread.loadShelfFailed'));
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [book, t]);

  const filteredNotes = useMemo(() => {
    if (!data?.notes) return [];
    let notes = data.notes;
    if (type !== PREVIEW_TYPE_ALL) {
      notes = notes.filter((n) => n.type === type);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      notes = notes.filter((n) => (n.content || '').toLowerCase().includes(q));
    }
    return notes;
  }, [data, type, search]);

  const groupedNotes = useMemo(() => {
    const chapterMap = new Map();
    for (const ch of data?.chapters || []) {
      chapterMap.set(ch.chapterUid, ch);
    }
    const groups = new Map();
    for (const note of filteredNotes) {
      if (!groups.has(note.chapterUid)) {
        groups.set(note.chapterUid, []);
      }
      groups.get(note.chapterUid).push(note);
    }
    return [...groups.entries()].map(([uid, notes]) => {
      const ch = chapterMap.get(uid);
      return {
        chapterUid: uid,
        chapterIdx: ch?.chapterIdx ?? 0,
        chapterTitle: ch?.title || notes[0]?.chapterTitle || '',
        notes,
      };
    }).sort((a, b) => a.chapterIdx - b.chapterIdx);
  }, [filteredNotes, data]);

  const selectedWordCount = useMemo(() => {
    if (!data?.notes) return 0;
    return data.notes
      .filter((n) => selectedIds.has(n.noteId))
      .reduce((sum, n) => sum + (n.content?.length || 0), 0);
  }, [data, selectedIds]);

  const toggleNote = useCallback((noteId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(noteId)) next.delete(noteId);
      else next.add(noteId);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filteredNotes.map((n) => n.noteId)));
  }, [filteredNotes]);

  const invertSelection = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set();
      for (const note of filteredNotes) {
        if (!prev.has(note.noteId)) next.add(note.noteId);
      }
      return next;
    });
  }, [filteredNotes]);

  const selectChapter = useCallback((chapterUid) => {
    const chapterNotes = filteredNotes.filter((n) => n.chapterUid === chapterUid);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const n of chapterNotes) next.add(n.noteId);
      return next;
    });
  }, [filteredNotes]);

  const clearChapter = useCallback((chapterUid) => {
    const chapterNoteIds = filteredNotes
      .filter((n) => n.chapterUid === chapterUid)
      .map((n) => n.noteId);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of chapterNoteIds) next.delete(id);
      return next;
    });
  }, [filteredNotes]);

  const toggleChapterCollapse = useCallback((chapterUid) => {
    setCollapsedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(chapterUid)) next.delete(chapterUid);
      else next.add(chapterUid);
      return next;
    });
  }, []);

  const typeTabs = [
    { key: PREVIEW_TYPE_ALL, label: t('weread.previewAll') },
    { key: PREVIEW_TYPE_BOOKMARK, label: t('weread.previewBookmarks') },
    { key: PREVIEW_TYPE_REVIEW, label: t('weread.previewReviews') },
  ];

  const importLabel = mode === PREVIEW_MODE_BATCH
    ? t('weread.previewImportSelected', { count: batchCount })
    : t('weread.previewImportSelected', { count: selectedIds.size });

  return (
    <>
      <div className="weread-preview-overlay" onClick={onClose} />
      <aside className="weread-preview-drawer" role="dialog" aria-label={t('weread.previewTitle')}>
        <div className="weread-preview-head">
          {book?.cover ? (
            <img src={book.cover} alt="" />
          ) : (
            <span className="weread-cover-placeholder"><BookOpen size={28} /></span>
          )}
          <div className="weread-preview-head-info">
            <h4>{book?.title}</h4>
            {book?.author && <p>{book.author}</p>}
            {data && (
              <div className="weread-preview-counts">
                <span>{t('weread.previewBookmarkCount', { count: data.bookmarkCount })}</span>
                <span>{t('weread.previewReviewCount', { count: data.reviewCount })}</span>
              </div>
            )}
          </div>
          <button
            type="button"
            className="weread-preview-close"
            onClick={onClose}
            aria-label={t('weread.previewClose')}
          >
            <X size={18} />
          </button>
        </div>

        <div className="weread-preview-tools">
          <div className="weread-preview-search">
            <Search size={14} />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('weread.previewSearchPlaceholder')}
              aria-label={t('weread.previewSearchPlaceholder')}
            />
          </div>
          <button type="button" className="weread-preview-group-btn" onClick={selectAll}>
            {t('weread.previewSelectAll')}
          </button>
          <button type="button" className="weread-preview-group-btn" onClick={invertSelection}>
            {t('weread.previewInvert')}
          </button>
        </div>

        <div className="weread-preview-type-tabs">
          {typeTabs.map((tab) => (
            <button
              type="button"
              key={tab.key}
              className={type === tab.key ? 'is-active' : ''}
              onClick={() => setType(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="weread-preview-list">
          {loading ? (
            <div className="weread-preview-loading">
              <Loader2 size={20} className="spin" />
              <span>{t('weread.previewLoading')}</span>
            </div>
          ) : error ? (
            <div className="weread-preview-empty">
              <AlertCircle size={24} />
              <span>{error}</span>
            </div>
          ) : groupedNotes.length === 0 ? (
            <div className="weread-preview-empty">
              <BookOpen size={24} />
              <span>{t('weread.previewEmpty')}</span>
            </div>
          ) : (
            groupedNotes.map((group) => {
              const collapsed = collapsedChapters.has(group.chapterUid);
              return (
                <div key={group.chapterUid}>
                  <div
                    className="weread-preview-group-head"
                    onClick={() => toggleChapterCollapse(group.chapterUid)}
                  >
                    <ChevronDown size={14} className={collapsed ? 'is-collapsed' : ''} />
                    <span>{group.chapterTitle || t('weread.previewChapterLabel', { idx: group.chapterIdx })}</span>
                    <span className="weread-preview-group-count">{group.notes.length}</span>
                    <button
                      type="button"
                      className="weread-preview-group-btn"
                      onClick={(e) => { e.stopPropagation(); selectChapter(group.chapterUid); }}
                    >
                      {t('weread.previewChapter')}
                    </button>
                    <button
                      type="button"
                      className="weread-preview-group-btn"
                      onClick={(e) => { e.stopPropagation(); clearChapter(group.chapterUid); }}
                    >
                      {t('weread.previewClearChapter')}
                    </button>
                  </div>
                  {!collapsed && (
                    <div className="weread-preview-group-body">
                      {group.notes.map((note) => {
                        const isSelected = selectedIds.has(note.noteId);
                        return (
                          <label
                            key={note.noteId}
                            className={`weread-preview-item${isSelected ? ' is-selected' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleNote(note.noteId)}
                            />
                            <div className="weread-preview-item-content">
                              <span className={`weread-preview-tag weread-preview-tag--${note.type}`}>
                                {note.type === PREVIEW_TYPE_BOOKMARK
                                  ? t('weread.previewBookmarks')
                                  : t('weread.previewReviews')}
                              </span>
                              <p className="weread-preview-item-text">{note.content}</p>
                              {note.range && (
                                <p className="weread-preview-item-cite">{note.range}</p>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="weread-preview-footer">
          <div className="weread-preview-footer-info">
            <strong>{t('weread.previewSelected', { count: selectedIds.size })}</strong>
            {selectedWordCount > 0 && (
              <>
                {' · '}
                {t('weread.previewWords', { count: selectedWordCount })}
              </>
            )}
          </div>
          <button type="button" className="weread-preview-cancel" onClick={onClose}>
            {t('weread.cancel')}
          </button>
          <button
            type="button"
            className="weread-preview-import-btn"
            onClick={() => onImport()}
            disabled={mode === PREVIEW_MODE_SINGLE && selectedIds.size === 0}
          >
            <BookOpen size={15} />
            {importLabel}
          </button>
        </div>
      </aside>
    </>
  );
}

export default WeReadPreviewDrawer;
