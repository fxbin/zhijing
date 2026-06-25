/**
 * 全局快捷键监听 Hook。
 *
 * 监听单个按键组合（如 Cmd+K / Ctrl+K），按 callback 触发对应动作。
 * 自动处理 Cmd（macOS）与 Ctrl（Windows/Linux）等价语义，并在组件
 * 卸载时清理监听器，避免泄漏。
 *
 * @module hooks/useHotkey
 */

import { useEffect } from 'react';

/**
 * 判断当前键盘事件是否匹配指定的修饰键 + 主键组合。
 *
 * @param {KeyboardEvent} event - 原生键盘事件
 * @param {object} combo - 快捷键组合描述
 * @param {string} combo.key - 主键（小写字母），如 'k'、'j'
 * @param {boolean} [combo.modifier=false] - 是否需要 Cmd/Ctrl 修饰键
 * @returns {boolean} 是否匹配
 */
function matchCombo(event, combo) {
  const keyMatched = event.key.toLowerCase() === combo.key;
  if (!keyMatched) {
    return false;
  }
  if (combo.modifier) {
    return event.metaKey || event.ctrlKey;
  }
  return !event.metaKey && !event.ctrlKey && !event.altKey;
}

/**
 * 注册一个全局快捷键监听。
 *
 * @param {string} key - 主键（如 'k'）
 * @param {object} [options] - 配置项
 * @param {boolean} [options.modifier=true] - 是否需要 Cmd/Ctrl 修饰键
 * @param {boolean} [options.preventDefault=true] - 匹配成功时是否阻止默认行为
 * @param {boolean} [options.enabled=true] - 是否启用监听（可用于条件性禁用）
 * @param {() => void} callback - 触发回调
 */
export function useHotkey(key, callback, options = {}) {
  const { modifier = true, preventDefault = true, enabled = true } = options;

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    const combo = { key: key.toLowerCase(), modifier };

    function handleKeyDown(event) {
      if (matchCombo(event, combo)) {
        if (preventDefault) {
          event.preventDefault();
        }
        callback(event);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [key, modifier, preventDefault, enabled, callback]);
}
