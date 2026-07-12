/**
 * 文件同步规范化工具函数。
 *
 * 提供 frontmatter 字段规范化、标题提取、隐藏文件判断、
 * 目录读取与唯一文件名生成等纯逻辑工具，供 FileSyncAdapter 调用。
 *
 * @author fxbin
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import type {
  MaterialType,
  CardType,
  ClaimStatus,
  ParseStatus,
  WorkspaceStage,
} from '@zhijing/shared';
import { MarkdownFileAdapter } from '../markdown-file.js';
import { FILE_EXTENSION, FILE_NAME_SEPARATOR, BODY_TITLE_PREFIX, EMPTY_STRING, NEWLINE } from '../common/constants.js';
import {
  DEFAULT_MATERIAL_TYPE,
  DEFAULT_CARD_TYPE,
  DEFAULT_CLAIM_STATUS,
  DEFAULT_PARSE_STATUS,
  DEFAULT_KB_STAGE,
  FILE_NAME_DUPLICATE_START,
  VALID_MATERIAL_TYPES,
  VALID_CARD_TYPES,
  VALID_CLAIM_STATUSES,
  VALID_PARSE_STATUSES,
  VALID_KB_STAGES,
} from './constants.js';

/**
 * 从 Markdown 正文（已去除 frontmatter）中提取标题与正文内容。
 *
 * 约定正文第一行为 `# 标题`，其后的内容为正文。
 * 若第一行不是标题格式，则将整段视为正文，标题为空字符串。
 *
 * @param body 已去除 frontmatter 的正文
 * @returns 标题与正文内容
 * @author fxbin
 */
function extractTitleAndContent(body: string): { title: string; content: string } {
  const lines = body.split(/\r?\n/);
  if (lines.length > 0 && lines[0].startsWith(BODY_TITLE_PREFIX)) {
    const title = lines[0].slice(BODY_TITLE_PREFIX.length).trim();
    const content = lines.slice(1).join(NEWLINE).trim();
    return { title, content };
  }
  return { title: EMPTY_STRING, content: body };
}

/**
 * 判断名称是否为隐藏文件/目录（以点号开头）。
 *
 * @param name 文件或目录名
 * @returns 是否隐藏
 * @author fxbin
 */
function isHidden(name: string): boolean {
  return name.startsWith('.');
}

/**
 * 将字符串值规范化为合法的 MaterialType，非法值回退为默认类型。
 *
 * @param type frontmatter 中的 type 字段
 * @returns 合法的 MaterialType
 * @author fxbin
 */
function normalizeMaterialType(type: string): MaterialType {
  return VALID_MATERIAL_TYPES.includes(type) ? (type as MaterialType) : DEFAULT_MATERIAL_TYPE;
}

/**
 * 将字符串值规范化为合法的 CardType，非法值回退为默认类型。
 *
 * @param type frontmatter 中的 type 字段
 * @returns 合法的 CardType
 * @author fxbin
 */
function normalizeCardType(type: string): CardType {
  return VALID_CARD_TYPES.includes(type) ? (type as CardType) : DEFAULT_CARD_TYPE;
}

/**
 * 将字符串值规范化为合法的 ClaimStatus，非法值回退为默认状态。
 *
 * @param status frontmatter 中的 claimStatus 字段
 * @returns 合法的 ClaimStatus
 * @author fxbin
 */
function normalizeClaimStatus(status: string): ClaimStatus {
  return VALID_CLAIM_STATUSES.includes(status) ? (status as ClaimStatus) : DEFAULT_CLAIM_STATUS;
}

/**
 * 将字符串值规范化为合法的 ParseStatus，非法值回退为默认状态。
 *
 * @param status frontmatter 中的 parseStatus 字段
 * @returns 合法的 ParseStatus
 * @author fxbin
 */
function normalizeParseStatus(status: string): ParseStatus {
  return VALID_PARSE_STATUSES.includes(status) ? (status as ParseStatus) : DEFAULT_PARSE_STATUS;
}

/**
 * 将字符串值规范化为合法的 WorkspaceStage，非法值回退为默认阶段。
 *
 * @param stage frontmatter 中的 stage 字段
 * @returns 合法的 WorkspaceStage
 * @author fxbin
 */
function normalizeKbStage(stage: string): WorkspaceStage {
  return VALID_KB_STAGES.includes(stage) ? (stage as WorkspaceStage) : DEFAULT_KB_STAGE;
}

/**
 * 读取目录下所有 Markdown 文件的内容。
 *
 * 若目录不存在或读取失败，返回空数组。
 *
 * @param dirPath 目录路径
 * @returns 文件名与内容的数组
 * @author fxbin
 */
async function readMarkdownFiles(dirPath: string): Promise<Array<{ fileName: string; content: string }>> {
  let entries;
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }
  const files: Array<{ fileName: string; content: string }> = [];
  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    if (!entry.name.endsWith(FILE_EXTENSION)) {
      continue;
    }
    const fullPath = path.join(dirPath, entry.name);
    try {
      const content = await fs.readFile(fullPath, 'utf8');
      files.push({ fileName: entry.name, content });
    } catch {
      // 跳过无法读取的文件
    }
  }
  return files;
}

/**
 * 生成唯一的 Markdown 文件名，处理同名冲突。
 *
 * 若基础文件名未被使用，直接返回；否则在扩展名前追加序号后缀（-2、-3...）。
 *
 * @param type 实体类型（如 card / material）
 * @param title 标题
 * @param usedNames 已使用的文件名集合（会被更新）
 * @returns 唯一的文件名
 * @author fxbin
 */
function uniqueFileName(type: string, title: string, usedNames: Set<string>): string {
  const base = MarkdownFileAdapter.generateFileName(type, title);
  if (!usedNames.has(base)) {
    usedNames.add(base);
    return base;
  }
  const baseWithoutExt = base.slice(0, -FILE_EXTENSION.length);
  let counter = FILE_NAME_DUPLICATE_START;
  let candidate = `${baseWithoutExt}${FILE_NAME_SEPARATOR}${counter}${FILE_EXTENSION}`;
  while (usedNames.has(candidate)) {
    counter += 1;
    candidate = `${baseWithoutExt}${FILE_NAME_SEPARATOR}${counter}${FILE_EXTENSION}`;
  }
  usedNames.add(candidate);
  return candidate;
}

export {
  extractTitleAndContent,
  isHidden,
  normalizeMaterialType,
  normalizeCardType,
  normalizeClaimStatus,
  normalizeParseStatus,
  normalizeKbStage,
  readMarkdownFiles,
  uniqueFileName,
};
