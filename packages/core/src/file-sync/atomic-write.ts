/**
 * 原子写入工具。
 *
 * 提供 POSIX 原子语义的文件写入能力：先落临时文件再 rename 替换目标，
 * 写入中断不会污染原文件，保证 vault 导出的「文件是真相」铁律在崩溃场景下仍然成立。
 *
 * @author fxbin
 */

import { randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

/**
 * 原子写临时文件后缀。
 * 写入时先落临时文件再 rename 替换目标，写入中断不会污染原文件。
 */
const ATOMIC_TEMP_SUFFIX = '.tmp';

/**
 * 临时文件名随机段字节数。
 * 8 字节随机数足够规避并发导出场景下的临时文件同名冲突。
 */
const ATOMIC_TEMP_RANDOM_BYTES = 8;

/**
 * 临时文件名随机段进制。
 */
const ATOMIC_TEMP_RANDOM_ENCODING: BufferEncoding = 'hex';

/**
 * 生成目标文件同目录下的临时文件路径。
 *
 * 命名格式：`{basename}.tmp.{pid}.{randomHex}`。
 * 同目录保证 rename 在同一文件系统上，是 POSIX 原子操作。
 *
 * @param targetPath 目标文件绝对路径
 * @returns 临时文件绝对路径
 * @author fxbin
 */
function buildAtomicTempPath(targetPath: string): string {
  const baseName = path.basename(targetPath);
  const dirName = path.dirname(targetPath);
  const random = randomBytes(ATOMIC_TEMP_RANDOM_BYTES).toString(ATOMIC_TEMP_RANDOM_ENCODING);
  return path.join(dirName, `${baseName}${ATOMIC_TEMP_SUFFIX}.${process.pid}.${random}`);
}

/**
 * 原子写入文件内容。
 *
 * 流程：
 *  1. 在目标文件同目录下生成临时文件
 *  2. 写入临时文件（失败时清理临时文件并抛出原错误）
 *  3. 调用 rename 替换目标文件（POSIX 原子）
 *
 * 这样可避免写入过程中断导致目标文件被截断或丢失原数据，
 * 保证 vault 导出的「文件是真相」铁律在崩溃场景下仍然成立。
 *
 * @param filePath 目标文件路径
 * @param content 文件内容
 * @author fxbin
 */
async function atomicWriteFile(filePath: string, content: string): Promise<void> {
  const tempPath = buildAtomicTempPath(filePath);
  try {
    await fs.writeFile(tempPath, content, 'utf8');
    await fs.rename(tempPath, filePath);
  } catch (error) {
    await fs.unlink(tempPath).catch(() => undefined);
    throw error;
  }
}

export { atomicWriteFile };
