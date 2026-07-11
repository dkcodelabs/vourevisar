import { useCallback } from 'react';

import { useTimer } from '@/contexts/TimerContext';
import { toast } from '@/lib/toast';

type UseTopicStudySessionFlowInput = {
  openReviewModal: (topicId: string, duration?: number) => Promise<void> | void;
};

export type TopicStudySessionActionResult =
  | 'started'
  | 'opened_review_modal'
  | 'resumed'
  | 'blocked_other_topic';

const getElapsedStudyMinutes = (startTime: number, accumulatedTime: number) => {
  const currentSession = Date.now() - startTime;
  const totalDurationMs = accumulatedTime + currentSession;

  return totalDurationMs < 60000 ? 1 : Math.ceil(totalDurationMs / 60000);
};

export function useTopicStudySessionFlow({
  openReviewModal,
}: UseTopicStudySessionFlowInput) {
  const { activeTimer, startTimer, pauseTimer, resumeTimer } = useTimer();

  const handleTopicStudyAction = useCallback(async (topicId: string): Promise<TopicStudySessionActionResult> => {
    if (activeTimer && activeTimer.topicId === topicId) {
      if (activeTimer.status === 'RUNNING') {
        pauseTimer();
        try {
          await openReviewModal(
            topicId,
            getElapsedStudyMinutes(activeTimer.startTime, activeTimer.accumulatedTime),
          );
        } catch (error) {
          resumeTimer();
          throw error;
        }
        return 'opened_review_modal';
      }

      resumeTimer();
      toast.info('Cronômetro retomado!');
      return 'resumed';
    }

    if (activeTimer && activeTimer.topicId !== topicId) {
      toast.warning('Existe uma sessão de estudo em andamento. Finalize-a antes de iniciar outra.');
      return 'blocked_other_topic';
    }

    startTimer(topicId);
    toast.success('Cronômetro iniciado! Bons estudos.');
    return 'started';
  }, [activeTimer, openReviewModal, pauseTimer, resumeTimer, startTimer]);

  return {
    activeTimer,
    handleTopicStudyAction,
  };
}
