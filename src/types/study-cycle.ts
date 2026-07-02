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
  /** Total de contatos registrados: 1º contato + revisões posteriores */
  reviewCount?: number;
  /** Quantidade de revisões com difficulty_numeric = 3 (Difícil, penalidade -40%) */
  hardReviewCount?: number;
  /** Volume/importância calculado pelo módulo de incidência quando disponível */
  totalVolume?: number | null;
  /** Faixa persistida de cobrança na prova quando o tópico já foi analisado */
  incidenceLevel?: 'low' | 'medium' | 'high' | null;
  /** Contexto da última análise de incidência quando disponível */
  lastSearchContext?: string | null;
  strategicIncidence?: {
    level: 'high' | 'analyzed' | 'not_analyzed';
    label: string;
    hasIncidence: boolean;
    showToStudent?: boolean;
  };
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
  exam_weight_points?: number | null;
  exam_weight_questions?: number | null;
  exam_weight_percentage?: number | null;
  exam_weight_raw?: string | null;
  strategicWeight?: {
    level: 'known' | 'none';
    label: string;
    hasWeight: boolean;
  };
  explorationPercentage?: number;
}
