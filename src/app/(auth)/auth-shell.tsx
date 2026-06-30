'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { AudioLines, Mic, Brain, BarChart3 } from 'lucide-react';
import { LanguageSwitcher } from '@/components/language-switcher';

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  const { t } = useTranslation();

  const highlights = [
    { icon: Mic, text: t('landing.feat1Title') },
    { icon: Brain, text: t('landing.feat2Title') },
    { icon: BarChart3, text: t('landing.feat3Title') },
  ];

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2 bg-background">
      {/* Brand / value panel — desktop only */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden border-r border-border bg-gradient-to-br from-primary/15 via-card to-card p-12">
        <div
          className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-primary/20 blur-3xl"
          aria-hidden
        />
        <Link href="/" className="group relative flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/20 transition-transform group-hover:scale-105">
            <AudioLines className="h-5 w-5" />
          </span>
          <span className="font-semibold text-lg tracking-tight">{t('common.appName')}</span>
        </Link>

        <div className="relative max-w-md space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            {t('landing.badge')}
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-balance">
            {t('landing.heroTitle1')}{' '}
            <span className="text-primary">{t('landing.heroTitle2')}</span>
          </h2>
          <ul className="space-y-4">
            {highlights.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="font-medium">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-muted-foreground">
          © {new Date().getFullYear()} {t('landing.footer')}
        </p>
      </aside>

      {/* Form panel */}
      <main className="relative flex min-h-screen items-center justify-center p-6 lg:min-h-0">
        <div className="absolute top-4 right-4">
          <LanguageSwitcher />
        </div>

        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-4 text-center">
            {/* Logo mark — shown on mobile where the side panel is hidden */}
            <Link href="/" className="group inline-flex lg:hidden items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/20 transition-transform group-hover:scale-105">
                <AudioLines className="h-5 w-5" />
              </span>
              <span className="font-semibold text-lg tracking-tight">{t('common.appName')}</span>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            {children}
          </div>

          <p className="text-center text-sm text-muted-foreground">{footer}</p>
        </div>
      </main>
    </div>
  );
}
