/**
 * The shipped model menus, aligned with the user's ZCode provider config
 * (`C:\Users\liujie\.zcode\v2\provider_config.json`): exactly the fifteen
 * models that config lists for the gateway provider — eight OpenCode Go
 * subscription entries and seven Zen free-tier entries — enriched with the
 * measured OpenCode Go registry (windows, effort vocabularies, vision).
 *
 * The free route serves the same seven free models under the proxy's raw wire
 * ids (`opencode/<model>` — the gateway's `free/` spelling is its own display
 * rewrite and does not exist on the inlined proxy).
 *
 * @module dsh-opencode-gateway/default-models
 */

import type { RouteModel } from './config.ts'
import { reasoningEffortsFor, lookupEntry } from './registry.ts'

const effortsOf = (bareId: string) => {
  const entry = lookupEntry(bareId)
  return entry === undefined ? undefined : reasoningEffortsFor(entry)
}

/** Gateway route: the ZCode list, verbatim ids, registry-enriched metadata. */
export const GATEWAY_DEFAULT_MODELS: readonly RouteModel[] = [
  { id: 'go/deepseek-v4.1-flash', name: 'DeepSeek V4.1 Flash', contextWindow: 1_000_000, reasoningEfforts: effortsOf('deepseek-v4.1-flash'), input: ['text', 'image'] },
  { id: 'go/glm-5.3-flash', name: 'GLM-5.3 Flash', contextWindow: 1_000_000, reasoningEfforts: effortsOf('glm-5.3-flash'), input: ['text', 'image'] },
  { id: 'go/hy4-preview', name: 'HY-4 Preview', contextWindow: 1_000_000, reasoningEfforts: effortsOf('hy4-preview'), input: ['text'] },
  { id: 'go/mimo-v2.6-flash', name: 'MiMo V2.6 Flash', contextWindow: 1_000_000, reasoningEfforts: effortsOf('mimo-v2.6-flash'), input: ['text', 'image'] },
  { id: 'go/mimo-v2.6-pro', name: 'MiMo V2.6 Pro', contextWindow: 1_000_000, reasoningEfforts: effortsOf('mimo-v2.6-pro'), input: ['text', 'image'] },
  { id: 'go/gpt-5.6-luna', name: 'GPT-5.6 Luna', contextWindow: 1_050_000, reasoningEfforts: effortsOf('gpt-5.6-luna'), input: ['text', 'image'] },
  { id: 'go/kimi-k3', name: 'Kimi K3', contextWindow: 1_048_576, reasoningEfforts: effortsOf('kimi-k3'), input: ['text', 'image'] },
  { id: 'go/grok-4.7', name: 'Grok 4.7', contextWindow: 500_000, reasoningEfforts: effortsOf('grok-4.7'), input: ['text', 'image'] },
  { id: 'free/big-pickle', name: 'Big Pickle' },
  { id: 'free/space-bunny-free', name: 'Space Bunny Free', contextWindow: 1_048_576 },
  { id: 'free/ling-3.1-flash-free', name: 'Ling 3.1 Flash' },
  { id: 'free/mimo-v2.6-flash-free', name: 'MiMo V2.6 Flash', contextWindow: 1_000_000 },
  { id: 'free/longcat-2.5-preview-free', name: 'LongCat 2.5 Preview', contextWindow: 1_048_576 },
  { id: 'free/nemotron-3-ultra-free', name: 'Nemotron 3 Ultra' },
  { id: 'free/nemotron-3.5-lightning-free', name: 'Nemotron 3.5 Lightning' },
]

/** Free route: the same seven free models under the proxy's raw wire ids. */
export const FREE_DEFAULT_MODELS: readonly RouteModel[] = [
  { id: 'opencode/big-pickle', name: 'Big Pickle' },
  { id: 'opencode/space-bunny-free', name: 'Space Bunny Free', contextWindow: 1_048_576 },
  { id: 'opencode/ling-3.1-flash-free', name: 'Ling 3.1 Flash' },
  { id: 'opencode/mimo-v2.6-flash-free', name: 'MiMo V2.6 Flash', contextWindow: 1_000_000 },
  { id: 'opencode/longcat-2.5-preview-free', name: 'LongCat 2.5 Preview', contextWindow: 1_048_576 },
  { id: 'opencode/nemotron-3-ultra-free', name: 'Nemotron 3 Ultra' },
  { id: 'opencode/nemotron-3.5-lightning-free', name: 'Nemotron 3.5 Lightning' },
]
