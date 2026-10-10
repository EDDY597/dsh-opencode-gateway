/**
 * The shipped model menus.
 *
 * The gateway route ships exactly the eight OpenCode Go subscription models
 * from the user's ZCode provider config, enriched with the measured OpenCode
 * Go registry (windows, effort vocabularies, vision). The seven Zen free-tier
 * models from that config belong to the free route (raw `opencode/<model>`
 * wire ids) and are deliberately NOT menu defaults here: a refresh on the Go
 * card filters the gateway's aggregated listing down to the subscription
 * family, per the route's `hiddenModels` prefixes.
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
/** Free route: the same seven free models under the proxy's raw wire ids. */
export declare const FREE_DEFAULT_MODELS: readonly RouteModel[];
