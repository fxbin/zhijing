/**
 * 顶层错误边界组件，捕获子树渲染异常，避免整页白屏。
 *
 * React 类组件实现，覆盖两个生命周期：
 * - getDerivedStateFromError：渲染阶段切换 hasError，返回降级 UI
 * - componentDidCatch：提交阶段记录错误信息到控制台，便于排查
 *
 * 降级 UI 提供错误摘要与「重试」按钮（重置 hasError，重新渲染子树）。
 * 仅捕获渲染期异常；事件回调、异步错误、setInterval 抛错不在此边界内，
 * 需由调用方自行 try/catch。
 *
 * @module components/ErrorBoundary
 * @author fxbin
 */

import { Component } from 'react';

/**
 * 降级 UI 标题。
 */
const ERROR_TITLE = '页面渲染出错';

/**
 * 降级 UI 描述。
 */
const ERROR_DESCRIPTION = '当前视图遇到未预期的错误，可尝试重新加载该区域。';

/**
 * 重试按钮文案。
 */
const RETRY_LABEL = '重试';

/**
 * 错误边界状态。
 */
/**
 * @typedef {Object} ErrorBoundaryState
 * @property {boolean} hasError - 是否捕获到错误
 * @property {Error|null} error - 错误对象
 */

class ErrorBoundary extends Component {
  /**
   * @param {Object} props - 组件 props
   */
  constructor(props) {
    super(props);
    /** @type {ErrorBoundaryState} */
    this.state = { hasError: false, error: null };
  }

  /**
   * 渲染阶段捕获错误，切换为降级状态。
   * @param {Error} error - 捕获到的错误
   * @returns {ErrorBoundaryState} 下一次 state
   */
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  /**
   * 提交阶段记录错误信息，便于排查。
   * @param {Error} error - 捕获到的错误
   * @param {{ componentStack: string }} info - React 组件栈
   */
  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] 捕获到渲染异常：', error, info);
  }

  /**
   * 重置错误状态，触发子树重新渲染。
   */
  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }
    const message = this.state.error?.message || ERROR_DESCRIPTION;
    return (
      <div className="error-boundary" role="alert">
        <div className="error-boundary__icon" aria-hidden="true">⚠</div>
        <h2 className="error-boundary__title">{ERROR_TITLE}</h2>
        <p className="error-boundary__message">{message}</p>
        <button type="button" className="error-boundary__retry" onClick={this.handleReset}>
          {RETRY_LABEL}
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
