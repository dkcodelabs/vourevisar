import { describe, expect, it } from 'vitest';
import { shouldExposeDebugRoutes } from './deploymentGuards';

describe('deployment guards', () => {
  it('does not expose diagnostic routes in production', () => {
    expect(shouldExposeDebugRoutes({ DEV: false, PROD: true })).toBe(false);
  });

  it('exposes diagnostic routes in development only', () => {
    expect(shouldExposeDebugRoutes({ DEV: true, PROD: false })).toBe(true);
  });
});
