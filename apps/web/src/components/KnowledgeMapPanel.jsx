/**
 * 知识地图预览面板组件：工作区右侧的地图缩略入口。
 * @module components/KnowledgeMapPanel
 */

import { Network, SquareArrowOutUpRight } from 'lucide-react';

/**
 * 知识地图预览面板，点击可跳转到完整地图视图。
 * @param {object} props - 组件属性
 * @param {function} props.setView - 视图切换函数
 * @returns {JSX.Element} 地图预览面板
 */
export default function KnowledgeMapPanel({ setView }) {
  return (
    <aside className="map-panel">
      <div className="map-head">
        <div><Network size={22} /><h3>Knowledge Map</h3></div>
        <button aria-label="打开知识地图" onClick={() => setView('maps')} type="button"><SquareArrowOutUpRight size={20} /></button>
      </div>
      <div className="map-card" aria-label="知识地图预览">
        <span className="node core">✣</span>
        <span className="node node-a">Design Systems</span>
        <span className="node node-b">Cognitive Load</span>
        <span className="node node-c">Typography</span>
        <span className="node node-d">Mental Models</span>
      </div>
      <div className="map-footer">
        <div><span>Active Nodes</span><strong>1,204</strong></div>
        <button onClick={() => setView('maps')} type="button">Explore →</button>
      </div>
    </aside>
  );
}
