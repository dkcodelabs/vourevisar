export enum ReviewInterval {
  NOT_STARTED = 'NOT_STARTED',
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
  notes?: string;
  difficulty?: Difficulty;
  subTopics?: SubTopic[];
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
  originalId?: string; // ID original da matéria (para visualizações)
  viewNumber?: number; // Número da visualização (1, 2, 3, etc.)
}