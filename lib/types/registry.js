/**
 * Curated model registry for the two routes this plugin serves.
 *
 * Every OpenCode Go entry below is ported from AIMFllyYS/dsh-protocom-api
 * (MIT), whose windows, effort vocabularies and vision flags were verified
 * against the live `zen/go` endpoint request by request — the same endpoint
 * this plugin's gateway route reaches through the local gateway. Bare ids here
 * join live listings by identity (the id after its routing prefix), so a model
 * listed under several spellings resolves to one entry.
 *
 * Metadata is curated here; membership never is. What the Go card offers comes
 * from the live listing alone ({@link GO_OFFICIAL_PREFIXES}), because the
 * endpoint's catalog changes without notice and any frozen allow/deny list
 * goes stale: a measured "this id cannot serve a turn" is a fact about one
 * moment, not a property of the model.
 *
 * @module dsh-opencode-gateway/registry
 */
/** Binary million: 1024^3-ish token context used by OpenCode Go listings. */
export const CONTEXT_1M = 1_048_576;
/** 256K-token context. */
export const CONTEXT_256K = 262_144;
/** 200K-token context: the floor every model this plugin serves clears. */
export const CONTEXT_200K = 204_800;
const GO_FULL_REASONING = {
    efforts: ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'],
    defaultEffort: 'high',
};
/** GLM-5.1/5.2/5.3 on Go: thinking cannot be disabled; `minimal`, `none` and `off` all answer 400. */
const GO_GLM_REASONING = {
    efforts: ['low', 'medium', 'high', 'xhigh', 'max'],
    defaultEffort: 'high',
};
/** muses/grok on the Go responses surface: `none` and `max` answer 400. */
const GO_RESPONSES_REASONING = {
    efforts: ['minimal', 'low', 'medium', 'high', 'xhigh'],
    defaultEffort: 'medium',
};
/** The narrower Go vocabulary the MiMo v2.x routes accept: a disabling word and three depths. */
const GO_TIGHT_REASONING = {
    efforts: ['none', 'low', 'medium', 'high'],
    defaultEffort: 'medium',
};
/** Qwen3.7 generation on Go: `max`, `minimum` and `off` answer 400. */
const GO_QWEN37_REASONING = {
    efforts: ['none', 'minimal', 'low', 'medium', 'high', 'xhigh'],
    defaultEffort: 'medium',
};
export const GO_REGISTRY = [
    { id: 'deepseek-v4.1-flash', displayName: 'DeepSeek V4.1 Flash', contextWindow: 1_000_000, reasoning: GO_FULL_REASONING, vision: true },
    { id: 'glm-5.3', displayName: 'GLM-5.3', contextWindow: 1_000_000, reasoning: GO_GLM_REASONING, vision: false },
    { id: 'kimi-k3', displayName: 'Kimi K3', contextWindow: CONTEXT_1M, reasoning: GO_FULL_REASONING, vision: true },
    { id: 'deepseek-v4-pro', displayName: 'DeepSeek V4 Pro', contextWindow: 1_000_000, reasoning: GO_FULL_REASONING, vision: false },
    { id: 'qwen3.8-max', displayName: 'Qwen3.8 Max', contextWindow: 1_000_000, reasoning: GO_FULL_REASONING, vision: true },
    { id: 'grok-4.6', displayName: 'Grok 4.6', contextWindow: 500_000, reasoning: GO_RESPONSES_REASONING, vision: true },
    { id: 'grok-4.7', displayName: 'Grok 4.7', contextWindow: 500_000, reasoning: GO_RESPONSES_REASONING, vision: true },
    { id: 'deepseek-v4-flash', displayName: 'DeepSeek V4 Flash', contextWindow: 1_000_000, reasoning: GO_FULL_REASONING, vision: false },
    { id: 'deepseek-v4-flash-vision-exp', displayName: 'DeepSeek V4 Flash Vision', contextWindow: 1_000_000, reasoning: GO_FULL_REASONING, vision: true },
    // Live-listed but with an unverified window: keeps the family floor.
    { id: 'deepseek-flash', displayName: 'DeepSeek Flash', contextWindow: CONTEXT_200K, reasoning: GO_FULL_REASONING },
    { id: 'glm-5.1', displayName: 'GLM-5.1', contextWindow: 202_752, reasoning: GO_GLM_REASONING },
    { id: 'glm-5.2', displayName: 'GLM-5.2', contextWindow: 1_000_000, reasoning: GO_GLM_REASONING },
    { id: 'glm-5.3-flash', displayName: 'GLM-5.3 Flash', contextWindow: 1_000_000, reasoning: GO_FULL_REASONING, vision: true },
    {
        id: 'gpt-5.6-luna',
        displayName: 'GPT-5.6 Luna',
        contextWindow: 1_050_000,
        // `minimal` answers 400; `none` disables.
        reasoning: { efforts: ['none', 'low', 'medium', 'high', 'xhigh', 'max'], defaultEffort: 'medium' },
        vision: true,
    },
    // hy3 and hy4-preview accept the effort field but never emit thinking on any
    // effort — they carry no vocabulary, so no effort picker is offered.
    { id: 'hy3', displayName: 'HY-3', contextWindow: 256_000, reasoning: GO_FULL_REASONING },
    { id: 'hy4-preview', displayName: 'HY-4 Preview', contextWindow: 1_024_000, reasoning: GO_FULL_REASONING },
    // kimi-k2.6 and mimo-v2.5 accept the field but never stream thinking.
    { id: 'kimi-k2.6', displayName: 'Kimi K2.6', contextWindow: CONTEXT_256K, vision: true },
    {
        id: 'kimi-k2.7-code',
        displayName: 'Kimi K2.7 Code',
        contextWindow: CONTEXT_256K,
        // `none` answers 400 on this route; `off` is the disabling word.
        reasoning: { efforts: ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'], defaultEffort: 'medium' },
        vision: true,
    },
    { id: 'longcat-2.0', displayName: 'LongCat 2.0', contextWindow: 1_000_000, reasoning: GO_FULL_REASONING },
    { id: 'mimo-v2.5', displayName: 'MiMo V2.5', contextWindow: 1_000_000, reasoning: GO_TIGHT_REASONING, vision: true },
    {
        id: 'mimo-v2.5-pro',
        displayName: 'MiMo V2.5 Pro',
        contextWindow: CONTEXT_1M,
        // `minimal`, `xhigh`, `max` and `off` all answer 400.
        reasoning: { efforts: ['none', 'low', 'medium', 'high'], defaultEffort: 'medium' },
    },
    {
        id: 'minimax-m2.5',
        displayName: 'MiniMax M2.5',
        contextWindow: CONTEXT_200K,
        // Reasoning is mandatory: `none`, `off` and `minimum` answer 400. The
        // stream arrives on `delta.reasoning` (plus `reasoning_details`), not
        // `reasoning_content` — pi-ai's delta parser reads both spellings.
        reasoning: { efforts: ['minimal', 'low', 'medium', 'high', 'xhigh', 'max'], defaultEffort: 'medium' },
    },
    {
        id: 'minimax-m3',
        displayName: 'MiniMax M3',
        contextWindow: 1_000_000,
        reasoning: GO_FULL_REASONING,
        vision: true,
        // Thinking streams inline inside `delta.content`; the gateway strips it
        // into thinking deltas before it reaches the client.
    },
    {
        id: 'muse-spark-1.2-contributor',
        displayName: 'Muse Spark 1.2 Contributor',
        contextWindow: CONTEXT_1M,
        reasoning: GO_RESPONSES_REASONING,
        vision: true,
    },
    {
        id: 'muse-spark-1.3-contributor',
        displayName: 'Muse Spark 1.3 Contributor',
        contextWindow: CONTEXT_1M,
        reasoning: GO_RESPONSES_REASONING,
        vision: true,
    },
    {
        id: 'omen-alpha',
        displayName: 'Omen Alpha',
        contextWindow: 500_000,
        // `xhigh` answers 400; `off` and `minimum` are refused spellings.
        reasoning: { efforts: ['none', 'minimal', 'low', 'medium', 'high', 'max'], defaultEffort: 'medium' },
        vision: true,
    },
    {
        id: 'qwen3.6-plus',
        displayName: 'Qwen3.6 Plus',
        contextWindow: 1_000_000,
        // This route's minimal step is spelled `minimum`; `minimal`, `max` and
        // `off` all answer 400.
        reasoning: { efforts: ['none', 'minimum', 'low', 'medium', 'high', 'xhigh'], defaultEffort: 'medium' },
        vision: true,
    },
    { id: 'qwen3.7-max', displayName: 'Qwen3.7 Max', contextWindow: 1_000_000, reasoning: GO_QWEN37_REASONING },
    { id: 'qwen3.7-plus', displayName: 'Qwen3.7 Plus', contextWindow: 1_000_000, reasoning: GO_QWEN37_REASONING, vision: true },
    { id: 'qwen3.8-flash', displayName: 'Qwen3.8 Flash', contextWindow: 1_000_000, reasoning: GO_FULL_REASONING, vision: true },
    { id: 'mimo-v2.6-pro', displayName: 'MiMo V2.6 Pro', contextWindow: CONTEXT_1M, reasoning: GO_TIGHT_REASONING, vision: true },
    { id: 'mimo-v2.6-flash', displayName: 'MiMo V2.6 Flash', contextWindow: CONTEXT_1M, reasoning: GO_TIGHT_REASONING, vision: true },
    { id: 'longcat-2.5-preview-free', displayName: 'LongCat 2.5 Preview', contextWindow: 1_000_000, reasoning: GO_FULL_REASONING, vision: true },
    {
        id: 'space-bunny-free',
        displayName: 'Space Bunny Free',
        contextWindow: CONTEXT_1M,
        reasoning: { efforts: ['low', 'medium', 'high', 'xhigh', 'max'], defaultEffort: 'medium' },
        vision: true,
    },
    {
        id: 'step-5-preview-free',
        displayName: 'Step-5 Preview Free',
        contextWindow: 1_000_000,
        // Measured 2026-10-10 against zen/go: `none`, `off` and `minimum` answer 400.
        reasoning: { efforts: ['minimal', 'low', 'medium', 'high', 'xhigh', 'max'], defaultEffort: 'medium' },
        vision: true,
    },
    {
        id: 'gpt-6-luna',
        displayName: 'GPT-6 Luna',
        contextWindow: 1_050_000,
        reasoning: { efforts: ['none', 'low', 'medium', 'high', 'xhigh', 'max'], defaultEffort: 'medium' },
        vision: true,
    },
];
/**
 * The ONLY routing prefix whose models belong on the Go card.
 *
 * The gateway's listing mixes three sources under look-alike prefixes, and
 * only the first is the official Go subscription:
 *
 * - `go/` — the gateway's `opencode-go` upstream, fronting
 *   `https://opencode.ai/zen/go/v1/models`. This is the official catalog: a
 *   live read of it matched the gateway's `go/` ids exactly, one for one.
 * - `opencode-go/` — the LOCAL `opencode serve` catalog, surfaced through the
 *   gateway's `local-free` upstream (whose `modelRewrite` maps only
 *   `opencode/`, so this spelling passes through untouched). It is a different
 *   catalog from a different source, not an alias of `go/`.
 * - `free/` — that same local backend's Zen catalog, paid models included.
 *
 * Treating `opencode-go/` as an alias spelling of `go/` is what let
 * `opencode-go/step-5-preview-free` — a local-backend entry the official
 * endpoint does not list — show up on the Go card. Membership follows this
 * whitelist; nothing else is filtered by a frozen list, because the endpoint's
 * catalog changes without notice.
 */
export const GO_OFFICIAL_PREFIXES = ['go'];
/** The bare model id behind a gateway listing id (`go/deepseek-x` → `deepseek-x`). */
export function bareModelId(listingId) {
    const slash = listingId.indexOf('/');
    return slash > 0 ? listingId.slice(slash + 1) : listingId;
}
/** Registry entry for a bare id, or undefined. */
export function lookupEntry(bareId) {
    return GO_REGISTRY.find(entry => entry.id === bareId);
}
/** `deepseek_v4.1_flash` → `Deepseek V4.1 Flash`: menu name for registry-missing ids. */
export function prettifyId(bareId) {
    return bareId
        .split(/[-_.]/)
        .filter(Boolean)
        .map(part => (/\d/.test(part) ? part.toUpperCase() : part.charAt(0).toUpperCase() + part.slice(1)))
        .join(' ');
}
/**
 * Pi-ai reasoning efforts for one registry entry, or undefined when the entry
 * carries no measured vocabulary (the menu then offers no effort picker).
 * `off` maps to the entry's disabling spelling; entries whose disabling word
 * is `none` map off → 'none', entries that cannot disable omit the level.
 */
export function reasoningEffortsFor(entry) {
    const vocab = entry.reasoning?.efforts;
    if (!vocab || vocab.length === 0)
        return undefined;
    const efforts = {};
    for (const level of ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max']) {
        const wire = level === 'off' ? (vocab.includes('none') ? 'none' : vocab.includes('off') ? 'off' : undefined) : (vocab.includes(level) ? level : undefined);
        if (wire !== undefined)
            efforts[level] = wire;
    }
    return efforts;
}
