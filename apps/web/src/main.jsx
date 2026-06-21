import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './i18n';
import {
  Archive,
  Bell,
  CircleHelp,
  Database,
  FolderOpen,
  History,
  Layers,
  Lightbulb,
  LogOut,
  Map,
  Plus,
  Search,
  Settings,
  Sparkles,
} from 'lucide-react';
import './styles.css';

import { seedKnowledgeBases, seedMaterials } from './constants/seedData';
import { materialFromApi } from './utils/material';
import {
  formatBaseMeta,
  buildAdvancedOpsData,
  fallbackDetail,
  emptyDetail,
} from './utils/knowledge';
import { viewFromHash, classifyInput, workflowFromKind } from './utils/navigation';
import SystemNotice from './components/SystemNotice';
import CreateKbModal from './components/CreateKbModal';
import KnowledgeBaseSwitcher from './components/KnowledgeBaseSwitcher';
import WorkspaceView from './views/WorkspaceView';
import DetailView from './views/DetailView';
import LibraryView from './views/LibraryView';
import SearchView from './views/SearchView';
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
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './components/LanguageSwitcher';

function App() {
  const { t, i18n } = useTranslation();
  const [view, setView] = useState(viewFromHash);
  const [query, setQuery] = useState('');
  const [activity, setActivity] = useState(t('activity.ready'));
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
  const [knowledgeBaseMessages, setKnowledgeBaseMessages] = useState([]);
  const [isAsking, setIsAsking] = useState(false);
  const [selectedArtifact, setSelectedArtifact] = useState(null);
  const [artifactOrigin, setArtifactOrigin] = useState(null);
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
    setActivity(t('activity.captured'));

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
        artifact: result.artifact,
        citations: result.citations ?? [],
        task: result.task,
      });
      if (result.artifact) {
        setKnowledgeBaseMessages((current) => [
          ...current,
          {
            id: `msg_${Date.now()}`,
            knowledgeBaseId: selectedKnowledgeBaseId,
            question: value,
            answer: result.artifact?.body ?? result.message,
            cardIds: (result.cards ?? []).map((card) => card.id),
            artifactId: result.artifact?.id,
            createdAt: new Date().toISOString(),
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
    { key: 'detail', label: t('nav.knowledgeBase'), icon: Database },
    { key: 'library', label: t('nav.library'), icon: FolderOpen },
    { key: 'search', label: t('nav.search'), icon: Search },
    { key: 'assets', label: t('nav.assets'), icon: Layers },
    { key: 'insights', label: t('nav.insights'), icon: Lightbulb },
    { key: 'path', label: t('nav.path'), icon: Map },
    { key: 'archive', label: t('nav.archive'), icon: Archive },
    { key: 'kits', label: t('nav.kits'), icon: Sparkles },
    { key: 'settings', label: t('nav.settings'), icon: Settings },
  ];

  return (
    <main className="app-frame">
      <aside className="side-nav" aria-label={t('nav.main')}>
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

        <div className="side-footer">
          <LanguageSwitcher />
          <button type="button"><CircleHelp size={22} />{t('nav.help')}</button>
          <button type="button"><LogOut size={22} />{t('nav.logout')}</button>
        </div>
      </aside>

      <section className="workspace">
        <header className="top-bar">
          <div className="top-bar-left">
            <KnowledgeBaseSwitcher
              knowledgeBases={knowledgeBases}
              onCreate={() => setIsCreateKbOpen(true)}
              onSelect={(id) => {
                setSelectedKnowledgeBaseId(id);
                go('detail');
              }}
              selectedKnowledgeBaseId={selectedKnowledgeBaseId}
            />
            <nav aria-label={t('nav.workspaceNav')}>
              <button className={view === 'workspace' ? 'active' : ''} onClick={() => go('workspace')} type="button">{t('nav.workspace')}</button>
              <button className={view === 'maps' ? 'active' : ''} onClick={() => go('maps')} type="button">{t('nav.maps')}</button>
              <button className={view === 'export' ? 'active' : ''} onClick={() => go('export')} type="button">{t('nav.export')}</button>
            </nav>
          </div>
          <div className="top-tools">
            <label className="search-pill">
              <Search size={18} />
              <input placeholder={t('common.search')} />
            </label>
            <button title={t('common.notifications')} type="button"><Bell size={22} /></button>
            <button title={t('common.history')} type="button"><History size={22} /></button>
            <button className="node-button" onClick={() => go('workflow')} type="button">{t('topBar.createNode')}</button>
            <div className="avatar">U</div>
          </div>
        </header>

        <div className="canvas">
          {apiStatus === 'offline' && <SystemNotice status="offline" />}
          {view === 'workspace' && <WorkspaceView activity={activity} isSubmitting={isSubmitting} materials={materials} query={query} selectedKnowledgeBaseId={selectedKnowledgeBaseId} setQuery={setQuery} setView={go} submit={submit} tasks={tasks} />}
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
          {view === 'artifact' && <ArtifactView artifact={selectedArtifact} detail={knowledgeBaseDetail} setView={go} artifactOrigin={artifactOrigin} onClearOrigin={() => setArtifactOrigin(null)} onArtifactUpdate={handleArtifactUpdate} />}
          {view === 'maps' && <MapsView apiStatus={apiStatus} selectedKnowledgeBaseId={selectedKnowledgeBaseId} setView={go} />}
          {view === 'assets' && <GlobalAssetsDashboard data={advancedOpsData} setView={go} />}
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
              messages={knowledgeBaseMessages}
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
              if (result.knowledgeBase?.id) {
                setSelectedKnowledgeBaseId(result.knowledgeBase.id);
                go('detail');
              }
              await refreshDashboard();
            } catch (err) {
              setActivity(err.message || t('activity.createKnowledgeBaseFailed'));
            }
            setIsCreateKbOpen(false);
          }}
        />
      )}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
