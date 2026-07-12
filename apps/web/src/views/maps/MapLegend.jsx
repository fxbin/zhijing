/**
 * @module views/maps/MapLegend
 * 知识地图图例面板：展示节点类型、状态徽标与边类型说明。
 * @author fxbin
 */

import { getClaimStatusLegend } from '../../utils/map';

/**
 * 知识地图图例面板组件。
 * @param {Object} props - 组件属性
 * @param {boolean} props.isOpen - 图例是否展开
 * @param {Function} props.onToggle - 切换图例展开/收起
 * @param {Function} props.t - i18n 翻译函数
 * @returns {JSX.Element} 图例面板
 */
export default function MapLegend({ isOpen, onToggle, t }) {
  return (
    <div className={`map-legend${isOpen ? ' open' : ''}`}>
      <button
        className="map-legend-toggle"
        onClick={onToggle}
        type="button"
        aria-expanded={isOpen}
        aria-label={t('maps.legendToggle')}
      >
        {t('maps.legendToggle')}
        <span className="map-legend-toggle-icon">{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && (
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
  );
}
