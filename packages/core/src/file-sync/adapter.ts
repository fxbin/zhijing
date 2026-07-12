/**
 * 文件同步适配器。
 *
 * 提供从 Markdown vault 扫描重建 SQLite 派生索引的能力。
 * 所有方法均为静态方法，无状态。
 *
 * 核心铁律：文件是真相，SQLite 可重建。删掉 SQLite 后可从 Markdown 文件完整重建。
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
} from '@zhijing/shared';
import { MarkdownFileAdapter } from '../markdown-file.js';
import { EMPTY_STRING } from '../common/constants.js';
import {
  CARDS_DIR_NAME,
  MATERIALS_DIR_NAME,
  ZHIDING_DIR_NAME,
  KNOWLEDGE_BASE_FILE_NAME,
  DEFAULT_KB_STAGE,
  DEFAULT_SOURCED_RATIO,
  DEFAULT_RECALL_EASE,
  DEFAULT_RECALL_INTERVAL,
  DEFAULT_RECALL_DUE_AT,
  SOURCED_CLAIM_STATUS,
} from './constants.js';
import { atomicWriteFile } from './atomic-write.js';
import type {
  FileSyncRepository,
  ExportRepository,
  ScannedWorkspace,
  ScanVaultResult,
  ExportVaultResult,
} from './types.js';
import {
  extractTitleAndContent,
  isHidden,
  normalizeMaterialType,
  normalizeCardType,
  normalizeClaimStatus,
  normalizeParseStatus,
  normalizeKbStage,
  readMarkdownFiles,
  uniqueFileName,
} from './normalizers.js';

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
      await atomicWriteFile(path.join(kbDirPath, KNOWLEDGE_BASE_FILE_NAME), kbContent);
      totalFiles += 1;

      const usedNames = new Set<string>();

      const materials = repository.listMaterials(kb.id);
      if (materials.length > 0) {
        const materialsDir = path.join(kbDirPath, MATERIALS_DIR_NAME);
        await fs.mkdir(materialsDir, { recursive: true });
        for (const material of materials) {
          const fileName = uniqueFileName(material.type, material.title, usedNames);
          const content = MarkdownFileAdapter.serializeMaterial(material);
          await atomicWriteFile(path.join(materialsDir, fileName), content);
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
          await atomicWriteFile(path.join(cardsDir, fileName), content);
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
