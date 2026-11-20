# 14 · `axp.json` 字段全参考

> 状态：Stable · 适用 AXP v1.x · 最后更新 2026-11-20
> 与 `02-manifest.schema.json` **逐字段对齐**；`tools/spec-lint.mjs` 会机读比对本文表格与 schema 的 `properties` 集合，不一致即失败。
> 本文是速查表，规范性定义仍以 `01-format.md` 与 schema 为准。

## 1. 顶层字段（21 个，按 schema 声明顺序）

`required` 共 8 个：`axp` · `id` · `name` · `version` · `minAndroid` · `abis` · `capabilities` · `distribution`。
`additionalProperties:false` —— 任何未知顶层字段 → `SCHEMA_ADDITIONAL_PROPERTY`。

| 字段 | 类型 | 必填 | 默认 | 约束 / 语义 | 定义 | 主要错误码 |
|---|---|---|---|---|---|---|
| `axp` | string | ✅ | — | 常量 `"1.0"` | 01 §3 | `SCHEMA_CONST` |
| `id` | string | ✅ | — | 反向域名 `^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$`；全局唯一 | 01 §3 | `ID_INVALID` `DUP_ID` |
| `name` | object | ✅ | — | ≥1 语言键，`{ "zh": ..., "en": ... }`；值均 string | 01 §3 | `SCHEMA_TYPE` `SCHEMA_MINPROPERTIES` |
| `version` | string | ✅ | — | semver `^\d+\.\d+\.\d+(?:[-+][\w.]+)?$` | 09 | `VERSION_INVALID` |
| `description` | string | ❌ | — | 一句话说明；索引快照会带上 | 01 §3 | `SCHEMA_TYPE` |
| `minHost` | string | ❌ | `"0.1.0"` | 宿主最低版本，协商见 20 §3 | 01 §3 | `INSTALL_MIN_HOST` |
| `minAndroid` | integer | ✅ | — | `>= 26` | 01 §3 | `SCHEMA_MINIMUM` |
| `abis` | string[] | ✅ | `[]` | `arm64-v8a / armeabi-v7a / x86 / x86_64`；包内含 `.so`/`.dex` 时不得为空 | 01 §3 / 03 | `ABI_MISSING` `WARN_ABI_EMPTY` |
| `requires` | object[] | ❌ | `[]` | `{ id, range }`；装载前解析闭包并检测环 | 01 §8.3 / 10 §4 | `INSTALL_DEPENDENCY_MISSING` |
| `entry` | object | ❌ | — | `{ js, engine }` 包级入口；组件各自 `impl` 优先 | 03 | `IMPL_FILE_MISSING` |
| `tools` | object[] | ❌ | `[]` | 六类组件之一，见 §2.1 | 01 §5.1 | `TOOL_CONFIRM_REQUIRED` |
| `surfaces` | object[] | ❌ | `[]` | 见 §2.2 / 17 | 01 §5.2 | `SURFACE_NOT_WATCHABLE` |
| `knowledge` | object[] | ❌ | `[]` | 见 §2.3 | 01 §5.3 | `DUP_ID` |
| `agents` | object[] | ❌ | `[]` | 见 §2.4 | 01 §5.4 | `AGENT_EXCEEDS_PRIVILEGE` |
| `events` | object[] | ❌ | `[]` | 见 §2.5 | 01 §5.5 | `SURFACE_NOT_WATCHABLE` |
| `ui` | object | ❌ | — | 见 §2.6 / 15；**不在 required 中 → 无 UI 插件合法** | 01 §5.6 | `UI_*` |
| `hotReload` | object | ❌ | — | 见 08；启用时强制 `signature/on-every-load`、`classloader/isolated` | 08 | `HOT_*` |
| `capabilities` | object | ✅ | — | 见 §2.7 | 04 | `CAP_*` |
| `instances` | object | ❌ | `{multi:false,max:1}` | 见 §2.8 | 01 §6 | `SCHEMA_TYPE` |
| `runtime` | object | ❌ | — | 见 §2.9 | 01 §6 | `SCHEMA_TYPE` |
| `distribution` | object | ✅ | — | 见 §2.10 | 10 | `PUBLISHER_INVALID` |

> **`ui` 不在 required 里**是「插件可以不包含 UI，变成 PDF/Excel、压缩解压、浏览器自动化等功能插件」的规范依据；
> `axp-examples/plugins/06|07|08` 是三个没有 `ui{}` 的可跑实例。

## 2. 子结构

### 2.1 `tools[]`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | string | ✅ | 包内唯一；投影后 name = `<pluginId>.<id>` |
| `description` | string | ✅ | **供模型做工具选择**，不得空泛 |
| `input` / `output` | JSON Schema | ❌ | 可内联或 `$ref` 到包内文件 |
| `impl` | impl | ❌ | 七形态，见 §2.11 |
| `gradient` | map<string, {impl}> | ❌ | 键为 `L0..L5`；不得超过 `capabilities.privilege` |
| `sideEffects` | enum | ✅ | `none / read / write / device / destructive` |
| `confirm` | boolean | ❌ | `destructive` 时 `MUST true` |
| `cost` | enum | ❌ | `fast / slow`，**供模型做工具选择** |

### 2.2 `surfaces[]`

`uri`（`axp://`，✅）· `description` · `views[]`（✅）· `anchor`（✅）· `watchable` · `auth`（✅）· `impl`。
`ui.bind[].from` / `events[].on` 指向的 Surface `MUST watchable:true`。

### 2.3 `knowledge[]`

`id` · `kind`（`skill/prompt/command/rules`）· `entry`（包内文件）· `progressive`（三级渐进披露）· `arguments[]` · `triggers[]` · `allowedTools[]`（激活期白名单，11 §3）。

### 2.4 `agents[]`

`id` · `prompt`（包内文件）· `tools[]`（白名单）· `knowledge[]` · `model` · `maxTurns` · `privilege`（不得超过清单上限）。

### 2.5 `events[]`

`on`（watchable URI 或 `lifecycle.*`）· `filter` · `when` · `run`（impl）· `privilege`。

### 2.6 `ui{}` → 详见 `15-ui-dsl.md`

`panel/widget/web/activity`（`{kind,entry}`）· `inject[]` · `lifecycle{onLoad,onReload,onUnload}` · `bind[]` · `actions[]`。
`ui.actions[].tool` `MUST` 指向本包 `tools[].id`；`ui.bind[].to` `MUST` 指向 `panel.json` 中存在的节点 id。

### 2.7 `capabilities{}`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `privilege` | enum `L0..L5` | ✅ | 本包权限**上限**；gradient / agents 不得越权 |
| `requests` | string[] | ✅ | 封闭词汇表，见 04 §2；支持 `fs.read:<scope>` / `fs.write:<scope>` / `network.egress:<host>`（禁通配） |
| `dangerous` | string[] | ❌ | 每一项 `MUST` 同时出现在 `requests` |
| `runtimeServices` | string[] | ❌ | `sampling / elicitation / ui.push / audit.read / storage`；`storage` 为 v1.1 新增可选值，见 16 |

### 2.8 `instances{}`

`multi:boolean` · `max:int`。

### 2.9 `runtime{}`

`memoryMB` · `cpuPct` · `allowDynamicCode:boolean`。
`allowDynamicCode:false` **只禁未签名网络代码**，不误杀合法热加载（08 / C25）。

### 2.10 `distribution{}`

`channel`（`session-install` 默认 / `trusted-channel` / `preinstall`）· `publisher`（`sha256:<64hex>`）· `signatureScheme`（常量 `apk-v3`）。
分发包的 `META-INF/AXP-SIG.json` 与 `index.json` 见 10。

### 2.11 `impl`（统一实现引用）

| 键 | 值 | 宿主选择序 |
|---|---|---|
| `native` | 包内 `.so` 路径 | 1 |
| `kotlin` | `path.dex#Class` | 2 |
| `wasm` | 包内 `.wasm` | 3 |
| `bin` | 可执行文件 | 4 |
| `js` | 包内 `.js` | 5 |
| `proc` | `{cmd,args,cwd,env}` | 6 |
| `url` | `https://` | 7（需 `network.egress:<host>`） |

宿主按序选**第一个自己支持且文件存在**的形态；全部不可用 → `IMPL_UNAVAILABLE`，`MUST NOT` 崩溃。
`proc` 只声明「有进程、怎么拉起」，**不假定任何外部协议**（保持同级独立）。

## 3. 最小合法清单（无 UI · L0）

```jsonc
{
  "axp": "1.0",
  "id": "com.example.hello",
  "name": { "zh": "你好", "en": "Hello" },
  "version": "1.0.0",
  "minAndroid": 26,
  "abis": [],
  "tools": [{ "id": "demo.echo", "description": "回显输入文本",
              "impl": { "js": "tools/hello.js" }, "sideEffects": "none", "cost": "fast" }],
  "capabilities": { "privilege": "L0", "requests": [] },
  "distribution": { "channel": "session-install",
                    "publisher": "sha256:<64hex>", "signatureScheme": "apk-v3" }
}
```

`axp new <id>` 生成的就是这个（见 `docs/cli-reference.md`）。

## 4. 「未声明的文件一律不执行」

包内凡是扩展名属于 `.js / .dex / .so / .wasm / .html` 的文件，`MUST` 被 `impl` / `entry` / `ui.*.entry` / `ui.lifecycle.*` / `knowledge[].entry` / `agents[].prompt` / `hotReload.state.migrate` / `$ref` 之一引用；
否则 → `UNDECLARED_EXECUTABLE`。所有引用 `MUST NOT` 含 `..`、绝对路径或 `http(s)://`（`impl.url` 除外）→ `UNSAFE_PATH` / `IMPL_FILE_MISSING`。
这是「清单唯一事实源」的可执行形式。
