/**
 * 路径视图：展示当前工作区的学习路径与进度。
 * @module views/PathView
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Lock, MapPin, Route, Sparkles } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { useCardTypeLabel } from '../utils/i18nLabels';
import { PATH_CARD_ID_STORAGE_KEY } from '../constants/options';

/**
 * 路径视图组件。
 * @param {object} props - 组件属性
 * @param {string} props.selectedWorkspaceId - 当前选中工作区 ID
 * @param {Function} props.setView - 视图切换回调
 * @returns {JSX.Element} 路径视图
 */
export default function PathView({ selectedWorkspaceId, setView }) {
  const { t } = useTranslation();
  const cardTypeLabel = useCardTypeLabel();
  const [path, setPath] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!selectedWorkspaceId) {
      setLoading(false);
      setPath(null);
      return undefined;
    }
    let ignore = false;
    async function loadPath() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/workspaces/${selectedWorkspaceId}/path`);
        if (!response.ok) throw new Error('Path unavailable.');
        const payload = await response.json();
        if (!ignore) setPath(payload);
      } catch {
        if (!ignore) setError(t('path.loadError'));
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadPath();
    return () => { ignore = true; };
  }, [selectedWorkspaceId, t]);

  if (loading) {
    return (
      <div className="page-main full path-page">
        <div className="path-header skeleton">
          <div className="skeleton-line title" />
          <div className="skeleton-line subtitle" />
        </div>
        <div className="path-roadmap skeleton">
          <div className="path-step skeleton" />
          <div className="path-step skeleton" />
          <div className="path-step skeleton" />
        </div>
      </div>
    );
  }

  if (!selectedWorkspaceId) {
    return (
      <div className="page-main full path-page">
        <EmptyState
          icon={Route}
          title={t('path.emptyTitle')}
          body={t('path.emptyBody')}
          action={t('path.createAction')}
          onAction={() => setView('workspace')}
        />
      </div>
    );
  }

  if (error || !path) {
    return (
      <div className="page-main full path-page">
        <EmptyState icon={Route} title={t('path.errorTitle')} body={error || t('path.errorBody')} />
      </div>
    );
  }

  const progressRatio = path.steps.length > 0 ? path.completedCount / path.steps.length : 0;

  /**
   * 点击路径步骤时记录目标卡片 ID 并跳转到详情视图。
   * @param {string} cardId - 步骤对应的卡片 ID
   */
  function handleStepClick(cardId) {
    if (!cardId) return;
    sessionStorage.setItem(PATH_CARD_ID_STORAGE_KEY, cardId);
    setView('detail');
  }

  return (
    <div className="page-main full path-page">
      <header className="path-header">
        <div>
          <h1>{t('path.title')}</h1>
          <p>{t('path.subtitle', { title: path.workspaceTitle })}</p>
        </div>
        <div className="path-progress">
          <div className="path-progress-info">
            <span>{t('path.progress', { completed: path.completedCount, total: path.steps.length })}</span>
            <strong>{Math.round(progressRatio * 100)}%</strong>
          </div>
          <div className="path-progress-track">
            <div className="path-progress-fill" style={{ width: `${progressRatio * 100}%` }} />
          </div>
        </div>
      </header>

      {path.steps.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title={t('path.noStepsTitle')}
          body={t('path.noStepsBody')}
          action={t('path.addMaterialAction')}
          onAction={() => setView('library')}
        />
      ) : (
        <div className="path-roadmap">
          <div className="path-line" />
          {path.steps.map((step, index) => (
            <div
              key={step.id}
              className={`path-step ${step.status}`}
              onClick={() => handleStepClick(step.cardId)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleStepClick(step.cardId);
              }}
              role={step.cardId ? 'button' : undefined}
              tabIndex={step.cardId ? 0 : undefined}
            >
              <div className="path-node">
                {step.status === 'completed' && <Check size={16} />}
                {step.status === 'current' && <MapPin size={16} />}
                {step.status === 'locked' && <Lock size={16} />}
              </div>
              <div className="path-step-content">
                <div className="path-step-head">
                  <span className="path-step-order">{t('path.stepOrder', { order: step.order })}</span>
                  <span className={`path-step-type type-${step.type}`}>{cardTypeLabel(step.type)}</span>
                </div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
                {step.status === 'current' && (
                  <span className="path-status-badge current">{t('path.currentFocus')}</span>
                )}
                {step.status === 'completed' && (
                  <span className="path-status-badge completed">{t('path.completed')}</span>
                )}
                {step.status === 'locked' && (
                  <span className="path-status-badge locked">{t('path.locked')}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
