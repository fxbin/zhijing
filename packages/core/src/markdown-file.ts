/**
 * Markdown 文件读写器（P9-2a）。
 *
 * 负责知径卡片 / 资料与 Markdown 文件之间的双向转换：
 *  - 手写轻量级 YAML frontmatter 解析器（不依赖 gray-matter / js-yaml）
 *  - 手写 frontmatter 序列化器
 *  - MarkdownFileAdapter 静态工具类
 *
 * 本模块只做字符串层面的解析与序列化，不涉及任何文件系统 I/O。
 *
 * @author fxbin
 */

import type { KnowledgeCard, MaterialRecord, WorkspaceSummary } from '@zhijing/shared';

const FRONTMATTER_DELIMITER = '---';
const FRONTMATTER_ARRAY_PREFIX = '- ';
const FRONTMATTER_NESTED_INDENT = '  ';
const SLUG_MAX_LENGTH = 50;
const SLUG_REPLACE_CHAR = '-';
const FILE_EXTENSION = '.md';
const WIKILINK_PREFIX = '[[';
const WIKILINK_SUFFIX = ']]';
const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const FILE_NAME_SEPARATOR = '-';
const EMPTY_STRING = '';
const NEWLINE = '\n';
const DOUBLE_NEWLINE = '\n\n';
const BODY_TITLE_PREFIX = '# ';
const BOOLEAN_TRUE = 'true';
const BOOLEAN_FALSE = 'false';
const INTEGER_PATTERN = /^-?\d+$/;
const FLOAT_PATTERN = /^-?\d+\.\d+$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T/;
const SLUG_SPECIAL_CHARS_PATTERN = /[\/\\:*?"<>|]/g;
const SLUG_WHITESPACE_PATTERN = /\s+/g;
const SLUG_TRIM_DASHES_PATTERN = /^-+|-+$/g;
const DOUBLE_QUOTE = '"';
const SINGLE_QUOTE = "'";

/**
 * 卡片 frontmatter 元数据结构。
 *
 * 对应 Markdown 文件中 `---` 之间的 YAML 内容，
 * 是文件格式层面的类型，与应用层 KnowledgeCard 部分字段对应。
 *
 * @author fxbin
 */
export interface CardFrontmatter {
  id: string;
  type: string;
  claimStatus: string;
  workspaceId?: string;
  materialId?: string;
  recall?: {
    ease?: number;
    interval?: number;
    reps?: number;
    dueAt?: string;
  };
  tags?: string[];
  related?: string[];
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
}

/**
 * 资料 frontmatter 元数据结构。
 *
 * 对应 Markdown 文件中 `---` 之间的 YAML 内容，
 * 是文件格式层面的类型，与应用层 MaterialRecord 部分字段对应。
 *
 * @author fxbin
 */
export interface MaterialFrontmatter {
  id: string;
  type: string;
  workspaceId?: string;
  sourceUrl?: string;
  platform?: string;
  parseStatus: string;
  mediaUrls?: string[];
  createdAt: string;
  archived?: boolean;
}

/**
 * 知识库元数据 frontmatter 结构。
 *
 * 对应知识库文件夹根目录下 `knowledge-base.md` 文件的 frontmatter，
 * 存储知识库的不可推断元数据（id、summary、stage 等）。
 * sourceCount / cardCount / sourcedRatio 为派生数据，重建时从文件扫描结果计算，不持久化。
 *
 * @author fxbin
 */
export interface WorkspaceFrontmatter {
  id: string;
  title: string;
  summary: string;
  stage: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 从 Markdown 文件内容中提取 frontmatter 原始文本与正文部分。
 *
 * 若文件不以合法的 frontmatter 起始，则将整段内容视为正文，frontmatter 为空字符串。
 *
 * @param content Markdown 文件完整内容
 * @returns frontmatter 原始文本与正文
 * @author fxbin
 */
function extractFrontmatter(content: string): { rawFrontmatter: string; body: string } {
  const match = content.match(FRONTMATTER_PATTERN);
  if (!match || match[1] === undefined) {
    return { rawFrontmatter: EMPTY_STRING, body: content };
  }
  const rawFrontmatter = match[1];
  const body = content.slice(match[0].length);
  return { rawFrontmatter, body };
}

/**
 * 计算一行的缩进空格数。
 *
 * @param line 单行文本
 * @returns 行首空格数量
 * @author fxbin
 */
function getIndent(line: string): number {
  return line.length - line.trimStart().length;
}

/**
 * 将 frontmatter 中的标量字符串解析为对应的 JavaScript 值。
 *
 * 处理规则：
 *  - 双引号 / 单引号包裹的值去掉外层引号
 *  - `true` / `false` 解析为 boolean
 *  - 纯整数解析为 number
 *  - 浮点数解析为 number
 *  - 其余按原始字符串返回
 *
 * @param valuePart frontmatter 中冒号右侧的原始字符串（已 trim）
 * @returns 解析后的标量值
 * @author fxbin
 */
function parseScalar(valuePart: string): unknown {
  if (valuePart === EMPTY_STRING) {
    return EMPTY_STRING;
  }
  if (
    (valuePart.startsWith(DOUBLE_QUOTE) && valuePart.endsWith(DOUBLE_QUOTE)) ||
    (valuePart.startsWith(SINGLE_QUOTE) && valuePart.endsWith(SINGLE_QUOTE))
  ) {
    return valuePart.slice(1, -1);
  }
  if (valuePart === BOOLEAN_TRUE) {
    return true;
  }
  if (valuePart === BOOLEAN_FALSE) {
    return false;
  }
  if (INTEGER_PATTERN.test(valuePart)) {
    return Number.parseInt(valuePart, 10);
  }
  if (FLOAT_PATTERN.test(valuePart)) {
    return Number.parseFloat(valuePart);
  }
  return valuePart;
}

/**
 * 手写轻量级 YAML frontmatter 解析器。
 *
 * 支持的字段类型：
 *  - string
 *  - number（整数 / 浮点）
 *  - boolean
 *  - string 数组（`- ` 前缀）
 *  - 嵌套对象（2 空格缩进）
 *
 * 采用递归下降方式，按缩进层级判断嵌套关系。
 *
 * @param raw frontmatter `---` 之间的原始文本
 * @returns 解析后的普通对象
 * @author fxbin
 */
function parseFrontmatter(raw: string): Record<string, unknown> {
  const lines = raw.split(/\r?\n/);
  let cursor = 0;

  function parseObject(parentIndent: number): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    while (cursor < lines.length) {
      const line = lines[cursor];
      if (line === undefined) {
        break;
      }
      if (line.trim() === EMPTY_STRING) {
        cursor += 1;
        continue;
      }
      const indent = getIndent(line);
      if (indent <= parentIndent) {
        break;
      }
      const trimmed = line.trim();
      if (trimmed.startsWith(FRONTMATTER_ARRAY_PREFIX)) {
        break;
      }
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx === -1) {
        cursor += 1;
        continue;
      }
      const key = trimmed.slice(0, colonIdx).trim();
      const valuePart = trimmed.slice(colonIdx + 1).trim();
      if (valuePart === EMPTY_STRING) {
        cursor += 1;
        if (cursor < lines.length) {
          const nextLine = lines[cursor];
          if (nextLine !== undefined && nextLine.trim() !== EMPTY_STRING) {
            const nextIndent = getIndent(nextLine);
            const nextTrimmed = nextLine.trim();
            if (nextIndent > indent && nextTrimmed.startsWith(FRONTMATTER_ARRAY_PREFIX)) {
              obj[key] = parseArray(indent);
            } else if (nextIndent > indent) {
              obj[key] = parseObject(indent);
            } else {
              obj[key] = null;
            }
          } else {
            obj[key] = null;
          }
        } else {
          obj[key] = null;
        }
      } else {
        obj[key] = parseScalar(valuePart);
        cursor += 1;
      }
    }
    return obj;
  }

  function parseArray(parentIndent: number): unknown[] {
    const arr: unknown[] = [];
    while (cursor < lines.length) {
      const line = lines[cursor];
      if (line === undefined) {
        break;
      }
      if (line.trim() === EMPTY_STRING) {
        cursor += 1;
        continue;
      }
      const indent = getIndent(line);
      if (indent <= parentIndent) {
        break;
      }
      const trimmed = line.trim();
      if (!trimmed.startsWith(FRONTMATTER_ARRAY_PREFIX)) {
        break;
      }
      const valuePart = trimmed.slice(FRONTMATTER_ARRAY_PREFIX.length).trim();
      if (valuePart === EMPTY_STRING) {
        cursor += 1;
        continue;
      }
      arr.push(parseScalar(valuePart));
      cursor += 1;
    }
    return arr;
  }

  return parseObject(-1);
}

/**
 * 判断字符串值在序列化时是否需要用双引号包裹。
 *
 * 需要引号的场景：
 *  - 空字符串
 *  - 含冒号（会被 YAML 解析为键值分隔）
 *  - wikilink 前缀 `[[`
 *  - 含双引号或单引号
 *  - ISO 日期时间格式
 *
 * @param value 待序列化的字符串
 * @returns 是否需要引号包裹
 * @author fxbin
 */
function needsQuoting(value: string): boolean {
  if (value === EMPTY_STRING) {
    return true;
  }
  if (value.includes(':')) {
    return true;
  }
  if (value.startsWith(WIKILINK_PREFIX)) {
    return true;
  }
  if (value.includes(DOUBLE_QUOTE) || value.includes(SINGLE_QUOTE)) {
    return true;
  }
  if (ISO_DATE_PATTERN.test(value)) {
    return true;
  }
  return false;
}

/**
 * 将标量值序列化为 frontmatter 文本片段。
 *
 * @param value 标量值（string / number / boolean）
 * @returns frontmatter 文本片段
 * @author fxbin
 */
function serializeScalar(value: unknown): string {
  if (typeof value === 'string') {
    if (needsQuoting(value)) {
      return `${DOUBLE_QUOTE}${value}${DOUBLE_QUOTE}`;
    }
    return value;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'boolean') {
    return String(value);
  }
  return String(value);
}

/**
 * 将一个 frontmatter 条目（key + value）序列化并追加到行数组。
 *
 * 递归处理嵌套对象与数组：
 *  - 数组输出 `key:` 后换行，每个元素以 `- ` 前缀缩进输出
 *  - 嵌套对象输出 `key:` 后换行，子属性缩进输出
 *  - null / undefined 跳过不输出
 *
 * @param key 字段名
 * @param value 字段值
 * @param indent 当前缩进层级（0 表示顶层）
 * @param lines 输出行数组
 * @author fxbin
 */
function serializeEntry(key: string, value: unknown, indent: number, lines: string[]): void {
  if (value === null || value === undefined) {
    return;
  }
  const indentStr = FRONTMATTER_NESTED_INDENT.repeat(indent);
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return;
    }
    lines.push(`${indentStr}${key}:`);
    for (const item of value) {
      const childIndent = indentStr + FRONTMATTER_NESTED_INDENT;
      lines.push(`${childIndent}${FRONTMATTER_ARRAY_PREFIX}${serializeScalar(item)}`);
    }
    return;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return;
    }
    lines.push(`${indentStr}${key}:`);
    for (const [childKey, childValue] of entries) {
      serializeEntry(childKey, childValue, indent + 1, lines);
    }
    return;
  }
  lines.push(`${indentStr}${key}: ${serializeScalar(value)}`);
}

/**
 * 将 frontmatter 对象序列化为 YAML 文本。
 *
 * @param data frontmatter 普通对象
 * @returns YAML 文本（不含 `---` 分隔符）
 * @author fxbin
 */
function serializeFrontmatter(data: Record<string, unknown>): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    serializeEntry(key, value, 0, lines);
  }
  return lines.join(NEWLINE);
}

/**
 * 将解析后的普通对象映射为 CardFrontmatter。
 *
 * 对缺失的必填字段回退为空字符串，对可选字段仅在存在时赋值。
 *
 * @param parsed 解析后的普通对象
 * @returns 卡片 frontmatter
 * @author fxbin
 */
function mapToCardFrontmatter(parsed: Record<string, unknown>): CardFrontmatter {
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
function mapToMaterialFrontmatter(parsed: Record<string, unknown>): MaterialFrontmatter {
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
function mapToWorkspaceFrontmatter(parsed: Record<string, unknown>): WorkspaceFrontmatter {
  return {
    id: String(parsed.id ?? EMPTY_STRING),
    title: String(parsed.title ?? EMPTY_STRING),
    summary: String(parsed.summary ?? EMPTY_STRING),
    stage: String(parsed.stage ?? EMPTY_STRING),
    createdAt: String(parsed.createdAt ?? EMPTY_STRING),
    updatedAt: String(parsed.updatedAt ?? EMPTY_STRING),
  };
}

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
