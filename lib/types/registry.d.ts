/**
 * Curated model registry for the two routes this plugin serves.
 *
 * Every OpenCode Go entry below is ported from AIMFllyYS/dsh-protocom-api
 * (MIT), whose windows, effort vocabularies, vision flags and refusal list
 * were verified against the live `zen/go` endpoint request by request — the
 * same endpoint this plugin's gateway route reaches through the local
 * gateway. Bare ids here join live listings by identity (the id after its
 * routing prefix), so a model listed under several spellings resolves to one
 * entry.
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
 * Ids the Go endpoint cannot serve a chat turn for on any wire protocol,
 * verified by request (protocom's measured list): they stay hidden from the
 * gateway route's menu even when the live listing still carries them.
 */
export declare const GO_REFUSED_MODEL_IDS: readonly string[];
/**
 * Free-tier seed for the inline local proxy, used until the backend's own
 * listing answers (the proxy only answers `listModels` once `opencode serve`
 * is healthy). Ids are `opencode/<model>` — the wire spelling the proxy
 * resolves. Reasoning metadata is intentionally absent: the free tier's
 * effort vocabulary is unmeasured, so no effort picker is promised.
 */
export declare const FREE_SEED: readonly RegistryEntry[];
/** Routing prefixes the Go upstream lists the same model under, best first. */
export declare const GO_ROUTE_PREFIXES: readonly string[];
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
