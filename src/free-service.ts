/**
 * Client and lifecycle for the free route's `service` mode: the standalone Go
 * [opencode2api](https://github.com/jasonxu114514/opencode2api).
 *
 * Since Oct 2026 OpenCode rejects free-tier traffic that does not look like its
 * own client (403 FreeTierError on raw API calls) and meters the free quota per
 * egress IP (429 `Free usage limit reached`, intermittent). The Go service is
 * the working path: it speaks to the upstream with full client fidelity (uTLS
 * Bun ClientHello, OpenCode 2.1 version and `/inference` routes, byte-for-byte
 * bodies) and rotates egress exits with a per-exit cooldown.
 *
 * The route keeps its loopback listener (see ./local/loopback.ts) and swaps the
 * handler backend: every call here is a thin authenticated passthrough to the
 * service's OpenAI-compatible surface (`/v1/models`, `/v1/chat/completions`,
 * `/v1/responses`).
 *
 * @module dsh-opencode-gateway/free-service
 */

import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** How long one spawn-to-healthy wait may take before the route gives up. */
const SERVICE_START_TIMEOUT_MS = 30_000
/** Interval between health probes while waiting for the service. */
const SERVICE_START_POLL_MS = 500

/** Client for one Go opencode2api endpoint. */
export interface FreeServiceClient {
  /** The service base URL, without a version segment. */
  serviceUrl: string
  /** The service's server key (Bearer). */
  apiKey: string
}

/** Default locations of the companion gateway's service files, or nulls. */
export interface DefaultServicePaths {
  exePath: string | null
  configPath: string | null
}

/**
 * Resolve the companion gateway's `bin\opencode2api.exe` and `bin\config.json`.
 *
 * The plugin and the gateway are deployed as sibling checkouts
 * (`E:\Agent\dsh-opencode-gateway` next to `E:\Agent\opencode-api-plugin`), and
 * the gateway's start scripts keep the service binary and its config there.
 * @param packageRoot - this plugin's package root (the parent of `src/` in a
 *   source checkout, of `lib/` in a built one).
 * @returns existing paths; a missing file comes back as null.
 */
export function defaultServicePaths(pluginRoot: string): DefaultServicePaths {
  const bin = path.join(pluginRoot, '..', 'opencode-api-plugin', 'bin')
  const exePath = path.join(bin, 'opencode2api.exe')
  const configPath = path.join(bin, 'config.json')
  return {
    exePath: fs.existsSync(exePath) ? exePath : null,
    configPath: fs.existsSync(configPath) ? configPath : null,
  }
}

/**
 * Read the service's server key out of its own config file.
 *
 * This is the zero-configuration path: the plugin and the service are managed
 * by the same operator, so the key the service already requires is right there
 * in `server_keys[0]`. An explicit `serviceApiKeyEnv` still wins.
 * @param configPath - the service's config.json.
 * @returns the first enabled server key, or undefined.
 */
export function readServiceKeyFromConfig(configPath: string): string | undefined {
  try {
    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'))
    const keys = parsed?.server_keys
    if (Array.isArray(keys)) {
      for (const key of keys) {
        if (typeof key === 'string' && key.length > 0) return key
      }
    }
  } catch { /* unreadable or missing: the caller reports a clearer error */ }
  return undefined
}

/**
 * Probe the service's unauthenticated health endpoint.
 *
 * `GET /healthz` answers 200 without a key, which makes it the one request
 * that can decide "is anything listening" before credentials exist.
 */
export async function serviceHealthy(serviceUrl: string, timeoutMs = 2_000): Promise<boolean> {
  try {
    const response = await fetch(`${serviceUrl}/healthz`, { signal: AbortSignal.timeout(timeoutMs) })
    return response.ok
  } catch {
    return false
  }
}

/** How one spawned service process is tracked for disposal. */
export interface ServiceProcess {
  /** Kill the process this module spawned (a no-op for a reused service). */
  stop(): void
}

/**
 * Make sure the Go service is listening, spawning it when allowed.
 *
 * A service already listening is reused untouched (the gateway's start scripts
 * own theirs); only a process this call spawns is returned for disposal —
 * same ownership rule the embedded route applies to `opencode serve`.
 * @param options - endpoint, paths, and whether spawning is allowed.
 * @param logger - optional logger for the spawn lifecycle lines.
 * @returns the spawned process, or undefined when one was reused.
 */
export async function ensureServiceRunning(
  options: {
    serviceUrl: string
    apiKey: string
    manageService: boolean
    exePath: string
    configPath: string
  },
  logger?: { info?: (message: string) => void; error?: (message: string) => void },
): Promise<ServiceProcess | undefined> {
  if (await serviceHealthy(options.serviceUrl)) return undefined
  if (!options.manageService) {
    throw new Error(
      `the opencode2api service is not listening at ${options.serviceUrl}`
      + ' (start it, or set free.manageService: true)',
    )
  }
  if (!fs.existsSync(options.exePath)) {
    throw new Error(
      `the opencode2api service is not listening at ${options.serviceUrl}`
      + ` and the executable is missing: ${options.exePath}`
      + ' (set free.serviceExePath and free.serviceConfigPath to the companion gateway bin files)',
    )
  }
  const args = ['-config', options.configPath]
  const child = spawn(options.exePath, args, {
    stdio: 'ignore',
    cwd: path.dirname(options.exePath),
    windowsHide: true,
    detached: false,
  })
  child.on('error', (error) => {
    logger?.error?.(`opencode-gateway: failed to spawn the opencode2api service: ${error.message}`)
  })
  const deadline = Date.now() + SERVICE_START_TIMEOUT_MS
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`the opencode2api service exited during startup (code=${child.exitCode})`)
    }
    if (await serviceHealthy(options.serviceUrl, 1_000)) {
      logger?.info?.(`opencode-gateway: opencode2api service ready at ${options.serviceUrl} (spawned)`)
      return { stop: () => { try { child.kill() } catch { /* already gone */ } } }
    }
    await new Promise(resolve => setTimeout(resolve, SERVICE_START_POLL_MS))
  }
  try { child.kill() } catch { /* already gone */ }
  throw new Error(`the opencode2api service did not become healthy within ${SERVICE_START_TIMEOUT_MS}ms`)
}

/**
 * The service's free-tier model ids (its `/v1/models` answer).
 *
 * With the companion config's `models.free_only: true` the listing is already
 * exactly the free tier, so no filtering happens here.
 * @returns bare model ids (`big-pickle`), in listing order.
 */
export async function listServiceModels(client: FreeServiceClient): Promise<string[]> {
  const response = await fetch(`${client.serviceUrl}/v1/models`, {
    headers: { authorization: `Bearer ${client.apiKey}` },
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) {
    throw new Error(`opencode2api /v1/models answered ${response.status}`)
  }
  const payload = await response.json() as { data?: { id?: unknown }[] }
  const ids: string[] = []
  for (const entry of payload?.data ?? []) {
    if (typeof entry?.id === 'string' && entry.id.length > 0) ids.push(entry.id)
  }
  return ids
}

/**
 * Chat Completions passthrough.
 *
 * The loopback server hands the parsed body over; this re-serializes it so
 * the service sees the exact JSON the client sent, and returns the fetch
 * `Response` (streaming body included) for the loopback to relay.
 */
export async function serviceChat(client: FreeServiceClient, body: any, stream: boolean): Promise<Response> {
  return fetch(`${client.serviceUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${client.apiKey}` },
    body: JSON.stringify({ ...body, stream }),
    signal: AbortSignal.timeout(600_000),
  })
}

/**
 * Responses API passthrough, same contract as {@link serviceChat}. The Go
 * service exposes `/v1/responses` natively, so no protocol conversion happens
 * on either side.
 */
export async function serviceResponses(client: FreeServiceClient, body: any, stream: boolean): Promise<Response> {
  return fetch(`${client.serviceUrl}/v1/responses`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${client.apiKey}` },
    body: JSON.stringify({ ...body, stream }),
    signal: AbortSignal.timeout(600_000),
  })
}

/** This module's own directory, for sibling-path resolution. */
export function moduleDirname(importMetaUrl: string): string {
  return path.dirname(fileURLToPath(importMetaUrl))
}
