/**
 * 标签常量：卡片类型、解析阶段、修订字段等显示标签。
 * @module constants/labels
 */

export const PARSE_STAGE_LABELS = {
  captured: '采集',
  queued: '排队',
  parsing: '解析',
  review: '复核',
  ingested: '入库',
};

export const REVISION_FIELD_LABELS = {
  title: '标题',
  body: '正文',
  type: '类型',
  claimStatus: '溯源状态',
};

export const typeLabels = {
  link: 'Link',
  text: 'Text',
  question: 'Question',
  topic: 'Topic',
};

export const statusLabels = {
  saved: 'Saved',
  parsing: 'Parsing',
  needs_review: 'Review',
  ingested: 'Ingested',
  failed: 'Failed',
};
