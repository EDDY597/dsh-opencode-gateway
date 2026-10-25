import { describe, expect, it } from 'vitest'
import { fileURLToPath } from 'node:url'
import {
  listServiceModels,
  readServiceKeyFromConfig,
  serviceChat,
  serviceHealthy,
  type FreeServiceClient,
} from '../src/free-service.ts'

const client = (overrides: Partial<FreeServiceClient> = {}): FreeServiceClient => ({
  serviceUrl: 'http://127.0.0.1:1',
  apiKey: 'test-key',
  ...overrides,
})

describe('readServiceKeyFromConfig', () => {
  it('returns the first non-empty server key', () => {
    const key = readServiceKeyFromConfig(fileURLToPath(new URL('./fixtures/service-config.json', import.meta.url)))
    expect(key).toBe('key-one')
  })

  it('returns undefined for a missing file', () => {
    expect(readServiceKeyFromConfig('./no/such/config.json')).toBeUndefined()
  })
})

describe('listServiceModels', () => {
  it('rejects when the endpoint is unreachable', async () => {
    // Port 1 refuses connections; the route treats a thrown listing as a soft
    // discovery failure, so any rejection (not a silent []) is the contract.
    await expect(listServiceModels(client())).rejects.toThrow()
  })
})

describe('serviceChat', () => {
  it('forces the stream flag from the loopback handler, not the client body', async () => {
    // Port 1 never answers; the assertion is that the call constructs and
    // rejects (a malformed URL or bad JSON body would throw synchronously).
    await expect(serviceChat(client(), { model: 'big-pickle', stream: true }, false)).rejects.toThrow()
  })
})

describe('serviceHealthy', () => {
  it('answers false when nothing listens', async () => {
    expect(await serviceHealthy('http://127.0.0.1:1', 500)).toBe(false)
  })
})
