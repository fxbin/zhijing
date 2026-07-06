/**
 * 浏览器内置 AI 模型检测与调用工具。
 * 基于 Chrome Web AI API 访问 Gemini Nano。
 * 兼容两种 API 形态：
 * - 旧版（Chrome 127-137）：self.ai.languageModel.capabilities() 返回 {available: 'readily'|'after-download'|'no'}
 * - 新版（Chrome 138+）：LanguageModel.availability() 返回 'available'|'readily'|'downloadable'|'no'
 * @module utils/browserAi
 * @author fxbin
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
 * 获取浏览器内置 LanguageModel API 对象。
 * 依次尝试新版全局 LanguageModel、旧版 self.ai.languageModel 两种暴露方式。
 * @returns {object|null} LanguageModel API 对象，不可用时返回 null
 */
function getLanguageModelApi() {
  if (typeof self === 'undefined') {
    return null;
  }
  if (typeof LanguageModel !== 'undefined' && LanguageModel && typeof LanguageModel.availability === 'function') {
    return LanguageModel;
  }
  const ai = self.ai;
  if (ai && ai.languageModel) {
    return ai.languageModel;
  }
  return null;
}

/**
 * 将不同 API 形态的可用性结果统一为状态字符串。
 * - 新版 LanguageModel.availability() 直接返回字符串
 * - 旧版 languageModel.capabilities() 返回 {available: string}
 * @param {string|{available: string}} availability - 原始可用性结果
 * @returns {'readily'|'after-download'|'downloadable'|'no'} 统一后的可用性标识
 */
function normalizeAvailability(availability) {
  const raw = typeof availability === 'string' ? availability : availability?.available;
  if (raw === 'readily' || raw === 'available') {
    return 'readily';
  }
  if (raw === 'after-download' || raw === 'downloadable') {
    return 'after-download';
  }
  return 'no';
}

/**
 * 检测浏览器内置 AI 模型的可用性。
 * 返回状态对象，包含 supported、ready、reason 等字段。
 * @returns {Promise<{status: string, supported: boolean, ready: boolean, reason?: string}>}
 */
export async function detectBrowserAi() {
  const api = getLanguageModelApi();
  if (!api) {
    return { status: BROWSER_AI_STATUS.NO_API, supported: false, ready: false, reason: 'no-api' };
  }
  try {
    const availability = typeof api.availability === 'function'
      ? await api.availability()
      : await api.capabilities();
    const normalized = normalizeAvailability(availability);
    if (normalized === 'readily') {
      return { status: BROWSER_AI_STATUS.READY, supported: true, ready: true };
    }
    if (normalized === 'after-download') {
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
  const api = getLanguageModelApi();
  const session = await api.create({
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
