/**
 * 浏览器内置 AI 模型检测与调用工具。
 * 基于 Chrome Web AI API（window.ai.languageModel）访问 Gemini Nano。
 * @module utils/browserAi
 */

const BROWSER_AI_STATUS = {
  CHECKING: 'checking',
  READY: 'ready',
  NEED_DOWNLOAD: 'need_download',
  NO_API: 'no_api',
  NO_MODEL: 'no_model',
};

const SUMMARY_MAX_INPUT_CHARS = 8000;
const SUMMARY_TEMPERATURE = 0.2;
const SUMMARY_TOP_K = 3;

/**
 * 检测浏览器内置 AI 模型的可用性。
 * 返回状态对象，包含 supported、ready、reason 等字段。
 * @returns {Promise<{status: string, supported: boolean, ready: boolean, reason?: string}>}
 */
export async function detectBrowserAi() {
  if (typeof self === 'undefined' || !('ai' in self)) {
    return { status: BROWSER_AI_STATUS.NO_API, supported: false, ready: false, reason: 'no-api' };
  }
  try {
    const languageModel = self.ai.languageModel;
    if (!languageModel || typeof languageModel.capabilities !== 'function') {
      return { status: BROWSER_AI_STATUS.NO_API, supported: false, ready: false, reason: 'no-language-model' };
    }
    const caps = await languageModel.capabilities();
    if (caps.available === 'readily') {
      return { status: BROWSER_AI_STATUS.READY, supported: true, ready: true };
    }
    if (caps.available === 'after-download') {
      return { status: BROWSER_AI_STATUS.NEED_DOWNLOAD, supported: true, ready: false, reason: 'need-download' };
    }
    return { status: BROWSER_AI_STATUS.NO_MODEL, supported: false, ready: false, reason: 'no-model' };
  } catch (err) {
    return { status: BROWSER_AI_STATUS.NO_API, supported: false, ready: false, reason: 'detection-failed', error: err };
  }
}

/**
 * 使用浏览器内置 AI 生成文本摘要。
 * 输入长文本，返回简洁的中文摘要（约 100-200 字）。
 * @param {string} text - 待摘要的原始文本
 * @returns {Promise<string>} AI 生成的摘要文本
 * @throws {Error} 当浏览器 AI 不可用或生成失败时抛出
 */
export async function summarizeWithBrowserAi(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('文本内容为空');
  }
  const truncated = text.length > SUMMARY_MAX_INPUT_CHARS
    ? text.slice(0, SUMMARY_MAX_INPUT_CHARS)
    : text;
  const detection = await detectBrowserAi();
  if (!detection.ready) {
    throw new Error('浏览器 AI 不可用');
  }
  const session = await self.ai.languageModel.create({
    temperature: SUMMARY_TEMPERATURE,
    topK: SUMMARY_TOP_K,
  });
  try {
    const prompt = `请用简洁的中文总结以下资料的核心内容，不超过200字，突出关键信息和主题：\n\n${truncated}`;
    const result = await session.prompt(prompt);
    return result.trim();
  } finally {
    try {
      session.destroy();
    } catch {
      // 忽略销毁错误
    }
  }
}

export { BROWSER_AI_STATUS };
