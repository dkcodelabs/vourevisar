import { describe, expect, it, vi } from 'vitest';

import {
  deleteSubjectPermanently,
  type SubjectDeletionRepository,
} from './subjectPermanentDeletionService';

const createRepository = (): SubjectDeletionRepository => ({
  deleteSubject: vi.fn(),
  deleteTopicHistory: vi.fn(),
  deleteTopics: vi.fn(),
  listTopicIds: vi.fn().mockResolvedValue(['topic-1']),
  listUserEditais: vi.fn().mockResolvedValue([
    { id: 'edital-1', subjectIds: ['subject-1'] },
    { id: 'edital-2', subjectIds: ['subject-1'] },
  ]),
  updateEditalSubjectIds: vi.fn(),
});

describe('deleteSubjectPermanently', () => {
  it('removes only the selected edital link while another edital still uses the subject', async () => {
    const repository = createRepository();

    const result = await deleteSubjectPermanently({
      editalIdToRemove: 'edital-1',
      repository,
      subjectId: 'subject-1',
      userId: 'user-1',
    });

    expect(repository.updateEditalSubjectIds).toHaveBeenCalledWith('edital-1', []);
    expect(repository.deleteTopicHistory).not.toHaveBeenCalled();
    expect(repository.deleteTopics).not.toHaveBeenCalled();
    expect(repository.deleteSubject).not.toHaveBeenCalled();
    expect(result).toEqual({ subjectDeleted: false });
  });

  it('deletes history, topics and subject after removing every edital link', async () => {
    const repository = createRepository();

    const result = await deleteSubjectPermanently({
      repository,
      subjectId: 'subject-1',
      userId: 'user-1',
    });

    expect(repository.updateEditalSubjectIds).toHaveBeenCalledTimes(2);
    expect(repository.deleteTopicHistory).toHaveBeenCalledWith(['topic-1'], 'user-1');
    expect(repository.deleteTopics).toHaveBeenCalledWith('subject-1');
    expect(repository.deleteSubject).toHaveBeenCalledWith('subject-1', 'user-1');
    expect(result).toEqual({ subjectDeleted: true });
  });

  it('stops destructive writes when unlinking an edital fails', async () => {
    const repository = createRepository();
    vi.mocked(repository.updateEditalSubjectIds).mockRejectedValueOnce(new Error('update failed'));

    await expect(deleteSubjectPermanently({
      repository,
      subjectId: 'subject-1',
      userId: 'user-1',
    })).rejects.toThrow('update failed');

    expect(repository.deleteTopicHistory).not.toHaveBeenCalled();
    expect(repository.deleteTopics).not.toHaveBeenCalled();
    expect(repository.deleteSubject).not.toHaveBeenCalled();
  });
});
