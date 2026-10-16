// src/i18n/index.ts
// WKF — i18n. Sin cambios funcionales en v1.010.
// Se mantiene el wrapper para detectar idioma inicial.

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { stringsEs } from './strings.es.ts';
import { stringsEn } from './strings.en.ts';

export const STORAGE_KEY = 'wkf-state-v1';

export function detectInitialLanguage(): 'es' | 'en' {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (
          parsed?.state?.language === 'es' ||
          parsed?.state?.language === 'en'
        ) {
          return parsed.state.language;
        }
      }
    } catch {
      // ignore
    }

    if (
      navigator.language &&
      navigator.language.toLowerCase().startsWith('es')
    ) {
      return 'es';
    }
  }

  return 'en';
}

const initialLang = detectInitialLanguage();

i18n.use(initReactI18next).init({
  resources: {
    es: { translation: stringsEs },
    en: { translation: stringsEn },
  },
  lng: initialLang,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;