import type { FastifyInstance } from 'fastify';
import {
  getVerificationCoverage,
  buildVerificationBank,
  evaluateVerificationAttempts,
  updateVerificationCoverage,
  saveVerificationCoverage,
  createDefaultDataAccount,
  listDisabledDimensions,
  DEGRADE_MATRIX_REGISTRY,
  assessDegrade,
  computeTrulyReadScore,
  KnowledgeCoreError,
} from '@zhijing/core';

/**
 * 注册核验与真读路由（verification coverage/questions/submit、truly-read 查询与 verify）。
 * @param app - Fastify 实例
 * @author fxbin
 */
export function registerVerificationRoutes(app: FastifyInstance): void {
  app.get<{ Params: { bookId: string } }>('/api/verification/coverage/:bookId', async (request, reply) => {
    const { bookId } = request.params;
    if (!bookId) {
      return reply.code(400).send({ error: 'bookId is required' });
    }
    const coverage = getVerificationCoverage(bookId);
    return { coverage };
  });

  app.post<{
    Body: {
      bookId?: string;
      highlights?: Array<{ id?: string; text?: string; chapterRef?: string; time?: number }>;
      maxQuestions?: number;
    };
  }>('/api/verification/questions', async (request, reply) => {
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
        chapterRef: typeof item.chapterRef === 'string' ? item.chapterRef : undefined,
        time: typeof item.time === 'number' && Number.isFinite(item.time) ? item.time : undefined,
      }));
    const maxQuestions =
      typeof body.maxQuestions === 'number' &&
      Number.isFinite(body.maxQuestions) &&
      body.maxQuestions >= 1
        ? Math.floor(body.maxQuestions)
        : undefined;
    try {
      const result = buildVerificationBank({
        bookId: body.bookId,
        highlights,
        maxQuestions,
      });
      return { result };
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'build verification bank failed');
      return reply.code(500).send({ error: 'Build verification bank failed.' });
    }
  });

  app.post<{
    Body: {
      bookId?: string;
      attempts?: Array<{
        questionId?: string;
        kind?: string;
        userAnswer?: string;
        reason?: string;
        claimedAt?: number;
      }>;
      questions?: Array<{
        questionId?: string;
        kind?: string;
        prompt?: string;
        options?: string[];
        expectedAnswer?: string;
        chapterRef?: string;
        minReasonLength?: number;
      }>;
    };
  }>('/api/verification/submit', async (request, reply) => {
    const body = request.body ?? {};
    if (typeof body.bookId !== 'string' || body.bookId.length === 0) {
      return reply.code(400).send({ error: 'bookId is required' });
    }
    if (!Array.isArray(body.attempts) || !Array.isArray(body.questions)) {
      return reply.code(400).send({ error: 'attempts and questions arrays are required' });
    }
    const attempts = body.attempts.map((a) => ({
      questionId: String(a.questionId ?? ''),
      kind: (a.kind === 'marking' ? 'marking' : 'sampling') as 'sampling' | 'marking',
      userAnswer: String(a.userAnswer ?? ''),
      reason: typeof a.reason === 'string' ? a.reason : undefined,
      correct: false,
      claimedAt: typeof a.claimedAt === 'number' ? a.claimedAt : Date.now(),
    }));
    const questions = body.questions.map((q) => ({
      questionId: String(q.questionId ?? ''),
      kind: (q.kind === 'marking' ? 'marking' : 'sampling') as 'sampling' | 'marking',
      prompt: String(q.prompt ?? ''),
      options: Array.isArray(q.options) ? q.options : undefined,
      expectedAnswer: typeof q.expectedAnswer === 'string' ? q.expectedAnswer : undefined,
      chapterRef: typeof q.chapterRef === 'string' ? q.chapterRef : undefined,
      minReasonLength: typeof q.minReasonLength === 'number' ? q.minReasonLength : undefined,
    }));
    try {
      const evaluation = evaluateVerificationAttempts(attempts, questions);
      const existing = getVerificationCoverage(body.bookId);
      const coverage = updateVerificationCoverage(
        body.bookId,
        existing,
        attempts,
        questions,
        Date.now(),
      );
      saveVerificationCoverage(coverage);
      return { evaluation, coverage };
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'submit verification failed');
      return reply.code(500).send({ error: 'Submit verification failed.' });
    }
  });

  app.get<{ Params: { bookId: string } }>('/api/truly-read/:bookId', async (request, reply) => {
    const { bookId } = request.params;
    if (!bookId) {
      return reply.code(400).send({ error: 'bookId is required' });
    }
    const query = request.query as Record<string, string | undefined>;
    const dims = {
      highlightCount: Number(query.highlightCount ?? 0),
      noteCharCount: Number(query.noteCharCount ?? 0),
      reviewCharCount: Number(query.reviewCharCount ?? 0),
      hasLongReview: query.hasLongReview === 'true',
      totalChapters: Math.max(1, Number(query.totalChapters ?? 1)),
      chaptersCovered: Number(query.chaptersCovered ?? 0),
      lastActivityTime: Number(query.lastActivityTime ?? 0),
      firstActivityTime: Number(query.firstActivityTime ?? 0),
    };
    const now = Date.now();
    const defaultBook = createDefaultDataAccount(new Date(now).toISOString());
    const disabledDimensions = listDisabledDimensions(defaultBook);
    const trulyReadEntry = DEGRADE_MATRIX_REGISTRY.find((e) => e.key === 'truly_read_score');
    const degradeAssessment = trulyReadEntry
      ? assessDegrade(trulyReadEntry, disabledDimensions)
      : undefined;
    const degradeConfidence = degradeAssessment?.confidence ?? 1;
    const score = computeTrulyReadScore(
      { bookId, dims },
      undefined,
      { now, degradeConfidence },
    );
    return { score, degradeAssessment: degradeAssessment ?? null };
  });

  app.post<{
    Params: { bookId: string };
    Body: {
      dims?: Record<string, unknown>;
      claims?: Array<{ questionId?: string; userAnswer?: string; correct?: boolean; claimedAt?: number }>;
    };
  }>('/api/truly-read/:bookId/verify', async (request, reply) => {
    const { bookId } = request.params;
    if (!bookId) {
      return reply.code(400).send({ error: 'bookId is required' });
    }
    const body = request.body ?? {};
    const rawDims = body.dims ?? {};
    const dims = {
      highlightCount: Number(rawDims.highlightCount ?? 0),
      noteCharCount: Number(rawDims.noteCharCount ?? 0),
      reviewCharCount: Number(rawDims.reviewCharCount ?? 0),
      hasLongReview: rawDims.hasLongReview === true,
      totalChapters: Math.max(1, Number(rawDims.totalChapters ?? 1)),
      chaptersCovered: Number(rawDims.chaptersCovered ?? 0),
      lastActivityTime: Number(rawDims.lastActivityTime ?? 0),
      firstActivityTime: Number(rawDims.firstActivityTime ?? 0),
    };
    const rawClaims = Array.isArray(body.claims) ? body.claims : [];
    const claims = rawClaims
      .filter((claim) => typeof claim?.questionId === 'string')
      .map((claim) => ({
        questionId: claim.questionId as string,
        userAnswer: typeof claim.userAnswer === 'string' ? claim.userAnswer : '',
        correct: claim.correct === true,
        claimedAt: typeof claim.claimedAt === 'number' ? claim.claimedAt : Date.now(),
      }));
    const verifiedAt = Date.now();
    const totalQuestions = Math.max(1, claims.length);
    const correctCount = claims.filter((claim) => claim.correct).length;
    const verification = {
      bookId,
      claims,
      passRate: claims.length > 0 ? correctCount / totalQuestions : 0,
      verifiedAt,
    };
    const now = Date.now();
    const defaultBook = createDefaultDataAccount(new Date(now).toISOString());
    const disabledDimensions = listDisabledDimensions(defaultBook);
    const trulyReadEntry = DEGRADE_MATRIX_REGISTRY.find((e) => e.key === 'truly_read_score');
    const degradeAssessment = trulyReadEntry
      ? assessDegrade(trulyReadEntry, disabledDimensions)
      : undefined;
    const degradeConfidence = degradeAssessment?.confidence ?? 1;
    const score = computeTrulyReadScore(
      { bookId, dims },
      verification,
      { now, degradeConfidence },
    );
    return { score, verification, degradeAssessment: degradeAssessment ?? null };
  });
}
