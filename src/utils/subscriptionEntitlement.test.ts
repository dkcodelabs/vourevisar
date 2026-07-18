import { describe, expect, it } from 'vitest';
import { getSubscriptionEntitlement } from './subscriptionEntitlement';

const now = new Date('2026-07-16T12:00:00.000Z');

describe('getSubscriptionEntitlement', () => {
  it('does not treat an active monthly record with a past end date as active', () => {
    expect(getSubscriptionEntitlement({
      plan: 'monthly',
      status: 'active',
      subscriptionEndsAt: '2026-07-15T12:00:00.000Z',
      now,
    })).toMatchObject({
      plan: 'free_trial',
      status: 'expired',
      isActive: false,
      daysRemaining: 0,
    });
  });

  it('keeps a paid plan active when its end date is still in the future', () => {
    expect(getSubscriptionEntitlement({
      plan: 'monthly',
      status: 'active',
      subscriptionEndsAt: '2026-08-15T12:00:00.000Z',
      now,
    })).toMatchObject({
      plan: 'monthly',
      status: 'active',
      isActive: true,
      daysRemaining: 30,
    });
  });

  it('allows an active recurring plan without a local end date', () => {
    expect(getSubscriptionEntitlement({
      plan: 'annual',
      status: 'active',
      now,
    })).toMatchObject({
      plan: 'annual',
      status: 'active',
      isActive: true,
    });
  });

  it('does not keep a monthly plan active after its next billing date passed', () => {
    expect(getSubscriptionEntitlement({
      plan: 'monthly',
      status: 'active',
      nextBillingAt: '2026-06-21T12:00:00.000Z',
      now,
    })).toMatchObject({
      plan: 'free_trial',
      status: 'expired',
      isActive: false,
    });
  });
});
