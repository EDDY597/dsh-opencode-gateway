/**
 * The shipped model menus.
 *
 * The gateway route ships exactly the eight OpenCode Go subscription models
 * from the user's ZCode provider config, enriched with the measured OpenCode
 * Go registry (windows, effort vocabularies, vision). The Zen free models
 * belong to the free route (raw `opencode/<model>` wire ids) and are
 * deliberately NOT menu defaults here: a refresh on the Go card filters the
 * gateway's aggregated listing down to the subscription family, per the
 * route's `hiddenModels` prefixes.
 *
 * Entry names read `<group displayName>/<bare model id>` (e.g.
 * `OpenCode Go/deepseek-v4.1-flash`): that one string is what both the model
 * menu rows and the composer's model chip render.
 *
 * @module dsh-opencode-gateway/default-models
 */
import type { RouteModel } from './config.ts';
/** Gateway route: the ZCode subscription list, verbatim `go/` ids. */
export declare const GATEWAY_DEFAULT_MODELS: readonly RouteModel[];
/**
 * Free route: opencode's own free tier, under the proxy's raw wire ids.
 *
 * These are exactly the `opencode/` entries `opencode models` reports with the
 * Zen key absent — the same list the CLI shows — which is also where the card's
 * refresh reads its candidates (see ./free-listing.ts). Context windows come
 * from opencode's catalog (`limit.context`).
 *
 * The set used to be derived by filtering the local backend's provider config
 * by `cost`, which disagreed with the CLI: that view is credentialed, so it
 * carried region-blocked entries (`cat-jam-free`,
 * `muse-spark-1.3-contributor-free`) and lacked free models it does not list at
 * all (`beam-free`, `deepseek-v4.1-flash-free`, `glm-5.3-flash-free`,
 * `nemotron-3.5-super-vl-free`).
 */
export declare const FREE_DEFAULT_MODELS: readonly RouteModel[];
