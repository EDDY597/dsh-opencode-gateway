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

import { accessSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve as resolvePath } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { launchEnvironmentOf } from '@deepseek-ai/dsh-launch-environment'
import { credentialRef, isCredentialRefName } from '@deepseek-ai/dsh-credentials'
import type { CredentialRef } from '@deepseek-ai/dsh-credentials'
import type { AuthContext, CredentialInfo, CredentialStore } from '@earendil-works/pi-ai'

/**
 * Resolve one credential reference through the optional credentials service,
 * then the launch environment, then the process environment.
 * @param ctx - the plugin context carrying the optional `ctx.credentials`.
 * @param name - the reference name (an environment-variable name).
 * @returns the secret, or undefined when no layer holds one.
 */
export async function resolveCredential(ctx: Context, name: string): Promise<string | undefined> {
  const ref: CredentialRef = credentialRef(name)
  if (isCredentialRefName(name)) {
    const credentials = ctx.get('credentials')
    const hit = credentials !== undefined ? await credentials.resolve(ref) : undefined
    if (hit !== undefined && hit.value.length > 0) return hit.value
  }
  const env = launchEnvironmentOf(ctx).get(name)
  if (env !== undefined && env.value.length > 0) return env.value
  const direct = process.env[name]
  return direct !== undefined && direct.length > 0 ? direct : undefined
}

/** Where opencode stores its auth state across platforms. */
function opencodeAuthPath(): string {
  if (process.platform === 'win32') {
    return join(process.env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local'), 'opencode', 'auth.json')
  }
  if (process.platform === 'darwin') {
    return join(homedir(), 'Library', 'Application Support', 'opencode', 'auth.json')
  }
  const xdg = process.env.XDG_DATA_HOME ?? join(homedir(), '.local', 'share')
  return join(xdg, 'opencode', 'auth.json')
}

/**
 * The local opencode login key for the Zen backend, read straight from
 * opencode's own auth file — the same fallback the gateway's embedded upstream
 * uses, so a machine signed into `opencode auth login` needs no extra
 * configuration here. Ported from opencode-api-plugin's gateway.ts.
 * @returns the key, or undefined when opencode is not signed in.
 */
export function readLocalOpencodeKey(): string | undefined {
  const path = opencodeAuthPath()
  if (!accessExists(path)) return undefined
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as Record<string, any>
    for (const [id, entry] of Object.entries(parsed ?? {})) {
      const key = typeof entry === 'string' ? entry : (entry?.key ?? entry?.api_key ?? entry?.accessToken)
      if (typeof key === 'string' && key.length > 0 && /opencode|zen/i.test(id)) return key
    }
    for (const entry of Object.values(parsed ?? {})) {
      const key = typeof entry === 'string' ? entry : (entry?.key ?? entry?.api_key ?? entry?.accessToken)
      if (typeof key === 'string' && key.length > 0) return key
    }
  } catch {
    // Unreadable or malformed auth state is the same answer as signed out.
  }
  return undefined
}

function accessExists(path: string): boolean {
  try {
    accessSync(path)
    return true
  } catch {
    return false
  }
}

/**
 * A pi-ai `CredentialStore` over nothing. This plugin's routes authenticate
 * per request through their resolved `apiKeyEnv`; pi-ai requires the store to
 * exist, so the honest empty implementation is supplied rather than pi-ai's
 * in-memory default (which would also be empty, but only by accident).
 * @returns the store to hand `PiAiAdapter`.
 */
export function emptyCredentialStore(): CredentialStore {
  return {
    async read() {
      return undefined
    },
    async list(): Promise<readonly CredentialInfo[]> {
      return []
    },
    async modify() {
      throw new Error('opencode-gateway: this plugin stores no credentials; authenticate routes through apiKeyEnv')
    },
    async delete() {
      // Nothing stored, nothing to remove.
    },
  }
}

/**
 * A pi-ai `AuthContext` over the process environment and host filesystem.
 * The credential seam is deliberately absent: this plugin resolves its own
 * references per request, and no provider in its routes performs the ambient
 * discovery a seam-backed `env()` would feed.
 * @returns the auth context to hand `PiAiAdapter`.
 */
export function minimalAuthContext(): AuthContext {
  return {
    async env(name) {
      return process.env[name]
    },
    async fileExists(path) {
      const expanded = path.startsWith('~/') || path === '~'
        ? resolvePath(homedir(), path.slice(1).replace(/^\//, ''))
        : path
      return accessExists(expanded)
    },
  }
}
