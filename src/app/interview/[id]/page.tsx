'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  PhoneOff,
  Send,
  Zap,
  Circle,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { AppNav } from '@/components/app-nav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  interviews as interviewsApi,
  recordings as recordingsApi,
  ApiError,
} from '@/lib/api';
import {
  buildInterviewers,
  loadInterviewerChoice,
  type Interviewer,
} from '@/lib/interviewers';
import {
  PLAN_DETAILS,
  InterviewStatus,
  InterviewPhase,
  Plan,
} from '@/types/enums';
import type { Interview, Question, User } from '@/types/api';

type Stage = 'intro' | 'live' | 'finishing';

type ChatMessage = { id: string; role: 'interviewer' | 'user'; text: string };

function msgId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

// Idle for this long after the last recognized speech = the candidate stopped
// talking; in auto-send mode we submit their answer then.
const AUTO_SEND_SILENCE_MS = 2400;
const AUTO_SEND_STORAGE_KEY = 'mock:autosend';

// Speech recognition decodes everything phonetically in the active language, so
// English technical terms spoken with a pt-BR accent come back mangled. This is a
// deterministic first pass that fixes the common, consistent mis-hearings; the
// backend then runs an LLM cleanup for anything this list doesn't cover. Build it
// out from the raw transcripts you actually observe.
const TECH_FIXES: Array<[RegExp, string]> = [
  [/\bgit ?(?:hab+e?|rab+e?|hub e|abe)\b/gi, 'GitHub'],
  [/\bjeison ?web ?token\b/gi, 'jsonwebtoken'],
  [/\bjota ?(?:double ?bliu|w) ?tê\b/gi, 'JWT'],
  [/\bn[oó]d ?(?:j[eé]s|gis)\b/gi, 'Node.js'],
  [/\bpostgre(?:s|sql| és quê éle)\b/gi, 'PostgreSQL'],
  [/\bk(?:u|ou)bernetes\b/gi, 'Kubernetes'],
  [/\bdóquer\b/gi, 'Docker'],
  [/\bri[aá]ct\b/gi, 'React'],
  [/\bnext ?j[eé]s\b/gi, 'Next.js'],
  [/\bté[ -]?s[ -]?cript\b/gi, 'TypeScript'],
  [/\bei ?p[ií] ?ai\b/gi, 'API'],
];

/** Apply the deterministic technical-term fixes to a finalized speech fragment. */
function normalizeTech(text: string): string {
  return TECH_FIXES.reduce((s, [re, fix]) => s.replace(re, fix), text);
}

/**
 * Pick a speech-synthesis voice that actually matches the target language. Setting
 * only `utter.lang` is not enough: when no `voice` is assigned the browser falls
 * back to the OS default voice, so on a pt-BR machine the English question gets
 * read by a Portuguese engine and sounds garbled. Prefer an exact locale match,
 * then any voice sharing the language prefix ("en"/"pt").
 */
function pickVoice(
  voices: SpeechSynthesisVoice[],
  lang: string,
): SpeechSynthesisVoice | null {
  const target = lang.toLowerCase();
  const prefix = target.slice(0, 2);
  const norm = (l: string) => l.replace('_', '-').toLowerCase();
  return (
    voices.find((v) => norm(v.lang) === target) ??
    voices.find((v) => norm(v.lang).startsWith(prefix)) ??
    null
  );
}

// Minimal typing for the browser SpeechRecognition API (not in standard lib types).
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult:
    | ((e: {
        resultIndex: number;
        results: ArrayLike<
          { isFinal: boolean } & ArrayLike<{ transcript: string }>
        >;
      }) => void)
    | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

export default function InterviewSessionPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { t, i18n } = useTranslation();
  const { user, loading } = useAuth();

  const [interview, setInterview] = useState<Interview | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState<Question | null>(null);
  const [transcript, setTranscript] = useState('');
  const [stage, setStage] = useState<Stage>('intro');
  const [phase, setPhase] = useState<InterviewPhase>(InterviewPhase.IDLE);
  const [error, setError] = useState('');
  const [muted, setMuted] = useState(false);
  const [dictating, setDictating] = useState(false);
  const [answeredCount, setAnsweredCount] = useState(0);
  // Brief spoken acknowledgment of the previous answer, delivered as a transition
  // just before the current question (empty for the first question).
  const [transition, setTransition] = useState('');
  // Running transcript shown in the Meet-style chat panel.
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // The chosen interviewer "character" (persona + browser voice).
  const [interviewer, setInterviewer] = useState<Interviewer | null>(null);
  // When on, the answer is submitted automatically once the candidate stops
  // talking — a hands-free, more realistic interview. Off = manual send.
  const [autoSend, setAutoSend] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recordStartRef = useRef<number>(0);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  // Available TTS voices. Populated asynchronously by the browser, so we cache them
  // and refresh on `voiceschanged` rather than calling getVoices() at speak time
  // (which is often empty on the first call).
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  // Tracks whether the user *wants* to be dictating, independently of the
  // recognizer's own lifecycle (Chrome ends a session on silence / after a result).
  const dictatingRef = useRef(false);
  // Transcript text already finalized; interim (in-progress) speech is rendered on
  // top of this and only folded in once the recognizer marks it final.
  const committedTranscriptRef = useRef('');
  // The resolved browser voice for the chosen interviewer (null → default voice).
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  // Questions already pushed into the chat, so re-renders don't duplicate them.
  const pushedQuestionIdsRef = useRef<Set<string>>(new Set());
  // Latest values mirrored into refs so the auto-send silence timer (a stale
  // closure) can read them, plus a pointer to the current submit handler.
  const transcriptRef = useRef('');
  const phaseRef = useRef<InterviewPhase>(InterviewPhase.IDLE);
  const autoSendRef = useRef(false);
  const silenceTimerRef = useRef<number | null>(null);
  const submitRef = useRef<() => void>(() => {});
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const canRecord = user
    ? PLAN_DETAILS[user.subscription?.plan ?? Plan.FREE].canRecord
    : false;

  // ─── Load interview ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    interviewsApi
      .get(id)
      .then((iv) => {
        setInterview(iv);
        const qs = (iv.questions ?? [])
          .slice()
          .sort((a, b) => a.order - b.order);
        setQuestions(qs);
        const firstUnanswered = qs.find((q) => !q.answer) ?? null;
        setCurrent(firstUnanswered);
        setAnsweredCount(qs.filter((q) => q.answer).length);
        // Seed the chat with any Q&A already on record (resumed interview).
        const seeded: ChatMessage[] = [];
        for (const q of qs) {
          if (!q.answer) break;
          pushedQuestionIdsRef.current.add(q.id);
          seeded.push({ id: q.id, role: 'interviewer', text: q.text });
          seeded.push({ id: msgId(), role: 'user', text: q.answer.transcript });
        }
        if (seeded.length) setMessages(seeded);
        if (iv.status === InterviewStatus.COMPLETED) {
          router.replace(`/interview/${id}/feedback`);
        } else if (
          iv.status === InterviewStatus.IN_PROGRESS ||
          iv.status === InterviewStatus.WARMUP
        ) {
          setStage('live');
        }
      })
      .catch((err) =>
        setError(
          err instanceof ApiError ? err.message : t('session.loadError'),
        ),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id, router]);

  // Mirror the latest values into refs for the auto-send timer's stale closure.
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    autoSendRef.current = autoSend;
    try {
      localStorage.setItem(AUTO_SEND_STORAGE_KEY, autoSend ? '1' : '0');
    } catch {
      /* storage unavailable — preference just won't persist */
    }
  }, [autoSend]);

  // Restore the auto-send preference once on mount.
  useEffect(() => {
    try {
      if (localStorage.getItem(AUTO_SEND_STORAGE_KEY) === '1') setAutoSend(true);
    } catch {
      /* ignore */
    }
  }, []);

  // Keep the chat scrolled to the latest message.
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, transcript]);

  // ─── Text-to-speech for the current question ───────────────────────────────────
  // Keep the available voices fresh; the list loads asynchronously in most browsers.
  // Also resolve the chosen interviewer (persona + voice) once voices are known.
  const resolveInterviewer = useCallback(() => {
    const lang = i18n.language === 'pt-BR' ? 'pt-BR' : 'en-US';
    const choice = loadInterviewerChoice(id);
    const roster = buildInterviewers(voicesRef.current, lang);
    const picked = roster.find((iv) => iv.voiceURI === choice) ?? roster[0] ?? null;
    setInterviewer(picked);
    selectedVoiceRef.current = picked
      ? (voicesRef.current.find((v) => v.voiceURI === picked.voiceURI) ?? null)
      : null;
  }, [id, i18n.language]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const load = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
      resolveInterviewer();
    };
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () =>
      window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, [resolveInterviewer]);

  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (muted || typeof window === 'undefined' || !window.speechSynthesis) {
        // Nothing will be spoken (muted / unsupported), but callers awaiting the
        // sign-off still need to be released so the flow can continue.
        onEnd?.();
        return;
      }
      const synth = window.speechSynthesis;
      const lang = i18n.language === 'pt-BR' ? 'pt-BR' : 'en-US';

      const utterWith = (voices: SpeechSynthesisVoice[]) => {
        setPhase(InterviewPhase.AI_SPEAKING);
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = lang;
        // Use the interviewer the candidate chose; otherwise pin a matching voice
        // so English isn't read by the OS default (often a pt-BR voice on a
        // Brazilian-locale machine), which mangles pronunciation.
        const voice = selectedVoiceRef.current ?? pickVoice(voices, lang);
        if (voice) {
          utter.voice = voice;
          utter.lang = voice.lang; // match the chosen voice's exact locale
        }
        utter.onend = () => {
          setPhase(InterviewPhase.LISTENING);
          onEnd?.();
        };
        // Chromium/Edge can drop a speak() fired right after cancel() for some
        // voices; defer a tick and resume() in case the queue was left paused.
        synth.cancel();
        window.setTimeout(() => {
          synth.resume();
          synth.speak(utter);
        }, 60);
      };

      // Voices load asynchronously: getVoices() is empty until the browser fires
      // `voiceschanged`. Speaking before they're ready pins no voice, so the engine
      // falls back to the OS default — e.g. a Portuguese voice reading the English
      // question. If they aren't ready yet, wait for them once, then speak.
      const ready = voicesRef.current.length
        ? voicesRef.current
        : synth.getVoices();
      if (ready.length) {
        voicesRef.current = ready;
        utterWith(ready);
      } else {
        const onVoices = () => {
          synth.removeEventListener('voiceschanged', onVoices);
          voicesRef.current = synth.getVoices();
          utterWith(voicesRef.current);
        };
        synth.addEventListener('voiceschanged', onVoices);
      }
    },
    [muted, i18n.language],
  );

  useEffect(() => {
    if (stage === 'live' && current) {
      // Append the interviewer's turn to the chat once per question: the spoken
      // acknowledgment of the previous answer (if any), then the new question.
      if (!pushedQuestionIdsRef.current.has(current.id)) {
        pushedQuestionIdsRef.current.add(current.id);
        setMessages((prev) => [
          ...prev,
          ...(transition
            ? [{ id: msgId(), role: 'interviewer' as const, text: transition }]
            : []),
          { id: current.id, role: 'interviewer' as const, text: current.text },
        ]);
      }
      // Lead with the interviewer's feedback on the previous answer, then the
      // question, as one continuous spoken turn.
      speak(transition ? `${transition} ${current.text}` : current.text);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, stage]);

  // ─── Recording ─────────────────────────────────────────────────────────────────
  async function startRecording() {
    if (!canRecord) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';
      // Cap the bitrate: speech at 48kbps opus stays clear while keeping even long
      // interviews well under the API's upload limit (the default bitrate can be 4-5x larger).
      const recorder = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        audioBitsPerSecond: 48000,
      });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      recordStartRef.current = Date.now();
    } catch {
      setError(t('session.micDenied'));
    }
  }

  function stopRecording(): Promise<{ blob: Blob; duration: number } | null> {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        resolve(null);
        return;
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        const duration = Math.round(
          (Date.now() - recordStartRef.current) / 1000,
        );
        streamRef.current?.getTracks().forEach((t) => t.stop());
        resolve({ blob, duration });
      };
      recorder.stop();
    });
  }

  // ─── Voice dictation (fills the answer box) ─────────────────────────────────────
  const stopDictation = useCallback(() => {
    dictatingRef.current = false;
    recognitionRef.current?.stop();
    setDictating(false);
    if (silenceTimerRef.current) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const startDictation = useCallback(() => {
    const w = window as unknown as {
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
      SpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Impl = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Impl) {
      setError(t('session.dictationUnsupported'));
      return;
    }
    if (dictatingRef.current) return;

    // Stop the question audio so it doesn't bleed into the recognizer.
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();

    // Anything already in the box (typed or previously dictated) is the baseline
    // we keep appending to.
    committedTranscriptRef.current = transcriptRef.current.trim();

    const recognition = new Impl();
    recognition.lang = i18n.language === 'pt-BR' ? 'pt-BR' : 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        const phrase = result[0].transcript;
        if (result.isFinal) {
          // Fold finalized speech into the committed baseline so it survives the
          // recognizer restarting (which resets `results`). Fix mangled technical
          // terms before committing so the textarea shows the corrected text.
          const base = committedTranscriptRef.current;
          committedTranscriptRef.current =
            (base ? base + ' ' : '') + normalizeTech(phrase.trim());
        } else {
          interim += phrase;
        }
      }
      const base = committedTranscriptRef.current;
      setTranscript(
        interim.trim() ? (base ? base + ' ' : '') + interim.trim() : base,
      );
      // Auto-send: each speech result resets a silence timer; when the candidate
      // goes quiet for a beat, submit the answer on their behalf.
      if (autoSendRef.current) {
        if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = window.setTimeout(() => {
          if (
            autoSendRef.current &&
            transcriptRef.current.trim() &&
            phaseRef.current !== InterviewPhase.THINKING
          ) {
            submitRef.current();
          }
        }, AUTO_SEND_SILENCE_MS);
      }
    };
    recognition.onerror = (e) => {
      // Fatal errors: stop dictation instead of restarting in a tight loop.
      // `network` means the browser couldn't reach its speech backend (common in
      // Chromium builds without Google's speech key, or when it's blocked).
      if (e.error === 'network') {
        setError(t('session.dictationNetworkError'));
        stopDictation();
      } else if (
        e.error === 'not-allowed' ||
        e.error === 'service-not-allowed' ||
        e.error === 'audio-capture'
      ) {
        setError(t('session.micDenied'));
        stopDictation();
      }
      // Non-fatal (e.g. `no-speech`, `aborted`) fall through to onend, which
      // restarts the session while the user still wants to dictate.
    };
    recognition.onend = () => {
      // Chrome ends the session on silence or after a result. Restart it as long
      // as the user still wants to dictate, otherwise the toggle would flip off
      // on its own before they finish speaking.
      if (dictatingRef.current) {
        try {
          recognition.start();
        } catch {
          /* already starting — ignore */
        }
      } else {
        setDictating(false);
      }
    };
    recognition.start();
    recognitionRef.current = recognition;
    dictatingRef.current = true;
    setDictating(true);
  }, [t, i18n.language, stopDictation]);

  function toggleDictation() {
    if (dictatingRef.current) stopDictation();
    else startDictation();
  }

  // Hands-free mode: once the interviewer finishes speaking and it's the
  // candidate's turn, start listening automatically so they can just talk.
  useEffect(() => {
    if (
      stage === 'live' &&
      autoSend &&
      phase === InterviewPhase.LISTENING &&
      !dictatingRef.current
    ) {
      startDictation();
    }
  }, [phase, stage, autoSend, startDictation]);

  // ─── Flow control ────────────────────────────────────────────────────────────
  async function handleBegin() {
    setError('');
    await startRecording();
    try {
      await interviewsApi.updateStatus(id, InterviewStatus.IN_PROGRESS);
    } catch {
      /* non-fatal: status will still advance as answers are submitted */
    }
    setStage('live');
  }

  async function handleSubmitAnswer() {
    if (!current || !transcript.trim()) return;
    const answer = transcript.trim();
    stopDictation();
    setPhase(InterviewPhase.THINKING);
    setError('');
    setMessages((prev) => [...prev, { id: msgId(), role: 'user', text: answer }]);
    try {
      const result = await interviewsApi.submitAnswer(id, current.id, answer);
      setAnsweredCount((c) => c + 1);
      setTranscript('');
      if (result.done || !result.nextQuestion) {
        // The final answer has been recorded. Show the interviewer's sign-off in
        // the transcript and read it aloud, then wait for it to finish before
        // tearing down the live view — otherwise the interview cuts off abruptly
        // right after the candidate's last answer.
        const closing = result.closing?.trim();
        if (closing) {
          setPhase(InterviewPhase.AI_SPEAKING);
          setMessages((prev) => [
            ...prev,
            { id: msgId(), role: 'interviewer', text: closing },
          ]);
          await new Promise<void>((resolve) => {
            let settled = false;
            const done = () => {
              if (settled) return;
              settled = true;
              resolve();
            };
            // Safety net: some browsers never fire `onend`, so don't hang here.
            const timer = window.setTimeout(done, 10000);
            speak(closing, () => {
              window.clearTimeout(timer);
              done();
            });
          });
        }
        await finishInterview();
      } else {
        // Set the transition before the question so the speak effect (which fires
        // on the `current` change) reads the feedback ahead of the new question.
        setTransition(result.feedback?.trim() ?? '');
        setQuestions((prev) => [...prev, result.nextQuestion!]);
        setCurrent(result.nextQuestion);
      }
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t('session.submitError'),
      );
      setPhase(InterviewPhase.LISTENING);
    }
  }

  async function finishInterview() {
    setStage('finishing');
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
    try {
      const rec = await stopRecording();
      if (rec && canRecord && rec.blob.size > 0) {
        const base64 = await blobToBase64(rec.blob);
        await recordingsApi
          .upload(id, base64, rec.blob.type || 'audio/webm', rec.duration)
          .catch(() => {
            /* recording upload is best-effort */
          });
      }
      await interviewsApi.updateStatus(id, InterviewStatus.COMPLETED);
      router.replace(`/interview/${id}/feedback`);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t('session.finishError'),
      );
      setStage('live');
    }
  }

  // Keep the auto-send timer pointed at the current submit handler (which closes
  // over the latest `current`/`transcript`).
  useEffect(() => {
    submitRef.current = handleSubmitAnswer;
  });

  // Clean up media on unmount.
  useEffect(() => {
    return () => {
      dictatingRef.current = false;
      recognitionRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
      if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
    };
  }, []);

  if (loading || !user || !interview) {
    return (
      <main className="min-h-screen grid place-items-center bg-background">
        <p className="text-sm text-muted-foreground">
          {error || t('common.loading')}
        </p>
      </main>
    );
  }

  const stackNames = interview.techStacks
    .map((t) => t.techStack.name)
    .join(', ');

  const ctrlBtn =
    'inline-flex h-12 w-12 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-muted disabled:opacity-50';

  return (
    <main className="h-screen overflow-hidden bg-background flex flex-col">
      <AppNav user={user} />
      <div className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col min-h-0">
        <header className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold">
              {t('session.title', {
                level: t(`difficulty.${interview.level}`),
              })}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {stackNames || t('dashboard.general')}
            </p>
          </div>
          <Badge variant="secondary">
            {t('session.question', { number: answeredCount + 1 })}
          </Badge>
        </header>

        {stage === 'intro' && (
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center space-y-6">
              <div className="flex flex-col items-center gap-3">
                <InterviewerAvatar interviewer={interviewer} size="lg" />
                <div>
                  <p className="font-semibold text-lg">
                    {interviewer?.name ?? t('session.interviewer')}
                  </p>
                  {interviewer && (
                    <p className="text-sm text-muted-foreground">
                      {t(`interviewers.personas.${interviewer.personaKey}`)}
                    </p>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {canRecord
                  ? t('session.introRecord')
                  : t('session.introNoRecord')}
              </p>
              <Button size="lg" onClick={handleBegin} className="w-full">
                <Mic className="h-4 w-4" />
                {t('session.begin')}
              </Button>
            </div>
          </div>
        )}

        {stage === 'live' && current && (
          <div className="grid lg:grid-cols-[1fr_360px] gap-4 flex-1 min-h-0">
            {/* Call stage */}
            <div className="flex flex-col gap-4 min-h-0">
              <div className="grid sm:grid-cols-2 items-stretch gap-4 flex-1 min-h-[18rem]">
                <InterviewerTile
                  interviewer={interviewer}
                  phase={phase}
                  muted={muted}
                />
                <UserTile
                  user={user}
                  recording={!!mediaRecorderRef.current}
                  dictating={dictating}
                  caption={transcript}
                />
              </div>

              {/* Control bar */}
              <div className="flex items-center justify-center gap-2 sm:gap-3 rounded-2xl border border-border bg-card px-4 py-3">
                <button
                  type="button"
                  onClick={toggleDictation}
                  title={t('session.micHint')}
                  className={cn(
                    ctrlBtn,
                    dictating &&
                      'border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600',
                  )}
                >
                  {dictating ? (
                    <Mic className="h-5 w-5" />
                  ) : (
                    <MicOff className="h-5 w-5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMuted((m) => !m);
                    if (typeof window !== 'undefined')
                      window.speechSynthesis?.cancel();
                  }}
                  title={t('session.speakerHint')}
                  className={cn(ctrlBtn, muted && 'bg-muted')}
                >
                  {muted ? (
                    <VolumeX className="h-5 w-5" />
                  ) : (
                    <Volume2 className="h-5 w-5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setAutoSend((a) => !a)}
                  title={
                    autoSend
                      ? t('session.autoSendHint')
                      : t('session.manualSendHint')
                  }
                  aria-pressed={autoSend}
                  className={cn(
                    'inline-flex h-12 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium transition-colors hover:bg-muted',
                    autoSend &&
                      'border-primary bg-primary text-primary-foreground hover:bg-primary/90',
                  )}
                >
                  <Zap className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('session.autoSend')}</span>
                </button>
                <button
                  type="button"
                  onClick={finishInterview}
                  title={t('session.endGetFeedback')}
                  className={cn(
                    ctrlBtn,
                    'ml-1 border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90',
                  )}
                >
                  <PhoneOff className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Transcript / chat */}
            <ChatPanel
              messages={messages}
              interviewer={interviewer}
              userName={user.name}
              transcript={transcript}
              setTranscript={setTranscript}
              onSubmit={handleSubmitAnswer}
              thinking={phase === InterviewPhase.THINKING}
              chatEndRef={chatEndRef}
            />
          </div>
        )}

        {stage === 'finishing' && (
          <div className="flex flex-1 items-center justify-center">
            <div className="rounded-2xl border border-border bg-card p-10 text-center space-y-2 max-w-md">
              <p className="font-medium">{t('session.wrappingUp')}</p>
              <p className="text-sm text-muted-foreground">
                {t('session.wrappingUpDesc')}
              </p>
            </div>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      </div>
    </main>
  );
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (
    ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
  );
}

function InterviewerAvatar({
  interviewer,
  size = 'md',
  ring = false,
}: {
  interviewer: Interviewer | null;
  size?: 'md' | 'lg';
  ring?: boolean;
}) {
  const gradient = interviewer?.gradient ?? 'from-slate-500 to-slate-700';
  const initials = interviewer?.initials ?? 'AI';
  return (
    <span
      className={cn(
        'flex items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white ring-4 transition-all',
        gradient,
        size === 'lg' ? 'h-24 w-24 text-3xl' : 'h-12 w-12 text-base',
        ring ? 'ring-primary' : 'ring-transparent',
      )}
    >
      {initials}
    </span>
  );
}

function SoundBars() {
  return (
    <span className="inline-flex items-end gap-0.5 h-3" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="w-0.5 rounded-full bg-primary animate-pulse"
          style={{ height: `${[40, 100, 70, 90][i]}%`, animationDelay: `${i * 120}ms` }}
        />
      ))}
    </span>
  );
}

function InterviewerTile({
  interviewer,
  phase,
  muted,
}: {
  interviewer: Interviewer | null;
  phase: InterviewPhase;
  muted: boolean;
}) {
  const { t } = useTranslation();
  const speaking = phase === InterviewPhase.AI_SPEAKING;
  const thinking = phase === InterviewPhase.THINKING;
  const status = speaking
    ? t('session.interviewerSpeaking')
    : thinking
      ? t('session.thinking')
      : t('session.listening');
  return (
    <div className="relative flex flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border border-border bg-card p-6">
      <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/70 px-2 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur">
        <Sparkles className="h-3 w-3 text-primary" />
        {t('session.interviewer')}
      </span>
      {muted && (
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/70 px-2 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur">
          <VolumeX className="h-3 w-3" />
          {t('session.muted')}
        </span>
      )}
      <div className="relative">
        <span
          className={cn(
            'absolute -inset-3 rounded-full bg-primary/30 blur-xl transition-opacity',
            speaking ? 'opacity-100 animate-pulse' : 'opacity-0',
          )}
        />
        <span className="relative">
          <InterviewerAvatar interviewer={interviewer} size="lg" ring={speaking} />
        </span>
      </div>
      <div className="text-center">
        <p className="font-semibold">
          {interviewer?.name ?? t('session.interviewer')}
        </p>
        {interviewer && (
          <p className="text-xs text-muted-foreground">
            {t(`interviewers.personas.${interviewer.personaKey}`)}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {speaking && <SoundBars />}
        <span>{status}</span>
      </div>
    </div>
  );
}

function UserTile({
  user,
  recording,
  dictating,
  caption,
}: {
  user: User;
  recording: boolean;
  dictating: boolean;
  caption: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="relative flex flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border border-border bg-card p-6">
      <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/70 px-2 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur">
        {t('session.you')}
      </span>
      {recording && (
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/70 px-2 py-1 text-[11px] font-medium backdrop-blur">
          <Circle className="h-2.5 w-2.5 fill-rose-500 text-rose-500 animate-pulse" />
          <span className="text-rose-500 font-medium">REC</span>
        </span>
      )}
      <div className="relative">
        <span
          className={cn(
            'absolute -inset-3 rounded-full bg-emerald-500/30 blur-xl transition-opacity',
            dictating ? 'opacity-100 animate-pulse' : 'opacity-0',
          )}
        />
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt={user.name}
            className={cn(
              'relative h-24 w-24 rounded-full object-cover ring-4 transition-all',
              dictating ? 'ring-emerald-500' : 'ring-transparent',
            )}
          />
        ) : (
          <span
            className={cn(
              'relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-3xl font-semibold text-white ring-4 transition-all',
              dictating ? 'ring-emerald-500' : 'ring-transparent',
            )}
          >
            {initialsOf(user.name)}
          </span>
        )}
      </div>
      <p className="font-semibold">{t('session.you')}</p>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {dictating ? (
          <>
            <Mic className="h-3.5 w-3.5 text-emerald-500" />
            {t('session.listening')}
          </>
        ) : (
          <span>{t('session.yourTurn')}</span>
        )}
      </div>
      {caption.trim() && (
        <div className="absolute inset-x-3 bottom-3 line-clamp-3 rounded-lg bg-background/85 px-3 py-2 text-xs leading-snug text-foreground backdrop-blur">
          {caption}
        </div>
      )}
    </div>
  );
}

function ChatPanel({
  messages,
  interviewer,
  userName,
  transcript,
  setTranscript,
  onSubmit,
  thinking,
  chatEndRef,
}: {
  messages: ChatMessage[];
  interviewer: Interviewer | null;
  userName: string;
  transcript: string;
  setTranscript: (v: string) => void;
  onSubmit: () => void;
  thinking: boolean;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[24rem] flex-col rounded-2xl border border-border bg-card lg:min-h-0">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">{t('session.transcriptTitle')}</h2>
      </div>
      <div className="scrollbar-thin min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('session.transcriptEmpty')}
          </p>
        ) : (
          messages.map((m) =>
            m.role === 'interviewer' ? (
              <div key={m.id} className="flex items-start gap-2">
                <InterviewerAvatar interviewer={interviewer} size="md" />
                <div className="rounded-2xl rounded-tl-sm bg-muted px-3 py-2 text-sm leading-relaxed">
                  {m.text}
                </div>
              </div>
            ) : (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-3 py-2 text-sm leading-relaxed text-primary-foreground">
                  {m.text}
                </div>
              </div>
            ),
          )
        )}
        <div ref={chatEndRef} />
      </div>
      <div className="space-y-2 border-t border-border p-3">
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder={t('session.answerPlaceholder')}
          rows={2}
          aria-label={userName}
          className="w-full resize-none rounded-xl border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button
          onClick={onSubmit}
          disabled={!transcript.trim() || thinking}
          className="w-full"
        >
          {thinking ? (
            t('session.evaluating')
          ) : (
            <>
              <Send className="h-4 w-4" />
              {t('session.send')}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Strip the "data:<mime>;base64," prefix — the API expects raw base64.
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
