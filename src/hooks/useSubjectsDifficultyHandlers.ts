import { useCallback } from 'react';

import { errorService } from '@/lib/errors/errorService';
import { toast } from '@/lib/toast';
import { STUDY_SESSION_DISCARDED_MESSAGE } from '@/utils/studySessionFeedback';

type DifficultyModalData = {
  topicId: string;
};

type UseSubjectsDifficultyHandlersInput = {
  closeDifficultyModal: () => void;
  difficultyModalData: DifficultyModalData;
  markTopicAsReviewed: (topicId: string, difficulty: number | null, duration?: number) => Promise<unknown>;
  recordConfirmedTopicCycleEvent: (difficulty: number | null, duration?: number) => Promise<void>;
  refreshData: () => void;
  resetTimer: () => void;
  resumeTimer: () => void;
  setProcessedUpdate: (topicId: string) => void;
  stopTimer: () => void;
  userId?: string | null;
};

export function useSubjectsDifficultyHandlers({
  closeDifficultyModal,
  difficultyModalData,
  markTopicAsReviewed,
  recordConfirmedTopicCycleEvent,
  refreshData,
  resetTimer,
  resumeTimer,
  setProcessedUpdate,
  stopTimer,
  userId,
}: UseSubjectsDifficultyHandlersInput) {
  const handleDifficultySubmit = useCallback(async (difficulty: number | null) => {
    try {
      setProcessedUpdate(difficultyModalData.topicId);
      await markTopicAsReviewed(difficultyModalData.topicId, difficulty);
      await recordConfirmedTopicCycleEvent(difficulty);
      stopTimer();
      closeDifficultyModal();
      setTimeout(() => refreshData(), 500);
    } catch (error) {
      await errorService.report(
        error,
        {
          module: 'Subjects',
          action: 'DifficultyRatingModal.onSubmit',
          userMessage: 'Erro ao iniciar estudo do tópico.',
          severity: 'medium',
          scope: 'core',
          userId,
        },
      );
      throw error;
    }
  }, [closeDifficultyModal, difficultyModalData.topicId, markTopicAsReviewed, recordConfirmedTopicCycleEvent, refreshData, setProcessedUpdate, stopTimer, userId]);

  const handleDifficultyConfirmReview = useCallback(async (difficulty: number | null, duration?: number) => {
    try {
      setProcessedUpdate(difficultyModalData.topicId);
      await markTopicAsReviewed(difficultyModalData.topicId, difficulty, duration);
      await recordConfirmedTopicCycleEvent(difficulty, duration);
      stopTimer();
      closeDifficultyModal();
      setTimeout(() => refreshData(), 500);
    } catch (error) {
      await errorService.report(
        error,
        {
          module: 'Subjects',
          action: 'DifficultyRatingModal.onConfirmReview',
          userMessage: 'Erro ao iniciar estudo do tópico.',
          severity: 'medium',
          scope: 'core',
          userId,
        },
      );
      throw error;
    }
  }, [closeDifficultyModal, difficultyModalData.topicId, markTopicAsReviewed, recordConfirmedTopicCycleEvent, refreshData, setProcessedUpdate, stopTimer, userId]);

  const handleDifficultyResume = useCallback(() => {
    closeDifficultyModal();
    resumeTimer();
  }, [closeDifficultyModal, resumeTimer]);

  const handleDifficultyDiscard = useCallback(() => {
    stopTimer();
    resetTimer();
    closeDifficultyModal();
    toast.info(STUDY_SESSION_DISCARDED_MESSAGE);
  }, [closeDifficultyModal, resetTimer, stopTimer]);

  return {
    handleDifficultyConfirmReview,
    handleDifficultyDiscard,
    handleDifficultyResume,
    handleDifficultySubmit,
  };
}
