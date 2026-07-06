/**
 * 能力清单常量：声明知径工作台内置的高级能力及其执行边界。
 *
 * 用于 Settings「能力清单」页与对话区 badge 渲染。
 * 阶段 1 仅硬编码两个能力（roundtable / deep_search），
 * 不引入 SkillRegistry 抽象；待第 3 个能力出现时再抽象。
 *
 * @module constants/capabilities
 * @author fxbin
 */

/**
 * 执行模式枚举。
 * - single_agent_simulation：单 Agent 模拟（非真实并行）
 * - tool_integrated：工具集成（真实工具调用，非模拟）
 */
export const EXECUTION_MODE = Object.freeze({
  SINGLE_AGENT_SIMULATION: 'single_agent_simulation',
  TOOL_INTEGRATED: 'tool_integrated',
});

/**
 * 内置能力清单。
 *
 * 每项字段含义：
 * - id：能力唯一标识，与后端 AgentRole 或工具名对齐
 * - labelKey：能力名称的 i18n key
 * - descriptionKey：能力描述的 i18n key
 * - executionMode：执行模式枚举值
 * - executionModeLabelKey：执行模式标签的 i18n key
 * - boundariesKeys：能力边界条目的 i18n key 数组
 * - futurePlanKey：后续计划的 i18n key
 * - triggerKey：触发方式的 i18n key
 * - showBadge：是否在对话区显示能力边界 badge
 *
 * @type {ReadonlyArray<object>}
 */
export const CAPABILITIES = Object.freeze([
  {
    id: 'roundtable',
    labelKey: 'capabilities.roundtable.label',
    descriptionKey: 'capabilities.roundtable.description',
    executionMode: EXECUTION_MODE.SINGLE_AGENT_SIMULATION,
    executionModeLabelKey: 'capabilities.executionMode.singleAgentSimulation',
    boundariesKeys: [
      'capabilities.roundtable.boundary1',
      'capabilities.roundtable.boundary2',
    ],
    futurePlanKey: 'capabilities.roundtable.futurePlan',
    triggerKey: 'capabilities.roundtable.trigger',
    showBadge: true,
  },
  {
    id: 'deep_search',
    labelKey: 'capabilities.deepSearch.label',
    descriptionKey: 'capabilities.deepSearch.description',
    executionMode: EXECUTION_MODE.TOOL_INTEGRATED,
    executionModeLabelKey: 'capabilities.executionMode.toolIntegrated',
    boundariesKeys: [
      'capabilities.deepSearch.boundary1',
    ],
    futurePlanKey: 'capabilities.deepSearch.futurePlan',
    triggerKey: 'capabilities.deepSearch.trigger',
    showBadge: false,
  },
]);

/**
 * 需要在对话区显示 badge 的能力 id 集合。
 * 由 CAPABILITIES 中 showBadge=true 的项派生，避免散落判断。
 *
 * @type {Set<string>}
 */
export const BADGE_CAPABILITY_IDS = Object.freeze(
  new Set(CAPABILITIES.filter((item) => item.showBadge).map((item) => item.id)),
);
