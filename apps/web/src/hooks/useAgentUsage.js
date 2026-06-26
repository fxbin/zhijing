/**
 * Agent 调用成本追踪域状态 Hook。
 *
 * 负责从 /api/analytics/agent-usage 拉取成本记录与聚合摘要，
 * 并提供按 taskType / provider / 时间范围过滤的能力。
 *
 * 数据流：
 *   后端 agent_usage 表 → GET /api/analytics/agent-usage → 本 Hook → AgentUsageDashboard 渲染
 *
 * @module hooks/useAgentUsage
 * @author fxbin
 */

import { useCallback, useEffect, useState } from 'react';
import api from '../utils/api';

/**
 * 成本记录列表接口路径。
 */
const USAGE_RECORDS_PATH = '/api/analytics/agent-usage';

/**
 * 聚合摘要接口路径（view=summary）。
 */
const USAGE_SUMMARY_PATH = '/api/analytics/agent-usage?view=summary';

/**
 * 路由配置接口路径。
 */
const USAGE_ROUTES_PATH = '/api/analytics/agent-usage/routes';

/**
 * Provider 成本对比接口路径。
 */
const USAGE_COMPARE_PATH = '/api/analytics/agent-usage/compare';

/**
 * 默认拉取的记录条数。
 */
const DEFAULT_RECORD_LIMIT = 50;

/**
 * 使用 Agent 调用成本追踪状态。
 *
 * 并行拉取四份数据：
 * 1. summary：聚合摘要（总成本、按 taskType/provider 拆分）
 * 2. records：最近成本记录
 * 3. routes：当前生效的路由表（P2.3 透明化）
 * 4. comparison：Provider 成本对比（P2.3 策略优化）
 *
 * @param {object} [options] - 可选配置
 * @param {string} [options.workspaceId] - 按工作区过滤；省略时查询全部工作区
 * @returns {object} 成本追踪 state 与刷新函数
 *   - summary: 聚合摘要
 *   - records: 最近成本记录数组
 *   - routes: 当前生效路由表 { routes, overriddenByEnv }
 *   - comparison: Provider 成本对比 { items }
 *   - loading: 是否正在加载
 *   - error: 错误信息
 *   - refresh: 手动刷新函数
 * @author fxbin
 */
export function useAgentUsage(options = {}) {
  const { workspaceId } = options;
  const [summary, setSummary] = useState(null);
  const [records, setRecords] = useState([]);
  const [routes, setRoutes] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadUsage = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const summaryParams = workspaceId ? `&workspaceId=${encodeURIComponent(workspaceId)}` : '';
      const recordsParams = new URLSearchParams({
        limit: String(DEFAULT_RECORD_LIMIT),
      });
      if (workspaceId) {
        recordsParams.set('workspaceId', workspaceId);
      }
      const compareParams = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : '';
      const [summaryResult, recordsResult, routesResult, compareResult] = await Promise.all([
        api.get(`${USAGE_SUMMARY_PATH}${summaryParams}`),
        api.get(`${USAGE_RECORDS_PATH}?${recordsParams.toString()}`),
        api.get(USAGE_ROUTES_PATH),
        api.get(`${USAGE_COMPARE_PATH}${compareParams}`),
      ]);
      setSummary(summaryResult.summary ?? null);
      setRecords(recordsResult.records ?? []);
      setRoutes(routesResult ?? null);
      setComparison(compareResult.comparison ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载 Agent 成本数据失败');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadUsage();
  }, [loadUsage]);

  return {
    summary,
    records,
    routes,
    comparison,
    loading,
    error,
    refresh: loadUsage,
  };
}
