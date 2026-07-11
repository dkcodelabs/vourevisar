import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Subject } from '@/types';

import { useSubjectsEditalModalState } from './useSubjectsEditalModalState';

const makeSubject = (id: string, editalId: string): Subject => ({
  id,
  name: `Matéria ${id}`,
  status: 'Em Estudo',
  edital_id: editalId,
  is_visible: true,
  topics: [],
});

const edital = {
  id: 'edital-1',
  name: 'Receita Federal',
  organ: 'RFB',
  position: 'Analista',
  year: 2026,
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
