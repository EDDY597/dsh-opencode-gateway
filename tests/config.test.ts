import { describe, expect, it } from 'vitest'
import { resolveConfig, type Config } from '../src/config.ts'

describe('resolveConfig defaults', () => {
  it('fills both routes from defaults when the config is empty', () => {
    const resolved = resolveConfig({})
    expect(resolved.gateway.provider).toBe('opencode-gateway')
    expect(resolved.gateway.baseURL).toBe('http://127.0.0.1:8787/v1')
    expect(resolved.gateway.apiKeyEnv).toBe('OPENCODE_GATEWAY_KEY')
    expect(resolved.gateway.hiddenModels).toEqual(['free/'])
    expect(resolved.gateway.retryPolicy).toMatchObject({ mode: 'normal', maxRetries: 0 })
    expect(resolved.free.provider).toBe('opencode-free')
    expect(resolved.free.serverUrl).toBe('http://127.0.0.1:10001')
    expect(resolved.free.proxyPort).toBe(10002)
    expect(resolved.free.internalAllowedTools).toEqual(['webfetch', 'bash', 'websearch'])
  })

  it('trails slashes off the endpoints', () => {
    const resolved = resolveConfig({ gateway: { baseURL: 'http://127.0.0.1:8787/v1/' }, free: { serverUrl: 'http://127.0.0.1:10001/' } })
    expect(resolved.gateway.baseURL).toBe('http://127.0.0.1:8787/v1')
    expect(resolved.free.serverUrl).toBe('http://127.0.0.1:10001')
  })
})

describe('resolveConfig validation', () => {
  const base: Config = {}

  it('refuses identical provider keys', () => {
    expect(() => resolveConfig({ gateway: { provider: 'x' }, free: { provider: 'x' } })).toThrow(/both routes/)
  })

  it('refuses an empty baseURL', () => {
    expect(() => resolveConfig({ ...base, gateway: { baseURL: '' } })).toThrow(/baseURL/)
  })

  it('refuses duplicate model ids in one list', () => {
    expect(() => resolveConfig({ gateway: { models: [{ id: 'a' }, { id: 'a' }] } })).toThrow(/more than once/)
  })

  it('refuses a reasoningEfforts dict with no level beyond off', () => {
    expect(() => resolveConfig({ gateway: { models: [{ id: 'a', reasoningEfforts: { off: 'none' } }] } })).toThrow(/offers no level/)
  })

  it('refuses a null wire value on a non-off level', () => {
    expect(() => resolveConfig({ gateway: { models: [{ id: 'a', reasoningEfforts: { off: 'none', low: null } }] } })).toThrow(/only "off"/)
  })

  it('refuses an empty input list', () => {
    expect(() => resolveConfig({ gateway: { models: [{ id: 'a', input: [] }] } })).toThrow(/at least one modality/)
  })

  it('refuses a non-standard prompt mode', () => {
    expect(() => resolveConfig({ free: { promptMode: 'weird' } })).toThrow(/promptMode/)
  })

  it('refuses a non-positive proxy port', () => {
    expect(() => resolveConfig({ free: { proxyPort: 0 } })).toThrow(/proxyPort/)
  })
})
