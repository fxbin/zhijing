/**
 * 微信读书统计仪表盘组件
 * 包含 5 个 KPI 卡、分类分布条形图、加入年份趋势柱状图
 * 可折叠，折叠状态记忆在 localStorage
 * KPI 点击可联动筛选
 *
 * 从 WeReadView.jsx 拆分而来，原 props 表面与渲染行为完全保持不变。
 *
 * @module views/weread/WeReadStatsBand
 * @author fxbin
 */

import {
  BookOpen,
  BookmarkCheck,
  CheckCircle2,
  Flame,
  Tag,
} from 'lucide-react';

import {
  PERCENT_BASE,
  CATEGORY_CHART_LIMIT,
  YEAR_CHART_MAX_BARS,
  YEAR_BAR_MIN_HEIGHT_PX,
  YEAR_BAR_MAX_HEIGHT_PX,
  MONTH_CHART_MAX_BARS,
  MONTH_BAR_MIN_HEIGHT_PX,
  MONTH_BAR_MAX_HEIGHT_PX,
  FILTER_ALL,
  FILTER_FINISHED,
  FILTER_IMPORTED,
} from '../../constants/weread';
import { resolveCategoryTheme, CATEGORY_THEME_MAP } from './utils';

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

export default WeReadStatsBand;
