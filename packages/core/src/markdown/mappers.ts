/**
 * Markdown frontmatter 与领域实体之间的双向映射器。
 *
 * 负责将 parser 解析出的普通对象转换为强类型 frontmatter 结构（卡片 / 资料 / 知识库），
 * 对缺失的必填字段回退为空字符串，对可选字段仅在存在时赋值，保证解析鲁棒性。
 *
 * @author fxbin
 */

import { EMPTY_STRING } from '../common/constants.js';
import type { CardFrontmatter, MaterialFrontmatter, WorkspaceFrontmatter } from './types.js';

/**
 * 将解析后的普通对象映射为 CardFrontmatter。
 *
 * 对缺失的必填字段回退为空字符串，对可选字段仅在存在时赋值。
 *
 * @param parsed 解析后的普通对象
 * @returns 卡片 frontmatter
 * @author fxbin
 */
export function mapToCardFrontmatter(parsed: Record<string, unknown>): CardFrontmatter {
  const frontmatter: CardFrontmatter = {
    id: String(parsed.id ?? EMPTY_STRING),
    type: String(parsed.type ?? EMPTY_STRING),
    claimStatus: String(parsed.claimStatus ?? EMPTY_STRING),
    workspaceId: String(parsed.workspaceId ?? EMPTY_STRING),
    createdAt: String(parsed.createdAt ?? EMPTY_STRING),
    updatedAt: String(parsed.updatedAt ?? EMPTY_STRING),
  };
  if (parsed.materialId !== undefined && parsed.materialId !== null) {
    frontmatter.materialId = String(parsed.materialId);
  }
  if (parsed.recall !== undefined && typeof parsed.recall === 'object' && parsed.recall !== null) {
    const recallRaw = parsed.recall as Record<string, unknown>;
    const recallData: NonNullable<CardFrontmatter['recall']> = {};
    if (recallRaw.ease !== undefined && recallRaw.ease !== null) {
      recallData.ease = Number(recallRaw.ease);
    }
    if (recallRaw.interval !== undefined && recallRaw.interval !== null) {
      recallData.interval = Number(recallRaw.interval);
    }
    if (recallRaw.reps !== undefined && recallRaw.reps !== null) {
      recallData.reps = Number(recallRaw.reps);
    }
    if (recallRaw.dueAt !== undefined && recallRaw.dueAt !== null) {
      recallData.dueAt = String(recallRaw.dueAt);
    }
    frontmatter.recall = recallData;
  }
  if (parsed.tags !== undefined && Array.isArray(parsed.tags)) {
    frontmatter.tags = parsed.tags.map((item) => String(item));
  }
  if (parsed.related !== undefined && Array.isArray(parsed.related)) {
    frontmatter.related = parsed.related.map((item) => String(item));
  }
  if (parsed.archived !== undefined && parsed.archived !== null) {
    frontmatter.archived = Boolean(parsed.archived);
  }
  return frontmatter;
}

/**
 * 将解析后的普通对象映射为 MaterialFrontmatter。
 *
 * 对缺失的必填字段回退为空字符串，对可选字段仅在存在时赋值。
 *
 * @param parsed 解析后的普通对象
 * @returns 资料 frontmatter
 * @author fxbin
 */
export function mapToMaterialFrontmatter(parsed: Record<string, unknown>): MaterialFrontmatter {
  const frontmatter: MaterialFrontmatter = {
    id: String(parsed.id ?? EMPTY_STRING),
    type: String(parsed.type ?? EMPTY_STRING),
    workspaceId: String(parsed.workspaceId ?? EMPTY_STRING),
    parseStatus: String(parsed.parseStatus ?? EMPTY_STRING),
    createdAt: String(parsed.createdAt ?? EMPTY_STRING),
  };
  if (parsed.sourceUrl !== undefined && parsed.sourceUrl !== null) {
    frontmatter.sourceUrl = String(parsed.sourceUrl);
  }
  if (parsed.platform !== undefined && parsed.platform !== null) {
    frontmatter.platform = String(parsed.platform);
  }
  if (parsed.mediaUrls !== undefined && Array.isArray(parsed.mediaUrls)) {
    frontmatter.mediaUrls = parsed.mediaUrls.map((item) => String(item));
  }
  if (parsed.archived !== undefined && parsed.archived !== null) {
    frontmatter.archived = Boolean(parsed.archived);
  }
  return frontmatter;
}

/**
 * 将解析后的普通对象映射为 WorkspaceFrontmatter。
 *
 * 对缺失的必填字段回退为空字符串。
 *
 * @param parsed 解析后的普通对象
 * @returns 知识库 frontmatter
 * @author fxbin
 */
export function mapToWorkspaceFrontmatter(parsed: Record<string, unknown>): WorkspaceFrontmatter {
  return {
    id: String(parsed.id ?? EMPTY_STRING),
    title: String(parsed.title ?? EMPTY_STRING),
    summary: String(parsed.summary ?? EMPTY_STRING),
    stage: String(parsed.stage ?? EMPTY_STRING),
    createdAt: String(parsed.createdAt ?? EMPTY_STRING),
    updatedAt: String(parsed.updatedAt ?? EMPTY_STRING),
  };
}
