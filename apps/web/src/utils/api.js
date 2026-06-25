/**
 * 统一 API 请求层：封装 fetch，归一错误、超时控制、JSON 解析。
 * 调用方不再手写 method/headers/body 样板，也不必重复检查 response.ok。
 * @module utils/api
 * @author fxbin
 */

/**
 * 默认请求超时（毫秒）。
 */
const DEFAULT_TIMEOUT_MS = 20000;

/**
 * 统一 API 错误类型，承载 HTTP 状态码、原始响应与服务端错误文案，便于调用方按状态码分流处理。
 */
export class ApiError extends Error {
  /**
   * @param {string} message - 人类可读错误信息
   * @param {number} status - HTTP 状态码
   * @param {Response} [response] - 原始 Response 对象，供特殊场景读取
   * @param {string} [serverMessage] - 服务端返回的业务错误文案
   */
  constructor(message, status, response, serverMessage) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.response = response;
    this.serverMessage = serverMessage;
  }
}

/**
 * 发起底层 fetch 请求，统一处理超时、Content-Type 与错误归一。
 * @param {string} url - 请求 URL（相对路径或绝对路径）
 * @param {object} [options] - fetch 配置
 * @param {string} [options.method] - HTTP 方法
 * @param {object|string} [options.body] - 请求体，对象会自动 JSON 序列化
 * @param {object} [options.headers] - 自定义请求头
 * @param {number} [options.timeout] - 超时毫秒，默认 20s
 * @param {AbortSignal} [options.signal] - 外部传入的取消信号
 * @returns {Promise<Response>} 成功的 Response 对象；失败抛 ApiError
 * @author fxbin
 */
async function request(url, options = {}) {
  const {
    method = 'GET',
    body,
    headers = {},
    timeout = DEFAULT_TIMEOUT_MS,
    signal,
    ...rest
  } = options;

  const controller = new AbortController();
  const timer = timeout > 0 ? setTimeout(() => controller.abort(), timeout) : null;

  let externalAbortHandler = null;
  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      externalAbortHandler = () => controller.abort();
      signal.addEventListener('abort', externalAbortHandler);
    }
  }

  const finalHeaders = { ...headers };
  let finalBody = undefined;
  if (body !== undefined && body !== null) {
    if (typeof body === 'string' || body instanceof FormData || body instanceof Blob) {
      finalBody = body;
    } else {
      finalHeaders['Content-Type'] = finalHeaders['Content-Type'] ?? 'application/json';
      finalBody = JSON.stringify(body);
    }
  }

  try {
    const response = await fetch(url, {
      method,
      headers: finalHeaders,
      body: finalBody,
      signal: controller.signal,
      ...rest,
    });
    if (!response.ok) {
      let serverMessage = null;
      try {
        const errorBody = await response.clone().json();
        serverMessage = typeof errorBody === 'object' && errorBody !== null
          ? (errorBody.error ?? errorBody.message ?? null)
          : null;
      } catch {
        // 响应体非 JSON 或为空，忽略
      }
      throw new ApiError(
        serverMessage || `HTTP ${response.status} on ${method} ${url}`,
        response.status,
        response,
        serverMessage || undefined,
      );
    }
    return response;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error.name === 'AbortError') {
      throw new ApiError(`请求超时或被取消：${method} ${url}`, 0, null);
    }
    throw new ApiError(`网络错误：${method} ${url} — ${error.message}`, 0, null);
  } finally {
    if (timer) clearTimeout(timer);
    if (signal && externalAbortHandler) {
      signal.removeEventListener('abort', externalAbortHandler);
    }
  }
}

/**
 * 读取响应体 JSON，兼容 204 No Content 与空 body。
 * @param {Response} response - fetch 返回的 Response 对象
 * @returns {Promise<any|null>} 解析后的 JSON，或 null
 * @author fxbin
 */
async function parseJson(response) {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * GET 请求，返回解析后的 JSON。
 * @param {string} url - 请求 URL
 * @param {object} [options] - 额外 fetch 配置（timeout、headers、signal 等）
 * @returns {Promise<any>} 解析后的 JSON
 * @author fxbin
 */
export async function get(url, options = {}) {
  const response = await request(url, { ...options, method: 'GET' });
  return parseJson(response);
}

/**
 * POST 请求，body 自动 JSON 序列化，返回解析后的 JSON。
 * @param {string} url - 请求 URL
 * @param {object|string} [body] - 请求体
 * @param {object} [options] - 额外 fetch 配置
 * @returns {Promise<any>} 解析后的 JSON
 * @author fxbin
 */
export async function post(url, body, options = {}) {
  const response = await request(url, { ...options, method: 'POST', body });
  return parseJson(response);
}

/**
 * PUT 请求，body 自动 JSON 序列化，返回解析后的 JSON。
 * @param {string} url - 请求 URL
 * @param {object|string} [body] - 请求体
 * @param {object} [options] - 额外 fetch 配置
 * @returns {Promise<any>} 解析后的 JSON
 * @author fxbin
 */
export async function put(url, body, options = {}) {
  const response = await request(url, { ...options, method: 'PUT', body });
  return parseJson(response);
}

/**
 * PATCH 请求，body 自动 JSON 序列化，返回解析后的 JSON。
 * @param {string} url - 请求 URL
 * @param {object|string} [body] - 请求体
 * @param {object} [options] - 额外 fetch 配置
 * @returns {Promise<any>} 解析后的 JSON
 * @author fxbin
 */
export async function patch(url, body, options = {}) {
  const response = await request(url, { ...options, method: 'PATCH', body });
  return parseJson(response);
}

/**
 * DELETE 请求，返回解析后的 JSON（通常为 null）。
 * @param {string} url - 请求 URL
 * @param {object} [options] - 额外 fetch 配置
 * @returns {Promise<any>} 解析后的 JSON
 * @author fxbin
 */
export async function del(url, options = {}) {
  const response = await request(url, { ...options, method: 'DELETE' });
  return parseJson(response);
}

/**
 * 获取原始 Response 对象，用于需要读取 headers 或自定义流的特殊场景。
 * 调用方需自行处理 response.ok 与错误。
 * @param {string} url - 请求 URL
 * @param {object} [options] - fetch 配置
 * @returns {Promise<Response>} 原始 Response
 * @author fxbin
 */
export async function raw(url, options = {}) {
  return request(url, options);
}

const api = { get, post, put, patch, del, raw, ApiError };

export default api;
