
import React, { createContext, useState, useEffect, useContext } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Subject, StudyProgress } from '@/types';
import { AppContextType } from './types/AppContextTypes';
import { useSubjectOperations } from './hooks/useSubjectOperations';
import { useTopicOperations } from './hooks/useTopicOperations';
import { useDataLoading } from './hooks/useDataLoading';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [userSettings, setUserSettings] = useState<{ subjects_per_day: number } | null>(null);
  const [studyProgress, setStudyProgress] = useState<StudyProgress>({
    totalSubjects: 0,
    completedSubjects: 0,
    totalTopics: 0,
    completedTopics: 0,
    delayedTopics: 0,
    todayTopics: 0,
    futureTopics: 0,
  });
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Custom hooks for different operations
  const {
    isLoading,
    loadSubjects,
    refreshData,
    forceRefresh,
    fetchSubjects,
    fetchUserSettings
  } = useDataLoading(user, setSubjects, setStudyProgress, setIsDataLoaded, setError, setUserSettings);

  const {
    addSubject,
    updateSubject,
    deleteSubject,
    createSubject
  } = useSubjectOperations(user, loadSubjects);

  const {
    addTopic,
    updateTopic,
    deleteTopic
  } = useTopicOperations(user, loadSubjects, refreshData);

  // Recarregar dados quando o usuário muda
  useEffect(() => {
    if (user) {
      // Limpar dados antigos primeiro
      setSubjects([]);
      setIsDataLoaded(false);
      setError(null);
      // Carregar novos dados
      loadSubjects();
    } else {
      setSubjects([]);
      setUserSettings(null);
      setIsDataLoaded(false);
      setError(null);
    }
  }, [user?.id, loadSubjects]);

  const value: AppContextType = {
    subjects,
    studyProgress,
    isDataLoaded,
    isLoading,
    error,
    addSubject,
    updateSubject,
    deleteSubject,
    addTopic,
    updateTopic,
    deleteTopic,
    refreshData,
    createSubject,
    fetchSubjects,
    fetchUserSettings,
    setSubjects,
    forceRefresh,
    userSettings,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp deve ser usado dentro de um AppProvider');
  }
  return context;
};
