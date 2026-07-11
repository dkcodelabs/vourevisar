import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Subject } from '@/types';

import { useSubjectMergeReversion } from './useSubjectMergeReversion';

const { notifyError, toastSuccess } = vi.hoisted(() => ({
  notifyError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock('@/lib/toast', () => ({
  toast: {
    success: toastSuccess,
  },
}));

vi.mock('@/lib/errors/toastGate', () => ({
  toastGate: {
    notifyError,
  },
}));

const makeSubject = (id: string, name: string): Subject => ({
  id,
  name,
  status: 'Em Estudo',
  edital_id: 'edital-1',
  is_visible: true,
  topics: [],
});

describe('useSubjectMergeReversion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens the revert modal with the original subjects and edital origins', () => {
    const { result } = renderHook(() => useSubjectMergeReversion({
      originsMap: new Map([
        ['subject-1', [{ name: 'Edital Receita', organ: 'RFB' }]],
        ['subject-2', [{ name: 'Edital INSS', organ: 'INSS' }]],
      ]),
      revertSubjectMerge: vi.fn(),
      subjects: [
        makeSubject('subject-1', 'Direito Constitucional'),
        makeSubject('subject-2', 'Direito Administrativo'),
      ],
    }));

    act(() => {
      result.current.handleOpenRevertSubjectMerge(makeSubject('merged', 'Direito Público'), {
        display_name: 'Direito Público',
        id: 'merge-1',
        merged_subject_ids: ['subject-2'],
        primary_subject_id: 'subject-1',
      });
    });

    expect(result.current.isRevertModalOpen).toBe(true);
    expect(result.current.selectedMergeName).toBe('Direito Público');
    expect(result.current.selectedMergeOriginals).toEqual([
      {
        editalName: 'Edital Receita',
        editalOrgan: 'RFB',
        subjectName: 'Direito Constitucional',
      },
      {
        editalName: 'Edital INSS',
        editalOrgan: 'INSS',
        subjectName: 'Direito Administrativo',
      },
    ]);
  });

  it('confirms the selected merge reversion and closes the modal', async () => {
    const revertSubjectMerge = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useSubjectMergeReversion({
      originsMap: new Map(),
      revertSubjectMerge,
      subjects: [makeSubject('subject-1', 'Direito Constitucional')],
    }));

    act(() => {
      result.current.handleOpenRevertSubjectMerge(makeSubject('subject-1', 'Direito Constitucional'), {
        display_name: 'Direito Constitucional',
        id: 'merge-1',
        primary_subject_id: 'subject-1',
      });
    });

    await act(async () => {
      await result.current.handleRevertMergeConfirm();
    });

    expect(revertSubjectMerge).toHaveBeenCalledWith('merge-1');
    expect(toastSuccess).toHaveBeenCalledWith('Mesclagem desfeita com sucesso');
    expect(result.current.isRevertModalOpen).toBe(false);
    expect(result.current.isReverting).toBe(false);
  });
});
