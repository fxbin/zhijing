/**
 * 导出工具函数：Markdown 生成、JSON 导出、文件下载等。
 * @module utils/export
 */

import { formatPercent, safeFilename } from './format';

/**
 * 生成单个 Artifact 的 Markdown 文本。
 * @param {object} artifact - 产物对象
 * @param {object} detail - 知识库详情
 * @returns {string} Markdown 文本
 */
export function artifactMarkdown(artifact, detail) {
  const sourceCount = artifact.sourceMaterialIds?.length ?? 0;
  return [
    `# ${artifact.title}`,
    '',
    `- 知识库：${detail.title}`,
    `- 类型：${artifact.artifactType ?? 'summary'}`,
    `- 生成时间：${new Date(artifact.createdAt).toLocaleString()}`,
    `- 来源资料：${sourceCount}`,
    '',
    '---',
    '',
    artifact.body,
    '',
  ].join('\n');
}

/**
 * 触发浏览器下载 Artifact 的 Markdown 文件。
 * @param {object} artifact - 产物对象
 * @param {object} detail - 知识库详情
 */
export function downloadArtifactMarkdown(artifact, detail) {
  const blob = new Blob([artifactMarkdown(artifact, detail)], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeFilename(artifact.title)}.md`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * 生成知识库的完整 Markdown 文本。
 * @param {object} detail - 知识库详情
 * @param {object} options - 导出选项（includeCards/includeMaterials/includeArtifacts）
 * @returns {string} Markdown 文本
 */
export function knowledgeBaseMarkdown(detail, options = {}) {
  const materials = detail.materials ?? [];
  const cards = detail.cards ?? [];
  const artifacts = detail.artifacts ?? [];
  const lines = [
    `# ${detail.title}`,
    '',
    detail.summary ?? '',
    '',
    '## Overview',
    '',
    `- Sources: ${materials.length}`,
    `- Cards: ${cards.length}`,
    `- Sourced ratio: ${formatPercent(detail.sourcedRatio)}`,
    '',
  ];
  if (options.includeCards !== false) {
    lines.push('## Knowledge Cards', '');
    for (const card of cards) {
      lines.push(`### ${card.title}`, '', `- Type: ${card.type}`, `- Claim: ${card.claimStatus}`, '', card.body, '');
    }
  }
  if (options.includeMaterials !== false) {
    lines.push('## Source Materials', '');
    for (const material of materials) {
      lines.push(`### ${material.title}`, '', `- Type: ${material.type}`, `- Platform: ${material.platform ?? 'local'}`, `- Status: ${material.parseStatus}`, '', material.contentText || material.rawInput || '', '');
    }
  }
  if (options.includeArtifacts !== false && artifacts.length > 0) {
    lines.push('## Artifacts', '');
    for (const artifact of artifacts) {
      lines.push(`### ${artifact.title}`, '', artifact.body, '');
    }
  }
  return lines.join('\n');
}

/**
 * 生成知识库的 JSON 导出字符串。
 * @param {object} detail - 知识库详情
 * @param {object} options - 导出选项
 * @returns {string} JSON 字符串
 */
export function knowledgeBaseExportJson(detail, options = {}) {
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    title: detail.title,
    summary: detail.summary,
    stats: {
      sourceCount: detail.sourceCount,
      cardCount: detail.cardCount,
      sourcedRatio: detail.sourcedRatio,
    },
    materials: options.includeMaterials === false ? [] : detail.materials ?? [],
    cards: options.includeCards === false ? [] : detail.cards ?? [],
    artifacts: options.includeArtifacts === false ? [] : detail.artifacts ?? [],
  }, null, 2);
}

/**
 * 触发浏览器下载文本文件。
 * @param {string} filename - 文件名
 * @param {string} content - 文件内容
 * @param {string} type - MIME 类型
 */
export function downloadTextFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
