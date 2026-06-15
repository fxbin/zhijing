export interface StructuredGenerationRequest<TSchema = unknown> {
  task: 'knowledge_base_skeleton' | 'material_summary' | 'knowledge_cards' | 'question_answer';
  prompt: string;
  schema?: TSchema;
  context?: Record<string, unknown>;
}

export interface StructuredGenerationResult<TOutput = unknown> {
  output: TOutput;
  provider: 'mock' | 'pi-ai';
  model?: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    costUsd?: number;
  };
}

export interface PiRuntime {
  completeStructured<TOutput = unknown, TSchema = unknown>(
    request: StructuredGenerationRequest<TSchema>,
  ): Promise<StructuredGenerationResult<TOutput>>;
}

export function createMockPiRuntime(): PiRuntime {
  return {
    async completeStructured<TOutput>(request: StructuredGenerationRequest): Promise<StructuredGenerationResult<TOutput>> {
      return {
        provider: 'mock',
        model: 'mock-local',
        output: {
          title: request.prompt.slice(0, 32),
          summary: '本地 mock 生成结果。Phase 2 会替换为 @earendil-works/pi-ai。',
          task: request.task,
        } as TOutput,
        usage: {
          inputTokens: request.prompt.length,
          outputTokens: 32,
          costUsd: 0,
        },
      };
    },
  };
}
