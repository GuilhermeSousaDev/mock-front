'use client';

import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { LANGUAGES, setStoredLanguage, type AppLanguage } from '@/i18n/config';
import { cn } from '@/lib/utils';

const LABELS: Record<AppLanguage, string> = {
  en: 'EN',
  'pt-BR': 'PT',
};

export function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n } = useTranslation();
  const current = (LANGUAGES as readonly string[]).includes(i18n.language)
    ? (i18n.language as AppLanguage)
    : 'en';

  function change(lang: AppLanguage) {
    i18n.changeLanguage(lang);
    setStoredLanguage(lang);
    if (typeof document !== 'undefined') document.documentElement.lang = lang;
  }

  return (
    <div className={cn('inline-flex items-center gap-1 text-xs', className)}>
      <Languages className="h-3.5 w-3.5 text-muted-foreground" />
      {LANGUAGES.map((lang) => (
        <button
          key={lang}
          onClick={() => change(lang)}
          className={cn(
            'rounded px-1.5 py-0.5 font-medium transition-colors',
            current === lang
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
          aria-pressed={current === lang}
        >
          {LABELS[lang]}
        </button>
      ))}
    </div>
  );
}
