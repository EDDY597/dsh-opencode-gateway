/**
 * Live model discovery against the gateway route's endpoint.
 *
 * Discovery is advisory end to end: the route mounts immediately with the
 * configured/seed menu, and upgrades to the listing the endpoint reports once
 * it answers. Failures stay soft — the previous facts keep serving.
 *
 * The settings page's manual refresh is NOT soft: it needs to tell "the
 * endpoint has no models" apart from "the endpoint never answered", so the
 * detailed form reports the failure kind instead of collapsing every path to
 * an empty id list.
 *
 * @module dsh-opencode-gateway/discovery
 */

/** Bounded read cap for one listing body (an endpoint cannot exhaust memory by listing). */
const MAX_LISTING_BYTES = 8 * 1024 * 1024

/** How long the settings page's refresh waits for an answer. */
const REFRESH_TIMEOUT_MS = 60_000

/** How long the background poll waits; keeps boot retries quick. */
const POLL_TIMEOUT_MS = 10_000

/** Why a listing read failed; surfaced to the settings page verbatim. */
export type GatewayListingFailure = 'auth' | 'timeout' | 'http' | 'invalid' | 'network'

/** One listing read: either ids, or the reason there are none. */
export type GatewayListingResult =
  | { readonly ok: true; readonly ids: string[] }
  | { readonly ok: false; readonly reason: GatewayListingFailure; readonly message: string }

/**
 * Fetch the gateway's model listing, reporting why an empty answer is empty.
 * @param baseURL - the gateway endpoint, version segment included.
 * @param apiKey - the gateway token; omitted when the gateway runs unauthenticated.
 * @param timeoutMs - how long to wait for headers, in milliseconds.
 * @returns the listing ids, or a typed failure.
 */
export async function fetchGatewayListingDetailed(
  baseURL: string,
  apiKey?: string,
  timeoutMs = REFRESH_TIMEOUT_MS,
): Promise<GatewayListingResult> {
  const headers: Record<string, string> = { accept: 'application/json' }
  if (apiKey !== undefined && apiKey.length > 0) headers.authorization = `Bearer ${apiKey}`
  let response: Response
  try {
    response = await fetch(`${baseURL}/models`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (error: any) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      const waited = timeoutMs >= 1000 ? `${Math.round(timeoutMs / 1000)}s` : `${timeoutMs}ms`
      return { ok: false, reason: 'timeout', message: `no answer within ${waited}` }
    }
    const cause = error?.cause?.message ?? error?.message ?? 'connection failed'
    return { ok: false, reason: 'network', message: cause }
  }
  if (response.status === 401 || response.status === 403) {
    return {
      ok: false,
      reason: 'auth',
      message: `HTTP ${response.status} — the gateway rejected the token (set OPENCODE_GATEWAY_KEY in ~/.dsh/.env)`,
    }
  }
  if (!response.ok) return { ok: false, reason: 'http', message: `HTTP ${response.status} ${response.statusText}`.trim() }
  let text: string
  try {
    const buffer = await response.arrayBuffer()
    if (buffer.byteLength > MAX_LISTING_BYTES) {
      return { ok: false, reason: 'invalid', message: 'listing body is too large' }
    }
    text = new TextDecoder().decode(buffer)
  } catch (error: any) {
    return { ok: false, reason: 'network', message: error?.message ?? 'listing body read failed' }
  }
  let body: any
  try {
    body = JSON.parse(text)
  } catch {
    return { ok: false, reason: 'invalid', message: 'listing is not JSON' }
  }
  const data = Array.isArray(body) ? body : body?.data
  if (!Array.isArray(data)) return { ok: false, reason: 'invalid', message: 'listing has no data array' }
  const ids = data
    .map((entry: any) => (typeof entry === 'string' ? entry : entry?.id))
    .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
  return { ok: true, ids }
}

/**
 * Fetch the gateway's model listing (soft form: any failure reads as no ids).
 * @param baseURL - the gateway endpoint, version segment included.
 * @param apiKey - the gateway token; omitted when the gateway runs unauthenticated.
 * @returns the listing ids, empty on any failure.
 */
export async function fetchGatewayListing(baseURL: string, apiKey?: string): Promise<string[]> {
  const result = await fetchGatewayListingDetailed(baseURL, apiKey, POLL_TIMEOUT_MS)
  return result.ok ? result.ids : []
}
