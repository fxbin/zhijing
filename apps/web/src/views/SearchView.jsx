/**
 * @module views/SearchView
 * 语义搜索视图：支持跨知识库资产搜索、结果聚类与语义发现标签。
 */

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { History, Layers, Search, Sparkles } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { searchScopeOptions, SEARCH_HISTORY_MAX_COUNT, SEARCH_HISTORY_STORAGE_KEY, TOP_SEARCH_EVENT, TOP_SEARCH_STORAGE_KEY } from '../constants/options';
import { resultIcon } from '../utils/material';

/**
 * 语义搜索视图组件
 * @returns {JSX.Element} 搜索视图
 */
export default function SearchView() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('all');
  const [results, setResults] = useState([]);
  const [counts, setCounts] = useState({});
  const [status, setStatus] = useState(t('search.initialStatus'));
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);

  /**
   * 从 localStorage 读取最近搜索历史
   * @returns {string[]} 搜索历史数组
   */
  function readSearchHistory() {
    try {
      const raw = localStorage.getItem(SEARCH_HISTORY_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
    } catch {
      return [];
    }
  }

  /**
   * 将搜索词保存到最近搜索历史（去重、最新排前、限制条数）
   * @param {string} value 搜索词
   */
  function saveSearchHistory(value) {
    try {
      const history = readSearchHistory();
      const next = [value, ...history.filter((item) => item !== value)].slice(0, SEARCH_HISTORY_MAX_COUNT);
      localStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(next));
      setSearchHistory(next);
    } catch {
      // localStorage 不可用时静默忽略
    }
  }

  useEffect(() => {
    setSearchHistory(readSearchHistory());

    const triggerSearch = (value) => {
      if (!value) return;
      setQuery(value);
      runSearch(value);
    };

    const stored = sessionStorage.getItem(TOP_SEARCH_STORAGE_KEY);
    if (stored) {
      sessionStorage.removeItem(TOP_SEARCH_STORAGE_KEY);
      triggerSearch(stored);
    }

    const handleTopSearch = (event) => {
      sessionStorage.removeItem(TOP_SEARCH_STORAGE_KEY);
      triggerSearch(event.detail);
    };
    window.addEventListener(TOP_SEARCH_EVENT, handleTopSearch);
    return () => window.removeEventListener(TOP_SEARCH_EVENT, handleTopSearch);
  }, []);

  const visibleResults = results.filter((result) => scope === 'all' || result.kind === scope);
  const maxScore = visibleResults.reduce((max, result) => Math.max(max, Number(result.score) || 0), 0);
  const discoveryTags = useMemo(() => {
    if (visibleResults.length === 0) return [];
    const tokens = visibleResults
      .flatMap((result) => `${result.title ?? ''} ${result.preview ?? ''}`.split(/[\s,，。、；;:：]+/))
      .filter((token) => token.length >= 2 && token.length <= 12)
      .filter((token) => !query.toLowerCase().includes(token.toLowerCase()));
    const freq = {};
    for (const token of tokens) freq[token] = (freq[token] ?? 0) + 1;
    return Object.entries(freq)
      .filter(([, count]) => count >= 2)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 8)
      .map(([token]) => token);
  }, [visibleResults, query]);
  const resultClusters = useMemo(() => {
    if (visibleResults.length === 0) return [];
    const buckets = {};
    for (const result of visibleResults) {
      const key = result.knowledgeBaseId ?? 'unassigned';
      if (!buckets[key]) buckets[key] = { id: key, title: result.metadata?.knowledgeBaseTitle ?? t('search.unassignedKnowledgeBase', { id: key.slice(0, 8) }), count: 0, results: [] };
      buckets[key].count += 1;
      buckets[key].results.push(result);
    }
    return Object.values(buckets).sort((left, right) => right.count - left.count);
  }, [visibleResults]);

  async function runSearch(nextQuery = query) {
    const value = nextQuery.trim();
    if (!value || isSearching) return;
    setIsSearching(true);
    setStatus(t('search.status.searching'));
    try {
      const params = new URLSearchParams({ q: value, limit: '80' });
      const response = await fetch(`/api/search?${params.toString()}`);
      if (!response.ok) throw new Error('Search failed.');
      const body = await response.json();
      setResults(body.results ?? []);
      setCounts(body.counts ?? {});
      setStatus((body.results ?? []).length ? t('search.resultsFound', { count: body.results.length }) : t('search.noResults'));
      saveSearchHistory(value);
    } catch {
      setStatus(t('search.status.failed'));
      setResults([]);
      setCounts({});
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <section className="page-main full">
      <div className="page-title-row">
        <div>
          <h2>{t('search.title')}</h2>
          <p>{t('search.subtitle')}</p>
        </div>
      </div>

      <div className="search-workbench">
        <div className="large-search">
          <Search size={24} />
          <input
            aria-label={t('search.searchAssets')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') runSearch();
            }}
            placeholder={t('search.placeholder')}
          />
          <button disabled={isSearching || !query.trim()} onClick={() => runSearch()} type="button">
            {isSearching ? t('search.searching') : t('common.search')}
          </button>
        </div>

        <div className="search-scope-bar">
          {searchScopeOptions.map((option) => (
            <button className={scope === option.key ? 'active' : ''} key={option.key} onClick={() => setScope(option.key)} type="button">
              {t(option.label)}
              {option.key !== 'all' && <span>{counts[option.key] ?? 0}</span>}
            </button>
          ))}
        </div>
      </div>

      <p className="search-status">{status}</p>

      {!query.trim() && results.length === 0 && !isSearching && (
        <section className="recent-searches" aria-label={t('search.recentSearches')}>
          <header className="discovery-head">
            <History size={18} />
            <strong>{t('search.recentSearches')}</strong>
          </header>
          {searchHistory.length === 0 ? (
            <p>{t('search.noRecentSearches')}</p>
          ) : (
            <div className="discovery-tags">
              {searchHistory.map((item) => (
                <button
                  className="discovery-tag"
                  key={item}
                  onClick={() => {
                    setQuery(item);
                    runSearch(item);
                  }}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {query.trim() && visibleResults.length === 0 && !isSearching && (
        <EmptyState title={t('search.noResults')} body={t('search.noResultsHint')} />
      )}

      {(visibleResults.length > 0 || isSearching) && (
        <div className="search-layout">
          <div className="search-results">
            {isSearching
              ? Array.from({ length: 4 }).map((_, index) => (
                  <div className="search-result-card skeleton" key={`skeleton-${index}`} aria-hidden="true">
                    <div className="skeleton-icon" />
                    <div className="skeleton-body">
                      <div className="skeleton-line short" />
                      <div className="skeleton-line" />
                      <div className="skeleton-line long" />
                    </div>
                  </div>
                ))
              : visibleResults.map((result) => {
                  const Icon = resultIcon(result.kind);
                  const matchPercent = maxScore > 0
                    ? Math.round((Number(result.score) / maxScore) * 100)
                    : 0;
                  return (
                    <article className="search-result-card" key={`${result.kind}-${result.id}`}>
                      <Icon size={23} />
                      <div>
                        <div className="search-result-meta">
                          <span>{t(`search.kind.${result.kind}`)}</span>
                          {Object.entries(result.metadata ?? {}).slice(0, 3).map(([key, value]) => (
                            <span key={key}>{String(value)}</span>
                          ))}
                          {matchPercent > 0 && (
                            <span className="result-match">
                              <i className="match-bar" style={{ width: `${matchPercent}%` }} />
                              {matchPercent}%
                            </span>
                          )}
                        </div>
                        <h3>{result.title}</h3>
                        <p>{result.preview}</p>
                      </div>
                    </article>
                  );
                })}
          </div>
          {visibleResults.length > 0 && discoveryTags.length > 0 && (
            <aside className="discovery-panel" aria-label={t('search.discovery')}>
              <header className="discovery-head">
                <Sparkles size={18} />
                <strong>{t('search.discovery')}</strong>
              </header>
              <p>{t('search.discoveryHint')}</p>
              <div className="discovery-tags">
                {discoveryTags.map((tag) => (
                  <button
                    className="discovery-tag"
                    key={tag}
                    onClick={() => {
                      setQuery(tag);
                      runSearch(tag);
                    }}
                    type="button"
                  >
                    {tag}
                  </button>
                ))}
              </div>
              {resultClusters.length > 1 && (
                <div className="discovery-clusters">
                  <header className="discovery-head">
                    <Layers size={18} />
                    <strong>{t('search.clustering')}</strong>
                  </header>
                  <p>{t('search.clusteringHint')}</p>
                  <div className="cluster-list">
                    {resultClusters.map((cluster) => (
                      <div className="cluster-summary" key={cluster.id}>
                        <strong>{cluster.title}</strong>
                        <span>{t('search.clusterCount', { count: cluster.count })}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          )}
        </div>
      )}
    </section>
  );
}
