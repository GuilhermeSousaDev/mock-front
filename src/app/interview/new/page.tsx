'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Check, Lock, Volume2 } from 'lucide-react';
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

  return (
    <main className="min-h-screen bg-background">
      <AppNav user={user} />
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        <header>
          <h1 className="text-2xl font-bold">{t('newInterview.title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t('newInterview.subtitle')}</p>
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

        {/* Level */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium">{t('newInterview.targetLevel')}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.values(DifficultyLevel).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLevel(lvl)}
                className={cn(
                  'rounded-lg border px-4 py-3 text-sm font-medium text-left transition-colors',
                  level === lvl
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border hover:bg-muted',
                )}
              >
                {t(`difficulty.${lvl}`)}
              </button>
            ))}
          </div>
        </section>

        {/* Number of questions */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">{t('newInterview.questionCount')}</h2>
            <span className="text-xs text-muted-foreground">
              {t('newInterview.questionCountValue', { count: questionCount })}
            </span>
          </div>
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
        </section>

        {/* Interviewer */}
        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-medium">{t('newInterview.interviewer')}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('newInterview.interviewerHint')}
            </p>
          </div>
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
        </section>

        {/* Tech stacks */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">{t('newInterview.techStacks')}</h2>
            <span className="text-xs text-muted-foreground">
              {t('newInterview.selected', {
                count: selected.length,
                max: maxStacks === Infinity ? '∞' : maxStacks,
              })}
            </span>
          </div>
          {Object.entries(byCategory).map(([category, items]) => (
            <div key={category} className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{category}</p>
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
        </section>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex items-center gap-3">
          <Button
            size="lg"
            onClick={handleCreate}
            disabled={submitting || reachedLimit || selected.length === 0}
          >
            {submitting ? t('newInterview.settingUp') : t('newInterview.start')}
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            {t('common.cancel')}
          </Link>
        </div>
      </div>
    </main>
  );
}
