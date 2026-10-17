// End-to-end check of the official-only projection against the LIVE gateway.
// Skipped unless OPENCODE_LIVE_CHECK=1, so the suite never needs a running host.
import { describe, expect, it } from 'vitest'
import { resolveConfig } from '../src/config.ts'
import { projectGatewayListing } from '../src/routes.ts'
import { GO_OFFICIAL_PREFIXES } from '../src/registry.ts'

const LIVE = process.env.OPENCODE_LIVE_CHECK === '1'

describe.runIf(LIVE)('official-only Go menu from the live gateway', () => {
  it('keeps the official prefix and drops every other source', async () => {
    const response = await fetch('http://127.0.0.1:8787/v1/models')
    const body: any = await response.json()
    const ids: string[] = (Array.isArray(body) ? body : body.data)
      .map((entry: any) => (typeof entry === 'string' ? entry : entry.id))

    const projected = projectGatewayListing(ids, resolveConfig({}).gateway)
    const prefixOf = (id: string) => (id.indexOf('/') > 0 ? id.slice(0, id.indexOf('/')) : '(none)')

    const byPrefix = new Map<string, number>()
    for (const id of ids) byPrefix.set(prefixOf(id), (byPrefix.get(prefixOf(id)) ?? 0) + 1)

    console.log(`gateway listing: ${ids.length} ids`)
    for (const [prefix, count] of [...byPrefix].sort((a, b) => b[1] - a[1])) {
      const kept = GO_OFFICIAL_PREFIXES.includes(prefix) ? '(official — kept)' : '(excluded)'
      console.log(`  ${prefix.padEnd(14)} ${String(count).padStart(4)}  ${kept}`)
    }
    console.log(`projected official menu: ${projected.length}`)
    console.log(`  without curated metadata: ${projected.filter(e => e.name === undefined).length}`)
    console.log('--- projected ---')
    for (const entry of projected) {
      const facts = [
        entry.contextWindow === undefined ? 'window?' : `${Math.round(entry.contextWindow / 1024)}K`,
        entry.input?.includes('image') === true ? 'vision' : 'text',
        entry.reasoningEfforts === undefined ? 'no-effort-menu' : 'effort-menu',
      ]
      console.log(`  ${entry.id.padEnd(34)} ${facts.join('  ')}`)
    }

    // Every kept id is official, and every id is kept exactly once.
    expect(projected.every(entry => GO_OFFICIAL_PREFIXES.includes(prefixOf(entry.id)))).toBe(true)
    expect(new Set(projected.map(entry => entry.id)).size).toBe(projected.length)
    expect(projected.length).toBeGreaterThan(0)
  })
})
