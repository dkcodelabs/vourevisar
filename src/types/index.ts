export type Status = 'Nova' | 'Em Estudo' | 'Concluída';
export type RevisionStatus = 'Atrasado' | 'Hoje' | 'Futura';
export type RevisionStage = '24h' | '7 dias' | '30 dias' | 'Concluído' | string;
export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;

export interface TopicSubtopic {
  id: string;
  name: string;
  addedAt: string;
}

export interface TopicNotes {
  content?: string; // Conteúdo rico (HTML do Quill)
  createdAt?: string;
  updatedAt?: string;
}

export interface Topic {
  id: string;
  name: string;
  completed: boolean;
  nextReview?: Date;
  reviewCount: number;
  reviewStage?: RevisionStage;
  reviewStatus?: RevisionStatus;
  lastReviewedAt?: Date;
  firstStudiedAt?: Date;

  // Snake case fields from Supabase
  user_id?: string;
  subject_id?: string;
  review_count: number;
  next_review?: string | null;
  first_studied_at?: string | null;
  last_reviewed_at?: string | null;
  review_stage?: string | null;
  is_completed?: boolean;
  notes?: TopicNotes;
  difficulty_level?: DifficultyLevel | null;
  subtopics?: TopicSubtopic[];
  difficulty_set_at?: string | null;
  last_search_context?: string | null;
  last_used_query?: string | null;
  last_audit_log?: any | null;
  created_at?: string;
  position?: number;
  edital_id?: string;
  origin_id?: string;
}

export interface Subject {
  id: string;
  name: string;
  topics: Topic[];
  status: Status;
  priority?: number;
  color?: string;
  notes?: TopicNotes;
  edital_id?: string;
  origin_id?: string;
}

// DailyStudyPlan removida - não mais necessária

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
  name?: string | null;
  status: 'active' | 'completed' | 'archived';
  ciclo_atual: string[];
  disciplinas_do_dia: string[];
  materias_pendentes: string[];
  materias_estudadas_ciclo?: string[]; // Matérias estudadas no ciclo atual
  ciclos_realizados: number;
  indice_atual?: number;
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

export interface UserEdital {
  id: string;
  user_id: string;
  name: string;
  exam_date?: string;
  is_imported: boolean;
  source_id?: string;
  subject_ids: string[];
  active_subject_ids: string[];
  merged_with?: string[];
  merged_into_cycle: boolean;
  created_at: string;
  updated_at: string;
}
