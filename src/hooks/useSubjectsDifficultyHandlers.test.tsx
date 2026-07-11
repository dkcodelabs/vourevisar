import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { STUDY_SESSION_DISCARDED_MESSAGE } from '@/utils/studySessionFeedback';

import { useSubjectsDifficultyHandlers } from './useSubjectsDifficultyHandlers';

const { reportError, toastInfo } = vi.hoisted(() => ({
  reportError: vi.fn(),
  toastInfo: vi.fn(),
}));

vi.mock('@/lib/errors/errorService', () => ({
  errorService: {
    report: reportError,
  },
}));

vi.mock('@/lib/toast', () => ({
  toast: {
    info: toastInfo,
  },
}));

const setup = () => {
  const closeDifficultyModal = vi.fn();
  const markTopicAsReviewed = vi.fn().mockResolvedValue(undefined);
  const recordConfirmedTopicCycleEvent = vi.fn().mockResolvedValue(undefined);
  const refreshData = vi.fn();
  const resetTimer = vi.fn();
  const resumeTimer = vi.fn();
  const setProcessedUpdate = vi.fn();
  const stopTimer = vi.fn();

  const hook = renderHook(() => useSubjectsDifficultyHandlers({
    closeDifficultyModal,
    difficultyModalData: {
      topicId: 'topic-1',
    },
    markTopicAsReviewed,
    recordConfirmedTopicCycleEvent,
    refreshData,
    resetTimer,
    resumeTimer,
    setProcessedUpdate,
    stopTimer,
    userId: 'user-1',
  }));

  return {
    closeDifficultyModal,
    hook,
    markTopicAsReviewed,
    recordConfirmedTopicCycleEvent,
    refreshData,
    resetTimer,
    resumeTimer,
    setProcessedUpdate,
    stopTimer,
  };
};

describe('useSubjectsDifficultyHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it('submits first-contact difficulty, records the cycle event, stops the timer and schedules refresh', async () => {
    const {
      closeDifficultyModal,
      hook,
      markTopicAsReviewed,
      recordConfirmedTopicCycleEvent,
      refreshData,
      setProcessedUpdate,
      stopTimer,
    } = setup();

    await act(async () => {
      await hook.result.current.handleDifficultySubmit(4);
    });

    expect(setProcessedUpdate).toHaveBeenCalledWith('topic-1');
    expect(markTopicAsReviewed).toHaveBeenCalledWith('topic-1', 4);
    expect(recordConfirmedTopicCycleEvent).toHaveBeenCalledWith(4);
    expect(stopTimer).toHaveBeenCalledTimes(1);
    expect(closeDifficultyModal).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(refreshData).toHaveBeenCalledTimes(1);
  });

  it('confirms a review with duration and closes the modal before refresh', async () => {
    const {
      closeDifficultyModal,
      hook,
      markTopicAsReviewed,
      recordConfirmedTopicCycleEvent,
      refreshData,
      stopTimer,
    } = setup();

    await act(async () => {
      await hook.result.current.handleDifficultyConfirmReview(2, 18);
    });

    expect(markTopicAsReviewed).toHaveBeenCalledWith('topic-1', 2, 18);
    expect(recordConfirmedTopicCycleEvent).toHaveBeenCalledWith(2, 18);
    expect(stopTimer).toHaveBeenCalledTimes(1);
    expect(closeDifficultyModal).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(refreshData).toHaveBeenCalledTimes(1);
  });

  it('reports and rethrows errors from persistence', async () => {
    const failingError = new Error('Supabase offline');
    const markTopicAsReviewed = vi.fn().mockRejectedValue(failingError);

    const { result } = renderHook(() => useSubjectsDifficultyHandlers({
      closeDifficultyModal: vi.fn(),
      difficultyModalData: {
        topicId: 'topic-1',
      },
      markTopicAsReviewed,
      recordConfirmedTopicCycleEvent: vi.fn(),
      refreshData: vi.fn(),
      resetTimer: vi.fn(),
      resumeTimer: vi.fn(),
      setProcessedUpdate: vi.fn(),
      stopTimer: vi.fn(),
      userId: 'user-1',
    }));

    await expect(result.current.handleDifficultySubmit(null)).rejects.toThrow('Supabase offline');
    expect(reportError).toHaveBeenCalledWith(
      failingError,
      expect.objectContaining({
        action: 'DifficultyRatingModal.onSubmit',
        module: 'Subjects',
        userId: 'user-1',
      }),
    );
  });

  it('resumes a paused first-contact session from the modal', () => {
    const {
      closeDifficultyModal,
      hook,
      resumeTimer,
    } = setup();

    act(() => {
      hook.result.current.handleDifficultyResume();
    });

    expect(closeDifficultyModal).toHaveBeenCalledTimes(1);
    expect(resumeTimer).toHaveBeenCalledTimes(1);
  });

  it('discards a paused first-contact session and clears the timer', () => {
    const {
      closeDifficultyModal,
      hook,
      resetTimer,
      stopTimer,
    } = setup();

    act(() => {
      hook.result.current.handleDifficultyDiscard();
    });

    expect(stopTimer).toHaveBeenCalledTimes(1);
    expect(resetTimer).toHaveBeenCalledTimes(1);
    expect(closeDifficultyModal).toHaveBeenCalledTimes(1);
    expect(toastInfo).toHaveBeenCalledWith(STUDY_SESSION_DISCARDED_MESSAGE);
  });
});
