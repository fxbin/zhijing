import type { FastifyInstance } from 'fastify';
import {
  getWeReadSettings,
  saveWeReadSettings,
  testWeReadConnection,
  getWeReadShelf,
  importWeReadBook,
  syncWeReadShelf,
  readWeReadBookMetaList,
  readWeReadSyncState,
  computeWeReadStats,
  computeWeReadRecommendations,
  previewWeReadBook,
  refreshWeReadBookSignals,
  getHiddenInterestHint,
  computeWeReadQuadrantSummary,
  computeWeReadGlobalTopicSpectrum,
  setHiddenInterestPermanentlyDismissed,
  dismissHiddenInterestBook,
  markHiddenInterestHintShown,
  exportDataPortability,
  listDataPortabilityRecords,
  revokeDataPortabilityExport,
  getReaderModeProfile,
  startReaderModeRollback,
  cancelReaderModeRollback,
  createDefaultDataAccount,
  listDisabledDimensions,
  DEGRADE_MATRIX_REGISTRY,
  assessDegrade,
  validateTopicSpectrum,
  KnowledgeCoreError,
} from '@zhijing/core';
import type {
  RecommendationBucket,
  DataPortabilityFormat,
  AudienceTier,
} from '@zhijing/shared';
import {
  RECOMMENDATION_BUCKET_VALUES,
  DATA_PORTABILITY_FORMAT_VALUES,
  AUDIENCE_TIER_VALUES,
} from '@zhijing/shared';

/**
 * 注册微信读书路由（设置、书架、导入、同步、统计、推荐、预览、信号刷新、隐藏兴趣、象限、话题图谱、数据可携、阅读模式）。
 * @param app - Fastify 实例
 * @author fxbin
 */
export function registerWereadRoutes(app: FastifyInstance): void {
  app.get('/api/weread/settings', async () => getWeReadSettings());

  app.put<{ Body: { apiKey?: string } }>('/api/weread/settings', async (request, reply) => {
    const apiKey = typeof request.body?.apiKey === 'string' ? request.body.apiKey.trim() : '';
    if (!apiKey) {
      return reply.code(400).send({ error: 'API Key is required.' });
    }
    try {
      saveWeReadSettings(apiKey);
      return { ok: true };
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'save weread settings failed');
      return reply.code(500).send({ error: 'Save WeRead settings failed.' });
    }
  });

  app.post('/api/weread/settings/test', async (request, reply) => {
    try {
      return await testWeReadConnection();
    } catch (error) {
      request.log.error({ error }, 'test weread connection failed');
      return reply.code(500).send({ ok: false, error: 'Test connection failed.' });
    }
  });

  app.get('/api/weread/shelf', async (request, reply) => {
    try {
      return await getWeReadShelf();
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'fetch weread shelf failed');
      return reply.code(500).send({ error: 'Failed to fetch WeRead shelf.' });
    }
  });

  app.post<{ Body: { bookId?: string; workspaceId?: string } }>('/api/weread/import', async (request, reply) => {
    const bookId = typeof request.body?.bookId === 'string' ? request.body.bookId.trim() : '';
    if (!bookId) {
      return reply.code(400).send({ error: 'bookId is required.' });
    }
    try {
      return await importWeReadBook(bookId, request.body?.workspaceId);
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'import weread book failed');
      return reply.code(500).send({ error: 'Failed to import WeRead book.' });
    }
  });

  app.post<{ Body: { force?: boolean } }>('/api/weread/sync', async (request, reply) => {
    try {
      const force = request.body?.force === true;
      return await syncWeReadShelf(force);
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'sync weread shelf failed');
      return reply.code(500).send({ error: 'Failed to sync WeRead shelf.' });
    }
  });

  app.get('/api/weread/meta', async (request, reply) => {
    try {
      return { books: readWeReadBookMetaList(), syncState: readWeReadSyncState() };
    } catch (error) {
      request.log.error({ error }, 'read weread meta failed');
      return reply.code(500).send({ error: 'Failed to read WeRead meta.' });
    }
  });

  app.get('/api/weread/stats', async (request, reply) => {
    try {
      return computeWeReadStats();
    } catch (error) {
      request.log.error({ error }, 'compute weread stats failed');
      return reply.code(500).send({ error: 'Failed to compute WeRead stats.' });
    }
  });

  app.get<{ Querystring: { workspaceId?: string; bucket?: string } }>('/api/weread/recommendations', async (request, reply) => {
    try {
      const kbId = typeof request.query.workspaceId === 'string' ? request.query.workspaceId : undefined;
      const rawBucket = typeof request.query.bucket === 'string' ? request.query.bucket : 'control';
      if (!RECOMMENDATION_BUCKET_VALUES.includes(rawBucket as RecommendationBucket)) {
        return reply.code(400).send({ error: `bucket must be one of: ${RECOMMENDATION_BUCKET_VALUES.join(', ')}.` });
      }
      return computeWeReadRecommendations(kbId, rawBucket as RecommendationBucket);
    } catch (error) {
      request.log.error({ error }, 'compute weread recommendations failed');
      return reply.code(500).send({ error: 'Failed to compute WeRead recommendations.' });
    }
  });

  app.post<{ Body: { bookId?: string } }>('/api/weread/preview', async (request, reply) => {
    const bookId = typeof request.body?.bookId === 'string' ? request.body.bookId.trim() : '';
    if (!bookId) {
      return reply.code(400).send({ error: 'bookId is required.' });
    }
    try {
      return await previewWeReadBook(bookId);
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'preview weread book failed');
      return reply.code(500).send({ error: 'Failed to preview WeRead book.' });
    }
  });

  app.post<{ Body: { bookIds?: string[]; concurrency?: number } }>('/api/weread/signals/refresh', async (request, reply) => {
    const raw = request.body?.bookIds;
    const bookIds = Array.isArray(raw) ? raw.filter((id): id is string => typeof id === 'string' && id.trim().length > 0) : [];
    const concurrency = typeof request.body?.concurrency === 'number' && request.body.concurrency > 0
      ? Math.floor(request.body.concurrency)
      : undefined;
    if (bookIds.length === 0) {
      return reply.code(400).send({ error: 'bookIds must be a non-empty array.' });
    }
    try {
      return await refreshWeReadBookSignals(bookIds, concurrency);
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'refresh weread signals failed');
      return reply.code(500).send({ error: 'Failed to refresh WeRead signals.' });
    }
  });

  app.get('/api/weread/hidden-interest/hint', async () => {
    return { hint: getHiddenInterestHint() };
  });

  app.get('/api/weread/quadrant', async () => {
    return computeWeReadQuadrantSummary();
  });

  app.get<{ Querystring: { force?: string } }>('/api/weread/topic-spectrum/global', async (request) => {
    const force = request.query?.force === '1';
    const spectrum = await computeWeReadGlobalTopicSpectrum(force);
    const validation = validateTopicSpectrum(spectrum);
    if (!validation.valid) {
      return { spectrum, degradeAssessment: null };
    }
    const now = Date.now();
    const defaultBook = createDefaultDataAccount(new Date(now).toISOString());
    const disabledDimensions = listDisabledDimensions(defaultBook);
    const topicSpectrumEntry = DEGRADE_MATRIX_REGISTRY.find((e) => e.key === 'topic_spectrum');
    const degradeAssessment = topicSpectrumEntry
      ? assessDegrade(topicSpectrumEntry, disabledDimensions)
      : null;
    return { spectrum, degradeAssessment };
  });

  app.post<{ Body: { permanentlyDismissed?: boolean } }>('/api/weread/hidden-interest/toggle', async (request, reply) => {
    if (typeof request.body?.permanentlyDismissed !== 'boolean') {
      return reply.code(400).send({ error: 'permanentlyDismissed boolean is required.' });
    }
    setHiddenInterestPermanentlyDismissed(request.body.permanentlyDismissed);
    return { ok: true };
  });

  app.post<{ Params: { bookId: string } }>('/api/weread/hidden-interest/dismiss/:bookId', async (request, reply) => {
    const { bookId } = request.params;
    if (!bookId) {
      return reply.code(400).send({ error: 'bookId is required.' });
    }
    dismissHiddenInterestBook(bookId);
    return { ok: true };
  });

  app.post('/api/weread/hidden-interest/shown', async () => {
    markHiddenInterestHintShown();
    return { ok: true };
  });

  app.post<{ Body: { format?: string } }>('/api/weread/data-portability/export', async (request, reply) => {
    const format = request.body?.format;
    if (!format || !DATA_PORTABILITY_FORMAT_VALUES.includes(format as DataPortabilityFormat)) {
      return reply.code(400).send({ error: `format must be one of: ${DATA_PORTABILITY_FORMAT_VALUES.join(', ')}.` });
    }
    try {
      const record = exportDataPortability(format as DataPortabilityFormat);
      return { record };
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'export data portability failed');
      return reply.code(500).send({ error: 'Failed to export data portability.' });
    }
  });

  app.get('/api/weread/data-portability/records', async () => {
    return { records: listDataPortabilityRecords() };
  });

  app.post<{ Params: { id: string } }>('/api/weread/data-portability/revoke/:id', async (request, reply) => {
    const { id } = request.params;
    if (!id) {
      return reply.code(400).send({ error: 'id is required.' });
    }
    try {
      revokeDataPortabilityExport(id);
      return { ok: true };
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'revoke data portability failed');
      return reply.code(500).send({ error: 'Failed to revoke data portability.' });
    }
  });

  app.get('/api/weread/reader-mode/profile', async () => {
    return { profile: getReaderModeProfile() };
  });

  app.post<{ Body: { targetTier?: string } }>('/api/weread/reader-mode/rollback', async (request, reply) => {
    const targetTier = request.body?.targetTier;
    if (!targetTier || !AUDIENCE_TIER_VALUES.includes(targetTier as AudienceTier)) {
      return reply.code(400).send({ error: `targetTier must be one of: ${AUDIENCE_TIER_VALUES.join(', ')}.` });
    }
    try {
      startReaderModeRollback(targetTier as AudienceTier);
      return { ok: true };
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'start reader mode rollback failed');
      return reply.code(500).send({ error: 'Failed to start reader mode rollback.' });
    }
  });

  app.post('/api/weread/reader-mode/cancel-rollback', async () => {
    cancelReaderModeRollback();
    return { ok: true };
  });
}
