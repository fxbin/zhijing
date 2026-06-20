/**
 * 媒体预览组件：展示材料的图片、视频或媒体链接。
 * @module components/MediaPreview
 */

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { isImageUrl, isVideoUrl, proxyImageUrl } from '../utils/material';

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
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewType, setPreviewType] = useState(null);
  const mediaUrls = (urls ?? []).filter(Boolean).slice(0, compact ? 4 : 6);
  if (mediaUrls.length === 0) return null;

  /**
   * 打开 Lightbox 预览。
   * @param {string} url - 媒体 URL
   * @param {string} type - 媒体类型，'image' 或 'video'
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
          if (isVideoUrl(url)) {
            return (
              <button
                className="media-preview-video"
                key={url}
                onClick={() => openPreview(url, 'video')}
                title={`预览视频 ${index + 1}`}
                type="button"
              >
                <video
                  src={url}
                  preload="metadata"
                  title={`Media ${index + 1}`}
                />
              </button>
            );
          }
          if (isImageUrl(url)) {
            return (
              <button
                className="media-preview-image"
                key={url}
                onClick={() => openPreview(url, 'image')}
                title={`预览图片 ${index + 1}`}
                type="button"
              >
                <img alt={`media ${index + 1}`} src={proxyImageUrl(url)} loading="lazy" />
              </button>
            );
          }
          return (
            <a href={url} key={url} target="_blank" rel="noreferrer" title={`Open media ${index + 1}`}>
              <span>Media {index + 1}</span>
            </a>
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
            aria-label="关闭预览"
            className="media-lightbox-close"
            onClick={closePreview}
            type="button"
          >
            <X size={22} />
          </button>
          {previewType === 'video' ? (
            <video controls src={previewUrl} autoPlay />
          ) : (
            <img alt="媒体预览" src={proxyImageUrl(previewUrl)} />
          )}
        </div>
      )}
    </>
  );
}
