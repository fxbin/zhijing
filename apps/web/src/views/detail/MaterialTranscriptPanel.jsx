/**
 * @module views/detail/MaterialTranscriptPanel
 * 资料视频字幕面板：展示转写状态，并在跳过时提供机器能力检测报告。
 * @author fxbin
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';
import { BYTES_PER_GB } from './constants';

/**
 * 资料视频字幕面板组件。
 * @param {object} props - 组件属性
 * @param {object} props.material - 资料对象
 * @returns {JSX.Element | null} 字幕面板
 */
function MaterialTranscriptPanel({ material }) {
  const { t } = useTranslation();
  const [report, setReport] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);

  useEffect(() => {
    if (material.transcriptStatus !== 'skipped' || report) {
      return;
    }
    let ignore = false;
    setLoadingReport(true);
    async function loadReport() {
      try {
        const payload = await api.get('/api/transcription/capability');
        if (!ignore) setReport(payload);
      } catch {
        // 静默失败，保持无报告状态
      } finally {
        if (!ignore) setLoadingReport(false);
      }
    }
    loadReport();
    return () => { ignore = true; };
  }, [material.transcriptStatus, report]);

  async function handleRefreshReport() {
    setLoadingReport(true);
    try {
      const payload = await api.get('/api/transcription/capability?refresh=true');
      setReport(payload);
    } catch {
      // 静默失败，保持现有报告状态
    } finally {
      setLoadingReport(false);
    }
  }

  if (!material.transcriptStatus) {
    return null;
  }

  return (
    <div className="material-transcript">
      <strong>{t('detail.transcriptTitle')}</strong>
      {material.transcriptStatus === 'pending' && <p className="transcript-pending">{t('detail.transcriptPending')}</p>}
      {material.transcriptStatus === 'done' && (
        <>
          <p className="transcript-meta">{t('detail.transcriptFromVideo')}</p>
          <p className="transcript-body">{material.transcript || t('detail.transcriptEmpty')}</p>
        </>
      )}
      {material.transcriptStatus === 'failed' && (
        <p className="transcript-error">{t('detail.transcriptFailed')}：{material.transcriptError}</p>
      )}
      {material.transcriptStatus === 'skipped' && (
        <>
          <p className="transcript-skipped">{t('detail.transcriptSkipped')}</p>
          <button
            type="button"
            className="transcript-report-toggle"
            onClick={() => setShowReport((prev) => !prev)}
            disabled={loadingReport}
          >
            {showReport ? t('detail.hideTranscriptReport') : t('detail.showTranscriptReport')}
          </button>
          {showReport && report && (
            <>
              <ul className="transcript-report">
                <li>{t('detail.transcriptReportPlatform')}：{report.platform}</li>
                <li>{t('detail.transcriptReportFfmpeg')}：{report.ffmpegAvailable ? t('detail.transcriptReportDetected') : t('detail.transcriptReportMissing')}</li>
                <li>
                  {t('detail.transcriptReportWhisper')}：
                  {report.whisperAvailable
                    ? `${t('detail.transcriptReportDetected')}（${report.whisperCommand}）`
                    : t('detail.transcriptReportMissing')}
                </li>
                <li>{t('detail.transcriptReportCpu')}：{report.cpuCores} {t('detail.transcriptReportCores')}</li>
                <li>{t('detail.transcriptReportMemory')}：{(report.totalMemoryBytes / BYTES_PER_GB).toFixed(1)} GB</li>
                {report.reasons?.length > 0 && (
                  <li className="transcript-report-reasons">
                    {t('detail.transcriptReportReasons')}：
                    <ul>
                      {report.reasons.map((reason, index) => (
                        <li key={index}>{reason}</li>
                      ))}
                    </ul>
                  </li>
                )}
              </ul>
              <button
                type="button"
                className="transcript-report-refresh"
                onClick={handleRefreshReport}
                disabled={loadingReport}
              >
                {t('detail.transcriptReportRefresh')}
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default MaterialTranscriptPanel;
