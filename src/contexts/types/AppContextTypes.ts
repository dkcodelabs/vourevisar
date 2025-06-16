
import { Subject, Topic, StudyProgress } from '@/types';

export type AppContextType = {
  subjects: Subject[];
  isLoading: boolean;
  refreshData: () => Promise<void>;
  updateTopic: (subjectId: string, topicId: string, data: Partial<Topic>) => Promise<void>;
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;
  studyProgress: StudyProgress;
  isDataLoaded: boolean;
  error: string | null;
  addSubject: (subjectData: Omit<Subject, 'id'>) => Promise<void>;
  updateSubject: (id: string, updates: Partial<Subject>) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;
  addTopic: (subjectId: string, topicData: Omit<Topic, 'id'>) => Promise<void>;
  deleteTopic: (subjectId: string, topicId: string) => Promise<void>;
  createSubject: (subjectData: Omit<Subject, 'id'>) => Promise<void>;
  fetchSubjects: () => Promise<void>;
  fetchUserSettings: () => Promise<void>;
  forceRefresh: () => Promise<void>;
  userSettings: { subjects_per_day: number } | null;
};
