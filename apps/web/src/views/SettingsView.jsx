/**
 * @module views/SettingsView
 * 设置视图：配置模型服务商、系统透明度、数据控制。
 */

import { useEffect, useState } from 'react';
import { BarChart3, Database, KeyRound, PlugZap, Settings, ShieldCheck, Trash2, Download } from 'lucide-react';

/**
 * 设置视图组件：模型配置 + 系统透明度 + 数据控制
 * @returns {JSX.Element} 设置视图
 * @author fxbin
 */
export default function SettingsView() {
  const [settings, setSettings] = useState(null);
  const [provider, setProvider] = useState('');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [fallbackToMock, setFallbackToMock] = useState(true);
  const [status, setStatus] = useState('Loading model settings...');
  const [systemStats, setSystemStats] = useState(null);
  const [dataAction, setDataAction] = useState(null);
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

  useEffect(() => {
    let ignore = false;
    async function loadSystemStats() {
      try {
        const response = await fetch('/api/dashboard');
        if (!response.ok) throw new Error('Dashboard unavailable.');
        const result = await response.json();
        if (ignore) return;
        setSystemStats({
          apiOnline: true,
          knowledgeBases: result.knowledgeBases?.length ?? 0,
          materials: result.materials?.length ?? 0,
          tasks: result.tasks?.length ?? 0,
          recentTasks: (result.tasks ?? []).slice(0, 3),
        });
      } catch {
        if (!ignore) setSystemStats({ apiOnline: false });
      }
    }
    loadSystemStats();
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

  async function exportAllData() {
    setDataAction({ type: 'export', loading: true });
    try {
      const response = await fetch('/api/dashboard');
      if (!response.ok) throw new Error('Export failed.');
      const result = await response.json();
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `zhijing-backup-${Date.now()}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setDataAction({ type: 'export', loading: false, ok: true });
    } catch {
      setDataAction({ type: 'export', loading: false, ok: false });
    }
  }

  function clearLocalCache() {
    try {
      const keys = Object.keys(localStorage).filter((key) => key.startsWith('zhijing_'));
      keys.forEach((key) => localStorage.removeItem(key));
      setDataAction({ type: 'clear', loading: false, ok: true, count: keys.length });
    } catch {
      setDataAction({ type: 'clear', loading: false, ok: false });
    }
  }

  return (
    <section className="page-main full">
      <div className="page-title-row">
        <div>
          <h2>Settings</h2>
          <p>配置模型服务、查看系统状态、管理本地数据。Key 只发送到本地 API，页面不会保存明文。</p>
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

      <div className="settings-grid">
        <section className="settings-panel">
          <div className="settings-panel-head">
            <BarChart3 size={24} />
            <div>
              <h3>System Transparency</h3>
              <p>查看 API 连接状态、数据规模和最近任务。</p>
            </div>
          </div>
          {systemStats ? (
            <div className="settings-transparency">
              <div className="status-card">
                <Database size={22} />
                <div>
                  <span>API Status</span>
                  <strong>{systemStats.apiOnline ? '在线' : '离线'}</strong>
                  <p>{systemStats.apiOnline ? '本地 API 连接正常。' : '无法连接本地 API，请启动后端服务。'}</p>
                </div>
              </div>
              <div className="status-card">
                <ShieldCheck size={22} />
                <div>
                  <span>Data Scale</span>
                  <strong>{systemStats.knowledgeBases} KB · {systemStats.materials} materials</strong>
                  <p>{systemStats.tasks} tasks recorded.</p>
                </div>
              </div>
              {systemStats.recentTasks?.length > 0 && (
                <div className="settings-recent-tasks">
                  <strong>Recent Tasks</strong>
                  {systemStats.recentTasks.map((task) => (
                    <div key={task.id} className="settings-task-row">
                      <span>{task.workflow}</span>
                      <span>{task.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="settings-note">正在读取系统状态...</p>
          )}
        </section>

        <section className="settings-panel">
          <div className="settings-panel-head">
            <Database size={24} />
            <div>
              <h3>Data Controls</h3>
              <p>导出全部数据或清除本地缓存（不影响服务端数据）。</p>
            </div>
          </div>
          <div className="settings-actions">
            <button
              type="button"
              disabled={dataAction?.type === 'export' && dataAction?.loading}
              onClick={exportAllData}
            >
              <Download size={16} />
              {dataAction?.type === 'export' && dataAction?.loading ? '导出中...' : '导出全部数据'}
            </button>
            <button
              type="button"
              className="danger"
              onClick={clearLocalCache}
            >
              <Trash2 size={16} />
              清除本地缓存
            </button>
          </div>
          {dataAction?.type === 'export' && dataAction?.ok && (
            <p className="settings-note">数据已导出为 JSON 文件。</p>
          )}
          {dataAction?.type === 'export' && dataAction?.ok === false && (
            <p className="settings-note">导出失败，请确认 API 正在运行。</p>
          )}
          {dataAction?.type === 'clear' && dataAction?.ok && (
            <p className="settings-note">已清除 {dataAction.count} 项本地缓存。</p>
          )}
          {dataAction?.type === 'clear' && dataAction?.ok === false && (
            <p className="settings-note">清除缓存失败，浏览器可能禁用了 localStorage。</p>
          )}
        </section>
      </div>
    </section>
  );
}
