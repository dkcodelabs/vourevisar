import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => {
  const chain = {
    select: vi.fn(),
    order: vi.fn(),
    eq: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    limit: vi.fn(),
  };
  Object.values(chain).forEach(method => method.mockReturnValue(chain));
  chain.limit.mockResolvedValue({ data: [{ id: 'feedback-1' }], error: null });
  return { chain, from: vi.fn(() => chain) };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: db.from },
}));

import { fetchAdminFeedbacks } from './adminFeedbackService';

describe('adminFeedbackService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('aplica filtros server-side antes de limitar o resultado', async () => {
    await expect(fetchAdminFeedbacks({
      status: 'nova',
      type: 'problema',
      startDate: '2026-09-01',
      endDate: '2026-09-02',
    })).resolves.toEqual([{ id: 'feedback-1' }]);

    expect(db.from).toHaveBeenCalledWith('user_feedback_events');
    expect(db.chain.eq).toHaveBeenCalledWith('status', 'nova');
    expect(db.chain.eq).toHaveBeenCalledWith('type', 'problema');
    expect(db.chain.gte).toHaveBeenCalledWith('created_at', expect.stringContaining('2026-09-01'));
    expect(db.chain.lte).toHaveBeenCalledWith('created_at', expect.stringContaining('2026-09-02'));
    expect(db.chain.limit).toHaveBeenCalledWith(200);
  });

  it('não aplica filtros opcionais quando o administrador escolhe todos', async () => {
    await fetchAdminFeedbacks({ status: 'todas', type: 'todos' });

    expect(db.chain.eq).not.toHaveBeenCalled();
    expect(db.chain.gte).not.toHaveBeenCalled();
    expect(db.chain.lte).not.toHaveBeenCalled();
  });
});
