/**
 * AI 对话外壳组件。
 * 提供可切换的右侧边栏/自由悬浮两种布局、最小化到悬浮球、拖拽定位的能力。
 * @module components/AIChatShell
 */

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Minimize2, Move, PanelRight, Sparkles } from 'lucide-react';

const DRAG_CLICK_THRESHOLD_PX = 4;

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
  } = layout;
  const { t } = useTranslation();

  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    moved: false,
    isMarker: false,
  });
  const [isDragging, setIsDragging] = useState(false);

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
      });
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
  }, [isDragging, setPosition, toggleMinimized]);

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
   * 处理悬浮球按下，启动拖拽。
   * @param {import('react').MouseEvent} event - 鼠标事件
   */
  function handleMarkerMouseDown(event) {
    event.preventDefault();
    startDrag(event, true);
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
      className={`ai-chat-shell ai-chat-shell-${mode} ${isDragging ? 'ai-chat-shell-dragging' : ''} ${className}`}
      style={shellStyle}
    >
      <header
        className="ai-chat-shell-header"
        onMouseDown={handleHeaderMouseDown}
      >
        <div className="ai-chat-shell-title">
          <Sparkles size={18} />
          <span>{title}</span>
        </div>
        <div className="ai-chat-shell-controls">
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
