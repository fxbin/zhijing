/**
 * @module views/maps/MapNodeDetail
 * 知识地图节点详情抽屉：展示节点元信息、关系列表与关系类型选择器。
 * @author fxbin
 */

import { createPortal } from 'react-dom';
import { BookOpen, Link2, MessageCircle, PencilLine, X } from 'lucide-react';
import EmptyState from '../../components/EmptyState';
import { mapKindLabel } from '../../utils/map';

/**
 * 知识地图节点详情抽屉组件。
 * @param {Object} props - 组件属性
 * @param {Object} props.selectedNode - 当前选中节点
 * @param {Object} props.statusMeta - 状态元信息 { tone, label }
 * @param {Array} props.nodeMetadataItems - 节点元数据条目列表
 * @param {number} props.connectedNodeCount - 连接关系数
 * @param {Array} props.selectedRelations - 选中节点的全部关系
 * @param {Array} props.visibleRelations - 经筛选后可见的关系
 * @param {Array<string>} props.relationTypes - 关系类型列表（含 'all'）
 * @param {string} props.relationFilter - 当前关系筛选类型
 * @param {Function} props.setRelationFilter - 设置关系筛选类型
 * @param {boolean} props.hasVisibleSourceMaterial - 是否存在可见来源资料
 * @param {string|null} props.sourceMaterialId - 来源资料节点 ID
 * @param {Array} props.nodes - 全部节点列表
 * @param {Function} props.setNodeFilter - 设置节点筛选器
 * @param {Function} props.setSelectedNodeId - 设置选中节点 ID
 * @param {Function} props.setView - 切换视图回调
 * @param {Function} props.onOpenChat - 打开对话回调
 * @param {Function} props.startConnectTargetMode - 进入目标连接模式
 * @param {Function} props.deleteCustomEdge - 删除自定义边
 * @param {Array} props.layoutNodes - 布局节点列表
 * @param {Object|null} props.relationTypePicker - 关系类型选择器状态
 * @param {Function} props.setRelationTypePicker - 设置关系类型选择器
 * @param {Function} props.saveBatchRelations - 保存批量关系
 * @param {Object} props.relationTypeLabelMap - 关系类型标签映射
 * @param {Array} props.editableRelationOptions - 可编辑关系选项
 * @param {Function} props.setIsDetailOpen - 设置详情抽屉开合
 * @param {Function} props.t - i18n 翻译函数
 * @returns {JSX.Element} 节点详情抽屉
 */
export default function MapNodeDetail({
  selectedNode,
  statusMeta,
  nodeMetadataItems,
  connectedNodeCount,
  selectedRelations,
  visibleRelations,
  relationTypes,
  relationFilter,
  setRelationFilter,
  hasVisibleSourceMaterial,
  sourceMaterialId,
  nodes,
  setNodeFilter,
  setSelectedNodeId,
  setView,
  onOpenChat,
  startConnectTargetMode,
  deleteCustomEdge,
  layoutNodes,
  relationTypePicker,
  setRelationTypePicker,
  saveBatchRelations,
  relationTypeLabelMap,
  editableRelationOptions,
  setIsDetailOpen,
  t,
}) {
  return (
    <>
      <div className="map-node-detail-head">
        <div className="map-detail-head-row">
          <span>{mapKindLabel(selectedNode.kind)}</span>
          <button
            className="map-detail-close"
            onClick={() => setIsDetailOpen(false)}
            type="button"
            aria-label={t('common.close')}
          >
            ×
          </button>
        </div>
        <h3>{selectedNode.label}</h3>
        <p>{selectedNode.summary || t('maps.noSummary')}</p>
      </div>
      <div className="map-drawer-actions">
        <button onClick={() => setView(selectedNode.kind === 'material' ? 'library' : 'detail')} type="button">
          <BookOpen size={16} />
          {t('maps.openContext')}
        </button>
        <button
          type="button"
          onClick={() => startConnectTargetMode(selectedNode.id)}
        >
          <Link2 size={16} />
          {t('maps.addRelation')}
        </button>
        <button
          onClick={() => onOpenChat?.(t('maps.chatPrompt', {
            label: selectedNode.label,
            summary: selectedNode.summary || t('maps.noSummary'),
          }))}
          type="button"
        >
          <MessageCircle size={16} />
          {t('maps.continueConversation')}
        </button>
        <button onClick={() => setView(selectedNode.kind === 'card' ? 'recall' : 'detail')} type="button">
          <PencilLine size={16} />
          {selectedNode.kind === 'card' ? t('maps.reviewOrEdit') : t('maps.editContext')}
        </button>
      </div>
      {hasVisibleSourceMaterial && (
        <button
          className="map-source-jump"
          onClick={() => {
            setNodeFilter('all');
            setSelectedNodeId(sourceMaterialId);
            setIsDetailOpen(true);
          }}
          type="button"
        >
          <span>{t('maps.sourceEvidence')}</span>
          <strong>{t('maps.openSourceNode')}</strong>
        </button>
      )}
      <div className="map-node-confidence">
        <div>
          <span>{t('maps.statusLabel')}</span>
          <strong className={`map-status-badge ${statusMeta.tone}`}>{statusMeta.label}</strong>
        </div>
        <div>
          <span>{t('maps.connections')}</span>
          <strong>{connectedNodeCount}</strong>
        </div>
      </div>
      {nodeMetadataItems.length > 0 && (
        <div className="map-node-metadata">
          {nodeMetadataItems.map((item) => {
            if (item.kind === 'materialLink') {
              const targetNodeId = `material:${item.materialId}`;
              const exists = nodes.some((node) => node.id === targetNodeId);
              return (
                <div key={item.label} className={exists ? 'map-node-metadata-link' : ''}>
                  <span>{item.label}</span>
                  <strong
                    role={exists ? 'button' : undefined}
                    tabIndex={exists ? 0 : undefined}
                    onClick={exists ? () => {
                      setNodeFilter('all');
                      setSelectedNodeId(targetNodeId);
                    } : undefined}
                    onKeyDown={exists ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setNodeFilter('all');
                        setSelectedNodeId(targetNodeId);
                      }
                    } : undefined}
                  >
                    {item.value}
                  </strong>
                </div>
              );
            }
            return (
              <div key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            );
          })}
        </div>
      )}
      <section className="map-relation-panel">
        <div className="map-relation-head">
          <h4>{t('maps.relations')}</h4>
          <span className="map-relation-count">{visibleRelations.length}/{selectedRelations.length}</span>
        </div>
        {relationTypes.length > 2 && (
          <div className="map-relation-filters">
            {relationTypes.map((type) => (
              <button
                className={relationFilter === type ? 'active' : ''}
                key={type}
                onClick={() => setRelationFilter(type)}
                type="button"
              >
                {type === 'all' ? t('maps.all') : (relationTypeLabelMap[type] ?? type)}
              </button>
            ))}
          </div>
        )}
        <div className="relation-list">
          {visibleRelations.map((edge) => {
            const source = nodes.find((node) => node.id === edge.sourceId);
            const target = nodes.find((node) => node.id === edge.targetId);
            const other = edge.sourceId === selectedNode.id ? target : source;
            const isOutgoing = edge.sourceId === selectedNode.id;
            return (
              <article
                className={`relation-item${edge.custom ? ' custom' : ''}`}
                key={edge.id}
                onClick={() => other && setSelectedNodeId(other.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if ((event.key === 'Enter' || event.key === ' ') && other) setSelectedNodeId(other.id);
                }}
              >
                <span>{relationTypeLabelMap[edge.relation] ?? edge.relation}</span>
                <strong>{other?.label ?? edge.targetId}</strong>
                <p>{isOutgoing ? t('maps.outgoingRelation') : t('maps.incomingRelation')}</p>
                {edge.custom && (
                  <button
                    className="relation-delete-btn"
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteCustomEdge(edge.id);
                    }}
                    type="button"
                    aria-label={t('common.delete')}
                  >
                    <X size={14} />
                  </button>
                )}
              </article>
            );
          })}
          {selectedRelations.length === 0 && <EmptyState title={t('maps.noRelations')} body={t('maps.noRelationsHint')} />}
          {selectedRelations.length > 0 && visibleRelations.length === 0 && (
            <EmptyState title={t('maps.noMatchingRelations')} body={t('maps.noMatchingRelationsHint')} />
          )}
        </div>
      </section>
      {relationTypePicker && createPortal(
        <div className="map-relation-editor-overlay" onClick={() => setRelationTypePicker(null)} role="presentation">
          <div
            className="map-relation-editor"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={t('maps.pickRelationType')}
          >
            <h4>{t('maps.pickRelationType')}</h4>
            {(() => {
              const target = layoutNodes.find((node) => node.id === relationTypePicker.targetId);
              return target ? (
                <p className="map-relation-target">
                  {t('maps.targetNode')}: <strong>{target.label}</strong>
                </p>
              ) : null;
            })()}
            <div className="map-relation-type-grid">
              {editableRelationOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className="map-relation-type-btn"
                  onClick={() => saveBatchRelations(relationTypePicker.targetId, option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="map-relation-editor-actions">
              <button type="button" onClick={() => setRelationTypePicker(null)}>{t('common.cancel')}</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
