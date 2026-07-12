/**
 * @zhijing/shared 聚合导出。
 *
 * 本文件仅做 re-export，保持对外 API 表面不变。
 * 所有类型与运行时函数已按功能域拆分到 types/ 子目录与 agent-utils.ts。
 *
 * @author fxbin
 */

export * from './types/common.js';
export * from './types/enums.js';
export * from './types/intake.js';
export * from './types/workspace.js';
export * from './types/material.js';
export * from './types/card.js';
export * from './types/chat.js';
export * from './types/proposal.js';
export * from './types/artifact.js';
export * from './types/entity.js';
export * from './types/knowledge-map.js';
export * from './types/insights.js';
export * from './types/socratic.js';
export * from './types/agent-log.js';
export * from './types/attention.js';
export * from './types/topic-coverage.js';
export * from './types/recall.js';
export * from './types/agent-stream.js';
export * from './types/provider-route.js';
export * from './types/user-memory.js';
export * from './types/statistics.js';
export * from './types/weread-quadrant.js';
export * from './types/degrade.js';
export * from './types/truly-read.js';
export * from './types/topic-cluster.js';
export * from './types/verification.js';
export * from './types/hidden-interest.js';
export * from './types/data-portability.js';
export * from './types/audience.js';
export * from './types/model-provider.js';

export { extractAgentMessageText } from './agent-utils.js';
