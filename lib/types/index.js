/**
 * OpenCode gateway provider plugin.
 *
 * Two pi-ai-backed routes land on the Harness LLM seam:
 *
 * - `opencode-gateway` — the local opencode-api-plugin gateway (OpenAI Chat
 *   Completions; the gateway fronts OpenCode Go, OpenCode Zen and any custom
 *   upstreams its own config aggregates, and fixes the protocol-level quirks
 *   server-side). Credential: `OPENCODE_GATEWAY_KEY`, any non-empty value
 *   while the gateway runs without a token.
 * - `opencode-free` — the inlined opencode2api local proxy driving this
 *   machine's `opencode serve` backend for the Zen free tier. Works with no
 *   gateway process; the backend spawns on first use.
 *
 * Both routes mount immediately with configured/seed menus, then upgrade to
 * the live listing discovery reports; discovery failures stay soft. The
 * plugin's Config IS the settings form (volatile sections): the settings
 * page's model checkboxes write the `models` lists, and a write reaches the
 * running plugin through the volatile refs without a remount.
 *
 * @module dsh-opencode-gateway
 */
import { fileURLToPath } from 'node:url';
import { assertUsableApiKey, LlmError } from '@deepseek-ai/dsh-llm';
import { PiAiAdapter } from '@deepseek-ai/dsh-llm-pi-ai';
import { resolveConfig, readSection } from "./config.js";
import { createLocalProxy, normalizeLocalProxyConfig } from "./local/local-proxy.js";
import { startLoopbackServer } from "./local/loopback.js";
import { resolveOpencodePath } from "./local/backend.js";
import { listFreeModels } from "./free-listing.js";
import { fetchGatewayListing } from "./discovery.js";
import { emptyCredentialStore, minimalAuthContext, readLocalOpencodeKey, resolveCredential, } from "./credentials.js";
import { gatewayProfile, freeProfile, projectGatewayListing, enrichFromRegistry } from "./routes.js";
import { bareModelId } from "./registry.js";
export { Config, DEFAULT_CONFIG, readSection } from "./config.js";
export { fetchGatewayListing } from "./discovery.js";
export { emptyCredentialStore, minimalAuthContext, readLocalOpencodeKey, resolveCredential } from "./credentials.js";
export { enrichFromRegistry, freeProfile, gatewayProfile, projectGatewayListing } from "./routes.js";
export { GO_OFFICIAL_PREFIXES, GO_REGISTRY, reasoningEffortsFor } from "./registry.js";
export { listFreeModels, parseFreeModelIds, resetFreeListingCache } from "./free-listing.js";
export { GATEWAY_DEFAULT_MODELS, FREE_DEFAULT_MODELS } from "./default-models.js";
/** Cordis plugin name; also the log and error-message prefix, the discovery key, and the settings form namespace. */
export const name = 'opencode-gateway';
/** Services required by this provider plugin. */
export const inject = ['llm'];
/** Install both routes on the LLM seam. */
export function apply(ctx, config) {
    // Sections arrive as live volatile refs when the loader composed them, so a
    // settings-page edit reaches the very next profile build without a remount;
    // plain objects (composition tests) read straight through.
    const options = () => resolveConfig({
        gateway: readSection(config.gateway),
        free: readSection(config.free),
    });
    options();
    // --- free route: inlined local proxy + loopback listener ----------------
    // Structural free-route facts (endpoint, port, executable, prompt mode) are
    // baked into the proxy and listener at construction; the settings page only
    // edits the model menu, which rebuilds live. A structural edit therefore
    // asks for a restart rather than pretending it applied.
    const assetsPath = fileURLToPath(new URL('../assets/opencode2api-tool-lock.js', import.meta.url));
    let freeRuntime;
    let freeStructuralFacts;
    const structuralFactsOf = (free) => JSON.stringify({
        serverUrl: free.serverUrl,
        proxyPort: free.proxyPort,
        opencodePath: free.opencodePath,
        serverPassword: free.serverPassword,
        manageBackend: free.manageBackend,
        disableTools: free.disableTools,
        internalAllowedTools: free.internalAllowedTools,
        promptMode: free.promptMode,
        omitSystemPrompt: free.omitSystemPrompt,
        requestTimeoutMs: free.requestTimeoutMs,
        autoCleanupConversations: free.autoCleanupConversations,
        useIsolatedHome: free.useIsolatedHome,
        zenApiKeyEnv: free.zenApiKeyEnv,
    });
    const buildFreeRuntime = () => {
        const free = options().free;
        const facts = structuralFactsOf(free);
        if (freeRuntime !== undefined) {
            if (facts === freeStructuralFacts)
                return;
            ctx.logger?.warn?.('opencode-gateway: free-route backend facts changed in settings; restart the harness to apply them (the model menu applies live)');
            freeStructuralFacts = facts;
            return;
        }
        freeStructuralFacts = facts;
        try {
            const zenApiKey = process.env[free.zenApiKeyEnv] ?? readLocalOpencodeKey();
            const proxy = createLocalProxy(normalizeLocalProxyConfig({
                id: free.provider,
                baseURL: free.serverUrl,
                serverPassword: free.serverPassword,
                opencodePath: free.opencodePath,
                manageBackend: free.manageBackend,
                zenApiKey: zenApiKey ?? '',
                disableTools: free.disableTools,
                internalAllowedTools: [...free.internalAllowedTools],
                promptMode: free.promptMode,
                omitSystemPrompt: free.omitSystemPrompt,
                requestTimeoutMs: free.requestTimeoutMs,
                autoCleanupConversations: free.autoCleanupConversations,
                useIsolatedHome: free.useIsolatedHome,
                toolLockPluginPath: assetsPath,
            }));
            const runtime = { free, proxy, serverReady: false };
            freeRuntime = runtime;
            void startLoopbackServer({
                port: free.proxyPort,
                listModels: () => runtime.proxy.listModels(),
                handleChat: (body, stream) => runtime.proxy.handleChat(body, stream),
                handleResponses: (body, stream) => runtime.proxy.handleResponses(body, stream),
            }).then((started) => {
                if (freeRuntime !== runtime)
                    return;
                runtime.server = started;
                runtime.serverReady = true;
                ensure();
            }, (error) => {
                ctx.logger?.error?.(`opencode-gateway: free route unavailable, loopback listener failed: ${error?.message ?? error}`);
                ensure();
            });
        }
        catch (error) {
            ctx.logger?.error?.(`opencode-gateway: inlined local proxy failed to start: ${error?.message ?? error}`);
            freeRuntime = undefined;
        }
    };
    buildFreeRuntime();
    // --- discovery facts ----------------------------------------------------
    let gatewayListing = [];
    let freeListing = [];
    let version = 0;
    const buildGatewayState = () => {
        const profile = gatewayProfile(options().gateway, gatewayListing);
        return {
            profile,
            menu: (profile.piProvider?.getModels?.() ?? []).map(model => ({ id: model.id, name: model.name })),
        };
    };
    const buildFreeState = () => {
        const profile = freeProfile(options().free, freeListing);
        return {
            profile,
            menu: (profile.piProvider?.getModels?.() ?? []).map(model => ({ id: model.id, name: model.name })),
        };
    };
    let states = new Map();
    let statesVersion = -1;
    let statesServerReady = false;
    /** Memoized profiles; a change in discovery facts or server readiness rebuilds. */
    const profilesMap = () => {
        const serverReady = freeRuntime?.serverReady === true;
        if (statesVersion === version && statesServerReady === serverReady)
            return states;
        const next = new Map();
        next.set(options().gateway.provider, buildGatewayState());
        if (serverReady)
            next.set(options().free.provider, buildFreeState());
        states = next;
        statesVersion = version;
        statesServerReady = serverReady;
        return states;
    };
    const adapter = new PiAiAdapter({
        profiles: () => {
            const map = new Map();
            for (const state of profilesMap().values())
                map.set(state.profile.provider, state.profile);
            return map;
        },
        resolveApiKey: async (provider, profile) => {
            if (provider === options().free.provider)
                return 'opencode-local';
            const ref = profile.apiKeyEnv;
            if (ref === undefined) {
                throw new LlmError(`opencode-gateway: route "${provider}" names no credential reference`, 'MISSING_CREDENTIAL');
            }
            const value = await resolveCredential(ctx, ref);
            if (value === undefined) {
                throw new LlmError(`opencode-gateway: no credential resolved from ${ref}; set ${ref} in ~/.dsh/.env or the environment`
                    + ' (any non-empty value works while the gateway runs without a token)', 'MISSING_CREDENTIAL');
            }
            return assertUsableApiKey(value, 'opencode-gateway', ref);
        },
        auth: { credentials: emptyCredentialStore(), authContext: minimalAuthContext() },
        resolveAttachments: () => ctx.get('attachments'),
        onReplayDegrade: ({ provider, model, reason }) => {
            ctx.logger?.warn?.(`opencode-gateway: unusable replay state on ${provider}/${model}; sending it as neutral content (${reason})`);
        },
    });
    let registration;
    let directory;
    let registrationFacts;
    let directoryFacts;
    const factsOf = (value) => JSON.stringify(value);
    const ensure = () => {
        const map = profilesMap();
        const routes = [...map.keys()];
        const registrationNext = factsOf(routes);
        const directoryNext = factsOf(directoryEntries(map));
        if (registrationNext === registrationFacts && directoryNext === directoryFacts)
            return;
        try {
            if (registration === undefined) {
                if (routes.length > 0)
                    registration = ctx.llm.registerAdapter(routes, adapter);
            }
            else {
                registration.replace(routes);
            }
            registrationFacts = registrationNext;
            const entries = directoryEntries(map);
            if (directory === undefined)
                directory = ctx.llm.registerConfigurableProviders(entries);
            else
                directory.replace(entries);
            directoryFacts = directoryNext;
        }
        catch (error) {
            ctx.logger?.error?.(`opencode-gateway: route registration failed: ${error?.message ?? error}`);
        }
    };
    ensure();
    function directoryEntries(map) {
        return [...map.values()].map(state => ({
            provider: state.profile.provider,
            displayName: state.profile.displayName,
            settingsNs: name,
            settingsPath: [state.profile.provider === options().free.provider ? 'free' : 'gateway'],
            catalog: {
                routes: [],
                models: state.menu,
                ...state.profile.apiKeyEnv === undefined ? {} : { credentialEnv: state.profile.apiKeyEnv },
            },
        }));
    }
    // Settings-page edits land as volatile updates; the facts compare decides
    // whether a re-registration is due.
    ctx.on('loader/volatile-update', () => {
        buildFreeRuntime();
        version += 1;
        ensure();
    });
    // Model discovery for the settings page's refresh: one registration, routed
    // by the request's provider, respecting each route's own prefixes. A second
    // apply in one context (a reload whose previous fiber is still alive) must
    // not take the whole plugin down, so a refused duplicate is a warning, not a
    // throw.
    try {
        ctx.llm.registerModelDiscovery(name, async (request) => {
            const current = options();
            if (request.provider === current.free.provider) {
                // opencode's own answer, not the backend's credentialed provider view:
                // only the former is the free tier (see ./free-listing.ts). It needs no
                // healthy backend, so the card can list free models before one is up.
                const ids = await listFreeModels({ opencodePath: resolveOpencodePath(current.free.opencodePath).path ?? current.free.opencodePath });
                // Same registry enrichment the gateway branch gets; the free tier's ids
                // are already the proxy's raw wire spelling, so nothing is deduped here.
                return ids.map(id => discoveryRow(enrichFromRegistry({ id }), current.free.displayName));
            }
            const key = await resolveCredential(ctx, current.gateway.apiKeyEnv).catch(() => undefined);
            const ids = await fetchGatewayListing(current.gateway.baseURL, key);
            // The gateway aggregates several upstreams, so one listing carries ids
            // from sources that are not the Go subscription under look-alike
            // prefixes; projection keeps the official prefix and drops the rest, so
            // the refresh result is exactly what OpenCode currently offers on Go.
            return projectGatewayListing(ids, current.gateway)
                .map(entry => discoveryRow(entry, current.gateway.displayName));
        });
    }
    catch (error) {
        ctx.logger?.warn?.(`opencode-gateway: model discovery not (re)registered: ${error?.message ?? error}`);
    }
    // --- discovery refresh --------------------------------------------------
    const sleep = (ms) => new Promise(resolvePromise => setTimeout(resolvePromise, ms));
    const refreshOnce = async () => {
        const current = options();
        const key = await resolveCredential(ctx, current.gateway.apiKeyEnv).catch(() => undefined);
        const gatewayNext = await fetchGatewayListing(current.gateway.baseURL, key);
        // Same source the card's refresh reads, so the poll cannot disagree with it.
        const freeNext = await listFreeModels({ opencodePath: resolveOpencodePath(current.free.opencodePath).path ?? current.free.opencodePath });
        const changed = !sameList(gatewayNext, gatewayListing) || !sameList(freeNext, freeListing);
        gatewayListing = gatewayNext;
        freeListing = freeNext;
        if (changed) {
            version += 1;
            ensure();
        }
        return;
    };
    (async () => {
        // Bounded boot retries, then keep serving the configured/seed menus.
        for (const delay of [0, 5_000, 20_000, 60_000]) {
            if (delay > 0)
                await sleep(delay);
            try {
                await refreshOnce();
                if (gatewayListing.length > 0)
                    return;
            }
            catch { /* soft: retry or keep current facts */ }
        }
    })().catch(() => { });
    // The free backend comes up on first use, so keep polling softly; the timer
    // never keeps the host process alive by itself.
    const pollTimer = setInterval(() => { void refreshOnce().catch(() => { }); }, 60_000);
    pollTimer.unref?.();
    ctx.effect(function* () {
        yield () => {
            clearInterval(pollTimer);
            void freeRuntime?.server?.close();
            // killBackend only ends a backend this proxy spawned; one reused from
            // the gateway stays with the gateway.
            freeRuntime?.proxy.killBackend();
        };
    }, 'opencode-gateway disposal');
}
/**
 * One projected route entry as the settings page renders it: the entry's own
 * registry-enriched facts, labeled `<group>/<bare id>` so the page rows, the
 * menu and the composer chip all read the same way. Projection already resolved
 * the facts, so nothing is looked up again here.
 */
function discoveryRow(entry, groupLabel) {
    const bare = bareModelId(entry.id);
    return {
        id: entry.id,
        name: `${groupLabel}/${bare}`,
        ...(entry.contextWindow === undefined ? {} : { contextWindow: entry.contextWindow }),
        ...(entry.maxTokens === undefined ? {} : { maxTokens: entry.maxTokens }),
        ...(entry.input === undefined ? {} : { inputModalities: [...entry.input] }),
    };
}
function sameList(next, previous) {
    return next.length === previous.length && next.every((id, index) => id === previous[index]);
}
