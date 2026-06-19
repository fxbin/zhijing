/**
 * 语言切换按钮组件：在中文和英文之间切换。
 * @module components/LanguageSwitcher
 */

import { Languages } from 'lucide-react';
import { useI18n, SUPPORTED_LOCALES } from '../i18n/I18nContext';

const LOCALE_LABELS = { zh: '中', en: 'EN' };

/**
 * 语言切换按钮，点击在支持的语言之间循环切换。
 * @returns {JSX.Element} 语言切换按钮
 * @author fxbin
 */
export default function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  function toggle() {
    const currentIndex = SUPPORTED_LOCALES.indexOf(locale);
    const nextIndex = (currentIndex + 1) % SUPPORTED_LOCALES.length;
    setLocale(SUPPORTED_LOCALES[nextIndex]);
  }

  return (
    <button
      type="button"
      className="nav-language-switcher"
      onClick={toggle}
      aria-label="切换语言"
      title="切换语言"
    >
      <Languages size={18} />
      <span>{LOCALE_LABELS[locale] ?? locale}</span>
    </button>
  );
}
