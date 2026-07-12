import type { FastifyInstance } from 'fastify';
import {
  createDefaultDataAccount,
  evaluateAntiVanity,
  computeQuadrantSummary,
  computeTopicSpectrum,
  validateTopicSpectrum,
  listDisabledDimensions,
  assessAllDegrade,
  assessDegrade,
  DEGRADE_MATRIX_REGISTRY,
  toggleEntry,
  KnowledgeCoreError,
} from '@zhijing/core';
import {
  STATISTICS_GATE_ALLOWED_VIEW_IDS,
  STATISTICS_GATE_BOOLEAN_FIELDS,
} from '../common/statistics-gate.js';

/**
 * 注册数据账户与统计路由（默认账户、反虚荣门禁评估、象限、话题图谱、降级评估、开关）。
 * @param app - Fastify 实例
 * @author fxbin
 */
export function registerDataAccountRoutes(app: FastifyInstance): void {
  app.get('/api/data-account', async () => {
    const now = new Date().toISOString();
    const book = createDefaultDataAccount(now);
    return { book, source: 'default' };
  });

  app.post<{
    Body: {
      viewId?: string;
      dependsOnBehaviorTrace?: boolean;
      sharedAcrossUsers?: boolean;
      hasRankingOrComparison?: boolean;
      emphasizesQuantity?: boolean;
      exposesRawData?: boolean;
      allowsUserChallenge?: boolean;
      isLinearlyOptimizable?: boolean;
    };
  }>('/api/statistics/evaluate-gate', async (request, reply) => {
    const body = request.body ?? {};
    if (typeof body.viewId !== 'string' || body.viewId.length === 0) {
      return reply.code(400).send({ error: 'viewId is required' });
    }
    if (!STATISTICS_GATE_ALLOWED_VIEW_IDS.has(body.viewId)) {
      return reply.code(400).send({ error: 'viewId not registered' });
    }
    for (const field of STATISTICS_GATE_BOOLEAN_FIELDS) {
      const value = body[field];
      if (value !== undefined && typeof value !== 'boolean') {
        return reply.code(400).send({ error: `${field} must be boolean` });
      }
    }
    return evaluateAntiVanity({
      viewId: body.viewId,
      dependsOnBehaviorTrace: Boolean(body.dependsOnBehaviorTrace),
      sharedAcrossUsers: Boolean(body.sharedAcrossUsers),
      hasRankingOrComparison: Boolean(body.hasRankingOrComparison),
      emphasizesQuantity: Boolean(body.emphasizesQuantity),
      exposesRawData: Boolean(body.exposesRawData),
      allowsUserChallenge: Boolean(body.allowsUserChallenge),
      isLinearlyOptimizable: Boolean(body.isLinearlyOptimizable),
    });
  });

  app.post<{
    Body: {
      books?: Array<{
        bookId?: string;
        title?: string;
        onShelf?: boolean;
        finishReading?: boolean;
        hasReadActivity?: boolean;
        highlightCount?: number;
        noteCharCount?: number;
        chapterCount?: number;
        hasLongReview?: boolean;
      }>;
      historyScores?: number[];
    };
  }>('/api/statistics/quadrant', async (request, reply) => {
    const body = request.body ?? {};
    if (!Array.isArray(body.books)) {
      return reply.code(400).send({ error: 'books array is required' });
    }
    const inputs = body.books.map((book, index) => ({
      bookId: typeof book.bookId === 'string' ? book.bookId : `unknown-${index}`,
      title: typeof book.title === 'string' ? book.title : '',
      onShelf: Boolean(book.onShelf),
      finishReading: Boolean(book.finishReading),
      hasReadActivity: Boolean(book.hasReadActivity),
      highlightCount: Number(book.highlightCount ?? 0),
      noteCharCount: Number(book.noteCharCount ?? 0),
      chapterCount: Number(book.chapterCount ?? 1),
      hasLongReview: Boolean(book.hasLongReview),
    }));
    const historyScores = Array.isArray(body.historyScores)
      ? body.historyScores.map((value) => Number(value)).filter((value) => Number.isFinite(value))
      : undefined;
    return computeQuadrantSummary(inputs, { historyScores });
  });

  app.post<{
    Body: {
      bookId?: string;
      highlights?: Array<{ id?: string; text?: string; time?: number }>;
      booksRead?: number;
      windowMonths?: number;
    };
  }>('/api/statistics/topic-spectrum', async (request, reply) => {
    const body = request.body ?? {};
    if (typeof body.bookId !== 'string' || body.bookId.length === 0) {
      return reply.code(400).send({ error: 'bookId is required' });
    }
    if (!Array.isArray(body.highlights)) {
      return reply.code(400).send({ error: 'highlights array is required' });
    }
    const highlights = body.highlights
      .filter((item) => item && typeof item.text === 'string' && item.text.length > 0)
      .map((item, index) => ({
        id: typeof item.id === 'string' && item.id.length > 0 ? item.id : `${body.bookId}-${index}`,
        text: item.text as string,
        time: typeof item.time === 'number' && Number.isFinite(item.time) ? item.time : 0,
      }));
    const booksRead =
      typeof body.booksRead === 'number' && Number.isFinite(body.booksRead) && body.booksRead >= 0
        ? Math.floor(body.booksRead)
        : 0;
    const windowMonths =
      typeof body.windowMonths === 'number' &&
      Number.isFinite(body.windowMonths) &&
      body.windowMonths >= 1
        ? Math.floor(body.windowMonths)
        : undefined;
    const now = Date.now();
    const defaultBook = createDefaultDataAccount(new Date(now).toISOString());
    const disabledDimensions = listDisabledDimensions(defaultBook);
    const topicSpectrumEntry = DEGRADE_MATRIX_REGISTRY.find((e) => e.key === 'topic_spectrum');
    const degradeAssessment = topicSpectrumEntry
      ? assessDegrade(topicSpectrumEntry, disabledDimensions)
      : undefined;
    const spectrum = computeTopicSpectrum({
      bookId: body.bookId,
      highlights,
      booksRead,
      windowMonths,
      now,
    });
    const validation = validateTopicSpectrum(spectrum);
    if (!validation.valid) {
      request.log.error({ errors: validation.errors }, 'topic spectrum validation failed');
      return reply.code(500).send({ error: 'Topic spectrum computation produced invalid result.' });
    }
    return { spectrum, degradeAssessment: degradeAssessment ?? null };
  });

  app.get('/api/data-account/assessments', async () => {
    const now = new Date().toISOString();
    const book = createDefaultDataAccount(now);
    const disabledDimensions = listDisabledDimensions(book);
    const assessments = assessAllDegrade(undefined, disabledDimensions);
    return { book, assessments, source: 'default' };
  });

  app.post<{
    Body: {
      entryKey?: string;
      enabled?: boolean;
    };
  }>('/api/data-account/toggle', async (request, reply) => {
    const body = request.body ?? {};
    if (typeof body.entryKey !== 'string' || body.entryKey.length === 0) {
      return reply.code(400).send({ error: 'entryKey is required' });
    }
    if (typeof body.enabled !== 'boolean') {
      return reply.code(400).send({ error: 'enabled boolean is required' });
    }
    const now = new Date().toISOString();
    const base = createDefaultDataAccount(now);
    const book = toggleEntry(base, body.entryKey, body.enabled, now);
    const disabledDimensions = listDisabledDimensions(book);
    const assessments = assessAllDegrade(undefined, disabledDimensions);
    return { book, assessments, source: 'default' };
  });
}
