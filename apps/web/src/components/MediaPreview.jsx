/**
 * 媒体预览组件：展示材料的图片或媒体链接。
 * @module components/MediaPreview
 */

import { isImageUrl } from '../utils/material';

/**
 * 媒体预览组件，展示图片缩略图或媒体链接。
 * @param {object} props - 组件属性
 * @param {string[]} props.urls - 媒体 URL 数组
 * @param {boolean} [props.compact=false] - 是否紧凑模式（最多 4 个）
 * @returns {JSX.Element|null} 媒体预览区块
 */
export default function MediaPreview({ urls, compact = false }) {
  const mediaUrls = (urls ?? []).filter(Boolean).slice(0, compact ? 4 : 6);
  if (mediaUrls.length === 0) return null;

  return (
    <div className={`media-preview ${compact ? 'compact' : ''}`}>
      {mediaUrls.map((url, index) => (
        <a href={url} key={url} target="_blank" rel="noreferrer" title={`Open media ${index + 1}`}>
          {isImageUrl(url) ? <img alt={`media ${index + 1}`} src={url} loading="lazy" /> : <span>Media {index + 1}</span>}
        </a>
      ))}
    </div>
  );
}
