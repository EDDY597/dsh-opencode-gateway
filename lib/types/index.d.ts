/**
 * OpenCode gateway provider plugin.
 *
 * Two pi-ai-backed routes land on the Harness LLM seam:
 *
 * - `opencode-gateway` — the local opencode-api-plugin gateway (OpenAI Chat
 *   Completions; the gateway fronts OpenCode Go, OpenCode Zen and any custom
 *   upstreams its own config aggregates, and fixes the protocol-level quirks
 *   server-side). Credential: `OPENCODE_GATEWAY_KEY`, any non-empty value
 *   while the gateway runs without a token.
 * - `opencode-free` — the inlined opencode2api local proxy driving this
 *   machine's `opencode serve` backend for the Zen free tier. Works with no
 *   gateway process; the backend spawns on first use.
 *
 * Both routes mount immediately with configured/seed menus, then upgrade to
 * the live listing discovery reports; discovery failures stay soft. The
 * plugin's Config IS the settings form (volatile sections): the settings
 * page's model checkboxes write the `models` lists, and a write reaches the
 * running plugin through the volatile refs without a remount.
 *
 * @module dsh-opencode-gateway
 */
import type { Context } from '@deepseek-ai/cordis';
import type { ResolvedPiAiProviderProfile } from '@deepseek-ai/dsh-llm-pi-ai';
import type { Config as ConfigShape } from './config.ts';
export { Config, DEFAULT_CONFIG, readSection } from './config.ts';
export type { GatewayConfig, FreeConfig, ResolvedConfig, RouteModel } from './config.ts';
export { fetchGatewayListing } from './discovery.ts';
export { emptyCredentialStore, minimalAuthContext, readLocalOpencodeKey, resolveCredential } from './credentials.ts';
export { enrichFromRegistry, freeProfile, gatewayProfile, projectGatewayListing } from './routes.ts';
export { GO_OFFICIAL_PREFIXES, GO_REGISTRY, reasoningEffortsFor } from './registry.ts';
export { listFreeModels, parseFreeModelIds, resetFreeListingCache } from './free-listing.ts';
export { defaultServicePaths, listServiceModels, readServiceKeyFromConfig, serviceHealthy, } from './free-service.ts';
export type { FreeServiceClient, ServiceProcess } from './free-service.ts';
export type { FreeMode } from './config.ts';
export { GATEWAY_DEFAULT_MODELS, FREE_DEFAULT_MODELS } from './default-models.ts';
/** Cordis plugin name; also the log and error-message prefix, the discovery key, and the settings form namespace. */
export declare const name = "opencode-gateway";
/** Services required by this provider plugin. */
export declare const inject: string[];
/** Menu entries one route contributes to the model picker. */
interface MenuModel {
    id: string;
    name: string;
}
interface RouteState {
    profile: ResolvedPiAiProviderProfile;
    menu: MenuModel[];
}
/** Install both routes on the LLM seam. */
export declare function apply(ctx: Context, config: ConfigShape): void;
export type { MenuModel, RouteState };
