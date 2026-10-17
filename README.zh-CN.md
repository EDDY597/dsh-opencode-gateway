# dsh-opencode-gateway

[English](./README.md) | **中文**

DeepSeek Harness（DSH）插件：把本机 opencode 生态接进 DSH 的模型菜单，两条 provider route：

| route | 端点 | 承载内容 |
| --- | --- | --- |
| `opencode-gateway` | `http://127.0.0.1:8787/v1`（本机 [opencode-api-plugin](https://github.com/EDDY597/opencode-api-plugin) 网关） | 网关聚合的一切：OpenCode Go 订阅（读本地 opencode 登录态）、OpenCode Zen、以及 gateway.config.json 里的任意自定义上游 |
| `opencode-free` | 插件进程内环回代理（默认 `http://127.0.0.1:10102/v1`） | 内联的 opencode2api 移植：驱动本机 `opencode serve` 后端访问 Zen 免费档，**不依赖网关进程** |

按设计本插件**不带用量面板**；额度显示由网关的 `/api/usage` 与托盘承担。

## 功能

- **OpenCode Go 精修名录**：默认菜单对齐 ZCode 的 15 个模型；41 个条目的展示名、上下文窗口、思考强度词表、视觉标记与拒用名单实测值移植自 [AIMFllyYS/dsh-protocom-api](https://github.com/AIMFllyYS/dsh-protocom-api)（MIT）——包括 Go 用 `off` 拒 `none`、Grok/Muse 只认 `/responses`（网关侧已自动转换）这类实测坑。
- **实时模型发现**（软失败）：两条路由先以配置/种子菜单挂载，端点 listing 回答后原地升级；发现失败静默保持现状，对话不中断。
- **后端生命周期托管**：免费档后端不在时自动 spawn `opencode serve`（首次约 10~20 秒），插件卸载时只回收**自己 spawn 的**后端；复用自网关的后端留给网关。
- **进程内环回桥**：pi-ai 传输需要真实 URL，插件把 LocalProxy 函数包成一个仅绑定回环地址的 HTTP 监听（默认 10102，可配）；环回服务永不驻留事件循环，headless 任务照常退出。

## 系统要求

- **DSH ≥ 0.1.7-rc.2 且 < 0.3.0-0**（peer 实测范围），已在 **0.2.0-rc.2** 验证
- 免费档需要本机装有 opencode CLI，建议先 `opencode auth login`（免费账号模型列表与限额更好，匿名也能用）
- 网关路由需要配套网关 [EDDY597/opencode-api-plugin](https://github.com/EDDY597/opencode-api-plugin) 在运行（`start-gateway.cmd`、`start-tray-hidden.vbs` 或托盘）
- 网关路由还要求网关侧 `opencode-go` upstream **已启用且 `prefix` 为 `go`**（网关示例配置已如此），并在 `~/.dsh/.env` 设置 `OPENCODE_GATEWAY_KEY=<网关 token>`。缺任何一项，Go 卡的刷新会明确报「缺凭据 / HTTP 401 / 空列表」，而不是静默失败。

## 安装

### 桌面端（推荐）

打开应用，侧栏选择「插件」→「添加插件」，粘贴本地路径：

```
D:/Agent/dsh-opencode-gateway
```

或 Git spec（发布后）：

```
github:<owner>/dsh-opencode-gateway#v0.1.0
```

点「安装」，等待 pnpm 完成，点「立即启用」。

### CLI

```bash
pnpm dsh plugin --profile web add "D:/Agent/dsh-opencode-gateway"
```

> 安装器会做完整兼容性沙箱校验，在这台机器上单步可能要十几分钟；直接手动组装 profile 更快，见下节。

## 配置

本插件不安装设置界面；配置写在 composition 层（profile 的 `cordis.patch.yml`，桌面端在 `~/.dsh/profiles/desktop/`），改完重启生效：

```yaml
- id: opencode-gateway
  name: dsh-opencode-gateway
  config:
    gateway:
      provider: opencode-gateway        # 路由名
      displayName: OpenCode Go
      baseURL: http://127.0.0.1:8787/v1
      apiKeyEnv: OPENCODE_GATEWAY_KEY   # 凭据引用（存 ~/.dsh/.env）
      hiddenModels: ["free/"]           # 隐藏的 listing 前缀（免费档归内联路由）
      models: []                        # 额外/覆盖条目
    free:
      provider: opencode-free
      serverUrl: http://127.0.0.1:10001 # opencode 后端
      proxyPort: 10102                  # 环回监听端口
      opencodePath: opencode            # opencode 可执行文件
      manageBackend: true
      zenApiKeyEnv: OPENCODE_ZEN_API_KEY
      disableTools: true                # 免费档必需
      internalAllowedTools: [webfetch, bash, websearch]
```

## 模型管理页

DSH 设置里会出现 **OpenCode 网关** 一节（插件 v0.2.0 起）：两张卡片分别管理 OpenCode Go 与 OpenCode Free 路由的模型菜单。

- **刷新**：向对应端点拉取实时模型列表（OpenCode Go 走网关 `/v1/models`，OpenCode Free 走内联代理的后端 listing）。刷新最多等 60 秒；401/超时/网络错误会显示具体原因，只有「200 但列表为空」才显示空列表提示。**Go 卡片只保留 `go/` 前缀的条目**，即网关 `opencode-go` upstream 对官方 `https://opencode.ai/zen/go/v1/models` 的实时读取（实测该前缀与官方端点逐条一致）；因此网关侧该 upstream 的 `prefix` 必须是 `go`（示例配置已如此）。网关同一份 listing 还混着两个来源的近似前缀，都**不属于 Go 订阅**、一律排除：`opencode-go/` 是本地 `opencode serve` 后端的目录（经 `local-free` upstream 透传，其 `modelRewrite` 只映射 `opencode/`），`free/` 是同一后端的 Zen 目录（付费模型也在其中）。把 `opencode-go/` 当成 `go/` 的别名拼写是错的——那正是 `opencode-go/step-5-preview-free` 这类官方并未提供的本地条目出现在 Go 卡片上的原因。
- **不设静态名单**：菜单成员只由实时 listing 决定。官方新增模型自动出现（如 `go/beam-free`），官方下架的自动消失；`hiddenModels` 仍可作为你在官方集合内额外排除的配置项。**没有任何「已确认不可用」黑名单**——「这个 id 跑不通」是某一刻的实测结论，不是模型的固有属性；写死成名单会既藏住官方新模型，又在官方修好后继续误报。官方列出的模型即便某次请求失败也照原样保留，报错会由网关如实返回。
- **免费档取 opencode 自己的答案**：`OpenCode Free` 卡片的候选行来自 `opencode models` 的输出（运行时剔除 `OPENCODE_API_KEY`，只取 `opencode/` 前缀），因此与你在 CLI 里看到的免费档**逐条一致**（本机 10 个）。**不要用本地后端的 provider 配置做这件事**：那份视图是「带凭据」的，设了 key 时 `opencode` provider 会把付费目录一起报出来（实测 84 个），按 `cost` 过滤会同时**漏掉**它根本不列的免费模型（`beam-free`、`deepseek-v4.1-flash-free`、`glm-5.3-flash-free`、`nemotron-3.5-super-vl-free`）并**多出**地区受限的条目（`cat-jam-free`、`muse-spark-1.3-contributor-free`）。结果按 10 分钟缓存，且失败时回退上次成功结果，不会因一次 spawn 失败显示成"免费档消失"。
- **勾选**：勾选的模型进入模型菜单（含输入框芯片）；未勾选的仅在此列出。从 listing 新发现的模型标"发现"。
- **失效条目清理**：已勾选但某次刷新未再返回的模型会标「不在列表」，**不会被自动移除**。卡片底部的「移除 N 个失效条目」按钮按当前勾选状态一次性剔除它们并保存——这是唯一不经取消勾选就改动菜单的路径，且必须由你点击触发。**防护**：端点返回空列表时不做失效判定；刷新现在会区分「200 空列表」与「401 / 超时 / 网络失败」，后者显示具体错误，不会把整个菜单清空。
- **保存勾选**：以修订号围栏的原子写入 settings 页，菜单与输入框芯片即时更新，重启后保留；冲突时整页重载并丢弃暂存。
- **恢复内置默认**：unset 该路由的 `models`，菜单回到内置清单（组合层 `models` 若配置过则以它为基底）。

优先级：settings 里保存过 `models`（哪怕空数组）> 组合层 `cordis.patch.yml` 的 `models` > 内置默认。保存条目只带 id / 名字 / 容量时，宿主会从内置实测名录补齐缺失的思考强度词表与视觉标记（显式写 `reasoningEfforts: false` 不受影响）。后端结构性字段（serverUrl / proxyPort / opencodePath 等）在设置页改动后需要重启才生效，模型菜单是即时生效的。

### 环境变量（`~/.dsh/.env`）

| 变量 | 说明 |
| --- | --- |
| `OPENCODE_GATEWAY_KEY` | 网关 Bearer token；**网关未设 token 时任意非空值即可**。刷新时缺这个变量会直接报「no credential resolved…」，聊天则在发请求前报 `MISSING_CREDENTIAL` |
| `OPENCODE_ZEN_API_KEY` | 透传为后端 `OPENCODE_API_KEY` 解锁付费模型；未设时回退读本地 opencode 登录态（v0.1 只读进程环境，不走凭据服务） |

### `models[]` 条目

| 字段 | 说明 |
| --- | --- |
| `id` | 端点接受的模型 id，原样转发 |
| `name` | 选择器展示名 |
| `contextWindow` / `maxTokens` | 容量；`maxTokens` 同时成为该模型的每请求默认输出上限 |
| `reasoningEfforts` | `false` 声明不推理；字典 `{档位: 线上拼写}`，仅 `off` 可留空（发 nothing） |
| `input` | `["text","image"]` 声明图片输入 |

## 工作原理

- **双路由一个 adapter**：`PiAiAdapter` 每次操作读取当前 profiles 快照；发现事实变化 → 原子 `replace` 重新注册，不重启、不中断在途流。
- **环回桥**：请求体缓冲进 fetch `Request`，响应逐块写回；头部已发后上游断流按销毁 socket 处理（防 `ERR_HTTP_HEADERS_SENT` 杀宿主）。
- **重试单层**：插件侧 `retryPolicy` 默认 `normal/maxRetries 0`——重试全部由网关（订阅路由）或内联代理（免费路由）承担，避免两层叠乘。
- **思考桥接**：`reasoning_content` / `reasoning`+`reasoning_details` / 内联 think 标签三种形态由 pi-ai 增量解析统一流入 DSH 的 reasoning-delta 折叠显示（Go 路由的内联标签由网关在服务端剥出）。

## 已知限制（v0.1）

- **无用量面板**（按设计）；额度走网关 `/api/usage` + 托盘。
- **`zenApiKeyEnv` 只读进程环境**，暂不解析凭据服务里存的引用。
- **headless 一次性任务退出滞留**：对照实验（拔掉本插件）同样滞留，属 DSH headless 基座行为，与本插件无关。
- 两个进程同时 spawn 同一后端端口（10001）存在竞态：spawn 失败会报错，重试即好；先健康检查再 spawn 的顺序已尽量规避。

## 故障排查：Go 卡刷新报「端点返回了空模型列表」

这条提示是安全失败：插件不会改动菜单。按顺序检查下面三项，任意一项不对都会得到空列表。

| 检查 | 正确状态 | 不对时 |
| --- | --- | --- |
| 网关 `gateway.config.json` 的 `opencode-go` upstream | `"enabled": true`、`"prefix": "go"`、`apiKey` 不是 `REPLACE_WITH_...` | 按下面模板改，托盘 → 重启服务 |
| `curl -H "Authorization: Bearer <token>" http://127.0.0.1:8787/v1/models` | 响应里有 `go/...` | 只有 `free/...`：前缀或开关没生效；HTTP 401：token 不对 |
| `~/.dsh/.env` 的 `OPENCODE_GATEWAY_KEY` | 与网关 `token` 一致 | 写入后重启 DSH |

网关侧最小配置：

```json
{
  "port": 8787,
  "token": "<网关 token>",
  "upstreams": [
    {
      "id": "opencode-go",
      "type": "opencode-go",
      "prefix": "go",
      "apiKey": "<OpenCode API Key；也可删掉这一行改用本机 opencode 登录态>",
      "enabled": true
    }
  ]
}
```

补充：

- **Go 卡只认 `go/`。** 网关写成 `prefix: "opencode-go"` 会列出 `opencode-go/...`，插件按设计把它当成本地后端目录丢弃。
- **第一次刷新可能为空。** 网关冷启动时先返回上次结果（最多等 8 秒），后台读取完成后再次刷新即完整。
- 刷新现在会区分「200 空列表 / HTTP 401 / 超时」；若看到 `no credential resolved from OPENCODE_GATEWAY_KEY`，就是 `.env` 没配。
- **免费档与这些无关**：`OpenCode Free` 卡不经过 8787 网关。

## 开发

```bash
pnpm install
pnpm run build   # tsdown → lib/index.js（Host，ESM）；tsc -b → lib/types
pnpm run test    # vitest
```

`lib/` 构建产物随源码提交（git 安装零构建），改完代码先 build 再提交。

## License

[MIT](./LICENSE) © 2026 — 包含移植自 opencode-api-plugin 的嵌入式 opencode2api 实现（其源自 [TiaraBasori/opencode2api](https://github.com/TiaraBasori/opencode2api)，MIT，许可副本见 `assets/LICENSE.md`），以及来自 dsh-protocom-api 的 OpenCode Go 名录实测数据（MIT）。
