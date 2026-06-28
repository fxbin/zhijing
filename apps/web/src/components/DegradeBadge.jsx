/**
 * 降级徽标组件（NS-6）。
 *
 * 实现圆桌 R6 共识：派生指标在被关闭维度后，**禁止悄悄补默认值**，
 * 必须以「灰色缺角 + tooltip 三要素」的形式向用户声明置信度状态。
 *
 * 三档行为渲染策略：
 * - normal   正常渲染 children
 * - degraded children 外包一层灰色缺角，hover 显示 tooltip 三要素
 * - hidden   不渲染 children，改为「已隐藏」占位 + tooltip
 *
 * tooltip 三要素：缺失什么 / 为什么重要 / 如何恢复
 *
 * @module components/DegradeBadge
 * @author fxbin
 */

import { Fragment } from 'react';

/**
 * 渲染 tooltip 三要素面板。
 * @param {object} tooltip DegradeAssessment.tooltip
 * @returns {JSX.Element}
 */
function DegradeTooltip({ tooltip }) {
  if (!tooltip) return null;
  return (
    <div className="degrade-tooltip" role="tooltip">
      <p className="degrade-tooltip-row degrade-tooltip-missing">
        {tooltip.whatIsMissing}
      </p>
      <p className="degrade-tooltip-row degrade-tooltip-why">
        {tooltip.whyItMatters}
      </p>
      <p className="degrade-tooltip-row degrade-tooltip-restore">
        {tooltip.howToRestore}
      </p>
    </div>
  );
}

/**
 * 降级徽标。
 *
 * @param {object} props
 * @param {object} [props.assessment] DegradeAssessment；为空或 behavior=normal 时直接透传 children
 * @param {string} [props.metricLabel] 展示名（hidden 占位用）
 * @param {number} [props.confidence] 置信度 0-1，可选展示
 * @param {React.ReactNode} [props.children] 被包裹的派生指标内容
 * @returns {JSX.Element}
 */
export default function DegradeBadge({ assessment, metricLabel, confidence, children }) {
  const behavior = assessment?.behavior ?? 'normal';

  if (behavior === 'normal') {
    return <Fragment>{children}</Fragment>;
  }

  const tooltip = assessment?.tooltip;
  const confidenceLabel =
    typeof confidence === 'number'
      ? `${Math.round(confidence * 100)}%`
      : typeof assessment?.confidence === 'number'
        ? `${Math.round(assessment.confidence * 100)}%`
        : null;

  if (behavior === 'hidden') {
    return (
      <span className="degrade-badge is-hidden" tabIndex={0} aria-label="该指标已隐藏">
        <span className="degrade-badge-corner" aria-hidden="true">∅</span>
        <span className="degrade-badge-label">
          {metricLabel || '该指标'} 已隐藏
        </span>
        {confidenceLabel ? (
          <span className="degrade-badge-conf">置信度 {confidenceLabel}</span>
        ) : null}
        <DegradeTooltip tooltip={tooltip} />
      </span>
    );
  }

  return (
    <span className="degrade-badge is-degraded" tabIndex={0} aria-label="该指标已降级">
      <span className="degrade-badge-content">{children}</span>
      <span className="degrade-badge-corner" aria-hidden="true">▲</span>
      {confidenceLabel ? (
        <span className="degrade-badge-conf">置信度 {confidenceLabel}</span>
      ) : null}
      <DegradeTooltip tooltip={tooltip} />
    </span>
  );
}
