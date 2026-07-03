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
 * P2.3 扩展：支持通过 ZHIJING_PI_ROUTES_JSON 环境变量覆盖默认路由表，
 * 格式为 ProviderRoute[] 的 JSON 字符串。解析失败时回退到 DEFAULT_ROUTES 并输出警告。
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
 * 环境变量名：覆盖默认路由表的 JSON 字符串。
 *
 * 格式为 ProviderRoute[] 的 JSON，例如：
 *   [{"provider":"deepseek","model":"deepseek-v4-flash","role":"primary",
 *     "taskTypes":["conversation"],"reason":"自定义路由"}]
 *
 * 解析失败或未设置时回退到 DEFAULT_ROUTES。
 */
const ROUTES_JSON_ENV = 'ZHIJING_PI_ROUTES_JSON';

/**
 * 解析环境变量覆盖的路由表。
 *
 * 读取 ZHIJING_PI_ROUTES_JSON 环境变量，解析为 ProviderRoute[]。
 * 解析失败时输出 stderr 警告并返回 null，调用方回退到 DEFAULT_ROUTES。
 *
 * @returns 解析成功返回路由数组；未设置或解析失败返回 null
 * @author fxbin
 */
function parseEnvRoutes(): ProviderRoute[] | null {
  const raw = process.env[ROUTES_JSON_ENV];
  if (!raw || raw.trim().length === 0) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error('routes JSON must be an array');
    }
    return parsed as ProviderRoute[];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[pi-runtime] Failed to parse ${ROUTES_JSON_ENV}: ${message}. Falling back to DEFAULT_ROUTES.`);
    return null;
  }
}

/**
 * 当前生效的路由表。
 *
 * 优先使用 ZHIJING_PI_ROUTES_JSON 环境变量覆盖，未设置或解析失败时回退到 DEFAULT_ROUTES。
 * 模块加载时解析一次，运行时不再重复读取。
 */
const ACTIVE_ROUTES: ProviderRoute[] = parseEnvRoutes() ?? DEFAULT_ROUTES;

/**
 * Settings 配置的激活 Profile 快照。
 * 由 core 层在 applyModelProviderConfig 时推送，优先级高于环境变量。
 */
interface ActiveProfileSnapshot {
  provider: string;
  model: string;
  baseUrl?: string;
  apiKey?: string;
}

/**
 * 当前激活的 Profile 快照；null 表示未配置，回退到环境变量。
 */
let activeProfile: ActiveProfileSnapshot | null = null;

/**
 * 设置当前激活的 Profile 快照。
 *
 * core 层在 Settings Profile 变更或初始化时调用，使 routeProvider
 * 与 createRoutedPiRuntime 优先读取 Settings 配置而非环境变量。
 *
 * @param profile - Profile 快照；传 null 清除并回退到环境变量
 * @author fxbin
 */
export function setActiveProfile(profile: ActiveProfileSnapshot | null): void {
  activeProfile = profile;
}

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
 *    - env 未设置时用路由表中的硬编码值
 * 3. 若命中的是 complementary 路由：
 *    - 检查其 Provider 是否有 API key
 *    - 有：使用该 Provider
 *    - 无：回退到 fallbackProvider/fallbackModel（fellBack=true）
 * 4. 未命中任何路由：回退到默认 Provider/Model（DeepSeek）
 *
 * @param taskType - 任务类型
 * @param routes - 路由配置；省略时使用当前生效路由表（ACTIVE_ROUTES）
 * @returns 路由解析结果，含最终生效的 Provider/Model
 * @author fxbin
 */
export function routeProvider(
  taskType: AgentTaskType,
  routes: ProviderRoute[] = ACTIVE_ROUTES,
): RouteResolution {
  const envBaseUrl = process.env.ZHIJING_PI_BASE_URL;
  const matched = routes.find((route) => route.taskTypes.includes(taskType));
  if (!matched) {
    const fallbackProvider = activeProfile?.provider ?? process.env.ZHIJING_PI_PROVIDER ?? getDefaultPiProvider();
    const fallbackModel = activeProfile?.model ?? process.env.ZHIJING_PI_MODEL ?? getDefaultPiModel();
    const fallbackBaseUrl = activeProfile?.baseUrl ?? envBaseUrl;
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
      resolvedBaseUrl: fallbackBaseUrl,
      fellBack: false,
    };
  }

  if (matched.role === 'primary') {
    const envProvider = process.env.ZHIJING_PI_PROVIDER;
    const envModel = process.env.ZHIJING_PI_MODEL;
    return {
      route: matched,
      resolvedProvider: activeProfile?.provider ?? envProvider ?? matched.provider,
      resolvedModel: activeProfile?.model ?? envModel ?? matched.model,
      resolvedBaseUrl: activeProfile?.baseUrl ?? envBaseUrl,
      fellBack: false,
    };
  }

  if (hasAvailableApiKey(matched.provider)) {
    return {
      route: matched,
      resolvedProvider: matched.provider,
      resolvedModel: matched.model,
      resolvedBaseUrl: activeProfile?.baseUrl ?? envBaseUrl,
      fellBack: false,
    };
  }

  const fallbackProvider = matched.fallbackProvider ?? getDefaultPiProvider();
  const fallbackModel = matched.fallbackModel ?? getDefaultPiModel();
  return {
    route: matched,
    resolvedProvider: fallbackProvider,
    resolvedModel: fallbackModel,
    resolvedBaseUrl: activeProfile?.baseUrl ?? envBaseUrl,
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
  const resolution = routeProvider(taskType, options.routesOverride ?? ACTIVE_ROUTES);
  const provider = resolution.resolvedProvider as KnownProvider;
  const model = resolution.resolvedModel;
  const apiKey = activeProfile?.apiKey
    ?? (resolution.resolvedProvider === getDefaultPiProvider()
      ? (process.env.ZHIJING_PI_API_KEY ?? getEnvApiKey(provider))
      : getEnvApiKey(provider));

  return createPiAiRuntime({
    provider,
    model,
    apiKey,
    enabled: process.env.ZHIJING_PI_ENABLED === '1' ? true : undefined,
    fallbackToMock: process.env.ZHIJING_PI_FALLBACK === '0' ? false : true,
  });
}

/**
 * 返回当前生效的路由表。
 *
 * 优先返回环境变量覆盖的路由（若已设置且解析成功），否则返回 DEFAULT_ROUTES。
 * 供 API 层 /dashboard 透明化展示当前路由配置。
 *
 * @returns 当前生效的 ProviderRoute 数组
 * @author fxbin
 */
export function getActiveRoutes(): ProviderRoute[] {
  return ACTIVE_ROUTES;
}

/**
 * 返回路由表是否被环境变量覆盖。
 *
 * 供 API 层标注当前路由来源（内置默认 vs 环境变量覆盖）。
 *
 * @returns true 表示当前路由来自 ZHIJING_PI_ROUTES_JSON 环境变量
 * @author fxbin
 */
export function isRoutesOverriddenByEnv(): boolean {
  return ACTIVE_ROUTES !== DEFAULT_ROUTES;
}

/**
 * 导出默认路由配置，供调用方查阅或基于其派生自定义路由。
 */
export { DEFAULT_ROUTES };
