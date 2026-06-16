import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
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
  Link2,
  LogOut,
  Network,
  PlugZap,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  SquareArrowOutUpRight,
  Upload,
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

const knownViews = new Set(['workspace', 'detail', 'library', 'search', 'kits', 'workflow', 'artifact', 'maps', 'settings']);

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
  const kind = useMemo(() => (query.trim() ? classifyInput(query.trim()) : 'Theme, Link, or Question'), [query]);

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

  const submit = async () => {
    const value = query.trim();
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
          <p>Knowledge Bases</p>
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
            <button className={view === 'artifact' ? 'active' : ''} onClick={() => go('artifact')} type="button">Archive</button>
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
          {view === 'workspace' && <WorkspaceView activity={activity} isSubmitting={isSubmitting} latestTask={latestTask} materials={materials} query={query} setQuery={setQuery} submit={submit} />}
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
          {view === 'maps' && <MapsView apiStatus={apiStatus} selectedKnowledgeBaseId={selectedKnowledgeBaseId} />}
          {view === 'settings' && <SettingsView />}
        </div>
      </section>
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

function WorkspaceView({ activity, isSubmitting, latestTask, materials, query, setQuery, submit }) {
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
        <KnowledgeMapPanel />
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

function KnowledgeMapPanel() {
  return (
    <aside className="map-panel">
      <div className="map-head">
        <div><Network size={22} /><h3>Knowledge Map</h3></div>
        <SquareArrowOutUpRight size={20} />
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
        <button type="button">Explore →</button>
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
  const cards = detail.cards ?? [];
  const materials = detail.materials ?? [];
  const artifacts = detail.artifacts ?? [];
  const roadmapCards = cards.slice(0, 4);
  const canAsk = apiStatus === 'online' && Boolean(selectedKnowledgeBaseId) && !isAsking;
  const latestAnswerCards = assistantAnswer?.cards?.slice(0, 2) ?? [];
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
          <button onClick={() => setView('workflow')} type="button">Run Kit</button>
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
              <div className={index === 0 ? 'active' : ''} key={card.id ?? card.title}>
                <span>{index + 1}</span>
                <strong>{card.title}</strong>
                <small>{card.claimStatus === 'sourced' ? 'Sourced from imported material.' : 'AI skeleton, needs sources.'}</small>
              </div>
            ))}
          </aside>
          <section className="feed">
            <div className="tabs"><button className="active">Structured Feed</button><button>All Materials</button></div>
            {cards.length === 0 ? (
              <EmptyState title="暂无知识卡片" body="创建主题或导入资料后，这里会生成结构化卡片。" />
            ) : cards.map((card) => (
              <article className="knowledge-card" key={card.id ?? card.title}>
                <span>{card.type}</span>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
                <footer>{card.claimStatus} · Updated {card.updatedAt ? new Date(card.updatedAt).toLocaleDateString() : 'today'}</footer>
              </article>
            ))}
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
  const [isLoading, setIsLoading] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [mutatingMaterialId, setMutatingMaterialId] = useState(null);
  const [status, setStatus] = useState('Loading materials...');

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

  const counts = items.reduce((acc, item) => {
    acc.total += 1;
    acc[item.type] = (acc[item.type] ?? 0) + 1;
    acc[item.parseStatus] = (acc[item.parseStatus] ?? 0) + 1;
    return acc;
  }, { total: 0 });

  async function capture() {
    const value = captureValue.trim();
    if (!value || isCapturing || apiStatus !== 'online') return;
    setIsCapturing(true);
    setStatus('Capturing material...');
    try {
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
      await loadMaterials();
    } catch {
      setStatus('收集失败，请确认 API 正在运行。');
    } finally {
      setIsCapturing(false);
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

      <section className="quick-capture-panel">
        <div className="capture-head">
          <div>
            <span>Quick Capture</span>
            <h3>Inbox</h3>
          </div>
          <div className="capture-mode">
            {['auto', 'link', 'text'].map((mode) => (
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
            placeholder={captureMode === 'link' ? 'Paste a source link...' : 'Paste a note, question, or topic...'}
          />
          <button disabled={apiStatus !== 'online' || isCapturing || !captureValue.trim()} onClick={capture} type="button">
            {isCapturing ? <Clock3 size={18} /> : <Send size={18} />}
            Capture
          </button>
        </div>
        <p>{status}</p>
      </section>

      <div className="library-toolbar">
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

      {isLoading ? (
        <EmptyState title="正在同步资料库" body="稍等一下，正在读取本地 API 里的资料。" />
      ) : filteredItems.length === 0 ? (
        <EmptyState title="暂无匹配资料" body="换一个筛选条件，或先从上方收集一条链接/文本。" />
      ) : (
      <div className="library-grid">
        {filteredItems.map((item) => {
          const Icon = materialIcon(item.type);
          return (
          <article className={`library-card ${materialState(item.parseStatus)}`} key={item.id}>
            <div className="library-card-head">
              <Icon size={22} />
              <div className="material-meta">
                <span>{typeLabels[item.type] ?? item.type}</span>
                <span>{statusLabels[item.parseStatus] ?? item.parseStatus}</span>
              </div>
            </div>
            <h3>{item.title}</h3>
            <p>{materialPreview(item)}</p>
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
            </div>
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
  const bodyBlocks = activeArtifact?.body
    ? activeArtifact.body.split(/\n+/).map((block) => block.trim()).filter(Boolean)
    : [];

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
    <section className="artifact-page">
      <div className="page-title-row">
        <div>
          <h2>{activeArtifact.title}</h2>
          <p>{detail.title} · {activeArtifact.artifactType ?? 'summary'} · {new Date(activeArtifact.createdAt).toLocaleString()}</p>
        </div>
        <div className="button-row">
          <button onClick={() => setView('detail')} type="button">回到知识库</button>
          <button onClick={() => downloadArtifactMarkdown(activeArtifact, detail)} type="button">导出 Markdown</button>
        </div>
      </div>
      <div className="artifact-grid">
        <article className="document-card">
          <h3>摘要正文</h3>
          {bodyBlocks.length > 0 ? bodyBlocks.map((block) => <p key={block}>{block}</p>) : <p>这个产物暂时没有正文。</p>}
        </article>
        <aside className="citation-card">
          <h3>来源边界</h3>
          <p>{activeArtifact.sourceMaterialIds?.length ?? 0} source material links</p>
          <p>{detail.cardCount ?? detail.cards?.length ?? 0} cards in current knowledge base</p>
          <p>{activeArtifact.sourceMaterialIds?.length ? 'This artifact references saved source material.' : 'This artifact is an AI skeleton and needs source review.'}</p>
        </aside>
      </div>
    </section>
  );
}

function MapsView({ apiStatus, selectedKnowledgeBaseId }) {
  const [map, setMap] = useState(null);
  const [status, setStatus] = useState('选择一个知识库后生成地图。');

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
  const primaryNodes = nodes.slice(0, 12);

  return (
    <section className="page-main full">
      <div className="page-title-row">
        <div>
          <h2>Knowledge Maps</h2>
          <p>从当前知识库的资料、卡片和来源关系生成结构化地图。</p>
        </div>
        {map && (
          <div className="library-stats">
            <span>{nodes.length} nodes</span>
            <span>{edges.length} edges</span>
            <span>{map.stats?.sourcedCards ?? 0} sourced</span>
          </div>
        )}
      </div>

      {!map ? (
        <EmptyState title="暂无知识地图" body={status} />
      ) : (
        <div className="real-map-layout">
          <section className="real-map-canvas" aria-label="知识地图节点">
            {primaryNodes.map((node, index) => (
              <article className={`real-map-node ${node.kind}`} key={node.id} style={{ '--node-index': index }}>
                <span>{mapKindLabel(node.kind)}</span>
                <strong>{node.label}</strong>
                <p>{node.summary}</p>
              </article>
            ))}
          </section>
          <aside className="map-inspector">
            <h3>Relations</h3>
            <p>{status} Updated {map.generatedAt ? new Date(map.generatedAt).toLocaleTimeString() : 'now'}.</p>
            <div className="relation-list">
              {edges.slice(0, 12).map((edge) => {
                const source = nodes.find((node) => node.id === edge.sourceId);
                const target = nodes.find((node) => node.id === edge.targetId);
                return (
                  <article key={edge.id}>
                    <span>{edge.relation}</span>
                    <strong>{source?.label ?? edge.sourceId}</strong>
                    <p>{target?.label ?? edge.targetId}</p>
                  </article>
                );
              })}
              {edges.length === 0 && <EmptyState title="暂无关系" body="导入资料并生成卡片后，会出现来源关系。" />}
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}

function mapKindLabel(kind) {
  if (kind === 'knowledge_base') return 'Knowledge Base';
  if (kind === 'material') return 'Material';
  return 'Card';
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

      {visibleResults.length === 0 ? (
        <EmptyState title="暂无搜索结果" body="可以搜索主题名、资料内容、卡片标题或产物正文。" />
      ) : (
        <div className="search-results">
          {visibleResults.map((result) => {
            const Icon = resultIcon(result.kind);
            return (
              <article className="search-result-card" key={`${result.kind}-${result.id}`}>
                <Icon size={23} />
                <div>
                  <div className="search-result-meta">
                    <span>{result.kind.replace('_', ' ')}</span>
                    {Object.entries(result.metadata ?? {}).slice(0, 3).map(([key, value]) => (
                      <span key={key}>{String(value)}</span>
                    ))}
                  </div>
                  <h3>{result.title}</h3>
                  <p>{result.preview}</p>
                </div>
              </article>
            );
          })}
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
