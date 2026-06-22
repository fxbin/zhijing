import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  BookOpen,
  BookmarkCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Flame,
  LayoutGrid,
  List as ListIcon,
  Loader2,
  RefreshCw,
  Search,
  Settings,
  Tag,
  X,
} from 'lucide-react';

const TAB_BOOKS = 'books';
const TAB_ALBUMS = 'albums';
const TAB_ARCHIVE = 'archive';

const SORT_RECENT = 'recent';
const SORT_TITLE = 'title';
const SORT_AUTHOR = 'author';

const VIEW_GRID = 'grid';
const VIEW_LIST = 'list';

const FILTER_ALL = 'all';
const FILTER_FINISHED = 'finished';
const FILTER_READING = 'reading';
const FILTER_IMPORTED = 'imported';

const PREVIEW_TYPE_ALL = 'all';
const PREVIEW_TYPE_BOOKMARK = 'bookmark';
const PREVIEW_TYPE_REVIEW = 'review';

const PREVIEW_MODE_SINGLE = 'single';
const PREVIEW_MODE_BATCH = 'batch';

const INITIAL_PAGE_SIZE = 60;
const PAGE_INCREMENT = 60;
const SEARCH_DEBOUNCE_MS = 200;
const SKELETON_COUNT = 12;
const TOAST_AUTODISMISS_MS = 4000;
const CATEGORY_FACET_LIMIT = 12;
const CATEGORY_CHART_LIMIT = 6;
const YEAR_CHART_MAX_BARS = 8;
const YEAR_BAR_MIN_HEIGHT_PX = 8;
const YEAR_BAR_MAX_HEIGHT_PX = 80;
const MONTH_CHART_MAX_BARS = 12;
const MONTH_BAR_MIN_HEIGHT_PX = 8;
const MONTH_BAR_MAX_HEIGHT_PX = 80;

const MS_PER_SECOND = 1000;
const PERCENT_BASE = 100;

const STATS_COLLAPSED_KEY = 'weread-stats-collapsed';

const MINUTE_SECONDS = 60;
const HOUR_SECONDS = 3600;
const DAY_SECONDS = 86400;
const MONTH_SECONDS = 2592000;
const YEAR_SECONDS = 31536000;

const FINISHED_FLAG = 1;

const wereadWebBookUrl = (bookId) => `https://weread.qq.com/#bot/book/${bookId}`;

/**
 * 格式化相对时间
 * 输入秒级时间戳，输出"刚刚"/"X分钟前"/"X小时前"/"X天前"/"X个月前"/"X年前"
 * 0 或 null 返回空字符串
 * @param {number} timestamp - 秒级时间戳
 * @param {Function} t - i18n 翻译函数
 * @returns {string} 格式化后的相对时间
 */
function formatRelativeTime(timestamp, t) {
  if (!timestamp) return '';
  const now = Math.floor(Date.now() / MS_PER_SECOND);
  const diff = now - timestamp;
  if (diff < MINUTE_SECONDS) return t('time.justNow');
  if (diff < HOUR_SECONDS) {
    return t('weread.minutesAgo', { count: Math.floor(diff / MINUTE_SECONDS) });
  }
  if (diff < DAY_SECONDS) {
    return t('weread.hoursAgo', { count: Math.floor(diff / HOUR_SECONDS) });
  }
  if (diff < MONTH_SECONDS) {
    return t('weread.daysAgo', { count: Math.floor(diff / DAY_SECONDS) });
  }
  if (diff < YEAR_SECONDS) {
    return t('weread.monthsAgo', { count: Math.floor(diff / MONTH_SECONDS) });
  }
  return t('weread.yearsAgo', { count: Math.floor(diff / YEAR_SECONDS) });
}

const CATEGORY_THEME_MAP = {
  concept: { color: '#2C5F8D', bg: 'rgba(44,95,141,0.14)' },
  method: { color: '#6B8E7F', bg: 'rgba(107,142,127,0.18)' },
  fact: { color: '#8B6FB0', bg: 'rgba(139,111,176,0.16)' },
  question: { color: '#D4944A', bg: 'rgba(212,148,74,0.18)' },
  general: { color: 'var(--muted)', bg: 'rgba(69,71,76,0.10)' },
};

const CATEGORY_KEYWORD_MAP = [
  { keys: ['经济', '理财', '投资', '商业', '创业', '管理', '金融'], theme: 'concept' },
  { keys: ['计算机', '编程', '互联网', '科技', '自然科学', '工程', '医学', '数学'], theme: 'method' },
  { keys: ['心理', '社科', '哲学', '教育', '社会', '政治', '法学', '宗教'], theme: 'fact' },
  { keys: ['文学', '小说', '散文', '传记', '艺术', '历史', '诗歌', '漫画'], theme: 'question' },
];

function resolveCategoryTheme(category) {
  if (!category) return null;
  for (const rule of CATEGORY_KEYWORD_MAP) {
    if (rule.keys.some((k) => category.includes(k))) {
      return CATEGORY_THEME_MAP[rule.theme];
    }
  }
  return CATEGORY_THEME_MAP.general;
}

function CategoryChip({ category }) {
  const theme = resolveCategoryTheme(category);
  if (!theme) return null;
  return (
    <span
      className="weread-category-chip"
      style={{ background: theme.bg, color: theme.color }}
      title={category}
    >
      {category}
    </span>
  );
}

/**
 * 构建书籍卡片的 submeta 显示信息
 * 降级链：已导入 > 已读完 > 在读 > 仅有年份 > 不显示
 * @param {Object} book - 书籍元数据对象
 * @param {Function} t - i18n 翻译函数
 * @returns {{text: string, dotClass: string} | null}
 */
function buildBookSubmeta(book, t) {
  if (book.materialId) {
    return {
      text: t('weread.metaImported', { count: book.bookmarkCount || 0 }),
      dotClass: 'is-imported',
    };
  }
  if (book.finishReading === FINISHED_FLAG) {
    const time = formatRelativeTime(book.readUpdateTime, t);
    return {
      text: time ? `${t('weread.metaFinished')} · ${time}` : t('weread.metaFinished'),
      dotClass: 'is-finished',
    };
  }
  if (book.readUpdateTime) {
    const time = formatRelativeTime(book.readUpdateTime, t);
    const year = book.archiveYear || '';
    return {
      text: year ? `${t('weread.metaYearJoined', { year })} · ${time}` : time,
      dotClass: 'is-reading',
    };
  }
  if (book.archiveYear) {
    return {
      text: t('weread.metaYearJoined', { year: book.archiveYear }),
      dotClass: 'is-reading',
    };
  }
  return null;
}

const WeReadCard = memo(function WeReadCard({
  cover,
  title,
  author,
  category,
  meta,
  webUrl,
  cardState,
  result,
  selecting,
  selected,
  view,
  onToggleSelect,
  onImport,
  onOpenImported,
}) {
  const { t } = useTranslation();
  const showSelect = selecting;
  const isDone = cardState === 'done';
  const isFailed = cardState === 'failed';
  const isImporting = cardState === 'importing';
  const submeta = meta ? buildBookSubmeta(meta, t) : null;

  const metatags = useMemo(() => {
    if (!meta || view !== VIEW_LIST) return [];
    const tags = [];
    if (meta.archiveYear) {
      tags.push({ key: 'year', text: t('weread.metaYearJoined', { year: meta.archiveYear }) });
    }
    if (meta.finishReading === FINISHED_FLAG) {
      tags.push({ key: 'finished', text: t('weread.metaFinished'), success: true });
    }
    if (meta.readUpdateTime) {
      const time = formatRelativeTime(meta.readUpdateTime, t);
      if (time) tags.push({ key: 'recent', text: time });
    }
    if (meta.materialId) {
      tags.push({
        key: 'imported',
        text: t('weread.metaImported', { count: meta.bookmarkCount || 0 }),
        success: true,
      });
    }
    return tags;
  }, [meta, view, t]);

  return (
    <article
      className={`weread-card${isDone ? ' is-imported' : ''}${isFailed ? ' is-failed' : ''}${selected ? ' is-selected' : ''} weread-card--${view}`}
      onClick={showSelect ? () => onToggleSelect() : undefined}
      role={showSelect ? 'button' : undefined}
      aria-pressed={showSelect ? selected : undefined}
      tabIndex={showSelect ? 0 : undefined}
      onKeyDown={showSelect ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleSelect(); } } : undefined}
    >
      <div className="weread-card-cover">
        {showSelect && (
          <span className={`weread-check${selected ? ' is-on' : ''}`} aria-hidden="true">
            {selected && <Check size={14} strokeWidth={3.5} />}
          </span>
        )}
        {cover ? (
          <img src={cover} alt="" loading="lazy" decoding="async" />
        ) : (
          <span className="weread-cover-placeholder"><BookOpen size={28} /></span>
        )}
        {category && (
          <div className="weread-cover-chip-wrap">
            <CategoryChip category={category} />
          </div>
        )}
      </div>

      <div className="weread-card-meta">
        <strong className="weread-card-title" title={title}>{title}</strong>
        {author && <span className="weread-card-author">{author}</span>}
        {submeta && (
          <span className="weread-card-submeta">
            <span className={`weread-meta-dot ${submeta.dotClass}`} />
            {submeta.text}
          </span>
        )}
      </div>

      {metatags.length > 0 && (
        <div className="weread-card-metarow">
          {metatags.map((tag) => (
            <span
              key={tag.key}
              className={`weread-metatag${tag.success ? ' weread-metatag--success' : ''}`}
            >
              {tag.text}
            </span>
          ))}
        </div>
      )}

      {!showSelect && (
        <div className="weread-card-actions">
          <a
            className="weread-icon-btn"
            href={webUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('weread.openInApp')}
            title={t('weread.openInApp')}
          >
            <ExternalLink size={15} />
          </a>
          {isDone ? (
            <button type="button" className="weread-card-btn is-done" onClick={() => onOpenImported()}>
              <Check size={14} /> <span>{t('weread.imported')}</span>
            </button>
          ) : isFailed ? (
            <button type="button" className="weread-card-btn is-failed" onClick={() => onImport()}>
              <RefreshCw size={14} /> <span>{t('weread.retry')}</span>
            </button>
          ) : (
            <button
              type="button"
              className="weread-card-btn"
              onClick={() => onImport()}
              disabled={isImporting}
            >
              {isImporting ? <Loader2 size={14} className="spin" /> : <BookOpen size={14} />}
              <span>{isImporting ? t('weread.importing') : t('weread.importNotes')}</span>
            </button>
          )}
        </div>
      )}

      {isFailed && result?.error && (
        <p className="weread-card-error">{result.error}</p>
      )}
    </article>
  );
});

function WeReadCardSkeleton() {
  return (
    <article className="weread-card skeleton" aria-hidden="true">
      <div className="weread-card-cover sk-block" />
      <div className="weread-card-meta">
        <span className="sk-line sk-w-85" />
        <span className="sk-line sk-w-55" />
      </div>
    </article>
  );
}

/**
 * 微信读书统计仪表盘组件
 * 包含 5 个 KPI 卡、分类分布条形图、加入年份趋势柱状图
 * 可折叠，折叠状态记忆在 localStorage
 * KPI 点击可联动筛选
 * @param {Object} props
 * @param {Object} props.stats - 统计数据
 * @param {boolean} props.collapsed - 是否折叠
 * @param {Function} props.onToggleCollapse - 切换折叠状态
 * @param {Function} props.onKpiClick - KPI 点击回调
 * @param {Function} props.t - i18n 翻译函数
 */
function WeReadStatsBand({ stats, collapsed, onToggleCollapse, onKpiClick, t }) {
  if (!stats) return null;

  const finishedRatio = stats.totalBooks > 0
    ? Math.round((stats.finishedBooks / stats.totalBooks) * PERCENT_BASE)
    : 0;

  const topCategories = (stats.categoryDistribution || [])
    .slice(0, CATEGORY_CHART_LIMIT);
  const maxCategoryCount = topCategories.length > 0
    ? Math.max(...topCategories.map((c) => c.count))
    : 0;

  const yearBars = (stats.archiveYearTrend || []).slice(-YEAR_CHART_MAX_BARS);
  const maxYearCount = yearBars.length > 0
    ? Math.max(...yearBars.map((y) => y.count))
    : 0;
  const latestYear = yearBars.length > 0 ? yearBars[yearBars.length - 1].year : null;

  const monthBars = (stats.monthlyActivity || []).slice(-MONTH_CHART_MAX_BARS);
  const maxMonthCount = monthBars.length > 0
    ? Math.max(...monthBars.map((m) => m.count))
    : 0;
  const latestMonth = monthBars.length > 0 ? monthBars[monthBars.length - 1].month : null;

  const kpiItems = [
    {
      key: FILTER_ALL,
      icon: BookOpen,
      value: stats.totalBooks,
      label: t('weread.statsTotalBooks'),
      showBar: false,
    },
    {
      key: FILTER_FINISHED,
      icon: CheckCircle2,
      value: stats.finishedBooks,
      label: `${t('weread.statsFinished')} · ${t('weread.statsFinishedRatio', { percent: finishedRatio })}`,
      showBar: true,
      ratio: finishedRatio,
    },
    {
      key: FILTER_IMPORTED,
      icon: BookmarkCheck,
      value: stats.importedToZhijing,
      label: t('weread.statsImported'),
      showBar: stats.totalBooks > 0,
      ratio: stats.totalBooks > 0
        ? Math.round((stats.importedToZhijing / stats.totalBooks) * PERCENT_BASE)
        : 0,
    },
    {
      key: null,
      icon: Tag,
      value: (stats.categoryDistribution || []).length,
      label: t('weread.statsCategories'),
      showBar: false,
    },
    {
      key: null,
      icon: Flame,
      value: stats.recentReading?.activeLast30Days || 0,
      label: t('weread.statsActive30'),
      showBar: false,
    },
  ];

  return (
    <div className={`weread-stats-band${collapsed ? ' is-collapsed' : ''}`}>
      <div className="weread-stats-head">
        <h3>
          <BookOpen size={16} />
          {t('weread.statsTitle')}
        </h3>
        <button type="button" className="weread-stats-toggle" onClick={onToggleCollapse}>
          {collapsed ? t('weread.statsExpand') : t('weread.statsCollapse')}
        </button>
      </div>

      {!collapsed && (
        <div className="weread-stats-body">
          <div className="weread-stats-kpis">
            {kpiItems.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <button
                  type="button"
                  key={kpi.label}
                  className="weread-stats-kpi"
                  onClick={() => kpi.key && onKpiClick(kpi.key)}
                  disabled={!kpi.key}
                >
                  <span className="weread-stats-kpi-icon">
                    <Icon size={18} />
                  </span>
                  <span className="weread-stats-kpi-value">{kpi.value}</span>
                  <span className="weread-stats-kpi-label">{kpi.label}</span>
                  {kpi.showBar && (
                    <span className="weread-stats-kpi-bar">
                      <span
                        className="weread-stats-kpi-bar-fill"
                        style={{ width: `${kpi.ratio}%` }}
                      />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="weread-stats-charts">
            <div className="weread-stats-chart-box">
              <div className="weread-stats-chart-title">{t('weread.statsCategoryDist')}</div>
              <div className="weread-stats-catbars">
                {topCategories.length === 0 ? (
                  <span className="weread-metatag weread-metatag--empty">{t('weread.previewEmpty')}</span>
                ) : (
                  topCategories.map((c) => {
                    const theme = resolveCategoryTheme(c.category) || CATEGORY_THEME_MAP.general;
                    const width = maxCategoryCount > 0
                      ? Math.round((c.count / maxCategoryCount) * PERCENT_BASE)
                      : 0;
                    return (
                      <div className="weread-stats-catrow" key={c.category}>
                        <span className="weread-stats-catrow-label" title={c.category}>{c.category}</span>
                        <span className="weread-stats-cattack">
                          <span
                            className="weread-stats-catfill"
                            style={{ width: `${width}%`, background: theme.color }}
                          />
                        </span>
                        <span className="weread-stats-catrow-count">{c.count}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {yearBars.length > 0 && (
              <div className="weread-stats-chart-box">
                <div className="weread-stats-chart-title">{t('weread.statsYearTrend')}</div>
                <div className="weread-stats-yearbars">
                  {yearBars.map((y) => {
                    const height = maxYearCount > 0
                      ? Math.max(YEAR_BAR_MIN_HEIGHT_PX, Math.round((y.count / maxYearCount) * YEAR_BAR_MAX_HEIGHT_PX))
                      : YEAR_BAR_MIN_HEIGHT_PX;
                    const isLatest = y.year === latestYear;
                    return (
                      <div className="weread-stats-yearbar-col" key={y.year}>
                        <span className="weread-stats-yearbar-num">{y.count}</span>
                        <span
                          className={`weread-stats-yearbar${isLatest ? ' is-latest' : ''}`}
                          style={{ height: `${height}px` }}
                        />
                        <span className="weread-stats-yearbar-label">{y.year}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {monthBars.length > 0 && (
              <div className="weread-stats-chart-box">
                <div className="weread-stats-chart-title">{t('weread.statsMonthlyActivity')}</div>
                <div className="weread-stats-yearbars">
                  {monthBars.map((m) => {
                    const height = maxMonthCount > 0
                      ? Math.max(MONTH_BAR_MIN_HEIGHT_PX, Math.round((m.count / maxMonthCount) * MONTH_BAR_MAX_HEIGHT_PX))
                      : MONTH_BAR_MIN_HEIGHT_PX;
                    const isLatest = m.month === latestMonth;
                    const monthLabel = m.month.slice(5);
                    return (
                      <div className="weread-stats-yearbar-col" key={m.month}>
                        <span className="weread-stats-yearbar-num">{m.count}</span>
                        <span
                          className={`weread-stats-yearbar${isLatest ? ' is-latest' : ''}`}
                          style={{ height: `${height}px` }}
                        />
                        <span className="weread-stats-yearbar-label">{monthLabel}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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
        const res = await fetch('/api/weread/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookId: book.bookId }),
        });
        if (!res.ok) throw new Error('preview');
        const result = await res.json();
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

export default function WeReadView({ knowledgeBases = [], selectedKnowledgeBaseId, onOpenKnowledgeBase }) {
  const { t } = useTranslation();

  const [configured, setConfigured] = useState(null);
  const [activeTab, setActiveTab] = useState(TAB_BOOKS);
  const [shelfBooks, setShelfBooks] = useState(null);
  const [syncState, setSyncState] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sort, setSort] = useState(SORT_RECENT);
  const [activeCategories, setActiveCategories] = useState(() => new Set());
  const [view, setView] = useState(VIEW_GRID);
  const [filter, setFilter] = useState(FILTER_ALL);

  const [importingIds, setImportingIds] = useState(() => new Set());
  const [importResults, setImportResults] = useState(() => ({}));

  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [batch, setBatch] = useState(null);

  const [visibleCount, setVisibleCount] = useState(INITIAL_PAGE_SIZE);
  const [expandedArchives, setExpandedArchives] = useState(() => new Set());
  const [targetKbId, setTargetKbId] = useState(selectedKnowledgeBaseId || '');

  const [toast, setToast] = useState(null);
  const sentinelRef = useRef(null);

  const [stats, setStats] = useState(null);
  const [statsCollapsed, setStatsCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STATS_COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  });

  const [previewBook, setPreviewBook] = useState(null);
  const [previewMode, setPreviewMode] = useState(PREVIEW_MODE_SINGLE);

  useEffect(() => {
    setTargetKbId(selectedKnowledgeBaseId || '');
  }, [selectedKnowledgeBaseId]);

  /**
   * 从 /api/weread/meta 读取本地缓存的书架数据
   * 用于立即渲染，不触发同步
   */
  const loadMeta = useCallback(async () => {
    try {
      const res = await fetch('/api/weread/meta');
      if (!res.ok) throw new Error('meta');
      const data = await res.json();
      setShelfBooks(data.books || []);
      setSyncState(data.syncState || null);
      return data;
    } catch {
      setError(t('weread.loadShelfFailed'));
      return null;
    }
  }, [t]);

  /**
   * 调用 /api/weread/sync 进行后台同步
   * 同步成功后刷新 meta 数据
   * @param {boolean} force - 是否强制同步
   */
  const syncShelf = useCallback(async (force = false) => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch('/api/weread/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      });
      if (!res.ok) throw new Error('sync');
      const data = await res.json();
      if (data.error) {
        setSyncError(data.error);
      }
      await loadMeta();
      return data;
    } catch {
      setSyncError(t('weread.syncFailed'));
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [loadMeta, t]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/weread/settings');
        if (!res.ok) throw new Error('settings');
        const data = await res.json();
        if (!alive) return;
        setConfigured(Boolean(data.configured));
        if (data.configured) {
          await loadMeta();
          setLoading(false);
          syncShelf(false);
        } else {
          setLoading(false);
        }
      } catch {
        if (!alive) return;
        setConfigured(false);
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [loadMeta, syncShelf]);

  useEffect(() => {
    if (!configured) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/weread/stats');
        if (!res.ok) return;
        const data = await res.json();
        if (alive) setStats(data);
      } catch {
        /* 统计加载失败不影响主流程 */
      }
    })();
    return () => { alive = false; };
  }, [configured, shelfBooks, isSyncing]);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    setVisibleCount(INITIAL_PAGE_SIZE);
  }, [debouncedQuery, sort, activeCategories, activeTab, filter]);

  useEffect(() => {
    if (!toast) return;
    const handle = setTimeout(() => setToast(null), TOAST_AUTODISMISS_MS);
    return () => clearTimeout(handle);
  }, [toast]);

  const books = useMemo(() => shelfBooks ?? [], [shelfBooks]);
  const albums = useMemo(() => [], []);

  const bookMap = useMemo(() => {
    const m = new Map();
    for (const b of books) m.set(String(b.bookId), b);
    return m;
  }, [books]);

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

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((c) => c + PAGE_INCREMENT);
        }
      },
      { rootMargin: '240px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [sortedBooks.length]);

  const showToast = useCallback((next) => setToast(next), []);

  const importBook = useCallback(async (bookId) => {
    const id = String(bookId);
    if (importingIds.has(id)) return null;
    setImportingIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    const body = { bookId: id };
    if (targetKbId) body.knowledgeBaseId = targetKbId;
    try {
      const res = await fetch('/api/weread/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('import');
      const data = await res.json();
      const ok = {
        ok: true,
        title: data.title,
        bookmarkCount: data.bookmarkCount,
        reviewCount: data.reviewCount,
        materialId: data.materialId,
        knowledgeBaseId: targetKbId || null,
      };
      setImportResults((prev) => ({ ...prev, [id]: ok }));
      return ok;
    } catch {
      const fail = { ok: false, error: t('weread.loadShelfFailed') };
      setImportResults((prev) => ({ ...prev, [id]: fail }));
      return fail;
    } finally {
      setImportingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [importingIds, targetKbId, t]);

  /**
   * 打开预览抽屉（单本导入模式）
   */
  const handleImport = useCallback((book) => {
    setPreviewMode(PREVIEW_MODE_SINGLE);
    setPreviewBook(book);
  }, []);

  /**
   * 预览抽屉中确认导入后的处理
   * 单本模式：导入当前预览的书
   * 批量模式：导入所有选中的书
   */
  const handlePreviewImport = useCallback(async () => {
    if (!previewBook) return;
    if (previewMode === PREVIEW_MODE_BATCH) {
      const ids = [...selectedIds];
      if (ids.length === 0) return;
      setPreviewBook(null);
      setBatch({ total: ids.length, done: 0, success: 0, failed: 0 });
      let success = 0;
      let failed = 0;
      for (const id of ids) {
        const result = await importBook(id);
        if (result && result.ok) success += 1;
        else failed += 1;
        setBatch({ total: ids.length, done: success + failed, success, failed });
      }
      showToast({
        type: failed > 0 ? 'error' : 'success',
        text: t('weread.batchDone', { success, failed }),
        action: success > 0 && onOpenKnowledgeBase ? { label: t('weread.viewCard'), run: () => onOpenKnowledgeBase(targetKbId || null) } : null,
      });
      exitSelecting();
    } else {
      const book = previewBook;
      setPreviewBook(null);
      const result = await importBook(book.bookId);
      if (!result) return;
      if (result.ok) {
        showToast({
          type: 'success',
          text: t('weread.importSuccess', { title: result.title, bookmarks: result.bookmarkCount, reviews: result.reviewCount }),
          action: onOpenKnowledgeBase ? { label: t('weread.viewCard'), run: () => onOpenKnowledgeBase(result.knowledgeBaseId) } : null,
        });
      } else {
        showToast({ type: 'error', text: t('weread.importFailed', { title: book.title }) });
      }
    }
  }, [previewBook, previewMode, selectedIds, importBook, showToast, t, onOpenKnowledgeBase, targetKbId]);

  const handleOpenImported = useCallback((bookId) => {
    const result = importResults[String(bookId)];
    if (result && result.ok && onOpenKnowledgeBase) {
      onOpenKnowledgeBase(result.knowledgeBaseId);
    } else if (onOpenKnowledgeBase) {
      onOpenKnowledgeBase(targetKbId || null);
    }
  }, [importResults, onOpenKnowledgeBase, targetKbId]);

  const toggleCategory = useCallback((category) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setQuery('');
    setActiveCategories(new Set());
    setSort(SORT_RECENT);
    setFilter(FILTER_ALL);
  }, []);

  const toggleSelect = useCallback((bookId) => {
    const id = String(bookId);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const enterSelecting = useCallback(() => {
    setSelecting(true);
    setSelectedIds(new Set());
  }, []);

  const exitSelecting = useCallback(() => {
    setSelecting(false);
    setSelectedIds(new Set());
    setBatch(null);
  }, []);

  const selectAllFiltered = useCallback(() => {
    setSelectedIds(new Set(sortedBooks.map((b) => String(b.bookId))));
  }, [sortedBooks]);

  /**
   * 批量导入：先 preview 第一本选中的书
   */
  const batchImport = useCallback(() => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    const firstBook = bookMap.get(ids[0]);
    if (!firstBook) return;
    setPreviewMode(PREVIEW_MODE_BATCH);
    setPreviewBook(firstBook);
  }, [selectedIds, bookMap]);

  const toggleArchive = useCallback((name) => {
    setExpandedArchives((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const goToSettings = useCallback(() => {
    window.dispatchEvent(new CustomEvent('zhijing:navigate', { detail: { view: 'settings' } }));
  }, []);

  const handleRefresh = useCallback(() => {
    syncShelf(true);
  }, [syncShelf]);

  const handleToggleStatsCollapse = useCallback(() => {
    setStatsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STATS_COLLAPSED_KEY, next ? '1' : '0');
      } catch {
        /* localStorage 不可用时忽略 */
      }
      return next;
    });
  }, []);

  const handleKpiClick = useCallback((kpiFilter) => {
    setFilter(kpiFilter);
    setActiveTab(TAB_BOOKS);
  }, []);

  const closePreview = useCallback(() => {
    setPreviewBook(null);
  }, []);

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

  const renderBookCard = useCallback((book) => {
    const id = String(book.bookId);
    const importing = importingIds.has(id);
    const result = importResults[id];
    let cardState = 'idle';
    if (importing) cardState = 'importing';
    else if (result && result.ok) cardState = 'done';
    else if (result && !result.ok) cardState = 'failed';
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
        webUrl={wereadWebBookUrl(book.bookId)}
        cardState={cardState}
        result={result}
        selecting={selecting && activeTab === TAB_BOOKS}
        selected={selectedIds.has(id)}
        view={view}
        onToggleSelect={() => toggleSelect(id)}
        onImport={() => handleImport(book)}
        onOpenImported={() => handleOpenImported(id)}
      />
    );
  }, [importingIds, importResults, selecting, activeTab, selectedIds, view, toggleSelect, handleImport, handleOpenImported]);

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
      </nav>

      {configured && !error && (
        <WeReadStatsBand
          stats={stats}
          collapsed={statsCollapsed}
          onToggleCollapse={handleToggleStatsCollapse}
          onKpiClick={handleKpiClick}
          t={t}
        />
      )}

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
            disabled={knowledgeBases.length === 0}
          >
            {knowledgeBases.length === 0 ? (
              <option value="">{t('weread.noKnowledgeBase')}</option>
            ) : (
              knowledgeBases.map((kb) => (
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
                <button type="button" className="weread-link-btn" onClick={selectAllFiltered} disabled={sortedBooks.length === 0}>
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
            {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
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
