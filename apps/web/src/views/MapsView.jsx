/**
 * @module views/MapsView
 * 知识地图视图：以 SVG 关系图展示知识库节点与边，并支持节点筛选、搜索与详情查看。
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CircleX, RefreshCw, Search, X } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { formatTime } from '../utils/material';
import {
  mapNodeMatches,
  buildMapLayout,
  truncateNodeLabel,
  mapKindLabel,
  describeNodeStatus,
  describeNodeMetadata,
  describeEdgeClass,
  getClaimStatusLegend,
} from '../utils/map';

/**
 * 知识地图视图组件
 * @param {Object} props - 组件属性
 * @param {string} props.apiStatus - API 连接状态
 * @param {string} props.selectedKnowledgeBaseId - 当前选中的知识库 ID
 * @param {Function} props.setView - 切换视图回调
 * @returns {JSX.Element} 知识地图视图
 */
export default function MapsView({ apiStatus, selectedKnowledgeBaseId, setView }) {
  const { t } = useTranslation();
  const STORAGE_KEY_ZOOM = 'zhijing_map_zoom';
  const STORAGE_KEY_FILTER = 'zhijing_map_filter';
  const [map, setMap] = useState(null);
  const [status, setStatus] = useState(t('maps.status.selectKnowledgeBase'));
  const [query, setQuery] = useState('');
  const [nodeFilter, setNodeFilter] = useState(() => {
    try {
      return localStorage.getItem('zhijing_map_filter') || 'all';
    } catch {
      return 'all';
    }
  });
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [zoom, setZoom] = useState(() => {
    try {
      const saved = parseFloat(localStorage.getItem('zhijing_map_zoom'));
      return Number.isFinite(saved) ? saved : 1;
    } catch {
      return 1;
    }
  });
  const [relationFilter, setRelationFilter] = useState('all');
  const [relationEditor, setRelationEditor] = useState(null);
  const [nodePositions, setNodePositions] = useState({});
  const [dragState, setDragState] = useState(null);
  const [pendingSave, setPendingSave] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('zhijing_map_zoom', String(zoom));
    } catch {
      // localStorage 不可用时静默忽略
    }
  }, [zoom]);

  useEffect(() => {
    try {
      localStorage.setItem('zhijing_map_filter', nodeFilter);
    } catch {
      // localStorage 不可用时静默忽略
    }
  }, [nodeFilter]);

  useEffect(() => {
    if (!selectedKnowledgeBaseId || apiStatus !== 'online') {
      setMap(null);
      setStatus(apiStatus === 'online' ? t('maps.status.selectKnowledgeBase') : t('maps.status.apiOffline'));
      return;
    }

    let ignore = false;
    async function loadMap() {
      setStatus(t('maps.status.loading'));
      try {
        const response = await fetch(`/api/knowledge-bases/${selectedKnowledgeBaseId}/map`);
        if (!response.ok) throw new Error('Map unavailable.');
        const result = await response.json();
        if (!ignore) {
          setMap(result);
          setNodePositions(
            (result.nodePositions ?? []).reduce((acc, position) => {
              acc[position.nodeId] = { x: position.x, y: position.y };
              return acc;
            }, {}),
          );
          setStatus(result.nodes?.length ? t('maps.status.synced') : t('maps.status.noNodes'));
          setSelectedNodeId(result.nodes?.[0]?.id ?? null);
        }
      } catch {
        if (!ignore) {
          setMap(null);
          setStatus(t('maps.status.loadFailed'));
        }
      }
    }
    loadMap();
    return () => {
      ignore = true;
    };
  }, [apiStatus, selectedKnowledgeBaseId]);

  const nodes = map?.nodes ?? [];
  const edges = map?.edges ?? [];
  const filteredNodes = nodes.filter((node) => mapNodeMatches(node, nodeFilter, query));
  const searchMatches = query.trim()
    ? nodes.filter((node) => mapNodeMatches(node, 'all', query)).map((node) => node.id)
    : [];
  const visibleNodeIds = new Set(filteredNodes.map((node) => node.id));
  const visibleEdges = edges.filter((edge) => visibleNodeIds.has(edge.sourceId) && visibleNodeIds.has(edge.targetId));
  const layoutNodes = buildMapLayout(filteredNodes, nodePositions);
  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? filteredNodes[0] ?? nodes[0];
  const selectedRelations = selectedNode
    ? edges.filter((edge) => edge.sourceId === selectedNode.id || edge.targetId === selectedNode.id)
    : [];
  const connectedNodeCount = selectedRelations.length;
  const statusMeta = describeNodeStatus(selectedNode?.status);
  const nodeMetadataItems = selectedNode ? describeNodeMetadata(selectedNode) : [];
  const relationTypes = ['all', ...new Set(selectedRelations.map((edge) => edge.relation))];
  const visibleRelations = selectedRelations
    .filter((edge) => relationFilter === 'all' || edge.relation === relationFilter)
    .sort((a, b) => {
      const directionDiff = (a.sourceId === selectedNode.id ? 0 : 1) - (b.sourceId === selectedNode.id ? 0 : 1);
      if (directionDiff !== 0) return directionDiff;
      return a.relation.localeCompare(b.relation);
    });
  const typeCounts = nodes.reduce((acc, node) => ({ ...acc, [node.kind]: (acc[node.kind] ?? 0) + 1 }), {});
  const filterOptions = [
    { key: 'all', label: t('maps.filter.allNodes'), count: nodes.length },
    { key: 'knowledge_base', label: t('maps.filter.knowledgeBase'), count: typeCounts.knowledge_base ?? 0 },
    { key: 'material', label: t('maps.filter.materials'), count: typeCounts.material ?? 0 },
    { key: 'card', label: t('maps.filter.cards'), count: typeCounts.card ?? 0 },
  ];
  const relationTypeLabelMap = {
    related_to: t('maps.relationType.relatedTo'),
    derived_from: t('maps.relationType.derivedFrom'),
    supports: t('maps.relationType.supports'),
    contradicts: t('maps.relationType.contradicts'),
  };

  /**
   * 将屏幕坐标转换为 SVG 内部坐标。
   * @param {PointerEvent} event - 指针事件
   * @returns {{x: number; y: number}|null} SVG 坐标或转换失败时返回 null
   */
  function pointerToSvg(event) {
    const svg = event.currentTarget.closest('svg');
    if (!svg) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const transformed = point.matrixTransform(ctm.inverse());
    return { x: transformed.x, y: transformed.y };
  }

  /**
   * 开始拖拽节点。
   * @param {PointerEvent} event - 指针事件
   * @param {string} nodeId - 被拖拽节点 ID
   */
  function handleNodePointerDown(event, nodeId) {
    event.stopPropagation();
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    const svgPoint = pointerToSvg(event);
    const node = layoutNodes.find((item) => item.id === nodeId);
    if (!svgPoint || !node) return;
    setDragState({
      nodeId,
      startX: svgPoint.x,
      startY: svgPoint.y,
      nodeStartX: node.x,
      nodeStartY: node.y,
    });
  }

  /**
   * 拖拽中实时更新节点位置。
   * @param {PointerEvent} event - 指针事件
   */
  function handlePointerMove(event) {
    if (!dragState) return;
    const svgPoint = pointerToSvg(event);
    if (!svgPoint) return;
    const dx = svgPoint.x - dragState.startX;
    const dy = svgPoint.y - dragState.startY;
    setNodePositions((current) => ({
      ...current,
      [dragState.nodeId]: {
        x: dragState.nodeStartX + dx,
        y: dragState.nodeStartY + dy,
      },
    }));
  }

  /**
   * 结束拖拽，若位置发生变化则触发后端保存。
   */
  function handlePointerUp() {
    if (!dragState) return;
    const current = nodePositions[dragState.nodeId];
    const hasMoved = !current || current.x !== dragState.nodeStartX || current.y !== dragState.nodeStartY;
    setDragState(null);
    if (hasMoved) {
      setPendingSave(true);
    }
  }

  /**
   * 将当前节点位置批量保存到后端。
   * @param {Record<string, {x: number; y: number}>} positions - 节点位置映射
   */
  async function persistNodePositions(positions) {
    if (!selectedKnowledgeBaseId) return;
    try {
      const payload = Object.entries(positions).map(([nodeId, point]) => ({
        nodeId,
        x: point.x,
        y: point.y,
      }));
      const response = await fetch(`/api/knowledge-bases/${selectedKnowledgeBaseId}/node-positions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positions: payload }),
      });
      if (!response.ok) throw new Error('Save node positions failed.');
      setStatus(t('maps.status.synced'));
    } catch {
      setStatus(t('maps.status.saveFailed'));
    } finally {
      setPendingSave(false);
    }
  }

  useEffect(() => {
    if (!pendingSave) return;
    persistNodePositions(nodePositions);
  }, [pendingSave, nodePositions, selectedKnowledgeBaseId]);

  /**
   * 重新加载地图数据（添加/删除边后调用）。
   */
  async function reloadMap() {
    if (!selectedKnowledgeBaseId) return;
    try {
      const response = await fetch(`/api/knowledge-bases/${selectedKnowledgeBaseId}/map`);
      if (!response.ok) return;
      const result = await response.json();
      setMap(result);
      setNodePositions(
        (result.nodePositions ?? []).reduce((acc, position) => {
          acc[position.nodeId] = { x: position.x, y: position.y };
          return acc;
        }, {}),
      );
    } catch {
      // 静默忽略重载失败
    }
  }

  /**
   * 保存自定义关系到后端。
   */
  async function saveCustomRelation() {
    if (!selectedKnowledgeBaseId || !relationEditor?.targetId || !selectedNode) return;
    try {
      const response = await fetch(`/api/knowledge-bases/${selectedKnowledgeBaseId}/map/edges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceNodeId: selectedNode.id,
          targetNodeId: relationEditor.targetId,
          relation: relationEditor.relation,
        }),
      });
      if (!response.ok) {
        setStatus(t('maps.status.saveFailed'));
        return;
      }
      setStatus(t('maps.status.relationAdded'));
      setRelationEditor(null);
      await reloadMap();
    } catch {
      setStatus(t('maps.status.saveFailed'));
    }
  }

  /**
   * 删除自定义边。
   * @param {string} edgeId - 边 ID
   */
  async function deleteCustomEdge(edgeId) {
    if (!selectedKnowledgeBaseId) return;
    try {
      const response = await fetch(`/api/knowledge-bases/${selectedKnowledgeBaseId}/map/edges/${edgeId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        setStatus(t('maps.status.saveFailed'));
        return;
      }
      setStatus(t('maps.status.relationRemoved'));
      await reloadMap();
    } catch {
      setStatus(t('maps.status.saveFailed'));
    }
  }

  /**
   * 搜索词变化时，若当前选中节点不在匹配结果中，自动选中第一个匹配节点。
   */
  useEffect(() => {
    if (!query.trim()) return;
    const keyword = query.trim().toLowerCase();
    const matches = nodes.filter((node) =>
      [node.label, node.summary, node.status, ...Object.values(node.metadata ?? {})]
        .join(' ')
        .toLowerCase()
        .includes(keyword),
    );
    if (matches.length === 0) return;
    const isCurrentVisible = matches.some((node) => node.id === selectedNodeId);
    if (!isCurrentVisible) {
      setSelectedNodeId(matches[0].id);
    }
  }, [query, nodes, selectedNodeId]);

  return (
    <section className="page-main full knowledge-map-page">
      <div className="knowledge-map-shell">
        <header className="knowledge-map-topbar">
          <div className="map-breadcrumb">
            <button aria-label={t('maps.back')} onClick={() => setView('detail')} type="button"><CircleX size={18} /></button>
            <span>{t('maps.breadcrumb.knowledgeBase')}</span>
            <span>/</span>
            <strong>{t('maps.fullMap')}</strong>
          </div>
          <div className="map-filter-bar">
            {filterOptions.map((option) => (
              <button className={nodeFilter === option.key ? 'active' : ''} key={option.key} onClick={() => setNodeFilter(option.key)} type="button">
                <span className={`map-filter-dot ${option.key}`} />
                {option.label}
                <small>{option.count}</small>
              </button>
            ))}
          </div>
          <label className="map-search">
            <Search size={17} />
            <input aria-label={t('maps.searchNodes')} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('maps.searchPlaceholder')} />
            {query && (
              <button
                aria-label={t('maps.clearSearch')}
                className="map-search-clear"
                onClick={() => setQuery('')}
                type="button"
              >
                <X size={15} />
              </button>
            )}
          </label>
        </header>

        <div className="knowledge-map-board">
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
                    <span>{nodes.length} {t('maps.nodes')}</span>
                    <span>{edges.length} {t('maps.edges')}</span>
                    <span>{map.stats?.sourcedCards ?? 0} {t('maps.sourced')}</span>
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
                    viewBox="0 0 1000 800"
                    role="img"
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    style={{ cursor: dragState ? 'grabbing' : 'default' }}
                  >
                    <g style={{ transform: `scale(${zoom})`, transformOrigin: '500px 400px' }}>
                      {visibleEdges.map((edge) => {
                        const source = layoutNodes.find((node) => node.id === edge.sourceId);
                        const target = layoutNodes.find((node) => node.id === edge.targetId);
                        if (!source || !target) return null;
                        const isActive = selectedNode && (edge.sourceId === selectedNode.id || edge.targetId === selectedNode.id);
                        const edgeClass = describeEdgeClass(edge.relation, edge.custom);
                        return (
                          <line
                            className={`${edgeClass}${isActive ? ' active' : ''}`}
                            key={edge.id}
                            x1={source.x}
                            y1={source.y}
                            x2={target.x}
                            y2={target.y}
                          />
                        );
                      })}
                      {layoutNodes.map((node) => {
                        const isActive = node.id === selectedNode?.id;
                        const isMatched = searchMatches.includes(node.id);
                        const className = `map-svg-node ${node.kind}${isActive ? ' active' : ''}${isMatched ? ' matched' : ''}`;
                        return (
                          <g
                            className={className}
                            key={node.id}
                            onClick={() => setSelectedNodeId(node.id)}
                            onPointerDown={(event) => handleNodePointerDown(event, node.id)}
                            role="button"
                            tabIndex={0}
                            transform={`translate(${node.x}, ${node.y})`}
                            data-status={node.status}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') setSelectedNodeId(node.id);
                            }}
                            style={{ cursor: dragState?.nodeId === node.id ? 'grabbing' : 'grab' }}
                          >
                            <circle r={node.radius} />
                            <text y={node.radius + 18}>{truncateNodeLabel(node.label)}</text>
                          </g>
                        );
                      })}
                    </g>
                  </svg>
                  {layoutNodes.length === 0 && (
                    <div className="map-no-match">
                      <EmptyState title={t('maps.noMatchingNodes')} body={t('maps.noMatchingNodesHint')} />
                    </div>
                  )}
                </div>

                <div className="map-legend">
                  {filterOptions.slice(1).map((option) => (
                    <button
                      className={nodeFilter === option.key ? 'active' : ''}
                      key={option.key}
                      onClick={() => setNodeFilter(nodeFilter === option.key ? 'all' : option.key)}
                      type="button"
                    >
                      <i className={`map-filter-dot ${option.key}`} />
                      {option.label}
                      <small>{option.count}</small>
                    </button>
                  ))}
                </div>
                <div className="map-claim-legend" aria-label={t('maps.claimLegend')}>
                  <span className="map-claim-legend-title">{t('maps.claimStatus')}</span>
                  <div className="map-claim-legend-items">
                    {getClaimStatusLegend().map((item) => (
                      <span className={`map-claim-chip ${item.tone}`} key={item.key}>
                        <i className="map-claim-dot" />
                        {item.label}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="map-floating-controls" aria-label={t('maps.zoomControls')}>
                  <button aria-label={t('common.zoomIn')} onClick={() => setZoom((value) => Math.min(value + 0.12, 1.36))} type="button">+</button>
                  <button aria-label={t('common.resetView')} onClick={() => setZoom(1)} type="button"><RefreshCw size={16} /></button>
                  <button aria-label={t('common.zoomOut')} onClick={() => setZoom((value) => Math.max(value - 0.12, 0.76))} type="button">−</button>
                </div>
              </>
            )}
          </section>

          <aside className="map-detail-drawer" aria-label={t('maps.nodeDetails')}>
            {!map || !selectedNode ? (
              <EmptyState title={t('maps.selectNode')} body={t('maps.selectNodeHint')} />
            ) : (
              <>
                <div className="map-node-detail-head">
                  <span>{mapKindLabel(selectedNode.kind)}</span>
                  <h3>{selectedNode.label}</h3>
                  <p>{selectedNode.summary || t('maps.noSummary')}</p>
                </div>
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
                    {nodeMetadataItems.map((item) => (
                      <div key={item.label}>
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </div>
                    ))}
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
                <div className="map-drawer-actions">
                  <button onClick={() => setView(selectedNode.kind === 'material' ? 'library' : 'detail')} type="button">{t('maps.openContext')}</button>
                  <button type="button" onClick={() => setRelationEditor({ targetId: '', relation: 'related_to' })}>{t('maps.addRelation')}</button>
                </div>
                {relationEditor && (
                  <div className="map-relation-editor">
                    <h4>{t('maps.addRelationTitle')}</h4>
                    <label>
                      <span>{t('maps.targetNode')}</span>
                      <select
                        value={relationEditor.targetId}
                        onChange={(event) => setRelationEditor((current) => ({ ...current, targetId: event.target.value }))}
                      >
                        <option value="">{t('maps.selectTargetNode')}</option>
                        {nodes.filter((node) => node.id !== selectedNode.id).map((node) => (
                          <option key={node.id} value={node.id}>{node.label}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>{t('maps.relationType')}</span>
                      <select
                        value={relationEditor.relation}
                        onChange={(event) => setRelationEditor((current) => ({ ...current, relation: event.target.value }))}
                      >
                        <option value="related_to">{t('maps.relationType.relatedTo')}</option>
                        <option value="derived_from">{t('maps.relationType.derivedFrom')}</option>
                        <option value="supports">{t('maps.relationType.supports')}</option>
                        <option value="contradicts">{t('maps.relationType.contradicts')}</option>
                      </select>
                    </label>
                    <div className="map-relation-editor-actions">
                      <button type="button" onClick={() => setRelationEditor(null)}>{t('common.cancel')}</button>
                      <button
                        type="button"
                        disabled={!relationEditor.targetId}
                        onClick={saveCustomRelation}
                      >
                        {t('common.save')}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}
