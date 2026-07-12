/**
 * pi-runtime 包入口（barrel re-export）。
 *
 * 对外 API 表面保持不变：所有原本从 ./index.js 导入的下游文件零破坏。
 * 内部按功能域拆为 8 个子模块（schemas / types / title-utils / json-utils /
 * provider-registry / validators / mock-outputs / runtime-factory），
 * 外加已有的 router / advisor / instrumented 三个独立模块。
 *
 * @author fxbin
 */

export { Type } from '@earendil-works/pi-ai';
export type { KnownProvider, TSchema, Tool } from '@earendil-works/pi-ai';

export {
  citationScopeSchema,
  knowledgeCardSchema,
  knowledgeCardsSchema,
  topicSkeletonSchema,
  materialSummarySchema,
  questionAnswerSchema,
  entityExtractionSchema,
  socraticQuestioningSchema,
  structuredSchemas,
  artifactSubtypeSchemas,
} from './schemas.js';
export type { ArtifactSubtype } from './schemas.js';

export type {
  StructuredGenerationRequest,
  StructuredGenerationResult,
  TextGenerationResult,
  TextGenerationRequest,
  ToolCallingRequest,
  ToolCallingResult,
  PiRuntime,
  PiAiRuntimeConfig,
} from './types.js';

export {
  getDefaultPiProvider,
  getDefaultPiModel,
  getKnownPiProviders,
  getKnownPiModels,
  getPiEnvApiKey,
  isKnownPiProvider,
  resolveConfiguredModel,
} from './provider-registry.js';

export {
  StructuredOutputValidationError,
  validateStructuredOutput,
  validateArtifactSubtypeOutput,
} from './validators.js';

export { mockArtifactSubtypeOutput } from './mock-outputs.js';

export {
  createMockPiRuntime,
  createPiAiRuntime,
  createConfiguredPiRuntime,
} from './runtime-factory.js';

export {
  routeProvider,
  createRoutedPiRuntime,
  getActiveRoutes,
  setActiveProfile,
  isRoutesOverriddenByEnv,
  DEFAULT_ROUTES,
} from './router.js';
export {
  buildRouteAdvisor,
  scoreRouteCandidate,
  buildAdvisorItem,
  collectCandidates,
  findCurrentPrimaryRoute,
  ADVISOR_WEIGHT_SUCCESS,
  ADVISOR_WEIGHT_SPEED,
  ADVISOR_WEIGHT_COST,
  ADVISOR_MIN_SAMPLES,
  ADVISOR_WEIGHTS,
} from './advisor.js';
export type { ProviderRoute, RouteResolution, AgentTaskType, ProviderRole } from '@zhijing/shared';

export {
  createInstrumentedPiRuntime,
  type UsageRecorder,
  type InstrumentedRuntimeOptions,
} from './instrumented.js';
