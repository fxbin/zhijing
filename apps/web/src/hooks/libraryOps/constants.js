/**
 * 资料库操作域常量集合。
 *
 * 汇总 useLibraryOperationsState 在收集、导入、批量选择、归属、归档等场景中
 * 用到的全部常量与初始值，集中管理避免魔法值散落。
 *
 * @module hooks/libraryOps/constants
 * @author fxbin
 */

/**
 * 新建工作区标记值：归属下拉框中选择新建工作区时使用。
 */
export const NEW_WORKSPACE_MARKER = '__new';

/**
 * 默认捕获模式：自动识别。
 */
export const DEFAULT_CAPTURE_MODE = 'auto';

/**
 * 默认批量归属目标为空字符串。
 */
export const DEFAULT_BATCH_ASSIGN_TARGET = '';

/**
 * 复核草稿初始空值。
 */
export const INITIAL_REVIEW_DRAFT = { title: '', contentText: '', mediaUrls: '' };

/**
 * 本地文档导入时拼接的前缀文案。
 */
export const LOCAL_FILE_PREFIX = '本地文档：';

/**
 * 文件输入 accept 属性默认值。
 */
export const FILE_INPUT_ACCEPT = '.md,.markdown,.txt,text/markdown,text/plain';

/**
 * 归档撤销提示保留时长（毫秒）。
 */
export const ARCHIVE_UNDO_TIMEOUT_MS = 9000;

/**
 * 创建初始为空的选中 ID 集合。
 * @returns {Set<string>} 空集合
 * @author fxbin
 */
export function createEmptySelectedSet() {
  return new Set();
}
