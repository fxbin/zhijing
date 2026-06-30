/**
 * 工作区视图：首页命令面板、最近导入、知识地图与空状态引导。
 * @module views/WorkspaceView
 */

import { Sparkles, SquareArrowOutUpRight, Layers } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import EmptyState from '../components/EmptyState';
import RecentImports from '../components/RecentImports';
import KnowledgeMapPanel from '../components/KnowledgeMapPanel';
import { useCardTypeLabel } from '../utils/i18nLabels';
import api from '../utils/api';

const OVERVIEW_SCROLL_STORAGE_KEY = 'zhijing:overviewScrollY';

/**
 * 工作区首页视图。
 * @param {object} props - 组件属性
 * @param {string} props.activity - 最近活动文案
 * @param {string} props.apiStatus - 后端连接状态（checking / online / offline）
 * @param {boolean} props.isSubmitting - 是否正在提交
 * @param {Array<object>} props.materials - 最近导入资料列表
 * @param {string} props.query - 输入框当前值
 * @param {string|null} props.selectedWorkspaceId - 当前选中的工作区 ID
 * @param {(value: string) => void} props.setQuery - 设置输入值
 * @param {(view: string) => void} props.setView - 切换视图
 * @param {() => void} props.submit - 提交回调
 * @param {(material: object) => void} props.onViewMaterialDetail - 查看材料详情回调
 * @param {string} props.currentWorkspaceTitle - 当前选中工作区标题（用于卡片抽屉显示）
 * @param {string} props.browserAiStatus - 浏览器内置 AI 模型状态
 * @returns {JSX.Element} 工作区视图
 */
export default function WorkspaceView({ activity, apiStatus, isSubmitting, materials, query, selectedWorkspaceId, setQuery, setView, submit, onViewMaterialDetail, onOpenCardDetail, currentWorkspaceTitle = '', browserAiStatus = 'checking' }) {
  const { t } = useTranslation();
  const cardTypeLabel = useCardTypeLabel();
  const hasContent = materials.length > 0;
  const offline = apiStatus !== 'online';
  const [recentCards, setRecentCards] = useState([]);

  useEffect(() => {
    if (offline || !selectedWorkspaceId) {
      setRecentCards([]);
      return undefined;
    }
    let ignore = false;
    const loadRecentCards = async () => {
      try {
        const payload = await api.get(`/api/cards?workspaceId=${encodeURIComponent(selectedWorkspaceId)}&limit=8`);
        if (!ignore && Array.isArray(payload)) {
          const sorted = payload
            .slice()
            .sort((a, b) => (b.updatedAt ?? b.createdAt ?? '').localeCompare(a.updatedAt ?? a.createdAt ?? ''))
            .slice(0, 8);
          setRecentCards(sorted);
        }
      } catch {
        if (!ignore) setRecentCards([]);
      }
    };
    loadRecentCards();
    return () => { ignore = true; };
  }, [offline, selectedWorkspaceId]);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(OVERVIEW_SCROLL_STORAGE_KEY);
      if (stored === null) return;
      sessionStorage.removeItem(OVERVIEW_SCROLL_STORAGE_KEY);
      const y = Number.parseInt(stored, 10);
      if (Number.isFinite(y) && y > 0) {
        requestAnimationFrame(() => window.scrollTo(0, y));
      }
    } catch {
      // 静默降级
    }
  }, []);

  return (
    <>
      <section className="hero">
        <h2>{t('workspace.title')}</h2>
        <div className="command-glow">
          <div className={`command-box${offline ? ' command-box-offline' : ''}`}>
            <Sparkles size={27} />
            <input
              value={query}
              disabled={offline}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submit();
              }}
              placeholder={offline ? t('workspace.commandOffline') : t('workspace.placeholder')}
              aria-label={t('workspace.placeholder')}
            />
            <button disabled={isSubmitting || offline} onClick={submit} type="button"><SquareArrowOutUpRight size={25} /></button>
          </div>
        </div>
        {isSubmitting && (
          <div className="workspace-loading" aria-live="polite">
            <div className="workspace-skeleton-bar" />
            <span>{t('workspace.processing')}</span>
          </div>
        )}
        {!isSubmitting && activity && <p className="activity">{activity}</p>}
      </section>

      <button
        type="button"
        className="workspace-detail-entry"
        onClick={() => {
          try {
            sessionStorage.setItem(OVERVIEW_SCROLL_STORAGE_KEY, String(window.scrollY));
          } catch {
            // 静默降级，不影响跳转
          }
          setView('detail');
        }}
      >
        <span className="workspace-detail-entry-icon"><Layers size={18} /></span>
        <span className="workspace-detail-entry-text">
          <strong>{t('workspace.viewFullDetail')}</strong>
          <small>{t('workspace.viewFullDetailHint')}</small>
        </span>
        <span className="workspace-detail-entry-arrow" aria-hidden="true">→</span>
      </button>

      {recentCards.length > 0 && (
        <section className="workspace-recent-cards">
          <div className="workspace-recent-cards-head">
            <h3>{t('cardDetail.recentCardsTitle')}</h3>
            <small>{currentWorkspaceTitle ? `${currentWorkspaceTitle} · ${recentCards.length}` : t('cardDetail.recentCardsHint')}</small>
          </div>
          <div className="workspace-recent-cards-list">
            {recentCards.map((card) => (
              <button
                key={card.id}
                type="button"
                className={`workspace-recent-card-item type-${card.type ?? 'general'}`}
                onClick={() => onOpenCardDetail?.(card, currentWorkspaceTitle)}
              >
                <span className="workspace-recent-card-type">{cardTypeLabel(card.type)}</span>
                <span className="workspace-recent-card-title">{card.title}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {(hasContent || isSubmitting) && (
        <section className="lower-grid">
          {isSubmitting && !hasContent ? (
            <>
              <div className="recent-panel skeleton">
                <div className="workspace-skeleton-bar" />
                <div className="workspace-skeleton-bar short" />
                <div className="workspace-skeleton-bar" />
              </div>
              <div className="map-panel skeleton">
                <div className="workspace-skeleton-bar" />
                <div className="workspace-skeleton-bar short" />
              </div>
            </>
          ) : (
            <>
              <RecentImports
                materials={materials}
                onViewAll={() => setView('library')}
                onViewDetail={onViewMaterialDetail}
                browserAiStatus={browserAiStatus}
              />
              <KnowledgeMapPanel selectedWorkspaceId={selectedWorkspaceId} setView={setView} />
            </>
          )}
        </section>
      )}

      {!isSubmitting && !hasContent && (
        <section className="workspace-empty-guide">
          <EmptyState title={t('workspace.empty.title')} body={t('workspace.empty.body')} />
        </section>
      )}
    </>
  );
}
