/**
 * NS-5 全量整合灰度验证脚本（S8-4）。
 *
 * 用 4 类 mock 账号（新手 / 中度 / 重度 / 极简）跑 8 个 NS 核心纯函数，
 * 断言关键红线（不崩溃 + 返回结构合法 + 红线条件满足），输出验证矩阵。
 *
 * 运行方式：npx tsx scripts/gray-validate.mjs
 *
 * 4 类账号说明：
 * - novice   划线总数 < 50，书籍 < 10
 * - regular  划线总数 50-200，书籍 30-80
 * - power    划线总数 > 200，书籍 > 100
 * - minimal  同 regular 但极简模式开启（验证功能隐藏契约）
 *
 * @author fxbin
 */

import {
  computeQuadrantSummary,
  computeTrulyReadScore,
  computeTopicSpectrum,
  evaluateAntiVanity,
  assessAllDegrade,
  DEGRADE_MATRIX_REGISTRY,
  buildVerificationBank,
  buildHiddenInterestHint,
  applyPermanentDismissal,
  buildInitialReaderModeState,
  resolveEffectiveTier,
  classifyAudienceTier,
  buildMinimalFeatureState,
  isFeatureVisible,
  NOVICE_SIGNAL_THRESHOLD,
  POWER_SIGNAL_THRESHOLD,
} from '../packages/core/src/index.ts';

const FIXED_NOW = 1717000000000;

let passCount = 0;
let failCount = 0;
const matrix = [];

function assert(condition, message) {
  if (condition) {
    passCount += 1;
    console.log(`  \u2713 ${message}`);
  } else {
    failCount += 1;
    console.error(`  \u2717 ${message}`);
  }
}

function makeBooks(count, highlightsPerBook, notesPerBook, chaptersPerBook) {
  const books = [];
  for (let i = 0; i < count; i += 1) {
    const onShelf = i % 3 !== 2;
    books.push({
      bookId: `book-${i}`,
      title: `\u4e66\u7c4d${i}`,
      onShelf,
      highlightCount: highlightsPerBook,
      noteCharCount: notesPerBook * 50,
      chapterCount: chaptersPerBook,
      hasLongReview: notesPerBook > 5,
    });
  }
  return books;
}

function makeHighlights(count) {
  const highlights = [];
  for (let i = 0; i < count; i += 1) {
    highlights.push({
      id: `hl-${i}`,
      text: `\u8fd9\u662f\u7b2c${i}\u6761\u5212\u7ebf\u5185\u5bb9\uff0c\u5173\u4e8e\u9605\u8bfb\u4e0e\u601d\u8003\u7684\u8bb0\u5f55\u3002`,
      chapterRef: `\u7b2c${Math.floor(i / 5) + 1}\u7ae0`,
      time: FIXED_NOW - i * 86400000,
    });
  }
  return highlights;
}

const ACCOUNTS = [
  {
    label: '\u65b0\u624b',
    key: 'novice',
    books: makeBooks(8, 3, 1, 10),
    highlights: makeHighlights(20),
    disabledDims: [],
    minimalMode: false,
  },
  {
    label: '\u4e2d\u5ea6',
    key: 'regular',
    books: makeBooks(60, 8, 4, 15),
    highlights: makeHighlights(120),
    disabledDims: [],
    minimalMode: false,
  },
  {
    label: '\u91cd\u5ea6',
    key: 'power',
    books: makeBooks(150, 15, 10, 20),
    highlights: makeHighlights(300),
    disabledDims: [],
    minimalMode: false,
  },
  {
    label: '\u6781\u7b80',
    key: 'minimal',
    books: makeBooks(60, 8, 4, 15),
    highlights: makeHighlights(120),
    disabledDims: ['reread', 'dwell'],
    minimalMode: true,
  },
];

function testNS1Quadrant(account) {
  console.log(`  [NS-1] \u56db\u8c61\u9650`);
  try {
    const summary = computeQuadrantSummary(account.books);
    assert(summary && Array.isArray(summary.coreReading), '\u8fd4\u56de\u56db\u8c61\u9650\u6570\u7ec4');
    assert(Array.isArray(summary.recommendationSeeds), '\u8fd4\u56de\u63a8\u8350\u79cd\u5b50');
    const seedKinds = new Set(summary.recommendationSeeds.map((id) => {
      const all = [
        ...summary.coreReading,
        ...summary.commitmentDebt,
        ...summary.hiddenInterest,
        ...summary.irrelevant,
      ];
      const found = all.find((b) => b.bookId === id);
      return found ? found.quadrant : 'unknown';
    }));
    const validKinds = seedKinds.size === 0 || [...seedKinds].every((k) => k === 'core_reading' || k === 'hidden_interest');
    assert(validKinds, '\u63a8\u8350\u79cd\u5b50\u4ec5\u6765\u81ea Q1\u222aQ3');
    matrix.push({ account: account.key, ns: 'NS-1', pass: validKinds });
  } catch (err) {
    assert(false, `\u56db\u8c61\u9650\u8ba1\u7b97\u5d29\u6e83: ${err.message}`);
    matrix.push({ account: account.key, ns: 'NS-1', pass: false });
  }
}

function testNS2TopicSpectrum(account) {
  console.log(`  [NS-2] \u4e3b\u9898\u6f14\u53d8\u8c31`);
  try {
    const spectrum = computeTopicSpectrum({
      bookId: 'all',
      highlights: account.highlights.map((h) => ({ id: h.id, text: h.text, time: h.time })),
      booksRead: account.books.length,
      now: FIXED_NOW,
    });
    assert(spectrum && typeof spectrum.algorithm === 'string', '\u8fd4\u56de\u4e3b\u9898\u8c31\u7ed3\u6784');
    assert(spectrum.clusters !== undefined, '\u5305\u542b clusters \u5b57\u6bb5');
    matrix.push({ account: account.key, ns: 'NS-2', pass: true });
  } catch (err) {
    assert(false, `\u4e3b\u9898\u8c31\u8ba1\u7b97\u5d29\u6e83: ${err.message}`);
    matrix.push({ account: account.key, ns: 'NS-2', pass: false });
  }
}

function testNS3TrulyRead(account) {
  console.log(`  [NS-3] \u771f\u8bfb\u8fc7\u7f6e\u4fe1\u5ea6`);
  try {
    const firstBook = account.books[0];
    const score = computeTrulyReadScore(
      {
        bookId: firstBook.bookId,
        dims: {
          highlightCount: firstBook.highlightCount,
          noteCharCount: firstBook.noteCharCount,
          reviewCharCount: firstBook.hasLongReview ? 200 : 0,
          hasLongReview: firstBook.hasLongReview,
          totalChapters: firstBook.chapterCount,
          chaptersCovered: firstBook.chapterCount,
          lastActivityTime: FIXED_NOW - 30 * 86400000,
          firstActivityTime: FIXED_NOW - 60 * 86400000,
          rereadCount: 0,
          dwellSeconds: 0,
        },
      },
      undefined,
      { now: FIXED_NOW },
    );
    assert(typeof score.confidence === 'number', '\u8fd4\u56de\u7f6e\u4fe1\u5ea6\u6570\u503c');
    assert(score.confidence >= 0 && score.confidence <= 1, '\u7f6e\u4fe1\u5ea6\u5728 [0,1] \u8303\u56f4');
    assert(typeof score.confidence === 'number' && score.confidence !== true && score.confidence !== false, '\u7981\u6b62\u5e03\u5c14\u5316\u8f93\u51fa');
    matrix.push({ account: account.key, ns: 'NS-3', pass: score.confidence >= 0 && score.confidence <= 1 });
  } catch (err) {
    assert(false, `\u771f\u8bfb\u8fc7\u8ba1\u7b97\u5d29\u6e83: ${err.message}`);
    matrix.push({ account: account.key, ns: 'NS-3', pass: false });
  }
}

function testNS4AntiVanity(account) {
  console.log(`  [NS-4] \u53cd\u865a\u8363\u95e8\u7981`);
  try {
    const result = evaluateAntiVanity({
      viewId: 'weReadStatsBand',
      dependsOnBehaviorTrace: true,
      sharedAcrossUsers: false,
      hasRankingOrComparison: false,
      emphasizesQuantity: true,
      exposesRawData: true,
      allowsUserChallenge: true,
      isLinearlyOptimizable: false,
    });
    assert(result && Array.isArray(result.items) && result.items.length === 6, '\u8fd4\u56de\u516d\u5173\u68c0\u67e5\u9879');
    assert(typeof result.score === 'number', '\u8fd4\u56de\u8bc4\u5206');
    assert(typeof result.passed === 'boolean', '\u8fd4\u56de\u901a\u8fc7/\u4e0d\u901a\u8fc7');
    matrix.push({ account: account.key, ns: 'NS-4', pass: true });
  } catch (err) {
    assert(false, `\u53cd\u865a\u8363\u8bc4\u4f30\u5d29\u6e83: ${err.message}`);
    matrix.push({ account: account.key, ns: 'NS-4', pass: false });
  }
}

function testNS5RecommendationSeeds(account) {
  console.log(`  [NS-5] \u63a8\u8350\u79cd\u5b50\u6574\u5408`);
  try {
    const summary = computeQuadrantSummary(account.books);
    const seeds = summary.recommendationSeeds;
    const allBooks = [
      ...summary.coreReading,
      ...summary.hiddenInterest,
    ];
    const seedBookIds = new Set(seeds);
    const q1q3Ids = new Set(allBooks.map((b) => b.bookId));
    const allSeedsInQ1Q3 = [...seedBookIds].every((id) => q1q3Ids.has(id));
    assert(allSeedsInQ1Q3, '\u79cd\u5b50\u4ec5\u6765\u81ea Q1(coreReading)\u222aQ3(hiddenInterest)');
    matrix.push({ account: account.key, ns: 'NS-5', pass: allSeedsInQ1Q3 });
  } catch (err) {
    assert(false, `\u63a8\u8350\u79cd\u5b50\u9a8c\u8bc1\u5d29\u6e83: ${err.message}`);
    matrix.push({ account: account.key, ns: 'NS-5', pass: false });
  }
}

function testNS6DegradeMatrix(account) {
  console.log(`  [NS-6] \u964d\u7ea7\u77e9\u9635`);
  try {
    const assessments = assessAllDegrade(
      DEGRADE_MATRIX_REGISTRY,
      account.disabledDims,
    );
    assert(assessments.length === DEGRADE_MATRIX_REGISTRY.length, '\u6240\u6709\u767b\u8bb0\u6307\u6807\u5747\u6709\u8bc4\u4f30\u7ed3\u679c');
    const allValid = assessments.every((a) => typeof a.confidence === 'number' && typeof a.behavior === 'string');
    assert(allValid, '\u6bcf\u9879\u5305\u542b confidence \u548c behavior');
    if (account.disabledDims.length > 0) {
      const hasDegraded = assessments.some((a) => a.behavior !== 'normal');
      assert(hasDegraded, '\u5173\u95ed\u7ef4\u5ea6\u540e\u81f3\u5c11\u4e00\u9879\u964d\u7ea7');
    }
    matrix.push({ account: account.key, ns: 'NS-6', pass: allValid });
  } catch (err) {
    assert(false, `\u964d\u7ea7\u77e9\u9635\u8bc4\u4f30\u5d29\u6e83: ${err.message}`);
    matrix.push({ account: account.key, ns: 'NS-6', pass: false });
  }
}

function testNS7VerificationBank(account) {
  console.log(`  [NS-7] \u9a8c\u8bc1\u9898\u5e93`);
  try {
    const result = buildVerificationBank({
      bookId: account.books[0].bookId,
      highlights: account.highlights.slice(0, 20),
      now: FIXED_NOW,
    });
    assert(result && Array.isArray(result.questions), '\u8fd4\u56de\u9898\u76ee\u6570\u7ec4');
    assert(typeof result.sourceHighlights === 'number', '\u8fd4\u56de\u6e90\u5212\u7ebf\u8ba1\u6570');
    if (result.questions.length > 0) {
      const allHavePrompt = result.questions.every((q) => typeof q.prompt === 'string' && q.prompt.length > 0);
      assert(allHavePrompt, '\u6bcf\u9053\u9898\u5305\u542b prompt');
    }
    matrix.push({ account: account.key, ns: 'NS-7', pass: true });
  } catch (err) {
    assert(false, `\u9a8c\u8bc1\u9898\u5e93\u5d29\u6e83: ${err.message}`);
    matrix.push({ account: account.key, ns: 'NS-7', pass: false });
  }
}

function testNS8ExperienceBoundary(account) {
  console.log(`  [NS-8] \u4f53\u9a8c\u8fb9\u754c`);
  try {
    const summary = computeQuadrantSummary(account.books);
    const initialState = {
      permanentlyDismissed: false,
      lastShownAt: 0,
      dismissedBookIds: [],
      updatedAt: FIXED_NOW,
    };
    const hint = buildHiddenInterestHint(summary, initialState, FIXED_NOW);
    assert(typeof hint.shouldShow === 'boolean', '\u9690\u6027\u771f\u5174\u8da3\u8fd4\u56de shouldShow \u5e03\u5c14');
    const dismissedState = applyPermanentDismissal(initialState, true, FIXED_NOW);
    const hintAfterDismiss = buildHiddenInterestHint(summary, dismissedState, FIXED_NOW);
    assert(hintAfterDismiss.shouldShow === false, '\u6c38\u4e45\u5173\u95ed\u540e\u518d\u4e0d\u5f39\u7a97');

    const totalHighlights = account.books.reduce((sum, b) => sum + b.highlightCount, 0);
    const tier = classifyAudienceTier(totalHighlights);
    const readerState = buildInitialReaderModeState(tier, FIXED_NOW);
    const { effectiveTier } = resolveEffectiveTier(readerState, tier, FIXED_NOW);
    assert(typeof effectiveTier === 'string', '\u8fd4\u56de\u6709\u6548\u6863\u4f4d');

    const minimalState = buildMinimalFeatureState(account.minimalMode, FIXED_NOW);
    if (account.minimalMode) {
      const silencedKeys = minimalState.features
        .filter((f) => f.disposition === 'silenced')
        .map((f) => f.featureKey);
      const silencedVisible = silencedKeys.every((key) => !isFeatureVisible(key, true));
      assert(silencedVisible, '\u6781\u7b80\u6a21\u5f0f\u4e0b silenced \u529f\u80fd\u4e0d\u53ef\u89c1');
    }
    matrix.push({ account: account.key, ns: 'NS-8', pass: hintAfterDismiss.shouldShow === false });
  } catch (err) {
    assert(false, `\u4f53\u9a8c\u8fb9\u754c\u5d29\u6e83: ${err.message}`);
    matrix.push({ account: account.key, ns: 'NS-8', pass: false });
  }
}

const NS_LABELS = ['NS-1', 'NS-2', 'NS-3', 'NS-4', 'NS-5', 'NS-6', 'NS-7', 'NS-8'];
const NS_FUNCS = [
  testNS1Quadrant,
  testNS2TopicSpectrum,
  testNS3TrulyRead,
  testNS4AntiVanity,
  testNS5RecommendationSeeds,
  testNS6DegradeMatrix,
  testNS7VerificationBank,
  testNS8ExperienceBoundary,
];

console.log('S8 \u7070\u5ea6\u9a8c\u8bc1\uff1a8 NS \u00d7 4 \u8d26\u53f7\n');

for (const account of ACCOUNTS) {
  console.log(`\u2500\u2500 ${account.label} (${account.key}) \u2500\u2500`);
  for (let i = 0; i < NS_FUNCS.length; i += 1) {
    NS_FUNCS[i](account);
  }
  console.log('');
}

console.log('\u2500\u2500 \u9a8c\u8bc1\u77e9\u9635 \u2500\u2500\n');
const header = `| \u8d26\u53f7 | ${NS_LABELS.join(' | ')} |`;
const separator = `|---|${NS_LABELS.map(() => '---').join('|')}|`;
console.log(header);
console.log(separator);
for (const account of ACCOUNTS) {
  const cells = NS_LABELS.map((ns) => {
    const entry = matrix.find((m) => m.account === account.key && m.ns === ns);
    return entry && entry.pass ? '\u2713' : '\u2717';
  });
  console.log(`| ${account.label} | ${cells.join(' | ')} |`);
}

console.log(`\n\u603b\u8ba1\uff1a${passCount} \u901a\u8fc7 / ${failCount} \u5931\u8d25`);
if (failCount > 0) {
  console.error('\u7070\u5ea6\u9a8c\u8bc1\u672a\u901a\u8fc7\uff0c\u8bf7\u68c0\u67e5\u4e0a\u65b9\u5931\u8d25\u9879\u3002');
  process.exit(1);
} else {
  console.log('\u7070\u5ea6\u9a8c\u8bc1 100% \u7eff\u3002');
}
