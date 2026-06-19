/**
 * 解析进度时间线组件：展示材料从采集到入库的各阶段进度。
 * @module components/ParseTimeline
 */

import { buildParseTimelineStages, formatMaterialTime } from '../utils/material';

/**
 * 解析进度时间线组件，连续填充已到达的阶段。
 * @param {object} props - 组件属性
 * @param {object} props.item - 材料对象（含 statusTimeline）
 * @returns {JSX.Element|null} 时间线组件
 */
export default function ParseTimeline({ item }) {
  const stages = buildParseTimelineStages(item);
  const fillIndex = stages.reduce((acc, stage, idx) => (stage.at ? idx : acc), -1);
  const progressed = stages.some((stage, idx) => idx > 0 && stage.at);
  if (!progressed) return null;
  return (
    <div className="parse-timeline" aria-label="解析进度时间线">
      {stages.map((stage, idx) => {
        const reached = idx <= fillIndex;
        const current = reached && idx === fillIndex && item.parseStatus !== 'ingested' && !stage.failed;
        const tip = stage.at ? `${stage.label}：${formatMaterialTime(stage.at)}` : `${stage.label}：待处理`;
        const classes = ['parse-stage'];
        if (reached) classes.push('reached');
        if (reached && stage.failed) classes.push('failed');
        if (current) classes.push('current');
        return (
          <div className={classes.join(' ')} key={stage.key}>
            <span className="parse-stage-dot" title={tip} />
            <span className="parse-stage-label">{stage.label}</span>
          </div>
        );
      })}
    </div>
  );
}
