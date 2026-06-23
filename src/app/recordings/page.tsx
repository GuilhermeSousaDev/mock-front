'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Play, Download, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { AppNav } from '@/components/app-nav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  interviews as interviewsApi,
  recordings as recordingsApi,
} from '@/lib/api';
import { formatDuration } from '@/lib/utils';
import type { Interview } from '@/types/api';

export default function RecordingsPage() {
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

  const recorded = (list ?? []).filter((iv) => iv.recording);

  return (
    <main className="min-h-screen bg-background">
      <AppNav user={user} />
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        <header>
          <h1 className="text-2xl font-bold">{t('recordings.title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t('recordings.subtitle')}
          </p>
        </header>

        {list === null ? (
          <p className="text-sm text-muted-foreground">
            {t('recordings.loading')}
          </p>
        ) : recorded.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-20 text-center">
            <p className="text-muted-foreground text-sm">
              {t('recordings.empty')}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {recorded.map((iv) => (
              <li key={iv.id}>
                <RecordingRow interview={iv} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function RecordingRow({ interview }: { interview: Interview }) {
  const { t } = useTranslation();
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Revoke the object URL when the row unmounts so blobs aren't leaked.
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  // Fetch the recording blob once (it needs the bearer token, so it can't be a
  // plain <audio src> to the API). Subsequent play/download reuse the same URL.
  async function ensureUrl(): Promise<string | null> {
    if (urlRef.current) return urlRef.current;
    setBusy(true);
    setError('');
    try {
      const blob = await recordingsApi.download(interview.id);
      const objectUrl = URL.createObjectURL(blob);
      urlRef.current = objectUrl;
      setUrl(objectUrl);
      return objectUrl;
    } catch {
      setError(t('recordings.loadError'));
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function download() {
    const objectUrl = await ensureUrl();
    if (!objectUrl) return;
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = `interview-${interview.id}.webm`;
    a.click();
  }

  const stacks =
    interview.techStacks.map((ts) => ts.techStack.name).join(', ') ||
    t('recordings.general');

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {t(`difficulty.${interview.level}`)}
            </span>
            {interview.recording && (
              <Badge variant="secondary">
                {formatDuration(interview.recording.duration)}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {stacks}
            {' · '}
            {new Date(interview.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!url && (
            <Button
              variant="outline"
              size="sm"
              onClick={ensureUrl}
              disabled={busy}
            >
              <Play className="h-4 w-4" />
              {busy ? t('recordings.loadingAudio') : t('recordings.play')}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={download} disabled={busy}>
            <Download className="h-4 w-4" />
            {t('recordings.download')}
          </Button>
        </div>
      </div>

      {url && (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <audio src={url} controls autoPlay className="w-full" />
      )}

      {interview.feedback && (
        <Link
          href={`/interview/${interview.id}/feedback`}
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          {t('feedback.title')}
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
