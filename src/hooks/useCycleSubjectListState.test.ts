import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Subject, Topic } from '@/types';
import type { CycleUnificationMap } from '@/types/cycleMergeTypes';

import { useCycleSubjectListState } from './useCycleSubjectListState';

const makeTopic = (id: string, overrides: Partial<Topic> = {}): Topic => ({
  id,
  name: `Tópico ${id}`,
  completed: false,
  reviewCount: 0,
  review_count: 0,
  is_active: true,
  is_hidden: false,
  ...overrides,
});

const makeSubject = (id: string, topics: Topic[] = [makeTopic(`${id}-topic`)]): Subject => ({
  id,
  name: `Matéria ${id}`,
  status: 'Em Estudo',
  edital_id: 'edital-1',
  is_visible: true,
  topics,
});

describe('useCycleSubjectListState', () => {
  it('builds the visible cycle list using cycle order, active edital subjects and merge mapping', () => {
    const unificationMap: CycleUnificationMap = {
      createdAt: '2026-07-09T00:00:00Z',
      editalIds: ['edital-1'],
      standaloneSubjectIds: ['subject-3'],
      unifiedSubjects: [{
        displayName: 'Direito Unificado',
        matchType: 'manual',
        originalSubjectIds: ['subject-1', 'subject-2'],
        topicMappings: [],
      }],
      version: 1,
    };

    const { result } = renderHook(() => useCycleSubjectListState({
      activeSubjectIdsSet: new Set(['subject-3']),
      dynamicUnificationMap: unificationMap,
      isTopicCompleted: topic => topic.completed === true,
      isTopicStarted: topic => Boolean(topic.first_studied_at),
      localSubjects: [
        makeSubject('subject-1'),
        makeSubject('subject-2'),
        makeSubject('subject-3'),
        { ...makeSubject('hidden-subject'), is_visible: false },
      ],
      userCycle: {
        ciclo_atual: ['subject-2', 'subject-1'],
        materias_estudadas_ciclo: ['subject-1'],
      },
    }));

    expect(result.current.expandedSubjectList.map(item => item.id)).toEqual(['subject-1', 'subject-3']);
    expect(result.current.visibleCycleTopicIds).toEqual(['subject-1-topic', 'subject-2-topic', 'subject-3-topic']);
    expect(Array.from(result.current.studiedCycleIdSet).sort()).toEqual(['subject-1', 'subject-2']);
  });

  it('marks subjects as closed when all visible topics are started or completed', () => {
    const { result } = renderHook(() => useCycleSubjectListState({
      activeSubjectIdsSet: new Set<string>(),
      dynamicUnificationMap: null,
      isTopicCompleted: topic => topic.completed === true,
      isTopicStarted: topic => Boolean(topic.first_studied_at),
      localSubjects: [
        makeSubject('completed-subject', [
          makeTopic('completed-topic', { completed: true }),
        ]),
        makeSubject('started-subject', [
          makeTopic('started-topic', { first_studied_at: '2026-07-09T10:00:00Z' }),
        ]),
        makeSubject('open-subject', [
          makeTopic('open-topic'),
        ]),
      ],
      userCycle: {
        ciclo_atual: ['completed-subject', 'started-subject', 'open-subject'],
        materias_estudadas_ciclo: [],
      },
    }));

    expect(result.current.completedEditalSubjectIdSet.has('completed-subject')).toBe(true);
    expect(result.current.fullyStartedSubjectIdSet.has('started-subject')).toBe(true);
    expect(result.current.cycleClosedSubjectIdSet.has('completed-subject')).toBe(true);
    expect(result.current.cycleClosedSubjectIdSet.has('started-subject')).toBe(true);
    expect(result.current.cycleClosedSubjectIdSet.has('open-subject')).toBe(false);
  });
});
