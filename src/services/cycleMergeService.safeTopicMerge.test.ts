import { beforeEach, describe, expect, it, vi } from 'vitest';

import { isSafeSemanticTopicMerge, performFullTopicMerge } from './cycleMergeService';
import type { Subject } from '@/types';

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    })),
    functions: {
      invoke: invokeMock,
    },
  },
}));

beforeEach(() => {
  invokeMock.mockReset();
});

describe('safe semantic topic merge', () => {
  it('blocks a broad compound topic from being merged with one extracted word', () => {
    expect(isSafeSemanticTopicMerge(['Peso', 'Pesos e medidas'])).toBe(false);
    expect(isSafeSemanticTopicMerge(['Medida', 'Pesos e medidas'])).toBe(false);
  });

  it('blocks broad compound topics that only partially overlap simple topics', () => {
    expect(isSafeSemanticTopicMerge(['Regência', 'Regência nominal e verbal'])).toBe(false);
    expect(isSafeSemanticTopicMerge(['Administração', 'Administração financeira, orçamentária e patrimonial'])).toBe(false);
  });

  it('allows exact normalized names and simple singular/plural variants', () => {
    expect(isSafeSemanticTopicMerge(['Função Logarítmica', 'funcao logaritmica'])).toBe(true);
    expect(isSafeSemanticTopicMerge(['Crase', 'Crases'])).toBe(true);
  });

  it('blocks semantic variations even when one name contains the other', () => {
    expect(isSafeSemanticTopicMerge(['Crase', 'Emprego da crase'])).toBe(false);
    expect(isSafeSemanticTopicMerge(['Porcentagem', 'Aplicação de porcentagem'])).toBe(false);
    expect(isSafeSemanticTopicMerge(['Contrato administrativo', 'Noções de contratos administrativos'])).toBe(false);
  });

  it('marks topic AI status as error when the Edge Function request fails', async () => {
    invokeMock.mockResolvedValue({
      data: null,
      error: new Error('Failed to send a request to the Edge Function'),
    });

    const result = await performFullTopicMerge(
      {
        version: 1,
        editalIds: ['edital-a', 'edital-b'],
        createdAt: '2026-06-28T00:00:00.000Z',
        standaloneSubjectIds: [],
        unifiedSubjects: [
          {
            displayName: 'Fisica',
            originalSubjectIds: ['subject-a', 'subject-b'],
            sourceEditalIds: ['edital-a', 'edital-b'],
            topicMappings: [],
            matchType: 'semantic',
          },
        ],
      },
      [
        {
          id: 'subject-a',
          name: 'Fisica',
          edital_id: 'edital-a',
          topics: [
            { id: 'topic-a', name: 'Cinematica', subject_id: 'subject-a', edital_id: 'edital-a', position: 1 },
          ],
        },
        {
          id: 'subject-b',
          name: 'Fisica',
          edital_id: 'edital-b',
          topics: [
            { id: 'topic-b', name: 'Dinamica', subject_id: 'subject-b', edital_id: 'edital-b', position: 2 },
          ],
        },
      ] as unknown as Subject[],
      true,
    );

    expect(result.overallAiStatus).toBe('error');
    expect(result.groups[0].aiStatus).toBe('error');
    expect(result.groups[0].topicMappings).toEqual([
      expect.objectContaining({ displayName: 'Cinematica', originalTopicIds: ['topic-a'] }),
      expect.objectContaining({ displayName: 'Dinamica', originalTopicIds: ['topic-b'] }),
    ]);
  });
});
