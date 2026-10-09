/**
 * Live model discovery against the gateway route's endpoint.
 *
 * Discovery is advisory end to end: the route mounts immediately with the
 * configured/seed menu, and upgrades to the listing the endpoint reports once
 * it answers. Failures stay soft — the previous facts keep serving.
 *
 * @module dsh-opencode-gateway/discovery
 */

/** Bounded read cap for one listing body (an endpoint cannot exhaust memory by listing). */
const MAX_LISTING_BYTES = 8 * 1024 * 1024

/**
 * Fetch the gateway's model listing.
 * @param baseURL - the gateway endpoint, version segment included.
 * @param apiKey - the gateway token; omitted when the gateway runs unauthenticated.
 * @returns the listing ids, empty on any failure.
 */
export async function fetchGatewayListing(baseURL: string, apiKey?: string): Promise<string[]> {
  const headers: Record<string, string> = { accept: 'application/json' }
  if (apiKey !== undefined && apiKey.length > 0) headers.authorization = `Bearer ${apiKey}`
  let response: Response
  try {
    response = await fetch(`${baseURL}/models`, { method: 'GET', headers, signal: AbortSignal.timeout(10_000) })
  } catch {
    return []
  }
  if (!response.ok) return []
  let text: string
  try {
    const buffer = await response.arrayBuffer()
    if (buffer.byteLength > MAX_LISTING_BYTES) return []
    text = new TextDecoder().decode(buffer)
  } catch {
    return []
  }
  let body: any
  try {
    body = JSON.parse(text)
  } catch {
    return []
  }
  const data = Array.isArray(body) ? body : body?.data
  if (!Array.isArray(data)) return []
  return data
    .map((entry: any) => (typeof entry === 'string' ? entry : entry?.id))
    .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
}
