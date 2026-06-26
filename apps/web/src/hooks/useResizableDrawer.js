/**
 * 可缩放抽屉 Hook：管理抽屉宽度状态与左侧拖拽手柄交互。
 *
 * 默认宽度 520px，最小 520px（不允许缩到比默认更窄），最大 92vw。
 * 拖拽手柄位于抽屉左边缘，按下后水平移动鼠标即可调整宽度。
 *
 * @module hooks/useResizableDrawer
 * @author fxbin
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 抽屉默认宽度（像素）。
 */
const DEFAULT_DRAWER_WIDTH = 520;

/**
 * 抽屉最小宽度（像素），等于默认宽度，不允许缩窄。
 */
const MIN_DRAWER_WIDTH = 520;

/**
 * 抽屉最大宽度占视口宽度的比例。
 */
const MAX_DRAWER_WIDTH_RATIO = 0.92;

/**
 * 可缩放抽屉 Hook。
 *
 * @returns {object} 抽屉宽度相关状态与拖拽处理函数
 *   - {number} width - 当前抽屉宽度
 *   - {object} resizeHandleProps - 绑定到拖拽手柄的 props（onMouseDown/onTouchStart）
 *   - {boolean} isResizing - 是否正在拖拽
 * @author fxbin
 */
export function useResizableDrawer() {
  const [width, setWidth] = useState(DEFAULT_DRAWER_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(DEFAULT_DRAWER_WIDTH);

  const maxWidth = useCallback(() => Math.floor(window.innerWidth * MAX_DRAWER_WIDTH_RATIO), []);

  const handleMove = useCallback((clientX) => {
    const delta = startXRef.current - clientX;
    const next = startWidthRef.current + delta;
    const min = MIN_DRAWER_WIDTH;
    const max = maxWidth();
    setWidth(Math.min(Math.max(next, min), max));
  }, [maxWidth]);

  useEffect(() => {
    if (!isResizing) return undefined;

    const onMouseMove = (event) => handleMove(event.clientX);
    const onTouchMove = (event) => {
      if (event.touches.length > 0) {
        handleMove(event.touches[0].clientX);
      }
    };
    const stop = () => setIsResizing(false);

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', stop);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', stop);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', stop);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', stop);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMove]);

  const startResize = useCallback((clientX) => {
    startXRef.current = clientX;
    startWidthRef.current = width;
    setIsResizing(true);
  }, [width]);

  const resizeHandleProps = {
    onMouseDown: (event) => {
      event.preventDefault();
      startResize(event.clientX);
    },
    onTouchStart: (event) => {
      if (event.touches.length > 0) {
        startResize(event.touches[0].clientX);
      }
    },
  };

  return { width, resizeHandleProps, isResizing };
}
