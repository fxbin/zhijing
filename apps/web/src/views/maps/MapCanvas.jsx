/**
 * @module views/maps/MapCanvas
 * 知识地图 SVG 画布：渲染节点、边、tooltip、选区、缩放控件与图例。
 * @author fxbin
 */

import { RefreshCw, X } from 'lucide-react';
import EmptyState from '../../components/EmptyState';
import { formatTime } from '../../utils/material';
import {
  truncateNodeLabel,
  describeNodeStatus,
  describeEdgeClass,
  mapKindLabel,
} from '../../utils/map';
import { MAP_BASE_WIDTH, MAP_BASE_HEIGHT, MAP_MIN_ZOOM, MAP_MAX_ZOOM } from './constants';
import MapLegend from './MapLegend';

/**
 * 知识地图 SVG 画布组件。
 * @param {Object} props - 组件属性
 * @param {Object} props.map - 地图数据
 * @param {string} props.status - 当前状态文案
 * @param {Object} props.viewState - 视图状态 { x, y, zoom }
 * @param {Function} props.setViewState - 更新视图状态
 * @param {Object|null} props.dragState - 拖拽状态
 * @param {Object|null} props.panState - 平移状态
 * @param {Object|null} props.selectionBox - 框选区域
 * @param {Object|null} props.relationDragState - 关系拖拽状态
 * @param {string|null} props.hoveredNodeId - 悬停节点 ID
 * @param {Function} props.setHoveredNodeId - 设置悬停节点 ID
 * @param {Object} props.selectedNode - 当前选中节点
 * @param {string|null} props.selectedNodeId - 当前选中节点 ID
 * @param {Function} props.setSelectedNodeId - 设置选中节点 ID
 * @param {Function} props.setIsDetailOpen - 设置详情抽屉开合
 * @param {Set<string>} props.selectedNodeIds - 批量选中节点 ID 集合
 * @param {boolean} props.connectTargetMode - 是否处于目标连接模式
 * @param {Array<string>} props.searchMatches - 搜索匹配节点 ID 列表
 * @param {Array} props.layoutNodes - 布局节点列表
 * @param {Array} props.visibleEdges - 可见边列表
 * @param {Array} props.edges - 全部边列表
 * @param {Array} props.nodes - 全部节点列表
 * @param {string} props.visibleNodeCopy - 可见节点文案
 * @param {number} props.hiddenNodeCount - 隐藏节点数
 * @param {boolean} props.isLegendOpen - 图例是否展开
 * @param {Function} props.setIsLegendOpen - 设置图例开合
 * @param {Function} props.setRelationTypePicker - 设置关系类型选择器
 * @param {Function} props.setConnectTargetMode - 设置目标连接模式
 * @param {Function} props.clearBatchSelection - 清空批量选择
 * @param {Function} props.handleWheel - 滚轮缩放处理
 * @param {Function} props.handleCanvasPointerDown - 画布指针按下处理
 * @param {Function} props.handlePointerMove - 指针移动处理
 * @param {Function} props.handlePointerUp - 指针抬起处理
 * @param {Function} props.handleNodePointerDown - 节点指针按下处理
 * @param {Function} props.handleConnectHandlePointerDown - 连接柄指针按下处理
 * @param {Function} props.resetView - 重置视图
 * @param {Function} props.t - i18n 翻译函数
 * @returns {JSX.Element} SVG 画布
 */
export default function MapCanvas({
  map,
  status,
  viewState,
  setViewState,
  dragState,
  panState,
  selectionBox,
  relationDragState,
  hoveredNodeId,
  setHoveredNodeId,
  selectedNode,
  selectedNodeId,
  setSelectedNodeId,
  setIsDetailOpen,
  selectedNodeIds,
  connectTargetMode,
  searchMatches,
  layoutNodes,
  visibleEdges,
  edges,
  nodes,
  visibleNodeCopy,
  hiddenNodeCount,
  isLegendOpen,
  setIsLegendOpen,
  setRelationTypePicker,
  setConnectTargetMode,
  clearBatchSelection,
  handleWheel,
  handleCanvasPointerDown,
  handlePointerMove,
  handlePointerUp,
  handleNodePointerDown,
  handleConnectHandlePointerDown,
  resetView,
  t,
}) {
  return (
    <section className="knowledge-map-canvas" aria-label={t('maps.canvas')}>
      {!map ? (
        <div className="map-empty-state">
          <EmptyState title={t('maps.noMap')} body={status} />
        </div>
      ) : (
        <>
          <div className="map-canvas-heading">
            <div>
              <span>{t('maps.title')}</span>
              <h2>{selectedNode?.label ?? t('maps.knowledgeMaps')}</h2>
              <p>{t('maps.updatedAt', { time: map.generatedAt ? formatTime(map.generatedAt) : t('maps.now') })}</p>
            </div>
            <div className="map-stats-strip">
              <span>{visibleNodeCopy}</span>
              <span>{edges.length} {t('maps.edges')}</span>
              <span>{map.stats?.sourcedCards ?? 0} {t('maps.sourced')}</span>
              {hiddenNodeCount > 0 && (
                <span className="map-stat-hidden">{t('maps.hiddenNodes', { count: hiddenNodeCount })}</span>
              )}
              {map.stats?.skeletonCards > 0 && (
                <span className="map-stat-skeleton">{map.stats.skeletonCards} {t('maps.skeleton')}</span>
              )}
              {map.stats?.tensionEdges > 0 && (
                <span className="map-stat-tension">{map.stats.tensionEdges} {t('maps.tension')}</span>
              )}
            </div>
          </div>

          <div className="map-graph-viewport">
            <svg
              aria-label={t('maps.graph')}
              className="map-graph-svg"
              viewBox={`${viewState.x} ${viewState.y} ${MAP_BASE_WIDTH / viewState.zoom} ${MAP_BASE_HEIGHT / viewState.zoom}`}
              role="img"
              onWheel={handleWheel}
              onPointerDown={handleCanvasPointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{ cursor: selectionBox ? 'crosshair' : panState ? 'grabbing' : dragState ? 'grabbing' : 'default', touchAction: 'none' }}
            >
              <defs>
                <marker
                  id="map-arrow"
                  markerWidth="8"
                  markerHeight="8"
                  refX="7"
                  refY="3"
                  orient="auto"
                >
                  <path d="M0,0 L7,3 L0,6 Z" fill="currentColor" />
                </marker>
                <marker
                  id="map-arrow-contradicts"
                  markerWidth="8"
                  markerHeight="8"
                  refX="7"
                  refY="3"
                  orient="auto"
                >
                  <path d="M0,0 L7,3 L0,6 Z" fill="#d4584a" />
                </marker>
              </defs>
              {visibleEdges.map((edge) => {
                const source = layoutNodes.find((node) => node.id === edge.sourceId);
                const target = layoutNodes.find((node) => node.id === edge.targetId);
                if (!source || !target) return null;
                const focusedId = relationDragState?.sourceId ?? hoveredNodeId ?? selectedNode?.id;
                const isActive = focusedId && (edge.sourceId === focusedId || edge.targetId === focusedId);
                const isDimmed = focusedId && !isActive;
                const edgeClass = describeEdgeClass(edge.relation, edge.custom);
                const markerId = edge.relation === 'contradicts' ? 'map-arrow-contradicts' : 'map-arrow';
                const dx = target.x - source.x;
                const dy = target.y - source.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const offset = (target.radius ?? 18) + 4;
                const endX = dist > 0 ? target.x - (dx / dist) * offset : target.x;
                const endY = dist > 0 ? target.y - (dy / dist) * offset : target.y;
                return (
                  <path
                    className={`${edgeClass}${isActive ? ' active' : ''}${isDimmed ? ' dimmed' : ''}`}
                    key={edge.id}
                    d={`M ${source.x} ${source.y} L ${endX} ${endY}`}
                    markerEnd={`url(#${markerId})`}
                  />
                );
              })}
              {layoutNodes.map((node) => {
                const isActive = node.id === selectedNode?.id;
                const isMatched = searchMatches.includes(node.id);
                const isHovered = node.id === hoveredNodeId;
                const focusedId = relationDragState?.sourceId ?? hoveredNodeId ?? selectedNode?.id;
                const isRelated = focusedId && edges.some(
                  (edge) =>
                    (edge.sourceId === focusedId && edge.targetId === node.id) ||
                    (edge.targetId === focusedId && edge.sourceId === node.id),
                );
                const isDimmed = !relationDragState && focusedId && !isActive && !isHovered && !isRelated && node.id !== focusedId;
                const isBatchSelected = selectedNodeIds.has(node.id);
                // 目标选择模式下：已选 source 节点变暗，可选目标节点高亮
                const isConnectSource = connectTargetMode && isBatchSelected;
                const isConnectCandidate = connectTargetMode && !isBatchSelected;
                const isRelationDragSource = relationDragState?.sourceId === node.id;
                const isRelationDropTarget = relationDragState?.targetId === node.id;
                const className = `map-svg-node ${node.kind}${isActive ? ' active' : ''}${isMatched ? ' matched' : ''}${isHovered ? ' hovered' : ''}${isDimmed ? ' dimmed' : ''}${isBatchSelected ? ' batch-selected' : ''}${isConnectSource ? ' connect-source' : ''}${isConnectCandidate ? ' connect-candidate' : ''}${isRelationDragSource ? ' relation-source' : ''}${isRelationDropTarget ? ' relation-target' : ''}`;
                return (
                  <g
                    className={className}
                    key={node.id}
                    onClick={() => {
                      if (connectTargetMode) {
                        if (selectedNodeIds.has(node.id)) return;
                        setRelationTypePicker({ targetId: node.id, sourceIds: Array.from(selectedNodeIds) });
                        setConnectTargetMode(false);
                      } else {
                        setSelectedNodeId(node.id);
                        setIsDetailOpen(true);
                      }
                    }}
                    onPointerDown={(event) => handleNodePointerDown(event, node.id)}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    role="button"
                    tabIndex={0}
                    transform={`translate(${node.x}, ${node.y})`}
                    data-status={node.status}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        if (connectTargetMode) {
                          if (selectedNodeIds.has(node.id)) return;
                          setRelationTypePicker({ targetId: node.id, sourceIds: Array.from(selectedNodeIds) });
                          setConnectTargetMode(false);
                        } else {
                          setSelectedNodeId(node.id);
                          setIsDetailOpen(true);
                        }
                      }
                    }}
                    style={{ cursor: connectTargetMode ? 'pointer' : dragState?.nodeId === node.id ? 'grabbing' : 'grab' }}
                  >
                    <circle r={node.radius} />
                    {node.status && node.kind === 'card' && (
                      <circle className="map-status-ring" r={node.radius + 5} />
                    )}
                    <text y={node.radius + 18}>{truncateNodeLabel(node.label)}</text>
                    <g
                      className="map-node-connect-handle"
                      onPointerDown={(event) => handleConnectHandlePointerDown(event, node)}
                      transform={`translate(${node.radius + 13}, ${-node.radius - 8})`}
                    >
                      <circle r="9" />
                      <path d="M-4,0 H4 M0,-4 V4" />
                    </g>
                  </g>
                );
              })}
              {relationDragState && (
                <g className="map-relation-drag-preview" pointerEvents="none">
                  <path
                    d={`M ${relationDragState.sourceX} ${relationDragState.sourceY} L ${relationDragState.currentX} ${relationDragState.currentY}`}
                  />
                  <circle cx={relationDragState.currentX} cy={relationDragState.currentY} r="7" />
                </g>
              )}
              {hoveredNodeId && (() => {
                const hoveredNode = layoutNodes.find((item) => item.id === hoveredNodeId);
                if (!hoveredNode) return null;
                const tooltipWidth = 240;
                const tooltipHeight = 76;
                const viewLeft = viewState.x;
                const viewRight = viewState.x + MAP_BASE_WIDTH / viewState.zoom;
                const viewTop = viewState.y;
                const viewBottom = viewState.y + MAP_BASE_HEIGHT / viewState.zoom;
                const nodeRadius = hoveredNode.radius ?? 18;
                let tooltipX = hoveredNode.x - tooltipWidth / 2;
                tooltipX = Math.max(viewLeft + 8, Math.min(tooltipX, viewRight - tooltipWidth - 8));
                let tooltipY = hoveredNode.y - nodeRadius - tooltipHeight - 12;
                const flipBelow = tooltipY < viewTop + 8;
                if (flipBelow) {
                  tooltipY = hoveredNode.y + nodeRadius + 12;
                }
                tooltipY = Math.max(viewTop + 8, Math.min(tooltipY, viewBottom - tooltipHeight - 8));
                const arrowX = hoveredNode.x;
                const arrowPoints = flipBelow
                  ? `${arrowX - 6},${tooltipY} ${arrowX + 6},${tooltipY} ${arrowX},${tooltipY - 6}`
                  : `${arrowX - 6},${tooltipY + tooltipHeight} ${arrowX + 6},${tooltipY + tooltipHeight} ${arrowX},${tooltipY + tooltipHeight + 6}`;
                const connectionCount = edges.filter(
                  (edge) => edge.sourceId === hoveredNode.id || edge.targetId === hoveredNode.id,
                ).length;
                const hoveredStatus = describeNodeStatus(hoveredNode.status, t);
                return (
                  <g className="map-tooltip" pointerEvents="none">
                    <rect
                      height={tooltipHeight}
                      rx="8"
                      width={tooltipWidth}
                      x={tooltipX}
                      y={tooltipY}
                    />
                    <polygon className="map-tooltip-arrow" points={arrowPoints} />
                    <text className="map-tooltip-title" x={tooltipX + 14} y={tooltipY + 24}>
                      {truncateNodeLabel(hoveredNode.label)}
                    </text>
                    <text className="map-tooltip-meta" x={tooltipX + 14} y={tooltipY + 44}>
                      {mapKindLabel(hoveredNode.kind)} · {hoveredStatus.label}
                    </text>
                    <text className="map-tooltip-meta" x={tooltipX + 14} y={tooltipY + 62}>
                      {t('maps.tooltip.connections')}: {connectionCount} · {t('maps.tooltip.hint')}
                    </text>
                  </g>
                );
              })()}
              {selectionBox && (() => {
                const left = Math.min(selectionBox.startX, selectionBox.endX);
                const top = Math.min(selectionBox.startY, selectionBox.endY);
                const width = Math.abs(selectionBox.endX - selectionBox.startX);
                const height = Math.abs(selectionBox.endY - selectionBox.startY);
                return (
                  <rect
                    className="map-selection-box"
                    x={left}
                    y={top}
                    width={width}
                    height={height}
                    pointerEvents="none"
                  />
                );
              })()}
            </svg>
            {layoutNodes.length === 0 && (
              <div className="map-no-match">
                <EmptyState title={t('maps.noMatchingNodes')} body={t('maps.noMatchingNodesHint')} />
              </div>
            )}
            <MapLegend isOpen={isLegendOpen} onToggle={() => setIsLegendOpen((current) => !current)} t={t} />
          </div>
          <div className="map-floating-controls" aria-label={t('maps.zoomControls')}>
            <button aria-label={t('common.zoomIn')} onClick={() => setViewState((current) => ({ ...current, zoom: Math.min(current.zoom * 1.2, MAP_MAX_ZOOM) }))} type="button">+</button>
            <button aria-label={t('common.resetView')} onClick={resetView} type="button"><RefreshCw size={16} /></button>
            <button aria-label={t('common.zoomOut')} onClick={() => setViewState((current) => ({ ...current, zoom: Math.max(current.zoom / 1.2, MAP_MIN_ZOOM) }))} type="button">−</button>
          </div>
          {selectedNodeIds.size > 0 && (
            <div className="map-batch-toolbar" role="toolbar" aria-label={t('maps.batchActions')}>
              <span className="map-batch-count">{t('maps.nodesSelected', { count: selectedNodeIds.size })}</span>
              <button
                type="button"
                className="map-batch-btn primary"
                onClick={() => setConnectTargetMode(true)}
              >
                {t('maps.connectToTarget')}
              </button>
              <button
                type="button"
                className="map-batch-close"
                onClick={clearBatchSelection}
                aria-label={t('common.cancel')}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {(selectionBox || selectedNodeIds.size > 0 || connectTargetMode || relationDragState) && (
            <div className="map-batch-hint" role="status">
              {relationDragState
                ? t(relationDragState.targetId ? 'maps.releaseToConnectHint' : 'maps.dragToConnectHint')
                : connectTargetMode ? t('maps.pickTargetHint') : t('maps.batchHint')}
            </div>
          )}
        </>
      )}
    </section>
  );
}
