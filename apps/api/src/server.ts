import { buildApi } from './app.js';
import { initProxyDispatcher } from '@zhijing/core';

/**
 * 加载项目根目录的 .env 文件。
 *
 * 使用 Node 21.7+ 原生 process.loadEnvFile()，在旧版本 Node 上优雅降级。
 * 文件不存在时静默跳过，不影响生产部署（生产环境用平台注入的环境变量）。
 * 路径基于 import.meta.url 解析，确保任意 cwd 启动都能正确加载。
 */
function loadEnvFile() {
  if (typeof process.loadEnvFile !== 'function') {
    return;
  }
  try {
    process.loadEnvFile(new URL('../../../.env', import.meta.url));
  } catch {
    // .env 不存在或不可读，忽略
  }
}

loadEnvFile();

const port = Number(process.env.PORT ?? 8787);
const isProduction = process.env.NODE_ENV === 'production';
const host = process.env.HOST ?? (isProduction ? '0.0.0.0' : '127.0.0.1');

const detectedProxy = initProxyDispatcher();
if (detectedProxy) {
  console.log(`[zhijing] 系统代理已启用: ${detectedProxy}`);
}

const app = await buildApi();

try {
  await app.listen({ host, port });
  console.log(`[zhijing] 服务已启动: http://${host}:${port} (production=${isProduction})`);
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
