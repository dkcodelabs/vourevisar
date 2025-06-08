
export type Status = 'Nova' | 'Em Estudo' | 'Concluída';
export type RevisionStatus = 'Atrasado' | 'Hoje' | 'Futura';
export type RevisionStage = '24h' | '7 dias' | '30 dias' | 'Concluído' | string;

export interface Topic {
  id: string;
  name: string;
  completed: boolean;
  nextReview?: Date;
  reviewCount: number;
  reviewStage?: RevisionStage;
  reviewStatus?: RevisionStatus;
  lastReviewedAt?: Date;
  review_count: number; // Adicionar para compatibilidade com o banco
}

export interface Subject {
  id: string;
  name: string;
  topics: Topic[];
  status: Status;
  priority?: number;
  color?: string;
}

export interface DailyStudyPlan {
  date: Date;
  subjects: Subject[];
}

export interface UserSettings {
  subjectsPerDay: number;
  notificationsEnabled: boolean;
  notificationTime: string;
}

export interface UserProfile {
  name: string;
  email: string;
  phone?: string;
  settings: UserSettings;
  avatar_url?: string;
}

export interface StudyProgress {
  totalSubjects: number;
  completedSubjects: number;
  totalTopics: number;
  completedTopics: number;
  delayedTopics: number;
  todayTopics: number;
  futureTopics: number;
}

export interface UserCycle {
  id: string;
  user_id: string;
  ciclo_atual: string[];
  disciplinas_do_dia: string[];
  ciclos_realizados: number;
  data_inicio_ciclo: string;
  data_fim_ciclo: string | null;
  atualizado_em: string;
  created_at: string;
}

export interface AppContextType {
  subjects: Subject[];
  studyProgress: StudyProgress;
  isDataLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  addSubject: (subject: Omit<Subject, 'id'>) => Promise<void>;
  updateSubject: (id: string, updates: Partial<Subject>) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;
  addTopic: (subjectId: string, topic: Omit<Topic, 'id'>) => Promise<void>;
  updateTopic: (subjectId: string, topicId: string, updates: Partial<Topic>) => Promise<void>;
  deleteTopic: (subjectId: string, topicId: string) => Promise<void>;
  refreshData: () => Promise<void>;
  createSubject: (subject: Omit<Subject, 'id'>) => Promise<void>;
  fetchSubjects: () => Promise<void>;
  fetchUserSettings: () => Promise<void>;
}
