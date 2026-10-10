import { describe, expect, it } from 'vitest'
import { Config, DEFAULT_CONFIG, readSection, resolveConfig, type Config as ConfigShape } from '../src/config.ts'
import { gatewayProfile } from '../src/routes.ts'
import { GATEWAY_DEFAULT_MODELS } from '../src/default-models.ts'

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
    expect(resolved.free.proxyPort).toBe(10102)
    expect(resolved.free.internalAllowedTools).toEqual(['webfetch', 'bash', 'websearch'])
  })

  it('trails slashes off the endpoints', () => {
    const resolved = resolveConfig({ gateway: { baseURL: 'http://127.0.0.1:8787/v1/' }, free: { serverUrl: 'http://127.0.0.1:10001/' } })
    expect(resolved.gateway.baseURL).toBe('http://127.0.0.1:8787/v1')
    expect(resolved.free.serverUrl).toBe('http://127.0.0.1:10001')
  })
})

describe('resolveConfig validation', () => {
  const base: ConfigShape = {}

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

describe('schema materialization', () => {
  // Schemastery hands a caller who never mentioned a list back an empty one,
  // which both runtimes read as a deliberate "no models". The route schemas
  // keep an omitted list omitted; these cases pin that down.
  // Sections are volatile refs in the composed config: unwrap before reading.
  const materialize = (input: unknown) => readSection((Config(input as ConfigShape) as { gateway?: unknown }).gateway as never)

  it('keeps an omitted model list omitted', () => {
    const materialized = materialize({ gateway: { baseURL: 'http://127.0.0.1:9/v1' } })
    expect(materialized?.models).toBeUndefined()
    const resolved = resolveConfig({ gateway: materialized })
    expect(resolved.gateway.models).toBeUndefined()
    expect(gatewayProfile(resolved.gateway, []).piProvider?.getModels?.() ?? [])
      .toHaveLength(GATEWAY_DEFAULT_MODELS.length)
  })

  it('keeps an entry without input valid', () => {
    const materialized = materialize({ gateway: { models: [{ id: 'go/glm-5.3-flash' }] } })
    expect(materialized?.models).toEqual([{ id: 'go/glm-5.3-flash' }])
    expect(() => resolveConfig({ gateway: materialized })).not.toThrow()
  })

  it('keeps an explicit empty list empty', () => {
    const materialized = materialize({ gateway: { models: [] } })
    expect(materialized?.models).toEqual([])
    const resolved = resolveConfig({ gateway: materialized })
    expect(gatewayProfile(resolved.gateway, []).piProvider?.getModels?.() ?? []).toHaveLength(0)
  })

  it('ships defaults without an explicit list', () => {
    expect(DEFAULT_CONFIG.gateway?.models).toBeUndefined()
    expect(DEFAULT_CONFIG.free?.models).toBeUndefined()
  })
})
