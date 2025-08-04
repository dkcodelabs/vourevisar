import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Subject, StudyProgress } from '@/types';

interface DebugAppContextType {
  subjects: Subject[];
  studyProgress: StudyProgress;
  userCycle: any;
  userSettings: { subjects_per_day: number };
  isDataLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  forceRefresh: () => Promise<void>;
  fetchSubjects: () => void;
  fetchUserSettings: () => void;
}

const DebugAppContext = createContext<DebugAppContextType | undefined>(undefined);

export const DebugAppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  console.log('🔧 DebugAppProvider: Iniciando...');
  
  const { user } = useAuth();
  console.log('🔧 DebugAppProvider: User:', user?.id);

  // Dados mock para debug
  const subjects: Subject[] = [];
  const studyProgress: StudyProgress = {
    totalSubjects: 0,
    completedSubjects: 0,
    totalTopics: 0,
    completedTopics: 0,
    delayedTopics: 0,
    todayTopics: 0,
    futureTopics: 0,
  };

  const value: DebugAppContextType = {
    subjects,
    studyProgress,
    userCycle: null,
    userSettings: { subjects_per_day: 3 },
    isDataLoaded: true,
    isLoading: false,
    error: null,
    refreshData: async () => {
      console.log('🔧 DebugAppProvider: refreshData chamado');
    },
    forceRefresh: async () => {
      console.log('🔧 DebugAppProvider: forceRefresh chamado');
    },
    fetchSubjects: () => {
      console.log('🔧 DebugAppProvider: fetchSubjects chamado');
    },
    fetchUserSettings: () => {
      console.log('🔧 DebugAppProvider: fetchUserSettings chamado');
    },
  };

  console.log('🔧 DebugAppProvider: Renderizando com value:', value);

  return (
    <DebugAppContext.Provider value={value}>
      {children}
    </DebugAppContext.Provider>
  );
};

export const useDebugApp = () => {
  const context = useContext(DebugAppContext);
  if (context === undefined) {
    throw new Error('useDebugApp deve ser usado dentro de um DebugAppProvider');
  }
  return context;
};