/**
 * Artifact 相关常量：subtype 映射、创建工作区推荐路径、Kit 卡片定义。
 * @module constants/artifact
 */

import { BookOpen, ClipboardList, FileText, Layers, Network, Sparkles } from 'lucide-react';

export const SUBTYPE_TO_VARIANT = {
  deep_research: 'deep',
  product: 'product',
  topic: 'topic',
  xiaohongshu: 'xiaohongshu',
  summary: 'summary',
};

export const CREATE_KB_KITS = [
  {
    key: 'industry',
    title: '行业研究',
    hint: '追踪行业动态与竞争格局',
    icon: Network,
    defaults: { audience: 'intermediate', depth: 'standard', scope: 'panorama' },
  },
  {
    key: 'content',
    title: '内容创作',
    hint: '系统化管理选题与素材',
    icon: FileText,
    defaults: { audience: 'intermediate', depth: 'overview', scope: 'focused' },
  },
  {
    key: 'reading',
    title: '读书笔记',
    hint: '结构化提取书中核心观点',
    icon: BookOpen,
    defaults: { audience: 'beginner', depth: 'standard', scope: 'focused' },
  },
];

export const KB_AUDIENCE_OPTIONS = [
  { key: 'beginner' },
  { key: 'intermediate' },
  { key: 'expert' },
];

export const KB_DEPTH_OPTIONS = [
  { key: 'overview' },
  { key: 'standard' },
  { key: 'deep' },
];

export const KB_SCOPE_OPTIONS = [
  { key: 'focused' },
  { key: 'panorama' },
  { key: 'cross' },
];

export const DEFAULT_KB_AUDIENCE = 'intermediate';
export const DEFAULT_KB_DEPTH = 'standard';
export const DEFAULT_KB_SCOPE = 'panorama';

export const kitCards = [
  { id: 'learning_research', title: '学习研究 Kit', body: '把一个工作区整理成主题研究摘要、核心概念表和待补资料清单。', status: 'Ready', icon: BookOpen },
  { id: 'content_creation', title: '内容创作 Kit', body: '从资料和卡片生成选题库、标题方向、内容结构和风险提示。', status: 'Ready', icon: Sparkles },
  { id: 'product_research', title: '产品调研 Kit', body: '提炼竞品对比、用户痛点、功能机会点和下一步验证问题。', status: 'Ready', icon: ClipboardList },
  { id: 'topic_decomposition', title: '知识拆解 Kit', body: '把宽泛主题拆解为子主题树、学习路径和依赖关系，便于分步攻克。', status: 'Ready', icon: Layers },
];
