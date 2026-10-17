# dsh-opencode-gateway

**English** | [中文](./README.zh-CN.md)

A DeepSeek Harness (DSH) plugin that wires the local opencode ecosystem into DSH's model menu with two provider routes:

| Route | Endpoint | What it carries |
| --- | --- | --- |
| `opencode-gateway` | `http://127.0.0.1:8787/v1` (the local [opencode-api-plugin](https://github.com/EDDY597/opencode-api-plugin) gateway) | Everything the gateway aggregates: the OpenCode Go subscription (reading the machine's local opencode login state), OpenCode Zen, and any custom upstreams in `gateway.config.json` |
| `opencode-free` | in-process loopback proxy (default `http://127.0.0.1:10102/v1`) | The inlined opencode2api port driving the machine's own `opencode serve` backend for the Zen free tier — **no gateway process needed** |

By design this plugin ships **no usage panel**; quota display lives in the gateway's `/api/usage` and the tray.

## Features

- **Curated OpenCode Go registry** — the default menu follows the user's ZCode list (15 models); display names, context windows, effort vocabularies, vision flags and a refusal list for 41 entries, measured request-by-request and ported from [AIMFllyYS/dsh-protocom-api](https://github.com/AIMFllyYS/dsh-protocom-api) (MIT) — including the measured quirks (Go spells its disable word `off` and refuses `none`; grok/muse serve `/responses` only, which the gateway converts transparently).
- **Live model discovery** (soft-failing) — both routes mount immediately with configured/seed menus and upgrade in place once the endpoint's listing answers; a failed read keeps the current facts serving.
- **Managed backend lifecycle** — the free route spawns `opencode serve` when absent (first init ~10–20 s) and reclaims only a backend **it spawned**; one reused from the gateway stays with the gateway.
- **In-process loopback bridge** — pi-ai's transport needs a real URL, so the plugin wraps the LocalProxy functions in an HTTP listener bound to loopback only (default 10102, configurable); the listener never holds the host's event loop, so headless tasks still exit.

## System requirements

- **DSH ≥ 0.1.7-rc.2 and < 0.3.0-0** (measured peer range); verified on **0.2.0-rc.2**
- The free tier needs the opencode CLI installed; `opencode auth login` is recommended (better model list and limits, anonymous works too)
- The gateway route needs the companion gateway [EDDY597/opencode-api-plugin](https://github.com/EDDY597/opencode-api-plugin) running (`start-gateway.cmd`, `start-tray-hidden.vbs` or the tray)
- The gateway route also requires the gateway's `opencode-go` upstream to be **enabled with `prefix: "go"`** (the gateway's example config does this) and `OPENCODE_GATEWAY_KEY=<gateway token>` in `~/.dsh/.env`. Missing either one makes the Go card's refresh report "missing credential / HTTP 401 / empty listing" explicitly instead of failing silently.

## Install

### Desktop app (recommended)

Open the app, choose **Plugins** in the sidebar, click **Add plugin** and paste a local path:

```
D:/Agent/dsh-opencode-gateway
```

or a Git spec (once published):

```
github:<owner>/dsh-opencode-gateway#v0.1.0
```

Click **Install**, wait for pnpm, then click **Enable now**.

### CLI

```bash
pnpm dsh plugin --profile web add "D:/Agent/dsh-opencode-gateway"
```

> The installer runs a full compatibility sandbox install, which can take many minutes on this machine; hand-composing the profile is faster — see the Chinese README.

## Configure

The plugin installs no settings UI; configuration lives in the composition layer (the profile's `cordis.patch.yml`, `~/.dsh/profiles/desktop/` on the desktop app) and takes effect on restart:

```yaml
- id: opencode-gateway
  name: dsh-opencode-gateway
  config:
    gateway:
      provider: opencode-gateway
      displayName: OpenCode Go
      baseURL: http://127.0.0.1:8787/v1
      apiKeyEnv: OPENCODE_GATEWAY_KEY
      hiddenModels: ["free/"]
      models: []
    free:
      provider: opencode-free
      serverUrl: http://127.0.0.1:10001
      proxyPort: 10102
      opencodePath: opencode
      manageBackend: true
      zenApiKeyEnv: OPENCODE_ZEN_API_KEY
      disableTools: true
      internalAllowedTools: [webfetch, bash, websearch]
```

## Model manager page

DSH settings gain an **OpenCode Gateway** section (plugin v0.2.0+): one card per route (OpenCode Go / OpenCode Free) managing that route's model menu.

- **Refresh** pulls the live listing (OpenCode Go via the gateway's `/v1/models`, OpenCode Free via the inlined proxy's backend listing). A refresh waits up to 60s; 401/timeout/network failures report their reason, and only a 200 with an empty list shows the empty-listing notice. **The Go card keeps only the `go/` prefix** — the gateway's `opencode-go` upstream reading `https://opencode.ai/zen/go/v1/models`, which measured one for one against the official endpoint; the gateway-side upstream must therefore use `prefix: "go"` (the example config does). That same listing mixes in two other sources under look-alike prefixes, neither of which is the Go subscription, and both are dropped: `opencode-go/` is the local `opencode serve` backend's catalog (passed through by the `local-free` upstream, whose `modelRewrite` maps only `opencode/`), and `free/` is that same backend's Zen catalog, paid models included. Reading `opencode-go/` as an alias spelling of `go/` is what put `opencode-go/step-5-preview-free` — a local entry the official endpoint does not list — on the Go card.
- **No frozen list**: menu membership follows the live listing alone. A model the endpoint adds shows up (e.g. `go/beam-free`); one it drops disappears; `hiddenModels` remains available for extra exclusions inside the official set. There is **no confirmed-unavailable blacklist** — "this id cannot serve a turn" is a measurement of one moment, not a property of the model, and freezing it would both hide newly added official models and keep misreporting after the endpoint fixes something. An official id is kept even if a given request fails; the gateway's own error is then reported verbatim.
- **The free card takes opencode's own answer**: its candidate rows come from `opencode models`, run with `OPENCODE_API_KEY` removed and reduced to the `opencode/` prefix, so they match the free tier you see in the CLI line for line (10 models on this machine). **Do not derive this from the local backend's provider config**: that view is credentialed — with the key set, its `opencode` provider also reports the paid catalog (measured 84 models), and filtering it by `cost` both **missed** free models it does not list at all (`beam-free`, `deepseek-v4.1-flash-free`, `glm-5.3-flash-free`, `nemotron-3.5-super-vl-free`) and **kept** region-blocked ones (`cat-jam-free`, `muse-spark-1.3-contributor-free`). The answer is cached for 10 minutes and falls back to the last good result, so one failed spawn never reads as "the free tier vanished".
- **Checkboxes** decide what lands in the model menu (composer chip included); newly discovered models are tagged and unchecked.
- **Stale cleanup**: a checked model a refresh no longer answers is tagged "not listed" and is **never removed on its own**. The card's "Remove N stale" button drops exactly those entries in one save — the only path that changes the menu without unchecking, and always an explicit click. **Guard**: an empty list yields no staleness verdict, and a refresh now distinguishes a 200-with-no-models from a 401/timeout/network failure; the latter shows its own error instead of clearing anything.
- **Save checked** commits one revision-fenced settings write; the menu and chip update immediately and survive restarts; a conflict reloads the snapshot and drops staging.
- **Restore defaults** unsets that route's `models` — the menu falls back to the shipped list (or the composition `models`, when configured).

Precedence: saved settings `models` (even an empty array) > composition `cordis.patch.yml` `models` > shipped defaults. Saved entries that carry only id/name/context are enriched by the host from the measured registry (missing effort vocabulary and vision flags; an explicit `reasoningEfforts: false` is never touched). Backend-structural fields (serverUrl / proxyPort / opencodePath …) ask for a restart when changed on the page; the model menu applies live.

### Environment (`~/.dsh/.env`)

| Variable | Meaning |
| --- | --- |
| `OPENCODE_GATEWAY_KEY` | The gateway's Bearer token; **any non-empty value works while the gateway runs without a token**. A refresh without it reports "no credential resolved…" directly; a chat request fails before network I/O with `MISSING_CREDENTIAL` |
| `OPENCODE_ZEN_API_KEY` | Passed to the backend as `OPENCODE_API_KEY` to unlock paid models; falls back to the local opencode login state (v0.1 reads the process environment only, not the credentials seam) |

### `models[]` entries

| Field | Meaning |
| --- | --- |
| `id` | The model id the endpoint accepts, forwarded verbatim |
| `name` | Selector label |
| `contextWindow` / `maxTokens` | Capacities; `maxTokens` also becomes that model's per-request default output cap |
| `reasoningEfforts` | `false` declares a non-reasoning model; a dict `{level: wire spelling}`, where only `off` may be empty (send nothing) |
| `input` | `["text","image"]` declares image input |

## How it works

- **Two routes, one adapter**: `PiAiAdapter` reads the current profiles snapshot once per operation; changed discovery facts atomically `replace` the registration — no restart, no disturbed in-flight stream.
- **Loopback bridge**: request bodies buffer into a fetch `Request`; responses stream back out. A mid-stream drop after the headers are flushed destroys the socket instead of throwing `ERR_HTTP_HEADERS_SENT` into the server callback.
- **Single retry layer**: the plugin's `retryPolicy` defaults to `normal/maxRetries 0` — retries belong to the gateway (subscription routes) or the inlined proxy (free route), never both.
- **Thinking bridging**: `reasoning_content`, `reasoning` + `reasoning_details`, and inline think tags all flow through pi-ai's delta parser into DSH's reasoning-delta collapse (the gateway strips Go routes' inline tags server-side).

## Known limits (v0.1)

- **No usage panel** (by design); quota lives in `/api/usage` + the tray.
- **`zenApiKeyEnv` reads the process environment only**; stored credential references are not resolved yet.
- **Headless one-shot tasks linger on exit**: a control run with this plugin removed lingers the same way — DSH headless base behavior, not this plugin.
- Two processes racing to spawn the same backend port (10001): a failed spawn surfaces an error and a retry succeeds; health-check-before-spawn mitigates it.

## Troubleshooting: the Go card refresh reports an empty listing

That notice is a safe failure: the menu is never modified. Check these three things in order; any one of them being wrong yields an empty listing.

| Check | Expected | If wrong |
| --- | --- | --- |
| The gateway's `opencode-go` upstream in `gateway.config.json` | `"enabled": true`, `"prefix": "go"`; `apiKey` either omitted (local login) or a Go-subscribed key | apply the template below, then tray → Restart service |
| `curl -H "Authorization: Bearer <token>" http://127.0.0.1:8787/v1/models` | contains `go/...` | only `free/...`: prefix or switch not applied; HTTP 401: token mismatch |
| `OPENCODE_GATEWAY_KEY` in `~/.dsh/.env` | equals the gateway `token` | set it, then restart DSH |

Minimal gateway-side config:

```json
{
  "port": 8787,
  "token": "<gateway token>",
  "upstreams": [
    {
      "id": "opencode-go",
      "type": "opencode-go",
      "prefix": "go",
      "enabled": true
    }
  ]
}
```

Notes:

- **The Go card only accepts `go/`.** An upstream with `prefix: "opencode-go"` lists `opencode-go/...`, which the plugin drops as the local backend's catalog by design.
- **The first refresh may be empty.** On a cold gateway the listing returns the last good result within 8s and refreshes in the background; refresh again once it lands.
- A refresh now distinguishes a 200 empty listing from HTTP 401 and timeouts; `no credential resolved from OPENCODE_GATEWAY_KEY` means `.env` is missing the variable.
- **The free tier is unaffected**: the `OpenCode Free` card never goes through the 8787 gateway.

Two common chat-side errors:

- `403 An active OpenCode Go subscription is required`: the gateway's `opencode-go` key has no Go subscription (the listing may still be fine — the catalog is public). Omit `apiKey` to use the local `opencode auth login` state, or use a subscribed key, then restart the gateway.
- `Connection error.`: the gateway process is not running — not a key problem. `curl http://127.0.0.1:8787/health` must answer `{"status":"ok"}`.

## Development

```bash
pnpm install
pnpm run build   # tsdown → lib/index.js (Host, ESM); tsc -b → lib/types
pnpm run test    # vitest
```

The `lib/` build output is committed alongside the sources (git installs need no build) — run `pnpm run build` before committing code changes.

## License

[MIT](./LICENSE) © 2026 — contains the embedded opencode2api implementation ported from opencode-api-plugin (itself ported from [TiaraBasori/opencode2api](https://github.com/TiaraBasori/opencode2api), MIT; license copy at `assets/LICENSE.md`), and the OpenCode Go registry measurements from dsh-protocom-api (MIT).
