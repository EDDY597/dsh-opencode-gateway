// End-to-end check of the free listing against a real `opencode models` run.
// Skipped unless OPENCODE_LIVE_CHECK=1, so the suite never needs the CLI.
import { describe, expect, it } from 'vitest'
import { resolveConfig } from '../src/config.ts'
import { resolveOpencodePath } from '../src/local/backend.ts'
import { listFreeModels, resetFreeListingCache } from '../src/free-listing.ts'

const LIVE = process.env.OPENCODE_LIVE_CHECK === '1'

describe.runIf(LIVE)('free listing from opencode itself', () => {
  it('reports the free tier and nothing from the subscription line', async () => {
    resetFreeListingCache()
    const free = resolveConfig({}).free
    const executable = resolveOpencodePath(free.opencodePath).path ?? free.opencodePath
    const ids = await listFreeModels({ opencodePath: executable })

    console.log(`executable: ${executable}`)
    console.log(`free tier:  ${ids.length} models`)
    for (const id of ids) console.log(`  ${id}`)

    expect(ids.length).toBeGreaterThan(0)
    expect(ids.every(id => id.startsWith('opencode/'))).toBe(true)
    // The subscription line must never leak into the free card.
    expect(ids.some(id => id.startsWith('opencode-go/'))).toBe(false)
    expect(new Set(ids).size).toBe(ids.length)
  }, 60_000)
})
