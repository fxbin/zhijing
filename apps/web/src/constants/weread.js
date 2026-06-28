/**
 * 微信读书视图常量集中定义。
 * 统一管理 WeReadView 及其自定义 hooks 共享的枚举、阈值、Key 等常量，
 * 避免在多文件中重复定义或出现魔法值。
 * @module constants/weread
 * @author fxbin
 */

/**
 * 标签页：书架。
 */
const TAB_BOOKS = 'books';

/**
 * 标签页：书单。
 */
const TAB_ALBUMS = 'albums';

/**
 * 标签页：归档。
 */
const TAB_ARCHIVE = 'archive';

/**
 * 标签页：回顾。
 */
const TAB_REVIEW = 'review';

/**
 * 标签页：统计。
 */
const TAB_STATS = 'stats';

/**
 * 标签页：推荐。
 */
const TAB_RECOMMEND = 'recommend';

/**
 * 排序方式：最近阅读。
 */
const SORT_RECENT = 'recent';

/**
 * 排序方式：标题。
 */
const SORT_TITLE = 'title';

/**
 * 排序方式：作者。
 */
const SORT_AUTHOR = 'author';

/**
 * 视图模式：网格。
 */
const VIEW_GRID = 'grid';

/**
 * 视图模式：列表。
 */
const VIEW_LIST = 'list';

/**
 * 过滤器：全部。
 */
const FILTER_ALL = 'all';

/**
 * 过滤器：已读完。
 */
const FILTER_FINISHED = 'finished';

/**
 * 过滤器：在读。
 */
const FILTER_READING = 'reading';

/**
 * 过滤器：已导入。
 */
const FILTER_IMPORTED = 'imported';

/**
 * 预览笔记类型：全部。
 */
const PREVIEW_TYPE_ALL = 'all';

/**
 * 预览笔记类型：划线。
 */
const PREVIEW_TYPE_BOOKMARK = 'bookmark';

/**
 * 预览笔记类型：评论。
 */
const PREVIEW_TYPE_REVIEW = 'review';

/**
 * 预览模式：单本。
 */
const PREVIEW_MODE_SINGLE = 'single';

/**
 * 预览模式：批量。
 */
const PREVIEW_MODE_BATCH = 'batch';

/**
 * 列表初始可见条数。
 */
const INITIAL_PAGE_SIZE = 60;

/**
 * 列表滚动加载增量。
 */
const PAGE_INCREMENT = 60;

/**
 * 搜索防抖时长（毫秒）。
 */
const SEARCH_DEBOUNCE_MS = 200;

/**
 * 骨架屏占位数量。
 */
const SKELETON_COUNT = 12;

/**
 * Toast 自动消失时长（毫秒）。
 */
const TOAST_AUTODISMISS_MS = 4000;

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
const YEAR_BAR_MIN_HEIGHT_PX = 8;

/**
 * 年份柱状图最大高度（像素）。
 */
const YEAR_BAR_MAX_HEIGHT_PX = 80;

/**
 * 月度活跃图最大柱数。
 */
const MONTH_CHART_MAX_BARS = 12;

/**
 * 月度柱状图最小高度（像素）。
 */
const MONTH_BAR_MIN_HEIGHT_PX = 8;

/**
 * 月度柱状图最大高度（像素）。
 */
const MONTH_BAR_MAX_HEIGHT_PX = 80;

/**
 * 毫秒与秒换算基数。
 */
const MS_PER_SECOND = 1000;

/**
 * 百分比换算基数。
 */
const PERCENT_BASE = 100;

/**
 * 统计折叠状态持久化 Key。
 */
const STATS_COLLAPSED_KEY = 'weread-stats-collapsed';

/**
 * 一分钟对应的秒数。
 */
const MINUTE_SECONDS = 60;

/**
 * 一小时对应的秒数。
 */
const HOUR_SECONDS = 3600;

/**
 * 一天对应的秒数。
 */
const DAY_SECONDS = 86400;

/**
 * 一个月对应的秒数（按 30 天近似）。
 */
const MONTH_SECONDS = 2592000;

/**
 * 一年对应的秒数（按 365 天近似）。
 */
const YEAR_SECONDS = 31536000;

/**
 * 书籍已读完标记值。
 */
const FINISHED_FLAG = 1;

/**
 * 卡片状态：空闲。
 */
const CARD_STATE_IDLE = 'idle';

/**
 * 卡片状态：导入中。
 */
const CARD_STATE_IMPORTING = 'importing';

/**
 * 卡片状态：已完成。
 */
const CARD_STATE_DONE = 'done';

/**
 * 卡片状态：失败。
 */
const CARD_STATE_FAILED = 'failed';

/**
 * Toast 类型：成功。
 */
const TOAST_TYPE_SUCCESS = 'success';

/**
 * Toast 类型：错误。
 */
const TOAST_TYPE_ERROR = 'error';

/**
 * 推荐理由：覆盖缺口。
 */
const REASON_COVERAGE_GAP = 'coverage_gap';

/**
 * 推荐理由：深度补充。
 */
const REASON_DEPTH = 'depth';

/**
 * 推荐理由默认值：卡片关联。
 */
const REASON_CARD_LINKED = 'card_linked';

/**
 * localStorage 标记值：折叠。
 */
const LOCAL_STORAGE_COLLAPSED_FLAG = '1';

/**
 * localStorage 标记值：展开。
 */
const LOCAL_STORAGE_EXPANDED_FLAG = '0';

/**
 * 滚动加载 rootMargin。
 */
const SCROLL_ROOT_MARGIN = '240px';

/**
 * 微信读书 Web 端域名。
 */
const WEREAD_WEB_ORIGIN = 'https://weread.qq.com';

/**
 * 微信读书 Web 端阅读器路径前缀。
 */
const WEREAD_WEB_READER_PATH = '/web/reader/';

/**
 * 微信读书 Web 端搜索路径前缀。
 */
const WEREAD_WEB_SEARCH_PATH = '/#search/';

/**
 * 微信读书设置接口路径。
 */
const WEREAD_SETTINGS_PATH = '/api/weread/settings';

/**
 * 微信读书书架元数据接口路径。
 */
const WEREAD_META_PATH = '/api/weread/meta';

/**
 * 微信读书同步接口路径。
 */
const WEREAD_SYNC_PATH = '/api/weread/sync';

/**
 * 微信读书统计接口路径。
 */
const WEREAD_STATS_PATH = '/api/weread/stats';

/**
 * 反虚荣门禁评估接口路径（NS-4）。
 */
const STATISTICS_GATE_EVALUATE_PATH = '/api/statistics/evaluate-gate';

/**
 * 反虚荣门禁本地覆盖存储键前缀（NS-4）。
 */
const STATISTICS_GATE_STORAGE_PREFIX = 'weread.stats.gate.';

/**
 * 四象限请求接口路径（NS-1）。
 */
const STATISTICS_QUADRANT_PATH = '/api/statistics/quadrant';

/**
 * 主题演变谱查询路径（NS-2）：POST 提交划线文本，返回聚类堆叠面积图数据。
 */
const TOPIC_SPECTRUM_PATH = '/api/statistics/topic-spectrum';

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

/**
 * 数据账本降级评估查询路径（NS-6）：返回当前各派生指标的降级状态。
 */
const DATA_ACCOUNT_ASSESSMENTS_PATH = '/api/data-account/assessments';

/**
 * 数据账本单项切换路径（NS-6）：开启/关闭某个原始采集维度。
 */
const DATA_ACCOUNT_TOGGLE_PATH = '/api/data-account/toggle';

/**
 * 降级行为枚举（NS-6）：与 shared DEGRADE_BEHAVIOR_VALUES 对齐。
 */
const DEGRADE_BEHAVIOR_VALUES = ['normal', 'degraded', 'hidden'];

/**
 * 真读过置信度查询路径前缀（NS-3）。
 */
const TRULY_READ_PATH_PREFIX = '/api/truly-read';

/**
 * 真读过轻校验提交路径后缀（NS-3）。
 */
const TRULY_READ_VERIFY_SUFFIX = '/verify';

/**
 * 微信读书导入接口路径。
 */
const WEREAD_IMPORT_PATH = '/api/weread/import';

/**
 * 微信读书预览接口路径。
 */
const WEREAD_PREVIEW_PATH = '/api/weread/preview';

/**
 * 微信读书推荐接口路径。
 */
const WEREAD_RECOMMENDATIONS_PATH = '/api/weread/recommendations';

/**
 * 数据账本查询路径（NS-4 / NS-7）。
 */
const DATA_ACCOUNT_SETTINGS_PATH = '/api/settings/data-account';

/**
 * 极简模式切换路径（NS-4 / NS-7）。
 */
const MINIMAL_MODE_PATH = '/api/settings/minimal-mode';

/**
 * 轻校验取题路径（NS-7）。
 */
const VERIFICATION_QUESTIONS_PATH = '/api/verification/questions';

/**
 * 轻校验提交路径（NS-7）。
 */
const VERIFICATION_SUBMIT_PATH = '/api/verification/submit';

/**
 * 轻校验覆盖状态查询路径前缀（NS-7）。
 */
const VERIFICATION_COVERAGE_PATH_PREFIX = '/api/verification/coverage';

export {
  TAB_BOOKS,
  TAB_ALBUMS,
  TAB_ARCHIVE,
  TAB_REVIEW,
  TAB_STATS,
  TAB_RECOMMEND,
  SORT_RECENT,
  SORT_TITLE,
  SORT_AUTHOR,
  VIEW_GRID,
  VIEW_LIST,
  FILTER_ALL,
  FILTER_FINISHED,
  FILTER_READING,
  FILTER_IMPORTED,
  PREVIEW_TYPE_ALL,
  PREVIEW_TYPE_BOOKMARK,
  PREVIEW_TYPE_REVIEW,
  PREVIEW_MODE_SINGLE,
  PREVIEW_MODE_BATCH,
  INITIAL_PAGE_SIZE,
  PAGE_INCREMENT,
  SEARCH_DEBOUNCE_MS,
  SKELETON_COUNT,
  TOAST_AUTODISMISS_MS,
  CATEGORY_FACET_LIMIT,
  CATEGORY_CHART_LIMIT,
  YEAR_CHART_MAX_BARS,
  YEAR_BAR_MIN_HEIGHT_PX,
  YEAR_BAR_MAX_HEIGHT_PX,
  MONTH_CHART_MAX_BARS,
  MONTH_BAR_MIN_HEIGHT_PX,
  MONTH_BAR_MAX_HEIGHT_PX,
  MS_PER_SECOND,
  PERCENT_BASE,
  STATS_COLLAPSED_KEY,
  MINUTE_SECONDS,
  HOUR_SECONDS,
  DAY_SECONDS,
  MONTH_SECONDS,
  YEAR_SECONDS,
  FINISHED_FLAG,
  CARD_STATE_IDLE,
  CARD_STATE_IMPORTING,
  CARD_STATE_DONE,
  CARD_STATE_FAILED,
  TOAST_TYPE_SUCCESS,
  TOAST_TYPE_ERROR,
  REASON_COVERAGE_GAP,
  REASON_DEPTH,
  REASON_CARD_LINKED,
  LOCAL_STORAGE_COLLAPSED_FLAG,
  LOCAL_STORAGE_EXPANDED_FLAG,
  SCROLL_ROOT_MARGIN,
  WEREAD_WEB_ORIGIN,
  WEREAD_WEB_READER_PATH,
  WEREAD_WEB_SEARCH_PATH,
  WEREAD_SETTINGS_PATH,
  WEREAD_META_PATH,
  WEREAD_SYNC_PATH,
  WEREAD_STATS_PATH,
  STATISTICS_GATE_EVALUATE_PATH,
  STATISTICS_GATE_STORAGE_PREFIX,
  STATISTICS_QUADRANT_PATH,
  TOPIC_SPECTRUM_PATH,
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
  DATA_ACCOUNT_ASSESSMENTS_PATH,
  DATA_ACCOUNT_TOGGLE_PATH,
  DEGRADE_BEHAVIOR_VALUES,
  TRULY_READ_PATH_PREFIX,
  TRULY_READ_VERIFY_SUFFIX,
  WEREAD_IMPORT_PATH,
  WEREAD_PREVIEW_PATH,
  WEREAD_RECOMMENDATIONS_PATH,
  DATA_ACCOUNT_SETTINGS_PATH,
  MINIMAL_MODE_PATH,
  VERIFICATION_QUESTIONS_PATH,
  VERIFICATION_SUBMIT_PATH,
  VERIFICATION_COVERAGE_PATH_PREFIX,
};
