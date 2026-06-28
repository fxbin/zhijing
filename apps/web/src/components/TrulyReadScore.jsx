/**
 * 真读过置信度展示组件（NS-3）。
 *
 * 红线（圆桌 R3）：
 * - 必须展示 N%，禁止布尔化「读过/没读过」
 * - 分维度拆解可视化（划线/笔记/书评/覆盖率）
 * - 降级时用 DegradeBadge 包裹，声明缺失维度
 * - 时间衰减以「最近活跃」副标签呈现
 *
 * @module components/TrulyReadScore
 * @author fxbin
 */

import DegradeBadge from './DegradeBadge';

/**
 * 单条维度进度条。
 * @param {object} props
 * @param {string} props.label 维度名
 * @param {number} props.value 饱和值 [0,1]
 * @param {string} [props.hint] 辅助说明
 * @returns {JSX.Element}
 */
function DimBar({ label, value, hint }) {
  const percent = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className="truly-read-dim">
      <div className="truly-read-dim-head">
        <span className="truly-read-dim-label">{label}</span>
        <span className="truly-read-dim-value">{percent}%</span>
      </div>
      <div className="truly-read-dim-track">
        <div className="truly-read-dim-fill" style={{ width: `${percent}%` }} />
      </div>
      {hint ? <p className="truly-read-dim-hint">{hint}</p> : null}
    </div>
  );
}

/**
 * 真读过置信度卡片。
 *
 * @param {object} props
 * @param {object} [props.score] TrulyReadScore；为空时展示骨架/空态
 * @param {object} [props.degradeAssessment] 降级评估（DegradeAssessment）
 * @param {boolean} [props.loading] 加载态
 * @param {string} [props.bookTitle] 书名（标题展示用）
 * @param {() => void} [props.onVerify] 点击「轻校验」回调
 * @returns {JSX.Element}
 */
export default function TrulyReadScore({ score, degradeAssessment, loading, bookTitle, onVerify }) {
  if (loading && !score) {
    return (
      <div className="truly-read-card is-loading">
        <div className="truly-read-skeleton" aria-label="加载中" />
      </div>
    );
  }

  if (!score) {
    return (
      <div className="truly-read-card is-empty">
        <p className="truly-read-empty-text">暂无真读过置信度数据</p>
      </div>
    );
  }

  const confidencePercent = Math.round(score.confidence * 100);
  const dims = score.dimBreakdown ?? { highlight: 0, note: 0, review: 0, coverage: 0 };
  const behavior = degradeAssessment?.behavior ?? 'normal';
  const hasVerification = typeof score.subjectiveRate === 'number' && score.subjectiveRate > 0;
  const daysSinceActivity = score.timeDecayFactor > 0
    ? Math.round(Math.log(score.timeDecayFactor) / -0.0028)
    : null;

  return (
    <DegradeBadge
      assessment={degradeAssessment}
      metricLabel="真读过置信度"
      confidence={degradeAssessment?.confidence ?? score.confidence}
    >
      <div className={`truly-read-card behavior-${behavior}`}>
        <div className="truly-read-header">
          <div className="truly-read-title-block">
            <h4 className="truly-read-title">
              真读过置信度
              {bookTitle ? <span className="truly-read-book">{bookTitle}</span> : null}
            </h4>
            {behavior !== 'normal' ? (
              <span className="truly-read-behavior-tag">{behavior === 'hidden' ? '已隐藏' : '已降级'}</span>
            ) : null}
          </div>
          <div className="truly-read-percent" aria-label={`真读过置信度 ${confidencePercent}%`}>
            {confidencePercent}%
          </div>
        </div>

        <div className="truly-read-dims">
          <DimBar label="划线深度" value={dims.highlight} hint="划线数量饱和值" />
          <DimBar label="笔记深度" value={dims.note} hint="笔记字符量（权重最高）" />
          <DimBar label="长书评" value={dims.review} hint="独立长评强信号" />
          <DimBar label="章节覆盖" value={dims.coverage} hint="已读章节占比" />
        </div>

        <div className="truly-read-footer">
          <div className="truly-read-meta">
            {hasVerification ? (
              <span className="truly-read-meta-chip is-verified">
                轻校验通过 {Math.round(score.subjectiveRate * 100)}%
              </span>
            ) : (
              <span className="truly-read-meta-chip">未校验</span>
            )}
            {daysSinceActivity !== null ? (
              <span className="truly-read-meta-chip">
                最近活跃约 {daysSinceActivity} 天前
              </span>
            ) : null}
            {score.degradeConfidence < 1 ? (
              <span className="truly-read-meta-chip is-degraded-chip">
                降级置信 {Math.round(score.degradeConfidence * 100)}%
              </span>
            ) : null}
          </div>
          {typeof onVerify === 'function' ? (
            <button type="button" className="truly-read-verify-btn" onClick={onVerify}>
              {hasVerification ? '重新轻校验' : '开始轻校验'}
            </button>
          ) : null}
        </div>
      </div>
    </DegradeBadge>
  );
}
