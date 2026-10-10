import { describe, expect, it } from 'vitest'
import type { LlmDiscoveredModel } from '@deepseek-ai/dsh-api-remotes/client'
import { GATEWAY_DEFAULT_MODELS } from '../src/default-models.ts'
import type { RouteModel } from '../src/config.ts'
import type { RouteRowsInput } from '../src/client/rows.ts'
import { assembleRows, discoveredEntry, effectiveModelsOf, resetOp, saveOp } from '../src/client/rows.ts'

const shipped = GATEWAY_DEFAULT_MODELS

const input = (overrides: Partial<RouteRowsInput> = {}): RouteRowsInput => ({
  effective: shipped,
  shipped,
  discovered: undefined,
  ...overrides,
})

describe('assembleRows', () => {
  it('rows ship in menu order, all enabled when they are the effective list', () => {
    const rows = assembleRows(input())
    expect(rows).toHaveLength(shipped.length)
    expect(rows.every(row => row.enabled)).toBe(true)
    expect(rows[0]?.entry.id).toBe('go/deepseek-v4.1-flash')
  })

  it('a stored list shorter than shipped demotes unchecked shipped entries below it', () => {
    const stored: RouteModel[] = [shipped[1] as RouteModel]
    const rows = assembleRows(input({ effective: stored }))
    expect(rows).toHaveLength(shipped.length)
    expect(rows[0]?.entry.id).toBe(shipped[1]?.id)
    expect(rows[0]?.enabled).toBe(true)
    expect(rows.find(row => row.entry.id === shipped[0]?.id)?.enabled).toBe(false)
  })

  it('discovered extras append after known entries, unchecked, tagged', () => {
    const discovered: LlmDiscoveredModel[] = [
      { id: 'go/brand-new', name: 'OpenCode Go/brand-new' },
      { id: shipped[0]!.id }, // already enabled — no duplicate row
    ]
    const rows = assembleRows(input({ discovered }))
    expect(rows.filter(row => row.discovered)).toHaveLength(1)
    expect(rows.at(-1)?.entry.id).toBe('go/brand-new')
    expect(rows.at(-1)?.enabled).toBe(false)
  })
})

describe('staleness after a refresh', () => {
  it('a checked model missing from the fresh listing is tagged not-listed, not dropped', () => {
    // The endpoint no longer serves go/kimi-k3 independently.
    const discovered: LlmDiscoveredModel[] = shipped
      .filter(entry => entry.id !== 'go/kimi-k3')
      .map(entry => ({ id: entry.id }))
    const rows = assembleRows(input({ discovered }))
    const stale = rows.find(row => row.entry.id === 'go/kimi-k3')
    expect(stale).toBeDefined()
    expect(stale?.enabled).toBe(true)
    expect(stale?.inListing).toBe(false)
    expect(rows.filter(row => !row.inListing)).toHaveLength(1)
  })

  it('every row is in-listing while no refresh has answered', () => {
    expect(assembleRows(input()).every(row => row.inListing)).toBe(true)
  })
})

describe('discoveredEntry', () => {
  it('keeps listing facts verbatim, inventing nothing', () => {
    const entry = discoveredEntry({ id: 'x/y', contextWindow: 1000, inputModalities: ['text'] })
    expect(entry).toEqual({ id: 'x/y', contextWindow: 1000, input: ['text'] })
  })
})

describe('saveOp', () => {
  it('writes the whole models list from the checked ids, in row order', () => {
    const rows = assembleRows(input())
    const op = saveOp('gateway', rows, new Set([shipped[1]!.id, shipped[0]!.id]))
    expect(op).toEqual({
      op: 'set',
      path: ['gateway', 'models'],
      value: [shipped[0], shipped[1]],
    })
  })

  it('an empty checked set commits an explicit empty list, not an unset', () => {
    const rows = assembleRows(input())
    const op = saveOp('gateway', rows, new Set())
    expect(op).toEqual({ op: 'set', path: ['gateway', 'models'], value: [] })
  })

  it('free route ops root at the free section', () => {
    const rows = assembleRows(input({ effective: freeShipped(), shipped: freeShipped() }))
    const op = saveOp('free', rows, new Set())
    expect(op.path).toEqual(['free', 'models'])
  })
})

describe('resetOp', () => {
  it('unsets the route models to hand the menu back to the defaults', () => {
    expect(resetOp('gateway')).toEqual({ op: 'unset', path: ['gateway', 'models'] })
  })
})

describe('effectiveModelsOf', () => {
  it('reads the route section out of the described view', () => {
    const view = { gateway: { models: [{ id: 'go/one' }] }, free: {} }
    expect(effectiveModelsOf(view, 'gateway', shipped)).toEqual([{ id: 'go/one' }])
    expect(effectiveModelsOf(view, 'free', shipped)).toEqual(shipped)
  })

  it('falls back to shipped when the view (or whole section) is absent', () => {
    expect(effectiveModelsOf(undefined, 'gateway', shipped)).toEqual(shipped)
  })
})

function freeShipped(): readonly RouteModel[] {
  return GATEWAY_DEFAULT_MODELS.filter(entry => entry.id.startsWith('free/'))
}
