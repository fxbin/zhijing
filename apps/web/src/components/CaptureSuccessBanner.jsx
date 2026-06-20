/**
 * 采集成功横幅组件：采集任务完成后展示成功摘要和最近条目。
 * @module components/CaptureSuccessBanner
 */

import { CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { statusLabels } from '../constants/labels';

/**
 * 采集成功横幅，展示摘要、最近条目和复核入口。
 * @param {object} props - 组件属性
 * @param {object} props.summary - 摘要对象（message）
 * @param {object} props.stats - 统计数据
 * @param {function} props.onReview - 复核按钮回调
 * @param {function} props.onDismiss - 关闭按钮回调
 * @returns {JSX.Element} 成功横幅
 */
export default function CaptureSuccessBanner({ summary, stats, onReview, onDismiss }) {
  const { t } = useTranslation();
  const reviewable = (stats.needsReview ?? 0) + (stats.failed ?? 0);
  return (
    <div className="capture-success-banner" role="status">
      <CheckCircle2 size={22} />
      <div className="capture-success-body">
        <strong>{summary.message}</strong>
        <div className="capture-success-meta">
          <span>{t('captureSuccess.totalMaterials', { count: stats.total })}</span>
          <span>{t('captureSuccess.ingestedCount', { count: stats.ingested ?? 0 })}</span>
          {reviewable > 0 && <span>{t('captureSuccess.pendingCount', { count: reviewable })}</span>}
        </div>
        {stats.recent.length > 0 && (
          <ul className="capture-success-recent">
            {stats.recent.slice(0, 3).map((item) => (
              <li key={item.id}>
                <span className="capture-success-status">{t(statusLabels[item.parseStatus] ?? `parseStatus.${item.parseStatus}`)}</span>
                <span className="capture-success-title">{item.title}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="capture-success-cta">
          {reviewable > 0 && <button type="button" onClick={onReview}>{t('captureSuccess.goReview')}</button>}
          <button type="button" onClick={onDismiss}>{t('captureSuccess.gotIt')}</button>
        </div>
      </div>
    </div>
  );
}
