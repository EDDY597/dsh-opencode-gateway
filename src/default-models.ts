/**
 * The shipped model menus.
 *
 * The gateway route ships exactly the eight OpenCode Go subscription models
 * from the user's ZCode provider config, enriched with the measured OpenCode
 * Go registry (windows, effort vocabularies, vision). The Zen free models
 * belong to the free route (the backend's raw wire ids — bare since the Go
 * opencode2api became the free backend) and are
 * deliberately NOT menu defaults here: a refresh on the Go card filters the
 * gateway's aggregated listing down to the subscription family, per the
 * route's `hiddenModels` prefixes.
 *
 * Entry names read `<group displayName>/<bare model id>` (e.g.
 * `OpenCode Go/deepseek-v4.1-flash`): that one string is what both the model
 * menu rows and the composer's model chip render.
 *
 * @module dsh-opencode-gateway/default-models
 */

import type { RouteModel } from './config.ts'
import { reasoningEffortsFor, lookupEntry, bareModelId } from './registry.ts'

const effortsOf = (bareId: string) => {
  const entry = lookupEntry(bareId)
  return entry === undefined ? undefined : reasoningEffortsFor(entry)
}

const label = (group: string, id: string) => `${group}/${bareModelId(id)}`

/** Gateway route: the ZCode subscription list, verbatim `go/` ids. */
export const GATEWAY_DEFAULT_MODELS: readonly RouteModel[] = [
  { id: 'go/deepseek-v4.1-flash', name: label('OpenCode Go', 'go/deepseek-v4.1-flash'), contextWindow: 1_000_000, reasoningEfforts: effortsOf('deepseek-v4.1-flash'), input: ['text', 'image'] },
  { id: 'go/glm-5.3-flash', name: label('OpenCode Go', 'go/glm-5.3-flash'), contextWindow: 1_000_000, reasoningEfforts: effortsOf('glm-5.3-flash'), input: ['text', 'image'] },
  { id: 'go/hy4-preview', name: label('OpenCode Go', 'go/hy4-preview'), contextWindow: 1_000_000, reasoningEfforts: effortsOf('hy4-preview'), input: ['text'] },
  { id: 'go/mimo-v2.6-flash', name: label('OpenCode Go', 'go/mimo-v2.6-flash'), contextWindow: 1_000_000, reasoningEfforts: effortsOf('mimo-v2.6-flash'), input: ['text', 'image'] },
  { id: 'go/mimo-v2.6-pro', name: label('OpenCode Go', 'go/mimo-v2.6-pro'), contextWindow: 1_000_000, reasoningEfforts: effortsOf('mimo-v2.6-pro'), input: ['text', 'image'] },
  { id: 'go/gpt-5.6-luna', name: label('OpenCode Go', 'go/gpt-5.6-luna'), contextWindow: 1_050_000, reasoningEfforts: effortsOf('gpt-5.6-luna'), input: ['text', 'image'] },
  { id: 'go/kimi-k3', name: label('OpenCode Go', 'go/kimi-k3'), contextWindow: 1_048_576, reasoningEfforts: effortsOf('kimi-k3'), input: ['text', 'image'] },
  { id: 'go/grok-4.7', name: label('OpenCode Go', 'go/grok-4.7'), contextWindow: 500_000, reasoningEfforts: effortsOf('grok-4.7'), input: ['text', 'image'] },
]

/**
 * Free route: the free tier under the backend's raw wire ids.
 *
 * In `service` mode (default) these are the bare ids the Go opencode2api's
 * `/v1/models` answers (`models.free_only: true` on the companion config makes
 * that listing exactly the free tier); in `embedded` mode the ids carry the
 * `opencode/` prefix `opencode models` prints. The card's refresh reads the
 * same source, so the shipped list and a live refresh agree by construction.
 * Context windows come from opencode's catalog (`limit.context`); ids the
 * upstream has retired drop out on the first live refresh.
 */
export const FREE_DEFAULT_MODELS: readonly RouteModel[] = [
  { id: 'beam-free', name: label('OpenCode Free', 'beam-free'), contextWindow: 1_048_576 },
  { id: 'big-pickle', name: label('OpenCode Free', 'big-pickle'), contextWindow: 200_000 },
  { id: 'deepseek-v4.1-flash-free', name: label('OpenCode Free', 'deepseek-v4.1-flash-free'), contextWindow: 200_000 },
  { id: 'flint-40b-free', name: label('OpenCode Free', 'flint-40b-free'), contextWindow: 200_000 },
  { id: 'glm-5.3-flash-free', name: label('OpenCode Free', 'glm-5.3-flash-free'), contextWindow: 200_000 },
  { id: 'mimo-v2.6-flash-free', name: label('OpenCode Free', 'mimo-v2.6-flash-free'), contextWindow: 200_000 },
  { id: 'nemotron-3.5-lightning-free', name: label('OpenCode Free', 'nemotron-3.5-lightning-free'), contextWindow: 262_144 },
  { id: 'nemotron-3.5-super-vl-free', name: label('OpenCode Free', 'nemotron-3.5-super-vl-free'), contextWindow: 1_048_576 },
]
