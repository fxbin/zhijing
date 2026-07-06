/**
 * 知识增长热力图组件（GitHub 贡献图风格的 2D SVG 实现）。
 * @module components/GrowthHeatmap
 * @author fxbin
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Scholar Blue 5 级颜色阶梯，对应数据量从低到高。
 * Level 0：无活动；Level 4：最高活动量。
 */
const COLOR_LEVELS = ['#ebedf0', '#aec6e3', '#7ba5c9', '#4a82b0', '#2C5F8D'];

/**
 * 热力图方块尺寸常量（像素）。
 */
const CELL_SIZE = 11;
const CELL_GAP = 3;
const DAY_COUNT = 7;

/**
 * 根据数值与最大值计算颜色级别（0-4）。
 * @param {number} value - 当日新增卡片数
 * @param {number} max - 期间最大日新增量
 * @returns {number} 颜色级别 0-4
 * @author fxbin
 */
function getLevel(value, max) {
  if (value <= 0) return 0;
  if (max <= 0) return 0;
  const ratio = value / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

/**
 * 将 "YYYY-MM-DD" 字符串解析为本地时区当天的 Date 对象。
 * 避免直接 new Date("YYYY-MM-DD") 被解析为 UTC 0 点导致时区偏移。
 * @param {string} dateStr - 日期字符串，格式 YYYY-MM-DD
 * @returns {Date} 本地时区日期对象
 * @author fxbin
 */
function parseLocalDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * 计算指定日期是星期几（周一=0, 周日=6）。
 * @param {Date} date - 日期对象
 * @returns {number} 0-6，周一为 0
 * @author fxbin
 */
function getMondayBasedDay(date) {
  const sundayBased = date.getDay();
  return (sundayBased + 6) % 7;
}

/**
 * 构建 7×N 周对齐网格。
 * 第一天前面补空方块以对齐到正确星期，末尾补齐到完整周。
 * @param {string[]} labels - 日期标签数组（YYYY-MM-DD）
 * @param {number[]} data - 每日卡片数数组
 * @param {number} max - 最大值
 * @returns {Array<{empty?: boolean, label?: string, value?: number, date?: Date, level?: number}>} 网格单元格数组
 * @author fxbin
 */
function buildWeekGrid(labels, data, max) {
  if (!labels?.length) return [];
  const firstDate = parseLocalDate(labels[0]);
  const leadingBlanks = getMondayBasedDay(firstDate);
  const cells = [];
  for (let i = 0; i < leadingBlanks; i += 1) {
    cells.push({ empty: true });
  }
  for (let i = 0; i < data.length; i += 1) {
    cells.push({
      label: labels[i],
      value: data[i],
      date: parseLocalDate(labels[i]),
      level: getLevel(data[i], max),
    });
  }
  while (cells.length % DAY_COUNT !== 0) {
    cells.push({ empty: true });
  }
  return cells;
}

/**
 * 月份缩写常量，用于 2D 热力图顶部月份标签。
 */
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * 中文月份常量，用于本地化显示。
 */
const MONTH_LABELS_ZH = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

/**
 * 从网格单元格数组提取月份标签（按列出现顺序，去重）。
 * @param {Array} cells - 网格单元格数组
 * @param {string} lang - 当前语言
 * @returns {Array<{col: number, label: string}>} 月份标签数组
 * @author fxbin
 */
function buildMonthLabels(cells, lang) {
  const labels = [];
  let lastMonth = -1;
  for (let i = 0; i < cells.length; i += 1) {
    const cell = cells[i];
    if (cell.empty || !cell.date) continue;
    const col = Math.floor(i / DAY_COUNT);
    const month = cell.date.getMonth();
    if (month !== lastMonth) {
      const labelSet = lang === 'zh' ? MONTH_LABELS_ZH : MONTH_LABELS;
      labels.push({ col, label: labelSet[month] });
      lastMonth = month;
    }
  }
  return labels;
}

/**
 * 星期标签常量（周一、周三、周五），用于 2D 热力图左侧星期标签。
 */
const WEEKDAY_LABELS = ['Mon', 'Wed', 'Fri'];
const WEEKDAY_LABELS_ZH = ['一', '三', '五'];

/**
 * 左侧星期标签宽度（像素）。
 */
const WEEKDAY_LABEL_WIDTH = 24;

/**
 * 顶部月份标签高度（像素）。
 */
const MONTH_LABEL_HEIGHT = 16;

/**
 * 2D 平面热力图（SVG 实现，GitHub 风格贡献图）。
 * 包含顶部月份标签、左侧星期标签、数据方块网格。
 * @param {object} props - 组件属性
 * @param {Array} props.cells - 网格单元格数组
 * @returns {JSX.Element} SVG 热力图
 * @author fxbin
 */
function Heatmap2D({ cells }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith('zh') ? 'zh' : 'en';
  const totalCols = Math.ceil(cells.length / DAY_COUNT);
  const monthLabels = useMemo(() => buildMonthLabels(cells, lang), [cells, lang]);
  const gridWidth = totalCols * (CELL_SIZE + CELL_GAP) + CELL_GAP;
  const gridHeight = DAY_COUNT * (CELL_SIZE + CELL_GAP) + CELL_GAP;
  const svgWidth = WEEKDAY_LABEL_WIDTH + gridWidth;
  const svgHeight = MONTH_LABEL_HEIGHT + gridHeight;

  return (
    <svg
      className="growth-heatmap-svg"
      width={svgWidth}
      height={svgHeight}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      role="img"
      aria-label={t('insights.growthTitle')}
    >
      {monthLabels.map((item) => (
        <text
          key={`month-${item.col}-${item.label}`}
          x={WEEKDAY_LABEL_WIDTH + CELL_GAP + item.col * (CELL_SIZE + CELL_GAP)}
          y={MONTH_LABEL_HEIGHT - 4}
          fontSize={10}
          fill="var(--muted, #999)"
        >
          {item.label}
        </text>
      ))}
      {[0, 2, 4].map((row) => (
        <text
          key={`weekday-${row}`}
          x={0}
          y={MONTH_LABEL_HEIGHT + CELL_GAP + row * (CELL_SIZE + CELL_GAP) + CELL_SIZE - 2}
          fontSize={10}
          fill="var(--muted, #999)"
        >
          {lang === 'zh' ? WEEKDAY_LABELS_ZH[row === 0 ? 0 : row === 2 ? 1 : 2] : WEEKDAY_LABELS[row === 0 ? 0 : row === 2 ? 1 : 2]}
        </text>
      ))}
      {cells.map((cell, index) => {
        const col = Math.floor(index / DAY_COUNT);
        const row = index % DAY_COUNT;
        const x = WEEKDAY_LABEL_WIDTH + CELL_GAP + col * (CELL_SIZE + CELL_GAP);
        const y = MONTH_LABEL_HEIGHT + CELL_GAP + row * (CELL_SIZE + CELL_GAP);
        if (cell.empty) {
          return null;
        }
        const fill = COLOR_LEVELS[cell.level];
        const tooltip = `${cell.label}: ${cell.value} ${t('insights.heatmap.cardsUnit')}`;
        return (
          <rect
            key={cell.label}
            x={x}
            y={y}
            width={CELL_SIZE}
            height={CELL_SIZE}
            rx={2}
            ry={2}
            fill={fill}
            className="growth-heatmap-cell"
          >
            <title>{tooltip}</title>
          </rect>
        );
      })}
    </svg>
  );
}

/**
 * 热力图颜色图例。
 * @returns {JSX.Element} 图例
 * @author fxbin
 */
function HeatmapLegend() {
  const { t } = useTranslation();
  return (
    <div className="growth-heatmap-legend">
      <span className="legend-label">{t('insights.heatmap.less')}</span>
      {COLOR_LEVELS.map((color, idx) => (
        <span
          key={idx}
          className="legend-swatch"
          style={{ backgroundColor: color }}
        />
      ))}
      <span className="legend-label">{t('insights.heatmap.more')}</span>
    </div>
  );
}

/**
 * 知识增长热力图主组件。
 * 渲染 GitHub 风格 2D 平面热力图。
 * @param {object} props - 组件属性
 * @param {number[]} props.data - 期间每日新增卡片数
 * @param {string[]} props.labels - 日期标签数组（YYYY-MM-DD）
 * @returns {JSX.Element} 热力图区域
 * @author fxbin
 */
export default function GrowthHeatmap({ data, labels }) {
  const max = useMemo(() => Math.max(1, ...data), [data]);
  const cells = useMemo(() => buildWeekGrid(labels, data, max), [labels, data, max]);

  return (
    <div className="growth-heatmap-container">
      <div className="growth-heatmap-toolbar">
        <HeatmapLegend />
      </div>
      <div className="growth-heatmap-body">
        <Heatmap2D cells={cells} />
      </div>
    </div>
  );
}

export {
  COLOR_LEVELS,
  getLevel,
  parseLocalDate,
  getMondayBasedDay,
  buildWeekGrid,
};
