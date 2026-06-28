/**
 * 数据可携契约（NS-8）。
 *
 * 负责将用户的统计数据画像打包为可携带格式（JSON / Markdown），
 * 附带数据说明书（算法版本 + 信号源 + 派生指标 + 数据账本计数），
 * 并提供 30 天撤回窗口的截止时间计算。
 *
 * 与 D3 ExportRecord 的边界：
 * - ExportRecord 导出知识库内容（卡片、产物、资料文件）；
 * - DataPortabilityRecord 导出统计数据画像（信号 + 派生指标 + 算法版本 + 说明书）。
 * 二者语义不同，独立持久化，避免污染。
 *
 * @module statistics/data-export
 * @author fxbin
 */

import type {
  DataAccountEntry,
  DataPortabilityAlgorithmVersion,
  DataPortabilityFormat,
  DataPortabilityManifest,
} from '@zhijing/shared';

/**
 * 撤回窗口时长（毫秒）：30 天。
 * 窗口期内用户可标记撤回，超期后记录转为终态。
 */
export const DATA_PORTABILITY_REVOKE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * 算法版本清单：向用户声明本系统产出了哪些派生指标、各自版本。
 * 与 statistics 各模块实现对齐，新增派生指标时在此登记。
 */
export const DATA_PORTABILITY_ALGORITHM_VERSIONS: readonly DataPortabilityAlgorithmVersion[] = [
  { name: 'truly_read_score', version: 'v1' },
  { name: 'quadrant', version: 'v1' },
  { name: 'topic_spectrum', version: 'tfidf-v1' },
  { name: 'reading_health', version: 'v1' },
  { name: 'verification_bank', version: 'sm2-lite' },
];

/**
 * 计算导出记录的撤回截止时间戳。
 *
 * @param createdAt 创建时间戳（毫秒）
 * @returns 撤回截止时间戳（毫秒）
 */
export function computeRevokeDeadline(createdAt: number): number {
  return createdAt + DATA_PORTABILITY_REVOKE_WINDOW_MS;
}

/**
 * 判断导出记录是否仍可撤回。
 * 同时满足：未超过截止时间、未被撤回过。
 *
 * @param revokeDeadline 撤回截止时间戳（毫秒）
 * @param revokedAt 已撤回时间戳（null 表示未撤回）
 * @param now 当前时间戳（毫秒）
 * @returns 是否可撤回
 */
export function isRevocable(
  revokeDeadline: number,
  revokedAt: number | null,
  now: number,
): boolean {
  return revokedAt === null && now < revokeDeadline;
}

/**
 * 构建数据说明书。
 * 从数据账本条目提取信号源 key，配合算法版本清单与派生指标清单。
 *
 * @param params 入参
 * @param params.dataAccountEntries 数据账本条目（信号源）
 * @param params.derivedMetricKeys 派生指标 key 列表（对应 degrade-matrix）
 * @param params.bookCount 微信读书书籍总数
 * @param params.now 当前时间戳（毫秒）
 * @returns 数据说明书
 */
export function buildDataPortabilityManifest(params: {
  dataAccountEntries: readonly DataAccountEntry[];
  derivedMetricKeys: readonly string[];
  bookCount: number;
  now: number;
}): DataPortabilityManifest {
  const { dataAccountEntries, derivedMetricKeys, bookCount, now } = params;
  return {
    generatedAt: now,
    algorithmVersions: [...DATA_PORTABILITY_ALGORITHM_VERSIONS],
    signalSources: dataAccountEntries.map((entry) => entry.key),
    derivedMetrics: [...derivedMetricKeys],
    dataAccountEntries: dataAccountEntries.length,
    bookCount,
  };
}

/**
 * 将统计数据画像序列化为 JSON 字符串。
 *
 * @param manifest 数据说明书
 * @param payload 统计数据负载（由调用方组装）
 * @returns JSON 字符串
 */
export function buildPortabilityJson(
  manifest: DataPortabilityManifest,
  payload: Record<string, unknown>,
): string {
  return JSON.stringify({ manifest, payload }, null, 2);
}

/**
 * 将统计数据画像序列化为 Markdown 字符串（人类可读说明书）。
 *
 * @param manifest 数据说明书
 * @param payload 统计数据负载（由调用方组装）
 * @returns Markdown 字符串
 */
export function buildPortabilityMarkdown(
  manifest: DataPortabilityManifest,
  payload: Record<string, unknown>,
): string {
  const lines: string[] = [];
  lines.push('# 知径 · 统计数据画像导出');
  lines.push('');
  lines.push(`> 生成时间：${new Date(manifest.generatedAt).toISOString()}`);
  lines.push('');
  lines.push('## 算法版本');
  for (const algo of manifest.algorithmVersions) {
    lines.push(`- **${algo.name}**：${algo.version}`);
  }
  lines.push('');
  lines.push('## 原始信号源');
  for (const src of manifest.signalSources) {
    lines.push(`- ${src}`);
  }
  lines.push('');
  lines.push('## 派生指标');
  for (const metric of manifest.derivedMetrics) {
    lines.push(`- ${metric}`);
  }
  lines.push('');
  lines.push(`数据账本条目：${manifest.dataAccountEntries}`);
  lines.push(`微信读书书籍：${manifest.bookCount}`);
  lines.push('');
  lines.push('## 数据负载');
  lines.push('```json');
  lines.push(JSON.stringify(payload, null, 2));
  lines.push('```');
  return lines.join('\n');
}

/**
 * 按格式选择序列化器，返回最终内容字符串。
 *
 * @param format 导出格式
 * @param manifest 数据说明书
 * @param payload 统计数据负载
 * @returns 序列化后的字符串
 */
export function serializePortability(
  format: DataPortabilityFormat,
  manifest: DataPortabilityManifest,
  payload: Record<string, unknown>,
): string {
  return format === 'json'
    ? buildPortabilityJson(manifest, payload)
    : buildPortabilityMarkdown(manifest, payload);
}
