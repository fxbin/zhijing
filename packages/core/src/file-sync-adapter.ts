/**
 * 文件同步适配器 barrel 入口。
 *
 * 本文件仅做物理聚合 re-export，保持对外 API 表面不变。
 * 实际实现拆分至 file-sync/ 子目录：
 *  - constants.ts：共享常量
 *  - atomic-write.ts：原子写入
 *  - types.ts：接口类型
 *  - normalizers.ts：规范化工具函数
 *  - adapter.ts：FileSyncAdapter 类
 *
 * @author fxbin
 */

export { FileSyncAdapter } from './file-sync/adapter.js';
export type {
  FileSyncRepository,
  ExportRepository,
  ScannedWorkspace,
  ScanVaultResult,
  ExportVaultResult,
} from './file-sync/types.js';
