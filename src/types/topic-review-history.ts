/**
 * Tipos para o histórico de revisões de tópicos
 */

export interface TopicReviewHistoryEntry {
  id: string;
  topic_id: string;
  review_stage: string;
  reviewed_at: string;
  created_at: string;
  study_duration_minutes?: number | null;
}

export interface TopicReviewHistory {
  firstContact: Date | null;
  reviews: ReviewEntry[];
  nextReviews: ReviewEntry[];
  totalReviews: number;
  completedReviews: number;
  totalStudyTime: number; // New field for accumulated time
}

export interface ReviewEntry {
  stage: string;
  stageLabel: string;
  reviewedAt: Date | null;
  isPending: boolean;
  isCompleted: boolean;
  isOverdue: boolean;
  isToday: boolean;
  isFuture: boolean;
  daysOverdue: number;
  daysUntil: number;
  expectedDate: Date | null;
  order: number;
  studyDuration?: number; // New field for frontend
}


export const REVIEW_STAGES = {
  FIRST_CONTACT: 'first_contact',
  REVIEW_24H: '24h',
  REVIEW_7D: '7d',
  REVIEW_15D: '15d',
  REVIEW_30D: '30d',
  REVIEW_60D: '60d',
  COMPLETED: 'Concluído'
} as const;

export const REVIEW_STAGE_LABELS: Record<string, string> = {
  'first_contact': 'Primeiro Contato',
  '24h': 'Revisão 24h',
  '7d': 'Revisão 7 dias',
  '15d': 'Revisão 15 dias',
  '30d': 'Revisão 30 dias',
  '60d': 'Revisão 60 dias',
  'Concluído': 'Concluído'
};

export const REVIEW_STAGE_ORDER: Record<string, number> = {
  'first_contact': 0,
  '24h': 1,
  '7d': 2,
  '15d': 3,
  '30d': 4,
  '60d': 5,
  'Concluído': 6
};
