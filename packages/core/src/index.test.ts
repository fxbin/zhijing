import { after, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {
  answerKnowledgeBaseQuestion,
  intakeKnowledge,
  normalizeXiaohongshuInitialStateHtml,
  requestMaterialParsing,
  resetKnowledgeCoreForTests,
  suggestMaterialAssignments,
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
      knowledgeBaseId: memory.knowledgeBase.id,
    });
    const product = await intakeKnowledge({ input: '产品设计研究' });
    const material = await intakeKnowledge({
      input: '间隔复习的核心是根据遗忘曲线安排复习。\n它适合学习语言、概念和考试内容。',
      knowledgeBaseId: product.knowledgeBase.id,
    });

    assert.ok(material.material);
    const suggestions = suggestMaterialAssignments(material.material.id);
    assert.equal(suggestions.suggestions[0].knowledgeBaseId, memory.knowledgeBase.id);
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
    const firstMaterial = await intakeKnowledge({ input: `${url}/article`, knowledgeBaseId: base.knowledgeBase.id });
    const first = await requestMaterialParsing(firstMaterial.material?.id ?? '');
    const secondMaterial = await intakeKnowledge({ input: `${url}/article`, knowledgeBaseId: base.knowledgeBase.id });
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
    const firstMaterial = await intakeKnowledge({ input: `${url}/a`, knowledgeBaseId: base.knowledgeBase.id });
    await requestMaterialParsing(firstMaterial.material?.id ?? '');
    const secondMaterial = await intakeKnowledge({ input: `${url}/b`, knowledgeBaseId: base.knowledgeBase.id });
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
    const material = await intakeKnowledge({ input: `${url}/short`, knowledgeBaseId: base.knowledgeBase.id });
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
      knowledgeBaseId: topic.knowledgeBase.id,
    });

    const answer = await answerKnowledgeBaseQuestion(topic.knowledgeBase.id, '问答应该如何展示来源？');
    assert.ok(answer.citations?.some((citation) => citation.kind === 'material'));
    assert.ok(answer.citations?.some((citation) => citation.kind === 'card'));
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
