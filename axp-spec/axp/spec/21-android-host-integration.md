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
