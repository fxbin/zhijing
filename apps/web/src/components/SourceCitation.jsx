/**
 * 来源引用组件：可展开显示来源片段的引用卡片。
 * @module components/SourceCitation
 */

import { useMemo } from 'react';
import { ChevronDown, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { CITATION_SNIPPET_LIMIT } from '../constants/options';

/**
 * 来源引用卡片，支持展开查看来源片段。
 *
 * expanded 状态由父组件管理（受控模式），便于父组件在用户点击正文 [n] 锚点时
 * 自动展开对应的 SourceCitation。
 *
 * @param {object} props - 组件属性
 * @param {object} props.citation - 引用对象（kind/cardId/materialId/title/preview/sourceUrl）
 * @param {Array<object>} props.cards - 卡片数组（用于查找引用源）
 * @param {Array<object>} props.materials - 材料数组（用于查找引用源）
 * @param {(material: object) => void} [props.onOpenMaterial] - 打开资料详情回调
 * @param {(card: object) => void} [props.onOpenCard] - 打开卡片详情回调
 * @param {boolean} [props.expanded=false] - 是否展开（受控）
 * @param {(value: boolean) => void} [props.onExpandedChange] - 展开/收起回调
 * @returns {JSX.Element} 引用卡片
 */
export default function SourceCitation({ citation, cards, materials, onOpenMaterial, onOpenCard, expanded = false, onExpandedChange }) {
  const { t } = useTranslation();
  const fullBody = useMemo(() => {
    if (citation.kind === 'card' && citation.cardId) {
      const card = cards.find((item) => item.id === citation.cardId);
      return card?.body;
    }
    if (citation.kind === 'material' && citation.materialId) {
      const material = materials.find((item) => item.id === citation.materialId);
      return material?.contentText;
    }
    return undefined;
  }, [citation, cards, materials]);

  const linkedMaterial = useMemo(() => {
    if (citation.kind === 'material' && citation.materialId) {
      return materials.find((item) => item.id === citation.materialId);
    }
    return undefined;
  }, [citation, materials]);

  const linkedCard = useMemo(() => {
    if (citation.kind === 'card' && citation.cardId) {
      return cards.find((item) => item.id === citation.cardId);
    }
    return undefined;
  }, [citation, cards]);

  const hasBody = typeof fullBody === 'string' && fullBody.trim().length > 0;
  const snippet = hasBody ? fullBody.slice(0, CITATION_SNIPPET_LIMIT) : '';
  const truncated = hasBody && fullBody.length > CITATION_SNIPPET_LIMIT;
  const canOpenDetail = (linkedMaterial && typeof onOpenMaterial === 'function')
    || (linkedCard && typeof onOpenCard === 'function');

  const handleOpenDetail = () => {
    if (linkedMaterial && typeof onOpenMaterial === 'function') {
      onOpenMaterial(linkedMaterial);
    } else if (linkedCard && typeof onOpenCard === 'function') {
      onOpenCard(linkedCard);
    }
  };

  const handleToggle = () => {
    if (hasBody && typeof onExpandedChange === 'function') {
      onExpandedChange(!expanded);
    }
  };

  const displayTitle = linkedCard?.title || linkedMaterial?.title || citation.title;

  return (
    <article className={`citation-item${expanded ? ' expanded' : ''}`}>
      <div className="citation-header">
        <button
          className="citation-toggle"
          type="button"
          onClick={handleToggle}
          aria-expanded={expanded}
          disabled={!hasBody}
        >
          <span className="citation-kind">{t(`sourceCitation.kind.${citation.kind}`, { defaultValue: citation.kind })}</span>
          <strong>{displayTitle}</strong>
          {hasBody && <ChevronDown size={15} className="citation-chevron" />}
        </button>
        {canOpenDetail && (
          <button
            type="button"
            className="citation-open-detail-btn"
            onClick={handleOpenDetail}
            title={t('sourceCitation.openDetail')}
            aria-label={t('sourceCitation.openDetail')}
          >
            <ExternalLink size={14} />
          </button>
        )}
      </div>
      <div className="citation-body">
        <p className="citation-preview">{citation.preview}</p>
        {expanded && hasBody && (
          <div className="citation-snippet">
            <span>{t('sourceCitation.sourceSnippet')}</span>
            <p>{snippet}{truncated ? '…' : ''}</p>
          </div>
        )}
        {citation.sourceUrl && <a href={citation.sourceUrl} target="_blank" rel="noreferrer">{t('sourceCitation.openSource')}</a>}
      </div>
    </article>
  );
}
