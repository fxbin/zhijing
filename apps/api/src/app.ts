import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import cron from 'node-cron';
import Fastify from 'fastify';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ensureDefaultWorkspace,
  generateDailyDigest,
  KnowledgeCoreError,
} from '@zhijing/core';
import type { OrchestratorSession } from '@zhijing/agent';
import type { RouteContext } from './common/route-context.js';
import { resolveAllowedOrigins } from './common/cors.js';
import { isPublicPath } from './common/public-path.js';
import {
  ACCESS_PASSWORD,
  extractAccessToken,
  verifyAccessToken,
} from './common/auth.js';
import { matchRateLimitedPath, isRateLimited } from './common/rate-limit.js';
import { matchLlmPath, isLlmQuotaExceeded } from './common/llm-quota.js';
import { registerSystemRoutes } from './routes/system.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerProxyRoutes } from './routes/proxy.js';
import { registerInspectRoutes } from './routes/inspect.js';
import { registerDashboardRoutes } from './routes/dashboard.js';
import { registerSettingsRoutes } from './routes/settings.js';
import { registerWorkspaceRoutes } from './routes/workspace.js';
import { registerCardRoutes } from './routes/card.js';
import { registerArtifactRoutes } from './routes/artifact.js';
import { registerMapRoutes } from './routes/map.js';
import { registerEvidenceRoutes } from './routes/evidence.js';
import { registerMaterialRoutes } from './routes/material.js';
import { registerAgentRoutes } from './routes/agent.js';
import { registerMiscRoutes } from './routes/misc.js';
import { registerAnalyticsRoutes } from './routes/analytics.js';
import { registerUserMemoryRoutes } from './routes/user-memory.js';
import { registerDecisionLogRoutes } from './routes/decision-log.js';
import { registerWereadRoutes } from './routes/weread.js';
import { registerDataAccountRoutes } from './routes/data-account.js';
import { registerVerificationRoutes } from './routes/verification.js';

/**
 * 构建 API 服务实例。
 *
 * 职责：
 * - 创建 Fastify 实例并注册中间件（CORS、请求门禁、错误处理）
 * - 初始化默认工作区
 * - 组装路由共享上下文（活跃 Agent 会话、每日摘要缓存）
 * - 依次注册全部路由模块
 * - 注册每日摘要 cron 任务
 * - 生产环境注册前端静态文件服务
 *
 * @author fxbin
 */
export async function buildApi() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
    },
    bodyLimit: 16 * 1024 * 1024,
  });

  app.register(cors, {
    origin: resolveAllowedOrigins(),
  });

  app.addHook('onRequest', async (request, reply) => {
    const url = request.url;
    if (isPublicPath(url)) return;
    if (ACCESS_PASSWORD) {
      const token = extractAccessToken(request);
      if (!token || !verifyAccessToken(token)) {
        return reply.code(401).send({ error: 'Access token required.', code: 'AUTH_REQUIRED' });
      }
    }
    const pathPrefix = matchRateLimitedPath(url);
    if (pathPrefix) {
      const ip = request.ip;
      if (isRateLimited(ip, pathPrefix)) {
        return reply.code(429).send({ error: 'Too many requests. Please retry later.' });
      }
    }
    if (matchLlmPath(url)) {
      const ip = request.ip;
      if (isLlmQuotaExceeded(ip)) {
        return reply.code(429).send({ error: 'Daily LLM quota exceeded. Please retry tomorrow.', code: 'LLM_QUOTA_EXCEEDED' });
      }
    }
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof KnowledgeCoreError) {
      return reply.code(error.statusCode).send({ error: error.message });
    }
    request.log.error({ error }, 'unhandled error');
    return reply.code(500).send({ error: 'Internal server error.' });
  });

  ensureDefaultWorkspace();

  /**
   * 运行中的编排会话映射，key 为 sessionId。
   *
   * 生命周期：
   * - /agent/stream 创建 session 后写入
   * - /agent/abort 通过 sessionId 查找并调 session.abort()
   * - stream 正常/异常结束后 finally 中删除
   * - 客户端断开时 reply.raw close 触发 session.abort()，最终走 finally 清理
   */
  const ctx: RouteContext = {
    activeAgents: new Map<string, OrchestratorSession>(),
    dailyDigestCache: null,
  };

  registerSystemRoutes(app);
  registerAuthRoutes(app);
  registerProxyRoutes(app);
  registerInspectRoutes(app);
  registerDashboardRoutes(app);
  registerSettingsRoutes(app);
  registerWorkspaceRoutes(app, ctx);
  registerCardRoutes(app);
  registerArtifactRoutes(app);
  registerMapRoutes(app);
  registerEvidenceRoutes(app);
  registerMaterialRoutes(app);
  registerAgentRoutes(app, ctx);
  registerMiscRoutes(app);
  registerAnalyticsRoutes(app);
  registerUserMemoryRoutes(app);
  registerDecisionLogRoutes(app);
  registerWereadRoutes(app);
  registerDataAccountRoutes(app);
  registerVerificationRoutes(app);

  cron.schedule('0 8 * * *', () => {
    try {
      const digest = generateDailyDigest();
      ctx.dailyDigestCache = { date: digest.date, data: digest };
      app.log.info({ date: digest.date, totalNewItems: digest.totalNewItems }, 'daily digest generated');
    } catch (error) {
      app.log.error({ error }, 'daily digest generation failed');
    }
  });

  /**
   * 生产模式：注册前端静态文件服务。
   * 当 NODE_ENV=production 且前端构建产物存在时，API 同时 serve 前端 SPA。
   * 所有非 /api、/agent、/health 开头的请求回退到 index.html（SPA 路由）。
   * 本地开发时由 Vite dev server 处理前端，不启用此插件。
   */
  if (process.env.NODE_ENV === 'production') {
    const apiDir = dirname(fileURLToPath(import.meta.url));
    const webDistDir = join(apiDir, '..', '..', 'web', 'dist');
    try {
      await app.register(fastifyStatic, {
        root: webDistDir,
        prefix: '/',
        wildcard: false,
      });
      app.setNotFoundHandler((request, reply) => {
        const url = request.url;
        if (url.startsWith('/api') || url.startsWith('/agent') || url.startsWith('/health')) {
          return reply.code(404).send({ error: 'Not found.' });
        }
        return reply.sendFile('index.html');
      });
    } catch (error) {
      app.log.error({ error }, 'failed to register static file server');
    }
  }

  return app;
}
