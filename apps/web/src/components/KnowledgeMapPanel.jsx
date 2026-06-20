/**
 * 知识地图预览面板组件：工作区右侧的地图缩略入口。
 * @module components/KnowledgeMapPanel
 */

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Compass, Loader2, Network } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { buildMapLayout } from '../utils/map';

/**
 * 知识地图预览面板，基于真实地图数据渲染缩略图，点击可跳转到完整地图视图。
 * @param {object} props - 组件属性
 * @param {string|null} props.selectedKnowledgeBaseId - 当前选中的知识库 ID
 * @param {function} props.setView - 视图切换函数
 * @returns {JSX.Element} 地图预览面板
 */
export default function KnowledgeMapPanel({ selectedKnowledgeBaseId, setView }) {
  const { t } = useTranslation();
  const [mapData, setMapData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (!selectedKnowledgeBaseId) {
      setMapData(null);
      setLoadError(null);
      return undefined;
    }

    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);

    fetch(`/api/knowledge-bases/${selectedKnowledgeBaseId}/map`)
      .then((response) => {
        if (!response.ok) throw new Error('Map fetch failed.');
        return response.json();
      })
      .then((data) => {
        if (!cancelled) setMapData(data);
      })
      .catch(() => {
        if (!cancelled) setLoadError(t('workspace.map.error'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedKnowledgeBaseId, t]);

  const layoutNodes = useMemo(() => {
    if (!mapData?.nodes) return [];
    return buildMapLayout(mapData.nodes, mapData.nodePositions ?? {});
  }, [mapData]);

  const edgeList = mapData?.edges ?? [];
  const stats = mapData?.stats ?? { materials: 0, cards: 0, sourcedCards: 0 };

  const handleOpenMap = () => setView('maps');

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleOpenMap();
    }
  };

  const renderThumbnail = () => {
    if (isLoading) {
      return (
        <div className="map-card map-card-state">
          <Loader2 aria-hidden="true" className="spin" size={32} />
          <span>{t('workspace.map.loading')}</span>
        </div>
      );
    }

    if (loadError) {
      return (
        <div className="map-card map-card-state map-card-error">
          <AlertCircle aria-hidden="true" size={32} />
          <span>{loadError}</span>
        </div>
      );
    }

    if (!selectedKnowledgeBaseId || !layoutNodes.length) {
      return (
        <div className="map-card map-card-state">
          <Network aria-hidden="true" size={32} />
          <span>{t('workspace.map.empty')}</span>
        </div>
      );
    }

    return (
      <button
        aria-label={t('workspace.map.explore')}
        className="map-card map-card-live"
        onClick={handleOpenMap}
        onKeyDown={handleKeyDown}
        type="button"
      >
        <svg preserveAspectRatio="xMidYMid meet" viewBox="0 0 1000 800">
          {edgeList.map((edge) => {
            const source = layoutNodes.find((node) => node.id === edge.sourceId);
            const target = layoutNodes.find((node) => node.id === edge.targetId);
            if (!source || !target) return null;
            return (
              <line
                key={edge.id}
                stroke="rgba(44, 95, 141, 0.18)"
                strokeWidth="1.5"
                x1={source.x}
                x2={target.x}
                y1={source.y}
                y2={target.y}
              />
            );
          })}
          {layoutNodes.map((node) => {
            const radius = node.kind === 'knowledge_base' ? 9 : node.kind === 'material' ? 5 : 4;
            const fill = node.kind === 'knowledge_base'
              ? '#2C5F8D'
              : node.kind === 'material'
                ? '#6B8E7F'
                : '#8B6FB0';
            return (
              <circle
                key={node.id}
                cx={node.x}
                cy={node.y}
                fill={fill}
                r={radius}
                stroke="rgba(255, 255, 255, 0.9)"
                strokeWidth="1.5"
              />
            );
          })}
        </svg>
      </button>
    );
  };

  return (
    <aside className="map-panel">
      <div className="section-title">
        <Network aria-hidden="true" size={20} />
        <h3>{t('workspace.knowledgeMap')}</h3>
        <button
          className="map-explore-btn"
          disabled={!selectedKnowledgeBaseId || isLoading || !!loadError}
          onClick={handleOpenMap}
          type="button"
        >
          <Compass aria-hidden="true" size={16} />
          {t('workspace.map.explore')}
        </button>
      </div>
      {renderThumbnail()}
      <div className="map-footer">
        <div>
          <span>{t('workspace.map.nodes')}</span>
          <strong>{layoutNodes.length}</strong>
        </div>
        <div>
          <span>{t('workspace.map.edges')}</span>
          <strong>{edgeList.length}</strong>
        </div>
        <div>
          <span>{t('workspace.map.cards')}</span>
          <strong>{stats.cards}</strong>
        </div>
      </div>
    </aside>
  );
}
