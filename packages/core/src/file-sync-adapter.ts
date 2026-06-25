/**
 * 文件同步适配器（P9-2b）。
 *
 * 负责从 Markdown 文件夹扫描重建 SQLite 派生索引，
 * 验证"文件是真相，SQLite 可重建"的核心铁律。
 *
 * 核心能力：
 *  - scanVault：扫描 vault 文件夹，返回所有知识库及其卡片/资料
 *  - rebuildIndex：从扫描结果重建 Repository 索引（包括 FTS5）
 *
 * 文件夹结构：
 * ```
 * vault/
 * ├── {kb-title}/
 * │   ├── knowledge-base.md
 * │   ├── cards/
 * │   │   └── {type}-{slug}.md
 * │   └── materials/
 * │       └── {type}-{slug}.md
 * └── .zhijing/
 * ```
 *
 * @author fxbin
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import type {
  WorkspaceSummary,
  MaterialRecord,
  KnowledgeCard,
  MaterialType,
  CardType,
  ClaimStatus,
  ParseStatus,
  WorkspaceStage,
} from '@zhijing/shared';
import { MarkdownFileAdapter } from './markdown-file.js';

const CARDS_DIR_NAME = 'cards';
const MATERIALS_DIR_NAME = 'materials';
const ZHIDING_DIR_NAME = '.zhijing';
const FILE_EXTENSION = '.md';
const FILE_NAME_SEPARATOR = '-';
const KNOWLEDGE_BASE_FILE_NAME = 'knowledge-base.md';

const BODY_TITLE_PREFIX = '# ';
const EMPTY_STRING = '';
const NEWLINE = '\n';

const DEFAULT_KB_STAGE: WorkspaceStage = 'ai_skeleton';
const DEFAULT_MATERIAL_TYPE: MaterialType = 'text';
const DEFAULT_CARD_TYPE: CardType = 'concept';
const DEFAULT_CLAIM_STATUS: ClaimStatus = 'ai_skeleton';
const DEFAULT_PARSE_STATUS: ParseStatus = 'ingested';
const DEFAULT_SOURCED_RATIO = 0;
const DEFAULT_RECALL_EASE = 0;
const DEFAULT_RECALL_INTERVAL = 0;
const DEFAULT_RECALL_DUE_AT = EMPTY_STRING;

const SOURCED_CLAIM_STATUS: ClaimStatus = 'sourced';

const FILE_NAME_DUPLICATE_START = 2;

const VALID_MATERIAL_TYPES: readonly string[] = ['link', 'text', 'question', 'topic'];
const VALID_CARD_TYPES: readonly string[] = ['concept', 'method', 'case', 'question', 'step', 'viewpoint'];
const VALID_CLAIM_STATUSES: readonly string[] = ['ai_skeleton', 'sourced', 'user_confirmed', 'unsupported'];
const VALID_PARSE_STATUSES: readonly string[] = ['saved', 'parsing', 'needs_review', 'ingested', 'failed'];
const VALID_KB_STAGES: readonly string[] = ['ai_skeleton', 'organizing', 'grounded'];

/**
 * 文件同步所需的最小 Repository 接口。
 *
 * 从 KnowledgeRepository 中抽取重建索引所需的方法，
 * 遵循接口隔离原则，使 FileSyncAdapter 不依赖完整的 Repository 实现。
 *
 * @author fxbin
 */
export interface FileSyncRepository {
  findWorkspace(id: string): WorkspaceSummary | undefined;
  deleteWorkspace(id: string): void;
  insertWorkspace(base: WorkspaceSummary): void;
  insertMaterial(material: MaterialRecord): void;
  insertCards(cards: KnowledgeCard[]): void;
}

/**
 * 扫描得到的单个知识库及其关联数据。
 *
 * @author fxbin
 */
export interface ScannedWorkspace {
  workspace: WorkspaceSummary;
  materials: MaterialRecord[];
  cards: KnowledgeCard[];
}

/**
 * vault 扫描结果。
 *
 * @author fxbin
 */
export interface ScanVaultResult {
  workspaces: ScannedWorkspace[];
  totalFiles: number;
  skippedFiles: string[];
}

/**
 * 导出所需的最小 Repository 接口。
 *
 * 从 KnowledgeRepository 中抽取导出所需的方法，
 * 遵循接口隔离原则，使 exportToVault 不依赖完整的 Repository 实现。
 *
 * @author fxbin
 */
export interface ExportRepository {
  listWorkspaces(): WorkspaceSummary[];
  listMaterials(workspaceId?: string): MaterialRecord[];
  listCards(workspaceId?: string): KnowledgeCard[];
}

/**
 * vault 导出结果。
 *
 * @author fxbin
 */
export interface ExportVaultResult {
  exportedWorkspaces: number;
  totalFiles: number;
  exportPath: string;
}

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

/**
 * 文件同步适配器。
 *
 * 提供从 Markdown vault 扫描重建 SQLite 派生索引的能力。
 * 所有方法均为静态方法，无状态。
 *
 * 核心铁律：文件是真相，SQLite 可重建。删掉 SQLite 后可从 Markdown 文件完整重建。
 *
 * @author fxbin
 */
export class FileSyncAdapter {
  /**
   * 扫描 vault 文件夹，返回所有知识库及其卡片/资料。
   *
   * 扫描规则：
   *  - vault 根目录下的每个非隐藏子目录视为一个知识库文件夹
   *  - 跳过 .zhijing 派生数据目录
   *  - 每个知识库文件夹可包含 knowledge-base.md（元数据）+ cards/ + materials/
   *  - 若 knowledge-base.md 不存在，从卡片/资料的 frontmatter 推断知识库 ID
   *
   * @param vaultPath vault 根目录路径
   * @returns 扫描结果，包含知识库列表、文件总数、跳过的文件列表
   * @author fxbin
   */
  static async scanVault(vaultPath: string): Promise<ScanVaultResult> {
    const workspaces: ScannedWorkspace[] = [];
    const skippedFiles: string[] = [];
    let totalFiles = 0;

    let entries;
    try {
      entries = await fs.readdir(vaultPath, { withFileTypes: true });
    } catch {
      return { workspaces, totalFiles, skippedFiles };
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      if (isHidden(entry.name)) {
        continue;
      }
      if (entry.name === ZHIDING_DIR_NAME) {
        continue;
      }

      const kbDirPath = path.join(vaultPath, entry.name);
      const scanned = await FileSyncAdapter.scanWorkspace(kbDirPath, entry.name, skippedFiles);
      if (scanned === null) {
        continue;
      }
      totalFiles += scanned.fileCount;
      workspaces.push(scanned.result);
    }

    return { workspaces, totalFiles, skippedFiles };
  }

  /**
   * 扫描单个知识库文件夹。
   *
   * 处理流程：
   *  1. 读取 knowledge-base.md 获取知识库元数据（若存在）
   *  2. 扫描 materials/ 目录，解析每个 .md 文件为 MaterialRecord
   *  3. 扫描 cards/ 目录，解析每个 .md 文件为 KnowledgeCard
   *  4. 若 knowledge-base.md 不存在，从卡片/资料的 frontmatter 推断知识库 ID
   *  5. 计算 sourceCount / cardCount / sourcedRatio 派生数据
   *
   * @param kbDirPath 知识库文件夹路径
   * @param folderName 文件夹名（用于回退标题）
   * @param skippedFiles 跳过的文件列表（用于收集解析失败的文件）
   * @returns 扫描结果与文件数，若知识库 ID 无法确定则返回 null
   * @author fxbin
   */
  private static async scanWorkspace(
    kbDirPath: string,
    folderName: string,
    skippedFiles: string[],
  ): Promise<{ result: ScannedWorkspace; fileCount: number } | null> {
    let fileCount = 0;
    let kbId = EMPTY_STRING;
    let kbTitle = folderName;
    let kbSummary = EMPTY_STRING;
    let kbStage: string = DEFAULT_KB_STAGE;
    const now = new Date().toISOString();
    let kbCreatedAt = now;
    let kbUpdatedAt = now;

    const kbMetaPath = path.join(kbDirPath, KNOWLEDGE_BASE_FILE_NAME);
    try {
      const content = await fs.readFile(kbMetaPath, 'utf8');
      fileCount += 1;
      const { frontmatter } = MarkdownFileAdapter.parseWorkspaceFile(content);
      kbId = frontmatter.id;
      if (frontmatter.title) {
        kbTitle = frontmatter.title;
      }
      kbSummary = frontmatter.summary;
      if (frontmatter.stage) {
        kbStage = frontmatter.stage;
      }
      if (frontmatter.createdAt) {
        kbCreatedAt = frontmatter.createdAt;
      }
      if (frontmatter.updatedAt) {
        kbUpdatedAt = frontmatter.updatedAt;
      }
    } catch {
      // knowledge-base.md 不存在，使用默认值
    }

    const materialsDir = path.join(kbDirPath, MATERIALS_DIR_NAME);
    const materialFiles = await readMarkdownFiles(materialsDir);
    const materials: MaterialRecord[] = [];
    for (const { fileName, content } of materialFiles) {
      try {
        const { frontmatter, body } = MarkdownFileAdapter.parseMaterialFile(content);
        const { title, content: bodyContent } = extractTitleAndContent(body);
        materials.push({
          id: frontmatter.id,
          workspaceId: frontmatter.workspaceId || kbId,
          type: normalizeMaterialType(frontmatter.type),
          rawInput: bodyContent,
          sourceUrl: frontmatter.sourceUrl,
          platform: frontmatter.platform,
          title: title || frontmatter.id,
          contentText: bodyContent,
          mediaUrls: frontmatter.mediaUrls,
          parseStatus: normalizeParseStatus(frontmatter.parseStatus),
          createdAt: frontmatter.createdAt || now,
          archived: frontmatter.archived,
        });
        fileCount += 1;
      } catch {
        skippedFiles.push(path.join(MATERIALS_DIR_NAME, fileName));
      }
    }

    const cardsDir = path.join(kbDirPath, CARDS_DIR_NAME);
    const cardFiles = await readMarkdownFiles(cardsDir);
    const cards: KnowledgeCard[] = [];
    for (const { fileName, content } of cardFiles) {
      try {
        const { frontmatter, body } = MarkdownFileAdapter.parseCardFile(content);
        const { title, content: bodyContent } = extractTitleAndContent(body);
        const recallData = frontmatter.recall
          ? {
              ease: frontmatter.recall.ease ?? DEFAULT_RECALL_EASE,
              interval: frontmatter.recall.interval ?? DEFAULT_RECALL_INTERVAL,
              dueAt: frontmatter.recall.dueAt ?? DEFAULT_RECALL_DUE_AT,
            }
          : undefined;
        cards.push({
          id: frontmatter.id,
          workspaceId: frontmatter.workspaceId || kbId,
          materialId: frontmatter.materialId,
          type: normalizeCardType(frontmatter.type),
          title: title || frontmatter.id,
          body: bodyContent,
          claimStatus: normalizeClaimStatus(frontmatter.claimStatus),
          recall: recallData,
          createdAt: frontmatter.createdAt || now,
          updatedAt: frontmatter.updatedAt || now,
          archived: frontmatter.archived,
        });
        fileCount += 1;
      } catch {
        skippedFiles.push(path.join(CARDS_DIR_NAME, fileName));
      }
    }

    if (!kbId) {
      const firstCard = cards[0];
      const firstMaterial = materials[0];
      kbId = firstCard?.workspaceId || firstMaterial?.workspaceId || EMPTY_STRING;
    }

    if (!kbId) {
      return null;
    }

    for (const card of cards) {
      if (!card.workspaceId) {
        card.workspaceId = kbId;
      }
    }
    for (const material of materials) {
      if (!material.workspaceId) {
        material.workspaceId = kbId;
      }
    }

    const sourceCount = materials.length;
    const cardCount = cards.length;
    const sourcedCount = cards.filter((card) => card.claimStatus === SOURCED_CLAIM_STATUS).length;
    const sourcedRatio = cardCount > 0 ? sourcedCount / cardCount : DEFAULT_SOURCED_RATIO;

    const workspace: WorkspaceSummary = {
      id: kbId,
      title: kbTitle,
      summary: kbSummary,
      stage: normalizeKbStage(kbStage),
      sourceCount,
      cardCount,
      sourcedRatio,
      createdAt: kbCreatedAt,
      updatedAt: kbUpdatedAt,
    };

    return {
      result: { workspace, materials, cards },
      fileCount,
    };
  }

  /**
   * 从 vault 文件夹重建 Repository 索引。
   *
   * 重建逻辑：
   *  - 扫描 vault 文件夹获取所有知识库数据
   *  - 对每个知识库：若 Repository 中已存在同 ID 的知识库，先删除（级联清理关联数据）
   *  - 插入知识库元数据、资料、卡片（包括 FTS5 索引）
   *
   * 本方法是"文件是真相，SQLite 可重建"铁律的直接验证：
   * 删掉 SQLite 后调用此方法，可从 Markdown 文件完整重建所有派生索引。
   *
   * @param vaultPath vault 根目录路径
   * @param repository 文件同步 Repository
   * @returns 扫描结果
   * @author fxbin
   */
  static async rebuildIndex(vaultPath: string, repository: FileSyncRepository): Promise<ScanVaultResult> {
    const result = await FileSyncAdapter.scanVault(vaultPath);
    for (const kb of result.workspaces) {
      const existing = repository.findWorkspace(kb.workspace.id);
      if (existing) {
        repository.deleteWorkspace(kb.workspace.id);
      }
      repository.insertWorkspace(kb.workspace);
      for (const material of kb.materials) {
        repository.insertMaterial(material);
      }
      if (kb.cards.length > 0) {
        repository.insertCards(kb.cards);
      }
    }
    return result;
  }

  /**
   * 将 Repository 中的所有知识库导出为 Markdown vault 文件夹。
   *
   * 导出逻辑：
   *  - 读取 Repository 中所有知识库
   *  - 对每个知识库创建文件夹（以标题 slug 命名）
   *  - 写入 knowledge-base.md（知识库元数据）
   *  - 写入 materials/ 目录下的资料文件
   *  - 写入 cards/ 目录下的卡片文件
   *  - 同名文件自动追加序号后缀（-2、-3...）
   *
   * 导出的 vault 可被 scanVault / rebuildIndex 完整重建，
   * 形成"SQLite → 文件 → SQLite"的闭环验证。
   *
   * @param repository 导出 Repository
   * @param vaultPath 导出目标路径
   * @returns 导出结果
   * @author fxbin
   */
  static async exportToVault(repository: ExportRepository, vaultPath: string): Promise<ExportVaultResult> {
    await fs.mkdir(vaultPath, { recursive: true });
    const workspaces = repository.listWorkspaces();
    let totalFiles = 0;

    for (const kb of workspaces) {
      const kbDirName = MarkdownFileAdapter.titleToSlug(kb.title) || kb.id;
      const kbDirPath = path.join(vaultPath, kbDirName);
      await fs.mkdir(kbDirPath, { recursive: true });

      const kbContent = MarkdownFileAdapter.serializeWorkspace(kb);
      await fs.writeFile(path.join(kbDirPath, KNOWLEDGE_BASE_FILE_NAME), kbContent, 'utf8');
      totalFiles += 1;

      const usedNames = new Set<string>();

      const materials = repository.listMaterials(kb.id);
      if (materials.length > 0) {
        const materialsDir = path.join(kbDirPath, MATERIALS_DIR_NAME);
        await fs.mkdir(materialsDir, { recursive: true });
        for (const material of materials) {
          const fileName = uniqueFileName(material.type, material.title, usedNames);
          const content = MarkdownFileAdapter.serializeMaterial(material);
          await fs.writeFile(path.join(materialsDir, fileName), content, 'utf8');
          totalFiles += 1;
        }
      }

      const cards = repository.listCards(kb.id);
      if (cards.length > 0) {
        const cardsDir = path.join(kbDirPath, CARDS_DIR_NAME);
        await fs.mkdir(cardsDir, { recursive: true });
        for (const card of cards) {
          const fileName = uniqueFileName(card.type, card.title, usedNames);
          const content = MarkdownFileAdapter.serializeCard(card);
          await fs.writeFile(path.join(cardsDir, fileName), content, 'utf8');
          totalFiles += 1;
        }
      }
    }

    return {
      exportedWorkspaces: workspaces.length,
      totalFiles,
      exportPath: vaultPath,
    };
  }
}
