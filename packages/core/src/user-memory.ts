/**
 * 用户记忆纯逻辑层。
 *
 * 承载 user_memory 表的过滤与查询逻辑，避免 core/index.ts 继续膨胀。
 * 参照 agent-usage.ts / memory.ts 的拆分模式。
 *
 * @module core/user-memory
 * @author fxbin
 */

import type {
  UserMemory,
  UserMemoryScope,
  UserMemorySource,
  CreateUserMemoryRequest,
  UpdateUserMemoryRequest,
} from '@zhijing/shared';

/**
 * 用户记忆查询条件。
 *
 * @author fxbin
 */
export interface UserMemoryQuery {
  scope?: UserMemoryScope;
  source?: UserMemorySource;
  workspaceId?: string;
  key?: string;
  limit?: number;
}

/**
 * 用户记忆 Repository 接口。
 *
 * @author fxbin
 */
export interface UserMemoryRepository {
  insertUserMemory(record: UserMemory): void;
  updateUserMemory(id: string, patch: UpdateUserMemoryRequest): UserMemory | undefined;
  deleteUserMemory(id: string): boolean;
  findUserMemory(id: string): UserMemory | undefined;
  listUserMemory(query: UserMemoryQuery): UserMemory[];
}

/**
 * 默认查询上限。
 */
const DEFAULT_QUERY_LIMIT = 200;

/**
 * 构建用户记忆过滤函数（纯逻辑，无副作用）。
 *
 * @param query - 查询条件
 * @returns 过滤函数
 * @author fxbin
 */
export function buildUserMemoryFilter(query: UserMemoryQuery): (record: UserMemory) => boolean {
  return (record) => {
    if (query.scope !== undefined && record.scope !== query.scope) return false;
    if (query.source !== undefined && record.source !== query.source) return false;
    if (query.key !== undefined && record.key !== query.key) return false;
    if (query.workspaceId !== undefined) {
      if (query.workspaceId === 'global') {
        if (record.workspaceId !== undefined && record.workspaceId !== null) return false;
      } else if (record.workspaceId !== query.workspaceId) {
        return false;
      }
    }
    return true;
  };
}

/**
 * 应用查询限制（纯逻辑）。
 *
 * @param records - 已过滤的记录数组
 * @param query - 查询条件
 * @returns 截取后的记录数组
 * @author fxbin
 */
export function applyUserMemoryLimit(records: UserMemory[], query: UserMemoryQuery): UserMemory[] {
  const limit = query.limit ?? DEFAULT_QUERY_LIMIT;
  return records.slice(0, limit);
}

/**
 * 校验创建用户记忆请求的必填字段（纯逻辑）。
 *
 * @param request - 创建请求
 * @returns 错误信息；通过返回 undefined
 * @author fxbin
 */
export function validateCreateUserMemoryRequest(request: CreateUserMemoryRequest): string | undefined {
  if (!request.key || request.key.trim().length === 0) {
    return 'key is required';
  }
  if (!request.value || request.value.trim().length === 0) {
    return 'value is required';
  }
  return undefined;
}

export { DEFAULT_QUERY_LIMIT };
