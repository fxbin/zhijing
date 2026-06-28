/**
 * 数据账本（NS-4 用户数据四权）。
 *
 * 实现圆桌 R3 共识：知情 / 导出 / 删除 / 关闭 四权。
 *
 * 提供数据账本的单项管理：每个原始采集维度（划线 / 笔记 / 重读 / 停留）
 * 可独立设置隐私等级与可导出性。
 *
 * @author fxbin
 */

import type {
  DataAccountBook,
  DataAccountEntry,
  StatisticsPrivacyTier,
} from '@zhijing/shared';

export const DATA_ACCOUNT_DEFAULT_ENTRIES: readonly DataAccountEntry[] = [
  {
    key: 'highlight',
    label: '划线',
    tier: 'private_only',
    dependentMetrics: ['truly_read_score', 'topic_spectrum', 'quadrant'],
    exportable: true,
    updatedAt: '',
  },
  {
    key: 'note',
    label: '笔记',
    tier: 'private_only',
    dependentMetrics: ['truly_read_score', 'topic_spectrum', 'quadrant'],
    exportable: true,
    updatedAt: '',
  },
  {
    key: 'reread',
    label: '重读',
    tier: 'private_only',
    dependentMetrics: ['truly_read_score'],
    exportable: true,
    updatedAt: '',
  },
  {
    key: 'dwell',
    label: '停留时长',
    tier: 'private_only',
    dependentMetrics: ['truly_read_score', 'reading_health'],
    exportable: true,
    updatedAt: '',
  },
];

export function createDefaultDataAccount(now: string): DataAccountBook {
  return {
    entries: DATA_ACCOUNT_DEFAULT_ENTRIES.map((entry) => ({ ...entry, updatedAt: now })),
    minimalMode: false,
    updatedAt: now,
  };
}

export function setEntryTier(
  book: DataAccountBook,
  entryKey: string,
  nextTier: StatisticsPrivacyTier,
  now: string,
): DataAccountBook {
  if (book.minimalMode) {
    throw new Error('全局极简模式下禁止修改单项隐私等级');
  }
  return {
    ...book,
    entries: book.entries.map((entry) =>
      entry.key === entryKey ? { ...entry, tier: nextTier, updatedAt: now } : entry,
    ),
    updatedAt: now,
  };
}

export function setMinimalMode(
  book: DataAccountBook,
  enabled: boolean,
  now: string,
): DataAccountBook {
  return {
    entries: book.entries.map((entry) => ({
      ...entry,
      tier: enabled ? 'disabled' : entry.tier,
      updatedAt: now,
    })),
    minimalMode: enabled,
    updatedAt: now,
  };
}

export function findEntry(
  book: DataAccountBook,
  entryKey: string,
): DataAccountEntry | undefined {
  return book.entries.find((entry) => entry.key === entryKey);
}

export function listActiveEntries(book: DataAccountBook): DataAccountEntry[] {
  return book.entries.filter((entry) => entry.tier !== 'disabled');
}

export function listAffectedMetrics(book: DataAccountBook): string[] {
  const affected = new Set<string>();
  for (const entry of book.entries) {
    if (entry.tier === 'disabled') {
      for (const metric of entry.dependentMetrics) {
        affected.add(metric);
      }
    }
  }
  return Array.from(affected);
}

/**
 * 列出当前被关闭（tier === 'disabled'）的原始维度 key。
 *
 * 降级矩阵（NS-6）以本函数的输出作为输入，评估各派生指标的降级行为。
 */
export function listDisabledDimensions(book: DataAccountBook): string[] {
  return book.entries.filter((entry) => entry.tier === 'disabled').map((entry) => entry.key);
}

/**
 * 切换单项维度的启用状态（NS-6 关闭权的便捷入口）。
 *
 * - enabled=false → tier 设为 'disabled'
 * - enabled=true  → tier 恢复为 'private_only'（默认私有等级）
 *
 * 全局极简模式下禁止操作（与 setEntryTier 一致的纪律）。
 * 若 entryKey 不存在则原样返回 book。
 */
export function toggleEntry(
  book: DataAccountBook,
  entryKey: string,
  enabled: boolean,
  now: string,
): DataAccountBook {
  if (book.minimalMode) {
    throw new Error('全局极简模式下禁止修改单项隐私等级');
  }
  const exists = book.entries.some((entry) => entry.key === entryKey);
  if (!exists) return book;
  const nextTier: StatisticsPrivacyTier = enabled ? 'private_only' : 'disabled';
  return {
    ...book,
    entries: book.entries.map((entry) =>
      entry.key === entryKey ? { ...entry, tier: nextTier, updatedAt: now } : entry,
    ),
    updatedAt: now,
  };
}
