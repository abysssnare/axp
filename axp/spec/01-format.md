# AXP Format Specification v1.0

> 状态：Stable
> 适用：AXP v1.x · Android API 26+
> 格式版本：1.0.0（对应清单字段 `axp: "1.0"`）
> 文档版本：1.1.0（新增章节与勘误，格式语义不变）
> 最后更新：2026-11-15

本文件是 AXP 的**唯一规范性正文**。其他 `spec/*.md` 是本文件条款的展开；若冲突，以本文件为准。[`02-manifest.schema.json`](02-manifest.schema.json) 是本文件 §3 的机器可读形式，[`index.json`](index.json) 是全规范文档的机器可读索引与统计单一事实源。

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

### 0.4 文档体系与规范性引用

| 章节 | 内容 | 规范性地位 |
|---|---|---|
| [`01`](01-format.md) | 格式主规范：定位 / 包 / 清单 / 组件 / 权限 / 装载 | **唯一规范性正文** |
| [`02`](02-manifest.schema.json) | `axp.json` 的 JSON Schema（draft 2020-12） | 规范性（§3 的机器形式） |
| [`03`](03-impl-reference.md) – [`06`](06-ui-vocab.md) | impl / 权限 / 域 / UI DSL 的展开 | 规范性（本文件条款展开） |
| [`07`](07-expression-map.md) | 表达能力覆盖映射 | **外部验收材料**，不参与规范性定义 |
| [`08`](08-hot-reload.md) – [`09`](09-versioning.md) | 热加载 / 版本与兼容 | 规范性 |
| [`10`](10-infrastructure.md) | 规范项目自身的基础设施（工具链 / CI / 产物 / 部署 / 发布） | 规范性（**不定义 `.axp` 包**） |
| [`11`](11-conformance.md) | AXP-0…3 的可验证断言与认证流程 | 规范性（§11 的展开） |
| [`12`](12-security.md) | 威胁模型与安全 MUST（S1–S12） | 规范性（散落条款的编号汇总） |
| [`13`](13-registry.md) | 索引与分发格式（M6） | 规范性（草稿，不改变包结构） |
| [`index.json`](index.json) | 文档清单、版本、统计、错误码、断言 ID | 规范性（机器可读单一事实源） |

`10`–`13` 章规定的是**规范项目与宿主生态**，不是插件清单字段；引用它们 `MUST NOT` 被理解为向 `axp.json` 增加字段。文档、schema、校验器、站点与 CI 的一致性由 `scripts/spec-check.mjs` 断言，见 [`10`](10-infrastructure.md) §4。

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
| `tools` / `surfaces` / `knowledge` / `agents` / `events` | array | | 五类数组组件，见 §5 |
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
  "uri": "axp://screen",
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
    { "from": "axp://screen", "to": "ui.panel.tree" }
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

失败 `MUST` 给出结构化错误（字段路径 + 规则编号），`MUST NOT` 部分注册组件。错误码表见 [`../validator/README.md`](../validator/README.md)。

### 8.2 校验器与规范的一致性

校验器 `MUST` 把 §8 的每一步映射到可观测的错误码，`MUST NOT` 出现「规范有条款、实现无对应检查」的空档。具体要求：

- 精简 schema 引擎 `MUST` 与独立 draft 2020-12 引擎结论一致（[`10`](10-infrastructure.md) §4.2）
- 每个业务错误码 `MUST` 至少有一条行为用例，且 `MUST` 登记在 [`index.json`](index.json) 与校验器错误码表中
- 自检数字 `MUST` 与 `index.json.counts` 一致，由 `scripts/spec-check.mjs` 断言
- 宿主声称达到 AXP-n 时 `MUST` 通过 [`11`](11-conformance.md) 对应等级的全部断言

### 8.3 依赖闭包

`requires[].id` 指向另一个已安装 `.axp` 包；`range` 支持 `>= / > / <= / < / = / ^ / ~`。宿主 `MUST` 在装载前完成闭包解析并检测环。

---

## 9. 分发与签名

| 字段 | 说明 |
|---|---|
| `distribution.channel` | `session-install`（Android 会话安装，默认） / `trusted-channel`（签署通道） / `preinstall` |
| `distribution.publisher` | 发布者证书指纹 `sha256:...` |
| `distribution.signatureScheme` | `apk-v3`（默认） |

分发态 `MUST` 为 zip，包内附签名块；`MUST NOT` 使用「从任意 URL 拉取未签名包即执行」的分发方式。索引与信任链由宿主实现，不属于格式；宿主若实现可互操作的索引与更新，`MUST` 遵循 [`13-registry.md`](13-registry.md) 的 `axp-index/1.0`。安全约束见 [`12-security.md`](12-security.md)。

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

宿主 `SHOULD` 在 README 声明所达等级。自检表见 [`docs/host-checklist.md`](../docs/host-checklist.md)；等级的可验证断言与第三方认证流程见 [`11-conformance.md`](11-conformance.md)——**声明等级不等于通过认证**，`MUST` 有可复现的结果文件。

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

实现进度不影响规范条款本身。截至文档版本 1.1.0：M1、M2（Node 参考宿主 [`../runtime/README.md`](../runtime/README.md)）、M2.5、M5 已跑通；M3 的规范 / [`04-domains` 示例](../examples/04-domains/README.md) / 教程就位，真机域适配器待补；M4 的 `gradient` 选择算法已实现、Shizuku L3 通道待接；M6 的**索引与分发规范已定义**（[`13`](13-registry.md)），真实证书链与会话安装仍待宿主实现；M7 的一致性断言与认证流程已定义（[`11`](11-conformance.md)），认证套件用例待生态补齐。Android 真机骨架见 [`../reference-host/README.md`](../reference-host/README.md)，用法见 [`../docs/runtime-guide.md`](../docs/runtime-guide.md)。全项目任务总账见 [`../../ROADMAP-ALL-TASKS.md`](../../ROADMAP-ALL-TASKS.md)。

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
| 只有 9 篇 spec、无基础设施条款 | 新增 `10`–`13` + `index.json` + `spec-check.mjs` | 让 CI / 产物 / 认证 / 安全 / 分发也成为可断言的规范 |
| §8 缺 8.2、示例 URI 用了非标准域（见 `05` §6）、兼容表自相矛盾 | 补 8.2、URI 统一为 `axp://screen`、修正兼容规则 | v1.1.0 编辑性勘误，格式语义不变 |

---

## 附录 B：完整示例

见 [`examples/03-hot-reload/axp.json`](../examples/03-hot-reload/axp.json)，覆盖六类组件 + UI + 热加载；标准域用法见 [`examples/04-domains/axp.json`](../examples/04-domains/axp.json)。
