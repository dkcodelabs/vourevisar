type RetryAsyncOptions = {
  attempts?: number;
  delayMs?: number;
};

const wait = (delayMs: number) => new Promise((resolve) => setTimeout(resolve, delayMs));

/** Retries a read that can fail transiently without duplicating mutations. */
export async function retryAsync<T>(
  operation: () => Promise<T>,
  { attempts = 3, delayMs = 350 }: RetryAsyncOptions = {},
): Promise<T> {
  const totalAttempts = Math.max(1, attempts);
  let lastError: unknown;

  for (let attempt = 0; attempt < totalAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < totalAttempts - 1) await wait(delayMs);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('A leitura falhou após novas tentativas.');
}
