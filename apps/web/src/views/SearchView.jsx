/**
 * @module views/SearchView
 * 语义搜索视图：支持跨知识库资产搜索、结果聚类与语义发现标签。
 */

import { useMemo, useState } from 'react';
import { Layers, Search, Sparkles } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { searchScopeOptions } from '../constants/options';
import { resultIcon } from '../utils/material';

/**
 * 语义搜索视图组件
 * @returns {JSX.Element} 搜索视图
 */
export default function SearchView() {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('all');
  const [results, setResults] = useState([]);
  const [counts, setCounts] = useState({});
  const [status, setStatus] = useState('输入关键词后搜索当前知识库资产。');
  const [isSearching, setIsSearching] = useState(false);

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
      if (!buckets[key]) buckets[key] = { id: key, title: result.metadata?.knowledgeBaseTitle ?? `知识库 ${key.slice(0, 8)}`, count: 0, results: [] };
      buckets[key].count += 1;
      buckets[key].results.push(result);
    }
    return Object.values(buckets).sort((left, right) => right.count - left.count);
  }, [visibleResults]);

  async function runSearch(nextQuery = query) {
    const value = nextQuery.trim();
    if (!value || isSearching) return;
    setIsSearching(true);
    setStatus('Searching...');
    try {
      const params = new URLSearchParams({ q: value, limit: '80' });
      const response = await fetch(`/api/search?${params.toString()}`);
      if (!response.ok) throw new Error('Search failed.');
      const body = await response.json();
      setResults(body.results ?? []);
      setCounts(body.counts ?? {});
      setStatus((body.results ?? []).length ? `${body.results.length} results found.` : '没有找到匹配结果。');
    } catch {
      setStatus('搜索失败，请确认 API 正在运行。');
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
          <h2>Semantic Search</h2>
          <p>从知识库、资料、卡片和产物里快速定位线索。</p>
        </div>
      </div>

      <div className="search-workbench">
        <div className="large-search">
          <Search size={24} />
          <input
            aria-label="搜索知识资产"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') runSearch();
            }}
            placeholder="Search knowledge assets..."
          />
          <button disabled={isSearching || !query.trim()} onClick={() => runSearch()} type="button">
            {isSearching ? 'Searching' : 'Search'}
          </button>
        </div>

        <div className="search-scope-bar">
          {searchScopeOptions.map((option) => (
            <button className={scope === option.key ? 'active' : ''} key={option.key} onClick={() => setScope(option.key)} type="button">
              {option.label}
              {option.key !== 'all' && <span>{counts[option.key] ?? 0}</span>}
            </button>
          ))}
        </div>
      </div>

      <p className="search-status">{status}</p>

      {visibleResults.length === 0 && !isSearching ? (
        <EmptyState title="暂无搜索结果" body="可以搜索主题名、资料内容、卡片标题或产物正文。" />
      ) : (
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
                          <span>{result.kind.replace('_', ' ')}</span>
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
            <aside className="discovery-panel" aria-label="语义发现">
              <header className="discovery-head">
                <Sparkles size={18} />
                <strong>Semantic Discovery</strong>
              </header>
              <p>基于当前结果推荐的方向，点击直接发起搜索。</p>
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
                    <strong>结果聚类</strong>
                  </header>
                  <p>按知识库分组，查看结果分布。</p>
                  <div className="cluster-list">
                    {resultClusters.map((cluster) => (
                      <div className="cluster-summary" key={cluster.id}>
                        <strong>{cluster.title}</strong>
                        <span>{cluster.count} 项</span>
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
