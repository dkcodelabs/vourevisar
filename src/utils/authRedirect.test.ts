import { describe, expect, it } from 'vitest';
import { getPostAuthRedirect } from './authRedirect';

describe('getPostAuthRedirect', () => {
  it('keeps checkout plan and source query parameters', () => {
    expect(getPostAuthRedirect({
      pathname: '/checkout',
      search: '?plan=annual&from=subscription',
    })).toBe('/checkout?plan=annual&from=subscription');
  });

  it('supports the legacy plans redirect', () => {
    expect(getPostAuthRedirect(null, 'planos')).toBe('/planos');
  });

  it('rejects external destinations', () => {
    expect(getPostAuthRedirect(null, 'https://example.com')).toBe('/dashboard');
    expect(getPostAuthRedirect({ pathname: '//example.com' })).toBe('/dashboard');
  });
});
