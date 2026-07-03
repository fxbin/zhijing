import { buildApi } from './app.js';
import { initProxyDispatcher } from '@zhijing/core';

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
