/**
 * @file 知径核心包 barrel re-export
 *
 * 由 packages/core/src/index.ts 拆分而来（Phase 2 重构）。
 * 保持对外 API 表面不变，仅做物理拆分。
 *
 * @author fxbin
 */


export { KnowledgeCoreError } from './errors.js';
export type * from './types.js';
export * from './constants.js';

export {
  scheduleCardRecall,
  jiebaCut,
  getDataDirectory,
  revealDataDirectory,
} from './utils.js';

export * from './state.js';

export {
  createMemoryKnowledgeRepository,
  createSqliteKnowledgeRepository,
} from './repositories/registry.js';
export { MemoryKnowledgeRepository } from './repositories/memory.js';
export { SqliteKnowledgeRepository } from './repositories/sqlite.js';

export * from './business.js';

export { initProxyDispatcher, getCurrentProxy } from './fetch-dispatcher.js';
export { detectSystemProxy, setManualProxy, resetProxyCache } from './proxy-detector.js';
export { checkUrlForSsrf, assertUrlSafeForSsrf, createSsrfSafeFetch } from './ssrf-guard.js';


export {
  ANTI_VANITY_THRESHOLD_PASS,
  ANTI_VANITY_THRESHOLD_WARN,
  evaluateAntiVanity,
  isAllowedToShow,
  summarizeFailedChecks,
} from './privacy-gate.js';
export type { VanityCheckItem, VanityCheckInput, VanityCheckResult } from './privacy-gate.js';

export {
  DATA_ACCOUNT_DEFAULT_ENTRIES,
  createDefaultDataAccount,
  setEntryTier,
  setMinimalMode,
  findEntry,
  listActiveEntries,
  listAffectedMetrics,
  listDisabledDimensions,
  toggleEntry,
} from './data-account-book.js';

export {
  VERIFICATION_DEFAULT_MAX_QUESTIONS,
  VERIFICATION_DEFAULT_OPTIONS_COUNT,
  VERIFICATION_DEFAULT_SEED,
  VERIFICATION_MIN_REASON_LENGTH,
  VERIFICATION_MIN_POOL_SIZE,
  buildVerificationBank,
  buildEmptyCoverage,
  evaluateVerificationAttempt,
  evaluateVerificationAttempts,
  updateVerificationCoverage,
} from './statistics/verification-bank.js';
export type {
  VerificationHighlight,
  BuildVerificationBankInput,
} from './statistics/verification-bank.js';

export {
  RECOGNITION_COHERENCE_THRESHOLD,
  RECOGNITION_MANUAL_SAMPLE_COUNT,
  RECOGNITION_DEFAULT_SEED,
  assessClusterRecognition,
  applyRecognitionStatus,
  buildEmptyRecognition,
} from './statistics/recognition-check.js';
export type { RecognitionAssessment } from './statistics/recognition-check.js';

export {
  MINIMAL_RETAINED_FEATURES,
  MINIMAL_SILENCED_FEATURES,
  MINIMAL_FEATURE_CONTRACT,
  buildMinimalFeatureState,
  getFeatureDisposition,
  isFeatureVisible,
  listSilencedFeatureKeys,
} from './statistics/minimal-set.js';

export {
  DEFAULT_NOTE_DEPTH_ALPHA,
  DEFAULT_NOTE_DEPTH_BETA,
  DEFAULT_NOTE_DEPTH_GAMMA,
  DEFAULT_TAU_NOTE,
  MINIMUM_BOOKS_FOR_PERCENTILE,
  RECOMMENDATION_SEED_KINDS,
  computeNoteDepthRaw,
  computeRollingPercentile,
  computeQuadrantSummary,
} from './statistics/quadrant.js';

export {
  DEGRADE_CONF_WARN_THRESHOLD,
  DEGRADE_CONF_HIDE_THRESHOLD,
  DEFAULT_GAMMA_FACTOR,
  DEGRADE_MISSING_DIMS_PLACEHOLDER,
  DEGRADE_MATRIX_REGISTRY,
  getMatrixEntry,
  classifyBehavior,
  computeRetentionRatio,
  assessDegrade,
  assessAllDegrade,
  findDegraded,
} from './statistics/degrade-matrix.js';
export type { AssessDegradeOptions } from './statistics/degrade-matrix.js';

export {
  SATURATE_TAU_HIGHLIGHT,
  SATURATE_TAU_NOTE,
  SATURATE_TAU_REVIEW,
  LONG_REVIEW_CHAR_THRESHOLD,
  saturate,
  saturateHighlight,
  saturateNote,
  saturateReview,
  computeCoverage,
} from './statistics/saturate.js';

export {
  WEIGHT_HIGHLIGHT,
  WEIGHT_NOTE,
  WEIGHT_REVIEW,
  WEIGHT_COVERAGE,
  WEIGHT_OBJECTIVE,
  WEIGHT_SUBJECTIVE,
  TIME_DECAY_LAMBDA,
  computeTimeDecay,
  computeObjectiveScore,
  computeSubjectiveRate,
  computeTrulyReadScore,
} from './statistics/truly-read.js';
export type { ComputeTrulyReadOptions } from './statistics/truly-read.js';

export {
  TOKENIZE_ASCII_MIN_LENGTH,
  TOKENIZE_STOP_WORDS,
  tokenizeText,
  tokenizeDocs,
} from './statistics/tokenize.js';
export type { TokenizedDoc } from './statistics/tokenize.js';

export {
  TFIDF_IDF_SMOOTHING,
  computeIdf,
  l2Normalize,
  computeTfidfVector,
  buildTfidfMatrix,
  cosineSimilarity,
  cosineDistance,
} from './statistics/tfidf.js';
export type { TfidfMatrix } from './statistics/tfidf.js';

export {
  CLUSTER_K_MIN,
  CLUSTER_K_MAX,
  CLUSTER_MAX_ITERATIONS,
  CLUSTER_DEFAULT_SEED,
  SILHOUETTE_SAMPLE_THRESHOLD,
  SILHOUETTE_DEFAULT_SAMPLE_SIZE,
  createSeededRng,
  computeSilhouette,
  runKmeans,
  findBestK,
} from './statistics/topic-cluster.js';
export type {
  ClusterResult,
  FindBestKResult,
  KmeansOptions,
  FindBestKOptions,
} from './statistics/topic-cluster.js';

export {
  COHERENCE_TOP_TERMS,
  LDA_GATE_VOCABULARY_SIZE,
  LDA_GATE_BOOKS_READ,
  LDA_GATE_COHERENCE,
  computeTopicCoherence,
  computeOverallCoherence,
  evaluateLdaGate,
} from './statistics/coherence.js';
export type { LdaGateInput, LdaGateResult } from './statistics/coherence.js';

export {
  TOPIC_DEFAULT_WINDOW_MONTHS,
  TOPIC_PALETTE,
  STABILITY_MIN_HIGHLIGHTS,
  STABILITY_MIN_MONTHS,
  STABILITY_MIN_SILHOUETTE,
  computeTopicSpectrum,
  validateTopicSpectrum,
} from './statistics/topic-spectrum.js';
export type { TopicSpectrumInput, TopicSpectrumValidation } from './statistics/topic-spectrum.js';

export {
  buildHiddenInterestHint,
  selectRepresentativeBook,
  applyHiddenInterestDismissal,
  applyPermanentDismissal,
  markHintShown,
  buildContentPreview as buildHiddenInterestPreview,
} from './statistics/hidden-interest.js';
export {
  buildDataPortabilityManifest,
  computeRevokeDeadline,
  isRevocable,
  serializePortability,
  DATA_PORTABILITY_ALGORITHM_VERSIONS,
  DATA_PORTABILITY_REVOKE_WINDOW_MS,
} from './statistics/data-export.js';
export {
  classifyAudienceTier,
  buildAudienceProfile,
  buildInitialReaderModeState,
  startTempRollback,
  cancelTempRollback,
  resolveEffectiveTier,
  isLowerTier,
  NOVICE_SIGNAL_THRESHOLD,
  POWER_SIGNAL_THRESHOLD,
  READER_MODE_ROLLBACK_WINDOW_MS,
} from './statistics/audience-adapter.js';

export type {
  HiddenInterestState,
  HiddenInterestHint,
  HiddenInterestBook,
  HiddenInterestHintMode,
  DataPortabilityFormat,
  DataPortabilityManifest,
  DataPortabilityRecord,
  DataPortabilityAlgorithmVersion,
  AudienceTier,
  AudienceProfile,
  ReaderModeState,
  RecommendationBucket,
} from '@zhijing/shared';

