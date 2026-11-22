# AXP v1.1 规范全文合订（含 21 章接入规范）
> 来源：重构后的 `axp-spec` 仓（基于 `Ultra-Guru/axp` @ `e4e7de0` 全面完善）· 规范文档版本 **v1.1**（第三批增补 21 章）· 2026-11-20
> 主规范 `01-format.md` §0–§12 未改；v1.1 新增 10–21 共 12 篇专章 + 5 个附属 schema，唯一 `axp.json` schema 变更为 `runtimeServices += storage`（可选）。
> 规范性层级见 `13-glossary-conventions.md` §1；本合订为阅读便利，逐文件原文见 `axp-spec.zip` 与 `AXP-spec-v1.1-仅规范.zip`。

---

## 目录
1. [axp/spec/01-format.md](#file-1)
2. [axp/spec/02-manifest.schema.json](#file-2)
3. [axp/spec/03-impl-reference.md](#file-3)
4. [axp/spec/04-capabilities.md](#file-4)
5. [axp/spec/05-domains.md](#file-5)
6. [axp/spec/06-ui-vocab.md](#file-6)
7. [axp/spec/07-expression-map.md](#file-7)
8. [axp/spec/08-hot-reload.md](#file-8)
9. [axp/spec/09-versioning.md](#file-9)
10. [axp/spec/10-distribution-index.md](#file-10)
11. [axp/spec/10-index.schema.json](#file-11)
12. [axp/spec/11-plugin-management-agent.md](#file-12)
13. [axp/spec/12-host-conformance.md](#file-13)
14. [axp/spec/13-glossary-conventions.md](#file-14)
15. [axp/spec/14-manifest-reference.md](#file-15)
16. [axp/spec/15-panel.schema.json](#file-16)
17. [axp/spec/15-ui-dsl.md](#file-17)
18. [axp/spec/16-host-context.md](#file-18)
19. [axp/spec/16-install-intent.schema.json](#file-19)
20. [axp/spec/16-registry.schema.json](#file-20)
21. [axp/spec/17-domains-reference.md](#file-21)
22. [axp/spec/18-security-model.md](#file-22)
23. [axp/spec/19-error-codes.md](#file-23)
24. [axp/spec/20-compatibility-governance.md](#file-24)
25. [axp/spec/21-android-host-integration.md](#file-25)
26. [axp/spec/21-host-capabilities.schema.json](#file-26)
27. [axp/docs/android-integration-cookbook.md](#file-27)
28. [axp/docs/cli-reference.md](#file-28)
29. [axp/docs/cookbook-android-host.md](#file-29)
30. [axp/docs/cookbook-no-ui.md](#file-30)
31. [axp/docs/doc-templates.md](#file-31)
32. [axp/docs/domains-tutorial.md](#file-32)
33. [axp/docs/faq.md](#file-33)
34. [axp/docs/github-setup.md](#file-34)
35. [axp/docs/host-checklist.md](#file-35)
36. [axp/docs/hot-reload-tutorial.md](#file-36)
37. [axp/docs/integration-guide.md](#file-37)
38. [axp/docs/plugin-tutorial.md](#file-38)
39. [axp/docs/runtime-guide.md](#file-39)
40. [axp/docs/ui-tutorial.md](#file-40)
41. [axp/validator/README.md](#file-41)
42. [axp/README.md](#file-42)
43. [axp/CHANGELOG.md](#file-43)

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

实现进度不影响规范条款本身。截至 v1.0.2：M1、M2（[`../runtime/README.md`](../runtime/README.md)）、M2.5、M5 已跑通；M3 的规范 / [`04-domains` 示例](../test/fixtures/04-domains/README.md) / 教程就位，真机域适配器待补；M4 的 `gradient` 选择算法已实现、Shizuku L3 通道待接；M6 真实签名信任链待接。Android 真机骨架见 [`../reference-host/README.md`](../reference-host/README.md)，用法见 [`../docs/runtime-guide.md`](../docs/runtime-guide.md)。

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

见 [`test/fixtures/03-hot-reload/axp.json`](../test/fixtures/03-hot-reload/axp.json)，覆盖六类组件 + UI + 热加载；标准域用法见 [`test/fixtures/04-domains/axp.json`](../test/fixtures/04-domains/axp.json)。



---

## 13. 补篇索引（v1.1 全面完善，主规范 §0–§12 不变）

主规范 §0–§12 **一字未改**。为使「能安装、能点开、能被 Agent 选、能写文件、能合规验证」真正落地，
规范文档版本升级到 `1.1.0`，新增 11 篇同等级专章与 4 个附属 schema。这批内容全部是**加法**（20 §2）。

### 第一批（v1.1.0-a：分发 / 管理 / 一致性）

| 文件 | 补什么 |
|---|---|
| [`10-distribution-index.md`](10-distribution-index.md) + [`10-index.schema.json`](10-index.schema.json) | `.axp` 签名块、`index.json`、`axp install` 十步、`id@range`、`session-install`、更新/回滚/吊销 → M6 由 ⬜ 变可实施 |
| [`11-plugin-management-agent.md`](11-plugin-management-agent.md) | `registry.json`、`agent-tools` 投影、`ctx`、插件 UI 入口 → 「Agent 自由选择插件」「点开有 UI」有契约 |
| [`12-host-conformance.md`](12-host-conformance.md) | C01–C26 可执行断言，Node / Java 双宿主同表 |

### 第二批（v1.1.0-b：术语 / 字段 / DSL / 上下文 / 域 / 安全 / 错误码 / 治理）

| 文件 | 补什么 |
|---|---|
| [`13-glossary-conventions.md`](13-glossary-conventions.md) | 规范性层级、术语表、`axp://` ABNF、五类版本号、三仓边界、一致性声明格式 |
| [`14-manifest-reference.md`](14-manifest-reference.md) | 21 个顶层字段逐项速查（与 02 schema 机读比对）、子结构、「未声明文件不执行」 |
| [`15-ui-dsl.md`](15-ui-dsl.md) + [`15-panel.schema.json`](15-panel.schema.json) | panel 两种合法形态、13 种节点、绑定表达式、宿主渲染义务 |
| [`16-host-context.md`](16-host-context.md) + [`16-registry.schema.json`](16-registry.schema.json) + [`16-install-intent.schema.json`](16-install-intent.schema.json) | `ctx` 正式契约、ES5 基线、宿主层三个 schema |
| [`17-domains-reference.md`](17-domains-reference.md) | 13 域适配器矩阵、`full/delta` 与 prime 不吞首帧、背压不丢末值 |
| [`18-security-model.md`](18-security-model.md) | 九步攻击面、T01–T13、生产/dev 矩阵、审计、落地前必验三条 |
| [`19-error-codes.md`](19-error-codes.md) | 唯一规范性错误码总表，与校验器双向核对 |
| [`20-compatibility-governance.md`](20-compatibility-governance.md) | v1.x 只做加法、宿主协商、等级判定矩阵、弃用三段、spec-change、迁移指南 |

### 第三批（v1.1.0-c：第三方 Android App 接入）

| 文件 | 补什么 |
|---|---|
| [`21-android-host-integration.md`](21-android-host-integration.md) + [`21-host-capabilities.schema.json`](21-host-capabilities.schema.json) | 五种接入姿态、五个挂钩点、I0–I3 接入档、`host.json` 能力声明、Android 平台映射表、进程/生命周期约束、I01–I10 接入断言 → **M7 的规范性入口** |
| [`docs/android-integration-cookbook.md`](../docs/android-integration-cookbook.md) | 已有 App 半天接成 I0 的可抄代码 |

21 章**不新增 `axp.json` 字段、不改 §0–§12**；新增结构（宿主能力态 `host.json`）与运行态 `registry.json`（16 §5）、插件态 `axp.json`（02）三者严格分离。

### 唯一 schema 变更

`02-manifest.schema.json` 的 `capabilities.runtimeServices` 增加**可选**枚举值 `storage`。
旧插件不使用该值时校验结果不变（`tools/spec-lint.mjs` 的 `v1.0-baseline` 断言保证）。
其余新结构都在**独立** schema 里，`MUST NOT` 并入 `axp.json` 校验。

### 路线图更新

M1 ✅ → M2 ✅ → M2.5 ✅ → M3 🟡（真机域适配器待补）→ M4 🟡（Shizuku 待接）→ M5 ✅ →
**M6 ✅**（格式 + CLI/Android 双实现）→ **M7 🟡**（示例仓 + 双宿主就位；接入契约已由 21 章给出，第三方宿主待引）。

`09-versioning.md` 兼容策略不变；治理细则见 20。

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
          "items": { "enum": ["sampling", "elicitation", "ui.push", "audit.read", "storage"] }
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

见 [`examples/02-ui-panel/ui/panel.json`](../test/fixtures/02-ui-panel/ui/panel.json)。

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

验收产物是一个 `.axp` 包 + 一份映射说明；仓库 `test/fixtures/` 中的综合示例可作为模板。

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

接入步骤见 [`docs/hot-reload-tutorial.md`](../docs/hot-reload-tutorial.md)；最小可运行配置见 [`examples/03-hot-reload`](../test/fixtures/03-hot-reload)。

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

## 10. `axp/spec/10-distribution-index.md`

# 10 · 分发、索引与安装（M6 落地规范）

> 状态：Stable · 适用 AXP v1.x · Android API 26+ · 最后更新 2026-11-20
> 本文件展开 [`01-format.md`](01-format.md) §9，把原先「由宿主实现、不属于格式」的分发链路**补成可互操作的最小契约**。
> `02-manifest.schema.json` 不变；索引使用独立 schema [`10-index.schema.json`](10-index.schema.json)。

## 0. 为什么必须补这一章

v1.0 只定义了 `distribution.channel` 三个枚举，却把「索引格式 / 安装流程 / 信任链」全部留给宿主。
结果是：两个宿主各自实现，插件无法跨宿主分发，`axp install` 只能是一条占位报错命令（旧版 `cli/bin/axp.mjs` 直接 `fail()`）。
本章给出**格式级**的最小公共部分，使得：插件作者发一次包 → 索引可被任何宿主读取 → CLI 与 Android 宿主执行同一套安装语义。

MUST / SHOULD / MAY 按 RFC 2119。

## 1. `.axp` 分发包

分发态 `MUST` 是 zip，包根 `MUST` 含 `axp.json`。除 `01-format.md` §2 的约束外：

| 条目 | 规则 |
|---|---|
| `META-INF/AXP-MANIFEST.DIGEST` | `MUST` 存在；`sha256` 值为**除本文件与签名块外**所有包内文件的规范化摘要（`路径\nsha256\n` 按路径排序拼接后再取 sha256） |
| `META-INF/AXP-SIG.json` | `MUST` 存在；字段 `publisher`（与 `axp.json` 的 `distribution.publisher` 一致）、`digest`、`signatureScheme:"apk-v3"`、`signature`、`certChain` |
| `signature` | 生产宿主 `MUST` 校验（APK Signature Scheme v3 语义）；开发/示例宿主可用 `dev` 策略只校验 `publisher` 与 `digest` |
| 路径 | `MUST NOT` 含 `..`、绝对路径、符号链接；解压前 `MUST` 逐条校验 |

**未签名网络包禁止执行**：`MUST NOT` 从任意 URL 拉取未带 `AXP-SIG.json` 的包并装载；`hotReload.sources` 含 `network-unsigned` 时校验器已拒绝（见 `08-hot-reload.md`）。

## 2. 索引 `index.json`

索引是**分发层**文件，不进插件包。任何宿主 `MUST` 能读取下列最小字段，完整 schema 见 `10-index.schema.json`。

```jsonc
{
  "axpIndex": "1.0",
  "publisher": "sha256:<64hex>",
  "updated": "2026-11-20T00:00:00Z",
  "plugins": [
    {
      "id": "com.example.memory",
      "version": "1.0.0",
      "name": { "zh": "记忆系统", "en": "Memory" },
      "description": "带界面的记忆与储存插件",
      "channel": "session-install",
      "publisher": "sha256:<64hex>",
      "sha256": "<64hex: 整个 .axp 文件的摘要>",
      "source": "plugins/05-memory-system/com.example.memory.axp",
      "signatureScheme": "apk-v3",
      "minHost": "0.1.0",
      "minAndroid": 26,
      "abis": [],
      "requires": [],
      "capabilities": { "privilege": "L1", "requests": ["fs.read:shared", "fs.write:shared"] },
      "ui": true,
      "tools": ["memory.add", "memory.list", "memory.search", "memory.clear"]
    }
  ]
}
```

规则：

1. `plugins[]` 的 `(id, version)` 对 `MUST` 唯一；同一 `id` 允许多个 `version` 共存（供兼容性选择），宿主 `SHOULD` 选满足 `minHost`/`minAndroid` 的最高版本。
2. `sha256` `MUST` 对应 `source` 指向文件的真实摘要；安装前 `MUST` 复算。
3. `publisher` `MUST` 与包内 `axp.json` 的 `distribution.publisher` 一致；不一致 → `INSTALL_PUBLISHER_MISMATCH`。
4. `capabilities` 是**索引期快照**，安装时 `MUST` 以包内清单为准重新校验，不得用索引字段替代。
5. `source` 允许相对路径、`https://` URL 或 `file://`；URL 方式 `MUST` 走 HTTPS 且 `MUST` 验签。

## 3. `axp install` 命令契约

CLI `MUST` 实现 `install`，语义如下（旧版占位实现作废）：

```
axp install <target> [--index <index.json>] [--home <dir>] [--dev]
<target> := <plugin-dir> | <file.axp> | <id>@<range>
```

步骤（任一步失败整包拒绝、不写注册表）：

1. **解析目标**：目录直接用；`.axp` 解到临时目录；`id@range` 先读索引并按 §4 的 range 规则选版本。
2. **解包防护**：逐条校验路径，拒绝 `..` / 绝对路径 / 链接；读 `AXP-MANIFEST.DIGEST` 并复算。
3. **校验**：调用本仓 `validator/src/validate.mjs`（与 CI 同一个校验器），失败返回原错误码。
4. **验签**：`--dev` 时校验 `publisher` 格式 + `digest` 一致；生产 `MUST` 校验 `signature` 与证书链。
5. **索引一致性**：若带 `--index`，复算 `sha256`、比对 `publisher`、比对 `version`。
6. **权限确认**：`capabilities.dangerous[]` 与 L2+ 请求 `MUST` 由宿主逐项确认（CLI 输出 `CONFIRM_REQUIRED` 清单）。
7. **依赖闭包**：`requires[]` 全部已安装且满足 `range`，无环；缺失 → `INSTALL_DEPENDENCY_MISSING`。
8. **写注册表**：解包到 `$AXP_HOME/plugins/<id>/`，写 `$AXP_HOME/registry.json`（格式见 `11-plugin-management-agent.md` §2）。
9. **宿主投递**：写 `$AXP_HOME/inbox/<id>.install-intent.json`（§5），供 Android 宿主 `session-install` 消费。
10. **输出**结构化结果：`{ ok, id, version, path, privilege, tools, ui }`。

新增错误码：`INSTALL_DIGEST_MISMATCH` · `INSTALL_PUBLISHER_MISMATCH` · `INSTALL_SIGNATURE_FAILED` · `INSTALL_DEPENDENCY_MISSING` · `INSTALL_ALREADY_PRESENT` · `INSTALL_UNSAFE_ENTRY` · `INSTALL_CHANNEL_UNSUPPORTED` · `INSTALL_MIN_HOST` · `INSTALL_MIN_ANDROID` · `INSTALL_CONFIRM_REQUIRED`。

配套命令 `MUST` 一并提供：`uninstall` / `list` / `enable` / `disable` / `publish` / `index` / `agent-tools` / `invoke` / `ui` / `conformance`。

## 4. 版本区间 `range`

与 `01-format.md` §8.3 一致：`>= / > / <= / < / = / ^ / ~` 与空格分隔的 AND 组合；`^1.2.3` = `>=1.2.3 <2.0.0`，`~1.2.3` = `>=1.2.3 <1.3.0`。
宿主 `MUST` 在装载前完成闭包解析并检测环；`MUST NOT` 因为索引里有更高版本就自动升级已启用插件。

## 5. `session-install` 宿主投递

`distribution.channel` 默认 `session-install`。CLI 不直接操作 Android 进程，而是投递**安装意图**：

```json
{
  "intent": "axp.session-install/1.0",
  "id": "com.example.memory",
  "version": "1.0.0",
  "source": "<绝对路径 .axp 或已解包目录>",
  "sha256": "<64hex>",
  "publisher": "sha256:<64hex>",
  "requestedPrivilege": "L1",
  "requests": ["fs.read:shared", "fs.write:shared"],
  "createdAt": "2026-11-20T00:00:00Z"
}
```

Android 宿主 `MUST`：① 通过 SAF（`ACTION_OPEN_DOCUMENT`）或 inbox 扫描接收；② 重新执行 §3 的 2–7 步（**不得信任 CLI 的结论**）；③ 弹权限确认页；④ 写入自己的注册表并展示在插件列表。
`trusted-channel` / `preinstall` 由宿主按同一流程处理，仅来源与确认 UI 不同。

## 6. 更新、回滚与吊销

- 更新 `MUST` 走一次完整 `install`，`MUST NOT` 直接覆盖实现体；新版本失败保留旧版本。
- 宿主 `SHOULD` 保留 `rollback.keep` 代（默认 2）；回滚 `MUST` 重新验签。
- 索引 `SHOULD` 提供 `revoked: [{ publisher, reason, since }]`；命中 `MUST` 拒绝装载并提示卸载。
- 热加载仍按 `08-hot-reload.md`：不得提权、不得新增组件 id、每次验签。

## 7. 一致性要求

| 等级 | 本文件要求 |
|---|---|
| AXP-0 | 支持 §3 步骤 1–4、6–8；能安装并调用无 UI 插件 |
| AXP-1 | + §5 投递 + 索引读取 |
| AXP-2 | + 插件管理页与插件 UI 入口（见 `11`） |
| AXP-3 | + 生产验签、吊销、更新回滚、§6 全部 |

`12-host-conformance.md` 把本文件每条 MUST 变成可执行断言。

---

<a id="file-11"></a>

## 11. `axp/spec/10-index.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://axp-spec.dev/schema/1.0/index.json",
  "title": "AXP Plugin Index v1.0",
  "type": "object",
  "required": ["axpIndex", "publisher", "updated", "plugins"],
  "additionalProperties": false,
  "properties": {
    "axpIndex": { "const": "1.0" },
    "publisher": { "type": "string", "pattern": "^sha256:[0-9a-fA-F]{64}$" },
    "updated": { "type": "string" },
    "revoked": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["publisher", "reason", "since"],
        "additionalProperties": false,
        "properties": {
          "publisher": { "type": "string" },
          "reason": { "type": "string" },
          "since": { "type": "string" }
        }
      }
    },
    "plugins": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "version", "name", "channel", "publisher", "sha256", "source", "minAndroid", "abis", "capabilities"],
        "additionalProperties": false,
        "properties": {
          "id": { "type": "string" },
          "version": { "type": "string" },
          "name": { "type": "object", "minProperties": 1, "additionalProperties": { "type": "string" } },
          "description": { "type": "string" },
          "channel": { "enum": ["session-install", "trusted-channel", "preinstall"] },
          "publisher": { "type": "string" },
          "sha256": { "type": "string", "pattern": "^[0-9a-fA-F]{64}$" },
          "source": { "type": "string" },
          "signatureScheme": { "enum": ["apk-v3"] },
          "minHost": { "type": "string" },
          "minAndroid": { "type": "integer", "minimum": 26 },
          "abis": { "type": "array", "items": { "type": "string" } },
          "requires": { "type": "array", "items": { "type": "object" } },
          "capabilities": {
            "type": "object",
            "required": ["privilege", "requests"],
            "additionalProperties": false,
            "properties": {
              "privilege": { "enum": ["L0","L1","L2","L3","L4","L5"] },
              "requests": { "type": "array", "items": { "type": "string" } }
            }
          },
          "ui": { "type": "boolean" },
          "tools": { "type": "array", "items": { "type": "string" } }
        }
      }
    }
  }
}
```

---

<a id="file-12"></a>

## 12. `axp/spec/11-plugin-management-agent.md`

# 11 · 插件管理、Agent 选择与宿主上下文

> 状态：Stable · 适用 AXP v1.x · 最后更新 2026-11-20
> 本文件把 v1.0 里被划为「宿主实现细节」、但**直接决定「Agent 能不能自由使用选择插件」「点开插件有没有 UI」**的部分补成契约。

## 1. 三个此前缺失的概念

| 概念 | v1.0 状态 | 本文件补齐 |
|---|---|---|
| 已装插件注册表 | 无 | §2 `registry.json` |
| Agent 可见工具集 | 只有 `tools[].cost` 注释 | §3 `agent-tools` 输出契约 |
| 插件自己的持久化与宿主上下文 | 只有 `fs.*` 权限词，无调用方式 | §4 `runtimeServices: storage` + `ctx` |

## 2. 注册表 `registry.json`

宿主 `MUST` 持久化一份注册表（CLI 在 `$AXP_HOME/registry.json`，Android 在 `filesDir/axp/registry.json`）：

```jsonc
{
  "axpRegistry": "1.0",
  "hostLevel": "AXP-2",
  "plugins": [
    {
      "id": "com.example.memory",
      "version": "1.0.0",
      "path": "plugins/com.example.memory",
      "publisher": "sha256:<64hex>",
      "sha256": "<64hex>",
      "enabled": true,
      "installedAt": "2026-11-20T00:00:00Z",
      "privilege": "L1",
      "requests": ["fs.read:shared", "fs.write:shared"],
      "ui": true,
      "tools": ["memory.add", "memory.list", "memory.search", "memory.clear"]
    }
  ]
}
```

`MUST` 支持的操作：`list` / `install` / `uninstall` / `enable` / `disable`。
插件管理页 `MUST` 展示：名称、版本、发布者指纹、权限层、是否有 UI、**点开入口**。
`enabled:false` 的插件 `MUST NOT` 出现在 Agent 工具集，`MUST NOT` 被装载执行。

## 3. Agent 可见工具集 `agent-tools`

宿主 `MUST` 能从**已启用插件**构造一份扁平工具清单（CLI `axp agent-tools --json`；Android `AgentBroker.visibleTools()`）：

```jsonc
{
  "tools": [
    {
      "name": "com.example.memory.memory.add",
      "plugin": "com.example.memory",
      "id": "memory.add",
      "description": "写入一条记忆",
      "input": { "type": "object", "properties": { "text": { "type": "string" } } },
      "cost": "fast",
      "sideEffects": "none",
      "confirm": false,
      "privilege": "L1",
      "available": true
    }
  ],
  "knowledge": [
    { "plugin": "...", "id": "...", "kind": "skill", "progressive": true, "allowedTools": ["..."] }
  ]
}
```

规则：

1. `name` = `<pluginId>.<toolId>`，`MUST` 全局唯一。两者都允许含 `.`，因此宿主 `MUST NOT` 用「反向拆分 name」做映射，而是按实际注册的 `(pluginId, toolId)` 对构建 name → 对 的唯一索引；碰撞时拒绝注册后者、写审计并标注 `available:false`（`NAME_COLLISION`）——保证任何被接受的 `name` 都能唯一映射回原插件与工具。
2. `available:false` 的工具（gradient 无可用实现 / 权限未授予）`SHOULD` 仍列出但标注原因，避免 Agent 反复试错。
3. `cost` 与 `description` 是选择依据；`sideEffects:"device"|"destructive"` 或 `confirm:true` 的工具 `MUST` 在调用前经用户确认。
4. **选择策略由宿主决定**（规则匹配 / 模型 function-calling / 用户手动），格式只约束「可见什么、能调什么、调到哪一级」——这与 `01-format.md` §0.1「不是运行时」不冲突：这里定义的是**清单投影**，不是调度引擎。
5. `knowledge[].progressive:true` 时宿主 `MUST` 三级渐进披露；`allowedTools` 在知识激活期 `MUST` 作为白名单生效。
6. 每次选择/调用/拒绝 `MUST` 写审计日志（`audit.read` 可读）。

## 4. 宿主上下文 `ctx` 与 `storage` 反向通道

`capabilities.runtimeServices` 增加可选值 **`storage`**（`02-manifest.schema.json` 已同步）。
宿主执行 `impl.js` / `ui.lifecycle` 时 `MUST` 注入第二参数 `ctx`：

| 字段 | 语义 | 权限约束 |
|---|---|---|
| `ctx.storage.get(key)` / `put(key,value)` / `list()` / `remove(key)` | 插件私有 KV，命名空间按 `id` 隔离 | `MUST` 声明 `fs.read:<scope>` / `fs.write:<scope>`；未声明 → `STORAGE_DENIED` |
| `ctx.surface.publish(uri, delta)` / `read(uri)` | 发布/读取 `axp://x/<id>/…` 自定义域 | `MUST` 指向本包已声明 `surfaces[].uri` |
| `ctx.audit.log(event)` | 追加结构化审计 | 无需额外声明 |
| `ctx.agent.request(prompt)` | `sampling` 反向通道 | `MUST` 声明 `runtimeServices:["sampling"]` |
| `ctx.elicit(schema)` | `elicitation` 反向通道 | `MUST` 声明 `["elicitation"]` |
| `ctx.ui.push(node, value)` | 主动更新界面 | `MUST` 声明 `["ui.push"]` 且存在 `ui{}` |

`ctx` 的调用约定由宿主运行时定义、格式不规定方法签名（`01-format.md` §5.7 原则不变）；
但 `MUST` 提供上表能力，否则「带储存的记忆系统」「能写文件的插件」无法只靠 `axp.json` 实现。
工具函数签名 `run(args, ctx)`；只声明 `run(args)` 的旧插件 `MUST` 仍能装载（向后兼容）。

**存储隔离**：`MUST NOT` 允许插件读另一个 `id` 的命名空间；`MUST NOT` 允许未声明 `fs.write` 的插件落盘。

## 5. 插件 UI 入口（「点开插件」）

宿主 `MUST`：在插件管理页为每个 `ui.panel` 插件提供可点击入口 → 打开插件界面页。
界面页 `MUST`：解析 `ui.panel.entry`（`06-ui-vocab.md` 节点集）→ 建立 `ui.bind` 订阅 → 把 `ui.actions` 绑定到本包 `tools[].id` → 按时机调用 `lifecycle.onLoad/onReload/onUnload`。
`watchable` Surface 产生 delta 时 `MUST` 自动刷新绑定节点，用户不用手写刷新逻辑。
无 `ui{}` 的纯功能插件 `MUST` 仍可在列表中查看信息、被 Agent 调用、被启用/停用。

## 6. 一致性要求

| 等级 | 本文件要求 |
|---|---|
| AXP-0 | §2 注册表 + §3 工具集 + §4 `ctx`（基础字段） |
| AXP-1 | + §3 渐进披露 / `available` 标注 |
| AXP-2 | + §5 插件 UI 入口与绑定 |
| AXP-3 | + 全部审计、`allowedTools` 白名单、存储隔离强制校验 |

---

<a id="file-13"></a>

## 13. `axp/spec/12-host-conformance.md`

# 12 · 宿主一致性测试套件（可执行）

> 状态：Stable · 适用 AXP v1.x · 最后更新 2026-11-20
> 目的：把 `host-checklist.md` 从「人工勾选表」变成**任何一个宿主都能跑的自动化断言**。
> 参考实现：本仓 `tools/conformance.mjs`（Node/CLI 宿主）与 `axp-android-host/conformance/`（Java/Android 宿主 core）。

## 1. 输出格式

`axp conformance --json` `MUST` 输出：

```jsonc
{ "suite":"axp-conformance/1.0", "hostLevel":"AXP-2",
  "passed": 24, "failed": 0,
  "cases": [ { "id":"C07", "level":"AXP-0", "ok":true, "ms":3, "detail":"..." } ] }
```

退出码：`0` = 全部通过；`1` = 有失败；`2` = 环境不满足（仍输出报告）。
宿主 `SHOULD` 在 README 声明通过哪一级；`MUST NOT` 把未实现项标成通过。

## 2. 用例表

### AXP-0（装载 + 工具）
| ID | 断言 |
|---|---|
| C01 | 合法最小清单装载成功，9 步流水线顺序记录 |
| C02 | 未知顶层字段 → `SCHEMA_ADDITIONAL_PROPERTY`，整包拒绝 |
| C03 | 路径穿越 / 未声明可执行文件 → `UNSAFE_PATH` / `UNDECLARED_EXECUTABLE` |
| C04 | `destructive` 工具缺 `confirm:true` → `TOOL_CONFIRM_REQUIRED` |
| C05 | 调用 `demo.echo` 返回预期结构；审计日志有记录 |
| C06 | `device` 工具未确认 → `CONFIRM_REQUIRED`；确认后成功 |
| C07 | `install` 一个目录插件后注册表可查；重复安装 → `INSTALL_ALREADY_PRESENT` |
| C08 | `enable/disable` 后工具集随之增减 |

### AXP-1（数据面 + 知识 + 分发）
| ID | 断言 |
|---|---|
| C09 | `watchable` Surface 发布 delta → 订阅者收到 |
| C10 | `ui.bind.from` 指向不可订阅 Surface → `SURFACE_NOT_WATCHABLE` |
| C11 | `knowledge.progressive` 三级披露、`allowedTools` 白名单生效 |
| C12 | 索引 `sha256` 不匹配 → `INSTALL_DIGEST_MISMATCH` |
| C13 | `id@^1.0.0` 选到最高兼容版本；`requires` 缺失 → `INSTALL_DEPENDENCY_MISSING` |
| C14 | `session-install` 意图文件字段完整且宿主重新校验（不信任 CLI 结论） |

### AXP-2（全组件 + UI）
| ID | 断言 |
|---|---|
| C15 | `ui.actions[].tool` 指向幽灵工具 → `UI_ACTION_TOOL_MISSING` |
| C16 | `ui.bind[].to` 节点不存在 → `UI_BIND_TARGET_MISSING` |
| C17 | 插件 UI 页渲染 `panel.json` 节点，`bind` 随 delta 自动刷新 |
| C18 | 点击 UI 动作 → 到达本包工具并继承 `confirm` 策略 |
| C19 | `agent-tools` 输出全局唯一 `name`，含 `cost/sideEffects/available` |
| C20 | `storage` 反向通道按 `id` 隔离；未声明 `fs.write` → `STORAGE_DENIED` |

### AXP-3（梯度 + 热加载 + 信任链）
| ID | 断言 |
|---|---|
| C21 | `gradient` 选当前最高可用层；L3 不可用时降级 L2 |
| C22 | `gradient` 键高于 `capabilities.privilege` → `GRADIENT_EXCEEDS_PRIVILEGE` |
| C23 | 热加载每次验签；提权 / 换发布者 / 新增组件 id 全被拒绝 |
| C24 | 热替换保留 `state.preserve`，失败自动回滚且回滚也验签 |
| C25 | `allowDynamicCode:false` 不误杀合法热加载 |
| C26 | 吊销列表命中 → 拒绝装载 |

## 3. 与既有自检的关系

| 套件 | 覆盖 |
|---|---|
| `validator/test/run-tests.mjs`（31） | 校验器行为，本文件 C02–C04/C10/C15/C16/C22 复用其错误码 |
| `validator/test/schema-crosscheck.py`（47） | 双引擎 schema 一致性 |
| `runtime/test/smoke.mjs`（30） | 参考运行时语义，C09/C17/C18/C21/C23–C25 复用 |
| **`tools/conformance.mjs`（本文件新增）** | **端到端分发/安装/注册表/Agent/UI/存储**，前三者不管的部分 |
| `axp-android-host/conformance` | 同一用例表在 **Java core** 上再跑一遍，证明 Android 宿主逻辑与规范一致 |

四套全绿是发布的最低门槛；宿主 `SHOULD` 在 CI 里同时跑 `node tools/conformance.mjs` 与 Java core 的 `ConformanceMain`。

## 4. 判定

- 某等级全部用例通过 → 可声明该等级；
- 某用例因**明确未实现**失败 → `SHOULD` 标 `skipped` 并说明，不得标 `ok`；
- 本仓 Node 参考宿主声明 **AXP-3**；Android 宿主 `axp-android-host` 声明 **AXP-2**（热加载/真验签见其 README 的未实现项）。


## 5. v1.1 新增：静态一致性断言（`tools/spec-lint.mjs`）

C01–C26 验证**运行时行为**，I01–I10（21 §11）验证**第三方 App 接入**，`spec-lint` 验证**规范文本自身**是否自洽。三者都全绿才算发布就绪。

| 断言 | 内容 |
|---|---|
| S01 | `spec/01..21` 编号连续、全部存在；5 个附属 schema 可被 `JSON.parse` |
| S02 | `02-manifest.schema.json` 的 21 个顶层 `properties` 与 `14-manifest-reference.md` 表格字段集合**完全一致** |
| S03 | 全部 `panel.json`（规范仓 fixtures + 示例仓）通过 `15-panel.schema.json`，且 `children[]` 引用的 id 都存在 |
| S04 | 现场生成的 `registry.json` / `install-intent.json` / `index.json` 分别通过 16 / 16 / 10 的 schema |
| S05 | `validator/src/validate.mjs` 实际抛出的每个 code 都出现在 `19-error-codes.md`，且表内无重复 |
| S06 | `tools/*.js` 符合 ES5 基线（无 `??` / `?.` / `=>` / 模板字符串 / `const` / `let`） |
| S07 | v1.0 基线回归：4 个原始夹具用当前校验器仍全部 `ok:true` |
| S08 | `spec/` 内所有 Markdown 相对链接有效 |
| S09 | `host.json` 通过 `21-host-capabilities.schema.json`；`hostLevel` 与 `conformance.notImplemented` 自洽；`uiForms` 含 `panel` 时 `panelForms` 非空（对应 21 章 I01） |

输出 `axp-spec-lint/1.0` JSON，失败退出码 1。CI 与 `scripts/site-check.mjs` 都会调用它。

---

<a id="file-14"></a>

## 14. `axp/spec/13-glossary-conventions.md`

# 13 · 术语、规范性约定与命名空间

> 状态：Stable · 适用 AXP v1.x · 最后更新 2026-11-20
> 本文件是**全规范的阅读入口**：定义关键词、术语、优先级、URI 语法与五类版本号。
> 不引入任何新字段，不改变 `02-manifest.schema.json`。

## 1. 规范性层级与冲突处理

当两份文件对同一件事说法不一致时，按以下顺序取信（前者优先）：

1. `01-format.md` —— **唯一规范性正文**（§0–§12）；
2. `02-manifest.schema.json` —— §3 的机器可读形式（draft 2020-12）；
3. `03`–`12` 专章 —— 对主规范条款的展开，不得与 01 冲突；
4. `13`–`20` 专章 —— 术语、字段参考、DSL、宿主上下文、域、安全、错误码、治理；
5. `docs/` 教程、`examples/`（独立仓）、`test/fixtures/` —— **说明性材料，不具规范效力**；
6. 参考实现（Node `runtime/`、Java `core/`、Android App） —— 语义示例，最终以规范文本为准。

`10-index.schema.json` / `15-panel.schema.json` / `16-*.schema.json` 是各自结构的机器可读形式，
它们是**分发层/界面层/宿主层**的 schema，`MUST NOT` 被合并进 `axp.json` 的校验。

关键词按 RFC 2119：`MUST` / `MUST NOT`（强制，违反即不合规）、`SHOULD` / `SHOULD NOT`（推荐，偏离须在合规声明里写明理由）、`MAY`（可选）。
本仓所有 `MUST` 都在 `12-host-conformance.md` 与 `tools/spec-lint.mjs` 中有对应断言；没有断言的条款不得写 `MUST`。

## 2. 术语表

| 术语 | 定义 | 首次出现 |
|---|---|---|
| **AXP 包** / `.axp` | 一个插件的全部文件。**目录态**用于开发，**zip 态**用于分发；包根 `axp.json` 是唯一事实源 | 01 §2 |
| **清单** / manifest | 包根 `axp.json`。`additionalProperties:false`，未在清单声明的文件一律不执行 | 01 §3 |
| **组件** | `tools[] / surfaces[] / knowledge[] / agents[] / events[] / ui{}` 六类，全部可选、数组可空 | 01 §5 |
| **实现体** / impl | 统一实现引用，七形态 `js/kotlin/native/wasm/bin/url/proc`；宿主按固定顺序择一 | 03 |
| **宿主** / host | 装载并执行 `.axp` 包的 Android 应用（或用于语义验证的 Node/Java 参考运行时） | 01 §0.1 |
| **装载** / load | 九步流水线：解析→签名→引用完整性→abis→依赖闭包→权限校验→注册组件→UI 挂载→热加载就绪。**任一步失败整包拒绝、不部分注册** | 01 §7 |
| **注册** / register | 把已装载插件写入 `registry.json`，使其组件对 Agent 可见 | 11 §2 |
| **投影** / projection | 把已启用插件的 `tools[]/knowledge[]` 摊平成 `name=<pluginId>.<toolId>` 的扁平清单，供模型做选择 | 11 §3 |
| **Surface** | 可读取/订阅的数据实体，用 `axp://` URI 寻址；`watchable:true` 时产生 `full` 快照与 `delta` 增量 | 01 §5.2 / 17 |
| **标准域** | `axp://` 下 13 个预定义命名空间（`fs/screen/app/...`）；自定义域固定前缀 `axp://x/<id>/` | 05 / 17 |
| **权限层** / L0–L5 | 沙箱→标准权限→AccessibilityService→Shizuku→Root→系统签名；`gradient` 按层自动降级 | 04 |
| **宿主上下文** / ctx | 宿主执行实现体时注入的第二参数，提供 `storage/surface/audit/ui/agent/elicit` 反向通道 | 11 §4 / 16 |
| **热加载代** / generation | 一次组件级替换产生的版本代；`rollback.keep` 决定保留几代 | 08 |
| **发布者指纹** | `distribution.publisher = sha256:<64hex>`，与签名证书绑定；换指纹即换身份 | 01 §9 / 10 |
| **会话安装** / session-install | 默认分发渠道：CLI/宿主投递安装意图，Android 宿主重新校验后写入自己的注册表 | 10 §5 |
| **一致性等级** | AXP-0 → AXP-1 → AXP-2 → AXP-3，逐级叠加能力，见 20 §4 | 01 §11 / 20 |
| **夹具** / fixture | `axp-spec/axp/test/fixtures/` 下的**内部测试资产**；对外示例全部住在 `axp-examples/` | 本文件 §5 |

## 3. 命名空间与 URI 语法

```
axp-uri      = "axp://" ( std-domain | custom-domain ) [ "/" tail ]
std-domain   = "fs" | "screen" | "app" | "notification" | "intent" | "sensor"
             | "clipboard" | "telephony" | "logcat" | "pm" | "media" | "net" | "sysprop"
custom-domain= "x/" plugin-id "/" tail
plugin-id    = reverse-domain-id  ; 与 axp.json 的 id 同一正则
tail         = 1*( unreserved / "/" / ":" / "." / "-" / "*" )
```

- 标准域的完整 URI 模板、views、anchor 见 `17-domains-reference.md`；
- 自定义域 `MUST` 以 `axp://x/<自身 id>/` 开头，宿主 `MUST` 拒绝插件声明别的 `id` 的自定义域；
- `MUST NOT` 使用 `axp://mcp/` / `axp://skill/` 等外部格式名作为域前缀（同级独立，`07-expression-map.md` 只作验收材料）。

## 4. 五类版本号（不要混用）

| 名称 | 位置 | 例 | 含义 |
|---|---|---|---|
| **格式版本** | `axp.json` 的 `axp` | `"1.0"` | 清单语法代；v1.x 内 `MUST` 保持 `"1.0"` |
| **规范文档版本** | 各 spec 头部 / `09-versioning.md` | `1.0.0` → `1.1.0` | 规范文本的发布版本，**不改变格式版本** |
| **插件版本** | `axp.json` 的 `version` | `1.2.3` | semver，`requires[].range` 与之比较 |
| **宿主版本** | `minHost` / 宿主 `hostVersion` | `0.1.0` | 宿主能力协商（20 §3） |
| **索引版本** | `index.json` 的 `axpIndex` | `"1.0"` | 分发索引结构版本，与格式版本独立 |

`v1.1.0` 规范新增 13–20 专章、新增 `storage` 可选值与 3 个附属 schema，
**属于加法**：v1.0 合法清单在 v1.1 校验结果不变（由 `tools/spec-lint.mjs` 的「v1.0 基线回归」断言保证）。

## 5. 三仓边界（本文件效力说明）

| 仓库 | 规范地位 |
|---|---|
| `axp-spec/` | 规范、Schema、校验器、CLI、参考运行时、一致性套件、`test/fixtures/` |
| `axp-examples/` | 说明性示例，**不具规范效力** |
| `axp-android-host/` | 参考实现，**不具规范效力**；其 `conformance/` 用同一张 C01–C26 表证明实现与文本一致 |

`test/fixtures/` 与 `axp-examples/` 内容可以相同，但**性质不同**：前者是 CI 断言的输入，删掉会让套件红；后者是对外教学材料，可自由增删。
这正是「示例模块放在示例仓库」的规范依据。

## 6. 一致性声明格式

宿主 `MUST` 在 README 用下列结构声明等级，不得只写「支持 AXP」：

```jsonc
{
  "axpConformance": "1.0",
  "hostLevel": "AXP-2",
  "hostVersion": "1.0.0",
  "suite": "axp-conformance/1.0",
  "cases": { "passed": 26, "failed": 0 },
  "notImplemented": ["hotReload", "apk-v3-strict", "shizuku-l3"]
}
```

未实现的 `MUST` 项 `MUST` 出现在 `notImplemented`，`MUST NOT` 标成通过（`12-host-conformance.md` §4）。

---

<a id="file-15"></a>

## 15. `axp/spec/14-manifest-reference.md`

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

---

<a id="file-16"></a>

## 16. `axp/spec/15-panel.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://axp-spec.dev/schema/1.0/panel.json",
  "title": "AXP UI Panel DSL v1.1",
  "description": "Accepts both legacy flat-id form (axpUi/root/children) and v1.1 nested form (type/title/nodes).",
  "type": "object",
  "required": ["nodes"],
  "anyOf": [
    {
      "title": "form-A-legacy",
      "required": ["axpUi", "root"],
      "properties": {
        "axpUi": { "const": "1.0" },
        "root": { "type": "string", "minLength": 1 },
        "theme": { "type": "string" },
        "state": { "type": "object" }
      }
    },
    {
      "title": "form-B-nested",
      "required": ["type"],
      "properties": {
        "type": { "enum": ["Scaffold", "Column", "Row", "Card"] },
        "title": { "type": "string" },
        "padding": { "type": "integer" }
      }
    }
  ],
  "properties": {
    "nodes": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/node" } }
  },
  "$defs": {
    "node": {
      "type": "object",
      "required": ["id", "type"],
      "additionalProperties": false,
      "properties": {
        "id": { "type": "string", "pattern": "^[A-Za-z_][A-Za-z0-9_]*$" },
        "type": { "enum": ["Scaffold", "Column", "Row", "Card", "Text", "Input", "Button", "List", "Image", "Divider", "Spacer", "Select", "Progress"] },
        "props": { "type": "object" },
        "children": { "type": "array" },
        "nodes": { "type": "array" }
      }
    }
  }
}
```

---

<a id="file-17"></a>

## 17. `axp/spec/15-ui-dsl.md`

# 15 · 插件 UI DSL 与 `panel.json`

> 状态：Stable · 适用 AXP v1.x · 最后更新 2026-11-20
> 机器可读形式：[`15-panel.schema.json`](15-panel.schema.json)。
> 本文件把 `06-ui-vocab.md` 的词汇与 `01-format.md` §5.6 的 `ui{}` 落到**宿主真的能渲染**的节点模型。

## 1. 两种合法形态（v1.0 兼容）

v1.0 的官方示例使用 **扁平 id 引用**形态；v1.1 的示例仓 `05-memory-system` 使用 **嵌套**形态。
两者都合规，`15-panel.schema.json` 用 `anyOf` 同时接受，宿主 `MUST` 都支持。

**形态 A（legacy / 扁平）**：

```jsonc
{
  "axpUi": "1.0", "root": "main", "theme": "host",
  "state": { "scroll": 0, "selected": null },
  "nodes": [
    { "id": "main", "type": "Scaffold", "props": { "title": "屏幕面板" },
      "children": ["title", "tree", "row"] },
    { "id": "title", "type": "Text", "props": { "text": "当前界面节点", "style": "title" } },
    { "id": "tree", "type": "Text",
      "props": { "text": "${surface:axp://x/com.example.panel/vision/screen.text}" } },
    { "id": "row", "type": "Row", "props": { "spacing": 8 },
      "children": ["tapBtn", "refreshBtn"] },
    { "id": "tapBtn", "type": "Button", "props": { "label": "点击", "action": "ui.panel.tap" } },
    { "id": "refreshBtn", "type": "Button", "props": { "label": "刷新", "action": "ui.panel.refresh" } }
  ]
}
```

`children[]` 是**节点 id 的字符串数组**，按 id 在 `nodes[]` 中查找；`root` 指向渲染入口。
`state` 是面板初始状态（`state.preserve` 热加载迁移时保留）。

**形态 B（v1.1 / 嵌套）**：

```jsonc
{
  "type": "Scaffold", "title": "记忆与储存",
  "nodes": [
    { "id": "title", "type": "Text", "props": { "text": "我的记忆", "style": "title" } },
    { "id": "input", "type": "Input", "props": { "label": "输入内容", "value": "${state:draft}" } },
    { "id": "add", "type": "Button", "props": { "label": "记住", "action": "ui.panel.add" } },
    { "id": "list", "type": "List",
      "props": { "items": "${surface:axp://x/com.example.memory/entries}", "divider": true } },
    { "id": "count", "type": "Text", "props": { "text": "条目数：${state:count}" } }
  ]
}
```

嵌套形态允许节点自带 `nodes[]` 或 `children[]`，`type`/`title` 即根节点。

## 2. 节点类型词汇表（13 种）

| type | 用途 | 关键 `props` | 可含子节点 |
|---|---|---|---|
| `Scaffold` | 页面根 | `title` / `padding` | ✅ |
| `Column` | 纵向容器 | `spacing` / `padding` | ✅ |
| `Row` | 横向容器 | `spacing` | ✅ |
| `Card` | 卡片容器 | `elevation` / `title` | ✅ |
| `Text` | 文本 | `text` / `style`(`title|mono|body`) / `maxLines` / `color` | ❌ |
| `Input` | 输入框 | `label` / `value` / `hint` / `multiline` | ❌ |
| `Button` | 按钮 | `label` / `action`（指向 `ui.actions[].id`） / `enabled` | ❌ |
| `List` | 列表 | `items` / `divider` / `emptyText` | ❌ |
| `Image` | 图片 | `src` / `contentScale` | ❌ |
| `Divider` | 分隔线 | `thickness` | ❌ |
| `Spacer` | 留白 | `size` | ❌ |
| `Select` | 选择 | `options` / `value` | ❌ |
| `Progress` | 进度 | `value` / `indeterminate` | ❌ |

每个节点 `MUST` 有唯一 `id`（`^[A-Za-z_][A-Za-z0-9_]*$`）与 `type`；
`children[]`/`nodes[]` 中引用的 id `MUST` 存在于同一 panel（由 `tools/spec-lint.mjs` 断言）。
未知 `type` 的宿主行为：`SHOULD` 渲染为占位文本而非崩溃（Android `PluginActivity` 即如此）。

## 3. 绑定表达式

`props` 里的字符串值 `MAY` 含插值：

| 表达式 | 含义 | 刷新时机 |
|---|---|---|
| `${state:<key>}` | 取面板 `state.<key>` | `ctx.ui.push(node, value)` 或 `state` 变化 |
| `${surface:<axp-uri>}` | 取该 Surface 最近一次 `full`/`delta` 的值 | Surface 产生 delta 时**自动** |

`ui.bind[]` 是**声明式**绑定，优先级高于插值：

```
ui.bind[].from = axp://...        (MUST watchable:true)
ui.bind[].to   = ui.panel.<nodeId> (MUST 存在于 panel.json)
```

宿主 `MUST`：① 建立 Surface 订阅；② 收到 delta 时把值写入 `<nodeId>` 的 `props.text`（Text）或 `props.items`（List）；③ 重绘该节点。
`axp-android-host` 的 `AxpHost.SurfaceListener → PluginActivity.render()` 与 `axp ui <plugin>` 返回的 `bindings` 快照都实现了这条。

## 4. `ui.actions` 与 `lifecycle`

`actions[]` = `{ id, tool }`。`Button.props.action` → `id` → `tool` → 本包 `tools[].id`。
调用 `MUST` 继承工具的 `confirm` / `sideEffects` 策略（C18）；`tool` 不存在 → `UI_ACTION_TOOL_MISSING`。

`lifecycle` 三个回调都是**包内 JS 文件**，签名：

```js
export function onLoad(state, ctx) { /* 返回新 state */ }
export function onReload(oldState, newState, ctx) { /* 返回迁移后的 state */ }
export function onUnload(state, ctx) { /* 清理 */ }
```

宿主 `MUST` 在插件界面打开 / 热替换完成 / 界面关闭时分别调用；
只写 `run(args)` 的旧插件 `MUST` 仍能装载（16 §3 向后兼容）。

## 5. 宿主渲染义务（AXP-2）

| 义务 | 断言 |
|---|---|
| 插件管理页为 `ui.panel` 插件提供可点击入口 | `11 §5` / C17 |
| 解析两种 panel 形态、渲染 13 种节点 | `15-panel.schema.json` + spec-lint |
| 建立 `ui.bind` 订阅并自动刷新 | C09 / C17 |
| `ui.actions` 回填工具并继承 confirm | C18 / C06 |
| 执行三个 lifecycle 回调 | `08` / C23 |
| 无 `ui{}` 插件仍可在列表查看、被 Agent 调用、启停 | 14 §1 / C08 |

`ui.widget / ui.web / ui.activity / ui.inject` 的入口文件同样受「未声明文件不执行」约束（14 §4），
但它们的渲染细节由宿主决定，本文件只约束 `ui.panel`。

## 6. Schema

`15-panel.schema.json` 用 `anyOf` 接受形态 A/B，`$defs.node` 定义节点，
`MUST NOT` 被并入 `axp.json` 校验。CI 通过 `tools/spec-lint.mjs` 对全部 `panel.json` 做真实校验与 id 引用检查。

---

<a id="file-18"></a>

## 18. `axp/spec/16-host-context.md`

# 16 · 宿主上下文 `ctx`、反向通道与宿主层 Schema

> 状态：Stable · 适用 AXP v1.x · 最后更新 2026-11-20
> 把 `11-plugin-management-agent.md` §4 从「约定」提升为**正式契约**，并给出 `registry.json` / `install-intent.json` / `index.json` 的机器可读形式。
> 配套：[`16-registry.schema.json`](16-registry.schema.json) · [`16-install-intent.schema.json`](16-install-intent.schema.json) · [`10-index.schema.json`](10-index.schema.json)。

## 1. 为什么必须有这一层

`axp.json` 只**声明**能力（`fs.write:shared`、`runtimeServices`），不规定插件怎么拿到文件句柄、怎么发布 Surface、怎么让界面刷新。
v1.0 把这些全留给宿主，导致「带储存的记忆系统」「能写文件的 PDF 插件」无法只靠清单实现。
本章定义宿主执行实现体时 `MUST` 注入的第二参数 `ctx` —— 这是**格式与运行时之间唯一需要固定的缝隙**，不触碰「AXP 不是运行时」（01 §0.1）的边界。

## 2. `runtimeServices` 与 `ctx` 能力矩阵

| `runtimeServices` 值 | 启用 `ctx` 能力 | 额外权限要求 | 未声明时 |
|---|---|---|---|
| `storage` | `ctx.storage.*` | `fs.read:<scope>`（读）/ `fs.write:<scope>`（写） | `STORAGE_DENIED` |
| `sampling` | `ctx.agent.request(prompt)` | 无 | `CONTEXT_DENIED` |
| `elicitation` | `ctx.elicit(schema)` | 无 | `CONTEXT_DENIED` |
| `ui.push` | `ctx.ui.push(node, value)` | 存在 `ui{}` | `CONTEXT_DENIED` |
| `audit.read` | 读审计（宿主侧） | 无 | — |
| （默认） | `ctx.surface.*` / `ctx.audit.log` / `ctx.confirm` | Surface 须已声明 | `SURFACE_UNDECLARED` |

`storage` 是 **v1.1 新增可选值**（02 schema 纯加法）。未使用它的 v1.0 插件校验结果不变。

## 3. `ctx` 方法契约

宿主 `MUST` 提供下表；方法签名为**逻辑契约**，具体绑定方式（Java 接口 / JS 对象 / WebView `JavascriptInterface`）由宿主决定。

| 方法 | 入参 | 返回 | 语义 |
|---|---|---|---|
| `storage.get(key)` | string | any\|null | 读本包命名空间；未声明 `fs.read` → `STORAGE_DENIED` |
| `storage.put(key, value)` | string, any | boolean | 写本包命名空间；未声明 `fs.write` → `STORAGE_DENIED` |
| `storage.list()` | — | `[key, value][]` | 枚举本包全部键 |
| `storage.remove(key)` | string | boolean | 删除 |
| `surface.publish(uri, delta)` | `axp://`, any | boolean | `uri` `MUST` 在 `surfaces[].uri` 中；触发 `ui.bind` 刷新 |
| `surface.read(uri)` | `axp://` | any\|null | 读最近一次值 |
| `audit.log(event)` | object | void | 追加结构化审计；插件 `MUST NOT` 能删除/改写已有条目 |
| `ui.push(node, value)` | string, any | boolean | 主动更新 `ui.panel.<node>` |
| `agent.request(prompt)` | string | object | `sampling` 反向通道，宿主可转模型 |
| `elicit(schema)` | object | object | `elicitation` 反向通道 |
| `confirm` | boolean（属性） | — | 本次调用是否已由用户确认 |

**存储隔离（MUST）**：命名空间按 `axp.json` 的 `id` 划分；`MUST NOT` 允许插件读/写另一个 `id` 的空间；
`MUST NOT` 允许未声明 `fs.write` 的插件落盘。C20 用「声明 `storage` 但不给 `fs.write`」验证返回 `STORAGE_DENIED`。

## 4. 实现体执行契约

- 工具 JS `MUST` 导出 `run(args, ctx)`；只写 `run(args)` 的 v1.0 插件 `MUST` 仍能装载（向后兼容，C05）。
- 宿主执行前 `MUST` 剥离文件顶部的 `export ` 前缀（Node `vm` / JVM Nashorn / Android WebView 三种执行器已一致）。
- **语法基线 `SHOULD` 为 ES5**（`var` / `function`，不用 `??`、`?.`、箭头函数、模板字符串）——真机 WebView 与 Nashorn 兼容性由 C06 保证；
  `tools/spec-lint.mjs` 会对全部 `.js` 做静态扫描并报错。
- 返回值 `MUST` 是可 JSON 序列化的对象；抛出的异常 `MUST` 被宿主捕获并转成结构化错误（19），`MUST NOT` 让宿主崩溃。
- 宿主 `MUST` 设执行超时（`axp.json` 的 `runtime.cpuPct` 可作参考），超时 → `IMPL_TIMEOUT`。

## 5. `registry.json`（宿主注册表）

结构见 `16-registry.schema.json`。`MUST` 支持 `list / install / uninstall / enable / disable` 五个操作。
`enabled:false` 的插件 `MUST NOT` 进入 `agent-tools` 投影，`MUST NOT` 被装载执行（C08）。
插件管理页 `MUST` 展示：名称、版本、发布者指纹、权限层、是否有 UI、点开入口（11 §2）。

CLI 写在 `$AXP_HOME/registry.json`，Android 写在 `filesDir/axp/registry.json`，**同构**（三仓互认）。

## 6. `install-intent.json`（session-install 意图）

结构见 `16-install-intent.schema.json`。CLI 投递，Android 宿主消费并**重新执行** 10 §3 的第 2–7 步，
`MUST NOT` 信任 CLI 的结论（C14）。`createdAt` `MUST` 为 ISO-8601 UTC 字符串。

## 7. `index.json`（分发索引）

结构见 `10-index.schema.json`。`plugins[].capabilities` 是**索引期快照**，安装时 `MUST` 以包内清单重新校验，
`MUST NOT` 用索引字段替代（10 §2 规则 4）。`revoked[]` 命中 → `INSTALL_REVOKED`（C26）。

## 8. 一致性

| 等级 | 本章要求 |
|---|---|
| AXP-0 | §3 基础 `ctx`、§4 执行契约、§5 注册表 |
| AXP-1 | + §6 意图、§7 索引 |
| AXP-2 | + `ui.push`、存储隔离强制校验、插件 UI 入口 |
| AXP-3 | + 全部反向通道与审计不可篡改 |

`tools/spec-lint.mjs` 会现场生成一份 registry / intent / index 并用上述三个 schema 真实校验。

---

<a id="file-19"></a>

## 19. `axp/spec/16-install-intent.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://axp-spec.dev/schema/1.0/install-intent.json",
  "title": "AXP session-install Intent v1.0",
  "type": "object",
  "required": ["intent", "id", "version", "source", "sha256", "publisher", "requestedPrivilege", "requests", "createdAt"],
  "additionalProperties": false,
  "properties": {
    "intent": { "const": "axp.session-install/1.0" },
    "id": { "type": "string" },
    "version": { "type": "string" },
    "source": { "type": "string" },
    "sha256": { "type": "string" },
    "publisher": { "type": "string" },
    "requestedPrivilege": { "enum": ["L0","L1","L2","L3","L4","L5"] },
    "requests": { "type": "array", "items": { "type": "string" } },
    "createdAt": { "type": "string" }
  }
}
```

---

<a id="file-20"></a>

## 20. `axp/spec/16-registry.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://axp-spec.dev/schema/1.0/registry.json",
  "title": "AXP Host Plugin Registry v1.0",
  "type": "object",
  "required": ["axpRegistry", "hostLevel", "plugins"],
  "additionalProperties": false,
  "properties": {
    "axpRegistry": { "const": "1.0" },
    "hostLevel": { "enum": ["AXP-0", "AXP-1", "AXP-2", "AXP-3"] },
    "hostVersion": { "type": "string" },
    "plugins": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "version", "path", "publisher", "sha256", "enabled", "privilege", "requests", "ui", "tools"],
        "additionalProperties": false,
        "properties": {
          "id": { "type": "string" },
          "version": { "type": "string" },
          "path": { "type": "string" },
          "publisher": { "type": "string" },
          "sha256": { "type": "string" },
          "enabled": { "type": "boolean" },
          "installedAt": { "type": "string" },
          "privilege": { "enum": ["L0","L1","L2","L3","L4","L5"] },
          "requests": { "type": "array", "items": { "type": "string" } },
          "ui": { "type": "boolean" },
          "tools": { "type": "array", "items": { "type": "string" } }
        }
      }
    }
  }
}
```

---

<a id="file-21"></a>

## 21. `axp/spec/17-domains-reference.md`

# 17 · 感知域完整参考与宿主适配器契约

> 状态：Stable · 适用 AXP v1.x · 最后更新 2026-11-20
> 本文件展开 [`05-domains.md`](05-domains.md) §1，把 13 个标准域从「一张表」补成**宿主实现适配器时可逐项对照的契约**。
> URI 语法、自定义域规则、watchable 语义仍以 05 为准；本文件不新增字段。

## 1. 标准域适配器矩阵

`最低权限` = 宿主提供该域时 `MUST` 校验的 `auth` 下限；插件 `surfaces[].auth` `MUST` ≤ `capabilities.privilege`（04 §1、05 §4）。

| 域 | URI 模式 | views（最小集） | anchor | watchable | 最低权限 | Android 适配器落点 |
|---|---|---|---|---|---|---|
| `fs` | `axp://fs/<path>` | `text tree tokens diagnostics` | `line offset range` | ✅ | L1 | `Context.getExternalFilesDir` / SAF `DocumentFile`；`fs.read/write:<scope>` |
| `screen` | `axp://screen` | `tree text image` | `node` | ✅ | L2 | `AccessibilityService.getRootInActiveWindow()`；未接服务时返回空树 |
| `app` | `axp://app/<package>` | `meta tree` | `uri` | ✅ | L1 | `PackageManager` + `UsageStatsManager`（前台状态） |
| `notification` | `axp://notification/stream` | `text tree` | `uri` | ✅ | L1 | `NotificationListenerService`；可作 `events[].on` 源 |
| `intent` | `axp://intent/<action>` | `meta` | `uri` | ✅ | L1 | `Intent` 收发；`AndroidPlatform.dispatch()` 已把 `ACTION_VIEW` 变成真实打开 |
| `sensor` | `axp://sensor/<type>` | `value` | `uri` | ✅ | L1 | `SensorManager`；`sensor.gps/motion/biometric/light` |
| `clipboard` | `axp://clipboard` | `text image` | `uri` | ✅ | L1 | `ClipboardManager`；`clipboard.read/write` |
| `telephony` | `axp://telephony/<kind>` | `meta text` | `uri` | ✅ | L1 | `TelephonyManager` / SMS ContentObserver；`telephony.sms.read` |
| `logcat` | `axp://logcat` | `text` | `line` | ✅ | L3 | `logcat -v threadtime`（Shizuku/shell）；`logcat.read` |
| `pm` | `axp://pm/<package>` | `meta tree` | `uri` | ❌ | L3 | `PackageManager` 隐藏 API；`pm.list/pm.install` |
| `media` | `axp://media/<id>` | `image audio` | `uri` | ✅ | L1 | `MediaStore` / `ImageReader`；`media.capture` |
| `net` | `axp://net/<iface>` | `value text` | `uri` | ✅ | L1 | `ConnectivityManager`；`net.stat` |
| `sysprop` | `axp://sysprop/<key>` | `value` | `uri` | ❌ | L3 | `SystemProperties`（Shizuku）；`sysprop.read` |

**适配器义务**：宿主 `MUST` 内置 13 个域的**注册与寻址**；`MUST` 对未实现的域返回结构化 `DOMAIN_UNAVAILABLE`，`MUST NOT` 静默返回空数据让插件误判。
`axp-android-host` 如实声明：`intent` 已真实可用、`screen` 走 `AccessibilityBridge` 接口（未接服务时返回空树）、其余适配器待补（见其 README）。

## 2. URI 模板与展开

```
axp://<domain>/<path>[?<query>][#<anchor>]
```

- URI 模板用 `{}` 占位符声明一类资源（如 `axp://fs/{path}`、`axp://app/{package}`）；订阅时宿主 `MUST` 展开成具体 URI。
- `?query` 为键值过滤，例 `?app=com.bank.*`；`*` 只在**查询值**里允许，`MUST NOT` 出现在 `network.egress:<host>` 或域名里（`CAP_WILDCARD_EGRESS`）。
- `#anchor` 配合 `surfaces[].anchor` 定位 `node / line / offset / range / uri`。
- 自定义域 `MUST` 为 `axp://x/<自身 id>/<name>`；抢占他人 `id` → `DOMAIN_NAMESPACE_VIOLATION`。

## 3. 流语义：`full` / `delta` / 背压

`watchable:true` 的 Surface 订阅生命周期：

```
subscribe → prime(): 1 次 full 快照（不占推送窗口） → delta* → unsubscribe
```

- **v1.0.3 修复项**：`prime()` 的初始 `full` 快照 `MUST NOT` 占用推送窗口，否则装载后第一个真实 delta 会被误吞（`runtime/` smoke 的 C09/背压断言覆盖）。
- `delta` `MUST` 是相对上一次值的增量或完整新值（由域决定），宿主 `MUST` 同时维护「最近值」供 `ctx.surface.read()` 与 `ui.bind` 使用。
- 背压：宿主可声明最大推送频率，超频 `SHOULD` 合并 delta 并置 `throttled:true`，`MUST NOT` 丢弃最后一个值（否则界面停在旧状态）。
- `ui.bind[].from` 与 `events[].on` 指向的 Surface `MUST watchable:true` → `SURFACE_NOT_WATCHABLE`。

## 4. 组件联动（规范链路）

```
surfaces[]  声明「有什么数据」   ← 05 / 本文件定义寻址与适配器
events[]    订阅「数据变了做啥」 ← on: axp://... + filter
ui.bind[]   把数据接到界面节点   ← from → to: ui.panel.<nodeId>（15）
tools[]     对数据执行动作       ← ui.actions / agent-tools 调用（11 / 16）
ctx.surface.publish(uri, delta)  ← 插件主动产生增量（16 §3）
```

四者用**同一个 URI** 串起来，不需要插件自己写订阅/刷新代码 —— 这是「点开插件显示记忆和储存，列表自动刷新」的规范路径。

## 5. 域相关错误码

| code | 触发 | 宿主动作 |
|---|---|---|
| `SURFACE_NOT_WATCHABLE` | bind/event 指向 `watchable:false` | 拒绝装载（校验期） |
| `SURFACE_UNDECLARED` | `ctx.surface.publish` 的 uri 不在 `surfaces[]` | 运行时拒绝，不落盘 |
| `DOMAIN_UNAVAILABLE` | 宿主未实现该域适配器 | 结构化返回，不静默 |
| `DOMAIN_NAMESPACE_VIOLATION` | 自定义域前缀不是自身 `id` | 拒绝装载 |
| `CAP_UNKNOWN_REQUEST` / `CAP_WILDCARD_EGRESS` | 权限词拼错 / 网络通配 | 拒绝装载 |

完整表见 `19-error-codes.md`。

## 6. 一致性

| 等级 | 本文件要求 |
|---|---|
| AXP-1 | 13 域注册与寻址、`full/delta`、prime 不吞首帧、`ctx.surface.read` |
| AXP-2 | + `ui.bind` 自动刷新、背压不丢末值 |
| AXP-3 | + 全部真机适配器（或逐项声明 `DOMAIN_UNAVAILABLE`）、审计 |

---

<a id="file-22"></a>

## 22. `axp/spec/18-security-model.md`

# 18 · 安全模型与信任链

> 状态：Stable · 适用 AXP v1.x · 最后更新 2026-11-20
> 本文件把散落在 01/04/08/10/11/16 的安全条款收成**一张威胁模型**，并逐条映射到可执行断言。
> 「规范草案」推进到「可落地」时，这三条路径 `MUST` 优先验证：**签名 / 权限梯度 / 热加载回滚**。

## 1. 信任边界

```
[插件作者] --签名--> [.axp 分发包] --HTTPS/SAF--> [索引/安装意图] --十步安装--> [宿主注册表]
                                                                              |
                                          [用户确认] <-- 权限/危险动作 <-- [Agent 选择] <-- 工具投影
                                                                              |
                                                                    [沙箱 ctx] --> [本包 storage/surface]
```

- **不信任**：任何来自网络、文件系统、CLI、索引的清单字段；宿主 `MUST` 重新校验。
- **信任**：宿主自己的签名验证结果、用户对权限的显式确认、注册表内容。
- **不防**：宿主 App 自身被替换、设备已被 root 且用户主动授权 L4、物理接触攻击者。规范不在这些边界内提供保证。

## 2. 九步装载的攻击面与缓解（01 §7）

| 步 | 攻击面 | `MUST` 缓解 | 断言 |
|---|---|---|---|
| 1 解析 | 畸形 JSON / 超大文件 | 严格解析 + 大小上限；失败整包拒绝 | C02 |
| 2 签名 | 无签名 / 换证书 | `AXP-SIG.json` digest 复算、publisher 绑定、生产验 v3 证书链 | C12 / C14 |
| 3 引用完整性 | 路径穿越 / 未声明可执行文件 | 拒绝 `..`、绝对路径、链接；扫描 `.js/.dex/.so/.wasm/.html` | C03 / C23 |
| 4 abis | 塞入不兼容 native | 有 `.so/.dex` 而 `abis:[]` → 拒绝 | C03 |
| 5 依赖闭包 | 缺依赖 / 环 | `requires[].range` 全满足、无环 | C13 |
| 6 权限校验 | 越权请求 / 通配域名 | 封闭词汇表、`dangerous ⊆ requests`、gradient/agents 不越上限 | C04 / C22 |
| 7 注册组件 | 幽灵工具 / 幽灵节点 | `ui.actions[].tool`、`ui.bind[].to` 逐个校验 | C15 / C16 |
| 8 UI 挂载 | UI 动作绕过 confirm | 动作继承工具 `confirm`/`sideEffects` | C18 / C06 |
| 9 热加载就绪 | 提权 / 新增组件 / 未签名网络源 | 每次验签、不得提权、不得新增 id、禁 `network-unsigned` | C23 / C24 |

**任一步失败 → 整包拒绝、不部分注册**（`MUST NOT` 留下「装了一半」的插件）。

## 3. 威胁清单 T01–T13

| ID | 威胁 | 缓解条款 | 验证 |
|---|---|---|---|
| T01 | zip 路径穿越写宿主目录 | 10 §1 逐条校验路径；`INSTALL_UNSAFE_ENTRY` | C03 |
| T02 | 包内藏未声明的 `.js`/`.dex` 被执行 | 14 §4「未声明文件一律不执行」 | C03 |
| T03 | 任意 URL 拉未签名包即执行 | 10 §1「未签名网络包禁止执行」+ `HOT_UNSIGNED_SOURCE` | C23 |
| T04 | 签名摘要被替换 | `AXP-MANIFEST.DIGEST` 规范化复算 | C12 |
| T05 | 冒用他人 publisher | `distribution.publisher` 与 `AXP-SIG.json` 双向绑定 | C14 |
| T06 | 证书吊销后仍可装 | `index.revoked[]` → `INSTALL_REVOKED` | C26 |
| T07 | `gradient` 请求高于 `privilege` 的层 | `GRADIENT_EXCEEDS_PRIVILEGE` | C22 |
| T08 | 热加载时提权到 L5 | `HOT_PRIVILEGE_ESCALATION` | C23 |
| T09 | 热加载偷偷新增工具 id | `HOT_NEW_COMPONENT` | C23 |
| T10 | 插件读别的插件数据 | 16 §3 按 `id` 命名空间隔离 | C20 |
| T11 | 未声明 `fs.write` 却落盘 | `STORAGE_DENIED` | C20 |
| T12 | `destructive` 动作绕过用户确认 | `confirm:true` 强制 + UI 动作继承 | C04 / C06 / C18 |
| T13 | 插件篡改/删除审计 | 16 §3 只追加；宿主侧文件权限隔离 | `audit.read` |

## 4. 生产 vs 开发策略矩阵

| 项 | `dev`（示例/CI） | 生产宿主 |
|---|---|---|
| `AXP-SIG.json` 缺失 | 允许（只校验 publisher 格式 + digest） | **拒绝** `INSTALL_SIGNATURE_FAILED` |
| `signature` 字段 | 可为 `dev:<prefix>` | `MUST` 校验 APK Signature Scheme v3 真证书链 |
| `certChain` | 可空 | `MUST` 校验证书链与吊销 |
| 索引 `sha256` | 复算比对 | 复算比对 + TLS + 签名索引 |
| `network-unsigned` | 校验器已拒 | 校验器已拒 |
| 权限 L2+ / `dangerous` | 输出确认清单 | `MUST` 逐项弹窗确认，未确认不注册 |

`axp-android-host` 的 `SignaturePolicy.dev()` 已实现左侧；`strict()` 需接 `apksig`，README 如实列为未实现，**不虚标 AXP-3**。

## 5. 审计要求

宿主 `MUST` 记录：装载九步、每次工具选择/调用/拒绝、`confirm` 决策、`gradient` 选层及理由、热加载每次验签与回滚、安装/卸载/启停、存储拒绝。
格式：`{ at, plugin, kind, ... }` 的 append-only JSONL（CLI 写 `audit.jsonl`，Android 写 `filesDir/axp/audit.jsonl`）。
插件 `MAY` 通过 `ctx.audit.log()` 追加，`MUST NOT` 删除/改写（T13）。

## 6. 落地前必验的三条

1. **签名**：用真实 `apksigner sign --v3` 签一个包，生产宿主 `strict()` 能装；换一个字节必须拒（C12）。
2. **权限梯度**：L3 不可用时自动降 L2，L5 gradient 必须被拒（C21 / C22）。
3. **热加载回滚**：替换失败保留旧代，回滚同样验签，`state.preserve` 不丢（C23 / C24）。

`12-host-conformance.md` 的 C01–C26 与 `tools/spec-lint.mjs` 的静态断言是这三条的自动化底稿。

---

<a id="file-23"></a>

## 23. `axp/spec/19-error-codes.md`

# 19 · 错误码总表（规范性）

> 状态：Stable · 适用 AXP v1.x · 最后更新 2026-11-20
> 本文件是**唯一规范性错误码表**；`axp/validator/README.md` 是其实现说明。
> `tools/spec-lint.mjs` 会双向校验：校验器里实际抛出的 code `MUST` 都出现在本表，本表 code `MUST NOT` 重复。

## 0. 错误响应结构

```jsonc
{ "ok": false, "error": "<CODE>", "detail": "<human readable>", "path": "axp.json#/tools/0", "steps": ["resolve", "validate"] }
```

- 校验器返回 `{ ok, errors:[{code,msg,path}], warnings:[...], info:[...], summary }`；
- 安装/调用/UI 返回 `{ ok, error, detail }`；
- 一致性套件返回 `{ suite, hostLevel, passed, failed, cases:[{id,level,ok,detail}] }`；
- 退出码：`0` 通过 · `1` 业务失败 · `2` 用法/环境错误。

**原则**：`MUST NOT` 用「静默降级」代替错误码；`MUST NOT` 把多个不同原因合并成一个模糊码。

## 1. Schema / 清单解析（校验期）

| code | 触发 | 宿主动作 | 定义 |
|---|---|---|---|
| `SCHEMA_FALSE` | schema 为 `false` 却给了值 | 拒绝字段 | 02 |
| `SCHEMA_TYPE` | 类型不符 | 拒绝字段 | 02 |
| `SCHEMA_ENUM` | 不在枚举内 | 拒绝字段 | 02 |
| `SCHEMA_CONST` | 不等于常量（如 `axp:"1.0"`） | 拒绝字段 | 02 |
| `SCHEMA_REQUIRED` | 缺必填字段 | 拒绝整包 | 02 / 14 |
| `SCHEMA_ADDITIONAL_PROPERTY` | 未知顶层/子字段 | **整包拒绝**（严格模式） | 01 §3 / 14 |
| `SCHEMA_MINLENGTH` | 字符串过短 | 拒绝字段 | 02 |
| `SCHEMA_MINIMUM` | 数值低于下限（如 `minAndroid<26`） | 拒绝字段 | 02 |
| `SCHEMA_MAXIMUM` | 数值高于上限 | 拒绝字段 | 02 |
| `SCHEMA_MINPROPERTIES` | 对象属性过少（如 `name:{}`） | 拒绝字段 | 02 |
| `SCHEMA_MINITEMS` | 数组过短 | 拒绝字段 | 02 |
| `SCHEMA_CONTAINS` | 无匹配元素 | 拒绝字段 | 02 |
| `SCHEMA_ANYOF` | `anyOf` 无分支命中 | 拒绝字段 | 02 |
| `SCHEMA_NOT` | `not` 被意外满足 | 拒绝字段 | 02 |
| `SCHEMA_PATH` | schema 内部路径解析失败 | 拒绝字段 | 02 |
| `MANIFEST_MISSING` | 目录或 `axp.json` 不存在 | 拒绝整包 | 14 |
| `MANIFEST_PARSE` | JSON 解析失败 | 拒绝整包 | 14 |
| `ID_INVALID` | `id` 非反向域名 | 拒绝整包 | 14 |
| `VERSION_INVALID` | `version` 非 semver | 拒绝整包 | 09 / 14 |
| `PUBLISHER_INVALID` | `publisher` 非 `sha256:<64hex>` | 拒绝整包 | 10 |
| `DUP_ID` | 组件 id 重复 | 拒绝整包 | 14 |

## 2. 引用 / 实现体 / 平台

| code | 触发 | 宿主动作 | 定义 |
|---|---|---|---|
| `UNSAFE_PATH` | 引用含 `..` / 绝对路径 / `http` | 整包拒绝 | 14 §4 |
| `IMPL_FILE_MISSING` | 被引用的文件不存在 | 整包拒绝 | 14 §4 |
| `UNDECLARED_EXECUTABLE` | 包内有未被引用的可执行文件 | 整包拒绝 | 14 §4 |
| `ABI_MISSING` | 有 `.so/.dex` 但 `abis:[]` | 整包拒绝 | 03 / 14 |
| `WARN_ABI_EMPTY` | `abis:[]` 且无二进制（**warning**） | 仅提示 | 03 |
| `IMPL_UNAVAILABLE` | 七形态全不可用 | 工具调用返回不可用，**宿不崩** | 03 / 16 |
| `IMPL_NO_RUN` | JS 未导出 `run` | 调用失败 | 16 §4 |
| `IMPL_ERROR` | 实现体抛异常 | 捕获并结构化返回 | 16 §4 |
| `IMPL_TIMEOUT` | 执行超时 | 终止沙箱 | 16 §4 |

## 3. 权限 / 能力

| code | 触发 | 宿主动作 | 定义 |
|---|---|---|---|
| `CAP_UNKNOWN_REQUEST` | 权限词不在封闭词汇表 | 拒绝整包 | 04 §2 |
| `CAP_WILDCARD_EGRESS` | `network.egress:*` 通配 | 拒绝整包 | 04 §2 |
| `DANGEROUS_NOT_REQUESTED` | `dangerous` 项未同时出现在 `requests` | 拒绝整包 | 14 §2.7 |
| `NET_EGRESS_UNDECLARED` | `impl.url` 主机缺 `network.egress:<host>` | 拒绝整包 | 03 |
| `GRADIENT_EXCEEDS_PRIVILEGE` | gradient 键高于 `privilege` | 拒绝整包 | 04 / 14 |
| `AGENT_EXCEEDS_PRIVILEGE` | agent privilege 高于清单上限 | 拒绝整包 | 14 §2.4 |
| `TOOL_CONFIRM_REQUIRED` | `destructive` 工具缺 `confirm:true` | 拒绝整包 | 14 §2.1 |

## 4. Surface / UI

| code | 触发 | 宿主动作 | 定义 |
|---|---|---|---|
| `SURFACE_NOT_WATCHABLE` | bind/event 指向 `watchable:false` | 拒绝整包 | 05 / 17 |
| `SURFACE_UNDECLARED` | `ctx.surface.publish` 的 uri 未声明 | 运行时拒绝 | 16 §3 |
| `UI_ACTION_TOOL_MISSING` | `ui.actions[].tool` 指向幽灵工具 | 拒绝整包 | 15 §4 |
| `UI_BIND_TARGET_MISSING` | `ui.bind[].to` 节点不存在 / panel 解析失败 | 拒绝整包 | 15 §3 |
| `DOMAIN_UNAVAILABLE` | 宿主未实现该域适配器 | 结构化返回，不静默 | 17 |
| `DOMAIN_NAMESPACE_VIOLATION` | 自定义域前缀不是自身 `id` | 拒绝整包 | 05 §4 / 17 |
| `NO_UI` | 对无 `ui{}` 插件请求界面 | 返回提示 | 11 §5 |

## 5. 热加载

| code | 触发 | 宿主动作 | 定义 |
|---|---|---|---|
| `HOT_SIGNATURE_POLICY` | 启用但未 `signature:on-every-load` | 拒绝整包 | 08 |
| `HOT_UNSIGNED_SOURCE` | `sources` 含 `network-unsigned` | 拒绝整包 | 08 |
| `HOT_CLASSLOADER` | 未 `classloader:isolated` | 拒绝整包 | 08 |
| `HOT_NO_TARGETS` | `targets:[]` | 拒绝整包 | 08 |
| `HOT_UI_LIFECYCLE` | targets 含 `ui.*` 但缺 `onReload/onUnload` | 拒绝整包 | 08 / 15 |
| `HOT_PRIVILEGE_ESCALATION` | 热替换提高权限层 | 拒绝替换，保留旧代 | 08 / 18 |
| `HOT_SIGNATURE_FAILED` | 热替换换 publisher / 验签失败 | 拒绝替换 | 08 / 10 |
| `HOT_NEW_COMPONENT` | 热替换新增组件 id | 拒绝替换 | 08 |

## 6. 分发 / 安装（10）

| code | 触发 | 宿主动作 | 定义 |
|---|---|---|---|
| `INSTALL_SOURCE_MISSING` | 目标目录/`.axp`/索引项不存在 | 不写注册表 | 10 §3 |
| `INSTALL_UNSAFE_ENTRY` | zip 条目含 `..` / 绝对路径 / 链接 | 解包中止 | 10 §1 |
| `INSTALL_UNPACK_FAILED` | zip 损坏 | 解包中止 | 10 §3 |
| `INSTALL_DIGEST_MISMATCH` | `AXP-MANIFEST.DIGEST` 或索引 `sha256` 复算不符 | 整包拒绝 | 10 §1/§3 |
| `INSTALL_PUBLISHER_MISMATCH` | 签名块/索引 publisher 与清单不一致 | 整包拒绝 | 10 §3 |
| `INSTALL_SIGNATURE_FAILED` | 缺签名块（生产）/ scheme 不符 / 证书链失败 | 整包拒绝 | 10 §1 |
| `INSTALL_REVOKED` | 命中 `index.revoked[]` | 整包拒绝 | 10 §6 |
| `INSTALL_DEPENDENCY_MISSING` | `requires` 缺失/不满足/成环 | 整包拒绝 | 10 §4 |
| `INSTALL_ALREADY_PRESENT` | 同 id 已安装（无 `--force`） | 保留原版本 | 10 §3 |
| `INSTALL_NOT_FOUND` | 卸载/启停时 id 不存在 | 无操作 | 11 §2 |
| `INSTALL_MIN_HOST` | 宿主版本低于 `minHost` | 整包拒绝 | 20 §3 |
| `INSTALL_MIN_ANDROID` | 设备 API 低于 `minAndroid` | 整包拒绝 | 14 |
| `INSTALL_ABI_UNSUPPORTED` | 非空 `abis` 与 `host.json.supportedAbis` 无交集 | 整包拒绝 | 20 §3 / 21 §5 |
| `INSTALL_HOST_LEVEL` | 插件声明等级高于 `host.json.hostLevel` | 整包拒绝 | 20 §4 / 21 §5 |
| `INSTALL_CONFIRM_REQUIRED` | L2+/`dangerous` 未逐项确认 | 不写注册表 | 10 §3 步 6 |
| `INSTALL_CHANNEL_UNSUPPORTED` | 宿主不支持 `distribution.channel` | 整包拒绝 | 10 |
| `PACK_FAILED` | 打包/写签名块失败 | 不产出 `.axp` | 10 |
| `CERT_MISSING` | strict 模式缺证书 | 整包拒绝 | `runtime/` |

## 7. 运行时 / 调用 / 上下文（11 / 16）

| code | 触发 | 宿主动作 | 定义 |
|---|---|---|---|
| `CONFIRM_REQUIRED` | `destructive`/`device` 工具未确认 | 不执行，请求确认 | 11 §3 / 18 |
| `TOOL_NOT_FOUND` | 插件或工具 id 不存在 | 结构化返回 | 11 §3 |
| `PLUGIN_DISABLED` | 调用 `enabled:false` 的插件 | 结构化返回 | 11 §2 |
| `STORAGE_DENIED` | 未声明 `fs.read/write` 却用 `ctx.storage` | 拒绝，不落盘 | 16 §3 |
| `CONTEXT_DENIED` | 未声明 `runtimeServices` 却用 `sampling/elicitation/ui.push` | 拒绝 | 16 §2 |
| `HOST_DECLARATION_INVALID` | 宿主 `host.json` 缺失 / 不符合 `21-host-capabilities.schema.json` | 拒绝协商并报宿主配置错误 | 21 §5 |
| `HOST_CAPABILITY_MISMATCH` | 插件要求的 `impl`/`uiForm`/`channel`/`ctx` 宿主未声明 | 标 `available:false` 或整包拒绝（按档） | 21 §5 |
| `HOST_LEVEL_UNDECLARED` | 宿主未声明 `hostLevel` 却宣称通过套件 | 一致性声明无效 | 13 §6 / 21 §5 |
| `IMPL_ON_MAIN_THREAD` | 宿主在 Android 主线程执行 `impl` | 开发期断言失败；生产应改异步 | 21 §7 |
> `SURFACE_UNDECLARED` 见 §4（同码同义，不重复定义）。

## 8. 与一致性套件的对应

- §1–§5 主要由 C01–C04、C10、C15、C16、C22、C23、C25 覆盖（校验器行为，31 条用例 + 47 项双引擎复核）；
- §6 由 C07、C12、C13、C14、C26 覆盖（分发/安装/吊销）；
- §7 由 C05、C06、C08、C18、C20 覆盖（调用/确认/存储隔离）；
- 本表 code 集合由 `tools/spec-lint.mjs` 与 `validator/src/validate.mjs` 做双向静态核对。

---

<a id="file-24"></a>

## 24. `axp/spec/20-compatibility-governance.md`

# 20 · 兼容性、版本互操作与规范治理

> 状态：Stable · 适用 AXP v1.x · 最后更新 2026-11-20
> 与 `09-versioning.md` 互补：09 管**格式版本**，本文件管**宿主协商、等级判定、变更流程与迁移**。

## 1. 五类版本号（复述 13 §4，给出互操作规则）

| 版本 | 谁读 | 不匹配时 |
|---|---|---|
| `axp:"1.0"`（格式） | 校验器 / 宿主 | `MUST` 拒绝非 `1.0`（v1.x 内不改） |
| 规范文档版本 `1.1.0` | 人类 / CI | 仅影响文档，`MUST NOT` 改变清单校验结果 |
| 插件 `version` | `requires[].range` / 索引 | 选满足 range 的最高版本 |
| `minHost` / `hostVersion` | 宿主 | 宿主低于 `minHost` → `INSTALL_MIN_HOST` |
| `axpIndex:"1.0"` | 索引读取方 | 不认识 → `INDEX_VERSION_UNSUPPORTED` |

## 2. v1.x 变更规则（**只做加法**）

允许（无需提升格式版本）：
- 新增**可选**顶层字段？ ❌ **不允许** —— `additionalProperties:false` 会让旧宿主拒新包；新增顶层字段 `MUST` 走格式版本升级。
- 新增**可选子字段 / 枚举值**（如 `runtimeServices += storage`）✅；
- 新增**独立** schema 文件（10/15/16）✅；
- 新增专章、教程、错误码、一致性用例 ✅；
- 收紧**校验器**对已有字段的检查（把原本宽容的变成明确拒绝）✅，但 `MUST` 在 CHANGELOG 标注「行为变更」。

禁止：
- 改已有字段的语义、类型、必填性；
- 删除已有枚举值；
- 让 v1.0 合法清单在 v1.1 变得不合法。

**回归断言**：`tools/spec-lint.mjs` 的 `v1.0-baseline` 检查会拿 v1.0 的 4 个原始夹具跑当前校验器，要求全部仍 `ok:true`；若变红即违反本条。

## 3. 宿主能力协商

宿主 `MUST` 在 `registry.json` 声明 `hostLevel`（`AXP-0..3`）与可选 `hostVersion`，并 `MUST` 随 App 发布能力态 `host.json`（21 §5）——本节协商的输入即来自该文件。
安装时按下列顺序判定（任一不满足 → 整包拒绝，不写注册表）：

1. `minAndroid <= Build.VERSION.SDK_INT` → 否则 `INSTALL_MIN_ANDROID`；
2. `abis` 与设备 ABI 有交集，或为空（纯 JS）→ 否则 `INSTALL_ABI_UNSUPPORTED`；
3. `minHost <= hostVersion`（按 semver）→ 否则 `INSTALL_MIN_HOST`；
4. 插件声明的等级（由组件推断，§4）`<= hostLevel` → 否则按**可降级协商**处理：超等级功能能安全停用的（gradient 无可用层 → `available:false`；`hotReload` 超出 → 按不可用处理并告知 Agent）`MUST` 接受整包并写审计 `INSTALL_HOST_LEVEL_NEGOTIATED`；仅无法降级的组件才 `INSTALL_HOST_LEVEL` 整包拒绝。`minAndroid` / `abis` / `minHost` 不参与降级（不满足即拒）；`hostLevel` 按本条协商；
5. `requires[]` 闭包全部已启用且满足 range → 否则 `INSTALL_DEPENDENCY_MISSING`。

宿主 `MUST NOT` 用「索引里的 capabilities 快照」替代包内清单做以上判定（10 §2 规则 4）。

## 4. AXP-0 … AXP-3 正式判定矩阵

| 能力 | AXP-0 | AXP-1 | AXP-2 | AXP-3 |
|---|:---:|:---:|:---:|:---:|
| 九步装载 + `tools[]` 调用 | ✅ | ✅ | ✅ | ✅ |
| 注册表 / `agent-tools` 投影 / `ctx` 基础 | ✅ | ✅ | ✅ | ✅ |
| `surfaces[]` / `knowledge[]` / `ui.bind` 订阅 | — | ✅ | ✅ | ✅ |
| `index.json` / `session-install` 意图 | — | ✅ | ✅ | ✅ |
| 渐进披露 / `allowedTools` 白名单 / `available` 标注 | — | ✅ | ✅ | ✅ |
| `agents[]` / `events[]` / 插件 UI 页（点开） | — | — | ✅ | ✅ |
| `ui.actions` 继承 confirm / `ctx.ui.push` / 存储隔离 | — | — | ✅ | ✅ |
| L0–L5 `gradient` 全语义 | — | — | — | ✅ |
| `hotReload{}` 全语义（每次验签/状态迁移/回滚） | — | — | — | ✅ |
| 生产 APK v3 验签 / 吊销 / 更新回滚 | — | — | — | ✅ |
| 13 域真机适配器（或逐项声明 `DOMAIN_UNAVAILABLE`） | — | — | — | ✅ |

判定：某等级**全部**用例（12 §2 中该等级及以下的 C 项）通过 → 可声明；
未实现项 `MUST` 列入一致性声明的 `notImplemented`（13 §6），`MUST NOT` 标成通过。

本套交付：
- Node 参考运行时 `axp-spec/axp/runtime/` → **AXP-3**（26/26）；
- CLI 宿主 `axp-spec/axp/cli/` → **AXP-3**（26/26，无 UI 渲染但返回 `ui()` 快照）；
- Android 宿主 `axp-android-host/` → **AXP-2**（26/26 core；热加载/真验签/Shizuku 列入 `notImplemented`）。

## 5. 字段弃用三段流程

1. **Deprecated（v1.x）**：在 `14-manifest-reference.md` 标注 `⚠️`，校验器发 `WARN_*`，语义不变；
2. **Frozen（下一个 v1.x）**：不再推荐新插件使用，文档给迁移写法，仍可校验；
3. **Removed（仅格式版本 +1）**：从 schema 移除，同时提供 `axp migrate` 命令与迁移指南。

`MUST NOT` 在 v1.x 内直接删除字段。

## 6. spec-change 提案流程

模板见 `axp-spec/axp/.github/ISSUE_TEMPLATE/spec-change.md`。每个提案 `MUST` 含：

- 动机的**反例**（哪个现有合法/非法场景处理不了）；
- 影响的字段与 schema diff；
- 对 v1.0 基线的回归结论（spec-lint 结果）；
- 新增/修改的 C 编号（一致性用例）；
- 实现影响（Node CLI / Java core / Android App 三处是否都要改）；
- 向后兼容判定（按 §2 的允许/禁止清单）。

合并前 `MUST`：31 / 47 / 30 / 26 四套 + `spec-lint` 全绿、0 断链、CHANGELOG 有条目。

## 7. CHANGELOG / tag / Release

- 格式版本不变时打 **规范文档版本** tag，如 `spec-v1.1.0`；
- Release 产物：`axp-spec-<version>.zip`（`axp/spec/` 全量）、`AXP-v1.1-规范全文合订.md`、一致性报告 JSON；
- CHANGELOG 分组：`Added / Changed / Deprecated / Fixed / Security`，`Security` 必须引用 `18-security-model.md` 的 T 编号。

## 8. v1.0 → v1.1 迁移指南（本轮）

| 你是… | 要做什么 |
|---|---|
| **插件作者（v1.0 包）** | **无需改动**，清单校验结果不变；想用 `ctx.storage` 才加 `runtimeServices:["storage"]` + `fs.read/write:<scope>` |
| **工具链维护者** | 升级 CLI 到含 `install/publish/index/agent-tools/conformance` 的版本；schema 多一个可选枚举值 |
| **宿主开发者** | 实现 `10`（十步安装）、`11`（注册表/投影/UI 入口）、`16`（`ctx`），跑 `12` 的 C01–C26 声明等级 |
| **站点维护者** | 文档站改从示例仓拉快照，别再写死 `exampleCount===4` |

`v1.1.0` 的全部新增都是**加法 + 独立 schema + 专章**，没有改动 `01-format.md` §0–§12 与 8 个必填字段。

---

<a id="file-25"></a>

## 25. `axp/spec/21-android-host-integration.md`

# 21 · Android 应用接入 AXP 宿主规范

> 状态：Stable · 适用 AXP v1.x · Android API 26+ · 最后更新 2026-11-20
> 规范性层级：`13-glossary-conventions.md` §1 第 4 层。**不新增 `axp.json` 字段、不改 `01-format.md` §0–§12**。
> 配套：[`21-host-capabilities.schema.json`](21-host-capabilities.schema.json) · [`docs/android-integration-cookbook.md`](../docs/android-integration-cookbook.md)。
>
> **本文件回答的问题**：一个**已经存在的 Android App**，要引入 AXP、能装 `.axp`、能点开插件 UI、能被 Agent 选用，到底要改哪几处、按什么顺序改、怎么证明改对了。
> 它不是「从零写一个宿主」的实现说明（那是 `axp-android-host/` 参考实现），而是**第三方 App 的接入契约**——M7「引入第三方宿主」的规范性入口。

---

## 1. 先分清三个东西（本文件最容易被误读的地方）

| 东西 | 文件 | 谁装它 | 装几次 |
|---|---|---|---|
| **宿主 App 安装包** | `app-debug.apk` / `app-release.aab` | Android `PackageManager`，用户从应用商店或 `adb install` 装 | **一次**（升级才换） |
| **插件包** | `*.axp`（zip 态）或插件目录（开发态） | **AXP 宿主自己**通过九步装载 / 十步安装写入 `registry.json` | **任意多次**，热加载可换其中的组件 |
| **宿主能力声明** | `host.json`（本文件 §5 新增，App 自带） | 不装，随宿主发布，供安装期协商 | 随宿主版本走 |

> `distribution.signatureScheme = "apk-v3"` 里的 `apk-v3` 是**签名方案名**（APK Signature Scheme v3 的签名块格式与验签算法），
> `MUST NOT` 被读成「插件是 APK」。`.axp` 借用 v3 签名块做信任链，产物仍是 `.axp`；校验它的不是 `PackageManager`，是宿主里的 `SignaturePolicy`。
> 原仓库 README「发布前需 `apksigner sign --v3`」应理解为**对 `.axp` 做 v3 风格签名**，不是产出可安装的 APK。
>
> **结论**：热安装、热加载、回滚，动的永远是 `.axp`，永远不需要重新打包 / 重新上架宿主 APK。

---

## 2. 三种接入姿态

宿主 App 先选一种，不同姿态的 MUST 集合不同：

| 姿态 | 说明 | 适用 |
|---|---|---|
| **A · 内嵌宿主**（推荐，本文件主体） | App 自己实现装载、注册表、执行器、UI 渲染；`.axp` 进自己的 `filesDir` | 想让自家 App 拥有插件生态 |
| **B · 委托宿主** | App 不装载，只通过 `session-install` Intent / SAF 把 `.axp` 交给设备上已装的 AXP Host，用 `agent-tools` 的投影结果 | 只想「发个插件给别的宿主用」，不想承担安全边界 |
| **C · 能力提供方** | App 不装载插件，只把自身能力注册成 `axp://` 域适配器 / `impl.proc` 后端，由 AXP Host 调用 | 地图、相机、办公套件等已有能力方 |

**姿态 B 的硬约束**：投递方 `MUST NOT` 认为自己已经「安装完成」；`MUST` 由接收宿主重跑 `10-distribution-index.md` §3 的第 2–7 步并写自己的 `registry.json`（C14）。投递方 `MAY` 读宿主回执，但 `MUST NOT` 用回执替代包内清单。

**姿态 C 的硬约束**：暴露给宿主的能力 `MUST` 走 `capabilities.requests` 声明过的通道（L1 运行时权限 / L2 无障碍 / L3 Shizuku），`MUST NOT` 靠导出未保护的 `ContentProvider` / `Activity` 绕过确认。

下文 §3–§10 默认姿态 A；B/C 只受各自硬约束 + §5 声明 + §11 验收的适用部分约束。

---

## 3. 五个挂钩点（接入面全集）

一个已有 App 引入 AXP，**只需要动这五处**，其余业务代码不改。

```
        ┌──────────── 已有 App（Activity / Service / 业务模块）────────────┐
        │                                                                │
 [H1] 入口 ──> [H2] 装载 ──> [H3] 执行 ──> [H4] 界面 ──> [H5] 治理        │
  SAF/Intent   九步+十步    impl 七形态    panel 渲染    registry/投影/审计 │
        │                                                                │
        └────────────── host.json（§5）向插件声明能力 ────────────────────┘
```

| 挂钩 | 必须实现的契约 | 规范出处 |
|---|---|---|
| **H1 入口** | 接收 `.axp`：`ACTION_OPEN_DOCUMENT`(SAF) / `ACTION_VIEW` / `install-intent.json` / `index.json` 的 `id@range`；`MUST` 支持目录态（开发）与 zip 态（分发） | 10 §1 / §3 / §5；16 §6 |
| **H2 装载** | 九步流水线（解析→签名→引用完整性→abis→依赖闭包→权限→注册组件→UI 挂载→热加载就绪），任一步失败整包拒绝、不部分注册；安装再叠十步 | 01 §7；10 §3；18 §2 |
| **H3 执行** | `impl` 七形态按 `native>kotlin>wasm>bin>js>proc>url` 选第一个可用者；注入 `ctx`；ES5 基线；超时与异常结构化 | 03；14 §2.11；16 §3–§4 |
| **H4 界面** | 插件管理页列出已装插件；`ui.panel` 提供点击入口；渲染两种 panel 形态 + 13 种节点；`ui.bind` 自动刷新；`ui.actions` 继承 confirm；三个 lifecycle 回调 | 15；11 §5 |
| **H5 治理** | `registry.json` 五操作（list/install/uninstall/enable/disable）、`agent-tools` 投影、知识白名单、审计 append-only、L2+/dangerous 逐项确认 | 11；16 §5；18 §5 |

**没有 `ui{}` 的插件**（PDF/Excel、压缩解压、浏览器自动化）`MUST` 仍能在 H5 列表查看、被 H3 调用、启停卸载；`MUST NOT` 因为没有界面就拒绝装载（14 §1 / C08）。

---

## 4. 接入档 I0–I3（按「今天能改多少」分层）

对齐 `20-compatibility-governance.md` §4 的 AXP-0..3，但用**接入档**描述「已有 App 的改造量」。每档都有可执行的退出条件，不许跳档宣称。

| 档 | 改动量 | 新增能力 | 退出条件（全绿才可声明） |
|---|---|---|---|
| **I0 · 工具接入** | 半天：引入纯 Java 装载核心 + 一个 JS 执行器 | H1(SAF) + H2 前 7 步 + H3(`js` 形态 + `ctx` 基础) + H5(registry 五操作) | C01–C05、C08、C20；`agent-tools` 能列出 `name=<id>.<tool>` |
| **I1 · 数据与分发** | +1~2 天 | `surfaces[]` / `full·delta` / `knowledge[]` 渐进披露 / `index.json` / `session-install` 意图 | 再加 C07、C09、C12–C14、C26；「装一个无 UI 插件不重启 App」实测通过 |
| **I2 · 界面与 Agent** | +3~5 天 | H4 全套 + 插件管理页 + `agents[]`/`events[]` + `ctx.storage`/`ui.push` + 存储隔离 | 再加 C06、C15–C18、C21；「点开记忆系统→写入→列表自动刷新」端到端通过 → **可声明 AXP-2** |
| **I3 · 全语义** | + 真机通道 | L0–L5 `gradient` 自动降级、Shizuku/无障碍真适配器、`hotReload{}` 每次验签/状态迁移/隔离类加载器/回滚、生产 `strict()` v3 证书链、13 域全适配器 | C01–C26 全绿 + `18 §6` 三条必验 → **AXP-3** |

**降级规则**：宿主 `MUST NOT` 因为自己只做到 I2 就拒绝一个声明了 `hotReload{}` 的插件；`MUST` 按 20 §3 协商，把不支持的组件标 `available:false`（11 §3），插件其余部分照常可用。`MUST NOT` 静默丢弃组件也不告知 Agent。

---

## 5. `host.json` —— 宿主能力声明（本文件唯一新增结构）

> 与 `registry.json`（**运行态**：已装了哪些插件，16 §5）区分：`host.json` 是**能力态**：这个宿主能做到什么。
> 安装期按 20 §3 用它做协商；插件作者/索引可用它判断「我的包能不能装进这个宿主」。
> `MUST` 随宿主发布（放 `assets/axp/host.json`，或由 `GET /api/axp/host` 返回同构 JSON）。

### 5.1 字段表

| 字段 | 类型 | 必填 | 语义 |
|---|---|---|---|
| `axpHost` | const `"1.0"` | ✅ | 宿主声明结构版本，与 `axp.json` 的 `axp:"1.0"` 独立 |
| `appId` | string | ✅ | 宿主 applicationId，反向域名 |
| `hostLevel` | `AXP-0..3` | ✅ | 与一致性声明一致，`MUST NOT` 虚标 |
| `hostVersion` | semver | ✅ | 与 `minHost` 比较 |
| `minAndroid` | int ≥26 | ✅ | 宿主自身最低系统版本 |
| `supportedAbis` | string[] | ✅ | `Build.SUPPORTED_ABIS` 快照；协商 `abis`（20 §3 步 2） |
| `implKinds` | enum[] | ✅ | `native/kotlin/wasm/bin/js/proc/url` 的**已实现**子集；全部不可用 → `IMPL_UNAVAILABLE` 不崩 |
| `uiForms` | enum[] | ✅ | `panel/widget/web/activity/inject` 已实现子集；`panel` 时须含 `panelForms` |
| `panelForms` | enum[] | ❌ | `form-A-legacy` / `form-B-nested`；有 `panel` 时 `MUST` 至少一种（15 §1） |
| `channels` | enum[] | ✅ | `session-install/trusted-channel/preinstall` 支持的渠道 |
| `domains` | enum[] | ✅ | 13 标准域中**已实现适配器**的子集；未列出的 `MUST` 返回 `DOMAIN_UNAVAILABLE`，`MUST NOT` 静默返回空（17 §1） |
| `services` | map<string,bool> | ✅ | `storage/ui.push/sampling/elicitation/audit.read` 是否提供；`true` 才注入对应 `ctx` 能力（16 §2） |
| `signaturePolicy` | enum | ✅ | `dev`（仅摘要）/ `strict-v3`（真证书链 + 吊销）；生产 `MUST` 为 `strict-v3` |
| `ctx` | string[] | ✅ | 实际注入的 `ctx` 方法名，是 `services` 的展开，供插件预检 |
| `installIntentEndpoint` | string | ❌ | 姿态 B 的接收入口（Activity / ContentProvider URI / deep link） |
| `conformance` | object | ✅ | `{ suite, passed, failed, notImplemented[] }`；未实现项 `MUST` 列出（13 §6 / 20 §4） |

**`additionalProperties:false`**。完整机器可读形式见 `21-host-capabilities.schema.json`；S09 会现场用 schema 校验。

### 5.2 最小示例（I2 / AXP-2，对应本套 `axp-android-host`）

```jsonc
{
  "axpHost": "1.0",
  "appId": "dev.axp.host",
  "hostLevel": "AXP-2",
  "hostVersion": "1.0.0",
  "minAndroid": 26,
  "supportedAbis": ["arm64-v8a", "armeabi-v7a", "x86_64"],
  "implKinds": ["js"],
  "uiForms": ["panel"],
  "panelForms": ["form-A-legacy", "form-B-nested"],
  "channels": ["session-install", "preinstall"],
  "domains": ["intent"],
  "services": { "storage": true, "ui.push": true, "sampling": false,
                "elicitation": false, "audit.read": true },
  "signaturePolicy": "dev",
  "ctx": ["storage", "surface", "audit", "ui.push"],
  "conformance": {
    "suite": "axp-conformance/1.0", "passed": 26, "failed": 0,
    "notImplemented": ["hotReload", "apk-v3-strict", "shizuku-l3", "a11y-l2"]
  }
}
```

> 注意 `domains` 只列了 `intent`：`screen` 等 12 个域 `MUST` 返回 `DOMAIN_UNAVAILABLE` 而不是空树。这正是「如实声明、不虚标 AXP-3」的机器可读形式。

### 5.3 协商失败码

| 场景 | 错误码 |
|---|---|
| `host.json` 缺失/不符合 schema | `HOST_DECLARATION_INVALID` |
| 插件要求的 `impl`/`uiForm`/`channel`/`ctx` 宿主没声明 | `HOST_CAPABILITY_MISMATCH` |
| 插件声明等级 > `hostLevel` | `INSTALL_HOST_LEVEL` |
| `abis` 与 `supportedAbis` 无交集且非空 | `INSTALL_ABI_UNSUPPORTED` |
| 宿主未声明 `hostLevel` 却宣称通过套件 | `HOST_LEVEL_UNDECLARED` |

全部收录于 `19-error-codes.md` §6/§7。

---

## 6. Android 平台映射表（「Android 专属」的落地点）

| 规范概念 | Android 落点 | 注意 |
|---|---|---|
| 插件根目录 | `context.getFilesDir()/axp/plugins/<id>/` | `MUST NOT` 放 `assets/`（那等于把插件编译进 APK，违背热安装） |
| 注册表 | `filesDir/axp/registry.json` | 与 CLI `$AXP_HOME/registry.json` 同构（16 §5） |
| 安装意图 inbox | `filesDir/axp/inbox/*.install-intent.json` | 姿态 B / session-install |
| `ctx.storage` | `filesDir/axp/storage/<plugin-id>/` | **按 id 隔离**，禁止全局 `SharedPreferences`（T10） |
| 审计 | `filesDir/axp/audit.jsonl` | append-only，插件只能追加不能删（T13） |
| 收 `.axp` | `ACTION_OPEN_DOCUMENT` + `ContentResolver.openInputStream` | `MUST` 校验 zip 条目无 `..`/绝对路径/链接（T01） |
| 签名 | `apksig` 的 `ApkVerifier` / v3 签名块解析 | `strict-v3` 校验证书链 + `index.revoked[]`；`dev` 只复算 digest |
| L1 | `requestPermissions()` / `ActivityResultContracts` | 系统弹窗 |
| L2 | `AccessibilityService` + 设置页显式开关 | **必须单独确认**，不能随 L1 一起默许 |
| L3 | Shizuku `Binder` / `Shell` | **必须单独确认** |
| L4 / L5 | `su` / 系统签名白名单 | L5 仅预装 |
| `minAndroid` | `Build.VERSION.SDK_INT` | 20 §3 步 1 |
| `abis` | `Build.SUPPORTED_ABIS` | 20 §3 步 2 |
| `impl.js` | 独立进程 `WebView.addJavascriptInterface` 或 Rhino/Nashorn | **禁止主线程执行**（§7）；剥离 `export ` 前缀（16 §4） |
| `impl.kotlin` / `.dex` | `DexClassLoader` + 隔离 `ClassLoader` | 热加载代之间 `MUST` 换 ClassLoader（08） |
| `impl.native` | `System.load()` 包内 `.so` | 须 `abis` 匹配 |
| `impl.proc` | `ProcessBuilder`（App 私有数据目录内） | 不假定任何外部协议（03 / 14 §2.11） |
| `ui.panel` | 一个 `PluginActivity`，`TextView`/`EditText`/`Button`/`RecyclerView` 映射 13 种节点 | 未知 type 渲染占位文本，不崩（15 §2） |
| `ui.bind` | `SurfaceListener` → `runOnUiThread(render)` | delta 到达即刷新，主线程的**刷新**可以，执行 impl 不行 |
| `lifecycle.onUnload` | `Activity.onDestroy()` | 退订 Surface、清 WebView 缓存 |
| 长订阅 | 前台 `Service` + `foreground.service` 声明 | `MUST NOT` 用 `WorkManager` 假装实时流（03 / 05） |
| `axp://intent/<action>` | `context.startActivity(Intent)` | 本套参考实现已真实打开浏览器 |
| 混淆 | R8 keep `dev.axp.host.core.**`、JS 接口类、`plugin-id` 字符串 | 混淆掉 `id` 会导致存储串仓 |

---

## 7. 进程 / 线程 / 生命周期硬约束

1. `MUST NOT` 在 Android 主线程执行任何 `impl`（JS/Dex/native 都一样）；超时 → `IMPL_TIMEOUT`，在线程上跑 → `IMPL_ON_MAIN_THREAD`（开发期断言）。
2. UI 刷新 `MUST` 回主线程，但 `MUST NOT` 因此把执行也搬回主线程。
3. WebView `MUST` 每个插件独立实例或独立进程，`MUST NOT` 多个插件共用一个 JS 全局对象（T10 的 JS 版）。
4. `Activity.onDestroy` `MUST` 调 `ui.lifecycle.onUnload`、退订全部 Surface、`clearCache(true)`；热加载 `onReload` 后 `MUST` 重绘并保留 `state.preserve`（15 §4 / 08）。
5. 宿主进程被杀后重启，`MUST` 从 `registry.json` 重建已启用插件，`MUST NOT` 要求用户重装 `.axp`。
6. 插件 `MUST NOT` 持有宿主 `Context` 的长期引用；`ctx` 是唯一通道（16）。

---

## 8. 与已有 App 共存（最容易踩的坑）

| 风险 | `MUST` 做法 |
|---|---|
| 包名 / 资源 id 冲突 | 宿主代码统一前缀 `axp_`，插件资源不进宿主 `R`（panel 声明式渲染，不 inflate 插件布局） |
| `ContentProvider` authority 冲突 | 用 `${applicationId}.axp.inbox`，不要写死 |
| `FileProvider` 路径被插件猜到 | `filesDir/axp/storage/<id>/` 不暴露给 `FileProvider` |
| 导出的 Activity 被别的 App 直接拉起装包 | 接收 `.axp` 的 Activity `android:exported=true` 但 `MUST` 自己重跑十步安装；`MUST NOT` 信任调用方身份 |
| R8 混淆掉 `plugin-id` | keep 规则保留 `axp.json` 原始字符串与 `ctx` 绑定类名 |
| 多用户 / 工作资料 | 用 `context.getFilesDir()`（已按用户隔离），`MUST NOT` 用 `Environment.getExternalStorageDirectory()` 存 registry/storage |
| 备份恢复把旧插件带回来 | `android:allowBackup` 下 `MUST` 在恢复后重新验签，`MUST NOT` 直接信任恢复的 `registry.json`（T05） |

---

## 9. 权限与确认 UI（不可省略）

- 安装期 `MUST` 把 `capabilities.requests` + `dangerous` + `privilege` 渲染成**逐项**确认清单；L2 及以上 `MUST` 单独一屏、单独开关（04 §1 / 10 §3 步 6）。
- 未确认 → `INSTALL_CONFIRM_REQUIRED`，`MUST NOT` 写 `registry.json`。
- 调用期 `sideEffects:destructive|device` 或 `confirm:true` 的工具，`MUST` 再次弹确认；`ui.actions[].tool` **继承**该策略（C18 / T12），`MUST NOT` 因为「是界面上点的按钮」就跳过。
- `gradient` 降级 `MUST` 在审计里记录「选了哪层、为什么降级」，`MUST NOT` 悄悄降到低权限实现（04 / 18 §5）。

---

## 10. 反模式（评审时直接打回）

1. 把 `.axp` 当 APK 交给 `PackageManager`，或把插件 `assets/` 编译进宿主 —— **等于取消热安装**。
2. 用 `index.json` 的 `capabilities` 快照代替包内 `axp.json` 做权限判定（10 §2 规则 4）。
3. 主线程跑 `impl.js`；多个插件共用 WebView 全局。
4. `ctx.storage` 用全局 `SharedPreferences` 或公共外部目录 —— 跨插件串仓（T10）。
5. 域适配器没实现就返回空数据 —— `MUST` 给 `DOMAIN_UNAVAILABLE`（17 §1）。
6. 只做 I2 却在 `host.json` 写 `hostLevel:AXP-3`，或把未实现项从 `notImplemented` 里删掉。
7. 以「插件没 UI」为由拒绝装载纯功能插件（PDF/Excel/压缩/浏览器自动化）。
8. 姿态 B 里投递方自己写了一份 `registry.json` 就宣称安装完成。

---

## 11. 验收：I01–I10 接入断言

在 C01–C26（`12-host-conformance.md`）之外，第三方宿主 `MUST` 再跑 I01–I10；两者都绿才可发布 `host.json`。

| ID | 断言 | 档 |
|---|---|---|
| I01 | 随宿主发布的 `host.json` 通过 `21-host-capabilities.schema.json`，且 `hostLevel` 与 `conformance` 自洽 | 全部 |
| I02 | 通过 SAF 选一个 `.axp`，**不重启 App** 即出现在插件列表 | I1 |
| I03 | 安装一个无 `ui{}` 插件，能在列表查看、被 `agent-tools` 投影、启停卸载 | I0 |
| I04 | `ui.panel` 插件两种 panel 形态都能渲染；`ui.bind` 收到 delta 后节点自动刷新 | I2 |
| I05 | `ctx.storage` 两个不同 `id` 的插件互相读不到对方数据 | I2 |
| I06 | L2+/`dangerous` 未逐项确认时 `registry.json` 不变 | I2 |
| I07 | `impl` 不跑主线程；超时 / 抛异常返回结构化错误、宿主不崩 | I0 |
| I08 | 宿主进程被杀重启后，已启用插件从 `registry.json` 自动重建 | I1 |
| I09 | `host.json` 未列出的域返回 `DOMAIN_UNAVAILABLE`，不返回空数据 | I1 |
| I10 | 声明 `hotReload{}` 的插件在 I2 宿主上仍可装载，不支持项标 `available:false` 并告知 Agent | I2 |

`tools/spec-lint.mjs` 的 **S09** 负责 I01 的机器部分（schema + 枚举子集 + `notImplemented` 一致性）；
其余由宿主自己的 instrumentation test / `axp host-check` 覆盖，结果写入 `host.json.conformance`。

---

## 12. 接入步骤清单（给 Android 团队照着做）

```
[ ] 0. 选姿态（A/B/C）与目标档（I0→I3），在 host.json 里如实写 hostLevel
[ ] 1. 引入 axp core：九步装载 + 十步安装 + registry（H2/H5），不动业务模块
[ ] 2. 接 H1：SAF 收 .axp / install-intent inbox / index id@range
[ ] 3. 接 H3：impl 七形态择一 + ctx 注入 + ES5 执行器（独立线程/WebView）
[ ] 4. 跑 C01–C05、C08、C20 + I01/I03/I07 → 可声明 I0
[ ] 5. 补 surfaces/knowledge/index/session-install + I02/I08/I09 → I1
[ ] 6. 补 PluginActivity + 管理页 + ui.bind/actions/lifecycle + 存储隔离 → I2（C01–C26 全绿）
[ ] 7. 补 gradient / 无障碍 / Shizuku / hotReload / strict-v3 → I3，按 18 §6 验三条
[ ] 8. 把 conformance 结果写回 host.json，随 APK 发布；之后所有插件只发 .axp
```

**关键**：第 8 步之后，宿主 APK 不再因为「加了个插件」而发版。这就是「热安装 / 热加载」和「APK 只装一次」能同时成立的原因。

---

## 13. 本文件与既有章节的关系

| 已有 | 本文件补什么 |
|---|---|
| `01 §7` 九步 / `10 §3` 十步 | 映射到 Android 具体 API 与 `filesDir` 布局（§6） |
| `11` 注册表 / 投影 / UI 入口 | 变成「已有 App 的五个挂钩点」（§3）与接入档（§4） |
| `12` C01–C26 | 新增 I01–I10 第三方接入断言（§11） |
| `16 §5` `registry.json` | 新增**能力态** `host.json`，避免把「能做什么」和「装了什么」混在一个文件（§5） |
| `17` 13 域 | 规定「未实现必须报 `DOMAIN_UNAVAILABLE`」并在 `host.json.domains` 声明子集 |
| `18` 威胁模型 | 补 Android 特有的主线程、共享 WebView、备份恢复、导出组件四条（§7/§8） |
| `19` 错误码 | 补 5 个宿主协商码，闭环 `20 §3` 已引用但未登记的项 |
| `20 §3` 协商 | 给出 `host.json` 这个可机读的协商输入与 S09 校验 |

---

<a id="file-26"></a>

## 26. `axp/spec/21-host-capabilities.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://axp-spec.dev/schema/1.0/host-capabilities.json",
  "title": "AXP Host Capability Declaration v1.0",
  "description": "Capability-state declaration shipped with an Android host App. NOT the runtime registry (see 16-registry.schema.json) and NOT a plugin manifest.",
  "type": "object",
  "required": ["axpHost","appId","hostLevel","hostVersion","minAndroid","supportedAbis","implKinds","uiForms","channels","domains","services","signaturePolicy","ctx","conformance"],
  "additionalProperties": false,
  "properties": {
    "axpHost": { "const": "1.0" },
    "appId": { "type": "string", "minLength": 3 },
    "hostLevel": { "enum": ["AXP-0","AXP-1","AXP-2","AXP-3"] },
    "hostVersion": { "type": "string" },
    "minAndroid": { "type": "integer", "minimum": 26 },
    "supportedAbis": { "type": "array", "items": { "enum": ["arm64-v8a","armeabi-v7a","x86","x86_64"] } },
    "implKinds": { "type": "array", "items": { "enum": ["native","kotlin","wasm","bin","js","proc","url"] } },
    "uiForms": { "type": "array", "items": { "enum": ["panel","widget","web","activity","inject"] } },
    "panelForms": { "type": "array", "items": { "enum": ["form-A-legacy","form-B-nested"] } },
    "channels": { "type": "array", "items": { "enum": ["session-install","trusted-channel","preinstall"] } },
    "domains": { "type": "array", "items": { "enum": ["fs","screen","app","notification","intent","sensor","clipboard","telephony","logcat","pm","media","net","sysprop"] } },
    "services": {
      "type": "object",
      "required": ["storage","ui.push","sampling","elicitation","audit.read"],
      "additionalProperties": false,
      "properties": {
        "storage": { "type": "boolean" }, "ui.push": { "type": "boolean" },
        "sampling": { "type": "boolean" }, "elicitation": { "type": "boolean" },
        "audit.read": { "type": "boolean" }
      }
    },
    "signaturePolicy": { "enum": ["dev","strict-v3"] },
    "ctx": { "type": "array", "items": { "type": "string" } },
    "installIntentEndpoint": { "type": "string" },
    "conformance": {
      "type": "object",
      "required": ["suite","passed","failed","notImplemented"],
      "additionalProperties": false,
      "properties": {
        "suite": { "type": "string" },
        "passed": { "type": "integer", "minimum": 0 },
        "failed": { "type": "integer", "minimum": 0 },
        "notImplemented": { "type": "array", "items": { "type": "string" } }
      }
    }
  },
  "allOf": [
    {
      "if": { "properties": { "uiForms": { "contains": { "const": "panel" } } }, "required": ["uiForms"] },
      "then": { "required": ["panelForms"], "properties": { "panelForms": { "minItems": 1 } } }
    }
  ]
}
```

---

<a id="file-27"></a>

## 27. `axp/docs/android-integration-cookbook.md`

# Cookbook · 把已有 Android App 接成 AXP 宿主（I0 半天版）

> 配套 [`21-android-host-integration.md`](../spec/21-android-host-integration.md)。
> 目标：**不重写业务、不发新插件版宿主**，半天跑通「SAF 选一个无 UI 的 `.axp` → 不重启 App 装好 → `agent-tools` 里能看见 → 能调用」。

## 0. 前提

- Android API 26+，已有 App 模块 `:app`；
- 把 `axp-android-host/app/src/main/java/dev/axp/host/core/` 整个拷进你的 `core/` 包（纯 Java、零第三方依赖、不引用任何 Android 类之外的东西）；
- 本档只做 `impl.js`，执行器用 `WebView`（或一个 Rhino/Nashorn 封装），**不需要 dex/so/Shizuku**。

## 1. 加三行 Gradle（其实零依赖）

```gradle
android {
    defaultConfig { minSdk 26 }
    // 若用 R8，加：
    // keep 'dev.axp.host.core.** { *; }'
}
```
`core` 是纯 Java，不引入任何 AAR；`WebView` 是 framework 自带。

## 2. 目录（第一次启动建好）

```kotlin
val axpDir = File(filesDir, "axp").apply {
    File(this, "plugins").mkdirs()
    File(this, "inbox").mkdirs()
    File(this, "storage").mkdirs()
}
val registry = File(axpDir, "registry.json")
val audit    = File(axpDir, "audit.jsonl")     // append-only
```

## 3. 收 `.axp`（H1）

```kotlin
val pick = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
    uri ?: return@registerForActivityResult
    val tmp = File(cacheDir, "incoming.axp")
    contentResolver.openInputStream(uri)!!.use { input ->
        tmp.outputStream().use { input.copyTo(it) }
    }
    lifecycleScope.launch(Dispatchers.IO) {
        val r = AxpHost.installFromZip(tmp, axpDir, SignaturePolicy.dev())
        withContext(Dispatchers.Main) { showResult(r) }   // 只刷新 UI，不在这跑 impl
    }
}
pick.launch(arrayOf("application/zip", "*/*"))
```

`installFromZip` 内部 `MUST` 跑完 `10 §3` 十步：解包（拒 `..`/绝对路径）→ 复算 digest → publisher 绑定 → 清单严格校验 → abis → 依赖 → **逐项确认 L2+/dangerous** → 写 `registry.json`。任一步失败不写注册表。

## 4. 执行一个工具（H3，独立线程）

```kotlin
lifecycleScope.launch(Dispatchers.IO) {
    val ctx = AxpContext(
        storage = NamespacedStorage(File(axpDir, "storage"), pluginId),  // 按 id 隔离
        surface = SurfaceBus, audit = AuditLog(audit), confirm = userConfirmed
    )
    val out = AxpHost.invoke(pluginId, "demo.echo", mapOf("text" to "hi"), ctx)
    withContext(Dispatchers.Main) { render(out) }
}
```

`MUST` 剥离 `export ` 前缀、`MUST` 用 ES5 语法跑、`MUST` 捕获异常转 `IMPL_ERROR`、设超时转 `IMPL_TIMEOUT`。**不要**把这段放 `Dispatchers.Main`。

## 5. 让 Agent 看得见（H5）

```kotlin
val tools = AxpHost.agentTools(registry)   // [{name:"com.example.hello.demo.echo", cost:"fast", available:true}, ...]
```
把 `tools` 喂给模型的工具列表即可。`enabled:false` 的插件不进投影；`implKinds` 里没声明的形态标 `available:false`（别静默丢）。

## 6. 随 APK 发布 `host.json`

把 `assets/axp/host.json` 放进去（`21 §5` 的最小示例，改 `appId` 为你的 applicationId）：

```jsonc
{ "axpHost":"1.0", "appId":"com.mycompany.app", "hostLevel":"AXP-0",
  "hostVersion":"1.0.0", "minAndroid":26, "supportedAbis":["arm64-v8a"],
  "implKinds":["js"], "uiForms":[], "channels":["session-install"],
  "domains":[], "services":{"storage":true,"ui.push":false,"sampling":false,
  "elicitation":false,"audit.read":true}, "signaturePolicy":"dev",
  "ctx":["storage","surface","audit"],
  "conformance":{"suite":"axp-conformance/1.0","passed":0,"failed":0,
                 "notImplemented":["ui.panel","hotReload","apk-v3-strict"]} }
```

`domains:[]` 表示 13 个域都不提供 → 一律回 `DOMAIN_UNAVAILABLE`，**不要**回空字符串。

## 7. 半天验收（I0 退出条件）

```bash
# 在规范仓侧生成插件
node axp/cli/bin/axp.mjs new com.example.hello -o /tmp/hello
node axp/cli/bin/axp.mjs pack /tmp/hello -o hello.axp
node axp/cli/bin/axp.mjs publish /tmp/hello -o index.json
```
1. `adb push hello.axp /sdcard/Download/`；
2. App 里 SAF 选它 → 列表出现 `com.example.hello`，**没重启**；
3. 调 `com.example.hello.demo.echo` 返回回显；
4. 装第二个不同 `id` 的插件，读不到第一个的 `storage`；
5. `kill` 进程再打开 → 插件还在（从 `registry.json` 重建）；
6. 跑 `node axp/tools/spec-lint.mjs --json` → S09 校验你的 `host.json` 通过。

过了这 6 条，就是合格的 **I0 / AXP-0** 接入。之后按 `21 §12` 第 5–8 步逐级加 surfaces、UI、gradient，宿主 APK **不需要因为加插件再发版**。

## 8. 三条最常见的翻车

- 把 `hello.axp` 放进 `assets/` 打进 APK —— 那就不是热安装了；
- `ctx.storage` 用 `getSharedPreferences("axp", ...)` 全局一份 —— 两个插件串仓；
- `host.json` 写 `hostLevel:"AXP-3"` 但 `notImplemented` 空着 —— S09 / I01 直接打回。

---

<a id="file-28"></a>

## 28. `axp/docs/cli-reference.md`

# `axp` CLI 参考（v1.1 · spec/10 完整实现）

> 入口：`node axp/cli/bin/axp.mjs <command> [args]`
> 零依赖（Node 20+，`pack/install` 的 zip 操作调用系统 `python3`）。
> 宿主状态目录：`$AXP_HOME`（默认 `./.axp-host`），与 `axp-android-host` 共用同一份 `registry.json` 格式。

## 开发与校验

| 命令 | 说明 |
|---|---|
| `axp new <reverse.domain.id> [-o dir]` | 生成最小无 UI 插件骨架 |
| `axp validate <dir>` | schema → 引用完整性 → abis → 权限词汇表 → UI 引用 → 热加载策略 |
| `axp seal <dir>` | 写 `META-INF/AXP-MANIFEST.DIGEST` 与 `AXP-SIG.json`（dev 签名） |
| `axp pack <dir> -o x.axp` | `seal` + 校验 + 打成 zip 分发态（`--dev` 包；生产需 `apksigner sign --v3`） |
| `axp inspect <dir\|file.axp>` | 打印组件摘要，不执行实现体 |

## 分发与索引（spec/10）

| 命令 | 说明 |
|---|---|
| `axp publish <dir> --index index.json` | 打包到 `dist/`、算 sha256、写/更新索引条目 |
| `axp index <dir...> -o index.json` | 批量重建索引 |
| `axp install <dir\|file.axp\|id@range> [--index f] [--dev] [--force]` | **十步安装**（解析→摘要→校验→验签→索引一致性→权限确认清单→依赖闭包→注册表→session-install 意图→输出） |
| `axp uninstall <id>` | 删除插件目录与注册表记录 |

`install` 错误码：`INSTALL_DIGEST_MISMATCH` · `INSTALL_PUBLISHER_MISMATCH` · `INSTALL_SIGNATURE_FAILED` · `INSTALL_DEPENDENCY_MISSING` · `INSTALL_ALREADY_PRESENT` · `INSTALL_UNSAFE_ENTRY` · `INSTALL_SOURCE_MISSING` · `INSTALL_REVOKED`。
`id@range` 支持 `>= / > / <= / < / = / ^ / ~` 与 AND 组合。

> **`--dev` 的含义**：示例/开发包可无签名块，只校验 `publisher` 格式与 digest；生产宿主 `MUST` 用 APK v3 真验签，`SignaturePolicy.strict()` 在 Android 宿主里留了接口。

## 插件管理与 Agent（spec/11）

| 命令 | 说明 |
|---|---|
| `axp list` | 打印 `registry.json` |
| `axp enable <id>` / `axp disable <id>` | 启用/停用（停用后不进 Agent 工具集、不装载） |
| `axp agent-tools --json` | 扁平工具清单 `name=<pluginId>.<toolId>`，含 `description/cost/sideEffects/confirm/available` + `knowledge[]` |
| `axp invoke <plugin> <tool> '<json>' [--confirm]` | 走 `gradient` 选择 → `confirm` 门 → `impl.js` 在 vm 沙箱执行 → 审计 |
| `axp ui <plugin>` | 返回 `panel.json` + 当前 `ui.bind` 绑定快照 + `actions`（模拟「点开插件」） |

`invoke` 注入 `ctx`（`storage` / `surface` / `audit` / `ui` / `agent` / `elicit`），
`storage` 需清单声明 `runtimeServices:["storage"]` + `fs.read/write:<scope>`，否则 `STORAGE_DENIED`。
`confirm:true`、`sideEffects:"device"|"destructive"` 的工具不带 `--confirm` 时返回 `CONFIRM_REQUIRED`。

## 一致性

```bash
node axp/tools/conformance.mjs --json    # C01–C26（Node 宿主运行时行为）
node axp/tools/spec-lint.mjs --json      # S01–S09（含 host.json 能力声明校验）
java axp-android-host/conformance/ConformanceRunner.java   # 同一张表（Java core）
```

## 退出码

`0` 通过 · `1` 校验/安装/调用失败 · `2` 用法错误。

---

<a id="file-29"></a>

## 29. `axp/docs/cookbook-android-host.md`

# Cookbook · 把 AXP 宿主装到真机并真的用起来

> 配套工程：`axp-android-host/`（独立仓库，纯 Java + Android framework，**零第三方依赖**）。
> 本文件是「从 0 到点开插件 UI」的最短路径。

## 1. 构建

```
Android Studio (Ladybug+) / JDK 17 / Android SDK Platform 35 / Build Tools 35
minSdk 26 · targetSdk 35
```

```bash
git clone <axp-android-host>
cd axp-android-host
# 用 Android Studio 打开根目录，或命令行：
./gradlew :app:assembleDebug
./gradlew :app:installDebug        # 真机或模拟器需 adb 可用
```

工程只用 `android.*` / `java.*` / `org.json`（Android 内置）与 `WebView`，**不需要** Compose、kotlinx-serialization、QuickJS、Shizuku 依赖即可跑通 AXP-0/1/2。
JS 实现体由 `WebView.evaluateJavascript` 执行（Android 自带 JS 引擎），插件 UI 由 `panel.json` 渲染成原生 View。

## 2. 导入插件（session-install）

1. 在示例仓生成分发包：`axp pack plugins/05-memory-system -o memory.axp`（或用 `axp publish` 写进 `index.json`）。
2. 把 `.axp` 拷到手机（adb push / 文件管理器 / 浏览器下载均可）。
3. App 首页点 **「安装插件」** → SAF 选择该文件。
4. App 重新执行：解包路径校验 → 摘要 → `validator` → 权限确认页 → 写注册表。
   **不信任 CLI 的结论**（`spec/10` §5）。

也可让 CLI 投递：`axp install <dir> --home ~/.axp-host` 会生成 `inbox/<id>.install-intent.json`，宿主扫描 inbox 后走同一流程。

## 3. 点开插件 UI

首页列表里带 `UI` 标记的插件可点开 → `PluginActivity`：

- 解析 `ui/panel.json` 的 `Scaffold/Column/Text/Button/Input/List` 节点；
- 建立 `ui.bind`：`axp://x/<id>/…` 的 delta 自动刷新绑定节点；
- `ui.actions` 的按钮点击直接调用本包 `tools[].id`；
- `lifecycle.onLoad/onReload/onUnload` 按时机执行。

以 `05-memory-system` 为例：输入文字 → 点「记住」 → `memory.add` 写 `ctx.storage` → 发布 `axp://x/com.example.memory/entries` delta → 列表**自动刷新**，退出重进数据仍在（存储在 `filesDir/axp/storage/<id>.json`）。

## 4. Agent 选择插件

宿主 `AgentBroker.visibleTools()` 把已启用插件的工具投影成 `name=<pluginId>.<toolId>` 的扁平清单（含 `description/cost/sideEffects/confirm/available`）。
接入模型时把这份清单作为 function-calling 的 tools 传入；选中后按 `name` 反查插件并调用 `ToolDispatcher.invoke()`。
本工程默认附带一个**本地规则选择器**（按 description 关键字匹配，无需联网/模型），证明链路可用；换成模型只改 `AgentBroker.choose()` 一处。

## 5. 等级与未实现项（如实声明）

| 项 | 状态 |
|---|---|
| 9 步装载 / 校验 / 注册表 / 索引 / session-install | ✅ AXP-0/1 |
| Surface 订阅 / `ui.bind` / `ui.actions` / 插件 UI 页 / `agent-tools` / `ctx.storage` | ✅ AXP-2 |
| `gradient` 选择 | ✅（实现体按层选择） |
| 真机 AccessibilityService / Shizuku L3 | ⚠️ 接口已留，`AndroidPlatform` 返回结构化指令，需接系统服务 |
| 生产 APK v3 验签 / 证书吊销 | ⚠️ `SignaturePolicy.dev()` 已实现（digest + publisher），`strict()` 需接 apksig |
| 热加载（组件级替换 / 隔离类加载器 / 回滚） | ⬜ 未实现，故声明 **AXP-2**，不虚标 AXP-3 |
| T2–T7 实现体 | `js` ✅ · `bin/proc` 由宿主映射 · `dex/so/wasm/url` 标记 `unavailable` |

## 6. 自检

```bash
# 规范侧（Node，任何机器）
cd axp-spec/axp && node tools/conformance.mjs --json

# Android core 侧（纯 JVM，不需要 Android SDK）
cd axp-android-host && java conformance/ConformanceRunner.java
```

两个套件跑的是 `spec/12` 同一张用例表；全绿才能声明对应等级。

---

<a id="file-30"></a>

## 30. `axp/docs/cookbook-no-ui.md`

# Cookbook · 不带 UI 的功能插件怎么写

> 面向插件作者。四类场景：**PDF/Excel 制作 · 压缩解压 · 浏览器自动化 · 纯计算**。
> 共同点：`axp.json` 里**不写 `ui{}`**，只有 `tools[]`；`distribution` 与 `capabilities` 仍然必填。
> 完整可跑版本见独立示例仓 `axp-examples/plugins/06…08`。

## 0. 最小骨架（任何无 UI 插件都从这开始）

```jsonc
{
  "axp": "1.0", "id": "com.example.tools", "name": { "zh": "工具集" },
  "version": "1.0.0", "minAndroid": 26, "abis": [],
  "tools": [ { "id": "tool.one", "description": "...", "impl": { "js": "tools/one.js" },
               "sideEffects": "none", "cost": "fast" } ],
  "capabilities": { "privilege": "L0", "requests": [] },
  "distribution": { "channel": "session-install", "publisher": "sha256:<64hex>", "signatureScheme": "apk-v3" }
}
```

`axp new com.example.tools` 直接生成它。**不需要 `entry`，也不需要 `ui`**。

## 1. 文件生成类（PDF / Excel）

要写文件，`MUST` 声明 `fs.write:<scope>`；纯计算生成内容可不申请权限。

```jsonc
"tools": [
  { "id": "excel.make", "description": "把行数据生成 CSV/Excel 内容",
    "input": { "type":"object", "properties": { "rows":{"type":"array"} }, "required":["rows"] },
    "impl": { "js": "tools/excel.js", "bin": "tools/office-bin" },
    "sideEffects": "read", "cost": "slow" },
  { "id": "pdf.make", "description": "由文本生成最小 PDF",
    "impl": { "js": "tools/pdf.js", "proc": { "cmd": "tools/office-bin", "args": ["--pdf"] } },
    "sideEffects": "read", "cost": "slow" }
],
"capabilities": { "privilege": "L1",
  "requests": ["fs.write:shared"],
  "runtimeServices": ["storage"] }
```

要点：`impl` 可同时给 `js` + `bin`/`proc`，宿主按 `native>kotlin>wasm>bin>js>proc>url` 选；JS 兜底保证任何宿主都能跑。
落盘用 `ctx.storage.put()` 或由宿主把 `fs.write:shared` 映射到应用共享目录；**不要自己在 JS 里 `require('fs')`**——沙箱里没有。

## 2. 压缩 / 解压

```jsonc
"tools": [
  { "id": "archive.pack", "description": "把多个文件打包", "impl": { "js":"tools/pack.js", "bin":"tools/zip-bin" },
    "sideEffects":"read" },
  { "id": "archive.unpack", "description": "解包并列出条目", "impl": { "js":"tools/unpack.js" },
    "sideEffects":"device", "confirm": true }
],
"capabilities": { "privilege":"L1", "requests":["fs.read:shared","fs.write:shared"] }
```

`sideEffects:"device"` 或 `"destructive"` 时 `MUST` 写 `confirm:true`（校验器会查 `TOOL_CONFIRM_REQUIRED`）。
真机上把 `bin` 指向随包提供的 zip 可执行文件并把架构写进 `abis`；JS 版可用字符串封装做降级，见示例仓 `07-archive-tools`。

## 3. 浏览器 / 界面自动化（Android）

用标准域而不是自己发明协议：

```jsonc
"tools": [
  { "id": "browser.open", "description": "打开 URL",
    "input": { "type":"object","properties":{ "url":{"type":"string"} },"required":["url"] },
    "impl": { "js":"tools/open.js" }, "sideEffects":"device", "confirm":true },
  { "id": "screen.tap", "description": "点击坐标", "impl": { "js":"tools/tap-a11y.js" },
    "gradient": { "L2": { "impl": { "js":"tools/tap-a11y.js" } },
                  "L3": { "impl": { "bin":"tools/tap-shell" } } },
    "sideEffects":"device", "confirm":true },
  { "id": "screen.text", "description": "读取当前屏幕文本", "impl": { "js":"tools/text.js" }, "sideEffects":"read" }
],
"surfaces": [ { "uri":"axp://screen", "views":["tree","text"], "anchor":"node",
                "watchable":true, "auth":"L2" } ],
"capabilities": { "privilege":"L3",
  "requests":["accessibility.read","accessibility.gestures","intent.send"],
  "dangerous":["accessibility.gestures"] }
```

`gradient` 让 L2（无障碍）与 L3（Shizuku/shell）自动切换；`dangerous` 会被宿主单独弹确认。
JS 实现**返回结构化指令**（`{ action:"intent", uri:... }`），由宿主转成 Android Intent / 无障碍手势；插件不直接碰系统 API。

## 4. 纯计算 / 记忆 / 检索

L0 沙箱即可，不需要任何 `requests`；要持久化才加 `storage` + `fs.*`：

```jsonc
"capabilities": { "privilege":"L0", "requests":[],
  "runtimeServices": ["storage"] },
"tools": [ { "id":"text.summarize", "impl":{"js":"tools/sum.js"}, "sideEffects":"none", "cost":"fast" } ]
```

注意：`storage` 必须配 `fs.read/fs.write`，否则运行时返回 `STORAGE_DENIED`（见 `spec/11` §4）。

## 5. 发布前检查

```bash
axp validate .                 # 校验器
axp pack . -o com.example.tools.axp
axp publish . --index ../index.json   # 写摘要进索引
axp install com.example.tools@^1.0.0 --index ../index.json
axp agent-tools --json         # 确认工具出现在 Agent 可见集
axp conformance --json         # 端到端
```

`axp validate` 常见失败：`UNDECLARED_EXECUTABLE`（包里有 .js 但清单没引用）、`CAP_UNKNOWN_REQUEST`（权限名拼错）、`ABI_MISSING`（放了 .so/.dex 却没写 `abis`）。

---

<a id="file-31"></a>

## 31. `axp/docs/doc-templates.md`

# 文档格式与模板

> 状态：Stable
> 适用：AXP v1.x
> 最后更新：2026-11-14

本文件统一仓库内所有 `spec/*.md` / `docs/*.md` 的格式，并提供可直接复制的模板。贡献规则见 [`../CONTRIBUTING.md`](../CONTRIBUTING.md)。

## 1. 通用头（所有文档 MUST）

```markdown
# 标题（文件内唯一一级标题）

> 状态：Draft | Stable | Deprecated
> 适用：AXP v1.x · Android API 26+
> 最后更新：YYYY-MM-DD
```

规范类文档额外 `MUST` 在开头写明「本文件是否属于规范性正文」——只有 `spec/01-format.md` 是唯一规范性正文，`07-expression-map.md` 必须标注「外部验收材料，非规范正文」。

## 2. 教程类文档 MUST 包含四节

```
## 前置条件
## 步骤 N · ...（编号，每节一个可验证动作）
## 验证（勾选清单）
## 常见错误（表格：现象 / 原因 / 修法）
```

### 集成教程模板

```markdown
# 宿主集成教程：<主题>

> 状态：Stable
> 适用：AXP v1.x · Android API 26+
> 最后更新：YYYY-MM-DD

本教程面向**宿主开发者**。规范依据见 [`../spec/01-format.md`](../spec/01-format.md)。

## 前置条件
| 项 | 要求 |
|---|---|

## 步骤 1 · <动作>
```kotlin
// 可运行片段
```

## 步骤 2 · <动作>
...

## 验证
| 检查 | 期望 |
|---|---|

## 常见错误
| 现象 | 原因 | 处理 |
|---|---|---|
```

## 3. 插件 README 模板（每个示例 / 第三方插件 SHOULD 使用）

```markdown
# <插件名>

> AXP v1.0 · 权限 L? · 宿主等级 AXP-?

## 做什么
一句话。

## 组件
| 类型 | id / uri | 说明 |
|---|---|---|

## 权限
- privilege: L?
- requests: `...`
- dangerous: `...`

## 热加载
启用 / 未启用；可替换范围 `targets`。

## 安装
\```bash
axp validate .
axp pack . -o <name>.axp
apksigner sign --v3 --ks release.jks <name>.axp
\```

## 验证
- [ ] ...
```

## 4. spec 变更提案模板

见 [`.github/ISSUE_TEMPLATE/spec-change.md`](../.github/ISSUE_TEMPLATE/spec-change.md)。必须回答：

1. 动机与写不了的真实场景
2. `axp.json` 片段
3. 对「同级独立定位」的影响（不引入外部格式名 / 协议 / 运行时）
4. 兼容影响与迁移路径
5. 需要同步修改的文件清单

## 5. 代码块约定

| 标注 | 含义 |
|---|---|
| `json` | 可直接解析的 JSON |
| `jsonc` | 带注释／省略号的片段，**不可直接执行** |
| `kotlin` / `js` / `bash` / `yaml` / `xml` | 对应语言 |
| `text` | 目录树、时序等纯文本 |

字段名首次出现时 `MUST` 给出对象路径，如 `hotReload.signature`、`ui.bind[].to`。

## 6. 链接约定

- 仓库内链接用相对路径，`docs/` → `../spec/...`，`spec/` → `../docs/...`
- CI 会检查 `README.md` 的所有本地链接是否存在
- 外部链接只用于标准／工具官网，不用于证明 AXP 语义

## 7. 措辞约定

| 用 | 不用 |
|---|---|
| 同级独立格式 | 收编 / 上层 / 元格式 / 桥 / 兼容层 |
| 表达能力覆盖 | （在规范正文里）罗列外部格式字段名 |
| 宿主实现细节 | 协议 / 握手 / 方法表（作为格式的一部分描述） |
| `impl.proc` 通用外部进程 | 点名某个外部协议名 |

---

<a id="file-32"></a>

## 32. `axp/docs/domains-tutorial.md`

# 教程 · 用 `axp://` 标准域感知环境（M3）

> 状态：Stable
> 适用：AXP v1.x · Android API 26+ · 宿主 AXP-1+
> 最后更新：2026-11-14

规范定义见 [`../spec/05-domains.md`](../spec/05-domains.md)，可直接抄的示例见 [`../test/fixtures/04-domains/`](../test/fixtures/04-domains/)。

## 前置条件

- 完成 [`plugin-tutorial.md`](plugin-tutorial.md) 与 [`ui-tutorial.md`](ui-tutorial.md)
- 宿主实现 §8 装载流水线、Surface 订阅与 `ui.bind`
- 读过 `spec/05-domains.md` 的 13 个标准域总表

## 步骤 1 · 选域，别自己发明 URI

宿主内置 13 个域，每个域规定了 `views` / `anchor` / `watchable` / 最低权限：

| 域 | URI 模式 | anchor | 可订阅 | 最低权限 |
|---|---|---|---|---|
| `fs` | `axp://fs/<path>` | line / offset / range | ✅ | L1 |
| `screen` | `axp://screen` | node | ✅ | L2 |
| `app` | `axp://app/<package>` | uri | ✅ | L1 |
| `notification` | `axp://notification/stream` | uri | ✅ | L1 |
| `intent` | `axp://intent/<action>` | uri | ✅ | L1 |
| `sensor` | `axp://sensor/<type>` | uri | ✅ | L1 |
| `clipboard` | `axp://clipboard` | uri | ✅ | L1 |
| `telephony` | `axp://telephony/<kind>` | uri | ✅ | L1 |
| `logcat` | `axp://logcat` | line | ✅ | L3 |
| `pm` | `axp://pm/<package>` | uri | ❌ | L3 |
| `media` | `axp://media/<id>` | uri | ✅ | L1 |
| `net` | `axp://net/<iface>` | uri | ✅ | L1 |
| `sysprop` | `axp://sysprop/<key>` | uri | ❌ | L3 |

要用宿主没有的域，用 `axp://x/<自身插件 id>/<name>` 注册自定义域（前缀强制，防抢占）。

## 步骤 2 · 声明 Surface

```jsonc
{
  "uri": "axp://fs/{path}",          // {} 是 URI 模板，宿主订阅时展开
  "views": ["text", "tree", "tokens", "diagnostics"],
  "anchor": "line",                  // 配合 #L12:C3 之类的定位
  "watchable": true,                 // 支持订阅增量
  "auth": "L1",
  "impl": { "js": "surfaces/fs.js" }
}
```

三个字段各管一件事，别混：

- `views` —— 同一实体的**多种呈现**（文本、树、图像、符号、诊断）
- `anchor` —— **怎么定位**（节点 / 行列 / 偏移 / 范围 / URI）
- `watchable` —— **能不能订阅变更流**

`pm` 与 `sysprop` 在标准域表里是 ❌，声明时 `watchable` 保持 `false`，也**不要**把它们写进 `ui.bind[].from` 或 `events[].on`。

## 步骤 3 · 把流接到界面

```jsonc
"ui": {
  "panel": { "kind": "dsl", "entry": "ui/panel.json" },
  "bind": [
    { "from": "axp://screen", "to": "ui.panel.screenTree" },
    { "from": "axp://notification/stream", "to": "ui.panel.notify" },
    { "from": "axp://sensor/motion", "to": "ui.panel.motion" }
  ]
}
```

`to` 格式固定 `ui.panel.<node-id>[.<prop>]`，`MUST` 能在 `panel.json` 里解析到节点，否则装载报 `UI_BIND_TARGET_MISSING`。`from` 指向的 Surface `MUST` 是 `watchable: true`，否则 `SURFACE_NOT_WATCHABLE`。

界面节点里也可以用内联表达式，二者等价：

```json
{ "id": "screenTree", "type": "Text",
  "props": { "text": "${surface:axp://screen.tree}", "style": "mono" } }
```

见 [`../spec/06-ui-vocab.md`](../spec/06-ui-vocab.md) §4。

## 步骤 4 · 把流当事件源

```jsonc
"events": [
  { "on": "axp://notification/stream",
    "filter": "text~'验证码'",
    "run": { "js": "events/otp.js" },
    "privilege": "L1" },
  { "on": "lifecycle/tool.before",
    "when": { "tool": "sys.readProp" },
    "run": { "js": "events/audit-read.js" } }
]
```

两类触发源：① 任意 `watchable` Surface 流 + `filter`；② 生命周期命名空间。这是 AXP 相对固定 hook 事件表的增量。

## 步骤 5 · 权限按域分层

```jsonc
"capabilities": {
  "privilege": "L3",
  "requests": [
    "accessibility.read",       // screen (L2)
    "notification.listen",      // notification
    "sensor.motion",            // sensor
    "clipboard.read",           // clipboard
    "net.stat",                 // net
    "sysprop.read",             // sysprop (L3)
    "logcat.read",              // logcat (L3)
    "fs.read:app"               // fs
  ],
  "dangerous": ["accessibility.read", "sysprop.read", "logcat.read"]
}
```

`requests` 必须是 [`../spec/04-capabilities.md`](../spec/04-capabilities.md) 词汇表里的项，否则 `CAP_UNKNOWN_REQUEST`。`dangerous` 必须是 `requests` 的子集，宿主装载时单独向用户确认。

同一工具在不同权限层走不同实现，用 `gradient`：

```jsonc
"gradient": {
  "L1": { "impl": { "js": "tools/read-file.js" } },
  "L3": { "impl": { "js": "tools/read-file.js", "proc": { "cmd": "bin/read-file", "args": [] } } }
}
```

宿主按「当前可用最高层 → 该层内按 `native > kotlin > wasm > bin > js > proc > url` 选形态」降级，见 [`../spec/03-impl-reference.md`](../spec/03-impl-reference.md) §2。

## 步骤 6 · 校验

```bash
node validator/src/validate.mjs test/fixtures/04-domains
node cli/bin/axp.mjs inspect test/fixtures/04-domains
```

## 验证

- [ ] 校验全绿，8 个 Surface / 3 个 tool / 1 个 agent / 2 个 event
- [ ] 5 条 `ui.bind` 的 `from` 全部指向 `watchable: true` 的域
- [ ] `sysprop` / `logcat` 类 L3 请求都列进了 `dangerous`
- [ ] 把 `gradient` 键写成 `L4`（超过 `privilege: L3`）→ `GRADIENT_EXCEEDS_PRIVILEGE`
- [ ] 把自定义域写成 `axp://x/other.plugin/foo` → 校验拒绝（前缀必须是自身 id）

## 常见错误

| 现象 | 原因 | 处理 |
|---|---|---|
| `SURFACE_NOT_WATCHABLE` | 把 `pm` / `sysprop` 这类不可订阅域写进 `bind` / `events` | 改用可订阅域，或改成 tool 主动读取 |
| `UI_BIND_TARGET_MISSING` | `to` 的 node-id 在 `panel.json` 里不存在 | 对齐节点 id |
| `CAP_UNKNOWN_REQUEST` | 权限名拼错或用通配符 host | 查 `04-capabilities.md` 词汇表 |
| 自定义域被拒 | 前缀不是 `axp://x/<自身 id>/` | 换成自身 `id` |
| 面板不刷新 | 宿主没实现 `watchable` 增量推送 / 背压 | 见 [`runtime-guide.md`](runtime-guide.md) 步骤 3 |
| 真机上读屏为空 | 未拿到 L2 无障碍授权 | 单独确认 `accessibility.read` |

## 下一步

- 让插件热更新不重启 → [`hot-reload-tutorial.md`](hot-reload-tutorial.md)
- 把标准域接到真机 → [`runtime-guide.md`](runtime-guide.md) 步骤 4 的 `HostBridge.surface()` 对照表

---

<a id="file-33"></a>

## 33. `axp/docs/faq.md`

# FAQ

> 状态：Stable
> 适用：AXP v1.x
> 最后更新：2026-11-14

## 定位

### AXP 和 MCP / LSP / Skills / Claude Plugins / OpenCode / DSH 是什么关系？

**同级独立规范**。各自定义自己的清单与组件语义，互不导入、互不桥接、互不内嵌。AXP 不是它们的上层格式，也不是适配层。

那「包含他们的能力」怎么理解？—— 是**表达能力覆盖**：那些格式里出现过的组件类型（工具、资源、提示、子代理、钩子、命令、反向通道），在 AXP 里都有对应声明写法，逐字段证明在 [`../spec/07-expression-map.md`](../spec/07-expression-map.md)。「能表达」不等于「能装载」：AXP 宿主只装载 `.axp` 包。

### 为什么规范正文里不能出现它们的字段名？

因为一旦正文借用外部格式的字段名，读起来就像依附于它们的兼容层，而不是一套自己定义语义的独立格式。所以 `01-format.md` 自己定义 `tools` / `surfaces` / `knowledge` / `agents` / `events` / `ui`，映射表整体放到 `07` 作为验收材料。

### 那 `impl.proc` 是不是变相接入外部协议？

不是。`proc` 只声明「有一个外部进程、怎么拉起」（`cmd` / `args` / `cwd` / `env`），**不假定**它用什么协议、什么方法表、什么消息格式。宿主自己决定通信方式，这属于宿主实现细节，不进格式。任何以进程形式提供能力的实现，在 AXP 里都只是一条普通声明。

### 能直接把别的格式的插件装进 AXP 宿主吗？

不能，也不需要。按 `07` 的映射方法把它的组件重写成 `axp.json` 即可。重写产物是一个原生 `.axp` 包，运行时不依赖原体系。

## 字段设计

### 为什么 `hotReload.signature` 强制 `on-every-load`？

安装时验过一次不够：热加载会在进程存活期间反复换实现体，每一次都必须是可信且未扩大权限的。规范还要求比对 `id` / `capabilities.privilege` 未变、组件 id 未新增。见 [`../spec/08-hot-reload.md`](../spec/08-hot-reload.md) §3.3。

### `allowDynamicCode: false` 为什么还能热加载？

两者管的是不同事：前者禁「运行时从网络下载**未签名**代码并执行」；热加载是「用**可信源、已签名**的实现体替换已声明组件」。校验器 `MUST NOT` 把 `allowDynamicCode: false` 单独当作拒绝理由，但 `MUST` 拒绝 `sources` 含 `network-unsigned` 或 `signature != on-every-load`。见 [`../spec/04-capabilities.md`](../spec/04-capabilities.md) §5。

### `ui{}` 为什么还要 `lifecycle / bind / actions`？

只声明「界面文件在哪」界面是死的。`bind` 把 Surface 数据流接到节点（自动刷新），`actions` 把界面动作回填到本包工具，`lifecycle` 让热替换时状态能迁移、旧资源能释放。见 [`../spec/06-ui-vocab.md`](../spec/06-ui-vocab.md)。

### 为什么 schema 用 `additionalProperties: false`？

清单是安全边界。宽容解析下，未知字段可能携带未声明的能力；严格模式让旧宿主明确拒绝并提示升级，而不是猜语义。见 [`../spec/09-versioning.md`](../spec/09-versioning.md) §2。

### `gradient` 解决什么问题？

同一个「点击」在 L2 用无障碍、L3 用 shell、L4 用 root。以前这些 `if-else` 写在插件代码里，现在写成格式声明，宿主按当前可用最高层自动选并逐级回退。任何外部格式都没有这个概念。

## 工程

### 我要开 GitHub 仓库，最小需要哪些文件？

`spec/01-format.md` + `spec/02-manifest.schema.json` + `validator/` + `cli/` + 一个 fixture + `README.md` + CI。本仓库已全部备齐，clone 后改 `OWNER` 占位符即可 push。见 [`../CONTRIBUTING.md`](../CONTRIBUTING.md)。

### 校验器依赖 npm 包吗？

不依赖。`validator/src/validate.mjs` 用 Node 内置模块自包含实现，离线可跑，方便放进任意 CI。

### 宿主必须实现到哪一级？

按场景：只调工具 → AXP-0；要界面和热加载 → AXP-3。等级定义见 [`../spec/01-format.md`](../spec/01-format.md) §11，自检表见 [`host-checklist.md`](host-checklist.md)。

### 内容可信度？

本仓库是 AI 辅助生成的规范草案与工程起点。落地前请按 `host-checklist.md` 逐项验证，尤其是签名、权限梯度与热加载回滚三条安全路径。

---

<a id="file-34"></a>

## 34. `axp/docs/github-setup.md`

# 在 GitHub 上开仓库 · 操作指南

> 状态：Stable
> 适用：AXP v1.x
> 最后更新：2026-11-14

本文件把本目录变成一个可直接 push 的 GitHub 仓库。文档格式约定见 [`doc-templates.md`](doc-templates.md)，贡献规则见 [`../CONTRIBUTING.md`](../CONTRIBUTING.md)。

## 前置条件

| 项 | 要求 |
|---|---|
| Git | 任意近期版本 |
| Node.js | 20+（validator / CLI / CI） |
| Python | 3.x（`axp pack` 用内置 `zipfile`） |
| GitHub CLI | 可选，用于 `gh repo create`；不用也可用网页新建 |
| GitHub 账号 | 有建仓库权限 |

## 步骤 1 · 本地初始化

```bash
cd axp                      # 本目录（含 README.md / spec/ / docs/ / .github/）
git init -b main
```

目录本身就是仓库根，**不要**再套一层 `axp/`：

```
<repo>/
├── README.md               ← GitHub 首屏
├── spec/
├── docs/
├── validator/ cli/ sdk/ runtime/ examples/
└── .github/
```

## 步骤 2 · 替换 `OWNER` 占位符

`README.md` 的徽章链接用了 `OWNER/axp` 占位。改成你的用户名或组织名：

```bash
OWNER=your-github-name
sed -i "s|OWNER/axp|${OWNER}/axp|g" README.md
```

同时把 `LICENSE` 里的 `Copyright (c) 2026 AXP Contributors` 改成实际主体（可选）。

## 步骤 3 · 首次自检（push 前 MUST）

```bash
# 1. schema 可解析
node -e "JSON.parse(require('fs').readFileSync('spec/02-manifest.schema.json','utf8')); console.log('schema OK')"

# 2. 四个示例全绿
for d in examples/*/; do node validator/src/validate.mjs "$d" || exit 1; done

# 3. pack 可用
node cli/bin/axp.mjs pack examples/01-hello -o /tmp/hello.axp

# 3b. 四套自检（CI 会跑同一组）
node validator/test/run-tests.mjs
python3 validator/test/schema-crosscheck.py      # 需 pip install jsonschema==4.26.0
node runtime/test/smoke.mjs

# 4. README 本地链接无断链
node - <<'NODE'
const fs=require('fs');
const links=[...fs.readFileSync('README.md','utf8').matchAll(/\]\(([^)#]+)\)/g)].map(m=>m[1]);
const bad=links.filter(l=>!l.startsWith('http')&&!fs.existsSync(l));
console.log(bad.length? 'broken: '+bad.join(', ') : 'all local links OK');
if(bad.length) process.exit(1);
NODE
```

## 步骤 4 · 首次提交

```bash
git add .
git commit -m "chore: initial AXP v1.0 spec, validator, CLI, docs and examples"
```

`.gitignore` 已排除 `*.axp`（打包产物）、`node_modules/`、IDE 文件。

## 步骤 5 · 创建远端并推送

二选一。

**A. 用 GitHub CLI**

```bash
gh repo create axp --public --source=. --remote=origin --push \
  --description "AXP — an independent, Android-native plugin description format"
```

**B. 先在网页新建空仓库，再关联**

```bash
git remote add origin https://github.com/<OWNER>/axp.git
git push -u origin main
```

## 步骤 6 · 开启 CI

`.github/workflows/ci.yml` 已就位，push 后自动跑：

- schema 可解析
- 四个示例清单校验
- `axp pack` 打包并确认产物含 `axp.json`
- README 本地链接检查

在仓库 Settings → Branches 建议加一条保护规则：要求 `CI` 通过后才允许合并到 `main`。

## 步骤 7 · 发布规范版本

```bash
git tag -a spec-v1.0.0 -m "AXP Format Specification v1.0.0"
git push origin spec-v1.0.0
```

Release 附件建议包含（见 [`../spec/09-versioning.md`](../spec/09-versioning.md) §6）：

```bash
zip -r axp-spec-v1.0.0.zip spec/ CHANGELOG.md
```

用 `gh release create spec-v1.0.0 axp-spec-v1.0.0.zip --title "AXP v1.0.0" --notes-file CHANGELOG.md` 发布。

## 步骤 8 · 后续协作

| 场景 | 入口 |
|---|---|
| 改格式字段 | `.github/ISSUE_TEMPLATE/spec-change.md` 提案 → PR |
| 改 schema / validator | PR + 新增测试用例 |
| 加教程 / 示例 | PR，按 [`doc-templates.md`](doc-templates.md) 格式 |
| 提交信息 | `<type>(<scope>): <subject>`，见 [`../CONTRIBUTING.md`](../CONTRIBUTING.md) |

## 验证

- [ ] GitHub 首屏 README 正常渲染，徽章指向本仓库
- [ ] Actions 里 `CI` 一次通过（四个示例清单校验）
- [ ] `spec/01-format.md` 在 GitHub 上目录/表格渲染正常
- [ ] `spec-v1.0.0` tag 与 Release 产物可下载
- [ ] 用 `axp new` 生成的插件能 `validate` 全绿

## 常见错误

| 现象 | 原因 | 处理 |
|---|---|---|
| CI 报 `schema OK` 失败 | `02-manifest.schema.json` 里有注释或尾逗号 | schema 必须是严格 JSON，注释只放 `.md` 的 `jsonc` 片段里 |
| CI 报 `UNDECLARED_EXECUTABLE` | 新增了 `.js` 但没在 `axp.json` 引用 | 在 `impl` / `entry` / `ui.lifecycle` 里声明 |
| `axp pack` 报 zip failed | 运行环境无 `python3` | 装 Python 3，或改用系统 `zip` |
| 徽章显示 404 | 没替换 `OWNER` | 执行步骤 2 |
| 多了一层 `axp/axp/` | 在父目录 `git init` 了 | 在 `axp/` 目录内初始化 |

## 关于「在 GitHub 上完成」

仓库内容、CI、模板、教程已全部备齐。远端仓库的创建与 push 需要在你自己的 GitHub 账号下完成（步骤 5）；本指南给出可直接复制的命令。

---

<a id="file-35"></a>

## 35. `axp/docs/host-checklist.md`

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
node validator/src/validate.mjs test/fixtures/01-hello
node validator/src/validate.mjs test/fixtures/02-ui-panel
node validator/src/validate.mjs test/fixtures/03-hot-reload
node validator/src/validate.mjs test/fixtures/04-domains
node validator/test/run-tests.mjs
python3 validator/test/schema-crosscheck.py
node runtime/test/smoke.mjs
```

四个示例全绿 + 三套测试全绿（31 / 47 / 30），是发布的最低门槛。

---

<a id="file-36"></a>

## 36. `axp/docs/hot-reload-tutorial.md`

# 教程 · 不重启宿主替换插件实现体

> 状态：Stable
> 适用：AXP v1.x · Android API 26+ · 宿主 AXP-3
> 最后更新：2026-11-14

热加载在 AXP 里是清单字段 `hotReload{}`，不是宿主私有开关。规范见 [`../spec/08-hot-reload.md`](../spec/08-hot-reload.md)。

## 前置条件

- 完成 [`plugin-tutorial.md`](plugin-tutorial.md) 与 [`ui-tutorial.md`](ui-tutorial.md)
- 宿主支持隔离类加载器、每次验签、状态迁移、回滚（见 [`integration-guide.md`](integration-guide.md) 步骤 9）
- 已用 APK v3 签名，且新旧包**同一发布者证书**

## 步骤 1 · 在清单里声明 `hotReload`

```jsonc
"hotReload": {
  "enabled": true,
  "unit": "component",
  "targets": ["ui.*", "tools.demo.*", "knowledge.*"],
  "strategy": "graceful",
  "signature": "on-every-load",
  "sources": ["package", "trusted-channel"],
  "state": {
    "migrate": "ui/state.migrate.json",
    "preserve": ["ui.panel.scroll", "agents.*.history"]
  },
  "rollback": { "keep": 2, "onError": true },
  "uiRebuild": "recompose",
  "classloader": "isolated"
}
```

四个硬性值（校验器会强制）：

| 字段 | 必须是 | 为什么 |
|---|---|---|
| `signature` | `on-every-load` | 不能复用安装时的验签结果 |
| `sources` | 不含 `network-unsigned` | 禁止未签名网络代码 |
| `classloader` | `isolated` | `dex` / `wasm` 否则在 Android 上卸不掉 |
| `uiRebuild` | 必须显式声明 | 决定界面怎么重建 |

> **`runtime.allowDynamicCode: false` 依然可以热加载。** 它禁的是「网络未签名代码」，热加载是「可信源已签名替换」。别把两者混为一谈。

## 步骤 2 · 写状态迁移映射

```json
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

`state.preserve` 里的键跳过 `map` 原样保留。迁移失败 → 按 `rollback.onError` 回滚。

## 步骤 3 · 准备新版本

只改**实现体**与 `version`，不要改这些：

| 可以改 | 不能改（必须走完整重装） |
|---|---|
| `tools[].impl` 指向的文件内容 | `axp` 格式版本 |
| `ui/panel.json` 节点 | `id` |
| `knowledge[].entry` 的 `.md` | `capabilities.privilege` |
| `version` | 新增组件 id / 新增 `requests` |

第 3 条是安全底线：**热加载不得用来提权**。

```bash
node cli/bin/axp.mjs pack plugins/panel -o panel-1.1.0.axp
apksigner sign --v3 --ks release.jks panel-1.1.0.axp
```

## 步骤 4 · 发起替换

```kotlin
host.applyHotReplace(AxpBundle.fromFile("panel-1.1.0.axp"))
```

宿主内部依次执行（状态机见 [`../spec/08-hot-reload.md`](../spec/08-hot-reload.md) §2）：

```
VERIFYING  → 每次重新验签 + 比对 publisher + id/privilege 未扩大
STAGING    → 新隔离类加载器，旧代保留为回滚快照
MIGRATE    → state.migrate / preserve
SWAPPED    → onUnload(旧) → 组件换 → uiRebuild → onReload(新)
失败       → ROLLED BACK（回滚也验签） + 审计
```

`strategy: graceful` 会等当前会话空闲再切；`immediate` 会提示用户；`next-session` 下次装载生效。

## 步骤 5 · 验证

```bash
node validator/src/validate.mjs plugins/panel
```

运行时检查：

- [ ] 替换后界面文案 / 布局更新，**宿主进程未重启**
- [ ] `ui.panel.scroll` 位置保留
- [ ] 旧 `.dex` 在无引用后被 GC 回收（用内存工具确认）
- [ ] 把新包 `privilege` 偷偷改成 `L3` → 拒绝 `HOT_PRIVILEGE_ESCALATION`
- [ ] 用另一张证书签名 → 拒绝 `HOT_SIGNATURE_FAILED`
- [ ] 让 `onReload` 抛错 → 自动回滚到 1.0.0，界面仍可用
- [ ] 审计日志有完整一条记录（发起方、代号、结果）

## 常见错误

| 报错 / 现象 | 原因 | 修法 |
|---|---|---|
| `HOT_SIGNATURE_POLICY` | `signature` 写成 `on-install` | 改 `on-every-load` |
| `HOT_UNSIGNED_SOURCE` | `sources` 含 `network-unsigned` | 只留 `package` / `trusted-channel` / `preinstall` |
| `HOT_PRIVILEGE_ESCALATION` | 新包权限更高 | 走完整重装 |
| `HOT_NEW_COMPONENT` | 新包加了组件 id | 走完整重装 |
| 旧类还在内存 | `classloader: "shared"` | 改 `isolated` |
| 界面闪一下又回退 | `onReload` 超时或抛错 | 查回调日志，或临时设 `strategy: next-session` |

## 完整示例

[`test/fixtures/03-hot-reload`](../test/fixtures/03-hot-reload) 覆盖六类组件 + UI + 热加载，可直接 `axp validate` 通过。

---

<a id="file-37"></a>

## 37. `axp/docs/integration-guide.md`

# 宿主集成教程：把 AXP 接进你的 Android 应用

> 状态：Stable
> 适用：AXP v1.x · Android API 26+
> 最后更新：2026-11-14

本教程面向**宿主开发者**：让一个 Android 应用能够装载、校验、调度 `.axp` 插件，并支持 UI 与热加载。规范依据见 [`../spec/01-format.md`](../spec/01-format.md)，合规自检见 [`host-checklist.md`](host-checklist.md)。

---

## 前置条件

| 项 | 要求 |
|---|---|
| Android | API 26+（`minAndroid` 字段下限） |
| 语言 | Kotlin 1.9+（Java 亦可） |
| JS 引擎 | QuickJS / Hermes 任一，用于 `impl.js` 与 `ui.lifecycle` 回调 |
| 签名 | APK Signature Scheme v3 校验能力 |
| 依赖 | `axp-validator`（CI 侧）、`kotlinx-serialization`、`androidx.compose`（UI 等级 AXP-2+） |
| 权限 | 按插件 `capabilities.requests` 动态申请，见步骤 2 |

> 你**不需要**实现任何外部插件协议、握手或方法表。AXP 只定义声明；通信方式完全由你决定。

---

## 步骤 1 · 引入依赖

```kotlin
// build.gradle.kts (app)
dependencies {
    implementation("androidx.compose.ui:ui:1.6.0")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.0")
    implementation("com.github.axp:axp-runtime:1.0.0")   // 参考实现，或按本教程自建
}
```

CI 侧把仓库的 `validator/` 作为校验步骤：

```yaml
# .github/workflows/validate-plugins.yml
- run: node validator/src/validate.mjs path/to/plugin
```

---

## 步骤 2 · 声明权限（AndroidManifest）

只声明宿主自身可能用到的最大集合，实际授予由插件清单驱动：

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />

<service
    android:name=".AxpAccessibilityService"
    android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE"
    android:exported="false">
    <intent-filter>
        <action android:name="android.accessibilityservice.AccessibilityService" />
    </intent-filter>
    <meta-data
        android:name="android.accessibilityservice"
        android:resource="@xml/axp_accessibility_config" />
</service>
```

L3（Shizuku）、L4（root）、L5（系统注入）按需接入，**不要在未授权时提前初始化**。

---

## 步骤 3 · 实现 `HostBridge`

宿主与格式之间的唯一接缝。你只需要实现这 6 个方法：

```kotlin
interface HostBridge {
    /** 1. 读取并解析 axp.json */
    fun readManifest(bundle: AxpBundle): AxpManifest

    /** 2. 校验签名并返回发布者指纹；热加载时每次调用 */
    fun verifySignature(bundle: AxpBundle, expected: String): VerifyResult

    /** 3. 当前已获授权的层集合，如 setOf(L0, L1, L2) */
    fun grantedPrivileges(): Set<Privilege>

    /** 4. 按 impl 选择一个可用实现体（见 spec/03） */
    fun selectImpl(impl: Impl, privilege: Privilege): ImplHandle?

    /** 5. 反向通道：sampling / elicitation / ui.push / audit.read */
    fun runtimeService(name: String, request: JsonObject): JsonElement

    /** 6. Surface 订阅与 UI 挂载 */
    fun surface(uri: String): SurfaceStream
    fun mountUi(manifest: AxpManifest, panel: PanelNode): UiHandle
}
```

**关键点**：`HostBridge` 里没有任何外部协议类型。进程怎么通信、消息怎么序列化，是你自己的实现细节。

---

## 步骤 4 · 装载流水线（9 步）

```kotlin
fun load(bundle: AxpBundle): Result<LoadedPlugin> = runCatching {
    val m = bridge.readManifest(bundle)                       // 1 解析
    SchemaValidator.validate(m, schemaV1)                    // 2 结构校验
    require(bridge.verifySignature(bundle, m.distribution.publisher).ok)  // 3 验签
    ReferenceChecker.check(bundle, m)                        // 4 引用完整性
    AbiChecker.check(bundle, m.abis)                         // 5 abis 一致性
    DependencyResolver.resolve(m.requires)                   // 6 依赖闭包
    PrivilegeGate.check(m, bridge.grantedPrivileges())       // 7 权限校验
    val registry = ComponentRegistry.register(m)             // 8 注册组件
    m.ui?.let { bridge.mountUi(m, UiParser.parse(it.panel)) } // 9 UI 挂载
    if (m.hotReload?.enabled == true) HotReloadAgent.prepare(m.hotReload)
    LoadedPlugin(m, registry)
}
```

任一步失败 `MUST` 整包拒绝，`MUST NOT` 部分注册。错误码见 [`../validator/README.md`](../validator/README.md)。

时序：

```
App ──▶ load(bundle)
          ├─ readManifest ─▶ verifySignature ─▶ schema ─▶ refs ─▶ abis
          ├─ deps ─▶ privilegeGate ─▶ register
          ├─ mountUi ─▶ ui.lifecycle.onLoad
          └─ HotReloadAgent.prepare  (隔离类加载器 + 快照)
```

---

## 步骤 5 · 工具调度与确认

```kotlin
fun invoke(toolId: String, args: JsonObject): JsonObject {
    val tool = registry.tool(toolId) ?: error("TOOL_NOT_FOUND")
    val impl = gradientOrImpl(tool, bridge.grantedPrivileges())  // 见步骤 7
        ?: return JsonObject(mapOf("unavailable" to JsonPrimitive(true)))

    if (tool.confirm || tool.sideEffects == SideEffects.DESTRUCTIVE) {
        require(userConfirm(tool)) { "USER_REJECTED" }
    }
    audit.record(toolId, impl, args)
    return bridge.selectImpl(impl, currentPrivilege)!!.call(args)
}
```

`sideEffects = destructive` 时 `confirm` 强制为 `true`（校验器也会检查）。

---

## 步骤 6 · Surface 订阅与事件

```kotlin
m.surfaces.filter { it.watchable }.forEach { s ->
    bridge.surface(s.uri).collect { delta ->
        m.events.filter { it.on == s.uri && match(it.filter, delta) }
                .forEach { runImpl(it.run) }
        m.ui?.bind?.filter { it.from == s.uri }
                ?.forEach { uiHandle.update(it.to, delta) }
    }
}
```

`ui.bind` 让界面自动刷新，不需要插件自己写刷新逻辑。

---

## 步骤 7 · 权限梯度选择（核心算法）

```kotlin
fun gradientOrImpl(tool: Tool, granted: Set<Privilege>): Impl? {
    val ceiling = minOf(m.capabilities.privilege, granted.maxOrNull() ?: L0)
    for (l in ceiling downTo L0) {
        tool.gradient[l.toString()]?.impl
            ?.let { bridge.selectImpl(it, l)?.let { return it.impl } }
    }
    return tool.impl?.takeIf { bridge.selectImpl(it, ceiling) != null }
}
```

宿主 `MUST` 把每次选用结果写进审计日志。无可用路径时工具标记 `unavailable`，**不要崩**。

---

## 步骤 8 · UI 挂载与数据绑定

```kotlin
val panel = UiParser.parse(m.ui.panel.entry)      // spec/06 节点词汇
val handle = bridge.mountUi(m, panel)

m.ui.bind.forEach { b ->
    require(panel.resolve(b.to) != null) { "UI_BIND_TARGET_MISSING: ${b.to}" }
}
m.ui.actions.forEach { a ->
    require(registry.hasTool(a.tool)) { "UI_ACTION_TOOL_MISSING: ${a.tool}" }
}
m.ui.lifecycle?.onLoad?.let { runScript(it, mapOf("state" to panel.state)) }
```

`ui.actions[].tool` `MUST` 指向本包 `tools[].id`，否则装载失败。

---

## 步骤 9 · 接入热加载

```kotlin
fun applyHotReplace(newBundle: AxpBundle) {
    val cfg = m.hotReload ?: error("HOT_DISABLED")
    require(cfg.enabled) { "HOT_DISABLED" }
    require(cfg.signature == ON_EVERY_LOAD) { "HOT_SIGNATURE_POLICY" }

    // 1 每次替换重新验签（不可复用安装时结果）
    val v = bridge.verifySignature(newBundle, m.distribution.publisher)
    require(v.ok && v.publisher == m.distribution.publisher) { "HOT_SIGNATURE_FAILED" }

    // 2 不得提权、不得新增组件 id
    val nm = bridge.readManifest(newBundle)
    require(nm.id == m.id && nm.capabilities.privilege <= m.capabilities.privilege) {
        "HOT_PRIVILEGE_ESCALATION"
    }
    require(nm.componentIds().all { it in m.componentIds() }) { "HOT_NEW_COMPONENT" }
    require(cfg.targets.any { t -> nm.changedComponents(m).all { c -> c.matches(t) } }) {
        "HOT_TARGET_MISMATCH"
    }

    // 3 隔离类加载器 + 状态迁移
    val loader = IsolatedClassLoader(newBundle)   // 每代一个新实例，旧代可回收
    val state = StateMigrator.migrate(panel.state, cfg.state)

    // 4 卸载旧界面 → 切换 → 重建
    m.ui?.lifecycle?.onUnload?.let { runScript(it, mapOf("state" to panel.state)) }
    registry.swap(nm, loader)
    when (cfg.uiRebuild) {
        RECOMPOSE          -> handle.recompose(UiParser.parse(nm.ui?.panel?.entry), state)
        RECREATE_ACTIVITY  -> activity.recreate(state)
        RESTART_HOST       -> scheduleRestart(state)
    }
    m.ui?.lifecycle?.onReload?.let { runScript(it, mapOf("oldState" to panel.state, "newState" to state)) }

    // 5 失败回滚（回滚同样验签）
}.onFailure { e ->
    if (m.hotReload?.rollback?.onError == true) HotReloadAgent.rollback()
    audit.record("hot-reload", e)
}
```

完整状态机与约束见 [`../spec/08-hot-reload.md`](../spec/08-hot-reload.md)，端到端教程见 [`hot-reload-tutorial.md`](hot-reload-tutorial.md)。

> **边界提醒**：`runtime.allowDynamicCode: false` **不是**拒绝热加载的理由。它禁止的是「网络未签名代码」，热加载是「可信源已签名实现体替换」。校验器 `MUST` 按 [`../spec/04-capabilities.md`](../spec/04-capabilities.md) §5 实现。

---

## 步骤 10 · 接入 CI

```yaml
- name: Validate plugin manifests
  run: |
    for d in plugins/*/; do
      node vendor/axp/validator/src/validate.mjs "$d"
    done
```

发布前用 `axp pack` 生成 `.axp` 并签名：

```bash
node cli/bin/axp.mjs pack plugins/my-plugin -o my-plugin.axp
apksigner sign --v3 --ks release.jks my-plugin.axp
```

---

## 验证

| 检查 | 期望 |
|---|---|
| `node validator/src/validate.mjs test/fixtures/01-hello` | 全绿 |
| 装载 `test/fixtures/02-ui-panel` | 面板出现，`ui.bind` 数据刷新 |
| 装载 `test/fixtures/03-hot-reload` 并执行替换 | 界面更新、state 保留、不重启进程 |
| `node validator/src/validate.mjs test/fixtures/04-domains` | 全绿，8 个标准域 / 5 条 `ui.bind` |
| 故意把 `gradient` 键写成 `L4` 而 `privilege: L2` | 校验失败 `GRADIENT_EXCEEDS_PRIVILEGE` |
| 把 `hotReload.signature` 改成 `on-install` | 校验失败 `HOT_SIGNATURE_POLICY` |

逐项勾选表见 [`host-checklist.md`](host-checklist.md)。

---

## 常见错误

| 现象 | 原因 | 处理 |
|---|---|---|
| 校验报 `CAP_UNKNOWN_REQUEST` | `requests` 用了词汇表外的名字 | 查 [`../spec/04-capabilities.md`](../spec/04-capabilities.md) |
| 热加载后旧 dex 仍占内存 | 用了 `classloader: "shared"` | 改 `isolated`，每代新 `DexClassLoader` |
| `ui.bind` 不刷新 | `from` 指向的 Surface 未 `watchable: true` | 打开 `watchable` |
| 工具在某些机型直接 unavailable | 只有 `native` 实现且 `abis` 不含该架构 | 补 `js` 降级实现 |
| 校验器误杀热加载 | 把 `allowDynamicCode:false` 当成一刀切 | 按 §9 修正判定逻辑 |
| 想直接装载别的格式插件 | 定位误解 | AXP 宿主只装载 `.axp` 包，见 [`faq.md`](faq.md) |


---

## 2026-11 补：直接可用的真机工程

本教程是**规范层**的宿主集成说明（Kotlin/Compose 写法）。
如果你要的是「现在就能 `./gradlew installDebug` 装到手机上」的完整 App，见独立仓 `axp-android-host/`
与 [`cookbook-android-host.md`](cookbook-android-host.md)：纯 Java + Android framework，零第三方依赖，
已实现 AXP-0/1/2 的装载、安装、插件界面、Agent 工具集与 `ctx.storage`。

---

<a id="file-38"></a>

## 38. `axp/docs/plugin-tutorial.md`

# 教程 · 5 分钟写第一个 AXP 插件

> 状态：Stable
> 适用：AXP v1.x · Android API 26+
> 最后更新：2026-11-14

## 前置条件

- Node.js 20+（只用于 `axp` CLI 与校验器）
- 本仓库已 clone
- 一个支持 AXP-0 以上的 Android 宿主（见 [`integration-guide.md`](integration-guide.md)）

## 步骤 1 · 生成骨架

```bash
node cli/bin/axp.mjs new com.example.hello -o plugins/hello
```

生成：

```
plugins/hello/
├── axp.json
├── tools/hello.js
└── README.md
```

## 步骤 2 · 写清单

```json
{
  "axp": "1.0",
  "id": "com.example.hello",
  "name": { "zh": "你好插件", "en": "Hello" },
  "version": "1.0.0",
  "minAndroid": 26,
  "abis": [],
  "tools": [
    {
      "id": "demo.echo",
      "description": "原样返回输入文本",
      "input": {
        "type": "object",
        "properties": { "text": { "type": "string" } },
        "required": ["text"]
      },
      "output": { "type": "object" },
      "impl": { "js": "tools/hello.js" },
      "sideEffects": "none",
      "cost": "fast"
    }
  ],
  "capabilities": { "privilege": "L0", "requests": [] },
  "instances": { "multi": false },
  "runtime": { "memoryMB": 32, "cpuPct": 5, "allowDynamicCode": false },
  "distribution": {
    "channel": "session-install",
    "publisher": "sha256:REPLACE_WITH_YOUR_CERT_FINGERPRINT",
    "signatureScheme": "apk-v3"
  }
}
```

> `L0` = 纯计算沙箱，不需要任何 Android 权限。这是最安全的起点。

## 步骤 3 · 写实现体

```js
// tools/hello.js —— 实现体可以是任意语言任意格式，这里用最简的 JS
export function run(args) {
  return { text: args.text, at: Date.now() };
}
```

清单是骨架，实现随意：换成 `.dex`、`.wasm`、`bin`、`proc` 都只改 `impl` 一行，不动其他字段。见 [`../spec/03-impl-reference.md`](../spec/03-impl-reference.md)。

## 步骤 4 · 校验

```bash
node validator/src/validate.mjs plugins/hello
# ✔ axp.json parsed
# ✔ schema OK
# ✔ 1 tool(s), 0 surface(s)
# ✔ references OK
# ✔ privilege OK
# ALL CHECKS PASSED
```

校验器会检查：schema、引用完整性、`abis`、`requests` 词汇表、权限一致性、**未在清单声明的文件不得作为入口**。

## 步骤 5 · 打包

```bash
node cli/bin/axp.mjs pack plugins/hello -o hello.axp
```

`.axp` 就是 zip。发布前用 APK v3 签名，并把证书指纹填回 `distribution.publisher`。

## 步骤 6 · 安装并调用

在宿主里：

```kotlin
val plugin = host.load(AxpBundle.fromFile("hello.axp"))
val result = plugin.invoke("demo.echo", """{"text":"hi"}""")
// → {"text":"hi","at":1730000000000}
```

## 验证

- [ ] `axp validate` 全绿
- [ ] `axp pack` 产物含 `axp.json`
- [ ] 宿主调用 `demo.echo` 返回预期结果
- [ ] 尝试把 `sideEffects` 改成 `destructive` → 校验器要求 `confirm: true`

## 常见错误

| 报错 | 原因 | 修法 |
|---|---|---|
| `ABI_MISSING` | `abis: []` 但包内有 `.so` | 把架构写进 `abis` |
| `CAP_UNKNOWN_REQUEST` | `requests` 名不在词汇表 | 查 [`../spec/04-capabilities.md`](../spec/04-capabilities.md) |
| `IMPL_FILE_MISSING` | `impl.js` 路径写错 | 改成相对包根的真实路径 |
| `PUBLISHER_INVALID` | 指纹格式不对 | 用 `sha256:<hex>` |

## 下一步

- 加界面 → [`ui-tutorial.md`](ui-tutorial.md)
- 加热加载 → [`hot-reload-tutorial.md`](hot-reload-tutorial.md)
- 加屏幕感知与权限梯度 → [`../spec/05-domains.md`](../spec/05-domains.md) / [`../spec/04-capabilities.md`](../spec/04-capabilities.md)
- 插件 README 怎么写 → [`doc-templates.md`](doc-templates.md)

---

<a id="file-39"></a>

## 39. `axp/docs/runtime-guide.md`

# 参考运行时指南：把规范跑起来，再搬到 Android

> 状态：Stable
> 适用：AXP v1.x · Android API 26+
> 最后更新：2026-11-14

本指南面向**宿主开发者**：先用 [`../runtime`](../runtime) 这个可运行的 Node 参考宿主把规范语义跑一遍，再按 [`integration-guide.md`](integration-guide.md) 与 [`../reference-host/android`](../reference-host/android) 把同样的语义搬到真机。

## 前置条件

| 项 | 要求 |
|---|---|
| Node.js | 18+（参考运行时、校验器、CLI） |
| Python | 3.x + `jsonschema>=4.18`（仅交叉复核用） |
| Android Studio | 仅当你要编译 `reference-host/android` |

不需要 npm install：运行时工具链零依赖。

## 步骤 1 · 一键跑通

```bash
node validator/test/run-tests.mjs            # 31 条：4 个正面示例 + 25 条负面规则 + 边界用例
python3 validator/test/schema-crosscheck.py  # 43 项：Python jsonschema 独立交叉复核（区分 schema 层 / 业务层）
node runtime/test/smoke.mjs                 # 30 条：端到端断言
```

`smoke.mjs` 会真实装载 `test/fixtures/` 下三个插件，依次验证：装载 → 工具调用与权限梯度 → Surface 增量与 UI 绑定 → UI 动作 → 热替换 → 拒绝越权 → 回滚 → 严格签名。全部断言通过后输出 `ALL 30 ASSERTIONS PASSED`。

## 步骤 2 · 读懂每段测试对应规范哪一条

| 测试段 | 验证的字段 | 规范位置 |
|---|---|---|
| `[1] load` | `axp.json`、9 步流水线、整包拒绝 | [`../spec/01-format.md`](../spec/01-format.md) §8 |
| `[2] gradient` | `tools[].gradient`、`sideEffects`、`confirm`、多实现路径 | §5.1 / §6.2 / [`../spec/03-impl-reference.md`](../spec/03-impl-reference.md) §2 |
| `[3] surface` | `surfaces[].watchable`、`ui.bind`、`events[].filter`、背压 | §5.2 / §5.5 / [`../spec/05-domains.md`](../spec/05-domains.md) §3 |
| `[4] ui.actions` | `actions[].tool` 引用本包工具 | §5.6 / [`../spec/06-ui-vocab.md`](../spec/06-ui-vocab.md) §3 |
| `[5] hot reload` | `hotReload` 全字段、状态迁移、`state.preserve`、生命周期顺序 | §7 / [`../spec/08-hot-reload.md`](../spec/08-hot-reload.md) §2 |
| `[6] rejections` | 提权、换证书、新增组件被拒 | `08` §3.3 |
| `[7] rollback` | `rollback.keep`、回滚也验签 | `08` §3.5 |
| `[8] signature` | `dev` / `strict` 策略边界 | §9 / [`../runtime/README.md`](../runtime/README.md) |

**看代码比看表格快**：`runtime/src/loader.mjs` 顶部注释标了每一步对应规范 §8 的第几步；`hotreload.mjs` 的 `phase()` 调用顺序就是 `08` §2 的状态机。

## 步骤 3 · 三个必须理解的行为

### 3.1 `gradient` 会按「实现可用性」再降级

示例 `03-hot-reload` 的 `screen.tap` 在 L3 声明了 `bin` + `js` 两条实现路径。参考运行时不支持 `bin`，于是按 [`../spec/03-impl-reference.md`](../spec/03-impl-reference.md) §2 跳过它、选中同层的 `js`；宿主只授权到 L2 时，则整层降级到 L2 的无障碍实现。

```js
const host = new AxpHost({ privileges: ['L0','L1','L2','L3'] });
host.load('test/fixtures/03-hot-reload');
host.invoke('com.example.autopay', 'screen.tap', {}, { confirmed: true });
// → { ok: true, layer: 'L3', result: { via: 'L3/shell-fallback' } }
```

**实现要点**：选择算法是「先按权限层从高到低，再在该层内过滤宿主支持的形态」，不是「看到不支持的形态就整体失败」。

### 3.2 `allowDynamicCode: false` 不拦热加载

校验器与运行时都按 [`../spec/04-capabilities.md`](../spec/04-capabilities.md) §5 区分两件事：

| 场景 | 结果 |
|---|---|
| 网络未签名代码 | ❌ 禁止 |
| 可信源、已签名、每次验签的实现体替换 | ✅ 允许 |

`smoke.mjs` 专门有一条断言确认 `03-hot-reload` 在 `allowDynamicCode: false` 下仍能通过校验。

### 3.3 热加载的四条硬拒绝

`runtime/src/signature.mjs` 的 `verifyReplace()` 每次替换都检查：publisher 一致、`id` 不变、`privilege` / `requests` 不扩大、组件 id 集合 ⊆ 旧包、`axp` 格式版本不变。任一不满足即 `REJECTED`，旧版本保持可用。

## 步骤 4 · 把语义搬到 Android

| Node 参考实现 | Android 落点 | Android 特有的坑 |
|---|---|---|
| `vm` 上下文执行 `impl.js` | QuickJS / Hermes，`HostBridge.selectImpl()` | 脚本引擎需与宿主进程隔离 |
| `SurfaceBus` 内存订阅 | `HostBridge.surface()` + 无障碍 / 通知监听 | 需要真实 L1/L2 授权 |
| `UiRuntime` 内存节点树 | `UiRuntime.kt` + Compose | `uiRebuild` 要按 `recompose / recreate-activity / restart-host` 分档 |
| `hotreload.mjs` 状态机 | `HotReloadAgent.kt` | **必须** `IsolatedLoader` 每代新 `InMemoryDexClassLoader` |
| `signature.mjs` dev/strict | `HostBridge.verifySignature()` | 生产必须接真实 APK Signature Scheme v3 |

**最重要的差异**：Node 里换实现体只是换文件引用；Android 里 dex 一旦进了宿主 `PathClassLoader` 就永远卸不掉。所以 `hotReload.classloader: "isolated"` 在 schema 里是启用的硬条件，在 [`../reference-host/android/host/src/main/kotlin/dev/axp/host/IsolatedLoader.kt`](../reference-host/android/host/src/main/kotlin/dev/axp/host/IsolatedLoader.kt) 里是每代一个新加载器、保留 `rollback.keep` 代快照。

## 步骤 5 · 写你自己的 HostBridge

最小可运行形状（完整 10 步见 [`integration-guide.md`](integration-guide.md)）：

```kotlin
class MyBridge : HostBridge {
    override fun readManifest(b: AxpBundle) = json.decodeFromString<AxpManifest>(
        File(b.dir, "axp.json").readText())
    override fun verifySignature(b: AxpBundle, expected: String) =
        apkV3.verify(b, expected)              // 生产必须真验签
    override fun grantedPrivileges() = setOf(Privilege.L0, Privilege.L1, Privilege.L2)
    override fun selectImpl(impl: Impl, layer: Privilege) = quickJsHandle(impl.js)
    override fun runtimeService(name: String, req: JsonObject) = dispatch(name, req)
    override fun surface(uri: String) = realSurface(uri)
    override fun mountUi(m: AxpManifest, p: PanelNode) = composePanel(p)
}
```

接口里**没有任何外部协议类型**——进程怎么通信、消息怎么序列化，是你自己的实现细节。这正是 AXP 作为同级独立格式的边界。

## 验证

- [ ] `node runtime/test/smoke.mjs` 输出 `ALL 30 ASSERTIONS PASSED`
- [ ] `python3 validator/test/schema-crosscheck.py` 输出 `43 passed, 0 failed`
- [ ] 修改 `test/fixtures/03-hot-reload/axp.json` 的 `hotReload.signature` 为 `on-install` → `run-tests.mjs` 捕获 `HOT_SIGNATURE_POLICY`
- [ ] 把 `AxpHost({ privileges: ['L0','L1','L2'] })` 跑一遍 → `gradient` 日志显示 `layer: L2`
- [ ] 在 Android Studio 里打开 `reference-host/android`，`:host:testDebugUnitTest` 通过（骨架级纯逻辑测试）

## 常见错误

| 现象 | 原因 | 处理 |
|---|---|---|
| `gradient` 永远选到 L0 | 宿主上限算成了 `min(所有已授权层)` | 取 `max(已授权层)` 再与 `capabilities.privilege` 取 min |
| Surface 推了但 UI 不刷新 | `bind[].from` 的 Surface 未 `watchable: true` | 打开 `watchable` |
| 连续两次 publish 第二次丢了 | 背压节流（参考运行时 60Hz） | 合并 delta 或降低频率 |
| 热替换报 `HOT_TARGET_MISMATCH` | 变更组件前缀不在 `targets` 内 | 加前缀或缩小替换范围 |
| `onReload` 抛错但界面停在半新半旧 | 没启用 `rollback.onError` | 打开，且回滚也要验签 |
| Android 热加载后旧 dex 不释放 | 用了共享 `PathClassLoader` | 改 `IsolatedLoader` |
| 想直接装载别的格式插件 | 定位误解 | 见 [`faq.md`](faq.md)：AXP 宿主只装载 `.axp` 包 |

---

<a id="file-40"></a>

## 40. `axp/docs/ui-tutorial.md`

# 教程 · 写一个带界面的插件

> 状态：Stable
> 适用：AXP v1.x · Android API 26+ · 宿主 AXP-2+
> 最后更新：2026-11-14

UI 在 AXP 里是**一等组件**：`ui{}` 声明界面入口、数据绑定、动作回填与生命周期。节点词汇表见 [`../spec/06-ui-vocab.md`](../spec/06-ui-vocab.md)。

## 前置条件

- 完成 [`plugin-tutorial.md`](plugin-tutorial.md)
- 宿主实现 `Scaffold / Column / Text / Button / Input / List` 与 `${surface:}` 绑定

## 步骤 1 · 清单里加 `ui{}`

```jsonc
{
  "id": "com.example.panel",
  "minAndroid": 26,
  "abis": [],

  "tools": [
    { "id": "screen.tap", "description": "点击屏幕坐标",
      "input": { "type": "object" }, "impl": { "js": "tools/tap.js" },
      "sideEffects": "device", "confirm": true },
    { "id": "demo.refresh", "description": "刷新面板数据",
      "input": { "type": "object" }, "impl": { "js": "tools/refresh.js" },
      "sideEffects": "read" }
  ],

  "surfaces": [
    { "uri": "axp://x/com.example.panel/vision/screen",
      "views": ["tree", "text"], "anchor": "node",
      "watchable": true, "auth": "L2",
      "impl": { "js": "surfaces/screen.js" } }
  ],

  "ui": {
    "panel": { "kind": "dsl", "entry": "ui/panel.json" },
    "lifecycle": {
      "onLoad": "ui/onLoad.js",
      "onReload": "ui/onReload.js",
      "onUnload": "ui/onUnload.js"
    },
    "bind": [
      { "from": "axp://x/com.example.panel/vision/screen", "to": "ui.panel.tree" }
    ],
    "actions": [
      { "id": "ui.panel.tap", "tool": "screen.tap" },
      { "id": "ui.panel.refresh", "tool": "demo.refresh" }
    ]
  },

  "capabilities": {
    "privilege": "L2",
    "requests": ["accessibility.read"],
    "dangerous": ["accessibility.read"],
    "runtimeServices": ["ui.push"]
  },
  "runtime": { "memoryMB": 64, "cpuPct": 10, "allowDynamicCode": false },
  "distribution": {
    "channel": "session-install",
    "publisher": "sha256:REPLACE_WITH_YOUR_CERT_FINGERPRINT",
    "signatureScheme": "apk-v3"
  }
}
```

三条引用铁律（校验器会查）：

1. `bind[].to` 必须能在 `panel.json` 解析到节点
2. `actions[].tool` 必须指向本包 `tools[].id`
3. `bind[].from` 指向的 Surface 必须 `watchable: true` 才能自动刷新

## 步骤 2 · 写 `ui/panel.json`

```json
{
  "axpUi": "1.0",
  "root": "main",
  "theme": "host",
  "state": { "scroll": 0, "selected": null },
  "nodes": [
    { "id": "main", "type": "Scaffold", "props": { "title": "屏幕面板" },
      "children": ["title", "tree", "row"] },
    { "id": "title", "type": "Text",
      "props": { "text": "当前界面节点", "style": "title" } },
    { "id": "tree", "type": "Text",
      "props": { "text": "${surface:axp://x/com.example.panel/vision/screen.text}", "style": "mono", "maxLines": 20 } },
    { "id": "row", "type": "Row", "props": { "spacing": 8 },
      "children": ["tapBtn", "refreshBtn"] },
    { "id": "tapBtn", "type": "Button",
      "props": { "label": "点击", "action": "ui.panel.tap" } },
    { "id": "refreshBtn", "type": "Button",
      "props": { "label": "刷新", "action": "ui.panel.refresh" } }
  ]
}
```

`${surface:<uri>.<view>}` 是内联绑定，等价于清单里的一条 `ui.bind`。

## 步骤 3 · 写生命周期回调

```js
// ui/onLoad.js
export function onLoad(ctx) {
  ctx.log("panel mounted", ctx.state.scroll);
  return { ok: true };
}
```

```js
// ui/onReload.js —— 热加载时调用，输入含 oldState / newState / changed
export function onReload(ctx) {
  ctx.log("panel replaced", ctx.changed);
  return { ok: true };
}
```

```js
// ui/onUnload.js —— 旧实现回收前必须完成
export function onUnload(ctx) {
  ctx.release();
  return { ok: true };
}
```

回调签名由宿主 SDK 定义，格式只规定**时机**：`onLoad` 挂载后、`onReload` 重建之后可见之前、`onUnload` 旧类加载器回收之前。见 [`../spec/06-ui-vocab.md`](../spec/06-ui-vocab.md) §6。

## 步骤 4 · 校验与打包

```bash
node validator/src/validate.mjs plugins/panel
node cli/bin/axp.mjs pack plugins/panel -o panel.axp
```

## 步骤 5 · 在宿主里挂载

```kotlin
val panel = UiParser.parse(m.ui.panel.entry)
val handle = host.mountUi(m, panel)
m.ui.bind.forEach { host.surface(it.from).collect { d -> handle.update(it.to, d) } }
m.ui.lifecycle?.onLoad?.let { host.runScript(it, panel.state) }
```

## 验证

- [ ] 面板出现，标题与按钮可见
- [ ] 屏幕变化时 `tree` 节点自动刷新（无需插件写刷新代码）
- [ ] 点「点击」触发 `screen.tap`，且因 `sideEffects: device` 弹出确认
- [ ] 故意把 `actions[].tool` 改成不存在的 id → 校验报 `UI_ACTION_TOOL_MISSING`

## 常见错误

| 现象 | 原因 |
|---|---|
| 面板空白 | `root` 指向的 id 不存在，或 `children` 拼错 |
| 数据不刷新 | Surface 未 `watchable: true`，或 `from` URI 不一致 |
| 按钮无反应 | `action` 值不是 `ui.actions[].id` |
| 换 UI 后 state 丢失 | 没配 `hotReload.state.preserve`，见 [`hot-reload-tutorial.md`](hot-reload-tutorial.md) |

---

<a id="file-41"></a>

## 41. `axp/validator/README.md`

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

<a id="file-42"></a>

## 42. `axp/README.md`

# AXP 规范项目（axp/）

> 独立插件描述格式 **AXP v1.x** 的规范、Schema、零依赖校验器、CLI、Node 参考运行时与一致性套件。
> 本目录**不含对外示例插件**：示例在独立仓 `axp-examples/`；真机宿主在 `axp-android-host/`。
> `test/fixtures/` 只是内部测试资产（1 个最小插件 + UI/热加载/多域/记忆系统夹具 + v1.1.0 升级夹具），不是示例。

## 规范

| 文件 | 内容 |
|---|---|
| `spec/01-format.md` | **唯一规范性正文**（§0–§12 + §13 补篇索引） |
| `spec/02-manifest.schema.json` | `axp.json` 严格 Schema（draft 2020-12） |
| `spec/03`–`09` | impl / 权限 / 域 / UI 词汇 / 表达映射 / 热加载 / 版本 |
| **`spec/10-distribution-index.md`** + `10-index.schema.json` | 分发、索引、十步 `install`、`session-install`、更新/吊销（M6） |
| **`spec/11-plugin-management-agent.md`** | 注册表、`agent-tools`、`ctx.storage`、插件 UI 入口 |
| **`spec/12-host-conformance.md`** | C01–C26 运行时断言 + S01–S08 静态断言 |
| **`spec/13`–`21`** | 术语与约定 / 字段全参考 / UI DSL / 宿主上下文 / 域适配器 / 安全模型 / 错误码总表 / 兼容性与治理 / **Android App 接入** |
| `spec/15-panel.schema.json` · `16-registry.schema.json` · `16-install-intent.schema.json` · `21-host-capabilities.schema.json` | v1.1 新增的宿主层/界面层/能力声明 schema |

## 自检

```bash
node validator/test/run-tests.mjs            # 31/31
python3 validator/test/schema-crosscheck.py # 47/47（双引擎）
node runtime/test/smoke.mjs                 # 30/30
node tools/conformance.mjs --json           # 26/26（分发/安装/Agent/UI/存储）
node tools/spec-lint.mjs --json             # 9/9（规范文本自洽，含 S09 host.json）
node ../scripts/site-check.mjs --prebuild   # 夹具与新增文档完整性
```

Android 宿主 `conformance/ConformanceRunner.java` 会把 `core/*.java` 真实编译（`--release 8`）并跑**同一张**用例表。

## 工具链

```
validator/    零依赖校验器 + 31 条行为用例 + 47 项 Python 交叉复核
cli/          axp 命令：new/validate/seal/pack/inspect/publish/index/install/
              uninstall/list/enable/disable/agent-tools/invoke/ui/conformance
runtime/      Node 参考宿主（声明 AXP-3），30 条端到端断言
sdk/sdk-js/   TypeScript 类型定义
reference-host/android/  旧 Kotlin 骨架（保留作规范语义参考；真机宿主已独立成仓）
tools/conformance.mjs    C01–C26
test/fixtures/           内部测试夹具
```

完整命令见 [`docs/cli-reference.md`](docs/cli-reference.md)；真机构建见 [`docs/cookbook-android-host.md`](docs/cookbook-android-host.md)。

> 本仓内容由 AI 辅助生成并工程化验证；生产落地前按 `docs/host-checklist.md` 与 `spec/12` 逐项验证签名、权限梯度、热加载回滚三条安全路径。

---

<a id="file-43"></a>

## 43. `axp/CHANGELOG.md`

# Changelog

本文件记录规范与工具链的变更。格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

## [1.0.4] - 2026-11-15

> 仓库级工程化修复与完成度审计；**规范语义不变**，`axp` 格式版本仍为 `1.0.0`。
> 本条记录的是外层 Next.js 文档站点与 CI 的变化，`axp/` 内规范 / schema / 校验器 / CLI / 运行时 / 示例均未改动。

### Fixed
- standalone 自包含部署缺陷：站点运行时以 `path.join(process.cwd(), "axp")` 读取规范项目，Next.js output file tracing 无法追踪该拼接路径；现通过 `next.config.ts` 的 `outputFileTracingIncludes` 与 `build` 脚本 `cp -r axp .next/standalone/` 双保险解决，避免容器化部署后文档库与校验器演练场失效
- `readDocContent` 路径前缀校验改用 `path.sep` 判断，避免同前缀目录绕过（纵深防御）

### Added
- CI `web-build` job：`bun run build` + `node scripts/site-check.mjs`，首次把站点可构建性纳入质量门禁
- `scripts/site-check.mjs`：零依赖产物自检（`--prebuild` 数据完整性 / 默认 standalone 自包含性）
- 顶层 `LICENSE`（MIT）、`AUDIT.md`（完成度审计）、`ROADMAP-ALL-TASKS.md`（一次性全部任务）、`PATCHES.md`（改动与回滚）

### 未验证
- 本环境不具备 Bun 与完整前端依赖安装条件，**未执行一次真实 `next build`**；`web-build` job 的首次运行结果需在有 Bun 的环境观测。

### Verified
- 4 个示例 `axp validate` 全绿；`run-tests.mjs` 31/31；`schema-crosscheck.py` 43/43；`smoke.mjs` 30/30
- 全仓 Markdown 本地链接零断链；`axp/` 与 v1.0.2 基准逐文件比对，仅 CHANGELOG 与 `runtime/src/surfaces.mjs`（v1.0.3 修复）两处差异

## [1.0.3] - 2026-11-14

> 参考运行时时序修复；**规范语义不变**，`axp` 格式版本仍为 `1.0.0`。

### Fixed
- `runtime/src/surfaces.mjs`：`prime()` 发出的初始 `full` 快照现在会在该 Surface 上**重置背压计时**（`lastAt = 0`）。此前装载期间的初始快照会占用一次推送窗口，导致装载后 `1000/maxHz` 内的第一个真实 `delta` 被误判为高频推送而吞掉（`smoke.mjs` 的 `surface delivered to subscribers` 断言在快速机器上间歇性失败）。修复后 `smoke.mjs` **30/30 稳定全绿**。

### Verified
- 4 个示例 `axp validate` 全绿；`run-tests.mjs` 31/31；`schema-crosscheck.py` 43/43；`smoke.mjs` 30/30（连续三次）；`axp pack` 正常产出。

## [1.0.2] - 2026-11-14

> M3 感知域示例与教程、回归加固；**规范语义不变**，`axp` 格式版本仍为 `1.0.0`。

### Added
- `examples/04-domains/`：M3 感知域示例插件，覆盖 8 个 `axp://` 标准域、URI 模板（`{}` 占位）、`views` / `anchor` / `watchable`、5 条多域 `ui.bind`、`events` 两类触发源、`gradient` 双路径、L1/L2/L3 分层权限与 `dangerous` 单独确认
- `docs/domains-tutorial.md`：选域 → 声明 Surface → 绑定 → 事件 → 权限分层 → 校验的六步教程
- `validator/test/run-tests.mjs` 增加 `ID_INVALID` / `ABI_MISSING` 用例与 `04-domains` 正面校验（31 条）

### Changed
- 参考实现统一为单一入口：可运行 `runtime/` + 未编译验证 `reference-host/android/`；交叉复核统一到 `validator/test/schema-crosscheck.py`，避免两套宿主 / 两套复核并存造成歧义
- `schema-crosscheck.py` 的示例遍历自动覆盖第 4 个示例（43 项）
- README、运行时指南、开仓库指南、合规自检表的自检数字与示例清单同步到 **31 / 43 / 30**
- `spec/01-format.md` §12 与附录 B 补实现状态与 M3 示例索引；`reference-host/README.md` 补 M3–M6 状态表

### Verified
- 4 个示例 `axp validate` 全绿
- `run-tests.mjs` **31/31**、`schema-crosscheck.py` **43/43**（Python `jsonschema` draft 2020-12）、`smoke.mjs` **30/30**
- 标准引擎对 schema 的 `const` / `additionalProperties` / `anyOf` / `minItems` / `if-then` / `patternProperties` / `enum` / `type` 八类分支独立复核，13 个 case 两引擎结论零差异
- 全仓 Markdown 本地链接零断链

## [1.0.1] - 2026-11-14

> 工具链增强与整合，**规范语义不变**，`axp` 格式版本仍为 `1.0.0`。

### Added
- `runtime/`：可运行的 Node 参考宿主（声明等级 AXP-3），实现 §8 九步装载、`gradient` 权限梯度与多实现路径降级、Surface 订阅/背压、`ui.bind`/`actions`/`lifecycle`、热加载状态机与回滚、dev/strict 签名策略、结构化审计日志
- `runtime/test/smoke.mjs`：30 条端到端断言，覆盖装载、调用、绑定、热替换、越权拒绝、回滚、严格签名
- `validator/test/run-tests.mjs`：30 条正负面用例，固化全部错误码行为
- `validator/test/schema-crosscheck.py`：**41 项**独立复核（Python `jsonschema` draft 2020-12）
  - 校验 schema 自身的元语法合法性与 `$schema` 声明
  - **区分 schema 层与业务层**：只比对 `SCHEMA_*` 结论，避免「碰巧整体拒绝」造成假通过
  - 17 个反例覆盖 `if/then + const`、`patternProperties + additionalProperties:false`、`anyOf`、`enum/const`
  - `hotReload.enabled=false` 时 `if/then` 不误触发的正例；7 类「标准 schema 放行 / Node 精确拒绝业务码」边界用例
  - `subprocess.run` 加 30 秒超时，避免 CI 挂死
- `validator/test/README.md`：两套测试的分工、覆盖关键字、手写引擎的已知边界
- `reference-host/android/`：Kotlin/Gradle 真机骨架（`HostBridge`、`InMemoryDexClassLoader` 隔离、Compose 绑定示意、热加载状态机、单元测试）
- `reference-host/README.md`：重写为「可运行 `runtime/` + 未编译验证 `android/`」的总入口，移除重复的 Android 骨架副本
- `docs/runtime-guide.md`：把参考运行时语义搬到 Android 的对照指南
- `docs/github-setup.md`：开仓库操作指南（初始化、`OWNER` 替换、CI、tag 与 Release）
- CI 拆为三个 job：`validate`（示例 + CLI 烟雾测试）、`cross-check`（行为固化 + 标准 schema 复核 + 端到端冒烟）、`docs`（全仓 Markdown 链接 + 参考实现文件清单）

### Changed
- `examples/03-hot-reload` 的 L3 `gradient` 分支增加 `js` 实现路径，演示 `spec/03` §2 的多实现路径降级
- README 补充参考实现状态表、一键自检命令与四套自检数字
- CI 的链接检查从「仅 README」升级为「全仓所有 `.md`」
- `.gitignore` 增加 `.tmp/`（交叉复核的临时 fixture 目录）

### Fixed
- 精简 schema 引擎：`properties` 命中的键现在会**同时**应用 `patternProperties`，并把 `additionalProperties` 限定为「两者都未匹配」的键，与 draft 2020-12 语义一致
- 修正参考运行时的权限上限计算：宿主取 **max(已授权层)** 再与 `capabilities.privilege` 取 min（原写法误取 min 导致永远 L0）
- 修正热加载变更检测：返回组件前缀而非文件路径，`targets` 匹配不再误判 `HOT_TARGET_MISMATCH`

### 未变
- `spec/01-format.md` 的字段与语义、[`spec/02-manifest.schema.json`](spec/02-manifest.schema.json) 的结构

## [1.0.0] - 2026-11-14

### Added
- AXP v1.0 主规范：包结构、`axp.json` 清单、六类组件（tools / surfaces / knowledge / agents / events / ui）
- **同级独立格式**定位声明，表达能力覆盖证明移入 `spec/07-expression-map.md`
- 统一实现引用 `impl` 的 7 种形态；外部进程统一用 `proc` 声明，规范正文不内嵌任何外部格式名
- Android 原生能力：L0–L5 权限阶梯、`gradient` 权限梯度、13 个 `axp://` 标准域、APK v3 签名
- **UI 一等组件**：`ui.panel / widget / web / activity / inject` + `lifecycle / bind / actions` + `06-ui-vocab.md`
- **热加载 `hotReload{}`**：组件级替换、`on-every-load` 验签、状态迁移、回滚、UI 重建、隔离类加载器；`08-hot-reload.md` 专章
- `runtime.allowDynamicCode` 边界澄清：禁止「网络未签名代码」，允许「可信源已签名实现体替换」
- 分发通道改为 Android 原生：会话安装 / 签名信任链
- 完整 JSON Schema、离线校验器、`axp` CLI、3 个示例、CI、集成教程与文档模板
- 路线图新增 M2.5 热加载里程碑

### Changed
- 早期草案中 `impl.mcp` → 通用 `impl.proc`
- 早期草案中表达力总表从规范正文移出至 `07-expression-map.md`
- 早期草案中 `distribution.channels` 的通用仓库/包管理器措辞 → `distribution.channel` Android 会话安装

### Removed
- 早期草案中的握手 / 方法表 / transport 章节（属于宿主实现细节，不属于格式）

---

> 合订完毕（43 个文件）。配套自检：`node axp/tools/spec-lint.mjs --json` → S01–S09 全绿。
