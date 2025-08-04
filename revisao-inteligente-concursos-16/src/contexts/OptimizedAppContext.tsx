import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Subject, StudyProgress } from '@/types';
import { useEssentialData } from '@/hooks/useOptimizedQueries';
import { useMemoizedProgress } from '@/hooks/useMemoizedCalculations';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/useOptimizedQueries';

interface OptimizedAppContextType {
  subjects: Subject[];
  studyProgress: StudyProgress;
  userCycle: any;
  userSettings: { subjects_per_day: number };
  isDataLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  invalidateSubjects: () => void;
  invalidateUserCycle: () => void;
  // Compatibilidade com código existente
  forceRefresh: () => Promise<void>;
  fetchSubjects: () => void;
  fetchUserSettings: () => void;
}

const OptimizedAppContext = createContext<OptimizedAppContextType | undefined>(undefined);

export const OptimizedAppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const { subjects, userCycle, userSettings, isLoading, isError, errors } = useEssentialData();
  
  // Memoizar cálculo de progresso
  const studyProgress = useMemoizedProgress(subjects);
  
  // Funções de invalidação otimizadas
  const invalidateSubjects = () => {
    if (user) {
      queryClient.invalidateQueries({ queryKey: queryKeys.subjects(user.id) });
    }
  };
  
  const invalidateUserCycle = () => {
    if (user) {
      queryClient.invalidateQueries({ queryKey: queryKeys.userCycle(user.id) });
    }
  };
  
  const refreshData = async () => {
    if (user) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.subjects(user.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.userCycle(user.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.userSettings(user.id) }),
      ]);
    }
  };

  const value: OptimizedAppContextType = {
    subjects,
    studyProgress,
    userCycle,
    userSettings,
    isDataLoaded: !isLoading && !!user,
    isLoading,
    error: isError ? 'Erro ao carregar dados' : null,
    refreshData,
    invalidateSubjects,
    invalidateUserCycle,
    // Aliases para compatibilidade
    forceRefresh: refreshData,
    fetchSubjects: invalidateSubjects,
    fetchUserSettings: () => {},
  };

  return (
    <OptimizedAppContext.Provider value={value}>
      {children}
    </OptimizedAppContext.Provider>
  );
};

export const useOptimizedApp = () => {
  const context = useContext(OptimizedAppContext);
  if (context === undefined) {
    throw new Error('useOptimizedApp deve ser usado dentro de um OptimizedAppProvider');
  }
  return context;
};