/**
 * @module views/settings/StatusSidebar
 * 设置视图右侧状态栏：根据当前分区展示上下文相关的状态摘要。
 * @author fxbin
 */

import { BarChart3, BookOpen, Database, Layers, Sparkles } from 'lucide-react';

/**
 * 状态栏组件：根据 activeSection 渲染对应的状态摘要卡片。
 * @param {Object} props - 组件属性
 * @param {string} props.activeSection - 当前激活的设置分区
 * @param {boolean} props.wereadConfigured - 微信读书是否已配置
 * @param {Object|null} props.wereadTestResult - 微信读书测试结果
 * @param {Object|null} props.systemStats - 系统统计数据
 * @param {string} props.status - 跨域共享的 status 文案
 * @param {Function} props.t - i18n 翻译函数
 * @returns {JSX.Element} 状态摘要面板
 */
export default function StatusSidebar({
  activeSection,
  wereadConfigured,
  wereadTestResult,
  systemStats,
  status,
  t,
}) {
  if (activeSection === 'weread') {
    return (
      <>
        <div className="status-card">
          <BookOpen size={22} />
          <div>
            <span>{t('settings.weread.title')}</span>
            <strong>{wereadConfigured ? t('settings.weread.configured') : t('settings.weread.notConfigured')}</strong>
            <p>{t('settings.weread.hint')}</p>
          </div>
        </div>
        {wereadTestResult && (
          <div className={`test-result ${wereadTestResult.ok ? 'ok' : 'failed'}`}>
            <strong>{wereadTestResult.ok ? t('settings.testPassed') : t('settings.testNotPassed')}</strong>
            {wereadTestResult.error && <p>{wereadTestResult.error}</p>}
          </div>
        )}
        <p className="settings-note">{status}</p>
      </>
    );
  }

  if (activeSection === 'transparency') {
    return (
      <>
        <div className="status-card">
          <BarChart3 size={22} />
          <div>
            <span>{t('settings.systemTransparency')}</span>
            <strong>{systemStats?.apiOnline ? t('settings.online') : t('settings.offline')}</strong>
            <p>{t('settings.transparencyHint')}</p>
          </div>
        </div>
        {systemStats && (
          <div className="status-card">
            <Database size={25} />
            <div>
              <span>{t('settings.dataScale')}</span>
              <strong>{t('settings.dataScaleCount', { kb: systemStats.workspaces, materials: systemStats.materials })}</strong>
              <p>{t('settings.tasksRecorded', { count: systemStats.tasks })}</p>
            </div>
          </div>
        )}
        <p className="settings-note">{status}</p>
      </>
    );
  }

  if (activeSection === 'kits') {
    return (
      <>
        <div className="status-card">
          <Sparkles size={22} />
          <div>
            <span>{t('kit.title')}</span>
            <strong>{t('kit.subtitle')}</strong>
            <p>{t('kit.selectWorkspaceHint')}</p>
          </div>
        </div>
        <p className="settings-note">{status}</p>
      </>
    );
  }

  if (activeSection === 'capabilities') {
    return (
      <>
        <div className="status-card">
          <Layers size={22} />
          <div>
            <span>{t('capabilities.title')}</span>
            <strong>{t('capabilities.sidebarLabel')}</strong>
            <p>{t('capabilities.sidebarHint')}</p>
          </div>
        </div>
        <p className="settings-note">{status}</p>
      </>
    );
  }

  return (
    <>
      <div className="status-card">
        <Database size={22} />
        <div>
          <span>{t('settings.dataSafety')}</span>
          <strong>{t('settings.dataControls')}</strong>
          <p>{t('settings.dataSafetyHint')}</p>
        </div>
      </div>
      <p className="settings-note">{status}</p>
    </>
  );
}
