import { Fragment, lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './i18n';
import {
  AlertTriangle,
  Archive,
  BookOpen,
  Database,
  FolderOpen,
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

import { seedWorkspaces, seedMaterials } from './constants/seedData';
import { TOP_SEARCH_EVENT, TOP_SEARCH_STORAGE_KEY } from './constants/options';
import { materialFromApi } from './utils/material';
import {
  formatBaseMeta,
  buildAdvancedOpsData,
  fallbackDetail,
  emptyDetail,
} from './utils/knowledge';
import { viewFromHash, classifyInput, workflowFromKind } from './utils/navigation';
import api, { ApiError } from './utils/api';
import useModalA11y from './hooks/useModalA11y';
import SystemNotice from './components/SystemNotice';
import NotificationDropdown from './components/NotificationDropdown';
import CreateKbModal from './components/CreateKbModal';
import WorkspaceSwitcher from './components/WorkspaceSwitcher';
const WorkspaceView = lazy(() => import('./views/WorkspaceView'));
const DetailView = lazy(() => import('./views/DetailView'));
const LibraryView = lazy(() => import('./views/LibraryView'));
const SearchView = lazy(() => import('./views/SearchView'));
const KitView = lazy(() => import('./views/KitView'));
const WorkflowView = lazy(() => import('./views/WorkflowView'));
const ArtifactView = lazy(() => import('./views/ArtifactView'));
const MapsView = lazy(() => import('./views/MapsView'));
const GlobalAssetsDashboard = lazy(() => import('./views/GlobalAssetsDashboard'));
const MultiEntityComparisonView = lazy(() => import('./views/MultiEntityComparisonView'));
const KnowledgeConflictResolverView = lazy(() => import('./views/KnowledgeConflictResolverView'));
const InsightsView = lazy(() => import('./views/InsightsView'));
const PathView = lazy(() => import('./views/PathView'));
const ArchiveView = lazy(() => import('./views/ArchiveView'));
const ChatView = lazy(() => import('./views/ChatView'));
const RecallView = lazy(() => import('./views/RecallView'));
const ExportView = lazy(() => import('./views/ExportView'));
const SettingsView = lazy(() => import('./views/SettingsView'));
const WeReadView = lazy(() => import('./views/WeReadView'));
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './components/LanguageSwitcher';

function App() {
  const { t, i18n } = useTranslation();
  const [view, setView] = useState(viewFromHash);
  const [query, setQuery] = useState('');
  const [activity, setActivity] = useState(t('activity.ready'));
  const [apiStatus, setApiStatus] = useState('checking');
  const [browserAiStatus, setBrowserAiStatus] = useState('checking');
  const [workspaces, setWorkspaces] = useState(seedWorkspaces);
  const [materials, setMaterials] = useState(seedMaterials);
  const [tasks, setTasks] = useState([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(null);
  const [workspaceDetail, setWorkspaceDetail] = useState(fallbackDetail);
  const [workspaceAnalytics, setWorkspaceAnalytics] = useState(null);
  const [latestTaskId, setLatestTaskId] = useState(null);
  const [latestTask, setLatestTask] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assistantQuestion, setAssistantQuestion] = useState('');
  const [assistantAnswer, setAssistantAnswer] = useState(null);
  const [workspaceMessages, setWorkspaceMessages] = useState([]);
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
  const editingModalRef = useRef(null);
  const deletingModalRef = useRef(null);
  useModalA11y(editingModalRef, Boolean(editingKb), () => setEditingKb(null));
  useModalA11y(deletingModalRef, Boolean(deletingKb), () => setDeletingKb(null));
  const [settingsSection, setSettingsSection] = useState(null);
  const [navOpen, setNavOpen] = useState(false);
  const [topSearchQuery, setTopSearchQuery] = useState('');
  const kind = useMemo(() => (query.trim() ? classifyInput(query.trim()) : 'Theme, Link, or Question'), [query]);
  const advancedOpsData = useMemo(() => buildAdvancedOpsData({
    workspaces,
    materials,
    detail: workspaceDetail,
    tasks,
  }), [workspaces, materials, workspaceDetail, tasks]);

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
        const url = selectedWorkspaceId
          ? `/api/dashboard?workspaceId=${encodeURIComponent(selectedWorkspaceId)}`
          : '/api/dashboard';
        const dashboard = await api.get(url);
        if (ignore) return;
        const nextWorkspaces = dashboard.workspaces ?? [];
        const nextMaterials = dashboard.materials ?? [];
        const nextTasks = dashboard.tasks ?? [];
        setApiStatus('online');
        setWorkspaces(nextWorkspaces);
        setMaterials(nextMaterials.map(materialFromApi));
        setTasks(nextTasks);
        setSelectedWorkspaceId((current) => {
          if (current || nextWorkspaces.length === 0) return current;
          return nextWorkspaces[0].id;
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
  }, [selectedWorkspaceId]);

  useEffect(() => {
    if (!selectedWorkspaceId) {
      setWorkspaceDetail(apiStatus === 'online' ? emptyDetail() : fallbackDetail());
      setWorkspaceAnalytics(null);
      setAssistantAnswer(null);
      setAssistantQuestion('');
      setWorkspaceMessages([]);
      return;
    }

    let ignore = false;
    async function loadDetail() {
      try {
        const detail = await api.get(`/api/workspaces/${selectedWorkspaceId}`);
        if (!ignore) setWorkspaceDetail(detail);
      } catch {
        if (!ignore) setWorkspaceDetail(fallbackDetail());
      }
    }
    async function loadMessages() {
      try {
        const payload = await api.get(`/api/workspaces/${selectedWorkspaceId}/messages?limit=50`);
        if (!ignore) setWorkspaceMessages(payload.messages ?? []);
      } catch {
        if (!ignore) setWorkspaceMessages([]);
      }
    }
    loadDetail();
    loadMessages();
    return () => {
      ignore = true;
    };
  }, [apiStatus, selectedWorkspaceId]);

  useEffect(() => {
    if (!selectedWorkspaceId || apiStatus !== 'online') {
      setWorkspaceAnalytics(null);
      return;
    }

    let ignore = false;
    async function loadAnalytics() {
      try {
        const analytics = await api.get(`/api/workspaces/${selectedWorkspaceId}/analytics`);
        if (!ignore) setWorkspaceAnalytics(analytics);
      } catch {
        if (!ignore) setWorkspaceAnalytics(null);
      }
    }
    loadAnalytics();
    return () => {
      ignore = true;
    };
  }, [apiStatus, selectedWorkspaceId, latestTask?.updatedAt]);

  useEffect(() => {
    setAssistantAnswer(null);
    setAssistantQuestion('');
    setSelectedArtifact(null);
    setKitRunResult(null);
  }, [selectedWorkspaceId]);

  useEffect(() => {
    if (!latestTaskId) return undefined;
    let cancelled = false;

    async function loadTask() {
      try {
        const task = await api.get(`/api/tasks/${latestTaskId}`);
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
    setSelectedWorkspaceId(result.workspace.id);
    setWorkspaces((current) => {
      const withoutDuplicate = current.filter((base) => base.id !== result.workspace.id && base.title !== result.workspace.title);
      return [result.workspace, ...withoutDuplicate];
    });
    if (result.material) {
      setMaterials((current) => [materialFromApi(result.material), ...current].slice(0, 6));
      setWorkspaceDetail((current) => current.id === result.workspace.id ? ({
        ...current,
        ...result.workspace,
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
    if (result.workspace) {
      setWorkspaces((current) => [result.workspace, ...current.filter((base) => base.id !== result.workspace.id)]);
    }
    setMaterials((current) => [materialFromApi(result.material), ...current.filter((material) => material.id !== result.material.id)].slice(0, 6));
    setWorkspaceDetail((current) => {
      const isTargetDetail = current.id === result.material.workspaceId;
      const isPreviousDetail = current.id === result.previousWorkspaceId;
      if (!isTargetDetail && !isPreviousDetail) return current;
      if (isPreviousDetail && !isTargetDetail) {
        return {
          ...current,
          materials: (current.materials ?? []).filter((material) => material.id !== result.material.id),
        };
      }
      return {
        ...current,
        ...(result.workspace ?? {}),
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

  async function handleSaveWorkspace(id, title, summary) {
    try {
      const result = await api.put(`/api/workspaces/${id}`, { title, summary });
      setWorkspaces((current) => current.map((base) => base.id === id ? result.workspace : base));
      setEditingKb(null);
    } catch (err) {
      setEditingKb((current) => ({ ...current, error: err.serverMessage || err.message || t('workspace.edit') }));
    }
  }

  async function handleCreateWorkspace({ title, summary }) {
    let result;
    try {
      result = await api.post('/api/workspaces', { title, summary });
    } catch (err) {
      throw new Error(err.serverMessage || err.message || t('common.createFailed'));
    }
    if (result.workspace?.id) {
      setWorkspaces((current) => [
        result.workspace,
        ...current.filter((base) => base.id !== result.workspace.id),
      ]);
      setSelectedWorkspaceId(result.workspace.id);
      go('detail');
    }
  }

  async function handleDeleteWorkspace(id) {
    try {
      await api.del(`/api/workspaces/${id}`);
      setWorkspaces((current) => current.filter((base) => base.id !== id));
      if (selectedWorkspaceId === id) {
        setSelectedWorkspaceId(null);
      }
      setDeletingKb(null);
    } catch (err) {
      setDeletingKb((current) => ({ ...current, error: err.serverMessage || err.message || t('workspace.delete') }));
    }
  }

  const submit = async (overrideValue, options) => {
    const value = (overrideValue ?? query).trim();
    if (!value || isSubmitting) return;
    setIsSubmitting(true);
    setActivity(t('activity.captured'));

    try {
      const result = await api.post('/api/intake', { input: value, ...options });
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
        error: t('activity.apiUnavailable'),
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

  const askWorkspace = async () => {
    const value = assistantQuestion.trim();
    if (!value || !selectedWorkspaceId || apiStatus !== 'online' || isAsking) return;
    setIsAsking(true);
    setAssistantAnswer({ question: value, loading: true });
    setActivity(t('activity.askWorkspace'));

    try {
      const result = await api.post(`/api/workspaces/${selectedWorkspaceId}/ask`, { question: value });
      setActivity(`${result.message} ${t('activity.completed')} ${result.task.id}`);
      setLatestTaskId(result.task.id);
      setLatestTask(result.task);
      setTasks((current) => [result.task, ...current.filter((task) => task.id !== result.task.id)].slice(0, 8));
      setWorkspaces((current) => {
        const withoutDuplicate = current.filter((base) => base.id !== result.workspace.id);
        return [result.workspace, ...withoutDuplicate];
      });
      setWorkspaceDetail((current) => ({
        ...current,
        ...result.workspace,
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
        setWorkspaceMessages((current) => [
          ...current,
          {
            id: result.messageId ?? `msg_${Date.now()}`,
            workspaceId: selectedWorkspaceId,
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
    setWorkspaceDetail((current) => (current ? {
      ...current,
      artifacts: (current.artifacts ?? []).map((item) => (item.id === updatedArtifact.id ? updatedArtifact : item)),
    } : current));
  };

  const runKnowledgeKit = async (kitId = 'learning_research') => {
    if (!selectedWorkspaceId || apiStatus !== 'online' || isRunningKit) return null;
    setIsRunningKit(true);
    setActivity(t('activity.runKit'));

    try {
      const result = await api.post(`/api/workspaces/${selectedWorkspaceId}/kits/run`, { kitId });
      setActivity(`${result.message} ${t('activity.completed')} ${result.task.id}`);
      setLatestTaskId(result.task.id);
      setLatestTask(result.task);
      setTasks((current) => [result.task, ...current.filter((task) => task.id !== result.task.id)].slice(0, 8));
      setWorkspaces((current) => [result.workspace, ...current.filter((base) => base.id !== result.workspace.id)]);
      setWorkspaceDetail((current) => ({
        ...current,
        ...result.workspace,
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
      const result = await api.post(`/api/materials/${materialId}/parse`);
      setActivity(result.message);
      setLatestTaskId(result.task.id);
      setLatestTask(result.task);
      setTasks((current) => [result.task, ...current.filter((task) => task.id !== result.task.id)].slice(0, 8));
      setWorkspaceDetail((current) => ({
        ...current,
        ...(result.workspace ?? {}),
        materials: [result.material, ...(current.materials ?? []).filter((material) => material.id !== result.material.id)],
        cards: [...(result.cards ?? []), ...(current.cards ?? []).filter((card) => !(result.cards ?? []).some((item) => item.id === card.id))],
        artifacts: result.artifact
          ? [result.artifact, ...(current.artifacts ?? []).filter((artifact) => artifact.id !== result.artifact.id)]
          : current.artifacts ?? [],
      }));
      setWorkspaces((current) => result.workspace
        ? [result.workspace, ...current.filter((base) => base.id !== result.workspace.id)]
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
    { key: 'workspace', label: t('nav.workspace'), icon: Database, group: 'core' },
    { key: 'detail', label: t('nav.detail'), icon: Layers, group: 'core' },
    { key: 'library', label: t('nav.library'), icon: FolderOpen, group: 'core' },
    { key: 'search', label: t('nav.search'), icon: Search, group: 'core' },
    { key: 'chat', label: t('nav.chat'), icon: MessageCircle, group: 'core' },
    { key: 'insights', label: t('nav.insights'), icon: Lightbulb, group: 'insight' },
    { key: 'assets', label: t('nav.assets'), icon: Layers, group: 'insight' },
    { key: 'path', label: t('nav.path'), icon: Map, group: 'insight' },
    { key: 'archive', label: t('nav.archive'), icon: Archive, group: 'tools' },
    { key: 'weread', label: t('nav.weread'), icon: BookOpen, group: 'tools' },
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
            <WorkspaceSwitcher
              workspaces={workspaces}
              onCreate={() => { setCreateKbError(null); setIsCreateKbOpen(true); }}
              onDelete={(base) => setDeletingKb({ id: base.id, title: base.title })}
              onEdit={(base) => setEditingKb({ id: base.id, title: base.title, summary: base.summary ?? '', error: null })}
              onSelect={(id) => {
                setSelectedWorkspaceId(id);
              }}
              selectedWorkspaceId={selectedWorkspaceId}
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
          <Suspense fallback={<div className="view-loading">{t('common.loading')}</div>}>
          {view === 'workspace' && <WorkspaceView activity={activity} apiStatus={apiStatus} isSubmitting={isSubmitting} materials={materials} query={query} selectedWorkspaceId={selectedWorkspaceId} setQuery={setQuery} setView={go} submit={submit} onViewMaterialDetail={handleViewMaterialDetail} browserAiStatus={browserAiStatus} />}
          {view === 'detail' && (
            <DetailView
              apiStatus={apiStatus}
              analytics={workspaceAnalytics}
              assistantAnswer={assistantAnswer}
              assistantQuestion={assistantQuestion}
              detail={workspaceDetail}
              isAsking={isAsking}
              latestTask={latestTask}
              messages={workspaceMessages}
              onAsk={askWorkspace}
              onCardsAccepted={(newCards, updatedMessage) => {
                setWorkspaceDetail((current) => ({
                  ...current,
                  cards: [...newCards, ...(current.cards ?? []).filter((card) => !newCards.some((item) => item.id === card.id))],
                }));
                setWorkspaceMessages((current) => current.map((message) => message.id === updatedMessage.id ? updatedMessage : message));
                setAssistantAnswer((current) => current ? { ...current, proposedCards: [], cards: [...(current.cards ?? []), ...newCards] } : current);
              }}
              onOpenArtifact={openArtifact}
              onParseMaterial={parseMaterial}
              parsingMaterialId={parsingMaterialId}
              selectedWorkspaceId={selectedWorkspaceId}
              setAssistantQuestion={setAssistantQuestion}
              setView={go}
            />
          )}
          {view === 'library' && (
            <LibraryView
              apiStatus={apiStatus}
              workspaces={workspaces}
              onCaptureResult={applyIntakeResult}
              onMaterialMutation={applyMaterialMutation}
              onNavigate={go}
              onParseMaterial={parseMaterial}
              parsingMaterialId={parsingMaterialId}
              selectedWorkspaceId={selectedWorkspaceId}
            />
          )}
          {view === 'search' && (
            <SearchView
              setView={go}
              setSelectedWorkspaceId={setSelectedWorkspaceId}
              onOpenArtifact={openArtifact}
            />
          )}
          {view === 'kits' && (
            <KitView
              apiStatus={apiStatus}
              isRunningKit={isRunningKit}
              onRunKit={runKnowledgeKit}
              selectedWorkspaceId={selectedWorkspaceId}
              setView={go}
            />
          )}
          {view === 'workflow' && (
            <WorkflowView
              detail={workspaceDetail}
              isRunningKit={isRunningKit}
              kitRunResult={kitRunResult}
              latestTask={latestTask}
              onOpenArtifact={openArtifact}
              onRunKit={runKnowledgeKit}
              selectedWorkspaceId={selectedWorkspaceId}
              setView={go}
            />
          )}
          {view === 'artifact' && <ArtifactView artifact={selectedArtifact} detail={workspaceDetail} setView={go} artifactOrigin={artifactOrigin} onClearOrigin={() => setArtifactOrigin(null)} onArtifactUpdate={handleArtifactUpdate} />}
          {view === 'maps' && <MapsView apiStatus={apiStatus} selectedWorkspaceId={selectedWorkspaceId} setView={go} />}
          {view === 'assets' && <GlobalAssetsDashboard data={advancedOpsData} setView={go} onOpenArtifact={openArtifact} />}
          {view === 'compare' && <MultiEntityComparisonView data={advancedOpsData} setView={go} />}
          {view === 'conflicts' && <KnowledgeConflictResolverView data={advancedOpsData} setView={go} />}
          {view === 'insights' && <InsightsView setView={go} onCreateWorkspace={handleCreateWorkspace} />}
          {view === 'path' && <PathView selectedWorkspaceId={selectedWorkspaceId} setView={go} />}
          {view === 'archive' && <ArchiveView selectedWorkspaceId={selectedWorkspaceId} setView={go} />}
          {view === 'chat' && (
            <ChatView
              apiStatus={apiStatus}
              assistantAnswer={assistantAnswer}
              assistantQuestion={assistantQuestion}
              detail={workspaceDetail}
              isAsking={isAsking}
              workspaces={workspaces}
              messages={workspaceMessages}
              onAsk={askWorkspace}
              onOpenArtifact={openArtifact}
              onSelectWorkspace={(id) => {
                setSelectedWorkspaceId(id);
                go('chat');
              }}
              selectedWorkspaceId={selectedWorkspaceId}
              setAssistantQuestion={setAssistantQuestion}
              setView={go}
            />
          )}
          {view === 'recall' && (
            <RecallView
              detail={workspaceDetail}
              workspaces={workspaces}
              onSelectWorkspace={(id) => {
                setSelectedWorkspaceId(id);
                go('recall');
              }}
              setView={go}
            />
          )}
          {view === 'export' && <ExportView detail={workspaceDetail} setView={go} />}
          {view === 'weread' && (
            <WeReadView
              workspaces={workspaces}
              selectedWorkspaceId={selectedWorkspaceId}
              onOpenWorkspace={(id) => {
                if (id && id !== selectedWorkspaceId) setSelectedWorkspaceId(id);
              }}
            />
          )}
          {view === 'settings' && <SettingsView initialSection={settingsSection} onSectionConsumed={() => setSettingsSection(null)} setView={go} browserAiStatus={browserAiStatus} />}
          </Suspense>
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
            let result;
            try {
              result = await api.post('/api/workspaces', { title, summary });
            } catch (err) {
              setCreateKbError(err.serverMessage || err.message || t('common.createFailed'));
              return;
            }
            setCreateKbError(null);
            if (result.workspace?.id) {
              setWorkspaces((current) => [
                result.workspace,
                ...current.filter((base) => base.id !== result.workspace.id),
              ]);
              setSelectedWorkspaceId(result.workspace.id);
              go('detail');
            }
            setIsCreateKbOpen(false);
          }}
        />
      )}

      {editingKb && (
        <div className="modal-overlay" ref={editingModalRef} onClick={(event) => { if (event.target === event.currentTarget) setEditingKb(null); }} role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="modal-head">
              <h3>{t('workspace.edit')}</h3>
            </div>
            <div className="modal-body">
              <label className="modal-field">
                <span>{t('workspace.editTitleLabel')}</span>
                <input
                  autoFocus
                  type="text"
                  value={editingKb.title}
                  onChange={(event) => setEditingKb((current) => ({ ...current, title: event.target.value }))}
                />
              </label>
              <label className="modal-field">
                <span>{t('workspace.editSummaryLabel')}</span>
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
                onClick={() => handleSaveWorkspace(editingKb.id, editingKb.title, editingKb.summary)}
              >
                {t('workspace.editSave')}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingKb && (
        <div className="modal-overlay" ref={deletingModalRef} onClick={(event) => { if (event.target === event.currentTarget) setDeletingKb(null); }} role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="modal-head">
              <AlertTriangle size={24} />
              <h3>{t('workspace.deleteConfirmTitle')}</h3>
            </div>
            <div className="modal-body">
              <p>{t('workspace.deleteConfirmHint')}</p>
              <p><strong>{deletingKb.title}</strong></p>
              <p className="modal-error">{t('workspace.deleteConfirmBody')}</p>
              {deletingKb.error && <p className="modal-error" role="alert">{deletingKb.error}</p>}
            </div>
            <div className="modal-foot">
              <button className="btn-ghost" type="button" onClick={() => setDeletingKb(null)}>{t('common.cancel')}</button>
              <button
                className="btn-primary danger"
                type="button"
                onClick={() => handleDeleteWorkspace(deletingKb.id)}
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
