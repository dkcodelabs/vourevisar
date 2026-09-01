import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from } }));

import { fetchFirstContactDurations, fetchReviewHistory, fetchReviewTrends } from './reviewsPageDataService';

const chain = () => {
  const value = {
    select: vi.fn(), eq: vi.fn(), in: vi.fn(), not: vi.fn(), order: vi.fn(),
  };
  value.select.mockReturnValue(value); value.eq.mockReturnValue(value); value.in.mockReturnValue(value); value.not.mockReturnValue(value);
  return value;
};

describe('reviewsPageDataService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns no history queries when the active scope is empty', async () => {
    await expect(fetchReviewHistory('user-1', [])).resolves.toEqual([]);
    await expect(fetchReviewTrends('user-1', [])).resolves.toEqual([]);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('scopes history and trends to the user and active topics', async () => {
    const history = chain();
    history.order.mockResolvedValue({ data: [{ id: 'review-1' }], error: null });
    const trends = chain();
    trends.order.mockResolvedValue({ data: [{ topic_id: 'topic-1', trend_label: 'stable' }], error: null });
    mocks.from.mockReturnValueOnce(history).mockReturnValueOnce(trends);

    await expect(fetchReviewHistory('user-1', ['topic-1'])).resolves.toEqual([{ id: 'review-1' }]);
    await expect(fetchReviewTrends('user-1', ['topic-1'])).resolves.toEqual([{ topic_id: 'topic-1', trend_label: 'stable' }]);
    expect(history.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(history.in).toHaveBeenCalledWith('topic_id', ['topic-1']);
    expect(trends.not).toHaveBeenCalledWith('trend_label', 'is', null);
  });

  it('filters first-contact durations to positive finite values', async () => {
    const sessions = chain();
    sessions.eq.mockReturnValue(sessions);
    sessions.not.mockResolvedValue({ data: [{ session_duration_minutes: 12 }, { session_duration_minutes: 0 }, { session_duration_minutes: null }, { session_duration_minutes: 4.5 }], error: null });
    mocks.from.mockReturnValue(sessions);

    await expect(fetchFirstContactDurations('user-1', 'cycle-1')).resolves.toEqual([12, 4.5]);
    expect(sessions.eq).toHaveBeenCalledWith('contact_type', 'first_contact');
  });
});
