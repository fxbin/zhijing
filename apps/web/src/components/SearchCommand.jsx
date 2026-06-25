/**
 * @module components/SearchCommand
 * 全局搜索命令面板：以居中浮层形式承载跨工作区语义搜索。
 *
 * 触发方式（均由父组件控制 open + initialQuery）：
 *  - 顶栏搜索入口点击 / 回车
 *  - Cmd+K / Ctrl+K 全局快捷键（父组件注册 useHotkey）
 *
 * 关闭方式：Esc（useModalA11y）/ 点击遮罩 / 选中结果后自动关闭。
 * 能力继承自原 SearchView：scope 分类、最近搜索历史、语义发现标签、骨架屏、结果跳转。
 *
 * @author fxbin
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CircleX, History, Search, Sparkles } from 'lucide-react';
import EmptyState from './EmptyState';
import useModalA11y from '../hooks/useModalA11y';
import {
  PATH_CARD_ID_STORAGE_KEY,
  SEARCH_HISTORY_MAX_COUNT,
  SEARCH_HISTORY_STORAGE_KEY,
  searchScopeOptions,
} from '../constants/options';
import { resultIcon } from '../utils/material';
import {
  getCardTypeLabel,
  getClaimStatusLabel,
  getIntakeKindLabel,
  getParseStatusLabel,
} from '../utils/i18nLabels';
import api from '../utils/api';

const RESULT_KIND_WORKSPACE = 'workspace';
const RESULT_KIND_MATERIAL = 'material';
const RESULT_KIND_CARD = 'card';
const RESULT_KIND_ARTIFACT = 'artifact';
const SEARCH_LIMIT = 80;
const SEARCH_META_MAX_ITEMS = 2;
const DISCOVERY_TAG_MAX_COUNT = 8;
const DISCOVERY_TOKEN_MIN_LENGTH = 2;
const DISCOVERY_TOKEN_MAX_LENGTH = 12;
const DISCOVERY_MIN_FREQUENCY = 2;
const SKELETON_ROW_COUNT = 4;

const SEARCH_META_FIELDS = [
  { key: 'type', kind: RESULT_KIND_MATERIAL, labelKey: 'search.metaType', translate: (value, t) => getIntakeKindLabel(t, value) },
  { key: 'type', kind: RESULT_KIND_CARD, labelKey: 'search.metaCardType', translate: (value, t) => getCardTypeLabel(t, value) },
  { key: 'parseStatus', labelKey: 'search.metaParseStatus', translate: (value, t) => getParseStatusLabel(t, value) },
  { key: 'claimStatus', labelKey: 'search.metaClaimStatus', translate: (value, t) => getClaimStatusLabel(t, value) },
  { key: 'platform', labelKey: 'search.metaPlatform' },
  { key: 'stage', labelKey: 'search.metaStage' },
  { key: 'artifactType', labelKey: 'search.metaArtifactType' },
  { key: 'cardCount', labelKey: 'search.metaCardCount' },
  { key: 'sourceCount', labelKey: 'search.metaSourceCount' },
];

/**
 * 依据白名单把搜索结果的 metadata 加工成「标签 + 取值」的可读条目。
 * 仅保留对用户有意义的字段，跳过 match / score 等技术指标。
 * @param {object} result 单条搜索结果
 * @param {Function} t i18n 翻译函数
 * @returns {Array<{key: string, label: string, value: string}>} 可读元信息条目
 */
function buildSearchMetaEntries(result, t) {
  const meta = result.metadata ?? {};
  const entries = [];
  for (const field of SEARCH_META_FIELDS) {
    if (field.kind && result.kind !== field.kind) continue;
    const raw = meta[field.key];
    if (raw === undefined || raw === null || raw === '') continue;
    const value = field.translate ? field.translate(raw, t) : String(raw);
    if (!value) continue;
    entries.push({ key: field.key, label: t(field.labelKey), value });
    if (entries.length >= SEARCH_META_MAX_ITEMS) break;
  }
  return entries;
}

/**
 * 从 localStorage 读取最近搜索历史。
 * @returns {string[]} 搜索词数组
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
 * 将搜索词写入最近搜索历史（去重、最新排前、限量），返回写后的新数组。
 * @param {string} value 搜索词
 * @returns {string[]} 写入后的历史数组；localStorage 不可用时返回当前值
 */
function persistSearchHistory(value) {
  try {
    const history = readSearchHistory();
    const next = [value, ...history.filter((item) => item !== value)].slice(0, SEARCH_HISTORY_MAX_COUNT);
    localStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch {
    return readSearchHistory();
  }
}

/**
 * 构造打开产物所需的最小可用对象（兜底场景：上游未提供完整 artifact）。
 * @param {object} result 搜索结果（kind=artifact）
 * @returns {object} 最小可用 artifact 对象
 */
function buildArtifactFallback(result) {
  return {
    id: result.id,
    workspaceId: result.workspaceId ?? null,
    title: result.title,
    body: result.preview ?? '',
    artifactType: result.metadata?.artifactType ?? 'summary',
    subtype: 'generic',
    sourceMaterialIds: [],
    createdAt: '',
  };
}

/**
 * 全局搜索命令面板。
 * @param {object} props 组件属性
 * @param {boolean} props.open 是否打开
 * @param {() => void} props.onClose 关闭回调（Esc / 遮罩 / 选中结果后触发）
 * @param {string} [props.initialQuery] 打开时预填的搜索词（顶栏入口传入；空字符串表示净开）
 * @param {Function} [props.setView] 视图切换回调
 * @param {Function} [props.setSelectedWorkspaceId] 选中工作区回调
 * @param {Function} [props.onOpenArtifact] 打开产物详情回调
 * @returns {JSX.Element | null} 命令面板；open 为 false 时返回 null
 * @author fxbin
 */
export default function SearchCommand({
  open,
  onClose,
  initialQuery = '',
  setView,
  setSelectedWorkspaceId,
  onOpenArtifact,
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('all');
  const [results, setResults] = useState([]);
  const [counts, setCounts] = useState({});
  const [status, setStatus] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const backdropRef = useRef(null);
  const prevOpenRef = useRef(false);
  const initialQueryRef = useRef(initialQuery);
  initialQueryRef.current = initialQuery;
  useModalA11y(backdropRef, open, onClose);

  const visibleResults = results.filter((result) => scope === 'all' || result.kind === scope);
  const maxScore = visibleResults.reduce((max, result) => Math.max(max, Number(result.score) || 0), 0);

  const discoveryTags = useMemo(() => {
    if (visibleResults.length === 0) return [];
    const tokens = visibleResults
      .flatMap((result) => `${result.title ?? ''} ${result.preview ?? ''}`.split(/[\s,，。、；;:：]+/))
      .filter((token) => token.length >= DISCOVERY_TOKEN_MIN_LENGTH && token.length <= DISCOVERY_TOKEN_MAX_LENGTH)
      .filter((token) => !query.toLowerCase().includes(token.toLowerCase()));
    const freq = {};
    for (const token of tokens) freq[token] = (freq[token] ?? 0) + 1;
    return Object.entries(freq)
      .filter(([, count]) => count >= DISCOVERY_MIN_FREQUENCY)
      .sort((left, right) => right[1] - left[1])
      .slice(0, DISCOVERY_TAG_MAX_COUNT)
      .map(([token]) => token);
  }, [visibleResults, query]);

  /**
   * 执行一次语义搜索请求，并刷新结果、计数、状态与历史。
   * @param {string} [nextQuery] 可选搜索词，缺省使用当前 query
   */
  async function runSearch(nextQuery = query) {
    const value = nextQuery.trim();
    if (!value || isSearching) return;
    setIsSearching(true);
    setStatus(t('search.status.searching'));
    try {
      const params = new URLSearchParams({ q: value, limit: String(SEARCH_LIMIT) });
      const body = await api.get(`/api/search?${params.toString()}`);
      const list = body.results ?? [];
      setResults(list);
      setCounts(body.counts ?? {});
      setStatus(list.length ? t('search.resultsFound', { count: list.length }) : t('search.noResults'));
      setSearchHistory(persistSearchHistory(value));
    } catch {
      setStatus(t('search.status.failed'));
      setResults([]);
      setCounts({});
    } finally {
      setIsSearching(false);
    }
  }

  /**
   * 打开上升沿：重置面板状态，并根据 initialQuery 决定预填搜索或净开。
   * 仅在 open 由 false → true 时触发一次，避免重复请求。
   */
  useEffect(() => {
    if (!open || prevOpenRef.current) return undefined;
    prevOpenRef.current = true;
    setSearchHistory(readSearchHistory());
    const pending = initialQueryRef.current;
    if (pending) {
      setQuery(pending);
      runSearch(pending);
    } else {
      setQuery('');
      setResults([]);
      setCounts({});
      setScope('all');
      setStatus(t('search.initialStatus'));
    }
    return undefined;
  }, [open]);

  /**
   * 关闭下降沿：重置上升沿标记，为下次打开做准备。
   */
  useEffect(() => {
    if (!open) prevOpenRef.current = false;
  }, [open]);

  /**
   * 处理搜索结果点击：根据结果类型跳转到对应详情视图，随后关闭面板。
   * @param {object} result 搜索结果对象
   */
  function handleResultClick(result) {
    if (!result || !setView) return;
    const targetWorkspaceId = result.workspaceId ?? result.id;
    if (result.kind === RESULT_KIND_WORKSPACE) {
      if (setSelectedWorkspaceId) setSelectedWorkspaceId(result.id);
      setView('detail');
    } else if (result.kind === RESULT_KIND_MATERIAL) {
      if (setSelectedWorkspaceId && targetWorkspaceId) setSelectedWorkspaceId(targetWorkspaceId);
      setView('library');
    } else if (result.kind === RESULT_KIND_CARD) {
      if (setSelectedWorkspaceId && targetWorkspaceId) setSelectedWorkspaceId(targetWorkspaceId);
      sessionStorage.setItem(PATH_CARD_ID_STORAGE_KEY, result.id);
      setView('detail');
    } else if (result.kind === RESULT_KIND_ARTIFACT) {
      if (setSelectedWorkspaceId && targetWorkspaceId) setSelectedWorkspaceId(targetWorkspaceId);
      if (onOpenArtifact) {
        onOpenArtifact(buildArtifactFallback(result), { label: 'search', from: 'search' });
      } else {
        setView('artifact');
      }
    }
    onClose();
  }

  /**
   * 处理搜索结果卡片键盘事件：Enter / Space 触发跳转。
   * @param {Event} event 键盘事件
   * @param {object} result 搜索结果对象
   */
  function handleResultKeyDown(event, result) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleResultClick(result);
    }
  }

  if (!open) return null;

  const showEmpty = !query.trim() && results.length === 0 && !isSearching;
  const showNoResults = !!query.trim() && visibleResults.length === 0 && !isSearching;
  const showResults = visibleResults.length > 0 || isSearching;

  return (
    <div
      className="modal-backdrop search-command-backdrop"
      ref={backdropRef}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t('search.title')}
    >
      <div className="modal-card search-command-card" onClick={(event) => event.stopPropagation()}>
        <div className="search-command-input">
          <Search size={20} />
          <input
            autoFocus
            aria-label={t('search.searchAssets')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') runSearch();
            }}
            placeholder={t('search.placeholder')}
          />
          <button className="search-command-close" onClick={onClose} type="button" aria-label={t('common.close')}>
            <CircleX size={20} />
          </button>
        </div>

        <div className="search-command-scope">
          {searchScopeOptions.map((option) => (
            <button
              className={scope === option.key ? 'active' : ''}
              key={option.key}
              onClick={() => setScope(option.key)}
              type="button"
            >
              {t(option.label)}
              {option.key !== 'all' && <span>{counts[option.key] ?? 0}</span>}
            </button>
          ))}
        </div>

        <div className="search-command-body">
          {status && <p className="search-status">{status}</p>}

          {showEmpty && (
            <section className="search-command-section" aria-label={t('search.recentSearches')}>
              <header className="discovery-head">
                <History size={18} />
                <strong>{t('search.recentSearches')}</strong>
              </header>
              {searchHistory.length === 0 ? (
                <p className="search-command-hint">{t('search.noRecentSearches')}</p>
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

          {showNoResults && <EmptyState title={t('search.noResults')} body={t('search.noResultsHint')} />}

          {showResults && (
            <div className="search-command-results">
              {isSearching
                ? Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
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
                      <article
                        className="search-result-card clickable"
                        key={`${result.kind}-${result.id}`}
                        onClick={() => handleResultClick(result)}
                        onKeyDown={(event) => handleResultKeyDown(event, result)}
                        role="button"
                        tabIndex={0}
                        aria-label={result.title}
                      >
                        <Icon size={23} />
                        <div>
                          <div className="search-result-meta">
                            <span>{t(`search.kind.${result.kind}`)}</span>
                            {buildSearchMetaEntries(result, t).map((entry) => (
                              <span key={entry.key} className="result-meta-item">
                                <span className="result-meta-label">{entry.label}</span>
                                {entry.value}
                              </span>
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
          )}

          {!isSearching && discoveryTags.length > 0 && (
            <section className="search-command-discovery" aria-label={t('search.discovery')}>
              <header className="discovery-head">
                <Sparkles size={16} />
                <strong>{t('search.discovery')}</strong>
              </header>
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
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
