export enum ReviewProfile {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED'
}

/**
 * Parâmetros para o Sistema de Repetição Espaçada (SRS - Ebbinghaus)
 */
export interface ReviewIntervals {
  /** Estabilidade de memória inicial logo após as primeiras revisões bem sucedidas (em dias) */
  initialStability: number;
  /** Fator de expansão base (multiplicador) do intervalo quando a retenção é média */
  baseGrowthFactor: number;
  /** Fator limitador de longo prazo para evitar superespaçamento (safety net) */
  maxIntervalCap: number;
  /** Sequência legada de intervalos fixos usada por telas antigas do app */
  intervals: number[];

  // Mantemos maxReviews por legibilidade lógica de 'ciclo', 
  // embora um SRS puro seja infinito. Podemos usar para definir "Tópico Finalizado"
  maxReviews: number;
}

export const REVIEW_PROFILES: Record<ReviewProfile, ReviewIntervals> = {
  [ReviewProfile.BEGINNER]: {
    initialStability: 2.0, // Retenção fraca no começo, pede revisão logo
    baseGrowthFactor: 1.6, // Cresce devagar (ex: 2d -> 3.2d -> 5.1d -> 8.1d)
    maxIntervalCap: 45,    // Nunca fica mais de 45 dias sem revisar
    intervals: [1, 3, 7, 15, 30, 45, 45, 45],
    maxReviews: 8
  },
  [ReviewProfile.INTERMEDIATE]: {
    initialStability: 3.0,
    baseGrowthFactor: 2.0, // Crescimento padrão SM-2 duplo (ex: 3d -> 6d -> 12d -> 24d)
    maxIntervalCap: 60,
    intervals: [1, 7, 15, 30, 45, 60],
    maxReviews: 6
  },
  [ReviewProfile.ADVANCED]: {
    initialStability: 4.0,
    baseGrowthFactor: 2.5, // Crescimento agressivo (ex: 4d -> 10d -> 25d -> 62d)
    maxIntervalCap: 90,
    intervals: [1, 15, 30, 60, 90],
    maxReviews: 5
  }
};

export interface UserSettings {
  id: string;
  user_id: string;
  review_profile: ReviewProfile;
  subjects_per_day: number;
  notifications_enabled: boolean;
  notification_time: string;
  created_at: string;
  updated_at: string;
} 