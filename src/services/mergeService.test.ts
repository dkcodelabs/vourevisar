import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SubjectMerge, TopicMerge } from '@/types/merges';
import { mergeService } from './mergeService';

type QueryResult = { data?: unknown; error?: unknown };
type Operation = {
  table: string;
  action: string;
  payload?: unknown;
  filters: Array<[string, unknown]>;
};

const database = vi.hoisted(() => {
  const operations: Operation[] = [];
  const responses: QueryResult[] = [];

  const nextResponse = () => Promise.resolve(responses.shift() ?? { data: null, error: null });

  const from = vi.fn((table: string) => {
    const operation: Operation = { table, action: 'select', filters: [] };
    operations.push(operation);

    const chain = {
      select: vi.fn(() => chain),
      insert: vi.fn((payload: unknown) => {
        operation.action = 'insert';
        operation.payload = payload;
        return chain;
      }),
      update: vi.fn((payload: unknown) => {
        operation.action = 'update';
        operation.payload = payload;
        return chain;
      }),
      delete: vi.fn(() => {
        operation.action = 'delete';
        return chain;
      }),
      eq: vi.fn((column: string, value: unknown) => {
        operation.filters.push([column, value]);
        return chain;
      }),
      in: vi.fn((column: string, value: unknown) => {
        operation.filters.push([`${column}.in`, value]);
        return chain;
      }),
      or: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      maybeSingle: vi.fn(nextResponse),
      single: vi.fn(nextResponse),
      then: (resolve: (value: QueryResult) => unknown, reject: (reason: unknown) => unknown) =>
        nextResponse().then(resolve, reject),
    };

    return chain;
  });

  return { from, operations, responses };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: database.from,
    rpc: vi.fn(),
  },
}));

const subjectMerge: SubjectMerge = {
  id: 'subject-merge-1',
  user_id: 'user-1',
  cycle_id: 'cycle-1',
  primary_subject_id: 'subject-old',
  merged_subject_ids: ['subject-new'],
  source_edital_ids: ['edital-old', 'edital-b', 'edital-c'],
  display_name: 'Direito',
  created_at: '2026-07-01T00:00:00.000Z',
  reverted_at: null,
  status: 'active',
  created_by_ai: false,
  match_type: 'exact',
};

const topicMerge: TopicMerge = {
  id: 'topic-merge-1',
  user_id: 'user-1',
  cycle_id: 'cycle-1',
  subject_merge_id: subjectMerge.id,
  primary_topic_id: 'topic-old',
  merged_topic_ids: ['topic-new'],
  source_edital_ids: ['edital-old', 'edital-b', 'edital-c'],
  display_name: 'Constituição',
  created_at: '2026-07-01T00:00:00.000Z',
  reverted_at: null,
  status: 'active',
  created_by_ai: false,
  match_type: 'exact',
};

beforeEach(() => {
  database.from.mockClear();
  database.operations.length = 0;
  database.responses.length = 0;
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('mergeService', () => {
  it('creates a subject merge with the complete persistence contract', async () => {
    database.responses.push({ data: subjectMerge, error: null });

    const created = await mergeService.createSubjectMerge({
      user_id: subjectMerge.user_id,
      cycle_id: subjectMerge.cycle_id,
      primary_subject_id: subjectMerge.primary_subject_id,
      merged_subject_ids: subjectMerge.merged_subject_ids,
      source_edital_ids: subjectMerge.source_edital_ids,
      display_name: subjectMerge.display_name,
      created_by_ai: subjectMerge.created_by_ai,
      match_type: subjectMerge.match_type,
    });

    expect(created).toEqual(subjectMerge);
    expect(database.operations[0]).toMatchObject({
      table: 'subject_merges',
      action: 'insert',
      payload: expect.objectContaining({
        primary_subject_id: 'subject-old',
        merged_subject_ids: ['subject-new'],
        source_edital_ids: ['edital-old', 'edital-b', 'edital-c'],
      }),
    });
  });

  it('copies parent progress before reverting a topic merge', async () => {
    database.responses.push(
      { data: topicMerge, error: null },
      {
        data: {
          completed: true,
          review_count: 4,
          next_review: null,
          last_reviewed_at: '2026-07-01T00:00:00.000Z',
          difficulty_level: 2,
          notes: null,
          memory_stability: 8,
          current_interval: 30,
          retention_score: 0.9,
          total_reviews: 4,
        },
        error: null,
      },
      { error: null },
      { error: null },
      { error: null },
    );

    await mergeService.revertTopicMerge(topicMerge.id);

    const progressUpdate = database.operations.find(operation =>
      operation.table === 'topics' &&
      operation.action === 'update' &&
      operation.filters.some(([filter]) => filter === 'id.in'),
    );
    expect(progressUpdate?.payload).toMatchObject({ completed: true, review_count: 4, current_interval: 30 });

    const mergeDelete = database.operations.find(operation =>
      operation.table === 'topic_merges' && operation.action === 'delete',
    );
    expect(mergeDelete?.filters).toContainEqual(['id', topicMerge.id]);
  });

  it('persists manual topic equivalence without marking it as AI-created', async () => {
    vi.spyOn(mergeService, 'getSubjectMergeByPrimaryId').mockResolvedValue(null);
    vi.spyOn(mergeService, 'getTopicMerge').mockResolvedValue(null);
    const createSubjectMerge = vi.spyOn(mergeService, 'createSubjectMerge').mockResolvedValue(subjectMerge);
    const createTopicMerge = vi.spyOn(mergeService, 'createTopicMerge').mockResolvedValue(topicMerge);
    database.responses.push({ data: [], error: null });

    await mergeService.saveMergeFromUnificationMap('user-1', 'cycle-1', {
      version: 1,
      createdAt: '2026-07-06T00:00:00.000Z',
      editalIds: ['edital-a', 'edital-b'],
      standaloneSubjectIds: [],
      unifiedSubjects: [{
        displayName: 'Direito Constitucional',
        originalSubjectIds: ['subject-a', 'subject-b'],
        sourceEditalIds: ['edital-a', 'edital-b'],
        matchType: 'exact',
        topicMappings: [{
          displayName: 'Direitos fundamentais',
          originalTopicIds: ['topic-a', 'topic-b'],
          originalSubjectIds: ['subject-a', 'subject-b'],
          sourceEditalIds: ['edital-a', 'edital-b'],
          matchType: 'manual',
        }],
      }],
    });

    expect(createSubjectMerge).toHaveBeenCalledWith(expect.objectContaining({
      created_by_ai: false,
      match_type: 'exact',
    }));
    expect(createTopicMerge).toHaveBeenCalledWith(expect.objectContaining({
      created_by_ai: false,
      match_type: 'manual',
    }));
  });

  it('promotes surviving subject and topic primaries while cleaning removed references', async () => {
    vi.spyOn(mergeService, 'getActiveTopicMerges').mockResolvedValue([topicMerge]);

    database.responses.push(
      { data: [subjectMerge], error: null },
      { data: { subject_ids: ['subject-old'] }, error: null },
      { data: [{ id: 'topic-old' }], error: null },
      { error: null },
      { error: null },
      { data: { subject_ids: ['subject-old'] }, error: null },
      { error: null },
      { data: [{ id: 'topic-old' }], error: null },
      { error: null },
    );

    await mergeService.cleanupMergesAfterEditalRemoval('user-1', 'edital-old', undefined, {
      emitEvents: false,
      throwOnError: true,
    });

    const topicPromotion = database.operations.find(operation =>
      operation.table === 'topic_merges' && operation.action === 'update',
    );
    expect(topicPromotion?.payload).toMatchObject({
      primary_topic_id: 'topic-new',
      merged_topic_ids: ['topic-old'],
      source_edital_ids: ['edital-b', 'edital-c'],
    });

    const subjectPromotion = database.operations.find(operation =>
      operation.table === 'subject_merges' && operation.action === 'update',
    );
    expect(subjectPromotion?.payload).toMatchObject({
      primary_subject_id: 'subject-new',
      merged_subject_ids: ['subject-old'],
      source_edital_ids: ['edital-b', 'edital-c'],
    });

    const orphanCleanup = database.operations.find(operation =>
      operation.table === 'topics' &&
      operation.action === 'update' &&
      operation.filters.some(([filter]) => filter === 'parent_topic_id.in'),
    );
    expect(orphanCleanup?.payload).toEqual({ parent_topic_id: null, merged_with_ia: false });
  });
});
