/**
 * @module views/maps/MapBatchPanel
 * 知识地图批量选择面板：展示已选节点列表与批量操作入口。
 * @author fxbin
 */

import { X } from 'lucide-react';

/**
 * 知识地图批量选择面板组件。
 * @param {Object} props - 组件属性
 * @param {Set<string>} props.selectedNodeIds - 已选节点 ID 集合
 * @param {Array} props.layoutNodes - 布局节点列表
 * @param {Function} props.onRemoveNode - 移除单个已选节点回调
 * @param {Function} props.onClear - 清空全部已选节点回调
 * @param {Function} props.onConnectToTarget - 进入"连接到目标"模式回调
 * @param {Function} props.t - i18n 翻译函数
 * @returns {JSX.Element} 批量选择面板
 */
export default function MapBatchPanel({ selectedNodeIds, layoutNodes, onRemoveNode, onClear, onConnectToTarget, t }) {
  return (
    <div className="map-batch-panel">
      <div className="map-batch-panel-head">
        <div className="map-batch-panel-title">
          <h3>{t('maps.batchSelection')}</h3>
          <span className="map-batch-panel-count">
            {t('maps.nodesSelected', { count: selectedNodeIds.size })}
          </span>
        </div>
        <button
          type="button"
          className="map-detail-close"
          onClick={onClear}
          aria-label={t('common.close')}
        >
          ×
        </button>
      </div>
      <div className="map-batch-panel-body">
        <h4 className="map-batch-section-title">{t('maps.selectedItems')}</h4>
        <ul className="map-batch-items">
          {layoutNodes
            .filter((node) => selectedNodeIds.has(node.id))
            .map((node) => (
              <li key={node.id} className="map-batch-item">
                <span className={`map-batch-item-kind ${node.kind}`} />
                <span className="map-batch-item-label">{node.label}</span>
                <button
                  type="button"
                  className="map-batch-item-remove"
                  onClick={() => onRemoveNode(node.id)}
                  aria-label={t('common.remove')}
                >
                  <X size={14} />
                </button>
              </li>
            ))}
        </ul>
        <h4 className="map-batch-section-title">{t('maps.batchActions')}</h4>
        <div className="map-batch-panel-actions">
          <button
            type="button"
            className="map-batch-action-btn primary"
            onClick={onConnectToTarget}
          >
            <span>{t('maps.connectToTarget')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
