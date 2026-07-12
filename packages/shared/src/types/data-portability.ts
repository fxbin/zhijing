/**
 * 数据可携导出类型（NS-8）。
 *
 * 包含导出格式、算法版本记录、数据说明书与导出记录。
 * 与 ExportRecord 的区别：DataPortabilityRecord 导出用户统计数据画像，
 * 而非知识库内容（卡片/产物）。
 *
 * @author fxbin
 */

/**
 * 数据可携导出格式（NS-8）。
 */
export const DATA_PORTABILITY_FORMAT_VALUES = ['json', 'markdown'] as const;
export type DataPortabilityFormat = typeof DATA_PORTABILITY_FORMAT_VALUES[number];

/**
 * 数据可携算法版本记录（NS-8）：向用户声明产出了哪些派生指标、用了什么算法。
 */
export interface DataPortabilityAlgorithmVersion {
  /** 指标/算法名称（如 truly_read_score、topic_spectrum） */
  name: string;
  /** 版本号（如 v1、sm2-lite） */
  version: string;
}

/**
 * 数据可携说明书（NS-8）：随导出数据附带的元信息清单。
 */
export interface DataPortabilityManifest {
  /** 生成时间戳（毫秒） */
  generatedAt: number;
  /** 算法版本清单 */
  algorithmVersions: DataPortabilityAlgorithmVersion[];
  /** 原始信号源 key 列表（对应 DataAccountEntry.key） */
  signalSources: string[];
  /** 派生指标 key 列表（对应 DegradeMatrixEntry.metricKey） */
  derivedMetrics: string[];
  /** 数据账本条目总数 */
  dataAccountEntries: number;
  /** 微信读书书籍总数 */
  bookCount: number;
}

/**
 * 数据可携导出记录（NS-8）：一次导出操作的结果 + 30 天撤回窗口。
 *
 * 与 D3 ExportRecord 的区别：ExportRecord 导出知识库内容（卡片/产物），
 * DataPortabilityRecord 导出用户统计数据画像（信号+派生指标+算法版本+说明书）。
 */
export interface DataPortabilityRecord {
  /** 记录 ID */
  id: string;
  /** 导出格式 */
  format: DataPortabilityFormat;
  /** 数据说明书 */
  manifest: DataPortabilityManifest;
  /** 文件名 */
  filename: string;
  /** 导出内容预览（截断，用于历史列表展示） */
  contentPreview: string;
  /** 创建时间戳（毫秒） */
  createdAt: number;
  /** 撤回截止时间戳（毫秒，createdAt + 30 天） */
  revokeDeadline: number;
  /** 已撤回时间戳（毫秒，null 表示未撤回） */
  revokedAt: number | null;
}
