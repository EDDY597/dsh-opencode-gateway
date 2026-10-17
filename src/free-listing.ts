/**
 * The free route's candidate listing, taken from opencode's own answer.
 *
 * The card cannot use the local backend's provider config for this. That view
 * is CREDENTIALED: with `OPENCODE_API_KEY` set, the backend's `opencode`
 * provider reports the paid catalog alongside the free one (measured: 84 models
 * of which 10 are cost-zero), so filtering it by `cost` produced a set that
 * disagreed with what opencode itself shows — it missed free models the
 * credentialed view does not carry at all and kept region-blocked ones it does.
 *
 * `opencode models` answers the free tier exactly when that key is absent, and
 * the `opencode/` prefix separates it from the `opencode-go/` subscription
 * line. The command is the same one the CLI's own model list comes from, so
 * the card and the CLI agree by construction.
 *
 * @module dsh-opencode-gateway/free-listing
 */

import { spawn } from 'node:child_process'

/** Longest one `opencode models` run may take before it is killed. */
const COMMAND_TIMEOUT_MS = 30_000

/**
 * How long one answer is reused. The free tier changes on the order of days,
 * and the route polls its listing every minute, so an uncached call would spawn
 * a process 60 times an hour.
 */
const DEFAULT_CACHE_TTL_MS = 10 * 60 * 1000

/** Provider prefix the free tier is listed under (the subscription line is `opencode-go/`). */
const FREE_LISTING_PREFIX = 'opencode/'

/** One cached answer, shared by every call in this process. */
let cache: { at: number; ids: string[] } | undefined

/** Drop the cached answer (tests, and any explicit refresh that wants a re-read). */
export function resetFreeListingCache(): void {
  cache = undefined
}

/** How the free listing is produced; every field has a production default. */
export interface FreeListingOptions {
  /** opencode executable, as configured on the free route. */
  opencodePath: string
  /** Reuse window for one answer. */
  cacheTtlMs?: number
  /** Clock, injectable for tests. */
  now?: () => number
  /** Command runner, injectable for tests. */
  runCommand?: (opencodePath: string) => Promise<string>
}

/**
 * The free tier's model ids, as opencode reports them.
 *
 * A failed run falls back to the last good answer rather than to an empty
 * list, so a transient spawn failure cannot make the card look like the free
 * tier vanished.
 * @param options - executable path plus test seams.
 * @returns `opencode/<id>` entries; empty only when nothing ever answered.
 */
export async function listFreeModels(options: FreeListingOptions): Promise<string[]> {
  const ttl = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS
  const now = options.now ?? Date.now
  if (cache !== undefined && now() - cache.at < ttl) return cache.ids
  const run = options.runCommand ?? runOpencodeModels
  try {
    const stdout = await run(options.opencodePath)
    const ids = parseFreeModelIds(stdout)
    // A successful run that names no free model is a real (if unlikely) answer;
    // an empty result is still cached so the card does not re-spawn per poll.
    cache = { at: now(), ids }
    return ids
  } catch {
    return cache?.ids ?? []
  }
}

/**
 * Reduce `opencode models` output to the free tier's ids.
 *
 * The command prints one `provider/model` per line; everything outside the
 * `opencode/` prefix belongs to another provider (the `opencode-go/`
 * subscription line in particular) and is not part of the free tier.
 * @param stdout - the command's standard output.
 * @returns unique `opencode/<id>` entries in the order printed.
 */
export function parseFreeModelIds(stdout: string): string[] {
  const seen = new Set<string>()
  const ids: string[] = []
  for (const rawLine of stdout.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line.startsWith(FREE_LISTING_PREFIX)) continue
    if (seen.has(line)) continue
    seen.add(line)
    ids.push(line)
  }
  return ids
}

/** Run `opencode models` once and return its stdout. */
function runOpencodeModels(opencodePath: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    // Drop the Zen key for this child only: with it set, opencode reports the
    // paid catalog mixed in and the free tier can no longer be read off the id
    // list (the command prints ids without cost data).
    const env: NodeJS.ProcessEnv = { ...process.env }
    delete env.OPENCODE_API_KEY
    delete env.OPENCODE_ZEN_API_KEY

    // Windows installs opencode behind a .cmd shim, which cannot be spawned
    // directly, and a bare command name needs the shell to resolve through
    // PATHEXT. An already-resolved executable does not — and keeping the shell
    // off for one avoids Node's DEP0190 warning about unescaped shell args.
    const extension = /\.([a-z0-9]+)$/i.exec(opencodePath)?.[1]?.toLowerCase()
    const useShell = extension === 'cmd' || extension === 'bat'
      || (process.platform === 'win32' && extension === undefined)

    let child
    try {
      child = spawn(opencodePath, ['models'], {
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: useShell,
        windowsHide: true,
      })
    } catch (error) {
      reject(error)
      return
    }

    let stdout = ''
    let stderr = ''
    let settled = false
    const finish = (action: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      action()
    }
    const timer = setTimeout(() => {
      finish(() => {
        try { child.kill() } catch { /* already gone */ }
        reject(new Error(`opencode models timed out after ${COMMAND_TIMEOUT_MS}ms`))
      })
    }, COMMAND_TIMEOUT_MS)
    timer.unref?.()

    child.stdout?.on('data', (chunk: Buffer | string) => { stdout += String(chunk) })
    child.stderr?.on('data', (chunk: Buffer | string) => { stderr += String(chunk) })
    child.on('error', (error) => finish(() => reject(error)))
    child.on('close', (code) => finish(() => {
      if (code === 0) resolve(stdout)
      else reject(new Error(`opencode models exited with ${code}: ${stderr.trim().slice(0, 200)}`))
    }))
  })
}
