/**
 * 微信读书书籍卡片组件及其骨架屏。
 *
 * 包含两个紧密相关的导出：
 * - WeReadCard（memo 化）：渲染书籍封面、标题、分类徽标、submeta、动作按钮
 *   支持选择模式、导入中/已导入/失败三态切换、列表视图下的元信息标签条
 * - WeReadCardSkeleton：列表初次加载时的骨架占位
 *
 * 从 WeReadView.jsx 拆分而来，原 props 表面与渲染行为完全保持不变。
 *
 * @module views/weread/WeReadCard
 * @author fxbin
 */

import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  Check,
  ExternalLink,
  Loader2,
  RefreshCw,
} from 'lucide-react';

import {
  CARD_STATE_DONE,
  CARD_STATE_FAILED,
  CARD_STATE_IMPORTING,
  FINISHED_FLAG,
  VIEW_LIST,
} from '../../constants/weread';
import { buildBookSubmeta, formatRelativeTime } from './utils';
import CategoryChip from './CategoryChip';

const WeReadCard = memo(function WeReadCard({
  cover,
  title,
  author,
  category,
  meta,
  webUrl,
  cardState,
  result,
  selecting,
  selected,
  view,
  onToggleSelect,
  onImport,
  onOpenImported,
  onCopyTitleForSearch,
}) {
  const { t } = useTranslation();
  const showSelect = selecting;
  const isDone = cardState === CARD_STATE_DONE;
  const isFailed = cardState === CARD_STATE_FAILED;
  const isImporting = cardState === CARD_STATE_IMPORTING;
  const submeta = meta ? buildBookSubmeta(meta, t) : null;

  const metatags = useMemo(() => {
    if (!meta || view !== VIEW_LIST) return [];
    const tags = [];
    if (meta.archiveYear) {
      tags.push({ key: 'year', text: t('weread.metaYearJoined', { year: meta.archiveYear }) });
    }
    if (meta.finishReading === FINISHED_FLAG) {
      tags.push({ key: 'finished', text: t('weread.metaFinished'), success: true });
    }
    if (meta.readUpdateTime) {
      const time = formatRelativeTime(meta.readUpdateTime, t);
      if (time) tags.push({ key: 'recent', text: time });
    }
    if (meta.materialId) {
      tags.push({
        key: 'imported',
        text: t('weread.metaImported', { count: meta.bookmarkCount || 0 }),
        success: true,
      });
    }
    return tags;
  }, [meta, view, t]);

  return (
    <article
      className={`weread-card${isDone ? ' is-imported' : ''}${isFailed ? ' is-failed' : ''}${selected ? ' is-selected' : ''} weread-card--${view}`}
      onClick={showSelect ? () => onToggleSelect() : undefined}
      role={showSelect ? 'button' : undefined}
      aria-pressed={showSelect ? selected : undefined}
      tabIndex={showSelect ? 0 : undefined}
      onKeyDown={showSelect ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleSelect(); } } : undefined}
    >
      <div className="weread-card-cover">
        {showSelect && (
          <span className={`weread-check${selected ? ' is-on' : ''}`} aria-hidden="true">
            {selected && <Check size={14} strokeWidth={3.5} />}
          </span>
        )}
        {cover ? (
          <img src={cover} alt="" loading="lazy" decoding="async" />
        ) : (
          <span className="weread-cover-placeholder"><BookOpen size={28} /></span>
        )}
        {category && (
          <div className="weread-cover-chip-wrap">
            <CategoryChip category={category} />
          </div>
        )}
      </div>

      <div className="weread-card-meta">
        <strong className="weread-card-title" title={title}>{title}</strong>
        {author && <span className="weread-card-author">{author}</span>}
        {submeta && (
          <span className="weread-card-submeta">
            <span className={`weread-meta-dot ${submeta.dotClass}`} />
            {submeta.text}
          </span>
        )}
      </div>

      {metatags.length > 0 && (
        <div className="weread-card-metarow">
          {metatags.map((tag) => (
            <span
              key={tag.key}
              className={`weread-metatag${tag.success ? ' weread-metatag--success' : ''}`}
            >
              {tag.text}
            </span>
          ))}
        </div>
      )}

      {!showSelect && (
        <div className="weread-card-actions">
          <a
            className="weread-icon-btn"
            href={webUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('weread.openInApp')}
            title={t('weread.openInApp')}
            onClick={() => {
              if (!onCopyTitleForSearch) return;
              onCopyTitleForSearch();
            }}
          >
            <ExternalLink size={15} />
          </a>
          {isDone ? (
            <button type="button" className="weread-card-btn is-done" onClick={() => onOpenImported()}>
              <Check size={14} /> <span>{t('weread.imported')}</span>
            </button>
          ) : isFailed ? (
            <button type="button" className="weread-card-btn is-failed" onClick={() => onImport()}>
              <RefreshCw size={14} /> <span>{t('weread.retry')}</span>
            </button>
          ) : (
            <button
              type="button"
              className="weread-card-btn"
              onClick={() => onImport()}
              disabled={isImporting}
            >
              {isImporting ? <Loader2 size={14} className="spin" /> : <BookOpen size={14} />}
              <span>{isImporting ? t('weread.importing') : t('weread.importNotes')}</span>
            </button>
          )}
        </div>
      )}

      {isFailed && result?.error && (
        <p className="weread-card-error">{result.error}</p>
      )}
    </article>
  );
});

function WeReadCardSkeleton() {
  return (
    <article className="weread-card skeleton" aria-hidden="true">
      <div className="weread-card-cover sk-block" />
      <div className="weread-card-meta">
        <span className="sk-line sk-w-85" />
        <span className="sk-line sk-w-55" />
      </div>
    </article>
  );
}

export default WeReadCard;
export { WeReadCardSkeleton };
