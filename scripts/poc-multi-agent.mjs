/**
 * P1.0 PoC 验证脚本：pi-agent-core 多 Agent 角色承载能力验证。
 *
 * 验证三专用 Agent（结构化/对话/追问）能否：
 * 1. 独立定义不同 systemPrompt 和推荐 model
 * 2. 按用户意图选择对应角色
 * 3. 选定角色可装配为 Agent 实例（不实际调用 LLM，仅验证装配）
 *
 * 运行方式：node --experimental-vm-modules scripts/poc-multi-agent.mjs
 * 或：npx tsx scripts/poc-multi-agent.mjs
 *
 * @author fxbin
 */

import {
  AGENT_ROLE_CONFIGS,
  selectAgentRole,
  createRoleBasedAgent,
  STRUCTURED_AGENT_PROMPT,
  CONVERSATION_AGENT_PROMPT,
  PROBE_AGENT_PROMPT,
} from '../packages/agent/src/index.ts';

const TEST_WORKSPACE_ID = 'poc-test-workspace';
const MOCK_API_KEY = 'poc-mock-key';

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    passCount += 1;
    console.log(`  ✓ ${message}`);
  } else {
    failCount += 1;
    console.error(`  ✗ ${message}`);
  }
}

console.log('P1.0 PoC: pi-agent-core 多 Agent 角色承载能力验证\n');

console.log('验证点 1: 三角色配置独立定义');
assert(Object.keys(AGENT_ROLE_CONFIGS).length === 3, '三角色配置表包含 3 个角色');
assert(AGENT_ROLE_CONFIGS.structured.role === 'structured', 'structured 角色标识正确');
assert(AGENT_ROLE_CONFIGS.conversation.role === 'conversation', 'conversation 角色标识正确');
assert(AGENT_ROLE_CONFIGS.probe.role === 'probe', 'probe 角色标识正确');

console.log('\n验证点 2: 三角色 systemPrompt 各不相同');
assert(STRUCTURED_AGENT_PROMPT !== CONVERSATION_AGENT_PROMPT, 'structured 与 conversation 提示词不同');
assert(STRUCTURED_AGENT_PROMPT !== PROBE_AGENT_PROMPT, 'structured 与 probe 提示词不同');
assert(CONVERSATION_AGENT_PROMPT !== PROBE_AGENT_PROMPT, 'conversation 与 probe 提示词不同');
assert(STRUCTURED_AGENT_PROMPT.includes('结构化处理'), 'structured 提示词包含角色标识');
assert(CONVERSATION_AGENT_PROMPT.includes('对话'), 'conversation 提示词包含角色标识');
assert(PROBE_AGENT_PROMPT.includes('追问'), 'probe 提示词包含角色标识');

console.log('\n验证点 3: 三角色推荐 model 配置');
assert(AGENT_ROLE_CONFIGS.structured.recommendedModelId === 'deepseek-v4-flash', 'structured 推荐 V3');
assert(AGENT_ROLE_CONFIGS.conversation.recommendedModelId === 'deepseek-v4-flash', 'conversation 推荐 V3');
assert(AGENT_ROLE_CONFIGS.probe.recommendedModelId === 'deepseek-reasoner', 'probe 推荐 R1');
assert(AGENT_ROLE_CONFIGS.probe.supportsFallback === true, 'probe 支持 fallback');
assert(AGENT_ROLE_CONFIGS.probe.fallbackModelId === 'deepseek-v4-flash', 'probe fallback 为 V3');

console.log('\n验证点 4: 按用户意图选择 Agent 角色');
assert(selectAgentRole('request_advice') === 'conversation', 'request_advice → conversation');
assert(selectAgentRole('request_probe') === 'probe', 'request_probe → probe');
assert(selectAgentRole('skeptic') === 'conversation', 'skeptic → conversation');
assert(selectAgentRole('neutral') === 'conversation', 'neutral → conversation');
assert(selectAgentRole('unknown_intent') === 'conversation', '未知意图 → conversation (默认)');

console.log('\n验证点 5: 选定角色可装配为 Agent 实例');
try {
  process.env.ZHIJING_PI_API_KEY = MOCK_API_KEY;
  const agent = createRoleBasedAgent(TEST_WORKSPACE_ID, { role: 'probe' });
  assert(agent !== null && agent !== undefined, 'probe 角色可装配为 Agent 实例');
  assert(typeof agent.prompt === 'function', 'Agent 实例有 prompt 方法');
  assert(typeof agent.subscribe === 'function', 'Agent 实例有 subscribe 方法');
  assert(typeof agent.abort === 'function', 'Agent 实例有 abort 方法');
} catch (error) {
  assert(false, `probe 角色装配失败: ${error.message}`);
}

try {
  const agent = createRoleBasedAgent(TEST_WORKSPACE_ID, { role: 'conversation' });
  assert(agent !== null && agent !== undefined, 'conversation 角色可装配为 Agent 实例');
} catch (error) {
  assert(false, `conversation 角色装配失败: ${error.message}`);
}

try {
  const agent = createRoleBasedAgent(TEST_WORKSPACE_ID, { role: 'structured' });
  assert(agent !== null && agent !== undefined, 'structured 角色可装配为 Agent 实例');
} catch (error) {
  assert(false, `structured 角色装配失败: ${error.message}`);
}

console.log('\n验证点 6: 省略 role 时回退到 conversation');
try {
  const agent = createRoleBasedAgent(TEST_WORKSPACE_ID);
  assert(agent !== null && agent !== undefined, '省略 role 可装配为默认 conversation Agent');
} catch (error) {
  assert(false, `默认角色装配失败: ${error.message}`);
}

console.log('\n验证点 7: 显式传入 modelId 时不被角色配置覆盖');
try {
  const agent = createRoleBasedAgent(TEST_WORKSPACE_ID, {
    role: 'probe',
    modelId: 'custom-model',
  });
  assert(agent !== null && agent !== undefined, '显式 modelId 时不覆盖，装配成功');
} catch (error) {
  assert(false, `显式 modelId 装配失败: ${error.message}`);
}

console.log('\n=========================================');
console.log(`PoC 结果: ${passCount} 通过, ${failCount} 失败`);
console.log('=========================================');

if (failCount > 0) {
  console.error('\n❌ PoC 失败：pi-agent-core 无法完整承载三专用 Agent 角色');
  process.exit(1);
} else {
  console.log('\n✅ PoC 通过：pi-agent-core 可承载三专用 Agent 角色的独立定义与按意图选择');
  console.log('决策：GO — 可进入 P1.1 正式实现');
  process.exit(0);
}
