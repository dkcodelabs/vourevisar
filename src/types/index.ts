
export type Status = 'Nova' | 'Em Estudo' | 'Concluída';
export type RevisionStatus = 'Atrasado' | 'Hoje' | 'Futura';
export type RevisionStage = '24h' | '7dias' | '30dias' | 'Concluído';

export interface Topic {
  id: string;
  name: string;
  completed: boolean;
  nextReview?: Date;
  reviewCount: number;
  reviewStage?: RevisionStage;
  reviewStatus?: RevisionStatus;
  lastReviewedAt?: Date;
}

export interface Subject {
  id: string;
  name: string;
  topics: Topic[];
  status: Status;
  priority?: number;
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
