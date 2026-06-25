/**
 * Artifact 工具函数：变体解析、配置获取、正文分块等。
 * @module utils/artifact
 */

import { SUBTYPE_TO_VARIANT } from '../constants/artifact';

/**
 * 根据 artifact 的 subtype 或 artifactType 解析变体标识。
 * @param {object} artifact - 产物对象
 * @returns {string} 变体标识（deep/product/topic/xiaohongshu/summary）
 */
export function resolveArtifactVariant(artifact) {
  const subtype = artifact?.subtype;
  if (subtype && Object.prototype.hasOwnProperty.call(SUBTYPE_TO_VARIANT, subtype)) {
    return SUBTYPE_TO_VARIANT[subtype];
  }
  return artifact?.artifactType === 'kit_report' ? 'deep' : 'summary';
}

/**
 * 推断 artifact 变体（兼容旧调用，内部委托 resolveArtifactVariant）。
 * @param {object} artifact - 产物对象
 * @param {object} detail - 工作区详情（未使用，保留参数兼容）
 * @returns {string} 变体标识
 */
export function inferArtifactVariant(artifact, detail) {
  return resolveArtifactVariant(artifact);
}

/**
 * 根据变体标识返回产物配置（标签、标题、引导语、分区）。
 * @param {string} variant - 变体标识
 * @returns {object} 产物配置对象
 */
export function artifactVariantConfig(variant) {
  const configs = {
    deep: {
      label: 'Deep Research',
      title: '研究结论',
      lead: '把资料压缩成核心问题、证据链和下一步研究方向。',
      sections: ['Core Insights', 'Evidence Trail', 'Open Questions'],
    },
    product: {
      label: 'Product Research',
      title: '产品调研成果',
      lead: '面向产品决策整理用户痛点、机会点和验证动作。',
      sections: ['User Pain', 'Opportunity', 'Validation'],
    },
    topic: {
      label: 'Topic Library',
      title: '选题库成果',
      lead: '把素材整理成可持续创作的主题、角度和内容结构。',
      sections: ['Topic Clusters', 'Angles', 'Publishing Queue'],
    },
    xiaohongshu: {
      label: 'Xiaohongshu Ops',
      title: '小红书运营诊断',
      lead: '把笔记素材转成账号运营、内容结构和风险提示。',
      sections: ['Account Diagnosis', 'Content Actions', 'Risk Notes'],
    },
    summary: {
      label: 'Summary',
      title: '知识产物',
      lead: '当前工作区生成的结构化摘要与来源边界。',
      sections: ['Summary', 'Source Boundary', 'Next Actions'],
    },
  };
  return configs[variant] ?? configs.summary;
}

/**
 * 将 artifact 正文按空行拆分为块。
 * @param {object} artifact - 产物对象
 * @returns {string[]} 正文块数组
 */
export function artifactBodyBlocks(artifact) {
  return artifact?.body
    ? artifact.body.split(/\n+/).map((block) => block.trim()).filter(Boolean)
    : [];
}

/**
 * 将正文块按分区数循环分发。
 * @param {string[]} blocks - 正文块数组
 * @param {number} sectionCount - 分区数
 * @returns {string[][]} 每个分区对应的块数组
 */
export function distributeArtifactBlocks(blocks, sectionCount) {
  const normalized = blocks.length ? blocks : ['这个产物暂时没有正文。'];
  return Array.from({ length: sectionCount }, (_, index) => normalized.filter((_, itemIndex) => itemIndex % sectionCount === index));
}
