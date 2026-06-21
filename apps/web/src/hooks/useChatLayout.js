/**
 * AI 对话框布局状态管理 Hook。
 * 统一管理对话面板的模式、最小化、位置、尺寸，并持久化到 localStorage。
 * @module hooks/useChatLayout
 */

import { useCallback, useEffect, useState } from 'react';

const DEFAULT_STORAGE_KEY = 'zhijing-chat-layout';

const DEFAULT_LAYOUT = {
  mode: 'sidebar',
  minimized: false,
  position: { x: 24, y: 96 },
  size: { width: 380, height: 640 },
};

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
      return DEFAULT_LAYOUT;
    }
    const parsed = JSON.parse(raw);
    return {
      mode: parsed.mode === 'floating' ? 'floating' : 'sidebar',
      minimized: Boolean(parsed.minimized),
      position: {
        x: Number.isFinite(parsed.position?.x) ? parsed.position.x : DEFAULT_LAYOUT.position.x,
        y: Number.isFinite(parsed.position?.y) ? parsed.position.y : DEFAULT_LAYOUT.position.y,
      },
      size: {
        width: Number.isFinite(parsed.size?.width) ? parsed.size.width : DEFAULT_LAYOUT.size.width,
        height: Number.isFinite(parsed.size?.height) ? parsed.size.height : DEFAULT_LAYOUT.size.height,
      },
    };
  } catch {
    return DEFAULT_LAYOUT;
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
 * @param {string} [storageKey='zhijing-chat-layout'] - localStorage 键名
 * @returns {object} 布局状态与操作函数
 */
export function useChatLayout(storageKey = DEFAULT_STORAGE_KEY) {
  const [layout, setLayout] = useState(() => loadLayout(storageKey));

  useEffect(() => {
    saveLayout(storageKey, layout);
  }, [storageKey, layout]);

  const setMode = useCallback((mode) => {
    setLayout((prev) => ({ ...prev, mode }));
  }, []);

  const toggleMode = useCallback(() => {
    setLayout((prev) => ({
      ...prev,
      mode: prev.mode === 'sidebar' ? 'floating' : 'sidebar',
    }));
  }, []);

  const setMinimized = useCallback((minimized) => {
    setLayout((prev) => ({ ...prev, minimized }));
  }, []);

  const toggleMinimized = useCallback(() => {
    setLayout((prev) => ({ ...prev, minimized: !prev.minimized }));
  }, []);

  const setPosition = useCallback((position) => {
    setLayout((prev) => ({ ...prev, position }));
  }, []);

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
