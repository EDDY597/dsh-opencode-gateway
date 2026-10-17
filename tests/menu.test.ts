import { describe, expect, it } from 'vitest'
import type { LlmDiscoveredModel } from '@deepseek-ai/dsh-api-remotes/client'
import { GATEWAY_DEFAULT_MODELS, FREE_DEFAULT_MODELS } from '../src/default-models.ts'
import { enrichFromRegistry, freeProfile, gatewayProfile } from '../src/routes.ts'
import { resolveConfig } from '../src/config.ts'

describe('enrichFromRegistry', () => {
  it('fills absent metadata from the bare id', () => {
    const enriched = enrichFromRegistry({ id: 'go/deepseek-v4.1-flash' })
    expect(enriched.name).toBe('DeepSeek V4.1 Flash')
    expect(enriched.contextWindow).toBe(1_000_000)
    expect(enriched.reasoningEfforts).toMatchObject({ off: 'none', max: 'max' })
    expect(enriched.input).toEqual(['text', 'image'])
  })

  it('never overrides an explicit reasoningEfforts: false', () => {
    const enriched = enrichFromRegistry({ id: 'go/deepseek-v4.1-flash', reasoningEfforts: false })
    expect(enriched.reasoningEfforts).toBe(false)
  })

  it('never overrides explicit fields', () => {
    const enriched = enrichFromRegistry({ id: 'go/glm-5.3', contextWindow: 42, name: 'Custom' })
    expect(enriched.contextWindow).toBe(42)
    expect(enriched.name).toBe('Custom')
  })

  it('leaves unknown ids untouched', () => {
    const entry = { id: 'go/brand-new' }
    expect(enrichFromRegistry(entry)).toBe(entry)
  })
})

describe('settings-driven menu', () => {
  it('a saved entry with only an id still serves with the registry vocabulary', () => {
    // Simulates what the settings page persists when the user checks a known
    // model whose route entry came from the live listing: id only, host fills.
    const resolved = resolveConfig({ gateway: { models: [{ id: 'go/kimi-k3' }] } })
    const profile = gatewayProfile(resolved.gateway, [])
    const model = (profile.piProvider?.getModels?.() ?? []).find(entry => entry.id === 'go/kimi-k3')
    expect(model).toBeDefined()
    expect(model!.contextWindow).toBe(1_048_576)
    expect(model!.reasoning).toBe(true)
    // off → 'none' (the measured disable spelling on Go)
    expect(model!.thinkingLevelMap?.off).toBe('none')
    expect(model!.thinkingLevelMap?.xhigh).toBe('xhigh')
  })

  it('an explicitly empty model list takes the menu over', () => {
    const resolved = resolveConfig({ gateway: { models: [] } })
    const profile = gatewayProfile(resolved.gateway, [])
    expect(profile.piProvider?.getModels?.() ?? []).toEqual([])
  })

  it('an absent model list inherits the shipped menu', () => {
    const resolved = resolveConfig({})
    const profile = gatewayProfile(resolved.gateway, [])
    const ids = (profile.piProvider?.getModels?.() ?? []).map(entry => entry.id)
    expect(ids).toEqual(GATEWAY_DEFAULT_MODELS.map(entry => entry.id))
  })

  it('the free route ships its raw-id defaults the same way', () => {
    const resolved = resolveConfig({})
    const profile = freeProfile(resolved.free, [])
    const ids = (profile.piProvider?.getModels?.() ?? []).map(entry => entry.id)
    expect(ids).toEqual(FREE_DEFAULT_MODELS.map(entry => entry.id))
  })

  it('entry names read Group/bare-id for the composer chip', () => {
    expect(GATEWAY_DEFAULT_MODELS[0]?.name).toBe('OpenCode Go/deepseek-v4.1-flash')
    expect(FREE_DEFAULT_MODELS[0]?.name).toBe('OpenCode Free/beam-free')
    expect(FREE_DEFAULT_MODELS.every(entry => entry.name?.startsWith('OpenCode Free/'))).toBe(true)
    expect(FREE_DEFAULT_MODELS.some(entry => entry.name === 'OpenCode Free/big-pickle')).toBe(true)
  })
})

describe('discovered rows keep their listing metadata without inventing vocabulary', () => {
  it('carries the listing facts verbatim', () => {
    const discovered: LlmDiscoveredModel = {
      id: 'go/brand-new',
      name: 'OpenCode Go/brand-new',
      contextWindow: 400_000,
      inputModalities: ['text', 'image'],
    }
    // What the settings page persists for a checked discovered row: the
    // listing facts, no invented vocabulary — the registry fill leaves it be.
    const resolved = resolveConfig({
      gateway: { models: [{ id: 'go/brand-new', name: 'OpenCode Go/brand-new', contextWindow: 400_000, input: ['text', 'image'] }] },
    })
    const model = (gatewayProfile(resolved.gateway, []).piProvider?.getModels?.() ?? [])[0]
    expect(model?.contextWindow).toBe(400_000)
    expect(model?.input).toEqual(['text', 'image'])
    // The registry knows nothing about it: no effort menu is promised.
    expect(model?.reasoning).toBe(false)
  })
})
