import { beforeEach, describe, expect, it } from 'vitest'
import { listFreeModels, parseFreeModelIds, resetFreeListingCache } from '../src/free-listing.ts'

// Verbatim shape of `opencode models` output on this machine: one
// `provider/model` per line, the subscription line interleaved with the free one.
const REAL_OUTPUT = [
  'opencode/beam-free',
  'opencode/big-pickle',
  'opencode/deepseek-v4.1-flash-free',
  'opencode/glm-5.3-flash-free',
  '',
  'opencode/longcat-2.5-preview-free',
  'opencode/mimo-v2.6-flash-free',
  'opencode/nemotron-3-ultra-free',
  'opencode/nemotron-3.5-lightning-free',
  'opencode/nemotron-3.5-super-vl-free',
  'opencode/space-bunny-free',
  'opencode-go/beam-free',
  'opencode-go/claude-haiku-5-5',
  'opencode-go/deepseek-v4-pro',
  'opencode-go/kimi-k3',
  'opencode-go/step-5-preview',
].join('\n')

describe('parseFreeModelIds', () => {
  it('keeps the free tier and drops the subscription line', () => {
    const ids = parseFreeModelIds(REAL_OUTPUT)
    expect(ids).toEqual([
      'opencode/beam-free',
      'opencode/big-pickle',
      'opencode/deepseek-v4.1-flash-free',
      'opencode/glm-5.3-flash-free',
      'opencode/longcat-2.5-preview-free',
      'opencode/mimo-v2.6-flash-free',
      'opencode/nemotron-3-ultra-free',
      'opencode/nemotron-3.5-lightning-free',
      'opencode/nemotron-3.5-super-vl-free',
      'opencode/space-bunny-free',
    ])
    expect(ids.every(id => id.startsWith('opencode/'))).toBe(true)
  })

  it('tolerates CRLF, blank lines and surrounding space', () => {
    const ids = parseFreeModelIds('  opencode/a-free  \r\n\r\nopencode/b-free\r\n')
    expect(ids).toEqual(['opencode/a-free', 'opencode/b-free'])
  })

  it('dedupes repeats and ignores an empty answer', () => {
    expect(parseFreeModelIds('opencode/a\nopencode/a\n')).toEqual(['opencode/a'])
    expect(parseFreeModelIds('')).toEqual([])
    expect(parseFreeModelIds('opencode-go/only-subscription\n')).toEqual([])
  })

  it('does not mistake a look-alike prefix for the free tier', () => {
    // `opencode-go/` must not match, and neither must a bare id.
    expect(parseFreeModelIds('opencode-go/x\nopencode\nx/opencode/y\n')).toEqual([])
  })
})

describe('listFreeModels', () => {
  beforeEach(() => resetFreeListingCache())

  it('runs the command and returns the free ids', async () => {
    const ids = await listFreeModels({ opencodePath: 'opencode', runCommand: async () => REAL_OUTPUT })
    expect(ids).toHaveLength(10)
    expect(ids[0]).toBe('opencode/beam-free')
  })

  it('reuses one answer inside the window instead of re-running', async () => {
    let runs = 0
    const runCommand = async () => { runs += 1; return REAL_OUTPUT }
    let clock = 1_000
    const now = () => clock
    await listFreeModels({ opencodePath: 'opencode', runCommand, now, cacheTtlMs: 1_000 })
    await listFreeModels({ opencodePath: 'opencode', runCommand, now, cacheTtlMs: 1_000 })
    expect(runs).toBe(1)
    // Past the window it asks again.
    clock += 1_001
    await listFreeModels({ opencodePath: 'opencode', runCommand, now, cacheTtlMs: 1_000 })
    expect(runs).toBe(2)
  })

  it('falls back to the last good answer when a run fails', async () => {
    // A transient failure must not look like the free tier disappeared.
    await listFreeModels({ opencodePath: 'opencode', runCommand: async () => REAL_OUTPUT, now: () => 0, cacheTtlMs: 1 })
    const ids = await listFreeModels({
      opencodePath: 'opencode',
      runCommand: async () => { throw new Error('spawn failed') },
      now: () => 10_000,
      cacheTtlMs: 1,
    })
    expect(ids).toHaveLength(10)
  })

  it('returns empty when nothing ever answered', async () => {
    const ids = await listFreeModels({
      opencodePath: 'opencode',
      runCommand: async () => { throw new Error('spawn failed') },
    })
    expect(ids).toEqual([])
  })
})
