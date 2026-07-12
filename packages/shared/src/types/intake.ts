/**
 * 知识摄入（Intake）类型与运行时函数。
 *
 * 包含意图澄清字段（受众/深度/范围）、文件夹导入与批量文件导入、
 * 摄入结果与解析队列结果，以及 classifyInput / detectPlatform 两个运行时函数。
 * classifyInput 和 detectPlatform 与 IntakeKind 强相关，故放在本文件中。
 *
 * @author fxbin
 */

import type { IntakeKind } from './enums.js';
import type { WorkspaceSummary } from './workspace.js';
import type { MaterialRecord } from './material.js';
import type { KnowledgeCard } from './card.js';
import type { AgentTask, ArtifactRecord } from './artifact.js';
import type { KnowledgeCitation } from './entity.js';
import type { ProposedCard } from './proposal.js';

/**
 * 创建知识库时的意图澄清字段：受众水平。
 * - beginner 零基础，主动补前置知识与术语解释
 * - intermediate 有基础，默认掌握领域常识
 * - expert 专家级，跳过共识聚焦争议与前沿
 * @author fxbin
 */
export const INTAKE_AUDIENCE_VALUES = ['beginner', 'intermediate', 'expert'] as const;
export type IntakeAudience = typeof INTAKE_AUDIENCE_VALUES[number];

/**
 * 创建知识库时的意图澄清字段：内容深度。
 * - overview 入门概览，5-8 张卡片
 * - standard 系统掌握，12-20 张卡片
 * - deep 深度研究，20-35 张卡片含推导与前沿
 * @author fxbin
 */
export const INTAKE_DEPTH_VALUES = ['overview', 'standard', 'deep'] as const;
export type IntakeDepth = typeof INTAKE_DEPTH_VALUES[number];

/**
 * 创建知识库时的意图澄清字段：范围边界。
 * - focused 聚焦核心概念群
 * - panorama 全景覆盖主要分支
 * - cross 跨领域延伸，额外生成交叉应用卡
 * @author fxbin
 */
export const INTAKE_SCOPE_VALUES = ['focused', 'panorama', 'cross'] as const;
export type IntakeScope = typeof INTAKE_SCOPE_VALUES[number];

export interface IntakeRequest {
  input: string;
  workspaceId?: string;
  audience?: IntakeAudience;
  depth?: IntakeDepth;
  scope?: IntakeScope;
}

/**
 * 文件夹导入请求：扫描本地路径下的 .md/.txt 文件批量入库。
 * 不触发 AI 处理，仅入库为 parseStatus='pending' 的资料。
 * @author fxbin
 */
export interface FolderIntakeRequest {
  /** 本地绝对路径，必须存在且是目录 */
  path: string;
  /** 目标工作区 ID，缺省时使用当前选中工作区或 default */
  workspaceId?: string;
}

/**
 * 文件夹导入单条文件结果。
 * @author fxbin
 */
export interface FolderIntakeItem {
  /** 相对于扫描根目录的文件路径 */
  relativePath: string;
  /** 文件名 */
  fileName: string;
  /** 是否成功入库 */
  ok: boolean;
  /** 失败原因（ok=false 时填充） */
  error?: string;
  /** 入库后的 materialId（ok=true 时填充） */
  materialId?: string;
}

/**
 * 文件夹导入汇总结果。
 * @author fxbin
 */
export interface FolderIntakeResult {
  /** 扫描根目录绝对路径 */
  scannedPath: string;
  /** 目标工作区 ID */
  workspaceId: string;
  /** 目标工作区标题 */
  workspaceTitle: string;
  /** 成功入库条数 */
  imported: number;
  /** 跳过条数（如空文件、不支持格式） */
  skipped: number;
  /** 失败条数 */
  failed: number;
  /** 逐条结果 */
  items: FolderIntakeItem[];
}

/**
 * 批量文件导入单条项（前端 webkitdirectory 读取后上传）。
 * @author fxbin
 */
export interface FileBatchIntakeItem {
  /** 文件相对路径（含子目录），如 "notes/ch1.md" */
  relativePath: string;
  /** 文件名 */
  fileName: string;
  /** 文件文本内容（前端已读取） */
  content: string;
}

/**
 * 批量文件导入请求：前端通过 webkitdirectory 选择文件夹后，
 * 读取所有 .md/.txt 文件内容批量上传。
 * @author fxbin
 */
export interface FileBatchIntakeRequest {
  /** 文件列表 */
  items: FileBatchIntakeItem[];
  /** 目标工作区 ID，缺省时使用 default */
  workspaceId?: string;
}

/**
 * 批量文件导入结果（与 FolderIntakeResult 字段对齐，scannedPath 留空）。
 * @author fxbin
 */
export interface FileBatchIntakeResult {
  /** 目标工作区 ID */
  workspaceId: string;
  /** 目标工作区标题 */
  workspaceTitle: string;
  /** 成功入库条数 */
  imported: number;
  /** 跳过条数 */
  skipped: number;
  /** 失败条数 */
  failed: number;
  /** 逐条结果 */
  items: FolderIntakeItem[];
}

export interface IntakeResult {
  kind: IntakeKind;
  workspace: WorkspaceSummary;
  material?: MaterialRecord;
  cards: KnowledgeCard[];
  task: AgentTask;
  artifact?: ArtifactRecord;
  citations?: KnowledgeCitation[];
  message: string;
  proposedCards?: ProposedCard[];
  messageId?: string;
}

export interface MaterialParseQueueResult {
  material: MaterialRecord;
  task: AgentTask;
  workspace?: WorkspaceSummary;
  cards?: KnowledgeCard[];
  artifact?: ArtifactRecord;
  queued: boolean;
  retry: boolean;
  message: string;
}

export function classifyInput(input: string): IntakeKind {
  const value = input.trim();
  if (/https?:\/\//i.test(value)) return 'link';
  if (value.length > 80 || value.includes('\n')) return 'text';
  if (/[?？]|怎么|如何|why|what|how/i.test(value)) return 'question';
  return 'theme';
}

export function detectPlatform(input: string): string | undefined {
  const value = input.toLowerCase();
  if (value.includes('xiaohongshu.com') || value.includes('xhslink.com')) return 'xiaohongshu';
  if (value.includes('douyin.com') || value.includes('iesdouyin.com')) return 'douyin';
  if (/https?:\/\//i.test(value)) return 'web';
  return undefined;
}
