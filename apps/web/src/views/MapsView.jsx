/**
 * @module views/MapsView
 * 知识地图视图：以 SVG 关系图展示工作区节点与边，并支持节点筛选、搜索与详情查看。
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, CircleX, Link2, MessageCircle, PencilLine, RefreshCw, Search, X } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { formatTime } from '../utils/material';
import api from '../utils/api';
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
 * @param {string} props.selectedWorkspaceId - 当前选中的工作区 ID
 * @param {Function} props.setView - 切换视图回调
 * @param {Function} props.onOpenChat - 打开全局对话胶囊并可预填问题
 * @returns {JSX.Element} 知识地图视图
 */
export default function MapsView({ apiStatus, selectedWorkspaceId, setView, onOpenChat }) {
  const { t } = useTranslation();
  const STORAGE_KEY_FILTER = 'zhijing_map_filter';
  const MAP_BASE_WIDTH = 1000;
  const MAP_BASE_HEIGHT = 800;
  const MAP_MIN_ZOOM = 0.3;
  const MAP_MAX_ZOOM = 3;
  const MAP_CLICK_DRAG_THRESHOLD = 6;
  const MAP_RELATION_TARGET_PADDING = 14;
  const [map, setMap] = useState(null);
  const [status, setStatus] = useState(t('maps.status.selectWorkspace'));
  const [query, setQuery] = useState('');
  const [nodeFilter, setNodeFilter] = useState(() => {
    try {
      return localStorage.getItem('zhijing_map_filter') || 'all';
    } catch {
      return 'all';
    }
  });
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [viewState, setViewState] = useState({ x: 0, y: 0, zoom: 1 });
  const [relationFilter, setRelationFilter] = useState('all');
  const [nodePositions, setNodePositions] = useState({});
  const [dragState, setDragState] = useState(null);
  const [panState, setPanState] = useState(null);
  const [pendingSave, setPendingSave] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(true);
  const [selectionBox, setSelectionBox] = useState(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState(() => new Set());
  const [connectTargetMode, setConnectTargetMode] = useState(false);
  const [relationTypePicker, setRelationTypePicker] = useState(null);
  const [relationDragState, setRelationDragState] = useState(null);
  const savingRelationsRef = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem('zhijing_map_filter', nodeFilter);
    } catch {
      // localStorage 不可用时静默忽略
    }
  }, [nodeFilter]);

  // Esc 清空批量选择 + 退出目标选择模式；点空白（无 selectionBox/drag/pan 时）也清空
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setSelectedNodeIds(new Set());
        setSelectionBox(null);
        setConnectTargetMode(false);
        setRelationTypePicker(null);
        setRelationDragState(null);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  function clearBatchSelection() {
    setSelectedNodeIds(new Set());
    setSelectionBox(null);
    setConnectTargetMode(false);
    setRelationTypePicker(null);
    setRelationDragState(null);
  }

  async function saveRelations(sourceIds, targetId, relation) {
    if (savingRelationsRef.current) return;
    if (!selectedWorkspaceId || sourceIds.length === 0 || !targetId) return;
    savingRelationsRef.current = true;
    setRelationTypePicker(null);
    const validSourceIds = sourceIds.filter((id) => id !== targetId);
    if (validSourceIds.length === 0) {
      clearBatchSelection();
      savingRelationsRef.current = false;
      return;
    }
    try {
      setStatus(t('maps.status.batchSaving', { defaultValue: '正在批量创建关系…' }));
      const edgeResults = await Promise.allSettled(
        validSourceIds.map((sourceId) =>
          api.post(`/api/workspaces/${selectedWorkspaceId}/map/edges`, {
            sourceNodeId: sourceId,
            targetNodeId: targetId,
            relation,
          }),
        ),
      );
      const successCount = edgeResults.filter((r) => r.status === 'fulfilled').length;
      const failedCount = edgeResults.length - successCount;
      if (successCount > 0) {
        setStatus(t('maps.status.batchSaved', { count: successCount, defaultValue: `已创建 ${successCount} 条关系` }));
      } else {
        setStatus(t('maps.status.saveFailed'));
      }
      clearBatchSelection();
      await reloadMap();
    } catch {
      setStatus(t('maps.status.saveFailed'));
    } finally {
      savingRelationsRef.current = false;
    }
  }

  function saveBatchRelations(targetId, relation) {
    const sourceIds = relationTypePicker?.sourceIds ?? Array.from(selectedNodeIds);
    return saveRelations(sourceIds, targetId, relation);
  }

  useEffect(() => {
    if (!selectedWorkspaceId || apiStatus !== 'online') {
      setMap(null);
      setStatus(apiStatus === 'online' ? t('maps.status.selectWorkspace') : t('maps.status.apiOffline'));
      return;
    }

    let ignore = false;
    async function loadMap() {
      setStatus(t('maps.status.loading'));
      try {
        const result = await api.get(`/api/workspaces/${selectedWorkspaceId}/map`);
        if (!ignore) {
          setMap(result);
          setNodePositions(
            (result.nodePositions ?? []).reduce((acc, position) => {
              acc[position.nodeId] = { x: position.x, y: position.y };
              return acc;
            }, {}),
          );
          setStatus(result.nodes?.length ? t('maps.status.synced') : t('maps.status.noNodes'));
          setSelectedNodeId(null);
          setIsDetailOpen(Boolean(result.nodes?.length));
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
  }, [apiStatus, selectedWorkspaceId]);

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
  const statusMeta = describeNodeStatus(selectedNode?.status, t);
  const materialLookup = nodes
    .filter((node) => node.kind === 'material')
    .map((node) => ({ id: node.id.replace(/^material:/, ''), title: node.label }));
  const nodeMetadataItems = selectedNode
    ? describeNodeMetadata(selectedNode, { t, materials: materialLookup })
    : [];
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
    { key: 'workspace', label: t('maps.filter.workspace'), count: typeCounts.workspace ?? 0 },
    { key: 'material', label: t('maps.filter.materials'), count: typeCounts.material ?? 0 },
    { key: 'card', label: t('maps.filter.cards'), count: typeCounts.card ?? 0 },
  ];
  const relationTypeLabelMap = {
    related_to: t('maps.relationType.relatedTo'),
    supports: t('maps.relationType.supports'),
    contradicts: t('maps.relationType.contradicts'),
    contains: t('maps.relationType.contains'),
    source: t('maps.relationType.source'),
  };
  const editableRelationOptions = [
    { value: 'related_to', label: t('maps.relationType.relatedTo') },
    { value: 'supports', label: t('maps.relationType.supports') },
    { value: 'contradicts', label: t('maps.relationType.contradicts') },
  ];
  const totalNodeCount = (map?.stats?.materials ?? typeCounts.material ?? 0)
    + (map?.stats?.cards ?? typeCounts.card ?? 0)
    + (typeCounts.workspace ?? 0);
  const hiddenNodeCount = (map?.stats?.hiddenMaterials ?? 0) + (map?.stats?.hiddenCards ?? 0);
  const visibleNodeCopy = hiddenNodeCount > 0
    ? t('maps.visibleNodes', { visible: nodes.length, total: totalNodeCount })
    : `${nodes.length} ${t('maps.nodes')}`;
  const sourceMaterialId = selectedNode?.kind === 'card' && typeof selectedNode.metadata?.materialId === 'string'
    ? `material:${selectedNode.metadata.materialId}`
    : null;
  const hasVisibleSourceMaterial = sourceMaterialId ? nodes.some((node) => node.id === sourceMaterialId) : false;

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

  function findRelationTarget(svgPoint, sourceId) {
    return layoutNodes.find((node) => {
      if (node.id === sourceId) return false;
      const dx = node.x - svgPoint.x;
      const dy = node.y - svgPoint.y;
      const radius = (node.radius ?? 18) + MAP_RELATION_TARGET_PADDING;
      return Math.sqrt(dx * dx + dy * dy) <= radius;
    });
  }

  function startConnectTargetMode(sourceId) {
    setSelectedNodeIds(new Set([sourceId]));
    setConnectTargetMode(true);
    setRelationTypePicker(null);
    setIsDetailOpen(false);
  }

  function handleConnectHandlePointerDown(event, node) {
    event.stopPropagation();
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    const svgPoint = pointerToSvg(event);
    if (!svgPoint) return;
    setRelationDragState({
      sourceId: node.id,
      sourceX: node.x,
      sourceY: node.y,
      currentX: svgPoint.x,
      currentY: svgPoint.y,
      targetId: null,
    });
    setSelectedNodeIds(new Set([node.id]));
    setConnectTargetMode(false);
    setRelationTypePicker(null);
    setIsDetailOpen(false);
  }

  /**
   * 开始拖拽节点。
   * @param {PointerEvent} event - 指针事件
   * @param {string} nodeId - 被拖拽节点 ID
   */
  function handleNodePointerDown(event, nodeId) {
    event.stopPropagation();
    if (connectTargetMode || relationDragState) return;
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
   * 指针移动处理：节点拖拽时更新节点位置，画布平移时更新 viewBox 偏移。
   * @param {PointerEvent} event - 指针事件
   */
  function handlePointerMove(event) {
    if (relationDragState) {
      const svgPoint = pointerToSvg(event);
      if (!svgPoint) return;
      const target = findRelationTarget(svgPoint, relationDragState.sourceId);
      setRelationDragState((current) => current ? {
        ...current,
        currentX: svgPoint.x,
        currentY: svgPoint.y,
        targetId: target?.id ?? null,
      } : current);
      setHoveredNodeId(target?.id ?? null);
      return;
    }
    if (dragState) {
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
      return;
    }
    if (selectionBox) {
      const svgPoint = pointerToSvg(event);
      if (!svgPoint) return;
      setSelectionBox((current) => (current ? { ...current, endX: svgPoint.x, endY: svgPoint.y } : current));
      return;
    }
    if (panState) {
      const svg = event.currentTarget;
      const rect = svg.getBoundingClientRect();
      const scaleX = (MAP_BASE_WIDTH / viewState.zoom) / rect.width;
      const scaleY = (MAP_BASE_HEIGHT / viewState.zoom) / rect.height;
      const dx = (event.clientX - panState.startX) * scaleX;
      const dy = (event.clientY - panState.startY) * scaleY;
      setViewState((current) => ({
        ...current,
        x: panState.viewX - dx,
        y: panState.viewY - dy,
      }));
    }
  }

  /**
   * 结束拖拽，若位置发生变化则触发后端保存。
   */
  function handlePointerUp() {
    if (relationDragState) {
      const targetId = relationDragState.targetId;
      const sourceId = relationDragState.sourceId;
      setRelationDragState(null);
      setHoveredNodeId(null);
      if (targetId) {
        setRelationTypePicker({ targetId, sourceIds: [sourceId] });
      }
      return;
    }
    if (dragState) {
      const current = nodePositions[dragState.nodeId];
      const hasMoved = !current || current.x !== dragState.nodeStartX || current.y !== dragState.nodeStartY;
      setDragState(null);
      if (hasMoved) {
        setPendingSave(true);
      }
      return;
    }
    if (selectionBox) {
      // 计算选区命中的节点
      const left = Math.min(selectionBox.startX, selectionBox.endX);
      const right = Math.max(selectionBox.startX, selectionBox.endX);
      const top = Math.min(selectionBox.startY, selectionBox.endY);
      const bottom = Math.max(selectionBox.startY, selectionBox.endY);
      const isClick = Math.abs(selectionBox.endX - selectionBox.startX) < MAP_CLICK_DRAG_THRESHOLD
        && Math.abs(selectionBox.endY - selectionBox.startY) < MAP_CLICK_DRAG_THRESHOLD;
      setSelectionBox(null);
      if (!isClick) {
        const hits = layoutNodes.filter((node) => {
          const r = node.radius ?? 18;
          return node.x + r >= left && node.x - r <= right
            && node.y + r >= top && node.y - r <= bottom;
        });
        setSelectedNodeIds(new Set(hits.map((node) => node.id)));
      }
      return;
    }
    if (panState) {
      setPanState(null);
    }
  }

  /**
   * 滚轮缩放：围绕鼠标点缩放 viewBox，保持鼠标下的内容不动。
   * @param {WheelEvent} event - 滚轮事件
   */
  function handleWheel(event) {
    event.preventDefault();
    const svg = event.currentTarget;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const svgPoint = point.matrixTransform(ctm.inverse());
    const delta = event.deltaY > 0 ? 0.88 : 1.12;
    setViewState((current) => {
      const nextZoom = Math.min(Math.max(current.zoom * delta, MAP_MIN_ZOOM), MAP_MAX_ZOOM);
      if (nextZoom === current.zoom) return current;
      const scale = nextZoom / current.zoom;
      const nextX = svgPoint.x - (svgPoint.x - current.x) / scale;
      const nextY = svgPoint.y - (svgPoint.y - current.y) / scale;
      return { x: nextX, y: nextY, zoom: nextZoom };
    });
  }

  /**
   * 开始画布平移或框选：在空白处按下指针时，按住 Shift 走框选分支，否则走平移。
   * @param {PointerEvent} event - 指针事件
   */
  function handleCanvasPointerDown(event) {
    if (event.target.tagName === 'circle' || event.target.tagName === 'text' || event.target.closest('.map-svg-node')) {
      return;
    }
    const svgPoint = pointerToSvg(event);
    if (!svgPoint) return;
    // Shift+Drag 启动框选
    if (event.shiftKey) {
      setSelectedNodeId(null);
      setSelectionBox({ startX: svgPoint.x, startY: svgPoint.y, endX: svgPoint.x, endY: svgPoint.y });
      return;
    }
    // 非 Shift 点空白：清空已有的批量选择
    if (selectedNodeIds.size > 0) {
      setSelectedNodeIds(new Set());
    }
    setPanState({
      startX: event.clientX,
      startY: event.clientY,
      viewX: viewState.x,
      viewY: viewState.y,
    });
  }

  /**
   * 重置视图到初始状态。
   */
  function resetView() {
    setViewState({ x: 0, y: 0, zoom: 1 });
  }

  /**
   * 将当前节点位置批量保存到后端。
   * @param {Record<string, {x: number; y: number}>} positions - 节点位置映射
   */
  async function persistNodePositions(positions) {
    if (!selectedWorkspaceId) return;
    try {
      const payload = Object.entries(positions).map(([nodeId, point]) => ({
        nodeId,
        x: point.x,
        y: point.y,
      }));
      await api.put(`/api/workspaces/${selectedWorkspaceId}/node-positions`, { positions: payload });
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
  }, [pendingSave, nodePositions, selectedWorkspaceId]);

  /**
   * 重新加载地图数据（添加/删除边后调用）。
   */
  async function reloadMap() {
    if (!selectedWorkspaceId) return;
    try {
      const result = await api.get(`/api/workspaces/${selectedWorkspaceId}/map`);
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
   * 删除自定义边。
   * @param {string} edgeId - 边 ID
   */
  async function deleteCustomEdge(edgeId) {
    if (!selectedWorkspaceId) return;
    try {
      await api.del(`/api/workspaces/${selectedWorkspaceId}/map/edges/${edgeId}`);
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
            <span>{t('maps.breadcrumb.workspace')}</span>
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

        <div className={`knowledge-map-board${isDetailOpen ? ' detail-open' : ''}`}>
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
                  <div className={`map-legend${isLegendOpen ? ' open' : ''}`}>
                    <button
                      className="map-legend-toggle"
                      onClick={() => setIsLegendOpen((current) => !current)}
                      type="button"
                      aria-expanded={isLegendOpen}
                      aria-label={t('maps.legendToggle')}
                    >
                      {t('maps.legendToggle')}
                      <span className="map-legend-toggle-icon">{isLegendOpen ? '−' : '+'}</span>
                    </button>
                    {isLegendOpen && (
                      <div className="map-legend-guide">
                        <div className="map-node-kind-legend" aria-label={t('maps.nodeKindLegend')}>
                          <span className="map-claim-legend-title">{t('maps.nodeKindLegend')}</span>
                          <div className="map-claim-legend-items">
                            <span className="map-claim-chip">
                              <i className="map-kind-dot workspace" />
                              {t('maps.nodeKind.workspace')}
                            </span>
                            <span className="map-claim-chip">
                              <i className="map-kind-dot material" />
                              {t('maps.nodeKind.material')}
                            </span>
                            <span className="map-claim-chip">
                              <i className="map-kind-dot card" />
                              {t('maps.nodeKind.card')}
                            </span>
                          </div>
                        </div>
                        <div className="map-claim-legend" aria-label={t('maps.claimLegend')}>
                          <span className="map-claim-legend-title">{t('maps.claimStatus')}</span>
                          <div className="map-claim-legend-items">
                            {getClaimStatusLegend(t).map((item) => (
                              <span className={`map-claim-chip ${item.tone}`} key={item.key}>
                                <i className="map-claim-dot" />
                                {item.label}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="map-edge-legend" aria-label={t('maps.edgeLegend')}>
                          <span className="map-claim-legend-title">{t('maps.edgeLegend')}</span>
                          <div className="map-claim-legend-items">
                            <span className="map-edge-chip">
                              <svg className="map-edge-sample" height="8" width="44">
                                <line stroke="#bcc7de" strokeWidth="1.5" x1="0" x2="44" y1="4" y2="4" />
                              </svg>
                              <span>{t('maps.edgeLegend.structural')}</span>
                              <small>{t('maps.edgeLegend.structuralHint')}</small>
                            </span>
                            <span className="map-edge-chip">
                              <svg className="map-edge-sample" height="8" width="44">
                                <line stroke="#8b6fb0" strokeDasharray="3 3" strokeWidth="1.5" x1="0" x2="44" y1="4" y2="4" />
                              </svg>
                              <span>{t('maps.edgeLegend.relatedTo')}</span>
                              <small>{t('maps.edgeLegend.relatedToHint')}</small>
                            </span>
                            <span className="map-edge-chip">
                              <svg className="map-edge-sample" height="8" width="44">
                                <line stroke="#d4584a" strokeDasharray="6 4" strokeWidth="2" x1="0" x2="44" y1="4" y2="4" />
                              </svg>
                              <span>{t('maps.edgeLegend.contradicts')}</span>
                            </span>
                            <span className="map-edge-chip">
                              <svg className="map-edge-sample" height="8" width="44">
                                <line stroke="#6b8e7f" strokeWidth="1.8" x1="0" x2="44" y1="4" y2="4" />
                              </svg>
                              <span>{t('maps.edgeLegend.custom')}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
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

          {map && !isDetailOpen && (
            <button className="map-detail-toggle" onClick={() => setIsDetailOpen(true)} type="button">
              <span>{t('maps.nodeDetails')}</span>
              <strong>{selectedNode?.label ?? t('maps.selectNode')}</strong>
            </button>
          )}

          <aside className={`map-detail-drawer${isDetailOpen ? ' open' : ''}`} aria-label={t('maps.nodeDetails')} aria-hidden={!isDetailOpen}>
            {!map ? (
              <EmptyState title={t('maps.selectNode')} body={t('maps.selectNodeHint')} />
            ) : selectedNodeIds.size > 0 ? (
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
                    onClick={clearBatchSelection}
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
                            onClick={() => {
                              const next = new Set(selectedNodeIds);
                              next.delete(node.id);
                              setSelectedNodeIds(next);
                            }}
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
                      onClick={() => setConnectTargetMode(true)}
                    >
                      <span>{t('maps.connectToTarget')}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : !selectedNode ? (
              <EmptyState title={t('maps.selectNode')} body={t('maps.selectNodeHint')} />
            ) : (
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
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}
