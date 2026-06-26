import { getEnvApiKey, type KnownProvider } from '@earendil-works/pi-ai';
import type { AgentTaskType, ProviderRoute, RouteResolution } from '@zhijing/shared';
import { createPiAiRuntime, getDefaultPiProvider, getDefaultPiModel, isKnownPiProvider, type PiRuntime } from './index.js';

/**
 * 默认 Provider 路由配置。
 *
 * 设计依据 v1.1 §4.2：以 DeepSeek 为主力，互补 Provider 仅在 DeepSeek 短板场景启用。
 *
 * 当前所有任务都路由到 DeepSeek（主力），deep_research 预留 anthropic 互补路由但
 * 默认不启用（需配置 ANTHROPIC_API_KEY）。互补路由的 fallback 始终是 DeepSeek，
 * 确保外部 Provider 故障不会导致系统不可用。
 *
 * 未来扩展：调用方可通过 createRoutedPiRuntime 的 routesOverride 参数传入自定义路由，
 * 或将此常量迁移到数据库/配置文件驱动。
 *
 * @author fxbin
 */
const DEFAULT_ROUTES: ProviderRoute[] = [
  {
    provider: 'deepseek',
    model: 'deepseek-v4-flash',
    role: 'primary',
    taskTypes: [
      'workspace_skeleton',
      'material_summary',
      'knowledge_cards',
      'question_answer',
      'entity_extraction',
      'conversation',
      'auxiliary_probe',
    ],
    reason: '中文最优，成本极低，结构化输出可靠',
  },
  {
    provider: 'deepseek',
    model: 'deepseek-v4-flash',
    role: 'primary',
    taskTypes: ['socratic_questioning'],
    reason: '推理链思维适合 Socratic 多步追问和证据审计',
  },
  {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    role: 'complementary',
    taskTypes: ['deep_research'],
    reason: '超长文档处理时上下文窗口利用率和指令遵循更稳定',
    fallbackProvider: 'deepseek',
    fallbackModel: 'deepseek-v4-flash',
  },
];

/**
 * 判断指定 Provider 是否有可用的 API key。
 *
 * 主力 Provider（DeepSeek）检查 ZHIJING_PI_API_KEY 或 provider 默认 env key；
 * 互补 Provider 检查其默认 env key（如 ANTHROPIC_API_KEY）。
 *
 * @param provider - Provider id（string 形式，内部转为 KnownProvider）
 * @returns 是否有可用 API key
 * @author fxbin
 */
function hasAvailableApiKey(provider: string): boolean {
  if (!isKnownPiProvider(provider)) {
    return false;
  }
  if (provider === getDefaultPiProvider()) {
    const envKey = process.env.ZHIJING_PI_API_KEY;
    if (envKey && envKey.length > 0) return true;
  }
  const key = getEnvApiKey(provider);
  return Boolean(key && key.length > 0);
}

/**
 * 按任务类型解析 Provider 路由。
 *
 * 解析顺序：
 * 1. 在 routes 中查找 taskTypes 包含目标 taskType 的路由
 * 2. 若命中的是 primary 路由：
 *    - 尊重 ZHIJING_PI_PROVIDER / ZHIJING_PI_MODEL 环境变量覆盖
 *    - env 未设置时用 DEFAULT_ROUTES 中的硬编码值
 * 3. 若命中的是 complementary 路由：
 *    - 检查其 Provider 是否有 API key
 *    - 有：使用该 Provider
 *    - 无：回退到 fallbackProvider/fallbackModel（fellBack=true）
 * 4. 未命中任何路由：回退到默认 Provider/Model（DeepSeek）
 *
 * @param taskType - 任务类型
 * @param routes - 路由配置；省略时使用 DEFAULT_ROUTES
 * @returns 路由解析结果，含最终生效的 Provider/Model
 * @author fxbin
 */
export function routeProvider(
  taskType: AgentTaskType,
  routes: ProviderRoute[] = DEFAULT_ROUTES,
): RouteResolution {
  const matched = routes.find((route) => route.taskTypes.includes(taskType));
  if (!matched) {
    const fallbackProvider = process.env.ZHIJING_PI_PROVIDER ?? getDefaultPiProvider();
    const fallbackModel = process.env.ZHIJING_PI_MODEL ?? getDefaultPiModel();
    return {
      route: {
        provider: getDefaultPiProvider(),
        model: getDefaultPiModel(),
        role: 'primary',
        taskTypes: [taskType],
        reason: '未命中显式路由，回退到默认 Provider',
      },
      resolvedProvider: fallbackProvider,
      resolvedModel: fallbackModel,
      fellBack: false,
    };
  }

  if (matched.role === 'primary') {
    const envProvider = process.env.ZHIJING_PI_PROVIDER;
    const envModel = process.env.ZHIJING_PI_MODEL;
    return {
      route: matched,
      resolvedProvider: envProvider ?? matched.provider,
      resolvedModel: envModel ?? matched.model,
      fellBack: false,
    };
  }

  if (hasAvailableApiKey(matched.provider)) {
    return {
      route: matched,
      resolvedProvider: matched.provider,
      resolvedModel: matched.model,
      fellBack: false,
    };
  }

  const fallbackProvider = matched.fallbackProvider ?? getDefaultPiProvider();
  const fallbackModel = matched.fallbackModel ?? getDefaultPiModel();
  return {
    route: matched,
    resolvedProvider: fallbackProvider,
    resolvedModel: fallbackModel,
    fellBack: true,
  };
}

/**
 * 按任务类型创建经路由的 PiRuntime。
 *
 * 内部调用 routeProvider 解析路由，然后用最终生效的 Provider/Model 创建 PiRuntime。
 * 调用方只需提供 taskType，无需关心 Provider 选择逻辑。
 *
 * @param taskType - 任务类型
 * @param options - 可选配置；routesOverride 传入自定义路由，否则用 DEFAULT_ROUTES
 * @returns 配置完成的 PiRuntime
 * @author fxbin
 */
export function createRoutedPiRuntime(
  taskType: AgentTaskType,
  options: { routesOverride?: ProviderRoute[] } = {},
): PiRuntime {
  const resolution = routeProvider(taskType, options.routesOverride ?? DEFAULT_ROUTES);
  const provider = resolution.resolvedProvider as KnownProvider;
  const model = resolution.resolvedModel;
  const apiKey = resolution.resolvedProvider === getDefaultPiProvider()
    ? (process.env.ZHIJING_PI_API_KEY ?? getEnvApiKey(provider))
    : getEnvApiKey(provider);

  return createPiAiRuntime({
    provider,
    model,
    apiKey,
    enabled: process.env.ZHIJING_PI_ENABLED === '1' ? true : undefined,
    fallbackToMock: process.env.ZHIJING_PI_FALLBACK === '0' ? false : true,
  });
}

/**
 * 导出默认路由配置，供调用方查阅或基于其派生自定义路由。
 */
export { DEFAULT_ROUTES };
