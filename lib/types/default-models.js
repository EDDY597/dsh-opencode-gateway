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
import { reasoningEffortsFor, lookupEntry, bareModelId } from "./registry.js";
const effortsOf = (bareId) => {
    const entry = lookupEntry(bareId);
    return entry === undefined ? undefined : reasoningEffortsFor(entry);
};
const label = (group, id) => `${group}/${bareModelId(id)}`;
/** Gateway route: the ZCode subscription list, verbatim `go/` ids. */
export const GATEWAY_DEFAULT_MODELS = [
    { id: 'go/deepseek-v4.1-flash', name: label('OpenCode Go', 'go/deepseek-v4.1-flash'), contextWindow: 1_000_000, reasoningEfforts: effortsOf('deepseek-v4.1-flash'), input: ['text', 'image'] },
    { id: 'go/glm-5.3-flash', name: label('OpenCode Go', 'go/glm-5.3-flash'), contextWindow: 1_000_000, reasoningEfforts: effortsOf('glm-5.3-flash'), input: ['text', 'image'] },
    { id: 'go/hy4-preview', name: label('OpenCode Go', 'go/hy4-preview'), contextWindow: 1_000_000, reasoningEfforts: effortsOf('hy4-preview'), input: ['text'] },
    { id: 'go/mimo-v2.6-flash', name: label('OpenCode Go', 'go/mimo-v2.6-flash'), contextWindow: 1_000_000, reasoningEfforts: effortsOf('mimo-v2.6-flash'), input: ['text', 'image'] },
    { id: 'go/mimo-v2.6-pro', name: label('OpenCode Go', 'go/mimo-v2.6-pro'), contextWindow: 1_000_000, reasoningEfforts: effortsOf('mimo-v2.6-pro'), input: ['text', 'image'] },
    { id: 'go/gpt-5.6-luna', name: label('OpenCode Go', 'go/gpt-5.6-luna'), contextWindow: 1_050_000, reasoningEfforts: effortsOf('gpt-5.6-luna'), input: ['text', 'image'] },
    { id: 'go/kimi-k3', name: label('OpenCode Go', 'go/kimi-k3'), contextWindow: 1_048_576, reasoningEfforts: effortsOf('kimi-k3'), input: ['text', 'image'] },
    { id: 'go/grok-4.7', name: label('OpenCode Go', 'go/grok-4.7'), contextWindow: 500_000, reasoningEfforts: effortsOf('grok-4.7'), input: ['text', 'image'] },
];
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
export const FREE_DEFAULT_MODELS = [
    { id: 'opencode/beam-free', name: label('OpenCode Free', 'opencode/beam-free'), contextWindow: 1_048_576 },
    { id: 'opencode/big-pickle', name: label('OpenCode Free', 'opencode/big-pickle'), contextWindow: 200_000 },
    { id: 'opencode/deepseek-v4.1-flash-free', name: label('OpenCode Free', 'opencode/deepseek-v4.1-flash-free'), contextWindow: 200_000 },
    { id: 'opencode/glm-5.3-flash-free', name: label('OpenCode Free', 'opencode/glm-5.3-flash-free'), contextWindow: 200_000 },
    { id: 'opencode/longcat-2.5-preview-free', name: label('OpenCode Free', 'opencode/longcat-2.5-preview-free'), contextWindow: 1_000_000 },
    { id: 'opencode/mimo-v2.6-flash-free', name: label('OpenCode Free', 'opencode/mimo-v2.6-flash-free'), contextWindow: 200_000 },
    { id: 'opencode/nemotron-3-ultra-free', name: label('OpenCode Free', 'opencode/nemotron-3-ultra-free'), contextWindow: 1_000_000 },
    { id: 'opencode/nemotron-3.5-lightning-free', name: label('OpenCode Free', 'opencode/nemotron-3.5-lightning-free'), contextWindow: 262_144 },
    { id: 'opencode/nemotron-3.5-super-vl-free', name: label('OpenCode Free', 'opencode/nemotron-3.5-super-vl-free'), contextWindow: 1_048_576 },
    { id: 'opencode/space-bunny-free', name: label('OpenCode Free', 'opencode/space-bunny-free'), contextWindow: 1_048_576 },
];
