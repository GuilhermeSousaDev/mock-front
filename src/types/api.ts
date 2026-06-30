// API response types owned by apps/web — not imported from apps/api.
// Keep these in sync with the API contract by hand or by OpenAPI codegen.

import type { DifficultyLevel, InterviewStatus, Plan, QuestionType } from './enums';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthToken {
  accessToken: string;
  tokenType: string;
}

// ─── User ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: 'USER' | 'ADMIN';
  subscription: Subscription | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Subscription ────────────────────────────────────────────────────────────

export interface Subscription {
  id: string;
  userId: string;
  plan: Plan;
  interviewsUsed: number;
  currentPeriodEnd: string | null;
}

/** Stripe config exposed to the browser for initialising Stripe.js. */
export interface StripeConfig {
  publishableKey: string;
}

/** Returned by POST /subscriptions/checkout to drive Stripe Elements. */
export interface CheckoutSession {
  clientSecret: string;
  paymentIntentId: string;
  plan: Plan;
  /** Amount in the currency's smallest unit (e.g. cents). */
  amount: number;
  currency: string;
  publishableKey: string;
}

// ─── Tech Stack ──────────────────────────────────────────────────────────────

export interface TechStack {
  id: string;
  name: string;
  slug: string;
  category: string;
  iconUrl: string | null;
}

// ─── Interview ───────────────────────────────────────────────────────────────

export interface Interview {
  id: string;
  userId: string;
  level: DifficultyLevel;
  status: InterviewStatus;
  questionCount: number;
  techStacks: Array<{ techStack: TechStack }>;
  questions?: Question[];
  feedback?: FeedbackReport | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
}

// ─── Question ─────────────────────────────────────────────────────────────────

export interface Question {
  id: string;
  interviewId: string;
  type: QuestionType;
  text: string;
  difficulty: number;
  order: number;
  answer?: Answer | null;
}

export interface Answer {
  id: string;
  questionId: string;
  transcript: string;
  score: number | null;
  createdAt: string;
}

// ─── Feedback ────────────────────────────────────────────────────────────────

export interface TopicScore {
  topic: string;
  score: number;
  notes: string;
}

export interface FeedbackReport {
  id: string;
  interviewId: string;
  overallScore: number;
  topicBreakdown: TopicScore[];
  strengths: string[];
  improvements: string[];
  nextSteps: string[];
  summary: string;
  createdAt: string;
}

// ─── Answer evaluation ─────────────────────────────────────────────────────────

export interface AnswerEvaluation {
  score: number;
  strengths: string[];
  gaps: string[];
  suggestedNextDifficulty: number;
}

export interface SubmitAnswerResult {
  evaluation: AnswerEvaluation;
  nextQuestion: Question | null;
  /** Brief spoken acknowledgment of the answer just submitted, read aloud before the next question. */
  feedback?: string;
  /** The interviewer's spoken sign-off, present only on the final answer (`done`). */
  closing?: string;
  done: boolean;
}
