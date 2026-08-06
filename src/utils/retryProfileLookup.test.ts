import { describe, expect, it, vi } from 'vitest';
import { retryProfileLookup } from './retryProfileLookup';

describe('retryProfileLookup', () => {
  it('retries an empty profile before accepting the row', async () => {
    const lookup = vi
      .fn<() => Promise<{ data: { id: string } | null; error: null }>>()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { id: 'profile-1' }, error: null });

    const result = await retryProfileLookup(lookup, { attempts: 2, delayMs: 0 });

    expect(result).toEqual({ data: { id: 'profile-1' }, error: null });
    expect(lookup).toHaveBeenCalledTimes(2);
  });

  it('does not turn a transient lookup error into a successful profile', async () => {
    const error = { status: 401, message: 'token is still propagating' };
    const lookup = vi.fn().mockResolvedValue({ data: null, error });

    const result = await retryProfileLookup(lookup, { attempts: 2, delayMs: 0 });

    expect(result).toEqual({ data: null, error });
    expect(lookup).toHaveBeenCalledTimes(2);
  });

  it('returns an empty result only after all attempts are exhausted', async () => {
    const lookup = vi.fn().mockResolvedValue({ data: null, error: null });

    const result = await retryProfileLookup(lookup, { attempts: 3, delayMs: 0 });

    expect(result).toEqual({ data: null, error: null });
    expect(lookup).toHaveBeenCalledTimes(3);
  });
});
