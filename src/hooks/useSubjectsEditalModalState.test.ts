import { act, renderHook, waitFor } from '@testing-library/react';
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

  it('opens an origin chooser before editing a unified subject', async () => {
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
          displayNameOverride: 'Nome digitado pelo aluno',
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
      draftSubjectName: 'DIREITO',
      error: null,
      isOpen: true,
      isSavingName: false,
      originalSubjectIds: ['subject-a', 'subject-b', 'subject-c'],
      subjectName: 'DIREITO',
    });
    expect(result.current.subjectOriginChooser.choices.map(choice => ({
      editalId: choice.edital.id,
      subjectId: choice.subjectId,
      subjectName: choice.subjectName,
    }))).toEqual([
      { editalId: 'edital-a', subjectId: 'subject-a', subjectName: 'Matéria subject-a' },
      { editalId: 'edital-b', subjectId: 'subject-b', subjectName: 'Matéria subject-b' },
      { editalId: 'edital-c', subjectId: 'subject-c', subjectName: 'Matéria subject-c' },
    ]);

    await act(async () => {
      await result.current.handleSelectSubjectOrigin(result.current.subjectOriginChooser.choices[2]);
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

  it('saves a pending unified subject name before opening the selected origin', async () => {
    const onSaveUnifiedSubjectName = vi.fn().mockResolvedValue(undefined);
    const dynamicUnificationMap: CycleUnificationMap = {
      version: 1,
      createdAt: '2026-07-15T00:00:00.000Z',
      editalIds: ['edital-a', 'edital-b'],
      standaloneSubjectIds: [],
      unifiedSubjects: [{
        displayName: 'MATEMATICA',
        originalSubjectIds: ['subject-a', 'subject-b'],
        matchType: 'manual',
        topicMappings: [],
      }],
    };
    const editalA = { ...edital, id: 'edital-a', name: 'Teste A', subject_ids: ['subject-a'], active_subject_ids: ['subject-a'] };
    const editalB = { ...edital, id: 'edital-b', name: 'Teste B', subject_ids: ['subject-b'], active_subject_ids: ['subject-b'] };

    const { result } = renderHook(() => useSubjectsEditalModalState({
      dynamicUnificationMap,
      editaisData: [editalA, editalB],
      editaisNoCiclo: [editalA, editalB],
      onSaveUnifiedSubjectName,
      refresh: vi.fn(),
      refreshData: vi.fn(),
      subjects: [
        makeSubject('subject-a', 'edital-a'),
        makeSubject('subject-b', 'edital-b'),
      ],
    }));

    act(() => {
      result.current.handleManageCycleSubject(makeSubject('subject-a:subject-b', 'edital-a'));
      result.current.handleSubjectOriginNameDraftChange(' Matemática Geral ');
    });
    await act(async () => {
      await result.current.handleSelectSubjectOrigin(result.current.subjectOriginChooser.choices[1]);
    });

    expect(onSaveUnifiedSubjectName).toHaveBeenCalledWith(['subject-a', 'subject-b'], 'Matemática Geral');
    expect(result.current.subjectOriginChooser.isOpen).toBe(false);
    expect(result.current.subjectsModal).toMatchObject({
      initialExpandedSubjectId: 'subject-b',
      isOpen: true,
    });
    expect(result.current.subjectsModal.edital).toMatchObject({
      id: 'edital-b',
      name: 'Teste B',
    });
  });

  it('keeps the origin chooser open when saving a pending name before opening an origin fails', async () => {
    const onSaveUnifiedSubjectName = vi.fn().mockRejectedValue(new Error('Falha ao salvar nome'));
    const dynamicUnificationMap: CycleUnificationMap = {
      version: 1,
      createdAt: '2026-07-15T00:00:00.000Z',
      editalIds: ['edital-a', 'edital-b'],
      standaloneSubjectIds: [],
      unifiedSubjects: [{
        displayName: 'MATEMATICA',
        originalSubjectIds: ['subject-a', 'subject-b'],
        matchType: 'manual',
        topicMappings: [],
      }],
    };
    const editalA = { ...edital, id: 'edital-a', subject_ids: ['subject-a'], active_subject_ids: ['subject-a'] };
    const editalB = { ...edital, id: 'edital-b', subject_ids: ['subject-b'], active_subject_ids: ['subject-b'] };

    const { result } = renderHook(() => useSubjectsEditalModalState({
      dynamicUnificationMap,
      editaisData: [editalA, editalB],
      editaisNoCiclo: [editalA, editalB],
      onSaveUnifiedSubjectName,
      refresh: vi.fn(),
      refreshData: vi.fn(),
      subjects: [
        makeSubject('subject-a', 'edital-a'),
        makeSubject('subject-b', 'edital-b'),
      ],
    }));

    act(() => {
      result.current.handleManageCycleSubject(makeSubject('subject-a:subject-b', 'edital-a'));
      result.current.handleSubjectOriginNameDraftChange('Matemática Geral');
    });
    await act(async () => {
      await result.current.handleSelectSubjectOrigin(result.current.subjectOriginChooser.choices[1]);
    });

    expect(result.current.subjectOriginChooser).toMatchObject({
      error: 'Falha ao salvar nome',
      isOpen: true,
      isSavingName: false,
    });
    expect(result.current.subjectsModal.isOpen).toBe(false);
  });

  it('saves the display name used by a unified subject in the cycle', async () => {
    const onSaveUnifiedSubjectName = vi.fn().mockResolvedValue(undefined);
    const dynamicUnificationMap: CycleUnificationMap = {
      version: 1,
      createdAt: '2026-07-15T00:00:00.000Z',
      editalIds: ['edital-a', 'edital-b'],
      standaloneSubjectIds: [],
      unifiedSubjects: [{
        displayName: 'MATEMATICA',
        originalSubjectIds: ['subject-a', 'subject-b'],
        matchType: 'manual',
        topicMappings: [],
      }],
    };
    const editalA = { ...edital, id: 'edital-a', subject_ids: ['subject-a'], active_subject_ids: ['subject-a'] };
    const editalB = { ...edital, id: 'edital-b', subject_ids: ['subject-b'], active_subject_ids: ['subject-b'] };

    const { result } = renderHook(() => useSubjectsEditalModalState({
      dynamicUnificationMap,
      editaisData: [editalA, editalB],
      editaisNoCiclo: [editalA, editalB],
      onSaveUnifiedSubjectName,
      refresh: vi.fn(),
      refreshData: vi.fn(),
      subjects: [
        makeSubject('subject-a', 'edital-a'),
        makeSubject('subject-b', 'edital-b'),
      ],
    }));

    act(() => {
      result.current.handleManageCycleSubject(makeSubject('subject-a:subject-b', 'edital-a'));
    });
    act(() => {
      result.current.handleSubjectOriginNameDraftChange(' Matemática Geral ');
    });
    await act(async () => {
      await result.current.handleSaveSubjectOriginName();
    });

    expect(onSaveUnifiedSubjectName).toHaveBeenCalledWith(['subject-a', 'subject-b'], 'Matemática Geral');
    await waitFor(() => {
      expect(result.current.subjectOriginChooser).toMatchObject({
        draftSubjectName: 'Matemática Geral',
        error: null,
        isSavingName: false,
        subjectName: 'Matemática Geral',
      });
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
