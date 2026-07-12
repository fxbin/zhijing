/**
 * TypeBox schema 定义模块。
 *
 * 集中声明所有结构化生成产物的 JSON schema，供 pi-runtime 校验、
 * mock 生成与 LLM 调用时引用。schema 即契约，修改需同步下游消费方。
 *
 * @module schemas
 * @author fxbin
 */
import { Type } from '@earendil-works/pi-ai';

export const citationScopeSchema = Type.Object({
  materialId: Type.Optional(Type.String()),
  sourceUrl: Type.Optional(Type.String()),
  quote: Type.Optional(Type.String()),
  note: Type.Optional(Type.String()),
});

export const knowledgeCardSchema = Type.Object({
  type: Type.Optional(Type.Union([
    Type.Literal('concept'),
    Type.Literal('method'),
    Type.Literal('case'),
    Type.Literal('question'),
    Type.Literal('step'),
    Type.Literal('viewpoint'),
  ])),
  title: Type.String(),
  body: Type.String(),
  citationScope: Type.Optional(citationScopeSchema),
});

export const knowledgeCardsSchema = Type.Object({
  cards: Type.Array(knowledgeCardSchema),
});

export const topicSkeletonSchema = Type.Object({
  title: Type.String(),
  summary: Type.String(),
  cards: Type.Array(knowledgeCardSchema),
  artifactTitle: Type.Optional(Type.String()),
  artifactBody: Type.Optional(Type.String()),
});

export const materialSummarySchema = Type.Object({
  summary: Type.String(),
  cards: Type.Array(knowledgeCardSchema),
  artifactTitle: Type.Optional(Type.String()),
  artifactBody: Type.Optional(Type.String()),
  citationScope: Type.Optional(citationScopeSchema),
});

export const questionAnswerSchema = Type.Object({
  summary: Type.String(),
  cards: Type.Array(knowledgeCardSchema),
  artifactTitle: Type.Optional(Type.String()),
  artifactBody: Type.Optional(Type.String()),
  citationScope: Type.Optional(citationScopeSchema),
});

export const entityExtractionSchema = Type.Object({
  entities: Type.Array(Type.Object({
    name: Type.String(),
    type: Type.Union([
      Type.Literal('person'),
      Type.Literal('organization'),
      Type.Literal('concept'),
      Type.Literal('tool'),
      Type.Literal('place'),
      Type.Literal('event'),
      Type.Literal('other'),
    ]),
    description: Type.String(),
  })),
});

/**
 * 苏格拉底追问 schema（P11-2）。
 *
 * 铁律：只包含 questions 字段，绝不包含 answer 字段。
 * Agent 只生成提问，不生成答案，避免替代用户建构认知。
 *
 * @author fxbin
 */
export const socraticQuestioningSchema = Type.Object({
  questions: Type.Array(Type.Object({
    question: Type.String(),
    type: Type.Union([
      Type.Literal('definition_clarity'),
      Type.Literal('evidence_probe'),
      Type.Literal('counterexample_challenge'),
      Type.Literal('boundary_probe'),
      Type.Literal('connection_probe'),
    ]),
    rationale: Type.String(),
    targetCardId: Type.Optional(Type.String()),
  })),
});

export const structuredSchemas = {
  workspace_skeleton: topicSkeletonSchema,
  material_summary: materialSummarySchema,
  knowledge_cards: knowledgeCardsSchema,
  question_answer: questionAnswerSchema,
  entity_extraction: entityExtractionSchema,
  socratic_questioning: socraticQuestioningSchema,
} as const;

const artifactSectionSchema = Type.Object({
  title: Type.String(),
  body: Type.String(),
});

export const artifactSubtypeSchemas = {
  summary: Type.Object({
    summary: Type.String(),
    sections: Type.Array(artifactSectionSchema),
    followUpQuestions: Type.Optional(Type.Array(Type.String())),
  }),
  deep_research: Type.Object({
    summary: Type.String(),
    sections: Type.Array(artifactSectionSchema),
    openQuestions: Type.Optional(Type.Array(Type.String())),
    references: Type.Optional(Type.Array(artifactSectionSchema)),
  }),
  product: Type.Object({
    summary: Type.String(),
    sections: Type.Array(artifactSectionSchema),
    accountDiagnosis: Type.Optional(Type.Array(artifactSectionSchema)),
    alternatives: Type.Optional(Type.Array(artifactSectionSchema)),
  }),
  xiaohongshu: Type.Object({
    summary: Type.String(),
    sections: Type.Array(artifactSectionSchema),
    publishingQueue: Type.Optional(Type.Array(artifactSectionSchema)),
    accountStrategy: Type.Optional(artifactSectionSchema),
  }),
  topic: Type.Object({
    summary: Type.String(),
    sections: Type.Array(artifactSectionSchema),
    openQuestions: Type.Optional(Type.Array(Type.String())),
  }),
} as const;

export type ArtifactSubtype = keyof typeof artifactSubtypeSchemas;

export const ARTIFACT_SUBTYPE_LIST = Object.keys(artifactSubtypeSchemas) as ArtifactSubtype[];
