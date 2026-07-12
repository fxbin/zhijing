/**
 * 微信读书智能推荐面板
 * 基于覆盖缺口、深度推荐、卡片关联三种策略展示推荐书籍
 *
 * 从 WeReadView.jsx 拆分而来，原 props 表面与渲染行为完全保持不变。
 *
 * @module views/weread/WeReadRecommendPanel
 * @author fxbin
 */

import { useState } from 'react';
import {
  BookOpen,
  ExternalLink,
} from 'lucide-react';

import { useRecommendation } from '../../hooks/useRecommendation';
import {
  REASON_COVERAGE_GAP,
  REASON_DEPTH,
} from '../../constants/weread';
import { CATEGORY_THEME_MAP, wereadWebBookUrl } from './utils';

/**
 * 微信读书智能推荐面板
 * 基于覆盖缺口、深度推荐、卡片关联三种策略展示推荐书籍
 * @param {Object} props
 * @param {string|null} props.workspaceId - 当前工作区 ID
 * @param {Function} props.onImport - 导入回调
 * @param {Function} props.t - i18n 翻译函数
 */
function WeReadRecommendPanel({ workspaceId, onImport, t, forceExpanded }) {
  const { recommendations, total, loading } = useRecommendation(workspaceId);
  const [collapsed, setCollapsed] = useState(false);
  const isCollapsed = forceExpanded ? false : collapsed;

  if (loading || total === 0) return null;

  const reasonLabel = (reason) => {
    if (reason === REASON_COVERAGE_GAP) return t('weread.recommendCoverageGap');
    if (reason === REASON_DEPTH) return t('weread.recommendDepth');
    return t('weread.recommendCardLinked');
  };

  return (
    <div className={`weread-recommend-band${isCollapsed ? ' is-collapsed' : ''}`}>
      <div className="weread-recommend-head">
        <h3>
          <BookOpen size={16} />
          {t('weread.recommendTitle')}
        </h3>
        {!forceExpanded && (
          <button type="button" className="weread-stats-toggle" onClick={() => setCollapsed((p) => !p)}>
            {isCollapsed ? t('weread.statsExpand') : t('weread.statsCollapse')}
          </button>
        )}
      </div>
      {!isCollapsed && (
        <div className="weread-recommend-list">
          {recommendations.map((rec) => {
            const theme = CATEGORY_THEME_MAP[rec.theme] || CATEGORY_THEME_MAP.general;
            return (
              <div className="weread-recommend-item" key={rec.bookId}>
                <div className="weread-recommend-cover">
                  {rec.cover ? (
                    <img src={rec.cover} alt="" loading="lazy" />
                  ) : (
                    <span className="weread-cover-placeholder"><BookOpen size={24} /></span>
                  )}
                </div>
                <div className="weread-recommend-info">
                  <strong title={rec.title}>{rec.title}</strong>
                  {rec.author && <span className="weread-recommend-author">{rec.author}</span>}
                  <span
                    className="weread-recommend-reason-chip"
                    style={{ background: theme.bg, color: theme.color }}
                  >
                    {reasonLabel(rec.reason)}
                  </span>
                  <p className="weread-recommend-reason-text">{rec.reasonText}</p>
                </div>
                <div className="weread-recommend-actions">
                  <a
                    className="weread-icon-btn"
                    href={wereadWebBookUrl(rec)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t('weread.openInApp')}
                    title={t('weread.openInApp')}
                  >
                    <ExternalLink size={15} />
                  </a>
                  <button
                    type="button"
                    className="weread-card-btn"
                    onClick={() => onImport({ bookId: rec.bookId, title: rec.title, author: rec.author, cover: rec.cover })}
                  >
                    <BookOpen size={14} /> {t('weread.importNotes')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default WeReadRecommendPanel;
