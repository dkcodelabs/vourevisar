import { describe, expect, it, vi, beforeEach } from 'vitest';

const supabaseMock = vi.hoisted(() => {
  const inMock = vi.fn();
  const selectMock = vi.fn(() => ({ in: inMock }));
  const fromMock = vi.fn(() => ({ select: selectMock }));

  return { inMock, selectMock, fromMock };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: supabaseMock.fromMock,
  },
}));

import { fetchTopicReviewStudyMinutes, fetchTopicReviewStats } from './topicReviewService';

describe('topicReviewService', () => {
  beforeEach(() => {
    supabaseMock.inMock.mockReset();
    supabaseMock.selectMock.mockClear();
    supabaseMock.fromMock.mockClear();
  });

  it('splits large topic lists into smaller Supabase queries', async () => {
    supabaseMock.inMock.mockResolvedValue({ data: [], error: null });
    const ids = Array.from({ length: 351 }, (_, index) => `topic-${index}`);

    await fetchTopicReviewStats(ids);

    expect(supabaseMock.fromMock).toHaveBeenCalledTimes(3);
    expect(supabaseMock.selectMock).toHaveBeenCalledTimes(3);
    expect(supabaseMock.inMock).toHaveBeenCalledTimes(3);
    expect(supabaseMock.inMock.mock.calls[0][1]).toHaveLength(150);
    expect(supabaseMock.inMock.mock.calls[1][1]).toHaveLength(150);
    expect(supabaseMock.inMock.mock.calls[2][1]).toHaveLength(51);
  });

  it('keeps processing later chunks when one chunk fails', async () => {
    supabaseMock.inMock
      .mockResolvedValueOnce({ data: null, error: new Error('url too long') })
      .mockResolvedValueOnce({
        data: [
          { topic_id: 'topic-151', difficulty_numeric: 3 },
          { topic_id: 'topic-151', difficulty_numeric: 2 },
        ],
        error: null,
      });

    const ids = Array.from({ length: 151 }, (_, index) => `topic-${index + 1}`);
    const result = await fetchTopicReviewStats(ids);

    expect(result.get('topic-151')).toEqual({ reviewCount: 2, hardReviewCount: 1 });
  });

  it('sums study duration by topic from review history', async () => {
    supabaseMock.inMock.mockResolvedValue({
      data: [
        { topic_id: 'topic-1', study_duration_minutes: 20 },
        { topic_id: 'topic-1', study_duration_minutes: 15 },
        { topic_id: 'topic-2', study_duration_minutes: null },
        { topic_id: 'topic-2', study_duration_minutes: 30 },
      ],
      error: null,
    });

    const result = await fetchTopicReviewStudyMinutes(['topic-1', 'topic-2']);

    expect(supabaseMock.selectMock).toHaveBeenCalledWith('topic_id, study_duration_minutes');
    expect(result.get('topic-1')).toBe(35);
    expect(result.get('topic-2')).toBe(30);
  });
});
