/**
 * Construction of the two pi-ai route profiles this plugin registers.
 *
 * A route the installed pi-ai catalog does not ship is one `createProvider`
 * call over an explicit model list; this module owns that construction —
 * registry enrichment of a live listing, capacity defaults, reasoning-vocab
 * mapping — and hands the adapter fully-built `ResolvedPiAiProviderProfile`
 * snapshots. Everything a request needs is decided here, so the adapter's own
 * snapshot machinery can treat configuration as immutable facts.
 *
 * @module dsh-opencode-gateway/routes
 */
import type { ResolvedPiAiProviderProfile, PiAiModality } from '@deepseek-ai/dsh-llm-pi-ai';
import type { ResolvedConfig, RouteModel } from './config.ts';
/**
 * Project a live gateway listing through the curated registry: dedup ids that
 * share a bare model, hide configured prefixes and refused ids, enrich known
 * models with display names, windows and effort vocabularies.
 * @param listingIds - ids the gateway's `/v1/models` answered.
 * @param gateway - the resolved gateway route config.
 * @returns menu entries in listing order, curated metadata applied.
 */
export declare function projectGatewayListing(listingIds: readonly string[], gateway: ResolvedConfig['gateway']): RouteModel[];
/**
 * Fill a model entry's absent metadata from the measured registry: only
 * fields the entry does not STATE are filled, so an explicit
 * `reasoningEfforts: false` (a declared non-reasoning model) is never
 * overridden. This is what keeps a settings-page-saved entry — which may
 * carry nothing but an id — from losing the effort menu the registry
 * measured for its bare id.
 * @param entry - the model entry as configured or saved.
 * @returns the entry with registry-known metadata filled in.
 */
export declare function enrichFromRegistry(entry: RouteModel): RouteModel;
/**
 * The gateway route's profile. The menu is the explicit `models` list — or the
 * shipped ZCode-aligned list when none is set; the gateway's full live listing
 * only merges in when `discoverModels` is on.
 * @param gateway - resolved gateway config.
 * @param listingIds - ids discovered from the gateway (possibly empty).
 */
export declare function gatewayProfile(gateway: ResolvedConfig['gateway'], listingIds: readonly string[]): ResolvedPiAiProviderProfile;
/**
 * The free route's profile. The menu is the explicit `models` list — or the
 * shipped ZCode-aligned free list when none is set; the backend's live
 * listing only merges in when `discoverModels` is on.
 * @param free - resolved free config.
 * @param liveIds - ids the inlined proxy reports, empty until its backend is healthy.
 */
export declare function freeProfile(free: ResolvedConfig['free'], liveIds: readonly string[]): ResolvedPiAiProviderProfile;
/** The provider-side catalog entries both routes contribute to the model menu. */
export declare function routeCatalog(profile: ResolvedPiAiProviderProfile): {
    models: {
        id: string;
        name: string;
    }[];
};
/** Re-exported so callers need not import pi-ai for the modality type. */
export type { PiAiModality };
