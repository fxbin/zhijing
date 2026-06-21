/**
 * 工作区视图：首页命令面板、最近导入、知识地图与空状态引导。
 * @module views/WorkspaceView
 */

import { Sparkles, SquareArrowOutUpRight } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import RecentImports from '../components/RecentImports';
import KnowledgeMapPanel from '../components/KnowledgeMapPanel';
import { useTranslation } from 'react-i18next';

/**
 * 工作区首页视图。
 * @param {object} props - 组件属性
 * @param {string} props.activity - 最近活动文案
 * @param {boolean} props.isSubmitting - 是否正在提交
 * @param {Array<object>} props.materials - 最近导入资料列表
 * @param {string} props.query - 输入框当前值
 * @param {string|null} props.selectedKnowledgeBaseId - 当前选中的知识库 ID
 * @param {(value: string) => void} props.setQuery - 设置输入值
 * @param {(view: string) => void} props.setView - 切换视图
 * @param {() => void} props.submit - 提交回调
 * @returns {JSX.Element} 工作区视图
 */
export default function WorkspaceView({ activity, isSubmitting, materials, query, selectedKnowledgeBaseId, setQuery, setView, submit }) {
  const { t } = useTranslation();
  const hasContent = materials.length > 0;
  return (
    <>
      <section className="hero">
        <h2>{t('workspace.title')}</h2>
        <div className="command-glow">
          <div className="command-box">
            <Sparkles size={27} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submit();
              }}
              placeholder={t('workspace.placeholder')}
              aria-label={t('workspace.placeholder')}
            />
            <button disabled={isSubmitting} onClick={submit} type="button"><SquareArrowOutUpRight size={25} /></button>
          </div>
        </div>
        <div className="chip-row">
          <button type="button" onClick={() => submit(`#${t('workspace.quickTagProjectResearch')}`)}>
            # {t('workspace.quickTagProjectResearch')}
          </button>
          <button type="button" onClick={() => submit(`#${t('workspace.quickTagDailyNotes')}`)}>
            # {t('workspace.quickTagDailyNotes')}
          </button>
          <button type="button" disabled>+ {t('workspace.moreTags')}</button>
        </div>
        {isSubmitting && (
          <div className="workspace-loading" aria-live="polite">
            <div className="workspace-skeleton-bar" />
            <span>{t('workspace.processing')}</span>
          </div>
        )}
        {!isSubmitting && activity && <p className="activity">{activity}</p>}
      </section>

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
            <RecentImports materials={materials} onViewAll={() => setView('library')} />
            <KnowledgeMapPanel selectedKnowledgeBaseId={selectedKnowledgeBaseId} setView={setView} />
          </>
        )}
      </section>

      {!isSubmitting && !hasContent && (
        <section className="workspace-empty-guide">
          <EmptyState title={t('workspace.empty.title')} body={t('workspace.empty.body')} />
        </section>
      )}
    </>
  );
}
