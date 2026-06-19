/**
 * 导航工具函数：hash 路由解析、输入分类、工作流推断。
 * @module utils/navigation
 */

import { knownViews } from '../constants/options';

/**
 * 从 window.location.hash 解析当前视图。
 * @returns {string} 视图标识（默认 workspace）
 */
export function viewFromHash() {
  const hash = window.location.hash.replace('#', '');
  return knownViews.has(hash) ? hash : 'workspace';
}

/**
 * 根据输入内容分类为 Link/Question/Theme。
 * @param {string} value - 用户输入
 * @returns {string} 分类标签
 */
export function classifyInput(value) {
  if (/https?:\/\//.test(value)) return 'Link';
  if (/[?？]|怎么|如何/.test(value)) return 'Question';
  return 'Theme';
}

/**
 * 根据输入分类推断工作流类型。
 * @param {string} kind - 输入分类（Question/Theme/Link）
 * @returns {string} 工作流标识
 */
export function workflowFromKind(kind) {
  if (kind === 'Question') return 'answer_question';
  if (kind === 'Theme') return 'create_knowledge_base';
  return 'ingest_material';
}
