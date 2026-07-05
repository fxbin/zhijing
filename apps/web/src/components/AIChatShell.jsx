/**
 * AI 对话外壳组件。
 * 提供可切换的右侧边栏/自由悬浮两种布局、最小化到悬浮球、拖拽定位的能力。
 * @module components/AIChatShell
 */

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Minimize2, Move, PanelRight, RotateCcw, Sparkles } from 'lucide-react';
import { MIN_FLOATING_HEIGHT_PX, MIN_FLOATING_WIDTH_PX } from '../hooks/useChatLayout';

const DRAG_CLICK_THRESHOLD_PX = 4;
const RESIZE_DIRECTIONS = ['n', 'e', 's', 'w', 'ne', 'nw', 'se', 'sw'];

/**
 * AI 对话外壳。
 * @param {object} props - 组件属性
 * @param {string} [props.title] - 面板标题
 * @param {import('react').ReactNode} [props.markerIcon] - 最小化悬浮球图标
 * @param {import('react').ReactNode} props.children - 对话内容
 * @param {string} [props.className=''] - 额外 CSS 类
 * @param {object} props.layout - useChatLayout 返回的布局状态与操作
 * @returns {JSX.Element}
 */
export default function AIChatShell({
  title,
  markerIcon,
  children,
  className = '',
  layout,
}) {
  const {
    mode,
    minimized,
    position,
    size,
    toggleMode,
    toggleMinimized,
    setPosition,
    setBounds,
    resetFloatingLayout,
  } = layout;
  const { t } = useTranslation();

  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const resizeRef = useRef({
    active: false,
    direction: '',
    startX: 0,
    startY: 0,
    startPosition: { x: 0, y: 0 },
    startSize: { width: 0, height: 0 },
  });
  const dragRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    moved: false,
    isMarker: false,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    if (!isDragging) {
      return undefined;
    }

    /**
     * 处理鼠标移动，更新面板或悬浮球位置。
     * @param {MouseEvent} event - 鼠标事件
     */
    function handleMouseMove(event) {
      const current = dragRef.current;
      if (!current.active) {
        return;
      }
      const dx = event.clientX - current.startX;
      const dy = event.clientY - current.startY;
      if (Math.abs(dx) > DRAG_CLICK_THRESHOLD_PX || Math.abs(dy) > DRAG_CLICK_THRESHOLD_PX) {
        current.moved = true;
      }
      setPosition({
        x: event.clientX - dragOffsetRef.current.x,
        y: event.clientY - dragOffsetRef.current.y,
      }, size);
    }

    /**
     * 处理鼠标松开，结束拖拽并判断是否为点击。
     */
    function handleMouseUp() {
      const current = dragRef.current;
      const wasMarker = current.isMarker;
      const didMove = current.moved;
      dragRef.current = {
        active: false,
        startX: 0,
        startY: 0,
        moved: false,
        isMarker: false,
      };
      setIsDragging(false);
      if (wasMarker && !didMove) {
        toggleMinimized();
      }
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, setPosition, size, toggleMinimized]);

  useEffect(() => {
    if (!isResizing) {
      return undefined;
    }

    /**
     * 处理浮动窗口尺寸拖拉。
     * @param {MouseEvent} event - 鼠标事件
     */
    function handleMouseMove(event) {
      const current = resizeRef.current;
      if (!current.active) {
        return;
      }
      const dx = event.clientX - current.startX;
      const dy = event.clientY - current.startY;
      let nextX = current.startPosition.x;
      let nextY = current.startPosition.y;
      let nextWidth = current.startSize.width;
      let nextHeight = current.startSize.height;

      if (current.direction.includes('e')) {
        nextWidth = current.startSize.width + dx;
      }
      if (current.direction.includes('s')) {
        nextHeight = current.startSize.height + dy;
      }
      if (current.direction.includes('w')) {
        nextX = current.startPosition.x + dx;
        nextWidth = current.startSize.width - dx;
        if (nextWidth < MIN_FLOATING_WIDTH_PX) {
          nextX = current.startPosition.x + current.startSize.width - MIN_FLOATING_WIDTH_PX;
          nextWidth = MIN_FLOATING_WIDTH_PX;
        }
      }
      if (current.direction.includes('n')) {
        nextY = current.startPosition.y + dy;
        nextHeight = current.startSize.height - dy;
        if (nextHeight < MIN_FLOATING_HEIGHT_PX) {
          nextY = current.startPosition.y + current.startSize.height - MIN_FLOATING_HEIGHT_PX;
          nextHeight = MIN_FLOATING_HEIGHT_PX;
        }
      }

      setBounds({ x: nextX, y: nextY }, { width: nextWidth, height: nextHeight });
    }

    /**
     * 结束尺寸拖拉。
     */
    function handleMouseUp() {
      resizeRef.current = {
        active: false,
        direction: '',
        startX: 0,
        startY: 0,
        startPosition: { x: 0, y: 0 },
        startSize: { width: 0, height: 0 },
      };
      setIsResizing(false);
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, setBounds]);

  /**
   * 监听浮动模式下的尺寸变化，实时将面板限制在可视区域内。
   * 防止用户 resize 拉大后底部被裁切。
   */
  useEffect(() => {
    if (mode !== 'floating' || minimized) {
      return undefined;
    }
    const section = document.querySelector('.ai-chat-shell-floating');
    if (!section) {
      return undefined;
    }
    const ro = new ResizeObserver(() => {
      const rect = section.getBoundingClientRect();
      if (rect.bottom > window.innerHeight || rect.right > window.innerWidth) {
        setPosition(position, { width: rect.width, height: rect.height });
      }
    });
    ro.observe(section);
    return () => ro.disconnect();
  }, [mode, minimized, setPosition, position]);

  /**
   * 开始拖拽面板头部或悬浮球。
   * @param {import('react').MouseEvent} event - 鼠标事件
   * @param {boolean} isMarker - 是否拖拽悬浮球
   */
  function startDrag(event, isMarker) {
    dragRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      isMarker,
    };
    dragOffsetRef.current = {
      x: event.clientX - position.x,
      y: event.clientY - position.y,
    };
    setIsDragging(true);
  }

  /**
   * 处理头部按下，启动面板拖拽。
   * @param {import('react').MouseEvent} event - 鼠标事件
   */
  function handleHeaderMouseDown(event) {
    if (mode !== 'floating') {
      return;
    }
    if (event.target.closest('button')) {
      return;
    }
    startDrag(event, false);
  }

  /**
   * 双击浮动窗口标题栏恢复默认位置与尺寸。
   * @param {import('react').MouseEvent} event - 鼠标事件
   */
  function handleHeaderDoubleClick(event) {
    if (mode !== 'floating' || event.target.closest('button')) {
      return;
    }
    resetFloatingLayout();
  }

  /**
   * 处理悬浮球按下，启动拖拽。
   * @param {import('react').MouseEvent} event - 鼠标事件
   */
  function handleMarkerMouseDown(event) {
    event.preventDefault();
    startDrag(event, true);
  }

  /**
   * 开始拖拉浮动窗口尺寸。
   * @param {import('react').MouseEvent} event - 鼠标事件
   * @param {string} direction - 调整方向
   */
  function startResize(event, direction) {
    if (mode !== 'floating') {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    resizeRef.current = {
      active: true,
      direction,
      startX: event.clientX,
      startY: event.clientY,
      startPosition: position,
      startSize: size,
    };
    setIsResizing(true);
  }

  const defaultMarker = markerIcon ?? <Sparkles size={20} />;

  if (minimized) {
    return (
      <div
        className={`ai-chat-shell-marker ai-chat-shell-floating-marker ${isDragging ? 'ai-chat-shell-dragging' : ''} ${className}`}
        onMouseDown={handleMarkerMouseDown}
        role="button"
        style={{ left: position.x, top: position.y }}
        tabIndex={0}
        title={title}
      >
        {defaultMarker}
      </div>
    );
  }

  const isFloating = mode === 'floating';
  const modeIcon = isFloating ? <PanelRight size={16} /> : <Move size={16} />;
  const modeLabel = isFloating ? t('chat.switchToSidebar') : t('chat.switchToFloating');
  const shellStyle = isFloating
    ? { left: position.x, top: position.y, width: size.width, height: size.height }
    : undefined;

  return (
    <section
      className={`ai-chat-shell ai-chat-shell-${mode} ${isDragging ? 'ai-chat-shell-dragging' : ''} ${isResizing ? 'ai-chat-shell-resizing' : ''} ${className}`}
      style={shellStyle}
    >
      {isFloating && RESIZE_DIRECTIONS.map((direction) => (
        <span
          key={direction}
          className={`ai-chat-shell-resize-handle ai-chat-shell-resize-${direction}`}
          aria-hidden="true"
          onMouseDown={(event) => startResize(event, direction)}
        />
      ))}
      <header
        className="ai-chat-shell-header"
        onMouseDown={handleHeaderMouseDown}
        onDoubleClick={handleHeaderDoubleClick}
      >
        <div className="ai-chat-shell-title">
          <Sparkles size={18} />
          <span>{title}</span>
        </div>
        <div className="ai-chat-shell-controls">
          {isFloating && (
            <button
              className="ai-chat-shell-reset"
              onClick={resetFloatingLayout}
              title={t('common.resetView')}
              type="button"
            >
              <RotateCcw size={16} />
            </button>
          )}
          <button
            className="ai-chat-shell-mode"
            onClick={toggleMode}
            title={modeLabel}
            type="button"
          >
            {modeIcon}
          </button>
          <button
            className="ai-chat-shell-minimize"
            onClick={toggleMinimized}
            title={t('common.minimize')}
            type="button"
          >
            <Minimize2 size={16} />
          </button>
        </div>
      </header>
      <div className="ai-chat-shell-body">
        {children}
      </div>
    </section>
  );
}
