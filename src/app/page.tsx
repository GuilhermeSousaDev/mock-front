'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Mic, Brain, BarChart3, Check, Sparkles, AudioLines } from 'lucide-react';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Plan } from '@/types/enums';

export default function LandingPage() {
  const { t } = useTranslation();

  const features = [
    { icon: Mic, title: t('landing.feat1Title'), description: t('landing.feat1Desc') },
    { icon: Brain, title: t('landing.feat2Title'), description: t('landing.feat2Desc') },
    { icon: BarChart3, title: t('landing.feat3Title'), description: t('landing.feat3Desc') },
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
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute left-1/2 top-[-10rem] h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl"
          aria-hidden
        />
        <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-xs font-medium text-muted-foreground mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            {t('landing.badge')}
          </div>

          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-foreground mb-6 text-balance">
            {t('landing.heroTitle1')}
            <br />
            <span className="text-primary">{t('landing.heroTitle2')}</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 text-balance">
            {t('landing.heroSubtitle')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:scale-[1.02] hover:opacity-95"
            >
              {t('landing.ctaStart')}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-8 py-3.5 text-base font-medium hover:bg-muted transition-colors"
            >
              {t('landing.ctaHow')}
            </Link>
          </div>

          {/* Stats strip */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border bg-border">
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
        <div className="grid md:grid-cols-3 gap-8">
          {features.map(({ icon: Icon, title, description }, i) => (
            <div
              key={title}
              className="relative rounded-2xl border border-border bg-card p-8 flex flex-col gap-4 transition-colors hover:border-primary/40"
            >
              <span className="absolute right-6 top-6 text-sm font-semibold text-muted-foreground/50">
                0{i + 1}
              </span>
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                <Icon className="h-5 w-5 text-accent-foreground" />
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
                className={`relative rounded-2xl border bg-card p-8 flex flex-col gap-6 ${
                  popular ? 'border-primary shadow-lg shadow-primary/10 md:-mt-2' : 'border-border'
                }`}
              >
                {popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    <Sparkles className="h-3 w-3" />
                    {t('landing.popular')}
                  </span>
                )}
                <div>
                  <h3 className="font-semibold text-lg">{t(`plans.${plan}.name`)}</h3>
                  <p className="mt-2 text-3xl font-bold tracking-tight">
                    {t(`plans.${plan}.price`)}
                  </p>
                </div>
                <ul className="space-y-3">
                  {featureList.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={`mt-auto inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-90 ${
                    popular
                      ? 'bg-primary text-primary-foreground'
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
          <div
            className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl"
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
              className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:scale-[1.02] hover:opacity-95"
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
