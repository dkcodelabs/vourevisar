export enum ReviewInterval {
  NOT_STARTED = 'NOT_STARTED',
  FIRST_CONTACT = 'FIRST_CONTACT',
  REVISED_24H = 'REVISED_24H',
  REVISED_7D = 'REVISED_7D',
  REVISED_15D = 'REVISED_15D',
  REVISED_30D = 'REVISED_30D',
  COMPLETED = 'COMPLETED',
}

export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

export interface SubTopic {
  id: string;
  name: string;
}

export interface StudyCycleTopic {
  id: string;
  name: string;
  reviewStatus: ReviewInterval;
  nextReviewDate?: string;
  lastReviewedAt?: string;
  notes?: string;
  difficulty?: Difficulty;
  subTopics?: SubTopic[];
  createdAt?: string;
  position?: number;
  /** Total de vezes que o tópico foi revisado */
  reviewCount?: number;
  /** Quantidade de revisões com difficulty_numeric = 3 (Difícil, penalidade -40%) */
  hardReviewCount?: number;
}

export enum SubjectStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED_CYCLE = 'COMPLETED_CYCLE',
  FINISHED = 'FINISHED',
}

export interface StudyCycleSubject {
  id: string;
  name: string;
  topics: StudyCycleTopic[];
  status: SubjectStatus;
  originalId?: string; // ID original da matéria
  cyclePosition?: number; // Posição específica desta instância no ciclo
}