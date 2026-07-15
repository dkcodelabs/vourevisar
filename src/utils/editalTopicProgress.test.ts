import { describe, expect, it } from 'vitest';

import type { Subject, Topic } from '@/types';
import type { CycleUnificationMap } from '@/types/cycleMergeTypes';

import {
  getEditalSubjectCycleProgress,
  getEditalTopicCycleProgress,
  getEditalTopicProgressBadge,
} from './editalTopicProgress';

const makeTopic = (overrides: Partial<Topic> = {}): Topic => ({
  id: 'topic-1',
  name: 'Crase',
  completed: false,
  reviewCount: 0,
  review_count: 0,
  ...overrides,
});

const makeSubject = (overrides: Partial<Subject> = {}): Subject => ({
  id: 'subject-1',
  name: 'PORTUGUES',
  status: 'Nova',
  topics: [],
  ...overrides,
});

const unificationMap: CycleUnificationMap = {
  version: 1,
  createdAt: '2026-07-11T10:00:00.000Z',
  editalIds: ['edital-a', 'edital-b'],
  standaloneSubjectIds: [],
  unifiedSubjects: [
    {
      displayName: 'PORTUGUES',
      originalSubjectIds: ['subject-a', 'subject-b'],
      matchType: 'manual',
      topicMappings: [
        {
          displayName: 'Crase',
          originalTopicIds: ['topic-a', 'topic-b'],
          originalSubjectIds: ['subject-a', 'subject-b'],
          matchType: 'manual',
        },
      ],
    },
  ],
};

describe('editalTopicProgress', () => {
  it('consolida progresso concluido de topico equivalente sem depender do topico local', () => {
    const localCrase = makeTopic({ id: 'topic-a', completed: false, review_count: 0 });
    const completedCrase = makeTopic({ id: 'topic-b', completed: true, review_count: 5 });
    const subjects = [
      makeSubject({ id: 'subject-a', topics: [localCrase] }),
      makeSubject({ id: 'subject-b', topics: [completedCrase] }),
    ];

    expect(getEditalTopicCycleProgress(localCrase, subjects, unificationMap)).toMatchObject({
      reviewsCompleted: 4,
      isCompleted: true,
      isConsolidatedFromEquivalent: true,
    });
    expect(getEditalTopicProgressBadge(localCrase, subjects, unificationMap)).toEqual({
      label: '4/4 revisões no ciclo',
      tone: 'success',
    });
    expect(getEditalSubjectCycleProgress(subjects[0], subjects, unificationMap)).toBe(100);
  });

  it('mostra progresso proprio quando nao ha equivalente com progresso maior', () => {
    const topic = makeTopic({ id: 'topic-a', review_count: 3 });
    const subjects = [makeSubject({ id: 'subject-a', topics: [topic] })];

    expect(getEditalTopicProgressBadge(topic, subjects, null)).toEqual({
      label: '2/4 revisões',
      tone: 'primary',
    });
    expect(getEditalSubjectCycleProgress(subjects[0], subjects, null)).toBe(0);
  });

  it('mostra primeiro contato quando o topico foi iniciado sem revisoes programadas', () => {
    const topic = makeTopic({ id: 'topic-a', review_count: 1, first_studied_at: '2026-07-11T10:00:00Z' });

    expect(getEditalTopicProgressBadge(topic, [makeSubject({ topics: [topic] })], null)).toEqual({
      label: 'Primeiro contato feito',
      tone: 'muted',
    });
  });

  it('mostra estado inicial para topico ainda sem contato', () => {
    const topic = makeTopic({ id: 'topic-a', review_count: 0 });

    expect(getEditalTopicProgressBadge(topic, [makeSubject({ topics: [topic] })], null)).toEqual({
      label: '0/4 revisões',
      tone: 'muted',
    });
  });

  it('nao consolida topicos por nome quando nao ha equivalencia explicita', () => {
    const splitMap: CycleUnificationMap = {
      ...unificationMap,
      unifiedSubjects: [
        {
          ...unificationMap.unifiedSubjects[0],
          originalSubjectIds: ['subject-a', 'subject-b', 'subject-c', 'subject-d'],
          topicMappings: [
            {
              displayName: 'Crases',
              originalTopicIds: ['topic-a'],
              originalSubjectIds: ['subject-a'],
              matchType: 'manual',
            },
            {
              displayName: 'Crase',
              originalTopicIds: ['topic-b'],
              originalSubjectIds: ['subject-b'],
              matchType: 'manual',
            },
            {
              displayName: 'Crase',
              originalTopicIds: ['topic-c'],
              originalSubjectIds: ['subject-c'],
              matchType: 'manual',
            },
          ],
        },
      ],
    };

    const topics = [
      makeTopic({ id: 'topic-a', name: 'Crases', review_count: 5, completed: true }),
      makeTopic({ id: 'topic-b', name: 'Crase', review_count: 3 }),
      makeTopic({ id: 'topic-c', name: 'Crase', review_count: 5, completed: true }),
      makeTopic({ id: 'topic-d', name: 'Crase', review_count: 3 }),
    ];
    const subjects = topics.map((topic, index) =>
      makeSubject({ id: `subject-${String.fromCharCode(97 + index)}`, topics: [topic] }),
    );

    expect(getEditalTopicProgressBadge(topics[1], subjects, splitMap)).toEqual({
      label: '2/4 revisões',
      tone: 'primary',
    });
    expect(getEditalTopicProgressBadge(topics[3], subjects, splitMap)).toEqual({
      label: '2/4 revisões',
      tone: 'primary',
    });
    expect(getEditalSubjectCycleProgress(subjects[1], subjects, splitMap)).toBe(0);
  });
});
