import { describe, expect, it } from 'vitest'
import { RequestTimeoutError, withTimeout } from './withTimeout'

describe('withTimeout', () => {
  it('returns the request result before the deadline', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 100)).resolves.toBe('ok')
  })

  it('rejects with a typed timeout error when the request stalls', async () => {
    await expect(withTimeout(new Promise(() => {}), 1)).rejects.toBeInstanceOf(RequestTimeoutError)
  })
})
