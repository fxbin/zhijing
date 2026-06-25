/**
 * 系统通知组件：API 离线时显示提示。
 * @module components/SystemNotice
 */

import { CircleX } from 'lucide-react';

/**
 * API 离线时的系统通知横幅。
 * @returns {JSX.Element} 通知区块
 */
export default function SystemNotice() {
  return (
    <section className="system-notice">
      <CircleX size={21} />
      <div>
        <strong>API 未连接</strong>
        <p>当前页面保留本地演示内容；启动 API 后会自动读取真实工作区、任务和资料。</p>
      </div>
    </section>
  );
}
