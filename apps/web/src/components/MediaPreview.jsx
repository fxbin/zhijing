/**
 * 媒体预览组件：展示材料的图片、视频或媒体链接。
 * @module components/MediaPreview
 */

import { useEffect, useState } from 'react';
import { Image as ImageIcon, Play, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { isImageUrl, isVideoUrl, proxyImageUrl, proxyVideoUrl } from '../utils/material';

/**
 * 媒体预览组件，展示图片缩略图、视频播放器或媒体链接。
 * 点击图片或视频会在当前页弹出 Lightbox 预览，而非新开浏览器标签页。
 *
 * @param {object} props - 组件属性
 * @param {string[]} props.urls - 媒体 URL 数组
 * @param {boolean} [props.compact=false] - 是否紧凑模式（最多 4 个）
 * @returns {JSX.Element|null} 媒体预览区块
 */
export default function MediaPreview({ urls, compact = false }) {
  const { t } = useTranslation();
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewType, setPreviewType] = useState(null);
  const mediaUrls = (urls ?? []).filter(Boolean).slice(0, compact ? 4 : 6);
  if (mediaUrls.length === 0) return null;

  /**
   * 探测媒体类型。
   * @param {string} url - 媒体 URL
   * @returns {'video'|'image'|'unknown'} 媒体类型
   */
  function detectMediaType(url) {
    if (isVideoUrl(url)) return 'video';
    if (isImageUrl(url)) return 'image';
    return 'unknown';
  }

  /**
   * 打开 Lightbox 预览。
   * @param {string} url - 媒体 URL
   * @param {string} type - 媒体类型
   */
  function openPreview(url, type) {
    setPreviewUrl(url);
    setPreviewType(type);
  }

  /**
   * 关闭 Lightbox 预览。
   */
  function closePreview() {
    setPreviewUrl(null);
    setPreviewType(null);
  }

  useEffect(() => {
    /**
     * 监听 Escape 键关闭预览。
     * @param {KeyboardEvent} event
     */
    function handleKeyDown(event) {
      if (event.key === 'Escape') closePreview();
    }
    if (previewUrl) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [previewUrl]);

  return (
    <>
      <div className={`media-preview ${compact ? 'compact' : ''}`}>
        {mediaUrls.map((url, index) => {
          const type = detectMediaType(url);
          const title = type === 'video' ? t('media.previewVideo') : t('media.previewImage');
          return (
            <button
              className={`media-preview-item ${type === 'video' ? 'media-preview-video' : 'media-preview-image'}`}
              key={url}
              onClick={() => openPreview(url, type)}
              title={`${title} ${index + 1}`}
              type="button"
            >
              {type === 'video' && (
                <>
                  <video src={proxyVideoUrl(url)} preload="metadata" title={`${title} ${index + 1}`} />
                  <span className="media-preview-play">
                    <Play size={20} fill="currentColor" />
                  </span>
                </>
              )}
              {type === 'image' && (
                <img alt={`${title} ${index + 1}`} src={proxyImageUrl(url)} loading="lazy" />
              )}
              {type === 'unknown' && (
                <span className="media-preview-fallback">
                  <ImageIcon size={24} />
                  {t('media.mediaPreview')}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {previewUrl && (
        <div
          className="media-lightbox"
          onClick={(event) => {
            if (event.target === event.currentTarget) closePreview();
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Escape') closePreview();
          }}
        >
          <button
            aria-label={t('media.closePreview')}
            className="media-lightbox-close"
            onClick={closePreview}
            type="button"
          >
            <X size={22} />
          </button>
          {previewType === 'video' ? (
            <video controls src={proxyVideoUrl(previewUrl)} autoPlay />
          ) : (
            <img alt={t('media.mediaPreview')} src={proxyImageUrl(previewUrl)} />
          )}
        </div>
      )}
    </>
  );
}
