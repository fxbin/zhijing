/**
 * 最近导入资料组件：展示最近导入的材料卡片。
 * @module components/RecentImports
 */

import { useState } from 'react';
import { Upload, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import EmptyState from './EmptyState';
import { materialMediaUrls, isImageUrl, proxyImageUrl } from '../utils/material';

/**
 * 判断材料是否为小红书且包含可展示的图片封面。
 * @param {object} item - 材料对象
 * @returns {string|undefined} 封面图片 URL，无封面时返回 undefined
 */
function resolveXiaohongshuCover(item) {
  if (item.platform !== 'xiaohongshu') return undefined;
  const urls = materialMediaUrls(item);
  return urls.find((url) => isImageUrl(url));
}

export default function RecentImports({ materials }) {
  const { t } = useTranslation();
  const [previewUrl, setPreviewUrl] = useState(null);

  return (
    <article className="recent-panel">
      <div className="section-title">
        <Upload size={22} />
        <h3>Recently Imported</h3>
        <button type="button">{t('common.viewAll')}</button>
      </div>
      <div className="material-list">
        {materials.length === 0 ? (
          <EmptyState title={t('library.empty.title')} body={t('library.empty.body')} />
        ) : materials.map((item, index) => {
          const coverUrl = resolveXiaohongshuCover(item);
          return (
            <article className={`material-card ${item.state}`} key={item.id ?? `recent-${index}`}>
              <div className="material-meta">
                <span>{item.source}</span>
                <span>{item.status}</span>
                <time>{item.time}</time>
              </div>
              <h4>{item.title}</h4>
              {coverUrl && (
                <button
                  aria-label="查看封面大图"
                  className="material-cover-thumb"
                  onClick={() => setPreviewUrl(coverUrl)}
                  type="button"
                >
                  <img alt={item.title} loading="lazy" src={proxyImageUrl(coverUrl)} />
                </button>
              )}
              <p>{item.summary}</p>
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
            aria-label="关闭预览"
            className="image-lightbox-close"
            onClick={() => setPreviewUrl(null)}
            type="button"
          >
            <X size={22} />
          </button>
          <img alt="封面预览" src={proxyImageUrl(previewUrl)} />
        </div>
      )}
    </article>
  );
}
