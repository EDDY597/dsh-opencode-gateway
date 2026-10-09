# dsh-opencode-gateway

[English](./README.md) | **中文**

DeepSeek Harness（DSH）插件：把本机 opencode 生态接进 DSH 的模型菜单，两条 provider route：

| route | 端点 | 承载内容 |
| --- | --- | --- |
| `opencode-gateway` | `http://127.0.0.1:8787/v1`（本仓库网关） | 网关聚合的一切：OpenCode Go 订阅（读本地 opencode 登录态）、OpenCode Zen、以及 gateway.config.json 里的任意自定义上游 |
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
- 网关路由需要 opencode-api-plugin 网关在运行（`start-gateway.cmd` 或托盘）

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

- **刷新**：向对应端点拉取实时模型列表（OpenCode Go 走网关 `/v1/models`，OpenCode Free 走内联代理的后端 listing）。
- **勾选**：勾选的模型进入模型菜单（含输入框芯片）；未勾选的仅在此列出。从 listing 新发现的模型标"发现"。
- **保存勾选**：以修订号围栏的原子写入 settings 页，菜单与输入框芯片即时更新，重启后保留；冲突时整页重载并丢弃暂存。
- **恢复内置默认**：unset 该路由的 `models`，菜单回到内置清单（组合层 `models` 若配置过则以它为基底）。

优先级：settings 里保存过 `models`（哪怕空数组）> 组合层 `cordis.patch.yml` 的 `models` > 内置默认。保存条目只带 id / 名字 / 容量时，宿主会从内置实测名录补齐缺失的思考强度词表与视觉标记（显式写 `reasoningEfforts: false` 不受影响）。后端结构性字段（serverUrl / proxyPort / opencodePath 等）在设置页改动后需要重启才生效，模型菜单是即时生效的。

### 环境变量（`~/.dsh/.env`）

| 变量 | 说明 |
| --- | --- |
| `OPENCODE_GATEWAY_KEY` | 网关 Bearer token；**网关未设 token 时任意非空值即可**（插件要求凭据非空，缺失在发请求前报 `MISSING_CREDENTIAL`） |
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

## 开发

```bash
pnpm install
pnpm run build   # tsdown → lib/index.js（Host，ESM）；tsc -b → lib/types
pnpm run test    # vitest
```

`lib/` 构建产物随源码提交（git 安装零构建），改完代码先 build 再提交。

## License

[MIT](./LICENSE) © 2026 — 包含移植自 opencode-api-plugin 的嵌入式 opencode2api 实现（其源自 [TiaraBasori/opencode2api](https://github.com/TiaraBasori/opencode2api)，MIT，许可副本见 `assets/LICENSE.md`），以及来自 dsh-protocom-api 的 OpenCode Go 名录实测数据（MIT）。
