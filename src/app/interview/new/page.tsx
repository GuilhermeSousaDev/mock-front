'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  Check,
  Lock,
  Volume2,
  GraduationCap,
  ListChecks,
  Mic,
  Layers,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { AppNav } from '@/components/app-nav';
import { Button } from '@/components/ui/button';
import { techStacks as techStacksApi, interviews as interviewsApi, ApiError } from '@/lib/api';
import { toApiLanguage } from '@/i18n/config';
import { cn } from '@/lib/utils';
import {
  buildInterviewers,
  saveInterviewerChoice,
  type Interviewer,
} from '@/lib/interviewers';
import { DifficultyLevel, PLAN_DETAILS, Plan } from '@/types/enums';
import type { TechStack } from '@/types/api';

// Candidate-chosen interview length, matching the API's accepted range.
const MIN_QUESTION_COUNT = 5;
const MAX_QUESTION_COUNT = 15;
const MID_QUESTION_COUNT = 6;

export default function NewInterviewPage() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { user, loading } = useAuth();

  const [stacks, setStacks] = useState<TechStack[]>([]);
  const [level, setLevel] = useState<DifficultyLevel>(DifficultyLevel.MID);
  const [questionCount, setQuestionCount] = useState(MID_QUESTION_COUNT);
  const [selected, setSelected] = useState<string[]>([]);
  const [interviewers, setInterviewers] = useState<Interviewer[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    techStacksApi.list().then(setStacks).catch(() => setStacks([]));
  }, [user]);

  // Build the interviewer roster from the browser's available TTS voices for the
  // current UI language. Voices load asynchronously, so refresh on `voiceschanged`.
  const voiceLang = i18n.language === 'pt-BR' ? 'pt-BR' : 'en-US';
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const load = () => {
      const list = buildInterviewers(window.speechSynthesis.getVoices(), voiceLang);
      setInterviewers(list);
      setSelectedVoice((prev) =>
        prev && list.some((i) => i.voiceURI === prev) ? prev : (list[0]?.voiceURI ?? ''),
      );
    };
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, [voiceLang]);

  function previewVoice(iv: Interviewer) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const synth = window.speechSynthesis;
    const voice = synth.getVoices().find((v) => v.voiceURI === iv.voiceURI);
    const utter = new SpeechSynthesisUtterance(
      t('interviewers.previewLine', { name: iv.name }),
    );
    if (voice) {
      utter.voice = voice;
      utter.lang = voice.lang;
    }
    // Chromium/Edge drop a speak() issued immediately after cancel() for some
    // voices (notably the online "Natural" ones). Cancel, then start on the next
    // tick and resume() in case the queue was left paused.
    synth.cancel();
    window.setTimeout(() => {
      synth.resume();
      synth.speak(utter);
    }, 60);
  }

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
  const monthlyLimit = planDetails.interviewsPerMonth;
  const reachedLimit = monthlyLimit !== null && used >= monthlyLimit;
  const maxStacks = planDetails.maxTechStacks ?? Infinity;

  function toggleStack(id: string) {
    setError('');
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id);
      if (prev.length >= maxStacks) {
        setError(t('newInterview.maxStacksError', { plan: t(`plans.${plan}.name`), max: maxStacks }));
        return prev;
      }
      return [...prev, id];
    });
  }

  async function handleCreate() {
    if (selected.length === 0) {
      setError(t('newInterview.pickOneError'));
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const interview = await interviewsApi.create(
        level,
        selected,
        toApiLanguage(i18n.language),
        questionCount,
      );
      if (selectedVoice) saveInterviewerChoice(interview.id, selectedVoice);
      router.push(`/interview/${interview.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('newInterview.createError'));
      setSubmitting(false);
    }
  }

  // Group stacks by category for nicer layout.
  const byCategory = stacks.reduce<Record<string, TechStack[]>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});

  const selectedStacks = stacks.filter((s) => selected.includes(s.id));
  const selectedInterviewer = interviewers.find((iv) => iv.voiceURI === selectedVoice);

  return (
    <main className="min-h-screen bg-background">
      <AppNav user={user} />
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {/* Hero header */}
        <header className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-8">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-primary/20 blur-3xl"
            aria-hidden
          />
          <div className="relative max-w-xl space-y-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {t('newInterview.title')}
            </h1>
            <p className="text-muted-foreground">{t('newInterview.subtitle')}</p>
          </div>
        </header>

        {reachedLimit && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-4 flex items-center justify-between gap-4">
            <div className="flex items-start gap-2">
              <Lock className="h-4 w-4 mt-0.5 text-amber-600" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                {t('newInterview.limitReached', {
                  limit: monthlyLimit,
                  plan: t(`plans.${plan}.name`),
                })}
              </p>
            </div>
            <Link href="/subscription">
              <Button size="sm">{t('newInterview.upgrade')}</Button>
            </Link>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[1fr_19rem] lg:items-start">
          {/* Configuration */}
          <div className="space-y-6">
            {/* Level */}
            <SectionCard
              step={1}
              icon={<GraduationCap className="h-4 w-4" />}
              title={t('newInterview.targetLevel')}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.values(DifficultyLevel).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setLevel(lvl)}
                    className={cn(
                      'rounded-xl border px-4 py-3 text-left transition-colors',
                      level === lvl
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted',
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{t(`difficulty.${lvl}`)}</span>
                      {level === lvl && <Check className="h-4 w-4 shrink-0 text-primary" />}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {t(`difficultyDesc.${lvl}`)}
                    </span>
                  </button>
                ))}
              </div>
            </SectionCard>

            {/* Number of questions */}
            <SectionCard
              step={2}
              icon={<ListChecks className="h-4 w-4" />}
              title={t('newInterview.questionCount')}
              meta={
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                  {t('newInterview.questionCountValue', { count: questionCount })}
                </span>
              }
            >
              <input
                type="range"
                min={MIN_QUESTION_COUNT}
                max={MAX_QUESTION_COUNT}
                step={1}
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full accent-primary"
                aria-label={t('newInterview.questionCount')}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{MIN_QUESTION_COUNT}</span>
                <span>{MAX_QUESTION_COUNT}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t('newInterview.questionCountHint')}</p>
            </SectionCard>

            {/* Interviewer */}
            <SectionCard
              step={3}
              icon={<Mic className="h-4 w-4" />}
              title={t('newInterview.interviewer')}
              description={t('newInterview.interviewerHint')}
            >
              {interviewers.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('newInterview.noVoices')}</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {interviewers.map((iv) => {
                    const isSelected = selectedVoice === iv.voiceURI;
                    return (
                      <button
                        key={iv.voiceURI}
                        type="button"
                        onClick={() => setSelectedVoice(iv.voiceURI)}
                        className={cn(
                          'flex items-center gap-3 rounded-xl border p-3 text-left transition-colors',
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:bg-muted',
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-base font-semibold text-white',
                            iv.gradient,
                          )}
                        >
                          {iv.initials}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="font-medium truncate">{iv.name}</span>
                            {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                          </span>
                          <span className="block text-xs text-muted-foreground truncate">
                            {t(`interviewers.personas.${iv.personaKey}`)}
                          </span>
                        </span>
                        <span
                          role="button"
                          tabIndex={-1}
                          onClick={(e) => {
                            e.stopPropagation();
                            previewVoice(iv);
                          }}
                          className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                          title={t('newInterview.preview')}
                          aria-label={t('newInterview.preview')}
                        >
                          <Volume2 className="h-4 w-4" />
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </SectionCard>

            {/* Tech stacks */}
            <SectionCard
              step={4}
              icon={<Layers className="h-4 w-4" />}
              title={t('newInterview.techStacks')}
              meta={
                <span className="text-xs text-muted-foreground">
                  {t('newInterview.selected', {
                    count: selected.length,
                    max: maxStacks === Infinity ? '∞' : maxStacks,
                  })}
                </span>
              }
            >
              <div className="space-y-4">
                {Object.entries(byCategory).map(([category, items]) => (
                  <div key={category} className="space-y-2">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {category}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {items.map((s) => {
                        const isSelected = selected.includes(s.id);
                        return (
                          <button
                            key={s.id}
                            onClick={() => toggleStack(s.id)}
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
                              isSelected
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border hover:bg-muted',
                            )}
                          >
                            {isSelected && <Check className="h-3.5 w-3.5" />}
                            {s.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {stacks.length === 0 && (
                  <p className="text-sm text-muted-foreground">{t('newInterview.loadingStacks')}</p>
                )}
              </div>
            </SectionCard>
          </div>

          {/* Sticky summary / launch panel */}
          <aside className="lg:sticky lg:top-20">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
              <div>
                <h2 className="font-semibold">{t('newInterview.summaryTitle')}</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t('newInterview.summaryHint')}
                </p>
              </div>

              <dl className="space-y-3 text-sm">
                <SummaryRow label={t('newInterview.summaryLevel')}>
                  {t(`difficulty.${level}`)}
                </SummaryRow>
                <SummaryRow label={t('newInterview.summaryQuestions')}>{questionCount}</SummaryRow>
                <SummaryRow label={t('newInterview.summaryInterviewer')}>
                  {selectedInterviewer?.name ?? t('newInterview.anyInterviewer')}
                </SummaryRow>
                <div className="space-y-1.5">
                  <dt className="text-muted-foreground">{t('newInterview.summaryStacks')}</dt>
                  <dd>
                    {selectedStacks.length === 0 ? (
                      <span className="text-muted-foreground">{t('newInterview.noStacksYet')}</span>
                    ) : (
                      <span className="flex flex-wrap gap-1.5">
                        {selectedStacks.map((s) => (
                          <span
                            key={s.id}
                            className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium"
                          >
                            {s.name}
                          </span>
                        ))}
                      </span>
                    )}
                  </dd>
                </div>
              </dl>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button
                size="lg"
                className="w-full"
                onClick={handleCreate}
                disabled={submitting || reachedLimit || selected.length === 0}
              >
                {submitting ? t('newInterview.settingUp') : t('newInterview.start')}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Link
                href="/dashboard"
                className="block text-center text-sm text-muted-foreground hover:text-foreground"
              >
                {t('common.cancel')}
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function SectionCard({
  step,
  icon,
  title,
  description,
  meta,
  children,
}: {
  step: number;
  icon: React.ReactNode;
  title: string;
  description?: string;
  meta?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
            {icon}
            <span className="absolute -right-1.5 -top-1.5 grid h-4 w-4 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {step}
            </span>
          </span>
          <div>
            <h2 className="text-sm font-semibold leading-8">{title}</h2>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {meta && <div className="shrink-0">{meta}</div>}
      </div>
      {children}
    </section>
  );
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-right">{children}</dd>
    </div>
  );
}
