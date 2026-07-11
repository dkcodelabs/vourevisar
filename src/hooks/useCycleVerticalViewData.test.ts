import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Subject, Topic } from '@/types';

import { useCycleVerticalViewData } from './useCycleVerticalViewData';

const makeTopic = (overrides: Partial<Topic> & Pick<Topic, 'id' | 'name'>): Topic => ({
  id: overrides.id,
  name: overrides.name,
  completed: false,
  reviewCount: 0,
  review_count: 0,
  is_active: true,
  is_hidden: false,
  ...overrides,
});

const makeSubject = (id: string, name: string, topics: Topic[]): Subject => ({
  id,
  name,
  status: 'Em Estudo',
  edital_id: 'edital-1',
  is_visible: true,
  topics,
});

describe('useCycleVerticalViewData', () => {
  it('builds the vertical list using only visible topics that match the search', () => {
    const subjects = [
      {
        id: 'subject-1',
        subject: makeSubject('subject-1', 'Direito Constitucional', [
          makeTopic({ id: 'topic-1', name: 'Controle de Constitucionalidade' }),
          makeTopic({ id: 'topic-2', name: 'Poder Constituinte', is_hidden: true }),
        ]),
      },
      {
        id: 'subject-2',
        subject: makeSubject('subject-2', 'Direito Penal', [
          makeTopic({ id: 'topic-3', name: 'Tipicidade' }),
        ]),
      },
    ];

    const { result } = renderHook(() => useCycleVerticalViewData({
      completedEditalSubjectIdSet: new Set<string>(),
      dynamicUnificationMap: null,
      editaisNoCiclo: [{ id: 'edital-1', name: 'Edital 1', subject_ids: ['subject-1', 'subject-2'] }],
      filteredList: subjects,
      fullyStartedSubjectIdSet: new Set<string>(),
      getUnifiedSubjectId: (subjectId: string) => subjectId,
      isImportEditalModalOpen: false,
      isTopicCompleted: (topic: Topic) => topic.completed === true,
      isTopicStarted: (topic: Topic) => (topic.reviewCount || 0) > 0 || (topic.review_count || 0) > 0 || Boolean(topic.first_studied_at),
      isVisibleCycleTopic: (topic: Topic) => topic.is_active !== false && topic.is_hidden !== true,
      query: 'controle',
      studiedCycleIdSet: new Set<string>(),
      userCycleStartDate: '2026-07-01T00:00:00.000Z',
    }));

    expect(result.current.verticalSubjectList).toHaveLength(1);
    expect(result.current.verticalSubjectList[0].id).toBe('subject-1');
    expect(result.current.verticalSubjectList[0].topics.map(topic => topic.id)).toEqual(['topic-1']);
  });

  it('computes the subject summary label using the current cycle state', () => {
    const topicStartedThisCycle = makeTopic({
      id: 'topic-1',
      name: 'Controle',
      first_studied_at: '2026-07-03T00:00:00.000Z',
    });
    const topicPending = makeTopic({
      id: 'topic-2',
      name: 'ADI',
    });
    const subject = makeSubject('subject-1', 'Direito Constitucional', [topicStartedThisCycle, topicPending]);

    const { result } = renderHook(() => useCycleVerticalViewData({
      completedEditalSubjectIdSet: new Set<string>(),
      dynamicUnificationMap: null,
      editaisNoCiclo: [],
      filteredList: [{ id: subject.id, subject }],
      fullyStartedSubjectIdSet: new Set<string>(),
      getUnifiedSubjectId: (subjectId: string) => subjectId,
      isImportEditalModalOpen: false,
      isTopicCompleted: (topic: Topic) => topic.completed === true,
      isTopicStarted: (topic: Topic) => Boolean(topic.first_studied_at),
      isVisibleCycleTopic: (topic: Topic) => topic.is_active !== false && topic.is_hidden !== true,
      query: '',
      studiedCycleIdSet: new Set<string>(['subject-1']),
      userCycleStartDate: '2026-07-01T00:00:00.000Z',
    }));

    expect(result.current.getSubjectTopicSummaryLabel(subject, subject.topics)).toBe('1/2 tópicos neste ciclo');
  });

  it('prefers the active cycle edital when building the vertical summary', () => {
    const subject = makeSubject('subject-1', 'Direito Constitucional', [makeTopic({ id: 'topic-1', name: 'Controle' })]);

    const { result } = renderHook(() => useCycleVerticalViewData({
      completedEditalSubjectIdSet: new Set<string>(),
      dynamicUnificationMap: null,
      editaisNoCiclo: [
        { id: 'edital-outro', name: 'Outro', subject_ids: ['subject-9'] },
        { id: 'edital-ativo', name: 'Ativo', subject_ids: ['subject-1'] },
      ],
      filteredList: [{ id: subject.id, subject }],
      fullyStartedSubjectIdSet: new Set<string>(),
      getUnifiedSubjectId: (subjectId: string) => subjectId,
      isImportEditalModalOpen: false,
      isTopicCompleted: () => false,
      isTopicStarted: () => false,
      isVisibleCycleTopic: () => true,
      query: '',
      studiedCycleIdSet: new Set<string>(),
      userCycleStartDate: null,
    }));

    expect(result.current.verticalSummaryEdital?.id).toBe('edital-ativo');
  });
});
