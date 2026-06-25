import { Fragment, lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './i18n';
import {
  AlertTriangle,
  Archive,
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

import { buildAdvancedOpsData } from './utils/knowledge';
import { viewFromHash, classifyInput, workflowFromKind } from './utils/navigation';
import api from './utils/api';
import useModalA11y from './hooks/useModalA11y';
import { useUiState, API_STATUS_OFFLINE, BROWSER_AI_STATUS_NO_API } from './hooks/useUiState';
import { useWorkspaceState, TASKS_MAX_COUNT } from './hooks/useWorkspaceState';
import { useAssistantState } from './hooks/useAssistantState';
import { useKitState } from './hooks/useKitState';
import { useMaterialParseState } from './hooks/useMaterialParseState';
import { useModalState } from './hooks/useModalState';
import SystemNotice from './components/SystemNotice';
import NotificationDropdown from './components/NotificationDropdown';
import CreateKbModal from './components/CreateKbModal';
import WorkspaceSwitcher from './components/WorkspaceSwitcher';
import GlobalChatDock from './components/GlobalChatDock';
import SearchCommand from './components/SearchCommand';
import { useHotkey } from './hooks/useHotkey';
import { CHAT_OPEN_EVENT } from './constants/options';
const WorkspaceView = lazy(() => import('./views/WorkspaceView'));
const DetailView = lazy(() => import('./views/DetailView'));
const LibraryView = lazy(() => import('./views/LibraryView'));
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
const RecallView = lazy(() => import('./views/RecallView'));
const ExportView = lazy(() => import('./views/ExportView'));
const SettingsView = lazy(() => import('./views/SettingsView'));
const WeReadView = lazy(() => import('./views/WeReadView'));
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './components/LanguageSwitcher';

/**
 * 归集接口路径。
 */
const INTAKE_PATH = '/api/intake';

/**
 * 工作区接口路径前缀（用于 CreateKbModal 的 onCreateEmpty 直接调用）。
 */
const WORKSPACES_PATH = '/api/workspaces';

/**
 * 失败任务客户端兜底 ID 前缀。
 */
const FAILED_TASK_ID_PREFIX = 'local_failed_';

/**
 * 任务状态：失败。
 */
const TASK_STATUS_FAILED = 'failed';

/**
 * 任务轮询间隔（毫秒）。
 */
const TASK_POLL_INTERVAL_MS = 2000;

/**
 * 查询输入未填写时显示的默认类型标签。
 */
const DEFAULT_KIND_LABEL = 'Theme, Link, or Question';

/**
 * 工作区视图标识。
 */
const VIEW_WORKSPACE = 'workspace';

/**
 * 详情视图标识。
 */
const VIEW_DETAIL = 'detail';

/**
 * 设置视图标识。
 */
const VIEW_SETTINGS = 'settings';

function App() {
  const { t } = useTranslation();

  const {
    view,
    setView,
    query,
    setQuery,
    activity,
    setActivity,
    navOpen,
    setNavOpen,
    topSearchQuery,
    setTopSearchQuery,
    settingsSection,
    setSettingsSection,
    apiStatus,
    setApiStatus,
    browserAiStatus,
    setBrowserAiStatus,
    isSubmitting,
    setIsSubmitting,
  } = useUiState(t);

  const {
    isCreateKbOpen,
    setIsCreateKbOpen,
    createKbError,
    setCreateKbError,
    editingKb,
    setEditingKb,
    deletingKb,
    setDeletingKb,
  } = useModalState();

  const [selectedArtifact, setSelectedArtifact] = useState(null);
  const [artifactOrigin, setArtifactOrigin] = useState(null);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInitialQuery, setSearchInitialQuery] = useState('');

  const openSearchCommand = (initialQuery = '') => {
    setSearchInitialQuery(initialQuery);
    setSearchOpen(true);
  };
  useHotkey('k', () => {
    if (searchOpen) {
      setSearchOpen(false);
    } else {
      openSearchCommand('');
    }
  });
  useHotkey('j', () => {
    window.dispatchEvent(new CustomEvent(CHAT_OPEN_EVENT));
  });

  const editingModalRef = useRef(null);
  const deletingModalRef = useRef(null);
  useModalA11y(editingModalRef, Boolean(editingKb), () => setEditingKb(null));
  useModalA11y(deletingModalRef, Boolean(deletingKb), () => setDeletingKb(null));

  const go = (nextView) => {
    setView(nextView);
    setNavOpen(false);
    if (nextView === VIEW_WORKSPACE) {
      window.history.replaceState(null, '', window.location.pathname);
      return;
    }
    window.location.hash = nextView;
  };

  const {
    workspaces,
    setWorkspaces,
    materials,
    tasks,
    setTasks,
    selectedWorkspaceId,
    setSelectedWorkspaceId,
    workspaceDetail,
    setWorkspaceDetail,
    workspaceAnalytics,
    setWorkspaceAnalytics,
    latestTaskId,
    setLatestTaskId,
    latestTask,
    setLatestTask,
    loadDashboard,
    loadDetail,
    loadAnalytics,
    loadTask,
    applyIntakeResult,
    applyMaterialMutation,
    handleSaveWorkspace,
    handleCreateWorkspace,
    handleDeleteWorkspace,
    resetDetailForEmptySelection,
  } = useWorkspaceState({
    apiStatus,
    setApiStatus,
    setEditingKb,
    setDeletingKb,
    go,
    t,
  });

  const {
    assistantQuestion,
    setAssistantQuestion,
    assistantAnswer,
    setAssistantAnswer,
    isAsking,
    workspaceMessages,
    setWorkspaceMessages,
    loadMessages,
    askWorkspace,
  } = useAssistantState({
    selectedWorkspaceId,
    apiStatus,
    setActivity,
    setWorkspaces,
    setWorkspaceDetail,
    setTasks,
    setLatestTaskId,
    setLatestTask,
    setSelectedArtifact,
    t,
  });

  const {
    isRunningKit,
    kitRunResult,
    setKitRunResult,
    runKnowledgeKit,
  } = useKitState({
    selectedWorkspaceId,
    apiStatus,
    setActivity,
    setWorkspaces,
    setWorkspaceDetail,
    setTasks,
    setLatestTaskId,
    setLatestTask,
    setSelectedArtifact,
    t,
  });

  const {
    parsingMaterialId,
    parseMaterial,
  } = useMaterialParseState({
    setActivity,
    setTasks,
    setLatestTaskId,
    setLatestTask,
    setWorkspaceDetail,
    setWorkspaces,
    setSelectedArtifact,
    t,
  });

  const kind = useMemo(() => (query.trim() ? classifyInput(query.trim()) : DEFAULT_KIND_LABEL), [query]);
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
        if (detail.view === VIEW_SETTINGS && detail.section) {
          setSettingsSection(detail.section);
          window.location.hash = VIEW_SETTINGS;
        } else if (detail.view === VIEW_WORKSPACE) {
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
        if (!ignore) setBrowserAiStatus(BROWSER_AI_STATUS_NO_API);
      }
    }
    detectBrowserAiStatus();
    return () => { ignore = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadDashboard(selectedWorkspaceId, () => cancelled);
    return () => {
      cancelled = true;
    };
  }, [selectedWorkspaceId]);

  useEffect(() => {
    if (!selectedWorkspaceId) {
      resetDetailForEmptySelection();
      setAssistantAnswer(null);
      setAssistantQuestion('');
      setWorkspaceMessages([]);
      return;
    }

    let ignore = false;
    loadDetail(selectedWorkspaceId, () => ignore);
    loadMessages(selectedWorkspaceId, () => ignore);
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
    loadAnalytics(selectedWorkspaceId, () => ignore);
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

    loadTask(latestTaskId, () => cancelled);
    const timer = window.setInterval(() => loadTask(latestTaskId, () => cancelled), TASK_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [latestTaskId]);

  const applyMaterialMutationWithArtifact = (result) => {
    applyMaterialMutation(result, setSelectedArtifact);
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

  const handleViewMaterialDetail = (material) => {
    go('library');
  };

  const submit = async (overrideValue, options) => {
    const value = (overrideValue ?? query).trim();
    if (!value || isSubmitting) return;
    setIsSubmitting(true);
    setActivity(t('activity.captured'));

    try {
      const result = await api.post(INTAKE_PATH, { input: value, ...options });
      setActivity(`${result.message} ${t('activity.completed')} ${result.task.id}`);
      applyIntakeResult(result);
      setQuery('');
    } catch {
      const timestamp = new Date().toISOString();
      const failedTask = {
        id: `${FAILED_TASK_ID_PREFIX}${Date.now()}`,
        workflow: workflowFromKind(kind),
        status: TASK_STATUS_FAILED,
        input: { input: value },
        error: t('activity.apiUnavailable'),
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      setApiStatus(API_STATUS_OFFLINE);
      setLatestTaskId(null);
      setLatestTask(failedTask);
      setTasks((current) => [failedTask, ...current].slice(0, TASKS_MAX_COUNT));
      setActivity(t('activity.apiUnavailable'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const navItems = [
    { key: 'workspace', label: t('nav.workspace'), icon: Database, group: 'core' },
    { key: 'detail', label: t('nav.detail'), icon: Layers, group: 'core' },
    { key: 'library', label: t('nav.library'), icon: FolderOpen, group: 'core' },
    { key: 'insights', label: t('nav.insights'), icon: Lightbulb, group: 'insight' },
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
              onClick={() => openSearchCommand('')}
              aria-label={t('common.search')}
            >
              <Search size={18} />
              <input
                placeholder={t('common.search')}
                value={topSearchQuery}
                onChange={(event) => setTopSearchQuery(event.target.value)}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    const value = topSearchQuery.trim();
                    openSearchCommand(value);
                    setTopSearchQuery('');
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
              analytics={workspaceAnalytics}
              detail={workspaceDetail}
              latestTask={latestTask}
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
              onMaterialMutation={applyMaterialMutationWithArtifact}
              onNavigate={go}
              onParseMaterial={parseMaterial}
              parsingMaterialId={parsingMaterialId}
              selectedWorkspaceId={selectedWorkspaceId}
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
          {view === 'insights' && (
            <InsightsView
              setView={go}
              onCreateWorkspace={handleCreateWorkspace}
              onSelectWorkspace={(id) => {
                setSelectedWorkspaceId(id);
                go('workspace');
              }}
            />
          )}
          {view === 'path' && <PathView selectedWorkspaceId={selectedWorkspaceId} setView={go} />}
          {view === 'archive' && <ArchiveView selectedWorkspaceId={selectedWorkspaceId} setView={go} />}
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
              result = await api.post(WORKSPACES_PATH, { title, summary });
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
                onClick={() => handleDeleteWorkspace(deletingKb.id, selectedWorkspaceId)}
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      <GlobalChatDock
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
          if (id) {
            setSelectedWorkspaceId(id);
          }
        }}
        onCardsAccepted={(newCards, updatedMessage) => {
          setWorkspaceDetail((current) => ({
            ...current,
            cards: [...newCards, ...(current.cards ?? []).filter((card) => !newCards.some((item) => item.id === card.id))],
          }));
          setWorkspaceMessages((current) => current.map((message) => message.id === updatedMessage.id ? updatedMessage : message));
          setAssistantAnswer((current) => current ? { ...current, proposedCards: [], cards: [...(current.cards ?? []), ...newCards] } : current);
        }}
        selectedWorkspaceId={selectedWorkspaceId}
        setAssistantQuestion={setAssistantQuestion}
      />

      <SearchCommand
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        initialQuery={searchInitialQuery}
        setView={go}
        setSelectedWorkspaceId={setSelectedWorkspaceId}
        onOpenArtifact={openArtifact}
      />
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
