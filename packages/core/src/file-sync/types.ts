/**
 * 文件同步模块接口类型。
 *
 * 从 KnowledgeRepository 中抽取文件同步与导出所需的最小接口，
 * 遵循接口隔离原则，使 FileSyncAdapter 不依赖完整的 Repository 实现。
 *
 * @author fxbin
 */

import type {
  WorkspaceSummary,
  MaterialRecord,
  KnowledgeCard,
} from '@zhijing/shared';

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
