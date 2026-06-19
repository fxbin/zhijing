/**
 * 工作区视图：首页命令面板、最近导入、知识地图与空状态引导。
 * @module views/WorkspaceView
 */

import { Sparkles, SquareArrowOutUpRight } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import TaskStatus from '../components/TaskStatus';
import RecentImports from '../components/RecentImports';
import KnowledgeMapPanel from '../components/KnowledgeMapPanel';
import { useI18n } from '../i18n/I18nContext';

/**
 * 工作区首页视图。
 * @param {object} props - 组件属性
 * @param {string} props.activity - 最近活动文案
 * @param {boolean} props.isSubmitting - 是否正在提交
 * @param {object} props.latestTask - 最近任务对象
 * @param {Array} props.materials - 最近导入资料列表
 * @param {string} props.query - 输入框当前值
 * @param {(value: string) => void} props.setQuery - 设置输入值
 * @param {(view: string) => void} props.setView - 切换视图
 * @param {() => void} props.submit - 提交回调
 * @returns {JSX.Element} 工作区视图
 */
export default function WorkspaceView({ activity, isSubmitting, latestTask, materials, query, setQuery, setView, submit }) {
  const { t } = useI18n();
  const hasContent = materials.length > 0 || latestTask;
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
          <button type="button"># Project Research</button>
          <button type="button"># Daily Notes</button>
          <button type="button">+ More</button>
        </div>
        {isSubmitting && (
          <div className="workspace-loading" aria-live="polite">
            <div className="workspace-skeleton-bar" />
            <span>{t('workspace.processing')}</span>
          </div>
        )}
        {!isSubmitting && activity && <p className="activity">{activity}</p>}
        <TaskStatus task={latestTask} />
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
            <RecentImports materials={materials} />
            <KnowledgeMapPanel setView={setView} />
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
