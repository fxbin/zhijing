/**
 * 微信读书目录/筛选/视图域状态 Hook。
 * 统一管理搜索输入、防抖查询、排序方式、激活分类集合、视图模式、
 * 过滤器、可见条数、归档展开集合，并提供分类切换、清空筛选、
 * 归档折叠切换等业务函数。内部包含搜索防抖与筛选条件变化后重置分页两个副作用。
 * @module hooks/useWeReadCatalogState
 * @author fxbin
 */

import { useCallback, useEffect, useState } from 'react';
import {
  SORT_RECENT,
  VIEW_GRID,
  FILTER_ALL,
  INITIAL_PAGE_SIZE,
  SEARCH_DEBOUNCE_MS,
} from '../constants/weread';

/**
 * 搜索输入初始空字符串。
 */
const INITIAL_QUERY = '';

/**
 * 防抖查询初始空字符串。
 */
const INITIAL_DEBOUNCED_QUERY = '';

/**
 * 分类集合初始为空集合。
 */
function createEmptyCategorySet() {
  return new Set();
}

/**
 * 归档展开集合初始为空集合。
 */
function createEmptyArchiveSet() {
  return new Set();
}

/**
 * 使用微信读书目录/筛选/视图域状态。
 * @param {object} params - 入参对象
 * @param {string} params.activeTab - 当前激活的标签页，用于筛选条件变化时重置分页
 * @returns {object} 目录/筛选/视图域 state、setter 与业务函数
 * @author fxbin
 */
export function useWeReadCatalogState({ activeTab }) {
  const [query, setQuery] = useState(INITIAL_QUERY);
  const [debouncedQuery, setDebouncedQuery] = useState(INITIAL_DEBOUNCED_QUERY);
  const [sort, setSort] = useState(SORT_RECENT);
  const [activeCategories, setActiveCategories] = useState(createEmptyCategorySet);
  const [view, setView] = useState(VIEW_GRID);
  const [filter, setFilter] = useState(FILTER_ALL);
  const [visibleCount, setVisibleCount] = useState(INITIAL_PAGE_SIZE);
  const [expandedArchives, setExpandedArchives] = useState(createEmptyArchiveSet);

  /**
   * 搜索防抖副作用：query 变化后延迟同步到 debouncedQuery。
   * @author fxbin
   */
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query]);

  /**
   * 分页重置副作用：任一筛选条件或标签页变化时重置可见条数。
   * @author fxbin
   */
  useEffect(() => {
    setVisibleCount(INITIAL_PAGE_SIZE);
  }, [debouncedQuery, sort, activeCategories, activeTab, filter]);

  /**
   * 切换分类选中态：已选则取消，未选则追加。
   * @param {string} category - 分类名称
   * @author fxbin
   */
  const toggleCategory = useCallback((category) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }, []);

  /**
   * 清空所有筛选条件：查询、分类、排序、过滤器。
   * @author fxbin
   */
  const clearFilters = useCallback(() => {
    setQuery('');
    setActiveCategories(new Set());
    setSort(SORT_RECENT);
    setFilter(FILTER_ALL);
  }, []);

  /**
   * 切换归档分组展开态：已展开则收起，未展开则展开。
   * @param {string} name - 归档分组名称
   * @author fxbin
   */
  const toggleArchive = useCallback((name) => {
    setExpandedArchives((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  return {
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
  };
}
