/**
 * 导出视图组件：工作区导出为 Markdown/JSON/PDF，含历史记录和备份。
 * @module views/ExportView
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, ClipboardList, Download, History, PackageCheck } from 'lucide-react';

import {
  workspaceMarkdown,
  workspaceExportJson,
  downloadTextFile,
} from '../utils/export';
import { safeFilename } from '../utils/format';
import { formatDateTime } from '../utils/material';

/**
 * 导出视图，支持多格式导出、进度展示、历史记录和本地备份。
 * @param {object} props - 组件属性
 * @param {object} props.detail - 工作区详情
 * @param {function} props.setView - 视图切换函数
 * @returns {JSX.Element} 导出视图
 */
export default function ExportView({ detail, setView }) {
  const { t } = useTranslation();
  const [format, setFormat] = useState('markdown');
  const [scope, setScope] = useState('all');
  const [includeArtifacts, setIncludeArtifacts] = useState(true);
  const [exportState, setExportState] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [lastExport, setLastExport] = useState(null);
  const [exportHistory, setExportHistory] = useState([]);
  const [useModal, setUseModal] = useState(false);
  const [autoClose, setAutoClose] = useState(true);
  const materials = detail.materials ?? [];
  const cards = detail.cards ?? [];
  const artifacts = detail.artifacts ?? [];
  const options = {
    includeMaterials: scope === 'all' || scope === 'materials',
    includeCards: scope === 'all' || scope === 'cards',
    includeArtifacts,
  };
  const exportRows = [
    { id: 'cards', label: t('export.count.cards'), value: options.includeCards ? cards.length : 0 },
    { id: 'materials', label: t('export.count.materials'), value: options.includeMaterials ? materials.length : 0 },
    { id: 'artifacts', label: t('export.count.artifacts'), value: options.includeArtifacts ? artifacts.length : 0 },
  ];

  useEffect(() => {
    if (!detail?.id) return undefined;
    let ignore = false;
    async function loadHistory() {
      try {
        const response = await fetch(`/api/workspaces/${detail.id}/exports`);
        if (!response.ok) return;
        const payload = await response.json();
        if (!ignore) setExportHistory(payload.exports ?? []);
      } catch {
        return;
      }
    }
    loadHistory();
    return () => { ignore = true; };
  }, [detail?.id]);

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

  useEffect(() => {
    if (exportState !== 'success' || !autoClose) return undefined;
    const timer = window.setTimeout(() => {
      setExportState('idle');
      setProgress(0);
    }, 3200);
    return () => window.clearTimeout(timer);
  }, [exportState, autoClose]);

  function buildExport() {
    const extension = format === 'json' ? 'json' : format === 'pdf' ? 'pdf' : 'md';
    const filename = `${safeFilename(detail.title)}-export.${extension}`;
    const content = format === 'json'
      ? workspaceExportJson(detail, options)
      : workspaceMarkdown(detail, options);
    const type = format === 'json' ? 'application/json;charset=utf-8' : 'text/markdown;charset=utf-8';
    return { filename, content, type };
  }

  function startExport() {
    setLastExport(buildExport());
    setExportState('running');
    setProgress(0);
  }

  async function recordExportHistory(prepared) {
    if (!detail?.id) return;
    try {
      const response = await fetch(`/api/workspaces/${detail.id}/exports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          scope,
          includeArtifacts,
          filename: prepared.filename,
          materialCount: options.includeMaterials ? materials.length : 0,
          cardCount: options.includeCards ? cards.length : 0,
          artifactCount: options.includeArtifacts ? artifacts.length : 0,
        }),
      });
      if (!response.ok) return;
      const payload = await response.json();
      if (payload.export) setExportHistory((current) => [payload.export, ...current]);
    } catch {
      return;
    }
  }

  async function downloadLastExport() {
    const prepared = lastExport ?? buildExport();
    downloadTextFile(prepared.filename, prepared.content, prepared.type);
    setLastExport(prepared);
    await recordExportHistory(prepared);
  }

  function printPdf() {
    const prepared = lastExport ?? buildExport();
    setLastExport(prepared);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`<html><head><meta charset="utf-8"><title>${prepared.filename}</title><style>body{font-family:Inter,system-ui,sans-serif;line-height:1.7;color:#1b2738;max-width:760px;margin:48px auto;padding:0 24px}h1{font-size:22px}h2{font-size:17px;margin-top:24px}pre{white-space:pre-wrap;word-break:break-word;background:#f6f7f9;padding:12px;border-radius:8px}</style></head><body><pre>${prepared.content.replace(/</g, '&lt;')}</pre></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  function downloadBackup() {
    downloadTextFile(
      `${safeFilename(detail.title)}-backup.json`,
      workspaceExportJson(detail, { includeMaterials: true, includeCards: true, includeArtifacts: true }),
      'application/json;charset=utf-8',
    );
  }

  function closeSuccess() {
    setExportState('idle');
    setProgress(0);
  }

  const statusText = exportState === 'success'
    ? t('export.status.ready')
    : exportState === 'running'
      ? t('export.status.running')
      : t('export.status.idle');

  return (
    <section className="page-main full">
      <div className="export-workbench">
        <div className="export-head">
          <div>
            <span>{t('export.title')}</span>
            <h2>{t('export.subtitle')}</h2>
            <p>{t('export.description')}</p>
          </div>
          <div className="export-head-actions">
            <button onClick={() => setView('detail')} type="button">{t('common.back')}</button>
            <button onClick={downloadBackup} type="button">
              <PackageCheck size={18} />
              {t('export.backupJson')}
            </button>
          </div>
        </div>

        <div className="export-grid">
          <section className="export-config-panel">
            <div className="panel-title">
              <Download size={20} />
              <div>
                <span>{t('export.configTitle')}</span>
                <h4>{t('export.configSubtitle')}</h4>
              </div>
            </div>
            <div className="export-option-grid">
              {[
                { key: 'markdown', label: t('export.format.markdown'), body: t('export.format.markdownDesc') },
                { key: 'json', label: t('export.format.json'), body: t('export.format.jsonDesc') },
                { key: 'pdf', label: t('export.format.pdf'), body: t('export.format.pdfDesc') },
              ].map((option) => (
                <button className={format === option.key ? 'active' : ''} key={option.key} onClick={() => setFormat(option.key)} type="button">
                  <strong>{option.label}</strong>
                  <span>{option.body}</span>
                </button>
              ))}
            </div>
            <div className="export-scope-row">
              {[
                { key: 'all', label: t('export.scope.all') },
                { key: 'cards', label: t('export.scope.cards') },
                { key: 'materials', label: t('export.scope.materials') },
              ].map((option) => (
                <button className={scope === option.key ? 'active' : ''} key={option.key} onClick={() => setScope(option.key)} type="button">
                  {option.label}
                </button>
              ))}
            </div>
            <label className="export-checkbox">
              <input checked={includeArtifacts} onChange={(event) => setIncludeArtifacts(event.target.checked)} type="checkbox" />
              {t('export.includeArtifacts')}
            </label>
            <label className="export-checkbox">
              <input checked={useModal} onChange={(event) => setUseModal(event.target.checked)} type="checkbox" />
              {t('export.useModal')}
            </label>
            <label className="export-checkbox">
              <input checked={autoClose} onChange={(event) => setAutoClose(event.target.checked)} type="checkbox" />
              {t('export.autoClose')}
            </label>
          </section>

          <section className="export-progress-panel">
            <div className="panel-title">
              <ClipboardList size={20} />
              <div>
                <span>{t('export.progressTitle')}</span>
                <h4>{statusText}</h4>
              </div>
            </div>
            <div className="export-progress-bar"><span style={{ width: `${progress}%` }} /></div>
            <div className="export-counts">
              {exportRows.map((row) => (
                <div key={row.id}>
                  <strong>{row.value}</strong>
                  <span>{row.label}</span>
                </div>
              ))}
            </div>
            {exportState === 'success' ? (
              <div className="export-success-card">
                <CheckCircle2 size={26} />
                <div>
                  <strong>{t('export.successTitle')}</strong>
                  <p>{t('export.successBody', { filename: lastExport?.filename ?? t('export.exportFile') })}</p>
                </div>
              </div>
            ) : (
              <p>{t('export.idleHint')}</p>
            )}
            <div className="export-actions">
              <button disabled={exportState === 'running'} onClick={startExport} type="button">
                {exportState === 'running' ? t('export.exporting') : t('export.startExport')}
              </button>
              {format === 'pdf' ? (
                <button disabled={exportState !== 'success'} onClick={printPdf} type="button">{t('export.printPdf')}</button>
              ) : (
                <button disabled={exportState !== 'success'} onClick={downloadLastExport} type="button">{t('export.download')}</button>
              )}
              {exportState === 'success' && autoClose && (
                <button className="ghost" onClick={closeSuccess} type="button">{t('export.collapse')}</button>
              )}
            </div>
          </section>
        </div>

        <section className="export-history-panel">
          <div className="panel-title">
            <History size={20} />
            <div>
              <span>{t('export.historyTitle')}</span>
              <h4>{exportHistory.length > 0 ? t('export.historyCount', { count: exportHistory.length }) : t('export.noHistory')}</h4>
            </div>
          </div>
          {exportHistory.length === 0 ? (
            <p className="export-history-empty">{t('export.historyEmpty')}</p>
          ) : (
            <ul className="export-history-list">
              {exportHistory.map((item) => (
                <li className="export-history-item" key={item.id}>
                  <div>
                    <strong>{item.filename}</strong>
                    <span>
                      {t('export.historyItem', {
                        format: t(`export.formatLabel.${item.format}`),
                        scope: t(`export.scope.${item.scope}`),
                        cardCount: item.cardCount,
                        materialCount: item.materialCount,
                        artifactCount: item.artifactCount,
                        artifactHint: item.includeArtifacts ? '' : t('export.withoutArtifacts'),
                        time: formatDateTime(item.createdAt),
                      })}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {useModal && exportState === 'success' && (
          <div className="export-modal-overlay" role="dialog" aria-modal="true">
            <div className="export-modal-card">
              <CheckCircle2 size={32} />
              <strong>{t('export.successTitle')}</strong>
              <p>{t('export.successBodyShort', { filename: lastExport?.filename ?? t('export.exportFile') })}</p>
              <div className="export-actions">
                {format === 'pdf' ? (
                  <button onClick={printPdf} type="button">{t('export.printPdf')}</button>
                ) : (
                  <button onClick={downloadLastExport} type="button">{t('export.download')}</button>
                )}
                <button className="ghost" onClick={closeSuccess} type="button">{t('common.close')}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
