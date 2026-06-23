// Interviewer "characters" are built from the browser's own speech-synthesis
// voices: each available voice for the active language becomes a selectable
// interviewer with a stable name, persona and avatar. The mapping is
// deterministic (hash of the voice id) so the same voice always yields the same
// character on the setup screen and inside the live session.

export interface InterviewerPersona {
  /** Display name shown on the avatar/card. */
  name: string;
  /** i18n key suffix under `interviewers.personas.*` for the one-line persona. */
  personaKey: string;
  /** Tailwind gradient classes for the avatar. */
  gradient: string;
}

// Some browsers (notably Edge) expose dozens of voices per language. Cap the
// roster so the picker stays tidy and every interviewer is a distinct persona.
const MAX_INTERVIEWERS = 6;

const PERSONAS: InterviewerPersona[] = [
  { name: 'Alex', personaKey: 'alex', gradient: 'from-sky-500 to-indigo-500' },
  { name: 'Sam', personaKey: 'sam', gradient: 'from-emerald-500 to-teal-500' },
  { name: 'Maya', personaKey: 'maya', gradient: 'from-fuchsia-500 to-pink-500' },
  { name: 'Victor', personaKey: 'victor', gradient: 'from-amber-500 to-orange-500' },
  { name: 'Nina', personaKey: 'nina', gradient: 'from-violet-500 to-purple-500' },
  { name: 'Leo', personaKey: 'leo', gradient: 'from-rose-500 to-red-500' },
  { name: 'Priya', personaKey: 'priya', gradient: 'from-cyan-500 to-blue-500' },
  { name: 'Omar', personaKey: 'omar', gradient: 'from-lime-500 to-green-500' },
];

export interface Interviewer extends InterviewerPersona {
  /** Stable id — the underlying voice's URI. */
  voiceURI: string;
  voiceName: string;
  lang: string;
  initials: string;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Tokens that show up in voice names but aren't a person's name.
const NON_NAMES = new Set([
  'online', 'natural', 'desktop', 'mobile', 'enhanced', 'premium', 'compact',
  'neural', 'server', 'speech', 'text', 'to', 'voice', 'english', 'portuguese',
  'português', 'us', 'uk', 'gb', 'united', 'states', 'kingdom', 'brazil',
  'brasil', 'language',
]);

/**
 * Pull a human first name out of a browser voice label so the interviewer shown
 * matches the voice's real gender and accent. Handles the common engines:
 *   "Microsoft Aria Online (Natural) - English (United States)" → "Aria"
 *   "Microsoft Francisca - Portuguese (Brazil)"                  → "Francisca"
 *   "... (pt-BR, AntonioNeural)"                                 → "Antonio"
 *   "Samantha" / "Daniel (English (UK))"                         → "Samantha"/"Daniel"
 * Returns null when there's no recognizable name (e.g. "Google US English").
 */
export function extractVoiceName(raw: string): string | null {
  // Azure-style label: "... (pt-BR, FranciscaNeural)".
  const azure = raw.match(/\([a-z]{2}-[A-Z]{2},\s*([A-Za-zÀ-ÿ]+?)(?:Neural)?\)/);
  if (azure) return cap(azure[1]);

  // Friendly label: drop everything from the first " - " or " (" and the vendor
  // prefix, then take the first word that actually looks like a name.
  const cleaned = raw
    .replace(/\s*[-(].*$/, '')
    .replace(/^(Microsoft|Google|Apple)\s+/i, '')
    .trim();
  for (const word of cleaned.split(/\s+/)) {
    if (word && !NON_NAMES.has(word.toLowerCase())) return cap(word);
  }
  return null;
}

/**
 * Voices whose language matches the target ("pt-BR" → pt*, otherwise en*).
 *
 * Prefers locally-installed voices: in Chromium/Edge the online "Natural" voices
 * routinely fail to produce any audio through the Web Speech API, so offering
 * them as interviewers leaves the candidate with a silent — and unusable —
 * choice. We only fall back to remote voices when no local one matches.
 */
export function voicesForLang(
  voices: SpeechSynthesisVoice[],
  lang: string,
): SpeechSynthesisVoice[] {
  const prefix = lang.slice(0, 2).toLowerCase();
  const norm = (l: string) => l.replace('_', '-').toLowerCase();
  const matched = voices.filter((v) => norm(v.lang).startsWith(prefix));
  const pool = matched.length ? matched : voices;
  const local = pool.filter((v) => v.localService);
  return local.length ? local : pool;
}

/**
 * Turn the browser's available TTS voices for `lang` into selectable interviewer
 * characters — one persona per voice, assigned deterministically so the same
 * voice always maps to the same name/avatar across the app.
 */
export function buildInterviewers(
  voices: SpeechSynthesisVoice[],
  lang: string,
): Interviewer[] {
  const matching = voicesForLang(voices, lang);
  const result: Interviewer[] = [];
  const usedNames = new Set<string>();
  const usedPersona = new Set<number>();

  for (const v of matching) {
    if (result.length >= Math.min(MAX_INTERVIEWERS, PERSONAS.length)) break;

    // Persona (personality + avatar colour) is assigned deterministically and
    // kept unique; the display name comes from the voice itself so it matches
    // the voice's gender and accent, falling back to the persona name.
    let idx = hash(v.voiceURI || v.name) % PERSONAS.length;
    while (usedPersona.has(idx)) idx = (idx + 1) % PERSONAS.length;
    const persona = PERSONAS[idx];
    const name = extractVoiceName(v.name) ?? persona.name;

    const key = name.toLowerCase();
    if (usedNames.has(key)) continue; // skip near-duplicate voices ("Aria" x2)
    usedNames.add(key);
    usedPersona.add(idx);

    result.push({
      ...persona,
      name,
      voiceURI: v.voiceURI,
      voiceName: v.name,
      lang: v.lang,
      initials: name.charAt(0).toUpperCase(),
    });
  }
  return result;
}

const STORAGE_KEY = 'mock:interviewer';

/** Persist the chosen interviewer's voice for a specific interview. */
export function saveInterviewerChoice(interviewId: string, voiceURI: string) {
  try {
    localStorage.setItem(`${STORAGE_KEY}:${interviewId}`, voiceURI);
  } catch {
    /* storage unavailable — fall back to the default voice at speak time */
  }
}

export function loadInterviewerChoice(interviewId: string): string | null {
  try {
    return localStorage.getItem(`${STORAGE_KEY}:${interviewId}`);
  } catch {
    return null;
  }
}
