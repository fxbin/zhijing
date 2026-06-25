/**
 * "可能相关"建议侧边栏面板（P10-4）。
 *
 * 基于 Recall Agent 检索结果，展示与当前卡片可能相关的其他卡片。
 * 用户可忽略（dismiss）或否决（reject），仅影响前端展示，不持久化。
 *
 * 设计原则：
 *  - 镜子不保姆：只提供检索建议，不替代用户决策
 *  - 提议权不写入权：建议不自动修改任何数据
 *
 * @module components/RelatedSuggestionsPanel
 * @author fxbin
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Lightbulb, X } from 'lucide-react';

const DISMISS_ALL_THRESHOLD = 0;
const RELEVANCE_PERCENT_MULTIPLIER = 100;

/**
 * "可能相关"建议面板。
 *
 * @param {object} props - 组件属性
 * @param {string} props.workspaceId - 工作区 ID
 * @param {string} [props.currentCardId] - 当前查看的卡片 ID
 * @param {function} [props.onCardClick] - 点击建议卡片的回调
 * @returns {JSX.Element | null} 建议面板
 * @author fxbin
 */
export default function RelatedSuggestionsPanel({ workspaceId, currentCardId, onCardClick }) {
  const { t } = useTranslation();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dismissedIds, setDismissedIds] = useState(new Set());
  const [rejectedIds, setRejectedIds] = useState(new Set());

  useEffect(() => {
    if (!workspaceId) return;
    let ignore = false;
    setLoading(true);
    async function loadSuggestions() {
      try {
        const params = currentCardId ? `?currentCardId=${encodeURIComponent(currentCardId)}` : '';
        const response = await fetch(`/api/workspaces/${workspaceId}/related-suggestions${params}`);
        if (!response.ok) {
          if (!ignore) setSuggestions([]);
          return;
        }
        const payload = await response.json();
        if (!ignore) {
          setSuggestions(payload.suggestions ?? []);
          setDismissedIds(new Set());
          setRejectedIds(new Set());
        }
      } catch {
        if (!ignore) setSuggestions([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadSuggestions();
    return () => { ignore = true; };
  }, [workspaceId, currentCardId]);

  const visibleSuggestions = suggestions.filter(
    (item) => !dismissedIds.has(item.cardId) && !rejectedIds.has(item.cardId),
  );

  if (visibleSuggestions.length === DISMISS_ALL_THRESHOLD) {
    return null;
  }

  const handleDismiss = (cardId) => {
    setDismissedIds((prev) => new Set(prev).add(cardId));
  };

  const handleReject = (cardId) => {
    setRejectedIds((prev) => new Set(prev).add(cardId));
  };

  const handleCardClick = (cardId) => {
    if (onCardClick) onCardClick(cardId);
  };

  return (
    <aside className="related-suggestions-panel" aria-label={t('related.title')}>
      <div className="related-suggestions-header">
        <Lightbulb size={18} />
        <span>{t('related.title')}</span>
      </div>
      {loading && <div className="related-suggestions-loading">{t('related.loading')}</div>}
      {!loading && visibleSuggestions.map((item) => (
        <div className="related-suggestion-item" key={item.cardId}>
          <div
            className="related-suggestion-content"
            onClick={() => handleCardClick(item.cardId)}
            onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') handleCardClick(item.cardId); }}
            role="button"
            tabIndex={0}
            title={t('related.openCard')}
          >
            <strong className="related-suggestion-title">{item.title}</strong>
            <small className="related-suggestion-meta">
              {t('related.relevance')}: {Math.round(item.relevanceScore * RELEVANCE_PERCENT_MULTIPLIER)}%
              {' · '}
              {t(`related.tool.${item.recalledBy}`, item.recalledBy)}
            </small>
            <small className="related-suggestion-reason">{item.reason}</small>
          </div>
          <div className="related-suggestion-actions">
            <button
              type="button"
              className="related-action-dismiss"
              onClick={() => handleDismiss(item.cardId)}
              title={t('related.dismiss')}
              aria-label={t('related.dismiss')}
            >
              {t('related.dismiss')}
            </button>
            <button
              type="button"
              className="related-action-reject"
              onClick={() => handleReject(item.cardId)}
              title={t('related.reject')}
              aria-label={t('related.reject')}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ))}
    </aside>
  );
}
