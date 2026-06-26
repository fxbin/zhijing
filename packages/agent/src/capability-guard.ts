import type { AgentTool } from '@earendil-works/pi-agent-core';
import type { TSchema } from '@zhijing/pi-runtime';

/**
 * 工具能力分类。
 *
 * - read：只读检索，不修改任何数据，不联网
 * - mutate：会修改工作区数据（写入/更新/删除卡片、资料、产物等）
 * - network：会发起外部网络请求（抓取网页、调用第三方 API）
 *
 * 知径当前所有工具都是 read 类；mutate/network 用于未来扩展时的门禁。
 *
 * @author fxbin
 */
export type ToolCapability = 'read' | 'mutate' | 'network';

/**
 * 工具能力声明。
 *
 * - capability：能力分类，决定是否允许挂载到 Agent
 * - workspaceScoped：是否绑定到单个工作区；true 表示工具只能访问构造时注入的 workspaceId
 *
 * workspaceScoped 主要用于审计与未来跨工作区工具的门禁扩展；
 * 当前所有工具都通过闭包绑定 workspaceId，运行时无法越界。
 *
 * @author fxbin
 */
export interface ToolCapabilityDeclaration {
  capability: ToolCapability;
  workspaceScoped: boolean;
}

/**
 * 允许挂载到知径 Agent 的工具能力白名单。
 *
 * 当前只允许 read 类工具：知径 Agent 的能力边界是「只检索当前工作区」，
 * 任何 mutate/network 工具都必须显式放开此白名单后才能挂载。
 *
 * @author fxbin
 */
const ALLOWED_TOOL_CAPABILITIES: ReadonlySet<ToolCapability> = new Set<ToolCapability>(['read']);

/**
 * 工具调用审计条目。
 *
 * 每次工具调用（无论成功失败）都会生成一条审计条目，通过 sink 回调输出。
 * 用于排查工具调用链路问题、统计工具使用频率、定位慢调用。
 *
 * @author fxbin
 */
export interface ToolCallAuditEntry {
  toolName: string;
  toolCallId: string;
  paramsPreview: string;
  startedAt: string;
  durationMs: number;
  ok: boolean;
  errorMessage?: string;
}

/**
 * 审计日志接收器；调用方注入，每个工具调用产生一条 entry。
 *
 * 默认实现为 defaultConsoleAuditSink，输出到 console.warn；
 * 调用方可注入自定义 sink（如结构化日志、监控上报）。
 *
 * @author fxbin
 */
export type ToolCallAuditSink = (entry: ToolCallAuditEntry) => void;

/**
 * 参数预览的最大字符数，避免审计日志过长挤占日志通道。
 */
const PARAMS_PREVIEW_MAX_LENGTH = 200;

/**
 * 将工具调用参数序列化为预览字符串，截断超长内容。
 *
 * @param params - 工具调用参数
 * @returns 预览字符串；无法序列化时返回固定标记
 * @author fxbin
 */
function previewParams(params: unknown): string {
  if (params === null || params === undefined) {
    return '';
  }
  try {
    const json = JSON.stringify(params);
    return json.length > PARAMS_PREVIEW_MAX_LENGTH
      ? `${json.slice(0, PARAMS_PREVIEW_MAX_LENGTH)}…`
      : json;
  } catch {
    return '[unserializable]';
  }
}

/**
 * 校验工具能力是否在白名单内。
 *
 * 在工具挂载时（createWorkspaceAgent）调用，fail-fast：
 * 非 read 类工具直接抛错，避免 Agent 启动后才发现能力越界。
 *
 * @param declaration - 工具能力声明
 * @throws Error 当 capability 不在白名单内时
 * @author fxbin
 */
export function assertToolCapabilityAllowed(declaration: ToolCapabilityDeclaration): void {
  if (!ALLOWED_TOOL_CAPABILITIES.has(declaration.capability)) {
    throw new Error(
      `capability-guard: tool with capability "${declaration.capability}" is not allowed. Allowed: ${[...ALLOWED_TOOL_CAPABILITIES].join(', ')}.`,
    );
  }
}

/**
 * 用 capability 门禁与审计日志包装一个工具。
 *
 * 包装后的工具在 execute 时会：
 * 1. 记录开始时间与参数预览
 * 2. 调用原始 execute（透传全部参数，含 signal / onUpdate）
 * 3. 记录耗时与成功/失败状态
 * 4. 通过 sink 输出审计条目
 *
 * capability 校验在挂载时已通过 assertToolCapabilityAllowed 完成，
 * 此处不再重复校验，避免每次调用都检查白名单。
 *
 * 失败时审计条目仍会输出（含 errorMessage），随后原样抛出原始错误，
 * 不吞错、不转换错误类型，保持 Agent 调用链路的错误处理契约不变。
 *
 * TParams 约束为 TSchema（TypeBox schema），与 pi-agent-core AgentTool 定义一致；
 * execute 使用 rest 参数透传，确保 signal / onUpdate 等可选参数不被丢弃。
 *
 * @param tool - 原始工具
 * @param declaration - 工具能力声明（仅用于审计上下文，此处不再校验）
 * @param sink - 审计日志接收器
 * @returns 包装后的工具，行为与原始工具一致，仅增加审计
 * @author fxbin
 */
export function wrapToolWithGuard<TParams extends TSchema, TDetails>(
  tool: AgentTool<TParams, TDetails>,
  declaration: ToolCapabilityDeclaration,
  sink: ToolCallAuditSink,
): AgentTool<TParams, TDetails> {
  const originalExecute = tool.execute;
  return {
    ...tool,
    async execute(...args: Parameters<typeof originalExecute>): Promise<Awaited<ReturnType<typeof originalExecute>>> {
      const toolCallId = args[0];
      const params = args[1];
      const startedAt = new Date().toISOString();
      const startMs = Date.now();
      const paramsPreview = previewParams(params);
      try {
        const result = await originalExecute(...args);
        const entry: ToolCallAuditEntry = {
          toolName: tool.name,
          toolCallId,
          paramsPreview,
          startedAt,
          durationMs: Date.now() - startMs,
          ok: true,
        };
        sink(entry);
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const entry: ToolCallAuditEntry = {
          toolName: tool.name,
          toolCallId,
          paramsPreview,
          startedAt,
          durationMs: Date.now() - startMs,
          ok: false,
          errorMessage,
        };
        sink(entry);
        throw error;
      }
    },
  };
}

/**
 * 默认审计日志接收器：输出到 console.warn。
 *
 * 选择 console.warn 而非 console.log，确保审计日志在生产环境可见，
 * 同时不被 stdout 重定向到正常业务流。
 *
 * 输出单行紧凑日志，便于人工排查与日志采集工具解析。
 *
 * @param entry - 审计条目
 * @author fxbin
 */
export const defaultConsoleAuditSink: ToolCallAuditSink = (entry: ToolCallAuditEntry) => {
  const status = entry.ok ? 'ok' : `fail:${entry.errorMessage ?? 'unknown'}`;
  console.warn(`[agent-tool-audit] name=${entry.toolName} status=${status} ms=${entry.durationMs} callId=${entry.toolCallId}`);
};
