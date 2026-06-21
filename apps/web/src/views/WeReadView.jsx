/**
 * @module views/WeReadView
 * 微信读书视图：浏览书架并导入书籍笔记/划线到知径。
 * @author fxbin
 */

import { useEffect, useState } from 'react';
import { BookOpen, Download, ExternalLink, Loader2, RefreshCw, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const SHELF_TABS = {
  books: 'books',
  albums: 'albums',
};

/**
 * 微信读书书架视图组件。
 *
 * @returns {JSX.Element} 微信读书视图
 * @author fxbin
 */
export default function WeReadView() {
  const { t } = useTranslation();
  const [configured, setConfigured] = useState(false);
  const [checking, setChecking] = useState(true);
  const [activeTab, setActiveTab] = useState(SHELF_TABS.books);
  const [shelf, setShelf] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [importingIds, setImportingIds] = useState(new Set());
  const [importResults, setImportResults] = useState({});

  useEffect(() => {
    let ignore = false;
    async function loadSettings() {
      try {
        const response = await fetch('/api/weread/settings');
        if (!response.ok) throw new Error('settings unavailable');
        const result = await response.json();
        if (ignore) return;
        setConfigured(result.configured);
      } catch {
        if (!ignore) setConfigured(false);
      } finally {
        if (!ignore) setChecking(false);
      }
    }
    loadSettings();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!configured) return;
    let ignore = false;
    async function loadShelf() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/weread/shelf');
        if (!response.ok) throw new Error('shelf unavailable');
        const result = await response.json();
        if (ignore) return;
        setShelf(result);
      } catch {
        if (!ignore) setError(t('weread.loadShelfFailed'));
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadShelf();
    return () => {
      ignore = true;
    };
  }, [configured, t]);

  /**
   * 导入单本书籍到知径。
   *
   * @param {string} bookId - 微信读书书籍 ID
   * @param {string} title - 书名（用于结果展示）
   */
  async function importBook(bookId, title) {
    if (importingIds.has(bookId)) return;
    setImportingIds((prev) => new Set(prev).add(bookId));
    setImportResults((prev) => ({ ...prev, [bookId]: null }));
    try {
      const response = await fetch('/api/weread/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId }),
      });
      if (!response.ok) throw new Error('import failed');
      const result = await response.json();
      setImportResults((prev) => ({
        ...prev,
        [bookId]: { ok: true, title: result.title, bookmarkCount: result.bookmarkCount, reviewCount: result.reviewCount },
      }));
    } catch {
      setImportResults((prev) => ({ ...prev, [bookId]: { ok: false, title } }));
    } finally {
      setImportingIds((prev) => {
        const next = new Set(prev);
        next.delete(bookId);
        return next;
      });
    }
  }

  function openSettings() {
    window.dispatchEvent(new CustomEvent('zhijing:navigate', { detail: { view: 'settings', section: 'weread' } }));
  }

  if (checking) {
    return (
      <section className="page-main full weread-view">
        <div className="weread-loading">
          <Loader2 className="spin" size={28} />
          <p>{t('common.loading')}</p>
        </div>
      </section>
    );
  }

  if (!configured) {
    return (
      <section className="page-main full weread-view">
        <div className="page-title-row">
          <div>
            <h2>{t('weread.title')}</h2>
            <p>{t('weread.subtitle')}</p>
          </div>
        </div>
        <div className="weread-empty">
          <BookOpen size={48} />
          <strong>{t('weread.notConfigured')}</strong>
          <p>{t('weread.notConfiguredHint')}</p>
          <button type="button" onClick={openSettings}>
            <Settings size={16} />
            {t('weread.goToSettings')}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="page-main full weread-view">
      <div className="page-title-row">
        <div>
          <h2>{t('weread.title')}</h2>
          <p>{t('weread.subtitle')}</p>
        </div>
        <button
          type="button"
          className="icon-button"
          disabled={loading}
          onClick={() => {
            setLoading(true);
            setError(null);
            fetch('/api/weread/shelf')
              .then((response) => {
                if (!response.ok) throw new Error('shelf unavailable');
                return response.json();
              })
              .then((result) => setShelf(result))
              .catch(() => setError(t('weread.loadShelfFailed')))
              .finally(() => setLoading(false));
          }}
        >
          <RefreshCw size={18} className={loading ? 'spin' : ''} />
          {t('common.refresh')}
        </button>
      </div>

      <div className="weread-tabs">
        <button
          type="button"
          className={activeTab === SHELF_TABS.books ? 'active' : ''}
          onClick={() => setActiveTab(SHELF_TABS.books)}
        >
          {t('weread.books')} ({shelf?.books?.length ?? 0})
        </button>
        <button
          type="button"
          className={activeTab === SHELF_TABS.albums ? 'active' : ''}
          onClick={() => setActiveTab(SHELF_TABS.albums)}
        >
          {t('weread.albums')} ({shelf?.albums?.length ?? 0})
        </button>
      </div>

      {error && <p className="weread-error">{error}</p>}

      {loading && !shelf && (
        <div className="weread-loading">
          <Loader2 className="spin" size={28} />
          <p>{t('common.loading')}</p>
        </div>
      )}

      {activeTab === SHELF_TABS.books && shelf?.books && (
        <div className="weread-grid">
          {shelf.books.map((book) => (
            <div key={book.bookId} className="weread-card">
              {book.cover ? (
                <img alt={book.title} className="weread-cover" src={book.cover} />
              ) : (
                <div className="weread-cover weread-cover-placeholder">
                  <BookOpen size={32} />
                </div>
              )}
              <div className="weread-meta">
                <strong>{book.title}</strong>
                <span>{book.author}</span>
                {book.category && <small>{book.category}</small>}
              </div>
              <div className="weread-actions">
                <a
                  className="button ghost"
                  href={`weread://reading?bId=${book.bookId}`}
                  title={t('weread.openInApp')}
                >
                  <ExternalLink size={14} />
                </a>
                <button
                  type="button"
                  disabled={importingIds.has(book.bookId) || importResults[book.bookId]?.ok}
                  onClick={() => importBook(book.bookId, book.title)}
                >
                  {importingIds.has(book.bookId) ? (
                    <Loader2 size={14} className="spin" />
                  ) : (
                    <Download size={14} />
                  )}
                  {importResults[book.bookId]?.ok
                    ? t('weread.imported')
                    : t('weread.importNotes')}
                </button>
              </div>
              {importResults[book.bookId] && (
                <p className={`weread-import-result ${importResults[book.bookId].ok ? 'ok' : 'failed'}`}>
                  {importResults[book.bookId].ok
                    ? t('weread.importSuccess', {
                        title: importResults[book.bookId].title,
                        bookmarks: importResults[book.bookId].bookmarkCount,
                        reviews: importResults[book.bookId].reviewCount,
                      })
                    : t('weread.importFailed', { title: importResults[book.bookId].title })}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === SHELF_TABS.albums && shelf?.albums && (
        <div className="weread-grid">
          {shelf.albums.map((album) => (
            <div key={album.albumInfo.albumId} className="weread-card">
              {album.albumInfo.cover ? (
                <img alt={album.albumInfo.name} className="weread-cover" src={album.albumInfo.cover} />
              ) : (
                <div className="weread-cover weread-cover-placeholder">
                  <BookOpen size={32} />
                </div>
              )}
              <div className="weread-meta">
                <strong>{album.albumInfo.name}</strong>
                <span>{album.albumInfo.authorName}</span>
                {album.albumInfo.trackCount && <small>{t('weread.tracks', { count: album.albumInfo.trackCount })}</small>}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
