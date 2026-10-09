/**
 * OpenCode backend lifecycle management (ported from opencode2api src/proxy.js, MIT).
 *
 * The embedded local upstream spawns `opencode serve` on demand, waits for it to become
 * healthy, and shuts it down with the gateway. On Windows the backend runs with the real
 * user home (opencode storage paths) inside an empty workspace directory; on Unix-like
 * systems an optional fake-home jail provides isolation.
 */
export declare const OPENCODE_BASENAME = "opencode";
export declare const STARTUP_WAIT_ITERATIONS = 60;
export declare const STARTUP_WAIT_INTERVAL_MS = 2000;
export declare const STARTING_WAIT_ITERATIONS = 120;
export declare const STARTING_WAIT_INTERVAL_MS = 1000;
export type BackendState = {
    isStarting: boolean;
    process: any;
    jailRoot: string | null;
};
export declare function getBackendState(stateKey: string): BackendState;
export declare function sleep(ms: number): Promise<unknown>;
export declare function buildBackendAuthHeaders(password?: string): Record<string, string> | undefined;
/**
 * `/global/health` is OpenCode's real health endpoint. `/health` is not an API route: it
 * falls through to the web UI handler, which may proxy to app.opencode.ai and answer 200
 * even when the API is not usable.
 */
export declare function checkHealth(serverUrl: string, password?: string): Promise<unknown>;
export declare function resolveOpencodePath(requestedPath: string | undefined): {
    path: string | null;
    source: string;
};
/** Kills a spawned process tree. Windows needs taskkill: the child is behind a .cmd shell. */
export declare function killProcessTree(childProcess: any): void;
export type EnsureBackendConfig = {
    serverUrl: string;
    opencodePath: string;
    useIsolatedHome: boolean;
    zenApiKey?: string;
    serverPassword?: string;
    manageBackend: boolean;
    promptMode: string;
    toolLockPluginPath: string;
};
/**
 * Merges the tool-lock plugin into OPENCODE_CONFIG_CONTENT for the spawned backend,
 * keeping any config the operator already passes that way.
 */
export declare function buildBackendConfigContent(existing: string | undefined, toolLockPluginPath: string): string;
export declare function ensureBackend(config: EnsureBackendConfig): Promise<void>;
/** Kills the managed backend for a server URL (used on shutdown). */
export declare function killBackendFor(serverUrl: string): void;
