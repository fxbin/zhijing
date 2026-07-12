/**
 * 微信读书视图 API 路径与功能域存储键常量。
 * 集中管理后端接口路径、本地存储键前缀以及功能域枚举值，
 * 避免在多文件中重复定义或出现魔法值。
 * @module constants/weread/paths
 * @author fxbin
 */

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
 * 微信读书全量四象限接口路径（NS-8）。
 * 后端使用全量书架（含下架）+ 已刷新 signals 的书计算，
 * 保证展示层与推荐种子、隐性真兴趣 hint 数据源一致。
 */
const WEREAD_QUADRANT_PATH = '/api/weread/quadrant';

/**
 * 主题演变谱查询路径（NS-2）：POST 提交划线文本，返回聚类堆叠面积图数据。
 */
const TOPIC_SPECTRUM_PATH = '/api/statistics/topic-spectrum';

/**
 * 全局主题演变谱查询路径：聚合已导入到知径的微信读书笔记，返回全书架主题聚类数据。
 */
const WEREAD_GLOBAL_TOPIC_SPECTRUM_PATH = '/api/weread/topic-spectrum/global';

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
 * 微信读书批量信号刷新接口路径。
 */
const WEREAD_SIGNALS_REFRESH_PATH = '/api/weread/signals/refresh';

/**
 * 微信读书推荐接口路径。
 */
const WEREAD_RECOMMENDATIONS_PATH = '/api/weread/recommendations';

/**
 * 推荐实验桶本地覆盖存储键（NS-5）：用于灰度期间手动指定 control/treatment。
 */
const RECOMMEND_BUCKET_STORAGE_KEY = 'weread.recommend.bucket';

/**
 * 推荐实验桶可选值（NS-5）：与 shared RECOMMENDATION_BUCKET_VALUES 对齐。
 */
const RECOMMEND_BUCKET_VALUES = ['control', 'treatment'];

/**
 * 推荐实验桶默认值（NS-5）：未命中分流时回落到现有逻辑。
 */
const RECOMMEND_BUCKET_DEFAULT = 'control';

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

/**
 * 隐性真兴趣提示查询路径（NS-8）。
 */
const HIDDEN_INTEREST_HINT_PATH = '/api/weread/hidden-interest/hint';

/**
 * 隐性真兴趣永久关闭切换路径（NS-8）。
 */
const HIDDEN_INTEREST_TOGGLE_PATH = '/api/weread/hidden-interest/toggle';

/**
 * 隐性真兴趣单本忽略路径前缀（NS-8）。
 */
const HIDDEN_INTEREST_DISMISS_PATH_PREFIX = '/api/weread/hidden-interest/dismiss';

/**
 * 隐性真兴趣标记已展示路径（NS-8）。
 */
const HIDDEN_INTEREST_SHOWN_PATH = '/api/weread/hidden-interest/shown';

/**
 * 数据可携导出路径（NS-8）。
 */
const DATA_PORTABILITY_EXPORT_PATH = '/api/weread/data-portability/export';

/**
 * 数据可携导出记录列表路径（NS-8）。
 */
const DATA_PORTABILITY_RECORDS_PATH = '/api/weread/data-portability/records';

/**
 * 数据可携撤回路径前缀（NS-8）。
 */
const DATA_PORTABILITY_REVOKE_PATH_PREFIX = '/api/weread/data-portability/revoke';

/**
 * 阅读模式档案查询路径（NS-8）。
 */
const READER_MODE_PROFILE_PATH = '/api/weread/reader-mode/profile';

/**
 * 阅读模式临时回退路径（NS-8）。
 */
const READER_MODE_ROLLBACK_PATH = '/api/weread/reader-mode/rollback';

/**
 * 阅读模式取消临时回退路径（NS-8）。
 */
const READER_MODE_CANCEL_ROLLBACK_PATH = '/api/weread/reader-mode/cancel-rollback';

export {
  WEREAD_SETTINGS_PATH,
  WEREAD_META_PATH,
  WEREAD_SYNC_PATH,
  WEREAD_STATS_PATH,
  STATISTICS_GATE_EVALUATE_PATH,
  STATISTICS_GATE_STORAGE_PREFIX,
  STATISTICS_QUADRANT_PATH,
  WEREAD_QUADRANT_PATH,
  TOPIC_SPECTRUM_PATH,
  WEREAD_GLOBAL_TOPIC_SPECTRUM_PATH,
  DATA_ACCOUNT_ASSESSMENTS_PATH,
  DATA_ACCOUNT_TOGGLE_PATH,
  DEGRADE_BEHAVIOR_VALUES,
  TRULY_READ_PATH_PREFIX,
  TRULY_READ_VERIFY_SUFFIX,
  WEREAD_IMPORT_PATH,
  WEREAD_PREVIEW_PATH,
  WEREAD_SIGNALS_REFRESH_PATH,
  WEREAD_RECOMMENDATIONS_PATH,
  RECOMMEND_BUCKET_STORAGE_KEY,
  RECOMMEND_BUCKET_VALUES,
  RECOMMEND_BUCKET_DEFAULT,
  DATA_ACCOUNT_SETTINGS_PATH,
  MINIMAL_MODE_PATH,
  VERIFICATION_QUESTIONS_PATH,
  VERIFICATION_SUBMIT_PATH,
  VERIFICATION_COVERAGE_PATH_PREFIX,
  HIDDEN_INTEREST_HINT_PATH,
  HIDDEN_INTEREST_TOGGLE_PATH,
  HIDDEN_INTEREST_DISMISS_PATH_PREFIX,
  HIDDEN_INTEREST_SHOWN_PATH,
  DATA_PORTABILITY_EXPORT_PATH,
  DATA_PORTABILITY_RECORDS_PATH,
  DATA_PORTABILITY_REVOKE_PATH_PREFIX,
  READER_MODE_PROFILE_PATH,
  READER_MODE_ROLLBACK_PATH,
  READER_MODE_CANCEL_ROLLBACK_PATH,
};
