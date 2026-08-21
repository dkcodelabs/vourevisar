import { describe, expect, it } from 'vitest';
import { resolveBillingRefundReconciliationStatus } from '../../supabase/functions/_shared/billingRefundReconciliation';

describe('billing refund administrative reconciliation', () => {
  it.each([
    ['missing provider refund', false, false, true, null, 'manual_review'],
    ['provider mismatch', true, false, true, 'succeeded', 'manual_review'],
    ['cancellation failure', true, true, false, 'succeeded', 'manual_review'],
    ['provider pending', true, true, true, 'pending', 'pending'],
    ['provider succeeded', true, true, true, 'succeeded', 'succeeded'],
    ['provider failed', true, true, true, 'failed', 'failed'],
  ] as const)(
    'maps %s without issuing another refund',
    (_case, refundFound, refundMatches, cancellationSucceeded, providerStatus, expected) => {
      expect(resolveBillingRefundReconciliationStatus({
        refundFound,
        refundMatches,
        cancellationSucceeded,
        providerStatus,
      })).toBe(expected);
    },
  );
});
