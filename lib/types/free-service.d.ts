/**
 * Client and lifecycle for the free route's `service` mode: the standalone Go
 * [opencode2api](https://github.com/jasonxu114514/opencode2api).
 *
 * Since Oct 2026 OpenCode rejects free-tier traffic that does not look like its
 * own client (403 FreeTierError on raw API calls) and meters the free quota per
 * egress IP (429 `Free usage limit reached`, intermittent). The Go service is
 * the working path: it speaks to the upstream with full client fidelity (uTLS
 * Bun ClientHello, OpenCode 2.1 version and `/inference` routes, byte-for-byte
 * bodies) and rotates egress exits with a per-exit cooldown.
 *
 * The route keeps its loopback listener (see ./local/loopback.ts) and swaps the
 * handler backend: every call here is a thin authenticated passthrough to the
 * service's OpenAI-compatible surface (`/v1/models`, `/v1/chat/completions`,
 * `/v1/responses`).
 *
 * @module dsh-opencode-gateway/free-service
 */
/** Client for one Go opencode2api endpoint. */
export interface FreeServiceClient {
    /** The service base URL, without a version segment. */
    serviceUrl: string;
    /** The service's server key (Bearer). */
    apiKey: string;
}
/** Default locations of the companion gateway's service files, or nulls. */
export interface DefaultServicePaths {
    exePath: string | null;
    configPath: string | null;
}
/**
 * Resolve the companion gateway's `bin\opencode2api.exe` and `bin\config.json`.
 *
 * The plugin and the gateway are deployed as sibling checkouts
 * (`E:\Agent\dsh-opencode-gateway` next to `E:\Agent\opencode-api-plugin`), and
 * the gateway's start scripts keep the service binary and its config there.
 * @param packageRoot - this plugin's package root (the parent of `src/` in a
 *   source checkout, of `lib/` in a built one).
 * @returns existing paths; a missing file comes back as null.
 */
export declare function defaultServicePaths(pluginRoot: string): DefaultServicePaths;
/**
 * Read the service's server key out of its own config file.
 *
 * This is the zero-configuration path: the plugin and the service are managed
 * by the same operator, so the key the service already requires is right there
 * in `server_keys[0]`. An explicit `serviceApiKeyEnv` still wins.
 * @param configPath - the service's config.json.
 * @returns the first enabled server key, or undefined.
 */
export declare function readServiceKeyFromConfig(configPath: string): string | undefined;
/**
 * Probe the service's unauthenticated health endpoint.
 *
 * The Go service itself answers `GET /health` (measured on oc2api 18090:
 * `/healthz` and `/readyz` are 404, `/health` and `/` are 200), while the
 * gateway's cli-server shim answers `/healthz`. Both are unauthenticated, so
 * either one decides "is anything listening" before credentials exist; probing
 * only one path reads the other build's 404 as "not listening" and the free
 * route then never starts.
 */
export declare function serviceHealthy(serviceUrl: string, timeoutMs?: number): Promise<boolean>;
/** How one spawned service process is tracked for disposal. */
export interface ServiceProcess {
    /** Kill the process this module spawned (a no-op for a reused service). */
    stop(): void;
}
/**
 * Make sure the Go service is listening, spawning it when allowed.
 *
 * A service already listening is reused untouched (the gateway's start scripts
 * own theirs); only a process this call spawns is returned for disposal —
 * same ownership rule the embedded route applies to `opencode serve`.
 * @param options - endpoint, paths, and whether spawning is allowed.
 * @param logger - optional logger for the spawn lifecycle lines.
 * @returns the spawned process, or undefined when one was reused.
 */
export declare function ensureServiceRunning(options: {
    serviceUrl: string;
    apiKey: string;
    manageService: boolean;
    exePath: string;
    configPath: string;
}, logger?: {
    info?: (message: string) => void;
    error?: (message: string) => void;
}): Promise<ServiceProcess | undefined>;
/**
 * The service's free-tier model ids (its `/v1/models` answer).
 *
 * With the companion config's `models.free_only: true` the listing is already
 * exactly the free tier, so no filtering happens here.
 * @returns bare model ids (`big-pickle`), in listing order.
 */
export declare function listServiceModels(client: FreeServiceClient): Promise<string[]>;
/**
 * Chat Completions passthrough.
 *
 * The loopback server hands the parsed body over; this re-serializes it so
 * the service sees the exact JSON the client sent, and returns the fetch
 * `Response` (streaming body included) for the loopback to relay.
 */
export declare function serviceChat(client: FreeServiceClient, body: any, stream: boolean): Promise<Response>;
/**
 * Responses API passthrough, same contract as {@link serviceChat}. The Go
 * service exposes `/v1/responses` natively, so no protocol conversion happens
 * on either side.
 */
export declare function serviceResponses(client: FreeServiceClient, body: any, stream: boolean): Promise<Response>;
/** This module's own directory, for sibling-path resolution. */
export declare function moduleDirname(importMetaUrl: string): string;
