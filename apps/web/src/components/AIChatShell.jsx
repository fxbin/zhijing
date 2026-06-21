/**
 * AI 对话外壳组件。
 * 提供可切换的右侧边栏/自由悬浮两种布局、最小化到标记、拖拽定位的能力。
 * @module components/AIChatShell
 */

import { useEffect, useRef, useState } from 'react';
import { Minimize2, Move, PanelRight, Sparkles } from 'lucide-react';

/**
 * AI 对话外壳。
 * @param {object} props - 组件属性
 * @param {string} [props.title] - 面板标题
 * @param {import('react').ReactNode} [props.markerIcon] - 最小化标记图标
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

  const headerRef = useRef(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isDragging) {
      return undefined;
    }

    /**
     * 处理鼠标移动，更新悬浮面板位置。
     * @param {MouseEvent} event - 鼠标事件
     */
    function handleMouseMove(event) {
      setPosition({
        x: event.clientX - dragOffsetRef.current.x,
        y: event.clientY - dragOffsetRef.current.y,
      });
    }

    /**
     * 处理鼠标松开，结束拖拽。
     */
    function handleMouseUp() {
      setIsDragging(false);
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, setPosition]);

  /**
   * 处理头部按下，启动拖拽。
   * @param {import('react').MouseEvent} event - 鼠标事件
   */
  function handleHeaderMouseDown(event) {
    if (mode !== 'floating') {
      return;
    }
    if (event.target.closest('button')) {
      return;
    }
    setIsDragging(true);
    dragOffsetRef.current = {
      x: event.clientX - position.x,
      y: event.clientY - position.y,
    };
  }

  const defaultMarker = markerIcon ?? <Sparkles size={20} />;

  if (minimized) {
    if (mode === 'sidebar') {
      return (
        <button
          className={`ai-chat-shell-marker ai-chat-shell-sidebar-marker ${className}`}
          onClick={toggleMinimized}
          title={title}
          type="button"
        >
          {defaultMarker}
        </button>
      );
    }

    return (
      <button
        className={`ai-chat-shell-marker ai-chat-shell-floating-marker ${className}`}
        onClick={toggleMinimized}
        style={{ left: position.x, top: position.y }}
        title={title}
        type="button"
      >
        {defaultMarker}
      </button>
    );
  }

  const isFloating = mode === 'floating';
  const modeIcon = isFloating ? <PanelRight size={16} /> : <Move size={16} />;
  const modeLabel = isFloating ? '切换为右侧边栏' : '切换为自由悬浮';
  const shellStyle = isFloating
    ? { left: position.x, top: position.y, width: size.width, height: size.height }
    : undefined;

  return (
    <section
      className={`ai-chat-shell ai-chat-shell-${mode} ${isDragging ? 'ai-chat-shell-dragging' : ''} ${className}`}
      style={shellStyle}
    >
      <header
        ref={headerRef}
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
            title="最小化"
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
