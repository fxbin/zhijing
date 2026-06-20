import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const SUPPORTED_LOCALES = ['zh', 'en'];
const LOCALE_LABELS = { zh: '中', en: 'EN' };

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const currentLocale = i18n.language;

  function toggle() {
    const currentIndex = SUPPORTED_LOCALES.indexOf(currentLocale);
    const nextIndex = (currentIndex + 1) % SUPPORTED_LOCALES.length;
    const nextLocale = SUPPORTED_LOCALES[nextIndex];
    i18n.changeLanguage(nextLocale);
    try {
      localStorage.setItem('zhijing_locale', nextLocale);
    } catch {}
  }

  return (
    <button
      type="button"
      className="nav-language-switcher"
      onClick={toggle}
      aria-label={t('language.switchTo')}
      title={t('language.switchTo')}
    >
      <Languages size={18} />
      <span>{LOCALE_LABELS[currentLocale] ?? currentLocale}</span>
    </button>
  );
}
