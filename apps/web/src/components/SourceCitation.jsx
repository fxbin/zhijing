/**
 * 来源引用组件：可展开显示来源片段的引用卡片。
 * @module components/SourceCitation
 */

import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { CITATION_SNIPPET_LIMIT } from '../constants/options';

/**
 * 来源引用卡片，支持展开查看来源片段。
 * @param {object} props - 组件属性
 * @param {object} props.citation - 引用对象（kind/cardId/materialId/title/preview/sourceUrl）
 * @param {Array<object>} props.cards - 卡片数组（用于查找引用源）
 * @param {Array<object>} props.materials - 材料数组（用于查找引用源）
 * @returns {JSX.Element} 引用卡片
 */
export default function SourceCitation({ citation, cards, materials }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
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

  const hasBody = typeof fullBody === 'string' && fullBody.trim().length > 0;
  const snippet = hasBody ? fullBody.slice(0, CITATION_SNIPPET_LIMIT) : '';
  const truncated = hasBody && fullBody.length > CITATION_SNIPPET_LIMIT;

  return (
    <article className={`citation-item${expanded ? ' expanded' : ''}`}>
      <button
        className="citation-toggle"
        type="button"
        onClick={() => hasBody && setExpanded((value) => !value)}
        aria-expanded={expanded}
        disabled={!hasBody}
      >
        <span className="citation-kind">{t(`sourceCitation.kind.${citation.kind}`, { defaultValue: citation.kind })}</span>
        <strong>{citation.title}</strong>
        {hasBody && <ChevronDown size={15} className="citation-chevron" />}
      </button>
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
