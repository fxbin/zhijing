/**
 * @module views/MapsView
 * 知识地图视图：以 SVG 关系图展示知识库节点与边，并支持节点筛选、搜索与详情查看。
 */

import { useEffect, useState } from 'react';
import { CircleX, RefreshCw, Search } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import {
  mapNodeMatches,
  buildMapLayout,
  truncateNodeLabel,
  mapKindLabel,
  describeNodeStatus,
  describeNodeMetadata,
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
  const STORAGE_KEY_ZOOM = 'zhijing_map_zoom';
  const STORAGE_KEY_FILTER = 'zhijing_map_filter';
  const [map, setMap] = useState(null);
  const [status, setStatus] = useState('选择一个知识库后生成地图。');
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
      setStatus(apiStatus === 'online' ? '选择一个知识库后生成地图。' : 'API 未连接，暂时无法生成知识地图。');
      return;
    }

    let ignore = false;
    async function loadMap() {
      setStatus('Loading knowledge map...');
      try {
        const response = await fetch(`/api/knowledge-bases/${selectedKnowledgeBaseId}/map`);
        if (!response.ok) throw new Error('Map unavailable.');
        const result = await response.json();
        if (!ignore) {
          setMap(result);
          setStatus(result.nodes?.length ? 'Knowledge map synced.' : '当前知识库还没有可生成地图的节点。');
          setSelectedNodeId(result.nodes?.[0]?.id ?? null);
        }
      } catch {
        if (!ignore) {
          setMap(null);
          setStatus('知识地图读取失败，请确认 API 正在运行。');
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
  const visibleNodeIds = new Set(filteredNodes.map((node) => node.id));
  const visibleEdges = edges.filter((edge) => visibleNodeIds.has(edge.sourceId) && visibleNodeIds.has(edge.targetId));
  const layoutNodes = buildMapLayout(filteredNodes);
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
    { key: 'all', label: 'All Nodes', count: nodes.length },
    { key: 'knowledge_base', label: 'Knowledge Base', count: typeCounts.knowledge_base ?? 0 },
    { key: 'material', label: 'Materials', count: typeCounts.material ?? 0 },
    { key: 'card', label: 'Cards', count: typeCounts.card ?? 0 },
  ];

  return (
    <section className="page-main full knowledge-map-page">
      <div className="knowledge-map-shell">
        <header className="knowledge-map-topbar">
          <div className="map-breadcrumb">
            <button aria-label="返回知识库" onClick={() => setView('detail')} type="button"><CircleX size={18} /></button>
            <span>Knowledge Base</span>
            <span>/</span>
            <strong>Full Map</strong>
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
            <input aria-label="搜索地图节点" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search nodes..." />
          </label>
        </header>

        <div className="knowledge-map-board">
          <section className="knowledge-map-canvas" aria-label="完整知识地图">
            {!map ? (
              <div className="map-empty-state">
                <EmptyState title="暂无知识地图" body={status} />
              </div>
            ) : (
              <>
                <div className="map-canvas-heading">
                  <div>
                    <span>Knowledge Map</span>
                    <h2>{selectedNode?.label ?? 'Knowledge Maps'}</h2>
                    <p>{status} Updated {map.generatedAt ? new Date(map.generatedAt).toLocaleTimeString() : 'now'}.</p>
                  </div>
                  <div className="map-stats-strip">
                    <span>{nodes.length} nodes</span>
                    <span>{edges.length} edges</span>
                    <span>{map.stats?.sourcedCards ?? 0} sourced</span>
                  </div>
                </div>

                <div className="map-graph-viewport">
                  <svg aria-label="知识地图关系图" className="map-graph-svg" viewBox="0 0 1000 800" role="img">
                    <g style={{ transform: `scale(${zoom})`, transformOrigin: '500px 400px' }}>
                      {visibleEdges.map((edge) => {
                        const source = layoutNodes.find((node) => node.id === edge.sourceId);
                        const target = layoutNodes.find((node) => node.id === edge.targetId);
                        if (!source || !target) return null;
                        const isActive = selectedNode && (edge.sourceId === selectedNode.id || edge.targetId === selectedNode.id);
                        return (
                          <line
                            className={isActive ? 'map-edge active' : 'map-edge'}
                            key={edge.id}
                            x1={source.x}
                            y1={source.y}
                            x2={target.x}
                            y2={target.y}
                          />
                        );
                      })}
                      {layoutNodes.map((node) => (
                        <g
                          className={node.id === selectedNode?.id ? `map-svg-node ${node.kind} active` : `map-svg-node ${node.kind}`}
                          key={node.id}
                          onClick={() => setSelectedNodeId(node.id)}
                          role="button"
                          tabIndex={0}
                          transform={`translate(${node.x}, ${node.y})`}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') setSelectedNodeId(node.id);
                          }}
                        >
                          <circle r={node.radius} />
                          <text y={node.radius + 18}>{truncateNodeLabel(node.label)}</text>
                        </g>
                      ))}
                    </g>
                  </svg>
                  {layoutNodes.length === 0 && (
                    <div className="map-no-match">
                      <EmptyState title="没有匹配节点" body="换一个关键词或切回 All Nodes 查看完整地图。" />
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
                <div className="map-floating-controls" aria-label="地图缩放控制">
                  <button aria-label="放大" onClick={() => setZoom((value) => Math.min(value + 0.12, 1.36))} type="button">+</button>
                  <button aria-label="重置视图" onClick={() => setZoom(1)} type="button"><RefreshCw size={16} /></button>
                  <button aria-label="缩小" onClick={() => setZoom((value) => Math.max(value - 0.12, 0.76))} type="button">−</button>
                </div>
              </>
            )}
          </section>

          <aside className="map-detail-drawer" aria-label="节点详情">
            {!map || !selectedNode ? (
              <EmptyState title="选择一个节点" body="点击地图里的节点后，这里会展示摘要、来源和关联关系。" />
            ) : (
              <>
                <div className="map-node-detail-head">
                  <span>{mapKindLabel(selectedNode.kind)}</span>
                  <h3>{selectedNode.label}</h3>
                  <p>{selectedNode.summary || '这个节点暂时没有摘要。'}</p>
                </div>
                <div className="map-node-confidence">
                  <div>
                    <span>Status</span>
                    <strong className={`map-status-badge ${statusMeta.tone}`}>{statusMeta.label}</strong>
                  </div>
                  <div>
                    <span>Connections</span>
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
                    <h4>Relations</h4>
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
                          {type === 'all' ? '全部' : type}
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
                          className="relation-item"
                          key={edge.id}
                          onClick={() => other && setSelectedNodeId(other.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(event) => {
                            if ((event.key === 'Enter' || event.key === ' ') && other) setSelectedNodeId(other.id);
                          }}
                        >
                          <span>{edge.relation}</span>
                          <strong>{other?.label ?? edge.targetId}</strong>
                          <p>{isOutgoing ? 'Outgoing relation' : 'Incoming relation'}</p>
                        </article>
                      );
                    })}
                    {selectedRelations.length === 0 && <EmptyState title="暂无关系" body="导入资料并生成卡片后，会出现来源关系。" />}
                    {selectedRelations.length > 0 && visibleRelations.length === 0 && (
                      <EmptyState title="无匹配关系" body="切换过滤条件查看更多关系。" />
                    )}
                  </div>
                </section>
                <div className="map-drawer-actions">
                  <button onClick={() => setView(selectedNode.kind === 'material' ? 'library' : 'detail')} type="button">Open context</button>
                  <button type="button" onClick={() => setRelationEditor({ targetId: '', relation: 'related_to' })}>Add relation</button>
                </div>
                {relationEditor && (
                  <div className="map-relation-editor">
                    <h4>添加关系</h4>
                    <label>
                      <span>目标节点</span>
                      <select
                        value={relationEditor.targetId}
                        onChange={(event) => setRelationEditor((current) => ({ ...current, targetId: event.target.value }))}
                      >
                        <option value="">选择节点...</option>
                        {nodes.filter((node) => node.id !== selectedNode.id).map((node) => (
                          <option key={node.id} value={node.id}>{node.label}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>关系类型</span>
                      <select
                        value={relationEditor.relation}
                        onChange={(event) => setRelationEditor((current) => ({ ...current, relation: event.target.value }))}
                      >
                        <option value="related_to">related_to</option>
                        <option value="derived_from">derived_from</option>
                        <option value="supports">supports</option>
                        <option value="contradicts">contradicts</option>
                      </select>
                    </label>
                    <div className="map-relation-editor-actions">
                      <button type="button" onClick={() => setRelationEditor(null)}>取消</button>
                      <button
                        type="button"
                        disabled={!relationEditor.targetId}
                        onClick={() => {
                          setStatus(`关系编辑功能需要后端 API 支持，已记录：${selectedNode.label} → ${relationEditor.relation} → ${nodes.find((n) => n.id === relationEditor.targetId)?.label ?? ''}`);
                          setRelationEditor(null);
                        }}
                      >
                        保存
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
