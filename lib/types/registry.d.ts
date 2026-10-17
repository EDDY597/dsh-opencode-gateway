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
export declare const CONTEXT_1M = 1048576;
/** 256K-token context. */
export declare const CONTEXT_256K = 262144;
/** 200K-token context: the floor every model this plugin serves clears. */
export declare const CONTEXT_200K = 204800;
export interface RegistryReasoning {
    /** Accepted `reasoning_effort` wire spellings, in menu order. */
    efforts: readonly string[];
    /** Spelling sent when the user has not picked one. */
    defaultEffort?: string;
}
/** One curated model: metadata that rides a live listing id. */
export interface RegistryEntry {
    /** Exact upstream model id, without this plugin's routing prefixes. */
    id: string;
    displayName: string;
    contextWindow: number;
    reasoning?: RegistryReasoning;
    /** Verified image input. Absent = text only. */
    vision?: boolean;
}
export declare const GO_REGISTRY: readonly RegistryEntry[];
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
export declare const GO_OFFICIAL_PREFIXES: readonly string[];
/** The bare model id behind a gateway listing id (`go/deepseek-x` → `deepseek-x`). */
export declare function bareModelId(listingId: string): string;
/** Registry entry for a bare id, or undefined. */
export declare function lookupEntry(bareId: string): RegistryEntry | undefined;
/** `deepseek_v4.1_flash` → `Deepseek V4.1 Flash`: menu name for registry-missing ids. */
export declare function prettifyId(bareId: string): string;
/**
 * Pi-ai reasoning efforts for one registry entry, or undefined when the entry
 * carries no measured vocabulary (the menu then offers no effort picker).
 * `off` maps to the entry's disabling spelling; entries whose disabling word
 * is `none` map off → 'none', entries that cannot disable omit the level.
 */
export declare function reasoningEffortsFor(entry: RegistryEntry): Record<string, string | null> | undefined;
