import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  useAuth: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: mocks.useAuth }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from } }));

import { useUserRole } from './useUserRole';

describe('useUserRole', () => {
  beforeEach(() => {
    mocks.useAuth.mockReturnValue({ user: null });
    mocks.from.mockReturnValue({
      select: () => ({
        eq: () => Promise.resolve({ data: [{ role: 'owner' }], error: null }),
      }),
    });
  });

  it('keeps role access loading when auth changes from no user to a signed-in user', async () => {
    const { result, rerender } = renderHook(() => useUserRole());

    await waitFor(() => expect(result.current.loading).toBe(false));

    mocks.useAuth.mockReturnValue({ user: { id: 'owner-1' } });
    rerender();

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.isOwner).toBe(true));
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.loading).toBe(false);
  });
});
