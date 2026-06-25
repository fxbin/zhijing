/**
 * 模态框无障碍 hook：统一处理 Escape 关闭、focus trap 与焦点恢复。
 * @module hooks/useModalA11y
 * @author fxbin
 */

import { useEffect, useRef } from 'react';

/**
 * 可聚焦元素选择器，用于 focus trap 计算 Tab 循环边界。
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * 为模态框容器提供 Escape 关闭、Tab 焦点循环与焦点恢复能力。
 * @param {import('react').RefObject<HTMLElement>} ref - 模态框容器 ref
 * @param {boolean} active - 是否激活（模态框是否处于打开状态）
 * @param {function} onClose - 关闭回调，Escape 触发时调用
 * @author fxbin
 */
export default function useModalA11y(ref, active, onClose) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!active) return;
    const container = ref.current;
    if (!container) return undefined;

    const previouslyFocused = document.activeElement;
    const hadTabindex = container.hasAttribute('tabindex');
    if (!hadTabindex) {
      container.setAttribute('tabindex', '-1');
    }
    const focusable = container.querySelector(FOCUSABLE_SELECTOR);
    if (focusable) {
      focusable.focus();
    } else {
      container.focus();
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key === 'Tab') {
        const elements = container.querySelectorAll(FOCUSABLE_SELECTOR);
        if (elements.length === 0) return;
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      if (!hadTabindex) {
        container.removeAttribute('tabindex');
      }
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
  }, [ref, active]);
}
