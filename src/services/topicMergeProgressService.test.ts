import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  invokeUserRpc: vi.fn(),
}));

vi.mock('@/services/userRpcService', () => ({
  invokeUserRpc: mocks.invokeUserRpc,
}));

import { syncMergedTopicProgress } from './topicMergeProgressService';

describe('syncMergedTopicProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.invokeUserRpc.mockResolvedValue({ ok: true, synced_topic_ids: ['topic-clicked', 'topic-primary', 'topic-sibling'] });
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
    expect(mocks.invokeUserRpc).toHaveBeenCalledWith('sync_topic_merge_progress', {
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

    expect(mocks.invokeUserRpc).toHaveBeenCalledWith('sync_topic_merge_progress', {
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

  it('passes the full active progress payload used by merged review completion', async () => {
    await syncMergedTopicProgress({
      userId: 'user-1',
      topicId: 'topic-clicked',
      updateData: {
        difficulty_level: 3,
        difficulty_set_at: '2026-07-11T20:00:00.000Z',
        last_session_duration: 25,
        notes: { content: 'Resumo' },
        retention_score: 0.8,
        total_reviews: 4,
      },
    });

    expect(mocks.invokeUserRpc).toHaveBeenCalledWith('sync_topic_merge_progress', {
      p_user_id: 'user-1',
      p_topic_id: 'topic-clicked',
      p_progress: {
        difficulty_level: 3,
        difficulty_set_at: '2026-07-11T20:00:00.000Z',
        last_session_duration: 25,
        notes: { content: 'Resumo' },
        retention_score: 0.8,
        total_reviews: 4,
      },
      p_history: null,
    });
  });

  it('does not call the RPC when there are no progress fields', async () => {
    const syncedIds = await syncMergedTopicProgress({
      userId: 'user-1',
      topicId: 'topic-standalone',
      updateData: { name: 'Somente nome', position: 2 },
    });

    expect(syncedIds).toEqual([]);
    expect(mocks.invokeUserRpc).not.toHaveBeenCalled();
  });
});
