import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  deleteSubjectPermanently: vi.fn(),
  notifyError: vi.fn(),
  reportError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock('@/services/subjectPermanentDeletionService', () => ({
  deleteSubjectPermanently: mocks.deleteSubjectPermanently,
}));

vi.mock('@/lib/errors/toastGate', () => ({
  toastGate: { notifyError: mocks.notifyError },
}));

vi.mock('@/lib/errors/errorService', () => ({
  errorService: { report: mocks.reportError },
}));

vi.mock('@/lib/toast', () => ({
  toast: { success: mocks.toastSuccess },
}));

import { usePermanentSubjectDeletion } from './usePermanentSubjectDeletion';

describe('usePermanentSubjectDeletion', () => {
  beforeEach(() => vi.clearAllMocks());

  it('keeps the local subject when only one edital link is removed', async () => {
    const refreshOrigins = vi.fn().mockResolvedValue(undefined);
    const setIsLoading = vi.fn();
    const setLocalSubjects = vi.fn();
    mocks.deleteSubjectPermanently.mockResolvedValue({ subjectDeleted: false });

    const { result } = renderHook(() => usePermanentSubjectDeletion({
      refreshOrigins,
      setIsLoading,
      setLocalSubjects,
      userId: 'user-1',
    }));

    await act(async () => {
      await result.current.deletePermanent('subject-1', 'edital-1');
    });

    expect(setLocalSubjects).not.toHaveBeenCalled();
    expect(refreshOrigins).toHaveBeenCalledOnce();
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Matéria removida do edital!');
  });
});
