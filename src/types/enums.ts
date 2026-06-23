// Web-owned enums — defined independently from the API.
// These mirror the API's Prisma enums but are not imported from there.

export enum DifficultyLevel {
  ENTRY = 'ENTRY',
  JUNIOR = 'JUNIOR',
  MID = 'MID',
  SENIOR = 'SENIOR',
  STAFF = 'STAFF',
  PRINCIPAL = 'PRINCIPAL',
}

export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  [DifficultyLevel.ENTRY]: 'Entry-level',
  [DifficultyLevel.JUNIOR]: 'Junior',
  [DifficultyLevel.MID]: 'Mid-level',
  [DifficultyLevel.SENIOR]: 'Senior',
  [DifficultyLevel.STAFF]: 'Staff',
  [DifficultyLevel.PRINCIPAL]: 'Principal',
};

export enum Plan {
  FREE = 'FREE',
  PRO = 'PRO',
  PREMIUM = 'PREMIUM',
}

export const PLAN_LABELS: Record<Plan, string> = {
  [Plan.FREE]: 'Free',
  [Plan.PRO]: 'Pro',
  [Plan.PREMIUM]: 'Premium',
};

export interface PlanDetails {
  /** Monthly interview allowance. `null` means unlimited. */
  interviewsPerMonth: number | null;
  /** Max tech stacks selectable per interview. `null` means unlimited. */
  maxTechStacks: number | null;
  canRecord: boolean;
  priceLabel: string;
  features: string[];
}

export const PLAN_DETAILS: Record<Plan, PlanDetails> = {
  [Plan.FREE]: {
    interviewsPerMonth: 3,
    maxTechStacks: 1,
    canRecord: false,
    priceLabel: 'Free',
    features: ['3 interviews / month', '1 tech stack per interview', 'Structured feedback report'],
  },
  [Plan.PRO]: {
    interviewsPerMonth: null,
    maxTechStacks: 3,
    canRecord: true,
    priceLabel: '$19/mo',
    features: [
      'Unlimited interviews',
      'Up to 3 tech stacks per interview',
      'Session recording & download',
      'Structured feedback report',
    ],
  },
  [Plan.PREMIUM]: {
    interviewsPerMonth: null,
    maxTechStacks: null,
    canRecord: true,
    priceLabel: '$49/mo',
    features: [
      'Everything in Pro',
      'Unlimited tech stacks per interview',
      'Session recording & download',
      'Priority interviewer models',
    ],
  },
};

export enum InterviewStatus {
  PENDING = 'PENDING',
  WARMUP = 'WARMUP',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ABANDONED = 'ABANDONED',
}

export const INTERVIEW_STATUS_LABELS: Record<InterviewStatus, string> = {
  [InterviewStatus.PENDING]: 'Not started',
  [InterviewStatus.WARMUP]: 'Warm-up',
  [InterviewStatus.IN_PROGRESS]: 'In progress',
  [InterviewStatus.COMPLETED]: 'Completed',
  [InterviewStatus.ABANDONED]: 'Abandoned',
};

export enum QuestionType {
  WARMUP = 'WARMUP',
  TECHNICAL = 'TECHNICAL',
  FOLLOWUP = 'FOLLOWUP',
}

export enum InterviewPhase {
  IDLE = 'IDLE',
  AI_SPEAKING = 'AI_SPEAKING',
  LISTENING = 'LISTENING',
  THINKING = 'THINKING',
}
