/**
 * @zhijing/agent —— 知径工作区 Agent 装配层
 *
 * 职责：基于 @earendil-works/pi-agent-core 装配可即用的 Agent 实例，
 * 注入工作区检索工具集与知径默认系统提示词，
 * 并复用 pi-runtime 同源的环境变量配置。
 *
 * @author fxbin
 */

export { createWorkspaceAgent, ZHIJING_AGENT_SYSTEM_PROMPT } from './agent-factory.js';
export type { WorkspaceAgentOptions } from './agent-factory.js';

export {
  createWorkspaceTools,
  createSearchCardsTool,
  createSearchMaterialsTool,
  createGetWorkspaceSummaryTool,
} from './tools/index.js';

export type {
  SearchCardsDetails,
} from './tools/search-cards.js';
export type {
  SearchMaterialsDetails,
} from './tools/search-materials.js';

export {
  selectOrchestratorSystemPrompt,
  createOrchestratedWorkspaceAgent,
  ORCHESTRATOR_BASE_PROMPT,
  MIRROR_BEHAVIOR_PROMPT,
  CATALYST_BEHAVIOR_PROMPT,
  NAVIGATOR_BEHAVIOR_PROMPT,
} from './orchestrator-integration.js';
export type { OrchestratedAgentOptions } from './orchestrator-integration.js';

export {
  AGENT_ROLE_CONFIGS,
  selectAgentRole,
  createRoleBasedAgent,
  STRUCTURED_AGENT_PROMPT,
  CONVERSATION_AGENT_PROMPT,
  PROBE_AGENT_PROMPT,
} from './multi-agent-orchestrator.js';
export type { AgentRole, AgentRoleConfig, MultiAgentOptions } from './multi-agent-orchestrator.js';
