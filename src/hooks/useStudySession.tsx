
import { useState } from 'react';
import { useSessionCompletion } from './useSessionCompletion';
import { useNextDay } from './useNextDay';

export const useStudySession = () => {
  const [expandedSubject, setExpandedSubject] = useState<string>('');
  
  const { handleCompleteSession } = useSessionCompletion();
  const { handleNextDay, isNextDayLoading } = useNextDay();

  const handleToggleExpand = (subjectId: string) => {
    setExpandedSubject(prev => prev === subjectId ? '' : subjectId);
  };

  return {
    expandedSubject,
    setExpandedSubject,
    isNextDayLoading,
    handleNextDay,
    handleCompleteSession,
    handleToggleExpand
  };
};
