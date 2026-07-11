import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  activeTimer: null as {
    topicId: string;
    startTime: number;
    status: 'RUNNING' | 'PAUSED';
    accumulatedTime: number;
  } | null,
  pauseTimer: vi.fn(),
  resumeTimer: vi.fn(),
  stopTimer: vi.fn(),
  togglePiP: vi.fn(),
  supabaseSingle: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
  };
});

vi.mock('@/contexts/TimerContext', () => ({
  useTimer: () => ({
    activeTimer: mocks.activeTimer,
    pauseTimer: mocks.pauseTimer,
    resumeTimer: mocks.resumeTimer,
    stopTimer: mocks.stopTimer,
  }),
}));

vi.mock('@/hooks/usePiPTimer', () => ({
  usePiPTimer: () => ({
    canvasRef: { current: null },
    videoRef: { current: null },
    togglePiP: mocks.togglePiP,
    isSupported: false,
  }),
}));

vi.mock('./timer/FocusModal', () => ({
  FocusModal: () => null,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: mocks.supabaseSingle,
        }),
      }),
    }),
  },
}));

import { FocusTimer } from './FocusTimer';

describe('FocusTimer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.activeTimer = {
      topicId: 'topic-1',
      startTime: Date.now(),
      status: 'PAUSED',
      accumulatedTime: 120000,
    };
  });

  it('navigates paused first-contact sessions back to the cycle page', async () => {
    mocks.supabaseSingle.mockResolvedValue({
      data: {
        id: 'topic-1',
        name: 'Controle de Constitucionalidade',
        subject_id: 'subject-1',
        review_count: 0,
        first_studied_at: null,
        subjects: { name: 'Direito Constitucional' },
      },
    });

    render(
      <MemoryRouter>
        <FocusTimer />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mocks.supabaseSingle).toHaveBeenCalledOnce();
    });

    fireEvent.click(screen.getByRole('button'));

    expect(mocks.navigate).toHaveBeenCalledWith('/ciclo-estudos', {
      state: { focusSubjectId: 'subject-1', focusTopicId: 'topic-1' },
    });
  });

  it('keeps paused review sessions pointing to the reviews page', async () => {
    mocks.supabaseSingle.mockResolvedValue({
      data: {
        id: 'topic-1',
        name: 'Controle de Constitucionalidade',
        subject_id: 'subject-1',
        review_count: 2,
        first_studied_at: '2026-07-08T10:00:00.000Z',
        subjects: { name: 'Direito Constitucional' },
      },
    });

    render(
      <MemoryRouter>
        <FocusTimer />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mocks.supabaseSingle).toHaveBeenCalledOnce();
    });

    fireEvent.click(screen.getByRole('button'));

    expect(mocks.navigate).toHaveBeenCalledWith('/revisoes?topicId=topic-1', {
      state: { focusTopicId: 'topic-1' },
    });
  });
});
