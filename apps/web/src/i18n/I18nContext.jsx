/**
 * 国际化上下文：提供语言切换与翻译函数。
 * @module i18n/I18nContext
 */

import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import zhMessages from './locales/zh.json';
import enMessages from './locales/en.json';

const STORAGE_KEY = 'zhijing_locale';
const SUPPORTED_LOCALES = ['zh', 'en'];
const DEFAULT_LOCALE = 'zh';
const MESSAGES = { zh: zhMessages, en: enMessages };

const I18nContext = createContext({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (key) => key,
});

/**
 * 读取初始语言设置，优先从 localStorage 恢复。
 * @returns {string} 初始语言代码
 */
function getInitialLocale() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED_LOCALES.includes(saved)) return saved;
  } catch {
    // localStorage 不可用时静默忽略
  }
  return DEFAULT_LOCALE;
}

/**
 * 国际化 Provider 组件，包裹应用根节点提供翻译能力。
 * @param {object} props - 组件属性
 * @param {React.ReactNode} props.children - 子组件
 * @returns {JSX.Element} Provider 组件
 * @author fxbin
 */
export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(getInitialLocale);

  const setLocale = useCallback((nextLocale) => {
    if (!SUPPORTED_LOCALES.includes(nextLocale)) return;
    setLocaleState(nextLocale);
    try {
      localStorage.setItem(STORAGE_KEY, nextLocale);
    } catch {
      // localStorage 不可用时静默忽略
    }
  }, []);

  const t = useCallback((key, params) => {
    const messages = MESSAGES[locale] ?? MESSAGES[DEFAULT_LOCALE];
    let text = messages[key] ?? MESSAGES[DEFAULT_LOCALE][key] ?? key;
    if (params) {
      for (const [name, value] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{${name}\\}`, 'g'), String(value));
      }
    }
    return text;
  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

/**
 * 获取国际化上下文的 Hook。
 * @returns {{ locale: string, setLocale: function, t: function }} 国际化上下文值
 */
export function useI18n() {
  return useContext(I18nContext);
}

export { SUPPORTED_LOCALES };
