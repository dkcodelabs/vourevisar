import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  insert: vi.fn(),
  rpc: vi.fn(),
  select: vi.fn(),
  single: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mocks.from,
    rpc: mocks.rpc,
  },
}));

import { useStudySessionTracking } from './useStudySessionTracking';

describe('useStudySessionTracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.from.mockReturnValue({ insert: mocks.insert });
    mocks.insert.mockReturnValue({ select: mocks.select });
    mocks.select.mockReturnValue({ single: mocks.single });
    mocks.single.mockResolvedValue({ data: { id: 'session-1' }, error: null });
    mocks.rpc.mockResolvedValue({ data: null, error: null });
  });

  it('persists the explicit contact type for a topic session', async () => {
    const { result } = renderHook(() => useStudySessionTracking());

    await act(async () => {
      await result.current.recordTopicCompletion(
        'subject-1',
        'Direito Constitucional',
        'topic-1',
        'Controle de constitucionalidade',
        {
          contactType: 'first_contact',
          cycleId: 'cycle-1',
          durationMinutes: 25,
          editalId: 'edital-1',
        },
      );
    });

    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
      contact_type: 'first_contact',
      session_duration_minutes: 25,
      topics_studied: ['topic-1'],
    }));
  });

  it('classifies a general subject session separately from topic contacts', async () => {
    const { result } = renderHook(() => useStudySessionTracking());

    await act(async () => {
      await result.current.recordSubjectSession(
        'subject-1',
        'Direito Constitucional',
        ['topic-1', 'topic-2'],
        40,
      );
    });

    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
      contact_type: 'subject_session',
      session_duration_minutes: 40,
    }));
  });
});
