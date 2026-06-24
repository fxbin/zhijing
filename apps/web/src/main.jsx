import { Fragment, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './i18n';
import {
  AlertTriangle,
  Archive,
  Database,
  FolderOpen,
  Globe,
  Layers,
  Lightbulb,
  Map,
  Menu,
  MessageCircle,
  Plus,
  Search,
  Settings,
  Sparkles,
  X,
} from 'lucide-react';
import './styles.css';

import { seedKnowledgeBases, seedMaterials } from './constants/seedData';
import { TOP_SEARCH_EVENT, TOP_SEARCH_STORAGE_KEY } from './constants/options';
import { materialFromApi } from './utils/material';
import {
  formatBaseMeta,
  buildAdvancedOpsData,
  fallbackDetail,
  emptyDetail,
} from './utils/knowledge';
import { viewFromHash, classifyInput, workflowFromKind } from './utils/navigation';
import SystemNotice from './components/SystemNotice';
import NotificationDropdown from './components/NotificationDropdown';
import CreateKbModal from './components/CreateKbModal';
import KnowledgeBaseSwitcher from './components/KnowledgeBaseSwitcher';
import WorkspaceView from './views/WorkspaceView';
import DetailView from './views/DetailView';
import LibraryView from './views/LibraryView';
import SearchView from './views/SearchView';
import GlobalView from './views/GlobalView';
import KitView from './views/KitView';
import WorkflowView from './views/WorkflowView';
import ArtifactView from './views/ArtifactView';
import MapsView from './views/MapsView';
import GlobalAssetsDashboard from './views/GlobalAssetsDashboard';
import CrossKbSynthesisView from './views/CrossKbSynthesisView';
import MultiEntityComparisonView from './views/MultiEntityComparisonView';
import KnowledgeConflictResolverView from './views/KnowledgeConflictResolverView';
import InsightsView from './views/InsightsView';
import PathView from './views/PathView';
import ArchiveView from './views/ArchiveView';
import ChatView from './views/ChatView';
import RecallView from './views/RecallView';
import ExportView from './views/ExportView';
import SettingsView from './views/SettingsView';
import WeReadView from './views/WeReadView';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './components/LanguageSwitcher';

function App() {
  const { t, i18n } = useTranslation();
  const [view, setView] = useState(viewFromHash);
  const [query, setQuery] = useState('');
  const [activity, setActivity] = useState(t('activity.ready'));
  const [apiStatus, setApiStatus] = useState('checking');
  const [browserAiStatus, setBrowserAiStatus] = useState('checking');
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
  const [knowledgeBaseMessages, setKnowledgeBaseMessages] = useState([]);
  const [isAsking, setIsAsking] = useState(false);
  const [selectedArtifact, setSelectedArtifact] = useState(null);
  const [artifactOrigin, setArtifactOrigin] = useState(null);
  const [parsingMaterialId, setParsingMaterialId] = useState(null);
  const [isRunningKit, setIsRunningKit] = useState(false);
  const [kitRunResult, setKitRunResult] = useState(null);
  const [isCreateKbOpen, setIsCreateKbOpen] = useState(false);
  const [createKbError, setCreateKbError] = useState(null);
  const [editingKb, setEditingKb] = useState(null);
  const [deletingKb, setDeletingKb] = useState(null);
  const [settingsSection, setSettingsSection] = useState(null);
  const [navOpen, setNavOpen] = useState(false);
  const [topSearchQuery, setTopSearchQuery] = useState('');
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
    if (!navOpen) {
      document.body.style.overflow = '';
      return () => { document.body.style.overflow = ''; };
    }
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [navOpen]);

  useEffect(() => {
    function handleNavigate(event) {
      const detail = event.detail ?? {};
      if (detail.view) {
        setView(detail.view);
        if (detail.view === 'settings' && detail.section) {
          setSettingsSection(detail.section);
          window.location.hash = 'settings';
        } else if (detail.view === 'workspace') {
          window.history.replaceState(null, '', window.location.pathname);
        } else {
          window.location.hash = detail.view;
        }
      }
    }
    window.addEventListener('zhijing:navigate', handleNavigate);
    return () => window.removeEventListener('zhijing:navigate', handleNavigate);
  }, []);

  useEffect(() => {
    let ignore = false;
    async function detectBrowserAiStatus() {
      try {
        const { detectBrowserAi } = await import('./utils/browserAi.js');
        const result = await detectBrowserAi();
        if (!ignore) setBrowserAiStatus(result.status);
      } catch {
        if (!ignore) setBrowserAiStatus('no_api');
      }
    }
    detectBrowserAiStatus();
    return () => { ignore = true; };
  }, []);

  useEffect(() => {
    let ignore = false;
    async function loadDashboard() {
      try {
        const url = selectedKnowledgeBaseId
          ? `/api/dashboard?knowledgeBaseId=${encodeURIComponent(selectedKnowledgeBaseId)}`
          : '/api/dashboard';
        const response = await fetch(url);
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
          if (current || nextKnowledgeBases.length === 0) return current;
          return nextKnowledgeBases[0].id;
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
  }, [selectedKnowledgeBaseId]);

  useEffect(() => {
    if (!selectedKnowledgeBaseId) {
      setKnowledgeBaseDetail(apiStatus === 'online' ? emptyDetail() : fallbackDetail());
      setKnowledgeBaseAnalytics(null);
      setAssistantAnswer(null);
      setAssistantQuestion('');
      setKnowledgeBaseMessages([]);
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
    async function loadMessages() {
      try {
        const response = await fetch(`/api/knowledge-bases/${selectedKnowledgeBaseId}/messages?limit=50`);
        if (!response.ok) return;
        const payload = await response.json();
        if (!ignore) setKnowledgeBaseMessages(payload.messages ?? []);
      } catch {
        if (!ignore) setKnowledgeBaseMessages([]);
      }
    }
    loadDetail();
    loadMessages();
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
    setNavOpen(false);
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

  const handleViewMaterialDetail = (material) => {
    go('library');
  };

  async function handleSaveKnowledgeBase(id, title, summary) {
    try {
      const response = await fetch(`/api/knowledge-bases/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, summary }),
      });
      if (!response.ok) throw new Error('Update failed.');
      const result = await response.json();
      setKnowledgeBases((current) => current.map((base) => base.id === id ? result.knowledgeBase : base));
      setEditingKb(null);
    } catch (err) {
      setEditingKb((current) => ({ ...current, error: err.message || t('knowledgeBase.edit') }));
    }
  }

  async function handleDeleteKnowledgeBase(id) {
    try {
      const response = await fetch(`/api/knowledge-bases/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Delete failed.');
      setKnowledgeBases((current) => current.filter((base) => base.id !== id));
      if (selectedKnowledgeBaseId === id) {
        setSelectedKnowledgeBaseId(null);
      }
      setDeletingKb(null);
    } catch (err) {
      setDeletingKb((current) => ({ ...current, error: err.message || t('knowledgeBase.delete') }));
    }
  }

  const submit = async (overrideValue, options) => {
    const value = (overrideValue ?? query).trim();
    if (!value || isSubmitting) return;
    setIsSubmitting(true);
    setActivity(t('activity.captured'));

    try {
      const response = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: value, ...options }),
      });

      if (!response.ok) {
        throw new Error('API intake failed.');
      }

      const result = await response.json();
      setActivity(`${result.message} ${t('activity.completed')} ${result.task.id}`);
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
      setActivity(t('activity.apiUnavailable'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const askKnowledgeBase = async () => {
    const value = assistantQuestion.trim();
    if (!value || !selectedKnowledgeBaseId || apiStatus !== 'online' || isAsking) return;
    setIsAsking(true);
    setAssistantAnswer({ question: value, loading: true });
    setActivity(t('activity.askKnowledgeBase'));

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
      setActivity(`${result.message} ${t('activity.completed')} ${result.task.id}`);
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
        proposedCards: result.proposedCards ?? [],
        messageId: result.messageId,
        artifact: result.artifact,
        citations: result.citations ?? [],
        task: result.task,
      });
      if (result.artifact) {
        setKnowledgeBaseMessages((current) => [
          ...current,
          {
            id: result.messageId ?? `msg_${Date.now()}`,
            knowledgeBaseId: selectedKnowledgeBaseId,
            question: value,
            answer: result.artifact?.body ?? result.message,
            cardIds: (result.cards ?? []).map((card) => card.id),
            artifactId: result.artifact?.id,
            createdAt: new Date().toISOString(),
            proposedCards: result.proposedCards,
          },
        ]);
      }
      if (result.artifact) setSelectedArtifact(result.artifact);
      setAssistantQuestion('');
    } catch {
      setAssistantAnswer({
        question: value,
        error: t('activity.askFailed'),
      });
    } finally {
      setIsAsking(false);
    }
  };

  const openArtifact = (artifact, origin) => {
    if (artifact) {
      setSelectedArtifact(artifact);
      setArtifactOrigin(origin ?? null);
    }
    go('artifact');
  };

  const handleArtifactUpdate = (updatedArtifact) => {
    if (!updatedArtifact) return;
    setSelectedArtifact(updatedArtifact);
    setKnowledgeBaseDetail((current) => (current ? {
      ...current,
      artifacts: (current.artifacts ?? []).map((item) => (item.id === updatedArtifact.id ? updatedArtifact : item)),
    } : current));
  };

  const runKnowledgeKit = async (kitId = 'learning_research') => {
    if (!selectedKnowledgeBaseId || apiStatus !== 'online' || isRunningKit) return null;
    setIsRunningKit(true);
    setActivity(t('activity.runKit'));

    try {
      const response = await fetch(`/api/knowledge-bases/${selectedKnowledgeBaseId}/kits/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kitId }),
      });
      if (!response.ok) throw new Error('Kit run failed.');
      const result = await response.json();
      setActivity(`${result.message} ${t('activity.completed')} ${result.task.id}`);
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
      setActivity(t('activity.kitFailed'));
      return null;
    } finally {
      setIsRunningKit(false);
    }
  };

  const parseMaterial = async (materialId) => {
    if (!materialId || parsingMaterialId) return;
    setParsingMaterialId(materialId);
    setActivity(t('activity.parseMaterial'));

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
      setActivity(t('activity.parseFailed'));
      return null;
    } finally {
      setParsingMaterialId(null);
    }
  };

  const navItems = [
    { key: 'global', label: t('nav.global'), icon: Globe, group: 'core' },
    { key: 'detail', label: t('nav.knowledgeBase'), icon: Database, group: 'core' },
    { key: 'library', label: t('nav.library'), icon: FolderOpen, group: 'core' },
    { key: 'search', label: t('nav.search'), icon: Search, group: 'core' },
    { key: 'chat', label: t('nav.chat'), icon: MessageCircle, group: 'core' },
    { key: 'assets', label: t('nav.assets'), icon: Layers, group: 'insight' },
    { key: 'path', label: t('nav.path'), icon: Map, group: 'insight' },
    { key: 'archive', label: t('nav.archive'), icon: Archive, group: 'tools' },
    { key: 'settings', label: t('nav.settings'), icon: Settings, group: 'tools' },
  ];

  return (
    <main className="app-frame">
      <aside className={`side-nav${navOpen ? ' nav-open' : ''}`} aria-label={t('nav.main')}>
        <div className="brand-row" onClick={() => go('workspace')} role="button" tabIndex={0}>
          <div className="brand-mark" aria-hidden="true"><span /></div>
          <div>
            <h1>{t('app.title')}</h1>
            <p>{t('app.subtitle')}</p>
          </div>
        </div>

        <button className="primary-create" onClick={() => go('workspace')} type="button">
          <Plus size={23} />
          {t('common.create')}
        </button>

        <nav className="nav-list">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const showDivider = index > 0 && item.group !== navItems[index - 1].group;
            return (
              <Fragment key={item.key}>
                {showDivider && <div className="nav-divider" aria-hidden="true" />}
                <button className={view === item.key ? 'active' : ''} onClick={() => go(item.key)} type="button">
                  <Icon size={22} />
                  {item.label}
                </button>
              </Fragment>
            );
          })}
        </nav>

        <div className="side-footer">
          <LanguageSwitcher />
        </div>

        <button
          className="nav-close-button"
          onClick={() => setNavOpen(false)}
          type="button"
          aria-label={t('common.close')}
        >
          <X size={22} />
        </button>
      </aside>

      {navOpen && <div className="nav-backdrop" onClick={() => setNavOpen(false)} aria-hidden="true" />}

      <section className="workspace">
        <header className="top-bar">
          <div className="top-bar-left">
            <button
              className="nav-menu-button"
              onClick={() => setNavOpen(true)}
              type="button"
              aria-label={t('nav.menu')}
            >
              <Menu size={22} />
            </button>
            <KnowledgeBaseSwitcher
              knowledgeBases={knowledgeBases}
              onCreate={() => { setCreateKbError(null); setIsCreateKbOpen(true); }}
              onDelete={(base) => setDeletingKb({ id: base.id, title: base.title })}
              onEdit={(base) => setEditingKb({ id: base.id, title: base.title, summary: base.summary ?? '', error: null })}
              onSelect={(id) => {
                setSelectedKnowledgeBaseId(id);
              }}
              selectedKnowledgeBaseId={selectedKnowledgeBaseId}
            />
            <nav aria-label={t('nav.workspaceNav')}>
              <button className={view === 'workspace' ? 'active' : ''} onClick={() => go('workspace')} type="button">{t('nav.workspace')}</button>
            </nav>
          </div>
          <div className="top-tools">
            <button
              type="button"
              className="search-pill"
              onClick={() => go('search')}
              aria-label={t('common.search')}
            >
              <Search size={18} />
              <input
                placeholder={t('common.search')}
                value={topSearchQuery}
                onChange={(event) => setTopSearchQuery(event.target.value)}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && topSearchQuery.trim()) {
                    const value = topSearchQuery.trim();
                    sessionStorage.setItem(TOP_SEARCH_STORAGE_KEY, value);
                    window.dispatchEvent(new CustomEvent(TOP_SEARCH_EVENT, { detail: value }));
                    go('search');
                  }
                }}
              />
            </button>
            <NotificationDropdown tasks={tasks} />
            <button className="node-button" onClick={() => go('workflow')} type="button">{t('topBar.createNode')}</button>
            <div className="avatar">U</div>
          </div>
        </header>

        <div className="canvas">
          {apiStatus === 'offline' && <SystemNotice status="offline" />}
          {view === 'workspace' && <WorkspaceView activity={activity} apiStatus={apiStatus} isSubmitting={isSubmitting} materials={materials} query={query} selectedKnowledgeBaseId={selectedKnowledgeBaseId} setQuery={setQuery} setView={go} submit={submit} onViewMaterialDetail={handleViewMaterialDetail} browserAiStatus={browserAiStatus} />}
          {view === 'global' && <GlobalView setView={go} />}
          {view === 'detail' && (
            <DetailView
              apiStatus={apiStatus}
              analytics={knowledgeBaseAnalytics}
              assistantAnswer={assistantAnswer}
              assistantQuestion={assistantQuestion}
              detail={knowledgeBaseDetail}
              isAsking={isAsking}
              latestTask={latestTask}
              messages={knowledgeBaseMessages}
              onAsk={askKnowledgeBase}
              onCardsAccepted={(newCards, updatedMessage) => {
                setKnowledgeBaseDetail((current) => ({
                  ...current,
                  cards: [...newCards, ...(current.cards ?? []).filter((card) => !newCards.some((item) => item.id === card.id))],
                }));
                setKnowledgeBaseMessages((current) => current.map((message) => message.id === updatedMessage.id ? updatedMessage : message));
                setAssistantAnswer((current) => current ? { ...current, proposedCards: [], cards: [...(current.cards ?? []), ...newCards] } : current);
              }}
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
              onNavigate={go}
              onParseMaterial={parseMaterial}
              parsingMaterialId={parsingMaterialId}
              selectedKnowledgeBaseId={selectedKnowledgeBaseId}
            />
          )}
          {view === 'search' && (
            <SearchView
              setView={go}
              setSelectedKnowledgeBaseId={setSelectedKnowledgeBaseId}
              onOpenArtifact={openArtifact}
            />
          )}
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
          {view === 'artifact' && <ArtifactView artifact={selectedArtifact} detail={knowledgeBaseDetail} setView={go} artifactOrigin={artifactOrigin} onClearOrigin={() => setArtifactOrigin(null)} onArtifactUpdate={handleArtifactUpdate} />}
          {view === 'maps' && <MapsView apiStatus={apiStatus} selectedKnowledgeBaseId={selectedKnowledgeBaseId} setView={go} />}
          {view === 'assets' && <GlobalAssetsDashboard data={advancedOpsData} setView={go} onOpenArtifact={openArtifact} />}
          {view === 'synthesis' && <CrossKbSynthesisView data={advancedOpsData} setView={go} />}
          {view === 'compare' && <MultiEntityComparisonView data={advancedOpsData} setView={go} />}
          {view === 'conflicts' && <KnowledgeConflictResolverView data={advancedOpsData} setView={go} />}
          {view === 'insights' && <InsightsView setView={go} />}
          {view === 'path' && <PathView selectedKnowledgeBaseId={selectedKnowledgeBaseId} setView={go} />}
          {view === 'archive' && <ArchiveView selectedKnowledgeBaseId={selectedKnowledgeBaseId} setView={go} />}
          {view === 'chat' && (
            <ChatView
              apiStatus={apiStatus}
              assistantAnswer={assistantAnswer}
              assistantQuestion={assistantQuestion}
              detail={knowledgeBaseDetail}
              isAsking={isAsking}
              knowledgeBases={knowledgeBases}
              messages={knowledgeBaseMessages}
              onAsk={askKnowledgeBase}
              onOpenArtifact={openArtifact}
              onSelectKnowledgeBase={(id) => {
                setSelectedKnowledgeBaseId(id);
                go('chat');
              }}
              selectedKnowledgeBaseId={selectedKnowledgeBaseId}
              setAssistantQuestion={setAssistantQuestion}
              setView={go}
            />
          )}
          {view === 'recall' && (
            <RecallView
              detail={knowledgeBaseDetail}
              knowledgeBases={knowledgeBases}
              onSelectKnowledgeBase={(id) => {
                setSelectedKnowledgeBaseId(id);
                go('recall');
              }}
              setView={go}
            />
          )}
          {view === 'export' && <ExportView detail={knowledgeBaseDetail} setView={go} />}
          {view === 'weread' && (
            <WeReadView
              knowledgeBases={knowledgeBases}
              selectedKnowledgeBaseId={selectedKnowledgeBaseId}
              onOpenKnowledgeBase={(id) => {
                if (id && id !== selectedKnowledgeBaseId) setSelectedKnowledgeBaseId(id);
              }}
            />
          )}
          {view === 'settings' && <SettingsView initialSection={settingsSection} onSectionConsumed={() => setSettingsSection(null)} setView={go} browserAiStatus={browserAiStatus} />}
        </div>
      </section>
      {isCreateKbOpen && (
        <CreateKbModal
          error={createKbError}
          onClose={() => { setCreateKbError(null); setIsCreateKbOpen(false); }}
          onSubmit={(payload) => {
            setCreateKbError(null);
            setIsCreateKbOpen(false);
            submit(payload.theme, {
              audience: payload.audience,
              depth: payload.depth,
              scope: payload.scope,
            });
          }}
          onCreateEmpty={async (title, summary) => {
            try {
              const response = await fetch('/api/knowledge-bases', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, summary }),
              });
              if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                throw new Error(body.error || '创建失败');
              }
              const result = await response.json();
              setCreateKbError(null);
              if (result.knowledgeBase?.id) {
                setKnowledgeBases((current) => [
                  result.knowledgeBase,
                  ...current.filter((base) => base.id !== result.knowledgeBase.id),
                ]);
                setSelectedKnowledgeBaseId(result.knowledgeBase.id);
                go('detail');
              }
              setIsCreateKbOpen(false);
            } catch (err) {
              setCreateKbError(err.message || t('activity.createKnowledgeBaseFailed'));
            }
          }}
        />
      )}

      {editingKb && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="modal-head">
              <h3>{t('knowledgeBase.edit')}</h3>
            </div>
            <div className="modal-body">
              <label className="modal-field">
                <span>{t('knowledgeBase.editTitleLabel')}</span>
                <input
                  autoFocus
                  type="text"
                  value={editingKb.title}
                  onChange={(event) => setEditingKb((current) => ({ ...current, title: event.target.value }))}
                />
              </label>
              <label className="modal-field">
                <span>{t('knowledgeBase.editSummaryLabel')}</span>
                <textarea
                  rows={3}
                  value={editingKb.summary}
                  onChange={(event) => setEditingKb((current) => ({ ...current, summary: event.target.value }))}
                />
              </label>
              {editingKb.error && <p className="modal-error" role="alert">{editingKb.error}</p>}
            </div>
            <div className="modal-foot">
              <button className="btn-ghost" type="button" onClick={() => setEditingKb(null)}>{t('common.cancel')}</button>
              <button
                className="btn-primary"
                disabled={!editingKb.title.trim()}
                type="button"
                onClick={() => handleSaveKnowledgeBase(editingKb.id, editingKb.title, editingKb.summary)}
              >
                {t('knowledgeBase.editSave')}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingKb && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="modal-head">
              <AlertTriangle size={24} />
              <h3>{t('knowledgeBase.deleteConfirmTitle')}</h3>
            </div>
            <div className="modal-body">
              <p>{t('knowledgeBase.deleteConfirmHint')}</p>
              <p><strong>{deletingKb.title}</strong></p>
              <p className="modal-error">{t('knowledgeBase.deleteConfirmBody')}</p>
              {deletingKb.error && <p className="modal-error" role="alert">{deletingKb.error}</p>}
            </div>
            <div className="modal-foot">
              <button className="btn-ghost" type="button" onClick={() => setDeletingKb(null)}>{t('common.cancel')}</button>
              <button
                className="btn-primary danger"
                type="button"
                onClick={() => handleDeleteKnowledgeBase(deletingKb.id)}
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
