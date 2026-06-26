/**
 * 知识卡片详情抽屉：右侧滑出，统一承载所有视图的卡片详情查看。
 * @module components/CardDetailDrawer
 * @author fxbin
 */

import { useEffect, useMemo, useRef } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCardTypeLabel, useClaimStatusLabel } from '../utils/i18nLabels';
import { formatDate } from '../utils/material';
import { renderMarkdown } from '../utils/markdown';
import useModalA11y from '../hooks/useModalA11y';
import { useResizableDrawer } from '../hooks/useResizableDrawer';

/**
 * 判断文本是否包含 Markdown 语法特征。
 * @param {string} text - 原始文本
 * @returns {boolean} 是否包含 Markdown 语法
 */
function looksLikeMarkdown(text) {
  if (!text) return false;
  const patterns = [
    /^#{1,6}\s/m,
    /\*\*[^*]+\*\*/,
    /`[^`]+`/,
    /^\s*[-*+]\s/m,
    /^\s*\d+\.\s/m,
    /\[.+]\(.+\)/,
    /^\|.*\|/m,
    /^\s*>/m,
  ];
  return patterns.some((pattern) => pattern.test(text));
}

/**
 * 知识卡片详情抽屉组件。
 * @param {object} props - 组件属性
 * @param {object|null} props.card - 当前展示的卡片对象，为 null 时关闭抽屉
 * @param {() => void} props.onClose - 关闭抽屉回调
 * @param {string} [props.workspaceTitle] - 卡片所属工作区标题（跨工作区场景下展示）
 * @returns {JSX.Element|null} 抽屉元素，card 为 null 时返回 null
 */
export default function CardDetailDrawer({ card, onClose, workspaceTitle }) {
  const { t } = useTranslation();
  const cardTypeLabel = useCardTypeLabel();
  const claimStatusLabel = useClaimStatusLabel();
  const drawerRef = useRef(null);
  const { width, resizeHandleProps } = useResizableDrawer();
  const isOpen = card !== null;

  useModalA11y(drawerRef, isOpen, onClose);

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

  const contentHtml = useMemo(() => {
    if (!card?.body) return '';
    if (looksLikeMarkdown(card.body)) {
      return renderMarkdown(card.body);
    }
    return '';
  }, [card]);

  if (!card) return null;

  const isSourced = card.claimStatus === 'sourced';

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
        className="card-detail-drawer"
        style={{ width: `${width}px` }}
        role="dialog"
        aria-modal="true"
        aria-label={card.title || t('cardDetail.title')}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="card-detail-head">
          <div className="card-detail-tags">
            <span className={`card-detail-type-badge type-${card.type ?? 'general'}`}>
              {cardTypeLabel(card.type)}
            </span>
            {isSourced && (
              <span className="card-detail-source-badge">
                <CheckCircle2 size={14} />
                {claimStatusLabel(card.claimStatus)}
              </span>
            )}
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
          <h2 className="card-detail-title">{card.title}</h2>

          {contentHtml ? (
            <div
              className="card-detail-markdown"
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />
          ) : card.body ? (
            <pre className="card-detail-text">{card.body}</pre>
          ) : (
            <p className="card-detail-empty">{t('cardDetail.bodyEmpty')}</p>
          )}

          <footer className="card-detail-meta">
            {workspaceTitle && (
              <span className="card-detail-meta-item">
                {t('cardDetail.workspace')}: {workspaceTitle}
              </span>
            )}
            {card.workspaceId && !workspaceTitle && (
              <span className="card-detail-meta-item">
                {t('cardDetail.workspace')}: {card.workspaceId}
              </span>
            )}
            {card.updatedAt && (
              <span className="card-detail-meta-item">
                {t('cardDetail.updated')}: {formatDate(card.updatedAt)}
              </span>
            )}
            {card.createdAt && (
              <span className="card-detail-meta-item">
                {t('cardDetail.created')}: {formatDate(card.createdAt)}
              </span>
            )}
            <span className="card-detail-meta-item">
              {t('cardDetail.claimStatus')}: {claimStatusLabel(card.claimStatus)}
            </span>
          </footer>
        </div>
      </aside>
    </div>
  );
}
