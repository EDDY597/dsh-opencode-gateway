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
/** Free route: the same seven free models under the proxy's raw wire ids. */
export const FREE_DEFAULT_MODELS = [
    { id: 'opencode/big-pickle', name: label('OpenCode Free', 'opencode/big-pickle') },
    { id: 'opencode/space-bunny-free', name: label('OpenCode Free', 'opencode/space-bunny-free'), contextWindow: 1_048_576 },
    { id: 'opencode/ling-3.1-flash-free', name: label('OpenCode Free', 'opencode/ling-3.1-flash-free') },
    { id: 'opencode/mimo-v2.6-flash-free', name: label('OpenCode Free', 'opencode/mimo-v2.6-flash-free'), contextWindow: 1_000_000 },
    { id: 'opencode/longcat-2.5-preview-free', name: label('OpenCode Free', 'opencode/longcat-2.5-preview-free'), contextWindow: 1_048_576 },
    { id: 'opencode/nemotron-3-ultra-free', name: label('OpenCode Free', 'opencode/nemotron-3-ultra-free') },
    { id: 'opencode/nemotron-3.5-lightning-free', name: label('OpenCode Free', 'opencode/nemotron-3.5-lightning-free') },
];
