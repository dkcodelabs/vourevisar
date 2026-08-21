import { describe, expect, it } from 'vitest';
import { isWithinWithdrawalWindow } from '../../supabase/functions/_shared/billingWithdrawal';

describe('consumer withdrawal window', () => {
  const startedAt = '2026-08-21T12:00:00.000Z';
  const deadline = '2026-08-28T12:00:00.000Z';

  it('accepts the exact start and exact legal deadline', () => {
    expect(isWithinWithdrawalWindow(Date.parse(startedAt), startedAt, deadline)).toBe(true);
    expect(isWithinWithdrawalWindow(Date.parse(deadline), startedAt, deadline)).toBe(true);
  });

  it('rejects instants before the contract and after the deadline', () => {
    expect(isWithinWithdrawalWindow(Date.parse(startedAt) - 1, startedAt, deadline)).toBe(false);
    expect(isWithinWithdrawalWindow(Date.parse(deadline) + 1, startedAt, deadline)).toBe(false);
  });

  it('fails closed for invalid or inverted timestamps', () => {
    expect(isWithinWithdrawalWindow(Date.now(), 'invalid', deadline)).toBe(false);
    expect(isWithinWithdrawalWindow(Date.now(), deadline, startedAt)).toBe(false);
  });
});
