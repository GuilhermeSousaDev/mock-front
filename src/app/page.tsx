'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  Mic,
  Brain,
  BarChart3,
  Check,
  Sparkles,
  AudioLines,
} from 'lucide-react';
import { LanguageSwitcher } from '@/components/language-switcher';
import { getToken } from '@/lib/api';
import { Plan } from '@/types/enums';

function SoundBars({ className = 'bg-primary' }: { className?: string }) {
  return (
    <span className="inline-flex h-3.5 items-end gap-0.5" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={`animate-sound-bar w-0.5 rounded-full ${className}`}
          style={{ height: `${[55, 100, 70, 90, 60][i]}%`, animationDelay: `${i * 130}ms` }}
        />
      ))}
    </span>
  );
}

/** Mock live-session card shown in the hero — a picture of the product itself. */
function SessionPreview() {
  const { t } = useTranslation();
  return (
    <div className="relative animate-fade-up delay-2">
      {/* Glow behind the card */}
      <div
        className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-primary/25 via-fuchsia-500/10 to-transparent blur-2xl"
        aria-hidden
      />
      <div className="relative rounded-2xl border border-border bg-card/95 shadow-xl shadow-primary/10 backdrop-blur">
        {/* Window bar */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            {t('landing.demoLive')}
          </span>
          <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
            {t('session.question', { number: 4 })}
          </span>
        </div>

        <div className="space-y-4 px-4 py-5">
          {/* Interviewer turn */}
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 text-sm font-semibold text-white">
              A
            </span>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Alex</span>
                <SoundBars />
                <span>{t('session.interviewerSpeaking')}</span>
              </div>
              <p className="rounded-2xl rounded-tl-sm bg-muted px-3.5 py-2.5 text-sm leading-relaxed">
                {t('landing.demoQuestion')}
              </p>
            </div>
          </div>

          {/* Candidate turn */}
          <div className="flex justify-end">
            <div className="max-w-[85%] space-y-1.5 text-right">
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Mic className="h-3 w-3 text-emerald-500" />
                {t('session.you')}
              </span>
              <p className="rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2.5 text-left text-sm leading-relaxed text-primary-foreground">
                {t('landing.demoAnswer')}
              </p>
            </div>
          </div>
        </div>

        {/* Score footer */}
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <span className="text-xs text-muted-foreground">{t('dashboard.statAvg')}</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <BarChart3 className="h-3.5 w-3.5" />
            92% · {t('score.excellent')}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { t } = useTranslation();
  // Session-aware nav: returning users get a "Dashboard" shortcut instead of
  // being funnelled through Sign in again. Set in an effect — localStorage is
  // unavailable during SSR/hydration.
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    setAuthed(!!getToken());
  }, []);

  const features = [
    {
      icon: Mic,
      title: t('landing.feat1Title'),
      description: t('landing.feat1Desc'),
      tile: 'from-sky-500 to-indigo-500',
    },
    {
      icon: Brain,
      title: t('landing.feat2Title'),
      description: t('landing.feat2Desc'),
      tile: 'from-violet-500 to-fuchsia-500',
    },
    {
      icon: BarChart3,
      title: t('landing.feat3Title'),
      description: t('landing.feat3Desc'),
      tile: 'from-emerald-500 to-teal-500',
    },
  ];

  const stats = [
    { value: t('landing.stat1Value'), label: t('landing.stat1Label') },
    { value: t('landing.stat2Value'), label: t('landing.stat2Label') },
    { value: t('landing.stat3Value'), label: t('landing.stat3Label') },
  ];

  const plans = [Plan.FREE, Plan.PRO, Plan.PREMIUM];

  return (
    <main className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border/50 backdrop-blur-md sticky top-0 z-50 bg-background/70">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand */}
          <Link href="/" className="group flex items-center gap-2.5 shrink-0">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/20 transition-transform group-hover:scale-105">
              <AudioLines className="h-5 w-5" />
            </span>
            <span className="font-semibold text-lg tracking-tight">{t('common.appName')}</span>
          </Link>

          {/* Section links (desktop) */}
          <div className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
            <Link
              href="#how-it-works"
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              {t('landing.navFeatures')}
            </Link>
            <Link
              href="#pricing"
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              {t('landing.navPricing')}
            </Link>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <LanguageSwitcher className="mr-0.5" />
            {authed ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm shadow-primary/20 hover:opacity-90 transition-opacity"
              >
                {t('nav.dashboard')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden sm:inline-flex rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                >
                  {t('landing.signIn')}
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm shadow-primary/20 hover:opacity-90 transition-opacity"
                >
                  {t('landing.getStarted')}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-grid-faint" aria-hidden />
        <div
          className="pointer-events-none absolute -top-40 left-1/4 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl animate-drift"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -top-20 right-0 h-[24rem] w-[24rem] translate-x-1/3 rounded-full bg-fuchsia-500/10 blur-3xl"
          aria-hidden
        />

        <div className="relative max-w-6xl mx-auto grid items-center gap-14 px-6 pt-20 pb-20 lg:grid-cols-2 lg:gap-10 lg:pt-24">
          <div className="text-center lg:text-left">
            <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-xs font-medium text-muted-foreground mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              {t('landing.badge')}
            </div>

            <h1 className="animate-fade-up delay-1 text-5xl md:text-6xl font-bold tracking-tight text-foreground mb-6 text-balance">
              {t('landing.heroTitle1')}
              <br />
              <span className="text-gradient">{t('landing.heroTitle2')}</span>
            </h1>
            <p className="animate-fade-up delay-2 text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-10 text-balance">
              {t('landing.heroSubtitle')}
            </p>

            <div className="animate-fade-up delay-3 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:scale-[1.02] hover:opacity-95"
              >
                {t('landing.ctaStart')}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background/60 px-8 py-3.5 text-base font-medium backdrop-blur hover:bg-muted transition-colors"
              >
                {t('landing.ctaHow')}
              </Link>
            </div>
          </div>

          <SessionPreview />
        </div>

        {/* Stats strip */}
        <div className="relative max-w-6xl mx-auto px-6 pb-20">
          <div className="animate-fade-up delay-3 grid grid-cols-1 sm:grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border bg-border shadow-sm">
            {stats.map(({ value, label }) => (
              <div key={label} className="bg-card px-6 py-6">
                <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features / How it works */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-primary">{t('landing.stepsKicker')}</p>
          <h2 className="mt-2 text-3xl font-bold">{t('landing.howTitle')}</h2>
          <p className="mt-3 text-muted-foreground">{t('landing.stepsSubtitle')}</p>
        </div>
        <div className="relative grid md:grid-cols-3 gap-8">
          {/* Connector between the step cards (desktop) */}
          <div
            className="pointer-events-none absolute left-[12%] right-[12%] top-14 hidden border-t-2 border-dashed border-border md:block"
            aria-hidden
          />
          {features.map(({ icon: Icon, title, description, tile }, i) => (
            <div
              key={title}
              className="group relative rounded-2xl border border-border bg-card p-8 flex flex-col gap-4 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
            >
              <span className="absolute right-6 top-6 text-3xl font-bold tracking-tight text-muted-foreground/20 transition-colors group-hover:text-primary/30">
                0{i + 1}
              </span>
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md transition-transform group-hover:scale-110 ${tile}`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-lg">{title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold">{t('landing.pricingTitle')}</h2>
          <p className="mt-3 text-muted-foreground">{t('landing.pricingSubtitle')}</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 items-start">
          {plans.map((plan) => {
            const popular = plan === Plan.PRO;
            const featureList = t(`plans.${plan}.features`, { returnObjects: true }) as string[];
            return (
              <div
                key={plan}
                className={`relative rounded-2xl border bg-card p-8 flex flex-col gap-6 transition-all ${
                  popular
                    ? 'border-primary shadow-xl shadow-primary/15 md:-mt-3 md:mb-3 ring-1 ring-primary/30'
                    : 'border-border hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md'
                }`}
              >
                {popular && (
                  <>
                    <div
                      className="pointer-events-none absolute inset-x-0 top-0 h-24 rounded-t-2xl bg-gradient-to-b from-primary/10 to-transparent"
                      aria-hidden
                    />
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-md shadow-primary/30">
                      <Sparkles className="h-3 w-3" />
                      {t('landing.popular')}
                    </span>
                  </>
                )}
                <div className="relative">
                  <h3 className="font-semibold text-lg">{t(`plans.${plan}.name`)}</h3>
                  <p className="mt-2 text-3xl font-bold tracking-tight">
                    {t(`plans.${plan}.price`)}
                  </p>
                </div>
                <ul className="space-y-3">
                  {featureList.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={`mt-auto inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-90 ${
                    popular
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                      : 'border border-border hover:bg-muted'
                  }`}
                >
                  {t('landing.choosePlan')}
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/15 via-card to-card px-8 py-16 text-center">
          <div className="pointer-events-none absolute inset-0 bg-grid-faint" aria-hidden />
          <div
            className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl animate-drift"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -left-24 -bottom-24 h-64 w-64 rounded-full bg-fuchsia-500/10 blur-3xl"
            aria-hidden
          />
          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight text-balance">
              {t('landing.finalTitle')}
            </h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto text-balance">
              {t('landing.finalSubtitle')}
            </p>
            <Link
              href="/signup"
              className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:scale-[1.02] hover:opacity-95"
            >
              {t('landing.ctaStart')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} {t('landing.footer')}
      </footer>
    </main>
  );
}
