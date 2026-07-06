/**
 * 工作区工具函数：标题查找、文本归一化、关键词提取、高级运维数据构建等。
 * @module utils/knowledge
 */

/**
 * 根据工作区 ID 查找标题。
 * @param {Array<object>} workspaces - 工作区列表
 * @param {string} workspaceId - 工作区 ID
 * @returns {string} 工作区标题（未找到时返回 "Unassigned"）
 */
export function workspaceTitle(workspaces, workspaceId) {
  const matched = workspaces.find((base) => base.id === workspaceId);
  return matched?.title ?? 'Unassigned';
}

/**
 * 格式化工作区元信息字符串。
 * @param {object} base - 工作区对象
 * @returns {string} 元信息字符串
 */
export function formatBaseMeta(base) {
  if (base.meta) return base.meta;
  return `${base.sourceCount ?? 0} materials · ${base.cardCount ?? 0} cards`;
}

/**
 * 将文本归一化为小写并移除非字母数字字符。
 * @param {string} value - 原始文本
 * @returns {string} 归一化后的文本
 */
export function normalizeKnowledgeText(value) {
  return (value ?? '').toString().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

/**
 * 从多个值中提取去重后的关键词 token（过滤停用词，最多 24 个）。
 * @param {...string} values - 待提取的文本值
 * @returns {string[]} 去重后的关键词数组
 */
export function keywordTokens(...values) {
  const stopWords = new Set(['and', 'the', 'for', 'with', 'this', 'that', '一个', '一种', '如何', '什么', '工作区']);
  return [...new Set(values
    .join(' ')
    .split(/\s+/)
    .map((item) => normalizeKnowledgeText(item))
    .filter((item) => item.length >= 2 && !stopWords.has(item))
    .slice(0, 24))];
}

/**
 * 按 id 去重合并数组。
 * @param {Array<object>} items - 待去重的数组
 * @returns {Array<object>} 去重后的数组
 */
export function mergeById(items) {
  const seen = new Set();
  return items.filter((item, index) => {
    const key = item?.id ?? `${item?.title ?? 'item'}-${index}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * 按 getKey 归一化后对数组分组，返回重复组。
 * @param {Array<object>} items - 待分组的数组
 * @param {function} getKey - 分组键提取函数
 * @returns {Array<Array<object>>} 重复组数组（每组长度 > 1）
 */
export function duplicateGroups(items, getKey) {
  const groups = new Map();
  for (const item of items) {
    const key = normalizeKnowledgeText(getKey(item));
    if (!key) continue;
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  return [...groups.values()].filter((group) => group.length > 1);
}

/**
 * 从卡片数组中提取概念标签（最多 12 个）。
 * @param {Array<object>} cards - 卡片数组
 * @returns {string[]} 概念标签数组
 */
export function extractConceptTags(cards) {
  return keywordTokens(...(cards ?? []).map((card) => `${card.title ?? ''} ${card.body ?? ''}`)).slice(0, 12);
}

/**
 * 按类型对卡片分组。
 * @param {Array<object>} cards - 卡片数组
 * @returns {object} 按类型分组的对象
 */
export function groupCardsByType(cards) {
  return (cards ?? []).reduce((groups, card) => {
    const type = card.type ?? 'general';
    if (!groups[type]) groups[type] = [];
    groups[type].push(card);
    return groups;
  }, {});
}

/**
 * 构建高级运维面板所需的聚合数据（总数、跨库主题、对比实体、冲突信号）。
 * @param {object} params - 输入参数
 * @param {Array<object>} params.workspaces - 工作区列表
 * @param {Array<object>} params.materials - 材料列表
 * @param {object} params.detail - 当前工作区详情
 * @param {Array<object>} params.tasks - 任务列表
 * @returns {object} 聚合后的高级运维数据
 */
export function buildAdvancedOpsData({ workspaces, materials, detail, tasks }) {
  const detailMaterials = detail.materials ?? [];
  const detailCards = detail.cards ?? [];
  const detailArtifacts = detail.artifacts ?? [];
  const allMaterials = detailMaterials;
  const allCards = detailCards;
  const allArtifacts = detailArtifacts;
  const totalMaterials = allMaterials.length;
  const totalCards = allCards.length;
  const sourcedCards = allCards.filter((card) => card.claimStatus === 'sourced').length;
  const reviewMaterials = allMaterials.filter((item) => item.parseStatus === 'needs_review' || item.parseStatus === 'failed');
  const duplicateMaterials = duplicateGroups(allMaterials, (item) => item.sourceUrl || item.rawInput || item.title);
  const duplicateCards = duplicateGroups(allCards, (item) => item.title);
  const baseThemes = workspaces.map((base) => ({
    ...base,
    tokens: keywordTokens(base.title, base.summary),
  }));
  const crossKbThemes = baseThemes.flatMap((base, index) => baseThemes.slice(index + 1).map((other) => {
    const overlap = base.tokens.filter((token) => other.tokens.includes(token));
    return { left: base, right: other, overlap, score: overlap.length };
  })).filter((item) => item.score > 0).sort((left, right) => right.score - left.score);
  const fallbackThemes = crossKbThemes.length ? crossKbThemes : baseThemes.slice(0, 3).map((base) => ({
    left: base,
    right: baseThemes.find((item) => item.id !== base.id) ?? base,
    overlap: base.tokens.slice(0, 3),
    score: base.tokens.length ? 1 : 0,
  }));
  const comparisonEntities = (workspaces.length ? workspaces : [{ title: detail.title, sourceCount: allMaterials.length, cardCount: allCards.length }])
    .slice(0, 4)
    .map((base, index) => ({
      id: base.id ?? `entity-${index}`,
      title: base.title,
      materials: base.sourceCount ?? allMaterials.length,
      cards: base.cardCount ?? allCards.length,
      artifacts: allArtifacts.filter((artifact) => artifact.workspaceId === base.id).length || (index === 0 ? allArtifacts.length : 0),
      health: Math.round(((base.cardCount ?? allCards.length) ? sourcedCards / Math.max(base.cardCount ?? allCards.length, 1) : 0.3) * 100),
    }));
  const conflictSignals = [
    ...duplicateMaterials.map((group) => ({ type: 'duplicate_material', title: group[0].title, count: group.length, severity: 'medium' })),
    ...duplicateCards.map((group) => ({ type: 'duplicate_card', title: group[0].title, count: group.length, severity: 'medium' })),
    ...reviewMaterials.slice(0, 4).map((item) => ({ type: 'needs_review', title: item.title, count: 1, severity: item.parseStatus === 'failed' ? 'high' : 'medium' })),
    ...allCards.filter((card) => card.claimStatus !== 'sourced').slice(0, 4).map((card) => ({ type: 'unsourced_card', title: card.title, count: 1, severity: 'low' })),
  ];
  return {
    totals: {
      workspaces: workspaces.length,
      materials: totalMaterials,
      cards: totalCards,
      artifacts: allArtifacts.length,
      tasks: tasks.length,
      sourcedCards,
      reviewMaterials: reviewMaterials.length,
      duplicateSignals: duplicateMaterials.length + duplicateCards.length,
    },
    allMaterials,
    allCards,
    allArtifacts,
    crossKbThemes: fallbackThemes.slice(0, 5),
    comparisonEntities,
    conflictSignals: conflictSignals.slice(0, 8),
  };
}

/**
 * 返回空工作区详情。
 * @returns {object} 空详情对象
 */
export function emptyDetail() {
  return {
    title: '尚未创建工作区',
    summary: '从一个主题、链接或问题开始，知径会在这里形成可追溯的知识结构。',
    sourceCount: 0,
    cardCount: 0,
    sourcedRatio: 0,
    materials: [],
    cards: [],
    artifacts: [],
  };
}
