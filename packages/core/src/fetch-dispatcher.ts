/**
 * 统一 fetch dispatcher 模块。
 *
 * 设计目的：
 * - Node.js 原生 fetch 基于内置 undici，默认不走系统代理
 * - 通过 undici.ProxyAgent + setGlobalDispatcher 让全局 fetch 自动走代理
 * - 所有需要发起外网请求的模块（web-fetch、tryParseWithJinaReader 等）统一调用此模块
 *
 * 使用方式：
 * - 应用启动时调用 initProxyDispatcher() 一次
 * - 之后所有 fetch 调用自动走代理（如检测到代理）
 * - 无代理时保持原生 fetch 行为，零侵入
 *
 * @module fetch-dispatcher
 * @author fxbin
 */

import { createRequire } from 'node:module';
import { detectSystemProxy } from './proxy-detector.js';

const require = createRequire(import.meta.url);

/**
 * 缓存上一次初始化的代理 URL，避免重复 setGlobalDispatcher。
 */
let lastInitProxy: string | undefined | null = null;

/**
 * 初始化代理 dispatcher。
 *
 * 检测系统代理，若存在则通过 undici.setGlobalDispatcher 注入 ProxyAgent。
 * 之后所有 fetch 调用（含 web-fetch.ts、tryParseWithJinaReader）会自动走代理。
 *
 * 应在应用启动时调用一次。重复调用幂等，仅当代理变化时重新设置。
 *
 * @returns 实际生效的代理 URL；无代理时返回 undefined
 */
export function initProxyDispatcher(): string | undefined {
  const proxyUrl = detectSystemProxy();
  if (proxyUrl === lastInitProxy) return proxyUrl;

  if (!proxyUrl) {
    lastInitProxy = undefined;
    return undefined;
  }

  try {
    // undici 为 Node 18+ 内置模块，运行时可正常 resolve；类型声明按需放宽
    const undici = require('undici') as {
      ProxyAgent: new (opts: { uri: string }) => unknown;
      setGlobalDispatcher: (dispatcher: unknown) => void;
    };
    const dispatcher = new undici.ProxyAgent({ uri: proxyUrl });
    undici.setGlobalDispatcher(dispatcher);
    lastInitProxy = proxyUrl;
    return proxyUrl;
  } catch {
    lastInitProxy = undefined;
    return undefined;
  }
}

/**
 * 获取当前生效的代理 URL（仅用于日志和状态展示）。
 * @returns 代理 URL 或 undefined
 */
export function getCurrentProxy(): string | undefined {
  return lastInitProxy ?? undefined;
}

/**
 * 重置 dispatcher 状态（主要用于测试）。
 */
export function resetDispatcher(): void {
  lastInitProxy = null;
}
