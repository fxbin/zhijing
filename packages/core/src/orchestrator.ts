/**
 * 编排 Agent 核心逻辑层 barrel re-export。
 *
 * 实现「镜子不保姆」理念的三模式切换：
 * 1. 信号聚合：将 AttentionSignal（用户行为）+ AgentProposal（Agent 提议）聚合为统一摘要
 * 2. 模式选择：基于聚合信号的强度和类型选择 mirror/catalyst/navigator
 * 3. 约束评估：检查体验约束（不打断、不超量、有来源才声称）
 *
 * 本文件为纯逻辑层 barrel：物理实现已拆分至 ./orchestrator/ 子目录，
 * 保持对外 API 表面不变，下游 `from './orchestrator.js'` 仍解析到此入口。
 * 入口函数 buildOrchestratorDecision 在 index.ts 中做薄包装。
 *
 * 拆分结构：
 * - signal-aggregator：信号聚合 + 体验约束常量
 * - proposal-filter：模式选择 + 约束评估 + 提议筛选 + 决策构建
 * - user-intent：用户消息意图识别 + 前置拦截器
 * - tool-result-intent：工具结果意图识别 + 流中拦截器
 *
 * @module orchestrator
 * @author fxbin
 */

export * from './orchestrator/signal-aggregator.js';
export * from './orchestrator/proposal-filter.js';
export * from './orchestrator/user-intent.js';
export * from './orchestrator/tool-result-intent.js';
