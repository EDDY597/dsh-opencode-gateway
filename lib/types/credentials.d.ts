/**
 * Credential resolution and the minimal pi-ai auth adapters this plugin's
 * routes run behind.
 *
 * Both routes authenticate through `apiKeyEnv` alone — the gateway route via a
 * credential reference resolved per request, the free route with a literal
 * dummy because the loopback proxy holds the backend password itself. Neither
 * route performs OAuth, so the collection-level `CredentialStore` this plugin
 * supplies is honestly empty: the ambient store exists because pi-ai requires
 * one, and a route whose only auth path is the per-request key override never
 * reads it.
 *
 * @module dsh-opencode-gateway/credentials
 */
import type { Context } from '@deepseek-ai/cordis';
import type { AuthContext, CredentialStore } from '@earendil-works/pi-ai';
/**
 * Resolve one credential reference through the optional credentials service,
 * then the launch environment, then the process environment.
 * @param ctx - the plugin context carrying the optional `ctx.credentials`.
 * @param name - the reference name (an environment-variable name).
 * @returns the secret, or undefined when no layer holds one.
 */
export declare function resolveCredential(ctx: Context, name: string): Promise<string | undefined>;
/**
 * The local opencode login key for the Zen backend, read straight from
 * opencode's own auth file — the same fallback the gateway's embedded upstream
 * uses, so a machine signed into `opencode auth login` needs no extra
 * configuration here. Ported from opencode-api-plugin's gateway.ts.
 * @returns the key, or undefined when opencode is not signed in.
 */
export declare function readLocalOpencodeKey(): string | undefined;
/**
 * A pi-ai `CredentialStore` over nothing. This plugin's routes authenticate
 * per request through their resolved `apiKeyEnv`; pi-ai requires the store to
 * exist, so the honest empty implementation is supplied rather than pi-ai's
 * in-memory default (which would also be empty, but only by accident).
 * @returns the store to hand `PiAiAdapter`.
 */
export declare function emptyCredentialStore(): CredentialStore;
/**
 * A pi-ai `AuthContext` over the process environment and host filesystem.
 * The credential seam is deliberately absent: this plugin resolves its own
 * references per request, and no provider in its routes performs the ambient
 * discovery a seam-backed `env()` would feed.
 * @returns the auth context to hand `PiAiAdapter`.
 */
export declare function minimalAuthContext(): AuthContext;
