/**
 * @module views/SettingsView
 * 模型设置视图：配置 Pi 使用的模型服务商、模型、API Key 与运行策略。
 */

import { useEffect, useState } from 'react';
import { KeyRound, PlugZap, Settings, ShieldCheck } from 'lucide-react';

/**
 * 模型设置视图组件
 * @returns {JSX.Element} 设置视图
 */
export default function SettingsView() {
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
