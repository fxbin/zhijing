/**
 * Agent 调用成本追踪仪表盘组件。
 *
 * 展示 Agent LLM 调用的成本追踪数据，包括：
 * 1. 总览指标卡片（总调用次数、总成本、总 token 用量）
 * 2. 按任务类型拆分的成本分布
 * 3. 按 Provider 拆分的成本分布
 * 4. 最近调用记录列表（含成功/失败状态、耗时、token 用量）
 *
 * 数据来源：useAgentUsage Hook → GET /api/analytics/agent-usage
 *
 * @module components/AgentUsageDashboard
 * @author fxbin
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Coins,
  Cpu,
  DollarSign,
  Loader2,
  RefreshCw,
  Zap,
} from 'lucide-react';
import EmptyState from './EmptyState';
import { useAgentUsage } from '../hooks/useAgentUsage';

/**
 * 任务类型中文标签映射。
 */
const TASK_TYPE_LABELS = {
  workspace_skeleton: '知识库骨架',
  material_summary: '资料摘要',
  knowledge_cards: '知识卡片',
  question_answer: '问答',
  entity_extraction: '实体提取',
  socratic_questioning: '苏格拉底追问',
  deep_research: '深度研究',
  conversation: '对话',
  auxiliary_probe: '辅助探查',
};

/**
 * Provider 路由角色中文标签。
 */
const ROLE_LABELS = {
  primary: '主力',
  complementary: '互补',
};

/**
 * 格式化成本为美元显示。
 * @param {number|null} costUsd - 成本（美元）
 * @returns {string} 格式化后的成本字符串
 */
function formatCost(costUsd) {
  if (costUsd === null || costUsd === undefined) return '-';
  if (costUsd < 0.01) return `$${costUsd.toFixed(6)}`;
  return `$${costUsd.toFixed(4)}`;
}

/**
 * 格式化 token 数量为千位显示。
 * @param {number|null} tokens - token 数量
 * @returns {string} 格式化后的 token 字符串
 */
function formatTokens(tokens) {
  if (tokens === null || tokens === undefined) return '-';
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
  return String(tokens);
}

/**
 * 格式化耗时为毫秒/秒显示。
 * @param {number} durationMs - 耗时毫秒
 * @returns {string} 格式化后的耗时字符串
 */
function formatDuration(durationMs) {
  if (durationMs < 1000) return `${durationMs}ms`;
  return `${(durationMs / 1000).toFixed(2)}s`;
}

/**
 * 格式化 ISO 时间为本地时间短显示。
 * @param {string} isoString - ISO 时间字符串
 * @returns {string} 格式化后的时间字符串
 */
function formatTime(isoString) {
  try {
    const date = new Date(isoString);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

/**
 * Agent 调用成本追踪仪表盘组件。
 *
 * @param {object} [props] - 组件属性
 * @param {string} [props.workspaceId] - 按工作区过滤；省略时查询全部
 * @returns {JSX.Element} 成本追踪仪表盘
 * @author fxbin
 */
export default function AgentUsageDashboard({ workspaceId } = {}) {
  const { t } = useTranslation();
  const { summary, records, routes, comparison, loading, error, refresh } = useAgentUsage({ workspaceId });

  const maxTaskCost = useMemo(() => {
    if (!summary?.byTaskType?.length) return 0;
    return Math.max(...summary.byTaskType.map((item) => item.costUsd ?? 0), 0.01);
  }, [summary]);

  const maxProviderCost = useMemo(() => {
    if (!summary?.byProvider?.length) return 0;
    return Math.max(...summary.byProvider.map((item) => item.costUsd ?? 0), 0.01);
  }, [summary]);

  if (loading) {
    return (
      <div className="agent-usage-dashboard">
        <div className="agent-usage-loading">
          <Loader2 size={24} className="spin" />
          <span>{t('agentUsage.loading')}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="agent-usage-dashboard">
        <EmptyState
          icon={AlertCircle}
          title={t('agentUsage.errorTitle')}
          body={error}
        />
      </div>
    );
  }

  if (!summary || summary.totalCount === 0) {
    return (
      <div className="agent-usage-dashboard">
        <EmptyState
          icon={Coins}
          title={t('agentUsage.emptyTitle')}
          body={t('agentUsage.emptyBody')}
        />
      </div>
    );
  }

  return (
    <div className="agent-usage-dashboard">
      <div className="agent-usage-header">
        <p className="agent-usage-desc">{t('agentUsage.desc')}</p>
        <button type="button" className="agent-usage-refresh" onClick={refresh}>
          <RefreshCw size={16} />
          {t('agentUsage.refresh')}
        </button>
      </div>

      <section className="agent-usage-metrics">
        <article className="agent-usage-metric">
          <Zap size={20} />
          <div>
            <strong>{summary.totalCount}</strong>
            <span>{t('agentUsage.totalCalls')}</span>
          </div>
        </article>
        <article className="agent-usage-metric metric-cost">
          <DollarSign size={20} />
          <div>
            <strong>{formatCost(summary.totalCostUsd)}</strong>
            <span>{t('agentUsage.totalCost')}</span>
          </div>
        </article>
        <article className="agent-usage-metric">
          <Cpu size={20} />
          <div>
            <strong>{formatTokens(summary.totalInputTokens)}</strong>
            <span>{t('agentUsage.inputTokens')}</span>
          </div>
        </article>
        <article className="agent-usage-metric">
          <Cpu size={20} />
          <div>
            <strong>{formatTokens(summary.totalOutputTokens)}</strong>
            <span>{t('agentUsage.outputTokens')}</span>
          </div>
        </article>
      </section>

      <div className="agent-usage-grid">
        <section className="agent-usage-card">
          <div className="agent-usage-card-head">
            <h3>{t('agentUsage.byTaskType')}</h3>
          </div>
          <div className="agent-usage-bar-list">
            {summary.byTaskType.map((item) => (
              <div key={item.taskType} className="agent-usage-bar-item">
                <div className="agent-usage-bar-info">
                  <span className="agent-usage-bar-label">
                    {TASK_TYPE_LABELS[item.taskType] ?? item.taskType}
                  </span>
                  <span className="agent-usage-bar-value">
                    {item.count} {t('agentUsage.calls')} · {formatCost(item.costUsd)}
                  </span>
                </div>
                <div className="agent-usage-bar-track">
                  <div
                    className="agent-usage-bar-fill"
                    style={{ width: `${(item.costUsd / maxTaskCost) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="agent-usage-card">
          <div className="agent-usage-card-head">
            <h3>{t('agentUsage.byProvider')}</h3>
          </div>
          <div className="agent-usage-bar-list">
            {summary.byProvider.map((item) => (
              <div key={item.provider} className="agent-usage-bar-item">
                <div className="agent-usage-bar-info">
                  <span className="agent-usage-bar-label">{item.provider}</span>
                  <span className="agent-usage-bar-value">
                    {item.count} {t('agentUsage.calls')} · {formatCost(item.costUsd)}
                  </span>
                </div>
                <div className="agent-usage-bar-track">
                  <div
                    className="agent-usage-bar-fill agent-usage-bar-fill-alt"
                    style={{ width: `${(item.costUsd / maxProviderCost) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {routes && routes.routes && routes.routes.length > 0 && (
        <section className="agent-usage-card">
          <div className="agent-usage-card-head">
            <h3>{t('agentUsage.routesTitle')}</h3>
            <p className="agent-usage-card-desc">{t('agentUsage.routesDesc')}</p>
            {routes.overriddenByEnv && (
              <span className="agent-usage-badge env-override">ENV</span>
            )}
          </div>
          <div className="agent-usage-records-table">
            <div className="agent-usage-records-row agent-usage-records-header agent-usage-routes-header">
              <span>{t('agentUsage.colRouteTaskType')}</span>
              <span>{t('agentUsage.colRouteProvider')}</span>
              <span>{t('agentUsage.colRouteModel')}</span>
              <span>{t('agentUsage.colRouteRole')}</span>
              <span>{t('agentUsage.colRouteReason')}</span>
            </div>
            {routes.routes.flatMap((route) =>
              route.taskTypes.map((taskType) => (
                <div key={`${route.provider}-${taskType}`} className="agent-usage-records-row agent-usage-routes-row">
                  <span className="cell-task">{TASK_TYPE_LABELS[taskType] ?? taskType}</span>
                  <span className="cell-provider">{route.provider}</span>
                  <span className="cell-provider">{route.model}</span>
                  <span className={`cell-role role-${route.role}`}>
                    {ROLE_LABELS[route.role] ?? route.role}
                  </span>
                  <span className="cell-reason">{route.reason}</span>
                </div>
              )),
            )}
          </div>
        </section>
      )}

      {comparison && comparison.items && comparison.items.length > 0 && (
        <section className="agent-usage-card">
          <div className="agent-usage-card-head">
            <h3>{t('agentUsage.compareTitle')}</h3>
            <p className="agent-usage-card-desc">{t('agentUsage.compareDesc')}</p>
          </div>
          <div className="agent-usage-records-table">
            <div className="agent-usage-records-row agent-usage-records-header agent-usage-compare-header">
              <span>{t('agentUsage.colCompareProvider')}</span>
              <span>{t('agentUsage.colCompareCalls')}</span>
              <span>{t('agentUsage.colCompareSuccessRate')}</span>
              <span>{t('agentUsage.colCompareAvgCost')}</span>
              <span>{t('agentUsage.colCompareAvgDuration')}</span>
            </div>
            {comparison.items.map((item) => (
              <div key={item.provider} className="agent-usage-records-row agent-usage-compare-row">
                <span className="cell-provider">{item.provider}</span>
                <span className="cell-tokens">{item.totalCalls}</span>
                <span className={`cell-status ${item.successRate >= 0.9 ? 'status-ok' : 'status-fail'}`}>
                  {(item.successRate * 100).toFixed(1)}%
                </span>
                <span className="cell-cost">{formatCost(item.avgCostUsd)}</span>
                <span className="cell-duration">
                  <Clock size={12} />
                  {formatDuration(item.avgDurationMs)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="agent-usage-card agent-usage-records-card">
        <div className="agent-usage-card-head">
          <h3>{t('agentUsage.recentRecords')}</h3>
        </div>
        {records.length === 0 ? (
          <p className="agent-usage-records-empty">{t('agentUsage.noRecords')}</p>
        ) : (
          <div className="agent-usage-records-table">
            <div className="agent-usage-records-row agent-usage-records-header">
              <span>{t('agentUsage.colTime')}</span>
              <span>{t('agentUsage.colTaskType')}</span>
              <span>{t('agentUsage.colProvider')}</span>
              <span>{t('agentUsage.colRole')}</span>
              <span>{t('agentUsage.colTokens')}</span>
              <span>{t('agentUsage.colCost')}</span>
              <span>{t('agentUsage.colDuration')}</span>
              <span>{t('agentUsage.colStatus')}</span>
            </div>
            {records.map((record) => (
              <div key={record.id} className="agent-usage-records-row">
                <span className="cell-time">{formatTime(record.startedAt)}</span>
                <span className="cell-task">
                  {TASK_TYPE_LABELS[record.taskType] ?? record.taskType}
                </span>
                <span className="cell-provider">{record.provider}</span>
                <span className={`cell-role role-${record.role}`}>
                  {ROLE_LABELS[record.role] ?? record.role}
                </span>
                <span className="cell-tokens">
                  {formatTokens(record.inputTokens)} / {formatTokens(record.outputTokens)}
                </span>
                <span className="cell-cost">{formatCost(record.costUsd)}</span>
                <span className="cell-duration">
                  <Clock size={12} />
                  {formatDuration(record.durationMs)}
                </span>
                <span className={`cell-status ${record.ok ? 'status-ok' : 'status-fail'}`}>
                  {record.ok ? (
                    <CheckCircle2 size={14} />
                  ) : (
                    <AlertCircle size={14} />
                  )}
                  {record.ok ? t('agentUsage.ok') : t('agentUsage.failed')}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
