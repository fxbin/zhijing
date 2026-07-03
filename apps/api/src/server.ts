import { buildApi } from './app.js';
import { initProxyDispatcher, listWorkspaces, createEmptyWorkspace } from '@zhijing/core';

const port = Number(process.env.PORT ?? 8787);
const isProduction = process.env.NODE_ENV === 'production';
const host = process.env.HOST ?? (isProduction ? '0.0.0.0' : '127.0.0.1');

const detectedProxy = initProxyDispatcher();
if (detectedProxy) {
  console.log(`[zhijing] 系统代理已启用: ${detectedProxy}`);
}

const app = await buildApi();

/**
 * 生产模式且空库时注入示例工作区，让评审打开即有内容可看。
 * 本地开发不触发，避免污染个人数据。
 */
function seedDemoWorkspaces() {
  if (!isProduction) return;
  const existing = listWorkspaces().filter((ws) => ws.id !== 'default');
  if (existing.length > 0) return;
  const demos = [
    { title: '认知科学入门', summary: '探索人类认知、学习与思维的本质，从经典文献到前沿研究。' },
    { title: '读书笔记 · 思考快与慢', summary: '丹尼尔·卡尼曼的决策心理学经典，系统1与系统2的深度拆解。' },
  ];
  for (const demo of demos) {
    try {
      createEmptyWorkspace(demo.title, demo.summary);
      console.log(`[zhijing] 已注入示例工作区: ${demo.title}`);
    } catch (error) {
      console.warn(`[zhijing] 注入示例工作区失败: ${demo.title}`, error);
    }
  }
}

seedDemoWorkspaces();

try {
  await app.listen({ host, port });
  console.log(`[zhijing] 服务已启动: http://${host}:${port} (production=${isProduction})`);
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
