/**
 * Live model discovery against the gateway route's endpoint.
 *
 * Discovery is advisory end to end: the route mounts immediately with the
 * configured/seed menu, and upgrades to the listing the endpoint reports once
 * it answers. Failures stay soft — the previous facts keep serving.
 *
 * @module dsh-opencode-gateway/discovery
 */
/**
 * Fetch the gateway's model listing.
 * @param baseURL - the gateway endpoint, version segment included.
 * @param apiKey - the gateway token; omitted when the gateway runs unauthenticated.
 * @returns the listing ids, empty on any failure.
 */
export declare function fetchGatewayListing(baseURL: string, apiKey?: string): Promise<string[]>;
