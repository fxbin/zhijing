/**
 * 资料详情抽屉：右侧滑出，展示资料完整内容（Markdown 渲染）。
 * 与 CardDetailDrawer 共用样式，但针对 material 对象。
 * @module components/MaterialDetailDrawer
 * @author fxbin
 */

import { useEffect, useMemo, useRef } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getIntakeKindLabel, getParseStatusLabel } from '../utils/i18nLabels';
import { formatMaterialTime, materialMediaUrls, materialSourceUrl } from '../utils/material';
import { workspaceTitle } from '../utils/knowledge';
import { renderMarkdown } from '../utils/markdown';
import ParseTimeline from './ParseTimeline';
import MediaPreview from './MediaPreview';
import useModalA11y from '../hooks/useModalA11y';

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
 * 资料详情抽屉组件。
 * @param {object} props - 组件属性
 * @param {object|null} props.material - 当前展示的资料对象，为 null 时关闭抽屉
 * @param {() => void} props.onClose - 关闭抽屉回调
 * @param {Array} [props.workspaces] - 工作区列表，用于显示归属工作区标题
 * @returns {JSX.Element|null} 抽屉元素，material 为 null 时返回 null
 */
export default function MaterialDetailDrawer({ material, onClose, workspaces }) {
  const { t } = useTranslation();
  const drawerRef = useRef(null);
  const isOpen = material !== null;

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
    if (!material) return '';
    const text = material.contentText || material.rawInput || '';
    if (!text) return '';
    if (looksLikeMarkdown(text)) {
      return renderMarkdown(text);
    }
    return '';
  }, [material]);

  if (!material) return null;

  const rawText = material.contentText || material.rawInput || '';
  const sourceUrl = materialSourceUrl(material);
  const mediaUrls = materialMediaUrls(material);

  return (
    <div className="card-detail-overlay" onClick={onClose} role="presentation">
      <aside
        ref={drawerRef}
        className="card-detail-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={material.title || t('library.materialDetail')}
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
          <h2 className="card-detail-title">{material.title}</h2>

          {contentHtml ? (
            <div
              className="card-detail-markdown"
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />
          ) : rawText ? (
            <pre className="card-detail-text">{rawText}</pre>
          ) : (
            <p className="card-detail-empty">{t('library.noContent')}</p>
          )}

          {material.parseError && (
            <p className="library-error">{material.parseError}</p>
          )}

          <ParseTimeline item={material} />

          {mediaUrls.length > 0 && <MediaPreview urls={mediaUrls} />}

          <footer className="card-detail-meta">
            <span className="card-detail-meta-item">
              {t('cardDetail.workspace')}: {workspaceTitle(workspaces, material.workspaceId)}
            </span>
            <span className="card-detail-meta-item">
              {material.platform ?? t('library.localPlatform')}
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
              </a>
            )}
          </footer>
        </div>
      </aside>
    </div>
  );
}
