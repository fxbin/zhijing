/**
 * 微信读书视图图表配置常量。
 * 集中管理分类分布、年份/月度柱状图、主题演变谱、四象限 i18n 等图表相关阈值与布局参数，
 * 避免在多文件中重复定义或出现魔法值。
 * @module constants/weread/charts
 * @author fxbin
 */

/**
 * 分类聚合展示上限。
 */
const CATEGORY_FACET_LIMIT = 12;

/**
 * 分类分布图表展示上限。
 */
const CATEGORY_CHART_LIMIT = 6;

/**
 * 年份趋势图最大柱数。
 */
const YEAR_CHART_MAX_BARS = 8;

/**
 * 年份柱状图最小高度（像素）。
 */
const YEAR_BAR_MIN_HEIGHT_PX = 12;

/**
 * 年份柱状图最大高度（像素）。
 */
const YEAR_BAR_MAX_HEIGHT_PX = 120;

/**
 * 月度活跃图最大柱数。
 */
const MONTH_CHART_MAX_BARS = 12;

/**
 * 月度柱状图最小高度（像素）。
 */
const MONTH_BAR_MIN_HEIGHT_PX = 12;

/**
 * 月度柱状图最大高度（像素）。
 */
const MONTH_BAR_MAX_HEIGHT_PX = 120;

/**
 * 主题演变谱 SVG viewBox 宽度（NS-2）。
 */
const TOPIC_SPECTRUM_VIEW_WIDTH = 1000;

/**
 * 主题演变谱 SVG viewBox 高度（NS-2）。
 */
const TOPIC_SPECTRUM_VIEW_HEIGHT = 460;

/**
 * 主题演变谱图表左侧留白（y 轴刻度空间）。
 */
const TOPIC_SPECTRUM_PADDING_LEFT = 52;

/**
 * 主题演变谱图表右侧留白。
 */
const TOPIC_SPECTRUM_PADDING_RIGHT = 24;

/**
 * 主题演变谱图表顶部留白。
 */
const TOPIC_SPECTRUM_PADDING_TOP = 24;

/**
 * 主题演变谱图表底部留白（x 轴标签空间）。
 */
const TOPIC_SPECTRUM_PADDING_BOTTOM = 56;

/**
 * 主题演变谱 y 轴刻度分段数。
 */
const TOPIC_SPECTRUM_Y_TICKS = 4;

/**
 * 主题演变谱图例每簇展示的代表词上限。
 */
const TOPIC_SPECTRUM_LEGEND_MAX_TERMS = 3;

/**
 * 主题演变谱稳定性展示文案映射键。
 */
const TOPIC_SPECTRUM_STABILITY_LABELS = {
  stable: '稳定',
  borderline: '边缘',
  unstable: '不稳定',
};

/**
 * 四象限 i18n 键（NS-1）。
 */
const QUADRANT_I18N_KEYS = {
  coreReading: 'weread.quadrant.coreReading',
  commitmentDebt: 'weread.quadrant.commitmentDebt',
  hiddenInterest: 'weread.quadrant.hiddenInterest',
  irrelevant: 'weread.quadrant.irrelevant',
  title: 'weread.quadrant.title',
  insufficientData: 'weread.quadrant.insufficientData',
  recommendationSeeds: 'weread.quadrant.recommendationSeeds',
};

export {
  CATEGORY_FACET_LIMIT,
  CATEGORY_CHART_LIMIT,
  YEAR_CHART_MAX_BARS,
  YEAR_BAR_MIN_HEIGHT_PX,
  YEAR_BAR_MAX_HEIGHT_PX,
  MONTH_CHART_MAX_BARS,
  MONTH_BAR_MIN_HEIGHT_PX,
  MONTH_BAR_MAX_HEIGHT_PX,
  TOPIC_SPECTRUM_VIEW_WIDTH,
  TOPIC_SPECTRUM_VIEW_HEIGHT,
  TOPIC_SPECTRUM_PADDING_LEFT,
  TOPIC_SPECTRUM_PADDING_RIGHT,
  TOPIC_SPECTRUM_PADDING_TOP,
  TOPIC_SPECTRUM_PADDING_BOTTOM,
  TOPIC_SPECTRUM_Y_TICKS,
  TOPIC_SPECTRUM_LEGEND_MAX_TERMS,
  TOPIC_SPECTRUM_STABILITY_LABELS,
  QUADRANT_I18N_KEYS,
};
