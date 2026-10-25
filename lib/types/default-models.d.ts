/**
 * The shipped model menus.
 *
 * The gateway route ships exactly the eight OpenCode Go subscription models
 * from the user's ZCode provider config, enriched with the measured OpenCode
 * Go registry (windows, effort vocabularies, vision). The Zen free models
 * belong to the free route (the backend's raw wire ids — bare since the Go
 * opencode2api became the free backend) and are
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
 * Free route: the free tier under the backend's raw wire ids.
 *
 * In `service` mode (default) these are the bare ids the Go opencode2api's
 * `/v1/models` answers (`models.free_only: true` on the companion config makes
 * that listing exactly the free tier); in `embedded` mode the ids carry the
 * `opencode/` prefix `opencode models` prints. The card's refresh reads the
 * same source, so the shipped list and a live refresh agree by construction.
 * Context windows come from opencode's catalog (`limit.context`); ids the
 * upstream has retired drop out on the first live refresh.
 */
export declare const FREE_DEFAULT_MODELS: readonly RouteModel[];
