import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Subject } from '@/types';
import type { CycleUnificationMap } from '@/types/cycleMergeTypes';

import { useSubjectsEditalModalState } from './useSubjectsEditalModalState';

const makeSubject = (id: string, editalId: string, topics: Subject['topics'] = []): Subject => ({
  id,
  name: `Matéria ${id}`,
  status: 'Em Estudo',
  edital_id: editalId,
  is_visible: true,
  topics,
});

const edital = {
  id: 'edital-1',
  name: 'Receita Federal',
  organ: 'RFB',
  position: 'Analista',
  year: '2026',
  exam_date: '2026-10-10',
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-02T00:00:00Z',
  is_imported: true,
  subject_ids: ['subject-1'],
  active_subject_ids: ['subject-1'],
};

describe('useSubjectsEditalModalState', () => {
  it('opens the edital subjects modal for the selected cycle subject', () => {
    const { result } = renderHook(() => useSubjectsEditalModalState({
      editaisData: [edital],
      editaisNoCiclo: [edital],
      refresh: vi.fn(),
      refreshData: vi.fn(),
    }));

    act(() => {
      result.current.handleManageCycleSubject(makeSubject('subject-1', 'edital-1'));
    });

    expect(result.current.subjectsModal).toMatchObject({
      initialExpandedSubjectId: 'subject-1',
      isOpen: true,
    });
    expect(result.current.subjectsModal.edital).toMatchObject({
      examDate: '2026-10-10',
      id: 'edital-1',
      isImported: true,
      name: 'Receita Federal',
    });
    expect(result.current.editaisNoCicloModalData[0]).toMatchObject({
      activeSubjectIds: ['subject-1'],
      subjectIds: ['subject-1'],
    });
  });

  it('opens an origin chooser before editing a unified subject', () => {
    const editalA = {
      ...edital,
      id: 'edital-a',
      name: 'Teste A',
      organ: 'TESTE A',
      position: 'Cargo A',
      subject_ids: ['subject-a'],
      active_subject_ids: ['subject-a'],
    };
    const editalB = {
      ...edital,
      id: 'edital-b',
      name: 'Teste B',
      organ: 'TESTE B',
      position: 'Cargo B',
      subject_ids: ['subject-b'],
      active_subject_ids: ['subject-b'],
    };
    const editalC = {
      ...edital,
      id: 'edital-c',
      name: 'Teste C',
      organ: 'TESTE C',
      position: 'Cargo C',
      subject_ids: ['subject-c'],
      active_subject_ids: ['subject-c'],
    };
    const subjects = [
      makeSubject('subject-a', 'edital-a', [{ id: 'topic-a', name: 'Lei penal no tempo', completed: false, reviewCount: 3, review_count: 3 }]),
      makeSubject('subject-b', 'edital-b', [{ id: 'topic-b', name: 'Lei penal no tempo e no espaço', completed: false, reviewCount: 3, review_count: 3 }]),
      makeSubject('subject-c', 'edital-c', [{ id: 'topic-c', name: 'Teoria tripartida', completed: false, reviewCount: 3, review_count: 3 }]),
    ];
    const dynamicUnificationMap: CycleUnificationMap = {
      version: 1,
      createdAt: '2026-07-15T00:00:00.000Z',
      editalIds: ['edital-a', 'edital-b', 'edital-c'],
      standaloneSubjectIds: [],
      unifiedSubjects: [{
        displayName: 'DIREITO',
        originalSubjectIds: ['subject-a', 'subject-b', 'subject-c'],
        matchType: 'manual',
        topicMappings: [{
          displayName: 'Lei penal no tempo',
          originalTopicIds: ['topic-a', 'topic-b', 'topic-c'],
          originalSubjectIds: ['subject-a', 'subject-b', 'subject-c'],
          sourceEditalIds: ['edital-a', 'edital-b', 'edital-c'],
          matchType: 'manual',
        }],
      }],
    };

    const { result } = renderHook(() => useSubjectsEditalModalState({
      dynamicUnificationMap,
      editaisData: [editalA, editalB, editalC],
      editaisNoCiclo: [editalA, editalB, editalC],
      refresh: vi.fn(),
      refreshData: vi.fn(),
      subjects,
    }));

    act(() => {
      result.current.handleManageCycleSubject(makeSubject('subject-a:subject-b:subject-c', 'edital-c'));
    });

    expect(result.current.subjectsModal.isOpen).toBe(false);
    expect(result.current.subjectOriginChooser).toMatchObject({
      isOpen: true,
      subjectName: 'DIREITO',
    });
    expect(result.current.subjectOriginChooser.choices.map(choice => ({
      editalId: choice.edital.id,
      subjectId: choice.subjectId,
      topics: choice.topics.map(topic => topic.topicName),
    }))).toEqual([
      { editalId: 'edital-a', subjectId: 'subject-a', topics: ['Lei penal no tempo'] },
      { editalId: 'edital-b', subjectId: 'subject-b', topics: ['Lei penal no tempo e no espaço'] },
      { editalId: 'edital-c', subjectId: 'subject-c', topics: ['Teoria tripartida'] },
    ]);

    act(() => {
      result.current.handleSelectSubjectOrigin(result.current.subjectOriginChooser.choices[2]);
    });

    expect(result.current.subjectOriginChooser.isOpen).toBe(false);
    expect(result.current.subjectsModal).toMatchObject({
      initialExpandedSubjectId: 'subject-c',
      isOpen: true,
    });
    expect(result.current.subjectsModal.edital).toMatchObject({
      id: 'edital-c',
      name: 'Teste C',
    });
  });

  it('closes and updates the modal through explicit refresh callbacks', () => {
    const refresh = vi.fn();
    const refreshData = vi.fn();

    const { result } = renderHook(() => useSubjectsEditalModalState({
      editaisData: [edital],
      editaisNoCiclo: [edital],
      refresh,
      refreshData,
    }));

    act(() => {
      result.current.handleManageCycleSubject(makeSubject('subject-1', 'edital-1'));
      result.current.handleCloseSubjectsModal();
    });

    expect(result.current.subjectsModal).toEqual({
      edital: null,
      isOpen: false,
    });
    expect(refresh).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.handleSubjectsModalUpdate();
    });

    expect(refresh).toHaveBeenCalledTimes(2);
    expect(refreshData).toHaveBeenCalledTimes(1);
  });
});
