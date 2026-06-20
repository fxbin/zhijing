/**
 * 标签常量：解析阶段、修订字段等显示标签的 i18n 键。
 * 实际渲染时通过 t(key) 获取本地化文本。
 * @module constants/labels
 */

export const PARSE_STAGE_LABELS = {
  captured: 'parseTimeline.stage.captured',
  queued: 'parseTimeline.stage.queued',
  parsing: 'parseTimeline.stage.parsing',
  review: 'parseTimeline.stage.review',
  ingested: 'parseTimeline.stage.ingested',
};

export const REVISION_FIELD_LABELS = {
  title: 'recall.revisionField.title',
  body: 'recall.revisionField.body',
  type: 'recall.revisionField.type',
  claimStatus: 'recall.revisionField.claimStatus',
};

export const statusLabels = {
  saved: 'parseStatus.saved',
  parsing: 'parseStatus.parsing',
  needs_review: 'parseStatus.needs_review',
  ingested: 'parseStatus.ingested',
  failed: 'parseStatus.failed',
};
