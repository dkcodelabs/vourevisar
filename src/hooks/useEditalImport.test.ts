import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  importEdital: vi.fn(),
  reportError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock('@/services/editalImportService', () => ({
  importEdital: mocks.importEdital,
}));

vi.mock('@/lib/errors/errorService', () => ({
  errorService: { report: mocks.reportError },
}));

vi.mock('@/lib/toast', () => ({
  toast: { success: mocks.toastSuccess },
}));

import { useEditalImport } from './useEditalImport';

describe('useEditalImport', () => {
  beforeEach(() => vi.clearAllMocks());

  it('refreshes cycle data and closes the page modal after a successful import', async () => {
    const closeModal = vi.fn();
    const refreshData = vi.fn().mockResolvedValue(undefined);
    const refreshOrigins = vi.fn().mockResolvedValue(undefined);
    const setIsLoading = vi.fn();
    mocks.importEdital.mockResolvedValue({ editalId: 'edital-1', subjectIds: ['subject-1'] });

    const { result } = renderHook(() => useEditalImport({
      closeModal,
      refreshData,
      refreshOrigins,
      setIsLoading,
      userId: 'user-1',
    }));

    await act(async () => {
      await result.current.importSubjects([], 'TRF 2026', true, 'catalog-1', {
        organ: 'TRF',
        position: 'Analista',
        year: '2026',
      });
    });

    expect(refreshData).toHaveBeenCalledOnce();
    expect(refreshOrigins).toHaveBeenCalledOnce();
    expect(closeModal).toHaveBeenCalledOnce();
    expect(mocks.toastSuccess).toHaveBeenCalledWith('0 matérias vinculadas a "TRF 2026" com sucesso!');
    expect(setIsLoading).toHaveBeenNthCalledWith(1, true);
    expect(setIsLoading).toHaveBeenLastCalledWith(false);
  });

  it('reports and rethrows import failures so the modal does not treat them as success', async () => {
    const failure = new Error('insert failed');
    mocks.importEdital.mockRejectedValue(failure);
    const closeModal = vi.fn();

    const { result } = renderHook(() => useEditalImport({
      closeModal,
      refreshData: vi.fn(),
      refreshOrigins: vi.fn(),
      setIsLoading: vi.fn(),
      userId: 'user-1',
    }));

    await expect(act(async () => {
      await result.current.importSubjects([], 'TRF 2026');
    })).rejects.toThrow('insert failed');

    expect(mocks.reportError).toHaveBeenCalledOnce();
    expect(closeModal).not.toHaveBeenCalled();
  });
});
