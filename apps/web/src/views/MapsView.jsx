/**
 * @module views/MapsView
 * 知识地图视图：以 SVG 关系图展示工作区节点与边，并支持节点筛选、搜索与详情查看。
 */

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CircleX, Search, X } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import api from '../utils/api';
import { mapNodeMatches, buildMapLayout, describeNodeStatus, describeNodeMetadata } from '../utils/map';
import {
  MAP_BASE_WIDTH,
  MAP_BASE_HEIGHT,
  MAP_MIN_ZOOM,
  MAP_MAX_ZOOM,
  MAP_CLICK_DRAG_THRESHOLD,
  MAP_RELATION_TARGET_PADDING,
  STORAGE_KEY_FILTER,
  buildFilterOptions,
  buildRelationTypeLabelMap,
  buildEditableRelationOptions,
} from './maps/constants';
import MapCanvas from './maps/MapCanvas';
import MapBatchPanel from './maps/MapBatchPanel';
import MapNodeDetail from './maps/MapNodeDetail';

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
  const [map, setMap] = useState(null);
  const [status, setStatus] = useState(t('maps.status.selectWorkspace'));
  const [query, setQuery] = useState('');
  const [nodeFilter, setNodeFilter] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_FILTER) || 'all';
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
      localStorage.setItem(STORAGE_KEY_FILTER, nodeFilter);
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
  const filterOptions = buildFilterOptions(typeCounts, t);
  const relationTypeLabelMap = buildRelationTypeLabelMap(t);
  const editableRelationOptions = buildEditableRelationOptions(t);
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
          <MapCanvas
            map={map}
            status={status}
            viewState={viewState}
            setViewState={setViewState}
            dragState={dragState}
            panState={panState}
            selectionBox={selectionBox}
            relationDragState={relationDragState}
            hoveredNodeId={hoveredNodeId}
            setHoveredNodeId={setHoveredNodeId}
            selectedNode={selectedNode}
            selectedNodeId={selectedNodeId}
            setSelectedNodeId={setSelectedNodeId}
            setIsDetailOpen={setIsDetailOpen}
            selectedNodeIds={selectedNodeIds}
            connectTargetMode={connectTargetMode}
            searchMatches={searchMatches}
            layoutNodes={layoutNodes}
            visibleEdges={visibleEdges}
            edges={edges}
            nodes={nodes}
            visibleNodeCopy={visibleNodeCopy}
            hiddenNodeCount={hiddenNodeCount}
            isLegendOpen={isLegendOpen}
            setIsLegendOpen={setIsLegendOpen}
            setRelationTypePicker={setRelationTypePicker}
            setConnectTargetMode={setConnectTargetMode}
            clearBatchSelection={clearBatchSelection}
            handleWheel={handleWheel}
            handleCanvasPointerDown={handleCanvasPointerDown}
            handlePointerMove={handlePointerMove}
            handlePointerUp={handlePointerUp}
            handleNodePointerDown={handleNodePointerDown}
            handleConnectHandlePointerDown={handleConnectHandlePointerDown}
            resetView={resetView}
            t={t}
          />

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
              <MapBatchPanel
                selectedNodeIds={selectedNodeIds}
                layoutNodes={layoutNodes}
                onRemoveNode={(nodeId) => {
                  const next = new Set(selectedNodeIds);
                  next.delete(nodeId);
                  setSelectedNodeIds(next);
                }}
                onClear={clearBatchSelection}
                onConnectToTarget={() => setConnectTargetMode(true)}
                t={t}
              />
            ) : !selectedNode ? (
              <EmptyState title={t('maps.selectNode')} body={t('maps.selectNodeHint')} />
            ) : (
              <MapNodeDetail
                selectedNode={selectedNode}
                statusMeta={statusMeta}
                nodeMetadataItems={nodeMetadataItems}
                connectedNodeCount={connectedNodeCount}
                selectedRelations={selectedRelations}
                visibleRelations={visibleRelations}
                relationTypes={relationTypes}
                relationFilter={relationFilter}
                setRelationFilter={setRelationFilter}
                hasVisibleSourceMaterial={hasVisibleSourceMaterial}
                sourceMaterialId={sourceMaterialId}
                nodes={nodes}
                setNodeFilter={setNodeFilter}
                setSelectedNodeId={setSelectedNodeId}
                setView={setView}
                onOpenChat={onOpenChat}
                startConnectTargetMode={startConnectTargetMode}
                deleteCustomEdge={deleteCustomEdge}
                layoutNodes={layoutNodes}
                relationTypePicker={relationTypePicker}
                setRelationTypePicker={setRelationTypePicker}
                saveBatchRelations={saveBatchRelations}
                relationTypeLabelMap={relationTypeLabelMap}
                editableRelationOptions={editableRelationOptions}
                setIsDetailOpen={setIsDetailOpen}
                t={t}
              />
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}
