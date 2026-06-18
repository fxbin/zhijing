import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  artifactSubtypeSchemas,
  mockArtifactSubtypeOutput,
  validateArtifactSubtypeOutput,
  StructuredOutputValidationError,
} from './index.js';

const SUBTYPES = Object.keys(artifactSubtypeSchemas) as Array<keyof typeof artifactSubtypeSchemas>;

describe('validateArtifactSubtypeOutput', () => {
  test('合法产物（含全部可选字段）对每个 subtype 均通过', () => {
    for (const subtype of SUBTYPES) {
      const output = mockArtifactSubtypeOutput(subtype, '测试主题');
      assert.doesNotThrow(() => validateArtifactSubtypeOutput(subtype, output));
    }
  });

  test('合法产物（仅必填字段）也通过', () => {
    const minimal = {
      summary: '最小产物',
      sections: [{ title: '第一节', body: '正文内容' }],
    };
    for (const subtype of SUBTYPES) {
      assert.doesNotThrow(() => validateArtifactSubtypeOutput(subtype, minimal));
    }
  });

  test('缺失 summary 抛错', () => {
    const bad = { sections: [{ title: 'a', body: 'b' }] };
    assert.throws(
      () => validateArtifactSubtypeOutput('summary', bad),
      StructuredOutputValidationError,
    );
  });

  test('空字符串 summary 抛错', () => {
    const bad = { summary: '  ', sections: [{ title: 'a', body: 'b' }] };
    assert.throws(
      () => validateArtifactSubtypeOutput('summary', bad),
      StructuredOutputValidationError,
    );
  });

  test('空 sections 数组抛错', () => {
    const bad = { summary: '摘要', sections: [] };
    assert.throws(
      () => validateArtifactSubtypeOutput('deep_research', bad),
      StructuredOutputValidationError,
    );
  });

  test('section 缺失 body 抛错', () => {
    const bad = { summary: '摘要', sections: [{ title: '只有标题' }] };
    assert.throws(
      () => validateArtifactSubtypeOutput('product', bad),
      StructuredOutputValidationError,
    );
  });

  test('非对象输出抛错', () => {
    assert.throws(
      () => validateArtifactSubtypeOutput('summary', null),
      StructuredOutputValidationError,
    );
    assert.throws(
      () => validateArtifactSubtypeOutput('summary', []),
      StructuredOutputValidationError,
    );
  });

  test('未知 subtype 抛错', () => {
    assert.throws(
      () => validateArtifactSubtypeOutput('unknown_type' as never, { summary: 'x', sections: [] }),
      StructuredOutputValidationError,
    );
  });
});

describe('mockArtifactSubtypeOutput', () => {
  test('每个 subtype 的 mock 产物都能通过自身校验', () => {
    for (const subtype of SUBTYPES) {
      const output = mockArtifactSubtypeOutput(subtype, '深度研究主题');
      assert.ok(typeof output === 'object' && output !== null);
      validateArtifactSubtypeOutput(subtype, output);
    }
  });

  test('mock 产物 sections 至少一项', () => {
    for (const subtype of SUBTYPES) {
      const output = mockArtifactSubtypeOutput(subtype, '主题') as { sections: unknown[] };
      assert.ok(Array.isArray(output.sections) && output.sections.length >= 1);
    }
  });
});
