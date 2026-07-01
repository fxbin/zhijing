/**
 * 复核抽屉：右侧滑出，承载资料复核时的标题、正文、媒体链接编辑与保存。
 * 复用 card-detail-drawer 样式族与 useResizableDrawer/useModalA11y 基建，
 * 与 MaterialDetailDrawer 视觉一致，但面向可编辑场景，textarea 给予更大高度。
 * @module components/ReviewDrawer
 * @author fxbin
 */

import { useEffect, useRef } from 'react';
import { CheckCircle2, Loader2, Save, SquareArrowOutUpRight, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getIntakeKindLabel, getParseStatusLabel, getPlatformLabel } from '../utils/i18nLabels';
import { formatMaterialTime, materialSourceUrl } from '../utils/material';
import { workspaceTitle } from '../utils/knowledge';
import useModalA11y from '../hooks/useModalA11y';
import { useResizableDrawer } from '../hooks/useResizableDrawer';

/**
 * 打开抽屉后聚焦标题输入框的延迟时间（毫秒），等待抽屉滑入动画启动后再聚焦。
 */
const TITLE_FOCUS_DELAY_MS = 60;

/**
 * Unassigned 占位标题，用于判断是否隐藏"所属工作区"行。
 */
const UNASSIGNED_TITLE = 'Unassigned';

/**
 * 复核抽屉组件。
 * @param {object} props - 组件属性
 * @param {object|null} props.material - 当前复核的资料对象，为 null 时关闭抽屉
 * @param {{ title: string, contentText: string, mediaUrls: string }} props.draft - 复核草稿
 * @param {(updater: (prev: object) => object) => void} props.onChangeDraft - 草稿变更回调
 * @param {boolean} props.saving - 是否正在保存（用于禁用按钮与显示 spinner）
 * @param {() => void} props.onSaveDraft - 保存草稿回调
 * @param {() => void} props.onComplete - 完成复核回调
 * @param {() => void} props.onClose - 关闭抽屉回调
 * @param {Array} [props.workspaces] - 工作区列表，用于显示归属工作区标题
 * @returns {JSX.Element|null} 抽屉元素，material 为 null 时返回 null
 * @author fxbin
 */
export default function ReviewDrawer({ material, draft, onChangeDraft, saving, onSaveDraft, onComplete, onClose, workspaces }) {
  const { t } = useTranslation();
  const drawerRef = useRef(null);
  const titleInputRef = useRef(null);
  const { width, resizeHandleProps } = useResizableDrawer();
  const isOpen = material !== null;

  useModalA11y(drawerRef, isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return undefined;
    const timer = setTimeout(() => titleInputRef.current?.focus(), TITLE_FOCUS_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleBodyScroll = (event) => {
      if (drawerRef.current && !drawerRef.current.contains(event.target)) {
        event.preventDefault();
      }
    };
    document.addEventListener('wheel', handleBodyScroll, { passive: false });
    return () => document.removeEventListener('wheel', handleBodyScroll);
  }, [isOpen]);

  if (!material) return null;

  const sourceUrl = materialSourceUrl(material);
  const resolvedWorkspaceTitle = workspaceTitle(workspaces, material.workspaceId);
  const isUnassigned = resolvedWorkspaceTitle === UNASSIGNED_TITLE;

  const updateField = (field) => (event) => {
    onChangeDraft((prev) => ({ ...prev, [field]: event.target.value }));
  };

  return (
    <div className="card-detail-overlay" onClick={onClose} role="presentation">
      <div
        className="card-detail-resize-handle"
        style={{ right: `${width}px` }}
        {...resizeHandleProps}
        aria-hidden="true"
      />
      <aside
        ref={drawerRef}
        className="card-detail-drawer review-drawer"
        style={{ width: `${width}px` }}
        role="dialog"
        aria-modal="true"
        aria-label={t('library.reviewDrawerTitle')}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="card-detail-head">
          <div className="card-detail-tags">
            <span className="card-detail-type-badge type-general">
              {getIntakeKindLabel(t, material.type)}
            </span>
            <span className="card-detail-type-badge type-fact">
              {getParseStatusLabel(t, material.parseStatus)}
            </span>
          </div>
          <button
            type="button"
            className="card-detail-close"
            onClick={onClose}
            aria-label={t('common.close')}
          >
            <X size={20} />
          </button>
        </header>

        <div className="card-detail-body">
          <h2 className="card-detail-title">{t('library.reviewDrawerTitle')}</h2>

          <div className="review-drawer-form">
            <label className="review-drawer-label" htmlFor="review-drawer-title">
              {t('library.materialTitle')}
            </label>
            <input
              id="review-drawer-title"
              ref={titleInputRef}
              className="review-drawer-input"
              value={draft.title}
              onChange={updateField('title')}
              placeholder={t('library.materialTitlePlaceholder')}
            />

            <label className="review-drawer-label" htmlFor="review-drawer-body">
              {t('library.materialBody')}
            </label>
            <textarea
              id="review-drawer-body"
              className="review-drawer-textarea review-drawer-textarea-body"
              value={draft.contentText}
              onChange={updateField('contentText')}
              placeholder={t('library.bodyPlaceholder')}
            />

            <label className="review-drawer-label" htmlFor="review-drawer-media">
              {t('library.mediaLinks')}
            </label>
            <textarea
              id="review-drawer-media"
              className="review-drawer-textarea review-drawer-textarea-media"
              value={draft.mediaUrls}
              onChange={updateField('mediaUrls')}
              placeholder={t('library.mediaPlaceholder')}
            />
          </div>

          <footer className="card-detail-meta">
            <span className="card-detail-meta-title">{t('cardDetail.metaTitle')}</span>
            {material.workspaceId && (
              <span className="card-detail-meta-item">
                {t('cardDetail.workspaceId')}: {material.workspaceId}
              </span>
            )}
            {!isUnassigned && (
              <span className="card-detail-meta-item">
                {t('cardDetail.workspace')}: {resolvedWorkspaceTitle}
              </span>
            )}
            <span className="card-detail-meta-item">
              {t('cardDetail.platform')}: {getPlatformLabel(t, material.platform)}
            </span>
            <span className="card-detail-meta-item">
              {t('cardDetail.created')}: {formatMaterialTime(material.createdAt)}
            </span>
            {sourceUrl && (
              <a
                className="card-detail-meta-item card-detail-source-link"
                href={sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                {t('library.open')}
                <SquareArrowOutUpRight size={14} />
              </a>
            )}
          </footer>
        </div>

        <footer className="review-drawer-actions">
          <button
            type="button"
            className="review-drawer-btn review-drawer-btn-secondary"
            onClick={onSaveDraft}
            disabled={saving}
          >
            {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
            {t('library.saveDraft')}
          </button>
          <button
            type="button"
            className="review-drawer-btn review-drawer-btn-primary"
            onClick={onComplete}
            disabled={saving}
          >
            {saving ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />}
            {t('library.complete')}
          </button>
        </footer>
      </aside>
    </div>
  );
}
