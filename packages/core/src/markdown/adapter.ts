/**
 * Markdown 文件适配器。
 *
 * 提供卡片 / 资料 / 知识库与 Markdown 文件内容之间的双向转换能力，
 * 以及文件名与 slug 生成工具方法。所有方法均为静态方法，无状态。
 *
 * 本模块只做字符串层面的组装与拆分，不涉及任何文件系统 I/O。
 *
 * @author fxbin
 */

import type { KnowledgeCard, MaterialRecord, WorkspaceSummary } from '@zhijing/shared';
import {
  FILE_EXTENSION,
  FILE_NAME_SEPARATOR,
  BODY_TITLE_PREFIX,
  EMPTY_STRING,
  NEWLINE,
} from '../common/constants.js';
import {
  FRONTMATTER_DELIMITER,
  DOUBLE_NEWLINE,
  SLUG_MAX_LENGTH,
  SLUG_REPLACE_CHAR,
  SLUG_SPECIAL_CHARS_PATTERN,
  SLUG_WHITESPACE_PATTERN,
  SLUG_TRIM_DASHES_PATTERN,
} from './constants.js';
import type { CardFrontmatter, MaterialFrontmatter, WorkspaceFrontmatter } from './types.js';
import { extractFrontmatter, parseFrontmatter } from './parser.js';
import { serializeFrontmatter } from './serializer.js';
import {
  mapToCardFrontmatter,
  mapToMaterialFrontmatter,
  mapToWorkspaceFrontmatter,
} from './mappers.js';

/**
 * Markdown 文件适配器。
 *
 * 提供卡片 / 资料与 Markdown 文件内容之间的双向转换能力，
 * 以及文件名与 slug 生成工具方法。所有方法均为静态方法，无状态。
 *
 * @author fxbin
 */
export class MarkdownFileAdapter {
  /**
   * 将卡片序列化为 Markdown 文件内容。
   *
   * 输出格式：
   * ```
   * ---
   * id: ...
   * type: ...
   * ...
   * ---
   *
   * # 卡片标题
   *
   * 卡片正文
   * ```
   *
   * @param card 知径卡片对象
   * @returns Markdown 文件完整内容
   * @author fxbin
   */
  static serializeCard(card: KnowledgeCard): string {
    const frontmatter: CardFrontmatter = {
      id: card.id,
      type: card.type,
      claimStatus: card.claimStatus,
      workspaceId: card.workspaceId,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
    };
    if (card.materialId !== undefined) {
      frontmatter.materialId = card.materialId;
    }
    if (card.recall !== undefined) {
      const recallData: NonNullable<CardFrontmatter['recall']> = {
        ease: card.recall.ease,
        interval: card.recall.interval,
        dueAt: card.recall.dueAt,
      };
      frontmatter.recall = recallData;
    }
    if (card.archived !== undefined) {
      frontmatter.archived = card.archived;
    }
    const frontmatterObj = frontmatter as unknown as Record<string, unknown>;
    const fmStr = serializeFrontmatter(frontmatterObj);
    const body = `${BODY_TITLE_PREFIX}${card.title}${DOUBLE_NEWLINE}${card.body}`;
    return `${FRONTMATTER_DELIMITER}${NEWLINE}${fmStr}${NEWLINE}${FRONTMATTER_DELIMITER}${DOUBLE_NEWLINE}${body}${NEWLINE}`;
  }

  /**
   * 将资料序列化为 Markdown 文件内容。
   *
   * 输出格式：
   * ```
   * ---
   * id: ...
   * type: ...
   * ...
   * ---
   *
   * # 资料标题
   *
   * 资料正文（contentText 或 rawInput）
   * ```
   *
   * @param material 知径资料对象
   * @returns Markdown 文件完整内容
   * @author fxbin
   */
  static serializeMaterial(material: MaterialRecord): string {
    const frontmatter: MaterialFrontmatter = {
      id: material.id,
      type: material.type,
      workspaceId: material.workspaceId,
      parseStatus: material.parseStatus,
      createdAt: material.createdAt,
    };
    if (material.sourceUrl !== undefined) {
      frontmatter.sourceUrl = material.sourceUrl;
    }
    if (material.platform !== undefined) {
      frontmatter.platform = material.platform;
    }
    if (material.mediaUrls !== undefined && material.mediaUrls.length > 0) {
      frontmatter.mediaUrls = material.mediaUrls;
    }
    if (material.archived !== undefined) {
      frontmatter.archived = material.archived;
    }
    const frontmatterObj = frontmatter as unknown as Record<string, unknown>;
    const fmStr = serializeFrontmatter(frontmatterObj);
    const bodyContent = material.contentText ?? material.rawInput;
    const body = `${BODY_TITLE_PREFIX}${material.title}${DOUBLE_NEWLINE}${bodyContent}`;
    return `${FRONTMATTER_DELIMITER}${NEWLINE}${fmStr}${NEWLINE}${FRONTMATTER_DELIMITER}${DOUBLE_NEWLINE}${body}${NEWLINE}`;
  }

  /**
   * 从 Markdown 文件内容解析出卡片元数据和正文。
   *
   * @param content Markdown 文件完整内容
   * @returns frontmatter 元数据与正文（正文已 trim）
   * @author fxbin
   */
  static parseCardFile(content: string): { frontmatter: CardFrontmatter; body: string } {
    const { rawFrontmatter, body } = extractFrontmatter(content);
    const parsed = parseFrontmatter(rawFrontmatter);
    const frontmatter = mapToCardFrontmatter(parsed);
    return { frontmatter, body: body.trim() };
  }

  /**
   * 从 Markdown 文件内容解析出资料元数据和正文。
   *
   * @param content Markdown 文件完整内容
   * @returns frontmatter 元数据与正文（正文已 trim）
   * @author fxbin
   */
  static parseMaterialFile(content: string): { frontmatter: MaterialFrontmatter; body: string } {
    const { rawFrontmatter, body } = extractFrontmatter(content);
    const parsed = parseFrontmatter(rawFrontmatter);
    const frontmatter = mapToMaterialFrontmatter(parsed);
    return { frontmatter, body: body.trim() };
  }

  /**
   * 将知识库元数据序列化为 Markdown 文件内容。
   *
   * 输出格式：
   * ```
   * ---
   * id: ...
   * title: ...
   * summary: ...
   * stage: ...
   * createdAt: ...
   * updatedAt: ...
   * ---
   *
   * # 知识库标题
   *
   * 知识库摘要正文（可选）
   * ```
   *
   * sourceCount / cardCount / sourcedRatio 为派生数据，不持久化到文件。
   *
   * @param base 知识库摘要对象
   * @returns Markdown 文件完整内容
   * @author fxbin
   */
  static serializeWorkspace(base: WorkspaceSummary): string {
    const frontmatter: WorkspaceFrontmatter = {
      id: base.id,
      title: base.title,
      summary: base.summary,
      stage: base.stage,
      createdAt: base.createdAt,
      updatedAt: base.updatedAt,
    };
    const frontmatterObj = frontmatter as unknown as Record<string, unknown>;
    const fmStr = serializeFrontmatter(frontmatterObj);
    const body = `${BODY_TITLE_PREFIX}${base.title}${DOUBLE_NEWLINE}${base.summary}`;
    return `${FRONTMATTER_DELIMITER}${NEWLINE}${fmStr}${NEWLINE}${FRONTMATTER_DELIMITER}${DOUBLE_NEWLINE}${body}${NEWLINE}`;
  }

  /**
   * 从 Markdown 文件内容解析出知识库元数据。
   *
   * @param content Markdown 文件完整内容
   * @returns 知识库 frontmatter 元数据
   * @author fxbin
   */
  static parseWorkspaceFile(content: string): { frontmatter: WorkspaceFrontmatter; body: string } {
    const { rawFrontmatter, body } = extractFrontmatter(content);
    const parsed = parseFrontmatter(rawFrontmatter);
    const frontmatter = mapToWorkspaceFrontmatter(parsed);
    return { frontmatter, body: body.trim() };
  }

  /**
   * 生成文件名（type-title-slug.md）。
   *
   * @param type 实体类型（如 card / material）
   * @param title 标题
   * @returns 文件名，形如 `concept-机器学习.md`
   * @author fxbin
   */
  static generateFileName(type: string, title: string): string {
    const slug = MarkdownFileAdapter.titleToSlug(title);
    return `${type}${FILE_NAME_SEPARATOR}${slug}${FILE_EXTENSION}`;
  }

  /**
   * 将标题转换为 URL 友好的 slug。
   *
   * 转换规则：
   *  - 转小写
   *  - 中文字符保留（Obsidian 支持中文文件名）
   *  - 空格替换为 `-`
   *  - 特殊字符（`/ \ : * ? " < > |`）替换为 `-`
   *  - 截断到 50 字符
   *  - 去除首尾的 `-`
   *
   * @param title 原始标题
   * @returns slug 字符串
   * @author fxbin
   */
  static titleToSlug(title: string): string {
    let slug = title.toLowerCase();
    slug = slug.replace(SLUG_SPECIAL_CHARS_PATTERN, SLUG_REPLACE_CHAR);
    slug = slug.replace(SLUG_WHITESPACE_PATTERN, SLUG_REPLACE_CHAR);
    if (slug.length > SLUG_MAX_LENGTH) {
      slug = slug.slice(0, SLUG_MAX_LENGTH);
    }
    slug = slug.replace(SLUG_TRIM_DASHES_PATTERN, EMPTY_STRING);
    return slug;
  }
}
