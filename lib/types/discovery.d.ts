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
/** Why a listing read failed; surfaced to the settings page verbatim. */
export type GatewayListingFailure = 'auth' | 'timeout' | 'http' | 'invalid' | 'network';
/** One listing read: either ids, or the reason there are none. */
export type GatewayListingResult = {
    readonly ok: true;
    readonly ids: string[];
} | {
    readonly ok: false;
    readonly reason: GatewayListingFailure;
    readonly message: string;
};
/**
 * Fetch the gateway's model listing, reporting why an empty answer is empty.
 * @param baseURL - the gateway endpoint, version segment included.
 * @param apiKey - the gateway token; omitted when the gateway runs unauthenticated.
 * @param timeoutMs - how long to wait for headers, in milliseconds.
 * @returns the listing ids, or a typed failure.
 */
export declare function fetchGatewayListingDetailed(baseURL: string, apiKey?: string, timeoutMs?: number): Promise<GatewayListingResult>;
/**
 * Fetch the gateway's model listing (soft form: any failure reads as no ids).
 * @param baseURL - the gateway endpoint, version segment included.
 * @param apiKey - the gateway token; omitted when the gateway runs unauthenticated.
 * @returns the listing ids, empty on any failure.
 */
export declare function fetchGatewayListing(baseURL: string, apiKey?: string): Promise<string[]>;
