import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  BookOpen,
  BookmarkCheck,
  CheckCircle2,
  ChevronDown,
  LayoutGrid,
  List as ListIcon,
  Loader2,
  RefreshCw,
  Search,
  Settings,
  X,
} from 'lucide-react';

import api from '../utils/api';
import { useWeReadShelfState } from '../hooks/useWeReadShelfState';
import { useStatisticsGate } from '../hooks/useStatisticsGate';
import { useWeReadQuadrant } from '../hooks/useWeReadQuadrant';
import { useWeReadGlobalTopicSpectrum } from '../hooks/useWeReadGlobalTopicSpectrum';
import { QuadrantGrid } from '../components/QuadrantCard';
import TopicSpectrumChart from '../components/TopicSpectrumChart';
import { useWeReadCatalogState } from '../hooks/useWeReadCatalogState';
import { useWeReadImportState } from '../hooks/useWeReadImportState';
import { useBookSignals } from '../hooks/useBookSignals';
import { useHiddenInterest } from '../hooks/useHiddenInterest';
import HiddenInterestBanner from '../components/HiddenInterestBanner';
import {
  TAB_BOOKS,
  TAB_ALBUMS,
  TAB_ARCHIVE,
  TAB_REVIEW,
  TAB_STATS,
  TAB_RECOMMEND,
  SORT_RECENT,
  SORT_TITLE,
  SORT_AUTHOR,
  VIEW_GRID,
  VIEW_LIST,
  FILTER_ALL,
  FILTER_FINISHED,
  FILTER_READING,
  FILTER_IMPORTED,
  PAGE_INCREMENT,
  SKELETON_COUNT,
  CATEGORY_FACET_LIMIT,
  MS_PER_SECOND,
  PERCENT_BASE,
  SCROLL_ROOT_MARGIN,
  CARD_STATE_IDLE,
  CARD_STATE_IMPORTING,
  CARD_STATE_DONE,
  CARD_STATE_FAILED,
  FINISHED_FLAG,
  TOAST_TYPE_SUCCESS,
  TOAST_TYPE_ERROR,
  WEREAD_SIGNALS_REFRESH_PATH,
} from '../constants/weread';
import WeReadCard, { WeReadCardSkeleton } from './weread/WeReadCard';
import WeReadStatsBand from './weread/WeReadStatsBand';
import WeReadPreviewDrawer from './weread/WeReadPreviewDrawer';
import WeReadRecommendPanel from './weread/WeReadRecommendPanel';
import {
  wereadWebBookUrl,
  copyTextToClipboard,
  formatRelativeTime,
} from './weread/utils';

/**
 * 微信读书视图主组件。
 *
 * 聚合书架、书单、归档、回顾、统计、推荐六个 Tab，
 * 通过 hooks 组合管理书架状态、目录状态、导入流程、笔记信号、四象限、主题谱等。
 *
 * 子组件已拆分到 ./weread/ 目录下：
 * - WeReadCard / WeReadCardSkeleton：书籍卡片与骨架屏
 * - WeReadStatsBand：统计仪表盘
 * - WeReadPreviewDrawer：笔记预览抽屉
 * - WeReadRecommendPanel：智能推荐面板
 * - CategoryChip：分类徽标
 * 工具函数与分类主题映射统一在 ./weread/utils 中维护。
 *
 * @module views/WeReadView
 * @author fxbin
 */
export default function WeReadView({ workspaces = [], selectedWorkspaceId, onOpenWorkspace }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(TAB_BOOKS);
  const sentinelRef = useRef(null);

  const {
    configured,
    shelfBooks,
    syncState,
    isSyncing,
    syncError,
    loading,
    error,
    stats,
    statsCollapsed,
    loadMeta,
    syncShelf,
    handleToggleStatsCollapse,
  } = useWeReadShelfState({ t });

  const statsGate = useStatisticsGate('weReadStatsBand', {
    dependsOnBehaviorTrace: true,
    sharedAcrossUsers: false,
    hasRankingOrComparison: false,
    emphasizesQuantity: true,
    exposesRawData: true,
    allowsUserChallenge: true,
    isLinearlyOptimizable: false,
  });

  const {
    query,
    setQuery,
    debouncedQuery,
    sort,
    setSort,
    activeCategories,
    setActiveCategories,
    view,
    setView,
    filter,
    setFilter,
    visibleCount,
    setVisibleCount,
    expandedArchives,
    toggleCategory,
    clearFilters,
    toggleArchive,
  } = useWeReadCatalogState({ activeTab });

  const books = useMemo(() => shelfBooks ?? [], [shelfBooks]);
  const albums = useMemo(() => [], []);

  const bookMap = useMemo(() => {
    const m = new Map();
    for (const b of books) m.set(String(b.bookId), b);
    return m;
  }, [books]);

  const {
    importingIds,
    importResults,
    selecting,
    selectedIds,
    batch,
    previewBook,
    previewMode,
    toast,
    setToast,
    targetKbId,
    setTargetKbId,
    importBook,
    handleImport,
    closePreview,
    toggleSelect,
    enterSelecting,
    exitSelecting,
    selectAllFiltered,
    batchImport,
    handlePreviewImport,
    handleOpenImported,
  } = useWeReadImportState({ t, onOpenWorkspace, bookMap, selectedWorkspaceId });

  const allShelfBookIds = useMemo(() => {
    if (!Array.isArray(shelfBooks)) return [];
    return shelfBooks.map((book) => String(book.bookId));
  }, [shelfBooks]);

  const {
    loading: signalsRefreshing,
    error: signalsError,
    refreshSignals,
  } = useBookSignals(allShelfBookIds);

  const signalsCoverage = useMemo(() => {
    if (!Array.isArray(shelfBooks) || shelfBooks.length === 0) return 0;
    const withSignals = shelfBooks.filter((book) => Boolean(book.signalsSyncedAt)).length;
    return withSignals / shelfBooks.length;
  }, [shelfBooks]);

  const signalsCoverageLow = signalsCoverage > 0 && signalsCoverage < 0.5;
  const quadrantState = useWeReadQuadrant(activeTab === TAB_STATS);
  const globalTopicSpectrum = useWeReadGlobalTopicSpectrum();

  useEffect(() => {
    globalTopicSpectrum.ensureLoaded();
  }, [globalTopicSpectrum.ensureLoaded]);

  const [signalsToast, setSignalsToast] = useState(null);
  const [signalsProgress, setSignalsProgress] = useState(null);
  const signalsAbortRef = useRef(null);

  const hiddenInterest = useHiddenInterest();

  useEffect(() => {
    hiddenInterest.fetchHint();
  }, [hiddenInterest.fetchHint]);

  const handleHiddenInterestShown = useCallback(async () => {
    const ok = await hiddenInterest.markShown();
    if (ok) {
      await hiddenInterest.fetchHint();
    }
  }, [hiddenInterest]);

  const handleHiddenInterestDismissBook = useCallback(async (bookId) => {
    const ok = await hiddenInterest.dismissBook(bookId);
    if (ok) {
      await hiddenInterest.fetchHint();
    }
  }, [hiddenInterest]);

  const handleHiddenInterestTogglePermanent = useCallback(async () => {
    const ok = await hiddenInterest.togglePermanent(true);
    if (ok) {
      await hiddenInterest.fetchHint();
    }
  }, [hiddenInterest]);

  const handleRefreshSignals = useCallback(async () => {
    if (!Array.isArray(shelfBooks) || shelfBooks.length === 0) return;
    const now = Date.now();
    const ttlMs = 7 * 24 * 60 * 60 * 1000;
    const ids = shelfBooks
      .filter((book) => {
        if (!book.signalsSyncedAt) return true;
        const syncedAt = new Date(book.signalsSyncedAt).getTime();
        return Number.isNaN(syncedAt) || now - syncedAt > ttlMs;
      })
      .map((book) => String(book.bookId));
    if (ids.length === 0) {
      setSignalsToast({ type: 'success', text: '所有书籍笔记信号均在7天内已刷新，无需重复拉取' });
      return;
    }

    const controller = new AbortController();
    signalsAbortRef.current = controller;
    const batchSize = 10;
    let synced = 0;
    let failed = 0;
    const failures = [];

    for (let i = 0; i < ids.length; i += batchSize) {
      if (controller.signal.aborted) break;
      const batch = ids.slice(i, i + batchSize);
      setSignalsProgress({ done: i, total: ids.length });
      try {
        const response = await api.post(WEREAD_SIGNALS_REFRESH_PATH, { bookIds: batch });
        const result = response?.result ?? response;
        synced += result?.synced ?? 0;
        failed += result?.failed ?? 0;
        if (Array.isArray(result?.failures)) {
          failures.push(...result.failures);
        }
      } catch {
        failed += batch.length;
        for (const id of batch) {
          failures.push({ bookId: id, reason: '批次请求失败' });
        }
      }
    }

    signalsAbortRef.current = null;
    setSignalsProgress(null);

    if (controller.signal.aborted) {
      setSignalsToast({ type: 'warning', text: `信号刷新已取消：已完成 ${synced + (ids.length - synced - failed)} /${ids.length} 本` });
    } else if (failed > 0) {
      setSignalsToast({ type: 'warning', text: `信号刷新完成：${synced} 本更新，${ids.length - synced - failed} 本无变化，${failed} 失败` });
    } else if (synced === 0) {
      setSignalsToast({ type: 'success', text: `信号刷新完成：${ids.length} 本均已检查，数据无变化` });
    } else {
      setSignalsToast({ type: 'success', text: `信号刷新完成：${synced} 本更新，${ids.length - synced} 本无变化` });
    }
    await loadMeta();
    quadrantState.refresh();
  }, [shelfBooks, loadMeta, quadrantState]);

  const handleCancelSignalsRefresh = useCallback(() => {
    if (signalsAbortRef.current) {
      signalsAbortRef.current.abort();
    }
  }, []);

  const archiveGroups = useMemo(() => {
    const groups = new Map();
    for (const book of books) {
      const year = book.archiveYear;
      if (!year) continue;
      if (!groups.has(year)) groups.set(year, []);
      groups.get(year).push(book);
    }
    return [...groups.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([name, groupBooks]) => ({ name, books: groupBooks }));
  }, [books]);

  const categoryFacets = useMemo(() => {
    const counts = new Map();
    for (const b of books) {
      if (!b.category) continue;
      counts.set(b.category, (counts.get(b.category) || 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, CATEGORY_FACET_LIMIT)
      .map(([category, count]) => ({ category, count }));
  }, [books]);

  const filteredBooks = useMemo(() => {
    let list = books;
    if (filter === FILTER_FINISHED) {
      list = list.filter((b) => b.finishReading === FINISHED_FLAG);
    } else if (filter === FILTER_READING) {
      list = list.filter((b) => b.finishReading !== FINISHED_FLAG && b.readUpdateTime);
    } else if (filter === FILTER_IMPORTED) {
      list = list.filter((b) => b.materialId);
    }
    const q = debouncedQuery.toLowerCase();
    if (q) {
      list = list.filter((b) => {
        const title = (b.title || '').toLowerCase();
        const author = (b.author || '').toLowerCase();
        return title.includes(q) || author.includes(q);
      });
    }
    if (activeCategories.size > 0) {
      list = list.filter((b) => b.category && activeCategories.has(b.category));
    }
    return list;
  }, [books, filter, debouncedQuery, activeCategories]);

  const sortedBooks = useMemo(() => {
    const arr = filteredBooks.slice();
    if (sort === SORT_TITLE) {
      arr.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'zh'));
    } else if (sort === SORT_AUTHOR) {
      arr.sort((a, b) => (a.author || '').localeCompare(b.author || '', 'zh'));
    } else {
      arr.sort((a, b) => (b.readUpdateTime || 0) - (a.readUpdateTime || 0));
    }
    return arr;
  }, [filteredBooks, sort]);

  const reviewBooks = useMemo(() => {
    return books
      .filter((b) => b.materialId)
      .sort((a, b) => (b.readUpdateTime || 0) - (a.readUpdateTime || 0));
  }, [books]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((c) => c + PAGE_INCREMENT);
        }
      },
      { rootMargin: SCROLL_ROOT_MARGIN },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [sortedBooks.length]);

  const goToSettings = useCallback(() => {
    window.dispatchEvent(new CustomEvent('zhijing:navigate', { detail: { view: 'settings' } }));
  }, []);

  const handleRefresh = useCallback(() => {
    syncShelf(true);
  }, [syncShelf]);

  const handleKpiClick = useCallback((kpiFilter) => {
    setFilter(kpiFilter);
    setActiveTab(TAB_BOOKS);
  }, [setFilter]);

  const visibleBooks = useMemo(
    () => sortedBooks.slice(0, visibleCount),
    [sortedBooks, visibleCount],
  );

  const hasFilters = debouncedQuery || activeCategories.size > 0 || filter !== FILTER_ALL;
  const nothingToShow = configured && !loading && !error && shelfBooks && sortedBooks.length === 0;
  const shelfEmpty = configured && !loading && !error && shelfBooks && books.length === 0;
  const showToolbar = activeTab === TAB_BOOKS || activeTab === TAB_ALBUMS;
  const showSkeleton = loading || (shelfBooks !== null && shelfBooks.length === 0 && isSyncing);

  const filterLabel = useMemo(() => {
    if (filter === FILTER_FINISHED) return t('weread.filterFinished');
    if (filter === FILTER_READING) return t('weread.filterReading');
    if (filter === FILTER_IMPORTED) return t('weread.filterImported');
    return '';
  }, [filter, t]);

  const handleCopyTitleForSearch = useCallback(async (title) => {
    const ok = await copyTextToClipboard(title);
    if (ok) {
      setToast({
        type: TOAST_TYPE_SUCCESS,
        text: t('weread.copyTitleForSearchSuccess', { title }),
      });
    } else {
      setToast({
        type: TOAST_TYPE_ERROR,
        text: t('weread.copyTitleForSearchFailed'),
      });
    }
  }, [setToast, t]);

  const renderBookCard = useCallback((book) => {
    const id = String(book.bookId);
    const importing = importingIds.has(id);
    const result = importResults[id];
    let cardState = CARD_STATE_IDLE;
    if (importing) cardState = CARD_STATE_IMPORTING;
    else if (result && result.ok) cardState = CARD_STATE_DONE;
    else if (result && !result.ok) cardState = CARD_STATE_FAILED;
    const meta = {
      archiveYear: book.archiveYear,
      readUpdateTime: book.readUpdateTime,
      finishReading: book.finishReading,
      materialId: book.materialId,
      bookmarkCount: book.bookmarkCount,
    };
    return (
      <WeReadCard
        key={id}
        cover={book.cover}
        title={book.title}
        author={book.author}
        category={book.category}
        meta={meta}
        webUrl={wereadWebBookUrl(book)}
        cardState={cardState}
        result={result}
        selecting={selecting && activeTab === TAB_BOOKS}
        selected={selectedIds.has(id)}
        view={view}
        onToggleSelect={() => toggleSelect(id)}
        onImport={() => handleImport(book)}
        onOpenImported={() => handleOpenImported(id)}
        onCopyTitleForSearch={
          !book.bookIdLong && book.title
            ? () => handleCopyTitleForSearch(book.title)
            : undefined
        }
      />
    );
  }, [importingIds, importResults, selecting, activeTab, selectedIds, view, toggleSelect, handleImport, handleOpenImported, handleCopyTitleForSearch]);

  const syncedAtText = useMemo(() => {
    if (syncState?.lastSyncedAt) {
      return formatRelativeTime(
        Math.floor(new Date(syncState.lastSyncedAt).getTime() / MS_PER_SECOND),
        t,
      );
    }
    return '';
  }, [syncState, t]);

  return (
    <div className="weread-view page-main">
      <div className="page-title-row">
        <div>
          <h2>{t('weread.title')}</h2>
          <p className="page-subtitle">{t('weread.subtitle')}</p>
        </div>
        <div className="page-title-actions">
          <button type="button" onClick={handleRefresh} disabled={isSyncing || !configured}>
            <RefreshCw size={15} className={isSyncing ? 'spin' : ''} /> {t('weread.refresh')}
          </button>
          <button type="button" onClick={goToSettings}>
            <Settings size={15} /> {t('settings.title')}
          </button>
        </div>
      </div>

      <nav className="weread-tabs" role="tablist" aria-label={t('weread.title')}>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === TAB_BOOKS}
          className={activeTab === TAB_BOOKS ? 'is-active' : ''}
          onClick={() => setActiveTab(TAB_BOOKS)}
        >
          {t('weread.books')} <span className="weread-tab-count">{configured === false ? '—' : books.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === TAB_ALBUMS}
          className={activeTab === TAB_ALBUMS ? 'is-active' : ''}
          onClick={() => setActiveTab(TAB_ALBUMS)}
        >
          {t('weread.albums')} <span className="weread-tab-count">{configured === false ? '—' : albums.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === TAB_ARCHIVE}
          className={activeTab === TAB_ARCHIVE ? 'is-active' : ''}
          onClick={() => setActiveTab(TAB_ARCHIVE)}
        >
          {t('weread.archive')} <span className="weread-tab-count">{configured === false ? '—' : archiveGroups.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === TAB_REVIEW}
          className={activeTab === TAB_REVIEW ? 'is-active' : ''}
          onClick={() => setActiveTab(TAB_REVIEW)}
        >
          {t('weread.review')} <span className="weread-tab-count">{configured === false ? '—' : reviewBooks.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === TAB_RECOMMEND}
          className={activeTab === TAB_RECOMMEND ? 'is-active' : ''}
          onClick={() => setActiveTab(TAB_RECOMMEND)}
        >
          {t('weread.recommend')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === TAB_STATS}
          className={activeTab === TAB_STATS ? 'is-active' : ''}
          onClick={() => setActiveTab(TAB_STATS)}
        >
          {t('weread.stats')}
        </button>
      </nav>

      {error && (
        <div className="weread-error" role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button type="button" className="weread-retry-btn" onClick={loadMeta}>
            <RefreshCw size={14} /> {t('weread.retry')}
          </button>
        </div>
      )}

      {syncError && !error && (
        <div className="weread-error" role="alert">
          <AlertCircle size={16} />
          <span>{syncError}</span>
        </div>
      )}

      {isSyncing && shelfBooks !== null && shelfBooks.length > 0 && (
        <div className="weread-stats-mini">
          <span className="weread-stats-mini-item">
            <Loader2 size={14} className="spin" /> {t('weread.syncing')}
          </span>
        </div>
      )}

      {showToolbar && configured && !error && (
        <div className="weread-toolbar">
          <div className="weread-search">
            <Search size={15} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('weread.searchPlaceholder')}
              aria-label={t('weread.searchPlaceholder')}
            />
            {query && (
              <button type="button" className="weread-search-clear" onClick={() => setQuery('')} aria-label="clear">
                <X size={14} />
              </button>
            )}
          </div>

          <select
            className="weread-select"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label={t('weread.sort')}
          >
            <option value={SORT_RECENT}>{t('weread.sortRecent')}</option>
            <option value={SORT_TITLE}>{t('weread.sortTitle')}</option>
            <option value={SORT_AUTHOR}>{t('weread.sortAuthor')}</option>
          </select>

          <select
            className="weread-select weread-select-kb"
            value={targetKbId}
            onChange={(e) => setTargetKbId(e.target.value)}
            aria-label={t('weread.targetKb')}
            disabled={workspaces.length === 0}
          >
            {workspaces.length === 0 ? (
              <option value="">{t('weread.noWorkspace')}</option>
            ) : (
              workspaces.map((kb) => (
                <option key={kb.id} value={kb.id}>{kb.name}</option>
              ))
            )}
          </select>

          <div className="weread-view-toggle" role="group" aria-label={t('weread.view')}>
            <button type="button" className={view === VIEW_GRID ? 'is-active' : ''} onClick={() => setView(VIEW_GRID)} aria-label={t('weread.viewGrid')}>
              <LayoutGrid size={15} />
            </button>
            <button type="button" className={view === VIEW_LIST ? 'is-active' : ''} onClick={() => setView(VIEW_LIST)} aria-label={t('weread.viewList')}>
              <ListIcon size={15} />
            </button>
          </div>

          {activeTab === TAB_BOOKS && (
            selecting ? (
              <>
                <span className="weread-selected-count">{t('weread.selectedCount', { count: selectedIds.size })}</span>
                <button type="button" className="weread-link-btn" onClick={() => selectAllFiltered(sortedBooks)} disabled={sortedBooks.length === 0}>
                  {t('weread.selectAll')}
                </button>
                <button type="button" className="weread-link-btn" onClick={exitSelecting}>
                  {t('weread.cancel')}
                </button>
              </>
            ) : (
              <button type="button" className="weread-link-btn" onClick={enterSelecting} disabled={books.length === 0}>
                {t('weread.select')}
              </button>
            )
          )}
        </div>
      )}

      {showToolbar && activeTab === TAB_BOOKS && categoryFacets.length > 0 && (
        <div className="weread-facets">
          {categoryFacets.map((f) => (
            <button
              key={f.category}
              type="button"
              className={`weread-facet-chip${activeCategories.has(f.category) ? ' is-active' : ''}`}
              onClick={() => toggleCategory(f.category)}
            >
              {f.category} <span className="weread-facet-count">{f.count}</span>
            </button>
          ))}
          {activeCategories.size > 0 && (
            <button type="button" className="weread-facet-clear" onClick={() => setActiveCategories(new Set())}>
              <X size={12} /> {t('weread.clearFilters')}
            </button>
          )}
        </div>
      )}

      <div className="weread-body">
        {configured === false && (
          <div className="weread-empty">
            <div className="weread-empty-icon"><BookOpen size={40} /></div>
            <strong>{t('weread.notConfigured')}</strong>
            <p>{t('weread.notConfiguredHint')}</p>
            <button type="button" className="weread-primary-btn" onClick={goToSettings}>
              <Settings size={15} /> {t('weread.goToSettings')}
            </button>
          </div>
        )}

        {configured && showSkeleton && (
          <div className={`weread-grid weread-grid--${view}`}>
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => <WeReadCardSkeleton key={i} />)}
          </div>
        )}

        {configured && !loading && !error && shelfBooks && !showSkeleton && activeTab === TAB_BOOKS && (
          shelfEmpty ? (
            <div className="weread-empty">
              <div className="weread-empty-icon"><BookOpen size={40} /></div>
              <strong>{t('weread.emptyShelf')}</strong>
              <p>{t('weread.emptyShelfHint')}</p>
            </div>
          ) : nothingToShow ? (
            <div className="weread-empty weread-empty--sm">
              <div className="weread-empty-icon"><Search size={32} /></div>
              <strong>{t('weread.noResults')}</strong>
              <p>{t('weread.noResultsHint')}</p>
              <button type="button" className="weread-link-btn" onClick={clearFilters}>
                {t('weread.clearFilters')}
              </button>
            </div>
          ) : (
            <>
              <div className="weread-result-count">
                {filter !== FILTER_ALL && (
                  <>
                    <span className="weread-metatag weread-metatag--success">{filterLabel}</span>
                    <button type="button" className="weread-link-btn" onClick={() => setFilter(FILTER_ALL)}>
                      <X size={12} /> {t('weread.clearFilters')}
                    </button>
                  </>
                )}
                {t('weread.resultCount', { count: sortedBooks.length })}
                {syncedAtText && (
                  <span className="weread-stats-mini-item" style={{ marginLeft: '12px' }}>
                    {t('weread.statsSyncedAt', { time: syncedAtText })}
                  </span>
                )}
              </div>
              <div className={`weread-grid weread-grid--${view}`}>
                {visibleBooks.map(renderBookCard)}
              </div>
              {visibleCount < sortedBooks.length && (
                <div ref={sentinelRef} className="weread-loadmore">
                  <Loader2 size={15} className="spin" /> {t('weread.loading')}
                </div>
              )}
            </>
          )
        )}

        {configured && !loading && !error && shelfBooks && activeTab === TAB_ALBUMS && (
          albums.length === 0 ? (
            <div className="weread-empty weread-empty--sm">
              <div className="weread-empty-icon"><BookOpen size={32} /></div>
              <strong>{t('weread.albumEmpty')}</strong>
            </div>
          ) : (
            <div className={`weread-grid weread-grid--${view}`}>
              {albums.map((album) => {
                const info = album.albumInfo || {};
                return (
                  <article className="weread-card weread-card--album" key={info.albumId}>
                    <div className="weread-card-cover">
                      {info.cover ? (
                        <img src={info.cover} alt="" loading="lazy" decoding="async" />
                      ) : (
                        <span className="weread-cover-placeholder"><BookOpen size={28} /></span>
                      )}
                    </div>
                    <div className="weread-card-meta">
                      <strong className="weread-card-title">{info.name}</strong>
                      <span className="weread-card-author">{info.authorName}</span>
                      <span className="weread-card-submeta">{t('weread.tracks', { count: info.trackCount || 0 })}</span>
                    </div>
                    <p className="weread-card-note">{t('weread.albumImportUnavailable')}</p>
                  </article>
                );
              })}
            </div>
          )
        )}

        {configured && !loading && !error && shelfBooks && activeTab === TAB_ARCHIVE && (
          archiveGroups.length === 0 ? (
            <div className="weread-empty weread-empty--sm">
              <div className="weread-empty-icon"><BookOpen size={32} /></div>
              <strong>{t('weread.archiveEmpty')}</strong>
            </div>
          ) : (
            <div className="weread-archive">
              {archiveGroups.map((g) => {
                const expanded = expandedArchives.has(g.name);
                return (
                  <section className="weread-archive-group" key={g.name}>
                    <button
                      type="button"
                      className="weread-archive-head"
                      onClick={() => toggleArchive(g.name)}
                      aria-expanded={expanded}
                    >
                      <ChevronDown size={16} className={expanded ? '' : 'is-collapsed'} />
                      <span className="weread-archive-name">{g.name}</span>
                      <span className="weread-archive-count">{t('weread.bookCount', { count: g.books.length })}</span>
                    </button>
                    {expanded && g.books.length > 0 && (
                      <div className={`weread-grid weread-grid--${view}`}>
                        {g.books.map(renderBookCard)}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )
        )}

        {configured && !loading && !error && shelfBooks && activeTab === TAB_REVIEW && (
          reviewBooks.length === 0 ? (
            <div className="weread-empty">
              <div className="weread-empty-icon"><BookmarkCheck size={40} /></div>
              <strong>{t('weread.reviewEmpty')}</strong>
              <p>{t('weread.reviewEmptyHint')}</p>
            </div>
          ) : (
            <>
              <div className="weread-result-count">
                {t('weread.reviewCount', { count: reviewBooks.length })}
              </div>
              <div className={`weread-grid weread-grid--${view}`}>
                {reviewBooks.map(renderBookCard)}
              </div>
            </>
          )
        )}

        {configured && !error && activeTab === TAB_STATS && (
          statsGate.isAllowed ? (
            <div className="weread-stats-band-wrap">
              <WeReadStatsBand
                stats={stats}
                collapsed={false}
                onToggleCollapse={() => setActiveTab(TAB_BOOKS)}
                onKpiClick={handleKpiClick}
                t={t}
              />
              <section className="weread-quadrant-section" aria-label="书架×笔记四象限">
                <div className="weread-quadrant-head">
                  <h2>书架 × 笔记 四象限</h2>
                  <div className="weread-signals-actions">
                    {signalsProgress && (
                      <button
                        type="button"
                        className="weread-signals-cancel-btn"
                        onClick={handleCancelSignalsRefresh}
                      >
                        取消
                      </button>
                    )}
                    <button
                      type="button"
                      className="weread-signals-refresh-btn"
                      onClick={handleRefreshSignals}
                      disabled={signalsRefreshing || Boolean(signalsProgress) || !Array.isArray(shelfBooks) || shelfBooks.length === 0}
                    >
                      {signalsProgress ? `刷新中… ${signalsProgress.done}/${signalsProgress.total}` : signalsRefreshing ? '刷新中…' : '刷新笔记信号'}
                    </button>
                  </div>
                </div>
                {signalsProgress && (
                  <div className="weread-signals-progress">
                    <div
                      className="weread-signals-progress-fill"
                      style={{ width: `${signalsProgress.total > 0 ? Math.round((signalsProgress.done / signalsProgress.total) * 100) : 0}%` }}
                    />
                  </div>
                )}
                {Array.isArray(shelfBooks) && shelfBooks.length > 0 && (
                  <div className={`weread-data-health${signalsCoverageLow ? ' is-warning' : ''}`}>
                    <div className="weread-data-health-row">
                      <span className="weread-data-health-label">数据健康度</span>
                      <span className="weread-data-health-value">
                        {shelfBooks.filter((b) => Boolean(b.signalsSyncedAt)).length}/{shelfBooks.length} 本已刷新
                      </span>
                    </div>
                    <div className="weread-data-health-bar">
                      <div
                        className="weread-data-health-bar-fill"
                        style={{ width: `${Math.round(signalsCoverage * 100)}%` }}
                      />
                    </div>
                    {signalsCoverageLow && (
                      <p className="weread-data-health-hint">
                        覆盖率低于 50%，四象限分类可能不准确，建议先刷新笔记信号补齐数据。
                      </p>
                    )}
                  </div>
                )}
                {signalsToast && (
                  <p className={`weread-signals-toast weread-signals-toast--${signalsToast.type}`}>
                    {signalsToast.text}
                  </p>
                )}
                {signalsError && !signalsRefreshing && (
                  <p className="weread-signals-toast weread-signals-toast--error">
                    信号刷新失败：{String(signalsError.message ?? signalsError)}
                  </p>
                )}
                {quadrantState.loading ? (
                  <p className="quadrant-grid-loading">计算四象限…</p>
                ) : quadrantState.summary ? (
                  <QuadrantGrid
                    summary={quadrantState.summary}
                    labels={{
                      coreReading: '核心阅读',
                      commitmentDebt: '承诺债务',
                      hiddenInterest: '隐性真兴趣',
                      irrelevant: '无关',
                    }}
                    descriptions={{
                      coreReading: '在书架上且笔记深度较高的书，是你的真实兴趣核心',
                      commitmentDebt: '在书架上但笔记稀疏，想读未读的囤积',
                      hiddenInterest: '不在书架但笔记深度较高，被忽视的金矿',
                      irrelevant: '不在书架且无笔记，不进入统计',
                    }}
                    emptyHints={{
                      coreReading: '书架上还没有足够的深度笔记',
                      commitmentDebt: '没有未读的囤积书',
                      hiddenInterest: '暂无被忽视的金矿',
                      irrelevant: '0 本',
                    }}
                  />
                ) : (
                  <p className="quadrant-grid-empty">尚未生成四象限</p>
                )}
                {quadrantState.error && (
                  <p className="quadrant-grid-error">四象限计算失败：{String(quadrantState.error)}</p>
                )}
                <HiddenInterestBanner
                  hint={hiddenInterest.hint}
                  onMarkShown={handleHiddenInterestShown}
                  onDismissBook={handleHiddenInterestDismissBook}
                  onTogglePermanent={handleHiddenInterestTogglePermanent}
                  busy={hiddenInterest.loading}
                />
              </section>

              <section className="weread-global-topic-section" aria-label="已导入笔记的主题演变">
                <div className="weread-quadrant-head">
                  <h2>已导入笔记的主题演变</h2>
                  <button
                    type="button"
                    className="weread-signals-refresh-btn"
                    onClick={() => globalTopicSpectrum.refresh()}
                    disabled={globalTopicSpectrum.loading}
                  >
                    {globalTopicSpectrum.loading ? '计算中…' : '刷新主题谱'}
                  </button>
                </div>
                <p className="weread-global-topic-hint">
                  聚合已导入到知径的微信读书笔记，按月分桶展示主题簇随时间的演变。仅包含已导入的书，未导入的书划线不在统计范围内。
                </p>
                {globalTopicSpectrum.error ? (
                  <p className="quadrant-grid-error">主题谱计算失败：{String(globalTopicSpectrum.error)}</p>
                ) : (
                  <TopicSpectrumChart
                    spectrum={globalTopicSpectrum.spectrum}
                    degradeAssessment={globalTopicSpectrum.degradeAssessment}
                    loading={globalTopicSpectrum.loading}
                    error={globalTopicSpectrum.error}
                  />
                )}
              </section>
            </div>
          ) : (
            <div className="weread-stats-gate">
              <p>{t('weread.stats.gateBlocked') ?? '本视图未通过反虚荣门禁'}</p>
              {statsGate.result && statsGate.result.failedKeys && statsGate.result.failedKeys.length > 0 && (
                <p className="weread-stats-gate-detail">
                  {statsGate.result.failedKeys.join('、')}
                </p>
              )}
              {statsGate.error && (
                <p className="weread-stats-gate-error">
                  {t('weread.stats.gateError') ?? '门禁评估失败，统计已隐藏'}
                </p>
              )}
            </div>
          )
        )}

        {configured && !error && activeTab === TAB_RECOMMEND && (
          <WeReadRecommendPanel
            workspaceId={selectedWorkspaceId}
            onImport={(book) => handleImport(book)}
            t={t}
            forceExpanded
          />
        )}
      </div>

      {selecting && activeTab === TAB_BOOKS && (
        <div className="weread-batch-bar">
          {batch ? (
            <div className="weread-batch-progress">
              <div className="weread-progress-track">
                <div
                  className="weread-progress-fill"
                  style={{ width: `${batch.total === 0 ? 0 : (batch.done / batch.total) * PERCENT_BASE}%` }}
                />
              </div>
              <span>{t('weread.batchProgress', { done: batch.done, total: batch.total, success: batch.success, failed: batch.failed })}</span>
            </div>
          ) : (
            <>
              <span className="weread-batch-info">{t('weread.selectedCount', { count: selectedIds.size })}</span>
              <div className="weread-batch-actions">
                <button type="button" className="weread-batch-cancel" onClick={exitSelecting}>
                  {t('weread.cancel')}
                </button>
                <button
                  type="button"
                  className="weread-batch-run"
                  onClick={batchImport}
                  disabled={selectedIds.size === 0}
                >
                  <BookOpen size={15} /> {t('weread.batchImport')}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {previewBook && (
        <WeReadPreviewDrawer
          book={previewBook}
          mode={previewMode}
          batchCount={selectedIds.size}
          onClose={closePreview}
          onImport={handlePreviewImport}
          t={t}
        />
      )}

      {toast && (
        <div className={`weread-toast weread-toast--${toast.type}`} role="status" aria-live="polite">
          <span className="weread-toast-text">
            {toast.type === TOAST_TYPE_SUCCESS ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {toast.text}
          </span>
          {toast.action && (
            <button type="button" className="weread-toast-action" onClick={() => { toast.action.run(); setToast(null); }}>
              {toast.action.label}
            </button>
          )}
          <button type="button" className="weread-toast-close" onClick={() => setToast(null)} aria-label="close">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
