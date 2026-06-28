/**
 * 主题演变谱堆叠面积图组件（NS-2）。
 *
 * 实现圆桌 R2 共识：
 * - 划线聚类为「主题簇」，按自然月时间窗口堆叠展示演变趋势
 * - 稳定性三档（stable / borderline / unstable）+ 轮廓系数透明展示
 * - LDA 升级门禁未通过时，提示当前为 TF-IDF 基线
 * - 降级时用 DegradeBadge 包裹，声明缺失维度（灰色缺角）
 * - 配色取自 core 返回的 cluster.color（TOPIC_PALETTE 20 色）
 *
 * @module components/TopicSpectrumChart
 * @author fxbin
 */

import DegradeBadge from './DegradeBadge';
import {
  TOPIC_SPECTRUM_VIEW_WIDTH,
  TOPIC_SPECTRUM_VIEW_HEIGHT,
  TOPIC_SPECTRUM_PADDING_LEFT,
  TOPIC_SPECTRUM_PADDING_RIGHT,
  TOPIC_SPECTRUM_PADDING_TOP,
  TOPIC_SPECTRUM_PADDING_BOTTOM,
  TOPIC_SPECTRUM_Y_TICKS,
  TOPIC_SPECTRUM_LEGEND_MAX_TERMS,
  TOPIC_SPECTRUM_STABILITY_LABELS,
} from '../constants/weread';

const INNER_WIDTH =
  TOPIC_SPECTRUM_VIEW_WIDTH - TOPIC_SPECTRUM_PADDING_LEFT - TOPIC_SPECTRUM_PADDING_RIGHT;
const INNER_HEIGHT =
  TOPIC_SPECTRUM_VIEW_HEIGHT - TOPIC_SPECTRUM_PADDING_TOP - TOPIC_SPECTRUM_PADDING_BOTTOM;
const BASELINE_Y = TOPIC_SPECTRUM_PADDING_TOP + INNER_HEIGHT;
const SINGLE_BAR_WIDTH = Math.min(80, INNER_WIDTH * 0.3);

/**
 * 计算第 index 个时间窗口中心的 x 坐标。
 * @param {number} index 窗口索引
 * @param {number} windowCount 窗口总数
 * @returns {number}
 */
function xCenter(index, windowCount) {
  if (windowCount <= 1) return TOPIC_SPECTRUM_PADDING_LEFT + INNER_WIDTH / 2;
  const step = INNER_WIDTH / (windowCount - 1);
  return TOPIC_SPECTRUM_PADDING_LEFT + index * step;
}

/**
 * 将数值映射为 SVG y 坐标（值越大 y 越小）。
 * @param {number} value 当前值
 * @param {number} maxTotal y 轴最大值
 * @returns {number}
 */
function yForValue(value, maxTotal) {
  const safeMax = maxTotal > 0 ? maxTotal : 1;
  return TOPIC_SPECTRUM_PADDING_TOP + INNER_HEIGHT - (value / safeMax) * INNER_HEIGHT;
}

/**
 * 构建累积矩阵与 y 轴最大值。
 *
 * cumulative[windowIndex][layerIndex] 表示该窗口下第 0..layerIndex 层的累积计数。
 *
 * @param {object} spectrum TopicSpectrum
 * @returns {{ cumulative: number[][], maxTotal: number, windowCount: number }}
 */
function buildStackedLayers(spectrum) {
  const { clusters, timeline } = spectrum;
  const windowCount = timeline.length;
  const cumulative = timeline.map((point) => {
    const sums = [];
    let running = 0;
    for (let l = 0; l < clusters.length; l++) {
      running += point.distribution[clusters[l].id] ?? 0;
      sums.push(running);
    }
    return sums;
  });
  const maxTotal =
    cumulative.length > 0
      ? Math.max(1, ...cumulative.map((sums) => sums[sums.length - 1] ?? 0))
      : 1;
  return { cumulative, maxTotal, windowCount };
}

/**
 * 构建某一层的面积路径（windowCount >= 2 时使用）。
 *
 * 路径 = 上边界正向 + 下边界反向 + 闭合。
 *
 * @param {number} layerIndex 层索引
 * @param {number[][]} cumulative 累积矩阵
 * @param {number} windowCount 窗口总数
 * @param {number} maxTotal y 轴最大值
 * @returns {string} SVG path d 属性
 */
function buildAreaPath(layerIndex, cumulative, windowCount, maxTotal) {
  if (windowCount < 2) return '';
  const topPoints = [];
  const bottomPoints = [];
  for (let i = 0; i < windowCount; i++) {
    const x = xCenter(i, windowCount);
    const topVal = cumulative[i][layerIndex] ?? 0;
    const bottomVal = layerIndex > 0 ? cumulative[i][layerIndex - 1] ?? 0 : 0;
    topPoints.push(`${x},${yForValue(topVal, maxTotal)}`);
    bottomPoints.push(`${x},${yForValue(bottomVal, maxTotal)}`);
  }
  const reversedBottom = [...bottomPoints].reverse();
  return `M ${topPoints.join(' L ')} L ${reversedBottom.join(' L ')} Z`;
}

/**
 * 构建某一层在单窗口场景下的矩形（windowCount === 1 时使用）。
 *
 * @param {number} layerIndex 层索引
 * @param {number[][]} cumulative 累积矩阵
 * @param {number} maxTotal y 轴最大值
 * @returns {{ x: number, y: number, width: number, height: number }}
 */
function buildBarRect(layerIndex, cumulative, maxTotal) {
  const x = xCenter(0, 1);
  const topVal = cumulative[0][layerIndex] ?? 0;
  const bottomVal = layerIndex > 0 ? cumulative[0][layerIndex - 1] ?? 0 : 0;
  const yTop = yForValue(topVal, maxTotal);
  const yBottom = yForValue(bottomVal, maxTotal);
  return {
    x: x - SINGLE_BAR_WIDTH / 2,
    y: yTop,
    width: SINGLE_BAR_WIDTH,
    height: Math.max(0, yBottom - yTop),
  };
}

/**
 * 生成 y 轴刻度列表。
 * @param {number} maxTotal y 轴最大值
 * @returns {Array<{ value: number, y: number }>}
 */
function buildYTicks(maxTotal) {
  return Array.from({ length: TOPIC_SPECTRUM_Y_TICKS + 1 }, (_, i) => {
    const value = (maxTotal * i) / TOPIC_SPECTRUM_Y_TICKS;
    return { value: Math.round(value), y: yForValue(value, maxTotal) };
  });
}

/**
 * 主题演变谱卡片。
 *
 * @param {object} props
 * @param {object} [props.spectrum] TopicSpectrum；为空时展示骨架/空态
 * @param {object} [props.degradeAssessment] 降级评估（DegradeAssessment）
 * @param {boolean} [props.loading] 加载态
 * @param {object} [props.error] 错误对象
 * @returns {JSX.Element}
 */
export default function TopicSpectrumChart({ spectrum, degradeAssessment, loading, error }) {
  if (loading && !spectrum) {
    return (
      <div className="topic-spectrum-chart is-loading">
        <div className="topic-spectrum-skeleton" aria-label="加载中" />
      </div>
    );
  }

  if (error && !spectrum) {
    return (
      <div className="topic-spectrum-chart is-error" role="alert">
        <p className="topic-spectrum-empty-text">主题演变谱加载失败</p>
      </div>
    );
  }

  if (!spectrum || spectrum.clusters.length === 0) {
    return (
      <div className="topic-spectrum-chart is-empty">
        <p className="topic-spectrum-empty-text">暂无主题演变谱数据</p>
      </div>
    );
  }

  const behavior = degradeAssessment?.behavior ?? 'normal';
  const { clusters, timeline, stability, coherenceScore, algorithm, ldaGatePassed } = spectrum;
  const { cumulative, maxTotal, windowCount } = buildStackedLayers(spectrum);
  const yTicks = buildYTicks(maxTotal);
  const stabilityLabel = TOPIC_SPECTRUM_STABILITY_LABELS[stability.level] ?? stability.level;
  const silhouettePercent = Math.round(stability.silhouetteScore * 100);
  const coherencePercent = Math.round(coherenceScore * 100);

  return (
    <DegradeBadge
      assessment={degradeAssessment}
      metricLabel="主题演变谱"
      confidence={degradeAssessment?.confidence ?? 1}
    >
      <div className={`topic-spectrum-chart behavior-${behavior}`}>
        <div className="topic-spectrum-header">
          <div className="topic-spectrum-title-block">
            <h4 className="topic-spectrum-title">主题演变谱</h4>
            {behavior !== 'normal' ? (
              <span className="topic-spectrum-behavior-tag">
                {behavior === 'hidden' ? '已隐藏' : '已降级'}
              </span>
            ) : null}
          </div>
          <div className="topic-spectrum-meta">
            <span className="topic-spectrum-meta-chip">
              {algorithm === 'lda' ? 'LDA 主题模型' : 'TF-IDF 基线'}
            </span>
            <span className={`topic-spectrum-meta-chip is-${stability.level}`}>
              聚类{stabilityLabel}
            </span>
            {ldaGatePassed ? (
              <span className="topic-spectrum-meta-chip is-lda-ready">LDA 就绪</span>
            ) : null}
          </div>
        </div>

        <div className="topic-spectrum-chart-body">
          <svg
            className="topic-spectrum-svg"
            viewBox={`0 0 ${TOPIC_SPECTRUM_VIEW_WIDTH} ${TOPIC_SPECTRUM_VIEW_HEIGHT}`}
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="主题演变谱堆叠面积图"
          >
            {yTicks.map((tick) => (
              <g key={tick.value} className="topic-spectrum-grid">
                <line
                  x1={TOPIC_SPECTRUM_PADDING_LEFT}
                  x2={TOPIC_SPECTRUM_VIEW_WIDTH - TOPIC_SPECTRUM_PADDING_RIGHT}
                  y1={tick.y}
                  y2={tick.y}
                  stroke="rgba(69, 71, 76, 0.12)"
                  strokeWidth={1}
                />
                <text
                  x={TOPIC_SPECTRUM_PADDING_LEFT - 8}
                  y={tick.y + 4}
                  textAnchor="end"
                  className="topic-spectrum-tick"
                >
                  {tick.value}
                </text>
              </g>
            ))}

            {clusters.map((cluster, layerIndex) => {
              if (windowCount >= 2) {
                const path = buildAreaPath(layerIndex, cumulative, windowCount, maxTotal);
                return (
                  <path
                    key={cluster.id}
                    d={path}
                    fill={cluster.color}
                    fillOpacity={0.78}
                    stroke={cluster.color}
                    strokeWidth={1}
                  >
                    <title>{`${cluster.label}（${cluster.highlightCount} 条划线）`}</title>
                  </path>
                );
              }
              const rect = buildBarRect(layerIndex, cumulative, maxTotal);
              return (
                <rect
                  key={cluster.id}
                  x={rect.x}
                  y={rect.y}
                  width={rect.width}
                  height={rect.height}
                  fill={cluster.color}
                  fillOpacity={0.78}
                  stroke={cluster.color}
                  strokeWidth={1}
                >
                  <title>{`${cluster.label}（${cluster.highlightCount} 条划线）`}</title>
                </rect>
              );
            })}

            <line
              x1={TOPIC_SPECTRUM_PADDING_LEFT}
              x2={TOPIC_SPECTRUM_VIEW_WIDTH - TOPIC_SPECTRUM_PADDING_RIGHT}
              y1={BASELINE_Y}
              y2={BASELINE_Y}
              stroke="rgba(69, 71, 76, 0.3)"
              strokeWidth={1.5}
            />

            {timeline.map((point, index) => (
              <text
                key={`${point.windowStart}-${index}`}
                x={xCenter(index, windowCount)}
                y={BASELINE_Y + 22}
                textAnchor="middle"
                className="topic-spectrum-tick"
              >
                {point.windowLabel}
              </text>
            ))}
          </svg>
        </div>

        <div className="topic-spectrum-legend">
          {clusters.map((cluster) => {
            const terms = cluster.representativeTerms.slice(0, TOPIC_SPECTRUM_LEGEND_MAX_TERMS);
            return (
              <div className="topic-spectrum-legend-item" key={cluster.id}>
                <span
                  className="topic-spectrum-legend-swatch"
                  style={{ backgroundColor: cluster.color }}
                />
                <div className="topic-spectrum-legend-text">
                  <span className="topic-spectrum-legend-label">
                    {cluster.label}
                    <span className="topic-spectrum-legend-count">{cluster.highlightCount}</span>
                  </span>
                  {terms.length > 0 ? (
                    <span className="topic-spectrum-legend-terms">{terms.join(' · ')}</span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        <div className="topic-spectrum-footer">
          <div className="topic-spectrum-footer-metric">
            <span className="topic-spectrum-footer-label">轮廓系数</span>
            <span className="topic-spectrum-footer-value">{silhouettePercent}%</span>
          </div>
          <div className="topic-spectrum-footer-metric">
            <span className="topic-spectrum-footer-label">主题一致性</span>
            <span className="topic-spectrum-footer-value">{coherencePercent}%</span>
          </div>
          <div className="topic-spectrum-footer-metric">
            <span className="topic-spectrum-footer-label">时间跨度</span>
            <span className="topic-spectrum-footer-value">{stability.monthSpan} 月</span>
          </div>
          <div className="topic-spectrum-footer-metric">
            <span className="topic-spectrum-footer-label">划线总量</span>
            <span className="topic-spectrum-footer-value">{stability.highlightCount}</span>
          </div>
          {stability.reasons.length > 0 ? (
            <p className="topic-spectrum-footer-reasons">{stability.reasons.join('；')}</p>
          ) : null}
        </div>
      </div>
    </DegradeBadge>
  );
}
