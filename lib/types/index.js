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
 * plugin installs no settings section — configuration lives in the
 * composition layer, and cordis restarts the plugin when it changes.
 *
 * @module dsh-opencode-gateway
 */
import { fileURLToPath } from 'node:url';
import { assertUsableApiKey, LlmError } from '@deepseek-ai/dsh-llm';
import { PiAiAdapter } from '@deepseek-ai/dsh-llm-pi-ai';
import { DEFAULT_CONFIG, resolveConfig } from "./config.js";
import { createLocalProxy, normalizeLocalProxyConfig } from "./local/local-proxy.js";
import { startLoopbackServer } from "./local/loopback.js";
import { fetchGatewayListing } from "./discovery.js";
import { emptyCredentialStore, minimalAuthContext, readLocalOpencodeKey, resolveCredential, } from "./credentials.js";
import { gatewayProfile, freeProfile } from "./routes.js";
export { Config, DEFAULT_CONFIG } from "./config.js";
export { fetchGatewayListing } from "./discovery.js";
export { emptyCredentialStore, minimalAuthContext, readLocalOpencodeKey, resolveCredential } from "./credentials.js";
export { freeProfile, gatewayProfile, projectGatewayListing } from "./routes.js";
export { GO_REFUSED_MODEL_IDS, GO_REGISTRY, FREE_SEED, reasoningEffortsFor } from "./registry.js";
/** Cordis plugin name; also the log and error-message prefix. */
export const name = 'opencode-gateway';
/** Services required by this provider plugin. */
export const inject = ['llm'];
/** Install both routes on the LLM seam. */
export function apply(ctx, config) {
    const resolved = resolveConfig(config ?? DEFAULT_CONFIG);
    // --- free route: inlined local proxy + loopback listener ----------------
    const assetsPath = fileURLToPath(new URL('../assets/opencode2api-tool-lock.js', import.meta.url));
    const zenApiKey = process.env[resolved.free.zenApiKeyEnv] ?? readLocalOpencodeKey();
    let proxy;
    try {
        proxy = createLocalProxy(normalizeLocalProxyConfig({
            id: resolved.free.provider,
            baseURL: resolved.free.serverUrl,
            serverPassword: resolved.free.serverPassword,
            opencodePath: resolved.free.opencodePath,
            manageBackend: resolved.free.manageBackend,
            zenApiKey: zenApiKey ?? '',
            disableTools: resolved.free.disableTools,
            internalAllowedTools: [...resolved.free.internalAllowedTools],
            promptMode: resolved.free.promptMode,
            omitSystemPrompt: resolved.free.omitSystemPrompt,
            requestTimeoutMs: resolved.free.requestTimeoutMs,
            autoCleanupConversations: resolved.free.autoCleanupConversations,
            useIsolatedHome: resolved.free.useIsolatedHome,
            toolLockPluginPath: assetsPath,
        }));
    }
    catch (error) {
        ctx.logger?.error?.(`opencode-gateway: inlined local proxy failed to start: ${error?.message ?? error}`);
    }
    let server;
    let serverReady = false;
    const serverPromise = proxy === undefined
        ? Promise.resolve(undefined)
        : startLoopbackServer({
            port: resolved.free.proxyPort,
            listModels: () => proxy?.listModels() ?? Promise.resolve([]),
            handleChat: (body, stream) => proxy?.handleChat(body, stream) ?? Promise.resolve(new Response(null, { status: 503 })),
            handleResponses: (body, stream) => proxy?.handleResponses(body, stream) ?? Promise.resolve(new Response(null, { status: 503 })),
        }).then((started) => {
            server = started;
            serverReady = true;
            ensure();
            return started;
        }, (error) => {
            ctx.logger?.error?.(`opencode-gateway: free route unavailable, loopback listener failed: ${error?.message ?? error}`);
            ensure();
            return undefined;
        });
    void serverPromise;
    // --- discovery facts ----------------------------------------------------
    let gatewayListing = [];
    let freeListing = [];
    let version = 0;
    const buildGatewayState = () => {
        const profile = gatewayProfile(resolved.gateway, gatewayListing);
        return {
            profile,
            menu: (profile.piProvider?.getModels?.() ?? []).map(model => ({ id: model.id, name: model.name })),
        };
    };
    const buildFreeState = () => {
        const profile = freeProfile(resolved.free, freeListing);
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
        if (statesVersion === version && statesServerReady === serverReady)
            return states;
        const next = new Map();
        next.set(resolved.gateway.provider, buildGatewayState());
        if (serverReady && proxy !== undefined)
            next.set(resolved.free.provider, buildFreeState());
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
            if (provider === resolved.free.provider)
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
            settingsPath: [],
            catalog: {
                routes: [],
                models: state.menu,
                ...state.profile.apiKeyEnv === undefined ? {} : { credentialEnv: state.profile.apiKeyEnv },
            },
        }));
    }
    // --- discovery refresh --------------------------------------------------
    const sleep = (ms) => new Promise(resolvePromise => setTimeout(resolvePromise, ms));
    const refreshOnce = async () => {
        const key = await resolveCredential(ctx, resolved.gateway.apiKeyEnv).catch(() => undefined);
        const gatewayNext = await fetchGatewayListing(resolved.gateway.baseURL, key);
        const freeNext = server !== undefined
            ? await proxy?.listModels().catch(() => []) ?? []
            : [];
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
            void server?.close();
            // killBackend only ends a backend this proxy spawned; one reused from
            // the gateway stays with the gateway.
            proxy?.killBackend();
        };
    }, 'opencode-gateway disposal');
}
function sameList(next, previous) {
    return next.length === previous.length && next.every((id, index) => id === previous[index]);
}
