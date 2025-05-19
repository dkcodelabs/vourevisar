
export type Status = 'Nova' | 'Em Estudo' | 'Concluída';

export interface Topic {
  id: string;
  name: string;
  completed: boolean;
  nextReview?: Date;
  reviewCount: number;
}

export interface Subject {
  id: string;
  name: string;
  topics: Topic[];
  status: Status;
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
  settings: UserSettings;
}

export interface StudyProgress {
  totalSubjects: number;
  completedSubjects: number;
  totalTopics: number;
  completedTopics: number;
}
