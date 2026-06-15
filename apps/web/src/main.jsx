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
  FolderOpen,
  History,
  LogOut,
  Network,
  Plus,
  Search,
  Settings,
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

const libraryItems = [
  { type: 'Web Article', status: 'Parsed', title: 'The Architecture of Modern Information Retrieval', body: 'An in-depth look at vector databases and embeddings.', tags: ['architecture', 'search'] },
  { type: 'Social Media', status: 'Processing', title: 'Minimalist Workspace Setup Ideas', body: 'Extracting text and identifying objects from image reference.', tags: ['workspace'] },
  { type: 'Raw Text', status: 'Failed', title: 'Context window exceeded', body: 'The transcript spans over 45,000 tokens. Retry with chunking.', tags: ['retry'] },
  { type: 'Short Video', status: 'Parsed', title: '3 Habits of Highly Focused Builders', body: 'Transcript extracted and summarized.', tags: ['habits'] },
];

const kitCards = [
  { title: '学习研究 Kit', body: '把一个知识库整理成主题研究摘要、核心概念表和待补资料清单。', status: 'Ready', icon: BookOpen },
  { title: '内容创作 Kit', body: '从资料和卡片生成选题库、标题方向、内容结构和风险提示。', status: 'Prototype', icon: Sparkles },
  { title: '产品调研 Kit', body: '提炼竞品对比、用户痛点、功能机会点和下一步验证问题。', status: 'Prototype', icon: ClipboardList },
];

const runSteps = [
  ['整理核心概念', 'Extracted and normalized 42 concepts from 15 source documents.', 'done'],
  ['合并重复观点', 'Semantic deduplication condensed concepts into 12 thematic clusters.', 'done'],
  ['生成研究摘要', 'Synthesizing clusters into a cohesive narrative structure.', 'active'],
  ['标记待补证据', 'Waiting to identify missing citations and logical gaps.', 'waiting'],
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
    source: platform.toUpperCase(),
    status: status.toUpperCase(),
    title: item.title,
    summary: item.contentText || item.rawInput || 'Saved source material.',
    tags: [item.type ?? 'material', status],
    time: 'just now',
    state: status === 'failed' ? 'failed' : status === 'parsing' ? 'processing' : 'ready',
  };
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
  const [latestTaskId, setLatestTaskId] = useState(null);
  const [latestTask, setLatestTask] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      setLatestTaskId(result.task.id);
      setLatestTask(result.task);
      setTasks((current) => [result.task, ...current.filter((task) => task.id !== result.task.id)].slice(0, 8));
      setSelectedKnowledgeBaseId(result.knowledgeBase.id);
      setKnowledgeBases((current) => {
        const withoutDuplicate = current.filter((base) => base.id !== result.knowledgeBase.id && base.title !== result.knowledgeBase.title);
        return [result.knowledgeBase, ...withoutDuplicate];
      });
      if (result.material) {
        setMaterials((current) => [materialFromApi(result.material), ...current]);
      }
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
          {view === 'detail' && <DetailView detail={knowledgeBaseDetail} latestTask={latestTask} setView={go} />}
          {view === 'library' && <LibraryView />}
          {view === 'search' && <SearchView />}
          {view === 'kits' && <KitView setView={go} />}
          {view === 'workflow' && <WorkflowView setView={go} />}
          {view === 'artifact' && <ArtifactView />}
          {view === 'maps' && <MapsView />}
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

function DetailView({ detail, latestTask, setView }) {
  const cards = detail.cards?.length ? detail.cards : fallbackDetail().cards;
  const materials = detail.materials?.length ? detail.materials : fallbackDetail().materials;
  const artifacts = detail.artifacts ?? [];
  const roadmapCards = cards.slice(0, 4);

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
                  <span>{material.platform ?? material.type ?? 'material'} · {material.parseStatus ?? 'saved'}</span>
                </div>
              </article>
            ))}
          </section>
        </div>
      </div>
      <aside className="assistant-panel">
        <h3>AI Assistant</h3>
        <p>当前知识库有 {detail.sourceCount ?? materials.length} 条资料、{detail.cardCount ?? cards.length} 张卡片。</p>
        <TaskStatus task={latestTask} />
        <div className="chat-user">下一步应该补充哪些来源？</div>
        <p>{artifacts[0]?.body ?? '目前是本地 mock generation 结果，Phase 2 会切换到 Pi 结构化生成。'}</p>
      </aside>
    </section>
  );
}

function LibraryView() {
  return (
    <section className="page-main full">
      <div className="page-title-row">
        <div>
          <h2>Material Repository</h2>
          <p>Manage, categorize, and process your imported knowledge fragments.</p>
        </div>
        <div className="button-row"><button type="button">Bulk Categorize</button><button type="button">Import Material</button></div>
      </div>
      <div className="filter-bar"><button className="active">All Materials</button><button>Links</button><button>Text Fragments</button><button>Images</button><button>Filter</button></div>
      <div className="library-grid">
        {libraryItems.map((item) => (
          <article className={`library-card ${item.status.toLowerCase()}`} key={item.title}>
            <div className="material-meta"><span>{item.type}</span><span>{item.status}</span></div>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
            <div className="tag-row">{item.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
          </article>
        ))}
      </div>
    </section>
  );
}

function KitView({ setView }) {
  return (
    <section className="page-main full">
      <div className="page-title-row">
        <div>
          <h2>Workflow Kits</h2>
          <p>Turn a knowledge base into a repeatable outcome without leaving the structured workspace.</p>
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
              <button onClick={() => setView('workflow')} type="button">Start Kit</button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function WorkflowView({ setView }) {
  return (
    <section className="workflow-page">
      <header className="run-header">
        <button onClick={() => setView('kits')} type="button"><CircleX size={22} /></button>
        <div><h2>生成 AI Agent 研究摘要</h2><p>KIT RUN #8492-AX · Started 2 mins ago</p></div>
        <span>Executing</span>
      </header>
      <div className="run-grid">
        <aside className="run-steps">
          <div className="section-title"><h3>Execution Flow</h3><button>3 of 4 Steps</button></div>
          {runSteps.map(([title, body, state], index) => (
            <article className={state} key={title}>
              {state === 'done' ? <CheckCircle2 size={22} /> : <Clock3 size={22} />}
              <div><h3>{index + 1}. {title}</h3><p>{body}</p>{state === 'active' && <div className="progress"><span /></div>}</div>
            </article>
          ))}
        </aside>
        <article className="artifact-preview">
          <div className="section-title"><h3>Live Artifact Preview</h3><button onClick={() => setView('artifact')} type="button">Open</button></div>
          <h1>The Evolution of Autonomous AI Agents</h1>
          <p>Artificial Intelligence agents operate autonomously to achieve specific goals, utilizing LLMs as cognitive engines.</p>
          <p>Current research emphasizes memory architectures, tool use, and robust error recovery mechanisms.</p>
          <div className="skeleton" />
        </article>
      </div>
    </section>
  );
}

function ArtifactView() {
  return (
    <section className="artifact-page">
      <div className="page-title-row">
        <div><h2>AI Agent 主题研究摘要</h2><p>Generated from 15 nodes · includes citations and gaps.</p></div>
        <div className="button-row"><button>保存为知识卡片</button><button>导出 Markdown</button><button>重新生成</button></div>
      </div>
      <div className="artifact-grid">
        <article className="document-card">
          <h3>摘要正文</h3>
          <p>AI Agent 代表了人工智能发展的一个重要阶段，从单纯的预测与响应模型转向具有感知、规划、执行能力的自主系统。</p>
          <p>当前研究焦点集中在如何提升 Agent 在复杂环境下的推理能力和可靠性，包括记忆机制、工具使用和多智能体协作。</p>
          <h3>核心概念</h3>
          <ul><li>LLM as Core Brain</li><li>Tool Use</li><li>Memory Architecture</li><li>Multi-Agent Collaboration</li></ul>
        </article>
        <aside className="citation-card">
          <h3>引用来源</h3>
          <p>15 selected source nodes</p>
          <p>3 high-confidence citations</p>
          <p>2 gaps marked for follow-up</p>
        </aside>
      </div>
    </section>
  );
}

function MapsView() {
  return <section className="page-main full"><div className="page-title-row"><div><h2>Knowledge Maps</h2><p>Explore relations across themes, cards, and source clusters.</p></div></div><KnowledgeMapPanel /></section>;
}

function SearchView() {
  return <section className="page-main full"><div className="page-title-row"><div><h2>Semantic Search</h2><p>Search across materials, cards, artifacts, and conversation memories.</p></div></div><div className="large-search"><Search size={24} /><input placeholder="Search knowledge assets..." /></div></section>;
}

function SettingsView() {
  return <section className="page-main full"><div className="page-title-row"><div><h2>Settings</h2><p>Model providers, import policies, export preferences, and local workspace rules.</p></div></div><div className="settings-list"><p>Provider: Pi SDK</p><p>Default import policy: save original source first</p><p>Design standard: root DESIGN.md</p></div></section>;
}

createRoot(document.getElementById('root')).render(<App />);
