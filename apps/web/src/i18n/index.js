import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhMessages from './locales/zh.json';
import enMessages from './locales/en.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      zh: { translation: zhMessages },
      en: { translation: enMessages },
    },
    lng: (() => {
      try {
        return localStorage.getItem('zhijing_locale') || 'zh';
      } catch {
        return 'zh';
      }
    })(),
    fallbackLng: 'zh',
    keySeparator: false,
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
