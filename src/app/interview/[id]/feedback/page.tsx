'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Download, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { AppNav } from '@/components/app-nav';
import { Button } from '@/components/ui/button';
import {
  interviews as interviewsApi,
  feedback as feedbackApi,
  recordings as recordingsApi,
  ApiError,
} from '@/lib/api';
import {
  formatScore,
  scoreToHsl,
  scoreToKey,
  normalizeScore,
  formatDuration,
} from '@/lib/utils';
import type { Interview, FeedbackReport } from '@/types/api';

export default function FeedbackPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { t } = useTranslation();
  const { user, loading } = useAuth();

  const [interview, setInterview] = useState<Interview | null>(null);
  const [report, setReport] = useState<FeedbackReport | null>(null);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!user) return;
    interviewsApi.get(id).then(setInterview).catch(() => {});
    feedbackApi
      .get(id)
      .then(setReport)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : t('feedback.notAvailable')),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id]);

  async function downloadRecording() {
    setDownloading(true);
    try {
      const blob = await recordingsApi.download(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `interview-${id}.webm`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError(t('feedback.downloadError'));
    } finally {
      setDownloading(false);
    }
  }

  if (loading || !user) {
    return (
      <main className="min-h-screen grid place-items-center bg-background">
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <AppNav user={user} />
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('feedback.title')}</h1>
            {interview && (
              <p className="text-sm text-muted-foreground mt-1">
                {t(`difficulty.${interview.level}`)} ·{' '}
                {interview.techStacks.map((ts) => ts.techStack.name).join(', ') ||
                  t('dashboard.general')}
              </p>
            )}
          </div>
          {interview?.recording && (
            <Button variant="outline" onClick={downloadRecording} disabled={downloading}>
              <Download className="h-4 w-4" />
              {downloading
                ? t('feedback.preparing')
                : t('feedback.recording', {
                    duration: formatDuration(interview.recording.duration),
                  })}
            </Button>
          )}
        </header>

        {!report ? (
          <div className="rounded-2xl border border-dashed border-border py-16 text-center">
            <p className="text-sm text-muted-foreground">{error || t('feedback.generating')}</p>
            <Link href="/dashboard" className="text-sm text-primary hover:underline mt-2 inline-block">
              {t('common.back')}
            </Link>
          </div>
        ) : (
          <>
            {/* Overall score */}
            <div className="rounded-2xl border border-border bg-card p-6 flex items-center gap-6">
              <ScoreRing score={report.overallScore} />
              <div>
                <p className="text-sm text-muted-foreground">{t('feedback.overallScore')}</p>
                <p
                  className="text-lg font-semibold mt-1"
                  style={{ color: scoreToHsl(report.overallScore) }}
                >
                  {t(`score.${scoreToKey(report.overallScore)}`)}
                </p>
              </div>
            </div>

            {/* Summary */}
            <section className="space-y-2">
              <h2 className="font-semibold">{t('feedback.summary')}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{report.summary}</p>
            </section>

            {/* Topic breakdown */}
            {report.topicBreakdown.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-semibold">{t('feedback.byTopic')}</h2>
                <div className="space-y-3">
                  {report.topicBreakdown.map((topic) => (
                    <div key={topic.topic} className="rounded-xl border border-border bg-card p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{topic.topic}</span>
                        <span
                          className="text-sm font-semibold"
                          style={{ color: scoreToHsl(topic.score) }}
                        >
                          {formatScore(topic.score)}
                        </span>
                      </div>
                      <ScoreBar score={topic.score} />
                      {topic.notes && (
                        <p className="text-sm text-muted-foreground mt-2">{topic.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div className="grid sm:grid-cols-2 gap-6">
              <FeedbackList
                title={t('feedback.strengths')}
                items={report.strengths}
                icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
              />
              <FeedbackList
                title={t('feedback.improvements')}
                items={report.improvements}
                icon={<AlertCircle className="h-4 w-4 text-amber-600" />}
              />
            </div>

            {report.nextSteps.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-semibold">{t('feedback.nextSteps')}</h2>
                <ul className="space-y-2">
                  {report.nextSteps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <ArrowRight className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="flex gap-3 pt-2">
              <Link href="/interview/new">
                <Button>{t('feedback.practiceAgain')}</Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline">{t('common.back')}</Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function ScoreRing({ score }: { score: number }) {
  const value = normalizeScore(score);
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - value);
  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg className="h-24 w-24 -rotate-90" viewBox="0 0 80 80">
        <circle
          cx="40"
          cy="40"
          r={radius}
          className="fill-none stroke-border"
          strokeWidth="8"
        />
        <circle
          cx="40"
          cy="40"
          r={radius}
          className="fill-none transition-[stroke-dashoffset] duration-700"
          style={{ color: scoreToHsl(score) }}
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span
        className="absolute inset-0 grid place-items-center text-xl font-bold"
        style={{ color: scoreToHsl(score) }}
      >
        {formatScore(score)}
      </span>
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  const value = normalizeScore(score);
  return (
    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full transition-[width] duration-700"
        style={{ width: `${Math.round(value * 100)}%`, backgroundColor: scoreToHsl(score) }}
      />
    </div>
  );
}

function FeedbackList({
  title,
  items,
  icon,
}: {
  title: string;
  items: string[];
  icon: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <section className="space-y-2">
      <h2 className="font-semibold">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('feedback.noNotes')}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="mt-0.5 shrink-0">{icon}</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
