import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: mocks.rpc,
  },
}));

import { syncMergedTopicProgress } from './topicMergeProgressService';

describe('syncMergedTopicProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rpc.mockResolvedValue({
      data: { ok: true, synced_topic_ids: ['topic-clicked', 'topic-primary', 'topic-sibling'] },
      error: null,
    });
  });

  it('delegates progress synchronization to the atomic Supabase RPC with only review progress fields', async () => {
    const syncedIds = await syncMergedTopicProgress({
      userId: 'user-1',
      topicId: 'topic-clicked',
      updateData: {
        name: 'Nao deve copiar nome',
        position: 99,
        review_count: 2,
        review_stage: '7d',
        next_review: '2026-07-01',
        completed: false,
        last_reviewed_at: '2026-06-26T19:00:00.000Z',
      },
    });

    expect(syncedIds).toEqual(['topic-clicked', 'topic-primary', 'topic-sibling']);
    expect(mocks.rpc).toHaveBeenCalledWith('sync_topic_merge_progress', {
      p_user_id: 'user-1',
      p_topic_id: 'topic-clicked',
      p_progress: {
        completed: false,
        last_reviewed_at: '2026-06-26T19:00:00.000Z',
        next_review: '2026-07-01',
        review_count: 2,
        review_stage: '7d',
      },
      p_history: null,
    });
  });

  it('passes review history to the atomic RPC when provided', async () => {
    await syncMergedTopicProgress({
      userId: 'user-1',
      topicId: 'topic-clicked',
      updateData: { review_count: 3 },
      historyData: {
        review_stage: '14d',
        reviewed_at: '2026-06-26T19:00:00.000Z',
        difficulty_numeric: 2,
        memory_stability_after_review: 3.5,
        interval_after_review: 14,
      },
    });

    expect(mocks.rpc).toHaveBeenCalledWith('sync_topic_merge_progress', {
      p_user_id: 'user-1',
      p_topic_id: 'topic-clicked',
      p_progress: { review_count: 3 },
      p_history: {
        difficulty_numeric: 2,
        interval_after_review: 14,
        memory_stability_after_review: 3.5,
        review_stage: '14d',
        reviewed_at: '2026-06-26T19:00:00.000Z',
      },
    });
  });

  it('does not call the RPC when there are no progress fields', async () => {
    const syncedIds = await syncMergedTopicProgress({
      userId: 'user-1',
      topicId: 'topic-standalone',
      updateData: { name: 'Somente nome', position: 2 },
    });

    expect(syncedIds).toEqual([]);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
