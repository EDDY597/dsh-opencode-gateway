/**
 * Construction of the two pi-ai route profiles this plugin registers.
 *
 * A route the installed pi-ai catalog does not ship is one `createProvider`
 * call over an explicit model list; this module owns that construction —
 * registry enrichment of a live listing, capacity defaults, reasoning-vocab
 * mapping — and hands the adapter fully-built `ResolvedPiAiProviderProfile`
 * snapshots. Everything a request needs is decided here, so the adapter's own
 * snapshot machinery can treat configuration as immutable facts.
 *
 * @module dsh-opencode-gateway/routes
 */

import { createProvider } from '@earendil-works/pi-ai'
import type { Model, ThinkingLevelMap } from '@earendil-works/pi-ai'
import { openAICompletionsApi } from '@earendil-works/pi-ai/api/openai-completions.lazy'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import type { ResolvedPiAiProviderProfile, PiAiModality } from '@deepseek-ai/dsh-llm-pi-ai'
import type { ResolvedRetryPolicy } from '@deepseek-ai/dsh-llm'
import type { ResolvedConfig, RouteModel } from './config.ts'
import {
  GO_REGISTRY,
  GO_REFUSED_MODEL_IDS,
  GO_ROUTE_PREFIXES,
  FREE_SEED,
  bareModelId,
  lookupEntry,
  prettifyId,
  reasoningEffortsFor,
} from './registry.ts'

const NO_COST = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }
const THINKING_LEVELS = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'] as const

/** Rank of a routing prefix; lower wins when one bare id is listed twice. */
function prefixRank(prefix: string): number {
  const index = GO_ROUTE_PREFIXES.indexOf(prefix)
  return index === -1 ? Number.MAX_SAFE_INTEGER : index
}

/**
 * Project a live gateway listing through the curated registry: dedup ids that
 * share a bare model, hide configured prefixes and refused ids, enrich known
 * models with display names, windows and effort vocabularies.
 * @param listingIds - ids the gateway's `/v1/models` answered.
 * @param gateway - the resolved gateway route config.
 * @returns menu entries in listing order, curated metadata applied.
 */
export function projectGatewayListing(listingIds: readonly string[], gateway: ResolvedConfig['gateway']): RouteModel[] {
  const chosen = new Map<string, { wireId: string; rank: number }>()
  for (const listingId of listingIds) {
    if (gateway.hiddenModels.some(prefix => listingId.startsWith(prefix))) continue
    const bare = bareModelId(listingId)
    if (bare.length === 0) continue
    const prefix = listingId.slice(0, listingId.length - bare.length - 1)
    const existing = chosen.get(bare)
    const rank = prefixRank(prefix)
    if (existing === undefined || rank < existing.rank) chosen.set(bare, { wireId: listingId, rank })
  }
  const projected: RouteModel[] = []
  for (const [bare, { wireId }] of chosen) {
    if (GO_REFUSED_MODEL_IDS.includes(bare)) continue
    const entry = lookupEntry(bare)
    projected.push({
      id: wireId,
      ...entry?.displayName === undefined ? {} : { name: entry.displayName },
      ...entry?.contextWindow === undefined ? {} : { contextWindow: entry.contextWindow },
      ...entry === undefined ? {} : { reasoningEfforts: reasoningEffortsFor(entry) },
      ...(entry?.vision === true ? { input: ['text', 'image'] as const } : {}),
    })
  }
  return projected
}

/** Build one pi-ai model from a resolved route entry plus route defaults. */
function toPiModel(
  provider: string,
  baseURL: string,
  entry: RouteModel,
  defaults: { contextWindow: number; maxTokens: number },
): Model<'openai-completions'> {
  const efforts = entry.reasoningEfforts
  const reasoning = efforts !== undefined && efforts !== false && Object.keys(efforts).length > 0
  let thinkingLevelMap: ThinkingLevelMap | undefined
  if (reasoning) {
    const map: ThinkingLevelMap = {}
    for (const level of THINKING_LEVELS) {
      const wire = efforts[level]
      map[level] = wire === undefined || wire === null ? null : wire
    }
    thinkingLevelMap = map
  }
  const name = entry.name ?? prettifyId(bareModelId(entry.id))
  return {
    id: entry.id,
    name,
    api: 'openai-completions',
    provider,
    baseUrl: baseURL,
    reasoning,
    ...(thinkingLevelMap === undefined ? {} : { thinkingLevelMap }),
    input: entry.input !== undefined ? [...entry.input] : ['text'],
    cost: NO_COST,
    contextWindow: entry.contextWindow ?? defaults.contextWindow,
    maxTokens: entry.maxTokens ?? defaults.maxTokens,
  }
}

/** Materialize one route profile: a pi-ai provider plus the adapter's facts. */
function buildProfile(
  provider: string,
  displayName: string,
  baseURL: string,
  models: readonly RouteModel[],
  defaults: { contextWindow: number; maxTokens: number },
  streamIdleTimeoutMs: number,
  retryPolicy: ResolvedRetryPolicy,
  apiKeyEnv?: string,
): ResolvedPiAiProviderProfile {
  const piProvider = createProvider({
    id: provider,
    name: displayName,
    baseUrl: baseURL,
    auth: {
      apiKey: {
        name: displayName,
        resolve: ({ credential }) => Promise.resolve({
          auth: credential?.key === undefined ? {} : { apiKey: credential.key },
          source: displayName,
        }),
      },
    },
    models: models.map(entry => toPiModel(provider, baseURL, entry, defaults)),
    api: openAICompletionsApi(),
  })
  const configuredMaxTokens = new Map<string, number>(
    models.filter(entry => entry.maxTokens !== undefined).map(entry => [entry.id, entry.maxTokens as number]),
  )
  return {
    provider,
    displayName,
    api: 'openai-completions',
    baseURL,
    ...(apiKeyEnv === undefined ? {} : { apiKeyEnv: credentialRef(apiKeyEnv) }),
    streamIdleTimeoutMs,
    maxRequestImageBytes: 20 * 1024 * 1024,
    requestImagePixelBudget: 2048 * 2048,
    requestImageMaxBytes: 1024 * 1024,
    retryPolicy,
    piProvider,
    modelErrors: new Map<string, string>(),
    configuredMaxTokens,
  }
}

/**
 * The gateway route's profile: declared entries first, then the live listing
 * projected through the registry. While discovery has not answered, the
 * curated registry itself is the membership source, so the route is usable
 * the moment the plugin mounts.
 * @param gateway - resolved gateway config.
 * @param listingIds - ids discovered from the gateway (possibly empty).
 */
export function gatewayProfile(gateway: ResolvedConfig['gateway'], listingIds: readonly string[]): ResolvedPiAiProviderProfile {
  const source = listingIds.length > 0
    ? listingIds
    : GO_REGISTRY.map(entry => `go/${entry.id}`)
  const projected = projectGatewayListing(source, gateway)
  const declared = gateway.models
  const seen = new Set(declared.map(entry => entry.id))
  const models = [...declared, ...projected.filter(entry => !seen.has(entry.id))]
  return buildProfile(
    gateway.provider,
    gateway.displayName,
    gateway.baseURL,
    models,
    { contextWindow: gateway.defaultContextWindow, maxTokens: gateway.defaultMaxTokens },
    gateway.streamIdleTimeoutMs,
    gateway.retryPolicy,
    gateway.apiKeyEnv,
  )
}

/**
 * The free route's profile. An explicit models list replaces the menu
 * entirely; otherwise the live listing (or the shipped seed while the backend
 * has not answered) is projected with curated names where they exist.
 * @param free - resolved free config.
 * @param liveIds - ids the inlined proxy reports, empty until its backend is healthy.
 */
export function freeProfile(free: ResolvedConfig['free'], liveIds: readonly string[]): ResolvedPiAiProviderProfile {
  if (free.models.length > 0) {
    return buildProfile(
      free.provider,
      free.displayName,
      `http://127.0.0.1:${free.proxyPort}/v1`,
      free.models,
      { contextWindow: free.defaultContextWindow, maxTokens: free.defaultMaxTokens },
      free.streamIdleTimeoutMs,
      free.retryPolicy,
    )
  }
  const ids = liveIds.length > 0 ? [...liveIds] : FREE_SEED.map(entry => entry.id)
  const models: RouteModel[] = ids.map(id => {
    const curated = FREE_SEED.find(entry => entry.id === id)
    const bare = bareModelId(id)
    return {
      id,
      ...(curated !== undefined ? { name: curated.displayName, contextWindow: curated.contextWindow } : { name: prettifyId(bare) }),
    }
  })
  return buildProfile(
    free.provider,
    free.displayName,
    `http://127.0.0.1:${free.proxyPort}/v1`,
    models,
    { contextWindow: free.defaultContextWindow, maxTokens: free.defaultMaxTokens },
    free.streamIdleTimeoutMs,
    free.retryPolicy,
  )
}

/** The provider-side catalog entries both routes contribute to the model menu. */
export function routeCatalog(profile: ResolvedPiAiProviderProfile): { models: { id: string; name: string }[] } {
  return {
    models: [...profile.piProvider?.getModels?.() ?? []].map(model => ({ id: model.id, name: model.name })),
  }
}

/** Re-exported so callers need not import pi-ai for the modality type. */
export type { PiAiModality }
