import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  activeTimer: null as
    | {
        topicId: string;
        startTime: number;
        status: 'RUNNING' | 'PAUSED';
        accumulatedTime: number;
      }
    | null,
  startTimer: vi.fn(),
  pauseTimer: vi.fn(),
  resumeTimer: vi.fn(),
  openReviewModal: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
}));

vi.mock('@/contexts/TimerContext', () => ({
  useTimer: () => ({
    activeTimer: mocks.activeTimer,
    startTimer: mocks.startTimer,
    pauseTimer: mocks.pauseTimer,
    resumeTimer: mocks.resumeTimer,
  }),
}));

vi.mock('@/lib/toast', () => ({
  toast: {
    success: mocks.success,
    warning: mocks.warning,
    info: mocks.info,
  },
}));

import { useTopicStudySessionFlow } from './useTopicStudySessionFlow';

describe('useTopicStudySessionFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.activeTimer = null;
    vi.useRealTimers();
  });

  it('starts a study session when no timer is active', async () => {
    const { result } = renderHook(() =>
      useTopicStudySessionFlow({
        openReviewModal: mocks.openReviewModal,
      }),
    );

    await act(async () => {
      const outcome = await result.current.handleTopicStudyAction('topic-1');
      expect(outcome).toBe('started');
    });

    expect(mocks.startTimer).toHaveBeenCalledWith('topic-1');
    expect(mocks.openReviewModal).not.toHaveBeenCalled();
    expect(mocks.success).toHaveBeenCalledWith('Cronômetro iniciado! Bons estudos.');
  });

  it('pauses the active topic session and opens the evaluation modal with elapsed minutes', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-08T18:00:00.000Z'));
    mocks.activeTimer = {
      topicId: 'topic-1',
      startTime: Date.now() - 120000,
      status: 'RUNNING',
      accumulatedTime: 60000,
    };

    const { result } = renderHook(() =>
      useTopicStudySessionFlow({
        openReviewModal: mocks.openReviewModal,
      }),
    );

    await act(async () => {
      const outcome = await result.current.handleTopicStudyAction('topic-1');
      expect(outcome).toBe('opened_review_modal');
    });

    expect(mocks.pauseTimer).toHaveBeenCalledOnce();
    expect(mocks.openReviewModal).toHaveBeenCalledWith('topic-1', 3);
  });

  it('resumes the timer again if opening the evaluation modal fails', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-08T18:00:00.000Z'));
    mocks.activeTimer = {
      topicId: 'topic-1',
      startTime: Date.now() - 120000,
      status: 'RUNNING',
      accumulatedTime: 0,
    };
    mocks.openReviewModal.mockRejectedValueOnce(new Error('modal failed'));

    const { result } = renderHook(() =>
      useTopicStudySessionFlow({
        openReviewModal: mocks.openReviewModal,
      }),
    );

    await expect(result.current.handleTopicStudyAction('topic-1')).rejects.toThrow('modal failed');

    expect(mocks.pauseTimer).toHaveBeenCalledOnce();
    expect(mocks.resumeTimer).toHaveBeenCalledOnce();
  });

  it('resumes a paused session for the same topic', async () => {
    mocks.activeTimer = {
      topicId: 'topic-1',
      startTime: 0,
      status: 'PAUSED',
      accumulatedTime: 60000,
    };

    const { result } = renderHook(() =>
      useTopicStudySessionFlow({
        openReviewModal: mocks.openReviewModal,
      }),
    );

    await act(async () => {
      const outcome = await result.current.handleTopicStudyAction('topic-1');
      expect(outcome).toBe('resumed');
    });

    expect(mocks.resumeTimer).toHaveBeenCalledOnce();
    expect(mocks.info).toHaveBeenCalledWith('Cronômetro retomado!');
    expect(mocks.openReviewModal).not.toHaveBeenCalled();
  });

  it('blocks a different topic when another session is already active', async () => {
    mocks.activeTimer = {
      topicId: 'topic-2',
      startTime: Date.now(),
      status: 'RUNNING',
      accumulatedTime: 0,
    };

    const { result } = renderHook(() =>
      useTopicStudySessionFlow({
        openReviewModal: mocks.openReviewModal,
      }),
    );

    await act(async () => {
      const outcome = await result.current.handleTopicStudyAction('topic-1');
      expect(outcome).toBe('blocked_other_topic');
    });

    expect(mocks.startTimer).not.toHaveBeenCalled();
    expect(mocks.warning).toHaveBeenCalledWith(
      'Existe uma sessão de estudo em andamento. Finalize-a antes de iniciar outra.',
    );
  });
});
