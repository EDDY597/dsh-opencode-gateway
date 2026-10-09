/**
 * The shipped model menus, aligned with the user's ZCode provider config
 * (`C:\Users\liujie\.zcode\v2\provider_config.json`): exactly the fifteen
 * models that config lists for the gateway provider — eight OpenCode Go
 * subscription entries and seven Zen free-tier entries — enriched with the
 * measured OpenCode Go registry (windows, effort vocabularies, vision).
 *
 * The free route serves the same seven free models under the proxy's raw wire
 * ids (`opencode/<model>` — the gateway's `free/` spelling is its own display
 * rewrite and does not exist on the inlined proxy).
 *
 * @module dsh-opencode-gateway/default-models
 */
import type { RouteModel } from './config.ts';
/** Gateway route: the ZCode list, verbatim ids, registry-enriched metadata. */
export declare const GATEWAY_DEFAULT_MODELS: readonly RouteModel[];
/** Free route: the same seven free models under the proxy's raw wire ids. */
export declare const FREE_DEFAULT_MODELS: readonly RouteModel[];
