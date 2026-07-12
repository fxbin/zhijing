/**
 * Playwright 渲染回退模块。
 *
 * 当自研 fetchUrlAsMarkdown 因页面需要 JavaScript 渲染而提取失败时，
 * 启动 Chromium 渲染页面，等待网络空闲后获取完整 HTML，
 * 再复用 parseRawHtml 提取正文。
 *
 * 设计理念：
 * - 仅作为 fallback，不替代主抓取链路（Jina Reader → 自研 fetch）
 * - 复用 Python Playwright 安装的 Chromium（通过 PLAYWRIGHT_BROWSERS_PATH 环境变量）
 * - 动态导入 playwright-core，未安装时优雅降级
 * - SSRF 防护：导航前校验 URL，运行时拦截内网请求
 * - 资源清理：每次使用后关闭 browser context 和 browser
 *
 * 触发条件：WebContentTooShortError（fetch 成功但正文过短，典型 SPA 场景）
 *
 * @module web-render
 * @author fxbin
 */

import { assertUrlSafeForSsrf } from './ssrf-guard.js';
import { parseRawHtml, titleFromUrl, type FetchedContent } from './web-fetch.js';

/**
 * Playwright 导航超时（毫秒），包含页面加载与重定向。
 */
const NAVIGATION_TIMEOUT_MS = 20_000;

/**
 * 网络空闲等待超时（毫秒），用于确保 SPA 内容已渲染完成。
 */
const NETWORK_IDLE_WAIT_MS = 3_000;

/**
 * 知径爬虫 UA 标识，与 web-fetch.ts 保持一致。
 */
const RENDERER_USER_AGENT = 'ZhijingBot/0.1 (+https://local.zhijing.app)';

/**
 * 浏览器是否已确认可用（避免重复尝试 launch 失败）。
 */
let browserAvailable: boolean | null = null;

/**
 * 使用 Playwright 渲染页面并提取正文。
 *
 * 处理流程：
 * 1. 动态导入 playwright-core（未安装则返回 undefined）
 * 2. SSRF 校验目标 URL
 * 3. 启动 Chromium（headless）
 * 4. 创建 context，拦截内网请求
 * 5. 导航到目标 URL，等待 networkidle
 * 6. 获取渲染后的完整 HTML
 * 7. 复用 parseRawHtml 提取正文
 *
 * 不可用场景（均返回 undefined，不影响主流程）：
 * - playwright-core 未安装
 * - Chromium 二进制不存在
 * - 导航超时
 * - 渲染后内容仍然过短
 *
 * @param sourceUrl - 要渲染的 URL，必须为 http/https
 * @returns 提取结果；不可用或失败时返回 undefined
 * @author fxbin
 */
export async function tryRenderWithBrowser(sourceUrl: string): Promise<FetchedContent | undefined> {
  if (browserAvailable === false) return undefined;

  assertUrlSafeForSsrf(sourceUrl);

  const playwright = await loadPlaywright();
  if (!playwright) {
    browserAvailable = false;
    return undefined;
  }

  let browser = undefined;
  try {
    browser = await playwright.chromium.launch({ headless: true });
    browserAvailable = true;

    const context = await browser.newContext({
      userAgent: RENDERER_USER_AGENT,
      javaScriptEnabled: true,
      bypassCSP: true,
    });

    await setupSsrfRouteGuard(context);

    const page = await context.newPage();
    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT_MS);

    await page.goto(sourceUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: NETWORK_IDLE_WAIT_MS }).catch(() => {
      // networkidle 超时不阻塞，继续提取已有内容
    });

    const html = await page.content();
    await context.close();

    const result = parseRawHtml(html, titleFromUrl(sourceUrl));
    console.info('[tryRenderWithBrowser] 渲染解析成功', {
      sourceUrl,
      contentLength: result.text.length,
    });
    return result;
  } catch (error) {
    console.error('[tryRenderWithBrowser] 渲染失败', {
      sourceUrl,
      error: error instanceof Error ? error.message : String(error),
    });
    if (isBrowserUnavailableError(error)) {
      browserAvailable = false;
    }
    return undefined;
  } finally {
    if (browser) {
      await browser.close().catch(() => {
        // 关闭失败忽略
      });
    }
  }
}

/**
 * 动态加载 playwright-core 模块。
 *
 * 使用动态 import 而非顶层 import，确保 playwright-core 未安装时
 * 不会导致整个模块加载失败，仅渲染回退功能不可用。
 *
 * @returns playwright-core 模块对象；未安装时返回 undefined
 * @author fxbin
 */
async function loadPlaywright(): Promise<typeof import('playwright-core') | undefined> {
  try {
    return await import('playwright-core');
  } catch {
    console.warn('[loadPlaywright] playwright-core 未安装，渲染回退不可用');
    return undefined;
  }
}

/**
 * 为 browser context 设置 SSRF 路由守卫。
 *
 * 拦截所有请求，对主框架导航请求做完整 SSRF 校验，
 * 对子资源请求仅检查协议白名单（http/https）。
 * 检测到内网请求时中止，防止浏览器被用于探测内网。
 *
 * @param context - Playwright BrowserContext
 * @author fxbin
 */
async function setupSsrfRouteGuard(context: import('playwright-core').BrowserContext): Promise<void> {
  await context.route('**/*', (route) => {
    const requestUrl = route.request().url();
    try {
      const url = new URL(requestUrl);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        route.abort('blockedbyclient');
        return;
      }
      if (route.request().isNavigationRequest()) {
        assertUrlSafeForSsrf(requestUrl);
      }
      route.continue();
    } catch {
      route.abort('blockedbyclient');
    }
  });
}

/**
 * 判断错误是否表示浏览器不可用（而非页面问题）。
 *
 * 浏览器不可用的错误包括：可执行文件不存在、版本不匹配等。
 * 一旦确认不可用，后续请求不再尝试启动浏览器。
 *
 * @param error - launch 或导航阶段抛出的错误
 * @returns 不可用返回 true
 * @author fxbin
 */
function isBrowserUnavailableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  if (/executable.*doesn.?t.*exist|no executable|browser.*not.*found/.test(message)) return true;
  if (/playwright.*not.*installed|module.*not.*found/.test(message)) return true;
  return false;
}

/**
 * 重置浏览器可用性状态（仅用于测试）。
 */
export function resetBrowserAvailability(): void {
  browserAvailable = null;
}
