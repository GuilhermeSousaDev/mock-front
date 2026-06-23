'use client';

import { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n, { getStoredLanguage } from './config';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const lang = getStoredLanguage();
    if (i18n.language !== lang) i18n.changeLanguage(lang);
    document.documentElement.lang = lang;
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
