import { describe, expect, it, vi } from 'vitest';

import type { Subject } from '@/types';
import {
  importEdital,
  type EditalImportRepository,
} from './editalImportService';

const subject = {
  exam_weight_points: 4,
  id: 'temporary-subject',
  name: 'Direito Constitucional',
  topics: [{ id: 'temporary-topic', name: 'Direitos fundamentais', position: 2 }],
} as Subject;

const createRepository = (): EditalImportRepository => ({
  createEdital: vi.fn().mockResolvedValue({ id: 'edital-1' }),
  createSubject: vi.fn().mockResolvedValue({ id: 'subject-1' }),
  createTopics: vi.fn().mockResolvedValue(undefined),
  deleteEdital: vi.fn().mockResolvedValue(undefined),
  updateEditalSubjectIds: vi.fn().mockResolvedValue(undefined),
});

describe('importEdital', () => {
  it('imports multiple subjects and mixed topic hierarchies without coupling to a specific edital', async () => {
    const repository = createRepository();
    vi.mocked(repository.createSubject)
      .mockResolvedValueOnce({ id: 'subject-portugues' })
      .mockResolvedValueOnce({ id: 'subject-raciocinio' });

    const subjects = [
      {
        ...subject,
        name: 'Língua Portuguesa',
        topics: [
          { id: 'p-11', name: '11. Variação linguística', position: 0 },
          { id: 'p-1', name: '1. Compreensão de texto', position: 1 },
          { id: 'p-1-1', name: '1.1. Coesão e coerência', position: 2 },
        ],
      },
      {
        ...subject,
        name: 'Raciocínio Lógico',
        topics: [
          { id: 'r-a', name: 'Proposições', position: 0 },
          { id: 'r-b', name: 'Equivalências', position: 1 },
        ],
      },
    ] as Subject[];

    const result = await importEdital({
      editalName: 'Edital variado 2026',
      extraInfo: { organ: 'Órgão X', position: 'Analista', year: '2026', exam_date: '2026-12-10' },
      repository,
      subjects,
      userId: 'user-1',
    });

    expect(result).toEqual({ editalId: 'edital-1', subjectIds: ['subject-portugues', 'subject-raciocinio'] });
    expect(repository.createTopics).toHaveBeenNthCalledWith(1, [
      expect.objectContaining({ subject_id: 'subject-portugues', name: '11. Variação linguística', position: 0 }),
      expect.objectContaining({ subject_id: 'subject-portugues', name: '1. Compreensão de texto', position: 1 }),
      expect.objectContaining({ subject_id: 'subject-portugues', name: '1.1. Coesão e coerência', position: 2 }),
    ]);
    expect(repository.createTopics).toHaveBeenNthCalledWith(2, [
      expect.objectContaining({ subject_id: 'subject-raciocinio', name: 'Proposições', position: 0 }),
      expect.objectContaining({ subject_id: 'subject-raciocinio', name: 'Equivalências', position: 1 }),
    ]);
  });

  it('preserves source metadata and links subjects and topics to the created edital', async () => {
    const repository = createRepository();

    const result = await importEdital({
      editalName: 'TRF 2026',
      extraInfo: {
        exam_board: 'CEBRASPE',
        exam_date: '2026-09-20',
        organ: 'TRF',
        position: 'Analista',
        source_updated_at: '2026-07-01T10:00:00.000Z',
        year: '2026',
      },
      isImported: true,
      repository,
      sourceId: 'catalog-1',
      subjects: [subject],
      userId: 'user-1',
    });

    expect(repository.createEdital).toHaveBeenCalledWith(expect.objectContaining({
      ai_extraction_used: false,
      exam_board: 'CEBRASPE',
      exam_date: '2026-09-20',
      name: 'TRF 2026',
      organ: 'TRF',
      source_id: 'catalog-1',
      user_id: 'user-1',
    }));
    expect(repository.createSubject).toHaveBeenCalledWith(expect.objectContaining({
      edital_id: 'edital-1',
      exam_weight_points: 4,
      name: 'Direito Constitucional',
      user_id: 'user-1',
    }));
    expect(repository.createTopics).toHaveBeenCalledWith([expect.objectContaining({
      edital_id: 'edital-1',
      name: 'Direitos fundamentais',
      subject_id: 'subject-1',
    })]);
    expect(repository.updateEditalSubjectIds).toHaveBeenCalledWith('edital-1', ['subject-1']);
    expect(result).toEqual({ editalId: 'edital-1', subjectIds: ['subject-1'] });
  });

  it('persists IA usage separately from the edital import origin', async () => {
    const repository = createRepository();

    await importEdital({
      aiExtractionUsed: true,
      editalName: 'Edital extraído',
      isImported: true,
      repository,
      sourceId: 'catalog-1',
      subjects: [subject],
      userId: 'user-1',
    });

    expect(repository.createEdital).toHaveBeenCalledWith(expect.objectContaining({
      ai_extraction_used: true,
      source_id: 'catalog-1',
    }));
  });

  it('removes the incomplete edital when importing a subject fails', async () => {
    const repository = createRepository();
    vi.mocked(repository.createSubject).mockRejectedValueOnce(new Error('subject insert failed'));

    await expect(importEdital({
      editalName: 'TRF 2026',
      repository,
      subjects: [subject],
      userId: 'user-1',
    })).rejects.toThrow('subject insert failed');

    expect(repository.deleteEdital).toHaveBeenCalledWith('edital-1', 'user-1');
    expect(repository.updateEditalSubjectIds).not.toHaveBeenCalled();
  });
});
