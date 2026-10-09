/**
 * Plugin configuration: the two routes this plugin serves.
 *
 * `gateway` points at the local opencode-api-plugin gateway (an OpenAI
 * Chat Completions endpoint that itself fronts OpenCode Go, OpenCode Zen and
 * any custom upstreams its config declares); `free` configures the inlined
 * opencode2api local proxy that drives the machine's own `opencode serve`
 * backend for the Zen free tier. Configuration comes from the composition
 * layer (the profile's `cordis.patch.yml`) — this plugin installs no settings
 * section, and cordis restarts the plugin when composition config changes.
 *
 * @module dsh-opencode-gateway/config
 */
import z from '@deepseek-ai/schemastery';
import type { Volatile } from '@deepseek-ai/cordis';
import type { ResolvedRetryPolicy, RetryPolicyConfig } from '@deepseek-ai/dsh-llm';
/** One model entry in a route's models list. */
export interface RouteModel {
    /** Model id the endpoint accepts, verbatim. */
    id: string;
    /** Menu label; defaults to the registry's, then a prettified id. */
    name?: string;
    /** Combined request and response context capacity in tokens. */
    contextWindow?: number;
    /** Output capacity; also becomes this model's per-request default. */
    maxTokens?: number;
    /**
     * Offered thinking levels and their wire spellings; `false` declares a
     * non-reasoning model, an omitted field means "no measured vocabulary" —
     * the menu then offers no effort picker for it.
     */
    reasoningEfforts?: false | Record<string, string | null>;
    /** Input modalities; defaults to text. */
    input?: readonly ('text' | 'image')[];
}
/** The route through the local gateway. */
export interface GatewayConfig {
    /** Harness route key. */
    provider?: string;
    /** Name shown in selectors. */
    displayName?: string;
    /** Gateway endpoint, including its version segment. */
    baseURL?: string;
    /** Credential reference for the gateway's Bearer token. */
    apiKeyEnv?: string;
    /** Listing-id prefixes hidden from the menu (e.g. the free tier the inline route serves). */
    hiddenModels?: string[];
    /** Extra or overriding model entries; merged after the discovered listing. */
    models?: RouteModel[];
    /**
     * Merge the gateway's full live listing into the menu on top of `models`.
     * Off by default: the explicit list is the whole menu, which keeps the
     * duplicate alias spellings an endpoint listing carries out of the picker.
     */
    discoverModels?: boolean;
    /** Context capacity for a discovered model nothing else sizes. */
    defaultContextWindow?: number;
    /** Output capability for a discovered model nothing else sizes. */
    defaultMaxTokens?: number;
    /** Positive provider-idle interval while one stream read is outstanding. */
    streamIdleTimeoutMs?: number;
    /** Retries are the gateway's own job; keep this at zero. */
    retryPolicy?: RetryPolicyConfig;
}
/** The inlined opencode2api local proxy route (Zen free tier). */
export interface FreeConfig {
    /** Harness route key. */
    provider?: string;
    /** Name shown in selectors. */
    displayName?: string;
    /** Local opencode backend the proxy drives. */
    serverUrl?: string;
    /** Port the in-process proxy listens on, loopback only. */
    proxyPort?: number;
    /** opencode executable. */
    opencodePath?: string;
    /** Spawn `opencode serve` when the backend is absent. */
    manageBackend?: boolean;
    /** Backend Basic Auth password (local secret; the gateway passes it the same way). */
    serverPassword?: string;
    /** Credential reference for the Zen key that unlocks paid models; falls back to the local opencode login. */
    zenApiKeyEnv?: string;
    /** Disable OpenCode's built-in tools through the tool-lock plugin (free tier needs this). */
    disableTools?: boolean;
    /** Built-in tools kept despite `disableTools`. */
    internalAllowedTools?: string[];
    /** Proxy prompt mode: `standard` or `plugin-inject`. */
    promptMode?: string;
    /** Ignore the client's system prompt. */
    omitSystemPrompt?: boolean;
    /** Single-request timeout in milliseconds. */
    requestTimeoutMs?: number;
    /** Periodically clean the backend's conversation store. */
    autoCleanupConversations?: boolean;
    /** Unix fake-home isolation; Windows always uses the real user directory. */
    useIsolatedHome?: boolean;
    /** Menu entries; when set, replaces the live listing projection entirely. */
    models?: RouteModel[];
    /** Merge the backend's live listing into the menu on top of `models` (off by default). */
    discoverModels?: boolean;
    /** Context capacity for a listed free model nothing else sizes. */
    defaultContextWindow?: number;
    /** Output capability for a listed free model nothing else sizes. */
    defaultMaxTokens?: number;
    /** Positive provider-idle interval while one stream read is outstanding. */
    streamIdleTimeoutMs?: number;
    /** Retries are the proxy's own job; keep this at zero. */
    retryPolicy?: RetryPolicyConfig;
}
/** Plugin configuration. Volatile sections are live settings refs at runtime. */
export interface Config {
    gateway?: Volatile<GatewayConfig> | GatewayConfig;
    free?: Volatile<FreeConfig> | FreeConfig;
}
/**
 * Read one config section through either shape it arrives in: a live
 * `Volatile` ref (the loader hands volatile fields as refs, so a settings
 * write reaches the running plugin) or a plain object (composition tests,
 * and the pre-1.7 loader shape).
 * @param section - the config field as handed to `apply`.
 * @returns the section's current value, or undefined when unset.
 */
export declare function readSection<T extends object>(section: Volatile<T> | T | undefined): T | undefined;
/** Fully resolved configuration for both routes. */
export interface ResolvedConfig {
    gateway: {
        provider: string;
        displayName: string;
        baseURL: string;
        apiKeyEnv: string;
        hiddenModels: string[];
        discoverModels: boolean;
        models: RouteModel[] | undefined;
        defaultContextWindow: number;
        defaultMaxTokens: number;
        streamIdleTimeoutMs: number;
        retryPolicy: ResolvedRetryPolicy;
    };
    free: {
        provider: string;
        displayName: string;
        serverUrl: string;
        proxyPort: number;
        opencodePath: string;
        manageBackend: boolean;
        serverPassword?: string;
        zenApiKeyEnv: string;
        disableTools: boolean;
        internalAllowedTools: string[];
        promptMode: string;
        omitSystemPrompt: boolean;
        requestTimeoutMs: number;
        autoCleanupConversations: boolean;
        useIsolatedHome: boolean;
        models: RouteModel[] | undefined;
        discoverModels: boolean;
        defaultContextWindow: number;
        defaultMaxTokens: number;
        streamIdleTimeoutMs: number;
        retryPolicy: ResolvedRetryPolicy;
    };
}
/** Runtime schema for {@link Config}; the volatile sections are the settings form. */
export declare const Config: z<Schemastery.ObjectS<NoInfer<{
    gateway: z<NoInfer<GatewayConfig>, NoInfer<GatewayConfig>, "volatile">;
    free: z<NoInfer<FreeConfig>, NoInfer<FreeConfig>, "volatile">;
}>>, Schemastery.ObjectT<NoInfer<{
    gateway: z<NoInfer<GatewayConfig>, NoInfer<GatewayConfig>, "volatile">;
    free: z<NoInfer<FreeConfig>, NoInfer<FreeConfig>, "volatile">;
}>>, "plain">;
/**
 * Resolve and validate deployment configuration once per plugin load.
 * @param source - composition values to resolve.
 * @returns a detached configuration both routes build from.
 */
/** Plain (non-volatile) configuration input resolveConfig accepts. */
export interface ConfigInput {
    gateway?: GatewayConfig;
    free?: FreeConfig;
}
export declare function resolveConfig(source: ConfigInput): ResolvedConfig;
/** Default settings used by an absent section and by composition examples. */
export declare const DEFAULT_CONFIG: Config;
