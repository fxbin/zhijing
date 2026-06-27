import { buildApi } from './app.js';
import { initProxyDispatcher } from '@zhijing/core';

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? '127.0.0.1';

const detectedProxy = initProxyDispatcher();
if (detectedProxy) {
  console.log(`[zhijing] 系统代理已启用: ${detectedProxy}`);
}

const app = buildApi();

try {
  await app.listen({ host, port });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
