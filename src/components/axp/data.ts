/**
 * AXP 规范静态数据 —— 内容逐条取自 axp/spec/ 的规范正文。
 * 供客户端组件渲染，不依赖文件系统。
 */

export const NAV_SECTIONS: { group: string; items: { id: string; label: string }[] }[] = [
  {
    group: "格式",
    items: [
      { id: "overview", label: "概览" },
      { id: "why", label: "为什么需要 AXP" },
      { id: "package", label: "包结构" },
      { id: "manifest", label: "清单 axp.json" },
      { id: "impl", label: "实现引用 impl" },
      { id: "components", label: "六类组件" },
    ],
  },
  {
    group: "Android 原生",
    items: [
      { id: "capabilities", label: "权限阶梯 L0–L5" },
      { id: "domains", label: "axp:// 标准域" },
      { id: "ui", label: "UI 组件" },
      { id: "hotreload", label: "热加载" },
    ],
  },
  {
    group: "宿主与生态",
    items: [
      { id: "loading", label: "装载流水线" },
      { id: "levels", label: "宿主一致性等级" },
      { id: "roadmap", label: "路线图" },
    ],
  },
  {
    group: "动手",
    items: [
      { id: "examples", label: "示例插件" },
      { id: "playground", label: "校验器演练场" },
      { id: "library", label: "文档库" },
      { id: "tooling", label: "工具链与自检" },
    ],
  },
];

export const NOT_WHAT = [
  { not: "协议 / 线格式", reason: "无握手、无方法表、无 transport；进程间通信属于宿主实现细节" },
  { not: "桥 / 适配器 / 兼容层", reason: "不解析、不转换、不代理任何外部插件运行时" },
  { not: "元格式 / 上层收编", reason: "不与任何外部格式构成上下位关系" },
  { not: "运行时", reason: "只定义「声明什么」，不定义调度引擎如何执行" },
];

export const WHY_ROWS = [
  { lack: "没有 UI", axp: "ui{} 是一等组件：声明式面板、小组件、WebView、原生 Activity、界面注入" },
  { lack: "不能热加载", axp: "hotReload{} 字段族：组件级替换、每次加载验签、状态迁移、回滚、UI 重建" },
  { lack: "权限是事后补丁", axp: "L0–L5 权限阶梯 + gradient 同一工具多权限实现自动降级" },
  { lack: "Android 能力靠外部工具硬凑", axp: "13 个 axp:// 标准域、abis、minAndroid、APK v3 签名原生字段" },
  { lack: "声明与实现绑死", axp: "声明层统一 / 实现层开放：清单唯一，实现体可任意语言任意文件格式" },
];

export const PRINCIPLES = [
  { name: "声明层统一", desc: "一个插件 = 一个包，axp.json 是唯一事实源；未在清单中声明的文件一律不执行" },
  { name: "实现层开放", desc: "组件本体可为 .js / .dex / .so / .wasm / .md / .yaml / .html / 独立二进制 / 外部进程" },
  { name: "同级独立", desc: "组件语义由本规范定义，不借用外部格式字段名，不内嵌外部协议" },
  { name: "Android 一等公民", desc: "UI、权限阶梯、热加载、abis、minAndroid、签名信任链是原生字段，不是事后补丁" },
  { name: "实现体可替换", desc: "同一能力允许多条实现路径，并允许运行时以可信、已签名的新实现体替换（热加载基础）" },
];

export const PACKAGE_TREE = `com.example.demo.axp/            # 目录形态（开发）；同名 .axp zip（分发）
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
└── docs/`;

export const PACKAGE_RULES = [
  "包根 MUST 存在 axp.json，文件名固定，大小写敏感。",
  "清单中出现的相对路径 MUST 指向包内真实文件；url 与 proc 除外。",
  "目录名、文件名 MUST NOT 包含 .. 或绝对路径。",
  "分发态 MUST 使用 APK Signature Scheme v3 签名，并在 distribution.publisher 记录发布者指纹。",
];

export const MANIFEST_FIELDS: { field: string; type: string; required: boolean; desc: string }[] = [
  { field: "axp", type: "string", required: true, desc: "格式版本，本版固定 \"1.0\"" },
  { field: "id", type: "string", required: true, desc: "反向域名，包内全局唯一" },
  { field: "name", type: "object", required: true, desc: "至少含一个语言键（zh / en / …）" },
  { field: "version", type: "string", required: true, desc: "语义化版本 MAJOR.MINOR.PATCH" },
  { field: "description", type: "string", required: false, desc: "一句话说明" },
  { field: "minHost", type: "string", required: false, desc: "宿主最低版本" },
  { field: "minAndroid", type: "integer", required: true, desc: "最低 API level，>= 26" },
  { field: "abis", type: "string[]", required: true, desc: "包内预编译产物架构；无原生产物时写 []" },
  { field: "requires", type: "object[]", required: false, desc: "依赖闭包，§8.3" },
  { field: "entry", type: "object", required: false, desc: "{ js, engine }，engine ∈ quickjs / hermes / dex / wasm / bin" },
  { field: "tools / surfaces / knowledge / agents / events", type: "array", required: false, desc: "六类组件，见 §5" },
  { field: "ui", type: "object", required: false, desc: "界面组件，见 §5.6" },
  { field: "hotReload", type: "object", required: false, desc: "热加载，见 §7" },
  { field: "capabilities", type: "object", required: true, desc: "权限与能力声明，见 §6" },
  { field: "instances", type: "object", required: false, desc: "{ multi: bool, max: int }，默认单实例" },
  { field: "runtime", type: "object", required: false, desc: "资源上限与动态代码边界" },
  { field: "distribution", type: "object", required: true, desc: "分发与签名，见 §9" },
];

export const MANIFEST_SKELETON = `{
  "axp": "1.0",
  "id": "com.example.demo",
  "name": { "zh": "演示插件", "en": "Demo" },
  "version": "1.2.0",
  "minAndroid": 26,
  "abis": ["arm64-v8a"],

  "tools":       [ /* §5.1 可执行能力 */ ],
  "surfaces":    [ /* §5.2 可感知数据 */ ],
  "knowledge":   [ /* §5.3 知识与提示 */ ],
  "agents":      [ /* §5.4 子代理 */ ],
  "events":      [ /* §5.5 事件与钩子 */ ],
  "ui":          { /* §5.6 界面 */ },
  "hotReload":   { /* §7   热加载 */ },

  "capabilities": {
    "privilege": "L3",
    "requests": ["accessibility.gestures", "notification.listen"],
    "dangerous": ["accessibility.gestures"],
    "runtimeServices": ["sampling"]
  },
  "runtime": { "memoryMB": 128, "cpuPct": 20, "allowDynamicCode": false },
  "distribution": {
    "channel": "session-install",
    "publisher": "sha256:ab12...",
    "signatureScheme": "apk-v3"
  }
}`;

export const IMPL_FORMS: { code: string; key: string; form: string; pack: string; hot: string }[] = [
  { code: "T1", key: "js", form: "脚本文件", pack: "包内 .js", hot: "✅" },
  { code: "T2", key: "kotlin", form: "预编译 dex + 类符号 path#Class", pack: "架构写入 abis", hot: "✅ 需 isolated" },
  { code: "T3", key: "native", form: "预编译 .so", pack: "架构写入 abis", hot: "⚠️ 需卸载 native 库" },
  { code: "T4", key: "wasm", form: ".wasm 模块", pack: "架构无关但需声明运行时", hot: "✅" },
  { code: "T5", key: "bin", form: "独立可执行，stdin/stdout JSON", pack: "架构写入 abis", hot: "✅" },
  { code: "T6", key: "url", form: "远程端点", pack: "需 network.egress:<host>", hot: "✅ 端点变更" },
  { code: "T7", key: "proc", form: "通用外部进程", pack: "cmd 为包内可执行或系统命令", hot: "✅ 进程重启" },
];

export const IMPL_EXAMPLE = `// 一个 impl 可同时给多种实现；宿主按设备能力选择：
"impl": {
  "native": "tools/ocr/libocr.so",     // 有 so 用 so
  "js":     "tools/ocr-fallback.js"    // 否则降级 js
}

// 外部进程只是一条普通声明（T7），不假定任何协议：
"proc": { "cmd": "bin/helper", "args": ["--mode", "fast"], "cwd": ".", "env": {} }`;

export const IMPL_SELECTION = `candidates = impl 中宿主支持的形态
按宿主优先级排序：native > kotlin > wasm > bin > js > proc > url
过滤：架构匹配 abis、权限满足 capabilities.requests
取第一个可用；全部不可用 → 组件标记 unavailable（不抛异常）

gradient 优先于 impl：先按当前权限层选 gradient 分支，
再在该分支内运行上述算法。`;

export interface ComponentDef {
  key: string;
  name: string;
  en: string;
  tagline: string;
  desc: string;
  json: string;
  points: string[];
}

export const COMPONENT_DEFS: ComponentDef[] = [
  {
    key: "tools",
    name: "工具",
    en: "tools[]",
    tagline: "可执行能力",
    desc: "模型可调用的动作：点击、OCR、读写文件。input / output 用 JSON Schema 描述；gradient 声明权限梯度；sideEffects 决定确认策略与审计等级。",
    json: `{
  "id": "screen.tap",
  "description": "点击屏幕坐标",
  "input":  { "type": "object", "properties": { "x": {"type":"number"}, "y": {"type":"number"} } },
  "impl":   { "js": "tools/tap.js" },
  "gradient": {
    "L2": { "impl": { "js": "tools/tap-a11y.js" } },
    "L3": { "impl": { "bin": "tools/tap-shell" } }
  },
  "sideEffects": "device",
  "confirm": true,
  "cost": "fast"
}`,
    points: [
      "id 点分命名空间，包内唯一",
      "sideEffects ∈ none / read / device / destructive",
      "destructive 时 confirm 强制 true",
      "cost ∈ fast / slow，供模型做工具选择",
    ],
  },
  {
    key: "surfaces",
    name: "数据面",
    en: "surfaces[]",
    tagline: "可感知数据",
    desc: "可被读取 / 订阅的数据实体，由 axp:// URI 寻址。views 允许同一实体多种呈现；anchor 定义定位方式；watchable 开启增量订阅。",
    json: `{
  "uri": "axp://screen",
  "description": "当前屏幕的无障碍节点树",
  "views": ["tree", "text", "image"],
  "anchor": "node",
  "watchable": true,
  "auth": "L2",
  "impl": { "kotlin": "surfaces/vision/vision.dex#ScreenSurface" }
}`,
    points: [
      "标准域见 spec/05；自定义域前缀 axp://x/<id>/",
      "watchable = 订阅 + 首次全量 + 之后 diff + 背压",
      "auth 不得高于 capabilities.privilege",
      "events.on 与 ui.bind.from 都可指向它",
    ],
  },
  {
    key: "knowledge",
    name: "知识",
    en: "knowledge[]",
    tagline: "知识与提示",
    desc: "skill / prompt / command / rules 四种形态。entry 直接是 .md 文件——格式不发明新的知识语法；progressive 开启三级渐进披露。",
    json: `{
  "id": "wechat-pay-flow",
  "kind": "skill",
  "entry": "skills/wechat-pay-flow/SKILL.md",
  "progressive": true,
  "triggers": [ { "on": "axp://notification/stream", "filter": "app=com.tencent.mm" } ],
  "allowedTools": ["screen.*", "input.text"]
}`,
    points: [
      "skill 按需加载 · prompt 参数化模板",
      "command 用户可触发的斜杠命令",
      "rules 常驻注入的系统规则",
      "allowedTools 是激活时的工具白名单",
    ],
  },
  {
    key: "agents",
    name: "子代理",
    en: "agents[]",
    tagline: "受约束的代理",
    desc: "声明式子代理：prompt + 工具白名单 + 知识引用 + 轮数上限。privilege 是子代理的权限上限，不得高于 capabilities.privilege——格式原生字段。",
    json: `{
  "id": "ui-walker",
  "prompt": "agents/walker.md",
  "tools": ["screen.*", "vision.ocr"],
  "knowledge": ["wechat-pay-flow"],
  "model": "host-default",
  "maxTurns": 20,
  "privilege": "L2"
}`,
    points: [
      "tools / knowledge 引用必须在装载时解析",
      "model 可指定 host-default",
      "privilege ≤ capabilities.privilege（硬约束）",
    ],
  },
  {
    key: "events",
    name: "事件",
    en: "events[]",
    tagline: "事件与钩子",
    desc: "两类触发源：① 任意 watchable Surface 流 + filter（如验证码短信到达）；② 生命周期事件命名空间 lifecycle.tool.before|after 等。run 是一个 impl。",
    json: `[
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
]`,
    points: [
      "on + filter 组合不得重复",
      "lifecycle.chat.message / app.foreground / plugin.* / workspace.*",
      "事件处理器同样受权限约束",
    ],
  },
  {
    key: "ui",
    name: "界面",
    en: "ui{}",
    tagline: "Android 一等组件",
    desc: "五种界面形态可共存：声明式 panel / widget、WebView、原生 Activity、宿主界面注入。lifecycle / bind / actions 让界面能活、能绑、能热重建。",
    json: `"ui": {
  "panel":  { "kind": "dsl",    "entry": "ui/panel.json" },
  "web":    { "kind": "web",    "entry": "ui/index.html" },
  "activity": { "kind": "native", "entry": "ui/Main.dex#PanelActivity" },
  "inject": [ { "surface": "chat.menu.long-press", "label": "翻译本条", "run": "ui/translate.js" } ],
  "lifecycle": { "onLoad": "ui/onLoad.js", "onReload": "ui/onReload.js", "onUnload": "ui/onUnload.js" },
  "bind":    [ { "from": "axp://screen", "to": "ui.panel.tree" } ],
  "actions": [ { "id": "ui.panel.tap", "tool": "screen.tap" } ]
}`,
    points: [
      "bind 把 Surface 流接到界面节点",
      "actions 把 UI 事件回填到已声明 tool",
      "热加载 targets 含 ui.* 时必须声明 onReload / onUnload",
    ],
  },
];

export const LADDER: { level: string; channel: string; caps: string; confirm: string }[] = [
  { level: "L0", channel: "沙箱", caps: "纯计算、本地模型推理", confirm: "不需要" },
  { level: "L1", channel: "标准权限", caps: "文件、网络、相机、通知读取", confirm: "系统弹窗" },
  { level: "L2", channel: "AccessibilityService", caps: "读屏、手势、跨 App 操作", confirm: "必须单独确认" },
  { level: "L3", channel: "Shizuku", caps: "shell 身份、pm / dumpsys / 隐藏 API", confirm: "必须单独确认" },
  { level: "L4", channel: "Root", caps: "su", confirm: "必须单独确认" },
  { level: "L5", channel: "System / Hook", caps: "注入、系统签名", confirm: "仅预装" },
];

export const REQUEST_GROUPS: { group: string; items: string[] }[] = [
  { group: "无障碍", items: ["accessibility.read", "accessibility.gestures", "accessibility.takeScreenshot", "accessibility.windowChange"] },
  { group: "提权", items: ["shizuku.binder", "root.su", "system.inject"] },
  { group: "通知与剪贴板", items: ["notification.listen", "notification.post", "clipboard.read", "clipboard.write"] },
  { group: "传感器", items: ["sensor.gps", "sensor.motion", "sensor.biometric", "sensor.light"] },
  { group: "通信", items: ["telephony.sms.read", "telephony.state", "intent.send", "intent.receive"] },
  { group: "包与系统", items: ["pm.list", "pm.install", "logcat.read", "sysprop.read", "media.capture", "net.stat"] },
  { group: "网络与服务", items: ["network.egress:<host>", "foreground.service"] },
  { group: "本地文件", items: ["fs.read:<scope>", "fs.write:<scope>"] },
];

export const RUNTIME_SERVICES = [
  { value: "sampling", meaning: "插件请求宿主推理", duty: "提供推理入口，按 runtime.memoryMB 限额" },
  { value: "elicitation", meaning: "插件请求用户输入", duty: "弹 UI，返回结构化结果" },
  { value: "ui.push", meaning: "插件主动更新界面", duty: "需在 ui{} 存在时才有意义" },
  { value: "audit.read", meaning: "读审计日志", duty: "仅返回本插件产生的记录" },
];

export const GRADIENT_CODE = `"gradient": {
  "L1": { "impl": { "js": "tools/tap-safe.js" } },
  "L2": { "impl": { "js": "tools/tap-a11y.js" } },
  "L3": { "impl": { "bin": "tools/tap-shell" } }
}`;

export const GRADIENT_ALGO = `available = 宿主当前已获授权的层集合 ∩ [L0, capabilities.privilege]
for L from max(available) down to L0:
    if gradient[L] 的实现体可用 → 选用，break
若 gradient 无命中且存在顶层 impl → 用顶层 impl
否则 → 工具 unavailable（而非报错崩溃）`;

export const DOMAINS: { domain: string; uri: string; anchor: string; watchable: boolean; auth: string; use: string }[] = [
  { domain: "fs", uri: "axp://fs/<path>", anchor: "line, offset, range", watchable: true, auth: "L1", use: "文件与文档视图" },
  { domain: "screen", uri: "axp://screen", anchor: "node", watchable: true, auth: "L2", use: "当前屏幕节点树" },
  { domain: "app", uri: "axp://app/<package>", anchor: "uri", watchable: true, auth: "L1", use: "已安装应用与前台状态" },
  { domain: "notification", uri: "axp://notification/stream", anchor: "uri", watchable: true, auth: "L1", use: "通知流（可作事件源）" },
  { domain: "intent", uri: "axp://intent/<action>", anchor: "uri", watchable: true, auth: "L1", use: "Intent 收发" },
  { domain: "sensor", uri: "axp://sensor/<type>", anchor: "uri", watchable: true, auth: "L1", use: "传感器数值流" },
  { domain: "clipboard", uri: "axp://clipboard", anchor: "uri", watchable: true, auth: "L1", use: "剪贴板" },
  { domain: "telephony", uri: "axp://telephony/<kind>", anchor: "uri", watchable: true, auth: "L1", use: "短信与通话状态" },
  { domain: "logcat", uri: "axp://logcat", anchor: "line", watchable: true, auth: "L3", use: "系统日志流" },
  { domain: "pm", uri: "axp://pm/<package>", anchor: "uri", watchable: false, auth: "L3", use: "包管理" },
  { domain: "media", uri: "axp://media/<id>", anchor: "uri", watchable: true, auth: "L1", use: "媒体与截图" },
  { domain: "net", uri: "axp://net/<iface>", anchor: "uri", watchable: true, auth: "L1", use: "网络状态" },
  { domain: "sysprop", uri: "axp://sysprop/<key>", anchor: "uri", watchable: false, auth: "L3", use: "系统属性" },
];

export const URI_SYNTAX = `axp://<domain>/<path>[?<query>][#<anchor>]

<domain>  标准域名或 x 开头的自定义域
<query>   键值过滤，如 ?app=com.bank.*
<anchor>  配合 surfaces[].anchor 定位到节点 / 行列 / 偏移 / 范围

URI 模板（带 {} 占位符）用于声明一类资源，如 axp://fs/{path}；
宿主 MUST 在订阅时展开。`;

export const UI_FORMS = [
  { key: "panel", desc: "声明式面板（DSL，panel.json）", kind: "dsl" },
  { key: "widget", desc: "桌面小组件（DSL）", kind: "dsl" },
  { key: "web", desc: "WebView 界面（HTML）", kind: "web" },
  { key: "activity", desc: "原生 Activity（dex + 类符号）", kind: "native" },
  { key: "inject", desc: "向宿主既有界面注入入口项", kind: "—" },
];

export const UI_CONTAINERS = [
  { type: "Scaffold", props: "title, padding" },
  { type: "Column / Row", props: "spacing, align, scroll" },
  { type: "Box / Card", props: "padding, elevation" },
  { type: "List / Grid", props: "items(绑定表达式), columns, divider" },
  { type: "Tabs", props: "tabs, selected" },
];

export const UI_CONTENTS = [
  { type: "Text / Image / Icon", props: "text, style · src, scale · name, tint" },
  { type: "Button", props: "label, action(动作 id), enabled" },
  { type: "Input / Switch / Slider", props: "label, value(绑定), onChange" },
  { type: "Progress / Divider / Spacer", props: "value, indeterminate · thickness · size" },
  { type: "Web / Chart", props: "url, bridge · series, kind" },
];

export const BIND_EXPRS = [
  { expr: "${surface:<uri>}", desc: "读取 Surface（可加 .<view> 指定视图）" },
  { expr: "${state:<key>}", desc: "读取局部 state" },
  { expr: "${i18n:<key>}", desc: "读取 i18n/ 资源" },
  { expr: "${props:<key>}", desc: "读取宿主注入属性" },
];

export const UI_LIFECYCLE = [
  { cb: "onLoad", when: "首次挂载界面", input: "{ state, bindings }" },
  { cb: "onReload", when: "热替换成功后", input: "{ oldState, newState, changed[] }" },
  { cb: "onUnload", when: "卸载 / 替换前", input: "{ state }" },
];

export const HOTRELOAD_FIELDS: { field: string; type: string; def: string; desc: string }[] = [
  { field: "enabled", type: "bool", def: "false", desc: "关闭时宿主 MUST NOT 接受任何运行时替换" },
  { field: "unit", type: "enum", def: "component", desc: "package（整包换）/ component（单组件换）" },
  { field: "targets", type: "string[]", def: "[]", desc: "可替换前缀，如 ui.* / tools.screen.* / knowledge.*" },
  { field: "strategy", type: "enum", def: "graceful", desc: "immediate / graceful（等会话空闲）/ next-session" },
  { field: "signature", type: "enum", def: "on-install", desc: "启用时 MUST 为 on-every-load" },
  { field: "sources", type: "enum[]", def: "[package]", desc: "package / trusted-channel / preinstall；MUST NOT 有 network-unsigned" },
  { field: "state.migrate", type: "path", def: "—", desc: "状态迁移映射文件" },
  { field: "state.preserve", type: "string[]", def: "[]", desc: "原样保留的状态键，支持 *" },
  { field: "rollback.keep", type: "int", def: "2", desc: "保留历史代数" },
  { field: "rollback.onError", type: "bool", def: "true", desc: "新版本初始化失败时自动回滚" },
  { field: "uiRebuild", type: "enum", def: "recompose", desc: "recompose / recreate-activity / restart-host" },
  { field: "classloader", type: "enum", def: "isolated", desc: "dex / wasm 实现体 MUST 为 isolated" },
];

export const HOTRELOAD_STATE_MACHINE = `   ┌──────────┐  替换请求   ┌───────────┐  验签通过  ┌──────────┐
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

任何时刻用户可见的要么是旧版本，要么是新版本，MUST NOT 出现半新半旧。`;

export const ALLOW_DYNAMIC_CODE = [
  { scene: "装载包内已声明、已签名的实现体", allowed: true },
  { scene: "热加载可信源已签名的新实现体", allowed: true },
  { scene: "从网络下载未签名脚本并 eval", allowed: false },
  { scene: "distribution.channel 指向任意 URL 直接执行", allowed: false },
];

export const LOADING_STEPS = [
  { step: "解析", desc: "解析 axp.json，用 02-manifest.schema.json 做结构校验" },
  { step: "签名", desc: "按 distribution.signatureScheme 校验发布者指纹一致；热加载每次替换 MUST 重新验签" },
  { step: "引用完整性", desc: "所有包内相对路径存在、无 ..、无绝对路径；bind[].to / actions[].tool / agents 引用可解析" },
  { step: "abis 一致性", desc: "abis 声明与包内 .dex / .so / .wasm 产物匹配" },
  { step: "依赖闭包", desc: "requires[] 全部可解析且版本满足 range，无环" },
  { step: "权限校验", desc: "requests 全在词汇表内；dangerous ⊆ requests；agents[].privilege ≤ capabilities.privilege；gradient 键 ≤ capabilities.privilege" },
  { step: "注册组件", desc: "按清单注册。未在清单中声明的文件一律不执行（安全铁律）" },
  { step: "UI 挂载", desc: "若存在 ui{}，按 §5.6 建立绑定与动作，触发 ui.lifecycle.onLoad" },
  { step: "热加载就绪", desc: "若 hotReload.enabled，建立隔离类加载器与回滚快照" },
];

export const HOST_LEVELS = [
  { level: "AXP-0", req: "通过 §8 的 1–7 步，支持 tools[] 调度" },
  { level: "AXP-1", req: "AXP-0 + surfaces[] 订阅 + knowledge[] 渐进披露" },
  { level: "AXP-2", req: "AXP-1 + agents[] / events[] / ui{} 全语义" },
  { level: "AXP-3", req: "AXP-2 + 权限梯度 L0–L5 + hotReload{} 全语义" },
];

export const ROADMAP: { milestone: string; deliver: string; exit: string; status: "done" | "partial" | "todo" }[] = [
  { milestone: "M1 格式定稿", deliver: "schema 定稿 + validator + CLI pack/new + 3 个 example", exit: "axp validate 全绿", status: "done" },
  { milestone: "M2 最小宿主", deliver: "装载 + tools 调度 + L0/L1（Node 参考宿主已跑通；Android 骨架未编译验证）", exit: "纯 JS 插件在真机被 Agent 调通", status: "partial" },
  { milestone: "M2.5 热加载", deliver: "hotReload + 隔离类加载器 + 每次验签 + 回滚 + UI 重建", exit: "不重启宿主替换 ui.panel 与一个 tool，状态保留、出错回滚", status: "done" },
  { milestone: "M3 感知", deliver: "surfaces + watchable + fs/screen/notification 三域 + L2", exit: "插件订阅屏幕流拿到增量", status: "partial" },
  { milestone: "M4 提权", deliver: "Shizuku L3 + gradient 降级 + 审计", exit: "同一 tool 在 L2/L3 自动切换实现", status: "partial" },
  { milestone: "M5 全组件", deliver: "knowledge/agents/events 全语义 + ui.dsl + 多实例", exit: "综合示例完整跑通", status: "done" },
  { milestone: "M6 分发", deliver: "签名信任链 + session-install + 索引格式", exit: "三种来源安装成功", status: "todo" },
  { milestone: "M7 生态", deliver: "宿主合规认证 + 示例库", exit: "至少 2 个第三方宿主达 AXP-2", status: "todo" },
];

export const CLI_COMMANDS = [
  { cmd: "axp new <id> [-o <dir>]", desc: "生成最小插件骨架（axp.json / tools/hello.js / README.md），id 必须为反向域名" },
  { cmd: "axp validate <dir> [--json] [--strict]", desc: "schema → 引用完整性 → abis → 权限词汇表 → UI 引用 → 热加载策略；退出码 0 全绿" },
  { cmd: "axp pack <dir> -o <file.axp>", desc: "校验通过后打成 zip；产物未签名，发布前用 apksigner sign --v3" },
  { cmd: "axp inspect <file.axp | dir>", desc: "打印组件摘要，不执行任何实现体" },
  { cmd: "axp install <file.axp>", desc: "宿主侧：调用宿主安装接口（session-install），实际装载由宿主完成" },
];

export const SELF_CHECKS = [
  { name: "行为用例", cmd: "node validator/test/run-tests.mjs", n: "31/31" },
  { name: "独立引擎交叉复核", cmd: "python3 validator/test/schema-crosscheck.py", n: "43/43" },
  { name: "参考运行时端到端", cmd: "node runtime/test/smoke.mjs", n: "30/30" },
  { name: "示例清单校验", cmd: "for d in examples/*/; do node validator/src/validate.mjs \"$d\"; done", n: "4/4" },
];

export const TOOLCHAIN = [
  {
    name: "validator/",
    desc: "离线校验器：schema + 安全规则 + 引用完整性，零依赖；31 条行为用例 + Python jsonschema 独立交叉复核 43 项",
  },
  {
    name: "cli/",
    desc: "axp 命令行：new / validate / pack / inspect / install",
  },
  {
    name: "runtime/",
    desc: "★ 可运行参考宿主（Node，声明 AXP-3）：9 步装载 / gradient / Surface / UI / 热加载，30 条端到端断言",
  },
  {
    name: "sdk/sdk-js/",
    desc: "TypeScript 类型定义",
  },
  {
    name: "reference-host/",
    desc: "Android/Kotlin 真机骨架（源码，未编译验证）：HostBridge、InMemoryDexClassLoader 隔离、Compose 绑定示意",
  },
  {
    name: "conformance/",
    desc: "第三方宿主一致性认证：axp-conformance.json 结果模板与用例骨架（断言见 spec/11）",
  },
  {
    name: "spec/index.json",
    desc: "规范文档、版本、统计、错误码与断言 ID 的机器可读单一事实源",
  },
];
