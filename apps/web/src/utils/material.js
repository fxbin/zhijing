/**
 * 材料相关工具函数：API 转换、预览、状态判断、时间线构建等。
 * @module utils/material
 */

import { FileText, FolderOpen, Link2 } from 'lucide-react';

import i18n from '../i18n';
import { PARSE_STAGE_LABELS } from '../constants/labels';

/**
 * 将 API 返回的材料对象转换为前端展示格式。
 * @param {object} item - API 材料对象
 * @returns {object} 前端展示用材料对象
 */
export function materialFromApi(item) {
  const platform = item.platform ?? item.type ?? 'material';
  const status = item.parseStatus ?? 'saved';
  return {
    ...item,
    source: platform.toUpperCase(),
    status: status.toUpperCase(),
    title: item.title ?? 'Untitled material',
    summary: item.contentText || item.rawInput || 'Saved source material.',
    tags: [item.type ?? 'material', status],
    time: 'just now',
    state: status === 'failed' ? 'failed' : status === 'parsing' ? 'processing' : 'ready',
  };
}

/**
 * 生成材料预览文本（截断到 180 字符）。
 * @param {object} item - 材料对象
 * @returns {string} 预览文本
 */
export function materialPreview(item) {
  const text = item.contentText || item.rawInput || item.sourceUrl || 'Saved source material.';
  const cleaned = text.replace(/\s+/g, ' ').trim();
  return cleaned.length > 180 ? `${cleaned.slice(0, 180)}...` : cleaned;
}

/**
 * 提取材料的来源 URL。
 * @param {object} item - 材料对象
 * @returns {string|undefined} 来源 URL
 */
export function materialSourceUrl(item) {
  return item.sourceUrl?.match(/https?:\/\/[^\s"'<>]+/i)?.[0]
    ?? item.rawInput?.match(/https?:\/\/[^\s"'<>]+/i)?.[0];
}

/**
 * 获取材料的媒体 URL 列表。
 * @param {object} item - 材料对象
 * @returns {string[]} 媒体 URL 数组
 */
export function materialMediaUrls(item) {
  return Array.isArray(item.mediaUrls) ? item.mediaUrls.filter(Boolean) : [];
}

/**
 * 将外部图片 URL 转换为本地代理 URL，解决跨域与 ORB 拦截问题。
 * @param {string} url - 原始图片 URL
 * @returns {string} 代理后的图片 URL
 */
export function proxyImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  if (url.startsWith('/api/proxy-image')) return url;
  return `/api/proxy-image?url=${encodeURIComponent(url)}`;
}

/**
 * 将空格分隔的字符串拆分为合法 URL 数组。
 * @param {string} value - 包含 URL 的字符串
 * @returns {string[]} 合法 URL 数组
 */
export function splitMediaUrls(value) {
  return value
    .split(/\s+/)
    .map((item) => item.trim())
    .filter((item) => /^https?:\/\//i.test(item));
}

/**
 * 判断 URL 是否为视频 URL。
 * @param {string} url - 待判断的 URL
 * @returns {boolean} 是否为视频 URL
 */
export function isVideoUrl(url) {
  return /sns-video|\.mp4|\.mov|\.webm|\.m4v|videocdn/i.test(url);
}

/**
 * 判断 URL 是否为图片 URL。
 * @param {string} url - 待判断的 URL
 * @returns {boolean} 是否为图片 URL
 */
export function isImageUrl(url) {
  if (isVideoUrl(url)) return false;
  return /sns-img|image|format\/jpg|format\/png|\.jpe?g|\.png|\.webp/i.test(url);
}

/**
 * 根据解析状态推导材料展示状态。
 * @param {string} status - 解析状态
 * @returns {string} 展示状态（failed/processing/ready）
 */
export function materialState(status) {
  if (status === 'failed') return 'failed';
  if (status === 'parsing' || status === 'saved' || status === 'needs_review') return 'processing';
  return 'ready';
}

/**
 * 根据材料类型返回对应图标组件。
 * @param {string} type - 材料类型
 * @returns {object} lucide-react 图标组件
 */
export function materialIcon(type) {
  return type === 'link' ? Link2 : FileText;
}

/**
 * 根据结果类型返回对应图标组件。
 * @param {string} kind - 结果类型（knowledge_base/material/artifact）
 * @returns {object} lucide-react 图标组件
 */
export function resultIcon(kind) {
  if (kind === 'knowledge_base') return FolderOpen;
  if (kind === 'material') return FolderOpen;
  if (kind === 'artifact') return ClipboardList;
  return FileText;
}

/**
 * 判断材料是否可解析。
 * @param {object} item - 材料对象
 * @returns {boolean} 是否可解析
 */
export function canParseMaterial(item) {
  return item.type === 'link' && item.parseStatus !== 'ingested' && item.parseStatus !== 'parsing';
}

/**
 * 格式化材料时间戳为本地字符串。
 * @param {string} value - ISO 时间戳
 * @returns {string} 格式化后的时间字符串
 */
export function formatMaterialTime(value) {
  return formatDateTime(value);
}

/**
 * 格式化日期时间为当前语言的本地化字符串。
 * @param {string|number|Date} value - 时间值
 * @returns {string} 本地化后的日期时间字符串
 */
export function formatDateTime(value) {
  if (!value) return i18n.t('time.justNow');
  try {
    const locale = i18n.language === 'zh' ? 'zh-CN' : 'en-US';
    return new Date(value).toLocaleString(locale);
  } catch {
    return i18n.t('time.justNow');
  }
}

/**
 * 格式化日期为当前语言的本地化字符串。
 * @param {string|number|Date} value - 时间值
 * @returns {string} 本地化后的日期字符串
 */
export function formatDate(value) {
  if (!value) return i18n.t('time.justNow');
  try {
    const locale = i18n.language === 'zh' ? 'zh-CN' : 'en-US';
    return new Date(value).toLocaleDateString(locale);
  } catch {
    return i18n.t('time.justNow');
  }
}

/**
 * 格式化时间为当前语言的本地化字符串。
 * @param {string|number|Date} value - 时间值
 * @returns {string} 本地化后的时间字符串
 */
export function formatTime(value) {
  if (!value) return i18n.t('time.justNow');
  try {
    const locale = i18n.language === 'zh' ? 'zh-CN' : 'en-US';
    return new Date(value).toLocaleTimeString(locale);
  } catch {
    return i18n.t('time.justNow');
  }
}

/**
 * 根据材料的状态时间线构建解析阶段数组。
 * @param {object} item - 材料对象（含 statusTimeline）
 * @returns {Array<{key: string, label: string, at: string, failed: boolean}>} 解析阶段数组
 */
export function buildParseTimelineStages(item) {
  const timeline = item.statusTimeline ?? {};
  const failed = Boolean(timeline.failedAt);
  const stamps = {
    captured: timeline.capturedAt ?? item.createdAt,
    queued: timeline.queuedAt,
    parsing: timeline.parsingAt,
    review: timeline.reviewedAt ?? timeline.failedAt,
    ingested: timeline.ingestedAt,
  };
  return ['captured', 'queued', 'parsing', 'review', 'ingested'].map((key) => ({
    key,
    label: PARSE_STAGE_LABELS[key],
    at: stamps[key],
    failed: failed && key === 'review',
  }));
}

/**
 * 将批量捕获输入按行拆分为数组（最多 30 条）。
 * @param {string} value - 批量输入文本
 * @returns {string[]} 拆分后的非空行数组
 */
export function splitBatchCaptureInput(value) {
  return value
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 30);
}
