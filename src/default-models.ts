/**
 * The shipped model menus, aligned with the user's ZCode provider config
 * (`C:\Users\liujie\.zcode\v2\provider_config.json`): exactly the fifteen
 * models that config lists for the gateway provider — eight OpenCode Go
 * subscription entries and seven Zen free-tier entries — enriched with the
 * measured OpenCode Go registry (windows, effort vocabularies, vision).
 *
 * Entry names read `<group displayName>/<bare model id>` (e.g.
 * `OpenCode Go/deepseek-v4.1-flash`): that one string is what both the model
 * menu rows and the composer's model chip render, per the user's request that
 * the chip carry the group prefix. The free route serves the same seven free
 * models under the proxy's raw wire ids (`opencode/<model>` — the gateway's
 * `free/` spelling is its own display rewrite and does not exist on the
 * inlined proxy).
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

/** Gateway route: the ZCode list, verbatim ids, registry-enriched metadata. */
export const GATEWAY_DEFAULT_MODELS: readonly RouteModel[] = [
  { id: 'go/deepseek-v4.1-flash', name: label('OpenCode Go', 'go/deepseek-v4.1-flash'), contextWindow: 1_000_000, reasoningEfforts: effortsOf('deepseek-v4.1-flash'), input: ['text', 'image'] },
  { id: 'go/glm-5.3-flash', name: label('OpenCode Go', 'go/glm-5.3-flash'), contextWindow: 1_000_000, reasoningEfforts: effortsOf('glm-5.3-flash'), input: ['text', 'image'] },
  { id: 'go/hy4-preview', name: label('OpenCode Go', 'go/hy4-preview'), contextWindow: 1_000_000, reasoningEfforts: effortsOf('hy4-preview'), input: ['text'] },
  { id: 'go/mimo-v2.6-flash', name: label('OpenCode Go', 'go/mimo-v2.6-flash'), contextWindow: 1_000_000, reasoningEfforts: effortsOf('mimo-v2.6-flash'), input: ['text', 'image'] },
  { id: 'go/mimo-v2.6-pro', name: label('OpenCode Go', 'go/mimo-v2.6-pro'), contextWindow: 1_000_000, reasoningEfforts: effortsOf('mimo-v2.6-pro'), input: ['text', 'image'] },
  { id: 'go/gpt-5.6-luna', name: label('OpenCode Go', 'go/gpt-5.6-luna'), contextWindow: 1_050_000, reasoningEfforts: effortsOf('gpt-5.6-luna'), input: ['text', 'image'] },
  { id: 'go/kimi-k3', name: label('OpenCode Go', 'go/kimi-k3'), contextWindow: 1_048_576, reasoningEfforts: effortsOf('kimi-k3'), input: ['text', 'image'] },
  { id: 'go/grok-4.7', name: label('OpenCode Go', 'go/grok-4.7'), contextWindow: 500_000, reasoningEfforts: effortsOf('grok-4.7'), input: ['text', 'image'] },
  { id: 'free/big-pickle', name: label('OpenCode Free', 'free/big-pickle') },
  { id: 'free/space-bunny-free', name: label('OpenCode Free', 'free/space-bunny-free'), contextWindow: 1_048_576 },
  { id: 'free/ling-3.1-flash-free', name: label('OpenCode Free', 'free/ling-3.1-flash-free') },
  { id: 'free/mimo-v2.6-flash-free', name: label('OpenCode Free', 'free/mimo-v2.6-flash-free'), contextWindow: 1_000_000 },
  { id: 'free/longcat-2.5-preview-free', name: label('OpenCode Free', 'free/longcat-2.5-preview-free'), contextWindow: 1_048_576 },
  { id: 'free/nemotron-3-ultra-free', name: label('OpenCode Free', 'free/nemotron-3-ultra-free') },
  { id: 'free/nemotron-3.5-lightning-free', name: label('OpenCode Free', 'free/nemotron-3.5-lightning-free') },
]

/** Free route: the same seven free models under the proxy's raw wire ids. */
export const FREE_DEFAULT_MODELS: readonly RouteModel[] = [
  { id: 'opencode/big-pickle', name: label('OpenCode Free', 'opencode/big-pickle') },
  { id: 'opencode/space-bunny-free', name: label('OpenCode Free', 'opencode/space-bunny-free'), contextWindow: 1_048_576 },
  { id: 'opencode/ling-3.1-flash-free', name: label('OpenCode Free', 'opencode/ling-3.1-flash-free') },
  { id: 'opencode/mimo-v2.6-flash-free', name: label('OpenCode Free', 'opencode/mimo-v2.6-flash-free'), contextWindow: 1_000_000 },
  { id: 'opencode/longcat-2.5-preview-free', name: label('OpenCode Free', 'opencode/longcat-2.5-preview-free'), contextWindow: 1_048_576 },
  { id: 'opencode/nemotron-3-ultra-free', name: label('OpenCode Free', 'opencode/nemotron-3-ultra-free') },
  { id: 'opencode/nemotron-3.5-lightning-free', name: label('OpenCode Free', 'opencode/nemotron-3.5-lightning-free') },
]
