import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mocks.from },
}));

import { fetchEditaisPageData } from './editaisPageService';

describe('fetchEditaisPageData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads edital and session data scoped to the authenticated user', async () => {
    const editalRows = [{ id: 'edital-1', user_id: 'user-1' }];
    const sessionRows = [{ edital_id: 'edital-1', subject_id: 'subject-1', session_duration_minutes: 20 }];
    const editalQuery = { select: mocks.select, eq: mocks.eq, order: mocks.order };
    const sessionQuery = { select: vi.fn(), eq: vi.fn() };
    mocks.from.mockImplementation((table: string) => table === 'user_editais' ? editalQuery : sessionQuery);
    mocks.select.mockReturnValue(editalQuery);
    mocks.eq.mockReturnValue(editalQuery);
    mocks.order.mockResolvedValue({ data: editalRows, error: null });
    sessionQuery.select.mockReturnValue(sessionQuery);
    sessionQuery.eq.mockResolvedValue({ data: sessionRows, error: null });

    await expect(fetchEditaisPageData('user-1')).resolves.toEqual({ editais: editalRows, sessions: sessionRows });
    expect(mocks.from).toHaveBeenCalledWith('user_editais');
    expect(mocks.from).toHaveBeenCalledWith('study_sessions');
    expect(mocks.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(sessionQuery.eq).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('propagates an edital query error instead of presenting an empty list', async () => {
    const editalQuery = { select: vi.fn(), eq: vi.fn(), order: vi.fn() };
    const sessionQuery = { select: vi.fn(), eq: vi.fn() };
    mocks.from.mockImplementation((table: string) => table === 'user_editais' ? editalQuery : sessionQuery);
    editalQuery.select.mockReturnValue(editalQuery);
    editalQuery.eq.mockReturnValue(editalQuery);
    editalQuery.order.mockRejectedValue(new Error('edital indisponível'));
    sessionQuery.select.mockReturnValue(sessionQuery);
    sessionQuery.eq.mockResolvedValue({ data: [], error: null });

    await expect(fetchEditaisPageData('user-1')).rejects.toThrow('edital indisponível');
  });
});
