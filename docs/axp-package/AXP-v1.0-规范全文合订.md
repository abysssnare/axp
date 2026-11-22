# AXP v1.0 规范全文合订
> 来源：`Ultra-Guru/axp` @ `main` / `e4e7de0`（2026-11-15）目录 `axp/spec/`（9 篇）+ `axp/validator/README.md`（错误码表）+ `axp/docs/host-checklist.md`（合规自检表）
> 规范状态：Draft（可实施） · 适用 AXP v1.x · Android API 26+ · 规范版本 1.0.0 · 最后更新 2026-11-14
> 唯一规范性正文是 `01-format.md`；其余 `spec/*.md` 为其条款展开，冲突时以 `01-format.md` 为准；`02-manifest.schema.json` 是 §3 的机器可读形式。

---

## 目录
1. [01-format.md](#file-1)
2. [02-manifest.schema.json](#file-2)
3. [03-impl-reference.md](#file-3)
4. [04-capabilities.md](#file-4)
5. [05-domains.md](#file-5)
6. [06-ui-vocab.md](#file-6)
7. [07-expression-map.md](#file-7)
8. [08-hot-reload.md](#file-8)
9. [09-versioning.md](#file-9)
10. [validator/README.md — 错误码表](#file-10)
11. [docs/host-checklist.md — 宿主合规自检表](#file-11)

---

<a id="file-1"></a>

## 1. `axp/spec/01-format.md`

# AXP Format Specification v1.0

> 状态：Draft（可实施）
> 适用：AXP v1.x · Android API 26+
> 规范版本：1.0.0
> 最后更新：2026-11-14

本文件是 AXP 的**唯一规范性正文**。其他 `spec/*.md` 是本文件条款的展开；若冲突，以本文件为准。[`02-manifest.schema.json`](02-manifest.schema.json) 是本文件 §3 的机器可读形式。

---

## 0. 规范地位

**AXP（Agent eXtension Package，`.axp`）是一种独立的插件描述格式。**

它与 MCP、LSP、Agent Skills、Claude Plugins、OpenCode Plugins、DSH 等插件／能力描述规范处于**同一规范层级**：各自定义自己的清单结构、组件模型与装载语义，互不依附、互不内嵌、互不桥接。AXP 不导入、不转译、不运行上述任何格式的插件，也不要求把自己导出为上述格式。

需要区分两件事：

| 概念 | 含义 |
|---|---|
| **规范地位平级** | AXP 与上述格式是并列的规范，不构成父子、元格式或兼容层关系 |
| **表达能力覆盖** | AXP 的组件模型足以表达上述格式中出现过的全部组件类型 |

能力覆盖的逐字段证明放在 [`07-expression-map.md`](07-expression-map.md)，**只作为外部验收材料**；本规范正文不引用任何外部格式的字段名，AXP 的全部语义由本文件独立定义。「能表达」不等于「能装载」：AXP 宿主只装载 `.axp` 包。这是格式的边界，不是缺陷。

### 0.1 本格式不是什么

| 不是 | 原因 |
|---|---|
| 协议 / 线格式 | 无握手、无方法表、无 transport；进程间通信属于宿主实现细节 |
| 桥 / 适配器 / 兼容层 | 不解析、不转换、不代理任何外部插件运行时 |
| 元格式 / 上层收编 | 不与任何外部格式构成上下位关系 |
| 运行时 | 只定义「声明什么」，不定义调度引擎如何执行 |

### 0.2 术语

| 术语 | 定义 |
|---|---|
| 包（package） | 一个 `.axp` 分发单元，目录形态用于开发，zip 形态用于分发 |
| 清单（manifest） | 包根 `axp.json`，唯一事实源 |
| 组件（component） | 清单中声明的一类能力实例：tool / surface / knowledge / agent / event / ui |
| 实现体（impl） | 组件本体所在文件或外部进程，可为任意语言与文件格式 |
| 宿主（host） | 解析清单、校验、装载并调度组件的 Android 应用 |
| Surface | 可被读取／订阅的数据实体，由 `axp://` URI 寻址 |
| 权限层 | L0–L5，见 [`04-capabilities.md`](04-capabilities.md) |
| 热加载单元 | 一次可被替换的最小范围：`package` 或 `component`，见 [`08-hot-reload.md`](08-hot-reload.md) |

### 0.3 关键字

`MUST` / `MUST NOT` / `SHOULD` / `MAY` 按 RFC 2119 语义使用。

---

## 1. 设计原则

| 原则 | 含义 |
|---|---|
| **声明层统一** | 一个插件 = 一个包，`axp.json` 是唯一事实源；未在清单中声明的文件一律不执行 |
| **实现层开放** | 组件本体可为 `.js` / `.dex` / `.so` / `.wasm` / `.md` / `.yaml` / `.html` / 独立二进制 / 外部进程，格式不限制 |
| **同级独立** | 组件语义由本规范定义，不借用外部格式字段名，不内嵌外部协议 |
| **Android 一等公民** | UI、权限阶梯、热加载、`abis`、`minAndroid`、签名信任链是原生字段，不是事后补丁 |
| **实现体可替换** | 同一能力允许多条实现路径，并允许在运行时以可信、已签名的新实现体替换（热加载基础） |

---

## 2. 包结构

```
com.example.demo.axp/            # 目录形态（开发）；同名 .axp zip（分发）
├── axp.json                     # ★ 清单：唯一入口，一切组件必须在此声明
├── icon.svg
├── main.js                      # 可选胶水入口（由 entry.js 引用）
├── tools/                       # Tool 实现体
│   ├── tap.js
│   └── ocr/ → ocr.dex + libocr.so
├── surfaces/                    # Surface 提供者实现体
│   └── vision/ → vision.dex
├── skills/                      # Knowledge：.md / .yaml
├── agents/                      # 子代理：.md / .yaml
├── events/                      # 钩子：.js / .dex
├── ui/                          # 界面：panel.json / .html / 资源
├── schemas/                     # 工具的 JSON Schema（可内联进清单）
├── models/                      # 本地模型（gguf / mnn 等）
├── i18n/
└── docs/
```

规则：

- 包根 `MUST` 存在 `axp.json`，文件名固定，大小写敏感。
- 清单中出现的相对路径 `MUST` 指向包内真实文件；`url` 与 `proc` 除外。
- 目录名、文件名 `MUST NOT` 包含 `..` 或绝对路径。
- 分发态 `MUST` 使用 APK Signature Scheme v3 签名，并在 `distribution.publisher` 记录发布者指纹。

---

## 3. 清单 `axp.json`

完整形态（示例，字段含义见 §3.1）：

```jsonc
{
  "axp": "1.0",
  "id": "com.example.demo",
  "name": { "zh": "演示插件", "en": "Demo" },
  "version": "1.2.0",
  "description": "一个覆盖全部组件的示例",
  "minHost": "0.1.0",
  "minAndroid": 26,
  "abis": ["arm64-v8a"],

  "requires": [ { "id": "com.example.cv-common", "range": ">=1.0.0" } ],
  "entry": { "js": "main.js", "engine": "quickjs" },

  "tools":       [ /* §5.1 */ ],
  "surfaces":    [ /* §5.2 */ ],
  "knowledge":   [ /* §5.3 */ ],
  "agents":      [ /* §5.4 */ ],
  "events":      [ /* §5.5 */ ],
  "ui":          { /* §5.6 */ },
  "hotReload":   { /* §7   */ },

  "capabilities": {
    "privilege": "L3",
    "requests": ["accessibility.gestures", "notification.listen"],
    "dangerous": ["accessibility.gestures"],
    "runtimeServices": ["sampling"]
  },

  "instances": { "multi": true, "max": 4 },
  "runtime": {
    "memoryMB": 128,
    "cpuPct": 20,
    "allowDynamicCode": false
  },

  "distribution": {
    "channel": "session-install",
    "publisher": "sha256:ab12...",
    "signatureScheme": "apk-v3"
  }
}
```

`entry` 可省略：只有声明、没有自有胶水代码的纯声明型插件合法。

### 3.1 顶层字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `axp` | string | ✅ | 格式版本，本版固定 `"1.0"` |
| `id` | string | ✅ | 反向域名，包内全局唯一 |
| `name` | object | ✅ | 至少含一个语言键（`zh` / `en` / …） |
| `version` | string | ✅ | 语义化版本 `MAJOR.MINOR.PATCH` |
| `description` | string | | 一句话说明 |
| `minHost` | string | | 宿主最低版本 |
| `minAndroid` | integer | ✅ | 最低 API level，`>= 26` |
| `abis` | string[] | ✅ | 包内预编译产物架构；无原生产物时写 `[]` |
| `requires` | object[] | | 依赖闭包，见 §8.3 |
| `entry` | object | | `{ js, engine }`，`engine` ∈ `quickjs / hermes / dex / wasm / bin` |
| `tools` / `surfaces` / `knowledge` / `agents` / `events` | array | | 六类组件，见 §5 |
| `ui` | object | | 见 §5.6 |
| `hotReload` | object | | 见 §7 |
| `capabilities` | object | ✅ | 见 §6 |
| `instances` | object | | `{ multi: bool, max: int }`，默认单实例 |
| `runtime` | object | | 资源上限与动态代码边界 |
| `distribution` | object | ✅ | 见 §9 |

**唯一性约束**：`tools[].id`、`surfaces[].uri`、`knowledge[].id`、`agents[].id` 各自命名空间内唯一；`events[].on` + `filter` 组合不得重复。

---

## 4. 统一实现引用 `impl`

清单中所有「实现体」字段共用同一引用类型。这是「实现层开放」的语法核心。

```jsonc
"impl": {
  "js":     "tools/tap.js",                     // T1 脚本
  "kotlin": "tools/ocr.dex#OcrTool",            // T2 预编译 dex + 类符号
  "native": "tools/ocr/libocr.so",              // T3 预编译 so
  "wasm":   "tools/core.wasm",                  // T4
  "bin":    "tools/ocr-cli",                    // T5 独立可执行，stdin/stdout JSON
  "url":    "https://api.example.com/run",      // T6 远程端点，需 network.egress 授权
  "proc":   { "cmd": "bin/helper", "args": [], "cwd": ".", "env": {} } // T7 通用外部进程
}
```

规则：

1. 一个 `impl` **可同时给多种实现**；宿主按设备能力选择（有 `so` 用 `so`，否则降级 `js`）。这是格式原生的多实现路径。
2. `kotlin` / `native` / `wasm` 产物 `MUST` 在打包期编译好，且其架构 `MUST` 出现在 `abis`；缺失即校验失败。
3. `proc` 是**通用外部进程声明**：格式只描述「有一个进程、怎么拉起」，不假定该进程使用任何特定协议、方法表或消息格式。宿主自行决定通信方式。这样，任何以外部进程形式提供能力的实现，在 AXP 中都只是一条普通声明，而不是需要被接入的外部体系。
4. `url` 与 `proc` 不计入「包内引用完整性」检查，但 `MUST` 受 `capabilities.requests` 约束。
5. 详细规范见 [`03-impl-reference.md`](03-impl-reference.md)。

---

## 5. 组件规格

每个组件 = **声明格式** + **实现体引用** + **Android 语义**。所有数组均可为空。

### 5.1 `tools[]` — 可执行能力

```jsonc
{
  "id": "screen.tap",
  "description": "点击屏幕坐标",
  "input":  { "type": "object", "properties": { "x": {"type":"number"}, "y": {"type":"number"} } },
  "output": { "type": "object" },
  "impl":   { "js": "tools/tap.js" },
  "gradient": {
    "L2": { "impl": { "js": "tools/tap-a11y.js" } },
    "L3": { "impl": { "bin": "tools/tap-shell" } }
  },
  "sideEffects": "device",       // none | read | device | destructive
  "confirm": true,               // 调用前需用户确认
  "cost": "fast"                 // fast | slow，供模型做工具选择
}
```

| 字段 | 必填 | 说明 |
|---|---|---|
| `id` | ✅ | 点分命名空间，如 `screen.tap` |
| `description` | ✅ | 自然语言说明 |
| `input` / `output` | | JSON Schema，可内联或 `{"$ref":"schemas/tap.json"}` |
| `impl` | ✅¹ | 默认实现体 |
| `gradient` | | 权限梯度：键为 `L0`–`L5`，值为 `{ impl }`；`impl` 与 `gradient` 至少存在其一 |
| `sideEffects` | ✅ | 决定确认策略与审计等级 |
| `confirm` | | 默认 `false`；`destructive` 时强制 `true` |
| `cost` | | 默认 `fast` |

### 5.2 `surfaces[]` — 可感知数据

```jsonc
{
  "uri": "axp://vision/screen",
  "description": "当前屏幕的无障碍节点树",
  "views": ["tree", "text", "image"],
  "anchor": "node",             // node | line | offset | range | uri
  "watchable": true,            // 支持订阅增量推送
  "auth": "L2",
  "impl": { "kotlin": "surfaces/vision/vision.dex#ScreenSurface" }
}
```

`views` 允许同一实体多种呈现（文本、树、图像、诊断信息、符号等）；`anchor` 定义定位方式（行列号、偏移、范围、节点）；`watchable` 使宿主可以订阅变更流。标准域见 [`05-domains.md`](05-domains.md)，插件可注册自定义域（前缀 `axp://x/<id>/`）。

### 5.3 `knowledge[]` — 知识与提示

```jsonc
{
  "id": "wechat-pay-flow",
  "kind": "skill",              // skill | prompt | command | rules
  "entry": "skills/wechat-pay-flow/SKILL.md",
  "progressive": true,          // 元数据 → 命中后正文 → 再引用文件
  "arguments": [],              // kind=prompt 时的参数声明
  "triggers": [ { "on": "axp://notification/stream", "filter": "app=com.tencent.mm" } ],
  "allowedTools": ["screen.*", "input.text"]
}
```

`kind` 语义：

| kind | 含义 |
|---|---|
| `skill` | 按需加载的操作知识；`entry` 直接是 `.md` 文件，格式不发明新的知识语法 |
| `prompt` | 可参数化提示模板，`arguments` 声明参数 |
| `command` | 用户可手动触发的斜杠命令 |
| `rules` | 常驻注入的系统规则 |

`progressive: true` 时宿主 `MUST` 实现三级渐进披露；`allowedTools` 是该知识被激活时的工具白名单。

### 5.4 `agents[]` — 子代理

```jsonc
{
  "id": "ui-walker",
  "prompt": "agents/walker.md",
  "tools": ["screen.*", "vision.ocr"],
  "knowledge": ["wechat-pay-flow"],
  "model": "host-default",
  "maxTurns": 20,
  "privilege": "L2"
}
```

`privilege` 是子代理的**权限上限**，不得高于 `capabilities.privilege`。这是格式原生字段。

### 5.5 `events[]` — 事件与钩子

```jsonc
[
  {
    "on": "axp://notification/stream",
    "filter": "app=com.bank.* AND text~'验证码'",
    "run": { "js": "events/otp.js" },
    "privilege": "L2"
  },
  {
    "on": "lifecycle/tool.before",
    "when": { "tool": "screen.tap" },
    "run": { "js": "events/confirm-tap.js" }
  }
]
```

触发源有两类：① 任意 `watchable` Surface 流 + `filter`；② 生命周期事件命名空间 `lifecycle.tool.before|after`、`lifecycle.chat.message`、`lifecycle.app.foreground|background`、`lifecycle.plugin.*`、`lifecycle.workspace.*`。`run` 是一个 `impl`。

### 5.6 `ui{}` — 界面（Android 一等组件）

```jsonc
"ui": {
  "panel":    { "kind": "dsl",     "entry": "ui/panel.json" },
  "widget":   { "kind": "dsl",     "entry": "ui/widget.json" },
  "web":      { "kind": "web",     "entry": "ui/index.html" },
  "activity": { "kind": "native",  "entry": "ui/Main.dex#PanelActivity" },
  "inject":   [ { "surface": "chat.menu.long-press", "label": "翻译本条", "run": "ui/translate.js" } ],

  "lifecycle": {
    "onLoad":   "ui/onLoad.js",
    "onReload": "ui/onReload.js",
    "onUnload": "ui/onUnload.js"
  },
  "bind": [
    { "from": "axp://vision/screen", "to": "ui.panel.tree" }
  ],
  "actions": [
    { "id": "ui.panel.tap", "tool": "screen.tap" }
  ]
}
```

| 字段 | 说明 |
|---|---|
| `panel` / `widget` / `web` / `activity` | 四种界面形态，可共存；`kind` ∈ `dsl / web / native` |
| `inject` | 向宿主既有界面注入入口项，`run` 为 `impl` 路径 |
| `lifecycle` | 界面装载 / 热替换 / 卸载回调，热加载时 `MUST` 存在（见 §7） |
| `bind` | Surface → UI 节点的数据绑定；`from` 为 `axp://` URI，`to` 为节点路径 |
| `actions` | UI 动作 → tool 回填；`tool` `MUST` 指向本包已声明的 `tools[].id` |

`dsl` 的节点词汇表、绑定语法、样式 token 见 [`06-ui-vocab.md`](06-ui-vocab.md)。宿主 `MUST` 在装载 UI 前校验 `bind[].to` 与 `actions[].tool` 的引用完整性。

### 5.7 反向通道 `capabilities.runtimeServices`

可选值：`sampling`（插件请求宿主推理）、`elicitation`（插件请求用户输入）、`ui.push`（主动更新界面）、`audit.read`（读审计日志）。**声明即授权使用**；调用方式由宿主运行时决定，格式不定义方法签名。

---

## 6. Android 原生能力

### 6.1 权限阶梯

| 层 | 通道 | 说明 |
|---|---|---|
| L0 | 沙箱 | 纯计算，无系统能力 |
| L1 | 标准权限 | 文件 / 网络 / 相机 / 通知 |
| L2 | AccessibilityService | 读屏 / 手势 / 跨 App |
| L3 | Shizuku | shell 身份调用隐藏 API、`pm` / `dumpsys` |
| L4 | Root | `su` |
| L5 | System / Hook | 注入（签名白名单） |

### 6.2 权限梯度 `gradient`

`tools[].gradient` 让同一个工具在不同权限层声明不同实现体。宿主 `MUST` 选择「当前可用且 ≤ `capabilities.privilege`」的最高层路径，不可用时逐级回退；无可用路径时该工具不可用而非报错崩溃。这把「无障碍方案 / shell 方案 / root 方案」从插件代码里的 `if-else` 变成格式声明。

### 6.3 `capabilities.requests` 词汇表

分组摘录（完整表见 [`04-capabilities.md`](04-capabilities.md)）：

```
accessibility.read | accessibility.gestures | accessibility.takeScreenshot
shizuku.binder | root.su
notification.listen | clipboard.read | clipboard.write
sensor.gps | sensor.motion | sensor.biometric
telephony.sms.read | telephony.state
intent.send | intent.receive
pm.list | pm.install
network.egress:<host> | foreground.service
```

声明超出词汇表的请求 → 校验失败。`dangerous[]` 中的项 `MUST` 是 `requests[]` 的子集，且宿主 `MUST` 在装载时单独向用户确认。

### 6.4 标准域

宿主内置 13 个 `axp://` 域：`fs` / `screen` / `app` / `notification` / `intent` / `sensor` / `clipboard` / `telephony` / `logcat` / `pm` / `media` / `net` / `sysprop`。定义见 [`05-domains.md`](05-domains.md)。

---

## 7. 热加载 `hotReload{}`

AXP 把「Android 上不重启宿主替换插件实现体」作为**格式字段**而非宿主私有能力。

```jsonc
"hotReload": {
  "enabled": true,
  "unit": "component",                 // package | component
  "targets": ["ui.*", "tools.*", "knowledge.*"],
  "strategy": "graceful",              // immediate | graceful | next-session
  "signature": "on-every-load",        // on-install | on-every-load（热加载 MUST 为后者）
  "sources": ["package", "trusted-channel"],   // 禁止 network-unsigned
  "state": {
    "migrate": "ui/panel.state.json",
    "preserve": ["ui.panel.scroll", "agents.*.history"]
  },
  "rollback": { "keep": 2, "onError": true },
  "uiRebuild": "recompose",            // recompose | recreate-activity | restart-host
  "classloader": "isolated"            // isolated | shared
}
```

| 字段 | 说明 |
|---|---|
| `enabled` | 关闭时宿主 `MUST NOT` 接受任何运行时替换 |
| `unit` | 替换粒度：`package` 整包 / `component` 单组件 |
| `targets` | 可替换组件前缀；不在其中的组件 `MUST NOT` 被替换 |
| `strategy` | `immediate` 立即 / `graceful` 等当前会话空闲 / `next-session` 下次装载生效 |
| `signature` | 验签时机；热加载 `MUST` 为 `on-every-load` |
| `sources` | 允许的实现体来源；`MUST NOT` 包含 `network-unsigned` |
| `state.migrate` | 状态迁移映射文件 |
| `state.preserve` | 替换时原样保留的状态键 |
| `rollback` | 保留代数与出错自动回滚 |
| `uiRebuild` | UI 重建策略 |
| `classloader` | `dex` / `wasm` 实现体 `MUST` 用 `isolated`，否则 Android 上无法卸载 |

**`runtime.allowDynamicCode` 的边界（重要）**：该字段禁止的是「运行时从网络下载**未签名**代码并执行」。热加载是「用**可信源、已签名**的实现体替换已声明组件」，两者不冲突。宿主校验器 `MUST NOT` 因 `allowDynamicCode: false` 拒绝合法热加载，但 `MUST` 拒绝 `sources` 含 `network-unsigned` 或 `signature != on-every-load` 的配置。

完整状态机、Android 类加载器约束、状态迁移与回滚语义见 [`08-hot-reload.md`](08-hot-reload.md)，接入教程见 [`docs/hot-reload-tutorial.md`](../docs/hot-reload-tutorial.md)。

---

## 8. 装载与校验规则

宿主 `MUST` 按以下顺序执行，任一步失败即拒绝装载：

1. **解析** `axp.json`，用 `02-manifest.schema.json` 做结构校验。
2. **签名**：按 `distribution.signatureScheme` 校验发布者指纹与 `distribution.publisher` 一致。启用热加载时，每次替换 `MUST` 重新验签（§7）。
3. **引用完整性**：所有包内相对路径存在、无 `..`、无绝对路径；`bind[].to` / `actions[].tool` / `agents[].tools` / `agents[].knowledge` 引用可解析。
4. **`abis` 一致性**：`abis` 声明与包内 `.dex` / `.so` / `.wasm` 产物匹配。
5. **依赖闭包**：`requires[]` 全部可解析且版本满足 `range`，无环。
6. **权限校验**：`requests` 全在词汇表内；`dangerous ⊆ requests`；`agents[].privilege ≤ capabilities.privilege`；`gradient` 键 ≤ `capabilities.privilege`。
7. **注册组件**：按清单注册。**未在清单中声明的文件一律不执行**（安全铁律）。
8. **UI 挂载**：若存在 `ui{}`，按 §5.6 建立绑定与动作，触发 `ui.lifecycle.onLoad`。
9. **热加载就绪**：若 `hotReload.enabled`，建立隔离类加载器与回滚快照。

### 8.1 装载失败处理

失败 `MUST` 给出结构化错误（字段路径 + 规则编号），`MUST NOT` 部分注册组件。错误码表见 `validator/README.md`。

### 8.3 依赖闭包

`requires[].id` 指向另一个已安装 `.axp` 包；`range` 支持 `>= / > / <= / < / = / ^ / ~`。宿主 `MUST` 在装载前完成闭包解析并检测环。

---

## 9. 分发与签名

| 字段 | 说明 |
|---|---|
| `distribution.channel` | `session-install`（Android 会话安装，默认） / `trusted-channel`（签署通道） / `preinstall` |
| `distribution.publisher` | 发布者证书指纹 `sha256:...` |
| `distribution.signatureScheme` | `apk-v3`（默认） |

分发态 `MUST` 为 zip，包内附签名块；`MUST NOT` 使用「从任意 URL 拉取未签名包即执行」的分发方式。索引与信任链由宿主实现，不属于格式。

---

## 10. 版本与兼容

`axp` 为格式版本，`minHost` 为宿主最低版本，`version` 为插件自身版本。schema 演进、弃用与迁移规则见 [`09-versioning.md`](09-versioning.md)。

---

## 11. 宿主一致性等级

| 等级 | 要求 |
|---|---|
| AXP-0 | 通过 §8 的 1–7 步，支持 `tools[]` 调度 |
| AXP-1 | AXP-0 + `surfaces[]` 订阅 + `knowledge[]` 渐进披露 |
| AXP-2 | AXP-1 + `agents[]` / `events[]` / `ui{}` 全语义 |
| AXP-3 | AXP-2 + 权限梯度 L0–L5 + `hotReload{}` 全语义 |

宿主 `SHOULD` 在 README 声明所达等级。自检表见 [`docs/host-checklist.md`](../docs/host-checklist.md)。

---

## 12. 路线图

| 里程碑 | 交付 | 出口标准 |
|---|---|---|
| M1 格式 | schema 定稿 + validator + CLI `pack/new` + 3 个 example | `axp validate` 全绿 |
| M2 最小宿主 | 装载 + tools 调度 + L0/L1 | 纯 JS 插件在真机被 Agent 调通 |
| **M2.5 热加载** | `hotReload` + 隔离类加载器 + 每次验签 + 回滚 + UI 重建 | 不重启宿主替换 `ui.panel` 与一个 tool，状态保留、出错回滚 |
| M3 感知 | `surfaces` + `watchable` + `fs/screen/notification` 三域 + L2 | 插件订阅屏幕流拿到增量 |
| M4 提权 | Shizuku L3 + `gradient` 降级 + 审计 | 同一 tool 在 L2/L3 自动切换实现 |
| M5 全组件 | `knowledge/agents/events` 全语义 + `ui.dsl` + 多实例 | 综合示例完整跑通 |
| M6 分发 | 签名信任链 + `session-install` + 索引格式 | 三种来源安装成功 |
| M7 生态 | 宿主合规认证 + 示例库 | 至少 2 个第三方宿主达 AXP-2 |

实现进度不影响规范条款本身。截至 v1.0.2：M1、M2（[`../runtime/README.md`](../runtime/README.md)）、M2.5、M5 已跑通；M3 的规范 / [`04-domains` 示例](../examples/04-domains/README.md) / 教程就位，真机域适配器待补；M4 的 `gradient` 选择算法已实现、Shizuku L3 通道待接；M6 真实签名信任链待接。Android 真机骨架见 [`../reference-host/README.md`](../reference-host/README.md)，用法见 [`../docs/runtime-guide.md`](../docs/runtime-guide.md)。

---

## 附录 A：与早期草案的差异

| 早期草案 | v1.0 | 理由 |
|---|---|---|
| 握手 / 方法表 / transport 章节 | 删除 | 属于宿主实现细节，不属于格式 |
| 实现引用中点名外部格式 | 改通用 `proc` | 保持同级独立，规范正文不内嵌外部体系名 |
| 表达能力总表在规范正文 | 移入 `07-expression-map.md` | 规范正文自我定义，映射表作为验收材料 |
| 「收编 / 超集 / 上层」措辞 | 「同级独立 + 表达覆盖」 | 避免构成元格式关系 |
| `distribution.channels` 通用仓库措辞 | `distribution.channel` Android 会话安装 | 平台专属 |
| 无热加载 | 新增 `hotReload{}` + `08` 专章 + M2.5 | Android 一等能力 |
| `ui{}` 只有入口文件 | 新增 `lifecycle / bind / actions` + `06-ui-vocab.md` | 界面要能活、能绑、能热重建 |
| `allowDynamicCode: false` 一刀切 | 明确边界：禁未签名网络代码，允许可信已签名替换 | 否则热加载被校验器误杀 |

---

## 附录 B：完整示例

见 [`examples/03-hot-reload/axp.json`](../examples/03-hot-reload/axp.json)，覆盖六类组件 + UI + 热加载；标准域用法见 [`examples/04-domains/axp.json`](../examples/04-domains/axp.json)。

---

<a id="file-2"></a>

## 2. `axp/spec/02-manifest.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://axp-spec.dev/schema/1.0/manifest.json",
  "title": "AXP Manifest v1.0",
  "description": "axp.json — AXP (Agent eXtension Package) 清单的唯一事实源。本 schema 定义声明层，不定义宿主运行时。",
  "type": "object",
  "required": ["axp", "id", "name", "version", "minAndroid", "abis", "capabilities", "distribution"],
  "additionalProperties": false,
  "properties": {
    "axp": { "const": "1.0" },
    "id": { "type": "string", "minLength": 3 },
    "name": {
      "type": "object",
      "minProperties": 1,
      "additionalProperties": { "type": "string" }
    },
    "version": { "type": "string", "minLength": 5 },
    "description": { "type": "string" },
    "minHost": { "type": "string" },
    "minAndroid": { "type": "integer", "minimum": 26 },
    "abis": {
      "type": "array",
      "items": { "enum": ["arm64-v8a", "armeabi-v7a", "x86", "x86_64"] }
    },
    "requires": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "range"],
        "additionalProperties": false,
        "properties": {
          "id": { "type": "string" },
          "range": { "type": "string" }
        }
      }
    },
    "entry": { "$ref": "#/$defs/entry" },
    "tools": { "type": "array", "items": { "$ref": "#/$defs/tool" } },
    "surfaces": { "type": "array", "items": { "$ref": "#/$defs/surface" } },
    "knowledge": { "type": "array", "items": { "$ref": "#/$defs/knowledge" } },
    "agents": { "type": "array", "items": { "$ref": "#/$defs/agent" } },
    "events": { "type": "array", "items": { "$ref": "#/$defs/event" } },
    "ui": { "$ref": "#/$defs/ui" },
    "hotReload": { "$ref": "#/$defs/hotReload" },
    "capabilities": { "$ref": "#/$defs/capabilities" },
    "instances": { "$ref": "#/$defs/instances" },
    "runtime": { "$ref": "#/$defs/runtime" },
    "distribution": { "$ref": "#/$defs/distribution" }
  },
  "$defs": {
    "impl": {
      "type": "object",
      "minProperties": 1,
      "additionalProperties": false,
      "properties": {
        "js": { "type": "string" },
        "kotlin": { "type": "string" },
        "native": { "type": "string" },
        "wasm": { "type": "string" },
        "bin": { "type": "string" },
        "url": { "type": "string" },
        "proc": {
          "type": "object",
          "required": ["cmd"],
          "additionalProperties": false,
          "properties": {
            "cmd": { "type": "string" },
            "args": { "type": "array", "items": { "type": "string" } },
            "cwd": { "type": "string" },
            "env": { "type": "object", "additionalProperties": { "type": "string" } }
          }
        }
      }
    },
    "entry": {
      "type": "object",
      "required": ["js", "engine"],
      "additionalProperties": false,
      "properties": {
        "js": { "type": "string" },
        "engine": { "enum": ["quickjs", "hermes", "dex", "wasm", "bin"] }
      }
    },
    "tool": {
      "type": "object",
      "required": ["id", "description", "sideEffects"],
      "additionalProperties": false,
      "properties": {
        "id": { "type": "string" },
        "description": { "type": "string" },
        "input": { "type": "object" },
        "output": { "type": "object" },
        "impl": { "$ref": "#/$defs/impl" },
        "gradient": {
          "type": "object",
          "additionalProperties": false,
          "patternProperties": {
            "^L[0-5]$": {
              "type": "object",
              "required": ["impl"],
              "additionalProperties": false,
              "properties": { "impl": { "$ref": "#/$defs/impl" } }
            }
          }
        },
        "sideEffects": { "enum": ["none", "read", "device", "destructive"] },
        "confirm": { "type": "boolean" },
        "cost": { "enum": ["fast", "slow"] }
      },
      "anyOf": [
        { "required": ["impl"] },
        { "required": ["gradient"] }
      ]
    },
    "surface": {
      "type": "object",
      "required": ["uri", "views", "anchor", "auth"],
      "additionalProperties": false,
      "properties": {
        "uri": { "type": "string" },
        "description": { "type": "string" },
        "views": { "type": "array", "minItems": 1, "items": { "type": "string" } },
        "anchor": { "enum": ["node", "line", "offset", "range", "uri"] },
        "watchable": { "type": "boolean" },
        "auth": { "enum": ["L0", "L1", "L2", "L3", "L4", "L5"] },
        "impl": { "$ref": "#/$defs/impl" }
      }
    },
    "trigger": {
      "type": "object",
      "required": ["on"],
      "additionalProperties": false,
      "properties": {
        "on": { "type": "string" },
        "filter": { "type": "string" }
      }
    },
    "knowledge": {
      "type": "object",
      "required": ["id", "kind", "entry"],
      "additionalProperties": false,
      "properties": {
        "id": { "type": "string" },
        "kind": { "enum": ["skill", "prompt", "command", "rules"] },
        "entry": { "type": "string" },
        "progressive": { "type": "boolean" },
        "arguments": { "type": "array", "items": { "type": "object" } },
        "triggers": { "type": "array", "items": { "$ref": "#/$defs/trigger" } },
        "allowedTools": { "type": "array", "items": { "type": "string" } }
      }
    },
    "agent": {
      "type": "object",
      "required": ["id", "prompt"],
      "additionalProperties": false,
      "properties": {
        "id": { "type": "string" },
        "prompt": { "type": "string" },
        "tools": { "type": "array", "items": { "type": "string" } },
        "knowledge": { "type": "array", "items": { "type": "string" } },
        "model": { "type": "string" },
        "maxTurns": { "type": "integer", "minimum": 1 },
        "privilege": { "enum": ["L0", "L1", "L2", "L3", "L4", "L5"] }
      }
    },
    "event": {
      "type": "object",
      "required": ["on", "run"],
      "additionalProperties": false,
      "properties": {
        "on": { "type": "string" },
        "filter": { "type": "string" },
        "when": { "type": "object" },
        "run": { "$ref": "#/$defs/impl" },
        "privilege": { "enum": ["L0", "L1", "L2", "L3", "L4", "L5"] }
      }
    },
    "uiSlot": {
      "type": "object",
      "required": ["kind", "entry"],
      "additionalProperties": false,
      "properties": {
        "kind": { "enum": ["dsl", "web", "native"] },
        "entry": { "type": "string" }
      }
    },
    "ui": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "panel": { "$ref": "#/$defs/uiSlot" },
        "widget": { "$ref": "#/$defs/uiSlot" },
        "web": { "$ref": "#/$defs/uiSlot" },
        "activity": { "$ref": "#/$defs/uiSlot" },
        "inject": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["surface", "label", "run"],
            "additionalProperties": false,
            "properties": {
              "surface": { "type": "string" },
              "label": { "type": "string" },
              "run": { "type": "string" }
            }
          }
        },
        "lifecycle": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "onLoad": { "type": "string" },
            "onReload": { "type": "string" },
            "onUnload": { "type": "string" }
          }
        },
        "bind": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["from", "to"],
            "additionalProperties": false,
            "properties": {
              "from": { "type": "string" },
              "to": { "type": "string" }
            }
          }
        },
        "actions": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["id", "tool"],
            "additionalProperties": false,
            "properties": {
              "id": { "type": "string" },
              "tool": { "type": "string" }
            }
          }
        }
      }
    },
    "hotReload": {
      "type": "object",
      "required": ["enabled"],
      "additionalProperties": false,
      "properties": {
        "enabled": { "type": "boolean" },
        "unit": { "enum": ["package", "component"] },
        "targets": { "type": "array", "items": { "type": "string" } },
        "strategy": { "enum": ["immediate", "graceful", "next-session"] },
        "signature": { "enum": ["on-install", "on-every-load"] },
        "sources": {
          "type": "array",
          "items": { "enum": ["package", "trusted-channel", "preinstall"] }
        },
        "state": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "migrate": { "type": "string" },
            "preserve": { "type": "array", "items": { "type": "string" } }
          }
        },
        "rollback": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "keep": { "type": "integer", "minimum": 0 },
            "onError": { "type": "boolean" }
          }
        },
        "uiRebuild": { "enum": ["recompose", "recreate-activity", "restart-host"] },
        "classloader": { "enum": ["isolated", "shared"] }
      },
      "if": { "properties": { "enabled": { "const": true } }, "required": ["enabled"] },
      "then": {
        "required": ["signature", "sources", "classloader", "uiRebuild"],
        "properties": {
          "signature": { "const": "on-every-load" },
          "classloader": { "const": "isolated" }
        }
      }
    },
    "capabilities": {
      "type": "object",
      "required": ["privilege", "requests"],
      "additionalProperties": false,
      "properties": {
        "privilege": { "enum": ["L0", "L1", "L2", "L3", "L4", "L5"] },
        "requests": { "type": "array", "items": { "type": "string" } },
        "dangerous": { "type": "array", "items": { "type": "string" } },
        "runtimeServices": {
          "type": "array",
          "items": { "enum": ["sampling", "elicitation", "ui.push", "audit.read"] }
        }
      }
    },
    "instances": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "multi": { "type": "boolean" },
        "max": { "type": "integer", "minimum": 1 }
      }
    },
    "runtime": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "memoryMB": { "type": "integer", "minimum": 1 },
        "cpuPct": { "type": "integer", "minimum": 1, "maximum": 100 },
        "allowDynamicCode": { "type": "boolean" }
      }
    },
    "distribution": {
      "type": "object",
      "required": ["channel", "publisher", "signatureScheme"],
      "additionalProperties": false,
      "properties": {
        "channel": { "enum": ["session-install", "trusted-channel", "preinstall"] },
        "publisher": { "type": "string" },
        "signatureScheme": { "enum": ["apk-v3"] }
      }
    }
  }
}
```

---

<a id="file-3"></a>

## 3. `axp/spec/03-impl-reference.md`

# 03 · 统一实现引用 `impl`

> 状态：Stable
> 适用：AXP v1.x · Android API 26+
> 最后更新：2026-11-14

本文件展开 [`01-format.md`](01-format.md) §4。`impl` 是「实现层开放」的语法核心：**清单统一，实现随意**。

## 1. 七种形态

| 代号 | 键 | 形态 | 打包要求 | 可热替换 |
|---|---|---|---|---|
| T1 | `js` | 脚本文件 | 包内 `.js` | ✅ |
| T2 | `kotlin` | 预编译 dex + 类符号 `path#Class` | 架构写入 `abis` | ✅（需 `isolated`） |
| T3 | `native` | 预编译 `.so` | 架构写入 `abis` | ⚠️ 需卸载 native 库 |
| T4 | `wasm` | `.wasm` 模块 | 架构无关但需声明运行时 | ✅ |
| T5 | `bin` | 独立可执行，stdin/stdout JSON | 架构写入 `abis` | ✅ |
| T6 | `url` | 远程端点 | 需 `network.egress:<host>` | ✅（端点变更） |
| T7 | `proc` | 通用外部进程 | `cmd` 为包内可执行或系统命令 | ✅（进程重启） |

### T7 `proc` — 通用外部进程

```jsonc
"proc": {
  "cmd": "bin/helper",
  "args": ["--mode", "fast"],
  "cwd": ".",
  "env": { "AXP_LOG": "1" }
}
```

格式只声明「有一个进程、怎么拉起」。它**不假定**该进程使用任何特定协议、方法表或消息格式；宿主自行决定如何与之通信，通信方式属于宿主实现细节，不进格式。

这样，任何以外部进程形式提供能力的实现，在 AXP 中都只是一条普通的 `impl.proc` 声明 —— 一个实现选择，而不是需要被接入、被桥接、被兼容的外部体系。这一点是「同级独立格式」定位在字段层面的落点。

`proc` 的安全约束：

- `cmd` 若为包内路径，`MUST` 通过引用完整性检查；若为系统命令，`MUST` 在 `capabilities.requests` 中声明对应能力。
- `MUST NOT` 在 `args` / `env` 中注入未转义的宿主路径。
- 进程生命周期由宿主管理；热加载时按 `hotReload.strategy` 重启。

## 2. 多实现路径与选择算法

一个 `impl` 可同时给出多种形态：

```jsonc
"impl": {
  "native": "tools/ocr/libocr.so",
  "js":     "tools/ocr-fallback.js"
}
```

宿主选择算法（`MUST` 稳定、可预测）：

```
candidates = impl 中宿主支持的形态
按宿主优先级排序：native > kotlin > wasm > bin > js > proc > url
过滤：架构匹配 abis、权限满足 capabilities.requests
取第一个可用；全部不可用 → 该组件标记 unavailable（不抛异常）
```

`gradient` 优先于 `impl`：先按当前权限层选 `gradient` 分支，再在该分支内运行上述算法。

## 3. 引用完整性规则

| 检查项 | 规则 |
|---|---|
| 路径形态 | 相对包根，`MUST NOT` 含 `..`、绝对路径、通配符展开 |
| 存在性 | T1–T5 的文件 `MUST` 存在 |
| 架构一致性 | T2/T3/T5 产物架构 `MUST` ⊆ `abis` |
| 类符号 | `kotlin` 的 `#Class` 部分 `MUST NOT` 为空 |
| 远程端点 | `url` 的 host `MUST` 出现在 `network.egress:<host>` 声明中 |
| 未声明文件 | 包内存在但未被清单引用的可执行文件 `MUST NOT` 被宿主执行 |

## 4. 与热加载的关系

| 形态 | 替换方式 | 附加要求 |
|---|---|---|
| `js` / `.md` / `.yaml` / `panel.json` | 直接换文件 + 重新解析 | 无 |
| `kotlin` / `wasm` / `bin` | 新隔离类加载器 / 新实例 | `hotReload.classloader = "isolated"` |
| `native` | 卸载旧库后加载新库 | 需 `uiRebuild` 至少 `recreate-activity` |
| `proc` / `url` | 重启进程 / 切换端点 | `strategy` 建议 `graceful` |

详见 [`08-hot-reload.md`](08-hot-reload.md)。

## 5. 明确不在格式内的东西

- 进程间消息格式、序列化方式、方法名表
- 握手、能力协商、心跳
- 任何外部插件格式的运行时语义

这些都属于宿主实现，宿主可以任意选择，只要满足清单声明的组件契约。

---

<a id="file-4"></a>

## 4. `axp/spec/04-capabilities.md`

# 04 · 权限阶梯与能力词汇表

> 状态：Stable
> 适用：AXP v1.x · Android API 26+
> 最后更新：2026-11-14

本文件展开 [`01-format.md`](01-format.md) §6。

## 1. L0–L5 权限阶梯

| 层 | 通道 | 典型能力 | 宿主获取方式 | 用户确认 |
|---|---|---|---|---|
| L0 | 沙箱 | 纯计算、本地模型推理 | 无 | 不需要 |
| L1 | 标准权限 | 文件、网络、相机、通知读取 | Android 运行时权限 | 系统弹窗 |
| L2 | AccessibilityService | 读屏、手势、跨 App 操作 | 无障碍服务开关 | **必须单独确认** |
| L3 | Shizuku | shell 身份、`pm` / `dumpsys` / 隐藏 API | Shizuku 授权 | **必须单独确认** |
| L4 | Root | `su` | Root 授权 | **必须单独确认** |
| L5 | System / Hook | 注入、系统签名 | 签名白名单 | 仅预装 |

`capabilities.privilege` 是插件声明的**最高权限层**。宿主 `MUST NOT` 向插件提供高于该层的通道。

## 2. `capabilities.requests` 完整词汇表

### 无障碍
```
accessibility.read
accessibility.gestures
accessibility.takeScreenshot
accessibility.windowChange
```

### 提权
```
shizuku.binder
root.su
system.inject
```

### 通知与剪贴板
```
notification.listen
notification.post
clipboard.read
clipboard.write
```

### 传感器
```
sensor.gps
sensor.motion
sensor.biometric
sensor.light
```

### 通信
```
telephony.sms.read
telephony.state
intent.send
intent.receive
```

### 包与系统
```
pm.list
pm.install
logcat.read
sysprop.read
media.capture
net.stat
```

### 网络与服务
```
network.egress:<host>        // <host> 为具体域名或 IP，禁止通配符 *
foreground.service
```

### 本地文件
```
fs.read:<scope>              // scope ∈ app | shared | external
fs.write:<scope>
```

**规则**：

1. 声明超出本表的请求 → 校验失败（错误码 `CAP_UNKNOWN_REQUEST`）。
2. `dangerous[]` `MUST` ⊆ `requests[]`；L2 及以上的请求 `SHOULD` 列入 `dangerous[]`。
3. `network.egress:<host>` `MUST` 与 `impl.url` 的 host 一致；`MUST NOT` 使用 `*`。
4. `agents[].privilege` `MUST` ≤ `capabilities.privilege`。
5. `tools[].gradient` 的键 `MUST` ≤ `capabilities.privilege`。
6. 词汇表扩展走 spec-change 提案，需同步更新 `02-manifest.schema.json` 与 `validator/src/validate.mjs`。

## 3. `gradient` 权限梯度

```jsonc
"gradient": {
  "L1": { "impl": { "js": "tools/tap-safe.js" } },
  "L2": { "impl": { "js": "tools/tap-a11y.js" } },
  "L3": { "impl": { "bin": "tools/tap-shell" } }
}
```

宿主选择算法：

```
available = 宿主当前已获授权的层集合 ∩ [L0, capabilities.privilege]
for L from max(available) down to L0:
    if gradient[L] 的实现体可用 → 选用，break
若 gradient 无命中且存在顶层 impl → 用顶层 impl
否则 → 工具 unavailable
```

`MUST` 记录每次选用结果到审计日志（`audit.read` 可读）。

## 4. `runtimeServices` 反向通道

| 值 | 含义 | 宿主义务 |
|---|---|---|
| `sampling` | 插件请求宿主推理 | 提供推理入口，按 `runtime.memoryMB` 限额 |
| `elicitation` | 插件请求用户输入 | 弹 UI，返回结构化结果 |
| `ui.push` | 插件主动更新界面 | 需在 `ui{}` 存在时才有意义 |
| `audit.read` | 读审计日志 | 仅返回本插件产生的记录 |

声明即授权；调用方式由宿主定义，格式不规定方法签名。

## 5. 与动态代码的边界

`runtime.allowDynamicCode` 只控制「是否允许运行时取得**未签名**代码」。

| 场景 | `false` 时是否允许 |
|---|---|
| 装载包内已声明、已签名的实现体 | ✅ 允许 |
| 热加载可信源已签名的新实现体 | ✅ 允许（见 [`08`](08-hot-reload.md)） |
| 从网络下载未签名脚本并 eval | ❌ 禁止 |
| `distribution.channel` 指向任意 URL 直接执行 | ❌ 禁止 |

这条边界必须在校验器里显式实现，避免一刀切把合法热加载判非法。

---

<a id="file-5"></a>

## 5. `axp/spec/05-domains.md`

# 05 · `axp://` 标准域

> 状态：Stable
> 适用：AXP v1.x · Android API 26+
> 最后更新：2026-11-14

Surface 由 `axp://` URI 寻址。宿主 `MUST` 内置下列 13 个标准域；插件可注册自定义域。

## 1. 标准域总表

| 域 | URI 模式 | views | anchor | watchable | 最低权限 | 用途 |
|---|---|---|---|---|---|---|
| `fs` | `axp://fs/<path>` | text, tree, tokens, diagnostics | line, offset, range | ✅ | L1 | 文件与文档视图 |
| `screen` | `axp://screen` | tree, text, image | node | ✅ | L2 | 当前屏幕节点树 |
| `app` | `axp://app/<package>` | meta, tree | uri | ✅ | L1 | 已安装应用与前台状态 |
| `notification` | `axp://notification/stream` | text, tree | uri | ✅ | L1 | 通知流（可作事件源） |
| `intent` | `axp://intent/<action>` | meta | uri | ✅ | L1 | Intent 收发 |
| `sensor` | `axp://sensor/<type>` | value | uri | ✅ | L1 | 传感器数值流 |
| `clipboard` | `axp://clipboard` | text, image | uri | ✅ | L1 | 剪贴板 |
| `telephony` | `axp://telephony/<kind>` | meta, text | uri | ✅ | L1 | 短信与通话状态 |
| `logcat` | `axp://logcat` | text | line | ✅ | L3 | 系统日志流 |
| `pm` | `axp://pm/<package>` | meta, tree | uri | ❌ | L3 | 包管理 |
| `media` | `axp://media/<id>` | image, audio | uri | ✅ | L1 | 媒体与截图 |
| `net` | `axp://net/<iface>` | value, text | uri | ✅ | L1 | 网络状态 |
| `sysprop` | `axp://sysprop/<key>` | value | uri | ❌ | L3 | 系统属性 |

`views` 是宿主 `MUST` 提供的最小集合；插件可在 `surfaces[].views` 中声明额外视图名。

## 2. URI 语法

```
axp://<domain>/<path>[?<query>][#<anchor>]
```

- `<domain>`：标准域名或 `x` 开头的自定义域。
- `<query>`：键值过滤，如 `?app=com.bank.*`。
- `#<anchor>`：配合 `surfaces[].anchor` 定位到节点 / 行列 / 偏移 / 范围。

URI 模板（带 `{}` 占位符）用于声明一类资源，例如 `axp://fs/{path}`；宿主 `MUST` 在订阅时展开。

## 3. watchable 与增量

`watchable: true` 的 Surface `MUST` 支持：

- 订阅 / 退订
- 增量推送（首次全量，之后 diff）
- 背压：宿主可声明最大推送频率，插件 `SHOULD` 遵守

`events[].on` 可直接指向 `watchable` 流并附加 `filter`；`ui.bind[].from` 也可指向该流实现界面自动刷新。

## 4. 自定义域注册

插件 `MAY` 声明 `axp://x/<plugin-id>/<name>`：

```jsonc
{
  "uri": "axp://x/com.example.demo/vision/screen",
  "views": ["tree", "image"],
  "anchor": "node",
  "watchable": true,
  "auth": "L2",
  "impl": { "kotlin": "surfaces/vision/vision.dex#ScreenSurface" }
}
```

规则：

- 前缀 `MUST` 为 `axp://x/<自身 id>/`，否则校验失败（防止抢占他人命名空间）。
- 自定义域不得与标准域同名。
- `auth` `MUST` ≤ `capabilities.privilege`。

## 5. 与组件的关系

```
surfaces[]  声明「有什么数据」      ← 本文件定义寻址
events[]    订阅「数据变了要做啥」  ← on: axp://...
ui.bind[]   把数据接到界面节点      ← from: axp://...
tools[]     对数据执行动作          ← 由 ui.actions / agents 调用
```

---

<a id="file-6"></a>

## 6. `axp/spec/06-ui-vocab.md`

# 06 · UI DSL 节点词汇表

> 状态：Stable
> 适用：AXP v1.x · Android API 26+
> 最后更新：2026-11-14

本文件定义 `ui.panel` / `ui.widget` 使用 `kind: "dsl"` 时的 `panel.json` 结构。`web` 与 `native` 形态不受本文件约束。

## 1. 文档结构

```jsonc
{
  "axpUi": "1.0",
  "root": "main",
  "nodes": [ /* 见 §2 */ ],
  "state": { "scroll": 0, "selected": null },
  "theme": "host"
}
```

| 字段 | 必填 | 说明 |
|---|---|---|
| `axpUi` | ✅ | DSL 版本，本版 `"1.0"` |
| `root` | ✅ | 根节点 id |
| `nodes` | ✅ | 节点数组，扁平声明，通过 `children` 组成树 |
| `state` | | 初始局部状态；热加载时按 `hotReload.state.preserve` 保留 |
| `theme` | | `host`（跟随宿主） / `dark` / `light` |

## 2. 节点通用字段

```jsonc
{ "id": "title", "type": "Text", "props": { "text": "hello" }, "children": [], "bind": "..." }
```

| 字段 | 必填 | 说明 |
|---|---|---|
| `id` | ✅ | 节点唯一 id，供 `ui.bind[].to` / `actions[].id` / `state.preserve` 寻址 |
| `type` | ✅ | 见 §3 词汇表 |
| `props` | | 节点属性 |
| `children` | | 子节点 id 数组（容器类必填） |
| `bind` | | 内联绑定表达式，等价于在 `ui.bind` 中声明一条 |
| `visible` | | 绑定表达式，求值 false 时隐藏 |

## 3. 节点词汇表

### 容器

| type | props | children |
|---|---|---|
| `Scaffold` | `title`, `padding` | ✅ |
| `Column` | `spacing`, `scroll` | ✅ |
| `Row` | `spacing`, `align` | ✅ |
| `Box` | `padding`, `align` | ✅ |
| `Card` | `elevation` | ✅ |
| `List` | `items`(绑定表达式), `divider` | 模板子节点 |
| `Grid` | `columns`, `items` | 模板子节点 |
| `Tabs` | `tabs`, `selected` | ✅ |

### 内容

| type | props |
|---|---|
| `Text` | `text`, `style`, `maxLines` |
| `Image` | `src`, `scale`, `contentDescription` |
| `Icon` | `name`, `tint` |
| `Button` | `label`, `action`(动作 id), `enabled` |
| `Input` | `label`, `value`(绑定), `onChange`(动作 id), `multiline` |
| `Switch` | `label`, `checked`(绑定), `onChange` |
| `Slider` | `min`, `max`, `value`, `onChange` |
| `Progress` | `value`, `indeterminate` |
| `Divider` | `thickness` |
| `Spacer` | `size` |
| `Web` | `url`, `bridge` |
| `Chart` | `series`, `kind` |

### 动作事件

`Button.action` / `Input.onChange` / `Switch.onChange` / `Slider.onChange` 的值 `MUST` 是 `ui.actions[].id`；宿主 `MUST` 在装载时校验 `actions[].tool` 指向本包 `tools[].id`。

## 4. 绑定表达式

```
${surface:<uri>}        // 读取 Surface
${surface:<uri>.<view>} // 指定视图
${state:<key>}          // 读取局部 state
${i18n:<key>}           // 读取 i18n/
${props:<key>}          // 读取宿主注入属性
```

示例：

```jsonc
{ "id": "tree", "type": "Text", "props": { "text": "${surface:axp://vision/screen.text}" } }
```

等价的清单声明：

```jsonc
"ui": { "bind": [ { "from": "axp://vision/screen", "to": "ui.panel.tree" } ] }
```

`to` 路径格式：`ui.panel.<node-id>[.<prop>]`，`MUST` 能在 `panel.json` 中解析到节点。

## 5. 样式 token

`style` ∈ `display / title / body / label / caption / mono`；颜色与间距由 `theme: "host"` 提供，插件 `MUST NOT` 硬编码绝对像素密度。宿主 `MAY` 提供 token 覆盖表。

## 6. 生命周期契约

`ui.lifecycle` 的三个回调由宿主按以下时机调用，签名由宿主 SDK 定义，格式只规定时机与输入：

| 回调 | 时机 | 输入 | 宿主义务 |
|---|---|---|---|
| `onLoad` | 首次挂载界面 | `{ state, bindings }` | 完成后界面可见 |
| `onReload` | 热替换成功后 | `{ oldState, newState, changed[] }` | 先按 `state.migrate` 迁移，再调用；失败则触发回滚 |
| `onUnload` | 卸载 / 替换前 | `{ state }` | 释放资源；`MUST` 在旧类加载器回收前完成 |

启用 `hotReload` 且 `targets` 含 `ui.*` 时，`lifecycle` `MUST` 至少包含 `onReload` 与 `onUnload`。

## 7. 完整示例

见 [`examples/02-ui-panel/ui/panel.json`](../examples/02-ui-panel/ui/panel.json)。

## 8. 宿主一致性

| 等级 | 要求 |
|---|---|
| 最小 | 实现 `Scaffold / Column / Row / Text / Button / Input / List` 与 `${surface:}` 绑定 |
| 完整 | 本文件全部节点 + `${state:}` / `${i18n:}` + 生命周期回调 + 热重建 |

---

<a id="file-7"></a>

## 7. `axp/spec/07-expression-map.md`

# 07 · 表达能力覆盖映射（外部验收材料）

> 状态：Stable
> 适用：AXP v1.x
> 最后更新：2026-11-14

> **本文件不是规范正文。** 它是对外验收材料：用来证明「AXP 的组件模型足以表达同类格式中出现过的全部组件类型」。`spec/01-format.md` 不引用本文件的任何字段名，AXP 的语义独立定义。

## 0. 两个容易混淆的判定

| 判定 | 结论 |
|---|---|
| AXP 与下列格式是否同级独立规范 | ✅ 是。互不导入、互不桥接、互不内嵌 |
| AXP 的表达能力能否覆盖下列格式出现过的组件类型 | ✅ 能。逐字段映射见 §2 |
| AXP 宿主能否直接装载它们的插件 | ❌ 不能，也不需要。宿主只装载 `.axp` 包 |
| AXP 是否需要运行时接入它们的协议 | ❌ 不需要。`impl.proc` 只是通用外部进程声明 |

**「能表达」= 任何用那些格式能描述出来的组件，在 AXP 里都能找到一条声明写法；不意味着要运行它们的运行时。**

## 1. 总映射表

| 来源格式 | 其组件／概念 | AXP 对应声明 |
|---|---|---|
| MCP | tools | `tools[]` |
| MCP | resources / templates / subscriptions | `surfaces[]`（URI 模板 / `watchable`） |
| MCP | prompts | `knowledge[kind=prompt]` |
| MCP | sampling / elicitation | `capabilities.runtimeServices` |
| MCP | roots | `axp://fs` 域 |
| MCP | transport（stdio / SSE） | 不属于声明层；`impl.proc` 仅声明「有外部进程」 |
| LSP | textDocument 读类（hover / tokens / diagnostics …） | `surfaces[].views` |
| LSP | 请求类（completion / definition / rename …） | `tools[]`（`impl` 指向外部进程） |
| LSP | didOpen / didChange / publishDiagnostics | `surfaces[].watchable` + `events[]` |
| LSP | workspace/* | `axp://fs` + `events[lifecycle.workspace.*]` |
| Agent Skills | SKILL.md（frontmatter + 渐进披露） | `knowledge[kind=skill]`，`entry` 直接是 `.md` |
| Agent Skills | allowed-tools | `knowledge[].allowedTools` |
| Claude Plugins | commands | `knowledge[kind=command]` |
| Claude Plugins | agents | `agents[]` |
| Claude Plugins | hooks（固定事件表） | `events[on=lifecycle.*]` |
| Claude Plugins | 外部服务声明 | `tools[].impl.proc` / `surfaces[].impl.proc` |
| OpenCode Plugins | tool / 全事件 hooks | `tools[]` / `events[]` |
| OpenCode Plugins | 语言服务模块 | `surfaces[axp://fs]` + `tools[impl=proc]` —— 作为普通插件表达 |
| OpenCode Plugins | 包管理器安装 | `distribution.channel`（Android 会话安装，格式不假定包管理器） |
| DSH | profile 工具集 | `tools[]` + `capabilities.privilege` |
| — | **AXP 独有** | `ui{}`、`hotReload{}`、`gradient`、L0–L5、13 个标准域、`instances`、多实现路径 `impl` |

## 2. 逐字段映射细节

### 2.1 工具

| 外部字段 | AXP 字段 | 说明 |
|---|---|---|
| `name` | `tools[].id` | 点分命名空间 |
| `description` | `tools[].description` | 直译 |
| `inputSchema` | `tools[].input` | JSON Schema，可内联或 `$ref` |
| 调用入口 | `tools[].impl` / `gradient` | AXP 额外提供权限梯度与多实现路径 |

### 2.2 资源与文档

| 外部概念 | AXP 字段 |
|---|---|
| URI / URI template | `surfaces[].uri`（支持 `{}` 占位） |
| MIME / 多视图 | `surfaces[].views` |
| 行列 / 偏移 / 范围定位 | `surfaces[].anchor` |
| 订阅变更 | `surfaces[].watchable` |
| 诊断 / 符号 / 悬浮信息 | `views` 中的自定义视图名，宿主按域实现 |

### 2.3 知识与提示

| 外部概念 | AXP 字段 |
|---|---|
| `SKILL.md` frontmatter | `knowledge[].entry` 指向 `.md`，格式不发明新知识语法 |
| 渐进披露 | `knowledge[].progressive` |
| 提示参数 | `knowledge[kind=prompt].arguments` |
| 斜杠命令 | `knowledge[kind=command]` |
| 工具白名单 | `knowledge[].allowedTools` |

### 2.4 子代理与事件

| 外部概念 | AXP 字段 |
|---|---|
| 子代理定义 | `agents[]`（额外有 `privilege` 上限） |
| 固定 hook 事件表 | `events[on=lifecycle.*]` |
| 自定义事件源 | `events[on=<任意 watchable Surface>] + filter` |

### 2.5 反向通道

| 外部概念 | AXP 字段 |
|---|---|
| 请求宿主推理 | `capabilities.runtimeServices: ["sampling"]` |
| 请求用户输入 | `capabilities.runtimeServices: ["elicitation"]` |
| 方法名 / 调用协议 | **不进格式**，由宿主运行时定义 |

## 3. AXP 独有能力（反向不可表达）

以下 6 项在上述格式中没有对应声明结构，是 AXP 作为 Android 专属格式的增量：

1. `ui{}` —— 界面、数据绑定、动作回填、生命周期
2. `hotReload{}` —— 组件级替换、每次验签、状态迁移、回滚、UI 重建
3. `gradient` —— 同一工具按权限层声明不同实现并自动降级
4. L0–L5 权限阶梯与 `dangerous` 单独确认
5. 13 个 `axp://` Android 标准域
6. `instances` 多实例 + `runtime` 资源上限 + 多实现路径 `impl`

## 4. 验收方法

对任一外部格式的示例插件，按以下步骤判定覆盖：

1. 拆出它的组件清单（工具、资源、提示、子代理、钩子、命令…）
2. 每个组件在 §1 总表找到 AXP 声明节
3. 按 §2 写出等效 `axp.json` 片段
4. 用 `axp validate` 校验通过
5. **不需要**运行原格式运行时，也不需要原插件能被装载

验收产物是一个 `.axp` 包 + 一份映射说明；仓库 `examples/` 中的综合示例可作为模板。

## 5. 措辞约定

对外文档可以用「表达能力覆盖」；规范正文与 README 首屏 `MUST` 使用「同级独立格式」，`MUST NOT` 使用「收编 / 上层 / 超集 / 元格式 / 桥」描述 AXP 与其他格式的关系。

---

<a id="file-8"></a>

## 8. `axp/spec/08-hot-reload.md`

# 08 · 热加载

> 状态：Stable
> 适用：AXP v1.x · Android API 26+
> 最后更新：2026-11-14

本文件展开 [`01-format.md`](01-format.md) §7。热加载在 AXP 里是**格式字段**，不是宿主私有能力：插件作者声明「哪些组件可以被换、换的时候怎么保状态、怎么验签、怎么回滚」，宿主按声明执行。

## 1. 字段全表

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `enabled` | bool | `false` | 关闭时宿主 `MUST NOT` 接受任何运行时替换 |
| `unit` | enum | `component` | `package`（整包换）/ `component`（单组件换） |
| `targets` | string[] | `[]` | 可替换前缀，如 `ui.*` / `tools.screen.*` / `knowledge.*` |
| `strategy` | enum | `graceful` | `immediate` / `graceful`（等会话空闲）/ `next-session` |
| `signature` | enum | `on-install` | 启用时 `MUST` 为 `on-every-load` |
| `sources` | enum[] | `["package"]` | `package` / `trusted-channel` / `preinstall`；`MUST NOT` 有 `network-unsigned` |
| `state.migrate` | path | | 状态迁移映射文件 |
| `state.preserve` | string[] | `[]` | 原样保留的状态键，支持 `*` |
| `rollback.keep` | int | `2` | 保留历史代数 |
| `rollback.onError` | bool | `true` | 新版本初始化失败时自动回滚 |
| `uiRebuild` | enum | `recompose` | `recompose` / `recreate-activity` / `restart-host` |
| `classloader` | enum | `isolated` | `dex` / `wasm` 实现体 `MUST` 为 `isolated` |

## 2. 状态机

```
   ┌──────────┐  替换请求   ┌───────────┐  验签通过  ┌──────────┐
   │  ACTIVE  │ ──────────▶ │ VERIFYING │ ─────────▶ │ STAGING  │
   └──────────┘             └───────────┘            └──────────┘
        ▲                         │ 验签失败               │
        │                         ▼                       ▼
        │                    ┌──────────┐           ┌──────────┐
        │  回滚成功           │ REJECTED │◀──────────│ MIGRATE  │
        │                    └──────────┘  迁移失败   └──────────┘
        │                                                  │
        │                       ┌──────────┐               │ 成功
        └───────────────────────┤ ROLLED   │◀──────────────┤
            初始化失败 或 onError │  BACK    │               ▼
                                └──────────┘          ┌──────────┐
                                                      │ SWAPPED  │
                                                      └──────────┘
```

`MUST` 保证：任何时刻用户可见的要么是旧版本，要么是新版本，`MUST NOT` 出现半新半旧。

## 3. Android 实现约束

### 3.1 类加载器隔离

`dex` / `wasm` 实现体 `MUST` 使用独立类加载器（推荐 `InMemoryDexClassLoader` 或每代一个 `DexClassLoader`）：

- 每一代替换创建新实例，旧实例在无强引用后由 GC 回收
- `MUST NOT` 把插件类注入宿主 `PathClassLoader`（无法卸载）
- `classloader: "shared"` 仅允许用于纯 `js` / `.md` / `panel.json` 实现体

### 3.2 资源与 UI

| 变更类型 | 建议 `uiRebuild` | 说明 |
|---|---|---|
| `panel.json` / 文案 / 样式 | `recompose` | 重放声明式节点树，保留 state |
| `.dex` 中的自定义 View / Activity | `recreate-activity` | 重建 Activity，按 `state.migrate` 恢复 |
| `.so` / 宿主级注入 | `restart-host` | 最后手段，`strategy` 建议 `next-session` |

`onReload` `MUST` 在界面重建**之后**、界面可见**之前**调用；`onUnload` `MUST` 在旧类加载器回收**之前**完成。

### 3.3 每次加载验签

```
verify(newBundle, distribution.publisher):
    1. 校验 APK Signature Scheme v3 签名块
    2. 比对发布者证书指纹 == distribution.publisher
    3. 校验新包 axp.json 的 id / capabilities.privilege 不扩大
    4. 校验 targets 内组件 id 集合 ⊆ 旧包声明
    5. 任一失败 → REJECTED，保留旧版本，写审计
```

第 3 条特别重要：**热加载 `MUST NOT` 用来提权**。权限变更只能走完整重装流程。

### 3.4 状态迁移

`state.migrate` 是一个 JSON 映射：

```jsonc
{
  "from": "1.0.0",
  "to": "1.1.0",
  "map": [
    { "src": "ui.panel.scroll", "dst": "ui.panel.listScroll", "transform": "identity" },
    { "src": "agents.walker.history", "dst": "agents.walker.history", "transform": "identity" }
  ],
  "drop": ["ui.panel.legacyFlag"]
}
```

`state.preserve` 中的键 `MUST` 跳过 `map` 直接原样保留。迁移失败 → 按 `rollback.onError` 回滚。

### 3.5 回滚

宿主 `MUST` 保留最近 `rollback.keep` 代的完整实现体快照与签名。触发条件：

- `onReload` 抛错或超时
- 新版本初始化失败
- 用户主动回退

回滚同样 `MUST` 走 §3.3 的验签流程（防降级攻击）。

## 4. 与 `allowDynamicCode` 的边界

| 配置 | 结果 |
|---|---|
| `allowDynamicCode: false` + `hotReload.signature: on-every-load` + `sources ⊆ {package, trusted-channel, preinstall}` | ✅ 合法 |
| `allowDynamicCode: false` + `sources` 含 `network-unsigned` | ❌ `HOT_UNSIGNED_SOURCE` |
| `allowDynamicCode: false` + `signature: on-install` | ❌ `HOT_SIGNATURE_POLICY` |
| 运行时 `eval` 从任意 URL 取得的代码 | ❌ 无条件禁止 |

校验器 `MUST NOT` 把 `allowDynamicCode: false` 单独当作拒绝热加载的理由。

## 5. 宿主 MUST 清单

- [ ] 替换前重新验签，且比对 `id` / `privilege` 未扩大
- [ ] `targets` 之外的组件保持旧实现
- [ ] 隔离类加载器，旧代可回收
- [ ] 状态迁移 → `onReload` → 界面可见，顺序不可颠倒
- [ ] 失败自动回滚，回滚也验签
- [ ] 全程写审计日志，含发起方、代号、结果
- [ ] `strategy: graceful` 时等待当前会话空闲，`immediate` 时提示用户

## 6. 明确禁止

- 用热加载扩大 `capabilities.privilege` 或新增 `requests`
- 用热加载引入清单未声明的组件 id
- 从任意 URL 拉取未签名实现体直接执行
- 在 `onReload` 中阻塞主线程超过宿主声明的超时

## 7. 教程

接入步骤见 [`docs/hot-reload-tutorial.md`](../docs/hot-reload-tutorial.md)；最小可运行配置见 [`examples/03-hot-reload`](../examples/03-hot-reload)。

---

<a id="file-9"></a>

## 9. `axp/spec/09-versioning.md`

# 09 · 版本与兼容

> 状态：Stable
> 适用：AXP v1.x
> 最后更新：2026-11-14

## 1. 三个版本号

| 字段 | 含义 | 变更时机 |
|---|---|---|
| `axp` | 格式版本（本版 `"1.0"`） | 组件模型或清单结构不兼容变更 |
| `minHost` | 宿主最低版本 | 插件用到新宿主能力时 |
| `version` | 插件自身语义化版本 | 插件内容变更 |

`distribution.signatureScheme` 与签名算法版本另计。

## 2. 兼容规则

| 变更 | 兼容性 | 处理 |
|---|---|---|
| 新增可选字段 | 向后兼容 | 旧宿主忽略未知字段？**否** —— `additionalProperties: false`，旧宿主 `MUST` 升级 schema 或拒绝并提示 |
| 新增枚举值 | 向后兼容 | 旧宿主视为不可用，不报错 |
| 删除字段 / 改字段类型 | 破坏性 | 提升 `axp` 主版本 |
| 收紧 `required` | 破坏性 | 提升 `axp` 主版本 |
| 权限词汇表新增项 | 向后兼容 | 旧宿主按 `CAP_UNKNOWN_REQUEST` 拒绝，需升级 |

> AXP 选择严格 schema（`additionalProperties: false`）而非宽容解析，因为清单是安全边界：未知字段可能携带未声明的能力。

## 3. 弃用流程

1. 在 `CHANGELOG.md` 标记 `Deprecated`，给出替代字段
2. 至少保留一个次版本周期
3. 校验器产出 `WARN_DEPRECATED`（警告，不阻断）
4. 下个主版本删除

## 4. 宿主版本协商

```
装载前：host.version >= manifest.minHost ?
        否 → 拒绝，错误码 HOST_TOO_OLD
        是 → 继续
```

宿主 `SHOULD` 在收到更高 `axp` 版本的包时给出明确升级提示，`MUST NOT` 猜测未知字段语义。

## 5. 热加载版本约束

见 [`08-hot-reload.md`](08-hot-reload.md) §3.3：热加载 `MUST NOT` 改变 `axp` 格式版本、`id`、`capabilities.privilege`；只能替换实现体与 `version`。

## 6. spec 发布物

每个 tag `spec-v1.x.y` 附带：

- `axp-spec-<version>.zip`（`spec/` 全量）
- `CHANGELOG.md` 差异摘要
- `validator` 对应版本的可执行文件

---

<a id="file-10"></a>

## 10. `axp/validator/README.md`

# axp-validator

零依赖、离线可运行的 AXP v1.0 清单校验器。用 Node 内置模块实现，不装任何 npm 包，方便塞进任意 CI。

```bash
node validator/src/validate.mjs path/to/plugin
node validator/src/validate.mjs path/to/plugin --json
node validator/src/validate.mjs path/to/plugin --strict

# 行为固化 + 标准引擎复核
node validator/test/run-tests.mjs
python3 validator/test/schema-crosscheck.py
```

也可以作为模块：

```js
import { validate } from './validator/src/validate.mjs';
const r = validate('path/to/plugin');
console.log(r.ok, r.errors, r.summary);
```

## 校验顺序

对应 [`../spec/01-format.md`](../spec/01-format.md) §8：

1. JSON 解析
2. `../spec/02-manifest.schema.json` 结构校验（内置精简 JSON Schema 引擎，关键字子集见 [`test/README.md`](test/README.md)）
3. 引用完整性（包内相对路径存在、无 `..`、无绝对路径）
4. `abis` 一致性
5. 组件 id 唯一性
6. `capabilities.requests` 词汇表
7. 权限上限（`dangerous ⊆ requests`、`gradient` / `agents` ≤ `privilege`）
8. UI 引用（`bind[].to` 可解析、`actions[].tool` 指向本包工具）
9. 热加载策略（每次验签、可信源、隔离类加载器、UI 生命周期）
10. **未在清单声明的可执行文件不得作为入口**

内置引擎的结论由 `test/schema-crosscheck.py` 用 Python `jsonschema`（draft 2020-12 参考实现）逐分支复核，确保两套引擎一致。

## 错误码

| Code | 含义 |
|---|---|
| `MANIFEST_MISSING` / `MANIFEST_PARSE` | 缺 `axp.json` / JSON 解析失败 |
| `SCHEMA_*` | schema 结构错误（`ADDITIONAL_PROPERTY` / `REQUIRED` / `TYPE` / `ENUM` / `CONST` / `ANYOF` / `MINITEMS` / `MINLENGTH` / `MINIMUM` / `MAXIMUM`） |
| `ID_INVALID` | `id` 不是反向域名 |
| `VERSION_INVALID` | `version` 非语义化版本 |
| `PUBLISHER_INVALID` | `distribution.publisher` 非 `sha256:<64hex>` |
| `IMPL_FILE_MISSING` | `impl` 引用的包内文件不存在 |
| `UNSAFE_PATH` | 路径含 `..` 或绝对路径 |
| `UNDECLARED_EXECUTABLE` | 包内存在未被清单引用的可执行文件 |
| `ABI_MISSING` | 包内有 `.so` / `.dex` 但 `abis` 为空 |
| `DUP_ID` | 组件 id / uri 重复 |
| `CAP_UNKNOWN_REQUEST` | `requests` 项不在 [`../spec/04-capabilities.md`](../spec/04-capabilities.md) 词汇表 |
| `CAP_WILDCARD_EGRESS` | `network.egress` 使用 `*` |
| `DANGEROUS_NOT_REQUESTED` | `dangerous` 含未申请的权限 |
| `GRADIENT_EXCEEDS_PRIVILEGE` | `gradient` 键高于 `capabilities.privilege` |
| `AGENT_EXCEEDS_PRIVILEGE` | `agents[].privilege` 高于上限 |
| `TOOL_CONFIRM_REQUIRED` | `sideEffects: destructive` 但 `confirm` 非 true |
| `UI_BIND_TARGET_MISSING` | `bind[].to` 在 `panel.json` 中解析不到节点 |
| `UI_ACTION_TOOL_MISSING` | `actions[].tool` 不是本包工具 id |
| `SURFACE_NOT_WATCHABLE` | `bind[].from` / `events[].on` 指向的 Surface 未 `watchable` |
| `NET_EGRESS_UNDECLARED` | `impl.url` 的 host 未声明 |
| `HOT_SIGNATURE_POLICY` | 热加载未设 `on-every-load` |
| `HOT_UNSIGNED_SOURCE` | `sources` 含 `network-unsigned` |
| `HOT_CLASSLOADER` | 热加载未用 `isolated` |
| `HOT_NO_TARGETS` | `targets` 为空 |
| `HOT_UI_LIFECYCLE` | `targets` 含 `ui.*` 但缺 `onReload` / `onUnload` |

## 明确不做的事

- **不会**因为 `runtime.allowDynamicCode: false` 拒绝合法热加载。该字段禁的是「网络未签名代码」，不是「可信源已签名替换」。见 [`../spec/04-capabilities.md`](../spec/04-capabilities.md) §5。
- **不会**校验或执行任何外部插件协议；校验器只认 `axp.json`。
- **不会**执行插件实现体；`inspect` 也只读清单。真正执行实现体的是 [`../runtime/`](../runtime/) 参考宿主。

## 警告（默认不阻断，`--strict` 阻断）

| Code | 含义 |
|---|---|
| `WARN_ABI_EMPTY` | `abis` 非空但包内无二进制产物 |
| `WARN_DEPRECATED` | 使用了弃用字段 |

---

<a id="file-11"></a>

## 11. `axp/docs/host-checklist.md`

# 宿主合规自检表

> 状态：Stable
> 适用：AXP v1.x
> 最后更新：2026-11-14

宿主达到哪个等级，见 [`../spec/01-format.md`](../spec/01-format.md) §11。发布前逐项勾选。

## 装载与校验（AXP-0，全部 MUST）

- [ ] 按 §8 的 1–7 步顺序执行，任一步失败整包拒绝
- [ ] 用 `spec/02-manifest.schema.json` 做结构校验（`additionalProperties: false`）
- [ ] 校验 APK v3 签名与 `distribution.publisher` 一致
- [ ] 所有包内相对路径存在，无 `..` / 绝对路径 / 通配符展开
- [ ] `abis` 声明与包内 `.dex` / `.so` / `.wasm` 一致
- [ ] `requires[]` 闭包解析且无环
- [ ] `requests` 全在词汇表内；`dangerous ⊆ requests`
- [ ] `agents[].privilege ≤ capabilities.privilege`；`gradient` 键同理
- [ ] **未在清单声明的文件一律不执行**
- [ ] `tools[].sideEffects = destructive` 时强制确认
- [ ] 失败给出结构化错误（字段路径 + 错误码），不部分注册

## 感知与知识（AXP-1，全部 MUST）

- [ ] 13 个标准域可用，自定义域前缀 `axp://x/<自身 id>/`
- [ ] `watchable` Surface 支持订阅 / 退订 / 增量 / 背压
- [ ] `knowledge.progressive` 实现三级渐进披露
- [ ] `knowledge.allowedTools` 作为激活期工具白名单生效

## 全组件（AXP-2）

- [ ] `agents[]` 强制 `privilege` 上限、`maxTurns` 生效
- [ ] `events[]` 支持生命周期命名空间与任意 Surface 流 + `filter`
- [ ] `ui{}` 四种形态至少实现 `panel(kind=dsl)` 的最小节点集
- [ ] 校验 `ui.bind[].to` 可解析、`ui.actions[].tool` 指向本包工具
- [ ] `ui.lifecycle` 三个回调按时机调用

## 提权与热加载（AXP-3）

- [ ] `gradient` 按「当前可用最高层」选择并逐级回退，无路径时 `unavailable` 不崩
- [ ] 每次选用结果写审计日志
- [ ] 热加载**每次**重新验签，比对 `publisher` / `id` / `privilege` 未扩大
- [ ] `targets` 之外的组件保持旧实现
- [ ] 隔离类加载器，旧代可回收
- [ ] 顺序：`state.migrate` → `onUnload` → 组件换 → `uiRebuild` → `onReload` → 可见
- [ ] 失败自动回滚，回滚也验签；保留 `rollback.keep` 代
- [ ] `runtime.allowDynamicCode: false` **不**误杀合法热加载
- [ ] 拒绝 `sources` 含 `network-unsigned` / `signature != on-every-load`

## SHOULD

- [ ] README 声明所达等级（AXP-0 ~ AXP-3）
- [ ] 提供 `runtimeServices` 的 `sampling` / `elicitation` / `ui.push` / `audit.read`
- [ ] 资源上限 `runtime.memoryMB` / `cpuPct` 生效
- [ ] `instances.multi` 多实例隔离

## 参考实现一致性

- [ ] 宿主行为与 [`../runtime`](../runtime) 参考运行时一致：9 步顺序、`gradient` 选择、Surface 增量、`ui.bind` 刷新、热加载 phases 顺序
- [ ] `node runtime/test/smoke.mjs` 的 30 条断言全部能在真机版本找到对应实现或明确降级说明
- [ ] 若使用 [`../reference-host/android`](../reference-host/android) 骨架，已补齐 `ManifestValidator`（接真实 schema）、`HostBridge.verifySignature()`（接真实 APK v3）、QuickJS/Hermes 执行体
- [ ] 生产环境使用 `strict` 签名策略；`dev` 仅用于本地与 CI
- [ ] 明确声明达到的等级（AXP-0 ~ AXP-3）与未实现项

## 一键验证

```bash
node validator/src/validate.mjs examples/01-hello
node validator/src/validate.mjs examples/02-ui-panel
node validator/src/validate.mjs examples/03-hot-reload
node validator/src/validate.mjs examples/04-domains
node validator/test/run-tests.mjs
python3 validator/test/schema-crosscheck.py
node runtime/test/smoke.mjs
```

四个示例全绿 + 三套测试全绿（31 / 43 / 30），是发布的最低门槛。

---

> 合订完毕。原始逐文件版本见 `AXP-spec-原始文件包.zip`；11 篇教程（`axp/docs/`）亦在包内。
