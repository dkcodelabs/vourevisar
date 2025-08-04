
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Subject } from '@/types';
import { useCycleInitialization } from './useCycleInitialization';
import { useCycleUpdates } from './useCycleUpdates';
import { useNewCycleManagement } from './useNewCycleManagement';
import { useCycleStateManagement } from './useCycleStateManagement';

export const useCycleManagement = (subjects: Subject[], userSettings: { subjects_per_day: number } | null) => {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);

  // Use the composed hooks
  const { userCycle, setUserCycle, isCycleCompleted, setIsCycleCompleted } = useCycleStateManagement();
  
  const { isCycleLoading } = useCycleInitialization(subjects, userSettings, setUserCycle);
  
  // Remover markAsSessionUpdate das dependências - não é mais usado
  useCycleUpdates(subjects, userSettings, userCycle, setUserCycle);
  
  const {
    isStartingNewCycle,
    showNewCycleMessage,
    setShowNewCycleMessage,
    showNewCycleStarted,
    autoStartNewCycle,
    handleStartNewCycle,
    handleHideNewCycleMessage
  } = useNewCycleManagement(subjects, userSettings, setUserCycle, setIsCycleCompleted);

  // Auto-start new cycle logic
  useEffect(() => {
    if (isInitialized && userCycle && userSettings && !isStartingNewCycle) {
      autoStartNewCycle(userCycle);
    }
  }, [isInitialized, userCycle, userSettings, isStartingNewCycle, autoStartNewCycle]);

  // Mark as initialized when cycle loads
  useEffect(() => {
    if (!isCycleLoading) {
      setIsInitialized(true);
    }
  }, [isCycleLoading]);

  return {
    userCycle,
    setUserCycle,
    isCycleCompleted,
    isStartingNewCycle,
    isCycleLoading,
    showNewCycleMessage,
    setShowNewCycleMessage,
    showNewCycleStarted,
    handleStartNewCycle: () => {
      console.log('🔄 handleStartNewCycle chamado, userCycle:', userCycle);
      return handleStartNewCycle(userCycle);
    },
    handleHideNewCycleMessage,
    autoStartNewCycle: () => autoStartNewCycle(userCycle)
  };
};
