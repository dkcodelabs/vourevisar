export type ProfileLookupResult<T> = {
  data: T | null;
  error: unknown | null;
};

type RetryProfileLookupOptions = {
  attempts?: number;
  delayMs?: number;
};

const wait = (delayMs: number) => new Promise((resolve) => setTimeout(resolve, delayMs));

/**
 * PostgREST can briefly return an empty profile row immediately after Auth
 * emits SIGNED_IN. Never interpret that first read as an orphaned account.
 */
export async function retryProfileLookup<T>(
  lookup: () => PromiseLike<ProfileLookupResult<T>>,
  { attempts = 3, delayMs = 350 }: RetryProfileLookupOptions = {},
): Promise<ProfileLookupResult<T>> {
  const totalAttempts = Math.max(1, attempts);
  let lastResult: ProfileLookupResult<T> = { data: null, error: null };

  for (let attempt = 0; attempt < totalAttempts; attempt += 1) {
    try {
      lastResult = await lookup();
    } catch (error) {
      lastResult = { data: null, error };
    }

    if (lastResult.data) return lastResult;
    if (attempt < totalAttempts - 1) await wait(delayMs);
  }

  return lastResult;
}
