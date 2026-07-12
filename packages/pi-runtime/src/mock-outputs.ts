/**
 * Mock 输出生成模块。
 *
 * 在未配置真实 LLM provider 时，为结构化生成与 artifact subtype 产物
 * 生成本地 mock 数据，确保知识库创建闭环可先跑通。配置 Pi provider 后
 * 会被真实生成结果替换。
 *
 * @module mock-outputs
 * @author fxbin
 */
import type { StructuredGenerationRequest } from './types.js';
import type { ArtifactSubtype } from './schemas.js';
import { compactTitle } from './title-utils.js';

/**
 * 根据结构化生成请求生成本地 mock 输出。
 *
 * 覆盖 workspace_skeleton、question_answer、entity_extraction、
 * socratic_questioning 等 task 类型，其余 task 走默认 material_summary 分支。
 *
 * @param request - 结构化生成请求
 * @returns mock 结构化产物
 * @author fxbin
 */
export function mockOutputFor(request: StructuredGenerationRequest) {
  const title = compactTitle(request.prompt);
  if (request.task === 'workspace_skeleton') {
    return {
      title,
      summary: `围绕「${title}」生成的本地知识库骨架。配置 Pi provider 后会替换为真实结构化生成。`,
      cards: [
        {
          type: 'concept',
          title: `${title} 的核心概念`,
          body: '这是一张本地 mock 骨架卡片，用于先跑通知识库创建闭环。',
        },
        {
          type: 'question',
          title: '下一步要回答的问题',
          body: '这个主题还需要补充哪些高质量来源、案例和可验证证据？',
        },
      ],
      artifactTitle: `${title} 摘要`,
      artifactBody: [
        '## 摘要',
        `已创建「${title}」主题骨架，下一步可以继续导入来源资料。`,
        '## 来源边界',
        '当前产物为主题骨架，尚未绑定具体来源资料，可在编辑模式下补充。',
        '## 下一步行动',
        '- 补充更多可追溯来源',
        '- 将核心卡片整理成问题与方法',
        '- 对低置信内容进行人工复核',
      ].join('\n'),
    };
  }

  if (request.task === 'question_answer') {
    return {
      summary: '问题已保存为当前知识库的待回答线索。配置 Pi provider 后会生成真实回答和引用范围。',
      cards: [
        {
          type: 'question',
          title,
          body: '这是一个待回答问题，后续会基于知识库资料生成有引用的回答。',
        },
      ],
      artifactTitle: `${title} 问答线索`,
      artifactBody: [
        '## 摘要',
        '已保存问题，等待后续基于来源资料回答。',
        '## 来源边界',
        '当前产物为问答线索，尚未绑定具体来源资料，可在编辑模式下补充。',
        '## 下一步行动',
        '- 补充与问题相关的可追溯来源',
        '- 基于来源资料生成有引用的回答',
        '- 对回答中的低置信内容进行人工复核',
      ].join('\n'),
    };
  }

  if (request.task === 'entity_extraction') {
    return {
      entities: [
        { name: `${title} 核心概念`, type: 'concept', description: '从当前知识库卡片中提取的核心概念占位，配置 Pi provider 后会替换为真实实体。' },
        { name: '相关工具', type: 'tool', description: '与该主题相关的工具或平台占位。' },
      ],
    };
  }

  if (request.task === 'socratic_questioning') {
    return {
      questions: [
        {
          question: `「${title}」这个概念的核心边界是什么？哪些情况不属于它的范畴？`,
          type: 'definition_clarity',
          rationale: '骨架卡缺乏明确定义，需要用户澄清概念边界',
        },
        {
          question: `支撑「${title}」这一论断的证据来源是什么？是否可验证？`,
          type: 'evidence_probe',
          rationale: '骨架卡未标注证据来源，需要用户补充可验证依据',
        },
        {
          question: `是否存在与「${title}」相反的案例或反例？这些反例如何解释？`,
          type: 'counterexample_challenge',
          rationale: '引导用户思考反例，避免确认偏误',
        },
      ],
    };
  }

  return {
    summary: '本地 mock 已保存资料并生成初始卡片。配置 Pi provider 后会替换为真实摘要和抽取结果。',
    cards: [
      {
        type: 'concept',
        title: `${title} 的核心概念`,
        body: '从导入资料中提取出的第一张知识卡片，后续会由 Pi 结构化生成替换。',
      },
      {
        type: 'question',
        title: `《${title}》还需补充的证据`,
        body: `围绕「${title}」这份资料，还需要补充哪些背景、案例和可验证证据？`,
      },
    ],
    artifactTitle: `${title} 摘要`,
    artifactBody: [
      '## 摘要',
      `已保存资料「${title}」，并生成可继续整理的摘要占位。`,
      '## 来源边界',
      `当前产物基于资料「${title}」生成，可在编辑模式下补充更多可追溯来源。`,
      '## 下一步行动',
      '- 补充更多可追溯来源',
      '- 将核心卡片整理成问题与方法',
      '- 对低置信内容进行人工复核',
    ].join('\n'),
  };
}

/**
 * 为 artifact subtype 生成本地 mock 产物。
 *
 * 覆盖 summary、deep_research、product、xiaohongshu、topic 五种 subtype，
 * 每种返回满足对应 schema 的最小可用产物，用于先跑通校验与渲染闭环。
 *
 * @param subtype - artifact 子类型
 * @param prompt - 原始提示文本
 * @returns mock artifact 产物
 * @author fxbin
 */
export function mockArtifactSubtypeOutput(subtype: ArtifactSubtype, prompt: string): unknown {
  const title = compactTitle(prompt);
  const summary = `${title} 的本地 mock 结构化产物。配置 Pi provider 后会替换为真实生成内容。`;
  const sections = [
    { title: `${title} 核心要点`, body: '这是本地 mock 生成的产物片段，用于先跑通结构化校验与渲染闭环。' },
    { title: '后续补充方向', body: '配置真实 Pi provider 后，该内容会被替换为基于资料的生成结果。' },
  ];

  if (subtype === 'summary') {
    return { summary, sections, followUpQuestions: ['这个主题还需要补充哪些高质量来源？'] };
  }
  if (subtype === 'deep_research') {
    return {
      summary,
      sections,
      openQuestions: ['当前资料是否足以支撑深度结论？'],
      references: [{ title: '参考来源占位', body: '配置真实生成后会回填引用资料。' }],
    };
  }
  if (subtype === 'product') {
    return {
      summary,
      sections,
      accountDiagnosis: [{ title: '账号诊断占位', body: '配置真实生成后会给出账号定位建议。' }],
      alternatives: [{ title: '替代方案占位', body: '配置真实生成后会列出竞品或替代路径。' }],
    };
  }
  if (subtype === 'xiaohongshu') {
    return {
      summary,
      sections,
      publishingQueue: [{ title: '选题占位', body: '配置真实生成后会生成发布队列选题。' }],
      accountStrategy: { title: '账号策略占位', body: '配置真实生成后会给出账号内容策略。' },
    };
  }
  return { summary, sections, openQuestions: ['该主题还有哪些值得展开的方向？'] };
}
