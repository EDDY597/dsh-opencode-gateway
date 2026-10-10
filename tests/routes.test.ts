import { describe, expect, it } from 'vitest'
import { resolveConfig } from '../src/config.ts'
import {
  projectGatewayListing,
  gatewayProfile,
  freeProfile,
} from '../src/routes.ts'
import { GO_REFUSED_MODEL_IDS, reasoningEffortsFor, lookupEntry } from '../src/registry.ts'
import { GATEWAY_DEFAULT_MODELS, FREE_DEFAULT_MODELS } from '../src/default-models.ts'

function gatewayOf(overrides: Partial<ReturnType<typeof resolveConfig>['gateway']> = {}) {
  const resolved = resolveConfig({ gateway: overrides as any })
  return resolved.gateway
}

describe('projectGatewayListing', () => {
  it('dedups ids sharing a bare model and prefers the go/ spelling', () => {
    const gateway = gatewayOf({ hiddenModels: [] })
    const ids = ['opencode-go/deepseek-v4.1-flash', 'go/deepseek-v4.1-flash']
    const projected = projectGatewayListing(ids, gateway)
    expect(projected).toHaveLength(1)
    expect(projected[0]?.id).toBe('go/deepseek-v4.1-flash')
  })

  it('hides configured prefixes', () => {
    const gateway = gatewayOf({})
    const projected = projectGatewayListing(['free/space-bunny-free', 'go/kimi-k3'], gateway)
    expect(projected.map(entry => entry.id)).toEqual(['go/kimi-k3'])
  })

  it('hides refused ids even when listed', () => {
    const gateway = gatewayOf({ hiddenModels: [] })
    const refused = GO_REFUSED_MODEL_IDS[0]
    const projected = projectGatewayListing([`go/${refused}`, 'go/kimi-k3'], gateway)
    expect(projected.map(entry => entry.id)).toEqual(['go/kimi-k3'])
  })

  it('enriches known models with the registry', () => {
    const gateway = gatewayOf({ hiddenModels: [] })
    const projected = projectGatewayListing(['go/deepseek-v4.1-flash'], gateway)
    expect(projected[0]?.name).toBe('DeepSeek V4.1 Flash')
    expect(projected[0]?.contextWindow).toBe(1_000_000)
    expect(projected[0]?.input).toEqual(['text', 'image'])
    expect(projected[0]?.reasoningEfforts).toMatchObject({ off: 'none', high: 'high' })
  })

  it('leaves unknown models addressable with no vocabulary', () => {
    const gateway = gatewayOf({ hiddenModels: [] })
    const projected = projectGatewayListing(['go/brand-new-model'], gateway)
    expect(projected[0]?.id).toBe('go/brand-new-model')
    expect(projected[0]?.name).toBeUndefined()
    expect(projected[0]?.reasoningEfforts).toBeUndefined()
  })
})

describe('reasoningEffortsFor', () => {
  it('maps off to the none spelling when the vocabulary disables through none', () => {
    const entry = lookupEntry('deepseek-v4.1-flash')
    expect(entry).toBeDefined()
    const efforts = reasoningEffortsFor(entry!)
    expect(efforts?.off).toBe('none')
    expect(efforts?.high).toBe('high')
    expect(efforts?.xhigh).toBe('xhigh')
  })

  it('maps off to off when none is refused', () => {
    const entry = lookupEntry('kimi-k2.7-code')
    const efforts = reasoningEffortsFor(entry!)
    expect(efforts?.off).toBe('off')
  })

  it('omits off entirely when thinking cannot be disabled', () => {
    const entry = lookupEntry('glm-5.3')
    const efforts = reasoningEffortsFor(entry!)
    expect(efforts?.off).toBeUndefined()
    expect(efforts?.low).toBe('low')
  })
})

describe('route profiles', () => {
  it('gateway profile default: the shipped ZCode-aligned list in order', () => {
    const resolved = resolveConfig({})
    const profile = gatewayProfile(resolved.gateway, [])
    const models = profile.piProvider?.getModels?.() ?? []
    const ids = models.map(model => model.id)
    expect(ids[0]).toBe('go/deepseek-v4.1-flash')
    expect(ids).toContain('go/kimi-k3')
    // The Go card ships subscription models only; the free tier belongs to the
    // OpenCode Free card (and its raw `opencode/` wire ids).
    expect(ids.filter(id => id.startsWith('free/'))).toEqual([])
    expect(ids).toHaveLength(8)
  })

  it('shipped lists stay disjoint: no free ids on the gateway route', () => {
    const freeIds = FREE_DEFAULT_MODELS.map(entry => entry.id.replace(/^opencode\//, ''))
    const gatewayBares = new Set(GATEWAY_DEFAULT_MODELS.map(entry => entry.id.replace(/^go\//, '')))
    for (const freeId of freeIds) {
      expect(gatewayBares.has(freeId)).toBe(false)
    }
  })

  it('gateway profile: discovered extras merge only when discoverModels is on', () => {
    const off = resolveConfig({})
    const profileOff = gatewayProfile(off.gateway, ['go/brand-new-model'])
    expect((profileOff.piProvider?.getModels?.() ?? []).some(model => model.id === 'go/brand-new-model')).toBe(false)

    const on = resolveConfig({ gateway: { discoverModels: true } })
    const profileOn = gatewayProfile(on.gateway, ['go/brand-new-model'])
    const models = profileOn.piProvider?.getModels?.() ?? []
    expect(models.some(model => model.id === 'go/brand-new-model')).toBe(true)
    expect(models.some(model => model.id === 'go/deepseek-v4.1-flash')).toBe(true)
  })

  it('gateway profile: explicit models replace the shipped list', () => {
    const resolved = resolveConfig({
      gateway: { models: [{ id: 'go/mine', name: 'Mine' }] },
    })
    const profile = gatewayProfile(resolved.gateway, [])
    const models = profile.piProvider?.getModels?.() ?? []
    expect(models.map(model => model.id)).toEqual(['go/mine'])
  })

  it('free profile default: shipped raw-id list while the backend has not answered', () => {
    const resolved = resolveConfig({})
    const profile = freeProfile(resolved.free, [])
    const models = profile.piProvider?.getModels?.() ?? []
    expect(models.map(model => model.id)).toEqual(FREE_DEFAULT_MODELS.map(entry => entry.id))
    expect(models[0]?.name).toBe('OpenCode Free/big-pickle')
  })

  it('free profile: live listing merges only when discoverModels is on', () => {
    const off = resolveConfig({})
    const profileOff = freeProfile(off.free, ['opencode/extra-model'])
    expect((profileOff.piProvider?.getModels?.() ?? []).some(model => model.id === 'opencode/extra-model')).toBe(false)

    const on = resolveConfig({ free: { discoverModels: true } })
    const profileOn = freeProfile(on.free, ['opencode/extra-model'])
    const models = profileOn.piProvider?.getModels?.() ?? []
    expect(models.some(model => model.id === 'opencode/extra-model')).toBe(true)
    expect(models[0]?.id).toBe('opencode/big-pickle')
  })

  it('free profile: explicit models override everything', () => {
    const resolved = resolveConfig({ free: { models: [{ id: 'opencode/only', name: 'Only' }] } })
    const profile = freeProfile(resolved.free, ['opencode/ignored'])
    const models = profile.piProvider?.getModels?.() ?? []
    expect(models.map(model => model.id)).toEqual(['opencode/only'])
  })

  it('profiles carry a resolved retry policy and the credential reference', () => {
    const resolved = resolveConfig({ gateway: { apiKeyEnv: 'MY_KEY' } })
    const profile = gatewayProfile(resolved.gateway, [])
    expect(profile.retryPolicy).toMatchObject({ mode: 'normal', maxRetries: 2 })
    expect(profile.apiKeyEnv).toBeDefined()
  })
})
