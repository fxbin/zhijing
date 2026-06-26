/**
 * AI 对话框布局状态管理 Hook。
 * 统一管理对话面板的模式、最小化、位置、尺寸，并持久化到 localStorage。
 * @module hooks/useChatLayout
 */

import { useCallback, useEffect, useState } from 'react';

const DEFAULT_STORAGE_KEY = 'zhijing-chat-layout';
const MARKER_SIZE_PX = 52;
const VIEWPORT_MARGIN_PX = 24;
const SIDEBAR_WIDTH_PX = 240;

const DEFAULT_LAYOUT = {
  mode: 'sidebar',
  minimized: false,
  position: { x: VIEWPORT_MARGIN_PX, y: 96 },
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
    x: Math.max(SIDEBAR_WIDTH_PX, window.innerWidth - MARKER_SIZE_PX - VIEWPORT_MARGIN_PX),
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
    x: Math.max(SIDEBAR_WIDTH_PX, window.innerWidth - DEFAULT_LAYOUT.size.width - VIEWPORT_MARGIN_PX),
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
    x: Math.max(SIDEBAR_WIDTH_PX, Math.min(maxX, position.x)),
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
    x: Math.max(SIDEBAR_WIDTH_PX, Math.min(maxX, position.x)),
    y: Math.max(VIEWPORT_MARGIN_PX, Math.min(maxY, position.y)),
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
      return {
        ...DEFAULT_LAYOUT,
        position: getDefaultMarkerPosition(),
      };
    }
    const parsed = JSON.parse(raw);
    return {
      mode: parsed.mode === 'floating' ? 'floating' : 'sidebar',
      minimized: Boolean(parsed.minimized),
      position: clampMarkerPosition({
        x: Number.isFinite(parsed.position?.x) ? parsed.position.x : getDefaultMarkerPosition().x,
        y: Number.isFinite(parsed.position?.y) ? parsed.position.y : getDefaultMarkerPosition().y,
      }),
      size: {
        width: Number.isFinite(parsed.size?.width) ? parsed.size.width : DEFAULT_LAYOUT.size.width,
        height: Number.isFinite(parsed.size?.height) ? parsed.size.height : DEFAULT_LAYOUT.size.height,
      },
    };
  } catch {
    return {
      ...DEFAULT_LAYOUT,
      position: getDefaultMarkerPosition(),
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
      position: initialMode === 'floating' ? getDefaultFloatingPosition() : loaded.position,
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
      const nextPosition = nextMode === 'floating'
        ? clampFloatingPosition(getDefaultFloatingPosition(), prev.size)
        : prev.position;
      return { ...prev, mode: nextMode, position: nextPosition };
    });
  }, []);

  const setMinimized = useCallback((minimized) => {
    setLayout((prev) => ({ ...prev, minimized }));
  }, []);

  const toggleMinimized = useCallback(() => {
    setLayout((prev) => ({ ...prev, minimized: !prev.minimized }));
  }, []);

  const setPosition = useCallback((position, sizeHint) => {
    const size = sizeHint ?? (layout.mode === 'floating' ? layout.size : { width: MARKER_SIZE_PX, height: MARKER_SIZE_PX });
    const clamped = layout.mode === 'floating'
      ? clampFloatingPosition(position, size)
      : clampMarkerPosition(position);
    setLayout((prev) => ({ ...prev, position: clamped }));
  }, [layout.mode, layout.size]);

  const setSize = useCallback((size) => {
    setLayout((prev) => ({ ...prev, size }));
  }, []);

  return {
    ...layout,
    setMode,
    toggleMode,
    setMinimized,
    toggleMinimized,
    setPosition,
    setSize,
  };
}
