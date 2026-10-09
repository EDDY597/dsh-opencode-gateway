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
import { resolveRetryPolicy, RetryPolicySchema } from '@deepseek-ai/dsh-llm';
import { MAX_TIMER_DELAY_MS } from '@deepseek-ai/dsh-timeout';
const DEFAULT_GATEWAY = {
    provider: 'opencode-gateway',
    displayName: 'OpenCode Gateway',
    baseURL: 'http://127.0.0.1:8787/v1',
    apiKeyEnv: 'OPENCODE_GATEWAY_KEY',
    hiddenModels: ['free/'],
    discoverModels: false,
    models: [],
    defaultContextWindow: 262_144,
    defaultMaxTokens: 32_768,
    streamIdleTimeoutMs: 300_000,
    retryPolicy: { mode: 'normal', maxRetries: 0 },
};
const DEFAULT_FREE = {
    provider: 'opencode-free',
    displayName: 'OpenCode Local (free)',
    serverUrl: 'http://127.0.0.1:10001',
    // 10102, not 10002: a running DeepSeek Harness host itself binds 10002.
    proxyPort: 10102,
    opencodePath: 'opencode',
    manageBackend: true,
    zenApiKeyEnv: 'OPENCODE_ZEN_API_KEY',
    disableTools: true,
    internalAllowedTools: ['webfetch', 'bash', 'websearch'],
    promptMode: 'standard',
    omitSystemPrompt: false,
    requestTimeoutMs: 300_000,
    autoCleanupConversations: true,
    useIsolatedHome: false,
    models: [],
    discoverModels: false,
    defaultContextWindow: 262_144,
    defaultMaxTokens: 32_768,
    streamIdleTimeoutMs: 300_000,
    retryPolicy: { mode: 'normal', maxRetries: 0 },
};
// The schema shapes stay loose (z.any()) because schemastery's generative
// typing fights `exactOptionalPropertyTypes`; every structural constraint the
// schema would express is enforced at runtime by `resolveRouteModels` and
// `resolveConfig`, which the loader validates composition config through.
const modelEntry = z.object({
    id: z.string().required(),
    name: z.string(),
    contextWindow: z.number(),
    maxTokens: z.number(),
    reasoningEfforts: z.any(),
    input: z.array(z.string()),
});
const gatewaySchema = z.object({
    provider: z.string().default(DEFAULT_GATEWAY.provider),
    displayName: z.string().default(DEFAULT_GATEWAY.displayName),
    baseURL: z.string().default(DEFAULT_GATEWAY.baseURL),
    apiKeyEnv: z.string().default(DEFAULT_GATEWAY.apiKeyEnv),
    hiddenModels: z.array(z.string()).default([...DEFAULT_GATEWAY.hiddenModels]),
    discoverModels: z.boolean().default(DEFAULT_GATEWAY.discoverModels),
    models: z.array(modelEntry).default([]),
    defaultContextWindow: z.number().default(DEFAULT_GATEWAY.defaultContextWindow),
    defaultMaxTokens: z.number().default(DEFAULT_GATEWAY.defaultMaxTokens),
    streamIdleTimeoutMs: z.number().default(DEFAULT_GATEWAY.streamIdleTimeoutMs),
    retryPolicy: RetryPolicySchema,
}).default({});
const freeSchema = z.object({
    provider: z.string().default(DEFAULT_FREE.provider),
    displayName: z.string().default(DEFAULT_FREE.displayName),
    serverUrl: z.string().default(DEFAULT_FREE.serverUrl),
    proxyPort: z.number().default(DEFAULT_FREE.proxyPort),
    opencodePath: z.string().default(DEFAULT_FREE.opencodePath),
    manageBackend: z.boolean().default(DEFAULT_FREE.manageBackend),
    serverPassword: z.string(),
    zenApiKeyEnv: z.string().default(DEFAULT_FREE.zenApiKeyEnv),
    disableTools: z.boolean().default(DEFAULT_FREE.disableTools),
    internalAllowedTools: z.array(z.string()).default([...DEFAULT_FREE.internalAllowedTools]),
    promptMode: z.string().default(DEFAULT_FREE.promptMode),
    omitSystemPrompt: z.boolean().default(DEFAULT_FREE.omitSystemPrompt),
    requestTimeoutMs: z.number().default(DEFAULT_FREE.requestTimeoutMs),
    autoCleanupConversations: z.boolean().default(DEFAULT_FREE.autoCleanupConversations),
    useIsolatedHome: z.boolean().default(DEFAULT_FREE.useIsolatedHome),
    models: z.array(modelEntry).default([]),
    discoverModels: z.boolean().default(DEFAULT_FREE.discoverModels),
    defaultContextWindow: z.number().default(DEFAULT_FREE.defaultContextWindow),
    defaultMaxTokens: z.number().default(DEFAULT_FREE.defaultMaxTokens),
    streamIdleTimeoutMs: z.number().default(DEFAULT_FREE.streamIdleTimeoutMs),
    retryPolicy: RetryPolicySchema,
}).default({});
/** Runtime schema for {@link Config}. */
export const Config = z.object({
    gateway: gatewaySchema,
    free: freeSchema,
}).default({});
function positiveInteger(value, label, max) {
    if (!Number.isInteger(value) || value <= 0 || (max !== undefined && value > max)) {
        throw new Error(`opencode-gateway: ${label} must be a positive integer${max !== undefined ? ` no greater than ${max}` : ''}`);
    }
    return value;
}
function resolveRouteModels(raw, label) {
    const models = [...(raw ?? [])];
    const seen = new Set();
    for (const entry of models) {
        if (typeof entry?.id !== 'string' || entry.id.length === 0) {
            throw new Error(`opencode-gateway: ${label} has a model with a missing or empty id`);
        }
        if (seen.has(entry.id))
            throw new Error(`opencode-gateway: ${label} lists model "${entry.id}" more than once`);
        seen.add(entry.id);
        if (entry.contextWindow !== undefined)
            positiveInteger(entry.contextWindow, `${label} model "${entry.id}" contextWindow`);
        if (entry.maxTokens !== undefined)
            positiveInteger(entry.maxTokens, `${label} model "${entry.id}" maxTokens`);
        const efforts = entry.reasoningEfforts;
        if (efforts !== undefined && efforts !== false) {
            if (typeof efforts !== 'object') {
                throw new Error(`opencode-gateway: ${label} model "${entry.id}" reasoningEfforts must be false or a level dict`);
            }
            const levels = Object.keys(efforts).filter(level => level !== 'off');
            if (levels.length === 0) {
                throw new Error(`opencode-gateway: ${label} model "${entry.id}" reasoningEfforts offers no level beyond "off"`);
            }
            for (const [level, wire] of Object.entries(efforts)) {
                if (level !== 'off' && wire === null) {
                    throw new Error(`opencode-gateway: ${label} model "${entry.id}" reasoningEfforts.${level} needs the wire value dispatch should send; only "off" may leave it empty`);
                }
                if (typeof wire === 'string' && wire.length === 0) {
                    throw new Error(`opencode-gateway: ${label} model "${entry.id}" reasoningEfforts.${level} must not be an empty string`);
                }
            }
        }
        if (entry.input !== undefined) {
            if (entry.input.length === 0) {
                throw new Error(`opencode-gateway: ${label} model "${entry.id}" input must name at least one modality`);
            }
            for (const modality of entry.input) {
                if (modality !== 'text' && modality !== 'image') {
                    throw new Error(`opencode-gateway: ${label} model "${entry.id}" input modality must be "text" or "image"`);
                }
            }
        }
    }
    return models;
}
/**
 * Resolve and validate deployment configuration once per plugin load.
 * @param source - composition values to resolve.
 * @returns a detached configuration both routes build from.
 */
export function resolveConfig(source) {
    const gatewayRaw = source.gateway ?? {};
    const freeRaw = source.free ?? {};
    const gatewayProvider = gatewayRaw.provider ?? DEFAULT_GATEWAY.provider;
    const freeProvider = freeRaw.provider ?? DEFAULT_FREE.provider;
    if (gatewayProvider.length === 0)
        throw new Error('opencode-gateway: gateway.provider must be non-empty');
    if (freeProvider.length === 0)
        throw new Error('opencode-gateway: free.provider must be non-empty');
    if (gatewayProvider === freeProvider) {
        throw new Error(`opencode-gateway: both routes resolve to provider "${gatewayProvider}"`);
    }
    const gatewayBaseURL = gatewayRaw.baseURL ?? DEFAULT_GATEWAY.baseURL;
    if (gatewayBaseURL.length === 0)
        throw new Error('opencode-gateway: gateway.baseURL must be non-empty');
    const freeServerUrl = freeRaw.serverUrl ?? DEFAULT_FREE.serverUrl;
    if (freeServerUrl.length === 0)
        throw new Error('opencode-gateway: free.serverUrl must be non-empty');
    const apiKeyEnv = gatewayRaw.apiKeyEnv ?? DEFAULT_GATEWAY.apiKeyEnv;
    if (apiKeyEnv.length === 0)
        throw new Error('opencode-gateway: gateway.apiKeyEnv must be non-empty');
    const promptMode = freeRaw.promptMode ?? DEFAULT_FREE.promptMode;
    if (promptMode !== 'standard' && promptMode !== 'plugin-inject') {
        throw new Error('opencode-gateway: free.promptMode must be "standard" or "plugin-inject"');
    }
    const hiddenModels = [...(gatewayRaw.hiddenModels ?? DEFAULT_GATEWAY.hiddenModels)];
    if (hiddenModels.some(prefix => prefix.length === 0)) {
        throw new Error('opencode-gateway: gateway.hiddenModels entries must be non-empty');
    }
    const serverPassword = freeRaw.serverPassword;
    return {
        gateway: {
            provider: gatewayProvider,
            displayName: gatewayRaw.displayName ?? gatewayProvider,
            baseURL: gatewayBaseURL.replace(/\/+$/, ''),
            apiKeyEnv,
            hiddenModels,
            discoverModels: gatewayRaw.discoverModels ?? DEFAULT_GATEWAY.discoverModels,
            models: resolveRouteModels(gatewayRaw.models, 'gateway.models'),
            defaultContextWindow: positiveInteger(gatewayRaw.defaultContextWindow ?? DEFAULT_GATEWAY.defaultContextWindow, 'gateway.defaultContextWindow'),
            defaultMaxTokens: positiveInteger(gatewayRaw.defaultMaxTokens ?? DEFAULT_GATEWAY.defaultMaxTokens, 'gateway.defaultMaxTokens'),
            streamIdleTimeoutMs: positiveInteger(gatewayRaw.streamIdleTimeoutMs ?? DEFAULT_GATEWAY.streamIdleTimeoutMs, 'gateway.streamIdleTimeoutMs', MAX_TIMER_DELAY_MS),
            retryPolicy: resolveRetryPolicy(gatewayRaw.retryPolicy ?? DEFAULT_GATEWAY.retryPolicy, 'opencode-gateway: gateway.retryPolicy'),
        },
        free: {
            provider: freeProvider,
            displayName: freeRaw.displayName ?? freeProvider,
            serverUrl: freeServerUrl.replace(/\/+$/, ''),
            proxyPort: positiveInteger(freeRaw.proxyPort ?? DEFAULT_FREE.proxyPort, 'free.proxyPort', 65_535),
            opencodePath: freeRaw.opencodePath ?? DEFAULT_FREE.opencodePath,
            manageBackend: freeRaw.manageBackend ?? DEFAULT_FREE.manageBackend,
            ...(serverPassword !== undefined && serverPassword.length > 0 ? { serverPassword } : {}),
            zenApiKeyEnv: freeRaw.zenApiKeyEnv ?? DEFAULT_FREE.zenApiKeyEnv,
            disableTools: freeRaw.disableTools ?? DEFAULT_FREE.disableTools,
            internalAllowedTools: [...(freeRaw.internalAllowedTools ?? DEFAULT_FREE.internalAllowedTools)],
            promptMode,
            omitSystemPrompt: freeRaw.omitSystemPrompt ?? DEFAULT_FREE.omitSystemPrompt,
            requestTimeoutMs: positiveInteger(freeRaw.requestTimeoutMs ?? DEFAULT_FREE.requestTimeoutMs, 'free.requestTimeoutMs'),
            autoCleanupConversations: freeRaw.autoCleanupConversations ?? DEFAULT_FREE.autoCleanupConversations,
            useIsolatedHome: freeRaw.useIsolatedHome ?? DEFAULT_FREE.useIsolatedHome,
            models: resolveRouteModels(freeRaw.models, 'free.models'),
            discoverModels: freeRaw.discoverModels ?? DEFAULT_FREE.discoverModels,
            defaultContextWindow: positiveInteger(freeRaw.defaultContextWindow ?? DEFAULT_FREE.defaultContextWindow, 'free.defaultContextWindow'),
            defaultMaxTokens: positiveInteger(freeRaw.defaultMaxTokens ?? DEFAULT_FREE.defaultMaxTokens, 'free.defaultMaxTokens'),
            streamIdleTimeoutMs: positiveInteger(freeRaw.streamIdleTimeoutMs ?? DEFAULT_FREE.streamIdleTimeoutMs, 'free.streamIdleTimeoutMs', MAX_TIMER_DELAY_MS),
            retryPolicy: resolveRetryPolicy(freeRaw.retryPolicy ?? DEFAULT_FREE.retryPolicy, 'opencode-gateway: free.retryPolicy'),
        },
    };
}
/** Default settings used by an absent section and by composition examples. */
export const DEFAULT_CONFIG = {
    gateway: { ...DEFAULT_GATEWAY, hiddenModels: [...DEFAULT_GATEWAY.hiddenModels], models: [] },
    free: { ...DEFAULT_FREE, internalAllowedTools: [...DEFAULT_FREE.internalAllowedTools], models: [] },
};
