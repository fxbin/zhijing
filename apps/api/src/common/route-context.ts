import type { FastifyInstance } from 'fastify';
import type { OrchestratorSession } from '@zhijing/agent';

/**
 * 路由共享上下文。
 *
 * 封装 buildApi 内部需要在多个路由间共享的可变状态，
 * 避免路由文件直接访问 buildApi 的局部变量。
 *
 * @module route-context
 * @author fxbin
 */
export interface RouteContext {
  /** 活跃 Agent 会话注册表：sessionId → OrchestratorSession */
  activeAgents: Map<string, OrchestratorSession>;
  /** 每日摘要内存缓存：由 daily-digest 路由读写，cron 每日 8 点写入 */
  dailyDigestCache: { date: string; data: unknown } | null;
}

/**
 * 路由注册函数的统一签名。
 * @author fxbin
 */
export type RouteRegistrar = (app: FastifyInstance, ctx?: RouteContext) => void;
