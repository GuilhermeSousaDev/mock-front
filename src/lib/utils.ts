import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Map a feedback score onto the 0–1 fraction the UI renders with.
 *
 * Feedback `overallScore` / topic `score` are produced on a 0–10 scale by the
 * AI provider (see apps/api base-chat.provider). A raw `2` therefore means 20%,
 * not 200%. We divide by 10 and clamp into [0, 1] so out-of-range values from
 * the model can never render as e.g. "200% Excellent".
 */
export const SCORE_MAX = 10;

export function normalizeScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(1, Math.max(0, score / SCORE_MAX));
}

export function formatScore(score: number): string {
  return `${Math.round(normalizeScore(score) * 100)}%`;
}

export function scoreToLabel(score: number): string {
  const s = normalizeScore(score);
  if (s >= 0.85) return 'Excellent';
  if (s >= 0.70) return 'Good';
  if (s >= 0.55) return 'Fair';
  if (s >= 0.40) return 'Needs work';
  return 'Struggling';
}

/** Translation key under `score.*` for a score — use with i18n `t()`. */
export function scoreToKey(score: number): string {
  const s = normalizeScore(score);
  if (s >= 0.85) return 'excellent';
  if (s >= 0.7) return 'good';
  if (s >= 0.55) return 'fair';
  if (s >= 0.4) return 'needsWork';
  return 'struggling';
}

/**
 * Continuous score → colour mapping: the hue sweeps from red (0%) through
 * orange/amber/lime to green (100%), so every percentage gets its own distinct
 * tone instead of snapping to a handful of buckets. Returned as an `hsl()` string
 * for inline `style` (color / backgroundColor, or SVG stroke via `currentColor`).
 *
 * Saturation/lightness are fixed at a mid level that stays vivid as a fill and
 * legible as text on both the light and dark themes.
 */
export function scoreToHsl(score: number): string {
  const hue = Math.round(normalizeScore(score) * 120); // 0 = red, 120 = green
  return `hsl(${hue}, 70%, 45%)`;
}
