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

import z from '@deepseek-ai/schemastery'
import type { Volatile } from '@deepseek-ai/cordis'
import { resolveRetryPolicy, RetryPolicySchema } from '@deepseek-ai/dsh-llm'
import type { ResolvedRetryPolicy, RetryPolicyConfig } from '@deepseek-ai/dsh-llm'
import { MAX_TIMER_DELAY_MS } from '@deepseek-ai/dsh-timeout'

/** One model entry in a route's models list. */
export interface RouteModel {
  /** Model id the endpoint accepts, verbatim. */
  id: string
  /** Menu label; defaults to the registry's, then a prettified id. */
  name?: string
  /** Combined request and response context capacity in tokens. */
  contextWindow?: number
  /** Output capacity; also becomes this model's per-request default. */
  maxTokens?: number
  /**
   * Offered thinking levels and their wire spellings; `false` declares a
   * non-reasoning model, an omitted field means "no measured vocabulary" —
   * the menu then offers no effort picker for it.
   */
  reasoningEfforts?: false | Record<string, string | null>
  /** Input modalities; defaults to text. */
  input?: readonly ('text' | 'image')[]
}

/** The route through the local gateway. */
export interface GatewayConfig {
  /** Harness route key. */
  provider?: string
  /** Name shown in selectors. */
  displayName?: string
  /** Gateway endpoint, including its version segment. */
  baseURL?: string
  /** Credential reference for the gateway's Bearer token. */
  apiKeyEnv?: string
  /** Listing-id prefixes hidden from the menu (e.g. the free tier the inline route serves). */
  hiddenModels?: string[]
  /** Extra or overriding model entries; merged after the discovered listing. */
  models?: RouteModel[]
  /**
   * Merge the gateway's full live listing into the menu on top of `models`.
   * Off by default: the explicit list is the whole menu, which keeps the
   * duplicate alias spellings an endpoint listing carries out of the picker.
   */
  discoverModels?: boolean
  /** Context capacity for a discovered model nothing else sizes. */
  defaultContextWindow?: number
  /** Output capability for a discovered model nothing else sizes. */
  defaultMaxTokens?: number
  /** Positive provider-idle interval while one stream read is outstanding. */
  streamIdleTimeoutMs?: number
  /** Retries are the gateway's own job; keep this at zero. */
  retryPolicy?: RetryPolicyConfig
}

/** How the free route reaches the free tier. */
export type FreeMode = 'service' | 'embedded'

/** The free tier route. */
export interface FreeConfig {
  /** Harness route key. */
  provider?: string
  /** Name shown in selectors. */
  displayName?: string
  /**
   * Backend kind. `service` (default) proxies to the standalone Go
   * opencode2api (client fingerprinting, exit rotation); `embedded` runs the
   * vendored in-process proxy driving this machine's `opencode serve`.
   */
  mode?: FreeMode
  /** `service` mode: the Go opencode2api base URL. */
  serviceUrl?: string
  /** `service` mode: credential reference for the service's server key. */
  serviceApiKeyEnv?: string
  /** `service` mode: spawn the service executable when it is not listening. */
  manageService?: boolean
  /** `service` mode: the service executable; empty resolves the companion gateway's `bin\opencode2api.exe`. */
  serviceExePath?: string
  /** `service` mode: the service's config file; empty resolves the companion gateway's `bin\config.json`. */
  serviceConfigPath?: string
  /** `embedded` mode: local opencode backend the proxy drives. */
  serverUrl?: string
  /** Port the in-process proxy listens on, loopback only. */
  proxyPort?: number
  /** `embedded` mode: opencode executable. */
  opencodePath?: string
  /** `embedded` mode: spawn `opencode serve` when the backend is absent. */
  manageBackend?: boolean
  /** `embedded` mode: backend Basic Auth password (local secret; the gateway passes it the same way). */
  serverPassword?: string
  /** `embedded` mode: credential reference for the Zen key; falls back to the local opencode login. */
  zenApiKeyEnv?: string
  /** `embedded` mode: disable OpenCode's built-in tools through the tool-lock plugin (free tier needs this). */
  disableTools?: boolean
  /** `embedded` mode: built-in tools kept despite `disableTools`. */
  internalAllowedTools?: string[]
  /** `embedded` mode: proxy prompt mode: `standard` or `plugin-inject`. */
  promptMode?: string
  /** `embedded` mode: ignore the client's system prompt. */
  omitSystemPrompt?: boolean
  /** `embedded` mode: single-request timeout in milliseconds. */
  requestTimeoutMs?: number
  /** `embedded` mode: periodically clean the backend's conversation store. */
  autoCleanupConversations?: boolean
  /** `embedded` mode: Unix fake-home isolation; Windows always uses the real user directory. */
  useIsolatedHome?: boolean
  /** Menu entries; when set, replaces the live listing projection entirely. */
  models?: RouteModel[]
  /** Merge the backend's live listing into the menu on top of `models` (off by default). */
  discoverModels?: boolean
  /** Context capacity for a listed free model nothing else sizes. */
  defaultContextWindow?: number
  /** Output capability for a listed free model nothing else sizes. */
  defaultMaxTokens?: number
  /** Positive provider-idle interval while one stream read is outstanding. */
  streamIdleTimeoutMs?: number
  /** Retries are the proxy's own job; keep this at zero. */
  retryPolicy?: RetryPolicyConfig
}

/** Plugin configuration. Volatile sections are live settings refs at runtime. */
export interface Config {
  gateway?: Volatile<GatewayConfig> | GatewayConfig
  free?: Volatile<FreeConfig> | FreeConfig
}

/**
 * Read one config section through either shape it arrives in: a live
 * `Volatile` ref (the loader hands volatile fields as refs, so a settings
 * write reaches the running plugin) or a plain object (composition tests,
 * and the pre-1.7 loader shape).
 * @param section - the config field as handed to `apply`.
 * @returns the section's current value, or undefined when unset.
 */
export function readSection<T extends object>(section: Volatile<T> | T | undefined): T | undefined {
  if (section === undefined) return undefined
  const ref = section as Volatile<T>
  return typeof ref?.get === 'function' ? (ref.get() as unknown as T) : (section as T)
}

/** Fully resolved configuration for both routes. */
export interface ResolvedConfig {
    gateway: {
    provider: string
    displayName: string
    baseURL: string
    apiKeyEnv: string
    hiddenModels: string[]
    discoverModels: boolean
    models: RouteModel[] | undefined
    defaultContextWindow: number
    defaultMaxTokens: number
    streamIdleTimeoutMs: number
    retryPolicy: ResolvedRetryPolicy
  }
    free: {
    provider: string
    displayName: string
    mode: FreeMode
    serviceUrl: string
    serviceApiKeyEnv: string
    manageService: boolean
    serviceExePath: string
    serviceConfigPath: string
    serverUrl: string
    proxyPort: number
    opencodePath: string
    manageBackend: boolean
    serverPassword?: string
    zenApiKeyEnv: string
    disableTools: boolean
    internalAllowedTools: string[]
    promptMode: string
    omitSystemPrompt: boolean
    requestTimeoutMs: number
    autoCleanupConversations: boolean
    useIsolatedHome: boolean
    models: RouteModel[] | undefined
    discoverModels: boolean
    defaultContextWindow: number
    defaultMaxTokens: number
    streamIdleTimeoutMs: number
    retryPolicy: ResolvedRetryPolicy
  }
}

const DEFAULT_GATEWAY = {
  provider: 'opencode-gateway',
  displayName: 'OpenCode Go',
  baseURL: 'http://127.0.0.1:8787/v1',
  apiKeyEnv: 'OPENCODE_GATEWAY_KEY',
  hiddenModels: ['free/'],
  discoverModels: false,
  defaultContextWindow: 262_144,
  defaultMaxTokens: 32_768,
  streamIdleTimeoutMs: 300_000,
  // Two bounded retries, not zero: the upstream (opencode.ai via the proxy
  // chain) kills long streaming turns mid-flight; its structured error frame
  // classifies as TRANSPORT — inside dsh-llm's default retryable set — so an
  // executor plugin (official @deepseek-ai/dsh-llm-retry) reruns the whole
  // step instead of surfacing the failure.
  retryPolicy: { mode: 'normal', maxRetries: 2 } as RetryPolicyConfig,
}

const DEFAULT_FREE = {
  provider: 'opencode-free',
  displayName: 'OpenCode Free',
  // 'service' proxies to the standalone Go opencode2api (client fingerprinting,
  // exit rotation — the free tier's working path since OpenCode tightened its
  // client detection in Oct 2026); 'embedded' drives the machine's `opencode
  // serve` through the vendored in-process proxy.
  mode: 'service' as FreeMode,
  serviceUrl: 'http://127.0.0.1:18080',
  serviceApiKeyEnv: 'OPENCODE2API_SERVER_KEY',
  manageService: true,
  // Empty means: resolve the companion gateway's bin\ next to this plugin.
  serviceExePath: '',
  serviceConfigPath: '',
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
  discoverModels: false,
  defaultContextWindow: 262_144,
  defaultMaxTokens: 32_768,
  streamIdleTimeoutMs: 300_000,
  // Same reasoning as DEFAULT_GATEWAY: TRANSPORT failures (cut long turns)
  // become whole-step retries under the official executor plugin.
  retryPolicy: { mode: 'normal', maxRetries: 2 } as RetryPolicyConfig,
}

// The schema shapes stay loose (z.any()) because schemastery's generative
// typing fights `exactOptionalPropertyTypes`; every structural constraint the
// schema would express is enforced at runtime by `resolveRouteModels` and
// `resolveConfig`, which the loader validates composition config through.
//
// Both sections are `.volatile()`: that is what makes the plugin's Config the
// settings form (namespace = the loader entry id, `opencode-gateway`) and what
// makes a user edit reach the running plugin without a remount. `models`
// carries NO schema default on purpose — absent means "inherit" (composition
// base, then the shipped menu), while a set empty array means the user took
// the menu over and unchecked everything; those two states must stay distinct.
// Schemastery would defeat that on its own: a bare `z.array(...)` comes back as
// `[]` for a caller who never mentioned it, which is also how every route ends
// up with no menu at all. `optionalList` keeps an omitted list omitted.
const optionalList = (item: z<any>): z<any> => z.union([z.array(item), z.const(undefined)])

const modelEntry: z<RouteModel> = z.object({
  id: z.string().required(),
  name: z.string(),
  contextWindow: z.number(),
  maxTokens: z.number(),
  reasoningEfforts: z.any(),
  input: optionalList(z.string()),
}) as unknown as z<RouteModel>

const gatewaySectionSchema: z<GatewayConfig> = z.object({
  provider: z.string().default(DEFAULT_GATEWAY.provider),
  displayName: z.string().default(DEFAULT_GATEWAY.displayName),
  baseURL: z.string().default(DEFAULT_GATEWAY.baseURL),
  apiKeyEnv: z.string().default(DEFAULT_GATEWAY.apiKeyEnv),
  hiddenModels: z.array(z.string()).default([...DEFAULT_GATEWAY.hiddenModels]),
  discoverModels: z.boolean().default(DEFAULT_GATEWAY.discoverModels),
  models: optionalList(modelEntry),
  defaultContextWindow: z.number().default(DEFAULT_GATEWAY.defaultContextWindow),
  defaultMaxTokens: z.number().default(DEFAULT_GATEWAY.defaultMaxTokens),
  streamIdleTimeoutMs: z.number().default(DEFAULT_GATEWAY.streamIdleTimeoutMs),
  retryPolicy: RetryPolicySchema,
}).default({})

const freeSectionSchema: z<FreeConfig> = z.object({
  provider: z.string().default(DEFAULT_FREE.provider),
  displayName: z.string().default(DEFAULT_FREE.displayName),
  mode: z.union([z.const('service'), z.const('embedded')]).default(DEFAULT_FREE.mode),
  serviceUrl: z.string().default(DEFAULT_FREE.serviceUrl),
  serviceApiKeyEnv: z.string().default(DEFAULT_FREE.serviceApiKeyEnv),
  manageService: z.boolean().default(DEFAULT_FREE.manageService),
  serviceExePath: z.string().default(DEFAULT_FREE.serviceExePath),
  serviceConfigPath: z.string().default(DEFAULT_FREE.serviceConfigPath),
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
  models: optionalList(modelEntry),
  discoverModels: z.boolean().default(DEFAULT_FREE.discoverModels),
  defaultContextWindow: z.number().default(DEFAULT_FREE.defaultContextWindow),
  defaultMaxTokens: z.number().default(DEFAULT_FREE.defaultMaxTokens),
  streamIdleTimeoutMs: z.number().default(DEFAULT_FREE.streamIdleTimeoutMs),
  retryPolicy: RetryPolicySchema,
}).default({})

/** Runtime schema for {@link Config}; the volatile sections are the settings form. */
export const Config = z.object({
  gateway: gatewaySectionSchema.volatile(),
  free: freeSectionSchema.volatile(),
})

function positiveInteger(value: number, label: string, max?: number): number {
  if (!Number.isInteger(value) || value <= 0 || (max !== undefined && value > max)) {
    throw new Error(`opencode-gateway: ${label} must be a positive integer${max !== undefined ? ` no greater than ${max}` : ''}`)
  }
  return value
}

function resolveRouteModels(raw: RouteModel[] | undefined, label: string): RouteModel[] {
  const models = [...(raw ?? [])]
  const seen = new Set<string>()
  for (const entry of models) {
    if (typeof entry?.id !== 'string' || entry.id.length === 0) {
      throw new Error(`opencode-gateway: ${label} has a model with a missing or empty id`)
    }
    if (seen.has(entry.id)) throw new Error(`opencode-gateway: ${label} lists model "${entry.id}" more than once`)
    seen.add(entry.id)
    if (entry.contextWindow !== undefined) positiveInteger(entry.contextWindow, `${label} model "${entry.id}" contextWindow`)
    if (entry.maxTokens !== undefined) positiveInteger(entry.maxTokens, `${label} model "${entry.id}" maxTokens`)
    const efforts = entry.reasoningEfforts
    if (efforts !== undefined && efforts !== false) {
      if (typeof efforts !== 'object') {
        throw new Error(`opencode-gateway: ${label} model "${entry.id}" reasoningEfforts must be false or a level dict`)
      }
      const levels = Object.keys(efforts).filter(level => level !== 'off')
      if (levels.length === 0) {
        throw new Error(`opencode-gateway: ${label} model "${entry.id}" reasoningEfforts offers no level beyond "off"`)
      }
      for (const [level, wire] of Object.entries(efforts)) {
        if (level !== 'off' && wire === null) {
          throw new Error(`opencode-gateway: ${label} model "${entry.id}" reasoningEfforts.${level} needs the wire value dispatch should send; only "off" may leave it empty`)
        }
        if (typeof wire === 'string' && wire.length === 0) {
          throw new Error(`opencode-gateway: ${label} model "${entry.id}" reasoningEfforts.${level} must not be an empty string`)
        }
      }
    }
    if (entry.input !== undefined) {
      if (entry.input.length === 0) {
        throw new Error(`opencode-gateway: ${label} model "${entry.id}" input must name at least one modality`)
      }
      for (const modality of entry.input) {
        if (modality !== 'text' && modality !== 'image') {
          throw new Error(`opencode-gateway: ${label} model "${entry.id}" input modality must be "text" or "image"`)
        }
      }
    }
  }
  return models
}

/**
 * Resolve and validate deployment configuration once per plugin load.
 * @param source - composition values to resolve.
 * @returns a detached configuration both routes build from.
 */
/** Plain (non-volatile) configuration input resolveConfig accepts. */
export interface ConfigInput {
  gateway?: GatewayConfig
  free?: FreeConfig
}

export function resolveConfig(source: ConfigInput): ResolvedConfig {
  const gatewayRaw = source.gateway ?? {}
  const freeRaw = source.free ?? {}
  const gatewayProvider = gatewayRaw.provider ?? DEFAULT_GATEWAY.provider
  const freeProvider = freeRaw.provider ?? DEFAULT_FREE.provider
  if (gatewayProvider.length === 0) throw new Error('opencode-gateway: gateway.provider must be non-empty')
  if (freeProvider.length === 0) throw new Error('opencode-gateway: free.provider must be non-empty')
  if (gatewayProvider === freeProvider) {
    throw new Error(`opencode-gateway: both routes resolve to provider "${gatewayProvider}"`)
  }
  const gatewayBaseURL = gatewayRaw.baseURL ?? DEFAULT_GATEWAY.baseURL
  if (gatewayBaseURL.length === 0) throw new Error('opencode-gateway: gateway.baseURL must be non-empty')
  const freeServerUrl = freeRaw.serverUrl ?? DEFAULT_FREE.serverUrl
  if (freeServerUrl.length === 0) throw new Error('opencode-gateway: free.serverUrl must be non-empty')
  const apiKeyEnv = gatewayRaw.apiKeyEnv ?? DEFAULT_GATEWAY.apiKeyEnv
  if (apiKeyEnv.length === 0) throw new Error('opencode-gateway: gateway.apiKeyEnv must be non-empty')
  const promptMode = freeRaw.promptMode ?? DEFAULT_FREE.promptMode
  if (promptMode !== 'standard' && promptMode !== 'plugin-inject') {
    throw new Error('opencode-gateway: free.promptMode must be "standard" or "plugin-inject"')
  }
  const hiddenModels = [...(gatewayRaw.hiddenModels ?? DEFAULT_GATEWAY.hiddenModels)]
  if (hiddenModels.some(prefix => prefix.length === 0)) {
    throw new Error('opencode-gateway: gateway.hiddenModels entries must be non-empty')
  }
  const serverPassword = freeRaw.serverPassword
  return {
    gateway: {
      provider: gatewayProvider,
      displayName: gatewayRaw.displayName ?? gatewayProvider,
      baseURL: gatewayBaseURL.replace(/\/+$/, ''),
      apiKeyEnv,
      hiddenModels,
      discoverModels: gatewayRaw.discoverModels ?? DEFAULT_GATEWAY.discoverModels,
      models: gatewayRaw.models === undefined ? undefined : resolveRouteModels(gatewayRaw.models, 'gateway.models'),
      defaultContextWindow: positiveInteger(gatewayRaw.defaultContextWindow ?? DEFAULT_GATEWAY.defaultContextWindow, 'gateway.defaultContextWindow'),
      defaultMaxTokens: positiveInteger(gatewayRaw.defaultMaxTokens ?? DEFAULT_GATEWAY.defaultMaxTokens, 'gateway.defaultMaxTokens'),
      streamIdleTimeoutMs: positiveInteger(gatewayRaw.streamIdleTimeoutMs ?? DEFAULT_GATEWAY.streamIdleTimeoutMs, 'gateway.streamIdleTimeoutMs', MAX_TIMER_DELAY_MS),
      retryPolicy: resolveRetryPolicy(gatewayRaw.retryPolicy ?? DEFAULT_GATEWAY.retryPolicy, 'opencode-gateway: gateway.retryPolicy'),
    },
    free: {
      provider: freeProvider,
      displayName: freeRaw.displayName ?? freeProvider,
      mode: freeRaw.mode ?? DEFAULT_FREE.mode,
      serviceUrl: (freeRaw.serviceUrl ?? DEFAULT_FREE.serviceUrl).replace(/\/+$/, ''),
      serviceApiKeyEnv: freeRaw.serviceApiKeyEnv ?? DEFAULT_FREE.serviceApiKeyEnv,
      manageService: freeRaw.manageService ?? DEFAULT_FREE.manageService,
      serviceExePath: freeRaw.serviceExePath ?? DEFAULT_FREE.serviceExePath,
      serviceConfigPath: freeRaw.serviceConfigPath ?? DEFAULT_FREE.serviceConfigPath,
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
      models: freeRaw.models === undefined ? undefined : resolveRouteModels(freeRaw.models, 'free.models'),
      discoverModels: freeRaw.discoverModels ?? DEFAULT_FREE.discoverModels,
      defaultContextWindow: positiveInteger(freeRaw.defaultContextWindow ?? DEFAULT_FREE.defaultContextWindow, 'free.defaultContextWindow'),
      defaultMaxTokens: positiveInteger(freeRaw.defaultMaxTokens ?? DEFAULT_FREE.defaultMaxTokens, 'free.defaultMaxTokens'),
      streamIdleTimeoutMs: positiveInteger(freeRaw.streamIdleTimeoutMs ?? DEFAULT_FREE.streamIdleTimeoutMs, 'free.streamIdleTimeoutMs', MAX_TIMER_DELAY_MS),
      retryPolicy: resolveRetryPolicy(freeRaw.retryPolicy ?? DEFAULT_FREE.retryPolicy, 'opencode-gateway: free.retryPolicy'),
    },
  }
}

/** Default settings used by an absent section and by composition examples. */
export const DEFAULT_CONFIG: Config = {
  gateway: { ...DEFAULT_GATEWAY, hiddenModels: [...DEFAULT_GATEWAY.hiddenModels] },
  free: {
    ...DEFAULT_FREE,
    internalAllowedTools: [...DEFAULT_FREE.internalAllowedTools],
    mode: DEFAULT_FREE.mode,
  },
}
