import type {
  ApiResponse,
  AuthToken,
  User,
  Interview,
  TechStack,
  FeedbackReport,
  Subscription,
  StripeConfig,
  CheckoutSession,
  Recording,
  SubmitAnswerResult,
} from '@/types/api';
import type { DifficultyLevel, InterviewStatus, Plan } from '@/types/enums';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('mock_token');
}

export function clearToken(): void {
  if (typeof window !== 'undefined') localStorage.removeItem('mock_token');
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(res.status, err.message ?? res.statusText);
  }

  const body: ApiResponse<T> = await res.json();
  return body.data;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export const auth = {
  register: (name: string, email: string, password: string) =>
    request<AuthToken>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  login: (email: string, password: string) =>
    request<AuthToken>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<User>('/auth/me'),
};

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = {
  me: () => request<User>('/users/me'),
};

// ─── Subscriptions ─────────────────────────────────────────────────────────────

export const subscriptions = {
  get: () => request<Subscription | null>('/subscriptions/me'),

  /** Stripe publishable key for initialising Stripe.js. */
  stripeConfig: () => request<StripeConfig>('/subscriptions/stripe-config'),

  /** Starts a Stripe Elements checkout for a paid plan. */
  checkout: (plan: Plan) =>
    request<CheckoutSession>('/subscriptions/checkout', {
      method: 'POST',
      body: JSON.stringify({ plan }),
    }),

  /** Asks the API to verify the payment with Stripe and upgrade the plan. */
  confirm: (paymentIntentId: string) =>
    request<Subscription>('/subscriptions/confirm', {
      method: 'POST',
      body: JSON.stringify({ paymentIntentId }),
    }),

  /** Downgrade to FREE (paid plans go through `checkout`). */
  changePlan: (plan: Plan) =>
    request<Subscription>('/subscriptions/change', {
      method: 'POST',
      body: JSON.stringify({ plan }),
    }),
};

// ─── Tech Stacks ─────────────────────────────────────────────────────────────

export const techStacks = {
  list: () => request<TechStack[]>('/tech-stacks'),
};

// ─── Interviews ──────────────────────────────────────────────────────────────

export const interviews = {
  list: () => request<Interview[]>('/interviews'),

  get: (id: string) => request<Interview>(`/interviews/${id}`),

  create: (
    level: DifficultyLevel,
    techStackIds: string[],
    language?: 'EN' | 'PT_BR',
    questionCount?: number,
  ) =>
    request<Interview>('/interviews', {
      method: 'POST',
      body: JSON.stringify({ level, techStackIds, language, questionCount }),
    }),

  updateStatus: (id: string, status: InterviewStatus) =>
    request<Interview>(`/interviews/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  submitAnswer: (id: string, questionId: string, transcript: string) =>
    request<SubmitAnswerResult>(`/interviews/${id}/answers`, {
      method: 'POST',
      body: JSON.stringify({ questionId, transcript }),
    }),
};

// ─── Feedback ────────────────────────────────────────────────────────────────

export const feedback = {
  get: (interviewId: string) =>
    request<FeedbackReport>(`/interviews/${interviewId}/feedback`),
};

// ─── Recordings ────────────────────────────────────────────────────────────────

export const recordings = {
  get: (interviewId: string) =>
    request<Recording | null>(`/interviews/${interviewId}/recording`),

  upload: (interviewId: string, data: string, mimeType: string, duration: number) =>
    request<Recording>(`/interviews/${interviewId}/recording`, {
      method: 'POST',
      body: JSON.stringify({ data, mimeType, duration }),
    }),

  /** Fetches the recording as a Blob using the bearer token. */
  download: async (interviewId: string): Promise<Blob> => {
    const token = getToken();
    const res = await fetch(`${BASE_URL}/interviews/${interviewId}/recording/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new ApiError(res.status, 'Failed to download recording');
    return res.blob();
  },
};
