import { describe, expect, it, vi } from 'vitest';
import { retryAsync } from './retryAsync';

describe('retryAsync', () => {
  it('returns the value after a transient failure', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('temporarily unavailable'))
      .mockResolvedValue('ok');

    await expect(retryAsync(operation, { delayMs: 0 })).resolves.toBe('ok');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('does not retry after a successful read with a null value', async () => {
    const operation = vi.fn().mockResolvedValue(null);

    await expect(retryAsync(operation, { delayMs: 0 })).resolves.toBeNull();
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('throws the last error after exhausting attempts', async () => {
    const error = new Error('server unavailable');
    const operation = vi.fn().mockRejectedValue(error);

    await expect(retryAsync(operation, { attempts: 2, delayMs: 0 })).rejects.toBe(error);
    expect(operation).toHaveBeenCalledTimes(2);
  });
});
