import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mocks.from,
  },
}));

import { getAdminPendingFeedbackCount } from './adminFeedbackBadgeService';

describe('getAdminPendingFeedbackCount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.eq.mockResolvedValue({ count: 3, error: null });
    mocks.select.mockReturnValue({ eq: mocks.eq });
    mocks.from.mockReturnValue({ select: mocks.select });
  });

  it('counts only feedbacks with status nova', async () => {
    const count = await getAdminPendingFeedbackCount();

    expect(count).toBe(3);
    expect(mocks.from).toHaveBeenCalledWith('user_feedback_events');
    expect(mocks.select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
    expect(mocks.eq).toHaveBeenCalledWith('status', 'nova');
  });

  it('propagates database errors', async () => {
    mocks.eq.mockResolvedValueOnce({ count: null, error: new Error('boom') });

    await expect(getAdminPendingFeedbackCount()).rejects.toThrow('boom');
  });
});
