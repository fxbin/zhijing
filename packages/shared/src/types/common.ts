/**
 * 游标分页公共类型。
 *
 * 资料分页游标三元组，被 LibraryView 等列表场景复用。
 * 按 (createdAt DESC, id DESC) 排序。
 *
 * @author fxbin
 */

import type { MaterialType, ParseStatus } from './enums.js';
import type { MaterialRecord } from './material.js';

/**
 * 资料分页游标，按 (createdAt DESC, id DESC) 排序。
 * 用于 LibraryView 等列表场景的 cursor 分页。
 *
 * @author fxbin
 */
export type MaterialCursor = {
  createdAt: string;
  id: string;
};

/**
 * 资料分页查询参数。
 * cursorCreatedAt / cursorId 同时传入才生效；只传一个会被忽略。
 * limit 缺省时由 core 层兜底默认值。
 *
 * @author fxbin
 */
export type MaterialQueryOptions = {
  workspaceId?: string;
  type?: MaterialType;
  parseStatus?: ParseStatus;
  query?: string;
  cursorCreatedAt?: string;
  cursorId?: string;
  limit?: number;
};

/**
 * 资料分页查询结果。
 * nextCursor 为 null 表示无下一页；hasMore 表示是否还有更多数据。
 *
 * @author fxbin
 */
export type MaterialQueryResult = {
  materials: MaterialRecord[];
  nextCursor: MaterialCursor | null;
  hasMore: boolean;
};
