/**
 * 系统代理自动检测模块。
 *
 * 设计目的：
 * - 桌面端打包后，普通用户不会手动配置 HTTPS_PROXY 环境变量
 * - Node.js 原生 fetch（基于 undici）不会自动走系统代理，需主动注入
 * - 本模块跨平台读取系统代理配置，为 fetch-dispatcher 提供代理 URL
 *
 * 检测优先级（从高到低）：
 * 1. 显式环境变量：HTTPS_PROXY / HTTP_PROXY / ALL_PROXY
 * 2. macOS: scutil --proxy 读取系统代理
 * 3. Windows: 注册表 HKCU\...\Internet Settings
 * 4. Linux: gsettings org.gnome.system.proxy
 *
 * 仅返回 http/https/socks 代理 URL；无代理时返回 undefined。
 *
 * @module proxy-detector
 * @author fxbin
 */

import { execFileSync } from 'node:child_process';
import { platform } from 'node:os';

/**
 * 检测结果：有效代理 URL 或 undefined。
 */
export type DetectedProxy = string | undefined;

/**
 * 缓存的检测结果，避免重复调用系统命令。
 * 应用启动时调用一次 detectSystemProxy() 即可。
 */
let cachedProxy: DetectedProxy | null = null;

/**
 * 从环境变量读取代理配置。
 * 优先级：HTTPS_PROXY > ALL_PROXY > HTTP_PROXY。
 * 兼容大小写变体（https_proxy 等）。
 * @returns 代理 URL 或 undefined
 */
function detectFromEnv(): DetectedProxy {
  const candidates = [
    'HTTPS_PROXY',
    'https_proxy',
    'ALL_PROXY',
    'all_proxy',
    'HTTP_PROXY',
    'http_proxy',
  ];
  for (const key of candidates) {
    const value = process.env[key];
    if (value && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

/**
 * macOS: 通过 scutil --proxy 读取系统代理。
 * 输出格式为 key : value\n 的文本，解析 HostName/Port 构建 URL。
 * @returns 代理 URL 或 undefined
 */
function detectMacos(): DetectedProxy {
  try {
    const output = execFileSync('scutil', ['--proxy'], {
      encoding: 'utf8',
      timeout: 2_000,
    }).toString();

    const get = (key: string): string | undefined => {
      const match = output.match(new RegExp(`${key}\\s*:\\s*([^\\n]+)`));
      return match?.[1]?.trim();
    };

    const enable = get('HTTPEnable') === '1' || get('HTTPSEnable') === '1';
    if (!enable) return undefined;

    const host = get('HTTPSEnable') === '1' ? get('HTTPSProxy') : get('HTTPProxy');
    const port = get('HTTPSEnable') === '1' ? get('HTTPSPort') : get('HTTPPort');
    if (!host || !port) return undefined;

    return `http://${host}:${port}`;
  } catch {
    return undefined;
  }
}

/**
 * Windows: 通过 reg query 读取注册表中的代理配置。
 * 路径：HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings
 * @returns 代理 URL 或 undefined
 */
function detectWindows(): DetectedProxy {
  try {
    const output = execFileSync('reg', [
      'query',
      'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings',
      '/v', 'ProxyServer',
    ], {
      encoding: 'utf8',
      timeout: 2_000,
      shell: true,
    }).toString();

    const match = output.match(/ProxyServer\s+REG_SZ\s+([^\r\n]+)/);
    if (!match?.[1]) return undefined;

    const raw = match[1].trim();
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;

    const [host, port] = raw.split(':');
    if (!host || !port) return `http://${raw}`;
    return `http://${host}:${port}`;
  } catch {
    return undefined;
  }
}

/**
 * Linux: 通过 gsettings 读取 GNOME 系统代理。
 * @returns 代理 URL 或 undefined
 */
function detectLinux(): DetectedProxy {
  try {
    const mode = execFileSync('gsettings', [
      'get', 'org.gnome.system.proxy', 'mode',
    ], {
      encoding: 'utf8',
      timeout: 2_000,
    }).toString().trim().replace(/'/g, '');

    if (mode !== 'manual') return undefined;

    const host = execFileSync('gsettings', [
      'get', 'org.gnome.system.proxy.http', 'host',
    ], { encoding: 'utf8', timeout: 1_000 }).toString().trim().replace(/'/g, '');

    const port = execFileSync('gsettings', [
      'get', 'org.gnome.system.proxy.http', 'port',
    ], { encoding: 'utf8', timeout: 1_000 }).toString().trim();

    if (!host || !port) return undefined;
    return `http://${host}:${port}`;
  } catch {
    return undefined;
  }
}

/**
 * 按当前操作系统检测系统代理。
 * @returns 代理 URL 或 undefined
 */
function detectByOs(): DetectedProxy {
  const os = platform();
  if (os === 'darwin') return detectMacos();
  if (os === 'win32') return detectWindows();
  if (os === 'linux') return detectLinux();
  return undefined;
}

/**
 * 检测系统代理配置（对外主入口）。
 *
 * 优先级：
 * 1. 显式环境变量（HTTPS_PROXY/HTTP_PROXY/ALL_PROXY）
 * 2. 操作系统层代理设置
 *
 * 结果会被缓存，重复调用不会重复执行系统命令。
 * 桌面端应用启动时调用一次即可。
 *
 * @returns 代理 URL（如 `http://127.0.0.1:7890`）或 undefined
 */
export function detectSystemProxy(): DetectedProxy {
  if (cachedProxy !== null) return cachedProxy;
  const fromEnv = detectFromEnv();
  const result = fromEnv ?? detectByOs();
  cachedProxy = result ?? undefined;
  return cachedProxy;
}

/**
 * 重置缓存（主要用于测试场景）。
 */
export function resetProxyCache(): void {
  cachedProxy = null;
}

/**
 * 手动设置代理（用于设置页让用户输入代理地址）。
 * @param proxyUrl 代理 URL；传 undefined 清除代理
 */
export function setManualProxy(proxyUrl: string | undefined): void {
  cachedProxy = proxyUrl?.trim() || undefined;
}
