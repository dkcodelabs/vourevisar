export function withTimeout<T>(
  promise: PromiseLike<T>,
  timeoutMs?: number,
  label?: string
): Promise<T>;
export function withTimeout(
  promise: any,
  timeoutMs?: number,
  label?: string
): Promise<any>;
export async function withTimeout(
  promise: any,
  timeoutMs = 15000,
  label = 'Operacao'
): Promise<any> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} excedeu ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
