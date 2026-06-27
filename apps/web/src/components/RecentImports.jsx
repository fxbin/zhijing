/**
 * 最近导入资料组件：展示最近导入的材料卡片。
 * 支持浏览器内置 AI 模型生成摘要。
 * @module components/RecentImports
 */

import { useState } from 'react';
import { Loader2, PlayCircle, Sparkles, Upload, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import EmptyState from './EmptyState';
import { useParseStatusLabel } from '../utils/i18nLabels';
import { materialMediaUrls, isImageUrl, isVideoUrl, proxyImageUrl } from '../utils/material';
import { renderMarkdown } from '../utils/markdown';

const SUMMARY_MAX_CHARS = 300;

/**
 * 从材料的 mediaUrls 中解析封面图片 URL。
 * 适用于小红书、抖音等包含图片媒体的平台。
 * @param {object} item - 材料对象
 * @returns {string|undefined} 封面图片 URL，无封面时返回 undefined
 */
function resolveMaterialCover(item) {
  const urls = materialMediaUrls(item);
  return urls.find((url) => isImageUrl(url));
}

/**
 * 判断材料是否为视频笔记。
 * 当 mediaUrls 中存在视频 URL 时认定为视频笔记。
 * 适用于小红书、抖音等包含视频媒体的平台。
 * @param {object} item - 材料对象
 * @returns {boolean} 是否为视频笔记
 */
function isMaterialVideoNote(item) {
  const urls = materialMediaUrls(item);
  return urls.some((url) => isVideoUrl(url));
}

/**
 * 最近导入资料组件。
 * @param {object} props - 组件属性
 * @param {Array<object>} props.materials - 最近导入资料列表
 * @param {() => void} props.onViewAll - 点击「查看全部」回调
 * @param {(material: object) => void} [props.onViewDetail] - 点击卡片查看详情回调
 * @param {string} [props.browserAiStatus] - 浏览器内置 AI 模型状态
 * @returns {JSX.Element} 最近导入面板
 */
export default function RecentImports({ materials, onViewAll, onViewDetail, browserAiStatus = 'checking' }) {
  const { t } = useTranslation();
  const parseStatusLabel = useParseStatusLabel();
  const [previewUrl, setPreviewUrl] = useState(null);
  const [aiSummaries, setAiSummaries] = useState({});

  const aiReady = browserAiStatus === 'ready';

  /**
   * 获取平台显示名称。
   * @param {object} item - 材料对象
   * @returns {string} 平台本地化名称
   */
  function platformLabel(item) {
    const key = item.platform ?? 'material';
    return t(`platform.${key}`);
  }

  /**
   * 截断摘要文本到指定长度，尽量保留 Markdown 结构。
   * 仅压缩连续空白为单个空格，保留换行符以维持 Markdown 段落语义，
   * 避免将 `# 标题\n内容` 合并为一行导致被解析为单个标题。
   * @param {string} text - 原始文本
   * @returns {string} 截断后的文本
   */
  function truncateSummary(text) {
    if (!text) return '';
    const cleaned = text.replace(/[^\S\n]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    return cleaned.length > SUMMARY_MAX_CHARS
      ? `${cleaned.slice(0, SUMMARY_MAX_CHARS)}...`
      : cleaned;
  }

  /**
   * 触发浏览器 AI 生成摘要。
   * 仅当浏览器 AI 可用且材料尚未生成过摘要时调用。
   * @param {object} item - 材料对象
   */
  async function handleSummarize(item) {
    if (!aiReady || !item?.id) return;
    const existing = aiSummaries[item.id];
    if (existing?.state === 'loading' || existing?.state === 'done') return;
    setAiSummaries((prev) => ({ ...prev, [item.id]: { state: 'loading' } }));
    try {
      const { summarizeWithBrowserAi } = await import('../utils/browserAi.js');
      const summary = await summarizeWithBrowserAi(item.summary || item.title || '');
      setAiSummaries((prev) => ({ ...prev, [item.id]: { state: 'done', content: summary } }));
    } catch (err) {
      setAiSummaries((prev) => ({
        ...prev,
        [item.id]: { state: 'error', error: err?.message || t('recentImports.aiSummaryFailed') },
      }));
    }
  }

  return (
    <article className="recent-panel">
      <div className="section-title">
        <Upload size={22} />
        <h3>{t('recentImports.title')}</h3>
        <button type="button" onClick={onViewAll}>{t('common.viewAll')}</button>
      </div>
      <div className="material-list">
        {materials.length === 0 ? (
          <EmptyState title={t('library.empty.title')} body={t('library.empty.body')} />
        ) : materials.map((item, index) => {
          const coverUrl = resolveMaterialCover(item);
          const isVideo = isMaterialVideoNote(item);
          const truncatedSummary = truncateSummary(item.summary);
          const hasMore = item.summary && item.summary.replace(/\s+/g, ' ').trim().length > SUMMARY_MAX_CHARS;
          const aiState = aiSummaries[item.id];
          const showAiButton = aiReady && item.summary;
          return (
            <article
              className={`material-card ${item.state}${onViewDetail ? ' is-clickable' : ''}`}
              key={item.id ?? `recent-${index}`}
              onClick={onViewDetail ? () => onViewDetail(item) : undefined}
              role={onViewDetail ? 'button' : undefined}
              tabIndex={onViewDetail ? 0 : undefined}
              onKeyDown={onViewDetail ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onViewDetail(item);
                }
              } : undefined}
            >
              <div className="material-meta">
                <span>{platformLabel(item)}</span>
                <span>{parseStatusLabel(item.parseStatus ?? item.status)}</span>
                <time>{item.time}</time>
              </div>
              <h4>{item.title}</h4>
              {coverUrl && (
                <button
                  aria-label={t('recentImports.viewCover')}
                  className={`material-cover-thumb${isVideo ? ' is-video' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewUrl(coverUrl);
                  }}
                  type="button"
                >
                  <img alt={item.title} loading="lazy" src={proxyImageUrl(coverUrl)} />
                  {isVideo && (
                    <span className="material-video-badge" aria-hidden="true">
                      <PlayCircle size={28} />
                    </span>
                  )}
                </button>
              )}
              <div
                className="material-summary markdown-body"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(truncatedSummary) }}
              />
              {hasMore && onViewDetail && (
                <button
                  type="button"
                  className="material-read-more"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetail(item);
                  }}
                >
                  {t('recentImports.readMore')}
                </button>
              )}
              {showAiButton && (
                <div className="material-ai-summary">
                  {aiState?.state === 'done' ? (
                    <div className="material-ai-summary-result">
                      <div className="material-ai-summary-head">
                        <Sparkles size={14} />
                        <span>{t('recentImports.aiSummaryLabel')}</span>
                      </div>
                      <p>{aiState.content}</p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="material-ai-summary-btn"
                      disabled={aiState?.state === 'loading'}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSummarize(item);
                      }}
                    >
                      {aiState?.state === 'loading' ? (
                        <><Loader2 size={14} className="spin" /> {t('recentImports.aiSummaryLoading')}</>
                      ) : (
                        <><Sparkles size={14} /> {t('recentImports.aiSummaryAction')}</>
                      )}
                    </button>
                  )}
                  {aiState?.state === 'error' && (
                    <p className="material-ai-summary-error">{aiState.error}</p>
                  )}
                </div>
              )}
              <div className="tag-row">{item.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
            </article>
          );
        })}
      </div>

      {previewUrl && (
        <div
          className="image-lightbox"
          onClick={(event) => {
            if (event.target === event.currentTarget) setPreviewUrl(null);
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setPreviewUrl(null);
          }}
        >
          <button
            aria-label={t('media.closePreview')}
            className="image-lightbox-close"
            onClick={() => setPreviewUrl(null)}
            type="button"
          >
            <X size={22} />
          </button>
          <img alt={t('media.mediaPreview')} src={proxyImageUrl(previewUrl)} />
        </div>
      )}
    </article>
  );
}
