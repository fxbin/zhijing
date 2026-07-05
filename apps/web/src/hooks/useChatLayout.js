/**
 * AI 对话框布局状态管理 Hook。
 * 统一管理对话面板的模式、最小化、位置、尺寸，并持久化到 localStorage。
 * @module hooks/useChatLayout
 */

import { useCallback, useEffect, useState } from 'react';

const DEFAULT_STORAGE_KEY = 'zhijing-chat-layout';
const MARKER_SIZE_PX = 52;
const VIEWPORT_MARGIN_PX = 24;
export const MIN_FLOATING_WIDTH_PX = 320;
export const MIN_FLOATING_HEIGHT_PX = 420;

const DEFAULT_LAYOUT = {
  mode: 'sidebar',
  minimized: false,
  position: { x: VIEWPORT_MARGIN_PX, y: 96 },
  markerPosition: { x: VIEWPORT_MARGIN_PX, y: 96 },
  panelPosition: { x: VIEWPORT_MARGIN_PX, y: 96 },
  size: { width: 380, height: 640 },
};

/**
 * 获取悬浮球的默认可见位置（右下角，避开左侧导航栏）。
 * @returns {{ x: number; y: number }} 默认位置
 */
function getDefaultMarkerPosition() {
  if (typeof window === 'undefined') {
    return DEFAULT_LAYOUT.position;
  }
  return {
    x: Math.max(VIEWPORT_MARGIN_PX, window.innerWidth - MARKER_SIZE_PX - VIEWPORT_MARGIN_PX),
    y: Math.max(VIEWPORT_MARGIN_PX, window.innerHeight - MARKER_SIZE_PX - VIEWPORT_MARGIN_PX),
  };
}

/**
 * 获取 floating 模式下面板的默认可见位置（右下角，略偏离悬浮球位置）。
 * @returns {{ x: number; y: number }} 默认位置
 */
function getDefaultFloatingPosition() {
  if (typeof window === 'undefined') {
    return DEFAULT_LAYOUT.position;
  }
  return {
    x: Math.max(VIEWPORT_MARGIN_PX, window.innerWidth - DEFAULT_LAYOUT.size.width - VIEWPORT_MARGIN_PX),
    y: Math.max(VIEWPORT_MARGIN_PX, window.innerHeight - DEFAULT_LAYOUT.size.height - VIEWPORT_MARGIN_PX),
  };
}

/**
 * 将悬浮球位置限制在可视区域内（使用球体尺寸）。
 * @param {{ x: number; y: number }} position - 目标位置
 * @returns {{ x: number; y: number }} 限制后的位置
 */
function clampMarkerPosition(position) {
  if (typeof window === 'undefined') {
    return position;
  }
  const maxX = window.innerWidth - MARKER_SIZE_PX - VIEWPORT_MARGIN_PX;
  const maxY = window.innerHeight - MARKER_SIZE_PX - VIEWPORT_MARGIN_PX;
  return {
    x: Math.max(VIEWPORT_MARGIN_PX, Math.min(maxX, position.x)),
    y: Math.max(VIEWPORT_MARGIN_PX, Math.min(maxY, position.y)),
  };
}

/**
 * 将浮动面板位置限制在可视区域内（使用面板尺寸）。
 * @param {{ x: number; y: number }} position - 目标位置
 * @param {{ width: number; height: number }} size - 面板尺寸
 * @returns {{ x: number; y: number }} 限制后的位置
 */
function clampFloatingPosition(position, size) {
  if (typeof window === 'undefined') {
    return position;
  }
  const maxX = window.innerWidth - size.width - VIEWPORT_MARGIN_PX;
  const maxY = window.innerHeight - size.height - VIEWPORT_MARGIN_PX;
  return {
    x: Math.max(VIEWPORT_MARGIN_PX, Math.min(maxX, position.x)),
    y: Math.max(VIEWPORT_MARGIN_PX, Math.min(maxY, position.y)),
  };
}

/**
 * 将浮动面板尺寸限制在可视区域内。
 * @param {{ width: number; height: number }} size - 目标尺寸
 * @param {{ x: number; y: number }} position - 当前面板位置
 * @returns {{ width: number; height: number }} 限制后的尺寸
 */
function clampFloatingSize(size, position) {
  if (typeof window === 'undefined') {
    return size;
  }
  const maxWidth = Math.max(MIN_FLOATING_WIDTH_PX, window.innerWidth - position.x - VIEWPORT_MARGIN_PX);
  const maxHeight = Math.max(MIN_FLOATING_HEIGHT_PX, window.innerHeight - position.y - VIEWPORT_MARGIN_PX);
  return {
    width: Math.max(MIN_FLOATING_WIDTH_PX, Math.min(maxWidth, size.width)),
    height: Math.max(MIN_FLOATING_HEIGHT_PX, Math.min(maxHeight, size.height)),
  };
}

/**
 * 从 localStorage 加载布局状态。
 * @param {string} key - 存储键名
 * @returns {object} 布局状态
 */
function loadLayout(key) {
  if (typeof window === 'undefined') {
    return DEFAULT_LAYOUT;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      const markerPosition = getDefaultMarkerPosition();
      const panelPosition = getDefaultFloatingPosition();
      return {
        ...DEFAULT_LAYOUT,
        position: markerPosition,
        markerPosition,
        panelPosition,
      };
    }
    const parsed = JSON.parse(raw);
    const fallbackMarkerPosition = getDefaultMarkerPosition();
    const fallbackPanelPosition = getDefaultFloatingPosition();
    const legacyPosition = {
      x: Number.isFinite(parsed.position?.x) ? parsed.position.x : fallbackMarkerPosition.x,
      y: Number.isFinite(parsed.position?.y) ? parsed.position.y : fallbackMarkerPosition.y,
    };
    const rawMarkerPosition = {
      x: Number.isFinite(parsed.markerPosition?.x) ? parsed.markerPosition.x : legacyPosition.x,
      y: Number.isFinite(parsed.markerPosition?.y) ? parsed.markerPosition.y : legacyPosition.y,
    };
    const rawPanelPosition = {
      x: Number.isFinite(parsed.panelPosition?.x)
        ? parsed.panelPosition.x
        : (parsed.mode === 'floating' && !parsed.minimized ? legacyPosition.x : fallbackPanelPosition.x),
      y: Number.isFinite(parsed.panelPosition?.y)
        ? parsed.panelPosition.y
        : (parsed.mode === 'floating' && !parsed.minimized ? legacyPosition.y : fallbackPanelPosition.y),
    };
    const rawSize = {
      width: Number.isFinite(parsed.size?.width) ? parsed.size.width : DEFAULT_LAYOUT.size.width,
      height: Number.isFinite(parsed.size?.height) ? parsed.size.height : DEFAULT_LAYOUT.size.height,
    };
    const mode = parsed.mode === 'floating' ? 'floating' : 'sidebar';
    const markerPosition = clampMarkerPosition(rawMarkerPosition);
    const panelPosition = clampFloatingPosition(rawPanelPosition, rawSize);
    const size = clampFloatingSize(rawSize, panelPosition);
    const position = parsed.minimized ? markerPosition : panelPosition;
    return {
      mode,
      minimized: Boolean(parsed.minimized),
      markerPosition,
      panelPosition: clampFloatingPosition(panelPosition, size),
      position,
      size,
    };
  } catch {
    const markerPosition = getDefaultMarkerPosition();
    const panelPosition = getDefaultFloatingPosition();
    return {
      ...DEFAULT_LAYOUT,
      position: markerPosition,
      markerPosition,
      panelPosition,
    };
  }
}

/**
 * 将布局状态保存到 localStorage。
 * @param {string} key - 存储键名
 * @param {object} layout - 布局状态
 */
function saveLayout(key, layout) {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(layout));
  } catch {
    // 忽略存储失败（如隐私模式）。
  }
}

/**
 * 使用 AI 对话框布局状态。
 *
 * 首次访问（localStorage 无记录）时，最小化状态由 initialMinimized 决定。
 * 一旦用户手动切换过，则以持久化的值为准；这样既能让全局 Dock 默认收起为悬浮球，
 * 也不会污染工作区详情页内嵌对话面板（默认展开）的体验。
 *
 * @param {string} [storageKey='zhijing-chat-layout'] - localStorage 键名
 * @param {object} [options] - 可选配置
 * @param {boolean} [options.initialMinimized=false] - 首次访问时是否默认最小化
 * @param {'sidebar'|'floating'} [options.initialMode='sidebar'] - 首次访问时的初始模式
 * @returns {object} 布局状态与操作函数
 */
export function useChatLayout(storageKey = DEFAULT_STORAGE_KEY, options = {}) {
  const initialMinimized = options.initialMinimized ?? false;
  const initialMode = options.initialMode === 'floating' ? 'floating' : 'sidebar';
  const [layout, setLayout] = useState(() => {
    const loaded = loadLayout(storageKey);
    const hasPersisted = typeof window !== 'undefined' && window.localStorage.getItem(storageKey);
    if (hasPersisted) {
      return loaded;
    }
    return {
      ...loaded,
      mode: initialMode,
      minimized: initialMinimized,
      position: initialMinimized ? loaded.markerPosition : loaded.panelPosition,
      panelPosition: initialMode === 'floating' ? getDefaultFloatingPosition() : loaded.panelPosition,
    };
  });

  useEffect(() => {
    saveLayout(storageKey, layout);
  }, [storageKey, layout]);

  const setMode = useCallback((mode) => {
    setLayout((prev) => ({ ...prev, mode }));
  }, []);

  const toggleMode = useCallback(() => {
    setLayout((prev) => {
      const nextMode = prev.mode === 'sidebar' ? 'floating' : 'sidebar';
      const panelPosition = nextMode === 'floating'
        ? clampFloatingPosition(prev.panelPosition ?? getDefaultFloatingPosition(), prev.size)
        : prev.panelPosition;
      return {
        ...prev,
        mode: nextMode,
        panelPosition,
        position: prev.minimized ? prev.markerPosition : panelPosition,
      };
    });
  }, []);

  const setMinimized = useCallback((minimized) => {
    setLayout((prev) => ({
      ...prev,
      minimized,
      mode: minimized ? prev.mode : 'floating',
      position: minimized ? prev.markerPosition : prev.panelPosition,
    }));
  }, []);

  const toggleMinimized = useCallback(() => {
    setLayout((prev) => {
      const minimized = !prev.minimized;
      return {
        ...prev,
        minimized,
        mode: minimized ? prev.mode : 'floating',
        position: minimized ? prev.markerPosition : prev.panelPosition,
      };
    });
  }, []);

  const setPosition = useCallback((position, sizeHint) => {
    const isMarker = layout.minimized || layout.mode !== 'floating';
    const size = sizeHint ?? (isMarker ? { width: MARKER_SIZE_PX, height: MARKER_SIZE_PX } : layout.size);
    const clamped = isMarker
      ? clampMarkerPosition(position)
      : clampFloatingPosition(position, size);
    setLayout((prev) => ({
      ...prev,
      position: clamped,
      markerPosition: isMarker ? clamped : prev.markerPosition,
      panelPosition: isMarker ? prev.panelPosition : clamped,
    }));
  }, [layout.minimized, layout.mode, layout.size]);

  const setSize = useCallback((size) => {
    setLayout((prev) => {
      const nextSize = prev.mode === 'floating'
        ? clampFloatingSize(size, prev.panelPosition)
        : size;
      const nextPanelPosition = prev.mode === 'floating'
        ? clampFloatingPosition(prev.panelPosition, nextSize)
        : prev.panelPosition;
      return {
        ...prev,
        size: nextSize,
        panelPosition: nextPanelPosition,
        position: prev.minimized ? prev.markerPosition : nextPanelPosition,
      };
    });
  }, []);

  const setBounds = useCallback((position, size) => {
    setLayout((prev) => {
      if (prev.mode !== 'floating') {
        const markerPosition = clampMarkerPosition(position);
        return {
          ...prev,
          position: markerPosition,
          markerPosition,
          size,
        };
      }
      const anchorPosition = clampFloatingPosition(position, {
        width: MIN_FLOATING_WIDTH_PX,
        height: MIN_FLOATING_HEIGHT_PX,
      });
      const nextSize = clampFloatingSize(size, anchorPosition);
      const nextPanelPosition = clampFloatingPosition(anchorPosition, nextSize);
      return {
        ...prev,
        position: nextPanelPosition,
        panelPosition: nextPanelPosition,
        size: nextSize,
      };
    });
  }, []);

  const resetFloatingLayout = useCallback(() => {
    setLayout((prev) => {
      const panelPosition = clampFloatingPosition(getDefaultFloatingPosition(), DEFAULT_LAYOUT.size);
      return {
        ...prev,
        mode: 'floating',
        minimized: false,
        panelPosition,
        position: panelPosition,
        size: DEFAULT_LAYOUT.size,
      };
    });
  }, []);

  const effectivePosition = layout.minimized ? layout.markerPosition : layout.panelPosition;

  return {
    ...layout,
    position: effectivePosition,
    setMode,
    toggleMode,
    setMinimized,
    toggleMinimized,
    setPosition,
    setSize,
    setBounds,
    resetFloatingLayout,
  };
}
