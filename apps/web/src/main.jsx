import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AlertTriangle,
  Bell,
  BookOpen,
  CheckCircle2,
  CircleHelp,
  CircleX,
  ClipboardList,
  Clock3,
  Database,
  FileText,
  FolderOpen,
  History,
  KeyRound,
  Layers,
  Link2,
  ListChecks,
  LogOut,
  Network,
  PackageCheck,
  PlugZap,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  SquareArrowOutUpRight,
  Trash2,
  Upload,
  Download,
} from 'lucide-react';
import './styles.css';

const seedKnowledgeBases = [
  { title: 'AI Agent 学习', meta: '12 materials · 42 cards', active: true },
  { title: '小红书运营', meta: '18 materials · 76 cards' },
  { title: '产品调研', meta: '9 materials · 31 cards' },
];

const seedMaterials = [
  {
    source: 'XIAOHONGSHU',
    status: 'CLASSIFIED',
    title: 'Minimalist Desk Setup Inspiration for 2024',
    summary: 'A collection of clean, highly functional desk setups focusing on neutral tones, cable management, and ergonomic design principles.',
    tags: ['workspace', 'design'],
    time: '2h ago',
    state: 'ready',
  },
  {
    source: 'TEXT SNIPPET',
    status: 'PROCESSING',
    title: '"The essence of strategy is choosing what not to do."',
    summary: '- Michael Porter',
    tags: ['strategy'],
    time: '5h ago',
    state: 'processing',
  },
];

const kitCards = [
  { id: 'learning_research', title: '学习研究 Kit', body: '把一个知识库整理成主题研究摘要、核心概念表和待补资料清单。', status: 'Ready', icon: BookOpen },
  { id: 'content_creation', title: '内容创作 Kit', body: '从资料和卡片生成选题库、标题方向、内容结构和风险提示。', status: 'Ready', icon: Sparkles },
  { id: 'product_research', title: '产品调研 Kit', body: '提炼竞品对比、用户痛点、功能机会点和下一步验证问题。', status: 'Ready', icon: ClipboardList },
];

const knownViews = new Set(['workspace', 'detail', 'library', 'search', 'kits', 'workflow', 'artifact', 'maps', 'chat', 'recall', 'export', 'assets', 'synthesis', 'compare', 'conflicts', 'settings']);

function viewFromHash() {
  const hash = window.location.hash.replace('#', '');
  return knownViews.has(hash) ? hash : 'workspace';
}

function classifyInput(value) {
  if (/https?:\/\//.test(value)) return 'Link';
  if (/[?？]|怎么|如何/.test(value)) return 'Question';
  return 'Theme';
}

function formatBaseMeta(base) {
  if (base.meta) return base.meta;
  return `${base.sourceCount ?? 0} materials · ${base.cardCount ?? 0} cards`;
}

function materialFromApi(item) {
  const platform = item.platform ?? item.type ?? 'material';
  const status = item.parseStatus ?? 'saved';
  return {
    ...item,
    source: platform.toUpperCase(),
    status: status.toUpperCase(),
    title: item.title ?? 'Untitled material',
    summary: item.contentText || item.rawInput || 'Saved source material.',
    tags: [item.type ?? 'material', status],
    time: 'just now',
    state: status === 'failed' ? 'failed' : status === 'parsing' ? 'processing' : 'ready',
  };
}

const materialFilterOptions = [
  { key: 'all', label: 'All Materials' },
  { key: 'link', label: 'Links' },
  { key: 'text', label: 'Text' },
  { key: 'question', label: 'Questions' },
  { key: 'failed', label: 'Failed' },
  { key: 'parsing', label: 'Parsing' },
];

const captureModeOptions = ['auto', 'link', 'text', 'batch'];
const supportedImportExtensions = ['.md', '.markdown', '.txt'];
const maxImportedFileSize = 2 * 1024 * 1024;

function splitBatchCaptureInput(value) {
  return value
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 30);
}

const searchScopeOptions = [
  { key: 'all', label: 'All' },
  { key: 'knowledge_base', label: 'Knowledge Bases' },
  { key: 'material', label: 'Materials' },
  { key: 'card', label: 'Cards' },
  { key: 'artifact', label: 'Artifacts' },
];

const typeLabels = {
  link: 'Link',
  text: 'Text',
  question: 'Question',
  topic: 'Topic',
};

const statusLabels = {
  saved: 'Saved',
  parsing: 'Parsing',
  needs_review: 'Review',
  ingested: 'Ingested',
  failed: 'Failed',
};

function materialPreview(item) {
  const text = item.contentText || item.rawInput || item.sourceUrl || 'Saved source material.';
  const cleaned = text.replace(/\s+/g, ' ').trim();
  return cleaned.length > 180 ? `${cleaned.slice(0, 180)}...` : cleaned;
}

function materialSourceUrl(item) {
  return item.sourceUrl?.match(/https?:\/\/[^\s"'<>]+/i)?.[0]
    ?? item.rawInput?.match(/https?:\/\/[^\s"'<>]+/i)?.[0];
}

function materialMediaUrls(item) {
  return Array.isArray(item.mediaUrls) ? item.mediaUrls.filter(Boolean) : [];
}

function splitMediaUrls(value) {
  return value
    .split(/\s+/)
    .map((item) => item.trim())
    .filter((item) => /^https?:\/\//i.test(item));
}

function knowledgeBaseTitle(knowledgeBases, knowledgeBaseId) {
  const matched = knowledgeBases.find((base) => base.id === knowledgeBaseId);
  return matched?.title ?? 'Unassigned';
}

function isImageUrl(url) {
  return /xhscdn\.com|sns-img|image|format\/jpg|format\/png|\.jpe?g|\.png|\.webp/i.test(url);
}

function materialState(status) {
  if (status === 'failed') return 'failed';
  if (status === 'parsing' || status === 'saved' || status === 'needs_review') return 'processing';
  return 'ready';
}

function materialIcon(type) {
  return type === 'link' ? Link2 : FileText;
}

function resultIcon(kind) {
  if (kind === 'knowledge_base') return Database;
  if (kind === 'material') return FolderOpen;
  if (kind === 'artifact') return ClipboardList;
  return BookOpen;
}

function canParseMaterial(item) {
  return item.type === 'link' && item.parseStatus !== 'ingested' && item.parseStatus !== 'parsing';
}

function formatMaterialTime(value) {
  if (!value) return 'just now';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return 'just now';
  }
}

const PARSE_STAGE_LABELS = {
  captured: '采集',
  queued: '排队',
  parsing: '解析',
  review: '复核',
  ingested: '入库',
};

function buildParseTimelineStages(item) {
  const timeline = item.statusTimeline ?? {};
  const failed = Boolean(timeline.failedAt);
  const stamps = {
    captured: timeline.capturedAt ?? item.createdAt,
    queued: timeline.queuedAt,
    parsing: timeline.parsingAt,
    review: timeline.reviewedAt ?? timeline.failedAt,
    ingested: timeline.ingestedAt,
  };
  return ['captured', 'queued', 'parsing', 'review', 'ingested'].map((key) => ({
    key,
    label: PARSE_STAGE_LABELS[key],
    at: stamps[key],
    failed: failed && key === 'review',
  }));
}

function ParseTimeline({ item }) {
  const stages = buildParseTimelineStages(item);
  const fillIndex = stages.reduce((acc, stage, idx) => (stage.at ? idx : acc), -1);
  const progressed = stages.some((stage, idx) => idx > 0 && stage.at);
  if (!progressed) return null;
  return (
    <div className="parse-timeline" aria-label="解析进度时间线">
      {stages.map((stage, idx) => {
        const reached = idx <= fillIndex;
        const current = reached && idx === fillIndex && item.parseStatus !== 'ingested' && !stage.failed;
        const tip = stage.at ? `${stage.label}：${formatMaterialTime(stage.at)}` : `${stage.label}：待处理`;
        const classes = ['parse-stage'];
        if (reached) classes.push('reached');
        if (reached && stage.failed) classes.push('failed');
        if (current) classes.push('current');
        return (
          <div className={classes.join(' ')} key={stage.key}>
            <span className="parse-stage-dot" title={tip} />
            <span className="parse-stage-label">{stage.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function formatPercent(value) {
  return `${Math.round((value ?? 0) * 100)}%`;
}

function safeFilename(value) {
  const cleaned = value.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim();
  return cleaned || 'zhijing-artifact';
}

function artifactMarkdown(artifact, detail) {
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

function downloadArtifactMarkdown(artifact, detail) {
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

function knowledgeBaseMarkdown(detail, options = {}) {
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

function knowledgeBaseExportJson(detail, options = {}) {
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

function downloadTextFile(filename, content, type) {
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

function inferArtifactVariant(artifact, detail) {
  const text = `${artifact?.title ?? ''} ${artifact?.artifactType ?? ''} ${artifact?.body ?? ''} ${detail?.title ?? ''}`.toLowerCase();
  if (/小红书|xiaohongshu|内容创作|运营|选题|标题|封面|爆款/.test(text)) return 'xiaohongshu';
  if (/产品|竞品|用户|调研|product|research|opportunity/.test(text)) return 'product';
  if (/选题库|topic|library|主题库|内容库/.test(text)) return 'topic';
  if (/deep|research|研究|洞察|趋势|问题/.test(text)) return 'deep';
  return artifact?.artifactType === 'kit_report' ? 'deep' : 'summary';
}

function artifactVariantConfig(variant) {
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
      lead: '当前知识库生成的结构化摘要与来源边界。',
      sections: ['Summary', 'Source Boundary', 'Next Actions'],
    },
  };
  return configs[variant] ?? configs.summary;
}

function artifactBodyBlocks(artifact) {
  return artifact?.body
    ? artifact.body.split(/\n+/).map((block) => block.trim()).filter(Boolean)
    : [];
}

function distributeArtifactBlocks(blocks, sectionCount) {
  const normalized = blocks.length ? blocks : ['这个产物暂时没有正文。'];
  return Array.from({ length: sectionCount }, (_, index) => normalized.filter((_, itemIndex) => itemIndex % sectionCount === index));
}

function normalizeKnowledgeText(value) {
  return (value ?? '').toString().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function keywordTokens(...values) {
  const stopWords = new Set(['and', 'the', 'for', 'with', 'this', 'that', '一个', '一种', '如何', '什么', '知识库']);
  return [...new Set(values
    .join(' ')
    .split(/\s+/)
    .map((item) => normalizeKnowledgeText(item))
    .filter((item) => item.length >= 2 && !stopWords.has(item))
    .slice(0, 24))];
}

function buildAdvancedOpsData({ knowledgeBases, materials, detail, tasks }) {
  const detailMaterials = detail.materials ?? [];
  const detailCards = detail.cards ?? [];
  const detailArtifacts = detail.artifacts ?? [];
  const allMaterials = mergeById([...materials, ...detailMaterials]);
  const allCards = detailCards;
  const allArtifacts = detailArtifacts;
  const totalMaterials = knowledgeBases.reduce((sum, base) => sum + (base.sourceCount ?? 0), 0) || allMaterials.length;
  const totalCards = knowledgeBases.reduce((sum, base) => sum + (base.cardCount ?? 0), 0) || allCards.length;
  const sourcedCards = allCards.filter((card) => card.claimStatus === 'sourced').length;
  const reviewMaterials = allMaterials.filter((item) => item.parseStatus === 'needs_review' || item.parseStatus === 'failed');
  const duplicateMaterials = duplicateGroups(allMaterials, (item) => item.sourceUrl || item.rawInput || item.title);
  const duplicateCards = duplicateGroups(allCards, (item) => item.title);
  const baseThemes = knowledgeBases.map((base) => ({
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
  const comparisonEntities = (knowledgeBases.length ? knowledgeBases : [{ title: detail.title, sourceCount: allMaterials.length, cardCount: allCards.length }])
    .slice(0, 4)
    .map((base, index) => ({
      id: base.id ?? `entity-${index}`,
      title: base.title,
      materials: base.sourceCount ?? allMaterials.length,
      cards: base.cardCount ?? allCards.length,
      artifacts: allArtifacts.filter((artifact) => artifact.knowledgeBaseId === base.id).length || (index === 0 ? allArtifacts.length : 0),
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
      knowledgeBases: knowledgeBases.length,
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

function mergeById(items) {
  const seen = new Set();
  return items.filter((item, index) => {
    const key = item?.id ?? `${item?.title ?? 'item'}-${index}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function duplicateGroups(items, getKey) {
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

function fallbackDetail() {
  return {
    title: 'AI Agent 学习',
    summary: 'Exploring the fundamentals, tools, memory systems, and multi-agent collaborative frameworks.',
    sourceCount: 12,
    cardCount: 42,
    sourcedRatio: 0.62,
    materials: [
      {
        id: 'seed-material',
        title: "Beginner's Guide to AI Agents",
        platform: 'xiaohongshu',
        parseStatus: 'ingested',
        createdAt: new Date().toISOString(),
      },
    ],
    cards: [
      {
        id: 'seed-card',
        type: 'concept',
        title: 'ReAct Framework',
        body: 'Reasoning + Acting. Forces the LLM to generate a reasoning trace before taking an action, improving transparency and success rate in complex tasks.',
        claimStatus: 'sourced',
        updatedAt: new Date().toISOString(),
      },
    ],
    artifacts: [],
  };
}

function emptyDetail() {
  return {
    title: '尚未创建知识库',
    summary: '从一个主题、链接或问题开始，知径会在这里形成可追溯的知识结构。',
    sourceCount: 0,
    cardCount: 0,
    sourcedRatio: 0,
    materials: [],
    cards: [],
    artifacts: [],
  };
}

function workflowFromKind(kind) {
  if (kind === 'Question') return 'answer_question';
  if (kind === 'Theme') return 'create_knowledge_base';
  return 'ingest_material';
}

function App() {
  const [view, setView] = useState(viewFromHash);
  const [query, setQuery] = useState('');
  const [activity, setActivity] = useState('Ready to organize a theme, link, or question.');
  const [apiStatus, setApiStatus] = useState('checking');
  const [knowledgeBases, setKnowledgeBases] = useState(seedKnowledgeBases);
  const [materials, setMaterials] = useState(seedMaterials);
  const [tasks, setTasks] = useState([]);
  const [selectedKnowledgeBaseId, setSelectedKnowledgeBaseId] = useState(null);
  const [knowledgeBaseDetail, setKnowledgeBaseDetail] = useState(fallbackDetail);
  const [knowledgeBaseAnalytics, setKnowledgeBaseAnalytics] = useState(null);
  const [latestTaskId, setLatestTaskId] = useState(null);
  const [latestTask, setLatestTask] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assistantQuestion, setAssistantQuestion] = useState('');
  const [assistantAnswer, setAssistantAnswer] = useState(null);
  const [isAsking, setIsAsking] = useState(false);
  const [selectedArtifact, setSelectedArtifact] = useState(null);
  const [parsingMaterialId, setParsingMaterialId] = useState(null);
  const [isRunningKit, setIsRunningKit] = useState(false);
  const [kitRunResult, setKitRunResult] = useState(null);
  const [isCreateKbOpen, setIsCreateKbOpen] = useState(false);
  const kind = useMemo(() => (query.trim() ? classifyInput(query.trim()) : 'Theme, Link, or Question'), [query]);
  const advancedOpsData = useMemo(() => buildAdvancedOpsData({
    knowledgeBases,
    materials,
    detail: knowledgeBaseDetail,
    tasks,
  }), [knowledgeBases, materials, knowledgeBaseDetail, tasks]);

  useEffect(() => {
    const handleHashChange = () => setView(viewFromHash());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    let ignore = false;
    async function loadDashboard() {
      try {
        const response = await fetch('/api/dashboard');
        if (!response.ok) throw new Error('Dashboard unavailable.');
        const dashboard = await response.json();
        if (ignore) return;
        const nextKnowledgeBases = dashboard.knowledgeBases ?? [];
        const nextMaterials = dashboard.materials ?? [];
        const nextTasks = dashboard.tasks ?? [];
        setApiStatus('online');
        setKnowledgeBases(nextKnowledgeBases);
        setMaterials(nextMaterials.map(materialFromApi));
        setTasks(nextTasks);
        setSelectedKnowledgeBaseId((current) => {
          if (current && nextKnowledgeBases.some((base) => base.id === current)) return current;
          return nextKnowledgeBases[0]?.id ?? null;
        });
        if (nextTasks.length) {
          setLatestTaskId(nextTasks[0].id);
          setLatestTask(nextTasks[0]);
        } else {
          setLatestTaskId(null);
          setLatestTask(null);
        }
      } catch {
        if (!ignore) setApiStatus('offline');
      }
    }
    loadDashboard();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedKnowledgeBaseId) {
      setKnowledgeBaseDetail(apiStatus === 'online' ? emptyDetail() : fallbackDetail());
      setKnowledgeBaseAnalytics(null);
      setAssistantAnswer(null);
      setAssistantQuestion('');
      return;
    }

    let ignore = false;
    async function loadDetail() {
      try {
        const response = await fetch(`/api/knowledge-bases/${selectedKnowledgeBaseId}`);
        if (!response.ok) return;
        const detail = await response.json();
        if (!ignore) setKnowledgeBaseDetail(detail);
      } catch {
        if (!ignore) setKnowledgeBaseDetail(fallbackDetail());
      }
    }
    loadDetail();
    return () => {
      ignore = true;
    };
  }, [apiStatus, selectedKnowledgeBaseId]);

  useEffect(() => {
    if (!selectedKnowledgeBaseId || apiStatus !== 'online') {
      setKnowledgeBaseAnalytics(null);
      return;
    }

    let ignore = false;
    async function loadAnalytics() {
      try {
        const response = await fetch(`/api/knowledge-bases/${selectedKnowledgeBaseId}/analytics`);
        if (!response.ok) return;
        const analytics = await response.json();
        if (!ignore) setKnowledgeBaseAnalytics(analytics);
      } catch {
        if (!ignore) setKnowledgeBaseAnalytics(null);
      }
    }
    loadAnalytics();
    return () => {
      ignore = true;
    };
  }, [apiStatus, selectedKnowledgeBaseId, latestTask?.updatedAt]);

  useEffect(() => {
    setAssistantAnswer(null);
    setAssistantQuestion('');
    setSelectedArtifact(null);
    setKitRunResult(null);
  }, [selectedKnowledgeBaseId]);

  useEffect(() => {
    if (!latestTaskId) return undefined;
    let cancelled = false;

    async function loadTask() {
      try {
        const response = await fetch(`/api/tasks/${latestTaskId}`);
        if (!response.ok) return;
        const task = await response.json();
        if (!cancelled) setLatestTask(task);
      } catch {
        // Keep the last task status when the API is not available.
      }
    }

    loadTask();
    const timer = window.setInterval(loadTask, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [latestTaskId]);

  const go = (nextView) => {
    setView(nextView);
    if (nextView === 'workspace') {
      window.history.replaceState(null, '', window.location.pathname);
      return;
    }
    window.location.hash = nextView;
  };

  const applyIntakeResult = (result) => {
    setLatestTaskId(result.task.id);
    setLatestTask(result.task);
    setTasks((current) => [result.task, ...current.filter((task) => task.id !== result.task.id)].slice(0, 8));
    setSelectedKnowledgeBaseId(result.knowledgeBase.id);
    setKnowledgeBases((current) => {
      const withoutDuplicate = current.filter((base) => base.id !== result.knowledgeBase.id && base.title !== result.knowledgeBase.title);
      return [result.knowledgeBase, ...withoutDuplicate];
    });
    if (result.material) {
      setMaterials((current) => [materialFromApi(result.material), ...current].slice(0, 6));
      setKnowledgeBaseDetail((current) => current.id === result.knowledgeBase.id ? ({
        ...current,
        ...result.knowledgeBase,
        materials: [result.material, ...(current.materials ?? []).filter((material) => material.id !== result.material.id)],
        cards: [...(result.cards ?? []), ...(current.cards ?? []).filter((card) => !(result.cards ?? []).some((item) => item.id === card.id))],
        artifacts: result.artifact
          ? [result.artifact, ...(current.artifacts ?? []).filter((artifact) => artifact.id !== result.artifact.id)]
          : current.artifacts ?? [],
      }) : current);
    }
  };

  const applyMaterialMutation = (result) => {
    if (!result?.material) return;
    if (result.task) {
      setLatestTaskId(result.task.id);
      setLatestTask(result.task);
      setTasks((current) => [result.task, ...current.filter((task) => task.id !== result.task.id)].slice(0, 8));
    }
    if (result.knowledgeBase) {
      setKnowledgeBases((current) => [result.knowledgeBase, ...current.filter((base) => base.id !== result.knowledgeBase.id)]);
    }
    setMaterials((current) => [materialFromApi(result.material), ...current.filter((material) => material.id !== result.material.id)].slice(0, 6));
    setKnowledgeBaseDetail((current) => {
      const isTargetDetail = current.id === result.material.knowledgeBaseId;
      const isPreviousDetail = current.id === result.previousKnowledgeBaseId;
      if (!isTargetDetail && !isPreviousDetail) return current;
      if (isPreviousDetail && !isTargetDetail) {
        return {
          ...current,
          materials: (current.materials ?? []).filter((material) => material.id !== result.material.id),
        };
      }
      return {
        ...current,
        ...(result.knowledgeBase ?? {}),
        materials: [result.material, ...(current.materials ?? []).filter((material) => material.id !== result.material.id)],
        cards: [...(result.cards ?? []), ...(current.cards ?? []).filter((card) => !(result.cards ?? []).some((item) => item.id === card.id))],
        artifacts: result.artifact
          ? [result.artifact, ...(current.artifacts ?? []).filter((artifact) => artifact.id !== result.artifact.id)]
          : current.artifacts ?? [],
      };
    });
    if (result.artifact) setSelectedArtifact(result.artifact);
  };

  const submit = async (overrideValue) => {
    const value = (overrideValue ?? query).trim();
    if (!value || isSubmitting) return;
    setIsSubmitting(true);
    setActivity(`${kind} captured. Creating task through local API...`);

    try {
      const response = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: value }),
      });

      if (!response.ok) {
        throw new Error('API intake failed.');
      }

      const result = await response.json();
      setActivity(`${result.message} Task ${result.task.id} finished.`);
      applyIntakeResult(result);
      setQuery('');
    } catch {
      const timestamp = new Date().toISOString();
      const failedTask = {
        id: `local_failed_${Date.now()}`,
        workflow: workflowFromKind(kind),
        status: 'failed',
        input: { input: value },
        error: 'API unavailable',
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      setApiStatus('offline');
      setLatestTaskId(null);
      setLatestTask(failedTask);
      setTasks((current) => [failedTask, ...current].slice(0, 8));
      setActivity('API is not ready. Keep the idea here and start dev:api to run the real intake loop.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const askKnowledgeBase = async () => {
    const value = assistantQuestion.trim();
    if (!value || !selectedKnowledgeBaseId || apiStatus !== 'online' || isAsking) return;
    setIsAsking(true);
    setAssistantAnswer({ question: value, loading: true });
    setActivity('Asking current knowledge base...');

    try {
      const response = await fetch(`/api/knowledge-bases/${selectedKnowledgeBaseId}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: value }),
      });

      if (!response.ok) {
        throw new Error('Knowledge base ask failed.');
      }

      const result = await response.json();
      setActivity(`${result.message} Task ${result.task.id} finished.`);
      setLatestTaskId(result.task.id);
      setLatestTask(result.task);
      setTasks((current) => [result.task, ...current.filter((task) => task.id !== result.task.id)].slice(0, 8));
      setKnowledgeBases((current) => {
        const withoutDuplicate = current.filter((base) => base.id !== result.knowledgeBase.id);
        return [result.knowledgeBase, ...withoutDuplicate];
      });
      setKnowledgeBaseDetail((current) => ({
        ...current,
        ...result.knowledgeBase,
        materials: result.material
          ? [result.material, ...(current.materials ?? []).filter((material) => material.id !== result.material.id)]
          : current.materials ?? [],
        cards: [...(result.cards ?? []), ...(current.cards ?? []).filter((card) => !(result.cards ?? []).some((item) => item.id === card.id))],
        artifacts: result.artifact
          ? [result.artifact, ...(current.artifacts ?? []).filter((artifact) => artifact.id !== result.artifact.id)]
          : current.artifacts ?? [],
      }));
      setAssistantAnswer({
        question: value,
        message: result.message,
        cards: result.cards ?? [],
        artifact: result.artifact,
        citations: result.citations ?? [],
        task: result.task,
      });
      if (result.artifact) setSelectedArtifact(result.artifact);
      setAssistantQuestion('');
    } catch {
      setAssistantAnswer({
        question: value,
        error: '当前无法完成提问，请确认 API 已启动且知识库可用。',
      });
    } finally {
      setIsAsking(false);
    }
  };

  const openArtifact = (artifact) => {
    if (artifact) setSelectedArtifact(artifact);
    go('artifact');
  };

  const runKnowledgeKit = async (kitId = 'learning_research') => {
    if (!selectedKnowledgeBaseId || apiStatus !== 'online' || isRunningKit) return null;
    setIsRunningKit(true);
    setActivity('Running knowledge kit...');

    try {
      const response = await fetch(`/api/knowledge-bases/${selectedKnowledgeBaseId}/kits/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kitId }),
      });
      if (!response.ok) throw new Error('Kit run failed.');
      const result = await response.json();
      setActivity(`${result.message} Task ${result.task.id} finished.`);
      setLatestTaskId(result.task.id);
      setLatestTask(result.task);
      setTasks((current) => [result.task, ...current.filter((task) => task.id !== result.task.id)].slice(0, 8));
      setKnowledgeBases((current) => [result.knowledgeBase, ...current.filter((base) => base.id !== result.knowledgeBase.id)]);
      setKnowledgeBaseDetail((current) => ({
        ...current,
        ...result.knowledgeBase,
        artifacts: [result.artifact, ...(current.artifacts ?? []).filter((artifact) => artifact.id !== result.artifact.id)],
      }));
      setSelectedArtifact(result.artifact);
      setKitRunResult(result);
      return result;
    } catch {
      setActivity('Kit 运行失败，请确认 API 已启动且当前知识库可用。');
      return null;
    } finally {
      setIsRunningKit(false);
    }
  };

  const parseMaterial = async (materialId) => {
    if (!materialId || parsingMaterialId) return;
    setParsingMaterialId(materialId);
    setActivity('Parsing saved source material...');

    try {
      const response = await fetch(`/api/materials/${materialId}/parse`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Material parsing failed.');
      }
      const result = await response.json();
      setActivity(result.message);
      setLatestTaskId(result.task.id);
      setLatestTask(result.task);
      setTasks((current) => [result.task, ...current.filter((task) => task.id !== result.task.id)].slice(0, 8));
      setKnowledgeBaseDetail((current) => ({
        ...current,
        ...(result.knowledgeBase ?? {}),
        materials: [result.material, ...(current.materials ?? []).filter((material) => material.id !== result.material.id)],
        cards: [...(result.cards ?? []), ...(current.cards ?? []).filter((card) => !(result.cards ?? []).some((item) => item.id === card.id))],
        artifacts: result.artifact
          ? [result.artifact, ...(current.artifacts ?? []).filter((artifact) => artifact.id !== result.artifact.id)]
          : current.artifacts ?? [],
      }));
      setKnowledgeBases((current) => result.knowledgeBase
        ? [result.knowledgeBase, ...current.filter((base) => base.id !== result.knowledgeBase.id)]
        : current);
      if (result.artifact) setSelectedArtifact(result.artifact);
      return result;
    } catch {
      setActivity('解析失败，原链接仍已保留，可稍后重试或手动补充正文。');
      return null;
    } finally {
      setParsingMaterialId(null);
    }
  };

  const navItems = [
    { key: 'detail', label: 'Knowledge Base', icon: Database },
    { key: 'library', label: 'Library', icon: FolderOpen },
    { key: 'search', label: 'Search', icon: Search },
    { key: 'assets', label: 'Assets', icon: Layers },
    { key: 'kits', label: 'Insights', icon: Sparkles },
    { key: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <main className="app-frame">
      <aside className="side-nav" aria-label="主导航">
        <div className="brand-row" onClick={() => go('workspace')} role="button" tabIndex={0}>
          <div className="brand-mark" aria-hidden="true"><span /></div>
          <div>
            <h1>知径</h1>
            <p>Knowledge Path</p>
          </div>
        </div>

        <button className="primary-create" onClick={() => go('workspace')} type="button">
          <Plus size={23} />
          New Insight
        </button>

        <nav className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button className={view === item.key ? 'active' : ''} key={item.key} onClick={() => go(item.key)} type="button">
                <Icon size={22} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <section className="kb-stack" aria-label="知识库列表">
          <div className="kb-stack-head">
            <p>Knowledge Bases</p>
            <button className="kb-new-btn" onClick={() => setIsCreateKbOpen(true)} title="新建知识库" type="button">
              <Plus size={16} />
            </button>
          </div>
          {knowledgeBases.length === 0 && <span className="nav-empty">No knowledge bases yet</span>}
          {knowledgeBases.map((base, index) => (
            <button
              className={base.id === selectedKnowledgeBaseId || (!selectedKnowledgeBaseId && (base.active || index === 0)) ? 'selected' : ''}
              key={base.id ?? base.title}
              onClick={() => {
                if (base.id) setSelectedKnowledgeBaseId(base.id);
                go('detail');
              }}
              type="button"
            >
              <strong>{base.title}</strong>
              <span>{formatBaseMeta(base)}</span>
            </button>
          ))}
        </section>

        <div className="side-footer">
          <button type="button"><CircleHelp size={22} />Help</button>
          <button type="button"><LogOut size={22} />Logout</button>
        </div>
      </aside>

      <section className="workspace">
        <header className="top-bar">
          <nav aria-label="工作区导航">
            <button className={view === 'workspace' ? 'active' : ''} onClick={() => go('workspace')} type="button">Path</button>
            <button className={view === 'maps' ? 'active' : ''} onClick={() => go('maps')} type="button">Maps</button>
            <button className={view === 'export' ? 'active' : ''} onClick={() => go('export')} type="button">Archive</button>
          </nav>
          <div className="top-tools">
            <label className="search-pill">
              <Search size={18} />
              <input placeholder="Search..." />
            </label>
            <button title="Notifications" type="button"><Bell size={22} /></button>
            <button title="History" type="button"><History size={22} /></button>
            <button className="node-button" onClick={() => go('workflow')} type="button">Create Node</button>
            <div className="avatar">U</div>
          </div>
        </header>

        <div className="canvas">
          {apiStatus === 'offline' && <SystemNotice status="offline" />}
          {view === 'workspace' && <WorkspaceView activity={activity} isSubmitting={isSubmitting} latestTask={latestTask} materials={materials} query={query} setQuery={setQuery} setView={go} submit={submit} />}
          {view === 'workspace' && <TaskList tasks={tasks} />}
          {view === 'detail' && (
            <DetailView
              apiStatus={apiStatus}
              analytics={knowledgeBaseAnalytics}
              assistantAnswer={assistantAnswer}
              assistantQuestion={assistantQuestion}
              detail={knowledgeBaseDetail}
              isAsking={isAsking}
              latestTask={latestTask}
              onAsk={askKnowledgeBase}
              onOpenArtifact={openArtifact}
              onParseMaterial={parseMaterial}
              parsingMaterialId={parsingMaterialId}
              selectedKnowledgeBaseId={selectedKnowledgeBaseId}
              setAssistantQuestion={setAssistantQuestion}
              setView={go}
            />
          )}
          {view === 'library' && (
            <LibraryView
              apiStatus={apiStatus}
              knowledgeBases={knowledgeBases}
              onCaptureResult={applyIntakeResult}
              onMaterialMutation={applyMaterialMutation}
              onParseMaterial={parseMaterial}
              parsingMaterialId={parsingMaterialId}
            />
          )}
          {view === 'search' && <SearchView />}
          {view === 'kits' && (
            <KitView
              apiStatus={apiStatus}
              isRunningKit={isRunningKit}
              onRunKit={runKnowledgeKit}
              selectedKnowledgeBaseId={selectedKnowledgeBaseId}
              setView={go}
            />
          )}
          {view === 'workflow' && (
            <WorkflowView
              detail={knowledgeBaseDetail}
              isRunningKit={isRunningKit}
              kitRunResult={kitRunResult}
              latestTask={latestTask}
              onOpenArtifact={openArtifact}
              onRunKit={runKnowledgeKit}
              selectedKnowledgeBaseId={selectedKnowledgeBaseId}
              setView={go}
            />
          )}
          {view === 'artifact' && <ArtifactView artifact={selectedArtifact} detail={knowledgeBaseDetail} setView={go} />}
          {view === 'maps' && <MapsView apiStatus={apiStatus} selectedKnowledgeBaseId={selectedKnowledgeBaseId} setView={go} />}
          {view === 'assets' && <GlobalAssetsDashboard data={advancedOpsData} setView={go} />}
          {view === 'synthesis' && <CrossKbSynthesisView data={advancedOpsData} setView={go} />}
          {view === 'compare' && <MultiEntityComparisonView data={advancedOpsData} setView={go} />}
          {view === 'conflicts' && <KnowledgeConflictResolverView data={advancedOpsData} setView={go} />}
          {view === 'chat' && (
            <ChatView
              apiStatus={apiStatus}
              assistantAnswer={assistantAnswer}
              assistantQuestion={assistantQuestion}
              detail={knowledgeBaseDetail}
              isAsking={isAsking}
              onAsk={askKnowledgeBase}
              onOpenArtifact={openArtifact}
              selectedKnowledgeBaseId={selectedKnowledgeBaseId}
              setAssistantQuestion={setAssistantQuestion}
              setView={go}
            />
          )}
          {view === 'recall' && <RecallView detail={knowledgeBaseDetail} setView={go} />}
          {view === 'export' && <ExportView detail={knowledgeBaseDetail} setView={go} />}
          {view === 'settings' && <SettingsView />}
        </div>
      </section>
      {isCreateKbOpen && (
        <CreateKbModal
          onClose={() => setIsCreateKbOpen(false)}
          onSubmit={(theme) => {
            setIsCreateKbOpen(false);
            submit(theme);
          }}
        />
      )}
    </main>
  );
}

function SystemNotice() {
  return (
    <section className="system-notice">
      <CircleX size={21} />
      <div>
        <strong>API 未连接</strong>
        <p>当前页面保留本地演示内容；启动 API 后会自动读取真实知识库、任务和资料。</p>
      </div>
    </section>
  );
}

const CREATE_KB_KITS = [
  { key: 'industry', title: '行业研究', hint: '追踪行业动态与竞争格局', icon: Network },
  { key: 'content', title: '内容创作', hint: '系统化管理选题与素材', icon: FileText },
  { key: 'reading', title: '读书笔记', hint: '结构化提取书中核心观点', icon: BookOpen },
];

function CreateKbModal({ onClose, onSubmit }) {
  const [theme, setTheme] = useState('');
  const handleConfirm = () => {
    const value = theme.trim();
    if (!value) return;
    onSubmit(value);
  };
  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <header className="modal-head">
          <div className="modal-title">
            <Sparkles size={22} />
            <h3>开启新的知识路径</h3>
          </div>
          <button className="modal-close" onClick={onClose} type="button" aria-label="关闭">
            <CircleX size={20} />
          </button>
        </header>
        <div className="modal-body">
          <label className="modal-field">
            <span>主题 / 目标</span>
            <div className="modal-input-row">
              <Search size={18} />
              <input
                autoFocus
                onChange={(event) => setTheme(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleConfirm();
                }}
                placeholder="例如：AI Agent 产品竞品分析"
                type="text"
                value={theme}
              />
            </div>
            <small>输入一个主题、链接或问题，系统将自动创建知识库并开始整理。</small>
          </label>
          <div className="modal-kits">
            <p className="modal-kits-label">推荐路径</p>
            <div className="modal-kit-grid">
              {CREATE_KB_KITS.map((kit) => {
                const Icon = kit.icon;
                return (
                  <button
                    className="modal-kit-card"
                    key={kit.key}
                    onClick={() => onSubmit(kit.title)}
                    type="button"
                  >
                    <Icon size={22} />
                    <strong>{kit.title}</strong>
                    <small>{kit.hint}</small>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <footer className="modal-foot">
          <button className="btn-ghost" onClick={onClose} type="button">取消</button>
          <button className="btn-primary" disabled={!theme.trim()} onClick={handleConfirm} type="button">
            立即开启
          </button>
        </footer>
      </div>
    </div>
  );
}

function WorkspaceView({ activity, isSubmitting, latestTask, materials, query, setQuery, setView, submit }) {
  return (
    <>
      <section className="hero">
        <h2>今天想整理什么？</h2>
        <div className="command-glow">
          <div className="command-box">
            <Sparkles size={27} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submit();
              }}
              placeholder="Enter Theme, Link, or Question..."
              aria-label="输入主题、链接或问题"
            />
            <button disabled={isSubmitting} onClick={submit} type="button"><SquareArrowOutUpRight size={25} /></button>
          </div>
        </div>
        <div className="chip-row">
          <button type="button"># Project Research</button>
          <button type="button"># Daily Notes</button>
          <button type="button">+ More</button>
        </div>
        <p className="activity">{activity}</p>
        <TaskStatus task={latestTask} />
      </section>

      <section className="lower-grid">
        <RecentImports materials={materials} />
        <KnowledgeMapPanel setView={setView} />
      </section>
    </>
  );
}

function TaskList({ tasks }) {
  return (
    <section className="task-panel">
      <div className="section-title">
        <ClipboardList size={22} />
        <h3>Task Queue</h3>
      </div>
      {tasks.length === 0 ? (
        <EmptyState title="暂无任务" body="提交主题、链接或问题后，任务会显示在这里。" />
      ) : (
        <div className="task-list">
          {tasks.slice(0, 6).map((task) => (
            <article className={`task-row ${task.status}`} key={task.id}>
              <span>{task.status}</span>
              <div>
                <strong>{task.workflow}</strong>
                <small>{task.error ?? task.id}</small>
              </div>
              <time>{task.updatedAt ? new Date(task.updatedAt).toLocaleTimeString() : 'now'}</time>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function TaskStatus({ task }) {
  if (!task) return null;
  return (
    <div className={`task-status ${task.status}`}>
      <span>{task.status}</span>
      <strong>{task.workflow}</strong>
      <small>{task.id}</small>
    </div>
  );
}

function EmptyState({ title, body }) {
  return (
    <article className="empty-state">
      <Sparkles size={22} />
      <div>
        <strong>{title}</strong>
        <p>{body}</p>
      </div>
    </article>
  );
}

function MediaPreview({ urls, compact = false }) {
  const mediaUrls = (urls ?? []).filter(Boolean).slice(0, compact ? 4 : 6);
  if (mediaUrls.length === 0) return null;

  return (
    <div className={`media-preview ${compact ? 'compact' : ''}`}>
      {mediaUrls.map((url, index) => (
        <a href={url} key={url} target="_blank" rel="noreferrer" title={`Open media ${index + 1}`}>
          {isImageUrl(url) ? <img alt={`media ${index + 1}`} src={url} loading="lazy" /> : <span>Media {index + 1}</span>}
        </a>
      ))}
    </div>
  );
}

function RecentImports({ materials }) {
  return (
    <article className="recent-panel">
      <div className="section-title">
        <Upload size={22} />
        <h3>Recently Imported</h3>
        <button type="button">View All</button>
      </div>
      <div className="material-list">
        {materials.length === 0 ? (
          <EmptyState title="暂无导入资料" body="导入链接或文本后，最近资料会出现在这里。" />
        ) : materials.map((item) => (
          <article className={`material-card ${item.state}`} key={item.title}>
            <div className="material-meta">
              <span>{item.source}</span>
              <span>{item.status}</span>
              <time>{item.time}</time>
            </div>
            <h4>{item.title}</h4>
            <p>{item.summary}</p>
            <div className="tag-row">{item.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
          </article>
        ))}
      </div>
    </article>
  );
}

function KnowledgeMapPanel({ setView }) {
  return (
    <aside className="map-panel">
      <div className="map-head">
        <div><Network size={22} /><h3>Knowledge Map</h3></div>
        <button aria-label="打开知识地图" onClick={() => setView('maps')} type="button"><SquareArrowOutUpRight size={20} /></button>
      </div>
      <div className="map-card" aria-label="知识地图预览">
        <span className="node core">✣</span>
        <span className="node node-a">Design Systems</span>
        <span className="node node-b">Cognitive Load</span>
        <span className="node node-c">Typography</span>
        <span className="node node-d">Mental Models</span>
      </div>
      <div className="map-footer">
        <div><span>Active Nodes</span><strong>1,204</strong></div>
        <button onClick={() => setView('maps')} type="button">Explore →</button>
      </div>
    </aside>
  );
}

function DetailView({
  apiStatus,
  analytics,
  assistantAnswer,
  assistantQuestion,
  detail,
  isAsking,
  latestTask,
  onAsk,
  onOpenArtifact,
  onParseMaterial,
  parsingMaterialId,
  selectedKnowledgeBaseId,
  setAssistantQuestion,
  setView,
}) {
  const [feedMode, setFeedMode] = useState('feed');
  const cards = detail.cards ?? [];
  const materials = detail.materials ?? [];
  const artifacts = detail.artifacts ?? [];
  const roadmapCards = cards.slice(0, 4);
  const conceptTags = extractConceptTags(cards);
  const cardGroups = groupCardsByType(cards);
  const canAsk = apiStatus === 'online' && Boolean(selectedKnowledgeBaseId) && !isAsking;
  const latestAnswerCards = assistantAnswer?.cards?.slice(0, 2) ?? [];
  const latestCitations = assistantAnswer?.citations ?? [];
  const questionHistory = materials.filter((material) => material.type === 'question').slice(0, 3);
  const totals = analytics?.totals;
  const statusDistribution = analytics?.materialStatusDistribution?.slice(0, 4) ?? [];
  const platformDistribution = analytics?.platformDistribution?.slice(0, 4) ?? [];

  return (
    <section className="page-grid">
      <div className="page-main">
        <p className="breadcrumb">Workspace / {detail.title}</p>
        <div className="page-title-row">
          <div>
            <span className="status-chip">In Progress</span>
            <h2>{detail.title}</h2>
            <p>{detail.summary}</p>
          </div>
          <div className="page-title-actions">
            <button onClick={() => setView('chat')} type="button">Chat</button>
            <button onClick={() => setView('recall')} type="button">Recall</button>
            <button onClick={() => setView('export')} type="button">Export</button>
            <button onClick={() => setView('workflow')} type="button">Run Kit</button>
          </div>
        </div>
        {analytics && (
          <section className="detail-metrics" aria-label="知识库指标">
            <article>
              <span>Sources</span>
              <strong>{totals?.materials ?? materials.length}</strong>
            </article>
            <article>
              <span>Cards</span>
              <strong>{totals?.cards ?? cards.length}</strong>
            </article>
            <article>
              <span>Sourced</span>
              <strong>{formatPercent(analytics.sourcedRatio)}</strong>
            </article>
            <article>
              <span>Tasks</span>
              <strong>{totals?.tasks ?? 0}</strong>
            </article>
          </section>
        )}
        <div className="detail-layout">
          <aside className="roadmap">
            <h3>Roadmap</h3>
            {roadmapCards.map((card, index) => (
              <div className={`roadmap-node ${index === 0 ? 'active' : ''} ${card.claimStatus === 'sourced' ? 'done' : ''}`} key={card.id ?? card.title}>
                <span className="roadmap-index">{index + 1}</span>
                <div className="roadmap-body">
                  <strong>{card.title}</strong>
                  <small>{card.claimStatus === 'sourced' ? 'Sourced from imported material.' : 'AI skeleton, needs sources.'}</small>
                </div>
              </div>
            ))}
          </aside>
          <section className="feed">
            <div className="tabs">
              <button className={feedMode === 'feed' ? 'active' : ''} onClick={() => setFeedMode('feed')} type="button">Structured Feed</button>
              <button className={feedMode === 'cluster' ? 'active' : ''} onClick={() => setFeedMode('cluster')} type="button">Connections</button>
            </div>
            {cards.length === 0 ? (
              <EmptyState title="暂无知识卡片" body="创建主题或导入资料后，这里会生成结构化卡片。" />
            ) : feedMode === 'feed' ? (
              cards.map((card) => (
                <article className={`knowledge-card type-${card.type ?? 'general'}`} key={card.id ?? card.title}>
                  <div className="card-head">
                    <span className="card-type-badge">{card.type ?? 'general'}</span>
                    {card.claimStatus === 'sourced' && (
                      <span className="card-source-badge"><CheckCircle2 size={14} />已溯源</span>
                    )}
                  </div>
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                  <footer>{card.claimStatus} · Updated {card.updatedAt ? new Date(card.updatedAt).toLocaleDateString() : 'today'}</footer>
                </article>
              ))
            ) : (
              <div className="card-cluster">
                {Object.entries(cardGroups).map(([type, group]) => (
                  <section className="cluster-group" key={type}>
                    <header className="cluster-head">
                      <i className={`cluster-type-dot ${type}`} />
                      <strong>{CARD_TYPE_LABELS[type] ?? type}</strong>
                      <small>{group.length} cards</small>
                    </header>
                    {group.map((card) => (
                      <article className={`knowledge-card type-${type}`} key={card.id ?? card.title}>
                        <h3>{card.title}</h3>
                        <p>{card.body}</p>
                        {card.claimStatus === 'sourced' && (
                          <span className="card-source-badge"><CheckCircle2 size={14} />已溯源</span>
                        )}
                      </article>
                    ))}
                  </section>
                ))}
              </div>
            )}
            {cards.length > 0 && conceptTags.length > 0 && (
              <div className="concept-tags">
                <div className="concept-tags-head">
                  <Sparkles size={16} />
                  <strong>Related Concepts</strong>
                </div>
                <div className="concept-tag-list">
                  {conceptTags.map((tag) => (
                    <button className="concept-tag" key={tag} onClick={() => setAssistantQuestion(tag)} type="button">{tag}</button>
                  ))}
                </div>
              </div>
            )}
            {materials.length === 0 && <EmptyState title="暂无来源资料" body="保存链接后，来源会作为可追溯依据显示在这里。" />}
            {materials.map((material) => (
              <article className="source-strip" key={material.id ?? material.title}>
                <BookOpen size={22} />
                <div>
                  <strong>{material.title}</strong>
                  <span>
                    {material.platform ?? material.type ?? 'material'} · {material.parseStatus ?? 'saved'}
                    {materialMediaUrls(material).length > 0 ? ` · ${materialMediaUrls(material).length} media` : ''}
                  </span>
                  <MediaPreview urls={materialMediaUrls(material)} compact />
                </div>
                {material.type === 'link' && (
                  <button
                    disabled={parsingMaterialId === material.id || material.parseStatus === 'parsing' || material.parseStatus === 'ingested'}
                    onClick={() => onParseMaterial(material.id)}
                    type="button"
                  >
                    {material.parseStatus === 'failed' ? 'Retry' : material.parseStatus === 'ingested' ? 'Parsed' : 'Parse'}
                  </button>
                )}
              </article>
            ))}
          </section>
        </div>
      </div>
      <aside className="assistant-panel">
        <h3>AI Assistant</h3>
        <p>当前知识库有 {detail.sourceCount ?? materials.length} 条资料、{detail.cardCount ?? cards.length} 张卡片。</p>
        {analytics && (
          <section className="source-health">
            <div>
              <strong>Source Health</strong>
              <span>{analytics.generatedAt ? new Date(analytics.generatedAt).toLocaleTimeString() : 'now'}</span>
            </div>
            <div className="health-list">
              {statusDistribution.map((item) => (
                <p key={item.name}><span>{item.name}</span><strong>{item.count}</strong></p>
              ))}
            </div>
            <div className="health-list muted">
              {platformDistribution.map((item) => (
                <p key={item.name}><span>{item.name}</span><strong>{item.count}</strong></p>
              ))}
            </div>
          </section>
        )}
        <TaskStatus task={latestTask} />
        <div className="assistant-thread">
          <div className="assistant-message">
            <Sparkles size={19} />
            <p>{artifacts[0]?.body ?? '我会基于当前知识库里的资料和卡片回答问题。'}</p>
          </div>
          {assistantAnswer?.question && <div className="chat-user">{assistantAnswer.question}</div>}
          {assistantAnswer?.loading && <div className="assistant-message pending"><Clock3 size={19} /><p>正在整理当前知识库里的资料和卡片...</p></div>}
          {assistantAnswer?.error && <div className="assistant-message failed"><CircleX size={19} /><p>{assistantAnswer.error}</p></div>}
          {assistantAnswer?.message && (
            <div className="assistant-message">
              <Sparkles size={19} />
              <div>
                <p>{assistantAnswer.artifact?.body ?? assistantAnswer.message}</p>
                {latestAnswerCards.length > 0 && (
                  <div className="answer-card-list">
                    {latestAnswerCards.map((card) => (
                      <article key={card.id ?? card.title}>
                        <span>{card.type}</span>
                        <strong>{card.title}</strong>
                      </article>
                    ))}
                  </div>
                )}
                {assistantAnswer.citations && (
                  <div className="citation-list">
                    <strong>引用来源</strong>
                    {latestCitations.length === 0 ? (
                      <p>当前回答没有可用来源，属于 AI 骨架内容。</p>
                    ) : latestCitations.slice(0, 6).map((citation) => (
                      <article key={citation.id}>
                        <span>{citation.kind}</span>
                        <div>
                          <strong>{citation.title}</strong>
                          <p>{citation.preview}</p>
                          {citation.sourceUrl && <a href={citation.sourceUrl} target="_blank" rel="noreferrer">Open source</a>}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
                {assistantAnswer.artifact && (
                  <button className="assistant-link-button" onClick={() => onOpenArtifact(assistantAnswer.artifact)} type="button">
                    Open Artifact
                    <SquareArrowOutUpRight size={15} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        {questionHistory.length > 0 && (
          <section className="question-history" aria-label="最近问题">
            <div className="question-history-head">
              <History size={16} />
              <strong>Recent Questions</strong>
            </div>
            {questionHistory.map((material) => (
              <button key={material.id ?? material.title} onClick={() => setAssistantQuestion(material.rawInput ?? material.title)} type="button">
                {material.rawInput ?? material.title}
              </button>
            ))}
          </section>
        )}
        <div className="assistant-input">
          <input
            aria-label="向当前知识库提问"
            disabled={!canAsk}
            onChange={(event) => setAssistantQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') onAsk();
            }}
            placeholder={apiStatus === 'online' && selectedKnowledgeBaseId ? 'Ask this knowledge base...' : 'Select a synced knowledge base first'}
            value={assistantQuestion}
          />
          <button disabled={!canAsk || !assistantQuestion.trim()} onClick={onAsk} title="Ask" type="button">
            <Send size={18} />
          </button>
        </div>
      </aside>
    </section>
  );
}

function ChatView({
  apiStatus,
  assistantAnswer,
  assistantQuestion,
  detail,
  isAsking,
  onAsk,
  onOpenArtifact,
  selectedKnowledgeBaseId,
  setAssistantQuestion,
  setView,
}) {
  const cards = detail.cards ?? [];
  const materials = detail.materials ?? [];
  const latestAnswerCards = assistantAnswer?.cards?.slice(0, 3) ?? [];
  const latestCitations = assistantAnswer?.citations ?? [];
  const canAsk = apiStatus === 'online' && Boolean(selectedKnowledgeBaseId) && !isAsking;
  const starterPrompts = [
    '这个知识库最重要的三个概念是什么？',
    '有哪些内容还缺少可靠来源？',
    '帮我把这些资料整理成一个行动清单。',
  ];

  return (
    <section className="page-main full">
      <div className="chat-workbench">
        <aside className="chat-context-panel">
          <button className="back-button" onClick={() => setView('detail')} type="button">← Back to Knowledge Base</button>
          <span>Knowledge Chat</span>
          <h2>{detail.title}</h2>
          <p>{detail.summary}</p>
          <div className="chat-context-stats">
            <div><strong>{materials.length}</strong><span>sources</span></div>
            <div><strong>{cards.length}</strong><span>cards</span></div>
            <div><strong>{formatPercent(detail.sourcedRatio)}</strong><span>sourced</span></div>
          </div>
          <div className="prompt-stack">
            <strong>Suggested Questions</strong>
            {starterPrompts.map((prompt) => (
              <button key={prompt} onClick={() => setAssistantQuestion(prompt)} type="button">{prompt}</button>
            ))}
          </div>
        </aside>

        <section className="chat-main-panel">
          <div className="chat-thread-head">
            <Sparkles size={24} />
            <div>
              <span>Assistant Onboarding</span>
              <h3>Ask from your sourced knowledge</h3>
            </div>
          </div>
          <div className="chat-conversation">
            <div className="assistant-message">
              <Sparkles size={19} />
              <p>我会优先使用当前知识库里的资料和卡片回答；没有来源时会明确标注。</p>
            </div>
            {assistantAnswer?.question && <div className="chat-user">{assistantAnswer.question}</div>}
            {assistantAnswer?.loading && <div className="assistant-message pending"><Clock3 size={19} /><p>正在整理当前知识库里的资料和卡片...</p></div>}
            {assistantAnswer?.error && <div className="assistant-message failed"><CircleX size={19} /><p>{assistantAnswer.error}</p></div>}
            {assistantAnswer?.message && (
              <div className="assistant-message">
                <Sparkles size={19} />
                <div>
                  <p>{assistantAnswer.artifact?.body ?? assistantAnswer.message}</p>
                  {latestAnswerCards.length > 0 && (
                    <div className="answer-card-list">
                      {latestAnswerCards.map((card) => (
                        <article key={card.id ?? card.title}>
                          <span>{card.type}</span>
                          <strong>{card.title}</strong>
                        </article>
                      ))}
                    </div>
                  )}
                  <div className="citation-list">
                    <strong>引用来源</strong>
                    {latestCitations.length === 0 ? (
                      <p>当前回答没有可用来源，属于 AI 骨架内容。</p>
                    ) : latestCitations.slice(0, 6).map((citation) => (
                      <article key={citation.id}>
                        <span>{citation.kind}</span>
                        <div>
                          <strong>{citation.title}</strong>
                          <p>{citation.preview}</p>
                          {citation.sourceUrl && <a href={citation.sourceUrl} target="_blank" rel="noreferrer">Open source</a>}
                        </div>
                      </article>
                    ))}
                  </div>
                  {assistantAnswer.artifact && (
                    <button className="assistant-link-button" onClick={() => onOpenArtifact(assistantAnswer.artifact)} type="button">
                      Open Artifact
                      <SquareArrowOutUpRight size={15} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="chat-input-bar">
            <input
              aria-label="在独立对话页提问"
              disabled={!canAsk}
              onChange={(event) => setAssistantQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') onAsk();
              }}
              placeholder={canAsk ? 'Ask this knowledge base...' : 'Select a knowledge base and keep API online to ask.'}
              value={assistantQuestion}
            />
            <button disabled={!canAsk || !assistantQuestion.trim()} onClick={onAsk} type="button">
              {isAsking ? <Clock3 size={18} /> : <Send size={18} />}
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}

function RecallView({ detail, setView }) {
  const cards = detail.cards ?? [];
  const [activeIndex, setActiveIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const activeCard = cards[activeIndex];

  function nextCard() {
    setActiveIndex((current) => cards.length ? (current + 1) % cards.length : 0);
    setRevealed(false);
  }

  return (
    <section className="page-main full">
      <div className="recall-workbench">
        <div className="recall-head">
          <button className="back-button" onClick={() => setView('detail')} type="button">← Back to Knowledge Base</button>
          <span>Active Recall</span>
          <h2>{detail.title}</h2>
          <p>把知识卡片转成自测队列：先回忆，再揭示答案，最后进入下一张。</p>
        </div>

        {cards.length === 0 ? (
          <EmptyState title="暂无可练习卡片" body="导入资料或创建主题后，知识卡片会成为主动回忆题目。" />
        ) : (
          <div className="recall-layout">
            <aside className="recall-queue">
              <strong>Practice Queue</strong>
              {cards.slice(0, 8).map((card, index) => (
                <button className={index === activeIndex ? 'active' : ''} key={card.id ?? card.title} onClick={() => {
                  setActiveIndex(index);
                  setRevealed(false);
                }} type="button">
                  <span>{index + 1}</span>
                  <div>
                    <strong>{card.title}</strong>
                    <small>{card.type} · {card.claimStatus}</small>
                  </div>
                </button>
              ))}
            </aside>

            <article className="recall-card">
              <span>{activeCard.type}</span>
              <h3>{activeCard.title}</h3>
              <p className={revealed ? '' : 'recall-prompt'}>{revealed ? activeCard.body : '先合上资料，用自己的话解释这张卡片。准备好后再揭示参考答案。'}</p>
              <footer>
                <button onClick={() => setRevealed((current) => !current)} type="button">
                  {revealed ? 'Hide Answer' : 'Reveal Answer'}
                </button>
                <button onClick={nextCard} type="button">
                  Next Card
                  <RefreshCw size={16} />
                </button>
              </footer>
            </article>
          </div>
        )}
      </div>
    </section>
  );
}

function ExportView({ detail, setView }) {
  const [format, setFormat] = useState('markdown');
  const [scope, setScope] = useState('all');
  const [includeArtifacts, setIncludeArtifacts] = useState(true);
  const [exportState, setExportState] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [lastExport, setLastExport] = useState(null);
  const materials = detail.materials ?? [];
  const cards = detail.cards ?? [];
  const artifacts = detail.artifacts ?? [];
  const options = {
    includeMaterials: scope === 'all' || scope === 'materials',
    includeCards: scope === 'all' || scope === 'cards',
    includeArtifacts,
  };
  const exportRows = [
    { label: 'Knowledge cards', value: options.includeCards ? cards.length : 0 },
    { label: 'Source materials', value: options.includeMaterials ? materials.length : 0 },
    { label: 'Artifacts', value: options.includeArtifacts ? artifacts.length : 0 },
  ];

  useEffect(() => {
    if (exportState !== 'running') return undefined;
    setProgress(18);
    const steps = [38, 64, 86, 100];
    const timers = steps.map((value, index) => window.setTimeout(() => {
      setProgress(value);
      if (value === 100) setExportState('success');
    }, 260 * (index + 1)));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [exportState]);

  function buildExport() {
    const extension = format === 'json' ? 'json' : 'md';
    const filename = `${safeFilename(detail.title)}-export.${extension}`;
    const content = format === 'json'
      ? knowledgeBaseExportJson(detail, options)
      : knowledgeBaseMarkdown(detail, options);
    const type = format === 'json' ? 'application/json;charset=utf-8' : 'text/markdown;charset=utf-8';
    return { filename, content, type };
  }

  function startExport() {
    setLastExport(buildExport());
    setExportState('running');
    setProgress(0);
  }

  function downloadLastExport() {
    const prepared = lastExport ?? buildExport();
    downloadTextFile(prepared.filename, prepared.content, prepared.type);
    setLastExport(prepared);
  }

  function downloadBackup() {
    downloadTextFile(
      `${safeFilename(detail.title)}-backup.json`,
      knowledgeBaseExportJson(detail, { includeMaterials: true, includeCards: true, includeArtifacts: true }),
      'application/json;charset=utf-8',
    );
  }

  return (
    <section className="page-main full">
      <div className="export-workbench">
        <div className="export-head">
          <div>
            <span>Export Management</span>
            <h2>Archive current knowledge base</h2>
            <p>把当前知识库导出为 Markdown 或 JSON。第一版先做本地下载，后续再接导出历史和云端备份。</p>
          </div>
          <div className="export-head-actions">
            <button onClick={() => setView('detail')} type="button">Back</button>
            <button onClick={downloadBackup} type="button">
              <PackageCheck size={18} />
              Backup JSON
            </button>
          </div>
        </div>

        <div className="export-grid">
          <section className="export-config-panel">
            <div className="panel-title">
              <Download size={20} />
              <div>
                <span>Export Configuration</span>
                <h4>格式与范围</h4>
              </div>
            </div>
            <div className="export-option-grid">
              {[
                { key: 'markdown', label: 'Markdown', body: 'For PKM tools and readable archives.' },
                { key: 'json', label: 'JSON', body: 'Raw structured backup for later import.' },
              ].map((option) => (
                <button className={format === option.key ? 'active' : ''} key={option.key} onClick={() => setFormat(option.key)} type="button">
                  <strong>{option.label}</strong>
                  <span>{option.body}</span>
                </button>
              ))}
            </div>
            <div className="export-scope-row">
              {[
                { key: 'all', label: 'All assets' },
                { key: 'cards', label: 'Cards only' },
                { key: 'materials', label: 'Materials only' },
              ].map((option) => (
                <button className={scope === option.key ? 'active' : ''} key={option.key} onClick={() => setScope(option.key)} type="button">
                  {option.label}
                </button>
              ))}
            </div>
            <label className="export-checkbox">
              <input checked={includeArtifacts} onChange={(event) => setIncludeArtifacts(event.target.checked)} type="checkbox" />
              Include generated artifacts
            </label>
          </section>

          <section className="export-progress-panel">
            <div className="panel-title">
              <ClipboardList size={20} />
              <div>
                <span>Export Progress</span>
                <h4>{exportState === 'success' ? '导出已准备好' : exportState === 'running' ? '正在打包知识资产' : '等待开始'}</h4>
              </div>
            </div>
            <div className="export-progress-bar"><span style={{ width: `${progress}%` }} /></div>
            <div className="export-counts">
              {exportRows.map((row) => (
                <div key={row.label}>
                  <strong>{row.value}</strong>
                  <span>{row.label}</span>
                </div>
              ))}
            </div>
            {exportState === 'success' ? (
              <div className="export-success-card">
                <CheckCircle2 size={26} />
                <div>
                  <strong>导出成功</strong>
                  <p>{lastExport?.filename ?? 'Export file'} 已生成，可以下载到本地。</p>
                </div>
              </div>
            ) : (
              <p>配置完成后开始导出。当前流程不会上传任何内容，只会在本地生成文件。</p>
            )}
          </section>
        </div>

        <section className="export-history-panel">
          <div className="panel-title">
            <History size={20} />
            <div>
              <span>Export History</span>
              <h4>本次导出</h4>
            </div>
          </div>
          <div className="export-history-row">
            <div>
              <strong>{lastExport?.filename ?? `${safeFilename(detail.title)}-export.${format === 'json' ? 'json' : 'md'}`}</strong>
              <span>{format.toUpperCase()} · {scope} · {new Date().toLocaleDateString()}</span>
            </div>
            <div className="export-actions">
              <button disabled={exportState === 'running'} onClick={startExport} type="button">
                {exportState === 'running' ? 'Exporting' : 'Start Export'}
              </button>
              <button disabled={exportState !== 'success'} onClick={downloadLastExport} type="button">
                Download
              </button>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}

function AdvancedOpsTabs({ active, setView }) {
  const tabs = [
    { key: 'assets', label: 'Assets', icon: Layers },
    { key: 'synthesis', label: 'Synthesis', icon: Network },
    { key: 'compare', label: 'Compare', icon: ListChecks },
    { key: 'conflicts', label: 'Conflicts', icon: AlertTriangle },
  ];

  return (
    <div className="advanced-tabs" aria-label="高级知识操作">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button className={active === tab.key ? 'active' : ''} key={tab.key} onClick={() => setView(tab.key)} type="button">
            <Icon size={18} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function GlobalAssetsDashboard({ data, setView }) {
  const metrics = [
    { label: 'Knowledge bases', value: data.totals.knowledgeBases, body: '主题知识库' },
    { label: 'Materials', value: data.totals.materials, body: '来源资料' },
    { label: 'Cards', value: data.totals.cards, body: '结构化卡片' },
    { label: 'Artifacts', value: data.totals.artifacts, body: '生成产物' },
    { label: 'Tasks', value: data.totals.tasks, body: '近期任务' },
    { label: 'Sourced cards', value: data.totals.sourcedCards, body: '有来源支撑' },
    { label: 'Needs review', value: data.totals.reviewMaterials, body: '等待复核' },
    { label: 'Duplicate signals', value: data.totals.duplicateSignals, body: '疑似重复' },
  ];

  return (
    <section className="page-main full advanced-page">
      <div className="advanced-head">
        <div>
          <span>Global Assets</span>
          <h2>Knowledge asset dashboard</h2>
          <p>把所有知识库、来源资料、卡片、产物和任务聚合到一个资产视角，先用于盘点和发现风险。</p>
        </div>
        <button onClick={() => setView('library')} type="button">Open Library</button>
      </div>
      <AdvancedOpsTabs active="assets" setView={setView} />

      <div className="advanced-metric-grid">
        {metrics.map((metric) => (
          <article className="advanced-metric-card" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.body}</small>
          </article>
        ))}
      </div>

      <div className="advanced-panel-grid">
        <section className="advanced-panel">
          <div className="panel-title">
            <Database size={20} />
            <div>
              <span>Source Materials</span>
              <h4>最近资料</h4>
            </div>
          </div>
          {data.allMaterials.length === 0 ? (
            <EmptyState title="暂无资料资产" body="导入链接或文本后，会在这里汇总全局资料。" />
          ) : (
            <div className="asset-list">
              {data.allMaterials.slice(0, 5).map((item, index) => (
                <article key={item.id ?? `${item.title}-${index}`}>
                  <span>{item.platform ?? item.source ?? item.type ?? 'material'}</span>
                  <strong>{item.title}</strong>
                  <small>{statusLabels[item.parseStatus] ?? item.status ?? 'saved'} · {formatMaterialTime(item.createdAt)}</small>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="advanced-panel">
          <div className="panel-title">
            <Layers size={20} />
            <div>
              <span>Knowledge Cards</span>
              <h4>证据状态</h4>
            </div>
          </div>
          {data.allCards.length === 0 ? (
            <EmptyState title="暂无知识卡片" body="生成主题或解析资料后，卡片会成为跨库操作的基础。" />
          ) : (
            <div className="asset-list">
              {data.allCards.slice(0, 5).map((card, index) => (
                <article key={card.id ?? `${card.title}-${index}`}>
                  <span>{card.type ?? 'card'}</span>
                  <strong>{card.title}</strong>
                  <small>{card.claimStatus ?? 'draft'}</small>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="advanced-panel advanced-wide-panel">
          <div className="panel-title">
            <FileText size={20} />
            <div>
              <span>Generated Artifacts</span>
              <h4>产物资产</h4>
            </div>
          </div>
          {data.allArtifacts.length === 0 ? (
            <EmptyState title="暂无生成产物" body="运行 Kit 或提问后，研究摘要、主题库和行动清单会进入这里。" />
          ) : (
            <div className="artifact-strip-list">
              {data.allArtifacts.slice(0, 4).map((artifact, index) => (
                <article key={artifact.id ?? `${artifact.title}-${index}`}>
                  <div>
                    <strong>{artifact.title}</strong>
                    <span>{artifact.type ?? 'artifact'} · {artifact.sections?.length ?? 0} sections</span>
                  </div>
                  <button onClick={() => setView('artifact')} type="button">Open</button>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

function CrossKbSynthesisView({ data, setView }) {
  return (
    <section className="page-main full advanced-page">
      <div className="advanced-head">
        <div>
          <span>Cross-KB Synthesis</span>
          <h2>Find themes across knowledge bases</h2>
          <p>用主题重叠、资料密度和卡片证据做跨库综合的入口，后续可接 Pi 生成正式综合报告。</p>
        </div>
        <button onClick={() => setView('compare')} type="button">Compare</button>
      </div>
      <AdvancedOpsTabs active="synthesis" setView={setView} />

      {data.crossKbThemes.length === 0 ? (
        <EmptyState title="暂无跨库主题" body="至少需要两个知识库或更多卡片后，系统才能形成可综合的主题线索。" />
      ) : (
        <div className="synthesis-grid">
          {data.crossKbThemes.map((theme, index) => (
            <article className="synthesis-card" key={`${theme.left.id ?? theme.left.title}-${theme.right.id ?? theme.right.title}-${index}`}>
              <div className="synthesis-card-head">
                <span>Theme {index + 1}</span>
                <strong>{theme.score || theme.overlap.length} overlap</strong>
              </div>
              <h3>{theme.left.title} × {theme.right.title}</h3>
              <p>把两个知识库的重叠关键词先汇成一个候选综合主题，适合生成对比摘要、研究问题或专题文档。</p>
              <div className="overlap-chip-row">
                {(theme.overlap.length ? theme.overlap : ['concept', 'source', 'review']).slice(0, 6).map((token) => (
                  <span key={token}>{token}</span>
                ))}
              </div>
              <footer>
                <button onClick={() => setView('artifact')} type="button">Draft artifact</button>
                <button onClick={() => setView('conflicts')} type="button">Check conflicts</button>
              </footer>
            </article>
          ))}
        </div>
      )}

      <section className="advanced-panel synthesis-plan">
        <div className="panel-title">
          <Sparkles size={20} />
          <div>
            <span>Synthesis Plan</span>
            <h4>建议的综合产物结构</h4>
          </div>
        </div>
        <div className="synthesis-step-list">
          {['共同概念', '分歧观点', '证据来源', '可行动问题'].map((step, index) => (
            <article key={step}>
              <span>{index + 1}</span>
              <strong>{step}</strong>
              <p>从当前卡片和资料里提取候选内容，先形成只读预览，之后再接生成和保存。</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

function MultiEntityComparisonView({ data, setView }) {
  const rows = data.comparisonEntities;

  return (
    <section className="page-main full advanced-page">
      <div className="advanced-head">
        <div>
          <span>Entity Comparison</span>
          <h2>Compare knowledge entities</h2>
          <p>把知识库当作第一版可比较实体，展示资料量、卡片量、产物量和来源健康度。</p>
        </div>
        <button onClick={() => setView('synthesis')} type="button">Synthesize</button>
      </div>
      <AdvancedOpsTabs active="compare" setView={setView} />

      {rows.length === 0 ? (
        <EmptyState title="暂无可对比实体" body="创建知识库后，会自动出现第一批对比维度。" />
      ) : (
        <section className="comparison-board">
          <div className="comparison-header">
            <span>Entity</span>
            <span>Materials</span>
            <span>Cards</span>
            <span>Artifacts</span>
            <span>Source health</span>
          </div>
          {rows.map((row) => (
            <article className="comparison-row" key={row.id}>
              <div>
                <strong>{row.title}</strong>
                <small>{row.materials + row.cards + row.artifacts} total assets</small>
              </div>
              <span>{row.materials}</span>
              <span>{row.cards}</span>
              <span>{row.artifacts}</span>
              <div className="health-cell">
                <div className="health-bar"><span style={{ width: `${Math.min(row.health, 100)}%` }} /></div>
                <small>{row.health}%</small>
              </div>
            </article>
          ))}
        </section>
      )}

      <div className="comparison-insight-grid">
        <article>
          <ShieldCheck size={20} />
          <strong>对比口径</strong>
          <p>当前阶段按知识库粒度比较，后续可升级到人物、品牌、概念或平台实体。</p>
        </article>
        <article>
          <Network size={20} />
          <strong>下一步综合</strong>
          <p>对比结果可以作为跨库综合的输入，生成差异、共性和待验证问题。</p>
        </article>
      </div>
    </section>
  );
}

function KnowledgeConflictResolverView({ data, setView }) {
  const typeLabelsMap = {
    duplicate_material: 'Duplicate material',
    duplicate_card: 'Duplicate card',
    needs_review: 'Needs review',
    unsourced_card: 'Unsourced card',
  };
  const severityLabels = {
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  };

  return (
    <section className="page-main full advanced-page">
      <div className="advanced-head">
        <div>
          <span>Conflict Resolver</span>
          <h2>Review knowledge conflicts</h2>
          <p>集中展示重复、缺来源和需要复核的信号。当前只给处理建议，不会直接修改资料或卡片。</p>
        </div>
        <button onClick={() => setView('library')} type="button">Review library</button>
      </div>
      <AdvancedOpsTabs active="conflicts" setView={setView} />

      {data.conflictSignals.length === 0 ? (
        <EmptyState title="暂未发现明显冲突" body="继续导入资料后，重复来源、失败解析和缺来源卡片会出现在这里。" />
      ) : (
        <div className="conflict-grid">
          {data.conflictSignals.map((signal, index) => (
            <article className={`conflict-card severity-${signal.severity}`} key={`${signal.type}-${signal.title}-${index}`}>
              <div className="conflict-card-head">
                <span>{typeLabelsMap[signal.type] ?? signal.type}</span>
                <strong>{severityLabels[signal.severity] ?? signal.severity}</strong>
              </div>
              <h3>{signal.title}</h3>
              <p>{conflictBody(signal)}</p>
              <div className="conflict-actions">
                <button onClick={() => setView(signal.type === 'unsourced_card' ? 'detail' : 'library')} type="button">
                  Review
                </button>
                <button disabled type="button">Auto resolve</button>
              </div>
            </article>
          ))}
        </div>
      )}

      <section className="advanced-panel conflict-note">
        <div className="panel-title">
          <AlertTriangle size={20} />
          <div>
            <span>Read-only Guard</span>
            <h4>处理策略</h4>
          </div>
        </div>
        <p>这个界面暂时只做冲突定位和人工复核入口。自动合并、删除、重写卡片会放到后续有审计记录的数据治理流程里。</p>
      </section>
    </section>
  );
}

function conflictBody(signal) {
  if (signal.type === 'duplicate_material') return `${signal.count} 条资料可能来自同一链接或同一段内容，建议先核对来源再合并。`;
  if (signal.type === 'duplicate_card') return `${signal.count} 张卡片标题相近，建议保留证据最完整的一张。`;
  if (signal.type === 'needs_review') return '资料解析或内容补全需要人工复核，确认后再生成卡片。';
  if (signal.type === 'unsourced_card') return '这张卡片缺少明确来源，建议补充引用或降级为草稿。';
  return '建议先进入来源或知识库详情页人工确认。';
}

function LibraryView({ apiStatus, knowledgeBases, onCaptureResult, onMaterialMutation, onParseMaterial, parsingMaterialId }) {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchValue, setSearchValue] = useState('');
  const [captureValue, setCaptureValue] = useState('');
  const [captureMode, setCaptureMode] = useState('auto');
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewDraft, setReviewDraft] = useState({ title: '', contentText: '', mediaUrls: '' });
  const [assignDrafts, setAssignDrafts] = useState({});
  const [newBaseTitles, setNewBaseTitles] = useState({});
  const [assignmentHints, setAssignmentHints] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isImportingFile, setIsImportingFile] = useState(false);
  const [mutatingMaterialId, setMutatingMaterialId] = useState(null);
  const [status, setStatus] = useState('Loading materials...');
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState(null);
  const [batchAssignTarget, setBatchAssignTarget] = useState('');
  const [captureSummary, setCaptureSummary] = useState(null);
  useEffect(() => {
    if (!captureSummary) return undefined;
    const timer = setTimeout(() => setCaptureSummary(null), 9000);
    return () => clearTimeout(timer);
  }, [captureSummary]);

  async function loadMaterials() {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: '180' });
      if (searchValue.trim()) params.set('q', searchValue.trim());
      const response = await fetch(`/api/materials?${params.toString()}`);
      if (!response.ok) throw new Error('Material list unavailable.');
      const result = await response.json();
      setItems(result.materials ?? []);
      setStatus('Materials synced.');
    } catch {
      setStatus('API 未连接，暂时无法读取真实资料库。');
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ limit: '180' });
        if (searchValue.trim()) params.set('q', searchValue.trim());
        const response = await fetch(`/api/materials?${params.toString()}`);
        if (!response.ok) throw new Error('Material list unavailable.');
        const result = await response.json();
        if (!cancelled) {
          setItems(result.materials ?? []);
          setStatus('Materials synced.');
        }
      } catch {
        if (!cancelled) {
          setStatus('API 未连接，暂时无法读取真实资料库。');
          setItems([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [searchValue]);

  const filteredItems = items.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'failed' || filter === 'parsing') return item.parseStatus === filter;
    return item.type === filter;
  });

  const visibleIds = filteredItems.map((item) => item.id);
  const selectedVisibleCount = visibleIds.filter((id) => selectedIds.has(id)).length;
  const allVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;
  const someVisibleSelected = selectedVisibleCount > 0 && !allVisibleSelected;

  function toggleMaterialSelection(id) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllVisible() {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        for (const id of visibleIds) next.delete(id);
      } else {
        for (const id of visibleIds) next.add(id);
      }
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  const counts = items.reduce((acc, item) => {
    acc.total += 1;
    acc[item.type] = (acc[item.type] ?? 0) + 1;
    acc[item.parseStatus] = (acc[item.parseStatus] ?? 0) + 1;
    return acc;
  }, { total: 0 });

  const lifecycleStats = useMemo(() => {
    const sources = new Map();
    let duplicateSignals = 0;
    for (const item of items) {
      const key = (item.sourceUrl || item.rawInput || item.title || '').trim().toLowerCase();
      if (!key) continue;
      const next = (sources.get(key) ?? 0) + 1;
      sources.set(key, next);
      if (next === 2) duplicateSignals += 1;
    }
    return {
      total: items.length,
      saved: counts.saved ?? 0,
      parsing: counts.parsing ?? 0,
      needsReview: counts.needs_review ?? 0,
      failed: counts.failed ?? 0,
      ingested: counts.ingested ?? 0,
      media: items.reduce((sum, item) => sum + materialMediaUrls(item).length, 0),
      duplicateSignals,
      recent: items.slice(0, 4),
      reviewItems: items.filter((item) => item.parseStatus === 'needs_review' || item.parseStatus === 'failed').slice(0, 3),
    };
  }, [items, counts.failed, counts.ingested, counts.needs_review, counts.parsing, counts.saved]);

  async function capture() {
    const value = captureValue.trim();
    if (!value || isCapturing || apiStatus !== 'online') return;
    setIsCapturing(true);
    const batchItems = captureMode === 'batch' ? splitBatchCaptureInput(value) : [];
    setStatus(captureMode === 'batch' ? 'Capturing batch...' : 'Capturing material...');
    try {
      if (captureMode === 'batch') {
        if (batchItems.length === 0) throw new Error('Empty batch.');
        let captured = 0;
        let failed = 0;
        let lastResult = null;
        for (const input of batchItems) {
          const response = await fetch('/api/intake', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input }),
          });
          if (response.ok) {
            lastResult = await response.json();
            captured += 1;
          } else {
            failed += 1;
          }
        }
        if (lastResult) onCaptureResult(lastResult);
        setCaptureValue('');
        setStatus(failed ? `${captured} 条已收集，${failed} 条失败。` : `${captured} 条资料已进入收集队列。`);
        setCaptureSummary({ message: failed ? `${captured} 条已收集，${failed} 条失败。` : `${captured} 条资料已进入收集队列`, count: captured, at: Date.now() });
        await loadMaterials();
        return;
      }
      const response = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: value }),
      });
      if (!response.ok) throw new Error('Capture failed.');
      const result = await response.json();
      onCaptureResult(result);
      setCaptureValue('');
      setStatus(result.message);
      setCaptureSummary({ message: result.message || '资料已进入收集队列', count: 1, at: Date.now() });
      await loadMaterials();
    } catch {
      setStatus('收集失败，请确认 API 正在运行。');
    } finally {
      setIsCapturing(false);
    }
  }

  async function importTextFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || isImportingFile) return;
    if (apiStatus !== 'online') {
      setStatus('API 未连接，暂时无法导入本地文档。');
      return;
    }
    const lowerName = file.name.toLowerCase();
    const isSupported = supportedImportExtensions.some((extension) => lowerName.endsWith(extension));
    if (!isSupported) {
      setStatus('目前仅支持 Markdown / TXT 文本文档导入。');
      return;
    }
    if (file.size > maxImportedFileSize) {
      setStatus('文档过大，请先拆分到 2MB 以内再导入。');
      return;
    }
    setIsImportingFile(true);
    setStatus('Importing local document...');
    try {
      const text = (await file.text()).trim();
      if (!text) throw new Error('Empty file.');
      const response = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: `本地文档：${file.name}\n\n${text}` }),
      });
      if (!response.ok) throw new Error('File import failed.');
      const result = await response.json();
      onCaptureResult(result);
      setStatus(result.message);
      setCaptureSummary({ message: result.message || '本地文档已进入收集队列', count: 1, at: Date.now() });
      await loadMaterials();
    } catch {
      setStatus('导入本地文档失败，请确认文件内容可读取。');
    } finally {
      setIsImportingFile(false);
    }
  }

  async function parseFromLibrary(materialId) {
    if (!onParseMaterial) return;
    await onParseMaterial(materialId);
    await loadMaterials();
  }

  function openReview(item) {
    setReviewingId((current) => current === item.id ? null : item.id);
    setReviewDraft({
      title: item.title ?? '',
      contentText: item.contentText ?? '',
      mediaUrls: (materialMediaUrls(item) ?? []).join('\n'),
    });
  }

  async function saveReview(item, markIngested) {
    if (!item?.id || apiStatus !== 'online' || mutatingMaterialId) return;
    setMutatingMaterialId(item.id);
    setStatus(markIngested ? 'Completing material...' : 'Saving review draft...');
    try {
      const response = await fetch(`/api/materials/${item.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: reviewDraft.title,
          contentText: reviewDraft.contentText,
          mediaUrls: splitMediaUrls(reviewDraft.mediaUrls),
          markIngested,
        }),
      });
      if (!response.ok) throw new Error('Review save failed.');
      const result = await response.json();
      onMaterialMutation?.(result);
      setStatus(result.message);
      if (markIngested) setReviewingId(null);
      await loadMaterials();
    } catch {
      setStatus('保存补全内容失败，请确认 API 正在运行。');
    } finally {
      setMutatingMaterialId(null);
    }
  }

  async function assignMaterial(item) {
    if (!item?.id || apiStatus !== 'online' || mutatingMaterialId) return;
    const target = assignDrafts[item.id] ?? item.knowledgeBaseId ?? '';
    const newKnowledgeBaseTitle = (newBaseTitles[item.id] ?? item.title ?? '').trim();
    if (!target || (target === item.knowledgeBaseId && target !== '__new')) return;
    setMutatingMaterialId(item.id);
    setStatus('Updating material assignment...');
    try {
      const response = await fetch(`/api/materials/${item.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(target === '__new'
          ? { newKnowledgeBaseTitle }
          : { knowledgeBaseId: target }),
      });
      if (!response.ok) throw new Error('Assignment failed.');
      const result = await response.json();
      onMaterialMutation?.(result);
      setStatus(result.message);
      setAssignDrafts((current) => ({ ...current, [item.id]: result.knowledgeBase.id }));
      await loadMaterials();
    } catch {
      setStatus('移动资料失败，请确认目标知识库可用。');
    } finally {
      setMutatingMaterialId(null);
    }
  }

  async function suggestAssignment(item) {
    if (!item?.id || apiStatus !== 'online' || mutatingMaterialId) return;
    setMutatingMaterialId(item.id);
    setStatus('Finding assignment suggestion...');
    try {
      const response = await fetch(`/api/materials/${item.id}/assignment-suggestions`);
      if (!response.ok) throw new Error('Suggestion failed.');
      const result = await response.json();
      const suggestion = result.suggestions?.[0];
      if (suggestion?.isNew) {
        setAssignDrafts((current) => ({ ...current, [item.id]: '__new' }));
        setNewBaseTitles((current) => ({ ...current, [item.id]: suggestion.title }));
      } else if (suggestion?.knowledgeBaseId) {
        setAssignDrafts((current) => ({ ...current, [item.id]: suggestion.knowledgeBaseId }));
      }
      setAssignmentHints((current) => ({
        ...current,
        [item.id]: suggestion ? `${suggestion.title} · ${suggestion.reason}` : result.message,
      }));
      setStatus(result.message);
    } catch {
      setStatus('生成归属建议失败，请稍后重试。');
    } finally {
      setMutatingMaterialId(null);
    }
  }

  async function deleteSelected() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0 || apiStatus !== 'online' || isBatchProcessing) return;
    const confirmed = window.confirm(`确认删除选中的 ${ids.length} 条资料？相关卡片将解除关联但不会删除。`);
    if (!confirmed) return;
    const snapshot = items;
    setIsBatchProcessing(true);
    setBatchProgress({ done: 0, total: ids.length, action: '删除' });
    setStatus(`正在删除 ${ids.length} 条资料...`);
    const selectedSnapshot = new Set(selectedIds);
    clearSelection();
    setItems((current) => current.filter((item) => !selectedSnapshot.has(item.id)));
    let failed = 0;
    for (let i = 0; i < ids.length; i += 1) {
      try {
        const response = await fetch(`/api/materials/${ids[i]}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('delete failed');
        const result = await response.json();
        onMaterialMutation?.(result);
      } catch {
        failed += 1;
      }
      setBatchProgress({ done: i + 1, total: ids.length, action: '删除' });
    }
    if (failed > 0) {
      setStatus(`${ids.length - failed} 条已删除，${failed} 条失败，正在同步资料库。`);
      setItems(snapshot);
      await loadMaterials();
    } else {
      setStatus(`${ids.length} 条资料已删除。`);
    }
    setBatchProgress(null);
    setIsBatchProcessing(false);
  }

  async function reparseSelected() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0 || apiStatus !== 'online' || isBatchProcessing) return;
    const targets = items.filter((item) => selectedIds.has(item.id) && canParseMaterial(item));
    if (targets.length === 0) {
      setStatus('所选资料暂无可重新解析的条目。');
      return;
    }
    setIsBatchProcessing(true);
    setBatchProgress({ done: 0, total: targets.length, action: '解析' });
    setStatus(`正在重新解析 ${targets.length} 条资料...`);
    let failed = 0;
    for (let i = 0; i < targets.length; i += 1) {
      try {
        if (onParseMaterial) await onParseMaterial(targets[i].id);
      } catch {
        failed += 1;
      }
      setBatchProgress({ done: i + 1, total: targets.length, action: '解析' });
    }
    await loadMaterials();
    setStatus(failed ? `${targets.length - failed} 条已重新解析，${failed} 条失败。` : `${targets.length} 条资料已重新解析。`);
    setBatchProgress(null);
    setIsBatchProcessing(false);
  }

  async function assignSelected() {
    const target = batchAssignTarget;
    const ids = Array.from(selectedIds);
    if (ids.length === 0 || apiStatus !== 'online' || isBatchProcessing || !target) return;
    setIsBatchProcessing(true);
    setBatchProgress({ done: 0, total: ids.length, action: '分配' });
    setStatus(`正在移动 ${ids.length} 条资料...`);
    let failed = 0;
    for (let i = 0; i < ids.length; i += 1) {
      try {
        const response = await fetch(`/api/materials/${ids[i]}/assign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ knowledgeBaseId: target }),
        });
        if (!response.ok) throw new Error('assign failed');
        const result = await response.json();
        onMaterialMutation?.(result);
      } catch {
        failed += 1;
      }
      setBatchProgress({ done: i + 1, total: ids.length, action: '分配' });
    }
    await loadMaterials();
    setStatus(failed ? `${ids.length - failed} 条已移动，${failed} 条失败。` : `${ids.length} 条资料已移动。`);
    setBatchAssignTarget('');
    clearSelection();
    setBatchProgress(null);
    setIsBatchProcessing(false);
  }

  return (
    <section className="page-main full">
      <div className="page-title-row">
        <div>
          <h2>Material Repository</h2>
          <p>把链接、文本和问题都收进同一个资料库，再按状态继续解析和整理。</p>
        </div>
        <div className="library-stats">
          <span>{counts.total} items</span>
          <span>{counts.ingested ?? 0} ingested</span>
          <span>{counts.failed ?? 0} failed</span>
        </div>
      </div>

      {captureSummary && (
        <CaptureSuccessBanner
          summary={captureSummary}
          stats={lifecycleStats}
          onReview={() => {
            const target = lifecycleStats.reviewItems[0];
            if (target) openReview(target);
          }}
          onDismiss={() => setCaptureSummary(null)}
        />
      )}

      <section className="quick-capture-panel">
        <div className="capture-head">
          <div>
            <span>Quick Capture</span>
            <h3>Inbox</h3>
          </div>
          <div className="capture-mode">
            {captureModeOptions.map((mode) => (
              <button className={captureMode === mode ? 'active' : ''} key={mode} onClick={() => setCaptureMode(mode)} type="button">
                {mode}
              </button>
            ))}
          </div>
        </div>
        <div className="capture-box">
          <textarea
            aria-label="快速收集资料"
            value={captureValue}
            onChange={(event) => setCaptureValue(event.target.value)}
            placeholder={captureMode === 'batch' ? 'Paste one source, note, or question per line...' : captureMode === 'link' ? 'Paste a source link...' : 'Paste a note, question, or topic...'}
          />
          <div className="capture-actions">
            <button disabled={apiStatus !== 'online' || isCapturing || !captureValue.trim()} onClick={capture} type="button">
              {isCapturing ? <Clock3 size={18} /> : <Send size={18} />}
              Capture
            </button>
            <label className={`file-import-button ${apiStatus !== 'online' || isImportingFile ? 'disabled' : ''}`}>
              {isImportingFile ? <Clock3 size={18} /> : <Upload size={18} />}
              Import
              <input
                accept=".md,.markdown,.txt,text/markdown,text/plain"
                aria-label="导入本地文档"
                disabled={apiStatus !== 'online' || isImportingFile}
                onChange={importTextFile}
                type="file"
              />
            </label>
          </div>
        </div>
        <p>{status}</p>
      </section>

      <ImportLifecyclePanel apiStatus={apiStatus} stats={lifecycleStats} onReviewItem={openReview} />

      <div className="library-toolbar">
        <label className={`library-select-all ${allVisibleSelected ? 'is-checked' : ''} ${someVisibleSelected ? 'is-indeterminate' : ''}`}>
          <input
            type="checkbox"
            aria-label="全选当前可见资料"
            checked={allVisibleSelected}
            ref={(node) => { if (node) node.indeterminate = someVisibleSelected; }}
            onChange={toggleSelectAllVisible}
            disabled={filteredItems.length === 0}
          />
          <span>{selectedIds.size > 0 ? `已选 ${selectedIds.size}` : '全选'}</span>
        </label>
        <div className="filter-bar">
          {materialFilterOptions.map((option) => (
            <button className={filter === option.key ? 'active' : ''} key={option.key} onClick={() => setFilter(option.key)} type="button">
              {option.label}
            </button>
          ))}
        </div>
        <label className="library-search">
          <Search size={18} />
          <input aria-label="搜索资料" value={searchValue} onChange={(event) => setSearchValue(event.target.value)} placeholder="Search materials..." />
        </label>
      </div>

      {selectedIds.size > 0 && (
        <div className="library-batch-bar">
          <div className="library-batch-info">
            <strong>已选 {selectedIds.size}</strong>
            {batchProgress && (
              <span className="library-batch-progress">
                {batchProgress.action} {batchProgress.done}/{batchProgress.total}
              </span>
            )}
          </div>
          <div className="library-batch-actions">
            <button type="button" disabled={isBatchProcessing || apiStatus !== 'online'} onClick={reparseSelected}>
              <RefreshCw size={14} />
              重新解析
            </button>
            <select
              aria-label="批量移动到知识库"
              value={batchAssignTarget}
              onChange={(event) => setBatchAssignTarget(event.target.value)}
              disabled={isBatchProcessing || apiStatus !== 'online'}
            >
              <option value="">移动到…</option>
              {knowledgeBases.map((base) => <option key={base.id ?? base.title} value={base.id}>{base.title}</option>)}
            </select>
            <button type="button" disabled={isBatchProcessing || apiStatus !== 'online' || !batchAssignTarget} onClick={assignSelected}>
              移动
            </button>
            <button type="button" className="danger" disabled={isBatchProcessing || apiStatus !== 'online'} onClick={deleteSelected}>
              <Trash2 size={14} />
              删除
            </button>
            <button type="button" disabled={isBatchProcessing} onClick={clearSelection}>
              取消选择
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <EmptyState title="正在同步资料库" body="稍等一下，正在读取本地 API 里的资料。" />
      ) : filteredItems.length === 0 ? (
        <EmptyState title="暂无匹配资料" body="换一个筛选条件，或先从上方收集一条链接/文本。" />
      ) : (
      <div className="library-grid">
        {filteredItems.map((item) => {
          const Icon = materialIcon(item.type);
          return (
          <article className={`library-card ${materialState(item.parseStatus)} ${selectedIds.has(item.id) ? 'selected' : ''}`} key={item.id}>
            <div className="library-card-head">
              <label className="library-card-select">
                <input
                  type="checkbox"
                  aria-label={`选择 ${item.title}`}
                  checked={selectedIds.has(item.id)}
                  onChange={() => toggleMaterialSelection(item.id)}
                />
              </label>
              <Icon size={22} />
              <div className="material-meta">
                <span>{typeLabels[item.type] ?? item.type}</span>
                <span>{statusLabels[item.parseStatus] ?? item.parseStatus}</span>
              </div>
            </div>
            <h3>{item.title}</h3>
            <p>{materialPreview(item)}</p>
            <ParseTimeline item={item} />
            {item.parseError && <p className="library-error">{item.parseError}</p>}
            <div className="tag-row">
              <span>{knowledgeBaseTitle(knowledgeBases, item.knowledgeBaseId)}</span>
              <span>{item.platform ?? 'local'}</span>
              <span>{formatMaterialTime(item.createdAt)}</span>
              {materialMediaUrls(item).length > 0 && <span>{materialMediaUrls(item).length} media</span>}
            </div>
            <MediaPreview urls={materialMediaUrls(item)} compact />
            <div className="assignment-row">
              <select
                aria-label="选择资料归属知识库"
                value={assignDrafts[item.id] ?? item.knowledgeBaseId ?? ''}
                onChange={(event) => setAssignDrafts((current) => ({ ...current, [item.id]: event.target.value }))}
              >
                <option value="">Move to...</option>
                {knowledgeBases.map((base) => <option key={base.id ?? base.title} value={base.id}>{base.title}</option>)}
                <option value="__new">New knowledge base</option>
              </select>
              {(assignDrafts[item.id] ?? item.knowledgeBaseId) === '__new' && (
                <input
                  aria-label="新知识库标题"
                  value={newBaseTitles[item.id] ?? item.title ?? ''}
                  onChange={(event) => setNewBaseTitles((current) => ({ ...current, [item.id]: event.target.value }))}
                  placeholder="Knowledge base title"
                />
              )}
              <button disabled={apiStatus !== 'online' || mutatingMaterialId === item.id} onClick={() => assignMaterial(item)} type="button">
                Assign
              </button>
              <button disabled={apiStatus !== 'online' || mutatingMaterialId === item.id} onClick={() => suggestAssignment(item)} type="button">
                Suggest
              </button>
            </div>
            {assignmentHints[item.id] && <p className="assignment-hint">{assignmentHints[item.id]}</p>}
            {reviewingId === item.id && (
              <div className="review-box">
                <input
                  aria-label="资料标题"
                  value={reviewDraft.title}
                  onChange={(event) => setReviewDraft((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Title"
                />
                <textarea
                  aria-label="手动补充正文"
                  value={reviewDraft.contentText}
                  onChange={(event) => setReviewDraft((current) => ({ ...current, contentText: event.target.value }))}
                  placeholder="Paste or edit the material text..."
                />
                <textarea
                  aria-label="手动补充媒体链接"
                  value={reviewDraft.mediaUrls}
                  onChange={(event) => setReviewDraft((current) => ({ ...current, mediaUrls: event.target.value }))}
                  placeholder="Media URLs, one per line..."
                />
                <div className="review-actions">
                  <button disabled={mutatingMaterialId === item.id} onClick={() => saveReview(item, false)} type="button">Save Draft</button>
                  <button disabled={mutatingMaterialId === item.id} onClick={() => saveReview(item, true)} type="button">Complete</button>
                </div>
              </div>
            )}
            <div className="library-card-actions">
              {materialSourceUrl(item) && (
                <a href={materialSourceUrl(item)} target="_blank" rel="noreferrer">
                  Open
                  <SquareArrowOutUpRight size={14} />
                </a>
              )}
              {canParseMaterial(item) && (
                <button disabled={parsingMaterialId === item.id} onClick={() => parseFromLibrary(item.id)} type="button">
                  <RefreshCw size={14} />
                  {item.parseStatus === 'failed' ? 'Retry Parse' : 'Parse'}
                </button>
              )}
              <button disabled={apiStatus !== 'online'} onClick={() => openReview(item)} type="button">
                <FileText size={14} />
                {reviewingId === item.id ? 'Close Review' : 'Review'}
              </button>
            </div>
          </article>
          );
        })}
      </div>
      )}
    </section>
  );
}

function ImportLifecyclePanel({ apiStatus, stats, onReviewItem }) {
  const lifecycle = [
    { key: 'captured', label: 'Captured', value: stats.total, body: 'Raw links, notes, and documents saved locally.' },
    { key: 'queued', label: 'Queued', value: stats.saved + stats.parsing, body: 'Waiting for parsing, enrichment, or manual completion.' },
    { key: 'review', label: 'Review', value: stats.needsReview + stats.failed, body: 'Needs user action before it can become knowledge cards.' },
    { key: 'ingested', label: 'Ingested', value: stats.ingested, body: 'Converted into structured knowledge assets.' },
  ];
  const hasReview = stats.reviewItems.length > 0;

  return (
    <section className="import-lifecycle-panel" aria-label="导入生命周期">
      <div className="lifecycle-summary">
        <div>
          <span>Collection Summary</span>
          <h3>{stats.total ? '采集队列正在形成知识资产' : '等待第一批资料进入队列'}</h3>
          <p>
            {apiStatus === 'online'
              ? '链接、文本和文档会先进入资料库，再根据解析状态进入补全、归属和卡片生成。'
              : 'API 离线时仍可观察界面状态；重新连接后资料队列会自动同步。'}
          </p>
        </div>
        <div className="lifecycle-metrics">
          <strong>{stats.total}</strong>
          <span>materials</span>
          <strong>{stats.media}</strong>
          <span>media</span>
          <strong>{stats.ingested}</strong>
          <span>ready</span>
        </div>
      </div>

      <div className="lifecycle-steps">
        {lifecycle.map((step) => (
          <article className={step.key === 'review' && step.value > 0 ? 'attention' : ''} key={step.key}>
            <div>
              {step.key === 'review' && step.value > 0 ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
              <span>{step.label}</span>
            </div>
            <strong>{step.value}</strong>
            <p>{step.body}</p>
          </article>
        ))}
      </div>

      <div className="lifecycle-workbench">
        <article className={hasReview ? 'source-recovery-card needs-action' : 'source-recovery-card'}>
          <div className="panel-title">
            <AlertTriangle size={20} />
            <div>
              <span>Source Recovery</span>
              <h4>{hasReview ? '有资料需要手动处理' : '来源连接状态正常'}</h4>
            </div>
          </div>
          {hasReview ? (
            <div className="recovery-list">
              {stats.reviewItems.map((item) => (
                <button key={item.id} onClick={() => onReviewItem(item)} type="button">
                  <span>{item.platform ?? item.type}</span>
                  <strong>{item.title}</strong>
                  <small>{item.parseError ?? '等待补全正文或媒体链接。'}</small>
                </button>
              ))}
            </div>
          ) : (
            <p>当前没有失败或需要复核的资料。后续如果平台解析受限，会在这里提供可恢复入口。</p>
          )}
        </article>

        <article className="data-hygiene-card">
          <div className="panel-title">
            <ListChecks size={20} />
            <div>
              <span>Data Hygiene</span>
              <h4>清洗信号</h4>
            </div>
          </div>
          <div className="hygiene-grid">
            <div>
              <strong>{stats.duplicateSignals}</strong>
              <span>possible duplicates</span>
            </div>
            <div>
              <strong>{stats.needsReview}</strong>
              <span>needs review</span>
            </div>
            <div>
              <strong>{stats.failed}</strong>
              <span>failed</span>
            </div>
          </div>
          <p>先用这些信号定位需要处理的资料；真正的自动去重和合并建议会在后续数据治理切片接入。</p>
        </article>

        <article className="recent-capture-card">
          <div className="panel-title">
            <Layers size={20} />
            <div>
              <span>Recent Captures</span>
              <h4>最近进入队列</h4>
            </div>
          </div>
          {stats.recent.length === 0 ? (
            <p>暂无资料。可以从上方粘贴链接、文本，或导入 Markdown / TXT 文档。</p>
          ) : (
            <ol>
              {stats.recent.map((item) => (
                <li key={item.id}>
                  <span>{statusLabels[item.parseStatus] ?? item.parseStatus}</span>
                  <strong>{item.title}</strong>
                </li>
              ))}
            </ol>
          )}
        </article>
      </div>
    </section>
  );
}

function CaptureSuccessBanner({ summary, stats, onReview, onDismiss }) {
  const reviewable = (stats.needsReview ?? 0) + (stats.failed ?? 0);
  return (
    <div className="capture-success-banner" role="status">
      <CheckCircle2 size={22} />
      <div className="capture-success-body">
        <strong>{summary.message}</strong>
        <div className="capture-success-meta">
          <span>{stats.total} 资料</span>
          <span>{stats.ingested ?? 0} 已入库</span>
          {reviewable > 0 && <span>{reviewable} 待处理</span>}
        </div>
        {stats.recent.length > 0 && (
          <ul className="capture-success-recent">
            {stats.recent.slice(0, 3).map((item) => (
              <li key={item.id}>
                <span className="capture-success-status">{statusLabels[item.parseStatus] ?? item.parseStatus}</span>
                <span className="capture-success-title">{item.title}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="capture-success-cta">
          {reviewable > 0 && <button type="button" onClick={onReview}>去复核</button>}
          <button type="button" onClick={onDismiss}>知道了</button>
        </div>
      </div>
    </div>
  );
}

function KitView({ apiStatus, isRunningKit, onRunKit, selectedKnowledgeBaseId, setView }) {
  const canRun = apiStatus === 'online' && Boolean(selectedKnowledgeBaseId) && !isRunningKit;

  async function startKit(kitId) {
    const result = await onRunKit(kitId);
    setView(result ? 'workflow' : 'detail');
  }

  return (
    <section className="page-main full">
      <div className="page-title-row">
        <div>
          <h2>Workflow Kits</h2>
          <p>选择一个当前知识库的整理方式，生成可保存和导出的产物。</p>
        </div>
      </div>
      <div className="kit-grid">
        {kitCards.map((kit) => {
          const Icon = kit.icon;
          return (
            <article className="kit-card" key={kit.title}>
              <Icon size={30} />
              <span>{kit.status}</span>
              <h3>{kit.title}</h3>
              <p>{kit.body}</p>
              <button disabled={!canRun} onClick={() => startKit(kit.id)} type="button">
                {isRunningKit ? 'Running...' : 'Run Kit'}
              </button>
            </article>
          );
        })}
      </div>
      {!selectedKnowledgeBaseId && <p className="kit-hint">先创建或选择一个知识库，再运行 Kit。</p>}
    </section>
  );
}

function WorkflowView({ detail, isRunningKit, kitRunResult, latestTask, onOpenArtifact, onRunKit, selectedKnowledgeBaseId, setView }) {
  const activeArtifact = kitRunResult?.artifact ?? detail.artifacts?.[0];
  const activeTask = kitRunResult?.task ?? latestTask;
  const hasKnowledgeBase = Boolean(selectedKnowledgeBaseId);
  const dynamicSteps = [
    ['读取知识库', `${detail.materials?.length ?? 0} materials · ${detail.cards?.length ?? 0} cards`, hasKnowledgeBase ? 'done' : 'waiting'],
    ['整理上下文', '合并资料、卡片和最近产物作为 Kit 输入。', hasKnowledgeBase ? 'done' : 'waiting'],
    ['生成产物', activeTask?.workflow === 'run_kit' ? activeTask.status : 'waiting', isRunningKit ? 'active' : activeArtifact ? 'done' : 'waiting'],
    ['导出归档', activeArtifact ? '产物已可打开和导出 Markdown。' : '等待 Kit 生成产物。', activeArtifact ? 'done' : 'waiting'],
  ];

  return (
    <section className="workflow-page">
      <header className="run-header">
        <button onClick={() => setView('kits')} type="button"><CircleX size={22} /></button>
        <div><h2>{detail.title || 'Knowledge Kit'}</h2><p>{activeTask?.id ?? 'Ready to run a minimal knowledge loop'}</p></div>
        <span>{isRunningKit ? 'Executing' : activeArtifact ? 'Ready' : 'Idle'}</span>
      </header>
      <div className="run-grid">
        <aside className="run-steps">
          <div className="section-title"><h3>Execution Flow</h3><button type="button">{activeArtifact ? '4 of 4 Steps' : 'Ready'}</button></div>
          {dynamicSteps.map(([title, body, state], index) => (
            <article className={state} key={title}>
              {state === 'done' ? <CheckCircle2 size={22} /> : <Clock3 size={22} />}
              <div><h3>{index + 1}. {title}</h3><p>{body}</p>{state === 'active' && <div className="progress"><span /></div>}</div>
            </article>
          ))}
          <button
            className="run-kit-button"
            disabled={!hasKnowledgeBase || isRunningKit}
            onClick={() => onRunKit('learning_research')}
            type="button"
          >
            {isRunningKit ? 'Running Kit...' : activeArtifact ? 'Run Again' : 'Run Learning Kit'}
          </button>
        </aside>
        <article className="artifact-preview">
          <div className="section-title">
            <h3>Live Artifact Preview</h3>
            <button disabled={!activeArtifact} onClick={() => onOpenArtifact(activeArtifact)} type="button">Open</button>
          </div>
          {activeArtifact ? (
            <>
              <h1>{activeArtifact.title}</h1>
              {activeArtifact.body.split(/\n+/).slice(0, 3).map((block) => <p key={block}>{block}</p>)}
            </>
          ) : (
            <>
              <h1>Run a Kit to create an artifact</h1>
              <p>当前知识库会被整理成一份可保存、可打开、可导出的 Markdown 产物。</p>
              <div className="skeleton" />
            </>
          )}
        </article>
      </div>
    </section>
  );
}

function ArtifactView({ artifact, detail, setView }) {
  const fallbackArtifact = detail.artifacts?.[0];
  const activeArtifact = artifact ?? fallbackArtifact;
  const variant = inferArtifactVariant(activeArtifact, detail);
  const config = artifactVariantConfig(variant);
  const bodyBlocks = artifactBodyBlocks(activeArtifact);
  const sectionBlocks = distributeArtifactBlocks(bodyBlocks, config.sections.length);
  const sourceCount = activeArtifact?.sourceMaterialIds?.length ?? 0;
  const cards = detail.cards ?? [];
  const materials = detail.materials ?? [];
  const sourceCards = cards.filter((card) => card.claimStatus === 'sourced');

  if (!activeArtifact) {
    return (
      <section className="artifact-page">
        <div className="page-title-row">
          <div><h2>Artifact Archive</h2><p>问答或 Kit 生成产物后，会在这里打开完整内容。</p></div>
          <div className="button-row"><button onClick={() => setView('detail')} type="button">回到知识库</button></div>
        </div>
        <EmptyState title="暂无可打开产物" body="在知识库详情页提问，或运行 Kit 后，可以从助手面板打开产物。" />
      </section>
    );
  }

  return (
    <section className={`artifact-page variant-${variant}`}>
      <div className="artifact-hero">
        <div>
          <button className="back-button" onClick={() => setView('detail')} type="button">← Back to Knowledge Base</button>
          <span>{config.label}</span>
          <h2>{activeArtifact.title}</h2>
          <p>{config.lead}</p>
        </div>
        <div className="artifact-actions">
          <button onClick={() => setView('export')} type="button">Open Export</button>
          <button onClick={() => downloadArtifactMarkdown(activeArtifact, detail)} type="button">导出 Markdown</button>
        </div>
      </div>

      <div className="artifact-metrics">
        <article><span>Source links</span><strong>{sourceCount}</strong></article>
        <article><span>Cards</span><strong>{detail.cardCount ?? cards.length}</strong></article>
        <article><span>Sourced cards</span><strong>{sourceCards.length}</strong></article>
        <article><span>Updated</span><strong>{new Date(activeArtifact.createdAt).toLocaleDateString()}</strong></article>
      </div>

      <div className="typed-artifact-grid">
        <section className="artifact-document">
          <div className="panel-title">
            <ClipboardList size={20} />
            <div>
              <span>{config.label}</span>
              <h4>{config.title}</h4>
            </div>
          </div>
          {config.sections.map((section, index) => (
            <article className="artifact-section" key={section}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div>
                <h3>{section}</h3>
                {(sectionBlocks[index]?.length ? sectionBlocks[index] : ['暂无内容。']).map((block) => <p key={block}>{block}</p>)}
              </div>
            </article>
          ))}
        </section>

        <aside className="artifact-sidebar">
          <article className="artifact-boundary-card">
            <h3>来源边界</h3>
            <p>{sourceCount ? 'This artifact references saved source material.' : 'This artifact is an AI skeleton and needs source review.'}</p>
            <div>
              <span>{materials.length} materials</span>
              <span>{cards.length} cards</span>
              <span>{formatPercent(detail.sourcedRatio)} sourced</span>
            </div>
          </article>
          <article className="artifact-action-card">
            <h3>Next Actions</h3>
            <button onClick={() => setView('chat')} type="button">Discuss in Chat</button>
            <button onClick={() => setView('recall')} type="button">Practice Cards</button>
            <button onClick={() => setView('export')} type="button">Export Bundle</button>
          </article>
          <article className="artifact-source-list">
            <h3>Representative Sources</h3>
            {(materials.slice(0, 4).length ? materials.slice(0, 4) : [{ id: 'empty', title: 'No source material yet', parseStatus: 'needs_review' }]).map((material) => (
              <div key={material.id ?? material.title}>
                <strong>{material.title}</strong>
                <span>{material.platform ?? material.type ?? 'local'} · {material.parseStatus ?? 'saved'}</span>
              </div>
            ))}
          </article>
        </aside>
      </div>
    </section>
  );
}

function MapsView({ apiStatus, selectedKnowledgeBaseId, setView }) {
  const [map, setMap] = useState(null);
  const [status, setStatus] = useState('选择一个知识库后生成地图。');
  const [query, setQuery] = useState('');
  const [nodeFilter, setNodeFilter] = useState('all');
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [relationFilter, setRelationFilter] = useState('all');

  useEffect(() => {
    if (!selectedKnowledgeBaseId || apiStatus !== 'online') {
      setMap(null);
      setStatus(apiStatus === 'online' ? '选择一个知识库后生成地图。' : 'API 未连接，暂时无法生成知识地图。');
      return;
    }

    let ignore = false;
    async function loadMap() {
      setStatus('Loading knowledge map...');
      try {
        const response = await fetch(`/api/knowledge-bases/${selectedKnowledgeBaseId}/map`);
        if (!response.ok) throw new Error('Map unavailable.');
        const result = await response.json();
        if (!ignore) {
          setMap(result);
          setStatus(result.nodes?.length ? 'Knowledge map synced.' : '当前知识库还没有可生成地图的节点。');
          setSelectedNodeId(result.nodes?.[0]?.id ?? null);
        }
      } catch {
        if (!ignore) {
          setMap(null);
          setStatus('知识地图读取失败，请确认 API 正在运行。');
        }
      }
    }
    loadMap();
    return () => {
      ignore = true;
    };
  }, [apiStatus, selectedKnowledgeBaseId]);

  const nodes = map?.nodes ?? [];
  const edges = map?.edges ?? [];
  const filteredNodes = nodes.filter((node) => mapNodeMatches(node, nodeFilter, query));
  const visibleNodeIds = new Set(filteredNodes.map((node) => node.id));
  const visibleEdges = edges.filter((edge) => visibleNodeIds.has(edge.sourceId) && visibleNodeIds.has(edge.targetId));
  const layoutNodes = buildMapLayout(filteredNodes);
  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? filteredNodes[0] ?? nodes[0];
  const selectedRelations = selectedNode
    ? edges.filter((edge) => edge.sourceId === selectedNode.id || edge.targetId === selectedNode.id)
    : [];
  const connectedNodeCount = selectedRelations.length;
  const statusMeta = describeNodeStatus(selectedNode?.status);
  const nodeMetadataItems = selectedNode ? describeNodeMetadata(selectedNode) : [];
  const relationTypes = ['all', ...new Set(selectedRelations.map((edge) => edge.relation))];
  const visibleRelations = selectedRelations
    .filter((edge) => relationFilter === 'all' || edge.relation === relationFilter)
    .sort((a, b) => {
      const directionDiff = (a.sourceId === selectedNode.id ? 0 : 1) - (b.sourceId === selectedNode.id ? 0 : 1);
      if (directionDiff !== 0) return directionDiff;
      return a.relation.localeCompare(b.relation);
    });
  const typeCounts = nodes.reduce((acc, node) => ({ ...acc, [node.kind]: (acc[node.kind] ?? 0) + 1 }), {});
  const filterOptions = [
    { key: 'all', label: 'All Nodes', count: nodes.length },
    { key: 'knowledge_base', label: 'Knowledge Base', count: typeCounts.knowledge_base ?? 0 },
    { key: 'material', label: 'Materials', count: typeCounts.material ?? 0 },
    { key: 'card', label: 'Cards', count: typeCounts.card ?? 0 },
  ];

  return (
    <section className="page-main full knowledge-map-page">
      <div className="knowledge-map-shell">
        <header className="knowledge-map-topbar">
          <div className="map-breadcrumb">
            <button aria-label="返回知识库" onClick={() => setView('detail')} type="button"><CircleX size={18} /></button>
            <span>Knowledge Base</span>
            <span>/</span>
            <strong>Full Map</strong>
          </div>
          <div className="map-filter-bar">
            {filterOptions.map((option) => (
              <button className={nodeFilter === option.key ? 'active' : ''} key={option.key} onClick={() => setNodeFilter(option.key)} type="button">
                <span className={`map-filter-dot ${option.key}`} />
                {option.label}
                <small>{option.count}</small>
              </button>
            ))}
          </div>
          <label className="map-search">
            <Search size={17} />
            <input aria-label="搜索地图节点" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search nodes..." />
          </label>
        </header>

        <div className="knowledge-map-board">
          <section className="knowledge-map-canvas" aria-label="完整知识地图">
            {!map ? (
              <div className="map-empty-state">
                <EmptyState title="暂无知识地图" body={status} />
              </div>
            ) : (
              <>
                <div className="map-canvas-heading">
                  <div>
                    <span>Knowledge Map</span>
                    <h2>{selectedNode?.label ?? 'Knowledge Maps'}</h2>
                    <p>{status} Updated {map.generatedAt ? new Date(map.generatedAt).toLocaleTimeString() : 'now'}.</p>
                  </div>
                  <div className="map-stats-strip">
                    <span>{nodes.length} nodes</span>
                    <span>{edges.length} edges</span>
                    <span>{map.stats?.sourcedCards ?? 0} sourced</span>
                  </div>
                </div>

                <div className="map-graph-viewport">
                  <svg aria-label="知识地图关系图" className="map-graph-svg" viewBox="0 0 1000 800" role="img">
                    <g style={{ transform: `scale(${zoom})`, transformOrigin: '500px 400px' }}>
                      {visibleEdges.map((edge) => {
                        const source = layoutNodes.find((node) => node.id === edge.sourceId);
                        const target = layoutNodes.find((node) => node.id === edge.targetId);
                        if (!source || !target) return null;
                        const isActive = selectedNode && (edge.sourceId === selectedNode.id || edge.targetId === selectedNode.id);
                        return (
                          <line
                            className={isActive ? 'map-edge active' : 'map-edge'}
                            key={edge.id}
                            x1={source.x}
                            y1={source.y}
                            x2={target.x}
                            y2={target.y}
                          />
                        );
                      })}
                      {layoutNodes.map((node) => (
                        <g
                          className={node.id === selectedNode?.id ? `map-svg-node ${node.kind} active` : `map-svg-node ${node.kind}`}
                          key={node.id}
                          onClick={() => setSelectedNodeId(node.id)}
                          role="button"
                          tabIndex={0}
                          transform={`translate(${node.x}, ${node.y})`}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') setSelectedNodeId(node.id);
                          }}
                        >
                          <circle r={node.radius} />
                          <text y={node.radius + 18}>{truncateNodeLabel(node.label)}</text>
                        </g>
                      ))}
                    </g>
                  </svg>
                  {layoutNodes.length === 0 && (
                    <div className="map-no-match">
                      <EmptyState title="没有匹配节点" body="换一个关键词或切回 All Nodes 查看完整地图。" />
                    </div>
                  )}
                </div>

                <div className="map-legend">
                  {filterOptions.slice(1).map((option) => (
                    <button
                      className={nodeFilter === option.key ? 'active' : ''}
                      key={option.key}
                      onClick={() => setNodeFilter(nodeFilter === option.key ? 'all' : option.key)}
                      type="button"
                    >
                      <i className={`map-filter-dot ${option.key}`} />
                      {option.label}
                      <small>{option.count}</small>
                    </button>
                  ))}
                </div>
                <div className="map-floating-controls" aria-label="地图缩放控制">
                  <button aria-label="放大" onClick={() => setZoom((value) => Math.min(value + 0.12, 1.36))} type="button">+</button>
                  <button aria-label="重置视图" onClick={() => setZoom(1)} type="button"><RefreshCw size={16} /></button>
                  <button aria-label="缩小" onClick={() => setZoom((value) => Math.max(value - 0.12, 0.76))} type="button">−</button>
                </div>
              </>
            )}
          </section>

          <aside className="map-detail-drawer" aria-label="节点详情">
            {!map || !selectedNode ? (
              <EmptyState title="选择一个节点" body="点击地图里的节点后，这里会展示摘要、来源和关联关系。" />
            ) : (
              <>
                <div className="map-node-detail-head">
                  <span>{mapKindLabel(selectedNode.kind)}</span>
                  <h3>{selectedNode.label}</h3>
                  <p>{selectedNode.summary || '这个节点暂时没有摘要。'}</p>
                </div>
                <div className="map-node-confidence">
                  <div>
                    <span>Status</span>
                    <strong className={`map-status-badge ${statusMeta.tone}`}>{statusMeta.label}</strong>
                  </div>
                  <div>
                    <span>Connections</span>
                    <strong>{connectedNodeCount}</strong>
                  </div>
                </div>
                {nodeMetadataItems.length > 0 && (
                  <div className="map-node-metadata">
                    {nodeMetadataItems.map((item) => (
                      <div key={item.label}>
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </div>
                    ))}
                  </div>
                )}
                <section className="map-relation-panel">
                  <div className="map-relation-head">
                    <h4>Relations</h4>
                    <span className="map-relation-count">{visibleRelations.length}/{selectedRelations.length}</span>
                  </div>
                  {relationTypes.length > 2 && (
                    <div className="map-relation-filters">
                      {relationTypes.map((type) => (
                        <button
                          className={relationFilter === type ? 'active' : ''}
                          key={type}
                          onClick={() => setRelationFilter(type)}
                          type="button"
                        >
                          {type === 'all' ? '全部' : type}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="relation-list">
                    {visibleRelations.map((edge) => {
                      const source = nodes.find((node) => node.id === edge.sourceId);
                      const target = nodes.find((node) => node.id === edge.targetId);
                      const other = edge.sourceId === selectedNode.id ? target : source;
                      const isOutgoing = edge.sourceId === selectedNode.id;
                      return (
                        <article
                          className="relation-item"
                          key={edge.id}
                          onClick={() => other && setSelectedNodeId(other.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(event) => {
                            if ((event.key === 'Enter' || event.key === ' ') && other) setSelectedNodeId(other.id);
                          }}
                        >
                          <span>{edge.relation}</span>
                          <strong>{other?.label ?? edge.targetId}</strong>
                          <p>{isOutgoing ? 'Outgoing relation' : 'Incoming relation'}</p>
                        </article>
                      );
                    })}
                    {selectedRelations.length === 0 && <EmptyState title="暂无关系" body="导入资料并生成卡片后，会出现来源关系。" />}
                    {selectedRelations.length > 0 && visibleRelations.length === 0 && (
                      <EmptyState title="无匹配关系" body="切换过滤条件查看更多关系。" />
                    )}
                  </div>
                </section>
                <div className="map-drawer-actions">
                  <button onClick={() => setView(selectedNode.kind === 'material' ? 'library' : 'detail')} type="button">Open context</button>
                  <button disabled type="button">Edit node</button>
                </div>
              </>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}

function mapNodeMatches(node, filter, query) {
  const matchesFilter = filter === 'all' || node.kind === filter;
  const keyword = query.trim().toLowerCase();
  if (!matchesFilter) return false;
  if (!keyword) return true;
  return [node.label, node.summary, node.status, ...Object.values(node.metadata ?? {})]
    .join(' ')
    .toLowerCase()
    .includes(keyword);
}

const MAP_LAYOUT = {
  centerX: 500,
  centerY: 400,
  rings: {
    material: { startAngle: 100, endAngle: 260, radius: 210 },
    card: { startAngle: 280, endAngle: 440, radius: 320 },
    other: { startAngle: 260, endAngle: 280, radius: 260 },
  },
  nodeRadius: { knowledge_base: 34, material: 22, card: 18, other: 16 },
};

const NODE_METADATA_SPECS = {
  material: [
    { key: 'platform', label: '平台' },
    { key: 'type', label: '类型' },
    { key: 'mediaCount', label: '媒体数' },
  ],
  card: [
    { key: 'type', label: '卡片类型' },
    { key: 'materialId', label: '来源资料' },
  ],
  knowledge_base: [
    { key: 'sourceCount', label: '资料数' },
    { key: 'cardCount', label: '卡片数' },
  ],
};

const NODE_STATUS_META = {
  ready: { tone: 'positive', label: '就绪' },
  active: { tone: 'positive', label: '活跃' },
  seeded: { tone: 'positive', label: '已初始化' },
  pending: { tone: 'pending', label: '待处理' },
  queued: { tone: 'pending', label: '排队中' },
  draft: { tone: 'pending', label: '草稿' },
  parsing: { tone: 'pending', label: '解析中' },
  failed: { tone: 'negative', label: '失败' },
  error: { tone: 'negative', label: '异常' },
};

function buildMapLayout(nodes) {
  const center = nodes.find((node) => node.kind === 'knowledge_base') ?? nodes[0];
  const remaining = nodes.filter((node) => node.id !== center?.id);
  const materialNodes = remaining.filter((node) => node.kind === 'material');
  const cardNodes = remaining.filter((node) => node.kind === 'card');
  const otherNodes = remaining.filter(
    (node) => node.kind !== 'material' && node.kind !== 'card',
  );
  const positioned = center
    ? [
        {
          ...center,
          x: MAP_LAYOUT.centerX,
          y: MAP_LAYOUT.centerY,
          radius: MAP_LAYOUT.nodeRadius.knowledge_base,
        },
      ]
    : [];
  return [
    ...positioned,
    ...positionRing(materialNodes, MAP_LAYOUT.rings.material),
    ...positionRing(cardNodes, MAP_LAYOUT.rings.card),
    ...positionRing(otherNodes, MAP_LAYOUT.rings.other),
  ];
}

function positionRing(nodes, ring) {
  const total = Math.max(nodes.length, 1);
  return nodes.map((node, index) => {
    const angle =
      total === 1
        ? (ring.startAngle + ring.endAngle) / 2
        : ring.startAngle + ((ring.endAngle - ring.startAngle) * index) / (total - 1);
    const radian = (angle * Math.PI) / 180;
    return {
      ...node,
      x: MAP_LAYOUT.centerX + Math.cos(radian) * ring.radius,
      y: MAP_LAYOUT.centerY + Math.sin(radian) * ring.radius,
      radius: MAP_LAYOUT.nodeRadius[node.kind] ?? MAP_LAYOUT.nodeRadius.other,
    };
  });
}

function truncateNodeLabel(label) {
  const value = label ?? 'Untitled';
  return value.length > 22 ? `${value.slice(0, 20)}...` : value;
}

function mapKindLabel(kind) {
  if (kind === 'knowledge_base') return 'Knowledge Base';
  if (kind === 'material') return 'Material';
  return 'Card';
}

function describeNodeStatus(status) {
  return NODE_STATUS_META[status] ?? { tone: 'neutral', label: status ?? '未知' };
}

function describeNodeMetadata(node) {
  const specs = NODE_METADATA_SPECS[node.kind] ?? [];
  return specs
    .filter((spec) => node.metadata?.[spec.key] !== undefined && node.metadata?.[spec.key] !== null)
    .map((spec) => ({
      label: spec.label,
      value: formatMetadataValue(spec.key, node.metadata[spec.key]),
    }));
}

function formatMetadataValue(key, value) {
  if (typeof value === 'number') return String(value);
  if (key === 'materialId' && typeof value === 'string') {
    return value.length > 12 ? `${value.slice(0, 10)}…` : value;
  }
  return String(value ?? '-');
}

function SearchView() {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('all');
  const [results, setResults] = useState([]);
  const [counts, setCounts] = useState({});
  const [status, setStatus] = useState('输入关键词后搜索当前知识库资产。');
  const [isSearching, setIsSearching] = useState(false);

  const visibleResults = results.filter((result) => scope === 'all' || result.kind === scope);

  async function runSearch(nextQuery = query) {
    const value = nextQuery.trim();
    if (!value || isSearching) return;
    setIsSearching(true);
    setStatus('Searching...');
    try {
      const params = new URLSearchParams({ q: value, limit: '80' });
      const response = await fetch(`/api/search?${params.toString()}`);
      if (!response.ok) throw new Error('Search failed.');
      const body = await response.json();
      setResults(body.results ?? []);
      setCounts(body.counts ?? {});
      setStatus((body.results ?? []).length ? `${body.results.length} results found.` : '没有找到匹配结果。');
    } catch {
      setStatus('搜索失败，请确认 API 正在运行。');
      setResults([]);
      setCounts({});
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <section className="page-main full">
      <div className="page-title-row">
        <div>
          <h2>Semantic Search</h2>
          <p>从知识库、资料、卡片和产物里快速定位线索。</p>
        </div>
      </div>

      <div className="search-workbench">
        <div className="large-search">
          <Search size={24} />
          <input
            aria-label="搜索知识资产"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') runSearch();
            }}
            placeholder="Search knowledge assets..."
          />
          <button disabled={isSearching || !query.trim()} onClick={() => runSearch()} type="button">
            {isSearching ? 'Searching' : 'Search'}
          </button>
        </div>

        <div className="search-scope-bar">
          {searchScopeOptions.map((option) => (
            <button className={scope === option.key ? 'active' : ''} key={option.key} onClick={() => setScope(option.key)} type="button">
              {option.label}
              {option.key !== 'all' && <span>{counts[option.key] ?? 0}</span>}
            </button>
          ))}
        </div>
      </div>

      <p className="search-status">{status}</p>

      {visibleResults.length === 0 && !isSearching ? (
        <EmptyState title="暂无搜索结果" body="可以搜索主题名、资料内容、卡片标题或产物正文。" />
      ) : (
        <div className="search-layout">
          <div className="search-results">
            {isSearching
              ? Array.from({ length: 4 }).map((_, index) => (
                  <div className="search-result-card skeleton" key={`skeleton-${index}`} aria-hidden="true">
                    <div className="skeleton-icon" />
                    <div className="skeleton-body">
                      <div className="skeleton-line short" />
                      <div className="skeleton-line" />
                      <div className="skeleton-line long" />
                    </div>
                  </div>
                ))
              : visibleResults.map((result) => {
                  const Icon = resultIcon(result.kind);
                  const matchPercent = maxScore > 0
                    ? Math.round((Number(result.score) / maxScore) * 100)
                    : 0;
                  return (
                    <article className="search-result-card" key={`${result.kind}-${result.id}`}>
                      <Icon size={23} />
                      <div>
                        <div className="search-result-meta">
                          <span>{result.kind.replace('_', ' ')}</span>
                          {Object.entries(result.metadata ?? {}).slice(0, 3).map(([key, value]) => (
                            <span key={key}>{String(value)}</span>
                          ))}
                          {matchPercent > 0 && (
                            <span className="result-match">
                              <i className="match-bar" style={{ width: `${matchPercent}%` }} />
                              {matchPercent}%
                            </span>
                          )}
                        </div>
                        <h3>{result.title}</h3>
                        <p>{result.preview}</p>
                      </div>
                    </article>
                  );
                })}
          </div>
          {visibleResults.length > 0 && discoveryTags.length > 0 && (
            <aside className="discovery-panel" aria-label="语义发现">
              <header className="discovery-head">
                <Sparkles size={18} />
                <strong>Semantic Discovery</strong>
              </header>
              <p>基于当前结果推荐的方向，点击直接发起搜索。</p>
              <div className="discovery-tags">
                {discoveryTags.map((tag) => (
                  <button
                    className="discovery-tag"
                    key={tag}
                    onClick={() => {
                      setQuery(tag);
                      runSearch(tag);
                    }}
                    type="button"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </aside>
          )}
        </div>
      )}
    </section>
  );
}

function SettingsView() {
  const [settings, setSettings] = useState(null);
  const [provider, setProvider] = useState('');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [fallbackToMock, setFallbackToMock] = useState(true);
  const [status, setStatus] = useState('Loading model settings...');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    let ignore = false;
    async function loadSettings() {
      try {
        const response = await fetch('/api/settings/model-provider');
        if (!response.ok) throw new Error('Settings unavailable.');
        const result = await response.json();
        if (ignore) return;
        applySettings(result);
        setStatus('Model settings are ready.');
      } catch {
        if (!ignore) setStatus('API 未连接，暂时无法读取模型设置。');
      }
    }
    loadSettings();
    return () => {
      ignore = true;
    };
  }, []);

  const providerOptions = settings?.providers ?? [];
  const activeProvider = providerOptions.find((item) => item.id === provider);
  const modelOptions = activeProvider?.models ?? [];

  function applySettings(nextSettings) {
    setSettings(nextSettings);
    setProvider(nextSettings.provider);
    setModel(nextSettings.model);
    setEnabled(nextSettings.enabled);
    setFallbackToMock(nextSettings.fallbackToMock);
    setApiKey('');
  }

  function changeProvider(nextProvider) {
    setProvider(nextProvider);
    const nextModels = providerOptions.find((item) => item.id === nextProvider)?.models ?? [];
    setModel(nextModels[0]?.id ?? '');
  }

  async function saveSettings() {
    if (!provider || !model || isSaving) return;
    setIsSaving(true);
    setTestResult(null);
    try {
      const response = await fetch('/api/settings/model-provider', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          model,
          apiKey: apiKey.trim() || undefined,
          enabled,
          fallbackToMock,
        }),
      });
      if (!response.ok) throw new Error('Save failed.');
      const result = await response.json();
      applySettings(result);
      setStatus('模型设置已保存，本次 API 运行期间立即生效。');
    } catch {
      setStatus('保存失败，请确认 API 正在运行。');
    } finally {
      setIsSaving(false);
    }
  }

  async function testSettings() {
    if (!provider || !model || isTesting) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const response = await fetch('/api/settings/model-provider/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          model,
          apiKey: apiKey.trim() || undefined,
        }),
      });
      if (!response.ok) throw new Error('Test failed.');
      const result = await response.json();
      setTestResult(result);
      setStatus(result.ok ? '模型测试通过。' : '模型测试未通过。');
    } catch {
      setStatus('测试失败，请确认 API 正在运行。');
    } finally {
      setIsTesting(false);
    }
  }

  async function clearKey() {
    if (!provider || !model || isSaving) return;
    setIsSaving(true);
    setTestResult(null);
    try {
      const response = await fetch('/api/settings/model-provider', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          model,
          enabled,
          fallbackToMock,
          clearApiKey: true,
        }),
      });
      if (!response.ok) throw new Error('Clear failed.');
      const result = await response.json();
      applySettings(result);
      setStatus('已清除本次运行期保存的 API Key。');
    } catch {
      setStatus('清除失败，请确认 API 正在运行。');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="page-main full">
      <div className="page-title-row">
        <div>
          <h2>Model Settings</h2>
          <p>配置 Pi 使用的模型服务。Key 只发送到本地 API，页面不会保存明文。</p>
        </div>
      </div>

      <div className="settings-grid">
        <section className="settings-panel">
          <div className="settings-panel-head">
            <PlugZap size={24} />
            <div>
              <h3>Provider</h3>
              <p>选择服务商和模型，保存后新任务会直接使用这组配置。</p>
            </div>
          </div>

          <label className="field-row">
            <span>服务商</span>
            <select value={provider} onChange={(event) => changeProvider(event.target.value)}>
              {providerOptions.map((item) => <option key={item.id} value={item.id}>{item.id}</option>)}
            </select>
          </label>

          <label className="field-row">
            <span>模型</span>
            <select value={model} onChange={(event) => setModel(event.target.value)}>
              {modelOptions.map((item) => <option key={item.id} value={item.id}>{item.id}</option>)}
            </select>
          </label>

          <label className="field-row">
            <span>API Key</span>
            <div className="secret-input">
              <KeyRound size={18} />
              <input
                autoComplete="off"
                placeholder={settings?.hasApiKey ? '已配置，留空表示继续使用' : '粘贴你的 Provider Key'}
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
              />
            </div>
          </label>

          <div className="settings-toggles">
            <label>
              <input checked={enabled} onChange={(event) => setEnabled(event.target.checked)} type="checkbox" />
              启用真实模型
            </label>
            <label>
              <input checked={fallbackToMock} onChange={(event) => setFallbackToMock(event.target.checked)} type="checkbox" />
              失败时回到本地 Mock
            </label>
          </div>

          <div className="settings-actions">
            <button disabled={isSaving || !provider || !model} onClick={saveSettings} type="button">
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button disabled={isTesting || !provider || !model} onClick={testSettings} type="button">
              {isTesting ? 'Testing...' : 'Test'}
            </button>
            <button disabled={isSaving || !settings?.hasApiKey} onClick={clearKey} type="button">
              Clear Key
            </button>
          </div>
        </section>

        <aside className="settings-status">
          <div className="status-card">
            <ShieldCheck size={25} />
            <div>
              <span>Current Runtime</span>
              <strong>{provider || 'Provider'} / {model || 'Model'}</strong>
              <p>{settings?.hasApiKey ? `Key 已配置（${settings.keySource === 'env' ? '环境变量' : '本次运行期'}）` : '尚未配置 Key'}</p>
            </div>
          </div>
          <div className="status-card">
            <Settings size={25} />
            <div>
              <span>Policy</span>
              <strong>{enabled ? '真实模型优先' : '仅本地 Mock'}</strong>
              <p>{fallbackToMock ? '真实调用失败时会保留可用结果。' : '真实调用失败时会直接报错，适合调试。'}</p>
            </div>
          </div>
          <p className="settings-note">{status}</p>
          {testResult && (
            <div className={`test-result ${testResult.ok ? 'ok' : 'failed'}`}>
              <strong>{testResult.ok ? '测试通过' : '测试未通过'}</strong>
              <p>{testResult.message}</p>
              {testResult.sampleTitle && <small>返回卡片：{testResult.sampleTitle}</small>}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

createRoot(document.getElementById('root')).render(<App />);
