/**
 * 剪贴板复制工具。
 *
 * 提供带降级的复制函数：
 * - 优先使用 navigator.clipboard.writeText（要求 secure context：HTTPS 或 localhost）；
 * - 不满足或失败时降级到 textarea + document.execCommand('copy') 兜底。
 *
 * 抽到 utils 是为了让 ChatMessageItem 与 WeReadView 等场景共用同一份实现，
 * 避免复制按钮在非 secure context 下静默失败、用户无感知。
 *
 * @module utils/clipboard
 * @author fxbin
 */

/**
 * 把文本写入剪贴板，带 execCommand 兜底。
 *
 * 实现策略：
 * 1. secure context 且 navigator.clipboard 可用时优先用现代 Clipboard API；
 * 2. 否则创建临时 textarea，选中后调用 document.execCommand('copy')；
 * 3. 任何异常都返回 false，由调用方决定 UI 提示。
 *
 * @param text - 待复制的纯文本
 * @returns 是否复制成功
 * @author fxbin
 */
export async function copyTextToClipboard(text) {
  if (typeof text !== 'string' || text.length === 0) return false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // 进入降级路径
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
