/**
 * 工作区视图：首页命令面板、最近导入、知识地图与空状态引导。
 * @module views/WorkspaceView
 */

import { Sparkles, SquareArrowOutUpRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import EmptyState from '../components/EmptyState';
import RecentImports from '../components/RecentImports';
import KnowledgeMapPanel from '../components/KnowledgeMapPanel';
import { useCardTypeLabel } from '../utils/i18nLabels';
import api from '../utils/api';

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
 * @param {string} props.browserAiStatus - 浏览器内置 AI 模型状态
 * @returns {JSX.Element} 工作区视图
 */
export default function WorkspaceView({ activity, apiStatus, isSubmitting, materials, query, selectedWorkspaceId, setQuery, setView, submit, onViewMaterialDetail, onOpenCardDetail, browserAiStatus = 'checking' }) {
  const { t } = useTranslation();
  const cardTypeLabel = useCardTypeLabel();
  const hasContent = materials.length > 0;
  const offline = apiStatus !== 'online';
  const [recentCards, setRecentCards] = useState([]);

  useEffect(() => {
    if (offline) return undefined;
    let ignore = false;
    const loadRecentCards = async () => {
      try {
        const payload = await api.get('/api/insights');
        if (!ignore && payload?.recentCards?.length) {
          setRecentCards(payload.recentCards);
        }
      } catch {
        ;
      }
    };
    loadRecentCards();
    return () => { ignore = true; };
  }, [offline]);

  const recentCardsByWorkspace = useMemo(() => {
    const groups = new Map();
    for (const card of recentCards) {
      const key = card.workspaceId || 'default';
      if (!groups.has(key)) {
        groups.set(key, {
          workspaceId: key,
          workspaceTitle: card.workspaceTitle || key,
          cards: [],
        });
      }
      groups.get(key).cards.push(card);
    }
    return Array.from(groups.values());
  }, [recentCards]);

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
        <div className="chip-row">
          <button type="button" disabled={offline} onClick={() => submit(`#${t('workspace.quickTagProjectResearch')}`)}>
            # {t('workspace.quickTagProjectResearch')}
          </button>
          <button type="button" disabled={offline} onClick={() => submit(`#${t('workspace.quickTagDailyNotes')}`)}>
            # {t('workspace.quickTagDailyNotes')}
          </button>
        </div>
        {isSubmitting && (
          <div className="workspace-loading" aria-live="polite">
            <div className="workspace-skeleton-bar" />
            <span>{t('workspace.processing')}</span>
          </div>
        )}
        {!isSubmitting && activity && <p className="activity">{activity}</p>}
      </section>

      {recentCardsByWorkspace.length > 0 && (
        <section className="workspace-recent-cards">
          <div className="workspace-recent-cards-head">
            <h3>{t('cardDetail.recentCardsTitle')}</h3>
            <small>{t('cardDetail.recentCardsHint')}</small>
          </div>
          {recentCardsByWorkspace.map((group) => (
            <div key={group.workspaceId} className="workspace-recent-cards-group">
              <h4 className="workspace-recent-cards-group-title">{group.workspaceTitle}</h4>
              <div className="workspace-recent-cards-list">
                {group.cards.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    className={`workspace-recent-card-item type-${card.type ?? 'general'}`}
                    onClick={() => onOpenCardDetail?.(card, group.workspaceTitle)}
                  >
                    <span className="workspace-recent-card-type">{cardTypeLabel(card.type)}</span>
                    <span className="workspace-recent-card-title">{card.title}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
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
