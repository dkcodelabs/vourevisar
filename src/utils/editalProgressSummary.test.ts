import { describe, expect, it } from 'vitest';

import type { Subject } from '@/types';
import { buildEditalProgressSummary } from './editalProgressSummary';

describe('buildEditalProgressSummary', () => {
  it('counts started, completed, in-review and scheduled topics without inventing cycles', () => {
    const subjects: Subject[] = [
      {
        id: 'subject-1',
        name: 'Direito',
        status: 'Nova',
        topics: [
          {
            id: 'topic-1',
            name: 'Lei penal',
            completed: false,
            first_studied_at: '2026-07-10T10:00:00.000Z',
            next_review: '2026-07-13T10:00:00.000Z',
            review_count: 2,
          },
          {
            id: 'topic-2',
            name: 'Crimes',
            completed: true,
            review_count: 4,
          },
          {
            id: 'topic-3',
            name: 'Penas',
            completed: false,
            review_count: 0,
          },
        ],
      },
    ];

    expect(buildEditalProgressSummary(subjects)).toEqual({
      completedTopics: 1,
      hasProgress: true,
      reviewCount: 6,
      reviewingTopics: 1,
      scheduledReviewTopics: 1,
      startedTopics: 2,
      topicCount: 3,
    });
  });
});
