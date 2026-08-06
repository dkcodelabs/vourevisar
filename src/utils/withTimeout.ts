export class RequestTimeoutError extends Error {
  constructor(message = 'A solicitação demorou mais que o esperado.') {
    super(message)
    this.name = 'RequestTimeoutError'
  }
}

export function withTimeout<T>(promise: PromiseLike<T>, timeoutMs?: number, label?: string): Promise<T>;
export function withTimeout(promise: unknown, timeoutMs?: number, label?: string): Promise<unknown>;
export async function withTimeout(
  promise: unknown,
  timeoutMs = 15000,
  label = 'Operacao',
): Promise<unknown> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new RequestTimeoutError(`${label} excedeu ${timeoutMs}ms`)), timeoutMs)
  })

  try {
    return await Promise.race([Promise.resolve(promise), timeout])
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}
