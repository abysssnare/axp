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
