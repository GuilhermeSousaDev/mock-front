import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ptBR from './locales/pt-BR.json';

export const LANGUAGES = ['en', 'pt-BR'] as const;
export type AppLanguage = (typeof LANGUAGES)[number];

export const LANGUAGE_STORAGE_KEY = 'mock_lang';

/**
 * Initialized with a fixed default ("en") so server and first client render
 * produce identical markup. The provider switches to the persisted language
 * in an effect, after hydration, to avoid mismatch warnings.
 */
if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      'pt-BR': { translation: ptBR },
    },
    lng: 'en',
    fallbackLng: 'en',
    supportedLngs: LANGUAGES as unknown as string[],
    interpolation: { escapeValue: false },
    returnObjects: true,
  });
}

export function getStoredLanguage(): AppLanguage {
  if (typeof window === 'undefined') return 'en';
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored && (LANGUAGES as readonly string[]).includes(stored)) return stored as AppLanguage;
  // Fall back to the browser preference on first visit.
  return navigator.language.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en';
}

export function setStoredLanguage(lang: AppLanguage): void {
  if (typeof window !== 'undefined') localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
}

/** Maps the UI language to the backend `Language` enum value. */
export function toApiLanguage(lang: string): 'EN' | 'PT_BR' {
  return lang.toLowerCase().startsWith('pt') ? 'PT_BR' : 'EN';
}

export default i18n;
