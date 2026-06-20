/**
 * 解析进度时间线组件：展示材料从采集到入库的各阶段进度。
 * @module components/ParseTimeline
 */

import { useTranslation } from 'react-i18next';
import { buildParseTimelineStages, formatMaterialTime } from '../utils/material';

/**
 * 解析进度时间线组件，连续填充已到达的阶段。
 * @param {object} props - 组件属性
 * @param {object} props.item - 材料对象（含 statusTimeline）
 * @returns {JSX.Element|null} 时间线组件
 */
export default function ParseTimeline({ item }) {
  const { t } = useTranslation();
  const stages = buildParseTimelineStages(item);
  const fillIndex = stages.reduce((acc, stage, idx) => (stage.at ? idx : acc), -1);
  const progressed = stages.some((stage, idx) => idx > 0 && stage.at);
  if (!progressed) return null;
  return (
    <div className="parse-timeline" aria-label={t('parseTimeline.title')}>
      {stages.map((stage, idx) => {
        const reached = idx <= fillIndex;
        const current = reached && idx === fillIndex && item.parseStatus !== 'ingested' && !stage.failed;
        const label = t(`parseTimeline.stage.${stage.key}`);
        const tip = stage.at
          ? t('parseTimeline.reachedAt', { label, time: formatMaterialTime(stage.at) })
          : t('parseTimeline.pending', { label });
        const classes = ['parse-stage'];
        if (reached) classes.push('reached');
        if (reached && stage.failed) classes.push('failed');
        if (current) classes.push('current');
        return (
          <div className={classes.join(' ')} key={stage.key}>
            <span className="parse-stage-dot" title={tip} />
            <span className="parse-stage-label">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
