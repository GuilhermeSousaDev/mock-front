'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  ArrowRight,
  Sparkles,
  Trophy,
  TrendingUp,
  CheckCircle2,
  Mic,
  Brain,
  BarChart3,
  Calendar,
  Layers,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { AppNav } from '@/components/app-nav';
import { Badge } from '@/components/ui/badge';
import { interviews as interviewsApi } from '@/lib/api';
import { formatScore, normalizeScore, scoreToHsl } from '@/lib/utils';
import { PLAN_DETAILS, InterviewStatus, Plan } from '@/types/enums';
import type { Interview } from '@/types/api';

export default function DashboardPage() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const [list, setList] = useState<Interview[] | null>(null);

  useEffect(() => {
    if (!user) return;
    interviewsApi.list().then(setList).catch(() => setList([]));
  }, [user]);

  if (loading || !user) {
    return (
      <main className="min-h-screen grid place-items-center bg-background">
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      </main>
    );
  }

  const plan = user.subscription?.plan ?? Plan.FREE;
  const planDetails = PLAN_DETAILS[plan];
  const used = user.subscription?.interviewsUsed ?? 0;
  const limit = planDetails.interviewsPerMonth;
  const reachedLimit = limit !== null && used >= limit;
  const usagePct = limit === null ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const firstName = user.name?.trim().split(' ')[0] || user.name;

  // Derived stats across the user's history.
  const scored = (list ?? []).filter((iv) => iv.feedback);
  const completedCount = (list ?? []).filter((iv) => iv.status === InterviewStatus.COMPLETED).length;
  const avgScore =
    scored.length > 0
      ? scored.reduce((sum, iv) => sum + (iv.feedback?.overallScore ?? 0), 0) / scored.length
      : null;
  const bestScore =
    scored.length > 0 ? Math.max(...scored.map((iv) => iv.feedback?.overallScore ?? 0)) : null;

  return (
    <main className="min-h-screen bg-background">
      <AppNav user={user} />
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {/* Hero */}
        <section className="animate-fade-up relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-8 sm:p-10">
          <div className="pointer-events-none absolute inset-0 bg-grid-faint" aria-hidden />
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/20 blur-3xl animate-drift"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -left-20 -bottom-24 h-48 w-48 rounded-full bg-fuchsia-500/10 blur-3xl"
            aria-hidden
          />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                {t('landing.badge')}
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {t('dashboard.greeting', { name: firstName })}
              </h1>
              <p className="text-muted-foreground leading-relaxed">{t('dashboard.heroLead')}</p>
            </div>
            <Link
              href="/interview/new"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:scale-[1.02] hover:opacity-95"
            >
              <Plus className="h-5 w-5" />
              {t('dashboard.startCta')}
            </Link>
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            className="animate-fade-up delay-1"
            icon={<CheckCircle2 className="h-4 w-4" />}
            tile="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            label={t('dashboard.statTotal')}
            value={String(completedCount)}
          />
          <StatCard
            className="animate-fade-up delay-2"
            icon={<TrendingUp className="h-4 w-4" />}
            tile="bg-sky-500/10 text-sky-600 dark:text-sky-400"
            label={t('dashboard.statAvg')}
            value={avgScore !== null ? formatScore(avgScore) : t('dashboard.noScore')}
            color={avgScore !== null ? scoreToHsl(avgScore) : undefined}
          />
          <StatCard
            className="animate-fade-up delay-3"
            icon={<Trophy className="h-4 w-4" />}
            tile="bg-amber-500/10 text-amber-600 dark:text-amber-400"
            label={t('dashboard.statBest')}
            value={bestScore !== null ? formatScore(bestScore) : t('dashboard.noScore')}
            color={bestScore !== null ? scoreToHsl(bestScore) : undefined}
          />
          <StatCard
            className="animate-fade-up delay-4"
            icon={<Sparkles className="h-4 w-4" />}
            tile="bg-primary/10 text-primary"
            label={t('dashboard.statPlan')}
            value={t(`plans.${plan}.name`)}
          />
        </section>

        {/* Plan usage */}
        <section className="animate-fade-up delay-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">
                {plan === Plan.FREE
                  ? t('dashboard.freePlan')
                  : t('dashboard.planLabel', { plan: t(`plans.${plan}.name`) })}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {limit === null
                  ? t('dashboard.usageUnlimited', { used })
                  : t('dashboard.usageLimited', { used, limit })}
              </p>
            </div>
            {reachedLimit ? (
              <Link
                href="/subscription"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                {t('dashboard.upgrade')} <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                href="/subscription"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {t('dashboard.managePlan')}
              </Link>
            )}
          </div>
          {limit !== null && (
            <div className="mt-4 flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    reachedLimit
                      ? 'bg-destructive'
                      : 'bg-gradient-to-r from-primary/70 to-primary'
                  }`}
                  style={{ width: `${usagePct}%` }}
                />
              </div>
              <span
                className={`text-xs font-semibold tabular-nums ${
                  reachedLimit ? 'text-destructive' : 'text-muted-foreground'
                }`}
              >
                {usagePct}%
              </span>
            </div>
          )}
        </section>

        {/* Interview history */}
        <section className="space-y-4">
          {list !== null && list.length > 0 && (
            <h2 className="text-sm font-semibold text-muted-foreground">
              {t('dashboard.historyTitle')}
            </h2>
          )}

          {list === null ? (
            <p className="text-sm text-muted-foreground">{t('dashboard.loadingInterviews')}</p>
          ) : list.length === 0 ? (
            <EmptyState t={t} />
          ) : (
            <ul className="space-y-3">
              {list.map((iv) => {
                const done = iv.status === InterviewStatus.COMPLETED;
                const href = done ? `/interview/${iv.id}/feedback` : `/interview/${iv.id}`;
                const stackNames =
                  iv.techStacks.map((ts) => ts.techStack.name).join(', ') ||
                  t('dashboard.general');
                return (
                  <li key={iv.id}>
                    <Link
                      href={href}
                      className="group flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md hover:shadow-primary/5"
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <span className="hidden h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground sm:grid">
                          <Layers className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{t(`difficulty.${iv.level}`)}</span>
                            <Badge variant={done ? 'success' : 'secondary'}>
                              {t(`status.${iv.status}`)}
                            </Badge>
                          </div>
                          <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                            <span className="truncate">{stackNames}</span>
                            <span aria-hidden>·</span>
                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                            {new Date(iv.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        {iv.feedback && <ScoreRing score={iv.feedback.overallScore} />}
                        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

/** Compact circular gauge for a 0–10 feedback score, hue-mapped like the stats. */
function ScoreRing({ score }: { score: number }) {
  const r = 17;
  const c = 2 * Math.PI * r;
  const frac = normalizeScore(score);
  const color = scoreToHsl(score);
  return (
    <span className="relative grid h-11 w-11 place-items-center" title={formatScore(score)}>
      <svg viewBox="0 0 44 44" className="h-11 w-11 -rotate-90">
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          strokeWidth="4"
          className="stroke-muted"
        />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          stroke={color}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
        />
      </svg>
      <span
        className="absolute text-[10px] font-bold tabular-nums"
        style={{ color }}
      >
        {Math.round(frac * 100)}
      </span>
    </span>
  );
}

function StatCard({
  icon,
  tile,
  label,
  value,
  color,
  className,
}: {
  icon: React.ReactNode;
  tile: string;
  label: string;
  value: string;
  color?: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 ${className ?? ''}`}
    >
      <div className="flex items-center gap-2.5">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${tile}`}>
          {icon}
        </span>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight" style={color ? { color } : undefined}>
        {value}
      </p>
    </div>
  );
}

function EmptyState({ t }: { t: (key: string) => string }) {
  const bullets = [
    { icon: Mic, text: t('dashboard.emptyBullet1') },
    { icon: Brain, text: t('dashboard.emptyBullet2') },
    { icon: BarChart3, text: t('dashboard.emptyBullet3') },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-card p-8 text-center sm:p-12">
      <div className="pointer-events-none absolute inset-0 bg-grid-faint" aria-hidden />
      <div className="relative">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Sparkles className="h-7 w-7 text-primary" />
        </div>
        <h3 className="mt-5 text-xl font-semibold">{t('dashboard.noInterviewsTitle')}</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          {t('dashboard.noInterviewsDesc')}
        </p>
        <ul className="mx-auto mt-6 flex max-w-md flex-col gap-3 text-left sm:flex-row sm:justify-center sm:gap-6">
          {bullets.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icon className="h-4 w-4 shrink-0 text-primary" />
              {text}
            </li>
          ))}
        </ul>
        <Link
          href="/interview/new"
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:scale-[1.02] hover:opacity-95"
        >
          <Plus className="h-5 w-5" />
          {t('dashboard.startCta')}
        </Link>
      </div>
    </div>
  );
}
