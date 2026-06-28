import { after, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {
  answerWorkspaceQuestion,
  intakeKnowledge,
  normalizeXiaohongshuInitialStateHtml,
  requestMaterialParsing,
  resetKnowledgeCoreForTests,
  searchKnowledgeAssets,
  suggestMaterialAssignments,
  computeNoteDepthRaw,
  computeQuadrantSummary,
  computeRollingPercentile,
  classifyBehavior,
  assessDegrade,
  assessAllDegrade,
  findDegraded,
  DEGRADE_MATRIX_REGISTRY,
  DEGRADE_CONF_WARN_THRESHOLD,
  DEGRADE_CONF_HIDE_THRESHOLD,
  createDefaultDataAccount,
  toggleEntry,
  listDisabledDimensions,
  saturate,
  saturateHighlight,
  saturateNote,
  computeTimeDecay,
  computeObjectiveScore,
  computeTrulyReadScore,
  WEIGHT_OBJECTIVE,
  WEIGHT_SUBJECTIVE,
  TIME_DECAY_LAMBDA,
  SATURATE_TAU_HIGHLIGHT,
  SATURATE_TAU_NOTE,
} from './index.js';

process.env.ZHIJING_STORAGE = 'memory';
process.env.ZHIJING_PI_ENABLED = '0';
process.env.JINA_READER_BASE_URL = 'http://127.0.0.1:9/';

const servers: http.Server[] = [];

beforeEach(() => {
  resetKnowledgeCoreForTests();
  process.env.ZHIJING_PARSE_CACHE_TTL_MS = String(6 * 60 * 60 * 1000);
  process.env.ZHIJING_WEB_PARSE_THROTTLE_MS = '0';
});

after(() => {
  for (const server of servers) server.close();
});

describe('xiaohongshu parser', () => {
  test('extracts note text and stable image URLs from initial state html', () => {
    const state = {
      note: {
        noteDetailMap: {
          '-1': {
            note: {
              title: '',
              desc: '桃花坞的文案到底是谁在写📚\n#五十公里桃花坞[话题]#',
              tagList: [{ name: '五十公里桃花坞' }],
              imageList: [{
                urlDefault: 'http://sns-webpic-qc.xhscdn.com/202606161942/hash/notes_pre_post/1040abc!nd_dft_wlteh_jpg_3',
              }],
            },
          },
        },
      },
    };
    const parsed = normalizeXiaohongshuInitialStateHtml(`<script>window.__INITIAL_STATE__=${JSON.stringify(state)};</script>`);
    assert.equal(parsed?.title, '桃花坞的文案到底是谁在写📚');
    assert.equal(parsed?.mediaUrls[0], 'https://sns-img-hw.xhscdn.com/notes_pre_post/1040abc?imageView2/2/w/0/format/jpg');
  });
});

describe('assignment suggestions', () => {
  test('prefers an existing related knowledge base over current accidental assignment', async () => {
    const memory = await intakeKnowledge({ input: '间隔重复记忆法' });
    await intakeKnowledge({
      input: '每隔一段时间复习一次，能提高长期记忆稳定性。\n复习间隔可以从一天、三天、一周逐步拉长。',
      workspaceId: memory.workspace.id,
    });
    const product = await intakeKnowledge({ input: '产品设计研究' });
    const material = await intakeKnowledge({
      input: '间隔复习的核心是根据遗忘曲线安排复习。\n它适合学习语言、概念和考试内容。',
      workspaceId: product.workspace.id,
    });

    assert.ok(material.material);
    const suggestions = suggestMaterialAssignments(material.material.id);
    assert.equal(suggestions.suggestions[0].workspaceId, memory.workspace.id);
  });
});

describe('parse governance', () => {
  test('reuses successful parse cache for the same source URL', async () => {
    process.env.ZHIJING_WEB_PARSE_THROTTLE_MS = '0';
    let hits = 0;
    const { server, url } = await startHtmlServer(() => {
      hits += 1;
      return html('缓存测试文章', '这是用于测试解析缓存的正文内容。'.repeat(20));
    });
    servers.push(server);

    const base = await intakeKnowledge({ input: '治理缓存测试' });
    const firstMaterial = await intakeKnowledge({ input: `${url}/article`, workspaceId: base.workspace.id });
    const first = await requestMaterialParsing(firstMaterial.material?.id ?? '');
    const secondMaterial = await intakeKnowledge({ input: `${url}/article`, workspaceId: base.workspace.id });
    const second = await requestMaterialParsing(secondMaterial.material?.id ?? '');

    assert.equal(first.material.parseStatus, 'ingested');
    assert.equal(second.material.parseStatus, 'ingested');
    assert.equal(second.task.output?.cacheHit, true);
    assert.equal(hits, 1);
  });

  test('throttles repeated platform parses without consuming cache hits', async () => {
    process.env.ZHIJING_WEB_PARSE_THROTTLE_MS = '60000';
    const { server, url } = await startHtmlServer(() => html('限流测试', '限流测试正文。'.repeat(30)));
    servers.push(server);

    const base = await intakeKnowledge({ input: '治理限流测试' });
    const firstMaterial = await intakeKnowledge({ input: `${url}/a`, workspaceId: base.workspace.id });
    await requestMaterialParsing(firstMaterial.material?.id ?? '');
    const secondMaterial = await intakeKnowledge({ input: `${url}/b`, workspaceId: base.workspace.id });
    const throttled = await requestMaterialParsing(secondMaterial.material?.id ?? '');

    assert.equal(throttled.material.parseStatus, 'needs_review');
    assert.equal(throttled.task.status, 'needs_user_action');
    assert.equal(throttled.task.output?.queueState, 'throttled');
  });

  test('classifies short parse failures as recoverable review items', async () => {
    process.env.ZHIJING_WEB_PARSE_THROTTLE_MS = '0';
    const { server, url } = await startHtmlServer(() => html('短页面', '太短'));
    servers.push(server);

    const base = await intakeKnowledge({ input: '失败分类测试' });
    const material = await intakeKnowledge({ input: `${url}/short`, workspaceId: base.workspace.id });
    const result = await requestMaterialParsing(material.material?.id ?? '');

    assert.equal(result.material.parseStatus, 'needs_review');
    assert.equal(result.task.status, 'needs_user_action');
    assert.equal(result.task.output?.classification, 'too_short');
  });
});

describe('question citations', () => {
  test('returns material and card citations for knowledge base answers', async () => {
    const topic = await intakeKnowledge({ input: '问答引用测试' });
    await intakeKnowledge({
      input: '这是引用测试的来源资料。\n它说明知识库问答应当展示来源资料和相关卡片。',
      workspaceId: topic.workspace.id,
    });

    const answer = await answerWorkspaceQuestion(topic.workspace.id, '问答应该如何展示来源？');
    assert.ok(answer.citations?.some((citation) => citation.kind === 'material'));
    assert.ok(answer.citations?.some((citation) => citation.kind === 'card'));
  });
});

describe('semantic search', () => {
  test('recalls related learning concepts without exact query terms', async () => {
    const base = await intakeKnowledge({ input: '长期记忆学习法' });
    await intakeKnowledge({
      input: '间隔重复会把练习拆到不同日期，主动回忆要求先尝试提取答案，再回看资料修正。\n这类方法适合语言、概念和考试内容的长期保持。',
      workspaceId: base.workspace.id,
    });

    const results = searchKnowledgeAssets({ query: '复习策略', limit: 10 });
    assert.ok(results.results.some((result) => result.kind === 'material'));
    assert.ok(results.results.some((result) => result.metadata.match === 'semantic'));
  });
});

async function startHtmlServer(render: () => string) {
  const server = http.createServer((_, response) => {
    response.setHeader('content-type', 'text/html;charset=utf-8');
    response.end(render());
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  return {
    server,
    url: `http://127.0.0.1:${address.port}`,
  };
}

function html(title: string, body: string) {
  return `<html><head><title>${title}</title></head><body><main><h1>${title}</h1><p>${body}</p></main></body></html>`;
}

describe('note_depth raw formula', () => {
  test('combines highlight density, log note char count and long review flag with default weights', () => {
    const raw = computeNoteDepthRaw(
      {
        bookId: 'b1',
        onShelf: true,
        finishReading: false,
        hasReadActivity: true,
        highlightCount: 30,
        noteCharCount: 1200,
        chapterCount: 10,
        hasLongReview: true,
      },
      {},
    );
    const expected = 0.5 * 3 + 0.4 * Math.log(1 + 1200) + 0.1 * 1;
    assert.equal(Number(raw.toFixed(6)), Number(expected.toFixed(6)));
  });

  test('returns 0 when chapter count is missing and notes are empty', () => {
    const raw = computeNoteDepthRaw(
      {
        bookId: 'b2',
        onShelf: false,
        finishReading: false,
        hasReadActivity: false,
        highlightCount: 0,
        noteCharCount: 0,
        chapterCount: 0,
        hasLongReview: false,
      },
      {},
    );
    assert.equal(raw, 0);
  });
});

describe('rolling percentile', () => {
  test('returns null when sample size is below threshold', () => {
    const percentile = computeRollingPercentile(1, [0.1, 0.2, 0.3]);
    assert.equal(percentile, null);
  });

  test('ranks higher values above lower values', () => {
    const history = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
    assert.equal(computeRollingPercentile(0.95, history), 1);
    assert.equal(computeRollingPercentile(0.05, history), 0);
    assert.equal(computeRollingPercentile(0.5, history), 4 / 9);
    assert.equal(computeRollingPercentile(0.45, history), 4 / 9);
    assert.equal(computeRollingPercentile(0.7, history), 6 / 9);
  });
});

describe('quadrant summary', () => {
  test('classifies books into four quadrants and produces recommendation seeds', () => {
    const inputs = [
      { bookId: 'a', onShelf: true, finishReading: false, hasReadActivity: true, highlightCount: 80, noteCharCount: 2000, chapterCount: 10, hasLongReview: true },
      { bookId: 'b', onShelf: true, finishReading: false, hasReadActivity: true, highlightCount: 1, noteCharCount: 0, chapterCount: 10, hasLongReview: false },
      { bookId: 'c', onShelf: false, finishReading: false, hasReadActivity: true, highlightCount: 50, noteCharCount: 800, chapterCount: 8, hasLongReview: false },
      { bookId: 'd', onShelf: false, finishReading: false, hasReadActivity: false, highlightCount: 0, noteCharCount: 0, chapterCount: 5, hasLongReview: false },
      { bookId: 'e', onShelf: true, finishReading: true, hasReadActivity: true, highlightCount: 60, noteCharCount: 1500, chapterCount: 12, hasLongReview: true },
      { bookId: 'f', onShelf: true, finishReading: false, hasReadActivity: true, highlightCount: 5, noteCharCount: 50, chapterCount: 8, hasLongReview: false },
      { bookId: 'g', onShelf: false, finishReading: false, hasReadActivity: true, highlightCount: 20, noteCharCount: 100, chapterCount: 6, hasLongReview: false },
      { bookId: 'h', onShelf: true, finishReading: false, hasReadActivity: true, highlightCount: 30, noteCharCount: 600, chapterCount: 9, hasLongReview: false },
    ];
    const summary = computeQuadrantSummary(inputs);
    assert.ok(summary.irrelevant >= 1, 'at least one off-shelf shallow book should be irrelevant');
    assert.ok(summary.recommendationSeeds.length >= 1, 'recommendation seeds must be non-empty');
    for (const bookId of summary.recommendationSeeds) {
      const book = [...summary.coreReading, ...summary.hiddenInterest].find((r) => r.bookId === bookId);
      assert.ok(book, `${bookId} should belong to core_reading or hidden_interest`);
      assert.equal(book.isRecommendationSeed, true);
    }
  });

  test('flags insufficientData when input size below threshold', () => {
    const inputs = [
      { bookId: 'x', onShelf: true, finishReading: false, hasReadActivity: true, highlightCount: 5, noteCharCount: 100, chapterCount: 5, hasLongReview: false },
    ];
    const summary = computeQuadrantSummary(inputs);
    assert.equal(summary.insufficientData, true);
    for (const quadrant of [summary.coreReading, summary.commitmentDebt, summary.hiddenInterest]) {
      for (const item of quadrant) {
        assert.equal(item.noteDepth.rollingPercentile, null);
        assert.equal(item.noteDepth.isDeep, false);
      }
    }
  });

  test('returns empty summary for empty input', () => {
    const summary = computeQuadrantSummary([]);
    assert.equal(summary.coreReading.length, 0);
    assert.equal(summary.commitmentDebt.length, 0);
    assert.equal(summary.hiddenInterest.length, 0);
    assert.equal(summary.irrelevant, 0);
    assert.equal(summary.insufficientData, true);
    assert.deepEqual(summary.recommendationSeeds, []);
  });

  test('routes on-shelf never-opened and on-shelf finished shallow books to irrelevant instead of commitment_debt', () => {
    const inputs = [
      { bookId: 'deep1', onShelf: true, finishReading: false, hasReadActivity: true, highlightCount: 80, noteCharCount: 2000, chapterCount: 10, hasLongReview: true },
      { bookId: 'deep2', onShelf: true, finishReading: false, hasReadActivity: true, highlightCount: 70, noteCharCount: 1800, chapterCount: 10, hasLongReview: true },
      { bookId: 'deep3', onShelf: false, finishReading: false, hasReadActivity: true, highlightCount: 60, noteCharCount: 1500, chapterCount: 9, hasLongReview: false },
      { bookId: 'deep4', onShelf: true, finishReading: true, hasReadActivity: true, highlightCount: 50, noteCharCount: 1200, chapterCount: 8, hasLongReview: true },
      { bookId: 'p1', onShelf: true, finishReading: false, hasReadActivity: true, highlightCount: 1, noteCharCount: 0, chapterCount: 10, hasLongReview: false },
      { bookId: 'p2', onShelf: true, finishReading: false, hasReadActivity: false, highlightCount: 0, noteCharCount: 0, chapterCount: 10, hasLongReview: false },
      { bookId: 'p3', onShelf: true, finishReading: true, hasReadActivity: true, highlightCount: 2, noteCharCount: 0, chapterCount: 10, hasLongReview: false },
      { bookId: 'p4', onShelf: false, finishReading: false, hasReadActivity: false, highlightCount: 0, noteCharCount: 0, chapterCount: 5, hasLongReview: false },
    ];
    const summary = computeQuadrantSummary(inputs);
    const debtIds = summary.commitmentDebt.map((r) => r.bookId);
    assert.deepEqual(debtIds, ['p1'], 'only on-shelf + unfinished + has-read-activity + shallow should be commitment_debt');
    assert.ok(summary.irrelevant >= 3, 'p2/p3/p4 should all fall into irrelevant');
  });
});

describe('degrade matrix behavior classification', () => {
  test('normal when confidence at or above warn threshold', () => {
    assert.equal(classifyBehavior(DEGRADE_CONF_WARN_THRESHOLD), 'normal');
    assert.equal(classifyBehavior(0.99), 'normal');
  });

  test('degraded when confidence between hide and warn thresholds', () => {
    assert.equal(classifyBehavior(DEGRADE_CONF_WARN_THRESHOLD - 0.01), 'degraded');
    assert.equal(classifyBehavior(DEGRADE_CONF_HIDE_THRESHOLD), 'degraded');
  });

  test('hidden when confidence below hide threshold', () => {
    assert.equal(classifyBehavior(DEGRADE_CONF_HIDE_THRESHOLD - 0.01), 'hidden');
    assert.equal(classifyBehavior(0), 'hidden');
  });
});

describe('assessDegrade confidence quantification', () => {
  test('all dimensions active yields normal with base confidence', () => {
    const entry = DEGRADE_MATRIX_REGISTRY.find((e) => e.key === 'truly_read_score')!;
    const result = assessDegrade(entry, []);
    assert.equal(result.behavior, 'normal');
    assert.equal(result.retentionRatio, 1);
    assert.equal(result.confidence, entry.baseConfidence);
    assert.deepEqual(result.disabledDimensions, []);
  });

  test('disabling 2 of 4 dims on truly_read_score falls into degraded', () => {
    const entry = DEGRADE_MATRIX_REGISTRY.find((e) => e.key === 'truly_read_score')!;
    const result = assessDegrade(entry, ['highlight', 'note']);
    assert.equal(result.retentionRatio, 0.5);
    assert.equal(result.confidence, entry.baseConfidence * 0.5);
    assert.equal(result.behavior, 'degraded');
    assert.deepEqual(result.retainedDimensions, ['reread', 'dwell']);
  });

  test('disabling all required dims yields hidden with zero confidence', () => {
    const entry = DEGRADE_MATRIX_REGISTRY.find((e) => e.key === 'quadrant')!;
    const result = assessDegrade(entry, ['highlight', 'note']);
    assert.equal(result.retentionRatio, 0);
    assert.equal(result.confidence, 0);
    assert.equal(result.behavior, 'hidden');
  });

  test('tooltip three elements are populated with concrete dimension names', () => {
    const entry = DEGRADE_MATRIX_REGISTRY.find((e) => e.key === 'reading_health')!;
    const result = assessDegrade(entry, ['dwell']);
    assert.ok(result.tooltip.whatIsMissing.includes('dwell'));
    assert.ok(result.tooltip.whyItMatters.length > 0);
    assert.ok(result.tooltip.howToRestore.length > 0);
  });
});

describe('assessAllDegrade and findDegraded registry rollups', () => {
  test('assessAllDegrade returns one assessment per registered metric', () => {
    const all = assessAllDegrade(undefined, []);
    assert.equal(all.length, DEGRADE_MATRIX_REGISTRY.length);
    for (const item of all) {
      assert.equal(item.behavior, 'normal');
    }
  });

  test('findDegraded filters out normal-behavior metrics', () => {
    const degraded = findDegraded(undefined, ['highlight', 'note', 'reread', 'dwell']);
    assert.ok(degraded.length >= 1);
    for (const item of degraded) {
      assert.notEqual(item.behavior, 'normal');
    }
  });
});

describe('data account toggle and disabled dimensions', () => {
  test('toggleEntry disables and re-enables an entry', () => {
    const now = '2026-06-28T00:00:00.000Z';
    const book = createDefaultDataAccount(now);
    const disabled = toggleEntry(book, 'highlight', false, now);
    assert.deepEqual(listDisabledDimensions(disabled), ['highlight']);
    const reEnabled = toggleEntry(disabled, 'highlight', true, now);
    assert.deepEqual(listDisabledDimensions(reEnabled), []);
  });

  test('toggleEntry throws under minimal mode', () => {
    const now = '2026-06-28T00:00:00.000Z';
    const book = createDefaultDataAccount(now);
    const minimalBook = { ...book, minimalMode: true };
    assert.throws(() => toggleEntry(minimalBook, 'highlight', false, now));
  });
});

describe('saturate function handles ceiling effect', () => {
  test('zero input yields zero score', () => {
    assert.equal(saturate(0, 30), 0);
  });

  test('value equal to tau yields 0.5', () => {
    assert.equal(saturate(30, 30), 0.5);
    assert.equal(saturate(500, 500), 0.5);
  });

  test('power user 5269 highlights saturates near but below 1', () => {
    const score = saturateHighlight(5269);
    assert.ok(score > 0.99);
    assert.ok(score < 1);
  });

  test('note saturation is stricter than highlight at same raw count', () => {
    const rawCount = 50;
    assert.ok(saturateNote(rawCount) < saturateHighlight(rawCount));
  });
});

describe('computeTimeDecay exponential decay', () => {
  test('zero days yields factor 1', () => {
    const now = 1_000_000;
    assert.equal(computeTimeDecay(now, now), 1);
  });

  test('half-life approximately 248 days', () => {
    const realisticNow = 1_700_000_000_000;
    const dayMs = 24 * 60 * 60 * 1000;
    const lastTime = realisticNow - 248 * dayMs;
    const factor = computeTimeDecay(lastTime, realisticNow);
    assert.ok(factor > 0.49 && factor < 0.51, `expected ~0.5, got ${factor}`);
  });

  test('invalid lastActivityTime yields 0', () => {
    assert.equal(computeTimeDecay(0, 1000), 0);
    assert.equal(computeTimeDecay(-1, 1000), 0);
  });
});

describe('computeObjectiveScore weighted dimensions', () => {
  test('all-zero dims yields zero objective', () => {
    const dims = {
      highlightCount: 0,
      noteCharCount: 0,
      reviewCharCount: 0,
      hasLongReview: false,
      totalChapters: 10,
      chaptersCovered: 0,
      lastActivityTime: 0,
      firstActivityTime: 0,
    };
    const result = computeObjectiveScore(dims);
    assert.equal(result.raw, 0);
    assert.equal(result.breakdown.highlight, 0);
    assert.equal(result.breakdown.note, 0);
  });

  test('long review sets review breakdown to 1', () => {
    const dims = {
      highlightCount: 0,
      noteCharCount: 0,
      reviewCharCount: 100,
      hasLongReview: true,
      totalChapters: 10,
      chaptersCovered: 0,
      lastActivityTime: 0,
      firstActivityTime: 0,
    };
    const result = computeObjectiveScore(dims);
    assert.equal(result.breakdown.review, 1);
  });
});

describe('computeTrulyReadScore full pipeline', () => {
  const FIXED_NOW = 10_000_000_000;
  const dayMs = 24 * 60 * 60 * 1000;

  test('empty signals yield zero confidence', () => {
    const profile = {
      bookId: 'b1',
      dims: {
        highlightCount: 0,
        noteCharCount: 0,
        reviewCharCount: 0,
        hasLongReview: false,
        totalChapters: 10,
        chaptersCovered: 0,
        lastActivityTime: 0,
        firstActivityTime: 0,
      },
    };
    const score = computeTrulyReadScore(profile, undefined, { now: FIXED_NOW });
    assert.equal(score.confidence, 0);
    assert.equal(score.objectiveRaw, 0);
    assert.equal(score.timeDecayFactor, 0);
  });

  test('recent rich reader scores high', () => {
    const profile = {
      bookId: 'b2',
      dims: {
        highlightCount: 60,
        noteCharCount: 1200,
        reviewCharCount: 400,
        hasLongReview: true,
        totalChapters: 20,
        chaptersCovered: 18,
        lastActivityTime: FIXED_NOW - dayMs,
        firstActivityTime: FIXED_NOW - 30 * dayMs,
      },
    };
    const score = computeTrulyReadScore(profile, undefined, { now: FIXED_NOW });
    assert.ok(score.confidence > 0.5, `expected >0.5, got ${score.confidence}`);
    assert.ok(score.objectiveRaw > 0.6);
    assert.ok(score.timeDecayFactor > 0.99);
  });

  test('stale book decays confidence even with rich signals', () => {
    const dims = {
      highlightCount: 60,
      noteCharCount: 1200,
      reviewCharCount: 400,
      hasLongReview: true,
      totalChapters: 20,
      chaptersCovered: 18,
      lastActivityTime: FIXED_NOW - 500 * dayMs,
      firstActivityTime: FIXED_NOW - 800 * dayMs,
    };
    const score = computeTrulyReadScore({ bookId: 'b3', dims }, undefined, { now: FIXED_NOW });
    assert.ok(score.timeDecayFactor < 0.3);
    assert.ok(score.confidence < score.objectiveRaw);
  });

  test('subjective verification boosts confidence', () => {
    const dims = {
      highlightCount: 20,
      noteCharCount: 300,
      reviewCharCount: 0,
      hasLongReview: false,
      totalChapters: 10,
      chaptersCovered: 5,
      lastActivityTime: FIXED_NOW,
      firstActivityTime: FIXED_NOW,
    };
    const withoutVerification = computeTrulyReadScore(
      { bookId: 'b4', dims },
      undefined,
      { now: FIXED_NOW },
    );
    const verification = {
      bookId: 'b4',
      claims: [
        { questionId: 'q1', userAnswer: 'a', correct: true, claimedAt: FIXED_NOW },
        { questionId: 'q2', userAnswer: 'b', correct: true, claimedAt: FIXED_NOW },
      ],
      passRate: 1,
      verifiedAt: FIXED_NOW,
    };
    const withVerification = computeTrulyReadScore(
      { bookId: 'b4', dims },
      verification,
      { now: FIXED_NOW },
    );
    assert.ok(withVerification.confidence > withoutVerification.confidence);
    assert.equal(withVerification.subjectiveRate, 1);
  });

  test('degrade confidence multiplies down when dims disabled', () => {
    const dims = {
      highlightCount: 40,
      noteCharCount: 800,
      reviewCharCount: 200,
      hasLongReview: false,
      totalChapters: 15,
      chaptersCovered: 10,
      lastActivityTime: FIXED_NOW,
      firstActivityTime: FIXED_NOW,
    };
    const fullScore = computeTrulyReadScore(
      { bookId: 'b5', dims },
      undefined,
      { now: FIXED_NOW, degradeConfidence: 1 },
    );
    const degradedScore = computeTrulyReadScore(
      { bookId: 'b5', dims },
      undefined,
      { now: FIXED_NOW, degradeConfidence: 0.45 },
    );
    assert.ok(degradedScore.confidence < fullScore.confidence);
    assert.equal(degradedScore.confidence, fullScore.confidence * 0.45);
  });

  test('confidence never exceeds 1 even with extreme values', () => {
    const profile = {
      bookId: 'b6',
      dims: {
        highlightCount: 99999,
        noteCharCount: 999999,
        reviewCharCount: 99999,
        hasLongReview: true,
        totalChapters: 100,
        chaptersCovered: 100,
        lastActivityTime: FIXED_NOW,
        firstActivityTime: FIXED_NOW,
      },
    };
    const score = computeTrulyReadScore(profile, undefined, { now: FIXED_NOW });
    assert.ok(score.confidence <= 1, `expected <=1, got ${score.confidence}`);
    assert.ok(score.confidence > 0.6, `expected >0.6 (objective ceiling without verification), got ${score.confidence}`);
  });
});
