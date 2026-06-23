import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseMock = vi.hoisted(() => {
  const maybeSingle = vi.fn();
  const eq = vi.fn();
  const select = vi.fn();
  const chain = { select, eq, maybeSingle };

  select.mockReturnValue(chain);
  eq.mockReturnValue(chain);

  return {
    chain,
    maybeSingle,
    eq,
    select,
    from: vi.fn(() => chain),
  };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: supabaseMock.from },
}));

import {
  buildPendingReviewAdjustments,
  fetchTopicExamDate,
  getOverdueDays,
} from './topicReviewScheduleService';

describe('topicReviewScheduleService', () => {
  beforeEach(() => {
    supabaseMock.from.mockClear();
    supabaseMock.select.mockClear();
    supabaseMock.eq.mockClear();
    supabaseMock.maybeSingle.mockReset();
  });

  it('não consulta o banco quando o tópico não pertence a um edital', async () => {
    await expect(fetchTopicExamDate(null, 'user-1')).resolves.toBeNull();
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it('lê a data da prova pelo edital pertencente ao usuário', async () => {
    supabaseMock.maybeSingle.mockResolvedValue({
      data: { exam_date: '2026-10-18' },
      error: null,
    });

    const result = await fetchTopicExamDate('edital-1', 'user-1');

    expect(result).toEqual(new Date(2026, 9, 18));
    expect(supabaseMock.from).toHaveBeenCalledWith('user_editais');
    expect(supabaseMock.select).toHaveBeenCalledWith('exam_date');
    expect(supabaseMock.eq).toHaveBeenCalledWith('id', 'edital-1');
    expect(supabaseMock.eq).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('retorna nulo quando o edital ainda não tem data', async () => {
    supabaseMock.maybeSingle.mockResolvedValue({
      data: { exam_date: null },
      error: null,
    });

    await expect(fetchTopicExamDate('edital-1', 'user-1')).resolves.toBeNull();
  });

  it('calcula somente dias reais de atraso da revisão concluída', () => {
    const reference = new Date(2026, 5, 22, 12, 0, 0);

    expect(getOverdueDays('2026-06-20T09:00:00.000Z', reference)).toBe(2);
    expect(getOverdueDays('2026-06-22T09:00:00.000Z', reference)).toBe(0);
    expect(getOverdueDays('2026-06-25T09:00:00.000Z', reference)).toBe(0);
    expect(getOverdueDays(null, reference)).toBe(0);
  });

  it('comprime somente agendas futuras que ultrapassam a proteção da prova', () => {
    const adjustments = buildPendingReviewAdjustments(
      [
        {
          id: 'long-review',
          last_reviewed_at: '2026-06-22T12:00:00.000Z',
          current_interval: 90,
          next_review: '2026-09-20T03:00:00.000Z',
        },
        {
          id: 'short-review',
          last_reviewed_at: '2026-06-22T12:00:00.000Z',
          current_interval: 7,
          next_review: '2026-06-29T03:00:00.000Z',
        },
        {
          id: 'unknown-interval',
          last_reviewed_at: '2026-06-22T12:00:00.000Z',
          current_interval: 0,
          next_review: null,
        },
      ],
      '2026-08-20',
    );

    expect(adjustments).toHaveLength(1);
    expect(adjustments[0].id).toBe('long-review');
    expect(new Date(adjustments[0].nextReview).getDate()).toBe(13);
    expect(new Date(adjustments[0].nextReview).getMonth()).toBe(7);
  });

  it('restaura o intervalo cognitivo quando a data da prova é removida', () => {
    const adjustments = buildPendingReviewAdjustments(
      [{
        id: 'compressed-review',
        last_reviewed_at: '2026-06-22T12:00:00.000Z',
        current_interval: 90,
        next_review: '2026-08-13T03:00:00.000Z',
      }],
      null,
    );

    expect(adjustments).toHaveLength(1);
    expect(new Date(adjustments[0].nextReview).getDate()).toBe(20);
    expect(new Date(adjustments[0].nextReview).getMonth()).toBe(8);
  });

});
