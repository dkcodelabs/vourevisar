import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: mocks.rpc },
}));

import { deleteSubjectPermanently } from './subjectPermanentDeletionService';

describe('deleteSubjectPermanently', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rpc.mockResolvedValue({
      data: { ok: true, subject_deleted: true },
      error: null,
    });
  });

  it('deletes the subject through one atomic RPC', async () => {
    await expect(deleteSubjectPermanently({
      subjectId: 'subject-1',
      userId: 'user-1',
    })).resolves.toEqual({ subjectDeleted: true });

    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledWith('atomic_delete_subject', {
      p_edital_id_to_remove: null,
      p_subject_id: 'subject-1',
      p_user_id: 'user-1',
    });
  });

  it('reports when only one edital link was removed', async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: { ok: true, subject_deleted: false },
      error: null,
    });

    await expect(deleteSubjectPermanently({
      editalIdToRemove: 'edital-1',
      subjectId: 'subject-1',
      userId: 'user-1',
    })).resolves.toEqual({ subjectDeleted: false });
  });

  it('propagates database errors without a fallback write', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: new Error('transaction failed') });

    await expect(deleteSubjectPermanently({
      subjectId: 'subject-1',
      userId: 'user-1',
    })).rejects.toThrow('transaction failed');

    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });

  it('rejects an explicit unsuccessful RPC result', async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: { ok: false, error: 'subject not found' },
      error: null,
    });

    await expect(deleteSubjectPermanently({
      subjectId: 'subject-1',
      userId: 'user-1',
    })).rejects.toThrow('subject not found');
  });
});
